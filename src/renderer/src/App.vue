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
          @close="onClose"
          @closeAll="onCloseAll"
          @settings="onSettings"
        />
      </div>
      <div class="h-full" @dragenter="onDragEnter" @dragover.prevent @drop.prevent="onDrop" @dragleave="onDragLeave">
        <ContentsComponent ref="contents" :simulationOnly="omex !== undefined" />
        <DragNDropComponent v-show="dropAreaCounter > 0" />
        <BlockUI :blocked="!uiEnabled" :fullScreen="true"></BlockUI>
        <ProgressSpinner v-show="spinningWheelVisible" class="spinning-wheel" />
      </div>
    </div>
  </div>
  <input type="file" multiple style="display: none" @change="onChange" />
  <OpenRemoteDialog v-model:visible="openRemoteVisible" @openRemote="onOpenRemote" @close="openRemoteVisible = false" />
  <ResetAllDialog v-model:visible="resetAllVisible" @resetAll="onResetAll" @close="resetAllVisible = false" />
  <AboutDialog v-model:visible="aboutVisible" @close="aboutVisible = false" />
  <Toast />
</template>

<script setup lang="ts">
import * as vueusecore from '@vueuse/core'

import { useToast } from 'primevue/usetoast'
import * as vue from 'vue'

import { SHORT_DELAY, TOAST_LIFE } from '../../constants'
import { electronApi } from '../../electronApi'
import * as locApi from '../../libopencor/locApi'

import * as common from './common'
import IContentsComponent from './components/ContentsComponent.vue'

const props = defineProps<{
  omex?: string
}>()

const toast = useToast()
const contents = vue.ref<InstanceType<typeof IContentsComponent> | null>(null)
const issues = vue.ref<locApi.IIssue[]>([])

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
        detail: action + '\n\nThe action could not be handled.',
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

// Check for updates dialog.

electronApi?.onCheckForUpdates(() => {
  toast.add({
    severity: 'info',
    summary: 'Check for updates',
    detail: 'The Check for updates dialog has yet to be implemented.',
    life: TOAST_LIFE
  })
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

electronApi?.onSettings(() => {
  onSettings()
})

function onSettings(): void {
  toast.add({
    severity: 'info',
    summary: 'Settings',
    detail: 'The Settings dialog has yet to be implemented.',
    life: TOAST_LIFE
  })
}

// Open a file.

function openFile(fileOrFilePath: string | File): void {
  // Check whether the file is already open and if so then select it.

  const filePath = common.filePath(fileOrFilePath)

  if (contents.value?.hasFile(filePath) ?? false) {
    contents.value?.selectFile(filePath)

    return
  }

  // Retrieve a locApi.File object for the given file or file path and add it to the contents.

  if (common.isRemoteFilePath(filePath)) {
    showSpinningWheel()
  }

  common
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

      if (common.isRemoteFilePath(filePath)) {
        hideSpinningWheel()
      }
    })
    .catch((error: unknown) => {
      if (common.isRemoteFilePath(filePath)) {
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
          detail: filePath + '\n\n' + common.formatIssue(error instanceof Error ? error.message : String(error)),
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
  openFile(props.omex)
} else {
  // Track the height of our main menu.

  common.trackElementHeight('mainMenu')

  // Things that need to be done when the component is mounted.

  vue.onMounted(() => {
    // Do what follows with a bit of a delay to give our background (with the OpenCOR logo) time to be renderered.

    setTimeout(() => {
      if (electronApi === undefined) {
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

<style scoped>
.spinning-wheel {
  width: 50% !important;
  height: 50% !important;
  position: fixed !important;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
}
</style>
