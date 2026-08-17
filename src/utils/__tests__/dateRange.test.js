import { describe, it, expect } from 'vitest'
import { toIsoDay, inDateRange } from '../dateRange.js'

describe('toIsoDay', () => {
  it('normaliza los formatos que manda el SP', () => {
    expect(toIsoDay('2026-08-14')).toBe('2026-08-14')
    expect(toIsoDay('2026-08-14T05:00:00.000Z')).toBe('2026-08-14')
    expect(toIsoDay('14/08/2026')).toBe('2026-08-14')
  })

  it('devuelve vacio cuando no hay fecha', () => {
    expect(toIsoDay(null)).toBe('')
    expect(toIsoDay('')).toBe('')
    expect(toIsoDay('sin fecha')).toBe('')
  })
})

describe('inDateRange', () => {
  const rango = '2026-08-01 a 2026-08-14'

  it('incluye los bordes del rango', () => {
    expect(inDateRange('2026-08-01', rango)).toBe(true)
    expect(inDateRange('2026-08-14', rango)).toBe(true)
  })

  it('deja fuera lo anterior y lo posterior', () => {
    expect(inDateRange('2026-07-31', rango)).toBe(false)
    expect(inDateRange('2026-08-15', rango)).toBe(false)
  })

  // Mientras se elige el segundo dia flatpickr manda una sola fecha.
  it('trata una fecha suelta como rango de un dia', () => {
    expect(inDateRange('2026-08-14', '2026-08-14')).toBe(true)
    expect(inDateRange('2026-08-13', '2026-08-14')).toBe(false)
  })

  it('no deja pasar filas sin fecha ni rangos vacios', () => {
    expect(inDateRange(null, rango)).toBe(false)
    expect(inDateRange('2026-08-05', '')).toBe(false)
  })

  // El orden alfabetico solo equivale al cronologico si mes y dia van con cero.
  it('compara cruzando meses y anios', () => {
    expect(inDateRange('2026-09-02', '2026-08-30 a 2026-09-03')).toBe(true)
    expect(inDateRange('2026-01-05', '2025-12-28 a 2026-01-10')).toBe(true)
  })
})
