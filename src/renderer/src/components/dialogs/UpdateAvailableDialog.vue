<template>
  <BaseDialog header=" " class="w-169">
    <div class="space-y-7">
      <div class="text-center">
        <div class="text-3xl font-bold">OpenCOR <span class="highlight highlight-version">{{ latestVersion }}</span> is available!</div>
      </div>
      <div class="space-y-2">
        <div class="text-center">
          <span class="text-lg">Feel free to <strong>force reload</strong> OpenCOR whenever you are ready.</span><br />
          <em>(You can force reload by pressing
          <span v-if="common.isMacOs()" class="highlight">⇧⌘R</span>
          <span v-else><span class="highlight">Ctrl</span>+<span class="highlight">Shift</span>+<span class="highlight">R</span></span>.)</em>
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="OK" autofocus @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import * as common from '../../common/common.ts';
import { latestVersion } from '../../common/version.ts';

defineEmits<(event: 'close') => void>();
</script>

<style scoped>
.highlight {
  display: inline-flex;
  align-items: center;
  height: 1em;
  padding: 0.125em 0.25em;
  border: 1px solid var(--p-content-border-color);
  border-radius: 9999px;
  background-color: var(--p-content-hover-background);
  color: var(--p-text-muted-color);
  font-style: normal;
}

.highlight-version {
  background-color: var(--p-message-success-background);
  border-color: var(--p-message-success-border);
  color: var(--p-message-success-color);
}
</style>
