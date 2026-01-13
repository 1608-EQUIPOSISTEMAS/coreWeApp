<template>
  <div class="analytics-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Dashboard Comercial & Conversión</h2>
        <p class="subtitle">Vista general de ingresos filtrada por segmentación avanzada</p>
      </div>
      <div class="header-actions">
        <button class="btn-reset">Limpiar</button>
        <button class="btn-primary">Actualizar Datos</button>
      </div>
    </div>

    <div class="filter-panel">
      <div class="filter-grid">
        <div class="filter-group date-group">
          <label>Rango de Fechas</label>
          <div class="date-inputs">
            <input type="date" v-model="filters.dateStart" class="input-control">
            <span class="separator">-</span>
            <input type="date" v-model="filters.dateEnd" class="input-control">
          </div>
        </div>

        <div class="filter-group">
          <label>Asesor</label>
          <select v-model="filters.advisor" class="input-control">
            <option value="">Todos</option>
            <option value="raul">Raúl P.</option>
            <option value="arleth">Arleth C.</option>
            <option value="eliuth">Eliuth D.</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Programa</label>
          <select v-model="filters.program" class="input-control">
            <option value="">Todos los Programas</option>
            <option value="ia">Dir. Comercial con IA</option>
            <option value="azure">Azure Cloud</option>
            <option value="agile">Herramientas Ágiles</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Nivel de Interés</label>
          <select v-model="filters.interest" class="input-control">
            <option value="">Todos</option>
            <option value="alto">Alto (Prioridad)</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Canal</label>
          <select v-model="filters.channel" class="input-control">
            <option value="">Todos</option>
            <option value="tiktok">TikTok</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="web">Página Web</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Situación</label>
          <select v-model="filters.situation" class="input-control">
            <option value="">Todas</option>
            <option value="egresado">Egresado</option>
            <option value="estudiante">Estudiante</option>
            <option value="empresa">Empresa</option>
          </select>
        </div>

        <div class="filter-group">
          <label>País</label>
          <select v-model="filters.country" class="input-control">
            <option value="">Todos</option>
            <option value="pe">Perú</option>
            <option value="co">Colombia</option>
            <option value="mx">México</option>
            <option value="cl">Chile</option>
          </select>
        </div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="indicator-strip bg-blue"></div>
        <div class="kpi-content">
          <div class="kpi-value">S/ 45,280</div>
          <div class="kpi-label">Ventas Filtradas</div>
        </div>
      </div>
      
      <div class="kpi-card">
        <div class="indicator-strip bg-green"></div>
        <div class="kpi-content">
          <div class="kpi-value">18.5%</div>
          <div class="kpi-label">Tasa Conversión</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="indicator-strip bg-purple"></div>
        <div class="kpi-content">
          <div class="kpi-value">S/ 1,450</div>
          <div class="kpi-label">Ticket Promedio</div>
        </div>
      </div>

      <div class="kpi-card highlight">
        <div class="kpi-content">
          <div class="kpi-value">320</div>
          <div class="kpi-label">Leads "Alto Interés"</div>
        </div>
      </div>
    </div>

    <div class="main-chart-section">
      <div class="section-header">
        <h3>Evolución de Ventas vs Leads</h3>
        <p>Comparativa diaria basada en los filtros aplicados</p>
      </div>
      <div class="chart-container-lg">
        <Bar :data="salesChartData" :options="chartOptions" />
      </div>
    </div>

    <div class="split-row">
      
      <div class="card flex-1">
        <div class="card-header">
          <h4>Ventas por Ubicación</h4>
        </div>
        <div class="table-simple-wrapper">
          <table class="simple-table">
            <thead>
              <tr>
                <th>País</th>
                <th class="text-right">Ventas</th>
                <th class="text-right">% Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="flag-dot bg-red"></span>Perú</td>
                <td class="text-right font-bold">S/ 25k</td>
                <td class="text-right">55%</td>
              </tr>
              <tr>
                <td><span class="flag-dot bg-yellow"></span>Colombia</td>
                <td class="text-right font-bold">S/ 10k</td>
                <td class="text-right">22%</td>
              </tr>
              <tr>
                <td><span class="flag-dot bg-green"></span>México</td>
                <td class="text-right font-bold">S/ 5k</td>
                <td class="text-right">11%</td>
              </tr>
              <tr>
                <td><span class="flag-dot bg-blue"></span>Chile</td>
                <td class="text-right font-bold">S/ 5k</td>
                <td class="text-right">11%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card flex-2">
        <div class="card-header">
          <h4>Detalle por Programa</h4>
          <span class="info-badge">Filtrado por: {{ currentFilterLabel }}</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Programa</th>
                <th class="text-right">Leads</th>
                <th class="text-right">Inscritos</th>
                <th class="text-right">Conv. %</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(prog, index) in programData" :key="index">
                <td class="prog-name">{{ prog.name }}</td>
                <td class="text-right">{{ prog.leads }}</td>
                <td class="text-right font-bold">{{ prog.sales }}</td>
                <td class="text-right">{{ prog.conversion }}%</td>
                <td><span class="status-pill" :class="prog.statusClass">{{ prog.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

// --- ESTADO REACTIVO DE FILTROS ---
const filters = ref({
  dateStart: '2026-01-01',
  dateEnd: '2026-01-31',
  advisor: '',
  program: '',
  interest: '',
  channel: '',
  situation: '',
  country: ''
})

// Computada simple para mostrar qué filtro está activo en la UI
const currentFilterLabel = computed(() => {
  if (filters.value.advisor) return 'Asesor específico'
  if (filters.value.program) return 'Programa específico'
  return 'Global'
})

// --- DATOS MOCKUP ---
const salesChartData = {
  labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
  datasets: [
    {
      label: 'Leads Totales',
      data: [150, 230, 180, 210],
      backgroundColor: '#cbd5e1',
      order: 2
    },
    {
      label: 'Ventas (Pagó)',
      data: [25, 45, 30, 38],
      backgroundColor: '#0f172a',
      order: 1
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: { x: { grid: { display: false } }, y: { grid: { borderDash: [5, 5] } } }
}

const programData = [
  { name: 'Dirección Comercial con IA', leads: 340, sales: 58, conversion: 17.0, status: 'Activo', statusClass: 'active' },
  { name: 'Azure Cloud Expert', leads: 180, sales: 42, conversion: 23.3, status: 'Lleno', statusClass: 'full' },
  { name: 'Especialización Agile', leads: 210, sales: 35, conversion: 16.6, status: 'Cierre', statusClass: 'closing' },
]
</script>

<style scoped>
/* Layout Principal */
.analytics-dashboard { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 2rem; color: #334155; min-height: 100vh; }

/* Header */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
.title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
.subtitle { color: #64748b; margin: 0.5rem 0 0 0; font-size: 0.9rem; }
.header-actions { display: flex; gap: 1rem; }
.btn-primary { background: #0f172a; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-reset { background: transparent; color: #64748b; border: 1px solid #cbd5e1; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; }

/* PANEL DE FILTROS (NUEVO) */
.filter-panel { background: white; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; align-items: end; }

.filter-group { display: flex; flex-direction: column; gap: 0.4rem; }
.filter-group label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.input-control { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; color: #334155; background: #fff; width: 100%; outline: none; transition: border-color 0.2s; }
.input-control:focus { border-color: #3b82f6; }

/* Date specific styles */
.date-group .date-inputs { display: flex; align-items: center; gap: 0.5rem; }
.separator { color: #94a3b8; }

/* KPI Section */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; display: flex; overflow: hidden; height: 90px; }
.indicator-strip { width: 6px; height: 100%; }
.bg-blue { background: #3b82f6; } .bg-green { background: #10b981; } .bg-purple { background: #8b5cf6; }
.kpi-content { padding: 1.25rem; display: flex; flex-direction: column; justify-content: center; }
.kpi-value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
.kpi-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
.kpi-card.highlight { background: #1e1b4b; border: none; }
.kpi-card.highlight .kpi-value { color: #fff; }
.kpi-card.highlight .kpi-label { color: #a5b4fc; }

/* Main Chart */
.main-chart-section { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
.chart-container-lg { height: 300px; width: 100%; }

/* Split Row */
.split-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; }
.flex-1 { flex: 1; min-width: 300px; }
.flex-2 { flex: 2; min-width: 450px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.card-header h4 { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }

/* Tables */
.simple-table, .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.simple-table td, .data-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
.data-table th { text-align: left; color: #94a3b8; font-weight: 600; padding-bottom: 10px; font-size: 0.7rem; text-transform: uppercase; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; }

/* Flags mock */
.flag-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
.bg-red { background: #ef4444; } .bg-yellow { background: #fbbf24; }

/* Status Pills */
.status-pill { padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; }
.active { background: #dcfce7; color: #15803d; }
.full { background: #fee2e2; color: #991b1b; }
.closing { background: #ffedd5; color: #9a3412; }

@media (max-width: 768px) {
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .split-row { flex-direction: column; }
}
</style>