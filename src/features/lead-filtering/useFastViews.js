// Vistas rapidas del listado de leads. Resuelven IDs de catalogo por alias (sin
// hardcodear numeros) y aplican un preset de filtros sobre el store de dominio.
// Espejo de applyQuickView() de views/comercial/Leads.vue. La persistencia en
// localStorage (saveState) queda fuera: es responsabilidad del orquestador de la
// pagina, no de la vista rapida.

export const quickViews = [
  { key: 'all', label: 'Todos', icon: 'fa-list', highlight: true, title: 'Limpiar todos los filtros' },
  { key: 'priority', label: 'Alta Prioridad', icon: 'fa-bolt', title: 'Edicion proxima (14d), interes bajo, estados activos' },
  { key: 'follow', label: 'Seguimiento', icon: 'fa-phone', title: 'Pendientes de contacto' },
  { key: 'will_pay', label: 'Pagara', icon: 'fa-coins', title: 'Leads que comprometieron pago' }
]

// Fecha ISO (YYYY-MM-DD) desplazada `days` dias desde hoy.
export function isoDayOffset (days = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Traduce una lista de alias de catalogo al shape { value, label } que esperan
// los filtros. catalogRef es un ref de Vue (se lee .value); los alias no hallados
// se descartan.
export function resolveByAlias (catalogRef, aliases) {
  const items = (catalogRef && catalogRef.value) || []
  return aliases
    .map(a => items.find(i => i.alias === a))
    .filter(Boolean)
    .map(i => ({ value: i.id, label: i.description }))
}

// store: instancia de useLeadStore. catalogs: { interest, pipeline, follow } como
// refs de catalogo. Devuelve la lista de vistas y el aplicador.
export function useFastViews (store, catalogs = {}) {
  const { interest, pipeline, follow } = catalogs

  function applyQuickView (key) {
    // clearFilters(false) restablece los filtros conservando la restriccion del
    // comercial (owner_user_ids) y sin recargar todavia.
    store.clearFilters(false)
    store.setActiveQuickView(key)
    const f = store.filters

    if (key === 'priority') {
      const from = isoDayOffset(0)
      const to = isoDayOffset(14)
      f.edition_start_from = from
      f.edition_start_to = to
      f.edition_range_string = `${from} a ${to}`
      f.interest_level_ids = resolveByAlias(interest, ['we_lead_interest_low'])
      f.status_lead_ids = resolveByAlias(pipeline, [
        'we_lead_status_atendido',
        'we_lead_status_interesado',
        'we_lead_status_unique',
        'we_lead_status_will_pay',
        'we_lead_status_proximo'
      ])
    } else if (key === 'follow') {
      f.last_follow_ids = resolveByAlias(follow, ['we_calling_pending'])
    } else if (key === 'will_pay') {
      f.status_lead_ids = resolveByAlias(pipeline, ['we_lead_status_will_pay'])
    } else if (key === 'next_start') {
      const from = isoDayOffset(0)
      const to = isoDayOffset(7)
      f.edition_start_from = from
      f.edition_start_to = to
      f.edition_range_string = `${from} a ${to}`
    }

    store.setPagination({ page: 1 })
    store.rebuildChips()
    return store.fetchLeads()
  }

  return { quickViews, applyQuickView }
}
