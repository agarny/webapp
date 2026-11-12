import type { IOpenCORSimulationDataValue, OpenCORSimulationData, OpenCORTheme } from '../../index';

import * as dependencies from './dependencies';
import { electronApi } from './electronApi';

// Some interfaces.

export interface ISettingsGeneral {
  checkForUpdatesAtStartup: boolean;
  theme: OpenCORTheme;
}

export interface ISettings {
  general: ISettingsGeneral;
}

export interface ISystemDetails {
  cpuModel: string;
  logicalCoreCount: number;
  totalMemory: number;
  electronVersion: string;
  chromiumVersion: string;
}

// Some methods to determine the operating system, whether the application is running on a mobile device, etc.
// Note: the order of the checks in osName() is important. For instance, we need to check for "iPhone" before checking
//       for "Mac" since the user agent of iPhones contains both "iPhone" and "Mac".

let _osName: string | null = null;

export const osName = (): string => {
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

// A method to determine whether a keydown event is processed by an input method editor (IME), e.g., for Chinese or
// Japanese, in which case it is not for us to handle (e.g., Enter to confirm some text being composed).
// Note: Safari ends a composition before dispatching the keydown event that confirms it, so that event isn't flagged as
//       composing, but its key code is 229 (as for any keydown event that is processed by an IME).

export const isImeKeyDown = (event: KeyboardEvent): boolean => {
  return event.isComposing || event.keyCode === 229;
};

// A method to determine the letter (in upper case) of a keyboard shortcut (e.g., "O" for Ctrl+Alt+O), if any.
// Note #1: we rely on the character that is produced by the key (i.e. event.key) rather than on its physical position
//          (i.e. event.code), so that our shortcuts are the letter printed on the key whatever the keyboard layout
//          (e.g., Ctrl+Alt+W is the key labelled W on an AZERTY keyboard, not the one labelled Z), as for the
//          accelerators of OpenCOR's main menu (see src/main/MainMenu.ts).
// Note #2: on Windows and Linux, AltGr (which is reported as Ctrl+Alt on Windows) is used to type some characters
//          (e.g., AltGr+O produces "ó" on a Polish keyboard), in which case the key is for typing that character rather
//          than for a keyboard shortcut.
// Note #3: the key may otherwise produce a character that is not a letter (from A to Z) in two cases, in which case we
//          rely on the physical position of the key: on macOS, the Option key changes the character that is produced
//          by a key (e.g., Option+O produces "ø"), while with a non-Latin keyboard layout (e.g., a Russian one), the
//          key produces a non-Latin character (e.g., "щ").

export const shortcutLetter = (event: KeyboardEvent): string | null => {
  if (isImeKeyDown(event)) {
    return null;
  }

  if (/^[a-z]$/i.test(event.key)) {
    return event.key.toUpperCase();
  }

  if (!isMacOs() && event.getModifierState('AltGraph')) {
    return null;
  }

  return /^Key([A-Z])$/.exec(event.code)?.[1] ?? null;
};

// Some methods to let OpenCOR own the title of its document (e.g., to show the name of the selected file in it, see
// ContentsComponent.vue), which is only the case when OpenCOR is not used as a library (see main.ts) since the title
// of a page that embeds OpenCOR is not ours to change.

let _documentTitleOwned = false;

export const ownDocumentTitle = (): void => {
  _documentTitleOwned = true;
};

export const isDocumentTitleOwned = (): boolean => {
  return _documentTitleOwned;
};

// A method to enable/disable the main menu.

export const enableDisableMainMenu = (enable: boolean): void => {
  electronApi?.enableDisableMainMenu(enable);
};

// Some prefixes for the (made-up) name of a file opened using a data URL, and a method to determine whether a file name
// is such a name.
// Note #1: a file opened using a data URL only exists in memory, so it can only be reopened during the current session
//          (see OpenCOR.addRecentFile()), i.e. not, say, the next time OpenCOR is started.
// Note #2: a COMBINE archive is named "OMEX #<n>" while a CellML file (from a ZIP-CellML data URL) is named
//          "CellML #<n>/<file name>" where <file name> is the name of the CellML file, so that it is still shown under
//          its own name (see common.fileName()).

export const OMEX_PREFIX = 'OMEX #';
export const CELLML_PREFIX = 'CellML #';

// The number to use in the name of the next file opened using a data URL (i.e. <n> above).
// Note: libOpenCOR's file manager is shared by all the instances of OpenCOR (e.g., when OpenCOR is embedded more than
//       once in a Web page), so those numbers must be shared by all of them too. Otherwise, two instances could end up
//       with a file of the same name, in which case one instance would overwrite the file of the other instance and,
//       once unmounted, unmanage it.

let omexDataUrlCounter = 0;
let cellmlDataUrlCounter = 0;

export const nextOmexDataUrlNumber = (): number => {
  return ++omexDataUrlCounter;
};

export const nextCellmlDataUrlNumber = (): number => {
  return ++cellmlDataUrlCounter;
};

export const isDataUrlFileName = (fileName: string): boolean => {
  return fileName.startsWith(OMEX_PREFIX) || fileName.startsWith(CELLML_PREFIX);
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
// Note #1: our CORS proxy may not be reachable, not allow the content of the URL (HTTP 403 error), not find the URL
//          (HTTP 404 error), not be able to fetch the URL (HTTP 502 error; e.g., the URL is only reachable from the
//          user's network), be rate limited (HTTP 429 error), be unavailable (HTTP 5xx error), or get some other error
//          from the server of the URL (e.g., because it blocks requests from our CORS proxy), in which case fetching
//          the URL directly may still work. So, we fetch the URL directly whenever our CORS proxy doesn't give us an OK
//          response.
// Note #2: if fetching the URL directly also fails, then it is most likely because of CORS, about which a browser tells
//          us next to nothing (e.g., "Failed to fetch"), so we report why our CORS proxy failed instead.
// Note #3: we read the body of our CORS proxy's response before returning it, so that we can also fetch the URL
//          directly if reading it fails (e.g., if our CORS proxy aborts it because the content turns out to be too
//          large). This doesn't cost anything since our callers need the whole body anyway.

export const fetchThroughCorsProxy = async (url: string): Promise<Response> => {
  let corsProxyIssue: string;

  try {
    const response = await fetch(corsProxyUrl(url));

    if (response.ok) {
      const body = await response.arrayBuffer();

      // Note: a response with some statuses (e.g., 204) cannot have a body, not even an empty one.

      return new Response(body.byteLength ? body : null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }

    corsProxyIssue =
      (await response.text().catch(() => '')) || `The server responded with a status of ${response.status}.`;
  } catch (error: unknown) {
    corsProxyIssue = formatError(error);
  }

  try {
    const response = await fetch(url);

    if (response.ok) {
      return response;
    }
  } catch {
    // Fetching the URL directly failed, so we report why our CORS proxy failed (see Note #2).
  }

  throw new Error(corsProxyIssue);
};

// A method to compute the XXH64 value of some data.

export const xxh64 = (data: string | Uint8Array): string => {
  if (typeof data === 'string') {
    return dependencies._xxhash.h64(data).toString(16).padStart(16, '0');
  }

  return dependencies._xxhash.h64Raw(data).toString(16).padStart(16, '0');
};

// Some methods to format numbers, so that they get formatted the same way everywhere:
//  - formatNumber() formats a value (e.g., that of a model parameter or of a simulation setting) the way it can be
//    entered in a numeric field (i.e. using a dot as the decimal separator, no group separators, and an exponent for a
//    very small or large value), using the shortest text that parses back to that exact value (i.e. no value gets
//    rounded);
//  - formatCount() formats a count (e.g., a number of data points), with group separators (e.g., 1,000,001), which is
//    fine since a count is never entered in a numeric field. We use English (as for the rest of our UI), so that our
//    group separator cannot be mistaken for the decimal separator used by formatNumber(); and
//  - formatTime() formats a duration in milliseconds (e.g., the time it took to run a simulation).
// Note: a value computed from other values (e.g., by a slider or a spin button, which add a step to a value) may have a
//       floating-point error (e.g., 0.1 + 0.2 = 0.30000000000000004), which formatNumber() would show. So, we round
//       such a value to the number of decimals of the values it was computed from (see fractionDigits() and
//       roundToFractionDigits()), i.e. to the value that would have been computed using decimal arithmetic.

export const formatNumber = (value: number): string => {
  return String(value);
};

// Return the number of decimals of the given value, i.e. of the shortest text that parses back to it (e.g., 2 for 0.25
// and 7 for 1e-7).

export const fractionDigits = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const [coefficient = '', exponent] = String(value).toLowerCase().split('e');
  const coefficientFractionDigits = coefficient.split('.')[1]?.length ?? 0;

  return Math.max(0, coefficientFractionDigits - Number(exponent ?? 0));
};

// Round the given value to the given number of decimals.
// Note: toFixed() returns the decimal text that is closest to the value, which is exact if the value has no more than
//       the given number of decimals. However, it only supports up to 100 decimals and values smaller than 1e21 (which
//       have no decimals anyway), so we leave the other values as they are.

export const roundToFractionDigits = (value: number, digits: number): number => {
  if (!Number.isFinite(value) || Math.abs(value) >= 1e21 || digits > 100) {
    return value;
  }

  return Number(value.toFixed(Math.max(0, digits)));
};

// Add/subtract the given values without any floating-point error, e.g., 0.1 + 0.2 = 0.3 rather than
// 0.30000000000000004.

export const addNumbers = (value1: number, value2: number): number => {
  return roundToFractionDigits(value1 + value2, Math.max(fractionDigits(value1), fractionDigits(value2)));
};

export const subtractNumbers = (value1: number, value2: number): number => {
  return addNumbers(value1, -value2);
};

export const formatCount = (count: number): string => {
  return count.toLocaleString('en');
};

// A method to add a unit, if any, to a label (e.g., "Ending point (second)" or "Ending point" if there is no unit).

export const labelWithUnit = (label: string, unit?: string): string => {
  return unit ? `${label} (${unit})` : label;
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

// A method to determine whether the Web browser has a save file picker, i.e. whether it supports the File System Access
// API (only Chromium-based Web browsers do). If it doesn't, then a file can only be saved by downloading it.

export interface IWindowWithSaveFilePicker {
  showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle>;
}

export const hasSaveFilePicker = (): boolean => {
  return typeof window !== 'undefined' && !!(window as unknown as IWindowWithSaveFilePicker).showSaveFilePicker;
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

// A method to get the base file name from a file name, i.e. the file name without its extension.

export const baseFileName = (fileName: string): string => {
  return fileName.replace(/\.[^/.]+$/, '');
};

// A method to escape some text, so that it can be used in some HTML (e.g., in the question of a question dialog, which
// gets rendered as HTML).

export const escapeHtml = (text: string): string => {
  return text.replace(/[&<>"']/g, (character: string) => `&#${character.charCodeAt(0)};`);
};

// A method to sanitise some HTML that may come from an untrusted source (e.g., the name of a trace or the title of an
// axis in a UI JSON file, or the description of an issue), so that it can be rendered as HTML (e.g., using v-html).
// Note #1: only a few formatting elements are kept (e.g., "<i>I<sub>K,r</sub></i>"), without any of their attributes,
//          except for the class of a PrimeIcons icon (e.g., <i class="pi pi-cog"></i>). Any other element is replaced
//          with its contents, unless its contents are not meant to be shown as text (e.g., a script), in which case it
//          is removed altogether.
// Note #2: our HTML is parsed in a separate document, so that nothing in it gets loaded or run (e.g., an image).
// Note #3: the same HTML tends to be sanitised over and over again (e.g., the name of a trace each time the legend of a
//          plot is rendered), so we cache our results.

const SANITISE_HTML_ALLOWED_ELEMENTS = new Set<string>(['b', 'br', 'code', 'em', 'i', 'strong', 'sub', 'sup']);
const SANITISE_HTML_REMOVED_ELEMENTS = new Set<string>([
  'embed',
  'iframe',
  'noscript',
  'object',
  'script',
  'select',
  'style',
  'template',
  'textarea',
  'title'
]);
const SANITISE_HTML_ICON_CLASS_REGEX = /^\s*pi(\s+pi-[a-z0-9-]+)+\s*$/;
const SANITISE_HTML_CACHE_SIZE = 256;

const sanitiseHtmlCache = new Map<string, string>();

const sanitiseHtmlNode = (node: Node, parent: Node, document: Document): void => {
  for (const childNode of Array.from(node.childNodes)) {
    if (childNode.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(childNode.textContent ?? ''));
    } else if (childNode.nodeType === Node.ELEMENT_NODE) {
      const element = childNode as Element;
      const elementName = element.localName;

      if (SANITISE_HTML_ALLOWED_ELEMENTS.has(elementName)) {
        const sanitisedElement = document.createElement(elementName);
        const elementClass = element.getAttribute('class');

        if (elementName === 'i' && elementClass && SANITISE_HTML_ICON_CLASS_REGEX.test(elementClass)) {
          sanitisedElement.setAttribute('class', elementClass.trim());
        }

        sanitiseHtmlNode(element, sanitisedElement, document);

        parent.appendChild(sanitisedElement);
      } else if (!SANITISE_HTML_REMOVED_ELEMENTS.has(elementName)) {
        sanitiseHtmlNode(element, parent, document);
      }
    }
  }
};

export const sanitiseHtml = (html: string | undefined): string => {
  // Some text without any markup or character reference is already safe.

  if (!html || !/[<&]/.test(html)) {
    return html ?? '';
  }

  const cachedSanitisedHtml = sanitiseHtmlCache.get(html);

  if (cachedSanitisedHtml !== undefined) {
    return cachedSanitisedHtml;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const container = document.createElement('div');

  sanitiseHtmlNode(document.body, container, document);

  const res = container.innerHTML;

  if (sanitiseHtmlCache.size >= SANITISE_HTML_CACHE_SIZE) {
    sanitiseHtmlCache.clear();
  }

  sanitiseHtmlCache.set(html, res);

  return res;
};

// A method to get the file name from a file path.
// Note: the file path should be a canonical path (see locApi.File.canonicalPath()), i.e. a path that libOpenCOR has
//       already decoded, if needed (e.g., "https://example.com/my%20model.cellml" becomes
//       "https://example.com/my model.cellml" while "/path/to/my%20model.cellml" is a valid local file name).

export const fileName = (filePath: string): string => {
  return filePath.split(/(\\|\/)/g).pop() || '';
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

// A method to wait for our UI to be painted.
// Note #1: we wait for two animation frames since the first one is just before the next paint while the second one is
//          after it (i.e. just before the following paint).
// Note #2: there is no need to wait for vue.nextTick() first since Vue updates the DOM in a microtask, i.e. before the
//          next animation frame.
// Note #3: no animation frames are run while our document is hidden (e.g., when our window is minimised), in which case
//          there is nothing to paint for people to see, so we don't wait (or stop waiting) for our UI to be painted.
//          Otherwise, we would wait until our document is visible again (e.g., a simulation run would only finish
//          once our window is restored).

const waitForNextAnimationFrameUnlessHidden = (): Promise<void> => {
  return new Promise((resolve) => {
    if (document.visibilityState === 'hidden') {
      resolve();

      return;
    }

    const onDone = (): void => {
      cancelAnimationFrame(frame);

      document.removeEventListener('visibilitychange', onVisibilityChange);

      resolve();
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        onDone();
      }
    };

    const frame = requestAnimationFrame(onDone);

    document.addEventListener('visibilitychange', onVisibilityChange);
  });
};

export const waitForNextPaint = async (): Promise<void> => {
  await waitForNextAnimationFrameUnlessHidden();
  await waitForNextAnimationFrameUnlessHidden();
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
