import { describe, it, expect } from 'vitest'
import { quarterOptions, periodText, prevText, dateFromPeriodInput, GRANULARITIES, topPrograms, typeTabs, ALL_TYPES, sectionCards, typesWidget, membershipWidget, lineMixWidget, trendWidget, rankingWidget, formatWidgets, dropsWidget, chartLabel, pairs } from '../productSales.js'

const prog = (id, tipo, n, puesto, puestoPrev, nPrev) => ({ program_id: id, programa: `P${id}`, tipo, n, soles: n * 100, pct: n, puesto, puesto_prev: puestoPrev, n_prev: nPrev })
const section = {
  label: 'En Vivo',
  tipos: [{ tipo: 'Curso' }, { tipo: 'Diplomado' }],
  programas: [
    prog(1, 'Curso', 50, 1, 3, 10),
    prog(2, 'Diplomado', 30, 2, 1, 40),
    prog(3, 'Curso', 20, 3, 3, 5),
    prog(4, 'Diplomado', 10, 4, null, 0)
  ]
}

describe('topPrograms', () => {
  it('marca subidas, bajadas y nuevos contra el puesto anterior de la linea', () => {
    expect(topPrograms(section).filas.map(f => f.movimiento.texto)).toEqual(['↑ 2', '↓ 1', '= puesto', 'nuevo'])
  })

  it('filtrado por tipo renumera el puesto y compara solo ventas', () => {
    const { filas, total } = topPrograms(section, 'Diplomado')
    expect(total).toBe(2)
    expect(filas.map(f => [f.program_id, f.puesto, f.movimiento.texto])).toEqual([[2, 1, 'antes 40'], [4, 2, 'nuevo']])
  })

  it('corta en 10 filas pero informa el total', () => {
    const many = { ...section, programas: Array.from({ length: 12 }, (_, i) => prog(i, 'Curso', 12 - i, i + 1, i + 1, 1)) }
    expect(topPrograms(many, ALL_TYPES)).toMatchObject({ total: 12, filas: { length: 10 } })
  })
})

describe('widgets del dashboard', () => {
  const view = {
    serie: {
      categorias: ['ene', 'feb'],
      secciones: [{ key: 'ENVIVO', label: 'En Vivo', datos: [3, 0] }, { key: 'ONLINE', label: 'Online', datos: [1, 0] }]
    },
    secciones: [
      { ...section, key: 'ENVIVO', n: 110, n_prev: 100, soles: 11000, tipos: [{ tipo: 'Curso', n: 70 }, { tipo: 'Diplomado', n: 40 }] },
      { key: 'ONLINE', label: 'Online', n: 30, n_prev: 0, soles: 900, tipos: [{ tipo: 'Curso', n: 30 }], programas: [] },
      {
        key: 'MEMBRESIA', label: 'Membresías', n: 60, n_prev: 0, soles: 9000, tipos: [],
        programas: [prog(7, 'Membresía', 50, 1, null, 0), { ...prog(8, 'Membresía', 10, 2, null, 0), soles: 8000 }]
      }
    ]
  }

  it('el total suma las tres lineas y compara contra el periodo anterior', () => {
    expect(sectionCards(view, 'mes')[0]).toMatchObject({ valor: 200, trend: '↑ 100%', tone: 'ok' })
  })

  it('cada card de linea lleva su color de borde; el total no', () => {
    expect(sectionCards(view, 'trimestre').map(c => c.linea)).toEqual([null, 'envivo', 'online', 'membresia'])
    expect(sectionCards(view, 'trimestre')[1].note).toContain('vs el trimestre anterior')
  })

  it('el tipo de programa junta En Vivo y Online, sin membresias, con su % en el tooltip', () => {
    expect(typesWidget(view).grafico).toMatchObject({ categorias: ['Curso', 'Diplomado'], series: [{ datos: [100, 40], notas: ['71.4%', '28.6%'] }] })
  })

  it('las donas van en cantidad de ventas y sin frase de conclusion', () => {
    const w = membershipWidget(view)
    expect(w).toMatchObject({ unidad: 'num', total: 60, insight: null })
    expect(w.segmentos.map(s => [s.label, s.valor])).toEqual([['P7', 50], ['P8', 10]])
    expect(lineMixWidget(view)).toMatchObject({ total: 200, insight: null })
  })

  it('la linea de tiempo lleva un color por linea y el % de cada una en ese dia', () => {
    const { grafico } = trendWidget(view, 'anio')
    expect(grafico.tipo).toBe('linea')
    expect(grafico.series.map(s => [s.tono, s.notas])).toEqual([['envivo', ['75%', null]], ['online', ['25%', null]]])
    expect(trendWidget({ serie: null }, 'mes')).toBeNull()
  })

  it('filtrada a una linea deja solo esa, con su % del dia sobre el total de las tres', () => {
    const { grafico } = trendWidget(view, 'mes', 'ONLINE')
    expect(grafico.series.map(s => [s.nombre, s.datos, s.notas])).toEqual([['Online', [1, 0], ['25%', null]]])
  })

  it('el ranking de la linea da el % de la linea que se lleva cada programa', () => {
    expect(rankingWidget(view.secciones[0]).grafico.series[0].notas).toEqual(['45.5%', '27.3%', '18.2%', '9.1%'])
  })
})

describe('rankings como graficos', () => {
  const live = {
    key: 'ENVIVO', label: 'En Vivo', tipos: [],
    programas: [{ ...prog(1, 'Diplomado', 8, 1, 1, 3), programa: 'DIPLOMADO EN GESTIÓN DE PROYECTOS' }, prog(2, 'Curso', 5, 2, 2, 5)],
    caidas: [{ program_id: 3, programa: 'P3', tipo: 'Curso', n: 0, n_prev: 6, variacion: -100 }]
  }
  const online = {
    key: 'ONLINE', label: 'Online', tipos: [],
    programas: [prog(5, 'Diplomado', 2, 1, 1, 2)],
    caidas: [{ program_id: 6, programa: 'P6', tipo: 'Curso', n: 1, n_prev: 10, variacion: -90 }]
  }
  const membership = { key: 'MEMBRESIA', label: 'Membresías', tipos: [], programas: [], caidas: [] }
  const view = { secciones: [live, online, membership] }

  it('un grafico por formato que junta En Vivo y Online, sin el prefijo repetido y contra el periodo anterior', () => {
    const widgets = formatWidgets(view)
    expect(widgets.map(w => w.titulo)).toEqual(['¿Qué diplomado se vende más?', '¿Qué curso se vende más?'])
    expect(widgets[0].grafico).toMatchObject({
      tipo: 'barras-h',
      categorias: ['GESTIÓN DE PROYECTOS', 'P5'],
      series: [{ datos: [8, 2], rol: 'principal', notas: ['80%', '20%'] }, { datos: [3, 2], rol: 'referencia' }]
    })
    expect(widgets[0].insight).toBeNull()
  })

  it('cascada: de lo que vendian a lo que venden, una bajada por programa, la que mas perdio primero', () => {
    const { grafico } = dropsWidget(view)
    expect(grafico.categorias).toEqual(['Antes', 'P6', 'P3', 'Ahora'])
    // Antes 16; P6 pierde 9 (16 -> 7); P3 pierde 6 (7 -> 1); ahora 1.
    expect(grafico.series[0].datos).toEqual([[0, 16], [7, 16], [1, 7], [0, 1]])
    expect(grafico.series[0].tonosPorDato).toEqual(['neutro', 'bad', 'bad', 'accent'])
    expect(grafico.series[0].notas[1]).toBe('−9 ventas: de 10 a 1 (-90%)')
    expect(dropsWidget({ secciones: [membership] })).toBeNull()
  })

  it('parte los nombres largos en dos lineas y corta el resto', () => {
    expect(chartLabel('POWER BI')).toBe('POWER BI')
    expect(chartLabel('SAP S/4 HANA MM: LOGÍSTICA Y MATERIALES')).toEqual(['SAP S/4 HANA MM: LOGÍSTICA', 'Y MATERIALES'])
    expect(chartLabel('ESPECIALIZACIÓN EN POWER APPS Y POWER AUTOMATE CON INTELIGENCIA ARTIFICIAL GENERATIVA')[1]).toMatch(/…$/)
  })

  it('agrupa de a dos para las filas mitad', () => {
    expect(pairs([1, 2, 3])).toEqual([[1, 2], [3]])
  })
})

describe('typeTabs', () => {
  it('sin pestañas cuando la linea vende un solo tipo', () => {
    expect(typeTabs({ tipos: [{ tipo: 'Membresía' }] })).toEqual([])
    expect(typeTabs(section).map(t => t.id)).toEqual([ALL_TYPES, 'Curso', 'Diplomado'])
  })
})

describe('periodo trimestral', () => {
  it('mes, trimestral y año, en ese orden', () => {
    expect(GRANULARITIES.map(g => g.label)).toEqual(['Mes', 'Trimestral', 'Año'])
  })

  it('ofrece los ultimos 8 trimestres desde el actual, cruzando años', () => {
    const opts = quarterOptions('2026-10-23')
    expect(opts.map(o => o.value)).toEqual(['2026-10-01', '2026-07-01', '2026-04-01', '2026-01-01', '2025-10-01', '2025-07-01', '2025-04-01', '2025-01-01'])
    expect(opts[1].label).toBe('T3 2026 · jul–sep')
  })

  it('rotula el periodo y su comparacion; cualquier fecha cae a su trimestre', () => {
    expect(periodText('trimestre', '2026-08-15')).toBe('T3 2026 · jul–sep')
    expect(prevText('trimestre')).toBe('vs el trimestre anterior')
    expect(dateFromPeriodInput('trimestre', '2026-04-01')).toBe('2026-04-01')
    expect(dateFromPeriodInput('trimestre', 'basura')).toBeNull()
    expect(dateFromPeriodInput('mes', '2026-09')).toBe('2026-09-01')
  })
})
