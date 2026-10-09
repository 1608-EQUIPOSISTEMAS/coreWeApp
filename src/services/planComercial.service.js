// Comercial > Plan Comercial: los tres reportes contra objetivo y la carga de
// los objetivos semanales. `line` = VIVO | ONLINE: cada linea tiene su plan.
export default class PlanComercialService {
  constructor (api) {
    this.api = api
  }

  async objetivos (year, line) {
    return (await this.api.post('/plan-comercial/objetivos', { year, line })).data.data
  }

  async asesores (monthStart, line) {
    return (await this.api.post('/plan-comercial/asesores', { month_start: monthStart, line })).data.data
  }

  async ventasDiarias (monthStart, line) {
    return (await this.api.post('/plan-comercial/ventas-diarias', { month_start: monthStart, line })).data.data
  }

  async recompra (year) {
    return (await this.api.post('/plan-comercial/recompra', { year })).data.data
  }

  async plan (monthStart, line) {
    return (await this.api.post('/plan-comercial/plan', { month_start: monthStart, line })).data.data
  }

  async anual (year) {
    return (await this.api.post('/plan-comercial/anual', { year })).data.data
  }

  async estrategias (monthStart) {
    return (await this.api.post('/plan-comercial/estrategias', { month_start: monthStart })).data.data
  }

  // Ventas online del mes por producto contra su objetivo.
  async productos (monthStart) {
    return (await this.api.post('/plan-comercial/productos', { month_start: monthStart })).data.data
  }

  // Informe Comercial de un rango { date_start, date_end } ('YYYY-MM-DD').
  async reporte (period) {
    return (await this.api.post('/plan-comercial/reporte', period)).data.data
  }

  // weeks: [{ date_start, obj_vacantes, obj_ingresos, asesores: { [user_id]: n } }]
  // productos (solo Online): { PLUS: n, CURSOS: n, ... }
  async guardarPlan (monthStart, line, weeks, productos) {
    return (await this.api.post('/plan-comercial/plan/save', { month_start: monthStart, line, weeks, ...(productos && { productos }) })).data.data
  }
}
