import electron from 'electron'
import * as electronSettings from 'electron-settings'
import { autoUpdater, type ProgressInfo, type UpdateCheckResult } from 'electron-updater'
import path from 'path'

import { FULL_URI_SCHEME, LONG_DELAY, SHORT_DELAY } from '../constants'
import { isDevMode, isPackaged, isWindows, isLinux, isMacOs } from '../electron'

import icon from './assets/icon.png?asset'
import { ApplicationWindow } from './ApplicationWindow'
import { enableDisableMainMenu, updateReopenMenu } from './MainMenu'
import type { SplashScreenWindow } from './SplashScreenWindow'

autoUpdater.autoDownload = false
autoUpdater.logger = null

export function checkForUpdates(atStartup: boolean): void {
  // Check for updates, if requested and if OpenCOR is packaged.

  if (isPackaged() && (electronSettings.getSync('checkForUpdatesAtStartup') ?? true)) {
    autoUpdater
      .checkForUpdates()
      .then((result: UpdateCheckResult | null) => {
        const updateAvailable = result?.isUpdateAvailable ?? false

        if (updateAvailable) {
          MainWindow.instance?.webContents.send('update-available', result?.updateInfo.version)
        } else if (!atStartup) {
          MainWindow.instance?.webContents.send('update-not-available')
        }
      })
      .catch((error: unknown) => {
        MainWindow.instance?.webContents.send(
          'update-check-error',
          error instanceof Error ? error.message : String(error)
        )
      })
  }
}

autoUpdater.on('download-progress', (info: ProgressInfo) => {
  MainWindow.instance?.webContents.send('update-download-progress', info.percent)
})

export function downloadAndInstallUpdate(): void {
  autoUpdater
    .downloadUpdate()
    .then(() => {
      MainWindow.instance?.webContents.send('update-downloaded')
    })
    .catch((error: unknown) => {
      MainWindow.instance?.webContents.send(
        'update-download-error',
        error instanceof Error ? error.message : String(error)
      )
    })
}

export function installUpdateAndRestart(): void {
  autoUpdater.quitAndInstall(true, true)
}

export function retrieveMainWindowState(): {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
  isFullScreen: boolean
} {
  const workAreaSize = electron.screen.getPrimaryDisplay().workAreaSize
  const horizontalSpace = Math.round(workAreaSize.width / 13)
  const verticalSpace = Math.round(workAreaSize.height / 13)
  const x = electronSettings.getSync('mainWindowState.x')
  const y = electronSettings.getSync('mainWindowState.y')
  const width = electronSettings.getSync('mainWindowState.width')
  const height = electronSettings.getSync('mainWindowState.height')
  const isMaximized = electronSettings.getSync('mainWindowState.isMaximized')
  const isFullScreen = electronSettings.getSync('mainWindowState.isFullScreen')

  return {
    x: (x ?? horizontalSpace) as number,
    y: (y ?? verticalSpace) as number,
    width: (width ?? workAreaSize.width - 2 * horizontalSpace) as number,
    height: (height ?? workAreaSize.height - 2 * verticalSpace) as number,
    isMaximized: (isMaximized ?? false) as boolean,
    isFullScreen: (isFullScreen ?? false) as boolean
  }
}

export function resetAll(): void {
  electronSettings.setSync('resetAll', true)

  electron.app.relaunch()
  electron.app.quit()
}

let recentFilePaths: string[] = []

export function clearRecentFiles(): void {
  recentFilePaths = []

  updateReopenMenu(recentFilePaths)
}

export function fileClosed(filePath: string): void {
  recentFilePaths.unshift(filePath)
  recentFilePaths = recentFilePaths.slice(0, 10)

  updateReopenMenu(recentFilePaths)
}

export function fileIssue(filePath: string): void {
  recentFilePaths = recentFilePaths.filter((recentFilePath) => recentFilePath !== filePath)

  updateReopenMenu(recentFilePaths)
}

export function fileOpened(filePath: string): void {
  recentFilePaths = recentFilePaths.filter((recentFilePath) => recentFilePath !== filePath)

  updateReopenMenu(recentFilePaths)

  // A file has been opened, but it may have been opened while reopening files during OpenCOR startup, in which case we
  // need to reopen the next file, hence our call to reopenFilePathsAndSelectFilePath(), which will do nothing if there
  // are no more files to reopen.

  MainWindow.instance?.reopenFilePathsAndSelectFilePath()
}

let openedFilePaths: string[] = []

export function filesOpened(filePaths: string[]): void {
  openedFilePaths = filePaths

  if (filePaths.length === 0) {
    selectedFilePath = null
  }
}

let selectedFilePath: string | null = null

export function fileSelected(filePath: string): void {
  selectedFilePath = filePath
}

export class MainWindow extends ApplicationWindow {
  // Properties.

  static instance: MainWindow | null = null

  private _splashScreenWindowClosed = false

  private _openedFilePaths: string[] = []
  private _selectedFilePath = ''

  // Constructor.

  constructor(commandLine: string[], splashScreenWindow: SplashScreenWindow) {
    // Initialise ourselves.

    const mainWindowState = retrieveMainWindowState()

    super({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 640,
      minHeight: 480,
      ...(isMacOs() ? {} : { icon: icon })
    })

    // Keep track of the current isntance.

    MainWindow.instance = this

    // Set our dock icon (macOS only).

    if (isMacOs()) {
      electron.app.dock?.setIcon(icon)
    }

    // Restore our state, if needed.

    if (mainWindowState.isMaximized) {
      this.maximize()
    } else if (mainWindowState.isFullScreen) {
      this.setFullScreen(true)
    }

    // Ask for the splash screen window to be closed with a short delay once we are visible and handle our command line
    // (also with a short delay if needed).

    this.once('show', () => {
      let handleCommandLineDelay = SHORT_DELAY

      if (!this._splashScreenWindowClosed) {
        this._splashScreenWindowClosed = true

        handleCommandLineDelay = LONG_DELAY

        setTimeout(() => {
          splashScreenWindow.close()
        }, LONG_DELAY)
      }

      setTimeout(() => {
        // Retrieve the recently opened files and our Reopen menu.

        recentFilePaths = (electronSettings.getSync('recentFiles') as string[] | undefined) ?? []

        updateReopenMenu(recentFilePaths)

        // Reopen previously opened files, if any, and select the previously selected file.

        this._openedFilePaths = (electronSettings.getSync('openedFiles') as string[] | undefined) ?? []
        this._selectedFilePath = (electronSettings.getSync('selectedFile') as string | undefined) ?? ''

        this.reopenFilePathsAndSelectFilePath()

        // The command line can either be a classical command line or an OpenCOR action (i.e. an opencor:// link). In
        // the former case, we need to remove one or two arguments while, in the latter case, nothing should be removed.

        if (!this.isAction(commandLine[0])) {
          // The first argument is not an action, so remove the first argument and then the second argument, but only
          // if we are not packaged.

          commandLine.shift()

          if (!isPackaged()) {
            commandLine.shift()
          }
        }

        // When auto updating OpenCOR, we may end up with an extra argument that we need to ignore.

        if ((isWindows() || isMacOs()) && commandLine[0] === '--updated') {
          commandLine.shift()
        } else if (isLinux() && commandLine[0] === '--no-sandbox') {
          commandLine.shift()
        }

        this.handleArguments(commandLine)
      }, handleCommandLineDelay)
    })

    // Keep track of our settings.

    this.on('close', () => {
      // Main window state.

      if (!this.isMaximized() && !this.isMinimized() && !this.isFullScreen()) {
        mainWindowState.x = this.getPosition()[0]
        mainWindowState.y = this.getPosition()[1]
        mainWindowState.width = this.getContentSize()[0]
        mainWindowState.height = this.getContentSize()[1]
      }

      mainWindowState.isMaximized = this.isMaximized()
      mainWindowState.isFullScreen = this.isFullScreen()

      electronSettings.setSync('mainWindowState', mainWindowState)

      // Recent files.

      electronSettings.setSync('recentFiles', recentFilePaths)

      // Opened files and selected file.

      electronSettings.setSync('openedFiles', openedFilePaths)
      electronSettings.setSync('selectedFile', selectedFilePath)
    })

    // Enable our main menu.

    enableDisableMainMenu(true)

    // Make sure that our menu bar is always visible.

    this.setAutoHideMenuBar(false)
    this.setMenuBarVisibility(true)

    // Open external links in the default browser.

    this.webContents.setWindowOpenHandler((details) => {
      electron.shell.openExternal(details.url).catch((error: unknown) => {
        console.error('Failed to open external URL:', error)
      })

      return {
        action: 'deny'
      }
    })

    // Load the remote URL for development or the local HTML file for production.

    if (isDevMode()) {
      // @ts-expect-error (isDevMode() is true which means that process.env.ELECTRON_RENDERER_URL is defined)
      this.loadURL(process.env.ELECTRON_RENDERER_URL).catch((error: unknown) => {
        console.error('Failed to load URL:', error)
      })
    } else {
      this.loadFile('./out/renderer/index.html').catch((error: unknown) => {
        console.error('Failed to load file:', error)
      })
    }
  }

  // Reopen previously opened files, if any, and select the previously selected file.
  // Note: we reopen one file at a time since a file may be a remote file which means that it may take some time to
  //       reopen. So, we need to wait for the file to be reopened before reopening the next one.

  reopenFilePathsAndSelectFilePath(): void {
    if (this._openedFilePaths.length > 0) {
      const filePath = this._openedFilePaths[0]

      this.webContents.send('open', filePath)

      this._openedFilePaths = this._openedFilePaths.slice(1)

      if (this._openedFilePaths.length > 0) {
        return
      }
    }

    if (this._selectedFilePath !== '') {
      this.webContents.send('select', this._selectedFilePath)

      this._selectedFilePath = ''
    }
  }

  // Handle our command line arguments.

  isAction(argument: string): boolean {
    return argument.startsWith(FULL_URI_SCHEME)
  }

  handleArguments(commandLine: string[]): void {
    if (commandLine.length === 0) {
      return
    }

    commandLine.forEach((argument: string) => {
      if (this.isAction(argument)) {
        this.webContents.send('action', argument.slice(FULL_URI_SCHEME.length))
      } else if (argument !== '--allow-file-access-from-files' && argument !== '--enable-avfoundation') {
        // The argument is not an action (and not --allow-file-access-from-files or --enable-avfoundation either), so it
        // must be a file to open. But, first, check whether the argument is a relative path and, if so, convert it to
        // an absolute path.

        if (!path.isAbsolute(argument)) {
          argument = path.resolve(argument)
        }

        this.webContents.send('open', argument)
      }
    })
  }

  // Enable/disable our UI.

  enableDisableUi(enable: boolean): void {
    enableDisableMainMenu(enable)

    this.webContents.send('enable-disable-ui', enable)
  }

  // Handle our File|Open menu.

  open(): void {
    this.enableDisableUi(false)

    electron.dialog
      .showOpenDialog({
        properties: ['openFile', 'multiSelections']
      })
      .then(({ filePaths }) => {
        for (const filePath of filePaths) {
          this.webContents.send('open', filePath)
        }

        this.enableDisableUi(true)
      })
      .catch((error: unknown) => {
        console.error('Failed to open file(s):', error)

        this.enableDisableUi(true)
      })
  }
}
