const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    showNotification: (title, body, taskId = null) => {
        try {
            ipcRenderer.send('mecav-show-notification', { title, body, taskId });
        } catch (e) {
            console.error('IPC notification error:', e);
        }
    },
    onOpenTask: (callback) => {
        if (typeof callback === 'function') {
            ipcRenderer.on('open-task-from-notification', (event, taskId) => callback(taskId));
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
    },
    updateTitleBarOverlay: (color, symbolColor) => {
        try {
            ipcRenderer.send('mecav-update-titlebar-overlay', { color, symbolColor });
        } catch (e) {}
    },
    quitApp: () => {
        try {
            ipcRenderer.send('mecav-quit-app');
        } catch (e) {}
    }
});
