// Estado de una cuota a partir de su alias de catalogo. Conviven dos familias:
// we_payment_status_* (historica) y we_inst_* (Ediciones de FICO), por eso se
// mira el sufijo y no un alias exacto: comparar contra 'we_payment_status_paid'
// dejaba ~3,400 cuotas 'we_inst_paid' como no pagadas en Comercial.
export function resolveInstallmentStatus (statusAlias) {
  const alias = statusAlias || ''
  if (alias.includes('paid')) return 'paid'
  if (alias.includes('pending')) return 'pending'
  return 'draft'
}

// Cuota de sp_comercial_enrollment_get -> shape de summarizePayment (la misma
// regla de saldo que FICO): has_payment = tiene un pago activo.
export function toSummaryInstallment (cuota) {
  return {
    amount: cuota.amount,
    status: resolveInstallmentStatus(cuota.status_alias),
    cat_status: cuota.cat_status,
    _payment_id: cuota.has_payment ? true : null
  }
}
