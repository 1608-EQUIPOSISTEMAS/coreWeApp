// Qué ediciones destino se ofrecen en Cambio de Curso y Reprogramación.
// `today` se inyecta para poder testear la regla sin depender del reloj.

// Días que un alumno puede entrar por CC a una edición ya empezada
// (pedido de FICO 28/09/26: SAP SD → SAP PM del 20/09).
export const COURSE_CHANGE_GRACE_DAYS = 15

// Parsea start_date (cadena calendario) a Date local sin sufrir TZ shift:
// si el server Node corre en UTC, el ISO viene como '2026-05-09T00:00:00.000Z',
// que `new Date()` interpreta como 2026-05-08 19:00 Lima — falsea el filtro.
export function parseLocalDate (startDate) {
  const m = String(startDate ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}

// Cambio de curso: ediciones que empezaron hace ≤ COURSE_CHANGE_GRACE_DAYS días o después.
export function isWithinCourseChangeWindow (startDate, today = new Date()) {
  const ed = parseLocalDate(startDate)
  if (!ed) return false
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - COURSE_CHANGE_GRACE_DAYS)
  return ed >= cutoff
}

// Reprogramación: admite desde el 1ro de hace 2 meses.
// Ej: estando en julio, admite ediciones desde el 01/05.
export function isWithinReprogramWindow (startDate, today = new Date()) {
  const ed = parseLocalDate(startDate)
  if (!ed) return false
  const cutoff = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  return ed >= cutoff
}
