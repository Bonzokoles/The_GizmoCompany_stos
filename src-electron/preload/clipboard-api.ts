import { ipcRenderer } from "electron";

export const clipboardAPI = {
  readText: () => ipcRenderer.invoke("clipboard:readText"),
  writeText: (text: string) => ipcRenderer.invoke("clipboard:writeText", text),
  readImage: () => ipcRenderer.invoke("clipboard:readImage"),
  writeImage: (dataUrl: string) =>
    ipcRenderer.invoke("clipboard:writeImage", dataUrl),
  copyText: (text: string) => ipcRenderer.invoke("clipboard:copyText", text),
};
