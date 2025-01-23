import { BrowserWindow, nativeTheme, type BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'

export class ApplicationWindow extends BrowserWindow {
  alreadyShowedWindow = false

  constructor(options: BrowserWindowConstructorOptions) {
    // Add some common options and call our parent constructor.
    // Note: we use backgroundColor to minimise the flickering that may occur when first showing a window. This means
    //       that the colours used here should be the same as the ones used by --p-content-background in PrimeVue, i.e.
    //       what we are using as a background for our app (see src/renderer/src/assets/app.css).

    options.backgroundColor = nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff'
    options.show = false
    options.useContentSize = true
    options.webPreferences = {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      sandbox: false
    }

    super(options)

    // Show our window when we are ready to show it.
    // Note: we need to keep track of whether we have already shown our window because ready-to-show can be emitted
    //       multiple times (e.g., when returning from sleep mode on macOS).

    this.on('ready-to-show', () => {
      if (!this.alreadyShowedWindow) {
        this.alreadyShowedWindow = true

        this.show()
      }
    })
  }
}
