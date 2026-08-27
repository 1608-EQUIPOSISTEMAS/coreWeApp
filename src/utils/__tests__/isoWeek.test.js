import { describe, it, expect } from 'vitest'
import { isoWeekOf } from '../isoWeek'

describe('isoWeekOf', () => {
  it('numera igual que la hoja Seguimiento Docentes (SEM 23 = 01/06 - 07/06)', () => {
    expect(isoWeekOf('2026-06-03')).toMatchObject({
      week: 23, monday: '2026-06-01', sunday: '2026-06-07'
    })
    expect(isoWeekOf('2026-06-11').week).toBe(24)
  })

  it('el jueves manda en el cambio de anio', () => {
    // 01/01/2026 es jueves: su semana arranca el 29/12/2025 y es la SEM 1.
    expect(isoWeekOf('2026-01-01')).toMatchObject({ year: 2026, week: 1, monday: '2025-12-29' })
    // 01/01/2027 es viernes: sigue perteneciendo a la SEM 53 de 2026.
    expect(isoWeekOf('2027-01-01')).toMatchObject({ year: 2026, week: 53, monday: '2026-12-28' })
  })

  it('la clave agrupa por anio ISO, no por anio calendario', () => {
    expect(isoWeekOf('2026-12-31').key).toBe(isoWeekOf('2027-01-01').key)
  })
})
