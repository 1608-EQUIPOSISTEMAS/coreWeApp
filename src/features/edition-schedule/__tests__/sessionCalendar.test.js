import { describe, it, expect } from 'vitest'
import { allowedDaysOf, sessionCalendar, sessionEndDate, weekdayOf } from '../sessionCalendar'

describe('allowedDaysOf', () => {
  it('lee el JSON de variable_2', () => {
    expect(allowedDaysOf({ variable_2: '[1,3]', description: 'X' })).toEqual([1, 3])
  })
  it('si variable_2 falta o esta roto, lee la descripcion', () => {
    expect(allowedDaysOf({ variable_2: '{roto', description: 'Lun - Mié - Vie' })).toEqual([1, 3, 5])
    expect(allowedDaysOf({ description: 'SÁBADO' })).toEqual([6])
  })
  it('sin combo, sin dias', () => {
    expect(allowedDaysOf(null)).toEqual([])
  })
})

describe('sessionCalendar / sessionEndDate', () => {
  // 2026-10-05 es lunes. Lun-Mie, 4 sesiones: 5, 7, 12, 14.
  const base = { startDate: '2026-10-05', sessions: 4, allowedDays: [1, 3] }

  it('cuenta solo los dias del horario', () => {
    expect(sessionCalendar(base).map((d) => d.date)).toEqual(['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14'])
    expect(sessionEndDate(base)).toBe('2026-10-14')
  })

  it('un feriado en dia de clase se lista pero no cuenta: el fin se corre', () => {
    const holidays = new Map([['2026-10-07', 'Feriado X']])
    const cal = sessionCalendar({ ...base, holidays })
    expect(cal[1]).toEqual({ date: '2026-10-07', status: 'holiday', sessionNum: '-', desc: 'Feriado X' })
    expect(cal.filter((d) => d.status === 'valid').map((d) => d.sessionNum)).toEqual([1, 2, 3, 4])
    expect(sessionEndDate({ ...base, holidays })).toBe('2026-10-19')
  })

  it('un feriado que no es dia de clase no aparece', () => {
    expect(sessionCalendar({ ...base, holidays: new Map([['2026-10-08', 'Angamos']]) })).toHaveLength(4)
  })

  it('cruza fin de mes y de año sin correrse un dia', () => {
    expect(sessionEndDate({ startDate: '2026-12-31', sessions: 2, allowedDays: [4] })).toBe('2027-01-07')
    expect(weekdayOf('2026-12-31')).toBe(4)
  })

  it('sin datos suficientes no inventa fecha', () => {
    expect(sessionEndDate({ ...base, sessions: 0 })).toBeNull()
    expect(sessionEndDate({ ...base, allowedDays: [] })).toBeNull()
    expect(sessionEndDate({ ...base, startDate: null })).toBeNull()
  })
})
