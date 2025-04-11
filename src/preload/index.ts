import electron from 'electron'
import * as systemInformation from 'systeminformation'

// @ts-expect-error (libOpenCOR.node is a native module)
import loc from '../../dist/libOpenCOR/Release/libOpenCOR.node'

// Some bridging between our main process and renderer process.
// Note: this must be in sync with src/electronAPI.ts.

const osInfo = await systemInformation.osInfo()

electron.contextBridge.exposeInMainWorld('electronAPI', {
  // Some general methods.

  operatingSystem: () => {
    const architecture = osInfo.arch === 'x64' ? 'Intel' : 'ARM'

    if (osInfo.platform === 'Windows') {
      // Note: osInfo.distro returns something like "Microsoft Windows 11 Pro", but we want it to return
      //       "Windows 11 Pro", so we remove the "Microsoft " part.

      return osInfo.distro.replace('Microsoft ', '') + ' (' + architecture + ')'
    }

    return osInfo.distro + ' ' + osInfo.release + ' (' + architecture + ')'
  },

  // Renderer process asking the main process to do something for it.

  enableDisableMainMenu: (enable: boolean) => electron.ipcRenderer.invoke('enable-disable-main-menu', enable),
  enableDisableFileCloseAndCloseAllMenuItems: (enable: boolean) =>
    electron.ipcRenderer.invoke('enable-disable-file-close-and-close-all-menu-items', enable),
  filePath: (file: File) => electron.webUtils.getPathForFile(file),
  resetAll: () => electron.ipcRenderer.invoke('reset-all'),

  // Renderer process listening to the main process.

  onAbout: (callback: () => void) =>
    electron.ipcRenderer.on('about', () => {
      callback()
    }),
  onAction: (callback: (action: string) => void) =>
    electron.ipcRenderer.on('action', (_event, action) => {
      callback(action)
    }),
  onCheckForUpdates: (callback: () => void) =>
    electron.ipcRenderer.on('check-for-updates', () => {
      callback()
    }),
  onEnableDisableUi: (callback: (enable: boolean) => void) =>
    electron.ipcRenderer.on('enable-disable-ui', (_event, enable: boolean) => {
      callback(enable)
    }),
  onOpen: (callback: (filePath: string) => void) =>
    electron.ipcRenderer.on('open', (_event, ...filePaths) => {
      for (const filePath of filePaths) {
        callback(filePath)
      }
    }),
  onOpenRemote: (callback: () => void) =>
    electron.ipcRenderer.on('open-remote', () => {
      callback()
    }),
  onClose: (callback: () => void) =>
    electron.ipcRenderer.on('close', () => {
      callback()
    }),
  onCloseAll: (callback: () => void) =>
    electron.ipcRenderer.on('close-all', () => {
      callback()
    }),
  onResetAll: (callback: () => void) =>
    electron.ipcRenderer.on('reset-all', () => {
      callback()
    }),
  onSettings: (callback: () => void) =>
    electron.ipcRenderer.on('settings', () => {
      callback()
    })
})

// Give our renderer process access to the native node module for libOpenCOR.
// Note: this must be in sync with src/libopencor/src/main.cpp.

electron.contextBridge.exposeInMainWorld('locAPI', {
  // Some general methods.

  version: () => loc.version(),

  // FileManager API.

  fileManagerUnmanage: (path: string) => loc.fileManagerUnmanage(path),

  // File API.

  fileContents: (path: string) => loc.fileContents(path),
  fileCreate: (path: string, contents: object) => loc.fileCreate(path, contents),
  fileIssues: (path: string) => loc.fileIssues(path),
  fileType: (path: string) => loc.fileType(path),

  // SedDocument API.

  sedDocumentCreate: (path: string) => loc.sedDocumentCreate(path),
  sedDocumentInstantiate: (path: string) => loc.sedDocumentInstantiate(path),
  sedDocumentIssues: (path: string) => loc.sedDocumentIssues(path),
  sedDocumentModelCount: (path: string) => loc.sedDocumentModelCount(path),
  sedDocumentSimulationCount: (path: string) => loc.sedDocumentSimulationCount(path),
  sedDocumentSimulationType: (path: string, index: number) => loc.sedDocumentSimulationType(path, index),
  sedDocumentSimulationOneStepStep: (path: string, index: number) => loc.sedDocumentSimulationOneStepStep(path, index),
  sedDocumentSimulationUniformTimeCourseInitialTime: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseInitialTime(path, index),
  sedDocumentSimulationUniformTimeCourseOutputStartTime: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseOutputStartTime(path, index),
  sedDocumentSimulationUniformTimeCourseOutputEndTime: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseOutputEndTime(path, index),
  sedDocumentSimulationUniformTimeCourseNumberOfSteps: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseNumberOfSteps(path, index),

  // SedInstance API.

  sedInstanceIssues: (path: string) => loc.sedInstanceIssues(path),
  sedInstanceRun: (path: string) => loc.sedInstanceRun(path),

  // SedInstanceTask API.

  sedInstanceTaskVoiUnit: (path: string, index: number) => loc.sedInstanceTaskVoiUnit(path, index),
  sedInstanceTaskVoi: (path: string, index: number) => loc.sedInstanceTaskVoi(path, index),
  sedInstanceTaskState: (path: string, index: number, stateIndex: number) =>
    loc.sedInstanceTaskState(path, index, stateIndex)
})
