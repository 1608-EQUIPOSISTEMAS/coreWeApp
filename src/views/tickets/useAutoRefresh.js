import { watch, onUnmounted } from 'vue'

// Refresco periódico mientras haga falta.
//
// La asignación automática la hace un cron del backend (tickets-autoassign),
// no una acción de quien mira la pantalla: sin esto, el agente asignado solo
// aparecía al recargar la página. Mientras `activo()` sea verdadero se llama a
// `refrescar` cada `intervaloMs`; con la pestaña oculta no se consulta, y al
// volver a ella se refresca de inmediato.

export function useAutoRefresh (refrescar, activo, intervaloMs = 30_000) {
  let timer = null

  function detener () {
    clearInterval(timer)
    timer = null
  }

  function tick () {
    if (!document.hidden) refrescar()
  }

  watch(activo, (on) => {
    if (on && !timer) timer = setInterval(tick, intervaloMs)
    else if (!on) detener()
  }, { immediate: true })

  function alVolver () {
    if (!document.hidden && activo()) refrescar()
  }
  document.addEventListener('visibilitychange', alVolver)

  onUnmounted(() => {
    detener()
    document.removeEventListener('visibilitychange', alVolver)
  })
}
