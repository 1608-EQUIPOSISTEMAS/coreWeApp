import { toLocalIsoDate } from '@/shared/lib/localDate'

// Estado de un aula por su rango de dictado. "Hoy" es la fecha de Lima: con
// la de UTC, desde las 19:00 un aula nocturna que termina hoy salia Finalizado
// en plena clase y una que empieza manana salia Activo.
export function aulaStatus (firstDate, lastDate, today = toLocalIsoDate()) {
  const first = firstDate ? String(firstDate).slice(0, 10) : null
  const last = lastDate ? String(lastDate).slice(0, 10) : null
  if (!first || first > today) return 'Proximo'
  if (last && last < today) return 'Finalizado'
  return 'Activo'
}
