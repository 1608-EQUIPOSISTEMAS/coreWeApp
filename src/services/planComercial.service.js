// Comercial > Plan Comercial: los tres reportes contra objetivo y la carga de
// los objetivos semanales.
export default class PlanComercialService {
  constructor (api) {
    this.api = api
  }

  async objetivos (year) {
    return (await this.api.post('/plan-comercial/objetivos', { year })).data.data
  }

  async asesores (monthStart) {
    return (await this.api.post('/plan-comercial/asesores', { month_start: monthStart })).data.data
  }

  async ventasDiarias (monthStart) {
    return (await this.api.post('/plan-comercial/ventas-diarias', { month_start: monthStart })).data.data
  }

  async plan (monthStart) {
    return (await this.api.post('/plan-comercial/plan', { month_start: monthStart })).data.data
  }

  // weeks: [{ date_start, obj_vacantes, obj_ingresos, asesores: { [user_id]: n } }]
  async guardarPlan (monthStart, weeks) {
    return (await this.api.post('/plan-comercial/plan/save', { month_start: monthStart, weeks })).data.data
  }
}
