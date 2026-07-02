
import api from './api';

export default class DashboardService {
  /**
   * Obtiene el listado de métricas del dashboard basado en filtros de tiempo.
   * @param {Object} payload - { year, month, period }
   */
  async dashboardList(payload) {
    const response = (await api.post('/dashboard/dashboardlist', payload)).data;
    return response.data;
  }
async getDetailLeads(payload) {
    const response = (await api.post('/dashboard/detailleads', payload)).data;
    return response.data;
  }

  async getDetailSales(payload) {
    const response = (await api.post('/dashboard/detailsales', payload)).data;
    return response.data;
  }
async getAvailableWeeks(payload) {
  const response = (await api.post('/dashboard/available-weeks', payload)).data;
  return response.data;
}

async liderList(payload) {
  const response = (await api.post('/dashboard/lider', payload)).data;
  return response.data;
}
  async programGoalsList(payload) {
    const response = (await api.post('/dashboard/program-goals', payload)).data;
    return response.data;
  }

  // Upsert de metas por edición. payload: { goals: [{ edition_num_id, target_vacants, target_revenue }] }
  async saveProgramGoals(payload) {
    const response = (await api.post('/dashboard/program-goals/save', payload)).data;
    return response.data;
  }

  // Nº de consultas (leads) por edición. payload: { edition_ids: number[] }
  // Devuelve [{ edition_num_id, consultas }]
  async leadsPerEditionList(payload) {
    const response = (await api.post('/dashboard/leads-per-edition', payload, {
      meta: { skipLoader: true }
    })).data;
    return response.data || [];
  }

  async ventasCanalList(payload) {
    const response = (await api.post('/dashboard/ventas-canal', payload)).data;
    return response.data;
  }


  async contactabilityList(payload) {
    const response = (await api.post('/dashboard/contactability', payload)).data;
    return response.data;
  }

}
