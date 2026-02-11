import * as electron from 'electron';

import { COPYRIGHT } from '../renderer/src/common/constants.ts';

import { ApplicationWindow } from './ApplicationWindow.ts';
import { electronConf, type IElectronConfState } from './index.ts';
import { formatError } from '../renderer/src/common/common.ts';

export class SplashScreenWindow extends ApplicationWindow {
  constructor() {
    // Initialise ourselves.

    const width = 413 + 24;
    const height = 351 + 42;
    const state: IElectronConfState = electronConf.get('app.state');

    super({
      x: state.x + ((state.width - width) >> 1),
      y: state.y + ((state.height - height) >> 1),
      width: width,
      height: height,
      minWidth: width,
      minHeight: height,
      maxWidth: width,
      maxHeight: height,
      frame: false,
      show: false,
      alwaysOnTop: true
    });

    this.loadFile('./src/main/assets/splashscreen.html').catch((error: unknown) => {
      console.error('Failed to load splash screen:', formatError(error));
    });

    // Initialise our Web contents.

    this.on('ready-to-show', () => {
      this.webContents.send('init-splash-screen-window', {
        copyright: COPYRIGHT,
        version: electron.app.getVersion()
      });
    });
  }
}
