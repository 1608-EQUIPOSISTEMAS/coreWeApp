<template>
  <div class="page-dashboard">
    <div class="header-flex">
      <div>
        <h2 class="page-title">Tablero de Objetivos Comerciales</h2>
        <p class="page-sub">Seguimiento semanal y mensual de rendimiento por asesor</p>
      </div>
      <div class="header-actions">
        <span class="badge-month">Noviembre 2025</span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Objetivo Global (Mes)</div>
        <div class="kpi-value text-dark">394</div>
        <div class="kpi-trend">Meta planificada</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Logro Real</div>
        <div class="kpi-value text-primary">402</div>
        <div class="kpi-trend text-success">
          <span class="trend-icon">▲</span> +8 vs Meta
        </div>
      </div>
      <div class="kpi-card highlight-card">
        <div class="kpi-label text-white-50">Cumplimiento</div>
        <div class="kpi-value text-white">102%</div>
        <div class="kpi-trend text-white-50">Excelente desempeño</div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card flex-2">
        <div class="chart-header">
          <span class="chart-title">Evolución de Ventas Semanal (Obj vs Real)</span>
        </div>
        <div class="chart-body">
          <Line :data="weeklyTrendData" :options="lineOptions" />
        </div>
      </div>

      <div class="chart-card flex-3">
        <div class="chart-header">
          <span class="chart-title">Rendimiento por Asesor (Acumulado)</span>
        </div>
        <div class="chart-body">
          <Bar :data="advisorPerformanceData" :options="barOptions" />
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="chart-header flex-between">
        <span class="chart-title">📊 Detalle Semanal por Equipo</span>
        <button class="btn-export">Exportar Excel</button>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th class="sticky-col">Semana</th>
              <th class="text-center bg-gray-50">Meta Global</th>
              <th class="text-center bg-gray-50">Logro Real</th>
              <th class="text-center">%</th>
              <th v-for="advisor in advisors" :key="advisor" class="text-center advisor-header">
                {{ advisor }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(week, index) in tableData" :key="index">
              <td class="sticky-col fw-600">{{ week.label }}</td>
              <td class="text-center text-muted">{{ week.globalObj }}</td>
              <td class="text-center fw-bold">{{ week.globalLogro }}</td>
              <td class="text-center">
                <span :class="getBadgeClass(week.globalLogro, week.globalObj)">
                  {{ Math.round((week.globalLogro / week.globalObj) * 100) }}%
                </span>
              </td>
              <td v-for="(val, idx) in week.advisorsData" :key="idx" class="text-center" :class="{'cell-success': val >= 15, 'cell-warning': val > 0 && val < 15, 'cell-empty': val === 0}">
                {{ val }}
              </td>
            </tr>
            <tr class="row-total">
              <td class="sticky-col">TOTAL</td>
              <td class="text-center">394</td>
              <td class="text-center">402</td>
              <td class="text-center text-success">102%</td>
              <td v-for="(total, idx) in advisorsTotals" :key="idx" class="text-center">
                {{ total }}
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
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

// --- DATOS SIMULADOS (Basados en tu imagen de Noviembre) ---

const advisors = ['Camilo', 'Arleth', 'Gerard/G', 'Stef/Fab', 'Luz', 'WEB', 'B2B']
const advisorsTotals = [60, 133, 96, 47, 0, 50, 15] // Totales del Excel

// Datos para la tabla detallada
const tableData = [
  { label: 'S44 (1-2)',   globalObj: 26,  globalLogro: 6,   advisorsData: [0, 0, 3, 0, 0, 3, 0] },
  { label: 'S45 (3-9)',   globalObj: 82,  globalLogro: 117, advisorsData: [21, 31, 19, 13, 0, 23, 10] },
  { label: 'S46 (10-16)', globalObj: 86,  globalLogro: 119, advisorsData: [18, 39, 31, 17, 0, 12, 2] },
  { label: 'S47 (17-23)', globalObj: 100, globalLogro: 125, advisorsData: [16, 50, 35, 14, 0, 7, 3] },
  { label: 'S48 (24-30)', globalObj: 100, globalLogro: 35,  advisorsData: [5, 13, 8, 3, 0, 5, 0] },
]

// --- GRÁFICO 1: TENDENCIA SEMANAL ---
const weeklyTrendData = {
  labels: ['S44', 'S45', 'S46', 'S47', 'S48'],
  datasets: [
    {
      label: 'Objetivo',
      data: [26, 82, 86, 100, 100],
      borderColor: '#94a3b8',
      borderDash: [5, 5],
      tension: 0.4,
      pointRadius: 0
    },
    {
      label: 'Logro Real',
      data: [6, 117, 119, 125, 35],
      borderColor: '#10b981', // Verde éxito
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      tension: 0.4,
      fill: true
    }
  ]
}

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true } }
}

// --- GRÁFICO 2: BARRAS COMPARATIVAS POR ASESOR ---
const advisorPerformanceData = {
  labels: advisors,
  datasets: [
    {
      label: 'Objetivo',
      data: [79, 93, 79, 57, 12, 75, 0], // Datos "Obj" total de la imagen
      backgroundColor: '#e2e8f0',
      borderRadius: 4
    },
    {
      label: 'Logro',
      data: advisorsTotals, // Datos "Logro" total de la imagen
      backgroundColor: (ctx) => {
        // Color dinámico: Si Logro > Objetivo se pone verde intenso, si no, azul o alerta
        const index = ctx.dataIndex;
        const value = ctx.dataset.data[index];
        const target = [79, 93, 79, 57, 12, 75, 0][index];
        return value >= target ? '#16a34a' : '#3b82f6';
      },
      borderRadius: 4
    }
  ]
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }, // Ocultar leyenda para limpiar, ya se entiende por color
  scales: { y: { beginAtZero: true } }
}

// Helper para colores de badges
const getBadgeClass = (val, target) => {
  const percentage = (val / target) * 100
  if (percentage >= 100) return 'badge-success'
  if (percentage >= 80) return 'badge-warning'
  return 'badge-danger'
}
</script>

<style scoped>
/* Estilos Globales del Dashboard */
.page-dashboard { padding: 2rem; background-color: #f1f5f9; min-height: 100vh; font-family: 'Inter', sans-serif; color: #1e293b; display: flex; flex-direction: column; gap: 1.5rem; }

/* Header */
.header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.page-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
.page-sub { font-size: 0.9rem; color: #64748b; margin-top: 0.25rem; }
.badge-month { background: #e0e7ff; color: #4338ca; padding: 0.5rem 1rem; border-radius: 99px; font-weight: 600; font-size: 0.85rem; }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.kpi-card { background: white; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.highlight-card { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; }
.kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-bottom: 0.5rem; }
.kpi-value { font-size: 2rem; font-weight: 700; line-height: 1; margin-bottom: 0.5rem; }
.kpi-trend { font-size: 0.85rem; display: flex; align-items: center; gap: 4px; color: #64748b; }

/* Gráficos */
.charts-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.chart-card { background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); min-height: 350px; display: flex; flex-direction: column; }
.flex-2 { flex: 2; min-width: 400px; }
.flex-3 { flex: 3; min-width: 500px; }
.chart-header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
.chart-title { font-weight: 700; color: #334155; font-size: 1rem; }
.chart-body { flex: 1; position: relative; }

/* Tabla */
.table-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1.5rem; overflow: hidden; }
.flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.btn-export { background: #f8fafc; border: 1px solid #cbd5e1; color: #475569; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; }
.btn-export:hover { background: #e2e8f0; }

.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; white-space: nowrap; }
.table th { padding: 1rem; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
.table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
.sticky-col { position: sticky; left: 0; background: white; z-index: 10; border-right: 2px solid #f1f5f9; }
.row-total { background-color: #f8fafc; font-weight: 700; border-top: 2px solid #e2e8f0; }

/* Utilidades de Texto y Color */
.text-center { text-align: center; }
.fw-600 { font-weight: 600; }
.fw-bold { font-weight: 700; }
.text-success { color: #16a34a; }
.text-primary { color: #2563eb; }
.text-muted { color: #94a3b8; }
.text-white { color: white; }
.text-white-50 { color: rgba(255, 255, 255, 0.7); }
.bg-gray-50 { background-color: #f8fafc; }

/* Badges de % */
.badge-success { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; }
.badge-warning { background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; }
.badge-danger { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; }

/* Heatmap Logic para Celdas */
.cell-success { background-color: #dcfce7; color: #14532d; font-weight: 700; } /* Verde intenso del Excel */
.cell-warning { background-color: #fff; color: #334155; }
.cell-empty { color: #cbd5e1; }
.advisor-header { background-color: #fff7ed; color: #9a3412; border-bottom: 2px solid #fdba74 !important; }

</style>