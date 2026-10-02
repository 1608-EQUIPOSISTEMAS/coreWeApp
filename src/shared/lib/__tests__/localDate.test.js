import { describe, it, expect } from 'vitest'
import { toLocalIsoDate, toCalendarIsoDate, addDaysIso, isPastDue } from '../localDate.js'

describe('toLocalIsoDate', () => {
  it('usa el día local, no el de UTC (20:30 sigue siendo hoy)', () => {
    expect(toLocalIsoDate(new Date(2026, 9, 1, 20, 30))).toBe('2026-10-01')
  })

  it('rellena mes y día con cero', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05')
  })
})

describe('toCalendarIsoDate', () => {
  it('una fecha de BD no se corre al día anterior (01/08 no es 31/07)', () => {
    expect(toCalendarIsoDate('2026-08-01')).toBe('2026-08-01')
    expect(toCalendarIsoDate('2026-08-01T05:00:00.000Z')).toBe('2026-08-01')
  })

  it('un Date se lee en hora local; vacío o inválido da null', () => {
    expect(toCalendarIsoDate(new Date(2026, 7, 1, 23, 0))).toBe('2026-08-01')
    expect([null, '', 'x'].map(toCalendarIsoDate)).toEqual([null, null, null])
  })
})

describe('addDaysIso', () => {
  it('correr 15 días suma 15, también cruzando mes y año', () => {
    expect(addDaysIso('2026-08-01', 15)).toBe('2026-08-16')
    expect(addDaysIso('2026-12-25', 10)).toBe('2027-01-04')
    expect(addDaysIso('2026-03-10', -10)).toBe('2026-02-28')
  })
})

describe('isPastDue', () => {
  const today = '2026-10-01'
  it('vencida = antes de hoy; la de hoy y la de mañana no', () => {
    expect(isPastDue('2026-09-30', today)).toBe(true)
    expect(isPastDue('2026-10-01', today)).toBe(false)
    expect(isPastDue('2026-10-02', today)).toBe(false)
  })

  it('entiende DD/MM/YYYY, ISO con hora y vacio', () => {
    expect(isPastDue('30/09/2026', today)).toBe(true)
    expect(isPastDue('01/10/2026', today)).toBe(false)
    expect(isPastDue('2026-10-01T05:00:00.000Z', today)).toBe(false)
    expect(isPastDue(null, today)).toBe(false)
  })
})
