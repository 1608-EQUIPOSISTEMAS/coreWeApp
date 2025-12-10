import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import CoreuiVue from '@coreui/vue'
import CIcon from '@coreui/icons-vue'
import { iconsSet as icons } from '@/assets/icons'

import DocsComponents from '@/components/DocsComponents'
import DocsExample from '@/components/DocsExample'
import DocsIcons from '@/components/DocsIcons'

import { createCatalogService } from '@/services/catalog.service.js'
import { createServices, ServiceKeys } from '@/services'
import restrict from '@/directives/restrict.js'

// 🔔 Toasts
import Toast, { POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

async function bootstrap () {
  const app = createApp(App)

  // 1) plugins
  app.use(createPinia())
  app.use(router)
  app.use(CoreuiVue)
  // 👇 registra el plugin de toasts aquí
  app.use(Toast, {
    position: POSITION.TOP_RIGHT,
    timeout: 3500,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    hideProgressBar: false
  })

  // 2) coreui global stuff
  app.provide('icons', icons)
  app.component('CIcon', CIcon)
  app.component('DocsComponents', DocsComponents)
  app.component('DocsExample', DocsExample)
  app.component('DocsIcons', DocsIcons)

  // 3) catálogo: crear servicio, precargar e inyectar
  const catalog = createCatalogService()
  try {
    await catalog.ensureLoaded()
  } catch (e) {
    console.warn('No se pudieron precargar catálogos desde API, uso cache local si existe.', e)
  }
  app.provide('catalog', catalog)

  // Servicios únicos (DI)
  const services = createServices()
  app.provide(ServiceKeys.Program,   services[ServiceKeys.Program])
  app.provide(ServiceKeys.Comercial, services[ServiceKeys.Comercial])
  app.provide(ServiceKeys.Discount, services[ServiceKeys.Discount])
  app.provide(ServiceKeys.Instructor, services[ServiceKeys.Instructor])
  app.provide(ServiceKeys.Edition, services[ServiceKeys.Edition])
  app.provide(ServiceKeys.Customer, services[ServiceKeys.Customer])
  app.provide(ServiceKeys.Auth,      services[ServiceKeys.Auth])
  app.provide(ServiceKeys.CorporateAgreement, services[ServiceKeys.CorporateAgreement])
  app.provide(ServiceKeys.Integration, services[ServiceKeys.Integration])
  
  
  

  // Directiva global
  app.directive('restrict', restrict)

  // 4) montar
  app.mount('#app')
}

bootstrap()
