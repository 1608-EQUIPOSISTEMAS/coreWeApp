import { describe, it, expect } from 'vitest'
import { resolveInstallmentStatus, toSummaryInstallment } from '../installmentStatus.js'
import { summarizePayment } from '../paymentSummary.js'

describe('resolveInstallmentStatus', () => {
  it('reconoce las dos familias de alias', () => {
    expect(resolveInstallmentStatus('we_payment_status_paid')).toBe('paid')
    expect(resolveInstallmentStatus('we_inst_paid')).toBe('paid')
    expect(resolveInstallmentStatus('we_inst_pending')).toBe('pending')
    expect(resolveInstallmentStatus('we_payment_status_draft')).toBe('draft')
    expect(resolveInstallmentStatus(null)).toBe('draft')
  })
})

describe('plan de Comercial con la regla de saldo de FICO', () => {
  it('venta 16158: cuotas we_inst_paid cuentan como pagadas y la anulada no suma', () => {
    // Antes Comercial mostraba pagado 100 y saldo 1,905 (solo miraba la reserva).
    const plan = [
      { amount: 100, status_alias: 'we_payment_status_paid', cat_status: 2471, has_payment: true },
      { amount: 250, status_alias: 'we_inst_paid', cat_status: 4454, has_payment: true },
      { amount: 1459, status_alias: 'we_inst_paid', cat_status: 4454, has_payment: true },
      { amount: 196, status_alias: 'we_inst_cancelled', cat_status: 4456, has_payment: false }
    ]
    const r = summarizePayment({ detail: { net_amount: 2005, amount_paid: 0 }, installments: plan.map(toSummaryInstallment) })
    expect(r).toMatchObject({ total: 1809, paid: 1809, balance: 0 })
  })

  it('cuota pendiente con pago activo (estado viejo) cuenta como cobrada', () => {
    const plan = [{ amount: 395, status_alias: 'we_payment_status_pending', cat_status: 2470, has_payment: true }]
    expect(summarizePayment({ installments: plan.map(toSummaryInstallment) })).toMatchObject({ paid: 395, balance: 0 })
  })
})
