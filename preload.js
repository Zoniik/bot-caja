const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    startBot: () => ipcRenderer.send('start-bot'),
    stopBot: () => ipcRenderer.send('stop-bot'),

    onQR: (cb) => ipcRenderer.on('qr', (e, data) => cb(data)),
    onLog: (cb) => ipcRenderer.on('log', (e, data) => cb(data))
});

contextBridge.exposeInMainWorld('electronAPI', {
    checkUpdate: () => ipcRenderer.send('check-update'),

    onUpdateAvailable: (cb) => ipcRenderer.on('update_available', cb),
	onUpdateNotAvailable: (cb) => ipcRenderer.on('update_not_available', cb),
	onDonwloadProgress: (cb) => ipcRenderer.on('download-progress', cb),	
    onUpdateDownloaded: (cb) => ipcRenderer.on('update_downloaded', cb),
    onUpdateError: (cb) => ipcRenderer.on('update_error', cb)
});