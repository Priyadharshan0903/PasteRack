const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pasterack", {
  // Clipboard history
  getClips: () => ipcRenderer.invoke("clips:getAll"),
  searchClips: (query) => ipcRenderer.invoke("clips:search", query),
  copyClip: (id) => ipcRenderer.invoke("clips:copy", id),
  clearClips: () => ipcRenderer.invoke("clips:clear"),

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
