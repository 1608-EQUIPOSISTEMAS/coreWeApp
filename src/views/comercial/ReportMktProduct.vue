<template>
  <div class="marketing-dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Comportamiento del Cliente (Marketing)</h2>
        <p class="subtitle">Análisis de intención, segmentación demográfica y esfuerzo de cierre</p>
      </div>
      <div class="filter-group">
        <button class="filter-chip active">Todo</button>
        <button class="filter-chip">Egresados</button>
        <button class="filter-chip">Estudiantes</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="indicator-strip bg-indigo"></div>
        <div class="kpi-content">
          <div class="kpi-value">"Quiero"</div>
          <div class="kpi-label">Palabra con Mayor Conversión</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="indicator-strip bg-orange"></div>
        <div class="kpi-content">
          <div class="kpi-value">3.2</div>
          <div class="kpi-label">Intentos Promedio para Cierre</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="indicator-strip bg-teal"></div>
        <div class="kpi-content">
          <div class="kpi-value">62%</div>
          <div class="kpi-label">Son Egresados/Profesionales</div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="card-header">
        <div>
          <h3>Matriz de Intención (Keywords)</h3>
          <p>Correlación entre la palabra clave usada en el chat y la velocidad de cierre</p>
        </div>
        <span class="badge-outline">Top 5 Detectados</span>
      </div>
      
      <div class="table-responsive">
        <table class="keyword-table">
          <thead>
            <tr>
              <th>Palabra Detectada</th>
              <th>Volumen Leads</th>
              <th>Tasa Cierre</th>
              <th>Velocidad (Días)</th>
              <th>Impacto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(kw, i) in keywordData" :key="i">
              <td class="fw-bold">"{{ kw.word }}"</td>
              <td>{{ kw.volume }}</td>
              <td>
                <div class="progress-bar-container">
                  <div class="progress-bar" :style="{ width: kw.conversion + '%', background: getIntensityColor(kw.conversion) }"></div>
                  <span class="progress-text">{{ kw.conversion }}%</span>
                </div>
              </td>
              <td class="text-mono">{{ kw.speed }} días</td>
              <td>
                <span class="status-pill" :class="kw.impactClass">{{ kw.impactLabel }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="split-row">
      
      <div class="card flex-1">
        <div class="card-header">
          <h4>Situación del Prospecto</h4>
        </div>
        <div class="chart-box">
          <Doughnut :data="situationData" :options="doughnutOptions" />
        </div>
        <div class="legend-grid">
          <div class="l-item"><span class="dot c-1"></span>Egresado (45%)</div>
          <div class="l-item"><span class="dot c-2"></span>Estudiante (30%)</div>
          <div class="l-item"><span class="dot c-3"></span>Empresa (15%)</div>
          <div class="l-item"><span class="dot c-4"></span>Independiente (10%)</div>
        </div>
      </div>

      <div class="card flex-2">
        <div class="card-header">
          <h4>Probabilidad de Venta por N° de Intentos</h4>
          <p class="small-text">¿Cuándo insistir deja de ser rentable?</p>
        </div>
        <div class="chart-box-lg">
          <Bar :data="attemptsData" :options="attemptsOptions" />
        </div>
        <div class="insight-box">
          <strong>INSIGHT:</strong> La probabilidad de venta cae drásticamente después del <strong>4to intento</strong>. Se recomienda automatizar el seguimiento a partir del 5to contacto.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// --- 1. DATA: MATRIZ DE KEYWORDS ---
// Simula el análisis de tus columnas "we_key_word" vs "we_lead_status"
const keywordData = [
  { word: 'Quiero', volume: 450, conversion: 28, speed: 2.1, impactClass: 'high', impactLabel: 'Muy Alto' },
  { word: 'Precio', volume: 620, conversion: 12, speed: 5.4, impactClass: 'med', impactLabel: 'Medio' },
  { word: 'Necesito', volume: 180, conversion: 22, speed: 1.8, impactClass: 'high', impactLabel: 'Alto' },
  { word: 'Información', volume: 890, conversion: 8, speed: 8.5, impactClass: 'low', impactLabel: 'Bajo' },
  { word: 'Costo', volume: 310, conversion: 10, speed: 6.2, impactClass: 'low', impactLabel: 'Bajo' },
]

const getIntensityColor = (val) => {
  if (val > 20) return '#4f46e5' // Indigo
  if (val > 10) return '#818cf8' // Light Indigo
  return '#cbd5e1' // Grey
}

// --- 2. DATA: SEGMENTACIÓN (SITUACIÓN) ---
// Basado en "we_prospect_situation"
const situationData = {
  labels: ['Egresado', 'Estudiante', 'Empresa', 'Independiente'],
  datasets: [{
    data: [45, 30, 15, 10],
    backgroundColor: ['#0f172a', '#3b82f6', '#06b6d4', '#94a3b8'],
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

// --- 3. DATA: EMBUDO DE INTENTOS ---
// Muestra % de éxito según en qué intento se cerró la venta
const attemptsData = {
  labels: ['1er Intento', '2do Intento', '3er Intento', '4to Intento', '5to+', 'Auto'],
  datasets: [
    {
      label: 'Probabilidad de Cierre',
      data: [15, 35, 42, 20, 5, 2], // El pico está en el 3er intento
      backgroundColor: (ctx) => {
        // Resaltar el pico (3er intento)
        const index = ctx.dataIndex;
        return index === 2 ? '#f59e0b' : '#e2e8f0'; // Amber for peak, grey for others
      },
      borderRadius: 4
    }
  ]
}

const attemptsOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { borderDash: [5, 5] }, title: { display: true, text: '% Cierres' } },
    x: { grid: { display: false } }
  }
}
</script>

<style scoped>
/* Estilos Base */
.marketing-dashboard { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 2rem; color: #334155; min-height: 100vh; }

/* Header */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
.title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
.subtitle { color: #64748b; font-size: 0.9rem; margin-top: 0.5rem; }
.filter-group { display: flex; gap: 0.5rem; }
.filter-chip { border: 1px solid #e2e8f0; background: white; padding: 6px 16px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; color: #64748b; font-weight: 600; transition: all 0.2s; }
.filter-chip.active { background: #0f172a; color: white; border-color: #0f172a; }

/* KPI Cards */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; height: 90px; overflow: hidden; }
.indicator-strip { width: 6px; height: 100%; }
.bg-indigo { background: #4f46e5; }
.bg-orange { background: #f97316; }
.bg-teal { background: #06b6d4; }
.kpi-content { padding: 1.25rem; display: flex; flex-direction: column; justify-content: center; }
.kpi-value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
.kpi-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 4px; }

/* Secciones Comunes */
.section-card, .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.5rem; margin-bottom: 2rem; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.card-header h3, .card-header h4 { margin: 0; color: #1e293b; font-size: 1.1rem; font-weight: 700; }
.card-header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 0.85rem; }
.badge-outline { border: 1px solid #cbd5e1; color: #64748b; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }

/* Tabla de Keywords */
.table-responsive { overflow-x: auto; }
.keyword-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.keyword-table th { text-align: left; padding: 10px; color: #64748b; font-weight: 600; border-bottom: 2px solid #f1f5f9; font-size: 0.75rem; text-transform: uppercase; }
.keyword-table td { padding: 12px 10px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.fw-bold { font-weight: 700; color: #1e293b; }
.text-mono { font-family: monospace; color: #64748b; }

/* Barra de progreso en tabla */
.progress-bar-container { display: flex; align-items: center; gap: 8px; }
.progress-bar { height: 6px; border-radius: 3px; }
.progress-text { font-size: 0.75rem; font-weight: 700; color: #334155; width: 30px; }

/* Status Pills */
.status-pill { padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
.status-pill.high { background: #dcfce7; color: #15803d; }
.status-pill.med { background: #fef9c3; color: #a16207; }
.status-pill.low { background: #f1f5f9; color: #64748b; }

/* Split Row */
.split-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.flex-1 { flex: 1; min-width: 300px; }
.flex-2 { flex: 2; min-width: 450px; }

/* Gráficos y Leyendas */
.chart-box { height: 200px; position: relative; }
.chart-box-lg { height: 250px; width: 100%; }
.legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1.5rem; }
.l-item { font-size: 0.8rem; color: #475569; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.c-1 { background: #0f172a; } .c-2 { background: #3b82f6; } .c-3 { background: #06b6d4; } .c-4 { background: #94a3b8; }

.insight-box { margin-top: 1rem; background: #fffbeb; border: 1px solid #fcd34d; padding: 1rem; border-radius: 6px; color: #92400e; font-size: 0.85rem; }

@media (max-width: 768px) {
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .split-row { flex-direction: column; }
  .flex-2, .flex-1 { min-width: 100%; }
}
</style>