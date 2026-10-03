import { describe, it, expect } from 'vitest'
import {
  snapToKeyDate, autoInstallmentCount, splitAmounts,
  buildAutoInstallmentPlan, seedManualPlan, mergeDeferredReserve
} from '../installmentPlan.js'

const ESP = 'we_program_type_specialization'
const PEE = 'we_program_type_pee'
const dates = plan => plan.map(c => c.due_date)

describe('snapToKeyDate', () => {
  it('toma la primera fecha clave en o despues del minimo', () => {
    expect(snapToKeyDate('2026-10-17', [1, 15, 30])).toBe('2026-10-30')
    expect(snapToKeyDate('2026-10-31', [1, 15])).toBe('2026-11-01')
  })
  it('el 30 de febrero cae en el ultimo dia del mes', () => {
    expect(snapToKeyDate('2027-02-22', [1, 15, 30])).toBe('2027-02-28')
  })
})

describe('autoInstallmentCount', () => {
  it('cursos 1, PEE 2/3, diplomado 4/5, especializacion segun modulos', () => {
    expect(autoInstallmentCount({ categoryAlias: 'we_program_type_course' })).toBe(1)
    expect(autoInstallmentCount({ categoryAlias: PEE, sessionsPerWeek: 1 })).toBe(3)
    expect(autoInstallmentCount({ categoryAlias: 'we_program_type_diploma', sessionsPerWeek: 2 })).toBe(4)
    expect(autoInstallmentCount({ categoryAlias: ESP, childrenCount: 2 })).toBe(2)
    expect(autoInstallmentCount({ categoryAlias: ESP, childrenCount: 4, sessionsPerWeek: 1 })).toBe(3)
  })
})

describe('splitAmounts', () => {
  it('piso para todas y el resto en la ultima', () => {
    expect(splitAmounts(1000, 3)).toEqual([333, 333, 334])
    expect(splitAmounts(100.5, 2)).toEqual([50, 50.5])
  })
})

describe('buildAutoInstallmentPlan', () => {
  it('curso: una cuota a los 6 dias del inicio', () => {
    expect(dates(buildAutoInstallmentPlan({ balance: 300, count: 1, start: '2026-10-10', categoryAlias: 'we_program_type_course' })))
      .toEqual(['2026-10-16'])
  })

  it('especializacion: regla de Comercial, la cuota 2 puede quedar pegada (30 -> 1)', () => {
    // Decision de negocio 02/10/26: B2B/Fundacion exigian +14 dias.
    const plan = buildAutoInstallmentPlan({ balance: 900, count: 3, start: '2026-10-10', categoryAlias: ESP })
    expect(dates(plan)).toEqual(['2026-10-30', '2026-11-01', '2026-11-15'])
    expect(plan.map(c => c.amount)).toEqual([300, 300, 300])
  })

  it('especializacion con 2+ sesiones por semana tambien va a fechas clave', () => {
    expect(dates(buildAutoInstallmentPlan({ balance: 600, count: 2, start: '2026-10-10', categoryAlias: ESP, sessionsPerWeek: 3 })))
      .toEqual(['2026-10-30', '2026-11-01'])
  })

  it('PEE regular: 15 del mes siguiente y luego el 1; un inicio 31/01 no salta febrero', () => {
    expect(dates(buildAutoInstallmentPlan({ balance: 900, count: 3, start: '2026-01-31', categoryAlias: PEE })))
      .toEqual(['2026-02-15', '2026-03-01', '2026-04-01'])
  })

  it('PEE intensivo: a los 15 dias y luego cada 20', () => {
    expect(dates(buildAutoInstallmentPlan({ balance: 600, count: 2, start: '2026-10-10', categoryAlias: PEE, sessionsPerWeek: 2 })))
      .toEqual(['2026-10-25', '2026-11-14'])
  })

  it('sin edicion usa hoy; sin saldo no hay plan', () => {
    expect(dates(buildAutoInstallmentPlan({ balance: 300, count: 1, today: '2026-12-29', categoryAlias: 'we_program_type_course' })))
      .toEqual(['2027-01-04'])
    expect(buildAutoInstallmentPlan({ balance: 0, count: 2, start: '2026-10-10', categoryAlias: ESP })).toEqual([])
  })
})

describe('seedManualPlan', () => {
  it('reusa las fechas del automatico y extiende al dia 1 de los meses siguientes', () => {
    const autoPlan = [{ due_date: '2026-10-30' }, { due_date: '2026-11-01' }]
    const plan = seedManualPlan({ balance: 1000, count: 4, autoPlan, today: '2026-10-02' })
    expect(dates(plan)).toEqual(['2026-10-30', '2026-11-01', '2026-12-01', '2027-01-01'])
    expect(plan.map(c => c.amount)).toEqual([250, 250, 250, 250])
  })
  it('una ultima fecha el 30/01 extiende a febrero, no a marzo', () => {
    const plan = seedManualPlan({ balance: 200, count: 2, autoPlan: [{ due_date: '2026-01-30' }], today: '2026-01-01' })
    expect(dates(plan)).toEqual(['2026-01-30', '2026-02-01'])
  })
})

describe('mergeDeferredReserve', () => {
  it('la parte diferida de la reserva entra ordenada por fecha y renumerada', () => {
    const plan = [{ installment_number: 1, amount: 300, due_date: '2026-10-30' }]
    const merged = mergeDeferredReserve(plan, { amount: 50, dueDate: '2026-10-09' })
    expect(merged.map(c => [c.installment_number, c.amount, c.due_date])).toEqual([[1, 50, '2026-10-09'], [2, 300, '2026-10-30']])
    expect(merged[0].is_reserva_diferida).toBe(true)
  })
  it('sin monto o sin fecha no cambia el plan', () => {
    const plan = [{ installment_number: 1, amount: 300, due_date: '2026-10-30' }]
    expect(mergeDeferredReserve(plan, { amount: 0, dueDate: '2026-10-09' })).toBe(plan)
  })
})
