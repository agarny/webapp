import electron from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateCheckResult } from 'electron-updater';
import fs from 'node:fs';
import path from 'node:path';

import { formatError, isDataUrlOmexFileName, type ISettings, isUrl } from '../renderer/src/common/common';
import { FULL_URI_SCHEME, LONG_DELAY } from '../renderer/src/common/constants';
import { isMacOs, isPackaged } from '../renderer/src/common/electron';
/* TODO: enable once our GitHub integration is fully ready.
import { deleteGitHubAccessToken } from '../renderer/src/common/gitHubIntegration';
*/

import icon from './assets/icon.png?asset';
import { ApplicationWindow } from './ApplicationWindow';
import { electronConf, type IElectronConfState } from './index';
import { enableDisableMainMenu, updateReopenMenu } from './MainMenu';
import type { SplashScreenWindow } from './SplashScreenWindow';

autoUpdater.autoDownload = false;
autoUpdater.logger = null;

// Determine whether we can check for updates.
// Note: we can only check for updates if OpenCOR is packaged and has some update information, i.e. an app-update.yml
//       file next to its app.asar file, which electron-builder only generates when building a release (e.g., not when
//       building an unpacked version of OpenCOR using electron-builder --dir).

let _canCheckForUpdates: boolean | null = null;

export const canCheckForUpdates = (): boolean => {
  _canCheckForUpdates ??= isPackaged() && fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'));

  return _canCheckForUpdates;
};

export const checkForUpdates = (atStartup: boolean): void => {
  // Check for updates, if we can and if requested (i.e. at startup, if the user wants us to, or by the user).

  if (canCheckForUpdates() && (!atStartup || electronConf.get('settings.general.checkForUpdatesAtStartup'))) {
    autoUpdater
      .checkForUpdates()
      .then((result: UpdateCheckResult | null) => {
        const updateAvailable = result?.isUpdateAvailable ?? false;

        if (updateAvailable) {
          MainWindow.instance?.send('update-available', result?.updateInfo.version);
        } else if (!atStartup) {
          MainWindow.instance?.send('update-not-available');
        }
      })
      .catch((error: unknown) => {
        MainWindow.instance?.send('update-check-error', formatError(error));
      });
  }
};

autoUpdater.on('download-progress', (info: ProgressInfo) => {
  MainWindow.instance?.send('update-download-progress', info.percent);
});

export const downloadAndInstallUpdate = (): void => {
  autoUpdater
    .downloadUpdate()
    .then(() => {
      MainWindow.instance?.send('update-downloaded');
    })
    .catch((error: unknown) => {
      MainWindow.instance?.send('update-download-error', formatError(error));
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

const removeRecentFilePath = (filePath: string): boolean => {
  // Remove the given file path from our recent file paths and return whether it was removed (in which case our Reopen
  // menu needs to be updated).

  let res = false;

  for (let i = recentFilePaths.length - 1; i >= 0; --i) {
    if (recentFilePaths[i] === filePath) {
      recentFilePaths.splice(i, 1);

      res = true;
    }
  }

  return res;
};

export const clearRecentFiles = (): void => {
  recentFilePaths = [];

  updateReopenMenu(recentFilePaths);
};

export const fileClosed = (filePath: string): void => {
  // Make sure that the file is not a COMBINE archive that was opened using a data URL.

  if (isDataUrlOmexFileName(filePath)) {
    return;
  }

  removeRecentFilePath(filePath);

  recentFilePaths.unshift(filePath);

  if (recentFilePaths.length > 10) {
    recentFilePaths.length = 10;
  }

  updateReopenMenu(recentFilePaths);
};

export const fileIssue = (filePath: string): void => {
  if (removeRecentFilePath(filePath)) {
    updateReopenMenu(recentFilePaths);
  }

  // A file couldn't be opened, possibly while reopening files during OpenCOR startup, in which case we need to make sure
  // that it doesn't get selected and reopen the next file.

  MainWindow.instance?.reopenFilePathsAndSelectFilePath(filePath);
};

export const fileOpened = (filePath: string): void => {
  if (removeRecentFilePath(filePath)) {
    updateReopenMenu(recentFilePaths);
  }

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

// Retrieve the files that are currently open and the file that is currently selected, so that they can be reopened and
// selected (e.g., the next time OpenCOR is started or after our renderer has crashed).
// Note: a COMBINE archive that was opened using a data URL only exists in memory (under a made-up name, e.g.,
//       "OMEX #1"), so it cannot be reopened. Hence, we don't reopen such a file and, if it is the selected file, we
//       select the first file that is to be reopened instead.

interface IFilesToReopen {
  opened: string[];
  selected: string;
}

const currentFilesToReopen = (): IFilesToReopen => {
  const opened = openedFilePaths.filter((filePath) => !isDataUrlOmexFileName(filePath));
  const selected = selectedFilePath && !isDataUrlOmexFileName(selectedFilePath) ? selectedFilePath : (opened[0] ?? '');

  return { opened, selected };
};

// Determine whether the given argument is an OpenCOR action (i.e. an opencor:// link).

const isAction = (argument: string | undefined): boolean => {
  return argument?.startsWith(FULL_URI_SCHEME) ?? false;
};

// Normalise the given command line (i.e. the process.argv of an instance of OpenCOR), so that it only contains the
// files to open and the OpenCOR actions to handle, with files given as absolute paths.
// Note: this is used both for our own command line and for the command line of another instance of OpenCOR that was
//       started while we were running (see the second-instance event in src/main/index.ts), in which case relative
//       paths must be resolved against the working directory of that other instance.

export const normaliseCommandLine = (commandLine: string[], workingDirectory: string): string[] => {
  const res = [...commandLine];

  // The command line can either be a classical command line or an OpenCOR action (i.e. an opencor:// link). In the
  // former case, we need to remove the path to OpenCOR and, if we are not packaged, the path to our app, while, in the
  // latter case, nothing should be removed.

  if (!isAction(res[0])) {
    res.shift();

    if (!isPackaged() && res.length) {
      res.shift();
    }
  }

  // Ignore any switch (e.g., --updated when auto-updating OpenCOR on Windows and macOS, --no-sandbox on Linux, or any
  // switch added by Electron or Chromium) and make sure that local files are given as absolute paths.

  return res
    .filter((argument) => !argument.startsWith('--'))
    .map((argument) =>
      isAction(argument) || isUrl(argument) || path.isAbsolute(argument)
        ? argument
        : path.resolve(workingDirectory, argument)
    );
};

// Report a fatal error (e.g., OpenCOR couldn't be started) and quit.
// Note: our splash screen window is always on top, so we must close it first. Otherwise, it would hide our error dialog
//       and remain shown forever.

export const reportFatalErrorAndQuit = (message: string, splashScreenWindow?: SplashScreenWindow | null): void => {
  console.error(`OpenCOR: ${message}`);

  if (splashScreenWindow && !splashScreenWindow.isDestroyed()) {
    splashScreenWindow.close();
  }

  electron.dialog.showErrorBox('OpenCOR', message);

  electron.app.quit();
};

export class MainWindow extends ApplicationWindow {
  // Properties.

  static instance: MainWindow | null = null;

  private _splashScreenWindow: SplashScreenWindow | null = null;
  private _rendererReady = false;
  private _pendingArguments: string[] = [];
  private _filesToReopen: IFilesToReopen | null = null;
  // Note: the files to reopen and select once our renderer is ready after it has been reloaded following a crash (see
  //       onRenderProcessGone()).
  private _openedFilePaths: string[] = [];
  private _openedFilePathIndex = 0;
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

    this.on('closed', () => {
      if (MainWindow.instance === this) {
        MainWindow.instance = null;
      }
    });

    // Set our dock icon (macOS only).

    if (!isPackaged() && isMacOs()) {
      electron.app.dock?.setIcon(icon);
    }

    // Close our splash screen window with a short delay once we are visible.
    // Note: we must do this before restoring our state since maximising a window may also show it (on Windows and
    //       Linux), in which case we would otherwise miss the show event and never close our splash screen window.

    this._splashScreenWindow = splashScreenWindow;

    this.once('show', () => {
      setTimeout(() => {
        this.closeSplashScreenWindow();
      }, LONG_DELAY);
    });

    // Restore our state, if needed.

    if (state.isMaximized) {
      this.maximize();
    } else if (state.isFullScreen) {
      this.setFullScreen(true);
    }

    // Retrieve the recently opened files and our Reopen menu.

    recentFilePaths = electronConf.get('app.files.recent');

    updateReopenMenu(recentFilePaths);

    // Handle our command line, which will effectively be done once our renderer is ready (see rendererReady()).

    this.handleArguments(normaliseCommandLine(commandLine, process.cwd()));

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
        // Note: if our renderer is not ready, then either it crashed and we are being closed before it could be
        //       reloaded, in which case we save the files that were open (and selected) at the time of the crash, or it
        //       never was ready (e.g., OpenCOR couldn't be loaded), in which case it never told us about the files that
        //       are open, so we keep the files that were open when OpenCOR was last closed.

        const filesToReopen = this._rendererReady ? currentFilesToReopen() : this._filesToReopen;

        if (filesToReopen) {
          electronConf.set('app.files.opened', filesToReopen.opened);
          electronConf.set('app.files.selected', filesToReopen.selected);
        }
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

      if (isUrl(details.url)) {
        electron.shell.openExternal(details.url).catch((error: unknown) => {
          console.warn(`OpenCOR: failed to open external URL (${details.url}):`, formatError(error));
        });
      } else {
        console.warn(`OpenCOR: blocked attempt to open unsupported URL (${details.url}).`);
      }

      return {
        action: 'deny'
      };
    });

    // Handle our renderer process crashing (or being killed).

    this.webContents.on('render-process-gone', (_event, details) => {
      this.onRenderProcessGone(details);
    });

    // Load the renderer URL.
    // Note: a navigation that gets interrupted (e.g., by another navigation) results in an ERR_ABORTED error, which is
    //       not fatal. Any other error means that OpenCOR cannot be used, so we report it and quit.

    this.loadURL(rendererUrl).catch((error: unknown) => {
      if ((error as { code?: string }).code === 'ERR_ABORTED') {
        console.warn(`OpenCOR: loading of URL (${rendererUrl}) was aborted:`, formatError(error));

        return;
      }

      reportFatalErrorAndQuit(`OpenCOR could not be loaded (${formatError(error)}).`, this._splashScreenWindow);
    });
  }

  // Close our splash screen window, if it is still shown.

  closeSplashScreenWindow(): void {
    if (this._splashScreenWindow && !this._splashScreenWindow.isDestroyed()) {
      this._splashScreenWindow.close();
    }

    this._splashScreenWindow = null;
  }

  // Our renderer process is gone (e.g., it crashed because of the native libOpenCOR module), so let the user know and
  // either reload our renderer (and reopen the files that were open) or quit.

  onRenderProcessGone(details: electron.RenderProcessGoneDetails): void {
    if (details.reason === 'clean-exit') {
      return;
    }

    console.error(`OpenCOR: the renderer process is gone (${details.reason}, exit code ${details.exitCode}).`);

    // Make sure that our splash screen window doesn't hide our message box and that we are visible.

    this.closeSplashScreenWindow();

    if (!this.isVisible()) {
      this.show();
    }

    // Keep track of the files that were open and of the selected file, so that they can be reopened and selected once
    // our renderer is ready again.

    const filesToReopen = currentFilesToReopen();

    const choice = electron.dialog.showMessageBoxSync(this, {
      type: 'error',
      title: 'OpenCOR',
      message: 'OpenCOR has encountered a problem and needs to be reloaded.',
      detail: `Reason: ${details.reason} (exit code ${details.exitCode}).`,
      buttons: ['Reload', 'Quit'],
      defaultId: 0,
      cancelId: 1
    });

    if (choice !== 0) {
      electron.app.quit();

      return;
    }

    // Reload our renderer, making sure that our main menu is enabled (our renderer may have disabled it, e.g., because
    // a dialog was open) and that we reopen our files once our renderer is ready again.

    enableDisableMainMenu(true);

    this._rendererReady = false;
    this._pendingArguments = [];
    this._openedFilePaths = [];
    this._openedFilePathIndex = 0;
    this._selectedFilePath = '';
    this._filesToReopen = filesToReopen;

    this.webContents.reload();
  }

  // Our renderer is ready, so reopen previously opened files, if any, select the previously selected file, and handle
  // any arguments that we were asked to handle until now (e.g., our command line).
  // Note: our renderer may get reloaded (e.g., during development), in which case it will let us know again that it is
  //       ready, but there is nothing more for us to do then.

  rendererReady(): void {
    if (this._rendererReady) {
      return;
    }

    this._rendererReady = true;

    // If our renderer has been reloaded following a crash, then we reopen the files that were open at the time rather
    // than those that were open when OpenCOR was last closed.

    const filesToReopen = this._filesToReopen ?? {
      opened: electronConf.get('app.files.opened'),
      selected: electronConf.get('app.files.selected')
    };

    this._filesToReopen = null;

    this._openedFilePaths = filesToReopen.opened;
    this._openedFilePathIndex = 0;
    this._selectedFilePath = filesToReopen.selected;

    this.reopenFilePathsAndSelectFilePath();

    this.handleArguments(this._pendingArguments.splice(0));
  }

  // Reopen previously opened files, if any, and select the previously selected file.
  // Note: we reopen one file at a time since a file may be a remote file which means that it may take some time to
  //       reopen. So, we need to wait for the file to be reopened before reopening the next one.

  reopenFilePathsAndSelectFilePath(failedFilePath?: string): void {
    // Make sure that we don't select a file that couldn't be (re)opened.

    if (failedFilePath && failedFilePath === this._selectedFilePath) {
      this._selectedFilePath = '';
    }

    // Reopen the next file, if any.
    // Note: we reopen files one at a time, i.e. we only reopen the next file once the renderer has told us that the
    //       previous file has been opened (or couldn't be opened).

    while (this._openedFilePathIndex < this._openedFilePaths.length) {
      const filePath = this._openedFilePaths[this._openedFilePathIndex];

      ++this._openedFilePathIndex;

      if (filePath) {
        this.send('open', filePath);

        return;
      }
    }

    this._openedFilePaths = [];
    this._openedFilePathIndex = 0;

    // All the files have been reopened (or couldn't be reopened), so we can now select the previously selected file.

    if (this._selectedFilePath) {
      this.send('select', this._selectedFilePath);

      this._selectedFilePath = '';
    }
  }

  // Handle the given (normalised) command line arguments (see normaliseCommandLine()).

  handleArguments(commandLine: string[]): void {
    if (!commandLine.length) {
      return;
    }

    // Wait for our renderer to be ready, if needed.

    if (!this._rendererReady) {
      this._pendingArguments.push(...commandLine);

      return;
    }

    for (const argument of commandLine) {
      if (isAction(argument)) {
        this.send('action', argument.slice(FULL_URI_SCHEME.length));
      } else {
        this.send('open', argument);
      }
    }
  }

  // Enable/disable our UI.

  enableDisableUi(enable: boolean): void {
    enableDisableMainMenu(enable);

    this.send('enable-disable-ui', enable);
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
          this.send('open', filePath);
        }

        this.enableDisableUi(true);
      })
      .catch((error: unknown) => {
        console.warn('OpenCOR: failed to open file(s):', formatError(error));

        this.enableDisableUi(true);
      });
  }
}
