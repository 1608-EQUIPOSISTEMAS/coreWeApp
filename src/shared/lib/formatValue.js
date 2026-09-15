// Cifras en pantalla (es-PE). Una sola regla para KPIs, tablas y gráficos: si
// cada vista formatea a su manera conviven "S/ 1,200", "1200.00" y "S/.1200".
// `unidad` es la del contrato de resultados: soles | pct | horas | texto | num.
const es = (n, decimales = 0) => Number(n).toLocaleString('es-PE', { maximumFractionDigits: decimales })

export function formatValue (valor, unidad) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (unidad === 'texto') return valor
  if (unidad === 'soles') return `S/ ${es(valor)}`
  if (unidad === 'pct') return `${es(valor, 1)}%`
  if (unidad === 'horas') return `${es(valor, 1)} h`
  return es(valor, 1)
}

// Para espacios chicos (centro de una dona, eje de un gráfico): "S/ 1,256,059"
// no entra, "S/ 1.3 M" sí. La cifra exacta va en la leyenda o el tooltip.
export function formatCompact (valor, unidad) {
  const n = Number(valor)
  if (unidad !== 'soles' || valor === null || !Number.isFinite(n) || Math.abs(n) < 10000) return formatValue(valor, unidad)
  return `S/ ${n.toLocaleString('es-PE', { notation: 'compact', maximumFractionDigits: 1 })}`
}
