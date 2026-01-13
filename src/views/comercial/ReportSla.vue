<template>
  <div class="quality-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Análisis de Calidad y Pérdida (Churn)</h2>
        <p class="subtitle">Identificación de fugas en el embudo y calidad por fuente de tráfico</p>
      </div>
      <div class="alert-box">
        <span class="alert-icon">!</span>
        <span>Alerta: Tasa de "No Contacto" en TikTok subió 15%</span>
      </div>
    </div>

    <div class="filter-panel">
      <div class="filter-header">
        <span class="filter-title">Segmentación Avanzada</span>
        <button class="btn-clean">Limpiar Filtros</button>
      </div>
      <div class="filter-grid">
        
        <div class="f-item">
          <label>Periodo de Análisis</label>
          <div class="date-range">
            <input type="date" v-model="filters.start" class="control">
            <input type="date" v-model="filters.end" class="control">
          </div>
        </div>

        <div class="f-item">
          <label>Canal de Origen</label>
          <select v-model="filters.channel" class="control">
            <option value="">Todos los Canales</option>
            <option value="TikTok">TikTok Ads</option>
            <option value="Meta">Facebook / IG</option>
            <option value="Google">Google Search</option>
            <option value="Organic">Orgánico / Web</option>
          </select>
        </div>

        <div class="f-item">
          <label>Programa de Interés</label>
          <select v-model="filters.program" class="control">
            <option value="">Todos</option>
            <option value="IA">Dir. Comercial con IA</option>
            <option value="Azure">Azure Cloud</option>
          </select>
        </div>

        <div class="f-item">
          <label>Tipo de Pérdida</label>
          <select v-model="filters.lossType" class="control">
            <option value="">Todos los Perdidos</option>
            <option value="desestimado">Desestimado (No califica)</option>
            <option value="indiferente">Indiferente (Curioso)</option>
            <option value="nocontact">No Contesta</option>
          </select>
        </div>

        <div class="f-item">
          <label>Asesor Responsable</label>
          <select v-model="filters.advisor" class="control">
            <option value="">Todos</option>
            <option value="Raul">Raúl P.</option>
            <option value="Arleth">Arleth C.</option>
          </select>
        </div>

      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="left-border border-red"></div>
        <div class="kpi-body">
          <div class="kpi-number text-red">34%</div>
          <div class="kpi-desc">Tasa de Descarte General</div>
          <small>Leads marcados como "Desestimado"</small>
        </div>
      </div>

      <div class="kpi-card">
        <div class="left-border border-orange"></div>
        <div class="kpi-body">
          <div class="kpi-number text-orange">22%</div>
          <div class="kpi-desc">Tasa de "Curiosos"</div>
          <small>Estado "Indiferente" (Preguntan precio y se van)</small>
        </div>
      </div>

      <div class="kpi-card">
        <div class="left-border border-gray"></div>
        <div class="kpi-body">
          <div class="kpi-number text-gray">S/ 4,500</div>
          <div class="kpi-desc">Inversión en Leads Perdidos</div>
          <small>Est. basado en CPC promedio</small>
        </div>
      </div>
    </div>

    <div class="chart-section">
      <div class="section-top">
        <div>
          <h3>Calidad del Lead por Canal</h3>
          <p>Comparativa: Leads Efectivos vs. Leads "Basura" (Desestimados/Indiferentes)</p>
        </div>
        <div class="legend-h">
          <span class="dot good"></span>Efectivos
          <span class="dot bad"></span>Descarte
        </div>
      </div>
      <div class="chart-box">
        <Bar :data="qualityChartData" :options="stackedOptions" />
      </div>
      <div class="insight-strip">
        <strong>Hallazgo:</strong> <strong>TikTok</strong> trae mucho volumen, pero el <strong>55%</strong> se descarta. <strong>LinkedIn/Web</strong> tiene menos volumen pero solo <strong>15%</strong> de descarte.
      </div>
    </div>

    <div class="split-section">
      
      <div class="panel flex-1">
        <div class="panel-head">
          <h4>Distribución de Estados "No Venta"</h4>
        </div>
        <div class="doughnut-box">
          <Doughnut :data="lossReasonData" :options="doughnutOptions" />
        </div>
        <ul class="reason-list">
          <li><span class="sq c-red"></span> Desestimado (40%)</li>
          <li><span class="sq c-orange"></span> Indiferente (35%)</li>
          <li><span class="sq c-gray"></span> No Contesta (25%)</li>
        </ul>
      </div>

      <div class="panel flex-2">
        <div class="panel-head">
          <h4>Auditoría de Leads Perdidos Recientes</h4>
          <button class="btn-sm">Ver Todos</button>
        </div>
        <div class="table-wrap">
          <table class="audit-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Lead / Contacto</th>
                <th>Canal</th>
                <th>Estado Final</th>
                <th>Observación (CRM)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(lead, i) in lostLeads" :key="i">
                <td class="text-mute">{{ lead.date }}</td>
                <td class="font-w600">{{ lead.name }}</td>
                <td><span class="tag-channel">{{ lead.channel }}</span></td>
                <td>
                  <span class="status-badge" :class="lead.statusClass">{{ lead.status }}</span>
                </td>
                <td class="text-sm truncate" :title="lead.obs">{{ lead.obs }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// --- FILTROS REACTIVOS ---
const filters = ref({
  start: '2026-01-01',
  end: '2026-01-15',
  channel: '',
  program: '',
  lossType: '',
  advisor: ''
})

// --- DATA: CALIDAD POR CANAL (Barra Apilada 100% o Absoluta) ---
const qualityChartData = {
  labels: ['TikTok Ads', 'Facebook Ads', 'Google Search', 'Base Datos', 'Referidos'],
  datasets: [
    {
      label: 'Leads Potenciales (Interesado/Pagó)',
      data: [120, 150, 90, 80, 40],
      backgroundColor: '#10b981', // Green
      stack: 'Stack 0',
      borderRadius: 4
    },
    {
      label: 'Leads Descarte (Desestimado/Indif.)',
      data: [140, 60, 15, 20, 2], // TikTok tiene mucha "basura"
      backgroundColor: '#ef4444', // Red
      stack: 'Stack 0',
      borderRadius: 4
    }
  ]
}

const stackedOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }, // Leyenda custom en HTML
  scales: {
    x: { grid: { display: false } },
    y: { stacked: true, grid: { borderDash: [5, 5] } }
  }
}

// --- DATA: DONA DE RAZONES ---
const lossReasonData = {
  labels: ['Desestimado', 'Indiferente', 'No Contesta'],
  datasets: [{
    data: [40, 35, 25],
    backgroundColor: ['#ef4444', '#f97316', '#94a3b8'],
    borderWidth: 0,
    hoverOffset: 4
  }]
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  cutout: '70%'
}

// --- DATA: TABLA DE AUDITORÍA ---
// Simulando datos de tus columnas 'we_lead_status' y 'Observaciones'
const lostLeads = [
  { 
    date: '12/01', name: 'Carlos M.', channel: 'TikTok', 
    status: 'Desestimado', statusClass: 'st-red', 
    obs: 'Buscaba curso gratis, no tiene presupuesto.' 
  },
  { 
    date: '12/01', name: 'Luisa F.', channel: 'Facebook', 
    status: 'No Contesta', statusClass: 'st-gray', 
    obs: 'Llamada a buzón 5 veces. Número parece errado.' 
  },
  { 
    date: '11/01', name: 'Jorge P.', channel: 'TikTok', 
    status: 'Indiferente', statusClass: 'st-orange', 
    obs: 'Solo preguntó precio y dejó de responder.' 
  },
  { 
    date: '11/01', name: 'Empresa X', channel: 'Google', 
    status: 'Desestimado', statusClass: 'st-red', 
    obs: 'Buscaba servicio de consultoría, no capacitación.' 
  },
]
</script>

<style scoped>
/* General */
.quality-dashboard { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 2rem; color: #334155; min-height: 100vh; }

/* Header */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
.subtitle { color: #64748b; font-size: 0.9rem; margin-top: 0.25rem; }

.alert-box { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; font-weight: 600; }
.alert-icon { background: #b91c1c; color: white; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }

/* 1. FILTER PANEL GRID */
.filter-panel { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.filter-header { display: flex; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
.filter-title { font-weight: 700; color: #1e293b; font-size: 0.9rem; text-transform: uppercase; }
.btn-clean { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 0.8rem; font-weight: 600; }

.filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.f-item { display: flex; flex-direction: column; gap: 4px; }
.f-item label { font-size: 0.75rem; font-weight: 700; color: #64748b; }
.control { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; color: #334155; width: 100%; outline: none; transition: border 0.2s; }
.control:focus { border-color: #3b82f6; }
.date-range { display: flex; gap: 5px; }

/* 2. KPI ROW */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; height: 110px; overflow: hidden; }
.left-border { width: 6px; height: 100%; }
.border-red { background: #ef4444; } .border-orange { background: #f97316; } .border-gray { background: #94a3b8; }
.kpi-body { padding: 1.25rem; display: flex; flex-direction: column; justify-content: center; }
.kpi-number { font-size: 1.8rem; font-weight: 800; line-height: 1.1; margin-bottom: 4px; }
.kpi-desc { font-weight: 700; color: #475569; font-size: 0.85rem; }
.kpi-body small { color: #94a3b8; font-size: 0.75rem; margin-top: 4px; }
.text-red { color: #ef4444; } .text-orange { color: #f97316; } .text-gray { color: #64748b; }

/* 3. MAIN CHART */
.chart-section { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.5rem; margin-bottom: 2rem; }
.section-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.section-top h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
.section-top p { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
.legend-h { display: flex; gap: 12px; font-size: 0.8rem; color: #475569; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.dot.good { background: #10b981; } .dot.bad { background: #ef4444; }

.chart-box { height: 280px; width: 100%; }
.insight-strip { background: #fff1f2; color: #9f1239; padding: 10px 15px; border-radius: 6px; font-size: 0.85rem; margin-top: 1rem; border-left: 4px solid #f43f5e; }

/* 4. SPLIT SECTIONS */
.split-section { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.panel { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; }
.flex-1 { flex: 1; min-width: 300px; }
.flex-2 { flex: 2; min-width: 500px; }

.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.panel-head h4 { margin: 0; font-size: 1rem; color: #0f172a; }
.btn-sm { background: transparent; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }

/* Doughnut & List */
.doughnut-box { height: 180px; display: flex; justify-content: center; margin-bottom: 1rem; }
.reason-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.reason-list li { font-size: 0.8rem; color: #475569; display: flex; align-items: center; gap: 6px; }
.sq { width: 10px; height: 10px; border-radius: 2px; }
.c-red { background: #ef4444; } .c-orange { background: #f97316; } .c-gray { background: #94a3b8; }

/* Audit Table */
.table-wrap { overflow-x: auto; }
.audit-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.audit-table th { text-align: left; padding: 10px; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
.audit-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
.font-w600 { font-weight: 600; }
.text-mute { color: #94a3b8; font-size: 0.8rem; }
.tag-channel { background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.truncate { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Status Badges */
.status-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
.st-red { background: #fee2e2; color: #991b1b; }
.st-orange { background: #ffedd5; color: #9a3412; }
.st-gray { background: #f1f5f9; color: #64748b; }

@media (max-width: 768px) {
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .split-section { flex-direction: column; }
  .flex-2 { min-width: 100%; }
}
</style>