import api from './api'

// Modulo Planificacion: escenarios de programacion de un anio futuro.
//
// Ningun metodo de aca toca program_editions salvo `publish`, que es el unico
// que convierte el escenario en ediciones reales.
export default class SchedulePlanService {
  async list (year = null) {
    return (await api.post('/scheduleplan/planlist', { year })).data.items
  }

  async get (planId) {
    return (await api.post('/scheduleplan/planget', { plan_id: planId })).data.plan
  }

  async create ({ name, year }) {
    return (await api.post('/scheduleplan/plancreate', { name, year })).data.plan
  }

  // El planner guarda el escenario entero, no item por item.
  async save ({ planId, name = null, items }) {
    return (await api.post('/scheduleplan/plansave', {
      plan_id: planId, name, items
    })).data.plan
  }

  async remove (planId) {
    return (await api.post('/scheduleplan/plandelete', { plan_id: planId })).data
  }

  // Copia un mes del cronograma real al escenario con las fechas corridas.
  // mode: 'weekday' conserva el dia de la semana, 'same_date' la fecha exacta.
  async seedMonth ({ planId, month, sourceYear, mode = 'weekday' }) {
    return (await api.post('/scheduleplan/planseed', {
      plan_id: planId, month, source_year: sourceYear, mode
    }, { timeout: 0 })).data
  }

  // Los 12 meses de una. Endpoint propio y no un for de 12 seedMonth: cada uno
  // relee y reescribe el blob completo del plan.
  async seedYear ({ planId, sourceYear, mode = 'weekday' }) {
    return (await api.post('/scheduleplan/planseedyear', {
      plan_id: planId, source_year: sourceYear, mode
    }, { timeout: 0 })).data
  }

  // Un mes del escenario con el mismo sobre que el cronograma real, para que la
  // vista de solo lectura lo pinte sin cambios.
  async previewMonth ({ planId, month, year = null }) {
    return (await api.post('/scheduleplan/planpreview', {
      plan_id: planId, month, year
    })).data
  }

  // Crea las ediciones reales. Devuelve { published: [], failed: [] }: publicar
  // es masivo y una fila mala no puede frenar a las demas.
  async publish ({ planId, uids = null }) {
    return (await api.post('/scheduleplan/planpublish', {
      plan_id: planId, uids
    }, { timeout: 0 })).data
  }
}
