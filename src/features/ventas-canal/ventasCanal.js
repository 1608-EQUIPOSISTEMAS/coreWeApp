// Reglas de lectura de Comercial > Marketing - Gestión (ventas por canal).
// Puras: reciben lo que manda /dashboard/ventas-canal ({ advisors, weeks }) y
// devuelven lo que la vista pinta.
//
// Ojo con la conversion: c = consultas que ENTRARON en el periodo y v = ventas
// PAGADAS en el periodo (pueden venir de consultas de semanas anteriores). Por
// eso una semana puede pasar del 100% y por eso el reporte se lee por mes.
import { CONVERSION_GOAL_PCT, conversionTone, pct, monthName } from '@/features/plan-comercial/planComercial'
import { formatValue } from '@/shared/lib/formatValue'

const n = (x) => formatValue(x, 'num')

export const CHANNELS = [
  { key: 'fb', label: 'Facebook' },
  { key: 'ig', label: 'Instagram' },
  { key: 'lk', label: 'LinkedIn' },
  { key: 'web', label: 'Web' },
  { key: 'bot', label: 'Chatbot' },
  { key: 'cot', label: 'Cotización' },
  { key: 'com', label: 'Comercial' },
  { key: 'other', label: 'Otros' }
]

// Momento del cliente (fn_client_moment); MEMBERS = consulta de un miembro.
export const CLIENT_TYPES = [
  { key: 'NEW', label: 'Nuevo' },
  { key: 'LDS', label: 'Lead' },
  { key: 'CWE', label: 'Comunidad' },
  { key: 'MEMBERS', label: 'Miembro' }
]

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// "S36 · 1–6 sep": la semana del Plan Comercial y sus días. Un tramo de un día
// (el 31) no repite el número.
export const weekLabel = ({ label, from, to }) => {
  const dias = from === to ? `${Number(from.slice(8))}` : `${Number(from.slice(8))}–${Number(to.slice(8))}`
  return `${label ? `${label} · ` : ''}${dias} ${MONTHS_SHORT[Number(to.slice(5, 7)) - 1]}`
}

export const conversion = ({ c, v }) => (c > 0 ? v / c : null)

// Matriz tipo de cliente × canal sumando las semanas pedidas (null = todo el mes).
export function sumWeeks (weeks = [], week = null) {
  const matrix = Object.fromEntries(CLIENT_TYPES.map((t) => [t.key, Object.fromEntries(CHANNELS.map((ch) => [ch.key, { c: 0, v: 0 }]))]))
  for (const w of weeks) {
    if (week !== null && w.week !== week) continue
    for (const t of CLIENT_TYPES) {
      for (const ch of CHANNELS) {
        const cell = w.rows?.[t.key]?.[ch.key]
        matrix[t.key][ch.key].c += Number(cell?.c || 0)
        matrix[t.key][ch.key].v += Number(cell?.v || 0)
      }
    }
  }
  return matrix
}

const add = (a, b) => ({ c: a.c + b.c, v: a.v + b.v })
const withRatio = (x) => ({ ...x, ratio: conversion(x), tone: conversionTone(conversion(x)) })

export const byChannel = (matrix) =>
  CHANNELS.map((ch) => withRatio({ ...ch, ...CLIENT_TYPES.reduce((s, t) => add(s, matrix[t.key][ch.key]), { c: 0, v: 0 }) }))

export const byType = (matrix) =>
  CLIENT_TYPES.map((t) => withRatio({ ...t, ...CHANNELS.reduce((s, ch) => add(s, matrix[t.key][ch.key]), { c: 0, v: 0 }) }))

export const totals = (matrix) => withRatio(byChannel(matrix).reduce((s, x) => add(s, x), { c: 0, v: 0 }))

// Variacion contra el mes anterior para las tarjetas. null si no hay base.
export function trend (now, before) {
  if (!before) return null
  const delta = (now - before) / before
  return { text: `${delta >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(delta * 100))}%`, tone: delta >= 0 ? 'ok' : 'bad' }
}

// Banda de lectura rapida: 4 conclusiones del mes, en frases.
export function insights ({ month, channels, types, total }) {
  if (!total.c && !total.v) return []
  const conMeta = (r) => (r === null ? 0 : Math.min(1, r / (CONVERSION_GOAL_PCT / 100) / 2))
  const items = [{
    key: 'conv',
    label: 'Conversión del mes',
    value: total.ratio === null ? '—' : `${pct(total.ratio)}%`,
    text: `${n(total.v)} ventas de ${n(total.c)} consultas en ${monthName(month).toLowerCase()}. La meta es ${CONVERSION_GOAL_PCT}%.`,
    tone: total.tone === 'neutro' ? '' : total.tone,
    bar: conMeta(total.ratio)
  }]

  const topVentas = [...channels].sort((a, b) => b.v - a.v)[0]
  if (topVentas?.v) {
    items.push({
      key: 'top',
      label: 'Canal que más vende',
      value: topVentas.label,
      text: `${n(topVentas.v)} ventas, el ${pct(topVentas.v / total.v)}% del mes${topVentas.ratio === null ? '' : `, convierte ${pct(topVentas.ratio)}%`}.`,
      tone: 'ok',
      bar: topVentas.v / total.v
    })
  }

  // Fuga: el canal con mas consultas que convierte bajo la meta.
  const fuga = channels.filter((ch) => ch.tone === 'bad').sort((a, b) => b.c - a.c)[0]
  items.push(fuga
    ? { key: 'fuga', label: 'Dónde se pierden', value: fuga.label, text: `${n(fuga.c)} consultas y solo ${pct(fuga.ratio)}% compra. Revisar el seguimiento.`, tone: 'bad', bar: fuga.c / total.c }
    : { key: 'fuga', label: 'Dónde se pierden', value: 'Ningún canal', text: `Todos los canales con consultas convierten sobre ${CONVERSION_GOAL_PCT}%.`, tone: 'ok', bar: null })

  const mejorTipo = types.filter((t) => t.c >= 10).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))[0]
  if (mejorTipo) {
    items.push({
      key: 'tipo',
      label: 'Cliente que más compra',
      value: mejorTipo.label,
      text: `Convierte ${pct(mejorTipo.ratio)}% (${n(mejorTipo.v)} de ${n(mejorTipo.c)}).`,
      tone: mejorTipo.tone === 'neutro' ? '' : mejorTipo.tone,
      bar: conMeta(mejorTipo.ratio)
    })
  }
  return items
}
