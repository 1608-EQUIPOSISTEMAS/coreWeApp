import { describe, it, expect } from 'vitest'
import { toLocalIsoDate } from '../localDate.js'

describe('toLocalIsoDate', () => {
  it('usa el día local, no el de UTC (20:30 sigue siendo hoy)', () => {
    expect(toLocalIsoDate(new Date(2026, 9, 1, 20, 30))).toBe('2026-10-01')
  })

  it('rellena mes y día con cero', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05')
  })
})
