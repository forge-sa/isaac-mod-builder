import { contextBridge, ipcRenderer } from 'electron'

// Тонкий и явный мост между renderer (React, без доступа к Node) и main.
// Никакого прямого доступа к fs/ipcRenderer из UI-кода — только эти методы.
contextBridge.exposeInMainWorld('modBuilder', {
  project: {
    save: (suggestedName, json) => ipcRenderer.invoke('project:save', { suggestedName, json }),
    open: () => ipcRenderer.invoke('project:open'),
    pickImage: () => ipcRenderer.invoke('project:pickImage')
  },
  mod: {
    exportToFolder: (modId, files) => ipcRenderer.invoke('mod:exportToFolder', { modId, files })
  },
  game: {
    locateModsFolder: () => ipcRenderer.invoke('game:locateModsFolder'),
    pickModsFolder: () => ipcRenderer.invoke('game:pickModsFolder'),
    installAndRun: (modsFolder, modId, files) =>
      ipcRenderer.invoke('game:installAndRun', { modsFolder, modId, files }),
    findLogPath: () => ipcRenderer.invoke('game:findLogPath'),
    pickLogFile: () => ipcRenderer.invoke('game:pickLogFile'),
    watchLog: (logPath) => ipcRenderer.invoke('game:watchLog', { logPath }),
    stopWatchLog: () => ipcRenderer.invoke('game:stopWatchLog'),
    onLogLine: (callback) => {
      const listener = (_evt, line) => callback(line)
      ipcRenderer.on('game:logLine', listener)
      return () => ipcRenderer.removeListener('game:logLine', listener)
    }
  }
})
