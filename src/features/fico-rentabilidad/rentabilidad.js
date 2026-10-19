// FICO > Ventas y Rentabilidad: lo que la vista necesita ya decidido (periodo
// desde el input, filas visibles del arbol, tarjetas y avisos). Las cifras y
// tonos llegan armados del backend (profitability.entity.js).

export const GRANULARITIES = [
  { id: 'dia', label: 'Día', input: 'date', prev: 'ayer' },
  { id: 'mes', label: 'Mes', input: 'month', prev: 'el mes anterior' },
  { id: 'anio', label: 'Año', input: 'number', prev: 'el año anterior' }
]
export const MEASURES = [
  { id: 'vendido', label: 'Vendido' },
  { id: 'cobrado', label: 'Cobrado' }
]
export const TABS = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'rentabilidad', label: 'Rentabilidad' },
  { id: 'costos', label: 'Costos' }
]
export const LINES = [
  { key: 'ENVIVO', label: 'En Vivo' },
  { key: 'ONLINE', label: 'Online' },
  { key: 'B2B', label: 'B2B' },
  { key: 'FUNDACION', label: 'Fundación' }
]
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MONTH_SHORT = MONTHS.map(m => m.slice(0, 3))

const granularity = id => GRANULARITIES.find(g => g.id === id)

// El input nativo de cada periodo habla su formato: date YYYY-MM-DD, month
// YYYY-MM, number YYYY. El backend siempre recibe una fecha completa.
export function inputValue (gran, date) {
  if (gran === 'mes') return date.slice(0, 7)
  if (gran === 'anio') return date.slice(0, 4)
  return date
}
export function dateFromInput (gran, value) {
  if (gran === 'mes' && /^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (gran === 'anio' && /^\d{4}$/.test(String(value))) return `${value}-01-01`
  if (gran === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return null
}

export function periodLabel (gran, date) {
  const [y, m, d] = date.split('-').map(Number)
  if (gran === 'anio') return String(y)
  if (gran === 'mes') return `${MONTHS[m - 1]} ${y}`
  return `${d} de ${MONTHS[m - 1]} ${y}`
}

// "vs el mes anterior": la rentabilidad de un dia se lee como su mes.
export const prevLabel = gran => `vs ${granularity(gran)?.prev ?? 'el periodo anterior'}`

// Filas visibles del arbol Linea -> Tipo -> Programa segun lo abierto.
export function visibleRows (lineas, expanded) {
  const rows = []
  for (const line of lineas || []) {
    rows.push({ level: 0, node: line, key: line.key, open: expanded.has(line.key), hasChildren: line.tipos.length > 0 })
    if (!expanded.has(line.key)) continue
    for (const tipo of line.tipos) {
      rows.push({ level: 1, node: tipo, key: tipo.key, open: expanded.has(tipo.key), hasChildren: tipo.programas.length > 0 })
      if (!expanded.has(tipo.key)) continue
      for (const prog of tipo.programas) rows.push({ level: 2, node: prog, key: prog.key, open: false, hasChildren: false })
    }
  }
  return rows
}

const arrow = v => (v === null || v === undefined ? null : `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`)

export function salesCards (view, gran) {
  const k = view.kpis
  const vs = prevLabel(gran)
  const isCobrado = view.measure === 'cobrado'
  return [
    { label: isCobrado ? 'Cobrado' : 'Vendido', valor: k.soles, unidad: 'soles', icono: 'fa-sack-dollar', trend: arrow(k.soles_trend), tone: k.soles_tone, note: `${vs}: S/ ${Math.round(k.soles_prev).toLocaleString('es-PE')}` },
    { label: isCobrado ? 'Pagos recibidos' : 'Ventas', valor: k.n, unidad: 'num', icono: isCobrado ? 'fa-receipt' : 'fa-cart-shopping', trend: arrow(k.n_trend), tone: k.n_tone, note: `${vs}: ${k.n_prev}` },
    { label: isCobrado ? 'Pago promedio' : 'Ticket promedio', valor: k.ticket, unidad: 'soles', icono: 'fa-tag', trend: arrow(k.ticket_trend), tone: k.ticket_tone, note: `${vs}: ${k.ticket_prev === null ? '—' : `S/ ${Math.round(k.ticket_prev).toLocaleString('es-PE')}`}` },
    { label: 'Línea que más aporta', valor: k.top_linea?.label ?? null, unidad: 'texto', icono: 'fa-layer-group', trend: null, tone: null, note: k.top_linea ? `${k.top_linea.pct}% del total` : 'Sin ventas en el periodo' }
  ]
}

export function profitCards (view) {
  const k = view.kpis
  return [
    { label: 'Ingreso vendido', valor: k.ingreso, unidad: 'soles', icono: 'fa-sack-dollar', tone: null, note: `${k.programas} programas con movimiento` },
    { label: 'Costo docente', valor: k.docente, unidad: 'soles', icono: 'fa-chalkboard-user', tone: null, note: k.ingreso ? `${pctOf(k.docente, k.ingreso)}% del ingreso` : '—' },
    { label: 'Publicidad asignada', valor: k.publicidad, unidad: 'soles', icono: 'fa-bullhorn', tone: null, note: k.ingreso ? `${pctOf(k.publicidad, k.ingreso)}% del ingreso` : '—' },
    { label: 'Margen', valor: k.margen, unidad: 'soles', icono: 'fa-scale-balanced', tone: k.margen_tone, note: k.margen_pct === null ? '—' : `${k.margen_pct}% del ingreso` },
    { label: 'Programas en pérdida', valor: k.en_perdida, unidad: 'num', icono: 'fa-triangle-exclamation', tone: k.en_perdida ? 'bad' : 'ok', note: `de ${k.programas}` }
  ]
}
const pctOf = (part, whole) => Math.round((part / whole) * 1000) / 10

// Lo que falta para que el margen sea real. Sin tarifas el margen sale inflado:
// eso se dice arriba, no en la letra chica.
export function coverageWarnings (c) {
  const warnings = []
  if (c.sin_tarifa) warnings.push({ tone: 'warn', text: `${c.sin_tarifa} de ${c.ediciones} ediciones del periodo son de docentes sin tarifa: su costo no se suma y el margen sale más alto de lo real. Cárgalas en la pestaña Costos.` })
  if (c.sin_horario) warnings.push({ tone: 'warn', text: `${c.sin_horario} ediciones no tienen horario: no se sabe cuántas horas dura la sesión.` })
  if (c.sin_docente) warnings.push({ tone: 'info', text: `${c.sin_docente} ediciones no tienen docente asignado en Producto.` })
  if (!c.publicidad_cargada) warnings.push({ tone: 'warn', text: 'No hay publicidad cargada para este periodo: el margen no descuenta marketing.' })
  if (c.publicidad_sin_repartir) warnings.push({ tone: 'info', text: `S/ ${Math.round(c.publicidad_sin_repartir).toLocaleString('es-PE')} de publicidad no se repartió: la unidad no vendió nada ese mes.` })
  return warnings
}

// Grilla de publicidad: 12 meses x 4 unidades, con lo guardado o vacío.
export function marketingGrid (rows) {
  const saved = new Map((rows || []).map(r => [`${r.month}|${r.line}`, r.amount]))
  return MONTH_SHORT.map((label, i) => ({
    month: i + 1,
    label,
    values: Object.fromEntries(LINES.map(l => [l.key, saved.get(`${i + 1}|${l.key}`) ?? null]))
  }))
}
export function marketingRowsToSave (grid) {
  return grid.flatMap(m => LINES
    .filter(l => m.values[l.key] !== null && m.values[l.key] !== '')
    .map(l => ({ month: m.month, line: l.key, amount: Number(m.values[l.key]) })))
}
