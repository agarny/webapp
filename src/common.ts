import { UAParser } from 'ua-parser-js'

import { electronApi } from './electronApi'

// Some methods to determine the operating system, whether the application is running on a mobile device, etc.

const uaParser = new UAParser()

export function isWindows(): boolean {
  return uaParser.getOS().name === 'Windows'
}

export function isLinux(): boolean {
  return uaParser.getOS().name === 'Linux'
}

export function isMacOs(): boolean {
  return uaParser.getOS().name === 'macOS'
}

export function isMobile(): boolean {
  return uaParser.getDevice().type === 'mobile'
}

// A method to determine whether the Ctrl or Cmd key is pressed, depending on the operating system.

export function isCtrlOrCmd(event: KeyboardEvent): boolean {
  return isMacOs() ? event.metaKey : event.ctrlKey
}

// A method to enable/disable the main menu.

export function enableDisableMainMenu(enable: boolean): void {
  electronApi?.enableDisableMainMenu(enable)
}

// A method to format a given number of milliseconds into a string.

export function formatTime(time: number): string {
  const ms = Math.floor(time % 1000)
  const s = Math.floor((time / 1000) % 60)
  const m = Math.floor((time / (1000 * 60)) % 60)
  const h = Math.floor((time / (1000 * 60 * 60)) % 24)
  const d = Math.floor((time / (1000 * 60 * 60 * 24)) % 24)
  let res = ''

  if (d !== 0 || ((h !== 0 || m !== 0 || s !== 0 || ms !== 0) && res !== '')) {
    res += (res === '' ? '' : ' ') + d.toString() + 'd'
  }

  if (h !== 0 || ((m !== 0 || s !== 0 || ms !== 0) && res !== '')) {
    res += (res === '' ? '' : ' ') + h.toString() + 'h'
  }

  if (m !== 0 || ((s !== 0 || ms !== 0) && res !== '')) {
    res += (res === '' ? '' : ' ') + m.toString() + 'm'
  }

  if (s !== 0 || (ms !== 0 && res !== '')) {
    res += (res === '' ? '' : ' ') + s.toString() + 's'
  }

  if (ms !== 0 || res === '') {
    res += (res === '' ? '' : ' ') + ms.toString() + 'ms'
  }

  return res
}

// A method to format an issue, i.e. make sure that it starts with a capital letter and ends with a period.

export function formatIssue(issue: string): string {
  issue = issue.charAt(0).toUpperCase() + issue.slice(1)

  return issue.endsWith('.') ? issue : issue + '.'
}
