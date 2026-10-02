import { addDaysIso } from '@/shared/lib/localDate.js'

// Vistas rapidas de /comercial/leads: atajos a combinaciones frecuentes de
// filtros. Los IDs salen del catalogo por alias (no se hardcodean numeros) con
// el shape { value, label } que esperan los chips y el payload.
export const QUICK_VIEWS = [
  { key: 'all', label: 'Todos', icon: 'fa-list', highlight: true, title: 'Limpiar todos los filtros' },
  { key: 'priority', label: 'Alta Prioridad', icon: 'fa-bolt', title: 'Edicion proxima (14d), interes bajo, estados activos' },
  { key: 'follow', label: 'Seguimiento', icon: 'fa-phone', title: 'Pendientes de contacto' },
  { key: 'will_pay', label: 'Pagara', icon: 'fa-coins', title: 'Leads que comprometieron pago' }
]

const PRIORITY_DAYS = 14
const ACTIVE_STATUSES = [
  'we_lead_status_atendido',
  'we_lead_status_interesado',
  'we_lead_status_unique',
  'we_lead_status_will_pay',
  'we_lead_status_proximo'
]

export function resolveByAlias (items = [], aliases) {
  return aliases
    .map(a => items.find(i => i.alias === a))
    .filter(Boolean)
    .map(i => ({ value: i.id, label: i.description }))
}

// Filtros que agrega cada vista sobre una bandeja limpia. `today` es 'YYYY-MM-DD'
// en Lima (toLocalIsoDate) y se pasa en cada clic: "Alta Prioridad" usa el hoy
// real, no el de cuando se cargo la pagina. 'all' no agrega nada.
export function quickViewFilters (key, { today, catalogs }) {
  if (key === 'priority') {
    const to = addDaysIso(today, PRIORITY_DAYS)
    return {
      edition_start_from: today,
      edition_start_to: to,
      edition_range_string: `${today} a ${to}`,
      interest_level_ids: resolveByAlias(catalogs.interest, ['we_lead_interest_low']),
      status_lead_ids: resolveByAlias(catalogs.pipeline, ACTIVE_STATUSES)
    }
  }
  if (key === 'follow') return { last_follow_ids: resolveByAlias(catalogs.follow, ['we_calling_pending']) }
  if (key === 'will_pay') return { status_lead_ids: resolveByAlias(catalogs.pipeline, ['we_lead_status_will_pay']) }
  return {}
}
