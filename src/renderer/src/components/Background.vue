<template>
  <img class="logo" src="../assets/logo.svg" />
</template>

<style scoped>
.logo {
  /* Original dimensions:
   *  - Width: 828.12px; and
   *  - Height: 704.92px.
   * Final dimensions:
   *  - Width: 303px + 8px = 311px; and
   *  - Height: 257.92px + 8px = ~266px
   */

  max-width: 311px;
  max-height: 266px;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 0 12px 6px var(--p-content-border-color);
  z-index: -1;
}
</style>
