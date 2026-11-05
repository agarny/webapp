<template>
  <BaseDialog :header="title" class="w-120">
    <div class="message-dialog" :class="`message-dialog-${severity}`">
      <span class="message-dialog-icon">
        <i :class="ICONS[severity]" />
      </span>
      <div class="message-dialog-text" v-html="message"></div>
    </div>
    <template #footer>
      <Button autofocus label="OK" @click="$emit('ok')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import './message-dialog.css';

type Severity = 'info' | 'success' | 'warning' | 'danger';

defineEmits<{
  ok: [];
}>();

withDefaults(
  defineProps<{
    title: string;
    message: string;
    severity?: Severity;
  }>(),
  {
    severity: 'info'
  }
);

const ICONS: Record<Severity, string> = {
  info: 'pi pi-info-circle',
  success: 'pi pi-check-circle',
  warning: 'pi pi-exclamation-triangle',
  danger: 'pi pi-times-circle'
};
</script>
