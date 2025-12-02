<template>
  <BaseDialog header="Simulation Settings..." class="w-169">
    <template #footer>
      <Button autofocus label="OK" @click="$emit('ok')" />
      <Button label="Cancel" severity="secondary" @click="$emit('close')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits(['close', 'ok']);
</script>
