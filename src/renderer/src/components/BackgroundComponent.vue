<template>
  <div class="flex justify-center items-center h-full overflow-hidden">
    <img
      class="logo z-10 max-w-77.75 max-h-[266.92px] rounded-2xl p-2 shadow-[0_0_0.75rem_0.375rem_var(--p-content-border-color)]"
      src="../assets/logo.svg"
    />
    <div class="absolute bottom-1 left-2 text-xs text-neutral-400 dark:text-neutral-600">Copyright {{ COPYRIGHT }}</div>
    <div class="absolute bottom-1 right-2 text-xs text-neutral-400 dark:text-neutral-600">Version {{ currentVersion }}</div>
  </div>
</template>

<script lang="ts" setup>
/* Original dimensions:
 *  - Width: 828.12px; and
 *  - Height: 704.92px.
 * Final dimensions:
 *  - Width: 303px + 8px = 311px; and
 *  - Height: 257.92px + 8px = 266.92px.
 */

import { currentVersion } from '../common/version.ts';

import { COPYRIGHT } from '../common/constants.ts';
</script>

<style scoped>
.logo {
  background-color: var(--p-content-background);
}
</style>
