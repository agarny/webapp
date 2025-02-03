<template>
  <Menubar id="mainMenu" :model="items" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

const emit = defineEmits(['about'])

const items = [
  {
    label: 'Help',
    items: [
      {
        label: 'Home Page',
        icon: 'fa-solid fa-globe',
        command: () => {
          window.open('https://opencor.ws/')
        }
      },
      { separator: true },
      {
        label: 'Report Issue',
        icon: 'fa-solid fa-bug',
        command: () => {
          window.open('https://github.com/opencor/webapp/issues/new')
        }
      },
      { separator: true },
      {
        label: 'About OpenCOR',
        icon: 'fa-solid fa-circle-info',
        command: () => {
          emit('about')
        }
      }
    ]
  }
]

// Never display our menu as a hamburger menu.

onMounted(() => {
  const mainMenu = document.getElementById('mainMenu')

  if (mainMenu) {
    const observer = new MutationObserver(() => {
      if (mainMenu.className.includes('p-menubar-mobile')) {
        mainMenu.classList.remove('p-menubar-mobile')
      }
    })

    observer.observe(mainMenu, { attributes: true })
  }
})
</script>
