<template>
  <div class="drop-zone" @dragleave.self="emit('leave')">
    <div class="drop-zone-frame">
      <div class="drop-zone-message">
        <div class="drop-zone-icon">
          <i class="pi pi-upload" />
        </div>
        <div class="drop-zone-title">{{ title }}</div>
        <div class="drop-zone-text">{{ text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

// The drop zone that is shown when some files are being dragged over OpenCOR.
// Note #1: our contents ignore pointer events, so that we are the only target of drag events (see the drag and drop
//          section in OpenCOR.vue), which means that we only get left when the files being dragged leave OpenCOR or
//          when the drag gets cancelled.
// Note #2: the number of files being dragged may not be known (e.g., some browsers don't tell us until the files are
//          dropped), in which case it is zero and we show a generic message.

const props = defineProps<{
  fileCount: number;
}>();

const emit = defineEmits<{
  leave: [];
}>();

const title = vue.computed<string>(() => {
  if (props.fileCount === 1) {
    return 'Drop the file to open it';
  }

  if (props.fileCount > 1) {
    return `Drop the ${props.fileCount} files to open them`;
  }

  return 'Drop the files to open them';
});

const text = vue.computed<string>(() => {
  return props.fileCount === 1 ? 'It will be opened in a new tab.' : 'Each file will be opened in its own tab.';
});
</script>

<style scoped>
/**
 * Note: we may be shown in a small container (e.g., when OpenCOR is embedded in a page alongside other OpenCOR
 *       instances), so we adapt our message to the size of our container.
 */

.drop-zone {
  position: absolute;
  inset: 0;
  z-index: 99999;
  padding: 0.5rem;
  background-color: color-mix(in srgb, var(--p-content-background) 70%, transparent);
  backdrop-filter: blur(2px);
  container-type: size;
}

.drop-zone-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: hidden;
  border: 2px dashed var(--p-primary-color);
  border-radius: 0.75rem;
  background-color: color-mix(in srgb, var(--p-primary-color) 6%, transparent);
  pointer-events: none;
}

.drop-zone-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  text-align: center;
}

.drop-zone-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.5rem;
  border-radius: 50%;
  background-color: color-mix(in srgb, var(--p-primary-color) 15%, transparent);
  color: var(--p-primary-color);
}

.drop-zone-icon .pi {
  font-size: 1.25rem;
}

.drop-zone-title {
  color: var(--p-text-color);
  font-size: 1rem;
  font-weight: 600;
}

.drop-zone-text {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
}

/**
 * Adapt our message to the size of our container.
 */

@container (height < 12rem) {
  .drop-zone-icon {
    display: none;
  }
}

@container (height < 6rem) {
  .drop-zone {
    padding: 0.25rem;
  }

  .drop-zone-message {
    padding: 0.25rem 0.5rem;
  }

  .drop-zone-text {
    display: none;
  }
}

@container (width < 20rem) {
  .drop-zone-title {
    font-size: 0.875rem;
  }

  .drop-zone-text {
    display: none;
  }
}
</style>
