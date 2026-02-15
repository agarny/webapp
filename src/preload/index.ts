import electron from 'electron';
import { exec as _exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';

// @ts-expect-error (libOpenCOR.node is a native module)
import loc from '../../dist/libOpenCOR/Release/libOpenCOR.node';

import type { ISettings } from '../renderer/src/common/common.ts';
import type { ISplashScreenInfo } from '../renderer/src/common/electronApi.ts';

const exec = promisify(_exec);

const _operatingSystem = await (async (): Promise<string> => {
  const safeExec = async (cmd: string): Promise<string | null> => {
    try {
      const { stdout } = await exec(cmd);

      return stdout?.toString().trim() || null;
    } catch {
      return null;
    }
  };

  let operatingSystem: string = '';

  if (process.platform === 'win32') {
    const res = await safeExec('wmic os get Caption');

    if (res) {
      const lines = res
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (lines[1]) {
        operatingSystem = lines[1].replace(/^Microsoft\s+/, '');
      }
    }

    operatingSystem = operatingSystem || 'Windows';
  } else if (process.platform === 'linux') {
    let res: string | null = null;

    try {
      res = await fs.readFile('/etc/os-release', 'utf8');
    } catch {}

    const match = res?.match(/^PRETTY_NAME=(?:")?(.*?)(?:")?$|^NAME=(?:")?(.*?)(?:")?$/m) || null;

    if (match) {
      operatingSystem = (match[1] || match[2] || '').replace(/"/g, '').trim();
    }

    if (!operatingSystem) {
      res = await safeExec('lsb_release -ds');

      operatingSystem = res?.replace(/^"|"$/g, '') || '';
    }

    operatingSystem = operatingSystem || 'Linux';
  } else if (process.platform === 'darwin') {
    const nameRes = await safeExec('sw_vers -productName');
    const versionRes = await safeExec('sw_vers -productVersion');

    if (nameRes || versionRes) {
      operatingSystem = `${nameRes || 'macOS'} ${versionRes || ''}`.trim();
    }

    operatingSystem = operatingSystem || 'macOS';
  }
  return `${operatingSystem || process.platform} (${process.arch === 'x64' ? 'Intel' : 'ARM'})`;
})();

// Some bridging between our main process and renderer process.
// Note: this must be in sync with src/electronApi.ts.

electron.contextBridge.exposeInMainWorld('electronApi', {
  // Some general methods.

  operatingSystem: () => {
    return _operatingSystem;
  },

  // Splash screen window.

  onInitSplashScreenWindow: (callback: (info: ISplashScreenInfo) => void) =>
    electron.ipcRenderer.on('init-splash-screen-window', (_event, info: ISplashScreenInfo) => {
      callback(info);
    }),

  // Renderer process asking the main process to do something for it.

  checkForUpdates: (atStartup: boolean) => electron.ipcRenderer.invoke('check-for-updates', atStartup),
  clearGitHubCache: (): Promise<void> => electron.ipcRenderer.invoke('clear-github-cache'),
  deleteGitHubAccessToken: (): Promise<boolean> => electron.ipcRenderer.invoke('delete-github-access-token'),
  downloadAndInstallUpdate: () => electron.ipcRenderer.invoke('download-and-install-update'),
  enableDisableMainMenu: (enable: boolean) => electron.ipcRenderer.invoke('enable-disable-main-menu', enable),
  enableDisableFileCloseAndCloseAllMenuItems: (enable: boolean) =>
    electron.ipcRenderer.invoke('enable-disable-file-close-and-close-all-menu-items', enable),
  fileClosed: (filePath: string) => electron.ipcRenderer.invoke('file-closed', filePath),
  fileIssue: (filePath: string) => electron.ipcRenderer.invoke('file-issue', filePath),
  fileOpened: (filePath: string) => electron.ipcRenderer.invoke('file-opened', filePath),
  filePath: (file: File) => electron.webUtils.getPathForFile(file),
  fileSelected: (filePath: string) => electron.ipcRenderer.invoke('file-selected', filePath),
  filesOpened: (filePaths: string[]) => electron.ipcRenderer.invoke('files-opened', filePaths),
  installUpdateAndRestart: () => electron.ipcRenderer.invoke('install-update-and-restart'),
  loadGitHubAccessToken: (): Promise<string | null> => electron.ipcRenderer.invoke('load-github-access-token'),
  loadSettings: (): Promise<ISettings> => electron.ipcRenderer.invoke('load-settings'),
  resetAll: () => electron.ipcRenderer.invoke('reset-all'),
  saveGitHubAccessToken: (token: string): Promise<boolean> =>
    electron.ipcRenderer.invoke('save-github-access-token', token),
  saveSettings: (settings: ISettings) => electron.ipcRenderer.invoke('save-settings', settings),

  // Renderer process listening to the main process.

  onAbout: (callback: () => void) =>
    electron.ipcRenderer.on('about', () => {
      callback();
    }),
  onAction: (callback: (action: string) => void) =>
    electron.ipcRenderer.on('action', (_event, action: string) => {
      callback(action);
    }),
  onCheckForUpdates: (callback: () => void) =>
    electron.ipcRenderer.on('check-for-updates', () => {
      callback();
    }),
  onEnableDisableUi: (callback: (enable: boolean) => void) =>
    electron.ipcRenderer.on('enable-disable-ui', (_event, enable: boolean) => {
      callback(enable);
    }),
  onOpen: (callback: (filePath: string) => void) =>
    electron.ipcRenderer.on('open', (_event, filePath: string) => {
      callback(filePath);
    }),
  onOpenRemote: (callback: () => void) =>
    electron.ipcRenderer.on('open-remote', () => {
      callback();
    }),
  onOpenSampleLorenz: (callback: () => void) =>
    electron.ipcRenderer.on('open-sample-lorenz', () => {
      callback();
    }),
  onClose: (callback: () => void) =>
    electron.ipcRenderer.on('close', () => {
      callback();
    }),
  onCloseAll: (callback: () => void) =>
    electron.ipcRenderer.on('close-all', () => {
      callback();
    }),
  onResetAll: (callback: () => void) =>
    electron.ipcRenderer.on('reset-all', () => {
      callback();
    }),
  onSelect: (callback: (filePath: string) => void) =>
    electron.ipcRenderer.on('select', (_event, filePath: string) => {
      callback(filePath);
    }),
  onSettings: (callback: () => void) =>
    electron.ipcRenderer.on('settings', () => {
      callback();
    }),
  onUpdateAvailable: (callback: (version: string) => void) =>
    electron.ipcRenderer.on('update-available', (_event, version: string) => {
      callback(version);
    }),
  onUpdateCheckError: (callback: (issue: string) => void) =>
    electron.ipcRenderer.on('update-check-error', (_event, issue: string) => {
      callback(issue);
    }),
  onUpdateDownloaded: (callback: () => void) =>
    electron.ipcRenderer.on('update-downloaded', () => {
      callback();
    }),
  onUpdateDownloadError: (callback: (issue: string) => void) =>
    electron.ipcRenderer.on('update-download-error', (_event, issue: string) => {
      callback(issue);
    }),
  onUpdateDownloadProgress: (callback: (percent: number) => void) =>
    electron.ipcRenderer.on('update-download-progress', (_event, percent: number) => {
      callback(percent);
    }),
  onUpdateNotAvailable: (callback: () => void) =>
    electron.ipcRenderer.on('update-not-available', () => {
      callback();
    })
});

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
  sedDocumentInstantiate: (documentId: number) => loc.sedDocumentInstantiate(documentId),
  sedDocumentIssues: (documentId: number) => loc.sedDocumentIssues(documentId),
  sedDocumentModelCount: (documentId: number) => loc.sedDocumentModelCount(documentId),
  sedDocumentSimulationCount: (documentId: number) => loc.sedDocumentSimulationCount(documentId),
  sedDocumentSimulationType: (documentId: number, index: number) => loc.sedDocumentSimulationType(documentId, index),
  sedDocumentSerialise: (documentId: number) => loc.sedDocumentSerialise(documentId),
  sedModelFilePath: (documentId: number, index: number) => loc.sedModelFilePath(documentId, index),
  sedModelAddChange: (
    documentId: number,
    index: number,
    componentName: string,
    variableName: string,
    newValue: string
  ) => loc.sedModelAddChange(documentId, index, componentName, variableName, newValue),
  sedModelRemoveAllChanges: (documentId: number, index: number) => loc.sedModelRemoveAllChanges(documentId, index),
  sedOneStepStep: (documentId: number, index: number) => loc.sedOneStepStep(documentId, index),
  sedUniformTimeCourseInitialTime: (documentId: number, index: number) =>
    loc.sedUniformTimeCourseInitialTime(documentId, index),
  sedUniformTimeCourseSetInitialTime: (documentId: number, index: number, value: number) =>
    loc.sedUniformTimeCourseSetInitialTime(documentId, index, value),
  sedUniformTimeCourseOutputStartTime: (documentId: number, index: number) =>
    loc.sedUniformTimeCourseOutputStartTime(documentId, index),
  sedUniformTimeCourseSetOutputStartTime: (documentId: number, index: number, value: number) =>
    loc.sedUniformTimeCourseSetOutputStartTime(documentId, index, value),
  sedUniformTimeCourseOutputEndTime: (documentId: number, index: number) =>
    loc.sedUniformTimeCourseOutputEndTime(documentId, index),
  sedUniformTimeCourseSetOutputEndTime: (documentId: number, index: number, value: number) =>
    loc.sedUniformTimeCourseSetOutputEndTime(documentId, index, value),
  sedUniformTimeCourseNumberOfSteps: (documentId: number, index: number) =>
    loc.sedUniformTimeCourseNumberOfSteps(documentId, index),
  sedUniformTimeCourseSetNumberOfSteps: (documentId: number, index: number, value: number) =>
    loc.sedUniformTimeCourseSetNumberOfSteps(documentId, index, value),

  // SolverCvode API.
  // TODO: this is only temporary until we have full support for our different solvers.

  solverCvodeMaximumStep: (documentId: number, index: number) => loc.solverCvodeMaximumStep(documentId, index),
  solverCvodeSetMaximumStep: (documentId: number, index: number, value: number) =>
    loc.solverCvodeSetMaximumStep(documentId, index, value),

  // SedInstance API.

  sedInstanceHasIssues: (instanceId: number) => loc.sedInstanceHasIssues(instanceId),
  sedInstanceIssues: (instanceId: number) => loc.sedInstanceIssues(instanceId),
  sedInstanceRun: (instanceId: number) => loc.sedInstanceRun(instanceId),

  // SedInstanceTask API.

  sedInstanceTaskVoiName: (instanceId: number, index: number) => loc.sedInstanceTaskVoiName(instanceId, index),
  sedInstanceTaskVoiUnit: (instanceId: number, index: number) => loc.sedInstanceTaskVoiUnit(instanceId, index),
  sedInstanceTaskVoi: (instanceId: number, index: number) => loc.sedInstanceTaskVoi(instanceId, index),
  sedInstanceTaskStateCount: (instanceId: number, index: number) => loc.sedInstanceTaskStateCount(instanceId, index),
  sedInstanceTaskStateName: (instanceId: number, index: number, stateIndex: number) =>
    loc.sedInstanceTaskStateName(instanceId, index, stateIndex),
  sedInstanceTaskStateUnit: (instanceId: number, index: number, stateIndex: number) =>
    loc.sedInstanceTaskStateUnit(instanceId, index, stateIndex),
  sedInstanceTaskState: (instanceId: number, index: number, stateIndex: number) =>
    loc.sedInstanceTaskState(instanceId, index, stateIndex),
  sedInstanceTaskRateCount: (instanceId: number, index: number) => loc.sedInstanceTaskRateCount(instanceId, index),
  sedInstanceTaskRateName: (instanceId: number, index: number, rateIndex: number) =>
    loc.sedInstanceTaskRateName(instanceId, index, rateIndex),
  sedInstanceTaskRateUnit: (instanceId: number, index: number, rateIndex: number) =>
    loc.sedInstanceTaskRateUnit(instanceId, index, rateIndex),
  sedInstanceTaskRate: (instanceId: number, index: number, rateIndex: number) =>
    loc.sedInstanceTaskRate(instanceId, index, rateIndex),
  sedInstanceTaskConstantCount: (instanceId: number, index: number) =>
    loc.sedInstanceTaskConstantCount(instanceId, index),
  sedInstanceTaskConstantName: (instanceId: number, index: number, constantIndex: number) =>
    loc.sedInstanceTaskConstantName(instanceId, index, constantIndex),
  sedInstanceTaskConstantUnit: (instanceId: number, index: number, constantIndex: number) =>
    loc.sedInstanceTaskConstantUnit(instanceId, index, constantIndex),
  sedInstanceTaskConstant: (instanceId: number, index: number, constantIndex: number) =>
    loc.sedInstanceTaskConstant(instanceId, index, constantIndex),
  sedInstanceTaskComputedConstantCount: (instanceId: number, index: number) =>
    loc.sedInstanceTaskComputedConstantCount(instanceId, index),
  sedInstanceTaskComputedConstantName: (instanceId: number, index: number, computedConstantIndex: number) =>
    loc.sedInstanceTaskComputedConstantName(instanceId, index, computedConstantIndex),
  sedInstanceTaskComputedConstantUnit: (instanceId: number, index: number, computedConstantIndex: number) =>
    loc.sedInstanceTaskComputedConstantUnit(instanceId, index, computedConstantIndex),
  sedInstanceTaskComputedConstant: (instanceId: number, index: number, computedConstantIndex: number) =>
    loc.sedInstanceTaskComputedConstant(instanceId, index, computedConstantIndex),
  sedInstanceTaskAlgebraicVariableCount: (instanceId: number, index: number) =>
    loc.sedInstanceTaskAlgebraicVariableCount(instanceId, index),
  sedInstanceTaskAlgebraicVariableName: (instanceId: number, index: number, algebraicVariableIndex: number) =>
    loc.sedInstanceTaskAlgebraicVariableName(instanceId, index, algebraicVariableIndex),
  sedInstanceTaskAlgebraicVariableUnit: (instanceId: number, index: number, algebraicVariableIndex: number) =>
    loc.sedInstanceTaskAlgebraicVariableUnit(instanceId, index, algebraicVariableIndex),
  sedInstanceTaskAlgebraicVariable: (instanceId: number, index: number, algebraicVariableIndex: number) =>
    loc.sedInstanceTaskAlgebraicVariable(instanceId, index, algebraicVariableIndex)
});
