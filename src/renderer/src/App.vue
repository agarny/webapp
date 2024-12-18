<template>
  <Background />
  <ResetAllDialog />
  <AboutDialog v-model:visible="visible" @close="visible = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)

// @ts-ignore (window.electronAPI may or not be defined and that is why we test it)
const electronAPI = window.electronAPI

if (electronAPI !== undefined) {
  electronAPI.onAbout(() => {
    visible.value = true
  })
}
</script>
