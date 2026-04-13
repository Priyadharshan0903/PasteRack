const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

// AES-256-GCM encryption with PBKDF2 key derivation
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const AUTO_LOCK_MS = 5 * 60 * 1000; // Auto-lock after 5 minutes of inactivity

const VAULT_DIR = path.join(os.homedir(), ".pasterack");
const VAULT_FILE = path.join(VAULT_DIR, "vault.enc");

class PasswordVault {
  constructor() {
    this.entries = [];
    this.derivedKey = null;
    this.masterHash = null;
    this.salt = null;
    this.locked = true;
    this.autoLockTimer = null;

    // Load vault metadata from disk (salt + hash + encrypted entries)
    this._loadFromDisk();
  }

  // ── Disk Persistence ──

  _ensureDir() {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { mode: 0o700, recursive: true });
    }
  }

  _loadFromDisk() {
    try {
      if (!fs.existsSync(VAULT_FILE)) return;

      const raw = fs.readFileSync(VAULT_FILE);
      const data = JSON.parse(raw.toString("utf8"));

      if (data.salt && data.masterHash && Array.isArray(data.entries)) {
        this.salt = Buffer.from(data.salt, "hex");
        this.masterHash = data.masterHash;
        this.entries = data.entries.map((e) => ({
          id: e.id,
          label: e.label,
          encrypted: Buffer.from(e.encrypted, "hex"),
          createdAt: e.createdAt,
        }));
      }
    } catch (err) {
      console.error("Failed to load vault:", err.message);
    }
  }

  _saveToDisk() {
    try {
      this._ensureDir();

      const data = {
        salt: this.salt.toString("hex"),
        masterHash: this.masterHash,
        entries: this.entries.map((e) => ({
          id: e.id,
          label: e.label,
          encrypted: e.encrypted.toString("hex"),
          createdAt: e.createdAt,
        })),
      };

      const tmpFile = VAULT_FILE + ".tmp";
      fs.writeFileSync(tmpFile, JSON.stringify(data), {
        mode: 0o600,
        encoding: "utf8",
      });
      fs.renameSync(tmpFile, VAULT_FILE);
    } catch (err) {
      console.error("Failed to save vault:", err.message);
    }
  }

  // ── Master Password Setup ──

  isSetup() {
    return this.masterHash !== null;
  }

  isLocked() {
    return this.locked;
  }

  setupMaster(masterPassword) {
    if (!masterPassword || masterPassword.length < 4) return false;

    this.salt = crypto.randomBytes(SALT_LENGTH);
    this.masterHash = crypto
      .createHash("sha256")
      .update(masterPassword + this.salt.toString("hex"))
      .digest("hex");

    this.derivedKey = crypto.pbkdf2Sync(
      masterPassword,
      this.salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      "sha512"
    );

    this.locked = false;
    this._resetAutoLock();
    this._saveToDisk();
    return true;
  }

  unlock(masterPassword) {
    if (!this.masterHash || !this.salt) return false;

    const hash = crypto
      .createHash("sha256")
      .update(masterPassword + this.salt.toString("hex"))
      .digest("hex");

    if (hash !== this.masterHash) return false;

    this.derivedKey = crypto.pbkdf2Sync(
      masterPassword,
      this.salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      "sha512"
    );

    this.locked = false;
    this._resetAutoLock();
    return true;
  }

  lock() {
    if (this.derivedKey) {
      crypto.randomFillSync(this.derivedKey);
      this.derivedKey = null;
    }
    this.locked = true;
    clearTimeout(this.autoLockTimer);
  }

  _resetAutoLock() {
    clearTimeout(this.autoLockTimer);
    this.autoLockTimer = setTimeout(() => {
      this.lock();
    }, AUTO_LOCK_MS);
  }

  // ── Encryption / Decryption ──

  _encrypt(plaintext) {
    if (!this.derivedKey) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.derivedKey, iv);

    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]);
  }

  _decrypt(packed) {
    if (!this.derivedKey) return null;

    const iv = packed.subarray(0, IV_LENGTH);
    const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  }

  // ── CRUD ──

  add(label, value) {
    if (!label || !value) return null;
    if (this.locked) return null;

    const existing = this.entries.find(
      (e) => e.label.toLowerCase() === label.toLowerCase()
    );
    if (existing) return null;

    const encrypted = this._encrypt(value);
    if (!encrypted) return null;

    const entry = {
      id: crypto.randomBytes(8).toString("hex"),
      label,
      encrypted,
      createdAt: Date.now(),
    };

    this.entries.push(entry);
    this._resetAutoLock();
    this._saveToDisk();
    return { id: entry.id, label: entry.label, createdAt: entry.createdAt };
  }

  decrypt(id) {
    if (this.locked) return null;

    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return null;

    this._resetAutoLock();
    return this._decrypt(entry.encrypted);
  }

  update(id, newLabel, newValue) {
    if (this.locked) return null;

    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return null;

    if (newLabel && newLabel !== entry.label) {
      const duplicate = this.entries.find(
        (e) => e.id !== id && e.label.toLowerCase() === newLabel.toLowerCase()
      );
      if (duplicate) return null;
      entry.label = newLabel;
    }

    if (newValue) {
      const encrypted = this._encrypt(newValue);
      if (!encrypted) return null;
      entry.encrypted = encrypted;
    }

    this._resetAutoLock();
    this._saveToDisk();
    return { id: entry.id, label: entry.label, createdAt: entry.createdAt };
  }

  delete(id) {
    const index = this.entries.findIndex((e) => e.id === id);
    if (index === -1) return false;
    if (this.entries[index].encrypted) {
      crypto.randomFillSync(this.entries[index].encrypted);
    }
    this.entries.splice(index, 1);
    this._saveToDisk();
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

  destroy() {
    this.lock();
    for (const entry of this.entries) {
      if (entry.encrypted) {
        crypto.randomFillSync(entry.encrypted);
      }
    }
    this.entries = [];
  }
}

module.exports = PasswordVault;
