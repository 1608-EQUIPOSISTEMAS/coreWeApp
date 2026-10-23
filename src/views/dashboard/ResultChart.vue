<template>
  <div class="result-chart" :style="{ height: altura + 'px' }" role="img" :aria-label="grafico.titulo">
    <component :is="grafico.tipo === 'linea' ? Line : Bar" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'
import { isDark } from '@/utils/chartTheme'
import { formatValue, formatCompact } from '@/shared/lib/formatValue.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

// Traduce un gráfico del contrato de resultados (dashboard/results/results.entity.js)
// a Chart.js. La serie principal va en color y la referencia (típico, meta, mes
// anterior) en gris punteado: el ojo tiene que ir a la DIFERENCIA entre ambas.
const props = defineProps({
  grafico: { type: Object, required: true },
  alto: { type: Number, default: 260 }
})

// Derivados del navy de marca: el #002060 puro se pierde sobre fondo oscuro y
// satura sobre claro (ver memoria color-marca-we-navy).
const palette = computed(() => (isDark.value
  ? { principal: '#8FAADC', referencia: '#5A5A50', grid: '#2A2A22' }
  : { principal: '#3A63B8', referencia: '#A9B6CC', grid: '#EEF1F6' }))

// Varias series de igual rango (una por linea de negocio) no caben en
// principal/referencia: llevan `tono` y el color sale del token, como en ReportBars.
const TOKEN_POR_TONO = {
  accent: '--ds-accent', accent2: '--ds-accent-2', neutro: '--ds-reference', bad: '--ds-bad',
  envivo: '--ds-line-envivo', online: '--ds-line-online'
}
const tonos = computed(() => {
  void isDark.value
  const estilo = getComputedStyle(document.documentElement)
  return Object.fromEntries(Object.entries(TOKEN_POR_TONO).map(([tono, token]) => [tono, estilo.getPropertyValue(token).trim()]))
})

const horizontal = computed(() => props.grafico.tipo === 'barras-h')

// Las barras horizontales crecen con la cantidad de filas y de series por fila
// (ventas + periodo anterior son dos barras). Si la fila queda corta, Chart.js
// esconde etiquetas del eje y la barra queda sin nombre.
const altura = computed(() => (horizontal.value
  ? Math.max(160, props.grafico.categorias.length * (24 + 14 * props.grafico.series.length) + 60)
  : props.alto))

const reducedMotion = typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// `notas` (opcional, una por dato) se suma al tooltip: "Ventas: 229 (37%)".
// `tonosPorDato` pinta cada barra con su tono: una cascada marca en otro color
// los totales y las bajadas. Un dato [desde, hasta] es una barra flotante.
function seriesDataset ({ nombre, datos, rol, tono, notas, tonosPorDato }) {
  const color = tono ? tonos.value[tono] : rol === 'referencia' ? palette.value.referencia : palette.value.principal
  if (props.grafico.tipo === 'linea') {
    return {
      label: nombre,
      data: datos,
      notas,
      borderColor: color,
      backgroundColor: color,
      borderWidth: rol === 'referencia' ? 2 : 3,
      borderDash: rol === 'referencia' ? [6, 5] : [],
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.25,
      spanGaps: false
    }
  }
  const backgroundColor = tonosPorDato ? tonosPorDato.map(t => tonos.value[t] || color) : color
  return { label: nombre, data: datos, notas, backgroundColor, borderRadius: 4, maxBarThickness: 34 }
}

// Una meta o un promedio es UNA línea recta, no una serie: se dibuja como un
// dataset de línea constante, sin plugin de anotaciones.
function referenceLineDataset ({ valor, etiqueta }) {
  return {
    type: 'line',
    label: etiqueta,
    data: props.grafico.categorias.map(() => valor),
    borderColor: palette.value.referencia,
    borderWidth: 2,
    borderDash: [6, 5],
    pointRadius: 0,
    order: -1
  }
}

const chartData = computed(() => ({
  labels: props.grafico.categorias,
  datasets: [
    ...props.grafico.series.map(seriesDataset),
    ...(props.grafico.referencia ? [referenceLineDataset(props.grafico.referencia)] : [])
  ]
}))

const chartOptions = computed(() => {
  const { unidad } = props.grafico
  const valueAxis = {
    beginAtZero: true,
    grid: { color: palette.value.grid },
    border: { display: false },
    ticks: { callback: (v) => formatCompact(v, unidad), maxTicksLimit: 5 }
  }
  // Cada barra es un nombre: ninguno se salta aunque el eje vaya justo.
  const categoryAxis = { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false } }
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal.value ? 'y' : 'x',
    animation: reducedMotion ? false : { duration: 450 },
    // En barras horizontales la fila se elige por la altura del cursor (eje y);
    // con el eje x por defecto el tooltip mostraba el dato de otra fila.
    interaction: { mode: 'index', intersect: false, axis: horizontal.value ? 'y' : 'x' },
    plugins: {
      legend: {
        display: chartData.value.datasets.length > 1,
        position: 'bottom',
        align: 'start',
        // Línea para líneas y cuadrito para barras: el símbolo de la leyenda tiene que
        // parecerse a lo que dibuja, o la barra queda sin muestra de color.
        labels: { usePointStyle: true, pointStyle: props.grafico.tipo === 'linea' ? 'line' : 'rectRounded', boxWidth: 22, padding: 14 }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const nota = ctx.dataset.notas?.[ctx.dataIndex]
            // Una barra flotante no tiene "un valor": su nota dice lo que mide.
            if (Array.isArray(ctx.raw)) return nota ?? `${formatValue(ctx.raw[0], unidad)} → ${formatValue(ctx.raw[1], unidad)}`
            return `${ctx.dataset.label}: ${formatValue(ctx.raw, unidad)}${nota ? ` (${nota})` : ''}`
          }
        }
      }
    },
    scales: horizontal.value
      ? { x: valueAxis, y: categoryAxis }
      : { x: categoryAxis, y: valueAxis }
  }
})
</script>

<style scoped>
.result-chart { position: relative; width: 100%; }
</style>
