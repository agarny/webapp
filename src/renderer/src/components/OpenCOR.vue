<template>
  <BlockUI ref="blockUi" class="opencor overflow-hidden h-full"
    :blocked="compBlockUiEnabled"
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
    <BlockingMessageComponent v-show="loadingOpencorMessageVisible" message="Loading OpenCOR..." />
    <BlockingMessageComponent v-show="loadingModelMessageVisible" message="Loading model..." />
    <BlockingMessageComponent v-show="progressMessageVisible" :message="progressMessageMessage" :progress="progressMessageProgress" />
    <IssuesView v-if="issues.length" class="m-4" style="height: calc(100% - 2rem);" :issues="issues" />
    <div v-else class="h-full flex flex-col"
      @dragenter="onDragEnter"
      @dragover.prevent
      @drop.prevent="onDrop"
      @dragleave="onDragLeave"
    >
      <input ref="files" type="file" multiple style="display: none;" @change="onChange" />
      <DragNDropComponent v-show="dragAndDropCounter" />
      <MainMenu :id="mainMenuId" v-if="!electronApi && !omex"
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
      <ContentsComponent ref="contents" class="grow min-h-0"
        :isActive="compIsActive"
        :uiEnabled="compUiEnabled"
        :simulationOnly="!!omex"
        @error="onError"
      />
      <OpenRemoteDialog
        v-model:visible="openRemoteVisible"
        @openRemote="onOpenRemote"
        @close="openRemoteVisible = false"
      />
      <SettingsDialog v-model:visible="settingsVisible" @close="settingsVisible = false" />
      <YesNoQuestionDialog
        v-model:visible="resetAllVisible"
        title="Reset All..."
        question="You are about to reset all of your settings. Do you want to proceed?"
        severity="danger"
        @yes="onResetAll"
        @no="resetAllVisible = false"
      />
      <AboutDialog
        v-model:visible="aboutVisible"
        @close="aboutVisible = false"
      />
    </div>
    <OkMessageDialog
      v-model:visible="updateErrorVisible"
      :title="updateErrorTitle"
      :message="updateErrorIssue"
      @ok="onUpdateErrorDialogClose"
    />
    <YesNoQuestionDialog
      v-model:visible="updateAvailableVisible"
      title="Check for Updates..."
      :question="'Version ' + updateVersion + ' is available. Do you want to download it and install it?'"
      @yes="onDownloadAndInstall"
      @no="updateAvailableVisible = false"
    />
    <UpdateDownloadProgressDialog v-model:visible="updateDownloadProgressVisible" :percent="updateDownloadPercent" />
    <OkMessageDialog
      v-model:visible="updateNotAvailableVisible"
      title="Check for Updates..."
      message="No updates are available at this time."
      @ok="updateNotAvailableVisible = false"
    />
  </BlockUI>
</template>

<script setup lang="ts">
import primeVueAuraTheme from '@primeuix/themes/aura';
import * as vueusecore from '@vueuse/core';

/* TODO: enable once our GitHub integration is fully ready.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { Octokit } from 'octokit';
*/
import primeVueConfig from 'primevue/config';
import primeVueConfirmationService from 'primevue/confirmationservice';
import primeVueToastService from 'primevue/toastservice';
import { useToast } from 'primevue/usetoast';
import * as vue from 'vue';
import vueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css';

import type { IOpenCORProps } from '../../index.ts';

import '../assets/app.css';
import * as common from '../common/common.ts';
import { FULL_URI_SCHEME, SHORT_DELAY, TOAST_LIFE } from '../common/constants.ts';
import { electronApi } from '../common/electronApi.ts';
/* TODO: enable once our GitHub integration is fully ready.
import firebaseConfig, { missingFirebaseKeys } from '../common/firebaseConfig';
*/
import * as locCommon from '../common/locCommon.ts';
import * as version from '../common/version.ts';
import * as vueCommon from '../common/vueCommon.ts';
import type IContentsComponent from '../components/ContentsComponent.vue';
import * as locApi from '../libopencor/locApi.ts';

import { provideDialogState } from './dialogs/BaseDialog.vue';

const props = defineProps<IOpenCORProps>();

const { isDialogActive } = provideDialogState();

const blockUi = vue.ref<vue.ComponentPublicInstance | null>(null);
const toastId = vue.ref('opencorToast');
const mainMenuId = vue.ref('opencorMainMenu');
const files = vue.ref<HTMLElement | null>(null);
const contents = vue.ref<InstanceType<typeof IContentsComponent> | null>(null);
const issues = vue.ref<locApi.IIssue[]>([]);
const activeInstanceUid = vueCommon.activeInstanceUid();
const connectingToGitHub = vue.ref<boolean>(false);
/* TODO: enable once our GitHub integration is fully ready.
const octokit = vue.ref<Octokit | null>(null);
*/

// Keep track of which instance of OpenCOR is currently active.

const activateInstance = (): void => {
  activeInstanceUid.value = String(crtInstance?.uid);
};

const compIsActive = vue.computed(() => {
  return activeInstanceUid.value === String(crtInstance?.uid);
});

// Determine whether the component UI should be blocked/enabled.
// Note: compBlockUiEnabled is used to determine whether PrimeVue's BlockUI component should be enabled, whereas
//       compUiEnabled is used to determine whether the UI should be enabled (it checks whether various dialogs are
//       visible since those dialogs block the UI).

const compBlockUiEnabled = vue.computed(() => {
  return (
    !electronUiEnabled.value ||
    loadingOpencorMessageVisible.value ||
    loadingModelMessageVisible.value ||
    progressMessageVisible.value ||
    connectingToGitHub.value
  );
});

const compUiEnabled = vue.computed(() => {
  return !compBlockUiEnabled.value && !isDialogActive.value;
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

vue.provide('progressMessage', {
  show,
  update,
  hide
});

const progressMessageVisible = vue.ref<boolean>(false);
const progressMessageMessage = vue.ref<string>('');
const progressMessageProgress = vue.ref<number>(0);

// Get the current Vue app instance to use some PrimeVue plugins and VueTippy.

const crtInstance = vue.getCurrentInstance();

if (crtInstance) {
  const app = crtInstance.appContext.app;

  if (!app.config.globalProperties.$primevue) {
    app.use(primeVueConfig as unknown as vue.Plugin, {
      theme: {
        preset: primeVueAuraTheme,
        options: {
          darkModeSelector: '.opencor-dark-mode'
        }
      }
    });
  }

  if (!app.config.globalProperties.$confirm) {
    app.use(primeVueConfirmationService as unknown as vue.Plugin);
  }

  if (!app.config.globalProperties.$toast) {
    app.use(primeVueToastService as unknown as vue.Plugin);
  }

  app.use(vueTippy);
}

vueCommon.useTheme().setTheme(props.theme);

const toast = useToast();

// Asynchronously initialise our libOpenCOR API.
// Note: we show the "Loading OpenCOR..." message only if window.locApi is not defined, which means that we are running
//       OpenCOR's Web app.

const locApiInitialised = vue.ref(false);
const compBackgroundVisible = vue.computed(() => {
  return (
    (loadingOpencorMessageVisible.value || loadingModelMessageVisible.value || progressMessageVisible.value) &&
    !!props.omex
  );
});
const loadingOpencorMessageVisible = vue.ref<boolean>(false);
const loadingModelMessageVisible = vue.ref<boolean>(false);

// @ts-expect-error (window.locApi may or may not be defined which is why we test it)
if (!window.locApi) {
  loadingOpencorMessageVisible.value = true;

  vue.watch(locApiInitialised, (newLocApiInitialised: boolean) => {
    if (newLocApiInitialised) {
      loadingOpencorMessageVisible.value = false;

      // We are now officially loaded, so start checking for a newer version of OpenCOR.

      version.startCheck();
    }
  });
}

void locApi.initialiseLocApi().then(() => {
  locApiInitialised.value = true;
});

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
      toast.add({
        severity: 'error',
        group: toastId.value,
        summary: 'Handling an action',
        detail: `${action}\n\nThe action could not be handled.`,
        life: TOAST_LIFE
      });
    }
  }
};

// Enable/disable the UI from Electron.

const electronUiEnabled = vue.ref<boolean>(true);

electronApi?.onEnableDisableUi((enable: boolean) => {
  electronUiEnabled.value = enable;
});

// Enable/disable some menu items.

const hasFiles = vue.computed(() => {
  return contents.value?.hasFiles() ?? false;
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

const updateAvailableVisible = vue.ref<boolean>(false);
const updateDownloadProgressVisible = vue.ref<boolean>(false);
const updateVersion = vue.ref<string>('');
const updateDownloadPercent = vue.ref<number>(0);

electronApi?.onUpdateAvailable((version: string) => {
  updateAvailableVisible.value = true;
  updateVersion.value = version;
});

const onDownloadAndInstall = (): void => {
  updateDownloadPercent.value = 0; // Just to be on the safe side.
  updateDownloadProgressVisible.value = true;
  updateAvailableVisible.value = false;

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
  toast.add({
    severity: 'error',
    group: toastId.value,
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

// Open a file.

let globalOmexDataUrlCounter = 0;

const openFile = (fileFilePathOrFileContents: string | Uint8Array | File): void => {
  // Check whether we were passed a ZIP-CellML data URL.

  let cellmlDataUrlFileName: string = '';
  let omexDataUrlCounter: number = 0;

  locCommon.zipCellmlDataUrl(fileFilePathOrFileContents).then((zipCellmlDataUriInfo: locCommon.IDataUriInfo) => {
    if (zipCellmlDataUriInfo.res) {
      if (zipCellmlDataUriInfo.error) {
        toast.add({
          severity: 'error',
          group: toastId.value,
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
          toast.add({
            severity: 'error',
            group: toastId.value,
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

    if (contents.value?.hasFile(filePath) ?? false) {
      contents.value?.selectFile(filePath);

      return;
    }

    // Retrieve a locApi.File object for the given file or file path and add it to the contents.

    if (locCommon.isRemoteFilePath(filePath)) {
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
            void vue.nextTick(() => {
              issues.value.push({
                type: locApi.EIssueType.ERROR,
                description:
                  fileType === locApi.EFileType.IRRETRIEVABLE_FILE
                    ? 'The file could not be retrieved.'
                    : 'Only COMBINE archives are supported.'
              });
            });
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
                  : fileType === locApi.EFileType.SEDML_FILE
                    ? 'SED-ML files are not currently supported.'
                    : 'Only CellML files and COMBINE archives are supported.'),
              life: TOAST_LIFE
            });
          }

          electronApi?.fileIssue(filePath);
        } else {
          contents.value?.openFile(file);
        }

        if (locCommon.isRemoteFilePath(filePath)) {
          loadingModelMessageVisible.value = false;
        }
      })
      .catch((error: unknown) => {
        if (locCommon.isRemoteFilePath(filePath)) {
          loadingModelMessageVisible.value = false;
        }

        if (props.omex) {
          void vue.nextTick(() => {
            issues.value.push({
              type: locApi.EIssueType.ERROR,
              description: common.formatMessage(common.formatError(error))
            });
          });
        } else {
          toast.add({
            severity: 'error',
            group: toastId.value,
            summary: 'Opening a file',
            detail: `${filePath}\n\n${common.formatMessage(common.formatError(error))}`,
            life: TOAST_LIFE
          });
        }

        electronApi?.fileIssue(filePath);
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

  dragAndDropCounter.value += 1;
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

  files.value?.click();
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

  contents.value?.closeCurrentFile();
};

// Close all.

electronApi?.onCloseAll(() => {
  onCloseAllMenu();
});

const onCloseAllMenu = (): void => {
  if (props.omex) {
    return;
  }

  contents.value?.closeAllFiles();
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
  contents.value?.selectFile(filePath);
});

// A few things that can only be done when the component is mounted.

vue.onMounted(() => {
  const blockUiElement = blockUi.value?.$el as HTMLElement;

  // Customise our IDs.

  toastId.value = `opencorToast${String(crtInstance?.uid)}`;
  mainMenuId.value = `opencorMainMenu${String(crtInstance?.uid)}`;

  // Make ourselves the active instance.

  setTimeout(() => {
    activateInstance();
  }, SHORT_DELAY);

  // Ensure that our toasts are shown within our block UI.

  setTimeout(() => {
    const toastElement = document.getElementById(toastId.value);

    if (toastElement) {
      blockUiElement.appendChild(toastElement);
    }
  }, SHORT_DELAY);
});

// If a COMBINE archive is provided then open it (and then the Simulation Experiment view will be shown in isolation) or
// carry on as normal (i.e. the whole OpenCOR UI will be shown).

if (props.omex) {
  vue.watch(locApiInitialised, (newLocApiInitialised: boolean) => {
    if (newLocApiInitialised && props.omex) {
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

        vue.watch(locApiInitialised, (newLocApiInitialised: boolean) => {
          if (newLocApiInitialised) {
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
                if (!action.value.startsWith(FULL_URI_SCHEME)) {
                  toast.add({
                    severity: 'error',
                    group: toastId.value,
                    summary: 'Handling an action',
                    detail: `${action.value}\n\nThe action could not be handled.`,
                    life: TOAST_LIFE
                  });

                  action.value = '';

                  return;
                }

                handleAction(action.value.slice(FULL_URI_SCHEME.length));

                action.value = '';
              }, SHORT_DELAY);
            }
          }
        });
      }
    }, SHORT_DELAY);
  });
}

// Ensure that our BlockUI mask is removed when the UI is enabled.
// Note: this is a workaround for a PrimeVue BlockUI issue when handling an action passed to our Web app.

vue.watch(compBlockUiEnabled, (newCompBlockUiEnabled: boolean) => {
  if (!newCompBlockUiEnabled) {
    setTimeout(() => {
      const blockUiElement = blockUi.value?.$el as HTMLElement;
      const maskElement = blockUiElement.querySelector('.p-blockui-mask');

      if (maskElement && maskElement.parentElement === blockUiElement) {
        blockUiElement.removeChild(maskElement);
      }
    }, SHORT_DELAY);
  }
});

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
      console.warn('Failed to remove the stored GitHub access token:', error);
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

/* TODO: enable once our GitHub integration is fully ready.
const loadGitHubAccessToken = async (): Promise<void> => {
  if (!electronApi || props.omex || !firebaseConfig) {
    return;
  }

  let gitHubAccessToken: string | null;

  try {
    gitHubAccessToken = await electronApi.loadGitHubAccessToken();
  } catch (error: unknown) {
    console.warn('Failed to load the GitHub access token:', error);

    return;
  }

  if (!gitHubAccessToken) {
    return;
  }

  connectingToGitHub.value = true;

  try {
    await checkGitHubAccessToken(gitHubAccessToken);
  } catch (error: unknown) {
    console.warn('Stored GitHub access token is no longer valid. Clearing it.', error);

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
      toast.add({
        severity: 'warn',
        group: toastId.value,
        summary: 'Remembering GitHub access token',
        detail: 'The token could not be stored securely, so you will need to sign in again next time.',
        life: TOAST_LIFE
      });
    }
  } catch (error: unknown) {
    toast.add({
      severity: 'warn',
      group: toastId.value,
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
    console.warn(`Failed to retrieve repositories for user ${user.data.login}:`, error);
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
    toast.add({
      severity: 'error',
      group: toastId.value,
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
    toast.add({
      severity: 'error',
      group: toastId.value,
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
</style>
