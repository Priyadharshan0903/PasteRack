const { clipboard, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

const POLL_INTERVAL = 500;

class ClipboardWatcher {
  constructor(store, onChange) {
    this.store = store;
    this.onChange = onChange;
    this.lastText = clipboard.readText();
    const initialImage = clipboard.readImage();
    this.lastImage = initialImage.isEmpty() ? null : initialImage.toDataURL();
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => {
      const currentText = clipboard.readText();
      if (currentText && currentText !== this.lastText) {
        this.lastText = currentText;

        let filePath = currentText.startsWith("file://")
          ? currentText.substring(7)
          : currentText;
        
        // Handle URL paths from file:// URLs
        if (currentText.startsWith("file://")) {
            try {
                filePath = decodeURIComponent(filePath);
            } catch (e) {
                console.error("[ClipboardWatcher] Failed to decode file path:", e);
            }
        }

        const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];
        const ext = path.extname(filePath).toLowerCase();

        if (imageExtensions.includes(ext) && fs.existsSync(filePath)) {
          const img = nativeImage.createFromPath(filePath);
          if (!img.isEmpty()) {
            const dataUrl = img.toDataURL();

            // IMPORTANT (I'm not sure on this but this works check this part PRIYU): 
            // To prevent a second row from the raw clipboard image I am updating this.lastImage with the current CLIPBOARD raw image.

            const rawClipboardImage = clipboard.readImage();
            if (!rawClipboardImage.isEmpty()) {
              this.lastImage = rawClipboardImage.toDataURL();
            } else {
              this.lastImage = dataUrl;
            }

            const entry = this.store.add(dataUrl, "image", {
              filename: path.basename(filePath),
            });
            if (entry && this.onChange) {
              this.onChange(this.store.getAll());
            }
            return;
          }
        }

        const entry = this.store.add(currentText, "text");
        if (entry && this.onChange) {
          this.onChange(this.store.getAll());
        }
        return;
      }

      const currentImage = clipboard.readImage();
      if (!currentImage.isEmpty()) {
        const currentImageUrl = currentImage.toDataURL();
        if (currentImageUrl !== this.lastImage) {
          this.lastImage = currentImageUrl;
          const entry = this.store.add(currentImageUrl, "image");
          if (entry && this.onChange) {
            this.onChange(this.store.getAll());
          }
        }
      } else {
        this.lastImage = null;
      }
    }, POLL_INTERVAL);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateLastText(text) {
    this.lastText = text;
  }

  updateLastImage(dataUrl) {
    this.lastImage = dataUrl;
  }
}

module.exports = ClipboardWatcher;
