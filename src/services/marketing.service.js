import api from './api'

export default class MarketingService {
  // Ingresos B2C del mes para el reporte de ingresos diarios. payload: { month: 'YYYY-MM' }
  async ingresosB2C (payload) {
    const response = (await api.post('/marketing/ingresos-b2c', payload)).data
    return response.data
  }
}
