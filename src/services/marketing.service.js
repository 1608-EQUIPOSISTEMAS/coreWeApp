import api from './api'

// Lo que queda del modulo Marketing tras eliminar Publicaciones y Crecimiento
// RRSS (2026-08-26): un solo endpoint, que alimenta el Reporte Completo de
// Gerencia (views/gerencia/IngresosDiarios.vue).
export default class MarketingService {
  // Ingresos B2C del mes para el reporte de ingresos diarios. payload: { month: 'YYYY-MM' }
  async ingresosB2C (payload) {
    const response = (await api.post('/marketing/ingresos-b2c', payload)).data
    return response.data
  }
}
