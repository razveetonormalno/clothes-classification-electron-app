// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Поскольку изоляция контекста отключена, мы можем напрямую использовать ipcRenderer
global.electronAPI = {
  predictImage: () => {
    return ipcRenderer.invoke('predict-image');
  },
  onImageSelected: (callback) => {
    ipcRenderer.on('image-selected', (event, imagePath) => {
      callback(imagePath);
    });
  }
};
