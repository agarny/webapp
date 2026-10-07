import * as electron from 'electron';

import { COPYRIGHT } from '../renderer/src/common/constants';

import { ApplicationWindow } from './ApplicationWindow';
import { electronConf, type IElectronConfState } from './index';
import { formatError } from '../renderer/src/common/common';

export class SplashScreenWindow extends ApplicationWindow {
  constructor() {
    // Initialise ourselves.

    const width = 413 + 24;
    const height = 351 + 42;
    const state: IElectronConfState = electronConf.get('app.state');

    super(
      {
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
      },
      false
    );

    // Load our splash screen, passing it our copyright and version.
    // Note: we pass them using a query string rather than IPC since our splash screen window doesn't use our preload
    //       script (see ApplicationWindow).

    this.loadFile('./src/main/assets/splashscreen.html', {
      query: {
        copyright: COPYRIGHT,
        version: electron.app.getVersion()
      }
    }).catch((error: unknown) => {
      console.warn('OpenCOR: failed to load the splash screen:', formatError(error));
    });
  }
}
