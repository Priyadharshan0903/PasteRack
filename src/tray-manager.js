const { Tray, nativeImage, Menu } = require("electron");
const path = require("path");

class TrayManager {
  constructor(onToggle, onQuit) {
    this.tray = null;
    this.onToggle = onToggle;
    this.onQuit = onQuit;
  }

  create() {
    const iconPath = path.join(__dirname, "..", "assets", "tray-iconTemplate.png");

    // Create a small icon — if asset doesn't exist, use a blank 16x16
    let icon;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) throw new Error("empty");
    } catch {
      // Fallback: create a simple clipboard icon programmatically
      icon = nativeImage.createEmpty();
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip("PasteRack");

    // Left click toggles popup
    this.tray.on("click", (event, bounds) => {
      if (this.onToggle) {
        this.onToggle(bounds);
      }
    });

    // Right click shows context menu
    const contextMenu = Menu.buildFromTemplate([
      { label: "PasteRack", enabled: false },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          if (this.onQuit) this.onQuit();
        },
      },
    ]);

    this.tray.on("right-click", () => {
      this.tray.popUpContextMenu(contextMenu);
    });

    return this.tray;
  }

  getBounds() {
    return this.tray ? this.tray.getBounds() : null;
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = TrayManager;
