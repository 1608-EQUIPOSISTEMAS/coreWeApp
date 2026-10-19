import { describe, it, expect } from 'vitest'
import {
  inputValue, dateFromInput, periodLabel, visibleRows, coverageWarnings,
  marketingGrid, marketingRowsToSave
} from '../rentabilidad.js'

describe('periodo desde el input nativo', () => {
  it('ida y vuelta por cada granularidad', () => {
    expect(inputValue('mes', '2026-09-01')).toBe('2026-09')
    expect(dateFromInput('mes', '2026-09')).toBe('2026-09-01')
    expect(dateFromInput('anio', '2026')).toBe('2026-01-01')
    expect(dateFromInput('dia', '2026-09-15')).toBe('2026-09-15')
  })
  it('un input vacío o a medio escribir no dispara una consulta', () => {
    expect(dateFromInput('anio', '20')).toBeNull()
    expect(dateFromInput('mes', '')).toBeNull()
  })
  it('etiqueta legible', () => {
    expect(periodLabel('mes', '2026-09-01')).toBe('septiembre 2026')
    expect(periodLabel('dia', '2026-09-05')).toBe('5 de septiembre 2026')
  })
})

describe('visibleRows', () => {
  const lineas = [{ key: 'ENVIVO', tipos: [{ key: 'ENVIVO|Curso', programas: [{ key: 'ENVIVO|1' }, { key: 'ENVIVO|2' }] }] }]
  it('cerrado muestra solo las líneas', () => {
    expect(visibleRows(lineas, new Set()).map(r => r.key)).toEqual(['ENVIVO'])
  })
  it('abre por niveles', () => {
    expect(visibleRows(lineas, new Set(['ENVIVO', 'ENVIVO|Curso'])).map(r => r.level)).toEqual([0, 1, 2, 2])
  })
})

describe('coverageWarnings', () => {
  it('avisa que sin tarifas el margen está inflado', () => {
    const w = coverageWarnings({ ediciones: 41, sin_tarifa: 39, sin_horario: 0, sin_docente: 0, publicidad_cargada: 100, publicidad_sin_repartir: 0 })
    expect(w).toHaveLength(1)
    expect(w[0].text).toContain('39 de 41')
  })
})

describe('grilla de publicidad', () => {
  it('guarda solo las celdas con monto, incluido el 0', () => {
    const grid = marketingGrid([{ month: 3, line: 'ONLINE', amount: 500 }])
    expect(grid[2].values.ONLINE).toBe(500)
    grid[0].values.ENVIVO = 0
    expect(marketingRowsToSave(grid)).toEqual([
      { month: 1, line: 'ENVIVO', amount: 0 },
      { month: 3, line: 'ONLINE', amount: 500 }
    ])
  })
})
