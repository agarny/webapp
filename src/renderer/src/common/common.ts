import { UAParser } from 'ua-parser-js';

import { electronApi } from './electronApi.js';

// Some interfaces.

export interface ISettingsGeneral {
  checkForUpdatesAtStartup: boolean;
}

export interface ISettings {
  general: ISettingsGeneral;
}

// Some methods to determine the operating system, whether the application is running on a mobile device, etc.

const uaParser = new UAParser();

export function isWindows(): boolean {
  return uaParser.getOS().name === 'Windows';
}

export function isLinux(): boolean {
  return uaParser.getOS().name === 'Linux';
}

export function isMacOs(): boolean {
  return uaParser.getOS().name === 'macOS';
}

export function isDesktop(): boolean {
  return uaParser.getOS().name === 'Windows' || uaParser.getOS().name === 'Linux' || uaParser.getOS().name === 'macOS';
}

// A method to determine whether the Ctrl or Cmd key is pressed, depending on the operating system.

export function isCtrlOrCmd(event: KeyboardEvent): boolean {
  return isMacOs() ? event.metaKey : event.ctrlKey;
}

// A method to enable/disable the main menu.

export function enableDisableMainMenu(enable: boolean): void {
  electronApi?.enableDisableMainMenu(enable);
}

// A method to determine whether a given URL is an HTTP or HTTPS URL.

export function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);

    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// A method to get the proxy URL for a given URL.

export function proxyUrl(url: string): string {
  return `https://cors-proxy.opencor.workers.dev/?url=${url}`;
}

// A method to format a given number of milliseconds into a string.

export function formatTime(time: number): string {
  const ms = Math.floor(time % 1000);
  const s = Math.floor((time / 1000) % 60);
  const m = Math.floor((time / (1000 * 60)) % 60);
  const h = Math.floor((time / (1000 * 60 * 60)) % 24);
  const d = Math.floor((time / (1000 * 60 * 60 * 24)) % 24);
  let res = '';

  if (d !== 0 || ((h !== 0 || m !== 0 || s !== 0 || ms !== 0) && res !== '')) {
    res += `${res === '' ? '' : ' '}${String(d)}d`;
  }

  if (h !== 0 || ((m !== 0 || s !== 0 || ms !== 0) && res !== '')) {
    res += `${res === '' ? '' : ' '}${String(h)}h`;
  }

  if (m !== 0 || ((s !== 0 || ms !== 0) && res !== '')) {
    res += `${res === '' ? '' : ' '}${String(m)}m`;
  }

  if (s !== 0 || (ms !== 0 && res !== '')) {
    res += `${res === '' ? '' : ' '}${String(s)}s`;
  }

  if (ms !== 0 || res === '') {
    res += `${res === '' ? '' : ' '}${String(ms)}ms`;
  }

  return res;
}

// A method to format a message, i.e. make sure that it starts with a capital letter and ends with a period, or not.

export function formatMessage(message: string, selfContained: boolean = true): string {
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
}
