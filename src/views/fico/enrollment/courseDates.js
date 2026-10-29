// Fechas de un curso del paquete como las lee FICO: "14 nov – 19 dic 2026" y
// su duración en semanas. Se parte el 'YYYY-MM-DD' a mano (sin TZ shift).
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

function parse (iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null
}

const day = p => `${p.d} ${MONTHS[p.m - 1]}`

export function shortDate (iso) {
  const p = parse(iso)
  return p ? `${day(p)} ${p.y}` : ''
}

export function fmtCourseRange (startIso, endIso) {
  const s = parse(startIso)
  const e = parse(endIso)
  if (!s || !e) return shortDate(startIso || endIso) || '—'
  return `${s.y === e.y ? day(s) : `${day(s)} ${s.y}`} – ${day(e)} ${e.y}`
}

export function courseWeeks (startIso, endIso) {
  const s = parse(startIso)
  const e = parse(endIso)
  if (!s || !e) return 0
  const days = (Date.UTC(e.y, e.m - 1, e.d) - Date.UTC(s.y, s.m - 1, s.d)) / 86400000
  return days < 0 ? 0 : Math.max(1, Math.ceil(days / 7))
}

export const weeksLabel = n => `${n} ${n === 1 ? 'semana' : 'semanas'}`
