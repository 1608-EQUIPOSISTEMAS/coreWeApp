import { describe, it, expect } from 'vitest'
import {
  heatTone,
  goalTone,
  conversionTone,
  monthTotals,
  asesoresReport,
  dailyWeek,
  averageByWeekday,
  periodOf,
  referenceWeek
} from '../planComercial.js'

const week = (over) => ({
  week_label: 'S36', date_start: '2026-09-01', date_end: '2026-09-06',
  obj_vacantes: null, obj_ingresos: null, vacantes: 0, ingresos_pen: 0, ingresos_usd: 0, ...over
})

describe('tonos', () => {
  it('el mapa de calor premia pasar el 120% y bajo el 80% va en rosado fuerte', () => {
    expect([1.2, 1, 0.99, 0.8, 0.79, null].map(heatTone)).toEqual(['top', 'ok', 'rose', 'rose', 'rose-strong', 'neutro'])
  })
  it('no llegar al objetivo es rosado, no rojo', () => {
    expect([1, 0.99, null].map(goalTone)).toEqual(['ok', 'rose', 'neutro'])
  })
  it('la conversion se juzga en porcentaje entero contra el 15%', () => {
    expect(conversionTone(0.149)).toBe('warn') // 14,9% se redondea a 15%
    expect(conversionTone(0.144)).toBe('bad')
    expect(conversionTone(0.16)).toBe('ok')
    expect(conversionTone(null)).toBe('neutro')
  })
})

describe('periodOf', () => {
  it('escribe el tramo como el Sheet', () => {
    expect(periodOf({ date_start: '2026-09-01', date_end: '2026-09-06' })).toBe('1-6')
    expect(periodOf({ date_start: '2026-08-31', date_end: '2026-08-31' })).toBe('31')
  })
})

describe('monthTotals', () => {
  it('un mes sin objetivos cargados no tiene cumplimiento (null, no 0%)', () => {
    const t = monthTotals({ month_start: '2026-09-01', weeks: [week({ vacantes: 10 })] }, 3.75)
    expect(t.obj_vacantes).toBeNull()
    expect(t.cumplimiento).toBeNull()
  })
  it('convierte los dolares a soles con el tipo que manda el backend', () => {
    const t = monthTotals({
      month_start: '2026-09-01',
      weeks: [week({ obj_vacantes: 10, obj_ingresos: 1000, vacantes: 12, ingresos_pen: 500, ingresos_usd: 100 })]
    }, 3.75)
    expect(t.ingresos).toBe(875)
    expect(t.cumplimiento).toBeCloseTo(1.2)
    expect(t.cumplimiento_ingresos).toBeCloseTo(0.875)
  })
})

describe('asesoresReport', () => {
  it('solo rankea a quien tiene objetivo y ordena por cumplimiento', () => {
    const r = asesoresReport({
      weeks: [week({ obj_vacantes: 30, vacantes: 25 })],
      asesores: [
        { user_id: 1, nombre: 'A', semanas: [{ obj: 10, vacantes: 5 }] },
        { user_id: 2, nombre: 'B', semanas: [{ obj: 10, vacantes: 12 }] },
        { user_id: 3, nombre: 'C', semanas: [{ obj: null, vacantes: 8 }] }
      ]
    }, '2026-09-10')
    expect(r.ranking.map((p) => p.nombre)).toEqual(['B', 'A'])
    expect(r.people.find((p) => p.nombre === 'C').cumplimiento).toBeNull()
    expect(r.team.cumplimiento).toBeCloseTo(25 / 30)
  })
})

describe('dailyWeek', () => {
  const dias = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']
  const semana = {
    week_label: 'S37', date_start: dias[0], date_end: dias[6], dias,
    asesores: [
      { user_id: 1, nombre: 'CAMILO', obj: 20, consultas: [10, 10, 10, 10, 10, 0, 0], ventas: [3, 1, 2, 2, 2, 0, 0] },
      { user_id: 37, nombre: 'WEB', obj: 10, consultas: [0, 0, 0, 0, 0, 0, 0], ventas: [1, 1, 1, 1, 1, 1, 1] }
    ],
    b2b: [2, 0, 0, 0, 0, 0, 5]
  }

  it('la cuenta WEB no registra consultas: no tiene conversion ni la baja al equipo', () => {
    const w = dailyWeek(semana, '2026-09-20')
    const web = w.rows.find((r) => r.nombre === 'WEB')
    expect(web.conversion).toBeNull()
    expect(w.conversion).toBeCloseTo(10 / 50)
  })

  it('B2B se muestra pero no suma al VEN ni al falta del equipo', () => {
    const w = dailyWeek(semana, '2026-09-20')
    expect(w.b2b.total_ventas).toBe(7)
    expect(w.ventas).toBe(17) // 10 de Camilo + 7 de WEB
    expect(w.falta).toBe(13) // objetivo 30
    expect(w.rows.map((r) => r.n)).toEqual([1, 2])
  })

  it('el mejor y el peor dia se eligen solo entre dias con consultas', () => {
    const w = dailyWeek(semana, '2026-09-20')
    expect(w.dias_con_registro).toBe(5)
    expect(w.mejores).toEqual([0]) // lunes: 3 + 1 web
    expect(w.peores).toEqual([1]) // martes: 1 + 1 web
  })

  it('el promedio por dia ignora los dias sin atencion', () => {
    const w = dailyWeek(semana, '2026-09-20')
    const prom = averageByWeekday([w])
    expect(prom[0]).toBe(4)
    expect(prom[6]).toBe(0)
  })
})

describe('referenceWeek', () => {
  it('en un mes cerrado lee la ultima semana con consultas, no la de una venta suelta', () => {
    const weeks = [
      { date_start: 'a', en_curso: false, tiene_datos: true, dias_con_registro: 5 },
      { date_start: 'b', en_curso: false, tiene_datos: true, dias_con_registro: 0 }
    ]
    expect(referenceWeek(weeks).date_start).toBe('a')
  })
  it('la semana en curso manda aunque tenga pocos dias', () => {
    const weeks = [
      { date_start: 'a', en_curso: false, tiene_datos: true, dias_con_registro: 7 },
      { date_start: 'b', en_curso: true, tiene_datos: true, dias_con_registro: 1 }
    ]
    expect(referenceWeek(weeks).date_start).toBe('b')
  })
})
