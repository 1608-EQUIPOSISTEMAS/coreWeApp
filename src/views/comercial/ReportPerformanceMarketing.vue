<template>
  <div class="master-dashboard">
    <div class="top-bar">
      <div class="title-block">
        <h1>Master Comercial & Revenue</h1>
        <p>Vista Unificada de Rendimiento y Proyección de Cierre</p>
      </div>
      <div class="actions-block">
        <span class="last-update">Actualizado: hace 5 min</span>
        <button class="btn-primary">EXPORTAR REPORTE</button>
      </div>
    </div>

    <div class="filter-deck">
      <div class="filter-header">
        <i class="icon-filter"></i> SEGMENTACIÓN AVANZADA DE DATA
        <button class="btn-clear" @click="resetFilters">Limpiar Filtros</button>
      </div>
      <div class="filter-grid">
        <div class="f-group">
          <label>Periodo</label>
          <div class="date-range">
            <input type="date" v-model="filters.dateStart">
            <span>to</span>
            <input type="date" v-model="filters.dateEnd">
          </div>
        </div>
        <div class="f-group">
          <label>Asesor</label>
          <select v-model="filters.advisor">
            <option value="">Global (Todos)</option>
            <option value="eliuth">Eliuth D.</option>
            <option value="raul">Raúl P.</option>
            <option value="arleth">Arleth C.</option>
          </select>
        </div>
        <div class="f-group">
          <label>Programa / Producto</label>
          <select v-model="filters.program">
            <option value="">Todos los Programas</option>
            <option value="ia">Dir. Comercial IA</option>
            <option value="azure">Azure Cloud</option>
          </select>
        </div>
        <div class="f-group">
          <label>Nivel Interés</label>
          <select v-model="filters.interest">
            <option value="">Todos</option>
            <option value="alto">🔥 Alto (Hot)</option>
            <option value="medio">❄️ Medio/Bajo</option>
          </select>
        </div>

        <div class="f-group">
          <label>Canal Origen</label>
          <select v-model="filters.channel">
            <option value="">Todos</option>
            <option value="tiktok">TikTok Ads</option>
            <option value="wsp">WhatsApp</option>
            <option value="web">Web Orgánico</option>
          </select>
        </div>
        <div class="f-group">
          <label>Perfil (Situación)</label>
          <select v-model="filters.situation">
            <option value="">Todas</option>
            <option value="empresa">Corporativo</option>
            <option value="indep">Independiente</option>
            <option value="estud">Estudiante</option>
          </select>
        </div>
        <div class="f-group">
          <label>País / Región</label>
          <select v-model="filters.country">
            <option value="">LATAM (Global)</option>
            <option value="pe">Perú</option>
            <option value="mx">México</option>
            <option value="co">Colombia</option>
          </select>
        </div>
        <div class="f-group action">
          <button class="btn-apply">APLICAR FILTROS</button>
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-tile">
        <div class="kpi-head">REVENUE TOTAL (CERRADO)</div>
        <div class="kpi-num">S/ 45,280</div>
        <div class="kpi-trend positive">▲ 12% vs Objetivo</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-head">PIPELINE ACTIVO (PROX. INICIO)</div>
        <div class="kpi-num text-blue">S/ 18,500</div>
        <div class="kpi-trend neutral">En negociación</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-head">TICKET PROMEDIO</div>
        <div class="kpi-num">S/ 1,450</div>
        <div class="kpi-trend negative">▼ S/ 50 vs Mes Ant.</div>
      </div>
      <div class="kpi-tile dark">
        <div class="kpi-head text-gray">CONVERSIÓN GLOBAL</div>
        <div class="kpi-num text-white">18.5%</div>
        <div class="kpi-trend text-green">Optimo (>15%)</div>
      </div>
    </div>

    <div class="grid-2-1">

      <div class="panel">
        <div class="panel-header">
          <h3>VELOCIDAD DE VENTAS (PACING)</h3>
          <p>Acumulado Real vs. Meta Ideal Mensual</p>
        </div>
        <div class="chart-box-lg">
          <Line :data="pacingData" :options="pacingOptions" />
        </div>
        <div class="insight-row">
          <span class="badge badge-green">PROYECCIÓN:</span>
          <p>Al ritmo actual, se superará la meta el día 26 del mes.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3>CUADRANTE DE CALIDAD</h3>
          <p>Volumen (Eje X) vs. Conversión (Eje Y) por Canal</p>
        </div>
        <div class="chart-box-lg">
          <Scatter :data="scatterData" :options="scatterOptions" />
        </div>
        <div class="legend-box">
          <small>• <strong>Arriba-Der:</strong> Canales Estrella</small>
          <small>• <strong>Abajo-Der:</strong> Mucho Lead, Poca Venta</small>
        </div>
      </div>
    </div>

    <div class="grid-1-1">

      <div class="panel">
        <div class="panel-header flex-header">
          <div>
            <h3>RENTABILIDAD POR PERFIL</h3>
            <p>Análisis de Ticket según Situación del Prospecto</p>
          </div>
          <div class="mini-kpi">Top: Empresas</div>
        </div>
        <table class="dense-table">
          <thead>
            <tr>
              <th>Situación</th>
              <th class="text-center">Leads</th>
              <th class="text-right">Ventas</th>
              <th class="text-right">Ticket Prom.</th>
              <th class="text-right">Total Rev.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="fw-bold">Empresa / Corp</td>
              <td class="text-center">120</td>
              <td class="text-right">45</td>
              <td class="text-right text-blue">S/ 2,100</td>
              <td class="text-right fw-bold">S/ 94,500</td>
            </tr>
            <tr>
              <td>Independiente</td>
              <td class="text-center">450</td>
              <td class="text-right">80</td>
              <td class="text-right">S/ 1,200</td>
              <td class="text-right fw-bold">S/ 96,000</td>
            </tr>
            <tr>
              <td>Egresado</td>
              <td class="text-center">300</td>
              <td class="text-right">40</td>
              <td class="text-right">S/ 950</td>
              <td class="text-right fw-bold">S/ 38,000</td>
            </tr>
            <tr>
              <td>Estudiante</td>
              <td class="text-center">600</td>
              <td class="text-right">20</td>
              <td class="text-right text-red">S/ 650</td>
              <td class="text-right fw-bold">S/ 13,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3>EMBUDO DE CONVERSIÓN EFECTIVA</h3>
          <p>Caída de leads por etapa comercial</p>
        </div>
        <div class="chart-box-md">
          <Bar :data="funnelData" :options="funnelOptions" />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar, Scatter } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

// --- FILTROS ---
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

const resetFilters = () => {
  // Reset logic
}

// --- CHART 1: PACING (VELOCIDAD) ---
// Muestra la realidad vs la meta acumulada
const pacingData = {
  labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
  datasets: [
    {
      label: 'Meta Ideal (Lineal)',
      data: [10000, 20000, 30000, 40000],
      borderColor: '#94a3b8',
      borderDash: [5, 5],
      borderWidth: 2,
      pointRadius: 0,
      fill: false
    },
    {
      label: 'Ventas Reales (Acum)',
      data: [8500, 22000, 35000, 45280], // Superó la meta en sem 3
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.3,
      borderWidth: 3
    }
  ]
}

const pacingOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: {
    y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v) => 'S/ ' + v/1000 + 'k' } },
    x: { grid: { display: false } }
  }
}

// --- CHART 2: SCATTER (CALIDAD) ---
// X: Leads (Volumen), Y: Conversión (%)
const scatterData = {
  datasets: [
    {
      label: 'Canales',
      data: [
        { x: 1200, y: 5, label: 'TikTok (Volumen)' }, // Mucho ruido, baja venta
        { x: 300, y: 25, label: 'LinkedIn' }, // Poco ruido, alta venta
        { x: 800, y: 12, label: 'Facebook' },
        { x: 400, y: 35, label: 'Referidos (Estrella)' }
      ],
      backgroundColor: (ctx) => {
        const val = ctx.raw?.y || 0
        if(val > 20) return '#10b981' // Verde
        if(val < 10) return '#ef4444' // Rojo
        return '#3b82f6' // Azul
      },
      pointRadius: 8,
      pointHoverRadius: 10
    }
  ]
}

const scatterOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.raw.label}: ${ctx.raw.x} Leads / ${ctx.raw.y}% Conv.`
      }
    }
  },
  scales: {
    x: { title: { display: true, text: 'Volumen de Leads' }, grid: { display: false } },
    y: { title: { display: true, text: 'Tasa Conversión %' } }
  }
}

// --- CHART 3: FUNNEL ---
const funnelData = {
  labels: ['Leads Totales', 'Contactados', 'Interés Alto', 'Propuesta Enviada', 'Cierre (Pagó)'],
  datasets: [{
    label: 'Conversión',
    data: [2500, 1800, 800, 450, 320],
    backgroundColor: ['#cbd5e1', '#94a3b8', '#64748b', '#334155', '#0f172a'],
    borderRadius: 4,
    barPercentage: 0.6
  }]
}

const funnelOptions = {
  indexAxis: 'y', // Horizontal
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
}

</script>

<style scoped>
/* ESTÉTICA MASTER / CORPORATE */
.master-dashboard {
  font-family: 'Inter', sans-serif;
  background-color: #f1f5f9;
  color: #1e293b;
  padding: 1.5rem;
  max-width: 1800px; /* Wide screen ready */
  margin: 0 auto;
}

/* TOP BAR */
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.title-block h1 { font-size: 1.4rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.03em; text-transform: uppercase; }
.title-block p { margin: 0.2rem 0 0; font-size: 0.85rem; color: #64748b; }
.actions-block { display: flex; align-items: center; gap: 1rem; }
.last-update { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
.btn-primary { background: #0f172a; color: white; border: none; padding: 0.6rem 1.2rem; font-weight: 700; font-size: 0.75rem; cursor: pointer; border-radius: 4px; }

/* FILTER DECK (Command Center) */
.filter-deck {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1rem;
  margin-bottom: 2rem;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.filter-header { display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.btn-clear { background: none; border: none; color: #ef4444; font-weight: 600; cursor: pointer; font-size: 0.75rem; text-decoration: underline; }

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); /* Responsive Grid */
  gap: 1rem;
  align-items: end;
}
.f-group { display: flex; flex-direction: column; gap: 0.3rem; }
.f-group label { font-size: 0.7rem; font-weight: 700; color: #475569; }
.f-group select, .f-group input {
  padding: 0.4rem;
  border: 1px solid #cbd5e1;
  font-size: 0.8rem;
  color: #1e293b;
  background: #f8fafc;
  border-radius: 4px;
  width: 100%;
}
.date-range { display: flex; gap: 0.3rem; align-items: center; }
.date-range input { width: 45%; }
.f-group.action { display: flex; justify-content: flex-end; }
.btn-apply { width: 100%; background: #3b82f6; color: white; border: none; padding: 0.45rem; font-weight: 700; font-size: 0.75rem; border-radius: 4px; cursor: pointer; }

/* KPI GRID */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-tile { background: white; border: 1px solid #cbd5e1; padding: 1.2rem; display: flex; flex-direction: column; justify-content: space-between; height: 100px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
.kpi-tile.dark { background: #0f172a; border: none; }
.kpi-head { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.kpi-num { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0.3rem 0; }
.kpi-trend { font-size: 0.75rem; font-weight: 600; }
.positive { color: #16a34a; } .negative { color: #ef4444; } .neutral { color: #64748b; }
.text-blue { color: #2563eb; } .text-white { color: white; } .text-green { color: #4ade80; } .text-gray { color: #94a3b8; }

/* LAYOUT GRIDS */
.grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
.grid-1-1 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

/* PANELS */
.panel { background: white; border: 1px solid #e2e8f0; padding: 1.5rem; }
.panel-header { margin-bottom: 1.2rem; }
.panel-header h3 { margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; text-transform: uppercase; }
.panel-header p { margin: 0.2rem 0 0; font-size: 0.8rem; color: #64748b; }
.flex-header { display: flex; justify-content: space-between; align-items: start; }
.mini-kpi { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0; }

.chart-box-lg { height: 320px; width: 100%; }
.chart-box-md { height: 250px; width: 100%; }
.insight-row { margin-top: 1rem; font-size: 0.85rem; display: flex; gap: 0.5rem; align-items: center; background: #f0fdf4; padding: 0.5rem; border: 1px solid #bbf7d0; }
.badge-green { background: #16a34a; color: white; padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 0.7rem; }
.legend-box { margin-top: 1rem; font-size: 0.8rem; color: #64748b; display: flex; gap: 1rem; }

/* DENSE TABLE */
.dense-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.dense-table th { text-align: left; padding: 0.5rem; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 700; }
.dense-table td { padding: 0.6rem 0.5rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
.text-center { text-align: center; } .text-right { text-align: right; }
.fw-bold { font-weight: 700; color: #0f172a; }
.text-blue { color: #2563eb; } .text-red { color: #dc2626; }

@media (max-width: 1024px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .grid-2-1, .grid-1-1 { grid-template-columns: 1fr; }
}
</style>
