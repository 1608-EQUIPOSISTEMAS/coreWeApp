import { describe, it, expect } from 'vitest'
import { enrollmentVerdict, paymentVerdict, gradeVerdict } from '../enrollmentVerdict.js'

describe('enrollmentVerdict', () => {
  it('un retiro ya no sale en verde aunque active = Y', () => {
    // Antes: pill verde con el texto "R".
    const v = enrollmentVerdict({ typeStatusAlias: 'we_enrollment_status_retired', ficoStatusAlias: 'we_enrollment_status_checked', active: 'Y' })
    expect(v).toMatchObject({ label: 'Retirado', tone: 'bad' })
  })

  it('RP y CC dicen que lo vigente esta en la nueva inscripcion', () => {
    expect(enrollmentVerdict({ typeStatusAlias: 'we_enrollment_status_reprogrammed', active: 'Y' }).label).toBe('Reprogramado')
    expect(enrollmentVerdict({ typeStatusAlias: 'we_enrollment_status_course_changed', active: 'Y' }).label).toBe('Cambio de curso')
  })

  it('activa: muestra el estado de FICO, incluido "en revision"', () => {
    expect(enrollmentVerdict({ typeStatusAlias: 'we_inscription_way_act', ficoStatusAlias: 'we_enrollment_status_pending', active: 'Y' }))
      .toMatchObject({ label: 'En revisión de FICO', tone: 'warn' })
    expect(enrollmentVerdict({ typeStatusAlias: 'we_inscription_way_act', ficoStatusAlias: 'we_enrollment_status_checked', active: 'Y' }).tone).toBe('ok')
  })

  it('anulada manda sobre todo', () => {
    expect(enrollmentVerdict({ typeStatusAlias: 'we_inscription_way_act', ficoStatusAlias: 'we_enrollment_status_checked', active: 'N' }).label).toBe('Anulada')
  })
})

describe('paymentVerdict', () => {
  it('saldo 0: pago todo', () => {
    expect(paymentVerdict({ summary: { total: 315, paid: 315, balance: 0 } }).key).toBe('paid')
  })

  it('cuota vencida manda sobre "al dia"', () => {
    const v = paymentVerdict({ summary: { total: 1000, paid: 400, balance: 600 }, overdue: { amount: 300, dueDate: '15/09/2026' } })
    expect(v).toMatchObject({ key: 'overdue', tone: 'bad', amount: 300, dueDate: '15/09/2026' })
  })

  it('nada cobrado: aun no paga', () => {
    expect(paymentVerdict({ summary: { total: 500, paid: 0, balance: 500 } })).toMatchObject({ key: 'unpaid', amount: 500 })
  })

  it('pago parte y no debe nada vencido: al dia con la proxima cuota', () => {
    const v = paymentVerdict({ summary: { total: 1000, paid: 400, balance: 600 }, next: { amount: 300, dueDate: '15/11/2026' } })
    expect(v).toMatchObject({ key: 'on_track', amount: 600, dueDate: '15/11/2026' })
  })

  it('beca (total 0): sin monto a pagar', () => {
    expect(paymentVerdict({ summary: { total: 0, paid: 0, balance: 0 } }).key).toBe('free')
  })
})

describe('gradeVerdict', () => {
  it('aprueba con 12 (PASS_THRESHOLD del aula), no con 14', () => {
    expect(gradeVerdict({ finalGrade: 12 })).toEqual({ label: '12', tone: 'ok' })
    expect(gradeVerdict({ finalGrade: '11.5' })).toEqual({ label: '11.5', tone: 'bad' })
  })
  it('sin nota cargada: "En curso" si la edicion sigue abierta, nada si ya cerro', () => {
    expect(gradeVerdict({ finalGrade: null, editionEnded: false })).toMatchObject({ label: 'En curso' })
    expect(gradeVerdict({ finalGrade: null, editionEnded: true })).toBeNull()
  })
})
