// Como se lee cada aula del alumno en el buscador de Aulas. El estado ya viene
// decidido del backend (summarizeStudentCourses); aqui solo tono y frases.
const STATUS_TONE = {
  Activo: 'ok',
  Proximo: 'info',
  Finalizado: '',
  Retirado: 'bad',
  'Cambio de curso': 'warn',
  Reprogramado: 'warn'
}

export const statusTone = (status) => STATUS_TONE[status] ?? ''

// La deuda es de la VENTA (un paquete reparte la misma deuda en todas sus aulas).
export function paymentView ({ fin_total: total, fin_paid: paid, fin_overdue: overdue }) {
  if (Number(overdue) > 0) return { label: `${overdue} cuota${overdue > 1 ? 's' : ''} vencida${overdue > 1 ? 's' : ''}`, tone: 'bad' }
  if (!Number(total)) return { label: 'Sin costo', tone: '' }
  if (Number(paid) >= Number(total)) return { label: 'Pagado', tone: 'ok' }
  return { label: 'Al día', tone: 'ok' }
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

// Linea de resumen bajo el nombre: lo primero que preguntan es "cuantos cursos llevo".
export function summaryLine ({ taken, active, approved, certified, exited }) {
  return [
    plural(taken, 'curso llevado', 'cursos llevados'),
    active && plural(active, 'en curso', 'en curso'),
    approved && plural(approved, 'aprobado', 'aprobados'),
    certified && plural(certified, 'certificado', 'certificados'),
    exited && plural(exited, 'salida (retiro, CC o RP)', 'salidas (retiro, CC o RP)')
  ].filter(Boolean).join(' · ')
}
