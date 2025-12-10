<template>
  <div class="overview-container">
    
    <div class="control-bar">
      <div class="title-section">
        <h1 class="main-title">Resumen General del Área</h1>
        <p class="sub-title">Visión consolidada de Marketing y Ventas</p>
      </div>

      <div class="filters-wrapper">
        <div class="filter-group">
          <label>Año</label>
          <select v-model="selectedYear" class="form-select">
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Mes</label>
          <select v-model="selectedMonth" class="form-select">
            <option v-for="(month, index) in months" :key="index" :value="index">
              {{ month }}
            </option>
          </select>
        </div>

        <button class="btn-refresh" @click="fetchData">
          🔄 Actualizar
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card revenue-card">
        <div class="card-top">
          <span class="icon-circle">💰</span>
          <span class="diff-badge positive">▲ 12.5% vs mes anterior</span>
        </div>
        <div class="card-main">
          <span class="label">Ingresos Totales</span>
          <h3 class="value">S/ 145,200</h3>
        </div>
        <div class="progress-mini">
          <div class="bar" style="width: 85%"></div>
        </div>
        <span class="sub-text">85% de la meta mensual</span>
      </div>

      <div class="kpi-card">
        <div class="card-top">
          <span class="icon-circle bg-blue">👥</span>
          <span class="diff-badge neutral">─ 0.2% vs mes anterior</span>
        </div>
        <div class="card-main">
          <span class="label">Nuevos Leads</span>
          <h3 class="value">3,450</h3>
        </div>
        <span class="sub-text">Costo por Lead (CPL): S/ 4.20</span>
      </div>

      <div class="kpi-card">
        <div class="card-top">
          <span class="icon-circle bg-purple">⚡</span>
          <span class="diff-badge negative">▼ 1.5% vs mes anterior</span>
        </div>
        <div class="card-main">
          <span class="label">Conversión a Venta</span>
          <h3 class="value">4.8%</h3>
        </div>
        <span class="sub-text">Promedio industria: 3.5%</span>
      </div>

      <div class="kpi-card">
        <div class="card-top">
          <span class="icon-circle bg-orange">🎫</span>
          <span class="diff-badge positive">▲ 5% vs mes anterior</span>
        </div>
        <div class="card-main">
          <span class="label">Ticket Promedio</span>
          <h3 class="value">S/ 850</h3>
        </div>
        <span class="sub-text">Impulsado por Diplomados</span>
      </div>
    </div>

    <div class="charts-section">
      <div class="main-chart-card">
        <div class="card-header">
          <h3>📈 Rendimiento Financiero vs Objetivo</h3>
          <div class="legend-html">
            <span class="dot-legend bg-bar"></span> Ingresos
            <span class="dot-legend bg-line"></span> Meta
          </div>
        </div>
        <div class="chart-container">
          <Bar :data="revenueData" :options="revenueOptions" />
        </div>
      </div>

      <div class="funnel-card">
        <div class="card-header">
          <h3>🔻 Embudo del Mes</h3>
        </div>
        <div class="funnel-list">
          <div class="funnel-step">
            <div class="step-info">
              <span class="step-name">Impresiones / Alcance</span>
              <span class="step-count">150,000</span>
            </div>
            <div class="step-bar-bg"><div class="step-bar fill-1"></div></div>
          </div>
          <div class="funnel-step">
            <div class="step-info">
              <span class="step-name">Leads Captados</span>
              <span class="step-count">3,450</span>
            </div>
            <div class="step-bar-bg"><div class="step-bar fill-2"></div></div>
            <div class="conversion-rate">2.3% conv.</div>
          </div>
          <div class="funnel-step">
            <div class="step-info">
              <span class="step-name">Oportunidades (Interesados)</span>
              <span class="step-count">850</span>
            </div>
            <div class="step-bar-bg"><div class="step-bar fill-3"></div></div>
            <div class="conversion-rate">24% conv.</div>
          </div>
          <div class="funnel-step">
            <div class="step-info">
              <span class="step-name fw-bold text-success">Ventas Cerradas</span>
              <span class="step-count fw-bold text-success">165</span>
            </div>
            <div class="step-bar-bg"><div class="step-bar fill-4"></div></div>
            <div class="conversion-rate">19% conv.</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

// --- ESTADO Y FILTROS ---
const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const selectedMonth = ref(10) // Noviembre (index 10)
const selectedYear = ref('2025')

// Simulación de actualización de datos
const fetchData = () => {
  console.log(`Cargando datos para ${months[selectedMonth.value]} ${selectedYear.value}...`)
  // Aquí llamarías a tu API
}

watch([selectedMonth, selectedYear], () => {
  fetchData()
})

// --- CONFIG GRÁFICO MIXTO (BARRAS + LINEA) ---
const revenueData = {
  labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
  datasets: [
    {
      type: 'bar',
      label: 'Ingresos Reales',
      backgroundColor: '#0ea5e9', // Sky Blue
      data: [32000, 45000, 28000, 40200],
      borderRadius: 6,
      order: 2
    },
    {
      type: 'line',
      label: 'Meta Semanal',
      borderColor: '#334155', // Slate Dark
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 4,
      pointBackgroundColor: '#fff',
      data: [35000, 35000, 35000, 35000],
      tension: 0.1,
      order: 1
    }
  ]
}

const revenueOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }, // Usamos leyenda custom HTML
  scales: {
    y: { 
      beginAtZero: true,
      grid: { borderDash: [2, 2] }
    },
    x: { grid: { display: false } }
  }
}
</script>

<style scoped>
/* Contenedor Principal */
.overview-container { padding: 2rem; background-color: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; color: #334155; }

/* Barra de Control */
.control-bar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.main-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0; }
.sub-title { color: #64748b; margin: 0; font-size: 0.95rem; }

.filters-wrapper { display: flex; gap: 1rem; align-items: flex-end; background: white; padding: 0.75rem 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.filter-group { display: flex; flex-direction: column; gap: 0.25rem; }
.filter-group label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.form-select { padding: 0.4rem 2rem 0.4rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; color: #334155; background-color: #f8fafc; cursor: pointer; outline: none; }
.form-select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1); }

.btn-refresh { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; height: 38px; }
.btn-refresh:hover { background: #2563eb; }

/* Grid de KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.kpi-card { background: white; border-radius: 16px; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; }
.revenue-card { background: linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%); border: 1px solid #bae6fd; }

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.icon-circle { width: 40px; height: 40px; border-radius: 10px; background: #e0f2fe; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
.bg-blue { background: #e0e7ff; color: #4338ca; }
.bg-purple { background: #f3e8ff; color: #7e22ce; }
.bg-orange { background: #ffedd5; color: #c2410c; }

.diff-badge { font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
.positive { background: #dcfce7; color: #166534; }
.negative { background: #fee2e2; color: #991b1b; }
.neutral { background: #f1f5f9; color: #64748b; }

.card-main { margin-bottom: 0.5rem; }
.label { font-size: 0.85rem; color: #64748b; font-weight: 600; }
.value { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0.25rem 0; }
.sub-text { font-size: 0.8rem; color: #94a3b8; }

.progress-mini { height: 4px; background: #e2e8f0; border-radius: 2px; margin-bottom: 0.5rem; overflow: hidden; }
.progress-mini .bar { height: 100%; background: #0ea5e9; border-radius: 2px; }

/* Sección Gráficos */
.charts-section { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }

.main-chart-card, .funnel-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.card-header h3 { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 700; }
.chart-container { height: 300px; }

.legend-html { display: flex; gap: 1rem; font-size: 0.85rem; color: #64748b; }
.dot-legend { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.bg-bar { background: #0ea5e9; }
.bg-line { background: #334155; }

/* Estilos del Funnel */
.funnel-list { display: flex; flex-direction: column; gap: 1.5rem; }
.funnel-step { position: relative; }
.step-info { display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem; color: #334155; }
.step-bar-bg { height: 8px; background: #f1f5f9; border-radius: 4px; width: 100%; overflow: hidden; }
.step-bar { height: 100%; border-radius: 4px; }
.fill-1 { width: 100%; background: #cbd5e1; }
.fill-2 { width: 60%; background: #93c5fd; }
.fill-3 { width: 40%; background: #60a5fa; }
.fill-4 { width: 25%; background: #2563eb; }

.conversion-rate { position: absolute; right: 0; top: 1.5rem; font-size: 0.7rem; color: #64748b; font-weight: 600; background: #f8fafc; padding: 0 4px; }

.text-success { color: #166534; }
.fw-bold { font-weight: 700; }

@media (max-width: 1024px) {
  .charts-section { grid-template-columns: 1fr; }
  .control-bar { flex-direction: column; align-items: flex-start; }
}
</style>