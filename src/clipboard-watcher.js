const { clipboard } = require("electron");

const POLL_INTERVAL = 500;

class ClipboardWatcher {
  constructor(store, onChange) {
    this.store = store;
    this.onChange = onChange;
    this.lastText = clipboard.readText();
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => {
      const currentText = clipboard.readText();

      if (currentText && currentText !== this.lastText) {
        this.lastText = currentText;
        const entry = this.store.add(currentText);
        if (entry && this.onChange) {
          this.onChange(this.store.getAll());
        }
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
}

module.exports = ClipboardWatcher;
