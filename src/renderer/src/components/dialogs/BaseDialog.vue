<template>
  <Dialog :modal="true" appendTo="self"
    :pt:mask:style="{
      position: 'absolute'
    }"
    :pt:content="{
      class: 'h-full',
      style: 'padding-bottom: 0'
    }"
    :pt:footer="{
      style: 'padding-top: 1.25rem'
    }"
    @show="onShow"
    @hide="onHide"
  >
    <template v-for="(_event, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import { enableDisableMainMenu } from '../../common/common.ts';

const emit = defineEmits<(event: 'cancel') => void>();

const { incrementDialogs, decrementDialogs } = useDialogState();

let dialogElement: HTMLElement | null = null;
let containerElement: HTMLElement | null | undefined = null;
let mutationObserver: MutationObserver | null = null;

const checkDialogPosition = () => {
  if (dialogElement instanceof HTMLElement && containerElement instanceof HTMLElement) {
    const dialogRect = dialogElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();

    dialogElement.style.top = `${String(Math.max(Math.min(dialogRect.top, containerRect.bottom - dialogRect.height), containerRect.top))}px`;
    dialogElement.style.left = `${String(Math.max(Math.min(dialogRect.left, containerRect.right - dialogRect.width), containerRect.left))}px`;
  }
};

const onShow = () => {
  incrementDialogs();

  enableDisableMainMenu(false);

  void vue.nextTick(() => {
    dialogElement = document.querySelector('.p-dialog');
    containerElement = dialogElement?.closest('[data-pc-section="mask"]');

    if (dialogElement && containerElement) {
      mutationObserver = new MutationObserver(() => {
        checkDialogPosition();
      });

      mutationObserver.observe(dialogElement, { attributes: true, attributeFilter: ['style'] });

      checkDialogPosition();
    }
  });
};

const onHide = () => {
  decrementDialogs();

  enableDisableMainMenu(true);

  emit('cancel');

  void vue.nextTick(() => {
    if (mutationObserver) {
      mutationObserver.disconnect();

      mutationObserver = null;
    }
  });
};
</script>

<script lang="ts">
// Dialog state management for tracking active dialogs in a given instance of OpenCOR.
// Note: this uses Vue's provide()/inject() methods to ensure that each OpenCOR instance has its own dialog state.

const DialogStateKey = Symbol('DialogState');

interface IDialogState {
  activeDialogs: vue.Ref<number>;
  isDialogActive: vue.ComputedRef<boolean>;
  incrementDialogs: () => void;
  decrementDialogs: () => void;
}

export const provideDialogState = (): IDialogState => {
  const activeDialogs = vue.ref(0);
  const isDialogActive = vue.computed(() => activeDialogs.value > 0);

  const incrementDialogs = () => {
    ++activeDialogs.value;
  };

  const decrementDialogs = () => {
    --activeDialogs.value;
  };

  const state: IDialogState = {
    activeDialogs,
    isDialogActive,
    incrementDialogs,
    decrementDialogs
  };

  vue.provide(DialogStateKey, state);

  return state;
};

export const useDialogState = (): IDialogState => {
  const state = vue.inject<IDialogState>(DialogStateKey);

  if (!state) {
    throw new Error('useDialogState() must be called within a component that has provideDialogState in its ancestor tree.');
  }

  return state;
}
</script>
