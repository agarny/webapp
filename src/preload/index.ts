import { contextBridge, ipcRenderer } from 'electron'
import loc from '../../out/libOpenCOR/Release/libOpenCOR.node'
import * as si from 'systeminformation'

// Some bridging between our main process and renderer process.
// Note: src/electronAPI.ts needs to be in sync with this file.

const osInfo = await si.osInfo()

contextBridge.exposeInMainWorld('electronAPI', {
  // Some general methods.

  operatingSystem: () => {
    const architecture = osInfo.arch === 'x64' ? 'Intel' : 'ARM'

    if (osInfo.platform === 'Windows') {
      // Note: osInfo.distro returns something like "Microsoft Windows 11 Pro", but we want it to return
      //       "Windows 11 Pro", so we remove the "Microsoft " part.

      return osInfo.distro.replace('Microsoft ', '') + ' (' + architecture + ')'
    }

    if (osInfo.platform === 'linux') {
      return osInfo.distro + ' ' + osInfo.release + ' (' + architecture + ')'
    }

    return osInfo.distro + ' ' + osInfo.release + ' (' + architecture + ')'
  },

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
