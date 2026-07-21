<template>
  <div class="bot-tab">
    <!-- Filter bar tipo Leads (ep-filter-bar) -->
    <section class="ep-section ep-filter-bar">
      <div class="ep-filter-bar-main">
        <div class="ep-quick-row">
          <span class="ep-section-eyebrow">
            <i class="fa-solid fa-chart-pie"></i>
            Métricas de Atención Automatizada
          </span>
          <span class="ep-section-hint">Rendimiento del bot y volumen de solicitudes</span>
        </div>
        <div class="ep-toolbar">
          <div class="filter-date-wrap">
            <i class="fa-regular fa-calendar filter-icon"></i>
            <BaseDatePicker
              v-model="dateRange"
              :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
              class="filter-input"
              placeholder="Filtrar por fechas..."
              @on-change="handleDateChange"
            />
          </div>
        </div>
      </div>
    </section>

    <div v-if="isLoading">
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-blue-light text-blue"><i class="fa-solid fa-ticket"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Total Solicitudes</span>
              <span class="kpi-value"><span class="skel-kpi"></span></span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-amber-light text-amber"><i class="fa-solid fa-clock"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Pendientes de Acción</span>
              <span class="kpi-value"><span class="skel-kpi"></span></span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-teal-light text-teal"><i class="fa-solid fa-check-double"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Tickets Solucionados</span>
              <span class="kpi-value"><span class="skel-kpi"></span></span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-yellow-light text-yellow"><i class="fa-solid fa-star"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">CSAT Promedio</span>
              <span class="kpi-value"><span class="skel-kpi"></span></span>
            </div>
          </div>
        </div>
      </div>
      <div class="exec-loader py-5">
        <div class="loader-ring"></div>
        <p class="text-muted small mt-2 fw-600">Calculando métricas...</p>
      </div>
    </div>

    <div v-else-if="metrics">
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-blue-light text-blue"><i class="fa-solid fa-ticket"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Total Solicitudes</span>
              <span class="kpi-value">{{ metrics.total_tickets }}</span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-amber-light text-amber"><i class="fa-solid fa-clock"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Pendientes de Acción</span>
              <span class="kpi-value">{{ metrics.tickets_pendientes }}</span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-teal-light text-teal"><i class="fa-solid fa-check-double"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Tickets Solucionados</span>
              <span class="kpi-value">{{ metrics.tickets_solucionados }}</span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card">
            <div class="kpi-icon bg-yellow-light text-yellow"><i class="fa-solid fa-star"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">CSAT Promedio</span>
              <span class="kpi-value">{{ metrics.csat_avg_score || 'N/A' }} <span class="small fw-500 text-muted">/ 5.0</span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-md-8">
          <div class="chart-card h-100">
            <h6 class="fieldset-title mb-3">Volumen de Solicitudes por Día</h6>
            <apexchart type="area" height="300" :options="chartEvolucionOptions" :series="chartEvolucionSeries"></apexchart>
          </div>
        </div>

        <div class="col-md-4">
          <div class="chart-card h-100">
            <h6 class="fieldset-title mb-3">Distribución por Tipo</h6>
            <apexchart type="donut" height="300" :options="chartTiposOptions" :series="chartTiposSeries"></apexchart>
          </div>
        </div>
      </div>

      <!-- ═══ BOT vs HUMANO ═══════════════════════════════════════════ -->
      <h5 class="section-title mt-5 mb-3">Rendimiento del Bot vs Asesor Humano</h5>
      <div class="row g-4">
        <div class="col-md-8">
          <div class="chart-card h-100">
            <h6 class="fieldset-title mb-3">CSAT Promedio — Bot vs Asesor</h6>
            <apexchart type="bar" height="170" :options="chartBotHumanOptions" :series="chartBotHumanSeries"></apexchart>
          </div>
        </div>
        <div class="col-md-4 d-flex flex-column gap-3">
          <div class="kpi-card flex-fill">
            <div class="kpi-icon bg-teal-light text-teal"><i class="fa-solid fa-robot"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">% Resuelto por Bot</span>
              <span class="kpi-value">{{ pctResueltoBot }}<span class="small fw-500 text-muted">%</span></span>
              <span class="small text-muted mt-1">{{ botVsHuman.bot_count || 0 }} conversaciones</span>
            </div>
          </div>
          <div class="kpi-card flex-fill">
            <div class="kpi-icon bg-slate-light text-slate"><i class="fa-solid fa-user-tie"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">% Escalado a Asesor</span>
              <span class="kpi-value">{{ pctEscaladoHumano }}<span class="small fw-500 text-muted">%</span></span>
              <span class="small text-muted mt-1">{{ botVsHuman.human_count || 0 }} conversaciones</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ DISTRIBUCIÓN DE CSAT ════════════════════════════════════ -->
      <h5 class="section-title mt-5 mb-3">Distribución de Calificaciones (CSAT)</h5>
      <div class="row g-4">
        <div class="col-md-8">
          <div class="chart-card h-100">
            <h6 class="fieldset-title mb-3">Cantidad de Respuestas por Rating</h6>
            <apexchart type="bar" height="200" :options="chartCsatDistOptions" :series="chartCsatDistSeries"></apexchart>
          </div>
        </div>
        <div class="col-md-4 d-flex flex-column gap-3">
          <div class="kpi-card flex-fill">
            <div class="kpi-icon bg-emerald-light text-emerald"><i class="fa-solid fa-thumbs-up"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">% Promotores (4-5⭐)</span>
              <span class="kpi-value">{{ pctPromoters }}<span class="small fw-500 text-muted">%</span></span>
            </div>
          </div>
          <div class="kpi-card flex-fill">
            <div class="kpi-icon bg-red-light text-red"><i class="fa-solid fa-thumbs-down"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">% Detractores (1-2⭐)</span>
              <span class="kpi-value">{{ pctDetractors }}<span class="small fw-500 text-muted">%</span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ MEMBRESÍAS ══════════════════════════════════════════════ -->
      <h5 class="section-title mt-5 mb-3">Consumo por Tipo de Membresía</h5>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="chart-card h-100">
            <h6 class="fieldset-title mb-3">Distribución de Consultas</h6>
            <apexchart
              v-if="chartMembershipSeries.length"
              type="donut"
              height="200"
              :options="chartMembershipOptions"
              :series="chartMembershipSeries"
            ></apexchart>
            <div v-else class="empty-chart">
              <i class="fa-solid fa-crown"></i>
              <p>Sin datos en el rango</p>
            </div>
          </div>
        </div>
        <div class="col-md-8">
          <div class="chart-card h-100">
            <h6 class="fieldset-title mb-3">Detalle por Membresía</h6>
            <div class="table-responsive-custom">
              <table class="exec-table">
                <thead>
                  <tr class="thead-sub">
                    <th class="ts">Membresía</th>
                    <th class="ts text-center">Consultas</th>
                    <th class="ts text-center">Tickets</th>
                    <th class="ts text-center">CSAT Promedio</th>
                    <th class="ts text-center">Alumnos Únicos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in membershipBreakdown" :key="m.tier" class="tbody-row">
                    <td class="td-a">
                      <span class="tier-pill" :class="tierPillClass(m.tier)">
                        <i class="fa-solid" :class="tierIconClass(m.tier)"></i>
                        {{ tierLabel(m.tier) }}
                      </span>
                    </td>
                    <td class="td-a text-center fw-700">{{ m.consultas || 0 }}</td>
                    <td class="td-a text-center">{{ m.tickets || 0 }}</td>
                    <td class="td-a text-center">
                      <span v-if="m.csat_avg" class="fw-600" :class="csatColorClass(m.csat_avg)">{{ Number(m.csat_avg).toFixed(1) }}</span>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td class="td-a text-center">{{ m.alumnos_unicos || 0 }}</td>
                  </tr>
                  <tr v-if="!membershipBreakdown.length">
                    <td colspan="5" class="empty-state-sm">Sin consultas en el rango seleccionado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ EMBUDO DE TICKETS ═══════════════════════════════════════ -->
      <h5 class="section-title mt-5 mb-3">Estado de los Tickets</h5>
      <div class="row g-4 mb-4">
        <div class="col-md-8">
          <div class="chart-card h-100">
            <h6 class="fieldset-title mb-3">Embudo de Estados</h6>
            <apexchart type="bar" height="170" :options="chartFunnelOptions" :series="chartFunnelSeries"></apexchart>
          </div>
        </div>
        <div class="col-md-4 d-flex flex-column gap-3">
          <div class="kpi-card flex-fill">
            <div class="kpi-icon bg-red-light text-red"><i class="fa-solid fa-arrow-trend-down"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Tasa de Abandono</span>
              <span class="kpi-value">{{ tasaAbandono }}<span class="small fw-500 text-muted">%</span></span>
              <span class="small text-muted mt-1">{{ ticketFunnel.abandonados || 0 }} tickets</span>
            </div>
          </div>
          <div class="kpi-card flex-fill">
            <div class="kpi-icon bg-amber-light text-amber"><i class="fa-solid fa-hourglass-half"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Pendientes</span>
              <span class="kpi-value">{{ ticketFunnel.pendientes || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onActivated, inject, computed } from 'vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { ServiceKeys } from '@/services'
import apexchart from 'vue3-apexcharts'
const botService = inject(ServiceKeys.Bot)
const isLoading = ref(true)
const metrics = ref(null)
const dateRange = ref(null)
const filters = ref({ from_date: null, to_date: null })

// === FETCH DATA ===
async function fetchMetrics() {
  isLoading.value = true
  try {
    const response = await botService.botDashboardMetricsGet(filters.value)
    metrics.value = response.data
  } catch (error) {
    console.error("Error obteniendo métricas del bot", error)
  } finally {
    isLoading.value = false
  }
}

function handleDateChange(dates, dateStr) {
  if (dateStr && dateStr.includes(' a ')) {
    const [start, end] = dateStr.split(' a ')
    filters.value.from_date = start
    filters.value.to_date = end
  } else if (dateStr) {
    filters.value.from_date = dateStr
    filters.value.to_date = dateStr
  } else {
    filters.value.from_date = null
    filters.value.to_date = null
  }
  fetchMetrics()
}

// === CONFIGURACIÓN DE GRÁFICOS (APEXCHARTS) ===

// 1. Gráfico de Evolución (Líneas/Área)
const chartEvolucionSeries = computed(() => {
  if (!metrics.value || !metrics.value.tickets_por_fecha) return []
  return [{
    name: 'Solicitudes',
    data: metrics.value.tickets_por_fecha.map(item => item.cantidad)
  }]
})

const chartEvolucionOptions = computed(() => {
  const categories = metrics.value?.tickets_por_fecha?.map(item => item.fecha) || []
  return {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#10b981'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: categories, tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val) => Math.round(val) } }
  }
})

// 2. Gráfico de Tipos (Donut)
const chartTiposSeries = computed(() => {
  if (!metrics.value || !metrics.value.tickets_por_tipo) return []
  return metrics.value.tickets_por_tipo.map(item => item.cantidad)
})

const chartTiposOptions = computed(() => {
  const labels = metrics.value?.tickets_por_tipo?.map(item => item.tipo.replace(/_/g, ' ')) || []
  return {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: labels,
    colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
    plotOptions: {
      pie: { donut: { size: '70%', labels: { show: true, name: { show: true }, value: { show: true } } } }
    },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  }
})

// 3. BOT vs HUMANO
const botVsHuman = computed(() => metrics.value?.bot_vs_human || {})

const pctResueltoBot = computed(() => {
  const bot = Number(botVsHuman.value.bot_count || 0)
  const human = Number(botVsHuman.value.human_count || 0)
  const total = bot + human
  if (!total) return 0
  return Math.round((bot / total) * 100)
})

const pctEscaladoHumano = computed(() => {
  const pct = 100 - pctResueltoBot.value
  return pctResueltoBot.value === 0 && !botVsHuman.value.human_count ? 0 : pct
})

const chartBotHumanSeries = computed(() => [{
  name: 'CSAT Promedio',
  data: [
    Number(botVsHuman.value.bot_csat_avg || 0).toFixed(2),
    Number(botVsHuman.value.human_csat_avg || 0).toFixed(2),
  ]
}])

const chartBotHumanOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', sparkline: { enabled: false } },
  plotOptions: { bar: { borderRadius: 4, distributed: true, horizontal: true, barHeight: '55%' } },
  colors: ['#10b981', '#64748b'],
  dataLabels: {
    enabled: true,
    formatter: (val) => `${Number(val).toFixed(2)} ⭐`,
    style: { fontSize: '12px', fontWeight: 700, colors: ['#fff'] },
    offsetX: 0,
  },
  xaxis: {
    categories: ['Resueltos por Bot', 'Resueltos por Asesor'],
    min: 0, max: 5,
    labels: { formatter: (v) => Number(v).toFixed(1), style: { fontSize: '10px' } },
    axisTicks: { show: false }
  },
  yaxis: { labels: { style: { fontSize: '11px', fontWeight: 600 } } },
  grid: { padding: { top: -10, bottom: -5, left: 5, right: 20 } },
  legend: { show: false },
  tooltip: { y: { formatter: (val) => `${val} / 5.0` } }
}))

// 4. DISTRIBUCIÓN DE CSAT
const csatDistribution = computed(() => metrics.value?.csat_distribution || [])

const totalCsat = computed(() => csatDistribution.value.reduce((a, b) => a + Number(b.cantidad || 0), 0))

const pctPromoters = computed(() => {
  if (!totalCsat.value) return 0
  const p = csatDistribution.value
    .filter(r => Number(r.rating) >= 4)
    .reduce((a, b) => a + Number(b.cantidad || 0), 0)
  return Math.round((p / totalCsat.value) * 100)
})

const pctDetractors = computed(() => {
  if (!totalCsat.value) return 0
  const d = csatDistribution.value
    .filter(r => Number(r.rating) <= 2)
    .reduce((a, b) => a + Number(b.cantidad || 0), 0)
  return Math.round((d / totalCsat.value) * 100)
})

const chartCsatDistSeries = computed(() => [{
  name: 'Respuestas',
  data: [1, 2, 3, 4, 5].map(rating => {
    const found = csatDistribution.value.find(r => Number(r.rating) === rating)
    return found ? Number(found.cantidad) : 0
  })
}])

const chartCsatDistOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  plotOptions: { bar: { borderRadius: 4, distributed: true, columnWidth: '32%' } },
  colors: ['#ef4444', '#f97316', '#94a3b8', '#10b981', '#eab308'],
  dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 700, colors: ['#fff'] } },
  xaxis: {
    categories: ['1⭐', '2⭐', '3⭐', '4⭐', '5⭐'],
    labels: { style: { fontSize: '11px', fontWeight: 600 } },
    axisTicks: { show: false }
  },
  yaxis: { labels: { formatter: (v) => Math.round(v), style: { fontSize: '10px' } } },
  grid: { padding: { top: -10, bottom: -5 } },
  legend: { show: false },
  tooltip: { y: { formatter: (val) => `${val} respuestas` } }
}))

// 5. MEMBRESÍAS
const membershipBreakdown = computed(() => metrics.value?.membership_breakdown || [])

const chartMembershipSeries = computed(() =>
  membershipBreakdown.value.map(m => Number(m.consultas || 0))
)

const chartMembershipOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' },
  labels: membershipBreakdown.value.map(m => tierLabel(m.tier)),
  colors: membershipBreakdown.value.map(m => tierColor(m.tier)),
  plotOptions: {
    pie: { donut: { size: '62%', labels: { show: false } } }
  },
  dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 700 }, dropShadow: { enabled: false } },
  legend: { position: 'bottom', fontSize: '11px', markers: { size: 8 }, itemMargin: { horizontal: 6, vertical: 2 } },
  stroke: { width: 0 }
}))

// 6. EMBUDO DE TICKETS
const ticketFunnel = computed(() => metrics.value?.ticket_funnel || {})

const tasaAbandono = computed(() => {
  const f = ticketFunnel.value
  const raw = Number(f.tasa_abandono)
  if (!isNaN(raw) && raw !== 0) return Math.round(raw)
  const total = Number(f.pendientes || 0) + Number(f.resueltos || 0) + Number(f.abandonados || 0)
  if (!total) return 0
  return Math.round((Number(f.abandonados || 0) / total) * 100)
})

const chartFunnelSeries = computed(() => [{
  name: 'Tickets',
  data: [
    Number(ticketFunnel.value.pendientes || 0),
    Number(ticketFunnel.value.resueltos || 0),
    Number(ticketFunnel.value.abandonados || 0),
  ]
}])

const chartFunnelOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  plotOptions: { bar: { borderRadius: 4, distributed: true, horizontal: true, barHeight: '55%' } },
  colors: ['#f59e0b', '#10b981', '#94a3b8'],
  dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 700, colors: ['#fff'] }, offsetX: 0 },
  xaxis: {
    categories: ['Pendientes', 'Resueltos', 'Abandonados'],
    labels: { formatter: (v) => Math.round(v), style: { fontSize: '10px' } },
    axisTicks: { show: false }
  },
  yaxis: { labels: { style: { fontSize: '11px', fontWeight: 600 } } },
  grid: { padding: { top: -10, bottom: -5, left: 5, right: 20 } },
  legend: { show: false }
}))

// Helpers de tier
function tierLabel (tier) {
  if (!tier || tier === 'NO_MEMBER') return 'No Miembro'
  return tier
}

function tierColor (tier) {
  if (tier === 'WE GOLD')  return '#eab308'
  if (tier === 'WE PLAT')  return '#94a3b8'
  if (tier === 'WE BLACK') return '#1e293b'
  return '#cbd5e1'
}

function tierPillClass (tier) {
  if (tier === 'WE GOLD')  return 'tier-gold'
  if (tier === 'WE PLAT')  return 'tier-plat'
  if (tier === 'WE BLACK') return 'tier-black'
  return 'tier-none'
}

function tierIconClass (tier) {
  if (tier === 'WE GOLD' || tier === 'WE PLAT' || tier === 'WE BLACK') return 'fa-crown'
  return 'fa-user'
}

function csatColorClass (score) {
  const s = Number(score)
  if (s >= 4) return 'text-success'
  if (s >= 3) return 'text-warning'
  return 'text-danger'
}

onActivated(() => {
  fetchMetrics()
})
</script>

<style scoped>
.bot-tab { display: flex; flex-direction: column; gap: 0; }

/* === Filter bar (estilo Leads) === */
.ep-section {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
}
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border, #E8E8E3);
  border-radius: 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ep-filter-bar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.ep-quick-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.ep-toolbar {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; flex-wrap: wrap;
  flex: 1 1 auto;
}
.ep-section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--e-text, #14140F);
}
.ep-section-eyebrow i { color: var(--e-accent, #10B981); font-size: 12px; }
.ep-section-hint {
  font-size: 11.5px;
  color: var(--e-text-secondary, #6F6F66);
  font-weight: 500;
}

/* === Filtro de fecha === */
.filter-date-wrap { position: relative; display: flex; align-items: center; }
.filter-icon { position: absolute; left: 9px; color: var(--e-text-muted, #A0A099); font-size: 11px; pointer-events: none; z-index: 1; }
.filter-input { height: 34px; padding: 0 10px 0 28px; border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px; background: #fff; font-size: 12px; font-family: inherit; color: var(--e-text, #14140F); outline: none; transition: border-color .15s, box-shadow .15s; min-width: 230px; }
.filter-input:focus { border-color: var(--e-accent, #10B981); box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
.filter-input::placeholder { color: var(--e-text-muted, #A0A099); font-size: 11.5px; }

/* === KPI cards === */
.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--e-border, #E8E8E3);
  box-shadow: 0 1px 3px rgba(15, 23, 42, .04), 0 1px 2px rgba(15, 23, 42, .03);
  transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
}
.kpi-card:hover {
  border-color: var(--e-border-strong, #D4D4CC);
  box-shadow: 0 4px 10px rgba(15, 23, 42, .06), 0 2px 4px rgba(15, 23, 42, .04);
  transform: translateY(-1px);
}
.kpi-icon {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.bg-blue-light { background: #eff6ff; } .text-blue { color: #2563eb; }
.bg-amber-light { background: #fffbeb; } .text-amber { color: #d97706; }
.bg-teal-light { background: #ecfdf4; } .text-teal { color: #047857; }
.bg-yellow-light { background: #fefce8; } .text-yellow { color: #eab308; }
.bg-emerald-light { background: #ecfdf5; } .text-emerald { color: #059669; }
.bg-slate-light { background: #f1f5f9; } .text-slate { color: #475569; }
.bg-red-light { background: #fef2f2; } .text-red { color: #dc2626; }

.kpi-info { display: flex; flex-direction: column; }
.kpi-label { font-size: 10.5px; color: var(--e-text-secondary, #6F6F66); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
.kpi-value { font-size: 22px; font-weight: 700; color: var(--e-text, #14140F); line-height: 1.2; margin-top: 4px; letter-spacing: -0.01em; }

/* === Chart card === */
.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  border: 1px solid var(--e-border, #E8E8E3);
  box-shadow: 0 1px 3px rgba(15, 23, 42, .04), 0 1px 2px rgba(15, 23, 42, .03);
}
.fieldset-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--e-text-secondary, #6F6F66);
  font-weight: 700;
  margin: 0;
}

/* === Loader === */
.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--e-border, #E8E8E3); border-top-color: var(--e-accent, #10B981); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* === Section titles === */
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--e-text, #14140F);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--e-border, #E8E8E3);
  margin: 0;
}

/* === Tier pills === */
.tier-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.tier-gold  { background: #fef3c7; color: #92400e; }
.tier-plat  { background: #e2e8f0; color: #334155; }
.tier-black { background: #1e293b; color: #f1f5f9; }
.tier-none  { background: #f1f5f9; color: #64748b; }

/* === Tabla embebida === */
.chart-card .table-responsive-custom { width: 100%; overflow-x: auto; }
.chart-card .exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.chart-card .thead-sub .ts {
  padding: 8px 12px; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
  font-weight: 600; border-bottom: 1px solid var(--e-border, #E8E8E3);
  background: var(--e-bg-subtle, #FAFAF8); color: var(--e-text-secondary, #6F6F66);
  white-space: nowrap; text-align: left;
}
.chart-card .thead-sub .ts.text-center { text-align: center; }
.chart-card .tbody-row td {
  padding: 9px 12px; border-bottom: 1px solid var(--e-border, #E8E8E3);
  vertical-align: middle; color: var(--e-text, #14140F);
}
.chart-card .tbody-row:last-child td { border-bottom: none; }
.chart-card .tbody-row:hover td { background: var(--e-bg-subtle, #FAFAF8); }
.chart-card .td-a { border-left: 1px solid transparent; }

.empty-state-sm {
  padding: 24px;
  text-align: center;
  color: var(--e-text-muted, #A0A099);
  font-size: 12px;
  font-weight: 500;
}

.empty-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 220px;
  color: var(--e-text-muted, #A0A099);
  font-size: 13px;
  font-weight: 500;
}
.empty-chart i { font-size: 32px; }
.empty-chart p { margin: 0; }

.text-success { color: #059669 !important; }
.text-warning { color: #d97706 !important; }
.text-danger  { color: #dc2626 !important; }
.text-muted   { color: var(--e-text-muted, #A0A099) !important; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-center { text-align: center; }
.small { font-size: 11.5px; }
.mt-1 { margin-top: 4px; }

/* === Dark mode === */
[data-coreui-theme="dark"] .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .ep-section-eyebrow { color: #F4F4F0; }
[data-coreui-theme="dark"] .filter-input { background: #1A1A14; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] .kpi-card,
[data-coreui-theme="dark"] .chart-card { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .kpi-value,
[data-coreui-theme="dark"] .section-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .chart-card .thead-sub .ts { background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .chart-card .tbody-row td { color: #E4E4DD; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .chart-card .tbody-row:hover td { background: #232319; }
</style>
