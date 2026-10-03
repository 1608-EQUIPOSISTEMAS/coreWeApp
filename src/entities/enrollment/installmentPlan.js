// Motor de cuotas automaticas de una inscripcion (regla de Comercial, la
// correcta segun negocio 02/10/26; B2B y Fundacion usaban otra copia con +14 dias).
// Todo trabaja con fechas calendario 'YYYY-MM-DD' y aritmetica UTC: el resultado
// no depende de la zona horaria de la maquina (ver shared/lib/localDate.js).

const COURSE_TYPES = ['we_program_type_course', 'we_program_type_minicourse']
const SPECIALIZATION = 'we_program_type_specialization'

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100

function parts (iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}
// Date.UTC normaliza mes/dia fuera de rango (mes 13 = enero del año siguiente).
function iso (y, m, d) {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
}
function addDays (date, days) {
  const { y, m, d } = parts(date)
  return iso(y, m, d + days)
}
// Dia fijo (1 o 15) N meses despues. Con dia <= 28 nunca se desborda: el
// setMonth de antes sobre un 31 saltaba un mes (31/01 + 1 mes = 03/03).
function monthDay (date, monthsAhead, day) {
  const { y, m } = parts(date)
  return iso(y, m + monthsAhead, day)
}
function daysInMonth (y, m) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
}

// Primera fecha clave (dias del mes en `keys`) en o despues de `min`. Un dia
// que el mes no tiene (30 en febrero) cae en su ultimo dia.
export function snapToKeyDate (min, keys) {
  const { y, m } = parts(min)
  for (let mo = 0; mo <= 4; mo++) {
    for (const k of keys) {
      const candidate = iso(y, m + mo, Math.min(k, daysInMonth(y, m + mo)))
      if (candidate >= min) return candidate
    }
  }
  return min
}

// Cuantas cuotas propone el sistema segun el tipo de programa.
export function autoInstallmentCount ({ categoryAlias, sessionsPerWeek = 1, childrenCount = 0 }) {
  if (COURSE_TYPES.includes(categoryAlias)) return 1
  if (categoryAlias === 'we_program_type_pee') return sessionsPerWeek >= 2 ? 2 : 3
  if (categoryAlias === 'we_program_type_diploma') return sessionsPerWeek >= 2 ? 4 : 5
  if (categoryAlias === SPECIALIZATION) {
    if (childrenCount <= 2) return 2
    return sessionsPerWeek >= 2 ? 2 : 3
  }
  return 1
}

// Reparto entero: cada cuota lleva el piso y la ultima absorbe el resto.
export function splitAmounts (balance, count) {
  const base = Math.floor(balance / count)
  const rest = round2(balance - base * count)
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? round2(base + rest) : base))
}

function dueDates ({ count, start, categoryAlias, sessionsPerWeek }) {
  // Curso / minicurso: una cuota a los 6 dias del inicio.
  if (COURSE_TYPES.includes(categoryAlias)) return [addDays(start, 6)]

  // Especializacion: fechas clave. La siguiente cuota es la proxima fecha clave
  // DESPUES de la anterior aunque quede pegada (30 -> 1): regla de negocio.
  if (categoryAlias === SPECIALIZATION) {
    const d1 = snapToKeyDate(addDays(start, 7), [1, 15, 30])
    const d2 = snapToKeyDate(addDays(d1, 1), [1, 15])
    const d3 = snapToKeyDate(addDays(d2, 1), [1, 15, 30])
    return [d1, d2, d3].slice(0, count)
  }

  // PEE / Diplomado intensivo (2+ sesiones por semana): a los 15 dias y luego cada 20.
  if (sessionsPerWeek >= 2) {
    const first = addDays(start, 15)
    return Array.from({ length: count }, (_, i) => addDays(first, i * 20))
  }
  // PEE / Diplomado regular: el 15 del mes siguiente y luego el 1 de cada mes.
  return Array.from({ length: count }, (_, i) => (i === 0 ? monthDay(start, 1, 15) : monthDay(start, 1 + i, 1)))
}

// Plan automatico. balance = total - inicial; start = inicio de la edicion
// ('YYYY-MM-DD') o, sin edicion, `today`.
export function buildAutoInstallmentPlan ({ balance, count, start, today, categoryAlias, sessionsPerWeek = 1 }) {
  if (!(balance > 0) || count < 1) return []
  const dates = dueDates({ count, start: start || today, categoryAlias, sessionsPerWeek })
  const amounts = splitAmounts(balance, dates.length)
  return dates.map((due_date, i) => ({ installment_number: i + 1, amount: amounts[i], due_date }))
}

// Plan manual de `count` cuotas: reusa las fechas del automatico y, si el
// asesor pide mas, sigue el dia 1 de los meses siguientes.
export function seedManualPlan ({ balance, count, autoPlan, today }) {
  if (!(balance > 0) || count < 1) return []
  const amounts = splitAmounts(balance, count)
  const last = autoPlan[autoPlan.length - 1]?.due_date || today
  return amounts.map((amount, i) => ({
    installment_number: i + 1,
    amount,
    due_date: autoPlan[i]?.due_date || monthDay(last, i - autoPlan.length + 1, 1)
  }))
}

// Reserva partida: la parte diferida entra como una cuota mas, ordenada por
// fecha y renumerada.
export function mergeDeferredReserve (plan, { amount, dueDate }) {
  if (!(amount > 0) || !dueDate) return plan
  const deferred = { installment_number: 0, amount, due_date: dueDate, is_reserva_diferida: true, _editableIdx: -1 }
  return [...plan, deferred]
    .sort((a, b) => (!a.due_date ? 1 : !b.due_date ? -1 : a.due_date.localeCompare(b.due_date)))
    .map((c, i) => ({ ...c, installment_number: i + 1 }))
}
