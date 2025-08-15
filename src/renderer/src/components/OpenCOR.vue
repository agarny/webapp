<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <IssuesView v-if="issues.length !== 0" :issues="issues" :simulationOnly="omex !== undefined" />
    <div v-else class="h-full">
      <div v-show="!electronApi && omex === undefined">
        <MainMenu
          :hasFiles="hasFiles"
          @about="onAbout"
          @open="($refs.files as HTMLInputElement).click()"
          @openRemote="openRemoteVisible = true"
          @openSampleLorenz="onOpenSampleLorenz"
          @openSampleInteractiveLorenz="onOpenSampleInteractiveLorenz"
          @close="onClose"
          @closeAll="onCloseAll"
          @settings="onSettings"
        />
      </div>
      <div class="h-full" @dragenter="onDragEnter" @dragover.prevent @drop.prevent="onDrop" @dragleave="onDragLeave">
        <BlockingMessageComponent message="Loading OpenCOR..." v-show="loadingLipencorWebAssemblyModuleVisible" />
        <ContentsComponent ref="contents" :simulationOnly="omex !== undefined" />
        <DragNDropComponent v-show="dropAreaCounter > 0" />
        <BlockUI :blocked="!uiEnabled" :fullScreen="true"></BlockUI>
        <BlockingMessageComponent message="Loading model..." v-show="spinningWheelVisible" />
      </div>
    </div>
  </div>
  <input ref="files" type="file" multiple style="display: none" @change="onChange" />
  <UpdateErrorDialog
    v-model:visible="updateErrorVisible"
    :title="updateErrorTitle"
    :issue="updateErrorIssue"
    @close="onUpdateErrorDialogClose"
  />
  <UpdateAvailableDialog
    v-model:visible="updateAvailableVisible"
    :version="updateVersion"
    @downloadAndInstall="onDownloadAndInstall"
    @close="updateAvailableVisible = false"
  />
  <UpdateDownloadProgressDialog v-model:visible="updateDownloadProgressVisible" :percent="updateDownloadPercent" />
  <UpdateNotAvailableDialog v-model:visible="updateNotAvailableVisible" @close="updateNotAvailableVisible = false" />
  <OpenRemoteDialog v-model:visible="openRemoteVisible" @openRemote="onOpenRemote" @close="openRemoteVisible = false" />
  <ResetAllDialog v-model:visible="resetAllVisible" @resetAll="onResetAll" @close="resetAllVisible = false" />
  <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
  <SettingsDialog v-model:visible="settingsVisible" @close="settingsVisible = false" />
  <Toast />
</template>

<script setup lang="ts">
import primeVueAuraTheme from '@primeuix/themes/aura'
import * as vueusecore from '@vueuse/core'

import 'primeicons/primeicons.css'
import primeVueConfig from 'primevue/config'
import primeVueConfirmationService from 'primevue/confirmationservice'
import primeVueToastService from 'primevue/toastservice'
import { useToast } from 'primevue/usetoast'
import * as vue from 'vue'

import type { IOpenCORProps } from '../../index'

import '../assets/app.css'
import * as common from '../common/common'
import { SHORT_DELAY, TOAST_LIFE } from '../common/constants'
import { electronApi } from '../common/electronApi'
import * as locCommon from '../common/locCommon'
import * as vueCommon from '../common/vueCommon'
import IContentsComponent from '../components/ContentsComponent.vue'
import * as locApi from '../libopencor/locApi'

const props = defineProps<IOpenCORProps>()

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const contents = vue.ref<InstanceType<typeof IContentsComponent> | null>(null)
const issues = vue.ref<locApi.IIssue[]>([])

// Get the current Vue app instance to use some PrimeVue components.

const getCurrentInstance = vue.getCurrentInstance()

if (getCurrentInstance !== null) {
  const app = getCurrentInstance.appContext.app
  let options = {}

  if (props.theme === 'light') {
    options = {
      darkModeSelector: false
    }
  } else if (props.theme === 'dark') {
    document.documentElement.classList.add('opencor-dark-mode')
    document.body.classList.add('opencor-dark-mode')

    options = {
      darkModeSelector: '.opencor-dark-mode'
    }
  }

  app.use(primeVueConfig as unknown as vue.Plugin, {
    theme: {
      preset: primeVueAuraTheme,
      options: options
    }
  })
  app.use(primeVueConfirmationService as unknown as vue.Plugin)
  app.use(primeVueToastService as unknown as vue.Plugin)
}

if (props.theme !== undefined) {
  vueCommon.setTheme(props.theme)
}

const toast = useToast()

// Asynchronously initialise our libOpenCOR API.

const locApiInitialised = vue.ref(false)

void locApi.initialiseLocApi().then(() => {
  locApiInitialised.value = true
})

// Handle an action.

electronApi?.onAction((action: string) => {
  handleAction(action)
})

function handleAction(action: string): void {
  function isAction(actionName: string, expectedActionName: string): boolean {
    return actionName.localeCompare(expectedActionName, undefined, { sensitivity: 'base' }) === 0
  }

  const index = action.indexOf('/')
  const actionName = index !== -1 ? action.substring(0, index) : action
  const actionArguments = index !== -1 ? action.substring(index + 1) : ''

  if (isAction(actionName, 'openAboutDialog')) {
    onAbout()
  } else if (isAction(actionName, 'openSettingsDialog')) {
    onSettings()
  } else {
    const filePaths = actionArguments.split('%7C')

    if (
      (isAction(actionName, 'openFile') && filePaths.length === 1) ||
      (isAction(actionName, 'openFiles') && filePaths.length > 1)
    ) {
      for (const filePath of filePaths) {
        openFile(filePath)
      }
    } else {
      toast.add({
        severity: 'error',
        summary: 'Handling an action',
        detail: `${action}\n\nThe action could not be handled.`,
        life: TOAST_LIFE
      })
    }
  }
}

// Enable/disable the UI.

const uiEnabled = vue.ref<boolean>(true)

electronApi?.onEnableDisableUi((enable: boolean) => {
  enableDisableUi(enable)
})

function enableDisableUi(enable: boolean): void {
  uiEnabled.value = enable
}

// Enable/disable some menu items.

const hasFiles = vue.computed(() => {
  return contents.value?.hasFiles() ?? false
})

vue.watch(hasFiles, (hasFiles) => {
  electronApi?.enableDisableFileCloseAndCloseAllMenuItems(hasFiles)
})

// Loading libOpenCOR's WebAssembly module.
// Note: this is only done if window.locApi is not defined, which means that we are running OpenCOR's Web app.

const loadingLipencorWebAssemblyModuleVisible = vue.ref<boolean>(false)

// @ts-expect-error (window.locApi may or may not be defined which is why we test it)
if (window.locApi === undefined) {
  enableDisableUi(false)

  loadingLipencorWebAssemblyModuleVisible.value = true

  vue.watch(locApiInitialised, (initialised) => {
    if (initialised) {
      loadingLipencorWebAssemblyModuleVisible.value = false

      enableDisableUi(true)
    }
  })
}

// Spinning wheel.

const spinningWheelVisible = vue.ref<boolean>(false)

function showSpinningWheel(): void {
  enableDisableUi(false)

  spinningWheelVisible.value = true
}

function hideSpinningWheel(): void {
  enableDisableUi(true)

  spinningWheelVisible.value = false
}

// Auto update.

electronApi?.onCheckForUpdates(() => {
  electronApi?.checkForUpdates(false)
})

const updateErrorVisible = vue.ref<boolean>(false)
const updateErrorTitle = vue.ref<string>('')
const updateErrorIssue = vue.ref<string>('')

function onUpdateErrorDialogClose(): void {
  updateErrorVisible.value = false
  updateDownloadProgressVisible.value = false
}

const updateAvailableVisible = vue.ref<boolean>(false)
const updateDownloadProgressVisible = vue.ref<boolean>(false)
const updateVersion = vue.ref<string>('')
const updateDownloadPercent = vue.ref<number>(0)

electronApi?.onUpdateAvailable((version: string) => {
  updateAvailableVisible.value = true
  updateVersion.value = version
})

function onDownloadAndInstall(): void {
  updateDownloadPercent.value = 0 // Just to be on the safe side.
  updateDownloadProgressVisible.value = true
  updateAvailableVisible.value = false

  electronApi?.downloadAndInstallUpdate()
}

electronApi?.onUpdateDownloadError((issue: string) => {
  updateErrorTitle.value = 'Downloading Update...'
  updateErrorIssue.value = `An error occurred while downloading the update (${issue}).`
  updateErrorVisible.value = true
})

electronApi?.onUpdateDownloadProgress((percent: number) => {
  updateDownloadPercent.value = percent
})

electronApi?.onUpdateDownloaded(() => {
  updateDownloadPercent.value = 100 // Just to be on the safe side.

  electronApi?.installUpdateAndRestart()
})

const updateNotAvailableVisible = vue.ref<boolean>(false)

electronApi?.onUpdateNotAvailable(() => {
  updateNotAvailableVisible.value = true
})

electronApi?.onUpdateCheckError((issue: string) => {
  updateErrorTitle.value = 'Checking For Updates...'
  updateErrorIssue.value = `An error occurred while checking for updates (${issue}).`
  updateErrorVisible.value = true
})

// About dialog.

const aboutVisible = vue.ref<boolean>(false)

electronApi?.onAbout(() => {
  onAbout()
})

function onAbout(): void {
  aboutVisible.value = true
}

// Settings dialog.

const settingsVisible = vue.ref<boolean>(false)

electronApi?.onSettings(() => {
  onSettings()
})

function onSettings(): void {
  settingsVisible.value = true
}

// Open a file.

function openFile(fileOrFilePath: string | File): void {
  // Check whether the file is already open and if so then select it.

  const filePath = locCommon.filePath(fileOrFilePath)

  if (contents.value?.hasFile(filePath) ?? false) {
    contents.value?.selectFile(filePath)

    return
  }

  // Retrieve a locApi.File object for the given file or file path and add it to the contents.

  if (locCommon.isRemoteFilePath(filePath)) {
    showSpinningWheel()
  }

  locCommon
    .file(fileOrFilePath)
    .then((file) => {
      const fileType = file.type()

      if (fileType === locApi.EFileType.UNKNOWN_FILE || fileType === locApi.EFileType.IRRETRIEVABLE_FILE) {
        if (props.omex !== undefined) {
          void vue.nextTick().then(() => {
            issues.value.push({
              type: locApi.EIssueType.ERROR,
              description:
                fileType === locApi.EFileType.UNKNOWN_FILE
                  ? 'Only CellML files, SED-ML files, and COMBINE archives are supported.'
                  : 'The file could not be retrieved.'
            })
          })
        } else {
          toast.add({
            severity: 'error',
            summary: 'Opening a file',
            detail:
              filePath +
              '\n\n' +
              (fileType === locApi.EFileType.UNKNOWN_FILE
                ? 'Only CellML files, SED-ML files, and COMBINE archives are supported.'
                : 'The file could not be retrieved.'),
            life: TOAST_LIFE
          })
        }

        electronApi?.fileIssue(filePath)
      } else {
        contents.value?.openFile(file)
      }

      if (locCommon.isRemoteFilePath(filePath)) {
        hideSpinningWheel()
      }
    })
    .catch((error: unknown) => {
      if (locCommon.isRemoteFilePath(filePath)) {
        hideSpinningWheel()
      }

      if (props.omex !== undefined) {
        void vue.nextTick().then(() => {
          issues.value.push({
            type: locApi.EIssueType.ERROR,
            description: common.formatIssue(error instanceof Error ? error.message : String(error))
          })
        })
      } else {
        toast.add({
          severity: 'error',
          summary: 'Opening a file',
          detail: `${filePath}\n\n${common.formatIssue(error instanceof Error ? error.message : String(error))}`,
          life: TOAST_LIFE
        })
      }

      electronApi?.fileIssue(filePath)
    })
}

// Open file(s) dialog.

function onChange(event: Event): void {
  const files = (event.target as HTMLInputElement).files

  if (files !== null) {
    for (const file of Array.from(files)) {
      openFile(file)
    }
  }
}

// Drag and drop.

const dropAreaCounter = vue.ref<number>(0)

function onDragEnter(): void {
  if (props.omex !== undefined) {
    return
  }

  dropAreaCounter.value += 1
}

function onDrop(event: DragEvent): void {
  if (props.omex !== undefined) {
    return
  }

  dropAreaCounter.value = 0

  const files = event.dataTransfer?.files

  if (files !== undefined) {
    for (const file of Array.from(files)) {
      openFile(file)
    }
  }
}

function onDragLeave(): void {
  if (props.omex !== undefined) {
    return
  }

  dropAreaCounter.value -= 1
}

// Open.

electronApi?.onOpen((filePath: string) => {
  openFile(filePath)
})

// Open remote.

const openRemoteVisible = vue.ref<boolean>(false)

electronApi?.onOpenRemote(() => {
  openRemoteVisible.value = true
})

function onOpenRemote(url: string): void {
  // Note: no matter whether this is OpenCOR or OpenCOR's Web app, we always retrieve the file contents of a remote
  //       file. We could, in OpenCOR, rely on libOpenCOR to retrieve it for us, but this would block the UI. To
  //       retrieve the file here means that it is done asynchronously, which in turn means that the UI is not blocked
  //       and that we can show a spinning wheel to indicate that something is happening.

  openFile(url)
}

// Open sample Lorenz.

electronApi?.onOpenSampleLorenz(() => {
  onOpenSampleLorenz()
})

function onOpenSampleLorenz(): void {
  openFile('https://github.com/opencor/webapp/raw/refs/heads/main/tests/models/lorenz.omex')
}

// Open sample interactive Lorenz.

electronApi?.onOpenSampleInteractiveLorenz(() => {
  onOpenSampleInteractiveLorenz()
})

function onOpenSampleInteractiveLorenz(): void {
  openFile('https://github.com/opencor/webapp/raw/refs/heads/main/tests/models/ui/lorenz.omex')
}

// Close.

electronApi?.onClose(() => {
  onClose()
})

function onClose(): void {
  contents.value?.closeCurrentFile()
}

// Close all.

electronApi?.onCloseAll(() => {
  onCloseAll()
})

function onCloseAll(): void {
  contents.value?.closeAllFiles()
}

// Reset all.

const resetAllVisible = vue.ref<boolean>(false)

electronApi?.onResetAll(() => {
  resetAllVisible.value = true
})

function onResetAll(): void {
  electronApi?.resetAll()
}

// Select.

electronApi?.onSelect((filePath: string) => {
  contents.value?.selectFile(filePath)
})

// If a COMBINE archive is provided then open it (and then the Simulation Experiment view will be shown in isolation) or
// carry as normal (i.e. the whole OpenCOR UI will be shown).

if (props.omex !== undefined) {
  vue.watch(locApiInitialised, (initialised) => {
    if (initialised) {
      if (props.omex !== undefined) {
        openFile(props.omex)
      }
    }
  })
} else {
  // Track the height of our main menu.

  vueCommon.trackElementHeight('mainMenu')

  // Things that need to be done when the component is mounted.

  vue.onMounted(() => {
    // Do what follows with a bit of a delay to give our background (with the OpenCOR logo) time to be renderered.

    setTimeout(() => {
      if (electronApi !== undefined) {
        // Check for updates.
        // Note: the main process will actually check for updates if requested and if OpenCOR is packaged.

        electronApi.checkForUpdates(true)
      } else {
        // Handle the action passed to our Web app, if any.
        // Note: to use vue.nextTick() doesn't do the trick, so we have no choice but to use setTimeout().

        const action = vueusecore.useStorage('action', '')

        if (window.location.search !== '') {
          action.value = window.location.search.substring(1)

          window.location.search = ''
        } else if (action.value !== '') {
          setTimeout(() => {
            handleAction(action.value)

            action.value = ''
          }, SHORT_DELAY)
        }
      }
    }, SHORT_DELAY)
  })
}
</script>
