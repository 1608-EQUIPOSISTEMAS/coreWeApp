import { describe, it, expect } from 'vitest'
import { summarizePayment, paidPercent } from '../paymentSummary.js'

const PP = { payment_type: 'PC', confirmation: 'Aprobado' }
const PT = { payment_type: 'PT', confirmation: 'Aprobado' }
const ANULADA = 4456

describe('summarizePayment — desde las cuotas (Fase 3)', () => {
  it('destino de RP (total_amount 0): el saldo son las cuotas trasladadas sin cobrar', () => {
    // Caso 16643: 4 cuotas trasladadas, ninguna cobrada; antes daba saldo 0.
    const r = summarizePayment({
      enrollment: { ...PP, total_to_pay: 0, paid_amount: 0 },
      installments: [{ amount: 260, status: 'pending' }, { amount: 260, status: 'pending' }, { amount: 260, status: 'pending' }, { amount: 262, status: 'pending' }]
    })
    expect(r).toMatchObject({ total: 1042, paid: 0, balance: 1042 })
  })

  it('origen reprogramado / retirado: las cuotas anuladas no son deuda', () => {
    // Caso 234: total_amount 815, solo 250 vivos y cobrados; antes "debia" 565.
    const r = summarizePayment({
      enrollment: { ...PP, total_to_pay: 815, paid_amount: 250 },
      installments: [{ amount: 250, status: 'paid' }, { amount: 565, cat_status: ANULADA }]
    })
    expect(r).toMatchObject({ total: 250, paid: 250, balance: 0 })
  })

  it('pago registrado con la cuota en estado viejo cuenta como cobrado', () => {
    const r = summarizePayment({
      enrollment: { ...PP, total_to_pay: 412 },
      installments: [{ amount: 262, status: 'paid' }, { amount: 150, status: 'pending', _payment_id: 9089 }]
    })
    expect(r).toMatchObject({ total: 412, paid: 412, balance: 0 })
  })

  it('cuotas que suman mas que el total: nunca saldo negativo', () => {
    // Caso 866: total_amount 720 con 800 en cuotas cobradas; antes saldo -80.
    const r = summarizePayment({
      enrollment: { ...PP, total_to_pay: 720 },
      installments: [{ amount: 400, status: 'paid' }, { amount: 400, status: 'paid' }]
    })
    expect(r).toMatchObject({ total: 800, paid: 800, balance: 0 })
  })

  it('suma al centimo sin arrastrar decimales de punto flotante', () => {
    const r = summarizePayment({ enrollment: PP, installments: [{ amount: 0.1, status: 'paid' }, { amount: 0.2, status: 'pending' }] })
    expect(r).toMatchObject({ total: 0.3, paid: 0.1, balance: 0.2 })
  })

  it('todas anuladas (retiro completo): nada por cobrar', () => {
    const r = summarizePayment({ enrollment: { ...PP, total_to_pay: 720 }, installments: [{ amount: 720, cat_status: ANULADA }] })
    expect(r).toMatchObject({ total: 0, paid: 0, balance: 0, pendingCollection: null })
  })
})

describe('summarizePayment — contado y respaldo', () => {
  it('contado aprobado con la cuota sin cobrar (OS/OP): pagado 0, saldo = la cuota', () => {
    const r = summarizePayment({ enrollment: { ...PT, total_to_pay: 500 }, installments: [{ amount: 500, status: 'pending' }] })
    expect(r).toMatchObject({ total: 500, paid: 0, balance: 500 })
    expect(r.pendingCollection).not.toBeNull()
  })

  it('contado cobrado con estado viejo (_payment_id) no queda pendiente', () => {
    const r = summarizePayment({ enrollment: { ...PT, total_to_pay: 500 }, installments: [{ amount: 500, status: 'pending', _payment_id: 9 }] })
    expect(r).toMatchObject({ paid: 500, balance: 0, pendingCollection: null })
  })

  it('en modo confirmar no hay formulario de cobro pendiente', () => {
    const r = summarizePayment({ enrollment: { payment_type: 'PT', total_to_pay: 500 }, installments: [{ amount: 500, status: 'pending' }], mode: 'confirm' })
    expect(r.pendingCollection).toBeNull()
  })

  it('sin cuotas (data vieja) usa la regla anterior del listado', () => {
    const r = summarizePayment({ enrollment: { ...PP, total_to_pay: 1000, paid_amount: 400, reservation_amount: 200 } })
    expect(r).toMatchObject({ total: 1000, paid: 400, balance: 600 })
  })
})

describe('paidPercent', () => {
  it('redondea, topa en 100 y una beca (total 0) cuenta como completa', () => {
    expect(paidPercent({ total: 1000, paid: 400 })).toBe(40)
    expect(paidPercent({ total: 1000, paid: 1200 })).toBe(100)
    expect(paidPercent({ total: 0, paid: 0 })).toBe(100)
  })
})
