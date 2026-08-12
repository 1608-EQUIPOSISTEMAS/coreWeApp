import { describe, it, expect } from 'vitest'
import { isoWeekStart, sparkPoints } from '../useSocialGrowth.js'

describe('isoWeekStart', () => {
  it('lleva cualquier día de la semana a su lunes', () => {
    expect(isoWeekStart(new Date(2026, 7, 12))).toBe('2026-08-10') // miércoles
    expect(isoWeekStart(new Date(2026, 7, 10))).toBe('2026-08-10') // lunes
    expect(isoWeekStart(new Date(2026, 7, 16))).toBe('2026-08-10') // domingo
  })

  it('cruza el cambio de año sin partir la semana', () => {
    expect(isoWeekStart(new Date(2026, 0, 1))).toBe('2025-12-29')
    expect(isoWeekStart(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('coincide con el isoWeekStart del backend', () => {
    // Las dos implementaciones tienen que dar el mismo lunes o el frontend
    // pediría una semana y el backend guardaría otra.
    const casos = ['2026-08-12', '2026-01-01', '2025-12-29', '2026-03-01']
    for (const ymd of casos) {
      const [y, m, d] = ymd.split('-').map(Number)
      const utc = new Date(Date.UTC(y, m - 1, d))
      const esperado = new Date(utc.getTime() - ((utc.getUTCDay() + 6) % 7) * 86400000)
        .toISOString().slice(0, 10)
      expect(isoWeekStart(new Date(y, m - 1, d))).toBe(esperado)
    }
  })
})

describe('sparkPoints', () => {
  it('normaliza la serie a la caja, con el máximo arriba', () => {
    // y=0 es el borde superior del SVG, así que el valor más alto va a 0.
    expect(sparkPoints([10, 20], 100, 50)).toBe('0.0,50.0 100.0,0.0')
  })

  it('reparte los puntos parejo en el eje x', () => {
    const xs = sparkPoints([1, 2, 3], 100, 10).split(' ').map(p => p.split(',')[0])
    expect(xs).toEqual(['0.0', '50.0', '100.0'])
  })

  it('con un solo valor dibuja una línea plana, no NaN', () => {
    // vals.length - 1 = 0 divide por cero: sin la guarda salían coordenadas NaN
    // y el polyline desaparecía sin ningún error visible.
    const points = sparkPoints([500], 160, 60)
    expect(points).toBe('0,30 160,30')
    expect(points).not.toContain('NaN')
  })

  it('con una serie plana no divide por cero', () => {
    expect(sparkPoints([7, 7, 7], 100, 40)).not.toContain('NaN')
  })

  it('sin datos devuelve vacío', () => {
    expect(sparkPoints([])).toBe('')
  })
})
