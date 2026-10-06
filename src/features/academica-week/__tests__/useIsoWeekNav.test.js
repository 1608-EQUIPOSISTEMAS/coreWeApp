import { describe, it, expect } from 'vitest'
import { formatDayMonth, weekRangeLabel, shiftWeek, useIsoWeekNav } from '../useIsoWeekNav.js'
import { isoWeekOf } from '@/utils/isoWeek'

describe('shiftWeek', () => {
  it('avanza y retrocede de lunes a lunes', () => {
    expect(shiftWeek('2026-06-01', 1)).toBe('2026-06-08')
    expect(shiftWeek('2026-06-01', -1)).toBe('2026-05-25')
  })

  it('cruza de la SEM 53 de 2026 a la SEM 1 de 2027 sin saltarse ninguna', () => {
    const next = shiftWeek('2026-12-28', 1)
    expect(isoWeekOf('2026-12-28')).toMatchObject({ year: 2026, week: 53 })
    expect(isoWeekOf(next)).toMatchObject({ year: 2027, week: 1, monday: '2027-01-04' })
  })
})

describe('weekRangeLabel', () => {
  it('arma el rango sin correr el dia (01/06 no es 31/05)', () => {
    expect(weekRangeLabel('2026-06-01', '2026-06-07')).toBe('1 jun al 7 jun 2026')
  })

  it('el anio que se muestra es el del domingo', () => {
    expect(weekRangeLabel('2025-12-29', '2026-01-04')).toBe('29 dic al 4 ene 2026')
  })

  it('vacio mientras no hay rango', () => {
    expect(weekRangeLabel(null, '2026-06-07')).toBe('')
  })
})

describe('formatDayMonth', () => {
  it('dia/mes sin ceros y sin corrimiento UTC', () => {
    expect(formatDayMonth('2026-08-01')).toBe('1/8')
    expect(formatDayMonth('2026-08-01T00:00:00.000Z')).toBe('1/8')
    expect(formatDayMonth(null)).toBe('')
  })
})

describe('useIsoWeekNav', () => {
  it('arranca en la semana de hoy y vuelve a ella', () => {
    const nav = useIsoWeekNav()
    const today = isoWeekOf(nav.todayYmd)
    expect(nav.monday.value).toBe(today.monday)
    nav.move(-2)
    expect(nav.monday.value).toBe(shiftWeek(today.monday, -2))
    nav.goToday()
    expect(nav.week.value).toBe(today.week)
    expect(nav.year.value).toBe(today.year)
    expect(nav.sunday.value).toBe(today.sunday)
  })
})
