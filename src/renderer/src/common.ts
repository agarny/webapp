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

// A method to track the resizing of a given element and, as a result, update the available viewport height, i.e. the
// viewport height minus that of our main menu and that of our file tabs.

export function trackElementResizing(id: string): void {
  vue.onMounted(() => {
    const element = document.getElementById(id)

    if (element !== null) {
      const observer = new ResizeObserver(() => {
        function elementHeight(id: string): string {
          const element = document.getElementById(id)
          const res = element !== null ? window.getComputedStyle(element).height : '0px'

          if (res === 'auto') {
            return '0px'
          }

          return res
        }

        document.documentElement.style.setProperty(
          '--available-viewport-height',
          'calc(100vh - ' +
            elementHeight('mainMenu') +
            ' - ' +
            elementHeight('fileTablist') +
            ' - ' +
            elementHeight('fileTablistToolbar') +
            ')'
        )
      })

      observer.observe(element)

      vue.onUnmounted(() => {
        observer.disconnect()
      })
    }
  })
}
