<template>
  <BaseDialog :header="title" class="w-120">
    <div class="message-dialog" :class="`message-dialog-${severity}`">
      <span class="message-dialog-icon">
        <i :class="ICONS[severity]" />
      </span>
      <div class="message-dialog-text" v-html="question"></div>
    </div>
    <template #footer>
      <Button :autofocus="severity !== 'danger'"
        :label="yesLabel"
        :severity="severity === 'danger' ? 'danger' : undefined"
        @click="$emit('yes')"
      />
      <Button :label="noLabel" severity="secondary" @click="$emit('no')" />
      <Button :autofocus="severity === 'danger'"
        :label="cancelLabel"
        severity="secondary"
        @click="$emit('cancel')"
      />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import './message-dialog.css';

type Severity = 'danger' | 'warning' | 'info';

// Note: same as for YesNoQuestionDialog.vue when it comes to the labels of our buttons, the colour of our yes button,
//       and which button has the focus by default, except that it is our cancel button (rather than our no button)
//       that has the focus by default if our question is about something dangerous, since it is the safest option.

withDefaults(
  defineProps<{
    title: string;
    question: string;
    severity?: Severity;
    yesLabel?: string;
    noLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    severity: 'warning',
    yesLabel: 'Yes',
    noLabel: 'No',
    cancelLabel: 'Cancel'
  }
);

defineEmits<{
  yes: [];
  no: [];
  cancel: [];
}>();

const ICONS: Record<Severity, string> = {
  danger: 'pi pi-exclamation-triangle',
  warning: 'pi pi-exclamation-triangle',
  info: 'pi pi-question-circle'
};
</script>
