<template>
  <div class="system-container">

    <div class="filter-bar animate-fade">
      <div class="filter-group">
        <div class="filter-item">
          <label>AÑO</label>
          <select v-model="filters.year">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
          </select>
        </div>
        <div class="filter-item">
          <label>MES</label>
          <select v-model="filters.month">
            <option value="ENE">ENERO</option>
            <option value="FEB">FEBRERO</option>
            <option value="MAR">MARZO</option>
          </select>
        </div>
        <div class="filter-item wide">
          <label>PERIODO (SEMANA)</label>
          <select v-model="filters.period">
            <option value="S1">SEM 1 (01 ENE - 04 ENE)</option>
            <option value="S2">SEM 2 (05 ENE - 11 ENE)</option>
            <option value="S3">SEM 3 (12 ENE - 18 ENE)</option>
            <option value="MTD">ACUMULADO MENSUAL (MTD)</option>
          </select>
        </div>
      </div>

      <div class="mini-kpis">
        <div class="mini-card">
          <span>VENTA TOTAL (S/.)</span>
          <strong>{{ formatCurrency(totals.ven_monto) }}</strong>
        </div>
        <div class="mini-card">
          <span>TICKET PROM.</span>
          <strong>{{ formatCurrency(totals.ticketProm) }}</strong>
        </div>
        <div class="mini-card highlight">
          <span>% META S/.</span>
          <strong>{{ totals.pctMetaMonto }}%</strong>
        </div>
      </div>
    </div>

    <div class="main-header">
      <div>
        <h1 class="system-title">TABLERO DE CONTROL COMERCIAL</h1>
        <p class="system-subtitle">VISTA: {{ filters.period }} - {{ filters.month }} {{ filters.year }}</p>
      </div>

      <button @click="toggleView" class="btn-toggle">
        <span v-if="!isDashboard">
          <i class="icon">📊</i> VER ANÁLISIS GRÁFICO
        </span>
        <span v-else>
          <i class="icon">📋</i> VER DETALLE TABLA
        </span>
      </button>
    </div>

    <div v-if="!isDashboard" class="view-container animate-fade">

      <div class="table-card mb-8">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr class="header-group">
                <th colspan="3" class="text-left">ASESOR</th>
                <th colspan="3" class="group-blue">OBJETIVOS (VOLUMEN)</th>
                <th colspan="3" class="group-green">FINANCIERO (S/.)</th> <th colspan="3" class="group-gray">GESTIÓN</th>
                <th colspan="2" class="group-dark">EFICIENCIA</th>
              </tr>
              <tr class="header-cols">
                <th>#</th>
                <th>NOMBRE</th>
                <th>TREND</th> <th class="sub-blue">META #</th>
                <th class="sub-blue">REAL #</th>
                <th class="sub-blue">GAP</th>
                <th class="sub-green">META S/.</th>
                <th class="sub-green">VENTA S/.</th>
                <th class="sub-green">TICKET</th>
                <th class="sub-gray">LEADS</th>
                <th class="sub-gray">ACTIVOS</th>
                <th class="sub-gray">% GEST</th>
                <th class="sub-dark">% CONV</th>
                <th class="sub-dark">STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in tableData" :key="index" class="data-row">
                <td class="text-muted text-center">{{ index + 1 }}</td>
                <td class="font-medium text-dark">{{ row.asesor }}</td>

                <td class="text-center">
                   <span v-if="row.trend === 'up'" class="trend-up">▲</span>
                   <span v-else-if="row.trend === 'down'" class="trend-down">▼</span>
                   <span v-else class="trend-flat">=</span>
                </td>

                <td class="text-center bg-blue-light">{{ row.obj }}</td>
                <td class="text-center bg-blue-light font-bold text-dark">{{ row.ven }}</td>
                <td class="text-center bg-blue-light">
                  <span :class="row.falta > 0 ? 'text-danger' : 'text-success'">
                    {{ row.falta > 0 ? '-' + row.falta : '✓' }}
                  </span>
                </td>

                <td class="text-right bg-green-light text-muted text-xs">{{ formatCurrency(row.obj_monto) }}</td>
                <td class="text-right bg-green-light font-bold text-dark">{{ formatCurrency(row.ven_monto) }}</td>
                <td class="text-right bg-green-light text-xs">{{ formatCurrency(row.ven_monto / (row.ven || 1)) }}</td>

                <td class="text-center">{{ row.contactos }}</td>
                <td class="text-center text-muted">{{ Math.round(row.contactos * 0.85) }}</td>
                <td class="text-center text-xs">100%</td>
                <td class="text-center bg-dark-light font-bold">
                   <span :class="getConvClass(row.conv)">{{ row.conv }}%</span>
                </td>
                <td class="text-center bg-dark-light">
                   <span class="circle-status" :class="getStatusColor(row.ven, row.obj)"></span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="row-total">
                 <td colspan="3" class="font-bold">TOTAL EQUIPO</td>
                 <td class="text-center">{{ totals.obj }}</td>
                 <td class="text-center text-blue">{{ totals.ven }}</td>
                 <td class="text-center text-danger">-{{ totals.falta }}</td>

                 <td class="text-right">{{ formatCurrency(totals.obj_monto) }}</td>
                 <td class="text-right text-success">{{ formatCurrency(totals.ven_monto) }}</td>
                 <td class="text-right">{{ formatCurrency(totals.ticketProm) }}</td>

                 <td class="text-center">{{ totals.contactos }}</td>
                 <td class="text-center">-</td>
                 <td class="text-center">-</td>
                 <td class="text-center">{{ totals.avgConv }}%</td>
                 <td class="text-center">{{ totals.pctMetaMonto }}% $$</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="daily-section animate-slide-up">
        <div class="daily-header">
          <div>
            <h3 class="section-title">MICRO-GESTIÓN: DESGLOSE DIARIO</h3>
            <p class="section-desc">Análisis granular día por día</p>
          </div>
          <div class="filter-wrapper">
            <select v-model="selectedAdvisorCode" class="custom-select">
              <option value="ALL">TOTAL EQUIPO (Consolidado)</option>
              <option v-for="adv in tableData" :key="adv.cod" :value="adv.cod">{{ adv.asesor }}</option>
            </select>
          </div>
        </div>
        <div class="days-grid">
          <div v-for="(day, i) in currentDailyStats" :key="i" class="day-card" :class="{ 'active-day': day.ven > 0 }">
            <div class="day-header">
              <span class="day-name">{{ day.name }}</span>
              <span class="day-date">{{ day.date }}</span>
            </div>
            <div class="day-body">
              <div class="metric-row"><span class="metric-label">LEADS</span><span class="metric-val">{{ day.con }}</span></div>
              <div class="metric-row highlight"><span class="metric-label">VENTAS</span><span class="metric-val">{{ day.ven }}</span></div>
              <div class="metric-row"><span class="metric-label">CONV.</span><span class="metric-val text-xs">{{ day.conv }}%</span></div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div v-else class="marketing-dashboard animate-fade">

      <div class="split-section mb-6">
        <div class="panel">
          <div class="panel-header">
            <h4>EVOLUCIÓN DIARIA DE VENTAS (S/.)</h4>
            <p>Comparativa de ritmo de ventas acumulado vs Semana Anterior</p>
          </div>
          <div class="chart-wrapper-large">
            <Line :data="trendChartData" :options="lineOptions" />
          </div>
        </div>

        <div class="panel">
           <div class="panel-header"><h4>EMBUDO DE CONVERSIÓN</h4></div>
           <div class="funnel-container">
             <div class="funnel-step step-1">
               <div class="f-label">LEADS TOTALES</div>
               <div class="f-value">{{ totals.contactos }}</div>
               <div class="f-bar" style="width: 100%"></div>
             </div>
             <div class="funnel-step step-2">
               <div class="f-label">CONTACTADOS (85%)</div>
               <div class="f-value">{{ Math.round(totals.contactos * 0.85) }}</div>
               <div class="f-bar" style="width: 85%"></div>
             </div>
             <div class="funnel-step step-3">
               <div class="f-label">INTERESADOS (40%)</div>
               <div class="f-value">{{ Math.round(totals.contactos * 0.40) }}</div>
               <div class="f-bar" style="width: 40%"></div>
             </div>
             <div class="funnel-step step-4">
               <div class="f-label">VENTAS CERRADAS ({{ totals.avgConv }}%)</div>
               <div class="f-value">{{ totals.ven }}</div>
               <div class="f-bar" :style="`width: ${totals.avgConv}%`"></div>
             </div>
           </div>
        </div>
      </div>

      <div class="split-section">
        <div class="panel">
          <div class="panel-header"><h4>CUMPLIMIENTO DE META (S/.)</h4></div>
          <div class="chart-wrapper-medium"><Bar :data="revenueChartData" :options="groupedBarOptions" /></div>
        </div>
        <div class="panel">
          <div class="panel-header"><h4>PARTICIPACIÓN (SHARE)</h4></div>
           <div class="doughnut-container"><Doughnut :data="shareChartData" :options="doughnutOptions" /></div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

// --- ESTADO Y FILTROS ---
const isDashboard = ref(false)
const selectedAdvisorCode = ref('ALL')
const filters = reactive({ year: 2026, month: 'ENE', period: 'S3' })

const toggleView = () => isDashboard.value = !isDashboard.value
const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(val)

// --- MOCK DATA (Enriquecida con Financiero y Tendencias) ---
// NOTA: Aquí es donde conectarías tu API de PostgreSQL
const tableData = [
  {
    asesor: 'Camilo', cod: 'CA36', trend: 'down',
    obj: 32, ven: 13, falta: 19,
    obj_monto: 32000, ven_monto: 15600, // Nuevo: Financiero
    contactos: 118, conv: 11,
    daily: [
      { name: 'LUN', date: '12/1', con: 49, ven: 2, conv: 4 },
      { name: 'MAR', date: '13/1', con: 29, ven: 6, conv: 21 },
      { name: 'MIE', date: '14/1', con: 40, ven: 5, conv: 13 },
      { name: 'JUE', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIE', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁB', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOM', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  },
  {
    asesor: 'Arleth', cod: 'AE30', trend: 'up',
    obj: 38, ven: 35, falta: 3,
    obj_monto: 38000, ven_monto: 42000, // High Performer
    contactos: 113, conv: 31,
    daily: [
      { name: 'LUN', date: '12/1', con: 57, ven: 14, conv: 25 },
      { name: 'MAR', date: '13/1', con: 36, ven: 8, conv: 22 },
      { name: 'MIE', date: '14/1', con: 20, ven: 13, conv: 65 },
      { name: 'JUE', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIE', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁB', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOM', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  },
  {
    asesor: 'Grecia', cod: 'GR39', trend: 'flat',
    obj: 36, ven: 16, falta: 20,
    obj_monto: 36000, ven_monto: 12800,
    contactos: 266, conv: 6,
    daily: [
      { name: 'LUN', date: '12/1', con: 111, ven: 1, conv: 1 },
      { name: 'MAR', date: '13/1', con: 119, ven: 4, conv: 3 },
      { name: 'MIE', date: '14/1', con: 36, ven: 11, conv: 31 },
      { name: 'JUE', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIE', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁB', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOM', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  },
  {
    asesor: 'Fabiana', cod: 'SF13', trend: 'up',
    obj: 25, ven: 17, falta: 8,
    obj_monto: 25000, ven_monto: 18700,
    contactos: 55, conv: 30, // Corregido data outlier
    daily: [
      { name: 'LUN', date: '12/1', con: 25, ven: 7, conv: 28 },
      { name: 'MAR', date: '13/1', con: 20, ven: 6, conv: 30 },
      { name: 'MIE', date: '14/1', con: 10, ven: 4, conv: 40 },
      { name: 'JUE', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIE', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁB', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOM', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  }
]

// --- CÁLCULOS Y LOGICA ---

// 1. Totales Generales
const totals = computed(() => {
  const t = tableData.reduce((acc, row) => {
    acc.obj += row.obj; acc.ven += row.ven; acc.falta += row.falta; acc.contactos += row.contactos;
    acc.obj_monto += row.obj_monto; acc.ven_monto += row.ven_monto;
    return acc
  }, { obj: 0, ven: 0, falta: 0, contactos: 0, obj_monto: 0, ven_monto: 0 })

  t.avgConv = t.contactos > 0 ? Math.round((t.ven / t.contactos) * 100) : 0
  t.ticketProm = t.ven > 0 ? t.ven_monto / t.ven : 0
  t.pctMetaMonto = t.obj_monto > 0 ? Math.round((t.ven_monto / t.obj_monto) * 100) : 0
  return t
})

// 2. Data Diaria Filtrada
const currentDailyStats = computed(() => {
  if (selectedAdvisorCode.value !== 'ALL') {
    const advisor = tableData.find(a => a.cod === selectedAdvisorCode.value)
    return advisor ? advisor.daily : []
  }
  // Sumatoria diaria para TOTAL
  return tableData[0].daily.map((dayRef, index) => {
    let sumCon = 0, sumVen = 0
    tableData.forEach(adv => {
       if(adv.daily && adv.daily[index]) {
         sumCon += adv.daily[index].con
         sumVen += adv.daily[index].ven
       }
    })
    return { name: dayRef.name, date: dayRef.date, con: sumCon, ven: sumVen, conv: sumCon > 0 ? Math.round((sumVen/sumCon)*100) : 0 }
  })
})

// --- DATA PARA GRÁFICOS ---

// A. Gráfico de Líneas (Tendencia Acumulada)
const trendChartData = computed(() => {
  const labels = tableData[0].daily.map(d => d.name)
  // Simulamos data acumulada del equipo
  const dailyTotal = currentDailyStats.value.map(d => d.ven)
  const cumulative = dailyTotal.reduce((acc, curr, i) => [...acc, curr + (acc[i-1] || 0)], [])

  return {
    labels,
    datasets: [
      {
        label: 'Esta Semana (Acumulado)',
        data: cumulative,
        borderColor: '#0f172a',
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Semana Anterior (Ref)',
        data: cumulative.map(v => v * 0.8), // Mock data referencia
        borderColor: '#94a3b8',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false
      }
    ]
  }
})

// B. Gráfico Barras (Meta vs Real Financiero)
const revenueChartData = computed(() => {
  const active = tableData.filter(d => d.obj > 0)
  return {
    labels: active.map(d => d.asesor),
    datasets: [
      { label: 'Meta S/.', data: active.map(d => d.obj_monto), backgroundColor: '#e2e8f0', borderRadius: 4 },
      { label: 'Real S/.', data: active.map(d => d.ven_monto), backgroundColor: '#10b981', borderRadius: 4 }
    ]
  }
})

// C. Gráfico Dona
const shareChartData = computed(() => {
  const top = tableData.filter(d => d.ven > 0)
  return { labels: top.map(d => d.asesor), datasets: [{ data: top.map(d => d.ven), backgroundColor: ['#0f172a','#334155','#64748b','#94a3b8'], borderWidth: 0 }] }
})

// Configuración de Gráficos
const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
const groupedBarOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } }, plugins: { legend: { display: true, position: 'bottom' } } }
const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } }

// Helpers UI
const getConvClass = (val) => val > 20 ? 'text-success' : (val >= 10 ? 'text-blue' : 'text-muted')
const getStatusColor = (ven, obj) => { const pct = ven/obj; return pct >= 0.9 ? 'bg-green' : (pct >= 0.5 ? 'bg-yellow' : 'bg-red') }
</script>

<style scoped>
/* ESTILOS BASE (Heredados y Mejorados) */
.system-container { font-family: 'Inter', sans-serif; max-width: 1400px; margin: 0 auto; padding: 2rem; background-color: #f8fafc; min-height: 100vh; color: #0f172a; }
.animate-fade { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* HEADER Y NAVEGACIÓN */
.main-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; }
.system-title { font-size: 1.5rem; font-weight: 800; margin: 0; color: #0f172a; }
.system-subtitle { font-size: 0.85rem; font-weight: 600; color: #64748b; margin-top: 0.25rem; text-transform: uppercase; }

/* BARRA DE FILTROS (NUEVO) */
.filter-bar { background: white; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
.filter-group { display: flex; gap: 1rem; }
.filter-item label { display: block; font-size: 0.65rem; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
.filter-item select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #334155; outline: none; min-width: 100px; }
.filter-item.wide select { min-width: 220px; }

/* MINI KPIS (TOP HEADER) */
.mini-kpis { display: flex; gap: 1.5rem; border-left: 1px solid #e2e8f0; padding-left: 1.5rem; }
.mini-card { display: flex; flex-direction: column; text-align: right; }
.mini-card span { font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
.mini-card strong { font-size: 1.1rem; color: #0f172a; font-weight: 800; }
.mini-card.highlight strong { color: #10b981; }

/* BOTÓN TOGGLE */
.btn-toggle { background: #0f172a; color: white; border: none; padding: 0.75rem 1.5rem; font-weight: 700; font-size: 0.85rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: all 0.2s; }
.btn-toggle:hover { background: #1e293b; transform: translateY(-1px); }

/* TABLA MEJORADA */
.table-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; }
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
thead th { padding: 0.75rem 1rem; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }

/* Grupos de Color Headers */
.group-blue { background: #eff6ff; color: #1e40af; border-left: 2px solid white; }
.group-green { background: #ecfdf5; color: #047857; border-left: 2px solid white; } /* NUEVO VERDE */
.group-gray { background: #f8fafc; color: #475569; border-left: 2px solid white; }
.group-dark { background: #f1f5f9; color: #0f172a; border-left: 2px solid white; }

/* Sub-Headers */
.sub-blue { background: #eff6ff; color: #1d4ed8; }
.sub-green { background: #ecfdf5; color: #059669; }
.sub-gray { background: #f8fafc; color: #64748b; }
.sub-dark { background: #f1f5f9; color: #334155; }

/* Data Rows */
.data-row td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.bg-green-light { background: #ecfdf5; }
.bg-blue-light { background: #eff6ff; }
.bg-dark-light { background: #f8fafc; }

/* Tendencias */
.trend-up { color: #16a34a; font-size: 0.7rem; }
.trend-down { color: #dc2626; font-size: 0.7rem; }
.trend-flat { color: #94a3b8; font-weight: bold; }

/* Footer */
.row-total td { background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1; color: #0f172a; padding: 1rem; }

/* SECCIÓN DIARIA (GRID) */
.daily-section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; border-top: 4px solid #0f172a; }
.daily-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
.section-title { font-size: 1rem; font-weight: 800; margin: 0; }
.section-desc { font-size: 0.8rem; color: #64748b; margin: 0; }
.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.75rem; }
.day-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; transition: all 0.2s; }
.day-card.active-day { border-color: #bae6fd; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.1); }
.day-header { background: #f8fafc; padding: 0.5rem; text-align: center; border-bottom: 1px solid #e2e8f0; }
.day-name { display: block; font-size: 0.6rem; font-weight: 800; color: #64748b; }
.day-date { font-weight: 800; font-size: 0.9rem; }
.metric-row { display: flex; justify-content: space-between; padding: 0.25rem 0.5rem; font-size: 0.75rem; }
.metric-row.highlight { background: #22c55e; color: white; font-weight: 700; }

/* ESTILOS GRÁFICOS (DASHBOARD) */
.split-section { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; }
.panel { background: white; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.panel-header { margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
.panel-header h4 { margin: 0; font-size: 0.9rem; font-weight: 800; color: #0f172a; }
.chart-wrapper-medium { height: 280px; }
.chart-wrapper-large { height: 320px; }
.doughnut-container { height: 240px; display: flex; justify-content: center; }

/* FUNNEL CSS (Sin dependencias externas) */
.funnel-container { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1rem; }
.funnel-step { position: relative; margin-bottom: 0.5rem; }
.f-label { font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 2px; }
.f-value { position: absolute; right: 0; top: 0; font-weight: 800; color: #0f172a; }
.f-bar { height: 24px; background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%); border-radius: 4px; transition: width 1s ease; opacity: 0.9; }
.step-1 .f-bar { background: #cbd5e1; } /* Leads - Gris */
.step-2 .f-bar { background: #93c5fd; } /* Contactados - Azul claro */
.step-3 .f-bar { background: #3b82f6; } /* Interesados - Azul medio */
.step-4 .f-bar { background: #10b981; } /* Ventas - Verde Exito */

/* Utilidades Texto */
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-success { color: #16a34a; font-weight: 700; }
.text-danger { color: #dc2626; font-weight: 700; }
.text-blue { color: #2563eb; font-weight: 700; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 700; }

/* Responsive */
@media (max-width: 1024px) { .split-section { grid-template-columns: 1fr; } .days-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 640px) { .filter-bar, .main-header { flex-direction: column; align-items: stretch; } .mini-kpis { border-left: none; padding-left: 0; margin-top: 1rem; justify-content: space-between; } .days-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
