<template>
  <div class="advisor-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Rendimiento del Equipo Comercial</h2>
        <p class="subtitle">Supervisión de tiempos de respuesta y efectividad de cierre por agente</p>
      </div>
      <div class="actions">
        <button class="btn-secondary">Exportar CSV</button>
        <button class="btn-primary">Configurar Metas</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="indicator-strip bg-warning"></div>
        <div class="kpi-content">
          <div class="kpi-value">42 min</div>
          <div class="kpi-label">Tiempo Prom. 1ª Respuesta</div>
          <small class="trend negative">↑ 12% vs mes anterior</small>
        </div>
      </div>

      <div class="kpi-card">
        <div class="indicator-strip bg-success"></div>
        <div class="kpi-content">
          <div class="kpi-value">14.2%</div>
          <div class="kpi-label">Efectividad Global (Cierre)</div>
          <small class="trend positive">↑ 2.1% vs mes anterior</small>
        </div>
      </div>

      <div class="kpi-card">
        <div class="indicator-strip bg-info"></div>
        <div class="kpi-content">
          <div class="kpi-value">85</div>
          <div class="kpi-label">Leads "En Proceso" hoy</div>
        </div>
      </div>
    </div>

    <div class="chart-section">
      <div class="section-header">
        <h3>Efectividad de Cierre por Asesor</h3>
        <p>Comparativa: Volumen de leads gestionados vs. Ventas reales (Inscritos)</p>
      </div>
      <div class="chart-wrapper">
        <Bar :data="advisorChartData" :options="chartOptions" />
      </div>
    </div>

    <div class="details-section">
      <div class="section-header">
        <h3>Detalle de Gestión y Tiempos</h3>
      </div>
      <div class="table-container">
        <table class="advisor-table">
          <thead>
            <tr>
              <th>Asesor</th>
              <th class="text-center">Leads Asignados</th>
              <th class="text-center">Leads Atendidos</th>
              <th class="text-center">Ventas (Pagó)</th>
              <th class="text-center">Tasa Cierre</th>
              <th class="text-right">T. Respuesta Prom.</th>
              <th class="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(agent, index) in tableData" :key="index">
              <td class="agent-name">
                <div class="avatar">{{ agent.initials }}</div>
                <div>
                  <span class="name">{{ agent.name }}</span>
                  <span class="role">{{ agent.role }}</span>
                </div>
              </td>
              <td class="text-center">{{ agent.assigned }}</td>
              <td class="text-center">{{ agent.attended }}</td>
              <td class="text-center font-bold">{{ agent.sales }}</td>
              <td class="text-center">
                <span class="badge" :class="getConversionClass(agent.conversion)">
                  {{ agent.conversion }}%
                </span>
              </td>
              <td class="text-right time-cell" :class="getTimeClass(agent.responseTime)">
                {{ agent.responseTime }} min
              </td>
              <td class="text-center">
                <span class="status-dot" :class="agent.isOnline ? 'online' : 'offline'"></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// --- DATOS MOCKUP (Basados en tus capturas) ---

// 1. Datos para el Gráfico (Comparativa Atendidos vs Pagados)
// Esto visualiza rápidamente quién convierte mejor su volumen.
const advisorChartData = {
  labels: ['Raul P.', 'Arleth C.', 'Eliuth David', 'Jorge M.'],
  datasets: [
    {
      label: 'Leads Atendidos',
      data: [120, 95, 80, 45],
      backgroundColor: '#cbd5e1', // Gris (Volumen)
      barPercentage: 0.6,
      categoryPercentage: 0.8
    },
    {
      label: 'Ventas Cerradas (Pagó)',
      data: [18, 22, 5, 8], // Arleth tiene menos volumen pero más ventas (Mejor efectividad)
      backgroundColor: '#3b82f6', // Azul (Éxito)
      barPercentage: 0.6,
      categoryPercentage: 0.8
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', align: 'end' },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: { grid: { borderDash: [4, 4] }, beginAtZero: true },
    x: { grid: { display: false } }
  }
}

// 2. Datos para la Tabla (Detalle con Tiempos)
const tableData = [
  { 
    name: 'Arleth C.', initials: 'AC', role: 'Senior', 
    assigned: 110, attended: 95, sales: 22, conversion: 23.1, 
    responseTime: 12, // Muy rápido
    isOnline: true 
  },
  { 
    name: 'Raul P.', initials: 'RP', role: 'Senior', 
    assigned: 150, attended: 120, sales: 18, conversion: 15.0, 
    responseTime: 45, // Lento
    isOnline: true 
  },
  { 
    name: 'Jorge M.', initials: 'JM', role: 'Junior', 
    assigned: 60, attended: 45, sales: 8, conversion: 17.7, 
    responseTime: 25, // Normal
    isOnline: false 
  },
  { 
    name: 'Eliuth David', initials: 'ED', role: 'Junior', 
    assigned: 100, attended: 80, sales: 5, conversion: 6.2, 
    responseTime: 180, // Muy lento (Alerta roja)
    isOnline: true 
  }
]

// Helpers para clases dinámicas
const getConversionClass = (val) => {
  if (val >= 20) return 'high-conv'
  if (val >= 10) return 'med-conv'
  return 'low-conv'
}

const getTimeClass = (minutes) => {
  if (minutes <= 15) return 'time-good' // Verde
  if (minutes <= 60) return 'time-warn' // Naranja
  return 'time-bad' // Rojo
}

</script>

<style scoped>
/* Layout */
.advisor-dashboard { 
  font-family: 'Inter', sans-serif; 
  background-color: #f1f5f9; 
  padding: 2rem; 
  color: #334155; 
  min-height: 100vh; 
}

/* Header */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0; }
.subtitle { color: #64748b; font-size: 0.9rem; margin-top: 0.25rem; }
.actions { display: flex; gap: 0.75rem; }
.btn-primary { background: #0f172a; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.btn-secondary { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }

/* KPI Cards */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; height: 100px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.indicator-strip { width: 5px; height: 100%; }
.bg-warning { background: #f59e0b; }
.bg-success { background: #10b981; }
.bg-info { background: #3b82f6; }

.kpi-content { padding: 1.25rem; display: flex; flex-direction: column; justify-content: center; width: 100%; }
.kpi-value { font-size: 1.8rem; font-weight: 700; color: #1e293b; line-height: 1; margin-bottom: 0.25rem; }
.kpi-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
.trend { font-size: 0.75rem; font-weight: 600; margin-top: 4px; }
.trend.positive { color: #10b981; }
.trend.negative { color: #ef4444; }

/* Chart Section */
.chart-section { background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 1.5rem; margin-bottom: 2rem; }
.section-header { margin-bottom: 1.5rem; }
.section-header h3 { margin: 0; font-size: 1.1rem; color: #1e293b; }
.section-header p { margin: 0.25rem 0 0; color: #94a3b8; font-size: 0.85rem; }
.chart-wrapper { height: 300px; }

/* Details Table */
.details-section { background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 1.5rem; }
.table-container { overflow-x: auto; }
.advisor-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.advisor-table th { text-align: left; color: #64748b; font-weight: 600; padding: 1rem; border-bottom: 2px solid #f1f5f9; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
.advisor-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }

/* Agent Cell Styles */
.agent-name { display: flex; align-items: center; gap: 0.75rem; }
.avatar { width: 32px; height: 32px; background: #e2e8f0; color: #475569; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
.name { display: block; font-weight: 600; color: #1e293b; }
.role { display: block; font-size: 0.75rem; color: #94a3b8; }

/* Metrics Styles */
.text-center { text-align: center; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; }

/* Badges de Conversión */
.badge { padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; }
.high-conv { background: #dcfce7; color: #166534; }
.med-conv { background: #fef9c3; color: #854d0e; }
.low-conv { background: #fee2e2; color: #991b1b; }

/* Colores de Tiempo de Respuesta */
.time-cell { font-family: 'Courier New', monospace; font-weight: 700; }
.time-good { color: #10b981; }
.time-warn { color: #f59e0b; }
.time-bad { color: #ef4444; }

/* Status Dot */
.status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px #e2e8f0; }
.online { background: #10b981; }
.offline { background: #cbd5e1; }

@media (max-width: 768px) {
  .dashboard-header { flex-direction: column; gap: 1rem; }
  .actions { width: 100%; justify-content: flex-start; }
}
</style>