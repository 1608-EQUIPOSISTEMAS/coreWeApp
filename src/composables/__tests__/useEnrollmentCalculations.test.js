import { describe, it, expect } from 'vitest'
import { useEnrollmentCalculations } from '../useEnrollmentCalculations'

describe('useEnrollmentCalculations', () => {
  const calc = useEnrollmentCalculations()

  it('expone todas las funciones sin throw al instanciar', () => {
    expect(typeof calc.isOverdue).toBe('function')
    expect(typeof calc.isNextDue).toBe('function')
    expect(typeof calc.totalPlanSum).toBe('function')
    expect(typeof calc.totalPaidDisplay).toBe('function')
    expect(typeof calc.saldoPendienteDisplay).toBe('function')
  })

  describe('isOverdue', () => {
    it('la reserva nunca esta vencida', () => {
      expect(calc.isOverdue({ is_reserva: true, due_date: '01/01/2000' })).toBe(false)
    })

    it('una cuota pagada no esta vencida', () => {
      expect(calc.isOverdue({ due_date: '01/01/2000', status_alias: 'we_payment_status_paid' })).toBe(false)
    })

    it('cuota pendiente con fecha pasada esta vencida', () => {
      expect(calc.isOverdue({ due_date: '01/01/2000', status_alias: 'we_payment_status_pending' })).toBe(true)
    })

    it('cuota pendiente con fecha futura no esta vencida', () => {
      expect(calc.isOverdue({ due_date: '01/01/2999', status_alias: 'we_payment_status_pending' })).toBe(false)
    })

    it('sin due_date no esta vencida', () => {
      expect(calc.isOverdue({ status_alias: 'we_payment_status_pending' })).toBe(false)
    })
  })

  describe('isNextDue', () => {
    it('coincide con next_due_date y no esta pagada', () => {
      expect(calc.isNextDue({ due_date: '10/06/2026', status_alias: 'we_payment_status_pending' }, '10/06/2026')).toBe(true)
    })

    it('no es proxima si esta pagada aunque coincida la fecha', () => {
      expect(calc.isNextDue({ due_date: '10/06/2026', status_alias: 'we_payment_status_paid' }, '10/06/2026')).toBe(false)
    })

    it('no es proxima si la fecha no coincide', () => {
      expect(calc.isNextDue({ due_date: '11/06/2026', status_alias: 'we_payment_status_pending' }, '10/06/2026')).toBe(false)
    })
  })

  describe('totalPlanSum', () => {
    it('suma montos del plan y devuelve dos decimales', () => {
      const data = { installment_plan: [{ amount: 100 }, { amount: 50.5 }, { amount: '49.5' }] }
      expect(calc.totalPlanSum(data)).toBe('200.00')
    })

    it('devuelve 0 sin plan', () => {
      expect(calc.totalPlanSum(null)).toBe(0)
      expect(calc.totalPlanSum({})).toBe(0)
    })
  })

  describe('totalPaidDisplay', () => {
    it('devuelve 0 sin data', () => {
      expect(calc.totalPaidDisplay(null)).toBe(0)
    })

    it('usa total_paid del SP cuando es mayor', () => {
      const data = { total_paid: 500, installment_plan: [{ is_reserva: true, status_alias: 'we_payment_status_paid', amount: 100 }] }
      expect(calc.totalPaidDisplay(data)).toBe(500)
    })

    it('incluye la reserva pagada cuando el SP no la sumo', () => {
      const data = { total_paid: 0, installment_plan: [{ is_reserva: true, status_alias: 'we_payment_status_paid', amount: 300 }] }
      expect(calc.totalPaidDisplay(data)).toBe(300)
    })

    it('ignora reserva no pagada', () => {
      const data = { total_paid: 50, installment_plan: [{ is_reserva: true, status_alias: 'we_payment_status_pending', amount: 300 }] }
      expect(calc.totalPaidDisplay(data)).toBe(50)
    })
  })

  describe('saldoPendienteDisplay', () => {
    it('devuelve 0 sin data', () => {
      expect(calc.saldoPendienteDisplay(null)).toBe(0)
    })

    it('resta lo pagado del total', () => {
      const data = { total_amount: 1000, total_paid: 400, installment_plan: [] }
      expect(calc.saldoPendienteDisplay(data)).toBe(600)
    })

    it('nunca devuelve negativo', () => {
      const data = { total_amount: 100, total_paid: 500, installment_plan: [] }
      expect(calc.saldoPendienteDisplay(data)).toBe(0)
    })
  })
})
