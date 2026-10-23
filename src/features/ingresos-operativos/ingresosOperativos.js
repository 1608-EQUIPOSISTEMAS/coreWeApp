// Consultor de Ingresos Operativos (reemplaza el sheet "Ing. Operativos - GRUPO
// WE"). Funciones puras: columnas, filtros por encabezado al estilo Excel,
// orden, resumen y exportacion. El backend manda el detalle del rango y todo el
// filtrado se hace aca (un mes ~700 filas, un año ~9.000).

import {
  VACIAS, cellKey, isActive, activeCount,
  applyFilters as applyBy, valuesFor as valuesBy, sortRows as sortBy
} from '@/shared/lib/columnFilters.js'

export { VACIAS }
export const PRIMER_MES = '2026-04'
export const TIPO_CAMBIO_DEFAULT = 3.75

// kind: 'texto' = lista de valores + buscador; 'fecha' y 'monto' suman un rango.
export const COLUMNS = [
  { key: 'fechaPago', label: 'Fecha pago', kind: 'fecha' },
  { key: 'celular', label: 'Celular', kind: 'texto' },
  { key: 'alumno', label: 'Apellidos y nombres', kind: 'texto' },
  { key: 'lineaNegocio', label: 'Línea de negocio', kind: 'texto' },
  { key: 'tipoPrograma', label: 'Tipo programa', kind: 'texto' },
  { key: 'lineaProducto', label: 'Línea de producto', kind: 'texto' },
  { key: 'curso', label: 'Nombre curso', kind: 'texto' },
  { key: 'edicion', label: 'Edición', kind: 'texto' },
  { key: 'tipoPago', label: 'Tipo de pago', kind: 'texto' },
  { key: 'moneda', label: 'Moneda', kind: 'texto' },
  { key: 'monto', label: 'Monto', kind: 'monto' },
  { key: 'medioPago', label: 'Medio de pago', kind: 'texto' },
  { key: 'entidadEmpresa', label: 'Entidad empresa', kind: 'texto' },
  { key: 'entidadFinanciera', label: 'Entidad financiera', kind: 'texto' },
  { key: 'nOper', label: 'N° oper.', kind: 'texto' },
  { key: 'estadoLiquidacion', label: 'Estado liquidación', kind: 'texto' },
  { key: 'montoSoles', label: 'Monto total (S/)', kind: 'monto' }
]

export const GRUPOS = [
  { id: 'EN_VIVO_VENTAS', label: 'Ventas Zoom', linea: 'EN VIVO', nota: 'Pago total e inicial' },
  { id: 'EN_VIVO_CUOTAS', label: 'Cuotas Zoom', linea: 'EN VIVO', nota: 'Cuotas del cronograma' },
  { id: 'ONLINE', label: 'Ventas Online', linea: 'ONLINE', nota: 'Incluye membresías' },
  { id: 'FUNDACION', label: 'Fundación WE', linea: 'FUNDACIÓN', nota: 'Congresos y eventos' },
  { id: 'EXTRAS', label: 'Pagos extras', linea: 'ADICIONALES', nota: 'Certificados y otros' }
]

const round2 = n => Math.round(n * 100) / 100

// Monto en soles con el tipo de cambio elegido en pantalla.
export function withSoles (detalle, tipoCambio = TIPO_CAMBIO_DEFAULT) {
  return detalle.map(d => ({ ...d, montoSoles: round2(d.moneda === 'USD' ? d.monto * tipoCambio : d.monto) }))
}

// ── Filtros y orden (genéricos en shared/lib/columnFilters) ──────────────

export { cellKey, isActive, activeCount }
export const applyFilters = (rows, filters, except = null) => applyBy(rows, filters, COLUMNS, except)
export const valuesFor = (rows, filters, key) => valuesBy(rows, filters, key, COLUMNS)
export const sortRows = (rows, sort = {}) => sortBy(rows, sort, COLUMNS, 'paymentId')

// ── Resumen (bloque azul del sheet) sobre lo filtrado ─────────────────────

export function buildResumen (rows, tipoCambio = TIPO_CAMBIO_DEFAULT) {
  const filas = GRUPOS.map(g => ({ ...g, pen: 0, usd: 0, soles: 0, pagos: 0, pct: 0 }))
  const porId = Object.fromEntries(filas.map(f => [f.id, f]))
  for (const r of rows) {
    const f = porId[r.grupo]
    if (!f) continue
    if (r.moneda === 'USD') f.usd += r.monto
    else f.pen += r.monto
    f.pagos += 1
  }
  let total = 0
  for (const f of filas) {
    f.pen = round2(f.pen)
    f.usd = round2(f.usd)
    f.soles = round2(f.pen + f.usd * tipoCambio)
    total += f.soles
  }
  for (const f of filas) f.pct = total ? round2((f.soles / total) * 100) : 0
  return {
    filas,
    total: {
      pen: round2(filas.reduce((a, f) => a + f.pen, 0)),
      usd: round2(filas.reduce((a, f) => a + f.usd, 0)),
      soles: round2(total),
      pagos: rows.length
    }
  }
}

// ── Periodo ────────────────────────────────────────────────────────────────

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/
export const isMes = v => MES_RE.test(v || '')

// Mes en curso en Lima (el navegador ya esta en hora local).
export function mesActual (now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesLabel = ym => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`

export function periodoLabel (desde, hasta) {
  if (!hasta || hasta === desde) return mesLabel(desde)
  return `${mesLabel(desde)} a ${mesLabel(hasta)}`
}

// ── Exportar ───────────────────────────────────────────────────────────────

export function toExportRows (rows) {
  return [
    ['N°', ...COLUMNS.map(c => c.label)],
    ...rows.map((r, i) => [i + 1, ...COLUMNS.map(c => r[c.key] ?? '')])
  ]
}
