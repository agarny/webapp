import * as vue from 'vue'

// Some constants to know whether the operating system uses light mode or dark mode.

const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)')

export const isLightMode = vue.ref(prefersColorScheme.matches)
export const isDarkMode = vue.ref(!prefersColorScheme.matches)

prefersColorScheme.addEventListener('change', (event) => {
  isLightMode.value = event.matches
  isDarkMode.value = !event.matches
})

// A method to track the height of a given element.

export function trackElementHeight(id: string): void {
  vue.onMounted(() => {
    const element = document.getElementById(id)

    if (element !== null) {
      const observer = new ResizeObserver(() => {
        let elementHeight = window.getComputedStyle(element).height

        if (elementHeight === '' || elementHeight === 'auto') {
          elementHeight = '0px'
        }

        const cssVariableName =
          '--' +
          id
            .split('_')[0]
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase() +
          '-height'
        const oldElementHeight = window.getComputedStyle(document.documentElement).getPropertyValue(cssVariableName)

        if (oldElementHeight === '' || (elementHeight !== '0px' && oldElementHeight !== elementHeight)) {
          document.documentElement.style.setProperty(cssVariableName, elementHeight)
        }
      })

      observer.observe(element)

      vue.onUnmounted(() => {
        observer.disconnect()
      })
    }
  })
}
