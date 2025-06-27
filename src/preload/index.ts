import electron from 'electron'
import * as systemInformation from 'systeminformation'

// @ts-expect-error (libOpenCOR.node is a native module)
import loc from '../../dist/libOpenCOR/Release/libOpenCOR.node'

// Some bridging between our main process and renderer process.
// Note: this must be in sync with src/electronApi.ts.

const osInfo = await systemInformation.osInfo()

electron.contextBridge.exposeInMainWorld('electronApi', {
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
  fileClosed: (filePath: string) => electron.ipcRenderer.invoke('file-closed', filePath),
  fileIssue: (filePath: string) => electron.ipcRenderer.invoke('file-issue', filePath),
  fileOpened: (filePath: string) => electron.ipcRenderer.invoke('file-opened', filePath),
  filePath: (file: File) => electron.webUtils.getPathForFile(file),
  fileSelected: (filePath: string) => electron.ipcRenderer.invoke('file-selected', filePath),
  filesOpened: (filePaths: string[]) => electron.ipcRenderer.invoke('files-opened', filePaths),
  resetAll: () => electron.ipcRenderer.invoke('reset-all'),

  // Renderer process listening to the main process.

  onAbout: (callback: () => void) =>
    electron.ipcRenderer.on('about', () => {
      callback()
    }),
  onAction: (callback: (action: string) => void) =>
    electron.ipcRenderer.on('action', (_event, action: string) => {
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
    electron.ipcRenderer.on('open', (_event, filePath: string) => {
      callback(filePath)
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
  onSelect: (callback: (filePath: string) => void) =>
    electron.ipcRenderer.on('select', (_event, filePath: string) => {
      callback(filePath)
    }),
  onSettings: (callback: () => void) =>
    electron.ipcRenderer.on('settings', () => {
      callback()
    })
})

// Give our renderer process access to the native node module for libOpenCOR.
// Note: this must be in sync with src/libopencor/src/main.cpp.

electron.contextBridge.exposeInMainWorld('locApi', {
  // Some general methods.

  version: () => loc.version(),

  // FileManager API.

  fileManagerUnmanage: (path: string) => loc.fileManagerUnmanage(path),

  // File API.

  fileContents: (path: string) => loc.fileContents(path),
  fileCreate: (path: string, contents: object) => loc.fileCreate(path, contents),
  fileIssues: (path: string) => loc.fileIssues(path),
  fileType: (path: string) => loc.fileType(path),
  fileUiJson: (path: string) => loc.fileUiJson(path),

  // SedDocument API.

  sedDocumentCreate: (path: string) => loc.sedDocumentCreate(path),
  sedDocumentInstantiate: (path: string) => loc.sedDocumentInstantiate(path),
  sedDocumentIssues: (path: string) => loc.sedDocumentIssues(path),
  sedDocumentModelCount: (path: string) => loc.sedDocumentModelCount(path),
  sedDocumentSimulationCount: (path: string) => loc.sedDocumentSimulationCount(path),
  sedDocumentModelAddChange: (
    path: string,
    index: number,
    componentName: string,
    variableName: string,
    newValue: string
  ) => loc.sedDocumentModelAddChange(path, index, componentName, variableName, newValue),
  sedDocumentModelRemoveAllChanges: (path: string, index: number) => loc.sedDocumentModelRemoveAllChanges(path, index),
  sedDocumentSimulationType: (path: string, index: number) => loc.sedDocumentSimulationType(path, index),
  sedDocumentSimulationOneStepStep: (path: string, index: number) => loc.sedDocumentSimulationOneStepStep(path, index),
  sedDocumentSimulationUniformTimeCourseInitialTime: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseInitialTime(path, index),
  sedDocumentSimulationUniformTimeCourseOutputStartTime: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseOutputStartTime(path, index),
  sedDocumentSimulationUniformTimeCourseSetOutputStartTime: (path: string, index: number, value: number) =>
    loc.sedDocumentSimulationUniformTimeCourseSetOutputStartTime(path, index, value),
  sedDocumentSimulationUniformTimeCourseOutputEndTime: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseOutputEndTime(path, index),
  sedDocumentSimulationUniformTimeCourseSetOutputEndTime: (path: string, index: number, value: number) =>
    loc.sedDocumentSimulationUniformTimeCourseSetOutputEndTime(path, index, value),
  sedDocumentSimulationUniformTimeCourseNumberOfSteps: (path: string, index: number) =>
    loc.sedDocumentSimulationUniformTimeCourseNumberOfSteps(path, index),
  sedDocumentSimulationUniformTimeCourseSetNumberOfSteps: (path: string, index: number, value: number) =>
    loc.sedDocumentSimulationUniformTimeCourseSetNumberOfSteps(path, index, value),

  // SedInstance API.

  sedInstanceIssues: (path: string) => loc.sedInstanceIssues(path),
  sedInstanceRun: (path: string) => loc.sedInstanceRun(path),

  // SedInstanceTask API.

  sedInstanceTaskVoiName: (path: string, index: number) => loc.sedInstanceTaskVoiName(path, index),
  sedInstanceTaskVoiUnit: (path: string, index: number) => loc.sedInstanceTaskVoiUnit(path, index),
  sedInstanceTaskVoi: (path: string, index: number) => loc.sedInstanceTaskVoi(path, index),
  sedInstanceTaskStateCount: (path: string, index: number) => loc.sedInstanceTaskStateCount(path, index),
  sedInstanceTaskStateName: (path: string, index: number, stateIndex: number) =>
    loc.sedInstanceTaskStateName(path, index, stateIndex),
  sedInstanceTaskStateUnit: (path: string, index: number, stateIndex: number) =>
    loc.sedInstanceTaskStateUnit(path, index, stateIndex),
  sedInstanceTaskState: (path: string, index: number, stateIndex: number) =>
    loc.sedInstanceTaskState(path, index, stateIndex),
  sedInstanceTaskRateCount: (path: string, index: number) => loc.sedInstanceTaskRateCount(path, index),
  sedInstanceTaskRateName: (path: string, index: number, rateIndex: number) =>
    loc.sedInstanceTaskRateName(path, index, rateIndex),
  sedInstanceTaskRateUnit: (path: string, index: number, rateIndex: number) =>
    loc.sedInstanceTaskRateUnit(path, index, rateIndex),
  sedInstanceTaskRate: (path: string, index: number, rateIndex: number) =>
    loc.sedInstanceTaskRate(path, index, rateIndex),
  sedInstanceTaskConstantCount: (path: string, index: number) => loc.sedInstanceTaskConstantCount(path, index),
  sedInstanceTaskConstantName: (path: string, index: number, constantIndex: number) =>
    loc.sedInstanceTaskConstantName(path, index, constantIndex),
  sedInstanceTaskConstantUnit: (path: string, index: number, constantIndex: number) =>
    loc.sedInstanceTaskConstantUnit(path, index, constantIndex),
  sedInstanceTaskConstant: (path: string, index: number, constantIndex: number) =>
    loc.sedInstanceTaskConstant(path, index, constantIndex),
  sedInstanceTaskComputedConstantCount: (path: string, index: number) =>
    loc.sedInstanceTaskComputedConstantCount(path, index),
  sedInstanceTaskComputedConstantName: (path: string, index: number, computedConstantIndex: number) =>
    loc.sedInstanceTaskComputedConstantName(path, index, computedConstantIndex),
  sedInstanceTaskComputedConstantUnit: (path: string, index: number, computedConstantIndex: number) =>
    loc.sedInstanceTaskComputedConstantUnit(path, index, computedConstantIndex),
  sedInstanceTaskComputedConstant: (path: string, index: number, computedConstantIndex: number) =>
    loc.sedInstanceTaskComputedConstant(path, index, computedConstantIndex),
  sedInstanceTaskAlgebraicCount: (path: string, index: number) => loc.sedInstanceTaskAlgebraicCount(path, index),
  sedInstanceTaskAlgebraicName: (path: string, index: number, algebraicIndex: number) =>
    loc.sedInstanceTaskAlgebraicName(path, index, algebraicIndex),
  sedInstanceTaskAlgebraicUnit: (path: string, index: number, algebraicIndex: number) =>
    loc.sedInstanceTaskAlgebraicUnit(path, index, algebraicIndex),
  sedInstanceTaskAlgebraic: (path: string, index: number, algebraicIndex: number) =>
    loc.sedInstanceTaskAlgebraic(path, index, algebraicIndex)
})
