<template>
  <button class="toolbar-button relative flex items-center justify-center shrink-0 rounded-md cursor-pointer"
    :class="[
      props.small ? 'toolbar-button-small w-6 h-6' : 'w-8 h-8',
      props.accent ? `toolbar-button-${props.accent}` : '',
      {
        'toolbar-button-tooltip-end': props.tooltipAlign === 'end',
        'toolbar-button-tooltip-suppressed': tooltipSuppressed,
        'toolbar-button-tooltip-feedback': props.feedback
      }
    ]"
    type="button"
    :disabled="props.disabled"
    @mousedown.prevent="tooltipSuppressed = true"
    @mouseleave="tooltipSuppressed = false"
  >
    <i :class="props.icon" class="toolbar-button-icon" />
    <span v-if="props.label" class="toolbar-button-tooltip absolute flex items-center gap-2 px-2 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none">
      {{ props.label }}
      <kbd v-if="props.shortcut" class="toolbar-button-shortcut font-sans">{{ props.shortcut }}</kbd>
    </span>
  </button>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type { IToolbarButtonProps } from '../../common/vueCommon';

// A toolbar button, which shows an icon and, when hovered or focused using the keyboard, a tooltip with the button's
// label and, if any, keyboard shortcut.
// Note #1: a button with no label has no tooltip, which is useful for placeholder buttons (i.e. invisible buttons that
//          are only used to align the contents of a toolbar).
// Note #2: a small button is meant for places where space is tight, e.g. our main menu (see ThemeWidget.vue).
// Note #3: a tooltip is aligned with the start of its button, unless the button is in the end part of a toolbar or of
//          our main menu, or unless it is explicitly aligned with the end of its button (e.g., for a button that is on
//          the right edge of a dialog, see AboutDialog.vue).
// Note #4: a button doesn't get the focus when it is clicked (it still can using the keyboard). Otherwise, a dialog
//          opened by clicking the button would give the focus back to the button when closed, and the browser may then
//          consider that the button has the keyboard focus, making it look highlighted (i.e. with a focus ring and its
//          tooltip shown).
// Note #5: a button's tooltip is hidden once the button has been pressed, until the mouse leaves the button, so that it
//          doesn't get in the way of what the button may have shown (e.g., a popover). However, a button can give some
//          feedback using its tooltip (e.g., "Copied" for a button that copies something, see useCopyToClipboard() in
//          vueCommon.ts), in which case its tooltip is shown straightaway while the button is hovered.

const props = defineProps<IToolbarButtonProps>();

const tooltipSuppressed = vue.ref<boolean>(false);
</script>

<style scoped>
.toolbar-button {
  --toolbar-button-color: var(--p-text-muted-color);
  --toolbar-button-hover-color: var(--p-text-color);

  border: none;
  background-color: transparent;
  color: var(--toolbar-button-color);
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease;
}

.toolbar-button-primary {
  --toolbar-button-color: var(--p-primary-color);
  --toolbar-button-hover-color: var(--p-primary-color);
}

.toolbar-button-warning {
  --toolbar-button-color: var(--p-orange-500);
  --toolbar-button-hover-color: var(--p-orange-500);
}

.toolbar-button-danger {
  --toolbar-button-color: var(--p-red-500);
  --toolbar-button-hover-color: var(--p-red-500);
}

.toolbar-button-icon {
  font-size: 1.125rem;
}

.toolbar-button-small .toolbar-button-icon {
  font-size: 0.875rem;
}

.toolbar-button:not(:disabled):hover {
  background-color: var(--p-content-hover-background);
  color: var(--toolbar-button-hover-color);
}

.toolbar-button-primary:not(:disabled):hover,
.toolbar-button-warning:not(:disabled):hover,
.toolbar-button-danger:not(:disabled):hover {
  background-color: color-mix(in srgb, var(--toolbar-button-color) 12%, transparent);
}

.toolbar-button:not(:disabled):active {
  transform: scale(0.92);
}

.toolbar-button:focus-visible {
  box-shadow: 0 0 0 2px var(--p-primary-color);
}

/**
 * Note: we only fade the icon of a disabled button since fading the button itself would also fade its tooltip.
 */

.toolbar-button:disabled {
  color: var(--p-text-muted-color);
  cursor: default;
}

.toolbar-button:disabled .toolbar-button-icon {
  opacity: 0.4;
}

/**
 * Tooltip, which is shown below the button, without any animation, after a short delay when the button is hovered, and
 * straightaway when the button is focused using the keyboard. It is left-aligned with the button, except in the end
 * part of a toolbar or of our main menu where it is right-aligned, so that it never gets clipped by the edges of the
 * view.
 */

.toolbar-button-tooltip {
  top: calc(100% + 0.375rem);
  left: 0;
  z-index: 1000;
  border: 1px solid var(--opencor-hint-border-color);
  background-color: var(--opencor-hint-background);
  box-shadow: var(--opencor-hint-shadow);
  color: var(--opencor-hint-color);
  font-weight: 500;
  visibility: hidden;
}

.p-toolbar-end .toolbar-button-tooltip,
.p-menubar-end .toolbar-button-tooltip,
.toolbar-button-tooltip-end .toolbar-button-tooltip {
  right: 0;
  left: auto;
}

.toolbar-button:hover .toolbar-button-tooltip {
  visibility: visible;
  transition: visibility 0s 0.5s;
}

.toolbar-button:focus-visible .toolbar-button-tooltip {
  visibility: visible;
  transition: none;
}

.toolbar-button:active .toolbar-button-tooltip,
.toolbar-button.toolbar-button-tooltip-suppressed .toolbar-button-tooltip {
  visibility: hidden;
  transition: none;
}

.toolbar-button.toolbar-button-tooltip-feedback:hover .toolbar-button-tooltip {
  visibility: visible;
  transition: none;
}

.toolbar-button-shortcut {
  color: var(--p-surface-400);
  font-size: inherit;
}
</style>
