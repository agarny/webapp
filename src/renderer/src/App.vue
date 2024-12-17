// - Have our logo really centered even when the window's width and/or height is too small.
// - Only show the menu in the Web app.

<template>
  <div class="h-screen">
    <div class="flex flex-col h-full">
      <div class="main-menu">
        <MainMenu @about="visible = true" />
      </div>
      <div class="flex grow justify-center items-center">
        <Background />
      </div>
    </div>
  </div>
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
