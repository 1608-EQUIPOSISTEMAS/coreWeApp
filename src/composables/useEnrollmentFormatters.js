export function useEnrollmentFormatters () {

  const formatMoney = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })

  const formatDate = v => {
    if (!v) return '\u2014'
    const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) return `${m[1]}/${m[2]}/${m[3]}`
    const d = new Date(v)
    return isNaN(d) ? '\u2014' : d.toLocaleDateString('es-PE')
  }

  const formatDateTime = v => {
    if (!v) return '\u2014'
    const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/)
    if (m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}`
    const m2 = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`
    const d = new Date(v)
    if (!isNaN(d)) return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    return String(v)
  }

  const statusPill = s => {
    if (!s) return 'pill-amber'
    const sl = s.toLowerCase()
    if (sl.includes('confirm') || sl.includes('aprob')) return 'pill-green'
    if (sl.includes('rechaz') || sl.includes('anula')) return 'pill-red'
    return 'pill-amber'
  }

  const isPendiente = e => {
    const s = (e.confirmation || '').toLowerCase()
    return !s || s.includes('pendiente')
  }

  const isContado = e => e.payment_type === 'PT'

  const getPagado = e => {
    if (isPendiente(e)) return 0
    return Number(e.total_to_pay) || 0
  }

  const calcSaldo = e => {
    if (isContado(e)) return 0
    const total = Number(e.total_to_pay) || 0
    return total - getPagado(e)
  }

  const rowClass = e => {
    const saldo = calcSaldo(e)
    if (saldo <= 0) return 'row-green'
    const total = Number(e.total_to_pay) || 1
    return (saldo / total) < 0.5 ? 'row-amber' : 'row-red'
  }

  const isOverdue = d => d ? new Date(d) < new Date() : false

  const cuotaRowClass = c => {
    if (c.status === 'paid') return 'cuota-paid'
    if (isOverdue(c.due_date)) return 'cuota-overdue'
    return ''
  }

  const cuotaStatusPill = c => {
    if (c.status === 'paid') return 'pill-green'
    if (isOverdue(c.due_date)) return 'pill-red'
    return 'pill-amber'
  }

  const cuotaStatusLabel = c => {
    if (c.status === 'paid') return 'Pagado'
    if (isOverdue(c.due_date)) return 'Vencido'
    return 'Pendiente'
  }

  const auditIcon = action => {
    const map = { created: 'fa-solid fa-circle-plus', approved: 'fa-solid fa-circle-check', edited: 'fa-solid fa-pen', odoo_enrolled: 'fa-solid fa-graduation-cap', odoo_unenrolled: 'fa-solid fa-user-xmark', email_sent: 'fa-solid fa-envelope', edition_reprogrammed: 'fa-solid fa-calendar-xmark', course_changed: 'fa-solid fa-right-left', created_from_cc: 'fa-solid fa-right-to-bracket', children_created: 'fa-solid fa-sitemap', modality_changed: 'fa-solid fa-shuffle', profile_changed: 'fa-solid fa-user-tag', retired: 'fa-solid fa-user-slash', observed: 'fa-solid fa-eye', resubmitted: 'fa-solid fa-rotate-right' }
    return map[action] || 'fa-solid fa-circle-info'
  }

  const auditLabel = action => {
    const map = { created: 'Inscripcion creada', approved: 'Pago aprobado', edited: 'Datos editados', odoo_enrolled: 'Inscrito en Odoo', odoo_unenrolled: 'Desinscrito de Odoo', email_sent: 'Correo enviado', edition_reprogrammed: 'Edicion reprogramada', course_changed: 'Cambio de curso', created_from_cc: 'Creado por cambio de curso', children_created: 'Modulos hijos creados', modality_changed: 'Cambio de modalidad', profile_changed: 'Cambio de perfil', retired: 'Alumno retirado', observed: 'Inscripcion observada', resubmitted: 'Reenviado a FICO' }
    return map[action] || action
  }

  return {
    formatMoney, formatDate, formatDateTime,
    statusPill, isPendiente, isContado, getPagado, calcSaldo, rowClass, isOverdue,
    cuotaRowClass, cuotaStatusPill, cuotaStatusLabel,
    auditIcon, auditLabel
  }
}
