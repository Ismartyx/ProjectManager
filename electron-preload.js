const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    showNotification: (title, body) => {
        try {
            ipcRenderer.send('mecav-show-notification', { title, body });
        } catch (e) {
            console.error('IPC notification error:', e);
        }
    },
    openExternal: (url) => {
        try {
            ipcRenderer.send('mecav-open-external', url);
        } catch (e) {
            window.open(url, '_blank');
        }
    },
    downloadUpdate: (url, onProgress) => {
        ipcRenderer.removeAllListeners('mecav-download-progress');
        ipcRenderer.on('mecav-download-progress', (event, data) => {
            if (typeof onProgress === 'function') onProgress(data);
        });
        ipcRenderer.send('mecav-download-update', url);
    }
});
