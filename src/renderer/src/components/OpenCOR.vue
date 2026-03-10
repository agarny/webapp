<template>
  <BlockUI ref="blockUiRef" class="opencor overflow-hidden h-full" :class="showMainMenu ? 'with-main-menu' : ''"
    :blocked="blockUiBlocked"
    @click="activateInstance"
    @focus="activateInstance"
    @focusin="activateInstance"
    @keydown="activateInstance"
    @mousedown="activateInstance"
  >
    <Toast :id="toastId" :class="compIsActive ? 'visible' : 'invisible'"
      :group="toastId"
      :pt:root:style="{ position: 'absolute' }"
    />
    <BackgroundComponent v-show="compBackgroundVisible" />
    <IssuesView v-if="compIssues.length" class="m-4" style="height: calc(100% - 2rem);" :issues="compIssues" />
    <div v-else class="h-full flex flex-col"
      @dragenter="onDragEnter"
      @dragover.prevent
      @drop.prevent="onDrop"
      @dragleave="onDragLeave"
    >
      <input ref="filesRef" type="file" multiple style="display: none;" @change="onChange" />
      <DragNDropComponent v-show="dragAndDropCounter" />
      <MainMenu ref="mainMenuRef" v-if="showMainMenu"
        :isActive="compIsActive"
        :uiEnabled="compUiEnabled"
        :hasFiles="hasFiles"
        @about="onAboutMenu"
        @open="onOpenMenu"
        @openRemote="onOpenRemoteMenu"
        @openSampleLorenz="onOpenSampleLorenzMenu"
        @close="onCloseMenu"
        @closeAll="onCloseAllMenu"
        @settings="onSettingsMenu"
        @updateAvailable="onUpdateAvailable"
      />
      <!-- TODO: enable once our GitHub integration is fully ready.
      <div v-if="firebaseConfig && !omex">
        <div class="absolute top-1 right-1 z-999">
          <Button icon="pi pi-github" outlined severity="secondary" :class="octokit ? 'connected-to-github' : 'disconnected-from-github'" rounded @click="onGitHubButtonClick" />
        </div>
        <YesNoQuestionDialog
          v-model:visible="disconnectFromGitHubVisible"
          title="Disconnect from GitHub..."
          question="You are about to disconnect from GitHub. Do you want to proceed?"
          @yes="onDisconnectFromGitHub"
          @no="disconnectFromGitHubVisible = false"
        />
      </div>
      -->
      <ContentsComponent ref="contentsRef" class="grow min-h-0"
        :isActive="compIsActive"
        :uiEnabled="compUiEnabled"
        :simulationOnly="!!omex"
        @error="onError"
        @simulationData="emitSimulationData"
      />
      <BlockingMessageComponent v-show="initialisingOpencorMessageVisible" message="Initialising OpenCOR..." :progress="initialisation.progress.value" />
      <BlockingMessageComponent v-show="loadingModelMessageVisible" message="Loading model..." />
      <BlockingMessageComponent v-show="progressMessageVisible" :message="progressMessageMessage" :progress="progressMessageProgress" />
      <OkMessageDialog v-model:visible="updateErrorVisible"
        :title="updateErrorTitle"
        :message="updateErrorIssue"
        @ok="onUpdateErrorDialogClose"
      />
      <YesNoQuestionDialog v-model:visible="desktopUpdateAvailableVisible"
        title="Check for Updates..."
        :question="'Version ' + updateVersion + ' is available. Do you want to download it and install it?'"
        @yes="onDownloadAndInstall"
        @no="desktopUpdateAvailableVisible = false"
      />
      <UpdateDownloadProgressDialog v-model:visible="updateDownloadProgressVisible"
        :percent="updateDownloadPercent"
      />
      <OkMessageDialog v-model:visible="updateNotAvailableVisible"
        title="Check for Updates..."
        message="No updates are available at this time."
        @ok="updateNotAvailableVisible = false"
      />
      <OpenRemoteDialog v-model:visible="openRemoteVisible"
        @openRemote="onOpenRemote"
        @close="openRemoteVisible = false"
      />
      <SettingsDialog v-model:visible="settingsVisible"
        @close="settingsVisible = false"
      />
      <YesNoQuestionDialog v-model:visible="resetAllVisible"
        title="Reset All..."
        question="You are about to reset all of your settings. Do you want to proceed?"
        severity="danger"
        @yes="onResetAll"
        @no="resetAllVisible = false"
      />
      <AboutDialog v-model:visible="aboutVisible"
        @close="aboutVisible = false"
      />
      <UpdateAvailableDialog v-model:visible="webUpdateAvailableVisible"
        @close="webUpdateAvailableVisible = false"
      />
    </div>
  </BlockUI>
</template>

<script setup lang="ts">
import primeVueAuraTheme from '@primeuix-ce/themes/aura';
import * as vueusecore from '@vueuse/core';

/* TODO: enable once our GitHub integration is fully ready.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { Octokit } from 'octokit';
*/
import BlockUI from '@primevue-ce/primevue/blockui';
import primeVueConfig from '@primevue-ce/primevue/config';
import primeVueConfirmationService from '@primevue-ce/primevue/confirmationservice';
import primeVueToastService from '@primevue-ce/primevue/toastservice';
import { useToast } from '@primevue-ce/primevue/usetoast';
import * as vue from 'vue';

import type { IOpenCOREmits, IOpenCORProps } from '../../index.ts';

import '../assets/app.css';
import '../assets/primeicons-assets.ts';
import * as common from '../common/common.ts';
import { FULL_URI_SCHEME, LONG_DELAY, NO_DELAY, SHORT_DELAY, TOAST_LIFE } from '../common/constants.ts';
import * as dependencies from '../common/dependencies.ts';
import { electronApi } from '../common/electronApi.ts';
/* TODO: enable once our GitHub integration is fully ready.
import firebaseConfig, { missingFirebaseKeys } from '../common/firebaseConfig';
*/
import * as initialisation from '../common/initialisation.ts';
import * as locCommon from '../common/locCommon.ts';
import * as version from '../common/version.ts';
import * as vueCommon from '../common/vueCommon.ts';
import ContentsComponent from '../components/ContentsComponent.vue';
import * as locApi from '../libopencor/locApi.ts';

import { provideDialogState } from './dialogs/BaseDialog.vue';
import MainMenu from './MainMenu.vue';

const props = defineProps<IOpenCORProps>();

const emit = defineEmits<IOpenCOREmits>();

const trackedSimulationData = vue.ref<string[]>([]);

const trackSimulationData = (modelParameters: string[]): void => {
  for (const modelParameter of modelParameters) {
    if (!trackedSimulationData.value.includes(modelParameter)) {
      trackedSimulationData.value.push(modelParameter);
    }
  }

  emitSimulationData();
};

const untrackSimulationData = (modelParameters: string[]): void => {
  trackedSimulationData.value = trackedSimulationData.value.filter((mp) => !modelParameters.includes(mp));
};

const untrackAllSimulationData = (): void => {
  trackedSimulationData.value = [];
};

defineExpose({
  trackSimulationData,
  untrackSimulationData,
  untrackAllSimulationData
});

const emitSimulationData = (): void => {
  if (!trackedSimulationData.value.length) {
    return;
  }

  const contents = contentsRef.value;

  if (!contents) {
    emit('simulationData', {
      simulationData: common.undefinedSimulationData(trackedSimulationData.value),
      issues: ['No contents available.']
    });

    return;
  }

  contents.simulationData(trackedSimulationData.value).then((res) => {
    emit('simulationData', res);
  });
};

const { isDialogActive } = provideDialogState();

const blockUiRef = vue.ref<InstanceType<typeof BlockUI> | null>(null);
const mainMenuRef = vue.ref<InstanceType<typeof MainMenu> | null>(null);
const filesRef = vue.ref<HTMLElement | null>(null);
const contentsRef = vue.ref<InstanceType<typeof ContentsComponent> | null>(null);
const issues = vue.ref<locApi.IIssue[]>([]);
const compIssues = vue.computed<locApi.IIssue[]>(() => {
  return [...initialisation.issues.value, ...issues.value];
});
const activeInstanceUid = vueCommon.activeInstanceUid();
const connectingToGitHub = vue.ref<boolean>(false);
/* TODO: enable once our GitHub integration is fully ready.
const octokit = vue.ref<Octokit | null>(null);
*/
const initialisingOpencorMessageVisible = vue.ref<boolean>(true);
const loadingModelMessageVisible = vue.ref<boolean>(false);

// Keep track of which instance of OpenCOR is currently active.

const activateInstance = (): void => {
  activeInstanceUid.value = crtInstanceUid;
};

const compIsActive = vue.computed<boolean>(() => {
  return activeInstanceUid.value === crtInstanceUid;
});

// Enable/disable the UI from Electron.

const electronUiEnabled = vue.ref<boolean>(true);

electronApi?.onEnableDisableUi((enable: boolean) => {
  electronUiEnabled.value = enable;
});

// Determine whether the component UI should be blocked/enabled.
// Note: compBlockUiEnabled is used to determine whether PrimeVue's BlockUI component should be enabled, whereas
//       compUiEnabled is used to determine whether the UI should be enabled (it checks whether various dialogs are
//       visible since those dialogs block the UI). Whether a dialog is visible or not is tracked in compUiEnabled
//       rather than compBlockUiEnabled because we don't want to show the BlockUI's overlay when a dialog is open
//       since a dialog already has some overlaying effect and the BlockUI's overlay would just make things look darker
//       and worse.

const compBlockUiEnabled = vue.computed<boolean>(() => {
  return (
    !electronUiEnabled.value ||
    initialisingOpencorMessageVisible.value ||
    loadingModelMessageVisible.value ||
    progressMessageVisible.value ||
    connectingToGitHub.value
  );
});

const compUiEnabled = vue.computed<boolean>(() => {
  return !compBlockUiEnabled.value && !isDialogActive.value;
});

// Block/unblock the UI with "no" (i.e. a bit of a) delay to ensure that it doesn't happen too quickly (e.g., when
// loading a model from a COMBINE archive, we don't want the UI to be blocked for a split second while the file is
// being processed and the Simulation Experiment view is being shown in isolation).

const blockUiBlocked = vue.ref<boolean>(true);
let blockUiBlockedTimeoutId: number | undefined;

vue.watch(
  compBlockUiEnabled,
  (newCompBlockUiEnabled: boolean) => {
    if (blockUiBlockedTimeoutId !== undefined) {
      window.clearTimeout(blockUiBlockedTimeoutId);
    }

    blockUiBlockedTimeoutId = window.setTimeout(() => {
      blockUiBlocked.value = newCompBlockUiEnabled;

      blockUiBlockedTimeoutId = undefined;
    }, NO_DELAY);
  },
  { immediate: true }
);

vue.onUnmounted(() => {
  if (blockUiBlockedTimeoutId !== undefined) {
    window.clearTimeout(blockUiBlockedTimeoutId);
  }
});

// Determine whether to show the main menu or not.

const showMainMenu = vue.computed<boolean>(() => {
  return !electronApi && !props.omex;
});

// Determine whether the background should be visible.

const compBackgroundVisible = vue.computed<boolean>(() => {
  return (
    (initialisingOpencorMessageVisible.value || loadingModelMessageVisible.value || progressMessageVisible.value) &&
    !!props.omex
  );
});

// Provide access to our progress message features.

export interface IProgressMessage {
  show: (message: string) => void;
  update: (percent: number) => void;
  hide: () => void;
}

const show = (message: string): void => {
  progressMessageMessage.value = message;
  progressMessageProgress.value = 0;
  progressMessageVisible.value = true;
};

const update = (percent: number): void => {
  progressMessageProgress.value = percent;
};

const hide = (): void => {
  progressMessageVisible.value = false;
};

vue.provide<IProgressMessage>('progressMessage', {
  show,
  update,
  hide
});

const progressMessageVisible = vue.ref<boolean>(false);
const progressMessageMessage = vue.ref<string>('');
const progressMessageProgress = vue.ref<number>(0);

// Get the current Vue app instance to use some PrimeVue plugins.

const crtInstance = vue.getCurrentInstance();
const crtInstanceUid = String(crtInstance?.uid);
const crtVueAppInstance = crtInstance?.appContext.app || null;

if (crtVueAppInstance) {
  if (!crtVueAppInstance.config.globalProperties.$primevue) {
    crtVueAppInstance.use(primeVueConfig as unknown as vue.Plugin, {
      theme: {
        preset: primeVueAuraTheme,
        options: {
          darkModeSelector: '.opencor-dark-mode'
        }
      }
    });
  }

  if (!crtVueAppInstance.config.globalProperties.$confirm) {
    crtVueAppInstance.use(primeVueConfirmationService as unknown as vue.Plugin);
  }

  if (!crtVueAppInstance.config.globalProperties.$toast) {
    crtVueAppInstance.use(primeVueToastService as unknown as vue.Plugin);
  }
}

vueCommon.useTheme().setTheme(props.theme);

// Get ready to show toasts and provide a helper to show them that ensures that the proper group id is used and that the
// instance becomes active before the message is pushed.

const toast = useToast();
const toastId = vue.ref(`opencorToast${crtInstanceUid}`);

const addToast = (options: Parameters<typeof toast.add>[0]) => {
  activateInstance();

  toast.add({ ...options, group: toastId.value });
};

// Finish initialising OpenCOR.

const crtGlobalProperties = crtVueAppInstance?.config.globalProperties as Record<string, unknown> | undefined;
const vueTippyInstalledFlag = 'opencorVueTippyInstalled';
let postInitialisationDone = false;

vue.watch(
  initialisation.done,
  async (newInitialisationDone: boolean) => {
    if (newInitialisationDone && !postInitialisationDone) {
      postInitialisationDone = true;

      // OpenCOR is now fully initialised, so we can finalise a few things, namely let the current Vue app instance use
      // VueTippy.

      if (crtVueAppInstance && crtGlobalProperties && !crtGlobalProperties[vueTippyInstalledFlag]) {
        crtVueAppInstance.use(dependencies._vueTippy);

        crtGlobalProperties[vueTippyInstalledFlag] = true;
      }

      // Now, we can hide the loading message (but after a long delay so that the user gets a chance to see that the
      // initialisation has reached 100%).

      await common.sleep(LONG_DELAY);

      initialisingOpencorMessageVisible.value = false;

      // We are all done, so let's start checking for a new version of OpenCOR.

      version.startCheck();
    }
  },
  { immediate: true }
);

vue.watch(
  initialisation.failed,
  (newInitialisationFailed: boolean) => {
    if (newInitialisationFailed) {
      initialisingOpencorMessageVisible.value = false;
    }
  },
  { immediate: true }
);

/* TODO: enable once our GitHub integration is fully ready.
// Initialise Firebase.
// Note: we check whether a Firebase app is already initialised to avoid issues when hot-reloading during development
//       and/or using OpenCOR as a Vue component within another application that also uses Firebase.

if (firebaseConfig) {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} else if (!props.omex) {
  const items = missingFirebaseKeys();
  const formatList = (items: string[]): string => {
    if (items.length === 1) {
      return `${items[0]}`;
    }

    if (items.length === 2) {
      return `${items[0]} and ${items[1]}`;
    }

    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  };

  console.error(
    `The Firebase configuration is missing. Please ensure that the following environment variables are set: ${formatList(items)}.`
  );
}

loadGitHubAccessToken();
*/

// Handle an action.

electronApi?.onAction((action: string) => {
  handleAction(action);
});

const handleAction = (action: string): void => {
  const isAction = (actionName: string, expectedActionName: string): boolean => {
    return actionName.localeCompare(expectedActionName, undefined, { sensitivity: 'base' }) === 0;
  };

  const index = action.indexOf('/');
  const actionName = index !== -1 ? action.substring(0, index) : action;
  const actionArguments = index !== -1 ? action.substring(index + 1) : '';

  if (isAction(actionName, 'openAboutDialog')) {
    onAboutMenu();
  } else if (isAction(actionName, 'openSettingsDialog')) {
    onSettingsMenu();
  } else {
    const filePaths = actionArguments.split('%7C');

    if (
      (isAction(actionName, 'openFile') && filePaths.length === 1) ||
      (isAction(actionName, 'openFiles') && filePaths.length > 1)
    ) {
      for (const filePath of filePaths) {
        openFile(filePath);
      }
    } else {
      addToast({
        severity: 'error',
        summary: 'Handling an action',
        detail: `${action}\n\nThe action could not be handled.`,
        life: TOAST_LIFE
      });
    }
  }
};

// Enable/disable some menu items.

const hasFiles = vue.computed<boolean>(() => {
  return contentsRef.value?.hasFiles() ?? false;
});

vue.watch(hasFiles, (newHasFiles: boolean) => {
  electronApi?.enableDisableFileCloseAndCloseAllMenuItems(newHasFiles);
});

// Auto update.

electronApi?.onCheckForUpdates(() => {
  electronApi?.checkForUpdates(false);
});

const updateErrorVisible = vue.ref<boolean>(false);
const updateErrorTitle = vue.ref<string>('');
const updateErrorIssue = vue.ref<string>('');

const onUpdateErrorDialogClose = (): void => {
  updateErrorVisible.value = false;
  updateDownloadProgressVisible.value = false;
};

const desktopUpdateAvailableVisible = vue.ref<boolean>(false);
const updateDownloadProgressVisible = vue.ref<boolean>(false);
const updateVersion = vue.ref<string>('');
const updateDownloadPercent = vue.ref<number>(0);

electronApi?.onUpdateAvailable((version: string) => {
  desktopUpdateAvailableVisible.value = true;
  updateVersion.value = version;
});

const onDownloadAndInstall = (): void => {
  updateDownloadPercent.value = 0; // Just to be on the safe side.
  updateDownloadProgressVisible.value = true;
  desktopUpdateAvailableVisible.value = false;

  electronApi?.downloadAndInstallUpdate();
};

electronApi?.onUpdateDownloadError((issue: string) => {
  updateErrorTitle.value = 'Downloading Update...';
  updateErrorIssue.value = `An error occurred while downloading the update (${common.formatMessage(issue, false)}).`;
  updateErrorVisible.value = true;
});

electronApi?.onUpdateDownloadProgress((percent: number) => {
  updateDownloadPercent.value = percent;
});

electronApi?.onUpdateDownloaded(() => {
  updateDownloadPercent.value = 100; // Just to be on the safe side.

  electronApi?.installUpdateAndRestart();
});

const updateNotAvailableVisible = vue.ref<boolean>(false);

electronApi?.onUpdateNotAvailable(() => {
  updateNotAvailableVisible.value = true;
});

electronApi?.onUpdateCheckError((issue: string) => {
  updateErrorTitle.value = 'Checking For Updates...';
  updateErrorIssue.value = `An error occurred while checking for updates (${common.formatMessage(issue, false)}).`;
  updateErrorVisible.value = true;
});

// Handle errors.

const onError = (message: string): void => {
  addToast({
    severity: 'error',
    summary: 'Error',
    detail: message,
    life: TOAST_LIFE
  });
};

// About dialog.

const aboutVisible = vue.ref<boolean>(false);

electronApi?.onAbout(() => {
  onAboutMenu();
});

const onAboutMenu = (): void => {
  if (props.omex) {
    return;
  }

  aboutVisible.value = true;
};

// Settings dialog.

const settingsVisible = vue.ref<boolean>(false);

electronApi?.onSettings(() => {
  onSettingsMenu();
});

const onSettingsMenu = (): void => {
  if (props.omex) {
    return;
  }

  settingsVisible.value = true;
};

// Update available dialog.

const webUpdateAvailableVisible = vue.ref(false);

const onUpdateAvailable = () => {
  webUpdateAvailableVisible.value = true;
};

// Open a file.

let globalOmexDataUrlCounter = 0;

const openFile = (fileFilePathOrFileContents: string | Uint8Array | File): void => {
  // Check whether we were passed a ZIP-CellML data URL.

  let cellmlDataUrlFileName: string = '';
  let omexDataUrlCounter: number = 0;

  locCommon.zipCellmlDataUrl(fileFilePathOrFileContents).then((zipCellmlDataUriInfo: locCommon.IDataUriInfo) => {
    if (zipCellmlDataUriInfo.res) {
      if (zipCellmlDataUriInfo.error) {
        addToast({
          severity: 'error',
          summary: 'Opening a file',
          detail: zipCellmlDataUriInfo.error,
          life: TOAST_LIFE
        });

        return;
      }

      cellmlDataUrlFileName = zipCellmlDataUriInfo.fileName as string;
      fileFilePathOrFileContents = zipCellmlDataUriInfo.data as Uint8Array;
    } else {
      // Check whether we were passed a COMBINE archive data URL.

      const combineArchiveDataUriInfo = locCommon.combineArchiveDataUrl(fileFilePathOrFileContents);

      if (combineArchiveDataUriInfo.res) {
        if (combineArchiveDataUriInfo.error) {
          addToast({
            severity: 'error',
            summary: 'Opening a file',
            detail: combineArchiveDataUriInfo.error,
            life: TOAST_LIFE
          });

          return;
        }

        omexDataUrlCounter = ++globalOmexDataUrlCounter;
        fileFilePathOrFileContents = combineArchiveDataUriInfo.data as Uint8Array;
      }
    }

    // Check whether the file is already open and if so then select it.

    const filePath = locCommon.filePath(fileFilePathOrFileContents, cellmlDataUrlFileName, omexDataUrlCounter);

    if (contentsRef.value?.hasFile(filePath) ?? false) {
      contentsRef.value?.selectFile(filePath);

      return;
    }

    // Retrieve a locApi.File object for the given file or file path and add it to the contents.

    const isRemoteFilePath = locCommon.isRemoteFilePath(filePath);

    if (isRemoteFilePath) {
      loadingModelMessageVisible.value = true;
    }

    locCommon
      .file(fileFilePathOrFileContents, cellmlDataUrlFileName, omexDataUrlCounter)
      .then((file) => {
        const fileType = file.type();

        if (
          fileType === locApi.EFileType.IRRETRIEVABLE_FILE ||
          fileType === locApi.EFileType.UNKNOWN_FILE ||
          fileType === locApi.EFileType.SEDML_FILE ||
          (props.omex && fileType !== locApi.EFileType.COMBINE_ARCHIVE)
        ) {
          if (props.omex) {
            vue.nextTick(() => {
              issues.value.push({
                type: locApi.EIssueType.ERROR,
                description:
                  fileType === locApi.EFileType.IRRETRIEVABLE_FILE
                    ? 'The file could not be retrieved.'
                    : 'Only COMBINE archives are supported.'
              });
            });
          } else {
            addToast({
              severity: 'error',
              summary: 'Opening a file',
              detail:
                filePath +
                '\n\n' +
                (fileType === locApi.EFileType.IRRETRIEVABLE_FILE
                  ? 'The file could not be retrieved.'
                  : fileType === locApi.EFileType.SEDML_FILE
                    ? 'SED-ML files are not currently supported.'
                    : 'Only CellML files and COMBINE archives are supported.'),
              life: TOAST_LIFE
            });
          }

          electronApi?.fileIssue(filePath);
        } else {
          contentsRef.value?.openFile(file);
        }
      })
      .catch((error: unknown) => {
        if (props.omex) {
          vue.nextTick(() => {
            issues.value.push({
              type: locApi.EIssueType.ERROR,
              description: common.formatMessage(common.formatError(error))
            });
          });
        } else {
          addToast({
            severity: 'error',
            summary: 'Opening a file',
            detail: `${filePath}\n\n${common.formatMessage(common.formatError(error))}`,
            life: TOAST_LIFE
          });
        }

        electronApi?.fileIssue(filePath);
      })
      .finally(() => {
        if (isRemoteFilePath) {
          loadingModelMessageVisible.value = false;
        }
      });
  });
};

// Open file(s) dialog.

const onChange = (event: Event): void => {
  // Open the selected file(s).

  const input = event.target as HTMLInputElement;

  if (input.files) {
    for (const file of input.files) {
      openFile(file);
    }
  }

  // Reset the input.
  // Note: this is needed to ensure that selecting the same file(s) again will trigger the change event.

  input.value = '';
};

// Drag and drop.

const dragAndDropCounter = vue.ref<number>(0);

const onDragEnter = (): void => {
  if (!compUiEnabled.value || props.omex) {
    return;
  }

  ++dragAndDropCounter.value;
};

const onDrop = (event: DragEvent): void => {
  if (!dragAndDropCounter.value) {
    return;
  }

  dragAndDropCounter.value = 0;

  const files = event.dataTransfer?.files;

  if (files) {
    for (const file of Array.from(files)) {
      openFile(file);
    }
  }
};

const onDragLeave = (): void => {
  if (!dragAndDropCounter.value) {
    return;
  }

  dragAndDropCounter.value -= 1;
};

// Open.

electronApi?.onOpen((filePath: string) => {
  openFile(filePath);
});

const onOpenMenu = (): void => {
  if (props.omex) {
    return;
  }

  filesRef.value?.click();
};

// Open remote.

const openRemoteVisible = vue.ref<boolean>(false);

electronApi?.onOpenRemote(() => {
  openRemoteVisible.value = true;
});

const onOpenRemoteMenu = (): void => {
  if (props.omex) {
    return;
  }

  openRemoteVisible.value = true;
};

const onOpenRemote = (url: string): void => {
  // Note: no matter whether this is OpenCOR or OpenCOR's Web app, we always retrieve the file contents of a remote
  //       file. We could, in OpenCOR, rely on libOpenCOR to retrieve it for us, but this would block the UI. To
  //       retrieve the file here means that it is done asynchronously, which in turn means that the UI is not blocked
  //       and that we can show a spinning wheel to indicate that something is happening.

  openFile(url);
};

// Open sample Lorenz.

electronApi?.onOpenSampleLorenz(() => {
  onOpenSampleLorenzMenu();
});

const onOpenSampleLorenzMenu = (): void => {
  if (props.omex) {
    return;
  }

  openFile('https://github.com/opencor/webapp/raw/refs/heads/main/tests/models/ui/lorenz.omex');
};

// Close.

electronApi?.onClose(() => {
  onCloseMenu();
});

const onCloseMenu = (): void => {
  if (props.omex) {
    return;
  }

  contentsRef.value?.closeCurrentFile();
};

// Close all.

electronApi?.onCloseAll(() => {
  onCloseAllMenu();
});

const onCloseAllMenu = (): void => {
  if (props.omex) {
    return;
  }

  contentsRef.value?.closeAllFiles();
};

// Reset all.

const resetAllVisible = vue.ref<boolean>(false);

electronApi?.onResetAll(() => {
  resetAllVisible.value = true;
});

const onResetAll = (): void => {
  electronApi?.resetAll();
};

// Select.

electronApi?.onSelect((filePath: string) => {
  contentsRef.value?.selectFile(filePath);
});

// A few things that can only be done when the component is mounted.

vue.onMounted(() => {
  const blockUiElement = (blockUiRef.value as unknown as { $el: HTMLElement })?.$el;

  // Make ourselves the active instance.

  setTimeout(() => {
    activateInstance();
  }, SHORT_DELAY);

  // Ensure that our toasts are shown within our block UI.

  setTimeout(() => {
    const toastElement = document.getElementById(toastId.value);

    if (toastElement && blockUiElement && toastElement.parentElement !== blockUiElement) {
      blockUiElement.appendChild(toastElement);
    }
  }, SHORT_DELAY);
});

// Track the height of our main menu.

let stopTrackingMainMenuHeight: (() => void) | null = null;

vue.onMounted(() => {
  if (!showMainMenu.value) {
    return;
  }

  void vue.nextTick(() => {
    const mainMenuElement = (mainMenuRef.value as unknown as { $el: HTMLElement })?.$el;
    const blockUiElement = (blockUiRef.value as unknown as { $el: HTMLElement })?.$el;

    if (mainMenuElement && blockUiElement) {
      stopTrackingMainMenuHeight = vueCommon.trackElementHeight(mainMenuElement, blockUiElement, '--main-menu-height');
    }
  });
});

vue.onBeforeUnmount(() => {
  if (stopTrackingMainMenuHeight) {
    stopTrackingMainMenuHeight();

    stopTrackingMainMenuHeight = null;
  }
});

// If a COMBINE archive is provided then open it (and then the Simulation Experiment view will be shown in isolation) or
// carry on as normal (i.e. the whole OpenCOR UI will be shown).

if (props.omex) {
  vue.watch(initialisingOpencorMessageVisible, (newInitialisingOpencorMessageVisible: boolean) => {
    if (!newInitialisingOpencorMessageVisible && props.omex) {
      openFile(props.omex);
    }
  });
} else {
  // A few additional things that can only be done when the component is mounted.

  vue.onMounted(() => {
    // Do what follows with a bit of a delay to give our background (with the OpenCOR logo) time to be renderered.

    setTimeout(() => {
      if (electronApi) {
        // Check for updates.
        // Note: the main process will actually check for updates if requested and if OpenCOR is packaged.

        electronApi.checkForUpdates(true);
      } else {
        // Handle the action passed to our Web app, if any.
        // Note: to use vue.nextTick() doesn't do the trick, so we have no choice but to use setTimeout().

        vue.watch(initialisingOpencorMessageVisible, (newInitialisingOpencorMessageVisible: boolean) => {
          if (!newInitialisingOpencorMessageVisible) {
            const action = vueusecore.useStorage('action', '');

            if (window.location.search) {
              // Retrieve the action from the URL.

              action.value = window.location.search.substring(1);

              if (window.location.hash) {
                action.value += window.location.hash;
              }

              // Ensure that the URL is cleaned up.

              window.history.replaceState({}, document.title, window.location.pathname);

              // Force a reload to complete the two-phase action handling:
              //  1) On the first load, we extract the action from the URL and store it in localStorage.
              //  2) After we have reloaded (with a clean URL), the `else if (action.value)` branch below reads and
              //     processes the stored action.

              window.location.reload();
            } else if (action.value) {
              setTimeout(() => {
                if (action.value.startsWith(FULL_URI_SCHEME)) {
                  handleAction(action.value.slice(FULL_URI_SCHEME.length));
                } else {
                  addToast({
                    severity: 'error',
                    summary: 'Handling an action',
                    detail: `${action.value}\n\nThe action could not be handled.`,
                    life: TOAST_LIFE
                  });
                }

                action.value = '';
              }, SHORT_DELAY);
            }
          }
        });
      }
    }, SHORT_DELAY);
  });
}

/* TODO: enable once our GitHub integration is fully ready.
// GitHub integration.

const disconnectFromGitHubVisible = vue.ref<boolean>(false);

const deleteGitHubAccessToken = async (silent: boolean = false): Promise<void> => {
  if (!electronApi) {
    return;
  }

  try {
    await electronApi.deleteGitHubAccessToken();
  } catch (error: unknown) {
    if (silent) {
      console.warn('Failed to remove the stored GitHub access token:', common.formatError(error));
    } else {
      toast.add({
        severity: 'warn',
        group: toastId.value,
        summary: 'Removing GitHub access token',
        detail: common.formatMessage(common.formatError(error)),
        life: TOAST_LIFE
      });
    }
  }
};

const loadGitHubAccessToken = async (): Promise<void> => {
  if (!electronApi || props.omex || !firebaseConfig) {
    return;
  }

  let gitHubAccessToken: string | null;

  try {
    gitHubAccessToken = await electronApi.loadGitHubAccessToken();
  } catch (error: unknown) {
    console.warn('Failed to load the GitHub access token:', common.formatError(error));

    return;
  }

  if (!gitHubAccessToken) {
    return;
  }

  connectingToGitHub.value = true;

  try {
    await checkGitHubAccessToken(gitHubAccessToken);
  } catch (error: unknown) {
    console.warn('Stored GitHub access token is no longer valid. Clearing it.', common.formatError(error));

    await deleteGitHubAccessToken(true);
  } finally {
    connectingToGitHub.value = false;
  }
};

const saveGitHubAccessToken = async (accessToken: string): Promise<void> => {
  if (!electronApi) {
    return;
  }

  try {
    const stored = await electronApi.saveGitHubAccessToken(accessToken);

    if (!stored) {
      addToast({
        severity: 'warn',
        summary: 'Remembering GitHub access token',
        detail: 'The token could not be stored securely, so you will need to sign in again next time.',
        life: TOAST_LIFE
      });
    }
  } catch (error: unknown) {
    addToast({
      severity: 'warn',
      summary: 'Remembering GitHub access token',
      detail: common.formatMessage(common.formatError(error)),
      life: TOAST_LIFE
    });
  }
};

const checkGitHubAccessToken = async (accessToken: string): Promise<void> => {
  const client = new Octokit({ auth: accessToken });
  const user = await client.rest.users.getAuthenticated();

  octokit.value = client;

  if (electronApi) {
    await saveGitHubAccessToken(accessToken);
  }

  try {
    const reposResponse = await client.rest.repos.listForAuthenticatedUser({ affiliation: 'owner' });

    console.log(`Repositories for user ${user.data.login}:`);

    for (const repo of reposResponse.data) {
      console.log(`- ${repo.name} (${repo.private ? 'private' : 'public'}): ${repo.html_url}`);
    }
  } catch (error: unknown) {
    console.warn(`Failed to retrieve repositories for user ${user.data.login}:`, common.formatError(error));
  }
};

const onDisconnectFromGitHub = async (): Promise<void> => {
  try {
    await firebase.auth().signOut();

    octokit.value = null;

    await deleteGitHubAccessToken();

    if (electronApi) {
      await electronApi.clearGitHubCache();
    }
  } catch (error: unknown) {
    addToast({
      severity: 'error',
      summary: 'GitHub sign-out',
      detail: common.formatMessage(common.formatError(error)),
      life: TOAST_LIFE
    });
  } finally {
    disconnectFromGitHubVisible.value = false;
  }
};

const onGitHubButtonClick = async (): Promise<void> => {
  if (octokit.value) {
    disconnectFromGitHubVisible.value = true;

    return;
  }

  connectingToGitHub.value = true;

  try {
    // Note: the signing with popup will generate some messages in the console:
    //         Cross-Origin-Opener-Policy policy would block the window.closed call.
    //       Apparently, there is no way to avoid these messages (see
    //       https://reddit.com/r/Firebase/comments/146zcld/crossoriginopenerpolicy_policy_would_block_the/ for
    //       instance).

    const gitHubAuthProvider = new firebase.auth.GithubAuthProvider();

    gitHubAuthProvider.addScope('repo');

    const result = await firebase.auth().signInWithPopup(gitHubAuthProvider);
    const credential = result.credential as firebase.auth.OAuthCredential | null;

    if (!credential?.accessToken) {
      throw new Error('GitHub OAuth flow did not return an access token.');
    }

    const accessToken = credential.accessToken;

    await checkGitHubAccessToken(accessToken);
  } catch (error: unknown) {
    addToast({
      severity: 'error',
      summary: 'GitHub sign-in',
      detail: common.formatMessage(common.formatError(error)),
      life: TOAST_LIFE
    });
  } finally {
    connectingToGitHub.value = false;
  }
}
*/
</script>

<style scoped>
.connected-to-github,
:deep(.connected-to-github .pi-github) {
  background-color: var(--p-green-100);
  border-color: var(--p-green-100);
  color: var(--p-green-600);
}

.connected-to-github:hover,
:deep(.connected-to-github:hover .pi-github) {
  background-color: var(--p-green-200) !important;
  border-color: var(--p-green-200) !important;
  color: var(--p-green-700);
}

.disconnected-from-github,
:deep(.disconnected-from-github .pi-github) {
  background-color: var(--p-red-100);
  border-color: var(--p-red-100);
  color: var(--p-red-600);
}

.disconnected-from-github:hover,
:deep(.disconnected-from-github:hover .pi-github) {
  background-color: var(--p-red-200) !important;
  border-color: var(--p-red-200) !important;
  color: var(--p-red-700);
}

@media (prefers-color-scheme: dark) {
  .connected-to-github,
  :deep(.connected-to-github .pi-github) {
    background-color: var(--p-green-800);
    border-color: var(--p-green-800);
    color: var(--p-green-300);
  }

  .connected-to-github:hover,
  :deep(.connected-to-github:hover .pi-github) {
    background-color: var(--p-green-700) !important;
    border-color: var(--p-green-700) !important;
    color: var(--p-green-200);
  }

  .disconnected-from-github,
  :deep(.disconnected-from-github .pi-github) {
    background-color: var(--p-red-800);
    border-color: var(--p-red-800);
    color: var(--p-red-300);
  }

  .disconnected-from-github:hover,
  :deep(.disconnected-from-github:hover .pi-github) {
    background-color: var(--p-red-700) !important;
    border-color: var(--p-red-700) !important;
    color: var(--p-red-200);
  }
}

:deep(.p-overlay-mask) {
  border-radius: 0;
}

.with-main-menu {
  :deep(.p-dialog-mask) {
    padding-top: var(--main-menu-height) !important;
  }

  :deep(.p-message) {
    margin-top: calc(0.5 * var(--main-menu-height)) !important;
  }
}
</style>
