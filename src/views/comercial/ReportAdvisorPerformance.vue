<template>
  <div class="analytics-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Dashboard de Conversión y Ventas</h2>
        <p class="subtitle">Análisis de ingresos, ROI por canal y efectividad de programas</p>
      </div>
      <div class="date-filter">
        <span class="filter-label">Periodo: Enero 2026</span>
        <button class="btn-text">FILTRAR</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="indicator-strip bg-blue"></div>
        <div class="kpi-content">
          <div class="kpi-value">S/ 45,280</div>
          <div class="kpi-label">Ingresos Totales (Mes)</div>
        </div>
      </div>
      
      <div class="kpi-card">
        <div class="indicator-strip bg-green"></div>
        <div class="kpi-content">
          <div class="kpi-value">18.5%</div>
          <div class="kpi-label">Conv. Lead-to-Paid</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="indicator-strip bg-purple"></div>
        <div class="kpi-content">
          <div class="kpi-value">S/ 1,450</div>
          <div class="kpi-label">Ticket Promedio Global</div>
        </div>
      </div>

      <div class="kpi-card highlight">
        <div class="kpi-content">
          <div class="kpi-value">TikTok Ads</div>
          <div class="kpi-label">Canal con mayor ROI</div>
        </div>
      </div>
    </div>

    <div class="main-chart-section">
      <div class="section-header">
        <h3>Comparativa de Canales (ROI)</h3>
        <p>Volumen de leads vs. Ventas cerradas por fuente de prospección</p>
      </div>
      <div class="chart-container-lg">
        <Bar :data="channelData" :options="channelOptions" />
      </div>
      <div class="insight-box">
        <strong>INSIGHT:</strong> Aunque <strong>Instagram</strong> trae más volumen de leads, <strong>TikTok</strong> tiene una tasa de cierre un 40% superior, generando clientes de mayor valor para el curso de IA.
      </div>
    </div>

    <div class="split-row">
      
      <div class="card flex-2">
        <div class="card-header">
          <h4>Rendimiento por Programa</h4>
          <span class="info-badge">Top 5 Activos</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Programa</th>
                <th class="text-right">Leads</th>
                <th class="text-right">Ventas</th>
                <th class="text-right">Ticket Prom.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(prog, index) in programData" :key="index">
                <td class="prog-name">
                  <span class="status-dot" :class="prog.trend"></span>
                  {{ prog.name }}
                </td>
                <td class="text-right">{{ prog.leads }}</td>
                <td class="text-right font-bold">{{ prog.sales }}</td>
                <td class="text-right highlight-text">{{ prog.ticket }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card flex-1">
        <div class="card-header">
          <h4>Estado Actual del Pipeline</h4>
        </div>
        <div class="doughnut-wrapper">
          <Doughnut :data="funnelData" :options="doughnutOptions" />
        </div>
        <div class="legend-custom">
          <div class="legend-item"><span class="rect color-success"></span>Pagó (18%)</div>
          <div class="legend-item"><span class="rect color-warn"></span>Interesado / En Proceso (45%)</div>
          <div class="legend-item"><span class="rect color-blue"></span>Atendido / Consulta (25%)</div>
          <div class="legend-item"><span class="rect color-gray"></span>Desestimado (12%)</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

// Registramos los componentes necesarios de Chart.js (Añadí BarElement)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

// --- 1. DATOS DE CANALES (ROI & VOLUMEN) ---
const channelData = {
  labels: ['TikTok', 'Instagram', 'Facebook', 'Google Ads', 'Ref. / Bases'],
  datasets: [
    {
      label: 'Leads Generados',
      data: [450, 620, 300, 150, 80],
      backgroundColor: '#cbd5e1', // Gris suave
      borderRadius: 4,
      order: 2
    },
    {
      label: 'Ventas Cerradas (Pagó)',
      data: [120, 85, 40, 25, 30], // TikTok convierte mejor aunque tenga menos leads
      backgroundColor: '#4f46e5', // Indigo fuerte
      borderRadius: 4,
      order: 1
    }
  ]
}

const channelOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { borderDash: [5, 5] } }
  }
}

// --- 2. DATOS DE PROGRAMAS (TABLA) ---
// Simulación de tu base de datos de cursos
const programData = [
  { name: 'Dirección Comercial con IA', leads: 340, sales: 58, ticket: 'S/ 1,800', trend: 'up' },
  { name: 'Especialización Agile', leads: 210, sales: 35, ticket: 'S/ 950', trend: 'stable' },
  { name: 'Azure Cloud Expert', leads: 180, sales: 42, ticket: 'S/ 1,200', trend: 'up' },
  { name: 'Power BI Avanzado', leads: 150, sales: 20, ticket: 'S/ 600', trend: 'down' },
  { name: 'Gestión de Proyectos', leads: 120, sales: 15, ticket: 'S/ 850', trend: 'stable' },
]

// --- 3. DATOS DE EMBUDO (DONA) ---
const funnelData = {
  labels: ['Pagó', 'Interesado', 'Atendido', 'Desestimado'],
  datasets: [{
    data: [18, 45, 25, 12],
    backgroundColor: ['#10b981', '#fbbf24', '#3b82f6', '#94a3b8'],
    borderWidth: 0,
    hoverOffset: 4
  }]
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }, 
  cutout: '75%'
}
</script>

<style scoped>
/* Layout Principal */
.analytics-dashboard { 
  font-family: 'Inter', system-ui, sans-serif; 
  background-color: #f8fafc; 
  padding: 2rem; 
  color: #334155; 
  min-height: 100vh; 
}

/* Header */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
.title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
.subtitle { color: #64748b; margin: 0.5rem 0 0 0; font-size: 0.9rem; }
.date-filter { background: white; border: 1px solid #e2e8f0; padding: 0.5rem 1rem; border-radius: 6px; display: flex; align-items: center; gap: 1rem; }
.filter-label { font-weight: 600; font-size: 0.85rem; }
.btn-text { border: none; background: #f1f5f9; padding: 4px 12px; border-radius: 4px; font-weight: 700; color: #475569; font-size: 0.75rem; cursor: pointer; }

/* KPI Section */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; padding: 0; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; overflow: hidden; height: 100px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }

.indicator-strip { width: 6px; height: 100%; }
.bg-blue { background: #3b82f6; }
.bg-green { background: #10b981; }
.bg-purple { background: #8b5cf6; }

.kpi-content { padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; width: 100%; }
.kpi-value { font-size: 1.6rem; font-weight: 800; color: #1e293b; line-height: 1.1; }
.kpi-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px; }

/* Estilo especial para la tarjeta Highlight */
.kpi-card.highlight { background: #1e1b4b; border: none; }
.kpi-card.highlight .kpi-value { color: #fff; }
.kpi-card.highlight .kpi-label { color: #a5b4fc; }

/* Main Chart Section */
.main-chart-section { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
.section-header h3 { margin: 0; color: #1e293b; font-size: 1.1rem; }
.section-header p { margin: 0.25rem 0 1.5rem 0; color: #94a3b8; font-size: 0.85rem; }
.chart-container-lg { height: 300px; width: 100%; }
.insight-box { margin-top: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; color: #475569; font-size: 0.85rem; line-height: 1.5; }

/* Split Row */
.split-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; }
.flex-2 { flex: 2; min-width: 450px; }
.flex-1 { flex: 1; min-width: 300px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.card-header h4 { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }
.info-badge { font-size: 0.7rem; background: #eff6ff; color: #3b82f6; padding: 4px 8px; border-radius: 4px; font-weight: 600; }

/* Tabla Custom */
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; color: #94a3b8; font-weight: 600; padding: 10px; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-size: 0.7rem; }
.data-table td { padding: 12px 10px; border-bottom: 1px solid #f8fafc; color: #334155; }
.data-table tr:last-child td { border-bottom: none; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; color: #1e293b; }
.highlight-text { color: #4f46e5; font-weight: 600; }

/* Status Dots en Tabla */
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
.status-dot.up { background: #10b981; }
.status-dot.stable { background: #fbbf24; }
.status-dot.down { background: #ef4444; }

/* Doughnut & Legend */
.doughnut-wrapper { height: 180px; position: relative; display: flex; justify-content: center; }
.legend-custom { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: #64748b; }
.rect { width: 12px; height: 12px; border-radius: 3px; }
.color-success { background: #10b981; }
.color-warn { background: #fbbf24; }
.color-blue { background: #3b82f6; }
.color-gray { background: #94a3b8; }

@media (max-width: 768px) {
  .header-flex { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .split-row { flex-direction: column; }
  .flex-2, .flex-1 { min-width: 100%; }
}
</style>