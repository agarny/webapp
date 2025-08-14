<template>
  <div id="app">
    <OpenCOR />
    <!-- <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.omex"/> -->
    <!-- <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex"/> -->
    <!-- <OpenCOR omex="https://models.physiomeproject.org/workspace/b7c/rawfile/e0ae8d2d56aaaa091e23e1ee7e84cacbda1dfb6b/lorenz.omex"/> -->
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { SHORT_DELAY } from './common/constants'
import OpenCOR from './components/OpenCOR.vue'

function updateViewportHeight() {
  document.documentElement.style.setProperty('--vh', `${String(window.innerHeight * 0.01)}px`)
}

let resizeTimeout: number | null = null

function debouncedUpdateViewportHeight() {
  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
  }

  resizeTimeout = window.setTimeout(updateViewportHeight, SHORT_DELAY)
}

vue.onMounted(() => {
  window.addEventListener('resize', debouncedUpdateViewportHeight)

  updateViewportHeight()
})

vue.onUnmounted(() => {
  window.removeEventListener('resize', debouncedUpdateViewportHeight)
})
</script>

<style scoped>
:root {
  --vh: 1vh; /* Default value */
}

#app {
  width: 100%;
  height: calc(100 * var(--vh));
}
</style>
