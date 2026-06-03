// Setup global de los tests de Frontend (Vitest + jsdom).
// Punto unico para registrar plugins/stubs globales de Vue Test Utils a medida
// que crezca la suite (p.ej. Pinia, router, componentes CoreUI globales).
import { config } from '@vue/test-utils'

// Stub por defecto de RouterLink/RouterView para que montar componentes que los
// usen no requiera instalar el router completo en cada test.
config.global.stubs = {
  ...config.global.stubs,
  RouterLink: true,
  RouterView: true
}
