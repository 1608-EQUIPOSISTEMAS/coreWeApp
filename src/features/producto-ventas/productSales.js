// Producto > Ventas: lo que la vista necesita ya decidido (tarjetas, graficos,
// filtro por tipo y movimiento en el ranking). Las cifras llegan armadas del
// backend (program/sales/sales.entity.js), que cuenta la venta igual que FICO.
// Los graficos siguen el contrato de ResultWidget (results.entity.js del backend)
// y no llevan frase de conclusion: el % de cada dato sale al pasar el cursor.

import {
  GRANULARITIES as FICO_GRANULARITIES, MONTH_SHORT, prevLabel, periodLabel, inputValue, dateFromInput
} from '@/features/fico-rentabilidad/rentabilidad.js'
import { formatValue } from '@/shared/lib/formatValue.js'

// Un dia no alcanza para leer un ranking: se mira el mes, el trimestre o el año.
// El trimestre no tiene input nativo: se elige de una lista (QUARTER_INPUT).
export const QUARTER_INPUT = 'quarter'
const ficoGranularity = id => FICO_GRANULARITIES.find(g => g.id === id)
export const GRANULARITIES = [
  ficoGranularity('mes'),
  { id: 'trimestre', label: 'Trimestral', input: QUARTER_INPUT, prev: 'el trimestre anterior' },
  ficoGranularity('anio')
]

const pad2 = n => String(n).padStart(2, '0')
const quarterStart = date => {
  const [y, m] = date.split('-').map(Number)
  return `${y}-${pad2(Math.floor((m - 1) / 3) * 3 + 1)}-01`
}
// "T3 2026 · jul–sep": el numero para elegir rapido y los meses para no adivinar.
function quarterLabel (date) {
  const [y, m] = quarterStart(date).split('-').map(Number)
  return `T${(m + 2) / 3} ${y} · ${MONTH_SHORT[m - 1]}–${MONTH_SHORT[m + 1]}`
}

// Los ultimos 8 trimestres, del actual hacia atras: dos años para comparar.
export function quarterOptions (today) {
  const [y, m] = quarterStart(today).split('-').map(Number)
  return Array.from({ length: 8 }, (_, i) => {
    const idx = y * 4 + (m - 1) / 3 - i
    const value = `${Math.floor(idx / 4)}-${pad2((idx % 4) * 3 + 1)}-01`
    return { value, label: quarterLabel(value) }
  })
}

// Las de FICO saben de dia, mes y año; el trimestre se resuelve aqui.
export const periodText = (gran, date) => (gran === 'trimestre' ? quarterLabel(date) : periodLabel(gran, date))
export const prevText = gran => (gran === 'trimestre' ? 'vs el trimestre anterior' : prevLabel(gran))
export const periodInputValue = (gran, date) => (gran === 'trimestre' ? quarterStart(date) : inputValue(gran, date))
export const dateFromPeriodInput = (gran, value) => (gran === 'trimestre'
  ? (/^\d{4}-\d{2}-01$/.test(value) ? quarterStart(value) : null)
  : dateFromInput(gran, value))
export const ALL_TYPES = 'todos'
export const TABLE_LIMIT = 10
export const RANKING_LIMIT = 5

const SECTION_ICONS = { ENVIVO: 'fa-chalkboard-user', ONLINE: 'fa-laptop', MEMBRESIA: 'fa-crown' }
// Identidad de cada linea, la misma en la linea de tiempo y en la dona. Colores
// de Producto (tokens --ds-line-envivo / --ds-line-online); membresia en gris.
const SECTION_TONES = {
  ENVIVO: { linea: 'envivo', dona: 'envivo', card: 'envivo' },
  ONLINE: { linea: 'online', dona: 'online', card: 'online' },
  MEMBRESIA: { linea: 'neutro', dona: 'neutro', card: 'membresia' }
}

const arrow = v => (v === null || v === undefined ? null : `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`)
const variation = (now, before) => (before ? Math.round(((now - before) / before) * 1000) / 10 : null)
const soles = v => `S/ ${Math.round(v).toLocaleString('es-PE')}`
// La parte de un total, lista para el tooltip ("37%"). Sin total no hay parte.
const shareOf = (n, total) => (total ? formatValue((n / total) * 100, 'pct') : null)
const sumN = items => items.reduce((a, i) => a + i.n, 0)

// `linea` pinta el borde de la card con el color de su linea; el total no lleva.
export function sectionCards (view, gran) {
  const vs = prevText(gran)
  const n = sumN(view.secciones)
  const nPrev = view.secciones.reduce((a, s) => a + s.n_prev, 0)
  const trend = variation(n, nPrev)
  const total = {
    key: 'TOTAL',
    label: 'Ventas del periodo',
    valor: n,
    unidad: 'num',
    icono: 'fa-cart-shopping',
    trend: arrow(trend),
    tone: trend === null ? null : trend >= 0 ? 'ok' : 'bad',
    note: `${soles(view.secciones.reduce((a, s) => a + s.soles, 0))} · ${vs}: ${nPrev}`,
    linea: null
  }
  return [total, ...view.secciones.map(s => ({
    key: s.key,
    label: `Ventas ${s.label}`,
    valor: s.n,
    unidad: 'num',
    icono: SECTION_ICONS[s.key],
    trend: arrow(s.n_trend),
    tone: s.n_tone,
    note: `${soles(s.soles)} · ${vs}: ${s.n_prev}`,
    linea: SECTION_TONES[s.key].card
  }))]
}

// Cada periodo y como se parte su serie (el backend decide el casillero).
const TREND_TEXT = {
  mes: { periodo: 'del mes', punto: 'día' },
  trimestre: { periodo: 'del trimestre', punto: 'semana' },
  anio: { periodo: 'del año', punto: 'mes' }
}

// Una linea por linea de negocio a lo largo del periodo. El % del tooltip es la
// parte de ese dia (o mes): las tres suman 100 en cada punto, aun con una sola
// visible. `soloKey` deja solo esa linea: el eje se reescala a ella y una linea
// chica (Online junto a En Vivo) deja de verse plana.
export function trendWidget (view, gran, soloKey = null) {
  if (!view.serie) return null
  const { categorias } = view.serie
  const dayTotal = categorias.map((_, i) => view.serie.secciones.reduce((a, s) => a + s.datos[i], 0))
  const secciones = view.serie.secciones.filter(s => !soloKey || s.key === soloKey)
  return {
    tipo: 'grafico',
    titulo: `¿Cómo se vendió a lo largo ${TREND_TEXT[gran].periodo}?`,
    pista: `Ventas por ${TREND_TEXT[gran].punto}`,
    grafico: {
      tipo: 'linea',
      unidad: 'num',
      categorias,
      series: secciones.map(s => ({
        nombre: s.label,
        tono: SECTION_TONES[s.key].linea,
        datos: s.datos,
        notas: s.datos.map((n, i) => shareOf(n, dayTotal[i]))
      }))
    },
    insight: null,
    verTodo: null
  }
}

export function lineMixWidget (view) {
  return {
    tipo: 'dona',
    titulo: '¿Qué línea vende más?',
    pista: 'Ventas del periodo',
    unidad: 'num',
    total: sumN(view.secciones),
    etiquetaTotal: 'ventas',
    segmentos: view.secciones.map(s => ({ label: s.label, valor: s.n, tono: SECTION_TONES[s.key].dona })),
    insight: null,
    verTodo: null
  }
}

// El eje de una barra horizontal es angosto: el nombre se parte en dos lineas
// por palabra y lo que no entra se corta con "…" (el detalle tiene el nombre entero).
const LABEL_LINE = 26
export function chartLabel (name) {
  const lines = ['']
  for (const word of String(name).split(/\s+/)) {
    const current = lines[lines.length - 1]
    if (!current || (current + ' ' + word).length <= LABEL_LINE) lines[lines.length - 1] = current ? `${current} ${word}` : word
    else lines.push(word)
  }
  if (lines.length <= 2) return lines.length === 1 ? lines[0] : lines
  return [lines[0], `${lines[1].slice(0, LABEL_LINE - 1)}…`]
}

// Ranking como grafico: ahora en color y el periodo anterior en gris al lado,
// asi cada programa se lee contra algo sin leer cifras. El % es la parte de
// `total` (su linea o su formato) que se lleva cada programa.
function rankingChart (programs, total, label = p => p.programa) {
  const top = programs.slice(0, RANKING_LIMIT)
  return {
    tipo: 'barras-h',
    unidad: 'num',
    categorias: top.map(p => chartLabel(label(p))),
    series: [
      { nombre: 'Ventas', datos: top.map(p => p.n), rol: 'principal', notas: top.map(p => shareOf(p.n, total)) },
      { nombre: 'Periodo anterior', datos: top.map(p => p.n_prev), rol: 'referencia' }
    ]
  }
}

export function rankingWidget (section) {
  return {
    tipo: 'grafico',
    titulo: `¿Qué se vende más en ${section.label}?`,
    pista: `Top ${RANKING_LIMIT} de ${section.programas.length}`,
    grafico: rankingChart(section.programas, section.n),
    insight: null,
    verTodo: null
  }
}

const courseSections = view => view.secciones.filter(s => s.key !== 'MEMBRESIA')

// Diplomado vs PEE vs Curso, juntando En Vivo y Online: la pregunta es el
// formato, no el canal. La membresia no es un formato de curso y va aparte.
export function typesWidget (view) {
  const byType = new Map()
  for (const s of courseSections(view)) {
    for (const t of s.tipos) byType.set(t.tipo, (byType.get(t.tipo) || 0) + t.n)
  }
  const tipos = [...byType].sort((a, b) => b[1] - a[1])
  const total = tipos.reduce((a, t) => a + t[1], 0)
  return {
    tipo: 'grafico',
    titulo: '¿Qué tipo de programa se vende más?',
    pista: 'En Vivo + Online',
    grafico: {
      tipo: 'barras-h',
      unidad: 'num',
      categorias: tipos.map(t => t[0]),
      series: [{ nombre: 'Ventas', datos: tipos.map(t => t[1]), rol: 'principal', notas: tipos.map(t => shareOf(t[1], total)) }]
    },
    insight: null,
    verTodo: null
  }
}

// El pedido de Producto: "diplomados mas vendidos, PEE, cursos". Cada formato
// junta En Vivo y Online. Formato sin ventas no sale.
export const FORMATS = ['Diplomado', 'PEE', 'Curso', 'Especialización']
// "DIPLOMADO EN GESTION…" bajo el titulo "¿Que diplomado…?" repite el formato y
// le quita espacio al nombre en el eje.
const FORMAT_PREFIX = /^(DIPLOMADO|ESPECIALIZACI[ÓO]N|PEE)\s+(EN|DE)\s+/i
const formatName = format => (format === 'PEE' ? 'PEE' : format.toLowerCase())

export function formatWidgets (view) {
  const programs = courseSections(view).flatMap(s => s.programas)
  return FORMATS.map(format => {
    const ofFormat = programs.filter(p => p.tipo === format).sort((a, b) => b.n - a.n || b.soles - a.soles)
    if (!ofFormat.length) return null
    const total = sumN(ofFormat)
    return {
      tipo: 'grafico',
      titulo: `¿Qué ${formatName(format)} se vende más?`,
      pista: `${total} ventas en ${ofFormat.length} programas`,
      grafico: rankingChart(ofFormat, total, p => p.programa.replace(FORMAT_PREFIX, '')),
      insight: null,
      verTodo: null
    }
  }).filter(Boolean)
}

// Los formatos van de a dos por fila (ds-row--mitad); uno suelto ocupa la fila.
export const pairs = items => Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => items.slice(i * 2, i * 2 + 2))

// Cascada: arriba lo que vendian juntos los programas que caen, una barra roja
// por lo que perdio cada uno (empieza donde termino la anterior) y abajo lo que
// venden hoy. Se lee de un vistazo cuanto de la caida explica cada programa.
// Sin caidas no hay panel (null): un grafico vacio se leeria como "sin datos".
export function waterfallSteps (drops) {
  const antes = drops.reduce((a, d) => a + d.n_prev, 0)
  let nivel = antes
  const bajadas = drops.map(d => {
    const desde = nivel
    nivel -= d.n_prev - d.n
    return { label: d.programa, rango: [nivel, desde], tono: 'bad', nota: `−${d.n_prev - d.n} ventas: de ${d.n_prev} a ${d.n} (${formatValue(d.variacion, 'pct')})` }
  })
  return [
    { label: 'Antes', rango: [0, antes], tono: 'neutro', nota: `${antes} ventas en el periodo anterior` },
    ...bajadas,
    { label: 'Ahora', rango: [0, nivel], tono: 'accent', nota: `${nivel} ventas en el periodo` }
  ]
}

export function dropsWidget (view) {
  const drops = courseSections(view)
    .flatMap(s => s.caidas)
    .sort((a, b) => (b.n_prev - b.n) - (a.n_prev - a.n))
  if (!drops.length) return null
  const pasos = waterfallSteps(drops.slice(0, TABLE_LIMIT))
  return {
    tipo: 'grafico',
    titulo: '¿Qué programas se están cayendo?',
    pista: drops.length > TABLE_LIMIT ? `Los ${TABLE_LIMIT} que más perdieron de ${drops.length}` : 'Venden la mitad o menos que antes',
    grafico: {
      tipo: 'barras-h',
      unidad: 'num',
      categorias: pasos.map(p => chartLabel(p.label)),
      series: [{ nombre: 'Ventas', datos: pasos.map(p => p.rango), tonosPorDato: pasos.map(p => p.tono), notas: pasos.map(p => p.nota) }]
    },
    insight: null,
    verTodo: null
  }
}

// En cantidad, como el resto del dashboard: la pregunta de Producto es cual se
// vende mas, no cual deja mas plata (eso es de FICO > Ventas y Rentabilidad).
export function membershipWidget (view) {
  const section = view.secciones.find(s => s.key === 'MEMBRESIA')
  const PLAN_TONES = ['principal', 'secundario', 'neutro', 'warn', 'ok']
  return {
    tipo: 'dona',
    titulo: '¿Qué membresía se vende más?',
    pista: 'Ventas del periodo',
    unidad: 'num',
    total: section.n,
    etiquetaTotal: 'ventas',
    segmentos: section.programas.slice(0, RANKING_LIMIT).map((p, i) => ({ label: p.programa, valor: p.n, tono: PLAN_TONES[i] })),
    insight: null,
    verTodo: null
  }
}

// Las pestañas de tipo solo aparecen si la linea vende mas de un tipo.
export function typeTabs (section) {
  if (section.tipos.length < 2) return []
  return [{ id: ALL_TYPES, label: 'Todos' }, ...section.tipos.map(t => ({ id: t.tipo, label: t.tipo }))]
}

// Puesto dentro del tipo elegido: "el 2do diplomado", no "el 14vo de En Vivo".
export function topPrograms (section, tipo = ALL_TYPES) {
  const programs = tipo === ALL_TYPES ? section.programas : section.programas.filter(p => p.tipo === tipo)
  return {
    total: programs.length,
    filas: programs.slice(0, TABLE_LIMIT).map((p, i) => ({ ...p, puesto: tipo === ALL_TYPES ? p.puesto : i + 1, movimiento: movement(p, tipo) }))
  }
}

// Sube/baja se lee contra el ranking completo de la linea del periodo anterior;
// filtrado por tipo ese puesto ya no es comparable y se muestran solo ventas.
function movement (p, tipo) {
  if (!p.n_prev) return { texto: 'nuevo', tono: 'info' }
  if (tipo !== ALL_TYPES || p.puesto_prev === null) return { texto: `antes ${p.n_prev}`, tono: null }
  const delta = p.puesto_prev - p.puesto
  if (delta === 0) return { texto: '= puesto', tono: null }
  return delta > 0 ? { texto: `↑ ${delta}`, tono: 'ok' } : { texto: `↓ ${-delta}`, tono: 'bad' }
}
