// Responde las dos preguntas que hace el asesor al abrir una matricula:
// "¿como esta la inscripcion?" y "¿ya pago?". Antes el detalle mostraba
// cat_type_status crudo ("R", "RP", "CC") pintado de verde si active = 'Y', y
// el estado de FICO solo aparecia si estaba observada.
// tone = clase de .ds-verdict ('' neutro, 'ok', 'warn', 'bad').

const MOVEMENT_STATUS = {
  we_enrollment_status_retired: { label: 'Retirado', tone: 'bad', hint: 'Se dio de baja: ya no sigue el programa' },
  we_enrollment_status_reprogrammed: { label: 'Reprogramado', tone: '', hint: 'Pasó a otra edición; lo vigente está en la nueva inscripción' },
  we_enrollment_status_course_changed: { label: 'Cambio de curso', tone: '', hint: 'Pasó a otro programa; lo vigente está en la nueva inscripción' }
}

const FICO_STATUS = {
  we_enrollment_status_checked: { label: 'Aprobada por FICO', tone: 'ok', hint: 'FICO confirmó la venta y el pago inicial' },
  we_enrollment_status_pending: { label: 'En revisión de FICO', tone: 'warn', hint: 'FICO todavía no confirma el pago inicial' },
  we_enrollment_status_observed: { label: 'Observada por FICO', tone: 'bad', hint: 'Hay que corregirla y reenviarla' }
}

// typeStatusAlias = cat_type_status (Activo/R/RP/CC); un movimiento manda sobre
// el estado de FICO porque la venta ya no es la vigente.
export function enrollmentVerdict ({ typeStatusAlias, ficoStatusAlias, active }) {
  if (active === 'N') return { label: 'Anulada', tone: 'bad', hint: 'La inscripción fue anulada' }
  if (MOVEMENT_STATUS[typeStatusAlias]) return MOVEMENT_STATUS[typeStatusAlias]
  return FICO_STATUS[ficoStatusAlias] || { label: 'Sin estado de FICO', tone: '', hint: '' }
}

// summary = summarizePayment(...) ({ total, paid, balance }).
// overdue = { amount, dueDate } de la primera cuota vencida sin cobrar, o null.
// next = { amount, dueDate } de la proxima cuota por cobrar, o null.
export function paymentVerdict ({ summary, overdue = null, next = null }) {
  if (!(summary.total > 0)) return { key: 'free', label: 'Sin monto a pagar', tone: '' }
  if (summary.balance <= 0) return { key: 'paid', label: 'Pagó todo', tone: 'ok' }
  if (overdue) return { key: 'overdue', label: 'Tiene una cuota vencida', tone: 'bad', amount: overdue.amount, dueDate: overdue.dueDate }
  if (summary.paid <= 0) return { key: 'unpaid', label: 'Aún no paga', tone: 'warn', amount: summary.balance }
  return { key: 'on_track', label: 'Al día', tone: 'ok', amount: summary.balance, dueDate: next?.dueDate || null }
}

// Nota minima aprobatoria del aula: misma que PASS_THRESHOLD en
// Backend/src/modules/edition/edition.entity.js (si cambia alla, cambia aca).
export const PASS_GRADE = 12

// finalGrade llega SOLO si el docente ya cargo la nota (graded_at); sin ella,
// una edicion abierta es "En curso" y una cerrada queda sin nota (null).
export function gradeVerdict ({ finalGrade, editionEnded }) {
  if (finalGrade != null) {
    const n = Number(finalGrade)
    return { label: n.toFixed(n % 1 ? 1 : 0), tone: n >= PASS_GRADE ? 'ok' : 'bad' }
  }
  if (editionEnded === false) return { label: 'En curso', tone: 'info' }
  return null
}
