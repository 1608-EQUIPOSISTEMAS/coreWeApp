export function useEnrollmentFormatters () {

  const formatMoney = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })

  const formatDate = v => {
    if (!v) return '\u2014'
    const s = String(v)
    const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m1) return `${m1[1]}/${m1[2]}/${m1[3]}`
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m2) return `${m2[3]}/${m2[2]}/${m2[1]}`
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

  const getReserva = e => Number(e.reservation_amount) || 0

  const getPagado = e => {
    if (isContado(e)) return isPendiente(e) ? 0 : Number(e.total_to_pay) || 0
    return Number(e.paid_amount) || 0
  }

  const calcSaldo = e => {
    if (isContado(e)) return 0
    const total = Number(e.total_to_pay) || 0
    const pagado = getPagado(e)
    const reserva = getReserva(e)
    return total - Math.max(pagado, reserva)
  }

  const rowClass = e => {
    const saldo = calcSaldo(e)
    if (saldo <= 0) return 'row-green'
    const total = Number(e.total_to_pay) || 1
    return (saldo / total) < 0.5 ? 'row-amber' : 'row-red'
  }

  const parseLocalDate = d => {
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return new Date(+m[1], +m[2] - 1, +m[3])
    return new Date(d)
  }

  const isOverdue = d => d ? parseLocalDate(d) < new Date() : false

  const cuotaRowClass = c => {
    if (c.status === 'paid') return 'cuota-paid'
    if (isOverdue(c.due_date)) return 'cuota-overdue'
    return ''
  }

  const isInicial = c => c.installment_number === 0 || c.is_reserva

  const cuotaStatusPill = (c, planStatus) => {
    if (c.status === 'paid') return 'pill-green'
    if (!isInicial(c) && isOverdue(c.due_date)) return 'pill-red'
    if (planStatus === 'borrador') return 'pill-muted'
    return 'pill-amber'
  }

  const cuotaStatusLabel = (c, planStatus) => {
    if (c.status === 'paid') return 'Pagado'
    if (!isInicial(c) && isOverdue(c.due_date)) return 'Vencido'
    if (planStatus === 'borrador') return 'Borrador'
    return 'Pendiente'
  }

  const auditIcon = action => {
    const map = { created: 'fa-solid fa-circle-plus', approved: 'fa-solid fa-circle-check', edited: 'fa-solid fa-pen', odoo_enrolled: 'fa-solid fa-graduation-cap', odoo_unenrolled: 'fa-solid fa-user-xmark', email_sent: 'fa-solid fa-envelope', email_failed: 'fa-solid fa-envelope-circle-check', payment_registered: 'fa-solid fa-money-bill-wave', edition_reprogrammed: 'fa-solid fa-calendar-xmark', course_changed: 'fa-solid fa-right-left', created_from_cc: 'fa-solid fa-right-to-bracket', children_created: 'fa-solid fa-sitemap', children_skipped_no_edition: 'fa-solid fa-triangle-exclamation', parent_marked_e0: 'fa-solid fa-layer-group', modality_changed: 'fa-solid fa-shuffle', profile_changed: 'fa-solid fa-user-tag', student_edited: 'fa-solid fa-user-pen', retired: 'fa-solid fa-user-slash', observed: 'fa-solid fa-eye', resubmitted: 'fa-solid fa-rotate-right', created_from_token: 'fa-solid fa-link', validation_requested: 'fa-solid fa-rotate-right', validation_applied: 'fa-solid fa-circle-check', installments_rescheduled: 'fa-solid fa-calendar-days', odoo_fee_paid: 'fa-solid fa-money-check-dollar', odoo_fees_activated: 'fa-solid fa-list-check', token_inscription_edited: 'fa-solid fa-user-pen', token_grouped: 'fa-solid fa-object-group', token_ungrouped: 'fa-solid fa-object-ungroup', token_link_added: 'fa-solid fa-link', token_link_edited: 'fa-solid fa-pen' }
    if (action === 'email_failed') return 'fa-solid fa-triangle-exclamation'
    return map[action] || 'fa-solid fa-circle-info'
  }

  const auditLabel = action => {
    const map = { created: 'Inscripcion creada', approved: 'Pago aprobado', edited: 'Datos editados', odoo_enrolled: 'Inscrito en Odoo', odoo_unenrolled: 'Desinscrito de Odoo', email_sent: 'Correo enviado', email_failed: 'Error al enviar correo', payment_registered: 'Pago registrado', edition_reprogrammed: 'Edicion reprogramada', course_changed: 'Cambio de curso', created_from_cc: 'Creado por cambio de curso', children_created: 'Modulos hijos creados', children_skipped_no_edition: 'Modulo saltado: sin edicion', parent_marked_e0: 'Padre marcado E0', modality_changed: 'Cambio de modalidad', profile_changed: 'Cambio de perfil', student_edited: 'Datos del alumno editados', retired: 'Alumno retirado', observed: 'Inscripcion observada', resubmitted: 'Reenviado a FICO', created_from_token: 'Creado desde token de pago', validation_requested: 'Convalidacion solicitada', validation_applied: 'Convalidacion aplicada', installments_rescheduled: 'Cuotas reprogramadas', odoo_fee_paid: 'Cuota marcada pagada en Odoo', odoo_fees_activated: 'Cuotas Odoo activadas', token_inscription_edited: 'Inscripcion editada por asesor', token_grouped: 'Token agrupado', token_ungrouped: 'Token desagrupado', token_link_added: 'Link de pago colocado', token_link_edited: 'Link de pago editado' }
    return map[action] || action
  }

  return {
    formatMoney, formatDate, formatDateTime,
    statusPill, isPendiente, isContado, getReserva, getPagado, calcSaldo, rowClass, isOverdue,
    cuotaRowClass, cuotaStatusPill, cuotaStatusLabel,
    auditIcon, auditLabel
  }
}
