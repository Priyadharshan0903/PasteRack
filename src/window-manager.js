const { BrowserWindow } = require("electron");
const path = require("path");

const WINDOW_WIDTH = 360;
const WINDOW_HEIGHT = 500;

class WindowManager {
  constructor() {
    this.window = null;
  }

  create() {
    this.window = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      transparent: true,
      type: "panel",
      hasShadow: false,
      visibleOnAllWorkspaces: true,
      vibrancy: "under-window",
      visualEffectState: "active",
      webPreferences: {
        preload: path.join(__dirname, "..", "renderer", "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });

    this.window.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

    this.window.on("closed", () => {
      this.window = null;
    });

    // Hide when focus is lost
    this.window.on("blur", () => {
      this.hide();
    });

    return this.window;
  }

  toggle(trayBounds) {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
    }

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show(trayBounds);
    }
  }

  show(trayBounds) {
    if (!this.window || this.window.isDestroyed()) return;

    if (trayBounds) {
      const x = Math.round(
        trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2
      );
      const y = Math.round(trayBounds.y + trayBounds.height);
      this.window.setPosition(x, y);
    }

    this.window.showInactive();
    this.window.focus();
  }

  hide() {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      this.window.hide();
    }
  }

  isVisible() {
    return this.window && !this.window.isDestroyed() ? this.window.isVisible() : false;
  }

  send(channel, data) {
    if (this.window && !this.window.isDestroyed() && this.window.webContents) {
      this.window.webContents.send(channel, data);
    }
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}

module.exports = WindowManager;
