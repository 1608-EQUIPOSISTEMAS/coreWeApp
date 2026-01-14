<template>
  <div class="marketing-dashboard">
    <div class="header-section">
      <div class="header-content">
        <h1 class="page-title">REPORTE DE INTELIGENCIA DE MERCADO & ADQUISICIÓN</h1>
        <p class="page-meta">ANÁLISIS DE CANALES, ESTRATEGIAS Y PALABRAS CLAVE</p>
      </div>
      <div class="controls">
        <div class="date-range">01/01/2026 - 31/01/2026</div>
        <button class="btn-action">EXPORTAR DATA</button>
      </div>
    </div>

    <div class="kpi-strip">
      <div class="kpi-box">
        <span class="kpi-label">LEADS TOTALES (VOLUMEN)</span>
        <span class="kpi-value">2,845</span>
        <span class="kpi-delta positive">+12.5% vs mes anterior</span>
      </div>
      <div class="kpi-box">
        <span class="kpi-label">LEADS CALIFICADOS (SQL)</span>
        <span class="kpi-value">420</span>
        <span class="kpi-sub">14.7% del total</span>
      </div>
      <div class="kpi-box">
        <span class="kpi-label">COSTO ADQUISICIÓN (CAC)</span>
        <span class="kpi-value">S/ 18.50</span>
        <span class="kpi-delta negative">-2.3% optimización</span>
      </div>
      <div class="kpi-box highlight">
        <span class="kpi-label">INGRESOS ATRIBUIDOS</span>
        <span class="kpi-value">S/ 85,400</span>
        <span class="kpi-sub">Canal Principal: TikTok Ads</span>
      </div>
    </div>

    <div class="section-container">
      <div class="chart-header">
        <h3>EFICIENCIA DE CANAL: TRÁFICO VS. CIERRE</h3>
        <span class="chart-desc">Comparativa entre volumen de leads generados y ventas efectivas (Pagó).</span>
      </div>
      <div class="chart-wrapper-large">
        <Bar :data="channelChartData" :options="channelChartOptions" />
      </div>
    </div>

    <div class="split-section">

      <div class="panel">
        <div class="panel-header">
          <h4>INTENCIÓN DE LEADS (PALABRAS CLAVE)</h4>
          <p>Análisis de las palabras detectadas en el primer mensaje (Variable: we_key_word)</p>
        </div>
        <div class="chart-wrapper-medium">
          <Bar :data="keywordChartData" :options="horizontalChartOptions" />
        </div>
        <div class="insight-text">
          <strong>HALLAZGO:</strong> Leads que usan "QUIERO" o "NECESITO" tienen un 40% más de probabilidad de cierre que los que usan "PRECIO".
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h4>PENETRACIÓN POR ESTRATEGIA</h4>
          <p>Participación de mercado según tipo de campaña (Variable: we_type_strategy)</p>
        </div>
        <div class="doughnut-container">
          <Doughnut :data="strategyChartData" :options="doughnutOptions" />
        </div>
        <div class="legend-table">
          <div v-for="(item, i) in strategyLegend" :key="i" class="legend-row">
            <span class="color-box" :style="{ backgroundColor: item.color }"></span>
            <span class="legend-name">{{ item.label }}</span>
            <span class="legend-val">{{ item.value }}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-container">
      <div class="panel-header">
        <h4>MATRIZ DE CALIDAD DE TRÁFICO</h4>
        <p>Desglose de estados finales agrupados por origen del lead.</p>
      </div>
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="col-main">ORIGEN / CANAL</th>
            <th class="text-right">TOTAL LEADS</th>
            <th class="text-right">SIN INTERÉS</th>
            <th class="text-right">INTERESADO</th>
            <th class="text-right">PAGÓ (CIERRE)</th>
            <th class="text-right">TASA CONVERSIÓN</th>
            <th class="text-right">TICKET PROM.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in matrixData" :key="index">
            <td class="font-bold">{{ row.channel }}</td>
            <td class="text-right bg-gray-light">{{ row.total }}</td>
            <td class="text-right text-muted">{{ row.lost }}</td>
            <td class="text-right text-blue">{{ row.interested }}</td>
            <td class="text-right font-bold text-dark">{{ row.paid }}</td>
            <td class="text-right">
              <span :class="getConversionClass(row.rate)">{{ row.rate }}%</span>
            </td>
            <td class="text-right">{{ row.ticket }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL GLOBAL</td>
            <td class="text-right">2,845</td>
            <td class="text-right">1,420</td>
            <td class="text-right">1,005</td>
            <td class="text-right">420</td>
            <td class="text-right">14.7%</td>
            <td class="text-right">S/ 450</td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>
</template>

<script setup>
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement)

// --- CONFIGURACIÓN DE DATOS (MOCKUP BASADO EN TU INPUT) ---

// 1. Gráfico de Barras Agrupadas: Leads vs Ventas por Canal
const channelChartData = {
  labels: ['TikTok', 'Facebook Ads', 'WhatsApp Orgánico', 'Web SEO', 'Referidos'],
  datasets: [
    {
      label: 'Leads Totales',
      data: [1200, 800, 450, 250, 145],
      backgroundColor: '#cbd5e1', // Gris claro (Volumen)
      barPercentage: 0.6,
      categoryPercentage: 0.8
    },
    {
      label: 'Ventas (Pagó)',
      data: [120, 95, 110, 45, 50],
      backgroundColor: '#0f172a', // Azul oscuro casi negro (Resultado)
      barPercentage: 0.6,
      categoryPercentage: 0.8
    }
  ]
}

const channelChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', align: 'end' },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: { grid: { color: '#f1f5f9' }, beginAtZero: true },
    x: { grid: { display: false } }
  }
}

// 2. Gráfico Horizontal: Palabras Clave (we_key_word)
const keywordChartData = {
  labels: ['QUIERO (Alta Intención)', 'NECESITO (Alta Intención)', 'PRECIO (Media Intención)', 'INFO (Baja Intención)', 'COMO (Baja Intención)'],
  datasets: [
    {
      label: 'Tasa de Cierre %',
      data: [28, 24, 12, 8, 5],
      backgroundColor: (ctx) => {
        const val = ctx.raw
        if (val > 20) return '#1e293b' // Alta conversión
        if (val > 10) return '#64748b' // Media
        return '#cbd5e1' // Baja
      },
      borderRadius: 4
    }
  ]
}

const horizontalChartOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { display: true, max: 35 }, y: { grid: { display: false } } }
}

// 3. Gráfico Donut: Estrategias (we_type_strategy)
const strategyChartData = {
  labels: ['Eventos / Webinars', 'Sorteo Redes', 'Difusión Grupos', 'Partners'],
  datasets: [{
    data: [45, 25, 20, 10],
    backgroundColor: ['#0f172a', '#334155', '#64748b', '#94a3b8'],
    borderWidth: 0
  }]
}

const strategyLegend = [
  { label: 'Eventos / Webinars', value: 45, color: '#0f172a' },
  { label: 'Sorteo Redes', value: 25, color: '#334155' },
  { label: 'Difusión Grupos', value: 20, color: '#64748b' },
  { label: 'Partners / Alianzas', value: 10, color: '#94a3b8' }
]

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: { legend: { display: false } }
}

// 4. Datos Matriz (Totalizadores)
const matrixData = [
  { channel: 'TikTok', total: 1200, lost: 800, interested: 280, paid: 120, rate: 10.0, ticket: 'S/ 350' },
  { channel: 'WhatsApp', total: 450, lost: 100, interested: 240, paid: 110, rate: 24.4, ticket: 'S/ 480' },
  { channel: 'Referidos', total: 145, lost: 20, interested: 75, paid: 50, rate: 34.5, ticket: 'S/ 550' },
  { channel: 'Facebook', total: 800, lost: 500, interested: 205, paid: 95, rate: 11.8, ticket: 'S/ 380' }
]

const getConversionClass = (rate) => {
  if (rate >= 20) return 'badge-high'
  if (rate >= 10) return 'badge-mid'
  return 'badge-low'
}
</script>

<style scoped>
/* ESTILOS CORPORATIVOS / MINIMALISTAS */
.marketing-dashboard {
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

/* HEADER */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  text-transform: uppercase;
}
.page-meta {
  color: #64748b;
  font-size: 0.85rem;
  margin: 0.5rem 0 0 0;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.date-range {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  background: white;
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e1;
}
.btn-action {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  text-transform: uppercase;
}

/* KPI STRIP */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}
.kpi-box {
  background: white;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}
.kpi-box.highlight {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}
.kpi-box.highlight .kpi-label, .kpi-box.highlight .kpi-sub {
  color: #94a3b8;
}
.kpi-box.highlight .kpi-value {
  color: white;
}
.kpi-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 0.5rem;
  letter-spacing: 0.05em;
}
.kpi-value {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 0.5rem;
}
.kpi-delta { font-size: 0.8rem; font-weight: 600; }
.positive { color: #16a34a; }
.negative { color: #dc2626; }
.kpi-sub { font-size: 0.8rem; color: #64748b; }

/* SECTIONS & CHARTS */
.section-container {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
  margin-bottom: 2rem;
}
.chart-header { margin-bottom: 1.5rem; }
.chart-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; text-transform: uppercase; }
.chart-desc { font-size: 0.85rem; color: #64748b; }

.chart-wrapper-large { height: 350px; width: 100%; }
.chart-wrapper-medium { height: 250px; width: 100%; }

/* SPLIT SECTION */
.split-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}
.panel {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
}
.panel-header { margin-bottom: 1.5rem; }
.panel-header h4 { margin: 0; font-size: 1rem; font-weight: 700; text-transform: uppercase; }
.panel-header p { margin: 0.25rem 0 0; font-size: 0.8rem; color: #64748b; }

.doughnut-container { height: 200px; margin-bottom: 1rem; }
.legend-table { display: flex; flex-direction: column; gap: 0.5rem; }
.legend-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
.color-box { width: 12px; height: 12px; display: block; margin-right: 10px; }
.legend-name { flex-grow: 1; font-weight: 500; }
.legend-val { font-weight: 700; }

.insight-text {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-left: 4px solid #0f172a;
  font-size: 0.85rem;
  color: #334155;
}

/* MATRIX TABLE */
.matrix-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.matrix-table th { text-align: left; padding: 1rem; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 0.75rem; }
.matrix-table td { padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #334155; }
.matrix-table tfoot td { font-weight: 800; background: #f1f5f9; border-top: 2px solid #cbd5e1; }

.col-main { width: 20%; }
.text-right { text-align: right; }
.bg-gray-light { background: #f8fafc; font-weight: 600; }
.text-muted { color: #94a3b8; }
.text-blue { color: #2563eb; font-weight: 600; }
.text-dark { color: #0f172a; }
.font-bold { font-weight: 700; }

.badge-high { color: #16a34a; font-weight: 800; }
.badge-mid { color: #d97706; font-weight: 700; }
.badge-low { color: #dc2626; font-weight: 600; }

@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .split-section { grid-template-columns: 1fr; }
}
</style>
