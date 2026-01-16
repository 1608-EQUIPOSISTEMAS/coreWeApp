<template>
  <div class="channel-system">
    
    <div class="main-header">
      <div class="header-text">
        <h1 class="system-title">ANÁLISIS DE CANALES DE PROSPECCIÓN</h1>
        <div class="meta-row">
          <span class="period-badge">Q1 2026</span>
          <p class="system-subtitle">RENDIMIENTO DE TRÁFICO Y CALIDAD DE LEADS</p>
        </div>
      </div>
      
      <button @click="toggleView" class="btn-toggle" :class="{ 'active': isDashboard }">
        <div class="toggle-track">
          <span class="toggle-option" :class="{ 'selected': !isDashboard }">TABLA</span>
          <span class="toggle-option" :class="{ 'selected': isDashboard }">GRÁFICOS</span>
        </div>
      </button>
    </div>

    <div v-if="!isDashboard" class="view-container animate-fade">
      <div class="table-card">
        <table class="analytics-table">
          <thead>
            <tr>
              <th rowspan="2" class="col-fixed">CANAL</th>
              <th colspan="3" class="group-header group-traffic">TRÁFICO & ALCANCE</th>
              <th colspan="3" class="group-header group-conversion">CONVERSIÓN (LEADS)</th>
              <th colspan="3" class="group-header group-business">NEGOCIO (VENTAS)</th>
            </tr>
            <tr class="sub-headers">
              <th class="th-traffic">IMPRESIONES</th>
              <th class="th-traffic">CLICKS</th>
              <th class="th-traffic">CTR %</th>
              
              <th class="th-conversion">LEADS</th>
              <th class="th-conversion">COSTO/LEAD</th>
              <th class="th-conversion">TASA CONV.</th>

              <th class="th-business">VENTAS</th>
              <th class="th-business">INGRESOS</th>
              <th class="th-business">ROAS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in channels" :key="index" class="data-row">
              <td class="col-channel">
                <span class="channel-dot" :style="{ background: row.color }"></span>
                <span class="channel-name">{{ row.name }}</span>
              </td>

              <td class="text-right num-font">{{ formatNumber(row.impressions) }}</td>
              <td class="text-right num-font">{{ formatNumber(row.clicks) }}</td>
              <td class="text-right text-muted">{{ row.ctr }}%</td>

              <td class="text-right font-bold bg-blue-50">{{ row.leads }}</td>
              <td class="text-right bg-blue-50">
                <span :class="getCplClass(row.cpl)">{{ formatCurrency(row.cpl) }}</span>
              </td>
              <td class="text-right text-xs bg-blue-50">{{ row.convRate }}%</td>

              <td class="text-right font-bold text-dark">{{ row.sales }}</td>
              <td class="text-right text-dark">{{ formatCurrency(row.revenue) }}</td>
              <td class="text-right">
                <span class="badge-roas" :class="getRoasClass(row.roas)">{{ row.roas }}x</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL GLOBAL</td>
              <td class="text-right">{{ formatNumber(totals.impressions) }}</td>
              <td class="text-right">{{ formatNumber(totals.clicks) }}</td>
              <td class="text-right">-</td>
              <td class="text-right font-bold">{{ totals.leads }}</td>
              <td class="text-right font-bold">{{ formatCurrency(totals.avgCpl) }} (Prom)</td>
              <td class="text-right">-</td>
              <td class="text-right font-bold">{{ totals.sales }}</td>
              <td class="text-right font-bold">{{ formatCurrency(totals.revenue) }}</td>
              <td class="text-right font-bold">{{ totals.globalRoas }}x</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div v-else class="dashboard-grid animate-fade">
      
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon bg-blue-100 text-blue-600">👥</div>
          <div class="kpi-info">
            <span class="kpi-label">LEADS TOTALES</span>
            <span class="kpi-value">{{ totals.leads }}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon bg-green-100 text-green-600">💰</div>
          <div class="kpi-info">
            <span class="kpi-label">INGRESOS GENERADOS</span>
            <span class="kpi-value">{{ formatCurrency(totals.revenue) }}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon bg-purple-100 text-purple-600">📉</div>
          <div class="kpi-info">
            <span class="kpi-label">CPL PROMEDIO</span>
            <span class="kpi-value">{{ formatCurrency(totals.avgCpl) }}</span>
          </div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-icon bg-white text-dark">🏆</div>
          <div class="kpi-info">
            <span class="kpi-label text-white-50">MEJOR ROAS</span>
            <span class="kpi-value text-white">{{ bestChannel.name }} ({{ bestChannel.roas }}x)</span>
          </div>
        </div>
      </div>

      <div class="charts-row">
        
        <div class="chart-panel large-panel">
          <div class="panel-header">
            <h3>EFICIENCIA DE INVERSIÓN (ROAS)</h3>
            <p>Comparativa: Barras Claras (Inversión) vs. Barras Oscuras (Retorno)</p>
          </div>
          <div class="chart-container">
            <Bar :data="efficiencyChartData" :options="efficiencyOptions" />
          </div>
        </div>

        <div class="chart-panel side-panel">
          <div class="panel-header">
            <h3>VOLUMEN POR CANAL</h3>
            <p>¿De dónde vienen la mayoría de leads?</p>
          </div>
          <div class="doughnut-container">
            <Doughnut :data="distributionChartData" :options="doughnutOptions" />
          </div>
          <div class="custom-legend">
            <div v-for="c in channels" :key="c.name" class="legend-item">
              <span class="dot" :style="{ background: c.color }"></span>
              <span class="name">{{ c.name }}</span>
              <span class="val">{{ c.leads }}</span>
            </div>
          </div>
        </div>

      </div>

      <div class="chart-panel full-panel">
        <div class="panel-header">
          <h3>TASA DE CIERRE (LEAD A VENTA)</h3>
          <p>Porcentaje de leads que terminan comprando por cada canal.</p>
        </div>
        <div class="chart-container-short">
           <Bar :data="conversionChartData" :options="horizontalOptions" />
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement)

// --- ESTADO ---
const isDashboard = ref(false)
const toggleView = () => isDashboard.value = !isDashboard.value

// --- DATA HARDCORE (MOCKUP ANALÍTICO) ---
// Colores oficiales de marca para realismo
const channels = [
  { name: 'FACEBOOK', color: '#1877F2', impressions: 45000, clicks: 1200, ctr: 2.6, leads: 180, cpl: 12.5, convRate: 15.0, sales: 18, revenue: 6300, spend: 2250, roas: 2.8 },
  { name: 'INSTAGRAM', color: '#E1306C', impressions: 62000, clicks: 2800, ctr: 4.5, leads: 310, cpl: 8.4, convRate: 11.0, sales: 25, revenue: 7500, spend: 2604, roas: 2.9 },
  { name: 'TIKTOK', color: '#000000', impressions: 125000, clicks: 3500, ctr: 2.8, leads: 420, cpl: 4.5, convRate: 5.5, sales: 15, revenue: 3750, spend: 1890, roas: 1.9 },
  { name: 'GOOGLE WEB', color: '#34A853', impressions: 15000, clicks: 950, ctr: 6.3, leads: 120, cpl: 0.0, convRate: 12.6, sales: 35, revenue: 14000, spend: 500, roas: 28.0 }, // SEO (Costo bajo)
  { name: 'YOUTUBE', color: '#FF0000', impressions: 30000, clicks: 450, ctr: 1.5, leads: 60, cpl: 25.0, convRate: 13.3, sales: 10, revenue: 5000, spend: 1500, roas: 3.3 },
  { name: 'TWITTER / X', color: '#14171A', impressions: 8000, clicks: 120, ctr: 1.5, leads: 15, cpl: 18.2, convRate: 12.5, sales: 2, revenue: 600, spend: 273, roas: 2.2 }
]

// --- UTILIDADES ---
const formatCurrency = (val) => `S/ ${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const formatNumber = (val) => val.toLocaleString('en-US')

const getCplClass = (cpl) => {
  if (cpl === 0) return 'text-success' // Orgánico
  if (cpl < 10) return 'text-success'
  if (cpl < 20) return 'text-warning'
  return 'text-danger'
}

const getRoasClass = (roas) => {
  if (roas >= 4) return 'badge-high'
  if (roas >= 2) return 'badge-mid'
  return 'badge-low'
}

// --- COMPUTADOS PARA TABLA (TOTALES) ---
const totals = computed(() => {
  const t = channels.reduce((acc, curr) => {
    acc.impressions += curr.impressions
    acc.clicks += curr.clicks
    acc.leads += curr.leads
    acc.sales += curr.sales
    acc.revenue += curr.revenue
    acc.spend += curr.spend
    return acc
  }, { impressions: 0, clicks: 0, leads: 0, sales: 0, revenue: 0, spend: 0 })
  
  t.avgCpl = t.leads > 0 ? (t.spend / t.leads).toFixed(2) : 0
  t.globalRoas = t.spend > 0 ? (t.revenue / t.spend).toFixed(1) : 0
  return t
})

const bestChannel = computed(() => {
  return [...channels].sort((a, b) => b.roas - a.roas)[0]
})

// --- DATA GRÁFICOS ---

// 1. Eficiencia (Barras agrupadas: Inversión vs Retorno)
const efficiencyChartData = computed(() => ({
  labels: channels.map(c => c.name),
  datasets: [
    { label: 'Inversión (S/)', data: channels.map(c => c.spend), backgroundColor: '#cbd5e1', borderRadius: 4, barPercentage: 0.6 },
    { label: 'Retorno (S/)', data: channels.map(c => c.revenue), backgroundColor: channels.map(c => c.color), borderRadius: 4, barPercentage: 0.6 }
  ]
}))

// 2. Distribución (Donut)
const distributionChartData = computed(() => ({
  labels: channels.map(c => c.name),
  datasets: [{
    data: channels.map(c => c.leads),
    backgroundColor: channels.map(c => c.color),
    borderWidth: 0,
    hoverOffset: 10
  }]
}))

// 3. Conversión (Horizontal: Leads convertidos a ventas)
const conversionChartData = computed(() => ({
  labels: channels.map(c => c.name),
  datasets: [{
    label: '% Cierre de Ventas',
    data: channels.map(c => (c.sales / c.leads * 100).toFixed(1)),
    backgroundColor: channels.map(c => c.color),
    borderRadius: 4
  }]
}))

// --- OPCIONES DE GRÁFICOS ---
const efficiencyOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'top', align: 'end' } },
  scales: { y: { grid: { color: '#f1f5f9' }, ticks: { callback: (val) => 'S/' + val } }, x: { grid: { display: false } } }
}

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '70%',
  plugins: { legend: { display: false } }
}

const horizontalOptions = {
  indexAxis: 'y',
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { color: '#f1f5f9' }, ticks: { callback: (val) => val + '%' } }, y: { grid: { display: false } } }
}

</script>

<style scoped>
/* SISTEMA DE DISEÑO */
.channel-system {
  font-family: 'Inter', system-ui, sans-serif;
  background: #f1f5f9;
  padding: 2rem;
  color: #0f172a;
  min-height: 100vh;
}

/* HEADER */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.system-title { font-size: 1.5rem; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
.meta-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
.period-badge { background: #0f172a; color: white; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
.system-subtitle { margin: 0; font-size: 0.9rem; color: #64748b; font-weight: 500; }

/* BOTÓN TOGGLE (ESTILO INTERRUPTOR) */
.btn-toggle {
  background: none; border: none; cursor: pointer; padding: 0;
}
.toggle-track {
  background: white; border: 1px solid #cbd5e1; border-radius: 99px; display: flex; padding: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.toggle-option {
  padding: 0.5rem 1.5rem; border-radius: 99px; font-size: 0.8rem; font-weight: 700; color: #64748b;
  transition: all 0.3s ease;
}
.toggle-option.selected { background: #0f172a; color: white; shadow: 0 2px 4px rgba(0,0,0,0.2); }

/* VISTA TABLA (ESTILO EXCEL MODERNO) */
.table-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.analytics-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }

/* Headers */
.analytics-table th { padding: 0.75rem 1rem; text-align: left; }
.col-fixed { background: white; border-bottom: 2px solid #e2e8f0; vertical-align: middle; width: 180px; }
.group-header { text-align: center; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.5rem !important; }

/* Colores de Grupo */
.group-traffic { background: #f8fafc; color: #64748b; border-bottom: 2px solid #e2e8f0; }
.group-conversion { background: #eff6ff; color: #1d4ed8; border-bottom: 2px solid #bfdbfe; }
.group-business { background: #f0fdf4; color: #15803d; border-bottom: 2px solid #bbf7d0; }

.sub-headers th { font-size: 0.7rem; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-transform: uppercase; }
.th-conversion { background: #eff6ff; }
.th-business { background: #f0fdf4; }

/* Data Rows */
.data-row td { padding: 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.col-channel { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; color: #0f172a; }
.channel-dot { width: 10px; height: 10px; border-radius: 50%; display: block; }
.text-right { text-align: right; }
.num-font { font-family: 'Roboto Mono', monospace; letter-spacing: -0.5px; color: #334155; }
.font-bold { font-weight: 700; }
.text-muted { color: #94a3b8; }
.bg-blue-50 { background: #eff6ff; }
.text-dark { color: #0f172a; }

/* KPI Colores */
.text-success { color: #16a34a; font-weight: 700; }
.text-warning { color: #d97706; font-weight: 600; }
.text-danger { color: #dc2626; font-weight: 600; }

.badge-roas { padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.75rem; }
.badge-high { background: #dcfce7; color: #166534; }
.badge-mid { background: #fef9c3; color: #854d0e; }
.badge-low { background: #fee2e2; color: #991b1b; }

/* Footer */
tfoot td { background: #f8fafc; padding: 1rem; font-weight: 700; border-top: 2px solid #e2e8f0; }

/* DASHBOARD */
.dashboard-grid { display: flex; flex-direction: column; gap: 1.5rem; }

/* KPIs */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.kpi-card { background: white; padding: 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; border: 1px solid #e2e8f0; }
.kpi-card.highlight { background: #0f172a; border-color: #0f172a; }
.kpi-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.kpi-info { display: flex; flex-direction: column; }
.kpi-label { font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 2px; }
.kpi-value { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
.text-white { color: white; } .text-white-50 { color: rgba(255,255,255,0.6); }

/* Layout Gráficos */
.charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
.chart-panel { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; }
.panel-header { margin-bottom: 1.5rem; }
.panel-header h3 { font-size: 0.9rem; margin: 0; font-weight: 800; text-transform: uppercase; }
.panel-header p { margin: 0.25rem 0 0; font-size: 0.8rem; color: #64748b; }

.large-panel { height: 400px; display: flex; flex-direction: column; }
.chart-container { flex-grow: 1; min-height: 0; }
.side-panel { height: 400px; display: flex; flex-direction: column; }
.doughnut-container { flex-grow: 1; max-height: 220px; display: flex; justify-content: center; }

.custom-legend { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; max-height: 100px; }
.legend-item { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
.name { flex-grow: 1; font-weight: 500; }
.val { font-weight: 700; }

.full-panel { height: 300px; }
.chart-container-short { height: 200px; }

/* Animación */
.animate-fade { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Responsive */
@media (max-width: 1024px) {
  .kpi-row { grid-template-columns: 1fr 1fr; }
  .charts-row { grid-template-columns: 1fr; }
}
</style>