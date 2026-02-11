import electron from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateCheckResult } from 'electron-updater';
import path from 'node:path';

import { formatError, isDataUrlOmexFileName, isHttpUrl, type ISettings } from '../renderer/src/common/common.ts';
import { FULL_URI_SCHEME, LONG_DELAY, SHORT_DELAY } from '../renderer/src/common/constants.ts';
import { isLinux, isMacOs, isPackaged, isWindows } from '../renderer/src/common/electron.ts';
/* TODO: enable once our GitHub integration is fully ready.
import { deleteGitHubAccessToken } from '../renderer/src/common/gitHubIntegration';
*/

import icon from './assets/icon.png?asset';
import { ApplicationWindow } from './ApplicationWindow.ts';
import { electronConf, type IElectronConfState } from './index.ts';
import { enableDisableMainMenu, updateReopenMenu } from './MainMenu.ts';
import type { SplashScreenWindow } from './SplashScreenWindow.ts';

autoUpdater.autoDownload = false;
autoUpdater.logger = null;

export const checkForUpdates = (atStartup: boolean): void => {
  // Check for updates, if requested and if OpenCOR is packaged.

  if (isPackaged() && electronConf.get('settings.general.checkForUpdatesAtStartup')) {
    autoUpdater
      .checkForUpdates()
      .then((result: UpdateCheckResult | null) => {
        const updateAvailable = result?.isUpdateAvailable ?? false;

        if (updateAvailable) {
          MainWindow.instance?.webContents.send('update-available', result?.updateInfo.version);
        } else if (!atStartup) {
          MainWindow.instance?.webContents.send('update-not-available');
        }
      })
      .catch((error: unknown) => {
        MainWindow.instance?.webContents.send('update-check-error', formatError(error));
      });
  }
};

autoUpdater.on('download-progress', (info: ProgressInfo) => {
  MainWindow.instance?.webContents.send('update-download-progress', info.percent);
});

export const downloadAndInstallUpdate = (): void => {
  autoUpdater
    .downloadUpdate()
    .then(() => {
      MainWindow.instance?.webContents.send('update-downloaded');
    })
    .catch((error: unknown) => {
      MainWindow.instance?.webContents.send('update-download-error', formatError(error));
    });
};

export const installUpdateAndRestart = (): void => {
  autoUpdater.quitAndInstall(true, true);
};

export const loadSettings = (): ISettings => {
  return electronConf.get('settings');
};

export const saveSettings = (settings: ISettings): void => {
  electronConf.set('settings', settings);
};

let _resetAll = false;

export const resetAll = (): void => {
  _resetAll = true;

  /* TODO: enable once our GitHub integration is fully ready.
  deleteGitHubAccessToken();
*/

  electron.app.relaunch();
  electron.app.quit();
};

let recentFilePaths: string[] = [];

export const clearRecentFiles = (): void => {
  recentFilePaths = [];

  updateReopenMenu(recentFilePaths);
};

export const fileClosed = (filePath: string): void => {
  // Make sure that the file is not a COMBINE archive that was opened using a data URL.

  if (isDataUrlOmexFileName(filePath)) {
    return;
  }

  recentFilePaths.unshift(filePath);
  recentFilePaths = recentFilePaths.slice(0, 10);

  updateReopenMenu(recentFilePaths);
};

export const fileIssue = (filePath: string): void => {
  recentFilePaths = recentFilePaths.filter((recentFilePath) => recentFilePath !== filePath);

  updateReopenMenu(recentFilePaths);
};

export const fileOpened = (filePath: string): void => {
  recentFilePaths = recentFilePaths.filter((recentFilePath) => recentFilePath !== filePath);

  updateReopenMenu(recentFilePaths);

  // A file has been opened, but it may have been opened while reopening files during OpenCOR startup, in which case we
  // need to reopen the next file, hence our call to reopenFilePathsAndSelectFilePath(), which will do nothing if there
  // are no more files to reopen.

  MainWindow.instance?.reopenFilePathsAndSelectFilePath();
};

let openedFilePaths: string[] = [];

export const filesOpened = (filePaths: string[]): void => {
  openedFilePaths = filePaths;

  if (!filePaths.length) {
    selectedFilePath = null;
  }
};

let selectedFilePath: string | null = null;

export const fileSelected = (filePath: string): void => {
  selectedFilePath = filePath;
};

export class MainWindow extends ApplicationWindow {
  // Properties.

  static instance: MainWindow | null = null;

  private _splashScreenWindowClosed = false;

  private _openedFilePaths: string[] = [];
  private _selectedFilePath = '';

  // Constructor.

  constructor(commandLine: string[], splashScreenWindow: SplashScreenWindow, rendererUrl: string) {
    // Initialise ourselves.

    const state: IElectronConfState = electronConf.get('app.state');

    super({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
      minWidth: 640,
      minHeight: 480,
      ...(isMacOs() ? {} : { icon: icon })
    });

    // Keep track of the current isntance.

    MainWindow.instance = this;

    // Set our dock icon (macOS only).

    if (!isPackaged() && isMacOs()) {
      electron.app.dock?.setIcon(icon);
    }

    // Restore our state, if needed.

    if (state.isMaximized) {
      this.maximize();
    } else if (state.isFullScreen) {
      this.setFullScreen(true);
    }

    // Ask for the splash screen window to be closed with a short delay once we are visible and handle our command line
    // (also with a short delay if needed).

    this.once('show', () => {
      let handleCommandLineDelay = SHORT_DELAY;

      if (!this._splashScreenWindowClosed) {
        this._splashScreenWindowClosed = true;

        handleCommandLineDelay = LONG_DELAY;

        setTimeout(() => {
          splashScreenWindow.close();
        }, LONG_DELAY);
      }

      setTimeout(() => {
        // Retrieve the recently opened files and our Reopen menu.
        // Note: for some reasons, recentFilePAths may, in some cases, end up having only one null entry, so just in
        //       case we filter out all null entries.

        recentFilePaths = (electronConf.get('app.files.recent') as string[]).filter(
          (filePath: string | null) => filePath
        );

        updateReopenMenu(recentFilePaths);

        // Reopen previously opened files, if any, and select the previously selected file.

        this._openedFilePaths = electronConf.get('app.files.opened');
        this._selectedFilePath = electronConf.get('app.files.selected');

        this.reopenFilePathsAndSelectFilePath();

        // The command line can either be a classical command line or an OpenCOR action (i.e. an opencor:// link). In
        // the former case, we need to remove one or two arguments while, in the latter case, nothing should be removed.

        if (!this.isAction(commandLine[0])) {
          // The first argument is not an action, so remove the first argument and then the second argument, but only
          // if we are not packaged.

          commandLine.shift();

          if (!isPackaged() && commandLine.length) {
            commandLine.shift();
          }
        }

        // When auto updating OpenCOR, we may end up with an extra argument that we need to ignore.

        if ((isWindows() || isMacOs()) && commandLine[0] === '--updated') {
          commandLine.shift();
        } else if (isLinux() && commandLine[0] === '--no-sandbox') {
          commandLine.shift();
        }

        this.handleArguments(commandLine);
      }, handleCommandLineDelay);
    });

    // Keep track of our settings unless we are resetting all.

    this.on('close', () => {
      if (_resetAll) {
        electronConf.clear();
      } else {
        // Main window state.

        if (!this.isMaximized() && !this.isMinimized() && !this.isFullScreen()) {
          const [stateX, stateY] = this.getPosition();
          const [stateWidth, stateHeight] = this.getContentSize();

          if (typeof stateX === 'number' && typeof stateY === 'number') {
            state.x = stateX;
            state.y = stateY;
          }

          if (typeof stateWidth === 'number' && typeof stateHeight === 'number') {
            state.width = stateWidth;
            state.height = stateHeight;
          }
        }

        state.isMaximized = this.isMaximized();
        state.isFullScreen = this.isFullScreen();

        electronConf.set('app.state', state);

        // Recent files.

        electronConf.set('app.files.recent', recentFilePaths);

        // Opened files and selected file.
        // Note: make sure that no data URL OMEX file is to be reopened or selected.

        const actualOpenedFilePaths = openedFilePaths.filter((filePath) => !isDataUrlOmexFileName(filePath));
        let actualSelectedFilePath = selectedFilePath;

        if (selectedFilePath && isDataUrlOmexFileName(selectedFilePath)) {
          actualSelectedFilePath = actualOpenedFilePaths[0] || null;
        }

        electronConf.set('app.files.opened', actualOpenedFilePaths);
        electronConf.set('app.files.selected', actualSelectedFilePath);
      }
    });

    // Enable our main menu.

    enableDisableMainMenu(true);

    // Make sure that our menu bar is always visible.

    this.setAutoHideMenuBar(false);
    this.setMenuBarVisibility(true);

    // Open links in the default browser, unless it is a Firebase OAuth popup in which case we open it in a new window
    // so that the OAuth flow can proceed.

    this.webContents.setWindowOpenHandler((details) => {
      const isFirebaseOauthPopup = (url: string): boolean => {
        try {
          const parsedUrl = new URL(url);

          return (
            (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
            parsedUrl.host === 'opencorapp.firebaseapp.com' &&
            parsedUrl.pathname === '/__/auth/handler'
          );
        } catch {
          return false;
        }
      };

      if (isFirebaseOauthPopup(details.url)) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            parent: this,
            modal: false,
            autoHideMenuBar: true,
            width: 600,
            height: 700,
            backgroundColor: electron.nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff',
            // Note: use the same colours as the ones used by --p-content-background in PrimeVue, i.e. what we are using
            //       as a background for our app (see src/renderer/src/assets/app.css).
            webPreferences: {
              preload: undefined,
              sandbox: true,
              contextIsolation: true,
              nodeIntegration: false
            }
          }
        };
      }

      if (isHttpUrl(details.url)) {
        electron.shell.openExternal(details.url).catch((error: unknown) => {
          console.error(`Failed to open external URL (${details.url}):`, formatError(error));
        });
      } else {
        console.warn(`Blocked attempt to open unsupported URL (${details.url}).`);
      }

      return {
        action: 'deny'
      };
    });

    // Load the renderer URL.

    this.loadURL(rendererUrl).catch((error: unknown) => {
      console.error(`Failed to load URL (${rendererUrl}):`, formatError(error));
    });
  }

  // Reopen previously opened files, if any, and select the previously selected file.
  // Note: we reopen one file at a time since a file may be a remote file which means that it may take some time to
  //       reopen. So, we need to wait for the file to be reopened before reopening the next one.

  reopenFilePathsAndSelectFilePath(): void {
    if (this._openedFilePaths.length) {
      const filePath = this._openedFilePaths[0];

      this.webContents.send('open', filePath);

      this._openedFilePaths = this._openedFilePaths.slice(1);

      if (this._openedFilePaths.length) {
        return;
      }
    }

    if (this._selectedFilePath) {
      this.webContents.send('select', this._selectedFilePath);

      this._selectedFilePath = '';
    }
  }

  // Handle our command line arguments.

  isAction(argument: string | undefined): boolean {
    if (!argument) {
      return false;
    }

    return argument.startsWith(FULL_URI_SCHEME);
  }

  handleArguments(commandLine: string[]): void {
    if (!commandLine.length) {
      return;
    }

    commandLine.forEach((argument: string) => {
      if (this.isAction(argument)) {
        this.webContents.send('action', argument.slice(FULL_URI_SCHEME.length));
      } else if (argument !== '--allow-file-access-from-files' && argument !== '--enable-avfoundation') {
        // The argument is not an action (and not --allow-file-access-from-files or --enable-avfoundation either), so it
        // must be a file to open. But, first, check whether the argument is a relative path and, if so, convert it to
        // an absolute path.

        if (!path.isAbsolute(argument)) {
          argument = path.resolve(argument);
        }

        this.webContents.send('open', argument);
      }
    });
  }

  // Enable/disable our UI.

  enableDisableUi(enable: boolean): void {
    enableDisableMainMenu(enable);

    this.webContents.send('enable-disable-ui', enable);
  }

  // Handle our File|Open menu.

  open(): void {
    this.enableDisableUi(false);

    electron.dialog
      .showOpenDialog({
        properties: ['openFile', 'multiSelections']
      })
      .then(({ filePaths }) => {
        for (const filePath of filePaths) {
          this.webContents.send('open', filePath);
        }

        this.enableDisableUi(true);
      })
      .catch((error: unknown) => {
        console.error('Failed to open file(s):', formatError(error));

        this.enableDisableUi(true);
      });
  }
}
