// "Análisis de tiempos" del cronograma: dónde cae la edición que se está
// armando entre las otras ediciones del mismo programa y cuántos días la
// separan de la anterior y de la siguiente. Mismo conteo y mismo umbral que
// Planificación (features/schedule-plan/editionGaps.js): si una dice 29 días,
// la otra también.
import { diasEntre, DIAS_MINIMOS_ENTRE_EDICIONES } from '@/features/schedule-plan/editionGaps'

const ymd = (v) => String(v || '').slice(0, 10)

// history: ediciones del SP (start_date_eff, active, edition_num_id).
// current: { start_date, ... } la que se edita; currentId se excluye del historial.
export function editionGapTimeline (history = [], current = {}, currentId = null) {
  if (!current.start_date) return []
  const timeline = history
    .filter((e) => e.active === 'Y' && e.edition_num_id !== currentId && e.start_date_eff)
    .map((e) => ({ ...e, start: ymd(e.start_date_eff), type: 'history' }))
  const actual = { ...current, start: ymd(current.start_date), type: 'current' }
  timeline.push(actual)
  // sort estable: a igual fecha, la actual queda después de la existente.
  timeline.sort((a, b) => a.start.localeCompare(b.start))
  const i = timeline.indexOf(actual)

  return timeline.map((item, idx) => {
    if (idx === i - 1) {
      const days = diasEntre(item.start, actual.start)
      return { ...item, gapInfo: { days, label: `${days} días después`, color: days < DIAS_MINIMOS_ENTRE_EDICIONES ? 'text-warning' : 'text-success' } }
    }
    if (idx === i + 1) {
      const days = diasEntre(actual.start, item.start)
      return { ...item, gapInfo: { days, label: `${days} días antes`, color: days < DIAS_MINIMOS_ENTRE_EDICIONES ? 'text-danger' : 'text-info' } }
    }
    return { ...item, gapInfo: null }
  })
}
