<template>
  <div class="system-container">
    
    <div class="main-header">
      <div>
        <h1 class="system-title">CRONOGRAMA COMERCIAL & SEGUIMIENTO</h1>
        <p class="system-subtitle">ENERO 2026 - GESTIÓN DE CURSOS Y DIPLOMADOS</p>
      </div>
      
      <button @click="toggleView" class="btn-toggle">
        <span v-if="!isDashboard">
          <i class="icon-chart">📊</i> VER MODO GRÁFICO
        </span>
        <span v-else>
          <i class="icon-table">📋</i> VER MODO TABLA
        </span>
      </button>
    </div>

    <div v-if="!isDashboard" class="table-view-container animate-fade">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr class="header-group">
              <th colspan="7" class="text-left">DATOS DEL PROGRAMA</th>
              <th colspan="3" class="group-blue">VENTAS (NUEVOS)</th>
              <th colspan="3" class="group-gray">LEADS</th>
              <th colspan="3" class="group-dark">COMUNIDAD</th>
            </tr>
            <tr class="header-cols">
              <th>MES</th>
              <th>CATEGORÍA</th>
              <th>LÍNEA</th>
              <th>PROGRAMA</th>
              <th>TIPO</th>
              <th>INICIO</th>
              <th>EDICIÓN</th>
              
              <th class="sub-blue">OBJ</th>
              <th class="sub-blue">REAL</th>
              <th class="sub-blue">%</th>

              <th class="sub-gray">OBJ</th>
              <th class="sub-gray">REAL</th>
              <th class="sub-gray">%</th>

              <th class="sub-dark">OBJ</th>
              <th class="sub-dark">REAL</th>
              <th class="sub-dark">%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in tableData" :key="index" class="data-row">
              <td class="font-bold text-muted">{{ row.mes }}</td>
              <td><span class="badge" :class="getBadgeClass(row.catg)">{{ row.catg }}</span></td>
              <td class="font-medium">{{ row.linea }}</td>
              <td class="text-dark">{{ row.programa }}</td>
              <td><span class="circle-type">{{ row.tipo }}</span></td>
              <td class="text-sm">{{ row.fecha }}</td>
              <td class="text-xs text-muted font-mono">{{ row.edicion }}</td>

              <td class="text-center bg-blue-light">{{ row.v_new_obj }}</td>
              <td class="text-center bg-blue-light font-bold">{{ row.v_new_real }}</td>
              <td class="text-center bg-blue-light">
                <span :class="getPctClass(row.v_new_real, row.v_new_obj)">{{ calcPct(row.v_new_real, row.v_new_obj) }}%</span>
              </td>

              <td class="text-center">{{ row.lead_obj }}</td>
              <td class="text-center">{{ row.lead_real }}</td>
              <td class="text-center">
                 <span :class="getPctClass(row.lead_real, row.lead_obj)">{{ calcPct(row.lead_real, row.lead_obj) }}%</span>
              </td>

              <td class="text-center bg-dark-light">{{ row.com_obj }}</td>
              <td class="text-center bg-dark-light font-bold">{{ row.com_real }}</td>
              <td class="text-center bg-dark-light">
                 <span :class="getPctClass(row.com_real, row.com_obj)">{{ calcPct(row.com_real, row.com_obj) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="marketing-dashboard animate-fade">
      
      <div class="kpi-strip">
        <div class="kpi-box">
          <span class="kpi-label">TOTAL OBJETIVO (VENTAS)</span>
          <span class="kpi-value">{{ totalObjectives }}</span>
          <span class="kpi-sub">Meta del mes</span>
        </div>
        <div class="kpi-box highlight">
          <span class="kpi-label">VENTAS REALES (TOTAL)</span>
          <span class="kpi-value">{{ totalSales }}</span>
          <span class="kpi-delta" :class="totalSales >= totalObjectives ? 'positive' : 'negative'">
            {{ ((totalSales / totalObjectives) * 100).toFixed(1) }}% Cumplimiento
          </span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">PROGRAMAS ACTIVOS</span>
          <span class="kpi-value">{{ tableData.length }}</span>
          <span class="kpi-sub">Cursos y Diplomados</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">LÍNEA TOP PERFORMER</span>
          <span class="kpi-value text-blue">{{ topPerformerLine }}</span>
          <span class="kpi-sub">Mayor volumen de ventas</span>
        </div>
      </div>

      <div class="split-section">
        <div class="panel">
          <div class="panel-header">
            <h4>VENTAS POR CATEGORÍA</h4>
            <p>Comparativa Objetivo vs. Real según tipo de producto</p>
          </div>
          <div class="chart-wrapper-medium">
             <Bar :data="categoryChartData" :options="barOptions" />
          </div>
        </div>

         <div class="panel">
          <div class="panel-header">
            <h4>PESO COMERCIAL POR LÍNEA</h4>
            <p>Participación de SAP, Excel, BI, etc. en la meta global</p>
          </div>
           <div class="doughnut-container">
            <Doughnut :data="lineChartData" :options="doughnutOptions" />
          </div>
        </div>
      </div>

       <div class="section-container">
        <div class="chart-header">
           <h3>RENDIMIENTO DETALLADO POR LÍNEA DE NEGOCIO</h3>
           <span class="chart-desc">Análisis de cumplimiento de cuota (Barras Claras = Objetivo / Barras Oscuras = Real)</span>
        </div>
        <div class="chart-wrapper-large">
           <Bar :data="performanceChartData" :options="groupedBarOptions" />
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement)

// --- ESTADO ---
const isDashboard = ref(false)
const toggleView = () => isDashboard.value = !isDashboard.value

// --- DATA HARDCORE (REPLICA DE TU IMAGEN) ---
const tableData = [
  { mes: 'ENERO', catg: 'CURSO', linea: 'SAP', programa: 'SAP HANA MM', tipo: 'B', fecha: '22/1/2026', edicion: 'E2-26', v_new_obj: 2, v_new_real: 0, lead_obj: 3, lead_real: 0, com_obj: 1, com_real: 1 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'LOGÍSTICA', programa: 'LEAN LOGISTICS', tipo: 'D', fecha: '22/1/2026', edicion: 'E8-25', v_new_obj: 0, v_new_real: 0, lead_obj: 0, lead_real: 0, com_obj: 0, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'PROCESOS', programa: 'POWER APPS AVANZ', tipo: 'B', fecha: '22/1/2026', edicion: 'E2-26', v_new_obj: 1, v_new_real: 0, lead_obj: 1, lead_real: 0, com_obj: 0, com_real: 0 },
  { mes: 'ENERO', catg: 'DIPLOMADO', linea: 'BI', programa: 'DIP INTELIG. Y ANALIST.', tipo: 'A', fecha: '22/1/2026', edicion: 'E1-26', v_new_obj: 2, v_new_real: 0, lead_obj: 2, lead_real: 0, com_obj: 1, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'BI', programa: 'DATA ANALYTICS', tipo: 'C', fecha: '22/1/2026', edicion: 'E1-26', v_new_obj: 1, v_new_real: 0, lead_obj: 1, lead_real: 0, com_obj: 0, com_real: 0 },
  { mes: 'ENERO', catg: 'DIPLOMADO', linea: 'PROCESOS', programa: 'DIP PROC Y MEJORA V3', tipo: 'A', fecha: '24/1/2026', edicion: 'E1-26', v_new_obj: 1, v_new_real: 0, lead_obj: 2, lead_real: 0, com_obj: 1, com_real: 1 },
  { mes: 'ENERO', catg: 'PEE', linea: 'PROCESOS', programa: 'PEE ANALIST PROC', tipo: 'B', fecha: '24/1/2026', edicion: 'E1-26', v_new_obj: 0, v_new_real: 0, lead_obj: 0, lead_real: 0, com_obj: 0, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'EXCEL', programa: 'EXCEL INTERM', tipo: 'C', fecha: '25/1/2026', edicion: 'E2-26', v_new_obj: 1, v_new_real: 1, lead_obj: 1, lead_real: 0, com_obj: 1, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'PROCESOS', programa: 'MODEL BIZ', tipo: 'B', fecha: '28/1/2026', edicion: 'E1-26', v_new_obj: 1, v_new_real: 0, lead_obj: 1, lead_real: 0, com_obj: 0, com_real: 0 },
  { mes: 'ENERO', catg: 'ESP.', linea: 'PROCESOS', programa: 'ESP. POWER APPS Y AUT.', tipo: 'N1', fecha: '29/1/2026', edicion: 'E2-26', v_new_obj: 1, v_new_real: 0, lead_obj: 1, lead_real: 0, com_obj: 2, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'FINANZ', programa: 'COST Y PRESUP', tipo: 'C', fecha: '29/1/2026', edicion: 'E2-26', v_new_obj: 1, v_new_real: 1, lead_obj: 2, lead_real: 0, com_obj: 1, com_real: 0 },
  { mes: 'ENERO', catg: 'ESP.', linea: 'BI', programa: 'ESP. POWER BI', tipo: 'A', fecha: '30/1/2026', edicion: 'E2-26', v_new_obj: 1, v_new_real: 0, lead_obj: 2, lead_real: 0, com_obj: 1, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'BI', programa: 'POWER BI', tipo: 'A', fecha: '30/1/2026', edicion: 'E2-26', v_new_obj: 1, v_new_real: 0, lead_obj: 1, lead_real: 0, com_obj: 1, com_real: 0 },
  { mes: 'ENERO', catg: 'ESP.', linea: 'EXCEL', programa: 'ESP. MACROS', tipo: 'C', fecha: '31/1/2026', edicion: 'E1-26', v_new_obj: 1, v_new_real: 1, lead_obj: 1, lead_real: 0, com_obj: 1, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'EXCEL', programa: 'EXCEL AVANZ', tipo: 'B', fecha: '31/1/2026', edicion: 'E1-26', v_new_obj: 1, v_new_real: 0, lead_obj: 1, lead_real: 0, com_obj: 0, com_real: 0 },
  { mes: 'ENERO', catg: 'CURSO', linea: 'SAP', programa: 'SAP HANA IN', tipo: 'A', fecha: '31/1/2026', edicion: 'E2-26', v_new_obj: 2, v_new_real: 0, lead_obj: 2, lead_real: 0, com_obj: 2, com_real: 0 }
]

// --- LOGICA DE VISUALIZACIÓN DE TABLA ---
const calcPct = (real, obj) => {
  if(obj === 0) return 0;
  return Math.round((real / obj) * 100);
}

const getPctClass = (real, obj) => {
  const pct = calcPct(real, obj);
  if(pct >= 100) return 'text-success';
  if(pct === 0) return 'text-danger';
  return 'text-warning';
}

const getBadgeClass = (catg) => {
  const map = { 'CURSO': 'badge-blue', 'DIPLOMADO': 'badge-purple', 'PEE': 'badge-orange', 'ESP.': 'badge-teal' };
  return map[catg] || 'badge-gray';
}

// --- LOGICA DEL DASHBOARD (PROCESAMIENTO DE DATOS) ---

// 1. Cálculos de KPIs
const totalObjectives = computed(() => tableData.reduce((acc, row) => acc + row.v_new_obj + row.com_obj, 0))
const totalSales = computed(() => tableData.reduce((acc, row) => acc + row.v_new_real + row.com_real, 0))

// 2. Agrupación por Línea para identificar Top Performer
const lineGroups = computed(() => {
  const groups = {}
  tableData.forEach(row => {
    if(!groups[row.linea]) groups[row.linea] = { obj: 0, real: 0 }
    groups[row.linea].obj += (row.v_new_obj + row.com_obj)
    groups[row.linea].real += (row.v_new_real + row.com_real)
  })
  return groups
})

const topPerformerLine = computed(() => {
  const sorted = Object.entries(lineGroups.value).sort((a,b) => b[1].real - a[1].real)
  return sorted[0] ? sorted[0][0] : 'N/A'
})

// 3. Data para Gráficos
// Gráfico Barras: Categorías
const categoryChartData = computed(() => {
  const cats = {}
  tableData.forEach(row => {
    if(!cats[row.catg]) cats[row.catg] = { obj: 0, real: 0 }
    cats[row.catg].obj += (row.v_new_obj + row.com_obj)
    cats[row.catg].real += (row.v_new_real + row.com_real)
  })
  
  return {
    labels: Object.keys(cats),
    datasets: [
      { label: 'Objetivo', data: Object.values(cats).map(c => c.obj), backgroundColor: '#cbd5e1' },
      { label: 'Real', data: Object.values(cats).map(c => c.real), backgroundColor: '#0f172a' }
    ]
  }
})

// Gráfico Donut: Peso por Línea
const lineChartData = computed(() => {
  const labels = Object.keys(lineGroups.value)
  const data = Object.values(lineGroups.value).map(g => g.obj) // Peso basado en objetivo
  return {
    labels,
    datasets: [{ data, backgroundColor: ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'], borderWidth: 0 }]
  }
})

// Gráfico Barras Agrupadas: Performance por Línea
const performanceChartData = computed(() => {
  const labels = Object.keys(lineGroups.value)
  return {
    labels,
    datasets: [
      { label: 'Objetivo', data: Object.values(lineGroups.value).map(g => g.obj), backgroundColor: '#cbd5e1', categoryPercentage: 0.7 },
      { label: 'Venta Real', data: Object.values(lineGroups.value).map(g => g.real), backgroundColor: '#0f172a', categoryPercentage: 0.7 }
    ]
  }
})

// Opciones de Gráficos (Estilo Minimalista)
const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' } } } }
const groupedBarOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' } } } }
const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }

</script>

<style scoped>
/* --- FUENTES & RESET BÁSICO --- */
.system-container {
  font-family: 'Inter', 'Segoe UI', Roboto, sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #f8fafc;
  min-height: 100vh;
  color: #0f172a;
}

/* --- ANIMACIONES --- */
.animate-fade { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* --- HEADER --- */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 1rem;
}
.system-title { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; color: #0f172a; }
.system-subtitle { font-size: 0.85rem; font-weight: 600; color: #64748b; margin-top: 0.25rem; letter-spacing: 0.05em; }

/* BOTÓN DE TOGGLE (ESTILO CORPORATIVO) */
.btn-toggle {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.1);
}
.btn-toggle:hover { background: #1e293b; transform: translateY(-1px); }

/* --- ESTILOS DE LA TABLA (MODERNA) --- */
.table-view-container { overflow-x: auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.table-wrapper { width: 100%; }
table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }

/* Headers */
thead th { background: #f8fafc; padding: 0.75rem 1rem; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
.header-group th { text-align: center; font-size: 0.7rem; letter-spacing: 0.05em; border-bottom: none; padding-bottom: 0.25rem; }
.header-cols th { font-size: 0.7rem; border-top: none; }

/* Colores de cabecera agrupada */
.group-blue { background: #eff6ff; color: #1e40af; border-left: 1px solid white; }
.group-gray { background: #f1f5f9; color: #475569; border-left: 1px solid white; }
.group-dark { background: #f8fafc; color: #0f172a; border-left: 1px solid #e2e8f0; }

.sub-blue { background: #eff6ff; color: #1e40af; }
.sub-gray { background: #f1f5f9; }
.sub-dark { background: #f8fafc; }

/* Filas */
.data-row td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.data-row:hover { background: #f8fafc; }

/* Celdas específicas */
.bg-blue-light { background: #eff6ff; }
.bg-dark-light { background: #f8fafc; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 700; }
.font-mono { font-family: 'Roboto Mono', monospace; }
.text-center { text-align: center; }

/* Estados porcentuales */
.text-success { color: #16a34a; font-weight: 700; }
.text-danger { color: #e2e8f0; font-weight: 400; } /* Casi invisible si es 0 */
.text-warning { color: #d97706; font-weight: 600; }

/* Badges */
.badge { padding: 0.25rem 0.6rem; border-radius: 99px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em; }
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-purple { background: #f3e8ff; color: #6b21a8; }
.badge-orange { background: #ffedd5; color: #9a3412; }
.badge-teal { background: #ccfbf1; color: #115e59; }

.circle-type { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #e2e8f0; border-radius: 50%; font-weight: 700; font-size: 0.7rem; }

/* --- ESTILOS DEL DASHBOARD (COPIADOS Y ADAPTADOS DE TU REFERENCIA) --- */
.marketing-dashboard { display: flex; flex-direction: column; gap: 2rem; }

/* KPI Strip */
.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
.kpi-box { background: white; padding: 1.5rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.kpi-box.highlight { background: #0f172a; color: white; border-color: #0f172a; }
.kpi-box.highlight .kpi-label, .kpi-box.highlight .kpi-sub { color: #94a3b8; }
.kpi-box.highlight .kpi-value { color: white; }
.kpi-label { font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
.kpi-value { font-size: 1.8rem; font-weight: 800; color: #0f172a; line-height: 1; margin-bottom: 0.5rem; }
.kpi-delta.positive { color: #4ade80; font-weight: 600; font-size: 0.8rem; }
.kpi-delta.negative { color: #f87171; font-weight: 600; font-size: 0.8rem; }
.text-blue { color: #2563eb; }

/* Secciones y Paneles */
.split-section { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.panel, .section-container { background: white; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 8px; }
.panel-header { margin-bottom: 1.5rem; }
.panel-header h4, .chart-header h3 { margin: 0; font-size: 0.9rem; font-weight: 800; text-transform: uppercase; color: #0f172a; }
.panel-header p, .chart-desc { margin: 0.25rem 0 0; font-size: 0.8rem; color: #64748b; }

.chart-wrapper-medium { height: 250px; }
.chart-wrapper-large { height: 350px; }
.doughnut-container { height: 220px; }

@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .split-section { grid-template-columns: 1fr; }
}
</style>