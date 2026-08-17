import { describe, it, expect } from 'vitest'
import {
  buildColumns, isoWeekStart, lastPointUpTo, monthEnd, sparkPoints, todayLocal
} from '../useSocialGrowth.js'

describe('buildColumns', () => {
  const HOY = '2026-08-14'

  it('un rango corto sale por semanas, empezando en el lunes', () => {
    const cols = buildColumns('2026-08-03', '2026-08-14', HOY)
    expect(cols.map(c => c.kind)).toEqual(['week', 'week'])
    expect(cols.map(c => c.boundary)).toEqual(['2026-08-03', '2026-08-10'])
    expect(cols[0].label).toBe('03/08')
  })

  it('los presets de 7 y 30 días quedan en semanas', () => {
    expect(buildColumns('2026-08-08', '2026-08-14', HOY).every(c => c.kind === 'week')).toBe(true)
    expect(buildColumns('2026-07-16', '2026-08-14', HOY).every(c => c.kind === 'week')).toBe(true)
  })

  it('pasa a meses cuando el rango supera las 26 semanas', () => {
    // El corte existe para que "el último año" no devuelva 52 columnas.
    const cols = buildColumns('2026-01-01', '2026-08-14', HOY)
    expect(cols.every(c => c.kind === 'month')).toBe(true)
    expect(cols.map(c => c.label)).toEqual(
      ['Ene 26', 'Feb 26', 'Mar 26', 'Abr 26', 'May 26', 'Jun 26', 'Jul 26', 'Ago 26'])
  })

  it('las columnas de meses cierran en el último día del mes', () => {
    const cols = buildColumns('2026-01-01', '2026-08-14', HOY)
    expect(cols[0].boundary).toBe('2026-01-31')
    expect(cols[1].boundary).toBe('2026-02-28')
  })

  it('cruza el cambio de año sin repetir meses', () => {
    const cols = buildColumns('2025-11-01', '2026-08-14', HOY)
    expect(cols[0].label).toBe('Nov 25')
    expect(cols[2].label).toBe('Ene 26')
    expect(new Set(cols.map(c => c.key)).size).toBe(cols.length)
  })

  it('marca como futuras las columnas que todavía no llegaron', () => {
    const cols = buildColumns('2026-01-01', '2026-12-31', HOY)
    expect(cols.find(c => c.label === 'Ago 26').future).toBe(false)
    expect(cols.find(c => c.label === 'Sep 26').future).toBe(true)
  })

  it('un rango inválido o incompleto no rompe: devuelve vacío', () => {
    expect(buildColumns(null, '2026-08-14', HOY)).toEqual([])
    expect(buildColumns('2026-08-14', null, HOY)).toEqual([])
    expect(buildColumns('2026-08-14', '2026-08-01', HOY)).toEqual([])
  })
})

describe('monthEnd', () => {
  it('da el último día de cada mes', () => {
    expect(monthEnd(2026, 1)).toBe('2026-01-31')
    expect(monthEnd(2026, 8)).toBe('2026-08-31')
    expect(monthEnd(2026, 4)).toBe('2026-04-30')
  })

  it('resuelve febrero bisiesto', () => {
    expect(monthEnd(2026, 2)).toBe('2026-02-28')
    expect(monthEnd(2028, 2)).toBe('2028-02-29')
  })

  it('diciembre no se pasa al año siguiente', () => {
    // Date.UTC(2026, 12, 0) desborda a enero de 2027 si el offset está mal.
    expect(monthEnd(2026, 12)).toBe('2026-12-31')
  })
})

describe('todayLocal', () => {
  it('usa el calendario local y no UTC', () => {
    // 31/12 a las 21:00 en un huso al oeste de Greenwich ya es 01/01 en UTC:
    // con toISOString() a secas el año entero se correría un día.
    const local = new Date(2026, 11, 31, 21, 0, 0)
    expect(todayLocal(local)).toBe('2026-12-31')
  })
})

const puntos = (...semanas) =>
  new Map(semanas.map(([week_start, followers]) => [week_start, { week_start, followers }]))

describe('lastPointUpTo', () => {
  it('toma la medición más reciente que no pase de la semana pedida', () => {
    const p = puntos(['2026-07-27', 100], ['2026-08-03', 200], ['2026-08-10', 300])
    expect(lastPointUpTo(p, '2026-08-03').followers).toBe(200)
  })

  it('arrastra el último valor conocido cuando la semana no se midió', () => {
    // Es la regla que sostiene el total por marca: una semana sin cargar no
    // significa que la cuenta perdiera a todos sus seguidores.
    const p = puntos(['2026-07-27', 100])
    expect(lastPointUpTo(p, '2026-08-10').followers).toBe(100)
  })

  it('no mira hacia el futuro', () => {
    // Si mirara adelante, retroceder de semana con las flechas mostraría datos
    // que en ese momento todavía no existían.
    const p = puntos(['2026-08-10', 300])
    expect(lastPointUpTo(p, '2026-08-03')).toBeNull()
  })

  it('sin mediciones devuelve null y no 0', () => {
    expect(lastPointUpTo(new Map(), '2026-08-10')).toBeNull()
  })
})

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
