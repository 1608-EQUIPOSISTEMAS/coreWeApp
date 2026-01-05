<template>
  <div class="page">
    <h2 class="page-title">Cobertura de ediciones y forecast</h2>
    <p class="page-sub">Capacidad, matriculados y forecast ponderado (demo)</p>

    <div class="cards-grid">
      <div class="stat-card">
        <span class="stat-label">Ediciones próximas</span>
        <span class="stat-value">{{ editions.length }}</span>
        <span class="stat-foot">30–60 días</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Cobertura matriculados</span>
        <span class="stat-value">{{ (100*totals.enrolled/Math.max(1,totals.capacity)).toFixed(1) }}%</span>
        <span class="stat-foot">{{ totals.enrolled }}/{{ totals.capacity }} plazas</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Forecast cobertura</span>
        <span class="stat-value">{{ (100*totals.forecast/Math.max(1,totals.capacity)).toFixed(1) }}%</span>
        <span class="stat-foot success">ponderado por etapa</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Ingresos forecast</span>
        <span class="stat-value">S/ {{ totals.forecastRevenue.toLocaleString('es-PE') }}</span>
        <span class="stat-foot">precio medio ponderado</span>
      </div>
    </div>

    <!-- Cobertura por edición (stacked: matriculados + forecast pipeline) -->
    <div class="chart-card">
      <div class="chart-title">Cobertura por edición</div>
      <div class="chart-body">
        <Bar :data="barCoverage" :options="coverageOptions" />
      </div>
    </div>

    <!-- Tabla detalle -->
    <div class="table-card">
      <div class="chart-title">Detalle por edición</div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Programa / Edición</th>
              <th>Inicio</th>
              <th class="ta-right">Capacidad</th>
              <th class="ta-right">Matriculados</th>
              <th class="ta-right">Pipeline (pond.)</th>
              <th class="ta-right">Forecast</th>
              <th class="ta-right">Cobertura</th>
              <th class="ta-right">Precio</th>
              <th class="ta-right">Ingresos forecast</th>
              <th>Semáforo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in editions" :key="e.id">
              <td class="mono">{{ e.program }} — {{ e.label }}</td>
              <td>{{ e.start }}</td>
              <td class="ta-right">{{ e.capacity }}</td>
              <td class="ta-right">{{ e.enrolled }}</td>
              <td class="ta-right">{{ weightedPipeline(e).toFixed(1) }}</td>
              <td class="ta-right">{{ forecastUnits(e).toFixed(1) }}</td>
              <td class="ta-right">{{ (100*forecastUnits(e)/e.capacity).toFixed(1) }}%</td>
              <td class="ta-right">S/ {{ e.price.toLocaleString('es-PE') }}</td>
              <td class="ta-right">S/ {{ Math.round(forecastUnits(e)*e.price).toLocaleString('es-PE') }}</td>
              <td>
                <span class="badge" :class="badgeRisk(e)">
                  {{ riskLabel(e) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

// ---------- Ponderaciones por etapa (ajústalas a tu pipeline real)
const WEIGHTS = {
  contactado: 0.15,
  seguimiento: 0.35,
  pagara: 0.70,
}

// ---------- Demo ediciones
const editions = ref([
  {
    id: 1,
    program: 'Power BI',
    label: 'Ed. 2025-11',
    start: '12/11/2025',
    capacity: 45,
    enrolled: 22,
    pipeline: { contactado: 30, seguimiento: 18, pagara: 6 },
    price: 650,
  },
  {
    id: 2,
    program: 'Excel Profesional',
    label: 'Ed. 2025-12',
    start: '05/12/2025',
    capacity: 40,
    enrolled: 28,
    pipeline: { contactado: 20, seguimiento: 14, pagara: 4 },
    price: 490,
  },
  {
    id: 3,
    program: 'Gestión de Proyectos',
    label: 'Ed. 2026-01',
    start: '15/01/2026',
    capacity: 35,
    enrolled: 10,
    pipeline: { contactado: 26, seguimiento: 20, pagara: 5 },
    price: 1200,
  },
])

function weightedPipeline(e){
  const p = e.pipeline || {}
  return (p.contactado||0)*WEIGHTS.contactado +
         (p.seguimiento||0)*WEIGHTS.seguimiento +
         (p.pagara||0)*WEIGHTS.pagara
}
function forecastUnits(e){
  return Math.min(e.capacity, e.enrolled + weightedPipeline(e))
}

const totals = computed(()=>{
  const capacity = editions.value.reduce((a,b)=>a+b.capacity,0)
  const enrolled = editions.value.reduce((a,b)=>a+b.enrolled,0)
  const forecast = editions.value.reduce((a,b)=>a+forecastUnits(b),0)
  const forecastRevenue = editions.value.reduce((a,b)=>a+forecastUnits(b)*b.price,0)
  return { capacity, enrolled, forecast, forecastRevenue }
})

// Chart cobertura
const barCoverage = computed(()=>({
  labels: editions.value.map(e => `${e.program} (${e.label})`),
  datasets: [
    {
      label: 'Matriculados',
      data: editions.value.map(e => e.enrolled),
      backgroundColor: '#22c55e', stack: 'cov', borderRadius: 6,
    },
    {
      label: 'Pipeline ponderado',
      data: editions.value.map(e => Math.max(0, forecastUnits(e) - e.enrolled)),
      backgroundColor: '#f59e0b', stack: 'cov', borderRadius: 6,
    },
    {
      label: 'Capacidad restante',
      data: editions.value.map(e => Math.max(0, e.capacity - forecastUnits(e))),
      backgroundColor: '#e5e7eb', stack: 'cov', borderRadius: 6,
    },
  ]
}))
const coverageOptions = {
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{ position:'bottom' } },
  scales:{ x:{ stacked:true }, y:{ stacked:true, beginAtZero:true } }
}

// Semáforo de riesgo
function riskLabel(e){
  const cov = forecastUnits(e)/e.capacity
  if (cov >= 1) return 'Completa'
  if (cov >= .8) return 'En meta'
  if (cov >= .6) return 'Riesgo medio'
  return 'Riesgo alto'
}
function badgeRisk(e){
  const cov = forecastUnits(e)/e.capacity
  return cov>=1 ? 'badge-success'
    : cov>=.8 ? 'badge-info'
    : cov>=.6 ? 'badge-warning'
    : 'badge-danger'
}
</script>

<style scoped>
.page{display:flex;flex-direction:column;gap:1rem;padding:1rem}
.page-title{font-weight:600;font-size:1.15rem;color:#0f172a}
.page-sub{font-size:.8rem;color:#64748b;margin-top:-.35rem}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem}
.stat-card{background:#fff;border:1px solid #e5e7eb;border-radius:.7rem;padding:.7rem .85rem .6rem;display:flex;flex-direction:column;gap:.25rem}
.stat-label{font-size:.65rem;text-transform:uppercase;color:#6b7280}
.stat-value{font-size:1.25rem;font-weight:700;color:#111827}
.stat-foot{font-size:.65rem;color:#6b7280}.stat-foot.success{color:#166534}
.chart-card,.table-card{background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;overflow:hidden;display:flex;flex-direction:column}
.chart-title{padding:.6rem .75rem;border-bottom:1px solid #e5e7eb;font-size:.75rem;font-weight:600;color:#0f172a}
.chart-body{height:280px;padding:.75rem}
.table-responsive{width:100%;overflow:auto}
.table{width:100%;border-collapse:collapse;font-size:.85rem}
.table th,.table td{padding:.55rem .7rem;border-bottom:1px solid #f3f4f6}
.ta-right{text-align:right}
.badge{display:inline-block;padding:.15rem .45rem;border-radius:.5rem;border:1px solid transparent;font-size:.72rem}
.badge-success{background:#dcfce7;color:#166534;border-color:#bbf7d0}
.badge-info{background:#e0f2fe;color:#075985;border-color:#bae6fd}
.badge-warning{background:#fef3c7;color:#92400e;border-color:#fde68a}
.badge-danger{background:#fee2e2;color:#991b1b;border-color:#fecaca}
</style>
