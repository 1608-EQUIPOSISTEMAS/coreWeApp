// Reglas de presentacion de Cobranzas (sin I/O). Los montos llegan separados
// por moneda desde el backend (summarizeCollections): aqui se muestran juntos
// pero nunca se suman entre si.

const money = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

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
