// src/composables/useNotifications.js
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { ServiceKeys } from '@/services'

export function useNotifications() {
  const notificationService = inject(ServiceKeys.Notification)

  const notifications = ref([])
  const unreadCount   = ref(0)
  const modal5pm      = ref({ show: false, registros: [], total: 0 })
  
  let closeStream     = null

  async function loadNotifications() {
    try {
      const data = await notificationService.getUnread()
      notifications.value = data.notifications
      unreadCount.value   = data.unread_count
    } catch (err) {
      console.error('[Notifications] Error al cargar:', err)
    }
  }

  async function onOpenBell() {
    if (unreadCount.value === 0) return
    try {
      await notificationService.markAllRead()
      unreadCount.value = 0
    } catch (err) {
      console.error('[Notifications] Error al marcar leídas:', err)
    }
  }

  function closeModal5pm() { 
    modal5pm.value.show = false 
  }

  onMounted(async () => {
    await loadNotifications()
    console.log('[SSE] Intentando conectar stream...')

    closeStream = notificationService.connectStream(async (event) => {
      console.log('[SSE] Evento recibido:', event)

      // 1. Refrescar campanita (Aquí ya está incluido el de 30 minutos)
      if (
        event.tipo_evento === 'llamada_sin_atencion' || 
        event.tipo_evento === 'nueva_notificacion' ||
        event.tipo_evento === 'llamada_por_vencer_30m'
      ) {
        await loadNotifications()
      }

      if (event.tipo_evento === 'restricciones_actualizadas') {
        console.log('[SSE] Restricciones actualizadas, redirigiendo...')
        // Pequeño delay para que cualquier modal abierto cierre visualmente
        setTimeout(() => {
          const router = useRouter()  // importar useRouter arriba si no está
          router.push({ name: 'ComercialLeads' }).then(() => {
            window.location.reload() // recarga dura para re-aplicar filtros del servidor
          })
        }, 800)
      }

      // 2. Mostrar modal de las 5pm
      if (event.tipo_evento === 'modal_5pm_unattended') {
        modal5pm.value = { show: true, registros: event.registros, total: event.total }
      }
    })
  })

  onUnmounted(() => {
    if (closeStream) closeStream()
  })

  return { 
    notifications, 
    unreadCount, 
    onOpenBell, 
    modal5pm, 
    closeModal5pm
  }
}