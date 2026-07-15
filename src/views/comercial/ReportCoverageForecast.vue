<template>
  <div class="exec-shell">

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
          <button 
            class="btn-exec" 
            :class="!isCharts ? 'btn-exec-active' : 'btn-exec-ghost'" 
            @click="isCharts = false"
          >
            <i class="fa-solid fa-table"></i> <span>Tablas</span>
          </button>
          <button 
            class="btn-exec me-2" 
            :class="isCharts ? 'btn-exec-active' : 'btn-exec-ghost'" 
            @click="isCharts = true"
          >
            <i class="fa-solid fa-chart-pie"></i> <span>Gráficos</span>
          </button>
          
          <button class="btn-exec btn-exec-primary" @click="refreshData">
            <i class="fa-solid fa-rotate-right" :class="{'spin': isRefreshing}"></i> 
            <span>{{ isRefreshing ? 'Actualizando...' : 'Actualizar Datos' }}</span>
          </button>
        </div>
      </div>

      <div class="masthead-filters">
        <div class="filter-group">
          <label class="filter-label">AÑO Y MES</label>
          <select class="exec-select-dark" v-model="filters.period">
            <option value="2026-01">Enero 2026</option>
            <option value="2025-12">Diciembre 2025</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">SEDE / PROYECTO</label>
          <select class="exec-select-dark" v-model="filters.project">
            <option value="all">Consolidado Global</option>
            <option value="b2c">Programas B2C</option>
            <option value="b2b">Corporativo B2B</option>
          </select>
        </div>
        
        <div class="ms-auto d-flex gap-4">
          <div class="inline-kpi">
            <span class="inline-kpi-label">TOTAL CONSULTAS</span>
            <span class="inline-kpi-value">{{ totalGlobal.consultas }}</span>
          </div>
          <div class="inline-kpi">
            <span class="inline-kpi-label">TOTAL VENTAS</span>
            <span class="inline-kpi-value" style="color: var(--teal-500)">{{ totalGlobal.ventas }}</span>
          </div>
          <div class="inline-kpi">
            <span class="inline-kpi-label">CONVERSIÓN GLOBAL</span>
            <span class="inline-kpi-value" style="color: var(--amber-500)">{{ calcPct(totalGlobal.consultas, totalGlobal.ventas) }}%</span>
          </div>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div v-if="!isCharts" class="view-tables fade-in">
        
        <div v-for="(week, index) in weeklyData" :key="index" class="table-shell mb-4">
          <div class="table-panel-header">
            <h6 class="table-panel-title">
              <i class="fa-regular fa-calendar text-slate-400 me-2"></i> {{ week.title }}
            </h6>
          </div>
          
          <div class="table-responsive-custom control-table-wrapper">
            <table class="exec-table table-bordered-cols">
              <thead>
                <tr class="thead-group text-center">
                  <th rowspan="2" class="th-cat sticky-col">T. Cliente</th>
                  <th colspan="3" class="th-group th-teal">LinkedIn (LK)</th>
                  <th colspan="3" class="th-group th-teal">Instagram (IG)</th>
                  <th colspan="3" class="th-group th-teal">Facebook (FB)</th>
                  <th colspan="3" class="th-group th-slate">Otros (-)</th>
                  <th colspan="3" class="th-group th-amber">Sitio WEB</th>
                  <th colspan="3" class="th-group th-amber">Chatbot</th>
                  <th colspan="3" class="th-group th-amber">Cotización</th>
                  <th colspan="3" class="th-group th-purple">Comercial</th>
                </tr>
                <tr class="thead-sub text-center">
                  <template v-for="i in 8" :key="i">
                    <th class="ts ts-c-light">C.</th>
                    <th class="ts ts-v-light">V.</th>
                    <th class="ts ts-p-light">%</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in week.rows" :key="row.type" class="tbody-row">
                  <td class="td-cat sticky-col fw-700 bg-white">{{ row.type }}</td>
                  
                  <template v-for="(col, key) in row.channels" :key="key">
                    <td class="td-data text-center">{{ col.c > 0 ? col.c : '-' }}</td>
                    <td class="td-data text-center fw-700" :class="col.v > 0 ? 'c-green' : 'text-slate-300'">{{ col.v > 0 ? col.v : '-' }}</td>
                    <td class="td-data text-center" :class="getPctBgClass(col.c, col.v)">
                      {{ calcPct(col.c, col.v) }}%
                    </td>
                  </template>
                </tr>
              </tbody>
              <tfoot>
                <tr class="tfoot-row">
                  <td class="td-cat sticky-col" style="background: var(--slate-100) !important; color: var(--text-primary) !important;">TOTAL SEMANA</td>
                  <template v-for="(col, key) in getWeekTotals(week)" :key="key">
                    <td class="text-center fw-600">{{ col.c }}</td>
                    <td class="text-center fw-700 c-green">{{ col.v }}</td>
                    <td class="text-center fw-700" :class="getPctTextClass(col.c, col.v)">{{ calcPct(col.c, col.v) }}%</td>
                  </template>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <div v-else class="view-charts fade-in">
        <div class="chart-grid-2">
          
          <div class="chart-panel">
            <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Distribución de Consultas vs Ventas por Canal</div>
                 <div class="chart-panel-sub">Acumulado del mes seleccionado</div>
               </div>
            </div>
            <div class="chart-area" style="height: 350px;">
               <Bar :data="barChartData" :options="barOptions" />
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Tasa de Conversión Promedio por Canal (%)</div>
                 <div class="chart-panel-sub">Eficiencia de cierre sobre leads generados</div>
               </div>
            </div>
            <div class="chart-area" style="height: 350px;">
               <Bar :data="pctChartData" :options="pctBarOptions" />
            </div>
          </div>

        </div>

        <div class="chart-grid-3 mt-4">
          <div class="chart-panel" style="grid-column: span 2;">
            <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Tendencia de Ventas Semanales</div>
                 <div class="chart-panel-sub">Evolución de cierres en las 4 semanas</div>
               </div>
            </div>
            <div class="chart-area" style="height: 300px;">
               <Line :data="lineChartData" :options="lineOptions" />
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Ventas por Tipo de Cliente</div>
                 <div class="chart-panel-sub">Composición global</div>
               </div>
            </div>
            <div class="chart-area d-flex justify-content-center" style="height: 300px;">
               <Doughnut :data="doughnutChartData" :options="doughnutOptions" />
            </div>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

// Estado UI
const isCharts = ref(false)
const isRefreshing = ref(false)
const filters = ref({ period: '2026-01', project: 'all' })

const refreshData = () => {
  isRefreshing.value = true
  setTimeout(() => { isRefreshing.value = false }, 800)
}

// ─── DATA HARDCODEADA (Basada en tu Excel) ───
const channelsOrder = ['lk', 'ig', 'fb', 'other', 'web', 'bot', 'cot', 'com']
const channelLabels = ['LinkedIn', 'Instagram', 'Facebook', 'Otros', 'Web', 'Chatbot', 'Cotización', 'Comercial']

const weeklyData = ref([
  {
    title: 'SEM 1 - Del 29 Dic al 04 Ene',
    rows: [
      { type: 'NEW',     channels: { lk: {c:10, v:2}, ig: {c:74, v:7}, fb: {c:219, v:11}, other: {c:294, v:26}, web: {c:75, v:15}, bot: {c:1, v:0}, cot: {c:1, v:0}, com: {c:15, v:5} } },
      { type: 'LDS',     channels: { lk: {c:0, v:0}, ig: {c:0, v:0}, fb: {c:4, v:0}, other: {c:2, v:1}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } },
      { type: 'CWE',     channels: { lk: {c:0, v:0}, ig: {c:5, v:4}, fb: {c:9, v:1}, other: {c:28, v:7}, web: {c:13, v:3}, bot: {c:1, v:1}, cot: {c:0, v:0}, com: {c:5, v:1} } },
      { type: 'MEMBERS', channels: { lk: {c:0, v:0}, ig: {c:0, v:0}, fb: {c:0, v:0}, other: {c:0, v:0}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } }
    ]
  },
  {
    title: 'SEM 2 - Del 05 Ene al 11 Ene',
    rows: [
      { type: 'NEW',     channels: { lk: {c:12, v:2}, ig: {c:214, v:22}, fb: {c:571, v:38}, other: {c:120, v:35}, web: {c:105, v:39}, bot: {c:17, v:2}, cot: {c:8, v:2}, com: {c:140, v:17} } },
      { type: 'LDS',     channels: { lk: {c:0, v:0}, ig: {c:6, v:1}, fb: {c:10, v:1}, other: {c:8, v:5}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } },
      { type: 'CWE',     channels: { lk: {c:2, v:0}, ig: {c:17, v:6}, fb: {c:33, v:8}, other: {c:29, v:22}, web: {c:18, v:11}, bot: {c:2, v:0}, cot: {c:0, v:0}, com: {c:12, v:9} } },
      { type: 'MEMBERS', channels: { lk: {c:0, v:0}, ig: {c:0, v:0}, fb: {c:0, v:0}, other: {c:0, v:0}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } }
    ]
  },
  {
    title: 'SEM 3 - Del 12 Ene al 18 Ene',
    rows: [
      { type: 'NEW',     channels: { lk: {c:10, v:6}, ig: {c:243, v:21}, fb: {c:584, v:46}, other: {c:90, v:34}, web: {c:68, v:18}, bot: {c:15, v:7}, cot: {c:4, v:0}, com: {c:250, v:45} } },
      { type: 'LDS',     channels: { lk: {c:1, v:0}, ig: {c:4, v:1}, fb: {c:4, v:1}, other: {c:1, v:1}, web: {c:1, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } },
      { type: 'CWE',     channels: { lk: {c:1, v:1}, ig: {c:18, v:3}, fb: {c:25, v:7}, other: {c:35, v:15}, web: {c:7, v:4}, bot: {c:1, v:0}, cot: {c:0, v:0}, com: {c:23, v:9} } },
      { type: 'MEMBERS', channels: { lk: {c:0, v:0}, ig: {c:0, v:0}, fb: {c:0, v:0}, other: {c:0, v:0}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } }
    ]
  },
  {
    title: 'SEM 4 - Del 19 Ene al 25 Ene',
    rows: [
      { type: 'NEW',     channels: { lk: {c:8, v:1}, ig: {c:218, v:14}, fb: {c:701, v:27}, other: {c:62, v:13}, web: {c:75, v:19}, bot: {c:11, v:6}, cot: {c:7, v:0}, com: {c:58, v:12} } },
      { type: 'LDS',     channels: { lk: {c:0, v:0}, ig: {c:0, v:0}, fb: {c:0, v:0}, other: {c:0, v:0}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } },
      { type: 'CWE',     channels: { lk: {c:0, v:0}, ig: {c:0, v:0}, fb: {c:0, v:0}, other: {c:0, v:0}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } },
      { type: 'MEMBERS', channels: { lk: {c:0, v:0}, ig: {c:0, v:0}, fb: {c:0, v:0}, other: {c:0, v:0}, web: {c:0, v:0}, bot: {c:0, v:0}, cot: {c:0, v:0}, com: {c:0, v:0} } }
    ]
  }
])

// ─── HELPERS MATEMÁTICOS ───
const calcPct = (c, v) => {
  if (!c || c === 0) return 0
  return Math.round((v / c) * 100)
}

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

const totalGlobal = computed(() => {
  let c = 0; let v = 0;
  weeklyData.value.forEach(week => {
    const wTot = getWeekTotals(week)
    Object.values(wTot).forEach(ch => { c += ch.c; v += ch.v })
  })
  return { consultas: c, ventas: v }
})

// ─── HELPERS VISUALES ───
const getPctBgClass = (c, v) => {
  const pct = calcPct(c, v)
  if (c === 0) return 'bg-empty'
  if (pct >= 50) return 'bg-pct-high'
  if (pct >= 20) return 'bg-pct-med'
  if (pct > 0) return 'bg-pct-low'
  return ''
}

const getPctTextClass = (c, v) => {
  const pct = calcPct(c, v)
  if (pct >= 50) return 'text-success'
  if (pct >= 20) return 'text-primary'
  return 'text-muted'
}

// ─── DATA DE GRÁFICOS ───
const aggregatedByChannel = computed(() => {
  const agg = {}
  channelsOrder.forEach(ch => { agg[ch] = { c: 0, v: 0 } })
  
  weeklyData.value.forEach(week => {
    const wTot = getWeekTotals(week)
    channelsOrder.forEach(ch => {
      agg[ch].c += wTot[ch].c
      agg[ch].v += wTot[ch].v
    })
  })
  return agg
})

const barChartData = computed(() => ({
  labels: channelLabels,
  datasets: [
    { label: 'Consultas', data: channelsOrder.map(ch => aggregatedByChannel.value[ch].c), backgroundColor: '#cbd5e1', borderRadius: 4 },
    { label: 'Ventas', data: channelsOrder.map(ch => aggregatedByChannel.value[ch].v), backgroundColor: '#12274e', borderRadius: 4 }
  ]
}))

const pctChartData = computed(() => {
  const pcts = channelsOrder.map(ch => calcPct(aggregatedByChannel.value[ch].c, aggregatedByChannel.value[ch].v))
  return {
    labels: channelLabels,
    datasets: [{
      label: '% Conversión', 
      data: pcts, 
      backgroundColor: pcts.map(p => p >= 30 ? '#10b981' : p >= 15 ? '#3b82f6' : '#94a3b8'),
      borderRadius: 4
    }]
  }
})

const lineChartData = computed(() => {
  const salesPerWeek = weeklyData.value.map(week => {
    const wTot = getWeekTotals(week)
    return Object.values(wTot).reduce((sum, ch) => sum + ch.v, 0)
  })
  return {
    labels: ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4'],
    datasets: [{
      label: 'Ventas Totales',
      data: salesPerWeek,
      borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)',
      borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#4f46e5',
      fill: true, tension: 0.3
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
      backgroundColor: ['#12274e', '#3b82f6', '#f59e0b', '#dc2626'],
      borderWidth: 2, borderColor: '#fff'
    }]
  }
})

// ─── OPCIONES DE GRÁFICOS ───
const baseFont = { family: 'inherit', size: 11 }
const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: baseFont } } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
const pctBarOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } } }
const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: baseFont } } } }

</script>

<style scoped>
/* ═══════════════════════════════════════════════
   TOKENS Y BASE
═══════════════════════════════════════════════ */
:root {
  --navy-900: #0f172a; --navy-800: #1e293b; --navy-700: #334155;
  --slate-400: #94a3b8; --slate-300: #cbd5e1; --slate-100: #f1f5f9; --slate-50:  #f8fafc;
  --teal-600:  #002060; --teal-500:  #002060; --teal-100:  #ccfbf1; /* navy WE */
  --blue-600:  #2563eb;
  --amber-500: #f59e0b; --amber-100: #fef3c7;
  --red-600:   #dc2626;
  --purple-600:#7c3aed; --purple-100:#ede9fe;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;
}

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

.exec-shell {
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  background: var(--slate-50);
  min-height: 100vh;
  display: flex; flex-direction: column;
  color: var(--text-primary);
}

/* ═══════════════════════════════════════════════
   MASTHEAD Y FILTROS
═══════════════════════════════════════════════ */
.exec-masthead { background: var(--navy-900); color: var(--white); border-bottom: 1px solid var(--navy-700); }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 20px 28px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.masthead-brand { display: flex; align-items: center; gap: 14px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500); border-radius: 4px; }
.brand-eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--slate-400); font-weight: 600; display: block; margin-bottom: 2px; }
.brand-title { font-size: 20px; font-weight: 700; margin: 0; color: var(--white); letter-spacing: -0.02em; }

.masthead-actions { display: flex; gap: 8px; align-items: center; }
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: inherit; }
.btn-exec-ghost { background: rgba(255,255,255,0.07); color: var(--slate-300); border: 1px solid rgba(255,255,255,0.12); }
.btn-exec-ghost:hover { background: rgba(255,255,255,0.12); color: var(--white); }
.btn-exec-active { background: var(--white); color: var(--navy-900); border: 1px solid var(--white); }
.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover { background: var(--teal-500); }

.masthead-filters { display: flex; align-items: center; gap: 0; padding: 0 28px; min-height: 52px; }
.filter-group { display: flex; flex-direction: column; gap: 2px; padding: 10px 20px 10px 0; }
.filter-label { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--slate-400); font-weight: 600; cursor: default; }
.filter-sep { width: 1px; height: 32px; background: rgba(255,255,255,0.1); margin: 0 20px 0 0; }
.exec-select-dark { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.18); color: var(--white); font-family: inherit; font-size: 12.5px; font-weight: 500; padding: 3px 0; outline: none; cursor: pointer; min-width: 130px; }
.exec-select-dark option { color: var(--text-primary); background: var(--white); }

.inline-kpi { text-align: right; }
.inline-kpi-label { display: block; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--slate-400); font-weight: 600; margin-bottom: 2px; }
.inline-kpi-value { font-size: 16px; font-weight: 700; color: var(--white); font-variant-numeric: tabular-nums; }

/* ═══════════════════════════════════════════════
   TABLAS (ESTILO MATRIZ)
═══════════════════════════════════════════════ */
.exec-body { padding: 24px 28px; }

.table-shell { background: var(--white); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04); }
.table-panel-header { padding: 14px 20px; background: #fafbfc; border-bottom: 1px solid var(--border); }
.table-panel-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }

.control-table-wrapper { width: 100%; overflow-x: auto; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }

/* Sticky Col */
.exec-table .sticky-col { position: sticky; left: 0; z-index: 2; box-shadow: 2px 0 5px -2px rgba(0,0,0,0.15); }
.exec-table tbody .sticky-col { background-color: var(--white); border-right: 2px solid var(--border); }
.exec-table thead .sticky-col { z-index: 3; background-color: var(--navy-900); border-right: 2px solid var(--navy-800); color: var(--slate-300); }

/* Thead Colors (Adaptados a tus grupos) */
.thead-group th { padding: 8px 10px; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border); border-right: 1px solid rgba(0,0,0,0.05); }
.th-teal { background: #f0fdfa; color: #0f766e; border-top: 3px solid #12274e; }
.th-slate{ background: #f8fafc; color: #475569; border-top: 3px solid #94a3b8; }
.th-amber{ background: #fffbeb; color: #b45309; border-top: 3px solid #f59e0b; }
.th-purple{ background: #faf5ff; color: #6d28d9; border-top: 3px solid #8b5cf6; }

/* Sub-headers (C, V, %) */
.thead-sub .ts { padding: 6px 4px; font-size: 10px; font-weight: 600; border-bottom: 2px solid var(--border); border-right: 1px solid rgba(0,0,0,0.05); color: var(--text-secondary); background: #fdfdfd; }

/* Celdas Body */
.tbody-row { transition: background 0.15s; }
.tbody-row:hover td:not(.sticky-col) { background: #f8fafc; }
.td-cat { padding: 10px 14px; font-size: 11.5px; }
.td-data { padding: 8px 4px; border-bottom: 1px solid var(--slate-50); border-right: 1px solid var(--slate-50); min-width: 35px; }

/* Totales */
.tfoot-row td { background: var(--slate-50); border-top: 2px solid var(--border); padding: 10px 4px; font-size: 12.5px; }

/* Helper Classes */
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-center { text-align: center; }
.c-green { color: #15803d; }

/* Heatmap de Porcentajes */
.bg-empty { color: var(--slate-300); }
.bg-pct-low { background-color: #dcfce7; color: #166534; font-weight: 600; } /* Verde bajito */
.bg-pct-med { background-color: #86efac; color: #14532d; font-weight: 700; } /* Verde medio */
.bg-pct-high{ background-color: #22c55e; color: #ffffff; font-weight: 700; } /* Verde fuerte */

/* ═══════════════════════════════════════════════
   GRÁFICOS
═══════════════════════════════════════════════ */
.chart-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.chart-grid-3 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }

.chart-panel { background: var(--white); border: 1px solid rgba(15,23,42,0.08); border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); display: flex; flex-direction: column; overflow: hidden; }
.chart-panel-header { padding: 16px 20px; border-bottom: 1px solid var(--slate-100); }
.chart-panel-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
.chart-panel-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.chart-area { padding: 20px; flex: 1; }

/* Animaciones */
.fade-in { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>