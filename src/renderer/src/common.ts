import { UAParser } from 'ua-parser-js'
import * as vue from 'vue'

import { electronAPI } from '../../electronAPI'
import * as locAPI from '../../libopencor/locAPI'

// Some methods to determine the operating system, whether the application is running on a mobile device, etc.

const uaParser = new UAParser()

export function isWindows(): boolean {
  return uaParser.getOS().name === 'Windows'
}

export function isLinux(): boolean {
  return uaParser.getOS().name === 'Linux'
}

export function isMacOS(): boolean {
  return uaParser.getOS().name === 'macOS'
}

export function isMobile(): boolean {
  return uaParser.getDevice().type === 'mobile'
}

// Some constants to know whether the operating system uses light mode or dark mode.

const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)')

export const isLightMode = vue.ref(prefersColorScheme.matches)
export const isDarkMode = vue.ref(!prefersColorScheme.matches)

prefersColorScheme.addEventListener('change', (event) => {
  isLightMode.value = event.matches
  isDarkMode.value = !event.matches
})

// A method to determine whether the Ctrl or Cmd key is pressed, depending on the operating system.

export function isCtrlOrCmd(event: KeyboardEvent): boolean {
  return isMacOS() ? event.metaKey : event.ctrlKey
}

// Some methods to enable/disable the main menu and the File/Close and File/Close All menu items.

export function enableDisableMainMenu(enable: boolean): void {
  electronAPI?.enableDisableMainMenu(enable)
}

export function enableDisableFileCloseAndCloseAllMenuItems(enable: boolean): void {
  electronAPI?.enableDisableFileCloseAndCloseAllMenuItems(enable)
}

// Some file-related methods.

export function isRemoteFilePath(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://')
}

export function filePath(fileOrFilePath: string | File): string {
  return fileOrFilePath instanceof File
    ? electronAPI !== undefined
      ? electronAPI.filePath(fileOrFilePath)
      : fileOrFilePath.name
    : fileOrFilePath
}

export function file(fileOrFilePath: string | File): Promise<locAPI.File> {
  if (typeof fileOrFilePath === 'string') {
    if (isRemoteFilePath(fileOrFilePath)) {
      return new Promise((resolve, reject) => {
        fetch(`https://corsproxy.io/${fileOrFilePath}`)
          .then((response) => {
            if (response.ok) {
              return response.arrayBuffer()
            } else {
              throw new Error(`The server responded with a status of ${String(response.status)}.`)
            }
          })
          .then((arrayBuffer) => {
            const fileContents = new Uint8Array(arrayBuffer)

            resolve(new locAPI.File(filePath(fileOrFilePath), fileContents))
          })
          .catch((error: unknown) => {
            reject(error instanceof Error ? error : new Error(String(error)))
          })
      })
    }

    return new Promise((resolve, reject) => {
      if (electronAPI !== undefined) {
        resolve(new locAPI.File(filePath(fileOrFilePath)))
      } else {
        reject(new Error('Local files cannot be opened.'))
      }
    })
  }

  return new Promise((resolve, reject) => {
    fileOrFilePath
      .arrayBuffer()
      .then((arrayBuffer) => {
        const fileContents = new Uint8Array(arrayBuffer)

        resolve(new locAPI.File(filePath(fileOrFilePath), fileContents))
      })
      .catch((error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      })
  })
}

// A method to track the height of a given element.

export function trackElementHeight(id: string): void {
  vue.onMounted(() => {
    const element = document.getElementById(id)

    if (element !== null) {
      const observer = new ResizeObserver(() => {
        let elementHeight = window.getComputedStyle(element).height

        if (elementHeight === '' || elementHeight === 'auto') {
          elementHeight = '0px'
        }

        const cssVariableName =
          '--' +
          id
            .split('_')[0]
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase() +
          '-height'
        const oldElementHeight = window.getComputedStyle(document.documentElement).getPropertyValue(cssVariableName)

        if (oldElementHeight === '' || (elementHeight !== '0px' && oldElementHeight !== elementHeight)) {
          document.documentElement.style.setProperty(cssVariableName, elementHeight)
        }
      })

      observer.observe(element)

      vue.onUnmounted(() => {
        observer.disconnect()
      })
    }
  })
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
