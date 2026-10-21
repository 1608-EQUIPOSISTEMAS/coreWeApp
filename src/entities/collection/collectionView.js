// Reglas de Cobranzas (sin I/O). El backend manda TODAS las cuotas pendientes
// del mes; aqui se filtran y se resumen, asi los filtros combinados responden
// al instante. Soles y dolares se muestran juntos pero nunca se suman.

const money = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const currencySign = currency => (currency === 'USD' ? '$' : 'S/.')
const isoToDmy = iso => (iso ? iso.split('-').reverse().join('/') : '—')

const COLLECTION_STATES = ['overdue', 'today', 'upcoming']

// KPIs por estado con el monto SEPARADO por moneda: la clave lleva la moneda
// en el nombre para que ningun consumidor vuelva a sumarlas.
export function summarizeCollections (rows = []) {
  const kpis = { total_count: 0, total_amount_pen: 0, total_amount_usd: 0 }
  for (const state of COLLECTION_STATES) {
    Object.assign(kpis, { [`${state}_count`]: 0, [`${state}_amount_pen`]: 0, [`${state}_amount_usd`]: 0 })
  }
  for (const r of rows) {
    const amount = Number(r.amount) || 0
    const currency = r.currency === 'USD' ? 'usd' : 'pen'
    kpis.total_count++
    kpis[`total_amount_${currency}`] += amount
    if (!COLLECTION_STATES.includes(r.state_label)) continue
    kpis[`${r.state_label}_count`]++
    kpis[`${r.state_label}_amount_${currency}`] += amount
  }
  // Centimos: sumar floats deja 375.50000000000006
  for (const k of Object.keys(kpis)) {
    if (k.includes('_amount_')) kpis[k] = Math.round(kpis[k] * 100) / 100
  }
  return kpis
}

// Valor visible de cada columna filtrable. El desplegable de la columna y el
// filtro usan la MISMA funcion: lo que se marca es exactamente lo que se compara.
export const COLUMN_VALUE = {
  programa: r => r.program_name || '(Sin programa)',
  cuota: r => `C${r.installment_number}`,
  // Sin separador de miles: el desplegable ordena con collation numerica y
  // "1,045" lo leeria como 1 y 045.
  monto: r => `${currencySign(r.currency)} ${(Number(r.amount) || 0).toFixed(2)}`,
  vence: r => isoToDmy(r.due_date),
  asesor: r => r.seller_agent_name || '(Sin asesor)'
}

const normalize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// "Alumno": nombre, DNI, correo o celular. El celular se compara solo por
// digitos: el alumno se registra con "+51 987 654 321" y FICO busca "987654321".
function matchesStudent (row, text) {
  const needle = normalize(text).trim()
  if (!needle) return true
  const haystack = normalize([row.student_full_name, row.document_number, row.email].join(' '))
  if (haystack.includes(needle)) return true
  const digits = needle.replace(/\D/g, '')
  return digits.length >= 3 && String(row.phone || '').replace(/\D/g, '').includes(digits)
}

// Filtros por columna, combinables (AND entre columnas, OR dentro de una).
// El estado (pestañas) va aparte: los KPIs se calculan ANTES de aplicarlo
// para que cada pestaña muestre su conteo.
export function filterCollections (rows = [], { alumno = '', ...columns } = {}) {
  const active = Object.entries(columns).filter(([key, values]) => COLUMN_VALUE[key] && values?.length)
  return rows.filter(r =>
    matchesStudent(r, alumno) &&
    active.every(([key, values]) => values.includes(COLUMN_VALUE[key](r))))
}

// Orden por monto: 'desc' (mayor primero), 'asc' o null (orden del backend:
// vencimiento). No muta: la lista original sigue sirviendo a los KPIs.
export function sortByAmount (rows, direction) {
  if (!direction) return rows
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => sign * ((Number(a.amount) || 0) - (Number(b.amount) || 0)))
}

const INSTALLMENT_STATE = {
  paid: { stateLabel: 'Pagada', tono: 'ok' },
  overdue: { stateLabel: 'Vencida', tono: 'bad' },
  pending: { stateLabel: 'Pendiente', tono: 'warn' },
  annulled: { stateLabel: 'Anulada', tono: '' }
}

function installmentState (alias, dueDate, todayIso) {
  const a = alias || ''
  if (a.includes('paid')) return 'paid'
  if (a.includes('cancel')) return 'annulled'
  return dueDate && dueDate < todayIso ? 'overdue' : 'pending'
}

// Vista previa de Cobranzas: cada cuota de la venta (inicial incluida) con su
// estado y, si se pago, cuando y por que medio; mas los totales. Recibe la
// respuesta de /fico/paymentdetailget tal cual.
export function buildInstallmentTimeline (detail = {}, todayIso) {
  const payments = detail.payment_history || []
  const rows = (detail.installments || [])
    .slice()
    .sort((a, b) => a.installment_number - b.installment_number)
    .map(i => {
      const dueDate = i.due_date ? String(i.due_date).slice(0, 10) : null
      const state = installmentState(i.status_alias, dueDate, todayIso)
      const pay = payments.find(p => p.installment_id === i.installment_id)
      return {
        id: i.installment_id,
        label: i.installment_number === 0 ? 'Inicial' : `C${i.installment_number}`,
        amount: Number(i.amount) || 0,
        due_date: dueDate,
        state,
        ...INSTALLMENT_STATE[state],
        paid_on: pay?.payment_date ? String(pay.payment_date).slice(0, 10) : null,
        method: pay?.payment_method || null
      }
    })
  const sum = state => Math.round(rows.filter(r => r.state === state).reduce((s, r) => s + r.amount, 0) * 100) / 100
  const paid = sum('paid')
  const overdue = sum('overdue')
  return { rows, totals: { paid, overdue, balance: Math.round((sum('pending') + overdue) * 100) / 100 } }
}

// Monto de un grupo: soles como cifra principal; los dolares, si hay, van como
// segunda linea ("+ $ 93.00"). Un grupo solo en dolares muestra los dolares.
export function amountParts (pen, usd) {
  if (!(Number(pen) > 0) && Number(usd) > 0) return { main: `$ ${money(usd)}`, extra: null }
  return { main: `S/. ${money(pen)}`, extra: Number(usd) > 0 ? `+ $ ${money(usd)}` : null }
}

const CARDS = [
  { clave: 'total', label: 'Total a cobrar', icono: 'fa-coins', tono: 'info' },
  { clave: 'overdue', label: 'Vencidas', icono: 'fa-triangle-exclamation', tono: 'bad' },
  { clave: 'today', label: 'Vencen hoy', icono: 'fa-clock', tono: 'warn' },
  { clave: 'upcoming', label: 'Por vencer', icono: 'fa-calendar-check', tono: 'ok' }
]

export function buildCollectionCards (kpis = {}) {
  return CARDS.map(c => {
    const { main, extra } = amountParts(kpis[`${c.clave}_amount_pen`], kpis[`${c.clave}_amount_usd`])
    const count = Number(kpis[`${c.clave}_count`]) || 0
    return { ...c, valor: main, nota: [plural(count, 'cuota'), extra].filter(Boolean).join(' · ') }
  })
}

// Etiqueta de vencimiento de una cuota (state_label y days_to_due del backend).
export function dueLabel (state, daysToDue) {
  const days = Math.abs(Number(daysToDue) || 0)
  if (state === 'overdue') return days > 0 ? `Vencida hace ${days} d` : 'Vencida'
  if (state === 'today') return 'Vence hoy'
  return days <= 7 ? `En ${days} d` : 'Por vencer'
}

export const DUE_TONE = { overdue: 'bad', today: 'warn', upcoming: 'ok' }

const STATE_EXPORT_LABEL = { overdue: 'Vencida', today: 'Vence hoy', upcoming: 'Por vencer' }

// Filas del Excel de deudores: lo que FICO tiene en pantalla (pestaña, filtros
// y orden ya aplicados). Monto como numero y moneda aparte, para que Excel sume
// por columna sin mezclar soles con dolares.
export function buildCollectionsExport (rows = []) {
  const header = ['Alumno', 'DNI', 'Correo', 'Celular', 'Programa', 'Edición', 'Cuota', 'Moneda',
    'Monto', 'Vence', 'Estado', 'Días vencida', 'Asesor', 'Inscripción']
  return [header, ...rows.map(r => [
    r.student_full_name || '',
    r.document_number || '',
    r.email || '',
    r.phone || '',
    r.program_name || '',
    r.edition_code || '',
    `C${r.installment_number}`,
    r.currency === 'USD' ? 'USD' : 'PEN',
    (Number(r.amount) || 0).toFixed(2),
    isoToDmy(r.due_date),
    STATE_EXPORT_LABEL[r.state_label] || r.state_label || '',
    r.state_label === 'overdue' ? Math.abs(Number(r.days_to_due) || 0) : '',
    r.seller_agent_name || '',
    r.enrollment_id ?? ''
  ])]
}
