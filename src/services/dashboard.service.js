
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

  //programGoalsList
/**

  fastify.post('/program-goals', {
    schema: {
      body: {
        type: 'object',
        properties: {
          year: { type: 'integer', default: 2026 },
          month_num: { type: 'integer', default: 1 } // Envía 1 para Enero, 2 Febrero...
        }
      }
    } */
  async programGoalsList(payload) {
    const response = (await api.post('/dashboard/program-goals', payload)).data;
    return response.data;
  }





}
