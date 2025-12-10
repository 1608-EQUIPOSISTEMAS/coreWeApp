// Loader reactivo global (sin dependencias)
import { reactive, computed } from 'vue'

const state = reactive({
  active: 0,         // cuántas peticiones están vivas
  show: false,       // visibilidad real del overlay
  delayTimer: null,  // para evitar parpadeo
})

const isLoading = computed(() => state.show)

function start() {
  state.active++
  // muestra tras un pequeño delay (evita blink en requests muy rápidos)
  clearTimeout(state.delayTimer)
  state.delayTimer = setTimeout(() => { state.show = true }, 150)
}

function stop() {
  if (state.active > 0) state.active--
  if (state.active === 0) {
    clearTimeout(state.delayTimer)
    // espera breve para que se sienta más fluido al cerrar
    setTimeout(() => { state.show = false }, 150)
  }
}

export const loader = { state, isLoading, start, stop }
