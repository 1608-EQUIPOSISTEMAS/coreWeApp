<template>
  <div class="exec-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Análisis de Eficiencia Operativa (Outbound & Inbound)</span>
            <h1 class="brand-title">Rentabilidad de Seguimiento & Contactabilidad</h1>
          </div>
        </div>
        
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-primary" @click="loadData" :disabled="isLoading">
            <i class="fa-solid fa-rotate-right" :class="{'spin': isLoading}"></i> 
            <span>{{ isLoading ? 'Procesando...' : 'Actualizar Datos' }}</span>
          </button>
        </div>
      </div>

      <div class="masthead-filters">
        <div class="filter-group">
          <label class="filter-label">AÑO</label>
          <select class="exec-select-dark" v-model="filters.year" @change="loadData">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
            <option :value="2024">2024</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">MES</label>
          <select class="exec-select-dark" v-model="filters.month" @change="loadData">
            <option :value="0">Todos los meses (Anual)</option>
            <option :value="1">Enero</option>
            <option :value="2">Febrero</option>
            <option :value="3">Marzo</option>
            <option :value="4">Abril</option>
            <option :value="5">Mayo</option>
            <option :value="6">Junio</option>
            <option :value="7">Julio</option>
            <option :value="8">Agosto</option>
            <option :value="9">Septiembre</option>
            <option :value="10">Octubre</option>
            <option :value="11">Noviembre</option>
            <option :value="12">Diciembre</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">ASESOR</label>
          <select class="exec-select-dark" v-model="filters.advisor" @change="loadData">
            <option value="all">Todos los Asesores</option>
            <option v-for="user in filtroOwners" :key="user.id" :value="user.id">
              {{ user.description }}
            </option>
          </select>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div v-if="isLoading" class="exec-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Analizando registros de contacto...</p>
      </div>

      <div v-else class="fade-in">
        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">INTENTOS DE CONTACTO</span>
              <div class="kpi-indicator ind-slate"></div>
            </div>
            <div class="kpi-card-value">{{ formatNum(globalKPIs.intentos) }}</div>
            <div class="kpi-card-sub text-muted">
              Promedio: <strong class="text-dark">{{ globalKPIs.promIntentos }}</strong> intentos/lead
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">TASA DE CONTACTABILIDAD</span>
              <div class="kpi-indicator" :class="globalKPIs.tasaContactabilidad >= 40 ? 'ind-green' : 'ind-amber'"></div>
            </div>
            <div class="kpi-card-value" :class="globalKPIs.tasaContactabilidad >= 40 ? 'c-green' : 'c-amber'">
              {{ globalKPIs.tasaContactabilidad }}%
            </div>
            <div class="kpi-card-sub text-muted">
              <strong class="text-dark">{{ formatNum(globalKPIs.contactados) }}</strong> leads contactados
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">EFECTIVIDAD DE CIERRE</span>
              <div class="kpi-indicator ind-green"></div>
            </div>
            <div class="kpi-card-value c-green">{{ globalKPIs.tasaConversion }}%</div>
            <div class="kpi-card-sub text-muted">
              <strong class="text-dark">{{ formatNum(globalKPIs.ventas) }}</strong> ventas concretadas
            </div>
          </div>

          <div class="kpi-card kpi-card-highlight">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color: var(--slate-400)">INGRESOS RECUPERADOS</span>
              <div class="kpi-indicator ind-blue"></div>
            </div>
            <div class="kpi-card-value" style="color: var(--white)">
              {{ formatMoney(globalKPIs.ingresos) }}
            </div>
            <div class="kpi-card-sub" style="color: var(--blue-400); font-weight: 600;">
              Por gestión activa de asesores
            </div>
          </div>
        </div>

        <div class="chart-panel mb-4">
          <div class="chart-panel-header d-flex justify-content-between align-items-start">
            <div>
              <div class="chart-panel-title">TENDENCIA HORARIA: DEL INTENTO AL PAGO</div>
              <div class="chart-panel-sub">Correlación entre esfuerzo (llamadas), éxito de contacto y cierre final por franja horaria.</div>
            </div>
            <div class="chart-legend-inline">
              <span class="legend-dot" style="background:#cbd5e1"></span><span>Intentos</span>
              <span class="legend-dot" style="background:var(--blue-600)"></span><span>Contestó</span>
              <span class="legend-dot" style="background:var(--teal-500)"></span><span class="fw-700 text-dark">Pagó</span>
            </div>
          </div>
          <div class="chart-area" style="height: 320px;">
            <Line :data="hourlyFlowChartData" :options="hourlyFlowOptions" />
          </div>
        </div>

        <div class="chart-grid-2 mb-4">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div class="chart-panel-title">CURVA DE PERSISTENCIA</div>
              <div class="chart-panel-sub">Distribución de ventas según el N° de intento de contacto.</div>
            </div>
            <div class="chart-area" style="height: 240px; padding-bottom: 0;">
              <Bar :data="persistenceChartData" :options="persistenceChartOptions" />
            </div>
            <div class="insight-box mt-3">
              <i class="fa-solid fa-lightbulb" style="color: var(--amber-500)"></i>
              <span><strong>Insight:</strong> Evalúa si el esfuerzo después del 4to intento justifica el costo operativo basándote en la caída de esta curva.</span>
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header d-flex justify-content-between align-items-center">
              <div>
                <div class="chart-panel-title">RESULTADOS DE LLAMADA</div>
                <div class="chart-panel-sub">Desglose de motivos categorizados por efectividad.</div>
              </div>
              <div class="toggle-group">
                <button class="toggle-btn" :class="{'active-teal': isEffectiveFilter === 1}" @click="isEffectiveFilter = 1">Efectivos</button>
                <button class="toggle-btn" :class="{'active-red': isEffectiveFilter === 0}" @click="isEffectiveFilter = 0">No Efectivos</button>
              </div>
            </div>
            <div class="chart-area p-0 panel-scroll-area">
              <table class="exec-table">
                <thead>
                  <tr class="thead-sub">
                    <th class="ts ts-c">Razón Registrada</th>
                    <th class="ts ts-c text-right">Frecuencia</th>
                    <th class="ts ts-c text-right">% Total</th>
                    <th class="ts ts-c" style="width: 30%;">Distribución</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(obj, i) in objectionsData" :key="i" class="tbody-row">
                    <td class="td-a fw-600">{{ obj.reason }}</td>
                    <td class="td-a text-right">{{ formatNum(obj.count) }}</td>
                    <td class="td-a text-right fw-700 text-dark">{{ obj.pct }}%</td>
                    <td class="td-a">
                      <div class="progress-track">
                        <div class="progress-fill" :class="isEffectiveFilter === 1 ? 'bg-teal-500' : 'bg-red-500'" :style="`width: ${obj.pct}%`"></div>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="objectionsData.length === 0">
                    <td colspan="4" class="text-center text-muted py-4">No hay registros en esta categoría.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="table-shell mb-4">
          <div class="table-panel-header">
            <h6 class="table-panel-title">MATRIZ DE DESEMPEÑO INDIVIDUAL (ASESORES)</h6>
            <div class="chart-panel-sub">Evaluación de productividad operativa.</div>
          </div>
          
          <div class="table-responsive-custom control-table-wrapper">
            <table class="exec-table">
              <thead>
                <tr class="thead-sub">
                  <th class="ts ts-c sticky-col" style="min-width: 180px;">Asesor</th>
                  <th class="ts ts-c text-right">Leads Gestionados</th>
                  <th class="ts ts-c text-right">Llamadas Realizadas</th>
                  <th class="ts ts-c text-right">Contactos Efectivos</th>
                  <th class="ts ts-c text-right">% Contactabilidad</th>
                  <th class="ts ts-c text-right">Ventas (Cierres)</th>
                  <th class="ts ts-c text-right">Tasa Conversión</th>
                  <th class="ts ts-c text-right">Ingresos</th>
                  <th class="ts ts-c text-right">Duración Prom. (min)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(advisor, index) in aggregatedAdvisors" :key="index" class="tbody-row">
                  <td class="td-a sticky-col fw-700 bg-white">
                    <i class="fa-solid fa-user-tie text-slate-400 me-2"></i>{{ advisor.name }}
                  </td>
                  <td class="td-a text-right">{{ formatNum(advisor.leads) }}</td>
                  <td class="td-a text-right bg-slate-50 fw-600">{{ formatNum(advisor.calls) }}</td>
                  <td class="td-a text-right">{{ formatNum(advisor.contacted) }}</td>
                  <td class="td-a text-right fw-700" :class="getScoreColor(advisor.contactRate)">{{ advisor.contactRate }}%</td>
                  <td class="td-a text-right fw-700 c-green">{{ formatNum(advisor.sales) }}</td>
                  <td class="td-a text-right fw-700">{{ advisor.conversion }}%</td>
                  <td class="td-a text-right fw-600 text-dark">{{ formatMoney(advisor.revenue) }}</td>
                  <td class="td-a text-right text-muted text-mono">{{ advisor.avgTime }}</td>
                </tr>
                <tr v-if="aggregatedAdvisors.length === 0">
                  <td colspan="9" class="text-center text-muted py-4">No hay datos para mostrar en este período.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)
const authService = inject(ServiceKeys.Auth)

const filters = ref({ year: 2026, month: 1, advisor: 'all' })
const isLoading = ref(false)
const rawData = ref([])
const filtroOwners = ref([])

// Toggle para el panel de Objeciones (0 = No Efectivos, 1 = Efectivos)
const isEffectiveFilter = ref(0) 

onMounted(async () => {
  await loadOwners()
  await loadData()
})

async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => ({
      id: u.user_id,
      description: `${u.first_name || ''} ${(u.last_name || '').charAt(0)}.`.trim() || u.alias || `User ${u.user_id}`
    }))
  } catch (e) { console.error("Error cargando usuarios:", e) }
}

async function loadData() {
  isLoading.value = true
  try {
    const payload = {
      year: filters.value.year,
      month: filters.value.month,
      advisor: filters.value.advisor
    }
    const res = await dashboardService.contactabilityList(payload)
    rawData.value = res.items || []
  } catch(e) {
    console.error("Error consultando contactabilidad:", e)
  } finally {
    isLoading.value = false
  }
}

// ==========================================
// LÓGICA DE AGREGACIÓN FRONTEND (COMPUTED)
// ==========================================

const globalKPIs = computed(() => {
  let intentos = 0, contactados = 0, ventas = 0, ingresos = 0, leads = 0;
  
  rawData.value.forEach(r => {
    intentos += r.total_intentos || 0;
    contactados += r.total_contactados || 0;
    ventas += r.total_ventas || 0;
    ingresos += r.ingresos_recuperados || 0;
    leads += r.total_leads_gestionados || 0;
  });

  const tasaContactabilidad = intentos > 0 ? ((contactados / intentos) * 100).toFixed(1) : 0;
  const tasaConversion = contactados > 0 ? ((ventas / contactados) * 100).toFixed(1) : 0;
  const promIntentos = leads > 0 ? (intentos / leads).toFixed(1) : 0;

  return { intentos, contactados, ventas, ingresos, leads, tasaContactabilidad, tasaConversion, promIntentos };
})

const hourlyFlowChartData = computed(() => {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const dataMap = {};
  hours.forEach(h => dataMap[h] = { intentos: 0, contactados: 0, ventas: 0 });

  rawData.value.forEach(row => {
    (row.chart_tendencia_horaria || []).forEach(item => {
      if (dataMap[item.hora]) {
        dataMap[item.hora].intentos += item.intentos || 0;
        dataMap[item.hora].contactados += item.contactados || 0;
        dataMap[item.hora].ventas += item.ventas || 0;
      }
    });
  });

  return {
    labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
    datasets: [
      { 
        label: 'Intentos', 
        data: hours.map(h => dataMap[h].intentos), 
        borderColor: '#cbd5e1', 
        backgroundColor: 'rgba(203, 213, 225, 0.2)', 
        fill: true, tension: 0.4, order: 3, 
        yAxisID: 'y' // <--- Eje izquierdo (escala grande)
      },
      { 
        label: 'Contestó', 
        data: hours.map(h => dataMap[h].contactados), 
        borderColor: '#2563eb', 
        backgroundColor: '#2563eb', 
        tension: 0.3, borderWidth: 2, pointRadius: 2, order: 2, 
        yAxisID: 'y1' // <--- CAMBIO AQUÍ: Eje derecho (escala pequeña)
      },
      { 
        label: 'PAGÓ (Cierre)', 
        data: hours.map(h => dataMap[h].ventas), 
        borderColor: '#12274e', 
        backgroundColor: '#12274e', 
        type: 'bar', barPercentage: 0.5, borderRadius: 3, order: 1, 
        yAxisID: 'y1' // <--- Eje derecho (escala pequeña)
      }
    ]
  }
})
const baseFont = { family: 'inherit', size: 11 }
const hourlyFlowOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: baseFont } },
    y: { type: 'linear', position: 'left', beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: baseFont } },
    y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { display: false }, ticks: { font: baseFont, color: '#12274e', stepSize: 1 } }
  }
}

const persistenceChartData = computed(() => {
  const pMap = { 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 };
  
  rawData.value.forEach(row => {
    (row.chart_curva_persistencia || []).forEach(item => {
      if (item.intento_num >= 5) {
        pMap['5+'] += item.ventas;
      } else if (item.intento_num >= 1 && item.intento_num <= 4) {
        pMap[item.intento_num] += item.ventas;
      }
    });
  });

  return {
    labels: ['1er Intento', '2do Intento', '3er Intento', '4to Intento', '5to+'],
    datasets: [{
      label: 'Ventas Cerradas',
      data: [pMap[1], pMap[2], pMap[3], pMap[4], pMap['5+']],
      backgroundColor: [ '#94a3b8', '#0ea5e9', '#3b82f6', '#1d4ed8', '#0f172a' ],
      borderRadius: 3
    }]
  }
})

const persistenceChartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { display: false }, x: { grid: { display: false }, ticks: { font: baseFont } } }
}

// Tabla de objeciones filtrada por el toggle "isEffectiveFilter"
const objectionsData = computed(() => {
  const objMap = {};
  let totalObj = 0;
  
  rawData.value.forEach(row => {
    (row.chart_objeciones || []).forEach(item => {
      // Filtrar según el botón seleccionado (Efectivos vs No Efectivos)
      if (item.es_efectivo === isEffectiveFilter.value) {
        const nom = item.nombre || 'Desconocido';
        if (!objMap[nom]) objMap[nom] = 0;
        objMap[nom] += item.frecuencia;
        totalObj += item.frecuencia;
      }
    });
  });

  return Object.entries(objMap)
    .map(([reason, count]) => ({
      reason,
      count,
      pct: totalObj > 0 ? Math.round((count / totalObj) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6); // Mostrar Top 6
})

const aggregatedAdvisors = computed(() => {
  const advMap = {};

  rawData.value.forEach(r => {
    if (!advMap[r.cod_asesor]) {
      advMap[r.cod_asesor] = {
        name: r.asesor_nombre || r.asesor_alias,
        leads: 0, calls: 0, contacted: 0, sales: 0, revenue: 0, 
        sumTime: 0, countTime: 0
      }
    }
    const a = advMap[r.cod_asesor];
    a.leads += r.total_leads_gestionados;
    a.calls += r.total_intentos;
    a.contacted += r.total_contactados;
    a.sales += r.total_ventas;
    a.revenue += r.ingresos_recuperados;
    
    if (r.tiempo_prom_minutos > 0) {
      a.sumTime += r.tiempo_prom_minutos;
      a.countTime++;
    }
  });

  return Object.values(advMap).map(a => {
    const contactRate = a.calls > 0 ? ((a.contacted / a.calls) * 100).toFixed(1) : 0;
    const conversion = a.contacted > 0 ? ((a.sales / a.contacted) * 100).toFixed(1) : 0;
    const avgTime = a.countTime > 0 ? (a.sumTime / a.countTime).toFixed(1) : 0;
    
    return { ...a, contactRate, conversion, avgTime };
  }).sort((a, b) => b.sales - a.sales);
})

const formatNum = (v) => new Intl.NumberFormat('es-PE').format(v || 0)
const formatMoney = (v) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v || 0)

const getScoreColor = (rate) => {
  const r = Number(rate);
  if (r >= 40) return 'c-green'
  if (r >= 25) return 'c-amber'
  return 'c-red'
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   TOKENS Y BASE
═══════════════════════════════════════════════ */
:root {
  --navy-900: #0f172a; --navy-800: #1e293b; --navy-700: #334155;
  --slate-400: #94a3b8; --slate-300: #cbd5e1; --slate-100: #f1f5f9; --slate-50:  #f8fafc;
  --teal-600:  #12274e; --teal-500:  #12274e;
  --blue-600:  #2563eb; --blue-400:  #60a5fa;
  --purple-500:#8b5cf6;
  --amber-500: #f59e0b;
  --red-600:   #dc2626; --red-500:   #ef4444;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;
}

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

.exec-shell {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: var(--slate-50); min-height: 100vh;
  display: flex; flex-direction: column; color: var(--text-primary);
}

/* ═══════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════ */
.exec-masthead { background: var(--navy-900); color: var(--white); border-bottom: 1px solid var(--navy-700); }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 20px 28px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.masthead-brand { display: flex; align-items: center; gap: 14px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500); border-radius: 4px; }
.brand-eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--slate-400); font-weight: 600; display: block; margin-bottom: 2px; }
.brand-title { font-size: 20px; font-weight: 700; margin: 0; color: var(--white); letter-spacing: -0.02em; }

.masthead-actions { display: flex; gap: 8px; align-items: center; }
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; font-family: inherit; }
.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.masthead-filters { display: flex; align-items: center; gap: 0; padding: 0 28px; min-height: 52px; }
.filter-group { display: flex; flex-direction: column; gap: 2px; padding: 10px 20px 10px 0; }
.filter-label { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--slate-400); font-weight: 600; cursor: default; }
.filter-sep { width: 1px; height: 32px; background: rgba(255,255,255,0.1); margin: 0 20px 0 0; }

.exec-select-dark { 
  background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.18); 
  color: var(--white); font-family: inherit; font-size: 12.5px; font-weight: 500; 
  padding: 3px 0; outline: none; cursor: pointer; min-width: 140px; 
}
.exec-select-dark option { color: var(--text-primary); background: var(--white); }

/* ═══════════════════════════════════════════════
   CUERPO Y KPIs
═══════════════════════════════════════════════ */
.exec-body { padding: 24px 28px; flex: 1; }

.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; }
.loader-ring { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--teal-600); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loader-text { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.kpi-card { background: var(--white); border: 1px solid rgba(15,23,42,0.08); border-radius: 8px; padding: 18px 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04); transition: transform 0.2s; }
.kpi-card:hover { transform: translateY(-3px); }
.kpi-card-highlight { background: var(--navy-900); border-color: var(--navy-800); }

.kpi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kpi-card-label { font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; font-weight: 700; color: var(--text-muted); }
.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-slate { background: var(--slate-400); } .ind-amber { background: var(--amber-500); } .ind-green { background: #22c55e; } .ind-blue { background: var(--blue-600); }

.kpi-card-value { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; font-variant-numeric: tabular-nums; }
.kpi-card-sub { font-size: 11px; font-weight: 500; }

/* ═══════════════════════════════════════════════
   GRÁFICOS, PANELES Y TOGGLE
═══════════════════════════════════════════════ */
.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.chart-panel { background: var(--white); border: 1px solid rgba(15,23,42,0.08); border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); display: flex; flex-direction: column; overflow: hidden; }
.chart-panel-header { padding: 16px 20px; border-bottom: 1px solid var(--slate-100); background: #fafbfc; }
.chart-panel-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }
.chart-panel-sub { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
.chart-area { padding: 20px; flex: 1; }

.chart-legend-inline { display: flex; gap: 14px; align-items: center; font-size: 11.5px; color: var(--text-secondary); }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }
.insight-box { background: var(--slate-50); border-top: 1px solid var(--border); padding: 12px 20px; font-size: 11.5px; color: var(--text-secondary); display: flex; gap: 10px; align-items: flex-start; line-height: 1.5; }

/* Toggle Button Group */
.toggle-group { display: flex; background: var(--slate-100); border-radius: 4px; padding: 2px; }
.toggle-btn { background: transparent; border: none; padding: 4px 12px; font-size: 11px; font-weight: 600; color: var(--text-secondary); border-radius: 3px; cursor: pointer; transition: all 0.2s; }
.toggle-btn.active-teal { background: var(--white); color: var(--teal-600); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.toggle-btn.active-red { background: var(--white); color: var(--red-600); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

/* ═══════════════════════════════════════════════
   TABLAS (EXEC-TABLE)
═══════════════════════════════════════════════ */
.table-shell { background: var(--white); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); }
.table-panel-header { padding: 16px 20px; background: #fafbfc; border-bottom: 1px solid var(--border); }
.table-panel-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }

.control-table-wrapper { width: 100%; overflow-x: auto; max-height: 50vh; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12px; }

.thead-sub .ts { padding: 10px 14px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border); text-align: left; color: var(--text-secondary); background: #fafbfc; }

.tbody-row { transition: background 0.15s; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50); vertical-align: middle; color: var(--text-primary); }
.tbody-row:hover td:not(.sticky-col) { background: #f8fafc; cursor: pointer; }

.tfoot-row td { background: var(--slate-50); border-top: 2px solid var(--border); padding: 12px 14px; font-size: 11.5px; font-weight: 700; color: var(--text-secondary); }

/* Barras de progreso en tabla */
.progress-track { width: 100%; height: 6px; background: var(--slate-100); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease, background-color 0.4s; }
.bg-teal-500 { background: var(--teal-500); }
.bg-red-500 { background: var(--red-500); }

/* Sticky Col (Matriz) */
.sticky-col { position: sticky; left: 0; z-index: 2; box-shadow: 2px 0 5px -2px rgba(0,0,0,0.15); }
.exec-table tbody .sticky-col { border-right: 2px solid var(--border); }
.exec-table thead .sticky-col, .exec-table tfoot .sticky-col { z-index: 3; background: #fafbfc; border-right: 2px solid var(--border); }
.exec-table tfoot .sticky-col { background: var(--slate-50); }

/* Helper Classes */
.text-center { text-align: center; } .text-right { text-align: right; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-dark { color: var(--text-primary); } .text-muted { color: var(--text-muted); }
.c-green { color: #15803d; } .c-red { color: #dc2626; } .c-amber { color: #d97706; }
.bg-slate-50 { background: var(--slate-50); }
.text-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.p-0 { padding: 0 !important; }

/* Animaciones */
.fade-in { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .chart-grid-2 { grid-template-columns: 1fr; }
}
</style>