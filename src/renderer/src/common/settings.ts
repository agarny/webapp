import { formatError, type ISettings, type ISettingsGeneral } from './common.ts';
import { electronApi } from './electronApi.ts';

class Settings {
  protected static _instance: Settings | null = null;
  private _settings!: ISettings;
  private _isInitialised = false;
  private _initialisationListeners: (() => void)[] = [];

  private constructor() {
    // Start with some default settings and then load them.
    // Note: to have default settings is critical when running the desktop version of OpenCOR since they are loaded
    //       asynchronously, so we need to ensure that our settings are always defined. This is not the case for the
    //       Web version of OpenCOR, where we can load our settings directly from the cookies.

    this.reset();
    this.load();
  }

  static instance(): Settings {
    Settings._instance ??= new Settings();

    return Settings._instance;
  }

  private emitInitialised(): void {
    this._isInitialised = true;

    this._initialisationListeners.forEach((callback) => {
      callback();
    });

    this._initialisationListeners = [];
  }

  onInitialised(callback: () => void): void {
    if (this._isInitialised) {
      callback();
    } else {
      this._initialisationListeners.push(callback);
    }
  }

  load(): void {
    if (electronApi) {
      void electronApi.loadSettings().then((settings: ISettings) => {
        this._settings = settings;

        this.emitInitialised();
      });
    } else {
      try {
        const raw = window.localStorage.getItem('settings');

        if (raw) {
          this._settings = JSON.parse(raw);
        }
      } catch (error: unknown) {
        console.error(
          'Failed to load the settings from the local storage, so resetting to defaults:',
          formatError(error)
        );

        this.reset();
      }

      this.emitInitialised();
    }
  }

  save(): void {
    if (electronApi) {
      electronApi.saveSettings(this._settings);
    } else {
      try {
        window.localStorage.setItem('settings', JSON.stringify(this._settings));
      } catch (error: unknown) {
        console.error('Failed to save the settings to the local storage:', formatError(error));
      }
    }
  }

  reset(): void {
    this._settings = {
      general: {
        checkForUpdatesAtStartup: true
      }
    };
  }

  toString(): string {
    return JSON.stringify(this._settings, null, 2);
  }

  get general(): ISettingsGeneral {
    return this._settings.general;
  }
}

export const settings = Settings.instance();
