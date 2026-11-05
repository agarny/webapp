<template>
  <BaseDialog :header="title" class="w-120">
    <div class="message-dialog" :class="`message-dialog-${severity}`">
      <span class="message-dialog-icon">
        <i :class="ICONS[severity]" />
      </span>
      <div class="message-dialog-text" v-html="question"></div>
    </div>
    <template #footer>
      <Button autofocus :label="yesLabel" :severity="severity" @click="$emit('yes')" />
      <Button :label="noLabel" severity="secondary" @click="$emit('no')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import './message-dialog.css';

type Severity = 'danger' | 'warning' | 'info';

// Note: our buttons should preferably be labelled with what they do (e.g., "Reset All" and "Cancel") rather than with
//       "Yes" and "No", so that the user doesn't have to read our question to know what they do.

withDefaults(
  defineProps<{
    title: string;
    question: string;
    severity?: Severity;
    yesLabel?: string;
    noLabel?: string;
  }>(),
  {
    severity: 'warning',
    yesLabel: 'Yes',
    noLabel: 'No'
  }
);

defineEmits<{
  yes: [];
  no: [];
}>();

const ICONS: Record<Severity, string> = {
  danger: 'pi pi-exclamation-triangle',
  warning: 'pi pi-exclamation-triangle',
  info: 'pi pi-question-circle'
};
</script>
