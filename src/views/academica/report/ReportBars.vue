<template>
  <div class="report-bars" :style="{ height: altura + 'px' }" role="img" :aria-label="titulo">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { isDark } from '@/utils/chartTheme'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

// Barras del informe académico. `grafico` = { categorias, series: [{ nombre, tono, datos }] }
// (features/reporte-academico/reportCharts.js). El canvas no lee variables CSS:
// los colores repiten los valores de los tokens --ds-* claro/oscuro.
const props = defineProps({
  grafico: { type: Object, required: true },
  titulo: { type: String, required: true },
  apilado: { type: Boolean, default: false },
  horizontal: { type: Boolean, default: false },
  // Línea de meta (solo barras horizontales con nota /20).
  meta: { type: Number, default: null },
  alto: { type: Number, default: 240 }
})

const TONOS = {
  claro: { ok: '#12A150', bad: '#D64545', warn: '#E08A1E', accent: '#3A63B8', soft: '#C9D6EC', meta: '#94A3B8' },
  oscuro: { ok: '#34D399', bad: '#F87171', warn: '#E9B872', accent: '#8FAADC', soft: '#3A4A66', meta: '#8A8A80' }
}
const tonos = computed(() => (isDark.value ? TONOS.oscuro : TONOS.claro))

// Nota /20 contra la meta: rojo bajo 15, ámbar hasta la meta, verde desde ella.
const colorPorNota = (n) => (n < 15 ? tonos.value.bad : n < (props.meta ?? 17) ? tonos.value.warn : tonos.value.ok)

const altura = computed(() => (props.horizontal
  ? Math.max(150, props.grafico.categorias.length * 38 + 40)
  : props.alto))

const reducedMotion = typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const chartData = computed(() => ({
  labels: props.grafico.categorias,
  datasets: [
    ...props.grafico.series.map((s) => ({
      label: s.nombre,
      data: s.datos,
      backgroundColor: s.tono === 'porNota' ? s.datos.map(colorPorNota) : tonos.value[s.tono],
      borderRadius: 3,
      maxBarThickness: props.horizontal ? 22 : 30
    })),
    ...(props.meta != null && props.horizontal
      ? [{
          // Barras horizontales: la meta es una línea vertical (x fijo por categoría).
          type: 'line',
          label: `Meta ${props.meta}`,
          data: props.grafico.categorias.map((c) => ({ x: props.meta, y: c })),
          borderColor: tonos.value.meta,
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 0
        }]
      : [])
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reducedMotion ? false : undefined,
  indexAxis: props.horizontal ? 'y' : 'x',
  plugins: {
    legend: {
      display: props.grafico.series.length > 1,
      position: 'bottom',
      labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } }
    },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { stacked: props.apilado, grid: { display: props.horizontal }, ticks: { font: { size: 11 } }, ...(props.horizontal && { min: 0, max: 20 }) },
    y: { stacked: props.apilado, grid: { display: !props.horizontal }, beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } }
  }
}))
</script>

<style scoped>
.report-bars { position: relative; width: 100%; }
</style>
