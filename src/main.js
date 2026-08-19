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

// 📊 Chart.js: defaults reactivos al tema oscuro
import '@/utils/chartTheme.js'

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

    await catalog.membershipList({active:true})
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
  app.provide(ServiceKeys.Integration, services[ServiceKeys.Integration])
  app.provide(ServiceKeys.Fico, services[ServiceKeys.Fico])
  app.provide(ServiceKeys.Dashboard, services[ServiceKeys.Dashboard])
app.provide(ServiceKeys.B2b, services[ServiceKeys.B2b])
app.provide(ServiceKeys.Notification, services[ServiceKeys.Notification])
app.provide(ServiceKeys.Bot, services[ServiceKeys.Bot])
app.provide(ServiceKeys.Config, services[ServiceKeys.Config])
app.provide(ServiceKeys.Import, services[ServiceKeys.Import])
app.provide(ServiceKeys.Marketing, services[ServiceKeys.Marketing])
app.provide(ServiceKeys.Reprogramacion, services[ServiceKeys.Reprogramacion])


  app.config.globalProperties.$hasRole = (roles) => {
    // 1. Obtener usuario del localStorage
    const userStored = localStorage.getItem('user') // Asegúrate que la key sea 'user'

    if (!userStored) return false

    try {
      const user = JSON.parse(userStored)
      // Asumimos que el usuario tiene una propiedad 'role' o 'rol'. Ajusta según tu DB.
      // Si tu usuario tiene un array de roles, la lógica cambia ligeramente.
      // Aquí asumo que user.role es un string (ej: 'ADMIN').
      const userRoles = user.roles

      if (!userRoles) return false

      // 2. Normalizar la entrada a un array (por si pasas un string o un array)
      const rolesBusca = Array.isArray(roles) ? roles : [roles]

      // 3. Verificar si el rol del usuario está incluido en lo solicitado
      return rolesBusca.some(role => userRoles.includes(role))


    } catch (e) {
      console.error('Error al parsear usuario para verificar rol', e)
      return false
    }
  }

  // Directiva global
  app.directive('restrict', restrict)

  // 4) montar
  app.mount('#app')
}

bootstrap()
