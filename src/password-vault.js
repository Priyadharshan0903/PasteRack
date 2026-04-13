const { safeStorage } = require("electron");

class PasswordVault {
  constructor() {
    this.entries = [];
  }

  add(label, value) {
    if (!label || !value) return null;

    // Check for duplicate labels
    const existing = this.entries.find(
      (e) => e.label.toLowerCase() === label.toLowerCase()
    );
    if (existing) return null;

    let encrypted;
    if (safeStorage.isEncryptionAvailable()) {
      encrypted = safeStorage.encryptString(value);
    } else {
      // Fallback: store as buffer (not truly encrypted, but in-memory only)
      encrypted = Buffer.from(value, "utf-8");
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label,
      encrypted,
      createdAt: Date.now(),
    };

    this.entries.push(entry);
    return { id: entry.id, label: entry.label, createdAt: entry.createdAt };
  }

  decrypt(id) {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return null;

    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(entry.encrypted);
    } else {
      return entry.encrypted.toString("utf-8");
    }
  }

  delete(id) {
    const index = this.entries.findIndex((e) => e.id === id);
    if (index === -1) return false;
    this.entries.splice(index, 1);
    return true;
  }

  getAll() {
    return this.entries.map((e) => ({
      id: e.id,
      label: e.label,
      createdAt: e.createdAt,
    }));
  }

  get count() {
    return this.entries.length;
  }
}

module.exports = PasswordVault;
