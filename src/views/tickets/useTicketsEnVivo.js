import { inject, onMounted, onUnmounted } from 'vue'
import { ServiceKeys } from '@/services'

// Refresco en tiempo real de tickets.
//
// El backend avisa por el canal SSE de notificaciones ({ tipo_evento:
// 'tickets_actualizados', ticket_id }) cada vez que un ticket cambia: alta por
// DM de Slack, reparto del cron, estado, comentario... El aviso no trae datos:
// quien lo recibe vuelve a pedirlos con sus propios permisos.
//
// Varios avisos seguidos (crear + asignar, por ejemplo) se juntan en una sola
// recarga. Con la pestaña oculta no se consulta: se deja pendiente y se
// refresca al volver.

export function useTicketsEnVivo (alCambiar, esperaMs = 400) {
  const notificationService = inject(ServiceKeys.Notification, null)
  let cerrar = null
  let timer = null
  let pendientes = new Set()

  function disparar () {
    timer = null
    if (document.hidden) return
    const ids = pendientes
    pendientes = new Set()
    alCambiar(ids)
  }

  function alEvento (evento) {
    if (evento?.tipo_evento !== 'tickets_actualizados') return
    pendientes.add(Number(evento.ticket_id))
    if (!timer) timer = setTimeout(disparar, esperaMs)
  }

  function alVolver () {
    if (!document.hidden && pendientes.size && !timer) disparar()
  }

  onMounted(() => {
    if (notificationService?.connectStream) cerrar = notificationService.connectStream(alEvento)
    document.addEventListener('visibilitychange', alVolver)
  })

  onUnmounted(() => {
    clearTimeout(timer)
    cerrar?.()
    document.removeEventListener('visibilitychange', alVolver)
  })
}
