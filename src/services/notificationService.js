// src/services/NotificationService.js
import api from './api'

export default class NotificationService {

  // Campanita: no leídas + últimas 5 leídas
  async getUnread() {
    const response = await api.get('/notifications', { meta: { skipLoader: true } })
    return response.data.data
  }

  // Solo conteo (circulito rojo)
  async getCount() {
    const response = await api.get('/notifications/count', { meta: { skipLoader: true } })
    return response.data.data.unread_count
  }

  // Marcar todas como leídas
  async markAllRead() {
    await api.patch('/notifications/mark-read', {}, { meta: { skipLoader: true } })
  }

  // -------------------------------------------------------
  // MÓDULO COMPLETO: listado paginado con filtros
  // p_filters: { page, size, is_read }
  // is_read: undefined = todas | 'true' = leídas | 'false' = no leídas
  // -------------------------------------------------------
  async list(filters = {}) {
    const response = await api.post('/notifications/list', filters, { meta: { skipLoader: true } })
    return response.data.data  // { rows: [...], total_count }
  }
connectStream(onEvent) {
    // 1. Registramos la función del componente que quiere escuchar
    activeListeners.push(onEvent)

    // 2. Si NO hay una conexión abierta, creamos la ÚNICA conexión
    if (!globalEventSource) {
      const token = localStorage.getItem('token')
      const baseURL = api.defaults.baseURL
      const url = `${baseURL}/notifications/stream?token=${token}`
      
      console.log('[SSE] Iniciando ÚNICA conexión global a:', url)
      globalEventSource = new EventSource(url)

      globalEventSource.onmessage = (e) => {
        if (!e.data) return
        try { 
          const data = JSON.parse(e.data)
          // 3. Repartir el mensaje a todos los componentes que estén escuchando
          activeListeners.forEach(listener => listener(data))
        } catch {}
      }

      globalEventSource.onerror = () => {
        console.warn('[SSE] Reconectando...')
      }
    } else {
      console.log('[SSE] Reutilizando conexión existente. Total listeners:', activeListeners.length)
    }

    // 4. Retornar la función para que el componente se "desuscriba"
    return () => {
      // Quitamos este componente específico de la lista
      activeListeners = activeListeners.filter(listener => listener !== onEvent)
      
      // Si ya no queda NINGÚN componente escuchando, cerramos la conexión real para no gastar recursos
      if (activeListeners.length === 0 && globalEventSource) {
        globalEventSource.close()
        globalEventSource = null
        console.log('[SSE] Conexión cerrada (sin listeners activos)')
      }
    }
  }
}