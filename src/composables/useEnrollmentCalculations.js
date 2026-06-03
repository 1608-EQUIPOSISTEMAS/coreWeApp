// Calculos puros del plan de pagos / saldos de una inscripcion. Sin estado
// reactivo propio: cada funcion recibe el objeto de inscripcion (o la cuota)
// y devuelve un valor derivado, apta para testear de forma aislada. Logica
// extraida de views/comercial/Leads.vue.
export function useEnrollmentCalculations () {

  // ¿Está vencida? (fecha pasada y no pagada). La reserva nunca se marca vencida.
  const isOverdue = (cuota) => {
    if (cuota.is_reserva) return false
    if (!cuota.due_date || cuota.status_alias === 'we_payment_status_paid') return false
    const [d, m, y] = cuota.due_date.split('/')
    return new Date(`${y}-${m}-${d}`) < new Date()
  }

  // ¿Es la próxima a vencer? (coincide con next_due_date del SP)
  const isNextDue = (cuota, nextDueDate) => {
    return cuota.due_date === nextDueDate &&
           cuota.status_alias !== 'we_payment_status_paid'
  }

  // Suma total del plan
  const totalPlanSum = (data) => {
    if (!data?.installment_plan) return 0
    return data.installment_plan
      .reduce((acc, c) => acc + Number(c.amount || 0), 0)
      .toFixed(2)
  }

  // Pagado real: el SP no siempre suma el inicial/reserva cuando ya se confirmo.
  // Consolida: si existe cuota reserva en estado paid, se incluye en el total.
  const totalPaidDisplay = (data) => {
    if (!data) return 0
    const spPaid = Number(data.total_paid) || 0
    const reservaRow = (data.installment_plan || []).find(c => c.is_reserva)
    const reservaPaid = reservaRow && reservaRow.status_alias === 'we_payment_status_paid'
      ? Number(reservaRow.amount) || 0
      : 0
    return Math.max(spPaid, reservaPaid)
  }

  const saldoPendienteDisplay = (data) => {
    if (!data) return 0
    return Math.max(0, Number(data.total_amount || 0) - Number(totalPaidDisplay(data) || 0))
  }

  return {
    isOverdue,
    isNextDue,
    totalPlanSum,
    totalPaidDisplay,
    saldoPendienteDisplay
  }
}
