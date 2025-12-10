<template>
  <div class="analytics-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Inteligencia de Contactabilidad</h2>
        <p class="subtitle">Análisis de patrones de respuesta y eficiencia de marcación</p>
      </div>
      <div class="date-filter">
        <span class="filter-label">Últimos 30 días</span>
        <button class="btn-icon">📅</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="icon-box bg-blue">📞</div>
        <div>
          <div class="kpi-value">12,450</div>
          <div class="kpi-label">Intentos Totales</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="icon-box bg-green">✅</div>
        <div>
          <div class="kpi-value">32.4%</div>
          <div class="kpi-label">Tasa de Respuesta Global</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="icon-box bg-purple">⏱️</div>
        <div>
          <div class="kpi-value">3m 12s</div>
          <div class="kpi-label">Duración Promedio (Efectivas)</div>
        </div>
      </div>
      <div class="kpi-card highlight">
        <div class="icon-box bg-gold">🏆</div>
        <div>
          <div class="kpi-value">10:00 - 11:00 AM</div>
          <div class="kpi-label">Mejor Hora para Llamar</div>
        </div>
      </div>
    </div>

    <div class="main-chart-section">
      <div class="section-header">
        <h3>🕒 Curva Diaria de Contactabilidad</h3>
        <p>Relación entre volumen de llamadas vs. tasa de respuesta por hora</p>
      </div>
      <div class="chart-container-lg">
        <Line :data="hourlyData" :options="hourlyOptions" />
      </div>
      <div class="insight-box">
        <strong>💡 Insight del CEO:</strong> Se observa una caída drástica de respuesta entre la 1:00 PM y 2:00 PM (Hora de almuerzo). Sin embargo, las llamadas realizadas después de las 5:00 PM tienen una duración 40% mayor.
      </div>
    </div>

    <div class="split-row">
      <div class="card flex-2">
        <div class="card-header">
          <h4>🔥 Mapa de Calor: Probabilidad de Respuesta</h4>
          <span class="info-badge">Intensidad = % Contestaron</span>
        </div>
        <div class="heatmap-table-wrapper">
          <table class="heatmap">
            <thead>
              <tr>
                <th></th>
                <th v-for="h in hours" :key="h">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(day, dIndex) in weekDays" :key="dIndex">
                <td class="day-label">{{ day.name }}</td>
                <td 
                  v-for="(val, hIndex) in day.values" 
                  :key="hIndex" 
                  class="heat-cell"
                  :style="{ backgroundColor: getHeatColor(val) }"
                  :title="`${val}% Respuesta`"
                >
                  <span class="heat-val" v-if="val > 35">{{ val }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card flex-1">
        <div class="card-header">
          <h4>Distribución de Intentos</h4>
        </div>
        <div class="doughnut-wrapper">
          <Doughnut :data="outcomeData" :options="doughnutOptions" />
        </div>
        <div class="legend-custom">
          <div class="legend-item"><span class="dot color-success"></span>Contestada (32%)</div>
          <div class="legend-item"><span class="dot color-warn"></span>Buzón/No contesta (45%)</div>
          <div class="legend-item"><span class="dot color-danger"></span>Número Errado (8%)</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement)

// --- DATOS MOCKUP ---

// 1. Gráfico de Línea (Hora del día)
const hourlyData = {
  labels: ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm'],
  datasets: [
    {
      label: 'Volumen de Llamadas',
      data: [120, 350, 480, 400, 300, 150, 200, 380, 420, 310, 180],
      borderColor: '#cbd5e1',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 5],
      yAxisID: 'y',
      tension: 0.4,
      pointRadius: 0
    },
    {
      label: 'Tasa de Respuesta (%)',
      data: [15, 25, 42, 38, 28, 12, 18, 30, 35, 45, 40], // El pico a las 10am y 5pm
      borderColor: '#6366f1', // Indigo
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      borderWidth: 3,
      fill: true,
      yAxisID: 'y1',
      tension: 0.4
    }
  ]
}

const hourlyOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    y: { display: false }, // Ocultamos eje de volumen para limpiar
    y1: { position: 'right', grid: { display: false }, ticks: { callback: (v) => v + '%' } },
    x: { grid: { display: false } }
  },
  plugins: { legend: { position: 'top' } }
}

// 2. Datos Heatmap (Matriz manual)
const hours = ['9-11', '11-13', '13-15', '15-17', '17-19']
const weekDays = [
  { name: 'Lun', values: [35, 20, 10, 25, 40] },
  { name: 'Mar', values: [45, 30, 12, 30, 42] }, // Martes día fuerte
  { name: 'Mié', values: [40, 28, 15, 28, 38] },
  { name: 'Jue', values: [38, 25, 10, 25, 35] },
  { name: 'Vie', values: [25, 20, 8, 15, 10] },  // Viernes tarde muere
]

const getHeatColor = (val) => {
  // Lógica de color tipo "Heatmap"
  if (val >= 40) return '#4f46e5' // Muy alto (Indigo oscuro)
  if (val >= 30) return '#818cf8' // Alto
  if (val >= 20) return '#c7d2fe' // Medio
  if (val >= 10) return '#e0e7ff' // Bajo
  return '#f1f5f9' // Muy bajo (Gris/Blanco)
}

// 3. Gráfico Dona (Outcomes)
const outcomeData = {
  labels: ['Contestada', 'No Contesta', 'Ocupado', 'Num Errado', 'Buzón'],
  datasets: [{
    data: [32, 45, 10, 8, 5],
    backgroundColor: ['#10b981', '#fbbf24', '#f59e0b', '#ef4444', '#64748b'],
    borderWidth: 0,
    hoverOffset: 4
  }]
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }, // Leyenda customizada en HTML
  cutout: '70%'
}
</script>

<style scoped>
/* Layout Principal */
.analytics-dashboard { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; background-color: #f8fafc; padding: 2rem; color: #334155; min-height: 100vh; }

/* Header */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
.title { font-size: 1.75rem; font-weight: 800; color: #1e293b; margin: 0; }
.subtitle { color: #64748b; margin: 0.25rem 0 0 0; font-size: 0.95rem; }
.date-filter { background: white; border: 1px solid #e2e8f0; padding: 0.5rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.filter-label { font-weight: 600; font-size: 0.9rem; }
.btn-icon { border: none; background: none; font-size: 1.2rem; cursor: pointer; }

/* KPI Section */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transition: transform 0.2s; }
.kpi-card:hover { transform: translateY(-2px); }
.kpi-card.highlight { background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: white; border: none; }
.kpi-card.highlight .kpi-label { color: rgba(255,255,255,0.8); }

.icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
.bg-blue { background: #eff6ff; }
.bg-green { background: #f0fdf4; }
.bg-purple { background: #f5f3ff; }
.bg-gold { background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); }

.kpi-value { font-size: 1.5rem; font-weight: 800; line-height: 1.2; }
.kpi-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

/* Main Chart Section */
.main-chart-section { background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 2rem; position: relative; }
.section-header h3 { margin: 0; color: #1e293b; font-size: 1.25rem; }
.section-header p { margin: 0.25rem 0 1rem 0; color: #94a3b8; font-size: 0.9rem; }
.chart-container-lg { height: 320px; width: 100%; }
.insight-box { margin-top: 1rem; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 6px; color: #92400e; font-size: 0.9rem; }

/* Split Row (Heatmap + Doughnut) */
.split-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; }
.flex-2 { flex: 2; min-width: 400px; }
.flex-1 { flex: 1; min-width: 300px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.card-header h4 { margin: 0; font-size: 1.1rem; color: #334155; }
.info-badge { font-size: 0.75rem; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; color: #64748b; }

/* Heatmap Table Styles */
.heatmap-table-wrapper { overflow-x: auto; }
.heatmap { width: 100%; border-collapse: separate; border-spacing: 4px; }
.heatmap th { font-size: 0.8rem; color: #64748b; font-weight: 600; padding-bottom: 0.5rem; }
.day-label { font-weight: 700; font-size: 0.85rem; color: #475569; width: 40px; }
.heat-cell { height: 45px; border-radius: 6px; text-align: center; vertical-align: middle; transition: all 0.2s; cursor: pointer; }
.heat-cell:hover { transform: scale(1.05); }
.heat-val { font-size: 0.75rem; color: white; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }

/* Doughnut & Legend */
.doughnut-wrapper { height: 200px; position: relative; }
.legend-custom { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
.legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #475569; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.color-success { background: #10b981; }
.color-warn { background: #fbbf24; }
.color-danger { background: #ef4444; }

/* Responsive adjustments */
@media (max-width: 768px) {
  .header-flex { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .split-row { flex-direction: column; }
  .flex-2, .flex-1 { min-width: 100%; }
}
</style>