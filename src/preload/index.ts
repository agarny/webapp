import { contextBridge, ipcRenderer } from 'electron'
import loc from '../../out/libOpenCOR/Release/libOpenCOR.node'

// Some bridging between our main process and renderer process.
// Note: src/electronAPI.ts needs to be in sync with this file.

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer process asking the main process to do something for it.

  resetAll: () => ipcRenderer.invoke('reset-all'),
  enableMenu: () => ipcRenderer.invoke('enable-menu'),
  disableMenu: () => ipcRenderer.invoke('disable-menu'),

  // Renderer process listening to the main process.

  onResetAll: (callback: () => void) =>
    ipcRenderer.on('reset-all', () => {
      callback()
    }),
  onAbout: (callback: () => void) =>
    ipcRenderer.on('about', () => {
      callback()
    })
})

// Give our renderer process access to the C++ version of libOpenCOR.
// Note: src/libopencor/locAPI.ts needs to be in sync with this file.

contextBridge.exposeInMainWorld('locAPI', {
  versionString: () => loc.version()
})
