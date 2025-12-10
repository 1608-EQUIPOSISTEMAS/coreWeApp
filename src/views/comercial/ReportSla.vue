<template>
  <div class="repurchase-dashboard">
    
    <div class="header-container">
      <div class="titles">
        <h2 class="main-title">Análisis de Re-Compra y Fidelización</h2>
        <p class="subtitle">Monitoreo de ventas recurrentes (VEN CWE) vs. Ventas totales (VEN T)</p>
      </div>

      <div class="filters">
        <div class="filter-item">
          <label>Año Fiscal</label>
          <select v-model="selectedYear" class="styled-select">
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
        <div class="filter-item">
          <label>Periodo</label>
          <select v-model="selectedMonth" class="styled-select">
            <option value="all">Todo el Año</option>
            <option v-for="(m, i) in months" :key="i" :value="i">{{ m }}</option>
          </select>
        </div>
        <button class="btn-update" @click="updateDashboard">
          <span>⚡</span> Actualizar
        </button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="icon-wrapper teal">
          <span class="icon">🔄</span>
        </div>
        <div class="kpi-data">
          <span class="label">Tasa de Re-Compra Prom.</span>
          <h3 class="value">{{ averageRate }}%</h3>
          <span class="trend positive">▲ 2.1% vs mes anterior</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="icon-wrapper blue">
          <span class="icon">📊</span>
        </div>
        <div class="kpi-data">
          <span class="label">Volumen Total (VEN T)</span>
          <h3 class="value">{{ totalVolume.toLocaleString() }}</h3>
          <span class="trend neutral">Acumulado anual</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="icon-wrapper purple">
          <span class="icon">💎</span>
        </div>
        <div class="kpi-data">
          <span class="label">Ventas Recurrentes (CWE)</span>
          <h3 class="value">{{ totalRecurring.toLocaleString() }}</h3>
          <span class="trend positive">Base sólida</span>
        </div>
      </div>

      <div class="kpi-card highlight">
        <div class="icon-wrapper gold">
          <span class="icon">💰</span>
        </div>
        <div class="kpi-data">
          <span class="label">Ingreso por Fidelización</span>
          <h3 class="value">S/ {{ (totalRecurring * 180).toLocaleString() }}</h3>
          <span class="trend text-white-50">Est. Ticket S/ 180</span>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      
      <div class="chart-container main-chart">
        <div class="chart-header">
          <h3>📈 Evolución: Volumen vs. Retención</h3>
          <div class="legend-custom">
            <span class="dot bar-color"></span> Ventas Totales
            <span class="dot line-color"></span> % Re-Compra
          </div>
        </div>
        <div class="chart-wrapper-lg">
          <Bar :data="mixedChartData" :options="mixedChartOptions" />
        </div>
      </div>

      <div class="chart-container side-chart">
        <div class="chart-header">
          <h3>Participación (Share)</h3>
        </div>
        <div class="doughnut-wrapper">
          <Doughnut :data="doughnutData" :options="doughnutOptions" />
        </div>
        <div class="mini-stats">
          <div class="stat-row">
            <span>Nuevos</span>
            <strong>{{ 100 - averageRate }}%</strong>
          </div>
          <div class="stat-row">
            <span>Recurrentes</span>
            <strong class="text-teal">{{ averageRate }}%</strong>
          </div>
        </div>
      </div>

    </div>

    <div class="table-container">
      <div class="table-header">
        <h3>Desglose Semanal Detallado</h3>
        <button class="btn-csv">Exportar Datos</button>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Semana</th>
              <th>Fechas</th>
              <th class="text-center">VEN T (Total)</th>
              <th class="text-center">VEN CWE (Recurrente)</th>
              <th class="text-center">% Re-Compra</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in filteredData" :key="index" :class="{'highlight-row': row.venT > 500}">
              <td class="font-bold text-gray">{{ row.month }}</td>
              <td class="text-blue font-bold">{{ row.week }}</td>
              <td class="text-xs text-muted">{{ row.range }}</td>
              <td class="text-center">{{ row.venT }}</td>
              <td class="text-center">{{ row.venCWE }}</td>
              <td class="text-center">
                <div class="rate-badge" :style="{ backgroundColor: getRateColor(row.rate) }">
                  {{ row.rate }}%
                </div>
              </td>
              <td class="text-center">
                <span v-if="row.rate >= 25" class="status-pill excellent">Excelente</span>
                <span v-else-if="row.rate >= 15" class="status-pill good">Bueno</span>
                <span v-else class="status-pill warning">Revisar</span>
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
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

// --- ESTADO ---
const selectedYear = ref('2025')
const selectedMonth = ref('all')
const months = ['Enero', 'Febrero', 'Marzo', 'Abril'] // Basado en la imagen

// --- DATOS MOCK (Copiados y extendidos de tu imagen) ---
const rawData = [
  { month: 'ENERO', week: 'SEM 1', range: '30/12 - 05/01', venT: 166, venCWE: 29, rate: 17 },
  { month: 'ENERO', week: 'SEM 2', range: '06/01 - 12/01', venT: 159, venCWE: 18, rate: 11 },
  { month: 'ENERO', week: 'SEM 3', range: '13/01 - 19/01', venT: 143, venCWE: 18, rate: 13 },
  { month: 'ENERO', week: 'SEM 5', range: '20/01 - 26/01', venT: 118, venCWE: 25, rate: 21 },
  { month: 'FEBRERO', week: 'SEM 6', range: '01/02 - 02/02', venT: 17, venCWE: 3, rate: 18 },
  { month: 'FEBRERO', week: 'SEM 7', range: '03/02 - 09/02', venT: 158, venCWE: 29, rate: 18 },
  { month: 'FEBRERO', week: 'SEM 8', range: '10/02 - 16/02', venT: 127, venCWE: 28, rate: 22 },
  { month: 'FEBRERO', week: 'SEM 9', range: '17/02 - 23/02', venT: 85, venCWE: 18, rate: 21 },
  { month: 'MARZO', week: 'SEM 10', range: '24/02 - 28/02', venT: 107, venCWE: 19, rate: 18 }, // Final Feb/Inicio Mar
  { month: 'MARZO', week: 'SEM 11', range: '03/03 - 09/03', venT: 93, venCWE: 16, rate: 17 },
  { month: 'MARZO', week: 'SEM 12', range: '10/03 - 16/03', venT: 112, venCWE: 8, rate: 7 }, // Caída importante
  { month: 'MARZO', week: 'SEM 13', range: '17/03 - 23/03', venT: 96, venCWE: 15, rate: 16 },
  { month: 'ABRIL', week: 'SEM 15', range: '01/04 - 06/04', venT: 107, venCWE: 15, rate: 14 },
  { month: 'ABRIL', week: 'SEM 19', range: '28/04 - 04/06', venT: 579, venCWE: 124, rate: 21 }, // El pico masivo
]

// --- COMPUTED LOGIC ---

// Filtrado de Datos
const filteredData = computed(() => {
  if (selectedMonth.value === 'all') return rawData
  const monthName = months[selectedMonth.value]
  return rawData.filter(d => d.month === monthName.toUpperCase())
})

// KPI Cálculos
const totalVolume = computed(() => filteredData.value.reduce((acc, curr) => acc + curr.venT, 0))
const totalRecurring = computed(() => filteredData.value.reduce((acc, curr) => acc + curr.venCWE, 0))
const averageRate = computed(() => {
  if (filteredData.value.length === 0) return 0
  const sumRates = filteredData.value.reduce((acc, curr) => acc + curr.rate, 0)
  return Math.round(sumRates / filteredData.value.length)
})

// Chart Data (Mixed)
const mixedChartData = computed(() => ({
  labels: filteredData.value.map(d => d.week),
  datasets: [
    {
      type: 'line',
      label: '% Re-Compra',
      data: filteredData.value.map(d => d.rate),
      borderColor: '#14b8a6', // Teal
      backgroundColor: '#14b8a6',
      borderWidth: 3,
      yAxisID: 'y1',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#fff',
      order: 1 // Asegura que la línea esté encima
    },
    {
      type: 'bar',
      label: 'Ventas Totales',
      data: filteredData.value.map(d => d.venT),
      backgroundColor: 'rgba(59, 130, 246, 0.2)', // Azul suave
      borderColor: '#3b82f6',
      borderWidth: 1,
      borderRadius: 4,
      yAxisID: 'y',
      order: 2
    }
  ]
}))

const mixedChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { display: false } }, // Usamos leyenda custom
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      grid: { display: false },
      title: { display: true, text: 'Volumen Ventas' }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      grid: { borderDash: [2, 2] },
      ticks: { callback: (val) => val + '%' },
      title: { display: true, text: 'Tasa %' }
    },
    x: {
      grid: { display: false }
    }
  }
}

// Chart Data (Doughnut)
const doughnutData = computed(() => ({
  labels: ['Recurrente', 'Nuevo'],
  datasets: [{
    data: [totalRecurring.value, totalVolume.value - totalRecurring.value],
    backgroundColor: ['#14b8a6', '#e2e8f0'],
    borderWidth: 0,
    hoverOffset: 4
  }]
}))

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  cutout: '70%'
}

// --- HELPERS ---
const getRateColor = (rate) => {
  // Escala de calor para el %
  if (rate >= 25) return '#22c55e' // Verde fuerte
  if (rate >= 20) return '#86efac' // Verde claro
  if (rate >= 15) return '#fde047' // Amarillo
  return '#fca5a5' // Rojo claro
}

const updateDashboard = () => {
  // Simulación de recarga visual
  console.log("Actualizando dashboard...")
}
</script>

<style scoped>
/* GENERAL LAYOUT */
.repurchase-dashboard { padding: 2rem; background-color: #f1f5f9; min-height: 100vh; font-family: 'Inter', sans-serif; color: #334155; display: flex; flex-direction: column; gap: 2rem; }

/* HEADER */
.header-container { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
.main-title { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0; }
.subtitle { color: #64748b; font-size: 0.95rem; margin-top: 0.25rem; }

.filters { display: flex; gap: 1rem; align-items: flex-end; background: white; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; }
.filter-item { display: flex; flex-direction: column; gap: 0.3rem; }
.filter-item label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.styled-select { border: 1px solid #cbd5e1; padding: 0.5rem; border-radius: 6px; font-weight: 600; color: #334155; outline: none; background: #f8fafc; cursor: pointer; min-width: 120px; }
.btn-update { background: #0f172a; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; height: 38px; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; }
.btn-update:hover { background: #334155; }

/* KPI CARDS */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
.kpi-card { background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.highlight { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; border: none; }
.highlight .label { color: rgba(255,255,255,0.8); }
.highlight .value { color: white; }

.icon-wrapper { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
.teal { background: #ccfbf1; } .blue { background: #dbeafe; } .purple { background: #f3e8ff; } .gold { background: rgba(255,255,255,0.2); }

.kpi-data { display: flex; flex-direction: column; }
.label { font-size: 0.8rem; font-weight: 600; color: #64748b; }
.value { font-size: 1.6rem; font-weight: 800; margin: 0.25rem 0; line-height: 1; }
.trend { font-size: 0.75rem; font-weight: 500; }
.positive { color: #16a34a; } .neutral { color: #64748b; } .text-white-50 { color: rgba(255,255,255,0.8); }

/* CHARTS GRID */
.charts-grid { display: grid; grid-template-columns: 3fr 1fr; gap: 1.5rem; }
.chart-container { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1.5rem; display: flex; flex-direction: column; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.chart-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
.chart-wrapper-lg { height: 350px; }
.doughnut-wrapper { height: 180px; position: relative; margin-bottom: 1rem; }

.legend-custom { display: flex; gap: 1rem; font-size: 0.8rem; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.bar-color { background: #3b82f6; } .line-color { background: #14b8a6; }

.mini-stats { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem; }
.stat-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
.text-teal { color: #0d9488; }

/* TABLE */
.table-container { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1.5rem; overflow: hidden; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.table-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
.btn-csv { font-size: 0.8rem; background: transparent; border: 1px solid #cbd5e1; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; color: #475569; }

.table-scroll { overflow-x: auto; max-height: 400px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table th { position: sticky; top: 0; background: #f8fafc; padding: 0.8rem 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; z-index: 10; border-bottom: 2px solid #e2e8f0; }
.data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

.rate-badge { padding: 4px 8px; border-radius: 6px; color: #0f172a; font-weight: 700; display: inline-block; min-width: 40px; }
.status-pill { font-size: 0.7rem; padding: 2px 8px; border-radius: 99px; font-weight: 600; text-transform: uppercase; }
.excellent { background: #dcfce7; color: #166534; }
.good { background: #dbeafe; color: #1e40af; }
.warning { background: #fee2e2; color: #991b1b; }

.highlight-row { background-color: #fffbeb; } /* Resalta la fila masiva (S19) */
.text-blue { color: #2563eb; }
.text-xs { font-size: 0.75rem; }
.text-muted { color: #94a3b8; }
.text-center { text-align: center; }

@media (max-width: 1024px) {
  .charts-grid { grid-template-columns: 1fr; }
}
</style>