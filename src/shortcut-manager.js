const { globalShortcut, clipboard } = require("electron");

class ShortcutManager {
  constructor() {
    this.registered = [];
  }

  register(accelerator, callback) {
    try {
      const success = globalShortcut.register(accelerator, callback);
      if (success) {
        this.registered.push(accelerator);
      } else {
        console.warn(`Failed to register shortcut: ${accelerator}`);
      }
      return success;
    } catch (err) {
      console.error(`Error registering shortcut ${accelerator}:`, err.message);
      return false;
    }
  }

  registerToggle(callback) {
    return this.register("CommandOrControl+Shift+V", callback);
  }

  registerPasteShortcuts(getItemByIndex, onPaste) {
    for (let i = 1; i <= 9; i++) {
      this.register(`CommandOrControl+Shift+${i}`, () => {
        const item = getItemByIndex(i - 1);
        if (item) {
          clipboard.writeText(item.text);
          if (onPaste) onPaste(item);
        }
      });
    }
  }

  unregisterAll() {
    globalShortcut.unregisterAll();
    this.registered = [];
  }
}

module.exports = ShortcutManager;
