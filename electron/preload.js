"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("albumWindow", {
  showWhenReady: () => ipcRenderer.send("window:show-when-ready"),
  minimize: () => ipcRenderer.send("window:minimize"),
  close: () => ipcRenderer.send("window:close"),
  copyItems: (ids) => ipcRenderer.invoke("clipboard:copy-items", ids),
  exportItems: (ids) => ipcRenderer.invoke("files:export-items", ids),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  setWindowControlsStyle: (style) =>
    ipcRenderer.invoke("window:set-controls-style", style),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  getWindowPosition: () => ipcRenderer.invoke("window:get-position"),
  beginWindowMove: () => ipcRenderer.send("window:begin-move"),
  endWindowMove: () => ipcRenderer.send("window:end-move"),
  moveWindow: (x, y) => ipcRenderer.send("window:move", x, y),
  toggleFullscreen: () => ipcRenderer.invoke("window:toggle-fullscreen"),
  isFullscreen: () => ipcRenderer.invoke("window:is-fullscreen"),
  onMaximizedChange: (callback) => {
    const listener = (event, maximized) => callback(Boolean(maximized));
    ipcRenderer.on("window:maximized-state", listener);
    return () => ipcRenderer.removeListener("window:maximized-state", listener);
  },
  onFullscreenChange: (callback) => {
    const listener = (event, fullscreen) => callback(Boolean(fullscreen));
    ipcRenderer.on("window:fullscreen-state", listener);
    return () =>
      ipcRenderer.removeListener("window:fullscreen-state", listener);
  },
});
