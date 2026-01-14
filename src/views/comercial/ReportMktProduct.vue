<template>
  <div class="followup-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Rentabilidad de Seguimiento & Contactabilidad</h2>
        <p class="subtitle">Análisis de eficiencia de llamadas y cierres por horario</p>
      </div>
      <div class="header-actions">
        <select v-model="filters.advisor" class="select-control">
          <option value="">Todos los Asesores</option>
          <option value="eliuth">Eliuth D.</option>
          <option value="raul">Raúl P.</option>
        </select>
        <select v-model="filters.country" class="select-control">
          <option value="">Todos los Países</option>
          <option value="PE">Perú</option>
          <option value="CO">Colombia</option>
          <option value="MX">México</option>
        </select>
        <button class="btn-primary" @click="refreshData">
          <i class="icon-refresh"></i> Actualizar
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon bg-blue-light text-blue">📞</div>
        <div class="kpi-data">
          <span class="value">1,240</span>
          <span class="label">Intentos de Llamada</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon bg-green-light text-green">✅</div>
        <div class="kpi-data">
          <span class="value">68%</span>
          <span class="label">Tasa de Contestación</span>
          <span class="sub-label">Promedio global</span>
        </div>
      </div>
      <div class="kpi-card highlight-card">
        <div class="kpi-data">
          <span class="value">S/ 12,400</span>
          <span class="label">Recuperado por Seguimiento</span>
          <span class="sub-label">Ventas logradas tras 2+ intentos</span>
        </div>
      </div>
    </div>

    <div class="main-chart-section">
      <div class="section-header">
        <h3>Eficacia Horaria: Llamadas vs. Cierres ("Pagó")</h3>
        <p>Identifica las "Golden Hours" donde los clientes contestan y compran.</p>
      </div>
      <div class="chart-wrapper">
        <Line :data="hourlyChartData" :options="hourlyChartOptions" />
      </div>
      <div class="chart-insight">
        <span class="insight-badge">💡 Insight IA</span>
        <p>Se detecta un pico de respuesta a las <strong>6:00 PM</strong>, pero los cierres efectivos ocurren mayormente a las <strong>11:00 AM</strong>.</p>
      </div>
    </div>

    <div class="split-row">

      <div class="card flex-1">
        <div class="card-header">
          <h4>Perfil del Comprador</h4>
        </div>
        <div class="doughnut-wrapper">
          <Doughnut :data="situationChartData" :options="doughnutOptions" />
        </div>
        <div class="legend-custom">
          <div v-for="(item, i) in situationData" :key="i" class="legend-item">
            <span class="dot" :style="{ background: item.color }"></span>
            <span class="text">{{ item.label }}</span>
            <span class="percent">{{ item.percent }}%</span>
          </div>
        </div>
      </div>

      <div class="card flex-2">
        <div class="card-header">
          <h4>Conversión por Estrategia</h4>
          <select v-model="filters.strategy" class="mini-select">
            <option value="">Todas</option>
            <option value="sorteo">Sorteo Redes</option>
            <option value="eventos">Eventos</option>
          </select>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Estrategia</th>
              <th class="text-center">Leads</th>
              <th class="text-center">Contactados</th>
              <th class="text-right">Ventas (Pagó)</th>
              <th>Eficacia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="st in strategyStats" :key="st.id">
              <td class="font-medium">{{ st.name }}</td>
              <td class="text-center">{{ st.leads }}</td>
              <td class="text-center">
                <span class="pill-gray">{{ st.contacted }}%</span>
              </td>
              <td class="text-right font-bold text-green">{{ st.sales }}</td>
              <td>
                <div class="progress-bar">
                  <div class="fill" :style="{ width: st.efficiency + '%', background: getEfficiencyColor(st.efficiency) }"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler)

// --- ESTADO Y FILTROS ---
const filters = ref({
  advisor: '',
  country: '',
  strategy: ''
})

// --- DATA MOCKUP (Simulando tu DB) ---

// 1. DATA PARA EL GRÁFICO DE LÍNEA (Eficacia Horaria)
// Eje X: Horas del día
// Dataset 1: Intentos de llamada (Línea gris o área)
// Dataset 2: "Contestó" (Línea Azul)
// Dataset 3: "Pagó" (Barras o Puntos verdes grandes - Éxito)
const hourlyChartData = {
  labels: ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm'],
  datasets: [
    {
      label: 'Llamadas Realizadas',
      data: [12, 25, 40, 35, 15, 10, 20, 35, 45, 50, 40, 20, 10],
      borderColor: '#94a3b8', // Gris azulado
      backgroundColor: 'rgba(148, 163, 184, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0
    },
    {
      label: 'Cliente Contestó',
      data: [5, 15, 25, 20, 5, 2, 8, 20, 30, 42, 35, 15, 5], // A las 5-6pm contestan más
      borderColor: '#3b82f6', // Azul
      backgroundColor: '#3b82f6',
      tension: 0.4,
      borderWidth: 2
    },
    {
      label: 'Cierre Exitoso (Pagó)',
      data: [0, 2, 5, 8, 1, 0, 1, 3, 5, 4, 12, 4, 1], // Picos de venta
      borderColor: '#10b981', // Verde
      pointBackgroundColor: '#10b981',
      pointRadius: 6, // Puntos más grandes para resaltar el éxito
      showLine: false // Solo mostrar puntos
    }
  ]
}

const hourlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } },
    tooltip: { mode: 'index', intersect: false }
  },
  interaction: { mode: 'nearest', axis: 'x', intersect: false },
  scales: {
    y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
    x: { grid: { display: false } }
  }
}

// 2. DATA SITUACIÓN DEL PROSPECTO (ID 512)
const situationData = [
  { label: 'Independientes', percent: 45, color: '#6366f1' },
  { label: 'Estudiantes', percent: 30, color: '#3b82f6' },
  { label: 'Egresados', percent: 15, color: '#10b981' },
  { label: 'Empresas', percent: 10, color: '#f59e0b' }
]

const situationChartData = {
  labels: situationData.map(d => d.label),
  datasets: [{
    data: situationData.map(d => d.percent),
    backgroundColor: situationData.map(d => d.color),
    borderWidth: 0,
    cutout: '75%'
  }]
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }
}

// 3. DATA ESTRATEGIA (ID 516)
const strategyStats = [
  { id: 1, name: 'Sorteo Redes', leads: 450, contacted: 85, sales: 'S/ 5k', efficiency: 20 },
  { id: 2, name: 'Eventos (Webinar)', leads: 120, contacted: 92, sales: 'S/ 12k', efficiency: 85 }, // Alta eficiencia
  { id: 3, name: 'Convalidación', leads: 80, contacted: 60, sales: 'S/ 3k', efficiency: 45 },
  { id: 4, name: 'Difusión Grupos', leads: 300, contacted: 40, sales: 'S/ 1k', efficiency: 10 } // Mucho ruido, poca venta
]

// --- FUNCIONES UTILITARIAS ---
const getEfficiencyColor = (val) => {
  if (val >= 70) return '#10b981' // Verde
  if (val >= 40) return '#f59e0b' // Amarillo
  return '#ef4444' // Rojo
}

const refreshData = () => {
  // Lógica para llamar a tu API
  console.log("Consultando datos filtrados...")
}
</script>

<style scoped>
/* Estilos Base Clean & Professional */
.followup-dashboard {
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;
  padding: 2rem;
  color: #1e293b;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.title { font-size: 1.5rem; font-weight: 800; margin: 0; color: #0f172a; }
.subtitle { color: #64748b; margin: 0.25rem 0 0; font-size: 0.9rem; }

.header-actions { display: flex; gap: 0.8rem; }
.select-control {
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #475569;
  font-size: 0.85rem;
  outline: none;
}
.btn-primary {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover { background: #1e293b; }

/* KPI GRID */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.kpi-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.bg-blue-light { background: #eff6ff; }
.bg-green-light { background: #dcfce7; }
.text-blue { color: #3b82f6; }
.text-green { color: #10b981; }

.kpi-data { display: flex; flex-direction: column; }
.value { font-size: 1.5rem; font-weight: 800; color: #0f172a; line-height: 1.2; }
.label { font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
.sub-label { font-size: 0.7rem; color: #94a3b8; margin-top: 2px; }

.highlight-card {
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  border: none;
}
.highlight-card .value { color: white; }
.highlight-card .label { color: #a5b4fc; }
.highlight-card .sub-label { color: #818cf8; }

/* CHARTS & SECTIONS */
.card, .main-chart-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.main-chart-section { margin-bottom: 2rem; position: relative; }
.chart-wrapper { height: 320px; width: 100%; margin-top: 1rem; }

.chart-insight {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.insight-badge {
  background: #16a34a;
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}
.chart-insight p { margin: 0; font-size: 0.9rem; color: #166534; }

/* SPLIT ROW */
.split-row { display: flex; gap: 2rem; flex-wrap: wrap; }
.flex-1 { flex: 1; min-width: 300px; }
.flex-2 { flex: 2; min-width: 400px; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.card-header h4 { margin: 0; font-size: 1.1rem; color: #0f172a; }

/* DOUGHNUT & LEGEND */
.doughnut-wrapper { height: 200px; position: relative; margin-bottom: 1rem; }
.legend-custom { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; font-size: 0.85rem; }
.dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
.text { color: #64748b; flex-grow: 1; }
.percent { font-weight: 700; color: #1e293b; }

/* TABLE */
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table th { text-align: left; padding-bottom: 1rem; color: #94a3b8; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.8rem 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
.pill-gray { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.font-medium { font-weight: 600; color: #1e293b; }

/* PROGRESS BAR */
.progress-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  width: 100%;
  overflow: hidden;
}
.fill { height: 100%; border-radius: 3px; }

@media (max-width: 768px) {
  .dashboard-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; flex-direction: column; }
  .select-control { width: 100%; }
}
</style>
