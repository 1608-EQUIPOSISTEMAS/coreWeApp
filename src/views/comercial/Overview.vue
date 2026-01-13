<template>
  <div class="audit-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Auditoría de Cierres y Origen</h2>
        <p class="subtitle">Análisis de ventas inmediatas vs. ventas recuperadas por gestión</p>
      </div>
      <div class="status-badge">
        <span class="dot live"></span> Data Actualizada
      </div>
    </div>

    <div class="filters-container">
      <div class="filter-row">
        <div class="f-group">
          <label>Asesor</label>
          <select v-model="filters.advisor" class="f-input">
            <option value="">Todos</option>
            <option value="Raul P.">Raúl P.</option>
            <option value="Arleth C.">Arleth C.</option>
          </select>
        </div>
        <div class="f-group">
          <label>Programa</label>
          <select v-model="filters.program" class="f-input">
            <option value="">Todos</option>
            <option value="IA">Dir. Comercial con IA</option>
            <option value="Azure">Azure</option>
          </select>
        </div>
        <div class="f-group">
          <label>Canal Origen</label>
          <select v-model="filters.channel" class="f-input">
            <option value="">Todos</option>
            <option value="TikTok">TikTok</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Web">Web</option>
          </select>
        </div>
        <div class="f-group wide">
          <label>Rango de Fecha (Registro)</label>
          <div class="date-flex">
            <input type="date" v-model="filters.start" class="f-input">
            <span>al</span>
            <input type="date" v-model="filters.end" class="f-input">
          </div>
        </div>
        <div class="f-group btn-container">
          <button class="btn-apply">Filtrar</button>
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-title">Ventas Totales (Periodo)</div>
        <div class="kpi-number">85</div>
        <div class="kpi-sub">S/ 124,500 facturados</div>
      </div>
      
      <div class="kpi-box highlight-blue">
        <div class="kpi-title">Cierres Inmediatos ("One-Shot")</div>
        <div class="kpi-number">60%</div>
        <div class="kpi-sub">Registrados directamente como "Pagó"</div>
        <div class="icon-indicator">⚡</div>
      </div>

      <div class="kpi-box highlight-orange">
        <div class="kpi-title">Ventas por Seguimiento</div>
        <div class="kpi-number">40%</div>
        <div class="kpi-sub">Requirieron intentos posteriores</div>
        <div class="icon-indicator">📞</div>
      </div>
    </div>

    <div class="chart-section">
      <div class="section-header">
        <h3>Perfil de Cierre por Asesor</h3>
        <p>¿Quién cierra en la primera interacción y quién recupera leads?</p>
      </div>
      <div class="chart-wrapper">
        <Bar :data="advisorProfileData" :options="stackedOptions" />
      </div>
      <div class="insight-text">
        <strong>Análisis:</strong> <em>Raúl P.</em> tiene un alto volumen de <strong>Cierre Inmediato</strong> (probablemente atiende leads muy calientes de TikTok), mientras que <em>Arleth C.</em> logra rescatar más ventas a través de <strong>Seguimiento</strong>.
      </div>
    </div>

    <div class="table-section">
      <div class="section-header">
        <h3>Detalle de Operaciones</h3>
      </div>
      <div class="table-overflow">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Fecha Reg.</th>
              <th>Asesor</th>
              <th>Cliente / Lead</th>
              <th>Canal</th>
              <th>Programa</th>
              <th class="text-center">Modalidad Cierre</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in reportData" :key="i">
              <td class="text-sm">{{ row.date }}</td>
              <td>
                <div class="advisor-chip">{{ row.advisor }}</div>
              </td>
              <td>
                <div class="font-bold">{{ row.client }}</div>
                <div class="text-xs text-gray">{{ row.status }}</div>
              </td>
              <td>{{ row.channel }}</td>
              <td class="text-sm">{{ row.program }}</td>
              <td class="text-center">
                <span v-if="row.isImmediate" class="badge-flash">⚡ Inmediata</span>
                <span v-else class="badge-work">📞 Gestionada ({{ row.attempts }} int.)</span>
              </td>
              <td class="text-right font-mono">{{ row.amount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// --- ESTADO DE FILTROS ---
const filters = ref({
  advisor: '',
  program: '',
  channel: '',
  start: '2026-01-01',
  end: '2026-01-31'
})

// --- DATOS MOCKUP ---

// Gráfico Apilado (Stacked) para ver tipos de cierre
const advisorProfileData = {
  labels: ['Raul P.', 'Arleth C.', 'Eliuth D.'],
  datasets: [
    {
      label: 'Cierre Inmediato (⚡)',
      data: [45, 15, 10], // Raúl cierra mucho rápido
      backgroundColor: '#3b82f6',
      stack: 'Stack 0',
    },
    {
      label: 'Cierre tras Seguimiento (📞)',
      data: [5, 25, 8], // Arleth trabaja más los leads
      backgroundColor: '#f97316',
      stack: 'Stack 0',
    }
  ]
}

const stackedOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
    tooltip: {
      callbacks: {
        footer: (items) => {
          // Ejemplo de tooltip personalizado
          const val = items[0].raw;
          return val > 20 ? 'Alta eficiencia' : ''; 
        }
      }
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, stacked: true }
  }
}

// Datos de la Tabla
const reportData = [
  { 
    date: '12/01/26 16:15', advisor: 'Raul P.', client: 'Juan Perez', status: 'Pagó', 
    channel: 'TikTok', program: 'Dir. Comercial IA', 
    isImmediate: true, attempts: 0, amount: 'S/ 1,800' 
  },
  { 
    date: '12/01/26 14:20', advisor: 'Arleth C.', client: 'Maria Gomez', status: 'Pagó', 
    channel: 'WhatsApp', program: 'Azure Cloud', 
    isImmediate: false, attempts: 3, amount: 'S/ 1,200' 
  },
  { 
    date: '11/01/26 10:00', advisor: 'Raul P.', client: 'Carlos Ruiz', status: 'Pagó', 
    channel: 'Web', program: 'Agile', 
    isImmediate: true, attempts: 0, amount: 'S/ 900' 
  },
  { 
    date: '11/01/26 09:30', advisor: 'Eliuth D.', client: 'Empresa ABC', status: 'Pagó', 
    channel: 'Referido', program: 'Dir. Comercial IA', 
    isImmediate: false, attempts: 5, amount: 'S/ 5,400' 
  },
]
</script>

<style scoped>
/* Estilos Generales */
.audit-dashboard { font-family: 'Inter', sans-serif; background-color: #f1f5f9; padding: 1.5rem; min-height: 100vh; color: #1e293b; }

/* Header */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.title { margin: 0; font-size: 1.5rem; font-weight: 800; }
.subtitle { margin: 0.25rem 0 0; color: #64748b; font-size: 0.9rem; }
.status-badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; background: #166534; border-radius: 50%; display: block; }
.dot.live { animation: pulse 2s infinite; }

/* 1. FILTROS */
.filters-container { background: white; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.filter-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
.f-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 140px; }
.f-group.wide { min-width: 250px; flex: 1.5; }
.f-group.btn-container { flex: 0 0 auto; min-width: auto; }

.f-group label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.f-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; width: 100%; font-size: 0.9rem; color: #334155; }
.date-flex { display: flex; align-items: center; gap: 8px; }
.date-flex span { color: #94a3b8; font-size: 0.8rem; }
.btn-apply { background: #0f172a; color: white; border: none; padding: 9px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; height: 38px; }
.btn-apply:hover { background: #1e293b; }

/* 2. KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-box { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; }
.kpi-title { font-size: 0.85rem; color: #64748b; font-weight: 600; margin-bottom: 0.5rem; }
.kpi-number { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; margin-bottom: 0.25rem; }
.kpi-sub { font-size: 0.8rem; color: #94a3b8; }
.icon-indicator { position: absolute; top: 1.5rem; right: 1.5rem; font-size: 1.5rem; opacity: 0.5; }

/* Estilos específicos de KPI */
.highlight-blue { border-bottom: 4px solid #3b82f6; }
.highlight-orange { border-bottom: 4px solid #f97316; }

/* 3. CHART */
.chart-section { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
.section-header { margin-bottom: 1.5rem; }
.section-header h3 { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 700; }
.section-header p { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
.chart-wrapper { height: 250px; width: 100%; }
.insight-text { margin-top: 1rem; padding: 1rem; background: #eff6ff; border-radius: 6px; font-size: 0.85rem; color: #1e3a8a; border-left: 4px solid #3b82f6; }

/* 4. TABLE */
.table-section { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; }
.table-overflow { overflow-x: auto; }
.custom-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.custom-table th { text-align: left; padding: 12px 16px; background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
.custom-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

/* Badges de Tabla */
.advisor-chip { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; display: inline-block; }
.badge-flash { background: #dbeafe; color: #1d4ed8; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; border: 1px solid #bfdbfe; }
.badge-work { background: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; border: 1px solid #fed7aa; }

/* Typos */
.text-sm { font-size: 0.8rem; color: #64748b; }
.text-xs { font-size: 0.75rem; }
.text-gray { color: #94a3b8; }
.font-bold { font-weight: 700; }
.font-mono { font-family: monospace; font-weight: 600; color: #334155; }
.text-right { text-align: right; }
.text-center { text-align: center; }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

@media (max-width: 768px) {
  .filter-row { flex-direction: column; }
  .f-group { width: 100%; }
}
</style>