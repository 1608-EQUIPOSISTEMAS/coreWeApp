<template>
  <div class="system-container">
    
    <div class="main-header">
      <div>
        <h1 class="system-title">SEGUIMIENTO COMERCIAL & EQUIPO DE VENTAS</h1>
        <p class="system-subtitle">SEM 3 (12 ENE - 18 ENE) - RENDIMIENTO GENERAL</p>
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

    <div v-if="!isDashboard" class="view-container animate-fade">
      
      <div class="table-card mb-8">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr class="header-group">
                <th colspan="3" class="text-left">DATOS DEL ASESOR</th>
                <th colspan="3" class="group-blue">OBJETIVOS Y RESULTADOS</th>
                <th colspan="3" class="group-gray">GESTIÓN (CONTACTOS)</th>
                <th colspan="2" class="group-dark">EFICIENCIA</th>
              </tr>
              <tr class="header-cols">
                <th>#</th>
                <th>ASESOR</th>
                <th>CÓDIGO</th>
                <th class="sub-blue">META</th>
                <th class="sub-blue">VENTA</th>
                <th class="sub-blue">FALTA</th>
                <th class="sub-gray">TOTAL CON.</th>
                <th class="sub-gray">ACTIVOS</th>
                <th class="sub-gray">% GESTIÓN</th>
                <th class="sub-dark">% CONVERSIÓN</th>
                <th class="sub-dark">STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in tableData" :key="index" class="data-row">
                <td class="text-muted text-center">{{ index + 1 }}</td>
                <td class="font-medium text-dark">{{ row.asesor }}</td>
                <td><span class="badge badge-gray">{{ row.cod }}</span></td>
                <td class="text-center bg-blue-light">{{ row.obj }}</td>
                <td class="text-center bg-blue-light font-bold text-dark">{{ row.ven }}</td>
                <td class="text-center bg-blue-light">
                  <span :class="row.falta > 0 ? 'text-danger' : 'text-success'">
                    {{ row.falta > 0 ? '-' + row.falta : '✓' }}
                  </span>
                </td>
                <td class="text-center">{{ row.contactos }}</td>
                <td class="text-center text-muted">{{ Math.round(row.contactos * 0.8) }}</td>
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
                 <td class="text-center font-bold">{{ totals.obj }}</td>
                 <td class="text-center font-bold text-blue">{{ totals.ven }}</td>
                 <td class="text-center font-bold text-danger">-{{ totals.falta }}</td>
                 <td class="text-center">{{ totals.contactos }}</td>
                 <td class="text-center">-</td>
                 <td class="text-center">-</td>
                 <td class="text-center font-bold">{{ totals.avgConv }}%</td>
                 <td class="text-center">{{ ((totals.ven / totals.obj)*100).toFixed(0) }}% LOGRO</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="daily-section animate-slide-up">
        
        <div class="daily-header">
          <div>
            <h3 class="section-title">DESGLOSE DIARIO DE GESTIÓN</h3>
            <p class="section-desc">Selecciona un asesor para ver su evolución día a día</p>
          </div>

          <div class="filter-wrapper">
            <label class="filter-label">Filtrar por Asesor *</label>
            <select v-model="selectedAdvisorCode" class="custom-select">
              <option value="ALL">TOTAL EQUIPO (Consolidado)</option>
              <option v-for="adv in tableData" :key="adv.cod" :value="adv.cod">
                {{ adv.asesor }}
              </option>
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
              <div class="metric-row">
                <span class="metric-label">CON (Leads)</span>
                <span class="metric-val">{{ day.con }}</span>
              </div>
              <div class="metric-row highlight">
                <span class="metric-label">VEN (Ventas)</span>
                <span class="metric-val">{{ day.ven }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">% Conv.</span>
                <span class="metric-val" :class="getConvClass(day.conv)">{{ day.conv }}%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <div v-else class="marketing-dashboard animate-fade">
      <div class="kpi-strip">
        <div class="kpi-box">
          <span class="kpi-label">META SEMANAL (OBJ)</span>
          <span class="kpi-value">{{ totals.obj }}</span>
        </div>
        <div class="kpi-box highlight">
          <span class="kpi-label">VENTAS CERRADAS</span>
          <span class="kpi-value">{{ totals.ven }}</span>
          <span class="kpi-delta positive">{{ ((totals.ven / totals.obj)*100).toFixed(1) }}% Avance</span>
        </div>
        <div class="kpi-box">
          <span class="kpi-label">CONTACTOS PROCESADOS</span>
          <span class="kpi-value">{{ totals.contactos }}</span>
        </div>
         <div class="kpi-box">
          <span class="kpi-label">MEJOR DÍA</span>
          <span class="kpi-value text-blue">MIÉRCOLES</span>
          <span class="kpi-sub">39 Ventas (41% Conv)</span>
        </div>
      </div>

      <div class="split-section">
        <div class="panel">
          <div class="panel-header"><h4>CUMPLIMIENTO DE CUOTA</h4></div>
          <div class="chart-wrapper-medium"><Bar :data="salesChartData" :options="groupedBarOptions" /></div>
        </div>
        <div class="panel">
          <div class="panel-header"><h4>PARTICIPACIÓN EN VENTAS</h4></div>
           <div class="doughnut-container"><Doughnut :data="shareChartData" :options="doughnutOptions" /></div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, Title, Tooltip, Legend, ArcElement)

// --- ESTADO ---
const isDashboard = ref(false)
const selectedAdvisorCode = ref('ALL') // Estado para el filtro
const toggleView = () => isDashboard.value = !isDashboard.value

// --- DATA PRINCIPAL (HE AÑADIDO EL ARRAY "DAILY" BASADO EN TUS IMÁGENES) ---
const tableData = [
  { 
    asesor: 'Camilo', cod: 'CA36', obj: 32, ven: 13, falta: 19, contactos: 118, conv: 11,
    daily: [
      { name: 'LUNES', date: '12/1', con: 49, ven: 2, conv: 4 },
      { name: 'MARTES', date: '13/1', con: 29, ven: 6, conv: 21 },
      { name: 'MIÉRCOLES', date: '14/1', con: 40, ven: 5, conv: 13 },
      { name: 'JUEVES', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIERNES', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁBADO', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOMINGO', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  },
  { 
    asesor: 'Arleth', cod: 'AE30', obj: 38, ven: 35, falta: 3, contactos: 113, conv: 31,
    daily: [
      { name: 'LUNES', date: '12/1', con: 57, ven: 14, conv: 25 },
      { name: 'MARTES', date: '13/1', con: 36, ven: 8, conv: 22 },
      { name: 'MIÉRCOLES', date: '14/1', con: 20, ven: 13, conv: 65 }, // ¡Gran día!
      { name: 'JUEVES', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIERNES', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁBADO', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOMINGO', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  },
  { 
    asesor: 'Grecia', cod: 'GR39', obj: 36, ven: 16, falta: 20, contactos: 266, conv: 6,
    daily: [
      { name: 'LUNES', date: '12/1', con: 111, ven: 1, conv: 1 },
      { name: 'MARTES', date: '13/1', con: 119, ven: 4, conv: 3 },
      { name: 'MIÉRCOLES', date: '14/1', con: 36, ven: 11, conv: 31 },
      { name: 'JUEVES', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIERNES', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁBADO', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOMINGO', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  },
  { 
    asesor: 'Fabiana', cod: 'SF13', obj: 25, ven: 17, falta: 8, contactos: 6, conv: 283,
    daily: [
      { name: 'LUNES', date: '12/1', con: 6, ven: 7, conv: 117 }, // Dato atípico replicado
      { name: 'MARTES', date: '13/1', con: 0, ven: 6, conv: 0 },
      { name: 'MIÉRCOLES', date: '14/1', con: 0, ven: 4, conv: 0 },
      { name: 'JUEVES', date: '15/1', con: 0, ven: 0, conv: 0 },
      { name: 'VIERNES', date: '16/1', con: 0, ven: 0, conv: 0 },
      { name: 'SÁBADO', date: '17/1', con: 0, ven: 0, conv: 0 },
      { name: 'DOMINGO', date: '18/1', con: 0, ven: 0, conv: 0 }
    ]
  },
  // Datos dummy para rellenar el resto
  { asesor: 'Gerard', cod: 'GA38', obj: 12, ven: 9, falta: 3, contactos: 0, conv: 0, daily: Array(7).fill({name:'', date:'', con:0, ven:0, conv:0}) },
  { asesor: 'WEB', cod: 'WEB', obj: 23, ven: 8, falta: 15, contactos: 0, conv: 0, daily: Array(7).fill({name:'', date:'', con:0, ven:0, conv:0}) }
]

// --- LÓGICA DE NEGOCIO ---

// 1. Calculador de Totales (Footer Tabla)
const totals = computed(() => {
  const t = tableData.reduce((acc, row) => {
    acc.obj += row.obj; acc.ven += row.ven; acc.falta += row.falta; acc.contactos += row.contactos;
    return acc
  }, { obj: 0, ven: 0, falta: 0, contactos: 0 })
  t.avgConv = Math.round((t.ven / (t.contactos || 1)) * 100)
  return t
})

// 2. Lógica del Desglose Diario (El Filtro)
const currentDailyStats = computed(() => {
  // Si seleccionamos un asesor específico
  if (selectedAdvisorCode.value !== 'ALL') {
    const advisor = tableData.find(a => a.cod === selectedAdvisorCode.value)
    return advisor ? advisor.daily : []
  }

  // Si seleccionamos ALL, sumamos día por día (Lunes con Lunes, Martes con Martes...)
  // Base: Usamos las fechas de Camilo como referencia
  return tableData[0].daily.map((dayRef, index) => {
    let sumCon = 0, sumVen = 0
    tableData.forEach(adv => {
       if(adv.daily && adv.daily[index]) {
         sumCon += adv.daily[index].con
         sumVen += adv.daily[index].ven
       }
    })
    return {
      name: dayRef.name,
      date: dayRef.date,
      con: sumCon,
      ven: sumVen,
      conv: sumCon > 0 ? Math.round((sumVen/sumCon)*100) : 0
    }
  })
})


// 3. Estilos
const getConvClass = (val) => val > 20 ? 'text-success' : (val >= 10 ? 'text-blue' : 'text-muted')
const getStatusColor = (ven, obj) => {
  if (obj === 0) return 'bg-gray'
  const pct = ven / obj
  if (pct >= 0.9) return 'bg-green'
  if (pct >= 0.5) return 'bg-yellow'
  return 'bg-red'
}

// 4. Data Gráficos
const salesChartData = computed(() => {
  const active = tableData.filter(d => d.obj > 0)
  return {
    labels: active.map(d => d.asesor),
    datasets: [
      { label: 'Meta', data: active.map(d => d.obj), backgroundColor: '#cbd5e1' },
      { label: 'Real', data: active.map(d => d.ven), backgroundColor: '#0f172a' }
    ]
  }
})
const shareChartData = computed(() => {
  const top = tableData.filter(d => d.ven > 0)
  return { labels: top.map(d => d.asesor), datasets: [{ data: top.map(d => d.ven), backgroundColor: ['#0f172a','#334155','#64748b','#94a3b8'], borderWidth: 0 }] }
})
const groupedBarOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } }

</script>


<style scoped>
/* --- 1. BASE Y LAYOUT DEL SISTEMA --- */
.system-container {
  font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #f8fafc; /* Fondo gris muy suave corporativo */
  min-height: 100vh;
  color: #0f172a; /* Slate 900 */
}

/* Animaciones de entrada */
.animate-fade { animation: fadeIn 0.4s ease-in-out; }
.animate-slide-up { animation: slideUp 0.5s ease-out; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* --- 2. HEADER PRINCIPAL --- */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 1.5rem;
}

.system-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  color: #0f172a;
}

.system-subtitle {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b; /* Slate 500 */
  margin-top: 0.25rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* BOTÓN TOGGLE (Estilo "Píldora" Premium) */
.btn-toggle {
  background: #0f172a;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06);
}
.btn-toggle:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
}
.btn-toggle:active { transform: translateY(0); }

/* --- 3. ESTILOS DE LA TABLA (DATAGRID) --- */
.view-container { display: flex; flex-direction: column; gap: 2rem; }

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden; /* Para que los bordes redondeados corten la tabla */
}

.table-wrapper { width: 100%; overflow-x: auto; }

table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }

/* Encabezados y Grupos */
thead th {
  padding: 0.85rem 1rem;
  font-weight: 700;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
}

.header-group th {
  text-align: center;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  border-bottom: none;
  padding-bottom: 0.25rem;
  padding-top: 1rem;
}

/* Colores de Agrupación (Headers) */
.group-blue { background: #eff6ff; color: #1e40af; border-left: 2px solid white; }
.group-gray { background: #f8fafc; color: #475569; border-left: 2px solid white; }
.group-dark { background: #f1f5f9; color: #0f172a; border-left: 2px solid white; }

.header-cols th { font-size: 0.75rem; border-top: none; padding-bottom: 1rem; }
.sub-blue { background: #eff6ff; color: #1d4ed8; }
.sub-gray { background: #f8fafc; color: #64748b; }
.sub-dark { background: #f1f5f9; color: #334155; }

/* Celdas y Filas */
.data-row td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.data-row:hover { background-color: #f8fafc; transition: background 0.15s; }
.data-row:last-child td { border-bottom: none; }

/* Footer de Totales */
.row-total td {
  background: #f1f5f9;
  font-weight: 800;
  border-top: 2px solid #cbd5e1;
  color: #0f172a;
  padding: 1rem;
}

/* Utilidades de Texto y Color en Tabla */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-muted { color: #94a3b8; }
.text-dark { color: #0f172a; }
.text-xs { font-size: 0.75rem; }
.font-bold { font-weight: 700; }
.font-medium { font-weight: 600; }

.bg-blue-light { background: #eff6ff; }
.bg-dark-light { background: #f8fafc; }

/* Estados de semáforo */
.text-success { color: #16a34a; font-weight: 700; }
.text-danger { color: #dc2626; font-weight: 700; }
.text-blue { color: #2563eb; font-weight: 700; }

/* Badges (Etiquetas) */
.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.badge-gray { background: #e2e8f0; color: #475569; font-family: 'Roboto Mono', monospace; }

/* Círculos de Status */
.circle-status { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.bg-green { background-color: #22c55e; box-shadow: 0 0 0 2px #bbf7d0; }
.bg-yellow { background-color: #eab308; box-shadow: 0 0 0 2px #fef08a; }
.bg-red { background-color: #ef4444; box-shadow: 0 0 0 2px #fecaca; }
.bg-gray { background-color: #cbd5e1; }


/* --- 4. NUEVA SECCIÓN: DESGLOSE DIARIO --- */
.daily-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  /* Borde superior decorativo */
  border-top: 4px solid #0f172a;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
}

.daily-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: -0.01em; }
.section-desc { font-size: 0.9rem; color: #64748b; margin: 0.25rem 0 0; }

/* Filtro estilo "Input Material" (Tu imagen) */
.filter-wrapper { position: relative; min-width: 280px; }
.filter-label {
  font-size: 0.75rem;
  color: #dc2626; /* Rojo solicitado */
  font-weight: 700;
  margin-bottom: 6px;
  display: block;
  text-transform: uppercase;
}
.custom-select {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background-color: white;
  color: #334155;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  appearance: none; /* Elimina flecha default en algunos navegadores */
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem top 50%;
  background-size: 0.65rem auto;
  transition: border 0.2s, box-shadow 0.2s;
}
.custom-select:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }

/* Grilla de Días */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1rem;
}

.day-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}
/* Efecto hover y activo para destacar días con ventas */
.day-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
.day-card.active-day { border-color: #bae6fd; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.1); }

.day-header {
  background: #f8fafc;
  padding: 0.75rem 0.5rem;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
}
.day-name { display: block; font-size: 0.65rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; margin-bottom: 2px; }
.day-date { display: block; font-size: 1rem; font-weight: 800; color: #0f172a; }

.day-body { padding: 0.75rem 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

/* El Highlight verde tipo Excel para Ventas */
.metric-row.highlight {
  background-color: #22c55e; /* Verde Excel vibrante */
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);
}
.metric-row.highlight .metric-label { color: rgba(255,255,255,0.9); }
.metric-row.highlight .metric-val { color: white; font-size: 0.9rem; }

.metric-label { font-size: 0.7rem; color: #64748b; font-weight: 600; }
.metric-val { font-weight: 700; color: #0f172a; }


/* --- 5. ESTILOS DASHBOARD GRAFICO --- */
.marketing-dashboard { display: flex; flex-direction: column; gap: 2rem; }

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.kpi-box {
  background: white;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.kpi-box.highlight {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}
.kpi-box.highlight .kpi-label, .kpi-box.highlight .kpi-sub { color: #94a3b8; }
.kpi-box.highlight .kpi-value { color: white; }

.kpi-label { font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
.kpi-value { font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; margin-bottom: 0.5rem; }
.kpi-sub { font-size: 0.8rem; color: #64748b; }

.kpi-delta { font-size: 0.85rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; width: fit-content; }
.kpi-delta.positive { background: #dcfce7; color: #166534; }
.kpi-delta.negative { background: #fee2e2; color: #991b1b; }

/* Paneles de Gráficos */
.split-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}
.panel, .section-container {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.panel-header { margin-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; }
.panel-header h4, .chart-header h3 { margin: 0; font-size: 1rem; font-weight: 800; text-transform: uppercase; color: #0f172a; }
.panel-header p, .chart-desc { margin: 0.25rem 0 0; font-size: 0.85rem; color: #64748b; }

.chart-wrapper-medium { height: 320px; width: 100%; }
.chart-wrapper-large { height: 380px; width: 100%; }
.doughnut-container { height: 260px; display: flex; justify-content: center; }

/* Responsive */
@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .split-section { grid-template-columns: 1fr; }
  .days-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .days-grid { grid-template-columns: repeat(2, 1fr); }
  .main-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .kpi-strip { grid-template-columns: 1fr; }
}
</style>