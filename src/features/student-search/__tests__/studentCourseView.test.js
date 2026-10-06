import { describe, it, expect } from 'vitest'
import { statusTone, paymentView, summaryLine } from '../studentCourseView'

describe('studentCourseView', () => {
  it('tono por estado del aula', () => {
    expect(statusTone('Activo')).toBe('ok')
    expect(statusTone('Retirado')).toBe('bad')
    expect(statusTone('Reprogramado')).toBe('warn')
    expect(statusTone('Finalizado')).toBe('')
  })
  it('pago: cuotas vencidas mandan; venta en 0 no es deuda', () => {
    expect(paymentView({ fin_total: 900, fin_paid: 300, fin_overdue: 2 })).toEqual({ label: '2 cuotas vencidas', tone: 'bad' })
    expect(paymentView({ fin_total: 900, fin_paid: 300, fin_overdue: 1 }).label).toBe('1 cuota vencida')
    expect(paymentView({ fin_total: 0, fin_paid: 0, fin_overdue: 0 }).label).toBe('Sin costo')
    expect(paymentView({ fin_total: 900, fin_paid: 900, fin_overdue: 0 }).label).toBe('Pagado')
    expect(paymentView({ fin_total: 900, fin_paid: 300, fin_overdue: 0 }).label).toBe('Al día')
  })
  it('resumen: solo lo que no es cero, en singular o plural', () => {
    expect(summaryLine({ taken: 1, active: 0, approved: 0, certified: 0, exited: 0 })).toBe('1 curso llevado')
    expect(summaryLine({ taken: 5, active: 1, approved: 2, certified: 1, exited: 1 }))
      .toBe('5 cursos llevados · 1 en curso · 2 aprobados · 1 certificado · 1 salida (retiro, CC o RP)')
  })
})
