
import api from './api';

export default class DashboardService {
  // Resumen ejecutivo del sistema (solo ADMIN/GERENCIA)
  async adminSummary() {
    const response = (await api.post('/dashboard/admin-summary', {})).data;
    return response.data;
  }

  // Panel de equipo. El alcance (área o solo yo) lo decide el backend con los
  // roles del token. viewAs ('LIDER_FICO', ...) solo lo respeta para ADMIN, que
  // lo usa desde las pestañas de Dashboard.vue para ver el panel de cada líder.
  async teamSummary(viewAs) {
    const payload = viewAs ? { view_as: viewAs } : {};
    const response = (await api.post('/dashboard/team-summary', payload)).data;
    return response.data;
  }

  // Plan del día con IA. Se genera de madrugada; esto solo lo lee. El backend
  // decide qué plan corresponde (Comercial por asesor o el del área) y qué
  // parte ve cada rol. viewAs, igual que teamSummary, solo aplica a ADMIN.
  async dailyPlan(viewAs) {
    const payload = viewAs ? { view_as: viewAs } : {};
    const response = (await api.post('/dashboard/daily-plan', payload)).data;
    return response.data;
  }

  // Arranca la regeneración en segundo plano (tarda minutos); luego se sondea dailyPlan.
  async regenerateDailyPlan(viewAs) {
    const payload = viewAs ? { view_as: viewAs } : {};
    const response = (await api.post('/dashboard/daily-plan/regenerate', payload)).data;
    return response.data;
  }

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
  // Embudo consultas -> ventas por edición y canal (Gerencia).
  // payload: { year, month_num } → { items, canales, totales }
  async gerenciaFunnel(payload) {
    const response = (await api.post('/dashboard/gerencia-funnel', payload)).data;
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

  // Historial de cambios del objetivo (trigger) + los pedidos rechazados.
  async goalHistoryList(payload) {
    const response = (await api.post('/dashboard/goal-history', payload)).data;
    return response.data;
  }

  // Gerencia > Parámetros: el objetivo estándar por programa y temporada.
  async goalStandardsList (payload) {
    const response = (await api.post('/dashboard/goal-standards', payload)).data;
    return response.data;
  }

  // Guardar también lo baja a las ediciones futuras: devuelve { saved, applied }.
  async saveGoalStandards (payload) {
    const response = (await api.post('/dashboard/goal-standards/save', payload)).data;
    return response.data;
  }

  // Reaplica el estándar completo, para las ediciones creadas después.
  async applyGoalStandards () {
    const response = (await api.post('/dashboard/goal-standards/apply', {})).data;
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

}
