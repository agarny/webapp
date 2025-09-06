<template>
  <BlockUI
    ref="blockUi"
    :blocked="!uiEnabled"
    class="overflow-hidden"
    :style="blockUiStyle"
    @click="activateInstance"
    @focus="activateInstance"
    @focusin="activateInstance"
    @keydown="activateInstance"
    @mousedown="activateInstance"
  >
    <Toast
      :id="toastId"
      :group="toastId"
      :pt:root:style="{ position: 'absolute' }"
      :class="compIsActive ? 'visible' : 'invisible'"
    />
    <BackgroundComponent v-show="(loadingOpencorMessageVisible || loadingModelMessageVisible) && omex !== undefined" />
    <BlockingMessageComponent message="Loading OpenCOR..." v-show="loadingOpencorMessageVisible" />
    <BlockingMessageComponent message="Loading model..." v-show="loadingModelMessageVisible" />
    <IssuesView v-if="issues.length !== 0" class="h-full" :issues="issues" :width="width" :height="height" />
    <div
      v-else
      @dragenter="onDragEnter"
      class="h-full"
      @dragover.prevent
      @drop.prevent="onDrop"
      @dragleave="onDragLeave"
    >
      <input ref="files" type="file" multiple style="display: none" @change="onChange" />
      <DragNDropComponent v-show="dragAndDropCounter > 0" />
      <MainMenu
        :id="mainMenuId"
        v-if="!electronApi && omex === undefined"
        :isActive="compIsActive"
        :uiEnabled="compUiEnabled"
        :hasFiles="hasFiles"
        @about="onAboutMenu"
        @open="onOpenMenu"
        @openRemote="onOpenRemoteMenu"
        @openSampleLorenz="onOpenSampleLorenzMenu"
        @openSampleInteractiveLorenz="onOpenSampleInteractiveLorenzMenu"
        @close="onCloseMenu"
        @closeAll="onCloseAllMenu"
        @settings="onSettingsMenu"
      />
      <ContentsComponent
        ref="contents"
        :isActive="compIsActive"
        :uiEnabled="compUiEnabled"
        :simulationOnly="omex !== undefined"
        :width="width"
        :height="heightMinusMainMenu"
      />
      <OpenRemoteDialog
        v-model:visible="openRemoteVisible"
        @openRemote="onOpenRemote"
        @close="openRemoteVisible = false"
      />
      <SettingsDialog v-model:visible="settingsVisible" @close="settingsVisible = false" />
      <ResetAllDialog v-model:visible="resetAllVisible" @resetAll="onResetAll" @close="resetAllVisible = false" />
      <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
    </div>
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
  </BlockUI>
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

const blockUi = vue.ref<vue.ComponentPublicInstance | null>(null)
const toastId = vue.ref('opencorToast')
const mainMenuId = vue.ref('opencorMainMenu')
const files = vue.ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const contents = vue.ref<InstanceType<typeof IContentsComponent> | null>(null)
const issues = vue.ref<locApi.IIssue[]>([])
const activeInstanceUid = vueCommon.activeInstanceUid()

// Keep track of which instance of OpenCOR is currently active.

function activateInstance(): void {
  activeInstanceUid.value = String(currentInstance?.uid)
}

const compIsActive = vue.computed(() => {
  return activeInstanceUid.value === String(currentInstance?.uid)
})

// Determine if the component UI should be enabled.

const compUiEnabled = vue.computed(() => {
  return (
    uiEnabled.value &&
    !openRemoteVisible.value &&
    !settingsVisible.value &&
    !resetAllVisible.value &&
    !aboutVisible.value &&
    !updateErrorVisible.value &&
    !updateAvailableVisible.value &&
    !updateDownloadProgressVisible.value &&
    !updateNotAvailableVisible.value
  )
})

// Get the current Vue app instance to use some PrimeVue plugins.

const currentInstance = vue.getCurrentInstance()

if (currentInstance !== null) {
  const app = currentInstance.appContext.app

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (app.config.globalProperties.$primevue === undefined) {
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
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (app.config.globalProperties.$confirm === undefined) {
    app.use(primeVueConfirmationService as unknown as vue.Plugin)
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (app.config.globalProperties.$toast === undefined) {
    app.use(primeVueToastService as unknown as vue.Plugin)
  }
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
    onAboutMenu()
  } else if (isAction(actionName, 'openSettingsDialog')) {
    onSettingsMenu()
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
        group: toastId.value,
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

vue.watch(hasFiles, (newHasFiles: boolean) => {
  electronApi?.enableDisableFileCloseAndCloseAllMenuItems(newHasFiles)
})

// Loading OpenCOR.
// Note: this is only done if window.locApi is not defined, which means that we are running OpenCOR's Web app.

const loadingOpencorMessageVisible = vue.ref<boolean>(false)

// @ts-expect-error (window.locApi may or may not be defined which is why we test it)
if (window.locApi === undefined) {
  enableDisableUi(false)

  loadingOpencorMessageVisible.value = true

  vue.watch(locApiInitialised, (newLocApiInitialised: boolean) => {
    if (newLocApiInitialised) {
      loadingOpencorMessageVisible.value = false

      enableDisableUi(true)
    }
  })
}

// Loading model.

const loadingModelMessageVisible = vue.ref<boolean>(false)

function showLoadingModelMessage(): void {
  enableDisableUi(false)

  loadingModelMessageVisible.value = true
}

function hideLoadingModelMessage(): void {
  enableDisableUi(true)

  loadingModelMessageVisible.value = false
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
  onAboutMenu()
})

function onAboutMenu(): void {
  if (props.omex !== undefined) {
    return
  }

  aboutVisible.value = true
}

// Settings dialog.

const settingsVisible = vue.ref<boolean>(false)

electronApi?.onSettings(() => {
  onSettingsMenu()
})

function onSettingsMenu(): void {
  if (props.omex !== undefined) {
    return
  }

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
    showLoadingModelMessage()
  }

  locCommon
    .file(fileOrFilePath)
    .then((file) => {
      const fileType = file.type()

      if (
        fileType === locApi.EFileType.IRRETRIEVABLE_FILE ||
        fileType === locApi.EFileType.UNKNOWN_FILE ||
        (props.omex !== undefined && fileType !== locApi.EFileType.COMBINE_ARCHIVE)
      ) {
        if (props.omex !== undefined) {
          void vue.nextTick().then(() => {
            issues.value.push({
              type: locApi.EIssueType.ERROR,
              description:
                fileType === locApi.EFileType.IRRETRIEVABLE_FILE
                  ? 'The file could not be retrieved.'
                  : 'Only COMBINE archives are supported.'
            })
          })
        } else {
          toast.add({
            severity: 'error',
            group: toastId.value,
            summary: 'Opening a file',
            detail:
              filePath +
              '\n\n' +
              (fileType === locApi.EFileType.IRRETRIEVABLE_FILE
                ? 'The file could not be retrieved.'
                : 'Only CellML files, SED-ML files, and COMBINE archives are supported.'),
            life: TOAST_LIFE
          })
        }

        electronApi?.fileIssue(filePath)
      } else {
        contents.value?.openFile(file)
      }

      if (locCommon.isRemoteFilePath(filePath)) {
        hideLoadingModelMessage()
      }
    })
    .catch((error: unknown) => {
      if (locCommon.isRemoteFilePath(filePath)) {
        hideLoadingModelMessage()
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
          group: toastId.value,
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

const dragAndDropCounter = vue.ref<number>(0)

function onDragEnter(): void {
  if (!uiEnabled.value || props.omex !== undefined) {
    return
  }

  dragAndDropCounter.value += 1
}

function onDrop(event: DragEvent): void {
  if (dragAndDropCounter.value === 0) {
    return
  }

  dragAndDropCounter.value = 0

  const files = event.dataTransfer?.files

  if (files !== undefined) {
    for (const file of Array.from(files)) {
      openFile(file)
    }
  }
}

function onDragLeave(): void {
  if (dragAndDropCounter.value === 0) {
    return
  }

  dragAndDropCounter.value -= 1
}

// Open.

electronApi?.onOpen((filePath: string) => {
  openFile(filePath)
})

function onOpenMenu(): void {
  if (props.omex !== undefined) {
    return
  }

  files.value?.click()
}

// Open remote.

const openRemoteVisible = vue.ref<boolean>(false)

electronApi?.onOpenRemote(() => {
  openRemoteVisible.value = true
})

function onOpenRemoteMenu(): void {
  if (props.omex !== undefined) {
    return
  }

  openRemoteVisible.value = true
}

function onOpenRemote(url: string): void {
  // Note: no matter whether this is OpenCOR or OpenCOR's Web app, we always retrieve the file contents of a remote
  //       file. We could, in OpenCOR, rely on libOpenCOR to retrieve it for us, but this would block the UI. To
  //       retrieve the file here means that it is done asynchronously, which in turn means that the UI is not blocked
  //       and that we can show a spinning wheel to indicate that something is happening.

  openFile(url)
}

// Open sample Lorenz.

electronApi?.onOpenSampleLorenz(() => {
  onOpenSampleLorenzMenu()
})

function onOpenSampleLorenzMenu(): void {
  if (props.omex !== undefined) {
    return
  }

  openFile('https://github.com/opencor/webapp/raw/refs/heads/main/tests/models/lorenz.omex')
}

// Open sample interactive Lorenz.

electronApi?.onOpenSampleInteractiveLorenz(() => {
  onOpenSampleInteractiveLorenzMenu()
})

function onOpenSampleInteractiveLorenzMenu(): void {
  if (props.omex !== undefined) {
    return
  }

  openFile('https://github.com/opencor/webapp/raw/refs/heads/main/tests/models/ui/lorenz.omex')
}

// Close.

electronApi?.onClose(() => {
  onCloseMenu()
})

function onCloseMenu(): void {
  if (props.omex !== undefined) {
    return
  }

  contents.value?.closeCurrentFile()
}

// Close all.

electronApi?.onCloseAll(() => {
  onCloseAllMenu()
})

function onCloseAllMenu(): void {
  if (props.omex !== undefined) {
    return
  }

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

// A few things that can only be done when the component is mounted.

const blockUiStyle = vue.ref({})
const width = vue.ref<number>(0)
const height = vue.ref<number>(0)
const heightMinusMainMenu = vue.ref<number>(0)

vue.onMounted(() => {
  // Set our height to '100vh' or '100%', depending on whether we are mounted as a Vue application or a Vue component.

  const blockUiElement = blockUi.value?.$el as HTMLElement
  const parentElement = blockUiElement.parentElement
  const grandParentElement = parentElement?.parentElement
  const greatGrandParentElement = grandParentElement?.parentElement
  const greatGreatGrandParentElement = greatGrandParentElement?.parentElement

  blockUiStyle.value =
    parentElement?.tagName === 'DIV' &&
    parentElement.id === 'app' &&
    grandParentElement?.tagName === 'BODY' &&
    greatGrandParentElement?.tagName === 'HTML' &&
    greatGreatGrandParentElement === null
      ? { height: '100vh' }
      : { height: '100%' }

  // Customise our IDs.

  toastId.value = `opencorToast${String(currentInstance?.uid)}`
  mainMenuId.value = `opencorMainMenu${String(currentInstance?.uid)}`

  // Make ourselves the active instance.

  setTimeout(() => {
    activateInstance()
  }, SHORT_DELAY)

  // Track the height of our main menu.

  let mainMenuResizeObserver: ResizeObserver | undefined

  setTimeout(() => {
    mainMenuResizeObserver = vueCommon.trackElementHeight(mainMenuId.value)
  }, SHORT_DELAY)

  // Ensure that our toasts are shown within our block UI.

  setTimeout(() => {
    const toastElement = document.getElementById(toastId.value)

    if (toastElement !== null) {
      blockUiElement.appendChild(toastElement)
    }
  }, SHORT_DELAY)

  // Monitor "our" contents size.

  function resizeOurselves() {
    const style = window.getComputedStyle(blockUiElement)

    width.value = parseFloat(style.width)
    height.value = parseFloat(style.height)

    heightMinusMainMenu.value = height.value - vueCommon.trackedCssVariableValue(mainMenuId.value)
  }

  const resizeObserver = new ResizeObserver(() => {
    setTimeout(() => {
      resizeOurselves()
    }, SHORT_DELAY)
  })

  let oldMainMenuHeight = vueCommon.trackedCssVariableValue(mainMenuId.value)

  const mutationObserver = new MutationObserver(() => {
    const newMainMenuHeight = vueCommon.trackedCssVariableValue(mainMenuId.value)

    if (newMainMenuHeight !== oldMainMenuHeight) {
      oldMainMenuHeight = newMainMenuHeight

      resizeOurselves()
    }
  })

  resizeObserver.observe(blockUiElement)
  mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

  vue.onUnmounted(() => {
    resizeObserver.disconnect()
    mutationObserver.disconnect()

    mainMenuResizeObserver?.disconnect()
  })
})

// If a COMBINE archive is provided then open it (and then the Simulation Experiment view will be shown in isolation) or
// carry as normal (i.e. the whole OpenCOR UI will be shown).

if (props.omex !== undefined) {
  vue.watch(locApiInitialised, (newLocApiInitialised: boolean) => {
    if (newLocApiInitialised) {
      if (props.omex !== undefined) {
        openFile(props.omex)
      }
    }
  })
} else {
  // A few additional things that can only be done when the component is mounted.

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
