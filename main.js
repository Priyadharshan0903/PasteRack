const { app, ipcMain, clipboard, nativeImage } = require("electron");
const ClipboardStore = require("./src/clipboard-store");
const ClipboardWatcher = require("./src/clipboard-watcher");
const PasswordVault = require("./src/password-vault");
const TrayManager = require("./src/tray-manager");
const WindowManager = require("./src/window-manager");
const ShortcutManager = require("./src/shortcut-manager");

// Hide dock icon (menu bar app)
if (app.dock) app.dock.hide();

let store;
let watcher;
let vault;
let tray;
let windowManager;
let shortcuts;

// Timer for auto-clearing password from clipboard
let passwordClearTimer = null;

app.whenReady().then(() => {
  // ── Initialize modules ──
  store = new ClipboardStore();
  vault = new PasswordVault();
  windowManager = new WindowManager();
  shortcuts = new ShortcutManager();

  const win = windowManager.create();

  // ── Tray ──
  tray = new TrayManager(
    (bounds) => windowManager.toggle(bounds),
    () => app.quit()
  );
  tray.create();

  // ── Clipboard watcher ──
  watcher = new ClipboardWatcher(store, (items) => {
    windowManager.send("clips:updated", items);
  });
  watcher.start();

  // ── Global shortcuts ──
  shortcuts.registerToggle(() => {
    const bounds = tray.getBounds();
    windowManager.toggle(bounds);
  });

  shortcuts.registerPasteShortcuts(
    (index) => store.getByIndex(index),
    (item) => {
      if (item.type === "image") {
        watcher.updateLastImage(item.content);
      } else {
        watcher.updateLastText(item.text);
      }
    }
  );

  // ── IPC Handlers: Clipboard ──
  ipcMain.handle("clips:getAll", () => {
    return store.getAll();
  });

  ipcMain.handle("clips:search", (_event, query) => {
    return store.search(query);
  });

  ipcMain.handle("clips:copy", (_event, id) => {
    const items = store.getAll();
    const item = items.find((i) => i.id === id);
    if (item) {
      if (item.type === "image") {
        const img = nativeImage.createFromDataURL(item.content);
        clipboard.writeImage(img);
        watcher.updateLastImage(item.content);
      } else {
        clipboard.writeText(item.text);
        watcher.updateLastText(item.text);
      }
    }
    return !!item;
  });

  ipcMain.handle("clips:pin", (_event, id) => {
    const result = store.pin(id);
    if (result) windowManager.send("clips:updated", store.getAll());
    return result;
  });

  ipcMain.handle("clips:unpin", (_event, id) => {
    const result = store.unpin(id);
    if (result) windowManager.send("clips:updated", store.getAll());
    return result;
  });

  ipcMain.handle("clips:delete", (_event, id) => {
    const result = store.deleteItem(id);
    if (result) windowManager.send("clips:updated", store.getAll());
    return result;
  });

  ipcMain.handle("clips:clear", () => {
    store.clear();
    return true;
  });

  // ── IPC Handlers: Vault Auth ──
  ipcMain.handle("vault:status", () => {
    return { isSetup: vault.isSetup(), isLocked: vault.isLocked() };
  });

  ipcMain.handle("vault:setup", (_event, masterPassword) => {
    return vault.setupMaster(masterPassword);
  });

  ipcMain.handle("vault:unlock", (_event, masterPassword) => {
    return vault.unlock(masterPassword);
  });

  ipcMain.handle("vault:lock", () => {
    vault.lock();
    return true;
  });

  // ── IPC Handlers: Passwords ──
  ipcMain.handle("passwords:getAll", () => {
    return vault.getAll();
  });

  ipcMain.handle("passwords:add", (_event, label, value) => {
    return vault.add(label, value);
  });

  ipcMain.handle("passwords:reveal", (_event, id) => {
    return vault.decrypt(id);
  });

  ipcMain.handle("passwords:update", (_event, id, newLabel, newValue) => {
    return vault.update(id, newLabel, newValue);
  });

  ipcMain.handle("passwords:copy", (_event, id) => {
    const value = vault.decrypt(id);
    if (value) {
      clipboard.writeText(value);
      watcher.updateLastText(value);

      // Auto-clear password from clipboard after 30s
      clearTimeout(passwordClearTimer);
      passwordClearTimer = setTimeout(() => {
        if (clipboard.readText() === value) {
          clipboard.writeText("");
          watcher.updateLastText("");
        }
      }, 30000);
    }
    return !!value;
  });

  ipcMain.handle("passwords:delete", (_event, id) => {
    return vault.delete(id);
  });

  ipcMain.on("window:hide", () => {
    windowManager.hide();
  });
});

// ── Cleanup ──
app.on("will-quit", () => {
  if (watcher) watcher.stop();
  if (shortcuts) shortcuts.unregisterAll();
  if (vault) vault.destroy();
  if (tray) tray.destroy();
  clearTimeout(passwordClearTimer);
});

// Prevent app from quitting when all windows are closed (menu bar app)
app.on("window-all-closed", (e) => {
  e.preventDefault();
});
