import api from './api'

export default class MarketingService {
  // Ingresos B2C del mes para el reporte de ingresos diarios. payload: { month: 'YYYY-MM' }
  async ingresosB2C (payload) {
    const response = (await api.post('/marketing/ingresos-b2c', payload)).data
    return response.data
  }

  // ── Publicaciones RRSS ──
  async socialPosts (params) { // { month: 'YYYY-MM', network?, status? }
    return (await api.get('/marketing/social-posts', { params })).data.data
  }

  async createSocialPost (payload) {
    return (await api.post('/marketing/social-posts', payload)).data.data
  }

  async updateSocialPost (id, payload) {
    return (await api.put(`/marketing/social-posts/${id}`, payload)).data
  }

  async deleteSocialPost (id) {
    return (await api.delete(`/marketing/social-posts/${id}`)).data
  }

  async syncSocialPosts () {
    return (await api.post('/marketing/social-posts/sync')).data.data
  }

  // ── Crecimiento RRSS ──
  async socialAccounts () {
    return (await api.get('/marketing/social-accounts')).data.data
  }

  async socialGrowth (params) { // { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', brand? }
    return (await api.get('/marketing/social-growth', { params })).data.data
  }

  // Carga manual de las cuentas sin API (LinkedIn, grupos de FB, WhatsApp).
  async saveSocialGrowth (payload) { // { account_id, week_start, followers }
    return (await api.put('/marketing/social-growth', payload)).data.data
  }

  async syncSocialGrowth () {
    return (await api.post('/marketing/social-growth/sync')).data.data
  }
}
