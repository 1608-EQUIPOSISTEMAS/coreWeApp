<template>
  <div class="followup-dashboard">
    <div class="header-section">
      <div class="header-content">
        <h1 class="page-title">RENTABILIDAD DE SEGUIMIENTO & CONTACTABILIDAD</h1>
        <p class="page-meta">ANÁLISIS DE EFICIENCIA OPERATIVA (OUTBOUND & INBOUND)</p>
      </div>
      <div class="controls">
        <div class="filter-group">
          <label>Campaña:</label>
          <select class="select-clean">
            <option>Todas las Campañas</option>
            <option>Cierre Mes Enero</option>
          </select>
        </div>
        <button class="btn-action">ACTUALIZAR DATOS</button>
      </div>
    </div>

    <div class="kpi-strip">
      <div class="kpi-box">
        <span class="kpi-label">INTENTOS DE CONTACTO</span>
        <span class="kpi-value">3,850</span>
        <div class="kpi-footer">
          <span class="text-muted">Promedio: 4.2 intentos/lead</span>
        </div>
      </div>
      <div class="kpi-box">
        <span class="kpi-label">TASA DE CONTACTABILIDAD</span>
        <span class="kpi-value warning">42.5%</span>
        <div class="kpi-footer">
          <span class="negative">▼ 2.1% vs semana ant.</span>
        </div>
      </div>
      <div class="kpi-box">
        <span class="kpi-label">EFECTIVIDAD DE CIERRE</span>
        <span class="kpi-value success">18.2%</span>
        <div class="kpi-footer">
          <span class="text-muted">Sobre llamadas contestadas</span>
        </div>
      </div>
      <div class="kpi-box highlight">
        <span class="kpi-label">INGRESO RECUPERADO (SEGUIMIENTO)</span>
        <span class="kpi-value">S/ 142,500</span>
        <div class="kpi-footer">
          <span class="highlight-text">ROI de Llamadas: 12x</span>
        </div>
      </div>
    </div>

    <div class="section-container">
      <div class="chart-header">
        <div class="header-text">
          <h3>TENDENCIA HORARIA: DEL INTENTO AL PAGO</h3>
          <span class="chart-desc">Correlación entre esfuerzo (llamadas), éxito de contacto y cierre final por franja horaria.</span>
        </div>
        <div class="legend-inline">
          <span class="dot-gray"></span> Intentos
          <span class="dot-blue"></span> Contestó
          <span class="dot-purple"></span> Interesado
          <span class="dot-green"></span> PAGÓ
        </div>
      </div>
      <div class="chart-wrapper-large">
        <Line :data="hourlyFlowData" :options="hourlyFlowOptions" />
      </div>
    </div>

    <div class="split-section">

      <div class="panel">
        <div class="panel-header">
          <h4>CURVA DE PERSISTENCIA</h4>
          <p>Distribución de ventas según el número de intento de contacto (N° de Toque).</p>
        </div>
        <div class="chart-wrapper-medium">
          <Bar :data="persistenceChartData" :options="persistenceChartOptions" />
        </div>
        <div class="insight-box">
          <strong>INSIGHT:</strong> El 65% de las ventas ocurren entre el 2do y 3er intento. Después del 5to intento, la probabilidad de venta cae al 2%.
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h4>ANÁLISIS DE OBJECIONES</h4>
          <p>Razones principales registradas en llamadas "No Exitosas".</p>
        </div>
        <div class="table-compact-wrapper">
          <table class="compact-table">
            <thead>
              <tr>
                <th>Objeción</th>
                <th class="text-right">Frecuencia</th>
                <th class="text-right">% Total</th>
                <th>Tendencia</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Falta Dinero / Muy Caro</td>
                <td class="text-right">450</td>
                <td class="text-right font-bold">45%</td>
                <td class="text-center"><span class="bar-indic" style="width: 45%"></span></td>
              </tr>
              <tr>
                <td>Solo quería información</td>
                <td class="text-right">280</td>
                <td class="text-right font-bold">28%</td>
                <td class="text-center"><span class="bar-indic" style="width: 28%"></span></td>
              </tr>
              <tr>
                <td>Horarios no coinciden</td>
                <td class="text-right">150</td>
                <td class="text-right font-bold">15%</td>
                <td class="text-center"><span class="bar-indic" style="width: 15%"></span></td>
              </tr>
              <tr>
                <td>Lo consultará (Pareja/Jefe)</td>
                <td class="text-right">120</td>
                <td class="text-right font-bold">12%</td>
                <td class="text-center"><span class="bar-indic" style="width: 12%"></span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section-container">
      <div class="panel-header">
        <h4>MATRIZ DE DESEMPEÑO INDIVIDUAL</h4>
        <p>Evaluación de productividad: Volumen vs. Eficacia en Cierres.</p>
      </div>
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="col-main">ASESOR</th>
            <th class="text-right">LEADS GESTIONADOS</th>
            <th class="text-right">LLAMADAS REALIZADAS</th>
            <th class="text-right">CONTACTADOS</th>
            <th class="text-right">% CONTACT.</th>
            <th class="text-right">PAGÓ (CIERRES)</th>
            <th class="text-right">TASA CONVERSIÓN</th>
            <th class="text-right">TIEMPO PROM. LLAMADA</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(advisor, index) in advisorData" :key="index">
            <td class="font-bold text-dark">{{ advisor.name }}</td>
            <td class="text-right">{{ advisor.leads }}</td>
            <td class="text-right bg-gray-light">{{ advisor.calls }}</td>
            <td class="text-right">{{ advisor.contacted }}</td>
            <td class="text-right">
              <span :class="getScoreColor(advisor.contactRate)">{{ advisor.contactRate }}%</span>
            </td>
            <td class="text-right font-bold text-green">{{ advisor.sales }}</td>
            <td class="text-right font-bold">{{ advisor.conversion }}%</td>
            <td class="text-right text-muted">{{ advisor.avgTime }} min</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL / PROMEDIO</td>
            <td class="text-right">1,250</td>
            <td class="text-right">3,850</td>
            <td class="text-right">1,636</td>
            <td class="text-right">42.5%</td>
            <td class="text-right">298</td>
            <td class="text-right">18.2%</td>
            <td class="text-right">4.5 min</td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>
</template>

<script setup>
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

// --- 1. DATA FLUJO HORARIO (Main Chart) ---
// Muestra: A qué hora llamamos (gris), a qué hora contestan (azul), y a qué hora pagan (verde).
const hourlyFlowData = {
  labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
  datasets: [
    {
      label: 'Intentos (Volumen)',
      data: [40, 120, 150, 140, 80, 40, 60, 130, 160, 180, 150, 90, 30],
      borderColor: '#cbd5e1',
      backgroundColor: 'rgba(203, 213, 225, 0.2)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      order: 4
    },
    {
      label: 'Contestó',
      data: [10, 40, 50, 45, 20, 15, 25, 60, 80, 110, 100, 60, 20],
      borderColor: '#3b82f6', // Azul fuerte
      backgroundColor: '#3b82f6',
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 2,
      order: 3
    },
    {
      label: 'Interesado (Calificado)',
      data: [5, 20, 30, 35, 15, 10, 20, 40, 55, 70, 65, 40, 15],
      borderColor: '#8b5cf6', // Morado
      backgroundColor: '#8b5cf6',
      tension: 0.3,
      borderDash: [5, 5], // Línea punteada para diferenciar "intención"
      borderWidth: 2,
      pointRadius: 0,
      order: 2
    },
    {
      label: 'PAGÓ (Cierre)',
      data: [2, 12, 18, 22, 8, 5, 8, 25, 35, 45, 40, 25, 8],
      borderColor: '#10b981', // Verde Éxito
      backgroundColor: '#10b981',
      type: 'bar', // Barra para resaltar el volumen de ventas concreto
      barPercentage: 0.3,
      order: 1
    }
  ]
}

const hourlyFlowOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }, // Usamos leyenda custom
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } }
  }
}

// --- 2. DATA CURVA DE PERSISTENCIA ---
const persistenceChartData = {
  labels: ['1er Intento', '2do Intento', '3er Intento', '4to Intento', '5to+', 'Entrante'],
  datasets: [{
    label: 'Ventas Cerradas',
    data: [15, 45, 35, 12, 5, 25], // Mayoría en 2do y 3ero
    backgroundColor: [
      '#94a3b8', '#3b82f6', '#2563eb', '#1d4ed8', '#0f172a', '#10b981'
    ],
    borderRadius: 3
  }]
}

const persistenceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { display: false },
    x: { grid: { display: false } }
  }
}

// --- 3. DATA MATRIZ ASESORES ---
const advisorData = [
  { name: 'Eliuth D.', leads: 420, calls: 1100, contacted: 550, contactRate: 50.0, sales: 115, conversion: 20.9, avgTime: 5.2 },
  { name: 'Raúl P.', leads: 380, calls: 1450, contacted: 480, contactRate: 33.1, sales: 85, conversion: 17.7, avgTime: 3.8 },
  { name: 'Arleth C.', leads: 300, calls: 950, contacted: 420, contactRate: 44.2, sales: 78, conversion: 18.5, avgTime: 4.5 },
  { name: 'Bot AI', leads: 150, calls: 350, contacted: 186, contactRate: 53.1, sales: 20, conversion: 10.7, avgTime: 1.2 }
]

const getScoreColor = (rate) => {
  if (rate >= 45) return 'text-green'
  if (rate >= 35) return 'text-dark'
  return 'text-red'
}
</script>

<style scoped>
/* ESTILOS HARDCORE / DATA-DENSE */
.followup-dashboard {
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f8fafc;
  color: #1e293b;
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

/* Header */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.page-meta {
  color: #64748b;
  font-size: 0.8rem;
  margin: 0.4rem 0 0 0;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.controls { display: flex; align-items: flex-end; gap: 1rem; }
.filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
.filter-group label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.select-clean {
  padding: 0.5rem 2rem 0.5rem 0.8rem;
  border: 1px solid #cbd5e1;
  background-color: white;
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
}
.btn-action {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  cursor: pointer;
  height: 34px;
}

/* KPIs */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.kpi-box {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.kpi-box.highlight {
  background: #0f172a;
  border-color: #0f172a;
  color: white;
}
.kpi-box.highlight .kpi-label { color: #94a3b8; }
.kpi-box.highlight .kpi-value { color: white; }
.kpi-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}
.kpi-value {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}
.kpi-value.warning { color: #d97706; }
.kpi-value.success { color: #16a34a; }

.kpi-footer { margin-top: 0.8rem; font-size: 0.75rem; font-weight: 500; }
.text-muted { color: #94a3b8; }
.negative { color: #dc2626; }
.highlight-text { color: #a5b4fc; font-weight: 700; }

/* MAIN CHART */
.section-container {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
  margin-bottom: 2rem;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}
.header-text h3 { margin: 0; font-size: 1.1rem; font-weight: 800; text-transform: uppercase; }
.chart-desc { font-size: 0.85rem; color: #64748b; }

.legend-inline { display: flex; gap: 1rem; font-size: 0.8rem; font-weight: 600; align-items: center; }
.dot-gray { width: 10px; height: 10px; background: #cbd5e1; display: inline-block; }
.dot-blue { width: 10px; height: 10px; background: #3b82f6; display: inline-block; }
.dot-purple { width: 10px; height: 10px; background: #8b5cf6; display: inline-block; }
.dot-green { width: 10px; height: 10px; background: #10b981; display: inline-block; }

.chart-wrapper-large { height: 320px; width: 100%; }

/* SPLIT SECTION */
.split-section { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
.panel {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}
.panel-header { margin-bottom: 1.5rem; }
.panel-header h4 { margin: 0; font-size: 0.95rem; font-weight: 800; text-transform: uppercase; }
.panel-header p { margin: 0.25rem 0 0; font-size: 0.8rem; color: #64748b; }
.chart-wrapper-medium { height: 220px; width: 100%; }

.insight-box {
  margin-top: auto;
  padding: 1rem;
  background: #f1f5f9;
  border-left: 3px solid #0f172a;
  font-size: 0.8rem;
  color: #334155;
  margin-top: 1rem;
}

/* COMPACT TABLE */
.table-compact-wrapper { overflow-x: auto; }
.compact-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.compact-table th { text-align: left; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; color: #64748b; font-size: 0.7rem; text-transform: uppercase; }
.compact-table td { padding: 0.6rem 0; border-bottom: 1px solid #f8fafc; color: #334155; }
.bar-indic { display: block; height: 6px; background: #cbd5e1; border-radius: 2px; }

/* MATRIX TABLE */
.matrix-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.matrix-table th {
  text-align: left;
  padding: 1rem;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 800;
  color: #475569;
  text-transform: uppercase;
  font-size: 0.7rem;
}
.matrix-table td { padding: 0.8rem 1rem; border-bottom: 1px solid #e2e8f0; color: #334155; }
.matrix-table tfoot td { font-weight: 800; background: #f1f5f9; border-top: 2px solid #cbd5e1; }

.text-right { text-align: right; }
.text-center { text-align: center; }
.col-main { width: 20%; }
.bg-gray-light { background: #f8fafc; font-weight: 600; }
.font-bold { font-weight: 700; }
.text-dark { color: #0f172a; }
.text-green { color: #16a34a; }
.text-red { color: #dc2626; }

@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .split-section { grid-template-columns: 1fr; }
}
</style>
