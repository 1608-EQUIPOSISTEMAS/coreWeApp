import { describe, it, expect } from 'vitest'
import { outcomesChart, weeklySessionsChart, teachersChart, goalTone, teachersAtGoal } from '../reportCharts.js'

describe('outcomesChart', () => {
  it('ordena del mes más antiguo al más reciente y separa jalados por nota de sin entrega', () => {
    const { categorias, series } = outcomesChart([
      { mes: '2026-09', aprobados: 5, jalados: 3, sin_final: 1 },
      { mes: '2026-08', aprobados: 13, jalados: 4, sin_final: 1 }
    ])
    expect(categorias).toEqual(['Ago', 'Set'])
    expect(series.find((s) => s.nombre === 'Jalados por nota').datos).toEqual([3, 2])
    expect(series.find((s) => s.nombre === 'Sin entrega final').datos).toEqual([1, 1])
  })
})

describe('weeklySessionsChart', () => {
  const periodo = { start: '2026-09-01', end: '2026-09-30', today: '2026-09-16' }

  it('no cuenta sesiones futuras ni fuera del periodo; R no es dictada', () => {
    const { categorias, series } = weeklySessionsChart([[
      { date: '2026-08-31', status: 'A' }, // fuera del periodo
      { date: '2026-09-08', status: 'A', ai_20: 17 },
      { date: '2026-09-09', status: 'R' },
      { date: '2026-09-15', status: 'T', manual_20: 14 },
      { date: '2026-09-22', status: null } // futura
    ]], periodo)
    expect(categorias).toEqual(['S37', 'S38'])
    const [programadas, dictadas, auditadas] = series.map((s) => s.datos)
    expect(programadas).toEqual([2, 1])
    expect(dictadas).toEqual([1, 1])
    expect(auditadas).toEqual([1, 1])
  })
})

describe('teachersChart', () => {
  it('muestra los 5 peores promedios y deja fuera a los que no tienen auditoría', () => {
    const docentes = [18, 12, null, 15, 11, 16, 14].map((avg20, i) => ({ teacher: `D${i}`, avg20 }))
    const { categorias } = teachersChart(docentes)
    expect(categorias).toEqual(['D4', 'D1', 'D6', 'D3', 'D5'])
  })
})

describe('objetivos', () => {
  it('goalTone: en meta ok, cerca atención, lejos malo, sin dato sin tono', () => {
    expect(goalTone(85, 85, 15)).toBe('ok')
    expect(goalTone(72, 85, 15)).toBe('warn')
    expect(goalTone(28, 85, 15)).toBe('bad')
    expect(goalTone(null, 85, 15)).toBe('')
  })

  it('teachersAtGoal ignora a los docentes sin auditoría', () => {
    expect(teachersAtGoal([{ avg20: 18 }, { avg20: 17.9 }, { avg20: null }], 18)).toEqual({ alcanzan: 1, evaluados: 2 })
  })
})
