<template>
  <BaseDialog header="Check For Updates...">
    <div class="mt-2 mb-4">No updates are available at this time.</div>
    <template #footer>
      <Button autofocus label="OK" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits(['close'])
</script>
