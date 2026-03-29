const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("xiaoLeDesktop", {
  getMeta: () => ipcRenderer.invoke("desktop:get-meta"),
  restartBackend: () => ipcRenderer.invoke("desktop:restart-backend")
});
