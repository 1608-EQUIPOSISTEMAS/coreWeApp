<template>
  <div class="exec-shell">

    <!-- ════════════════════════════════════════
         MASTHEAD
    ════════════════════════════════════════ -->
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Análisis Semanal de Conversión</span>
            <h1 class="brand-title">Reporte de Ventas por Canal</h1>
          </div>
        </div>

        <div class="masthead-actions">
          <!-- Toggle único: Tabla / Gráfico -->
          <button @click="isCharts = !isCharts" class="btn-exec btn-exec-ghost toggle-btn">
            <svg v-if="!isCharts" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>
            </svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <span>{{ isCharts ? 'Vista Tabular' : 'Vista Gráfica' }}</span>
          </button>

          <button class="btn-exec btn-exec-primary" @click="refreshData" :disabled="isRefreshing">
            <svg :class="{ 'spin': isRefreshing }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {{ isRefreshing ? 'Actualizando…' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

      <!-- Filtros inline + KPIs rápidos -->
      <div class="masthead-filters">
        <div class="filter-group">
          <label class="filter-label">AÑO Y MES</label>
          <select class="exec-select" v-model="filters.period">
            <option value="2026-01">Enero 2026</option>
            <option value="2025-12">Diciembre 2025</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">ASESOR</label>
          <select class="exec-select" v-model="filters.asesor">
            <option value="all">Todos los Asesores</option>
            <option v-for="a in asesores" :key="a.id" :value="a.id">{{ a.nombre }}</option>
          </select>
        </div>

        <div class="filter-spacer"></div>

        <transition name="slide-fade">
          <div class="masthead-kpis">
            <div class="inline-kpi">
              <span class="inline-kpi-label">TOTAL CONSULTAS</span>
              <span v-if="isRefreshing" class="skel-kpi" style="width:48px"></span>
              <span v-else class="inline-kpi-value">{{ totalGlobal.consultas }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">TOTAL VENTAS</span>
              <span v-if="isRefreshing" class="skel-kpi" style="width:48px"></span>
              <span v-else class="inline-kpi-value accent">{{ totalGlobal.ventas }}</span>
            </div>
            <div class="inline-kpi" style="margin-right: 4px;">
              <span class="inline-kpi-label">CONVERSIÓN GLOBAL</span>
              <span v-if="isRefreshing" class="skel-kpi" style="width:48px"></span>
              <span v-else class="inline-kpi-value" :class="pctColorClass(calcPct(totalGlobal.consultas, totalGlobal.ventas))">
                {{ calcPct(totalGlobal.consultas, totalGlobal.ventas) }}%
              </span>
            </div>
          </div>
        </transition>
      </div>
    </header>

    <!-- ════════════════════════════════════════
         BODY
    ════════════════════════════════════════ -->
    <main class="exec-body">

      <!-- ── LOADER ── -->
      <div v-if="isRefreshing" class="exec-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Procesando datos del período…</p>
      </div>

      <!-- ══════════════════════════════════════
           VISTA TABULAR
      ══════════════════════════════════════ -->
      <div v-else-if="!isCharts" class="view-tables fade-in">
        <div
          v-for="(week, index) in weeklyData"
          :key="index"
          class="table-shell mb-4"
        >
          <div class="table-panel-header">
            <div class="table-panel-brand">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="panel-icon">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h6 class="table-panel-title">{{ week.title }}</h6>
            </div>
            <div class="panel-totals">
              <span class="panel-total-item">
                <span class="ptl">Consultas</span>
                <strong class="ptv">{{ getWeekGrandTotal(week, 'c') }}</strong>
              </span>
              <span class="panel-total-sep">·</span>
              <span class="panel-total-item">
                <span class="ptl">Ventas</span>
                <strong class="ptv" style="color: #0f766e;">{{ getWeekGrandTotal(week, 'v') }}</strong>
              </span>
              <span class="panel-total-sep">·</span>
              <span class="panel-total-item">
                <span class="ptl">Conversión</span>
                <strong class="ptv" :class="pctColorClass(calcPct(getWeekGrandTotal(week, 'c'), getWeekGrandTotal(week, 'v')))">
                  {{ calcPct(getWeekGrandTotal(week, 'c'), getWeekGrandTotal(week, 'v')) }}%
                </strong>
              </span>
            </div>
          </div>

          <div class="table-responsive-custom">
            <table class="exec-table">
              <thead>
                <!-- Fila 1: Grupos de canal -->
                <tr class="thead-group text-center">
                  <th rowspan="2" class="th-cat">T. CLIENTE</th>
                  <th colspan="3" class="th-group th-teal">LinkedIn</th>
                  <th colspan="3" class="th-group th-teal">Instagram</th>
                  <th colspan="3" class="th-group th-teal">Facebook</th>
                  <th colspan="3" class="th-group th-slate">Otros</th>
                  <th colspan="3" class="th-group th-amber">Sitio Web</th>
                  <th colspan="3" class="th-group th-amber">Chatbot</th>
                  <th colspan="3" class="th-group th-amber">Cotización</th>
                  <th colspan="3" class="th-group th-violet">Comercial</th>
                </tr>
                <!-- Fila 2: C / V / % por canal -->
                <tr class="thead-sub text-center">
                  <template v-for="i in 8" :key="i">
                    <th class="ts ts-c">C.</th>
                    <th class="ts ts-v">V.</th>
                    <th class="ts ts-p">%</th>
                  </template>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(row, ri) in week.rows"
                  :key="row.type"
                  class="tbody-row"
                  :class="{ 'row-alt': ri % 2 === 0 }"
                >
                  <td class="td-cat">
                    <span class="tipo-pill" :class="pilledType(row.type)">{{ row.type }}</span>
                  </td>
                  <template v-for="ch in channelsOrder" :key="ch">
                    <td class="td-data text-center">
                      {{ row.channels[ch].c > 0 ? row.channels[ch].c : '—' }}
                    </td>
                    <td class="td-data text-center fw-700" :class="row.channels[ch].v > 0 ? 'c-teal' : 'text-muted-cell'">
                      {{ row.channels[ch].v > 0 ? row.channels[ch].v : '—' }}
                    </td>
                    <td class="td-data text-center td-pct" :class="getPctBgClass(row.channels[ch].c, row.channels[ch].v)">
                      <template v-if="row.channels[ch].c > 0">
                        {{ calcPct(row.channels[ch].c, row.channels[ch].v) }}%
                      </template>
                      <span v-else class="text-muted-cell">—</span>
                    </td>
                  </template>
                </tr>
              </tbody>

              <tfoot>
                <tr class="tfoot-row">
                  <td class="tfoot-label">TOTAL SEMANA</td>
                  <template v-for="(col, ch) in getWeekTotals(week)" :key="ch">
                    <td class="text-center fw-600">{{ col.c || '—' }}</td>
                    <td class="text-center fw-700" style="color:#5eead4;">{{ col.v || '—' }}</td>
                    <td class="text-center fw-700" :class="pctColorClass(calcPct(col.c, col.v))">
                      {{ calcPct(col.c, col.v) }}%
                    </td>
                  </template>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════
           VISTA GRÁFICOS
      ══════════════════════════════════════ -->
      <div v-else class="view-dashboard fade-in">

        <!-- KPI Strip -->
        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">CONVERSIÓN GLOBAL</span>
              <div class="kpi-indicator" :class="globalPct >= 30 ? 'ind-green' : globalPct >= 15 ? 'ind-amber' : 'ind-red'"></div>
            </div>
            <div class="kpi-card-value" :class="pctColorClass(globalPct)"><span v-if="isRefreshing" class="skel-kpi"></span><template v-else>{{ globalPct }}%</template></div>
            <div class="kpi-progress">
              <div class="kpi-progress-fill" :class="globalPct >= 30 ? 'fill-green' : 'fill-amber'"
                :style="`width: ${Math.min(globalPct * 2, 100)}%`"></div>
            </div>
            <div class="kpi-card-sub">Leads → Cierres totales</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">TOTAL CONSULTAS</span>
              <div class="kpi-indicator ind-blue"></div>
            </div>
            <div class="kpi-card-value"><span v-if="isRefreshing" class="skel-kpi"></span><template v-else>{{ totalGlobal.consultas }}</template></div>
            <div class="kpi-card-sub">Leads captados en el período</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">TOTAL VENTAS</span>
              <div class="kpi-indicator ind-teal"></div>
            </div>
            <div class="kpi-card-value" style="color: #0f766e;"><span v-if="isRefreshing" class="skel-kpi"></span><template v-else>{{ totalGlobal.ventas }}</template></div>
            <div class="kpi-card-sub">Cierres confirmados</div>
          </div>

          <div class="kpi-card kpi-card-highlight">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color: var(--gold-400, #fbbf24);">CANAL ESTRELLA</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-400, #fbbf24)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div class="kpi-card-value kpi-top-name"><span v-if="isRefreshing" class="skel-kpi"></span><template v-else>{{ topChannel.name }}</template></div>
            <div class="kpi-card-sub" style="color: #fbbf24; font-weight: 600;">{{ topChannel.ventas }} ventas · {{ topChannel.pct }}% conv.</div>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="chart-grid-2">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Consultas vs Ventas por Canal</div>
                <div class="chart-panel-sub">Acumulado del período seleccionado</div>
              </div>
              <div class="chart-legend-inline">
                <span class="legend-dot" style="background:#e2e8f0"></span><span>Consultas</span>
                <span class="legend-dot" style="background:#0f766e"></span><span>Ventas</span>
              </div>
            </div>
            <div class="chart-area">
              <Bar :data="barChartData" :options="groupedBarOptions" />
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Ranking — % Conversión por Canal</div>
                <div class="chart-panel-sub">Eficiencia de cierre sobre leads generados</div>
              </div>
            </div>
            <div class="chart-area">
              <Bar :data="pctChartData" :options="rankingBarOptions" />
            </div>
          </div>
        </div>

        <div class="chart-grid-3">
          <div class="chart-panel chart-panel-wide">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Tendencia de Ventas — Evolución Semanal</div>
                <div class="chart-panel-sub">Cierres acumulados por semana del mes</div>
              </div>
            </div>
            <div class="chart-area">
              <Line :data="lineChartData" :options="lineOptions" />
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Ventas por Tipo de Cliente</div>
                <div class="chart-panel-sub">Composición global del período</div>
              </div>
            </div>
            <div class="chart-area chart-area-donut">
              <Doughnut :data="doughnutChartData" :options="doughnutOptions" />
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- ════════════════════════════════════════
         FOOTER
    ════════════════════════════════════════ -->
    <footer class="exec-footer">
      <span>Período: <strong>{{ filters.period === '2026-01' ? 'Enero 2026' : 'Diciembre 2025' }}</strong></span>
      <span class="footer-sep">·</span>
      <span>Asesor: <strong>{{ asesorLabel }}</strong></span>
      <span class="footer-sep">·</span>
      <span>Vista activa: <strong>{{ isCharts ? 'Gráficos' : 'Tablas' }}</strong></span>
      <span class="footer-spacer"></span>
      <span class="footer-status">
        <span class="status-dot" :class="isRefreshing ? 'dot-loading' : 'dot-ok'"></span>
        {{ isRefreshing ? 'Actualizando…' : 'Datos sincronizados' }}
      </span>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch,inject } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { isDark } from '@/utils/chartTheme'

import { ServiceKeys } from '@/services'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)
// ── Estado UI ──
const isCharts     = ref(false)
const isRefreshing = ref(true) // Inicia en true para que muestre el loader de entrada
const filters      = ref({ period: '2026-01', asesor: 'all' })
const weeklyData   = ref([]) // Inicia vacío

const asesores = ref([
  { id: 'a01', nombre: 'Ana Torres' },
  { id: 'a02', nombre: 'Carlos Mendoza' },
  { id: 'a03', nombre: 'Lucía Paredes' },
  { id: 'a04', nombre: 'Marco Ríos' },
  { id: 'a05', nombre: 'Sofía Huanca' },
])
const asesorLabel = computed(() => {
  if (filters.value.asesor === 'all') return 'Todos'
  return asesores.value.find(a => a.id === filters.value.asesor)?.nombre || 'Todos'
})
const refreshData = () => {
  loadData()
}
// ── Orden de canales ──
const channelsOrder = ['lk', 'ig', 'fb', 'other', 'web', 'bot', 'cot', 'com']
const channelLabels = ['LinkedIn', 'Instagram', 'Facebook', 'Otros', 'Web', 'Chatbot', 'Cotización', 'Comercial']


// Agrega en el setup:
const isLoading = ref(true)
async function loadData() {
  isRefreshing.value = true
  try {
    const response = await dashboardService.ventasCanalList({
      year:      Number(filters.value.period.split('-')[0]),
      month_num: Number(filters.value.period.split('-')[1]),
      advisor:   filters.value.asesor
    })

    console.log("Respuesta de Axios:", response)

    // ✅ CORREGIDO: el interceptor ya desempaquetó response.data
    // Soporta: response directo, response.data, o response.data.data
    const payload = response?.weeklyData
      ? response
      : response?.data?.weeklyData
        ? response.data
        : response?.data?.data ?? response.data ?? response

    weeklyData.value = payload?.weeklyData ?? []

  } catch(e) {
    console.error("Error al cargar los datos del dashboard:", e)
    weeklyData.value = []
  } finally {
    isRefreshing.value = false
  }
}


onMounted(() => loadData())
watch(() => [filters.value.period, filters.value.asesor], loadData)

// ── Helpers matemáticos ──
const calcPct = (c, v) => (!c || c === 0) ? 0 : Math.round((v / c) * 100)

const getWeekTotals = (week) => {
  const totals = {}
  channelsOrder.forEach(ch => { totals[ch] = { c: 0, v: 0 } })
  week.rows.forEach(row => {
    channelsOrder.forEach(ch => {
      totals[ch].c += row.channels[ch].c
      totals[ch].v += row.channels[ch].v
    })
  })
  return totals
}

const getWeekGrandTotal = (week, key) => {
  let sum = 0
  week.rows.forEach(row => {
    channelsOrder.forEach(ch => { sum += row.channels[ch][key] })
  })
  return sum
}

// ── Totales globales ──
const totalGlobal = computed(() => {
  let c = 0; let v = 0
  weeklyData.value.forEach(week => {
    const t = getWeekTotals(week)
    Object.values(t).forEach(ch => { c += ch.c; v += ch.v })
  })
  return { consultas: c, ventas: v }
})

const globalPct = computed(() => calcPct(totalGlobal.value.consultas, totalGlobal.value.ventas))

// ── Canal estrella ──
const topChannel = computed(() => {
  let best = { name: '—', ventas: 0, pct: 0 }
  const agg = {}
  channelsOrder.forEach(ch => { agg[ch] = { c: 0, v: 0 } })
  weeklyData.value.forEach(week => {
    const t = getWeekTotals(week)
    channelsOrder.forEach(ch => { agg[ch].c += t[ch].c; agg[ch].v += t[ch].v })
  })
  channelsOrder.forEach((ch, i) => {
    if (agg[ch].v > best.ventas) {
      best = { name: channelLabels[i], ventas: agg[ch].v, pct: calcPct(agg[ch].c, agg[ch].v) }
    }
  })
  return best
})

// ── Helpers visuales ──
const getPctBgClass = (c, v) => {
  const p = calcPct(c, v)
  if (c === 0 || p === 0) return ''          // Sin datos → sin pintar
  if (p >= 15) {
    if (p >= 60) return 'bg-g4'
    if (p >= 40) return 'bg-g3'
    if (p >= 25) return 'bg-g2'
    return 'bg-g1'                           // 15–24%
  } else {
    if (p <= 3)  return 'bg-r4'              // Casi 0% → rojo intenso
    if (p <= 7)  return 'bg-r3'
    if (p <= 11) return 'bg-r2'
    return 'bg-r1'                           // 12–14% → rojo suave
  }
}
const pctColorClass = (p) => p >= 30 ? 'c-green' : p >= 15 ? 'c-blue' : 'c-red'

const pilledType = (type) => {
  const m = { NEW: 'pill-blue', LDS: 'pill-violet', CWE: 'pill-amber', MEMBERS: 'pill-teal' }
  return m[type] || 'pill-slate'
}

// ── Datos de gráficos ──
const aggregatedByChannel = computed(() => {
  const agg = {}
  channelsOrder.forEach(ch => { agg[ch] = { c: 0, v: 0 } })
  weeklyData.value.forEach(week => {
    const t = getWeekTotals(week)
    channelsOrder.forEach(ch => { agg[ch].c += t[ch].c; agg[ch].v += t[ch].v })
  })
  return agg
})

const CHART_COLORS = ['#0f766e','#0369a1','#b45309','#7c3aed','#be123c','#0284c7','#a16207','#6d28d9']

const barChartData = computed(() => ({
  labels: channelLabels,
  datasets: [
    {
      label: 'Consultas',
      data: channelsOrder.map(ch => aggregatedByChannel.value[ch].c),
      backgroundColor: isDark.value ? '#3A3A33' : '#e2e8f0', borderRadius: 3, borderSkipped: false
    },
    {
      label: 'Ventas',
      data: channelsOrder.map(ch => aggregatedByChannel.value[ch].v),
      backgroundColor: '#0f766e', borderRadius: 3, borderSkipped: false
    }
  ]
}))

const pctChartData = computed(() => {
  const pcts = channelsOrder.map(ch => calcPct(aggregatedByChannel.value[ch].c, aggregatedByChannel.value[ch].v))
  return {
    labels: channelLabels,
    datasets: [{
      label: '% Conversión',
      data: pcts,
      borderRadius: 4,
      backgroundColor: pcts.map(p => p >= 30 ? '#0f766e' : p >= 15 ? '#0369a1' : '#be123c')
    },
    {
      type: 'line', label: 'Ref. 20%',
      data: channelLabels.map(() => 20),
      borderColor: isDark.value ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,0.2)', borderDash: [4,3], borderWidth: 1.5,
      pointRadius: 0, fill: false
    }]
  }
})

const lineChartData = computed(() => {
  const salesPerWeek = weeklyData.value.map(week => getWeekGrandTotal(week, 'v'))
  return {
    labels: weeklyData.value.map((_, i) => `SEM ${i + 1}`),
    datasets: [{
      label: 'Ventas Totales',
      data: salesPerWeek,
      borderColor: '#0f766e', backgroundColor: 'rgba(15,118,110,0.08)',
      borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#0f766e',
      fill: true, tension: 0.35
    }]
  }
})

const doughnutChartData = computed(() => {
  const salesByType = { NEW: 0, LDS: 0, CWE: 0, MEMBERS: 0 }
  weeklyData.value.forEach(w => {
    w.rows.forEach(r => {
      salesByType[r.type] += Object.values(r.channels).reduce((s, ch) => s + ch.v, 0)
    })
  })
  return {
    labels: Object.keys(salesByType),
    datasets: [{
      data: Object.values(salesByType),
      backgroundColor: ['#0f766e','#0369a1','#b45309','#7c3aed'],
      borderWidth: 3, borderColor: isDark.value ? '#1A1A14' : '#ffffff'
    }]
  }
})

// ── Chart Options ──
const baseFont = { family: 'inherit', size: 11 }

const groupedBarOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: baseFont } },
    y: { grid: { color: isDark.value ? '#2A2A22' : '#f1f5f9' }, ticks: { font: baseFont } }
  }
}))

const rankingBarOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } }
  },
  scales: {
    x: { grid: { color: isDark.value ? '#2A2A22' : '#f1f5f9' }, ticks: { callback: v => v + '%', font: baseFont } },
    y: { grid: { display: false }, ticks: { font: baseFont } }
  }
}))

const lineOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: baseFont } },
    y: { beginAtZero: true, grid: { color: isDark.value ? '#2A2A22' : '#f1f5f9' }, ticks: { font: baseFont } }
  }
}))

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: baseFont } }
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   TOKENS CSS
═══════════════════════════════════════════════════════════ */
.exec-shell {
  --navy-900: #0f172a;
  --navy-800: #1e293b;
  --navy-700: #334155;
  --slate-400: #94a3b8;
  --slate-100: #f1f5f9;
  --slate-50:  #f8fafc;
  --teal-700:  #0f766e;
  --teal-600:  #0d9488;
  --teal-500:  #14b8a6;
  --amber-500: #f59e0b;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;
  --gold-400:       #fbbf24;

  font-family: 'Hanken Grotesk', 'DM Sans', system-ui, sans-serif;
  background: var(--slate-50);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

/* ═══════════════════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════════════════ */
.exec-masthead {
  background: var(--navy-900);
  color: var(--white);
  border-bottom: 1px solid var(--navy-700);
}

.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 16px; }

.brand-rule {
  width: 3px; height: 42px;
  background: var(--teal-700);
  border-radius: 2px; flex-shrink: 0;
}

.brand-eyebrow {
  font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px;
}

.brand-title {
  font-size: 18px; font-weight: 700; margin: 0;
  letter-spacing: -0.01em; color: var(--white);
}

.masthead-actions { display: flex; gap: 10px; align-items: center; }

.btn-exec {
  display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px;
  border-radius: 4px; font-size: 12.5px; font-weight: 600;
  cursor: pointer; border: none; font-family: inherit;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}
.btn-exec:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-exec-ghost {
  background: rgba(255,255,255,0.07);
  color: var(--slate-400);
  border: 1px solid rgba(255,255,255,0.12);
}
.btn-exec-ghost:hover { background: rgba(255,255,255,0.13); color: var(--white); }

.btn-exec-primary { background: var(--teal-700); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-600); }

/* ── Filtros en línea del Header ── */
.masthead-filters {
  display: flex; align-items: center;
  padding: 0 28px; min-height: 52px; gap: 0;
}

.filter-group { display: flex; flex-direction: column; gap: 2px; padding: 10px 20px 10px 0; }

.filter-label {
  font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 600; cursor: default;
}

.exec-select {
  background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,0.18);
  color: var(--white); font-family: inherit; font-size: 12.5px;
  font-weight: 500; padding: 3px 0; outline: none;
  cursor: pointer; min-width: 130px; appearance: auto;
}
.exec-select option { color: var(--text-primary); background: var(--white); }

.filter-sep { width: 1px; height: 32px; background: rgba(255,255,255,0.1); margin: 0 20px 0 0; }
.filter-spacer { flex: 1; }

/* KPIs inline */
.masthead-kpis { display: flex; gap: 32px; align-items: center; }
.inline-kpi { text-align: right; }
.inline-kpi-label {
  display: block; font-size: 9.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--slate-400); font-weight: 600; margin-bottom: 2px;
}
.inline-kpi-value { font-size: 15px; font-weight: 700; color: var(--white); font-variant-numeric: tabular-nums; }
.inline-kpi-value.accent { color: #5eead4; }

/* ═══════════════════════════════════════════════════════════
   BODY & LOADER
═══════════════════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 24px 28px; }

.mb-4 { margin-bottom: 1.25rem; }

.exec-loader {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 400px; gap: 16px;
}
.loader-ring {
  width: 40px; height: 40px;
  border: 3px solid var(--border); border-top-color: var(--teal-700);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
.loader-text { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

/* ═══════════════════════════════════════════════════════════
   PANEL DE TABLA
═══════════════════════════════════════════════════════════ */
.table-shell {
  background: var(--white); border: 1px solid var(--border);
  border-radius: 6px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.table-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 13px 18px; background: #fafbfc; border-bottom: 1px solid var(--border);
}

.table-panel-brand { display: flex; align-items: center; gap: 8px; }
.panel-icon { color: var(--slate-400); flex-shrink: 0; }

.table-panel-title {
  font-size: 12px; font-weight: 700; color: var(--text-primary);
  text-transform: uppercase; letter-spacing: 0.06em; margin: 0;
}

.panel-totals { display: flex; align-items: center; gap: 8px; font-size: 11.5px; }
.panel-total-item { display: flex; align-items: center; gap: 5px; }
.ptl { color: var(--text-muted); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
.ptv { font-weight: 700; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.panel-total-sep { color: var(--border); }

/* ═══════════════════════════════════════════════════════════
   TABLA EJECUTIVA
═══════════════════════════════════════════════════════════ */
.table-responsive-custom { width: 100%; overflow-x: auto; }

.exec-table {
  width: 100%; border-collapse: collapse;
  font-size: 12px; font-variant-numeric: tabular-nums;
  min-width: 1100px;
}

/* — Thead grupo principal — */
.thead-group th {
  padding: 7px 8px; font-size: 10.5px; letter-spacing: 0.07em;
  text-transform: uppercase; font-weight: 700;
  border-bottom: 1px solid var(--border);
}

.th-cat {
  background: var(--navy-900); color: var(--slate-400);
  width: 86px; padding-left: 14px; border-right: 2px solid var(--navy-700);
  position: sticky; left: 0; z-index: 3;
}

.th-group { text-align: center; }
.th-teal   { background: #f0fdfa; color: #0f766e; border-left: 2px solid #99f6e4; border-top: 3px solid #0f766e; }
.th-slate  { background: #f8fafc; color: #475569; border-left: 2px solid #cbd5e1; border-top: 3px solid #94a3b8; }
.th-amber  { background: #fffbeb; color: #b45309; border-left: 2px solid #fde68a; border-top: 3px solid #f59e0b; }
.th-violet { background: #faf5ff; color: #6d28d9; border-left: 2px solid #ddd6fe; border-top: 3px solid #8b5cf6; }

/* — Fila sub-headers C / V / % — */
.thead-sub .ts {
  padding: 5px 4px; font-size: 10px; font-weight: 700;
  border-bottom: 2px solid var(--border);
  border-right: 1px solid rgba(0,0,0,0.04);
  color: var(--text-secondary); letter-spacing: 0.05em;
}
.ts-c { background: #f8fafc; }
.ts-v { background: #f0fdf4; color: #166534; }
.ts-p { background: #eff6ff; color: #1e40af; }

/* — Filas body — */
.tbody-row td {
  padding: 8px 6px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}
.tbody-row:last-child td { border-bottom: none; }
.row-alt { background: #fafbfc; }
.tbody-row:hover td { background: #f0f9ff !important; transition: background 0.1s; }

.td-cat {
  padding: 8px 14px;
  border-right: 2px solid var(--navy-800);
  background: var(--navy-900) !important;
  position: sticky; left: 0; z-index: 1;
}

.td-data {
  padding: 7px 5px;
  border-right: 1px solid #f1f5f9;
  min-width: 36px;
}

.td-pct { font-size: 11px; font-weight: 600; }

/* — Pills tipo — */
.tipo-pill {
  display: inline-block; padding: 2px 8px;
  border-radius: 3px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
}
.pill-blue   { background: #dbeafe; color: #1e40af; }
.pill-violet { background: #ede9fe; color: #5b21b6; }
.pill-amber  { background: #fef3c7; color: #92400e; }
.pill-teal   { background: #ccfbf1; color: #0f766e; }
.pill-slate  { background: #f1f5f9; color: #475569; }


/* — Tfoot — */
.tfoot-row td {
  padding: 10px 6px;
  background: var(--navy-900);
  color: var(--white);
  font-size: 12px;
  border-top: 2px solid var(--navy-700);
  position: sticky; bottom: 0; z-index: 2;
}
.tfoot-label {
  padding-left: 14px; font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--slate-400);
  position: sticky; left: 0; background: var(--navy-900);
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD / GRÁFICOS
═══════════════════════════════════════════════════════════ */
.view-dashboard { display: flex; flex-direction: column; gap: 20px; }

.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

.kpi-card {
  background: var(--white); border: 1px solid var(--border); border-radius: 6px;
  padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: box-shadow 0.15s, transform 0.15s;
}
.kpi-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
.kpi-card-highlight { background: var(--navy-900); border-color: var(--navy-700); }

.kpi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kpi-card-label {
  font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase;
  font-weight: 700; color: var(--text-muted);
}

.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-green { background: #22c55e; } .ind-amber { background: #f59e0b; }
.ind-red   { background: #ef4444; } .ind-blue  { background: #3b82f6; }
.ind-teal  { background: #0f766e; }

.kpi-card-value {
  font-size: 24px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--text-primary); font-variant-numeric: tabular-nums; margin-bottom: 8px;
}
.kpi-top-name {
  font-size: 15px; font-weight: 600; letter-spacing: 0; color: var(--white);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}

.kpi-progress {
  height: 3px; background: var(--slate-100); border-radius: 2px;
  margin-bottom: 8px; overflow: hidden;
}
.kpi-progress-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.fill-green { background: #22c55e; } .fill-amber { background: #f59e0b; }

.kpi-card-sub { font-size: 11px; color: var(--text-muted); }

/* ── Panels de gráficos ── */
.chart-panel {
  background: var(--white); border: 1px solid var(--border); border-radius: 6px;
  overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.chart-panel-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 16px 20px; border-bottom: 1px solid var(--slate-100);
}
.chart-panel-title { font-size: 13px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em; }
.chart-panel-sub   { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.chart-area { padding: 16px 20px; height: 300px; }
.chart-area-donut { height: 300px; }

.chart-legend-inline {
  display: flex; gap: 14px; align-items: center;
  font-size: 11.5px; color: var(--text-secondary); font-weight: 500;
}
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }

.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-grid-3 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.chart-panel-wide { grid-column: auto; }

/* ═══════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════ */
.exec-footer {
  display: flex; align-items: center; gap: 10px; padding: 10px 28px;
  background: var(--white); border-top: 1px solid var(--border);
  font-size: 11.5px; color: var(--text-muted); font-weight: 500;
}
.exec-footer strong { color: var(--text-secondary); }
.footer-sep { color: var(--border); }
.footer-spacer { flex: 1; }
.footer-status { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok      { background: #22c55e; }
.dot-loading { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }

/* ═══════════════════════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════════════════════ */
.text-center  { text-align: center; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.c-green { color: #15803d; }
.c-blue  { color: #1d4ed8; }
.c-red   { color: #b91c1c; }
.c-teal  { color: #0f766e; }
.text-muted-cell { color: #cbd5e1; }

/* Animaciones */
.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.spin { animation: spin 0.8s linear infinite; }

/* Transición de KPIs inline */
.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from   { opacity: 0; transform: translateX(12px); }
.slide-fade-leave-to     { opacity: 0; transform: translateX(-8px); }

/* ── Heatmap VERDE (≥ 15%) ── */
.bg-g1 { background-color: #dcfce7; color: #166534; }   /* 15–24% */
.bg-g2 { background-color: #86efac; color: #14532d; }   /* 25–39% */
.bg-g3 { background-color: #22c55e; color: #ffffff; }   /* 40–59% */
.bg-g4 { background-color: #15803d; color: #ffffff; }   /* 60%+   */

/* ── Heatmap ROJO (1–14%) ── */
.bg-r1 { background-color: #fee2e2; color: #991b1b; }   /* 12–14% */
.bg-r2 { background-color: #fca5a5; color: #7f1d1d; }   /* 8–11%  */
.bg-r3 { background-color: #f87171; color: #ffffff; }   /* 4–7%   */
.bg-r4 { background-color: #dc2626; color: #ffffff; }   /* 1–3%   */

/* ════════════════════════════════════════
   DARK MODE — método 1: overrides de tokens en la clase raíz
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .exec-shell {
  --slate-400: #8A8A80; --slate-100: #24241E; --slate-50: #1F1F1A;
  --teal-700: #2DD4BF; --teal-600: #14B8A6; --teal-500: #2DD4BF;
  --amber-500: #FBBF24;
  --white: #1A1A14;
  --text-primary: #F4F4F0; --text-secondary: #A0A099; --text-muted: #8A8A80;
  --border: #2A2A22;
  --gold-400: #FBBF24;
}
/* masthead (el global lo fuerza claro con !important) */
[data-coreui-theme="dark"] .exec-shell .exec-masthead .brand-eyebrow,
[data-coreui-theme="dark"] .exec-shell .exec-masthead .filter-label,
[data-coreui-theme="dark"] .exec-shell .exec-masthead .inline-kpi-label { color: #A0A099 !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-primary { background: #F4F4F0 !important; color: #14140F !important; border-color: #F4F4F0 !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-primary:hover:not(:disabled) { background: #E4E4DD !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-ghost { background: #1A1A14 !important; color: #A0A099 !important; border-color: #2A2A22 !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-ghost:hover { background: #24241E !important; color: #F4F4F0 !important; }
[data-coreui-theme="dark"] .exec-shell .inline-kpi-value.accent { color: #5eead4 !important; }
/* superficies con hex fuera de tokens */
[data-coreui-theme="dark"] .table-shell, [data-coreui-theme="dark"] .chart-panel { box-shadow: 0 1px 4px rgba(0,0,0,.4); }
[data-coreui-theme="dark"] .table-panel-header { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell [style*="#0f766e"] { color: #2DD4BF !important; }
/* cabeceras de grupo (tintes pastel → tintes oscuros) */
[data-coreui-theme="dark"] .th-teal { background: rgba(20,184,166,.12); color: #2DD4BF; border-left-color: rgba(20,184,166,.35); border-top-color: #2DD4BF; }
[data-coreui-theme="dark"] .th-slate { background: #1F1F1A; color: #A0A099; border-left-color: #3A3A33; border-top-color: #8A8A80; }
[data-coreui-theme="dark"] .th-amber { background: rgba(245,158,11,.12); color: #FBBF24; border-left-color: rgba(245,158,11,.35); }
[data-coreui-theme="dark"] .th-violet { background: rgba(139,92,246,.12); color: #A78BFA; border-left-color: rgba(139,92,246,.35); }
[data-coreui-theme="dark"] .ts-c { background: #1F1F1A; }
[data-coreui-theme="dark"] .ts-v { background: rgba(16,185,129,.12); color: #34D399; }
[data-coreui-theme="dark"] .ts-p { background: rgba(59,130,246,.12); color: #60A5FA; }
/* filas */
[data-coreui-theme="dark"] .tbody-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .row-alt { background: rgba(255,255,255,.02); }
[data-coreui-theme="dark"] .tbody-row:hover td { background: rgba(59,130,246,.08) !important; }
[data-coreui-theme="dark"] .td-data { border-right-color: #24241E; }
/* utilidades de color */
[data-coreui-theme="dark"] .c-green { color: #34D399; }
[data-coreui-theme="dark"] .c-blue { color: #60A5FA; }
[data-coreui-theme="dark"] .c-red { color: #F87171; }
[data-coreui-theme="dark"] .c-teal { color: #2DD4BF; }
[data-coreui-theme="dark"] .text-muted-cell { color: #6F6F66; }
/* footer navy de tabla y tarjeta highlight: texto claro aunque --white sea oscuro */
[data-coreui-theme="dark"] .tfoot-row td { color: #F4F4F0; }
[data-coreui-theme="dark"] .kpi-top-name { color: #F4F4F0; }
/* heatmap: tintes oscuros en los niveles pastel, se mantienen los saturados */
[data-coreui-theme="dark"] .bg-g1 { background-color: rgba(52,211,153,.16); color: #34D399; }
[data-coreui-theme="dark"] .bg-g2 { background-color: rgba(52,211,153,.35); color: #6EE7B7; }
[data-coreui-theme="dark"] .bg-r1 { background-color: rgba(248,113,113,.16); color: #F87171; }
[data-coreui-theme="dark"] .bg-r2 { background-color: rgba(248,113,113,.35); color: #FCA5A5; }
</style>
