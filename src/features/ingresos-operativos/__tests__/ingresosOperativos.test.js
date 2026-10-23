import { describe, it, expect } from 'vitest'
import {
  withSoles, applyFilters, valuesFor, isActive, activeCount, sortRows, buildResumen,
  periodoLabel, mesActual, toExportRows, VACIAS, COLUMNS
} from '../ingresosOperativos.js'

const row = (extra = {}) => ({
  paymentId: 1, fechaPago: '2026-10-05', alumno: 'PÉREZ ANA', lineaNegocio: 'EN VIVO', tipoPago: 'PT',
  moneda: 'PEN', monto: 100, entidadEmpresa: null, grupo: 'EN_VIVO_VENTAS', ...extra
})

const rows = withSoles([
  row({ paymentId: 1 }),
  row({ paymentId: 2, lineaNegocio: 'ONLINE', grupo: 'ONLINE', monto: 50, alumno: 'ROJAS LUIS' }),
  row({ paymentId: 3, moneda: 'USD', monto: 20, fechaPago: '2026-10-20', tipoPago: 'CUOTA', grupo: 'EN_VIVO_CUOTAS', entidadEmpresa: 'WE FOUNDATION' })
], 4)

const ids = list => list.map(r => r.paymentId)

describe('withSoles', () => {
  it('convierte solo los USD', () => {
    expect(rows.map(r => r.montoSoles)).toEqual([100, 50, 80])
  })
})

describe('applyFilters', () => {
  it('lista de valores, con las vacías como un valor más', () => {
    expect(ids(applyFilters(rows, { lineaNegocio: { values: ['ONLINE'] } }))).toEqual([2])
    expect(ids(applyFilters(rows, { entidadEmpresa: { values: [VACIAS] } }))).toEqual([1, 2])
  })
  it('buscador sin tildes ni mayúsculas', () => {
    expect(ids(applyFilters(rows, { alumno: { values: null, text: 'perez' } }))).toEqual([1, 3])
  })
  it('rango de fechas y de montos', () => {
    expect(ids(applyFilters(rows, { fechaPago: { values: null, min: '2026-10-10', max: '' } }))).toEqual([3])
    expect(ids(applyFilters(rows, { montoSoles: { values: null, min: '60', max: '90' } }))).toEqual([3])
  })
  it('combina columnas con Y', () => {
    const f = { lineaNegocio: { values: ['EN VIVO'] }, tipoPago: { values: ['CUOTA'] } }
    expect(ids(applyFilters(rows, f))).toEqual([3])
  })
  it('un filtro vacío no filtra', () => {
    expect(isActive({ values: null, text: ' ', min: '', max: '' })).toBe(false)
    expect(applyFilters(rows, { alumno: { values: null, text: '' } })).toHaveLength(3)
  })
})

describe('valuesFor', () => {
  it('la lista sale de los demás filtros, no del propio', () => {
    const f = { lineaNegocio: { values: ['EN VIVO'] } }
    expect(valuesFor(rows, f, 'lineaNegocio').map(v => v.value)).toEqual(['EN VIVO', 'ONLINE'])
    expect(valuesFor(rows, f, 'tipoPago')).toEqual([{ value: 'CUOTA', n: 1 }, { value: 'PT', n: 1 }])
  })
  it('las vacías van al final', () => {
    expect(valuesFor(rows, {}, 'entidadEmpresa').map(v => v.value)).toEqual(['WE FOUNDATION', VACIAS])
  })
})

describe('sortRows', () => {
  it('ordena montos como número y deja los vacíos al final', () => {
    expect(ids(sortRows(rows, { key: 'montoSoles', dir: 'desc' }))).toEqual([1, 3, 2])
    expect(ids(sortRows(rows, { key: 'entidadEmpresa', dir: 'asc' }))[0]).toBe(3)
  })
})

describe('buildResumen', () => {
  it('suma por grupo en PEN, USD y soles con su participación', () => {
    const r = buildResumen(rows, 4)
    expect(r.filas.find(f => f.id === 'EN_VIVO_CUOTAS')).toMatchObject({ usd: 20, soles: 80, pagos: 1 })
    expect(r.total).toEqual({ pen: 150, usd: 20, soles: 230, pagos: 3 })
    expect(r.filas.reduce((a, f) => a + f.pct, 0)).toBeCloseTo(100, 1)
  })
})

describe('periodo', () => {
  it('etiquetas y mes actual', () => {
    expect(periodoLabel('2026-10')).toBe('octubre 2026')
    expect(periodoLabel('2026-04', '2026-10')).toBe('abril 2026 a octubre 2026')
    expect(mesActual(new Date(2026, 9, 22))).toBe('2026-10')
  })
})

describe('export', () => {
  it('encabezado con N° y una fila por pago', () => {
    const out = toExportRows(rows)
    expect(out[0]).toHaveLength(COLUMNS.length + 1)
    expect(out[1][0]).toBe(1)
    expect(activeCount({ a: { values: ['x'] }, b: { values: null } })).toBe(1)
  })
})
