const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pasterack", {
  // Clipboard history
  getClips: () => ipcRenderer.invoke("clips:getAll"),
  searchClips: (query) => ipcRenderer.invoke("clips:search", query),
  copyClip: (id) => ipcRenderer.invoke("clips:copy", id),
  pinClip: (id) => ipcRenderer.invoke("clips:pin", id),
  unpinClip: (id) => ipcRenderer.invoke("clips:unpin", id),
  deleteClip: (id) => ipcRenderer.invoke("clips:delete", id),
  clearClips: () => ipcRenderer.invoke("clips:clear"),

  // Vault auth
  vaultStatus: () => ipcRenderer.invoke("vault:status"),
  vaultSetup: (masterPassword) =>
    ipcRenderer.invoke("vault:setup", masterPassword),
  vaultUnlock: (masterPassword) =>
    ipcRenderer.invoke("vault:unlock", masterPassword),
  vaultLock: () => ipcRenderer.invoke("vault:lock"),

  // Password vault
  getPasswords: () => ipcRenderer.invoke("passwords:getAll"),
  addPassword: (label, value) =>
    ipcRenderer.invoke("passwords:add", label, value),
  revealPassword: (id) => ipcRenderer.invoke("passwords:reveal", id),
  copyPassword: (id) => ipcRenderer.invoke("passwords:copy", id),
  updatePassword: (id, newLabel, newValue) =>
    ipcRenderer.invoke("passwords:update", id, newLabel, newValue),
  deletePassword: (id) => ipcRenderer.invoke("passwords:delete", id),

  // Events from main
  onClipsUpdated: (callback) => {
    ipcRenderer.on("clips:updated", (_event, clips) => callback(clips));
  },
});
