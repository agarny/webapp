import * as fa from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import 'primeicons/primeicons.css'
import Aura from '@primevue/themes/aura'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/app.css'

fa.dom.watch() // This allows i tags to be automatically replaced with svg tags.
fa.library.add(fas) // Add the free solid icons to the library, so they can be used globally.

const app = createApp(App)

app.component('FontAwesomeIcon', FontAwesomeIcon) // Make FontAwesomeIcon available globally.

app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})
app.use(ConfirmationService)

app.mount('#app')
