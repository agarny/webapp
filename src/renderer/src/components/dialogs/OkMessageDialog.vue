<template>
  <BaseDialog :header="title">
    <div class="mt-2 mb-4" v-html="message"></div>
    <template #footer>
      <Button autofocus label="OK" @click="$emit('ok')" />
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
defineEmits<(event: 'ok') => void>();
defineProps<{
  title: string;
  message: string;
}>();
</script>
