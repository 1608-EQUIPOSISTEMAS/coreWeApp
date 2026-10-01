import { formatValue } from '@/shared/lib/formatValue.js'

// Las 4 cifras del día en Inscripciones, cada una comparada contra ayer.
// `invertida`: que suba es malo (más pendientes = más trabajo atrasado).
const KPIS = [
  { clave: 'total', label: 'Inscripciones hoy', icono: 'fa-user-plus', unidad: 'num' },
  { clave: 'pending', label: 'Pendientes de revisar', icono: 'fa-hourglass-half', unidad: 'num', invertida: true },
  { clave: 'confirmed', label: 'Confirmadas hoy', icono: 'fa-circle-check', unidad: 'num' },
  { clave: 'amount', label: 'Monto neto hoy', icono: 'fa-coins', unidad: 'soles' }
]

// Tono de la variación: ok si mejora, bad si empeora, '' si no cambia.
export function trendTone (delta, invertida = false) {
  if (!delta) return ''
  return (invertida ? delta < 0 : delta > 0) ? 'ok' : 'bad'
}

function trendText (delta, unidad) {
  if (!delta) return 'igual que ayer'
  return `${delta > 0 ? '+' : '−'}${formatValue(Math.abs(delta), unidad)} vs ayer`
}

// today/yesterday: { total, pending, confirmed, amount }; un null = el backend
// no pudo calcularlo y se muestra '—', nunca un 0 inventado.
export function buildDailyKpis (today = {}, yesterday = {}) {
  return KPIS.map(({ clave, label, icono, unidad, invertida = false }) => {
    const valor = today[clave] ?? null
    const ayer = yesterday[clave] ?? null
    const delta = valor === null ? null : valor - (ayer ?? 0)
    // Pendientes > 0 es trabajo por hacer: el icono avisa aunque no haya variación.
    const tono = clave === 'pending' && valor > 0 ? 'warn' : clave === 'confirmed' ? 'ok' : ''
    return {
      clave,
      label,
      icono,
      tono,
      valor: formatValue(valor, unidad),
      trend: delta === null ? null : { tono: trendTone(delta, invertida), texto: trendText(delta, unidad) },
      nota: valor === null ? 'Sin datos por ahora' : `Ayer: ${formatValue(ayer ?? 0, unidad)}`
    }
  })
}
