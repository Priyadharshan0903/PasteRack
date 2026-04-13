const MAX_ITEMS = 100;

class ClipboardStore {
  constructor() {
    this.items = [];
  }

  add(text) {
    if (!text || !text.trim()) return null;

    // Deduplicate: don't add if same as most recent
    if (this.items.length > 0 && this.items[0].text === text) {
      return null;
    }

    // Remove duplicate if it exists elsewhere in history
    this.items = this.items.filter((item) => item.text !== text);

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text,
      timestamp: Date.now(),
    };

    this.items.unshift(entry);

    // Evict oldest if over capacity
    if (this.items.length > MAX_ITEMS) {
      this.items = this.items.slice(0, MAX_ITEMS);
    }

    return entry;
  }

  getAll() {
    return this.items;
  }

  getByIndex(index) {
    return this.items[index] || null;
  }

  search(query) {
    if (!query) return this.items;
    const lower = query.toLowerCase();
    return this.items.filter((item) =>
      item.text.toLowerCase().includes(lower)
    );
  }

  clear() {
    this.items = [];
  }

  get count() {
    return this.items.length;
  }
}

module.exports = ClipboardStore;
