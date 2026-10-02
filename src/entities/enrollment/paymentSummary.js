import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const fmt = useEnrollmentFormatters()

// Total, pagado y saldo de UNA inscripcion: la misma regla para la barra de
// Finanzas y la ficha lateral.
//
// Fase 3 (01/10/26): si la venta tiene cuotas, las tres cifras salen de ELLAS.
// Antes el total era enrollments.total_amount y el saldo total - max(pagado,
// reserva); auditado sobre 11,693 ventas aprobadas del clon, 171 daban mal:
//  - destino de RP/CC (total_amount 0): saldo 0 o negativo con cuotas por cobrar;
//  - origen retirado / reprogramado: deuda fantasma de cuotas anuladas o trasladadas;
//  - cuotas que suman mas que el total: saldo negativo;
//  - pago registrado con la cuota en estado viejo: se volvia a cobrar.
// Una cuota cuenta como cobrada si su estado es pagado O tiene un pago activo
// (_payment_id). Las anuladas (retiro / campaña) no cuentan para nada.
// Sin cuotas (data vieja) se usa la regla anterior del listado.
//
// pendingCollection: venta al contado aprobada cuya cuota sigue sin cobrarse
// (OS/OP: FICO aprueba contra la orden y la empresa deposita despues). Financials
// la usa para mostrar el formulario de cobro.
const isCollected = i => i.status === 'paid' || !!i._payment_id

export function summarizePayment ({ enrollment = null, detail = {}, installments = [], mode = 'view' } = {}) {
  const live = installments.filter(i => !fmt.isCuotaAnulada(i))
  const isContado = enrollment ? fmt.isContado(enrollment) : true
  const pendingCollection = isContado && mode !== 'confirm'
    ? live.find(i => !isCollected(i)) || null
    : null

  if (live.length) {
    const total = sum(live)
    const paid = sum(live.filter(isCollected))
    return { total, paid, balance: round2(total - paid), pendingCollection }
  }

  // Todas anuladas (retiro completo): no queda nada por cobrar.
  if (installments.length) return { total: 0, paid: 0, balance: 0, pendingCollection: null }

  // Sin cuotas (data vieja): la regla anterior del listado.
  const total = Number(enrollment?.total_to_pay) || Number(detail?.net_amount) || 0
  const paid = enrollment ? fmt.getPagado(enrollment) : Number(detail?.amount_paid) || 0
  const balance = enrollment ? fmt.calcSaldo(enrollment) : Number(detail?.balance_due) || 0
  return { total, paid, balance, pendingCollection }
}

const round2 = n => Math.round(n * 100) / 100
const sum = rows => round2(rows.reduce((acc, i) => acc + (Number(i.amount) || 0), 0))

// Avance de cobro 0-100 para la barra. Sin total (beca) no hay nada que cobrar.
export function paidPercent ({ total, paid }) {
  if (!(total > 0)) return 100
  return Math.min(100, Math.max(0, Math.round((paid / total) * 100)))
}
