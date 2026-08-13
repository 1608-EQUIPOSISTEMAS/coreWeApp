import { describe, it, expect } from 'vitest'
import { agruparPorLinea, desglosarPorArea, AREAS, SIN_LINEA } from '../funnelAreas'

const celda = (grupo, momento, consultas, ventas, meta_consultas = 0, meta_ventas = 0) =>
  ({ key: `${grupo}_${momento}`, grupo, momento, consultas, ventas, meta_consultas, meta_ventas })

describe('desglosarPorArea', () => {
  it('devuelve siempre las 4 áreas en el orden de la hoja', () => {
    expect(desglosarPorArea([]).map(a => a.area)).toEqual(AREAS)
  })

  it('suma los momentos de cada área por separado', () => {
    const areas = desglosarPorArea([
      celda('MARKETING', 'NUEVO', 100, 8, 120, 10),
      celda('MARKETING', 'LEAD', 20, 2, 30, 3),
      celda('COMERCIAL', 'COMUNIDAD', 5, 4, 6, 5)
    ])
    const porNombre = Object.fromEntries(areas.map(a => [a.area, a]))

    expect(porNombre.MARKETING).toMatchObject({ consultas: 120, ventas: 10, meta_consultas: 150, meta_ventas: 13 })
    expect(porNombre.MARKETING.momentos).toHaveLength(2)
    expect(porNombre.COMERCIAL).toMatchObject({ consultas: 5, ventas: 4 })
    expect(porNombre.WEB).toMatchObject({ consultas: 0, ventas: 0, momentos: [] })
  })
})

const edicion = (linea, consultas, ventas, meta_consultas = 0, meta_ventas = 0) =>
  ({ linea, consultas, ventas, meta_consultas, meta_ventas })

describe('agruparPorLinea', () => {
  it('suma las ediciones de una misma línea y la ordena por ventas', () => {
    const areas = agruparPorLinea([
      edicion('BI', 100, 10, 120, 12),
      edicion('SAP', 200, 40, 150, 30),
      edicion('BI', 50, 5, 60, 6)
    ], 55)

    expect(areas.map(a => a.linea)).toEqual(['SAP', 'BI'])
    expect(areas[1]).toMatchObject({
      linea: 'BI', ediciones: 2, consultas: 150, ventas: 15, meta_consultas: 180, meta_ventas: 18
    })
  })

  it('mide el aporte contra el mes entero, no contra lo agrupado', () => {
    // Una sola línea, pero el mes vendió 100: aporta 30%, no 100%.
    const [bi] = agruparPorLinea([edicion('BI', 200, 30)], 100)
    expect(bi.aporte_pct).toBe(30)
  })

  it('sin consultas la conversión es null, no 0%', () => {
    const [area] = agruparPorLinea([edicion('SAP', 0, 0)], 0)
    expect(area.conversion_pct).toBeNull()
    expect(area.aporte_pct).toBe(0)
  })

  it('agrupa las ediciones sin línea en vez de perderlas', () => {
    const areas = agruparPorLinea([edicion(null, 10, 1), edicion('', 5, 2)], 3)
    expect(areas).toHaveLength(1)
    expect(areas[0]).toMatchObject({ linea: SIN_LINEA, ediciones: 2, ventas: 3 })
  })
})
