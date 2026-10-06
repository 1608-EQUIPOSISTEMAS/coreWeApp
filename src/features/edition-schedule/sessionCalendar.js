// Calendario de sesiones de una edicion: a partir del inicio se cuentan los dias
// del horario (lun-mie, sab...) y los feriados se saltan sin consumir sesion.
//
// Es la MISMA regla que el backend (buildSessionSchedule / getAllowedDays en
// edition.entity.js) y el PDF de programacion: si cambia aca, cambia alla. Antes
// vivia dos veces dentro de Editions.vue (fin calculado y vista previa).
//
// Aritmetica en UTC a proposito: en Lima (UTC-5) mezclar Date.UTC con getters
// locales corre la fecha un dia (ver memoria fechas-utc-en-lima).

const DAY_MS = 86400000
const LABEL_DAYS = [['dom', 0], ['lun', 1], ['mar', 2], ['mie', 3], ['mié', 3], ['jue', 4], ['vie', 5], ['sab', 6], ['sáb', 6]]
const SAFETY_DAYS = 1500

const toUtc = (ymd) => {
  const [y, m, d] = String(ymd || '').slice(0, 10).split('-').map(Number)
  return y && m && d ? Date.UTC(y, m - 1, d) : null
}
const toYmd = (ms) => new Date(ms).toISOString().slice(0, 10)
export const weekdayOf = (ymd) => (toUtc(ymd) === null ? -1 : new Date(toUtc(ymd)).getUTCDay())

// Dias de clase de una combinacion del catalogo we_day_combination. variable_2
// trae el JSON ([1,3]); si falta o esta roto se lee la descripcion ("Lun-Mie").
export function allowedDaysOf (combo) {
  if (!combo) return []
  try {
    const parsed = JSON.parse(combo.variable_2 ?? 'null')
    if (Array.isArray(parsed) && parsed.length) return parsed
  } catch { /* variable_2 malformado: cae a la descripcion */ }
  const label = String(combo.description || '').toLowerCase()
  return [...new Set(LABEL_DAYS.filter(([k]) => label.includes(k)).map(([, d]) => d))]
}

// Lista dia por dia hasta completar las sesiones: [{ date, status: 'valid' |
// 'holiday', sessionNum, desc }]. Los feriados que caen en dia de clase se
// listan (para que se vea por que se corrio el fin) pero no cuentan.
// holidays: Map 'YYYY-MM-DD' -> nombre del feriado.
export function sessionCalendar ({ startDate, sessions, allowedDays = [], holidays = new Map() }) {
  const start = toUtc(startDate)
  const total = Number(sessions) || 0
  if (start === null || total <= 0 || !allowedDays.length) return []
  const out = []
  let counted = 0
  for (let i = 0, t = start; i < SAFETY_DAYS && counted < total; i++, t += DAY_MS) {
    if (!allowedDays.includes(new Date(t).getUTCDay())) continue
    const date = toYmd(t)
    if (holidays.has(date)) {
      out.push({ date, status: 'holiday', sessionNum: '-', desc: holidays.get(date) })
    } else {
      counted++
      out.push({ date, status: 'valid', sessionNum: counted, desc: 'Sesión Regular' })
    }
  }
  return counted === total ? out : []
}

// Fecha de la ultima sesion, o null si no se puede calcular.
export function sessionEndDate (args) {
  const valid = sessionCalendar(args).filter((d) => d.status === 'valid')
  return valid.length ? valid[valid.length - 1].date : null
}
