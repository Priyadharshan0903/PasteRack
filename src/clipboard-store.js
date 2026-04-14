const MAX_ITEMS = 100;

class ClipboardStore {
  constructor() {
    this.items = [];
  }

  add(content, type = "text", metadata = {}) {
    if (!content) return null;
    if (type === "text" && !content.trim()) return null;

    // Deduplicate: don't add if same as most recent unpinned of same type
    const topUnpinned = this.items.find((i) => !i.pinned);
    if (topUnpinned && topUnpinned.type === type && topUnpinned.content === content) {
      return null;
    }

    // Remove duplicate if it exists elsewhere (but not pinned ones)
    this.items = this.items.filter(
      (item) => item.pinned || item.content !== content || item.type !== type
    );

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content,
      type,
      metadata,
      timestamp: Date.now(),
      pinned: false,
    };

    // For images, we can't show full data URL in search, so we'll store a snippet or just 'Image'
    if (type === "text") {
      entry.text = content; // Keep text property for backward compatibility in some logic
    }

    // Insert after pinned items
    const firstUnpinnedIdx = this.items.findIndex((i) => !i.pinned);
    if (firstUnpinnedIdx === -1) {
      this.items.push(entry);
    } else {
      this.items.splice(firstUnpinnedIdx, 0, entry);
    }

    // Evict oldest unpinned if over capacity
    const unpinned = this.items.filter((i) => !i.pinned);
    if (unpinned.length > MAX_ITEMS) {
      const lastUnpinned = unpinned[unpinned.length - 1];
      this.items = this.items.filter((i) => i.id !== lastUnpinned.id);
    }

    return entry;
  }

  pin(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return false;
    item.pinned = true;

    // Move to top (pinned section)
    this.items = this.items.filter((i) => i.id !== id);
    this.items.unshift(item);
    return true;
  }

  unpin(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return false;
    item.pinned = false;

    // Move to top of unpinned section (after all pinned)
    this.items = this.items.filter((i) => i.id !== id);
    const firstUnpinnedIdx = this.items.findIndex((i) => !i.pinned);
    if (firstUnpinnedIdx === -1) {
      this.items.push(item);
    } else {
      this.items.splice(firstUnpinnedIdx, 0, item);
    }
    return true;
  }

  deleteItem(id) {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
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
    return this.items.filter((item) => {
      if (item.type !== "text") return false;
      return item.content.toLowerCase().includes(lower);
    });
  }

  clear() {
    // Keep pinned items on clear
    this.items = this.items.filter((i) => i.pinned);
  }

  get count() {
    return this.items.length;
  }
}

module.exports = ClipboardStore;
