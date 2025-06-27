import * as electron from 'electron'

import * as constants from '../constants'

import { ApplicationWindow } from './ApplicationWindow'
import { retrieveMainWindowState } from './MainWindow'

export class SplashScreenWindow extends ApplicationWindow {
  constructor() {
    // Initialise ourselves.

    const width = 413 + 24
    const height = 351 + 42
    const mainWindowState = retrieveMainWindowState()

    super({
      x: mainWindowState.x + ((mainWindowState.width - width) >> 1),
      y: mainWindowState.y + ((mainWindowState.height - height) >> 1),
      width: width,
      height: height,
      minWidth: width,
      minHeight: height,
      maxWidth: width,
      maxHeight: height,
      frame: false,
      alwaysOnTop: true
    })

    this.loadFile('./src/main/assets/splashscreen.html').catch((error: unknown) => {
      console.error('Failed to load splash screen:', error)
    })

    // Initialise our Web contents.

    this.on('ready-to-show', () => {
      this.webContents.send('init-splash-screen-window', {
        copyright: constants.COPYRIGHT,
        version: electron.app.getVersion()
      })
    })
  }
}
