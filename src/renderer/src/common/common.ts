import type { IOpenCORSimulationDataValue, OpenCORSimulationData } from '../../index';

import * as dependencies from './dependencies';
import { electronApi } from './electronApi';

// Some interfaces.

export interface ISettingsGeneral {
  checkForUpdatesAtStartup: boolean;
}

export interface ISettings {
  general: ISettingsGeneral;
}

// Some methods to determine the operating system, whether the application is running on a mobile device, etc.
// Note: the order of the checks in osName() is important. For instance, we need to check for "iPhone" before checking
//       for "Mac" since the user agent of iPhones contains both "iPhone" and "Mac".

let _osName: string | null = null;

const osName = (): string => {
  if (_osName) {
    return _osName;
  }

  try {
    const userAgent = window.navigator.userAgent;

    if (/Android/i.test(userAgent)) {
      _osName = 'Android';
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      _osName = 'iOS';
    } else if (/Windows/i.test(userAgent)) {
      _osName = 'Windows';
    } else if (/Linux/i.test(userAgent)) {
      _osName = 'Linux';
    } else if (/Mac/i.test(userAgent)) {
      _osName = 'macOS';
    } else {
      _osName = 'Unknown';
    }
  } catch {
    _osName = 'Unknown';
  }

  return _osName;
};

export const isWindows = (): boolean => {
  return osName() === 'Windows';
};

export const isLinux = (): boolean => {
  return osName() === 'Linux';
};

export const isMacOs = (): boolean => {
  return osName() === 'macOS';
};

export const isDesktop = (): boolean => {
  const currentOSName = osName();

  return currentOSName === 'Windows' || currentOSName === 'Linux' || currentOSName === 'macOS';
};

// A method to determine whether the Ctrl or Cmd key is pressed, depending on the operating system.

export const isCtrlOrCmd = (event: KeyboardEvent): boolean => {
  return isMacOs() ? event.metaKey : event.ctrlKey;
};

// A method to enable/disable the main menu.

export const enableDisableMainMenu = (enable: boolean): void => {
  electronApi?.enableDisableMainMenu(enable);
};

// A method to determine whether a file name indicates a data URL OMEX file.

export const OMEX_PREFIX = 'OMEX #';

export const isDataUrlOmexFileName = (fileName: string): boolean => {
  return fileName.startsWith(OMEX_PREFIX);
};

// A method to determine whether the given value is an object (and not an array).

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

// A method to determine whether a URL is an HTTP or HTTPS URL.

export const isUrl = (filePath: string): boolean => {
  return filePath.startsWith('http://') || filePath.startsWith('https://');
};

// A method to get the CORS proxy URL for a URL.
// Note: the URL must be encoded since it is passed as a query parameter, which our CORS proxy decodes. Otherwise, the
//       URL would get truncated at its first "&" (e.g., https://example.com/export?format=csv&gid=123 would become
//       https://example.com/export?format=csv), lose its fragment, and have its "+" and percent-encoded characters
//       decoded (e.g., "%2F" would become "/").

export const corsProxyUrl = (url: string): string => {
  return `https://cors-proxy.opencor.workers.dev/?url=${encodeURIComponent(url)}`;
};

// A method to fetch a URL through our CORS proxy or, if that fails, directly.
// Note: our CORS proxy may not be reachable, not allow the content of the URL (HTTP 403 error), or not find the URL
//       (HTTP 404 error), in which case fetching the URL directly may still work (see also locCommon.file()).

export const fetchThroughCorsProxy = async (url: string): Promise<Response> => {
  try {
    const response = await fetch(corsProxyUrl(url));

    if (response.status !== 403 && response.status !== 404) {
      return response;
    }
  } catch {
    // Our CORS proxy is not reachable, so fetch the URL directly.
  }

  return fetch(url);
};

// A method to compute the XXH64 value of some data.

export const xxh64 = (data: string | Uint8Array): string => {
  if (typeof data === 'string') {
    return dependencies._xxhash.h64(data).toString(16).padStart(16, '0');
  }

  return dependencies._xxhash.h64Raw(data).toString(16).padStart(16, '0');
};

// A method to format a number of milliseconds into a string.

export const formatTime = (time: number): string => {
  const ms = Math.floor(time % 1000);
  const s = Math.floor((time / 1000) % 60);
  const m = Math.floor((time / (1000 * 60)) % 60);
  const h = Math.floor((time / (1000 * 60 * 60)) % 24);
  const d = Math.floor((time / (1000 * 60 * 60 * 24)) % 24);
  let res = '';

  if (d) {
    res = `${d}d`;
  }

  if (h || ((m || s || ms) && res)) {
    res += `${res ? ' ' : ''}${h}h`;
  }

  if (m || ((s || ms) && res)) {
    res += `${res ? ' ' : ''}${m}m`;
  }

  if (s || (ms && res)) {
    res += `${res ? ' ' : ''}${s}s`;
  }

  if (ms || !res) {
    res += `${res ? ' ' : ''}${ms}ms`;
  }

  return res;
};

// A method to format an error into a string.

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

// A method to format a message, i.e. make sure that it starts with a capital letter and ends with a period, or not.

export const formatMessage = (message: string, selfContained: boolean = true): string => {
  message = selfContained
    ? message.charAt(0).toUpperCase() + message.slice(1)
    : message.charAt(0).toLowerCase() + message.slice(1);

  return message.endsWith('...')
    ? message
    : message.endsWith('.')
      ? selfContained
        ? message
        : message.slice(0, -1)
      : selfContained
        ? `${message}.`
        : message;
};

// A method to determine whether a number is divisible by another one.

export const isDivisible = (a: number, b: number): boolean => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return false;
  }

  const quotient = a / b;
  const roundedQuotient = Math.round(quotient);

  return Math.abs(quotient - roundedQuotient) <= Number.EPSILON * Math.max(1, Math.abs(roundedQuotient));
};

// A method to trigger a browser download for a file.

const DOWNLOAD_OBJECT_URL_LIFETIME = 60000; // 60 seconds.

export const downloadFile = (filename: string, content: string | Blob, type: string): void => {
  const link = document.createElement('a');
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  // Revoke our object URL, but only once the download has started.
  // Note: some browsers start the download asynchronously, so revoking our object URL straight away may cancel it. In
  //       Safari, this may even be once the user has allowed downloads from our site (it asks the first time a site
  //       downloads a file), so we give the user plenty of time to do so (like FileSaver.js does).

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, DOWNLOAD_OBJECT_URL_LIFETIME);
};

// A method to get the file name from a file path.

export const fileName = (filePath: string): string => {
  const res = filePath.split(/(\\|\/)/g).pop() || '';

  try {
    return decodeURIComponent(res);
  } catch (error: unknown) {
    console.warn('OpenCOR: failed to decode the file path:', res, formatError(error));

    return res;
  }
};

// A method to sleep for a number of milliseconds.

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

// A method to wait for the next animation frame.

export const waitForNextAnimationFrame = (): Promise<number> => {
  return new Promise((resolve: FrameRequestCallback) => {
    requestAnimationFrame(resolve);
  });
};

// Some constants related to simulation data values.

export const EMPTY_FLOAT64_ARRAY = Object.freeze(new Float64Array(0));
export const UNDEFINED_SIMULATION_DATA_VALUE = Object.freeze({
  data: EMPTY_FLOAT64_ARRAY,
  unit: ''
}) as Readonly<IOpenCORSimulationDataValue>;

// A method to get an object with an empty simulation data values for a list of model parameters.

export const emptySimulationData = (modelParameters: string[]): OpenCORSimulationData => {
  const res: OpenCORSimulationData = {};

  for (const modelParameter of modelParameters) {
    res[modelParameter] = { ...UNDEFINED_SIMULATION_DATA_VALUE };
  }

  return res;
};
