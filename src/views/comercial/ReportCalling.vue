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
            <svg :class="{ 'spin': isLoading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {{ isLoading ? 'Procesando…' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

      <div class="masthead-filters">
        <div class="filter-group">
          <label class="filter-label">AÑO</label>
          <select class="exec-select" v-model="filters.year" @change="loadData">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
            <option :value="2024">2024</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">MES</label>
          <select class="exec-select" v-model="filters.month" @change="loadData">
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
        <div class="filter-sep" v-if="!isStrictlyComercial"></div>
        <div class="filter-group" v-if="!isStrictlyComercial">
          <label class="filter-label">ASESOR</label>
          <select class="exec-select" v-model="filters.advisor" @change="loadData">
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
        <p class="loader-text">Analizando registros de contacto…</p>
      </div>

      <div v-else class="fade-in">

        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">INTENTOS DE CONTACTO</span>
              <div class="kpi-indicator ind-slate"></div>
            </div>
            <div class="kpi-card-value">{{ formatNum(globalKPIs.intentos) }}</div>
            <div class="kpi-card-sub">
              Promedio: <strong>{{ globalKPIs.promIntentos }}</strong> intentos/lead
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
            <div class="kpi-card-sub">
              <strong>{{ formatNum(globalKPIs.contactados) }}</strong> leads contactados
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">EFECTIVIDAD DE CIERRE</span>
              <div class="kpi-indicator ind-green"></div>
            </div>
            <div class="kpi-card-value c-green">{{ globalKPIs.tasaConversion }}%</div>
            <div class="kpi-card-sub">
              <strong>{{ formatNum(globalKPIs.ventas) }}</strong> ventas concretadas
            </div>
          </div>

          <div class="kpi-card kpi-card-highlight">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color: var(--gold-400, #fbbf24)">INGRESOS RECUPERADOS</span>
              <div class="kpi-indicator ind-blue"></div>
            </div>
            <div class="kpi-card-value" style="color: var(--white, #ffffff)">
              {{ formatMoney(globalKPIs.ingresos) }}
            </div>
            <div class="kpi-card-sub" style="color: var(--gold-400, #fbbf24); font-weight: 600;">
              Por gestión activa de asesores
            </div>
          </div>
        </div>

        <div class="chart-panel mb-4">
          <div class="chart-panel-header">
            <div>
              <div class="chart-panel-title">Tendencia Horaria: Del Intento al Pago</div>
              <div class="chart-panel-sub">Correlación entre esfuerzo (llamadas), éxito de contacto y cierre final por franja horaria.</div>
            </div>
            <div class="chart-legend-inline">
              <span class="legend-dot" style="background:#f87171; border-radius:2px;"></span>
              <span>% No Contactados</span>
              <span class="legend-dot" style="background:#2563eb; border-radius:50%;"></span>
              <span>% Contactados Efectivos</span>
              <span class="legend-dot" style="background:#0f766e; border-radius:50%;"></span>
              <span>% Cierre s/ Intentos</span>
            </div>
          </div>
          <div class="chart-area" style="height: 320px;">
            <Line :data="hourlyFlowChartData" :options="hourlyFlowOptions" />
          </div>
        </div>

        <div class="chart-grid-2 mb-4">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Curva de Persistencia</div>
                <div class="chart-panel-sub">
                  Las líneas usan el eje derecho (0–100%). Las barras muestran volumen de intentos (eje izquierdo).
                </div>
              </div>
            </div>
            <div class="chart-area" style="height: 240px; padding-bottom: 0;">
              <Bar :data="persistenceChartData" :options="persistenceChartOptions" />
            </div>
            <div class="insight-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0; margin-top:1px;">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span><strong>Insight:</strong> {{ persistenceInsight }}</span>
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Resultados de Llamada</div>
                <div class="chart-panel-sub">Desglose de motivos categorizados por efectividad.</div>
              </div>
              <div class="toggle-group">
                <button class="toggle-btn" :class="{'toggle-active-teal': isEffectiveFilter === 1}" @click="isEffectiveFilter = 1">Efectivos</button>
                <button class="toggle-btn" :class="{'toggle-active-red': isEffectiveFilter === 0}" @click="isEffectiveFilter = 0">No Efectivos</button>
              </div>
            </div>
            <div class="panel-scroll-area">
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
                    <td class="td-c fw-600">{{ obj.reason }}</td>
                    <td class="td-c text-right">{{ formatNum(obj.count) }}</td>
                    <td class="td-c text-right fw-700">{{ obj.pct }}%</td>
                    <td class="td-c">
                      <div class="progress-track">
                        <div
                          class="progress-fill"
                          :class="isEffectiveFilter === 1 ? 'fill-teal' : 'fill-red'"
                          :style="`width: ${obj.pct}%`"
                        ></div>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="objectionsData.length === 0">
                    <td colspan="4" class="text-center text-muted" style="padding: 24px;">No hay registros en esta categoría.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="table-shell mb-4" v-if="!isStrictlyComercial">
          <div class="chart-panel-header">
            <div>
              <div class="chart-panel-title">Matriz de Desempeño Individual — Asesores</div>
              <div class="chart-panel-sub">Evaluación de productividad operativa por asesor en el período seleccionado.</div>
            </div>
          </div>

          <div class="table-responsive-custom control-table-wrapper">
            <table class="exec-table">
              <thead>
                <tr class="thead-sub">
                  <th class="ts ts-a sticky-col" style="min-width: 180px;">Asesor</th>
                  <th class="ts ts-b text-right">Leads Gestionados</th>
                  <th class="ts ts-b text-right">Llamadas Realizadas</th>
                  <th class="ts ts-b text-right">Contactos Efectivos</th>
                  <th class="ts ts-b text-right">% Contactabilidad</th>
                  <th class="ts ts-b text-right">Ventas (Cierres)</th>
                  <th class="ts ts-b text-right">Tasa Conversión</th>
                  <th class="ts ts-b text-right">Ingresos</th>
                  <th class="ts ts-b text-right">Duración Prom. (min)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(advisor, index) in aggregatedAdvisors" :key="index" class="tbody-row">
                  <td class="td-a sticky-col fw-700">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; color: var(--slate-400, #94a3b8); vertical-align: middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {{ advisor.name }}
                  </td>
                  <td class="td-b text-right">{{ formatNum(advisor.leads) }}</td>
                  <td class="td-b text-right fw-600">{{ formatNum(advisor.calls) }}</td>
                  <td class="td-b text-right">{{ formatNum(advisor.contacted) }}</td>
                  <td class="td-b text-right fw-700" :class="getScoreColor(advisor.contactRate)">{{ advisor.contactRate }}%</td>
                  <td class="td-b text-right fw-700 c-green">{{ formatNum(advisor.sales) }}</td>
                  <td class="td-b text-right fw-700">{{ advisor.conversion }}%</td>
                  <td class="td-b text-right fw-600">{{ formatMoney(advisor.revenue) }}</td>
                  <td class="td-b text-right text-muted text-mono">{{ advisor.avgTime }}</td>
                </tr>
                <tr v-if="aggregatedAdvisors.length === 0">
                  <td colspan="9" class="text-center text-muted" style="padding: 24px;">No hay datos para mostrar en este período.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div class="pending-shell mb-4" v-if="Object.keys(pendingTasksByOrigin).length > 0">
        <div class="chart-panel-header" style="border-radius: 6px 6px 0 0; background: var(--white); border: 1px solid var(--border); border-bottom: none;">
          <div>
            <div class="chart-panel-title">
              {{ isStrictlyComercial ? 'Mi Agenda Operativa: Llamadas Pendientes' : 'Agenda Operativa Global: Intentos Pendientes' }}
            </div>
            <div class="chart-panel-sub">Llamadas programadas agrupadas por el origen de la regla o gestión.</div>
          </div>
        </div>

        <div class="pending-grid">
          <div v-for="(group, alias) in pendingTasksByOrigin" :key="alias" class="pending-card">
            <div class="pending-card-header">
              <span class="pending-origin-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                {{ group.desc }}
              </span>
              <span class="pending-badge">{{ group.leads.length }}</span>
            </div>

            <div class="pending-list-scroll">
              <div v-for="lead in group.leads" :key="lead.lead_id" class="pending-item">
                <div class="pending-item-info">
                  <div class="pending-lead-name">{{ lead.lead_name }}</div>
                  <div class="pending-lead-meta">
                    Intento #{{ lead.attempt_number }} •
                    <span :class="new Date(lead.contact_datetime) < new Date() ? 'c-red' : 'c-teal'">
                      {{ new Date(lead.contact_datetime).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) }}
                    </span>
                  </div>
                </div>
                <button class="btn-manage" @click="goToOrigin(alias)">
                  Ver todos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="exec-footer">
      <span>Período: <strong>{{ filters.month === 0 ? 'Todo el año' : filters.month }}</strong> {{ filters.year }}</span>
      <span class="footer-sep">·</span>
      <span>Asesor: <strong>{{ isStrictlyComercial ? 'Mi cuenta' : (filters.advisor === 'all' ? 'Todos' : filters.advisor) }}</strong></span>
      <span class="footer-sep">·</span>
      <span class="footer-status">
        <span class="status-dot" :class="isLoading ? 'dot-loading' : 'dot-ok'"></span>
        {{ isLoading ? 'Actualizando…' : 'Datos sincronizados' }}
      </span>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)
const authService      = inject(ServiceKeys.Auth)
const catalog          = inject('catalog')
const router           = useRouter()

const filters             = ref({ year: 2026, month: 1, advisor: 'all' })
const isLoading           = ref(false)
const rawData             = ref([])
const filtroOwners        = ref([])
const isEffectiveFilter   = ref(0)
const isStrictlyComercial = ref(false)
const storedUser          = ref(null)

onMounted(async () => {
  applyRoleRestrictions()
  await loadOwners()
  await loadData()
})

function applyRoleRestrictions() {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const userData = JSON.parse(userStr)
      const roles    = userData.roles || []
      const isComercial = roles.includes('COMERCIAL')
      const isLider     = roles.includes('LIDER_COMERCIAL')

      if (isComercial && !isLider) {
        isStrictlyComercial.value = true
        storedUser.value          = userData
        filters.value.advisor     = userData.user_id
      }
    }
  } catch (e) {
    console.error('Error procesando usuario desde localStorage:', e)
  }
}

async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => ({
      id: u.user_id,
      description: `${u.first_name || ''} ${(u.last_name || '').charAt(0)}.`.trim() || u.alias || `User ${u.user_id}`
    }))
  } catch (e) {
    console.error('Error cargando usuarios:', e)
  }
}

async function loadData() {
  isLoading.value = true
  try {
    const finalAdvisor = isStrictlyComercial.value ? storedUser.value?.user_id : filters.value.advisor
    const payload = {
      year:    filters.value.year,
      month:   filters.value.month,
      advisor: finalAdvisor
    }
    const res   = await dashboardService.contactabilityList(payload)
    rawData.value = res.items || []
  } catch (e) {
    console.error('Error consultando contactabilidad:', e)
  } finally {
    isLoading.value = false
  }
}

const globalKPIs = computed(() => {
  let intentos = 0, contactados = 0, ventas = 0, ingresos = 0, leads = 0

  rawData.value.forEach(r => {
    intentos    += r.total_intentos            || 0
    contactados += r.total_contactados         || 0
    ventas      += r.total_ventas              || 0
    ingresos    += r.ingresos_recuperados      || 0
    leads       += r.total_leads_gestionados   || 0
  })

  return {
    intentos, contactados, ventas, ingresos, leads,
    tasaContactabilidad: intentos > 0    ? ((contactados / intentos)   * 100).toFixed(1) : 0,
    tasaConversion:      contactados > 0 ? ((ventas / contactados)     * 100).toFixed(1) : 0,
    promIntentos:        leads > 0       ? (intentos / leads).toFixed(1)                 : 0
  }
})

const baseFont = { family: 'inherit', size: 11 }

const hourlyFlowChartData = computed(() => {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  const dataMap = {}
  hours.forEach(h => dataMap[h] = { intentos: 0, contactados: 0, noContactados: 0, ventas: 0 })

  rawData.value.forEach(row => {
    ;(row.chart_tendencia_horaria || []).forEach(item => {
      if (dataMap[item.hora]) {
        const intentos    = item.intentos    || 0
        const contactados = item.contactados || 0
        dataMap[item.hora].intentos      += intentos
        dataMap[item.hora].contactados   += contactados
        dataMap[item.hora].noContactados += Math.max(0, intentos - contactados)
        dataMap[item.hora].ventas        += item.ventas || 0
      }
    })
  })

  const pctEfectivos = hours.map(h => {
    const { intentos, contactados } = dataMap[h]
    return intentos > 0 ? +((contactados / intentos) * 100).toFixed(1) : 0
  })
  const pctNoEfectivos = hours.map(h => {
    const { intentos, noContactados } = dataMap[h]
    return intentos > 0 ? +((noContactados / intentos) * 100).toFixed(1) : 0
  })
  const pctCierre = hours.map(h => {
    const { intentos, ventas } = dataMap[h]
    return intentos > 0 ? +((ventas / intentos) * 100).toFixed(1) : 0
  })

  return {
    labels: hours.map(h => `${h.toString().padStart(2, '0')}:00`),
    datasets: [
      {
        label: 'No Contactados',
        data: pctNoEfectivos,
        borderColor: '#f87171',
        backgroundColor: 'rgba(248,113,113,0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        borderDash: [5, 4],
        pointRadius: 3,
        pointBackgroundColor: '#f87171',
        order: 3,
        yAxisID: 'yPct',
        type: 'line'
      },
      {
        label: 'Contactados Efectivos',
        data: pctEfectivos,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.06)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#2563eb',
        order: 2,
        yAxisID: 'yPct',
        type: 'line'
      },
      {
        label: 'Cierre s/ Intentos',
        data: pctCierre,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15,118,110,0.15)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#0f766e',
        order: 1,
        yAxisID: 'yPct',
        type: 'line'
      }
    ]
  }
})

const hourlyFlowOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: baseFont } },
    yPct: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      max: 100,
      grid: { color: '#f1f5f9' },
      ticks: { font: baseFont, callback: val => `${val}%` },
      title: { display: true, text: '% sobre intentos totales', font: { size: 10 }, color: '#94a3b8' }
    }
  }
}

const persistenceChartData = computed(() => {
  const keys = [1, 2, 3, 4, '5+']
  const pMap = {}
  keys.forEach(k => pMap[k] = { intentos: 0, contactados: 0, ventas: 0 })

  rawData.value.forEach(row => {
    ;(row.chart_curva_persistencia || []).forEach(item => {
      const key = item.intento_num >= 5 ? '5+' : item.intento_num
      if (pMap[key] !== undefined) {
        pMap[key].intentos    += item.intentos    || 0
        pMap[key].contactados += item.contactados || 0
        pMap[key].ventas      += item.ventas      || 0
      }
    })
  })

  const labels      = ['1er', '2do', '3er', '4to', '5to+']
  const intentos    = keys.map(k => pMap[k].intentos)
  const contactados = keys.map(k => pMap[k].contactados)
  const ventas      = keys.map(k => pMap[k].ventas)

  const tasaContacto = keys.map(k => {
    const i = pMap[k].intentos
    return i > 0 ? +((pMap[k].contactados / i) * 100).toFixed(1) : 0
  })
  const tasaCierre = keys.map(k => {
    const c = pMap[k].contactados
    return c > 0 ? +((pMap[k].ventas / c) * 100).toFixed(1) : 0
  })

  return {
    labels,
    datasets: [
      { type: 'bar',  label: 'Intentos totales',      data: intentos,    backgroundColor: 'rgba(148,163,184,0.5)', borderRadius: 3, yAxisID: 'yVol', order: 3 },
      { type: 'bar',  label: 'Contactados',            data: contactados, backgroundColor: 'rgba(37,99,235,0.55)',  borderRadius: 3, yAxisID: 'yVol', order: 2 },
      { type: 'bar',  label: 'Ventas cerradas',        data: ventas,      backgroundColor: 'rgba(15,118,110,0.85)', borderRadius: 3, yAxisID: 'yVol', order: 1 },
      {
        type: 'line', label: '% Contacto s/intentos', data: tasaContacto,
        borderColor: '#2563eb', backgroundColor: 'transparent', borderWidth: 2,
        pointRadius: 4, pointBackgroundColor: '#2563eb', tension: 0.3, yAxisID: 'yPct', order: 0
      },
      {
        type: 'line', label: '% Cierre s/contactados', data: tasaCierre,
        borderColor: '#0f766e', backgroundColor: 'transparent', borderWidth: 2,
        borderDash: [4, 3], pointRadius: 4, pointBackgroundColor: '#0f766e', tension: 0.3, yAxisID: 'yPct', order: 0
      }
    ]
  }
})

const persistenceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 14, font: { family: 'inherit', size: 10 } } },
    tooltip: {
      callbacks: {
        label: ctx => {
          if (ctx.dataset.yAxisID === 'yPct') return ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
          return ` ${ctx.dataset.label}: ${new Intl.NumberFormat('es-PE').format(ctx.parsed.y)}`
        }
      }
    }
  },
  scales: {
    yVol: { type: 'linear', position: 'left',  beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'inherit', size: 10 } }, title: { display: true, text: 'Volumen', font: { size: 9 }, color: '#94a3b8' } },
    yPct: { type: 'linear', position: 'right', beginAtZero: true, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { family: 'inherit', size: 10 }, callback: v => v + '%' }, title: { display: true, text: '% Tasa', font: { size: 9 }, color: '#94a3b8' } },
    x:    { grid: { display: false }, ticks: { font: { family: 'inherit', size: 11 } } }
  }
}

const objectionsData = computed(() => {
  const objMap = {}
  let totalObj = 0

  rawData.value.forEach(row => {
    ;(row.chart_objeciones || []).forEach(item => {
      if (item.es_efectivo === isEffectiveFilter.value) {
        const nom = item.nombre || 'Desconocido'
        if (!objMap[nom]) objMap[nom] = 0
        objMap[nom] += item.frecuencia
        totalObj    += item.frecuencia
      }
    })
  })

  return Object.entries(objMap)
    .map(([reason, count]) => ({ reason, count, pct: totalObj > 0 ? Math.round((count / totalObj) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

const persistenceInsight = computed(() => {
  const data        = persistenceChartData.value.datasets
  const intentosDs  = data.find(d => d.label === 'Intentos totales')?.data || []
  if (!intentosDs.length || intentosDs[0] === 0) return 'Sin datos suficientes para el período.'

  const total       = intentosDs.reduce((s, v) => s + v, 0)
  const pctPrimer   = total > 0 ? Math.round((intentosDs[0] / total) * 100) : 0

  const ventasDs        = data.find(d => d.label === 'Ventas cerradas')?.data || []
  const ventasTotal     = ventasDs.reduce((s, v) => s + v, 0)
  const pctVentasPrimer = ventasTotal > 0 ? Math.round(((ventasDs[0] || 0) / ventasTotal) * 100) : 0

  return `El ${pctPrimer}% del esfuerzo se concentra en el 1er intento, donde se cierra el ${pctVentasPrimer}% de las ventas. Evalúa si los intentos tardíos justifican el costo operativo.`
})

const aggregatedAdvisors = computed(() => {
  const advMap = {}

  rawData.value.forEach(r => {
    if (!advMap[r.cod_asesor]) {
      advMap[r.cod_asesor] = { name: r.asesor_nombre || r.asesor_alias, leads: 0, calls: 0, contacted: 0, sales: 0, revenue: 0, sumTime: 0, countTime: 0 }
    }
    const a = advMap[r.cod_asesor]
    a.leads     += r.total_leads_gestionados
    a.calls     += r.total_intentos
    a.contacted += r.total_contactados
    a.sales     += r.total_ventas
    a.revenue   += r.ingresos_recuperados
    if (r.tiempo_prom_minutos > 0) { a.sumTime += r.tiempo_prom_minutos; a.countTime++ }
  })

  return Object.values(advMap).map(a => ({
    ...a,
    contactRate: a.calls > 0     ? ((a.contacted / a.calls)    * 100).toFixed(1) : 0,
    conversion:  a.contacted > 0 ? ((a.sales / a.contacted)    * 100).toFixed(1) : 0,
    avgTime:     a.countTime > 0 ? (a.sumTime / a.countTime).toFixed(1)          : 0
  })).sort((a, b) => b.sales - a.sales)
})

const pendingTasksByOrigin = computed(() => {
  const originMap = {}

  rawData.value.forEach(row => {
    ;(row.json_pending_tasks || []).forEach(group => {
      const alias = group.origin_alias
      if (!originMap[alias]) originMap[alias] = { desc: group.origin_desc, leads: [] }
      originMap[alias].leads.push(...group.leads)
    })
  })

  Object.values(originMap).forEach(group => {
    group.leads.sort((a, b) => new Date(a.contact_datetime) - new Date(b.contact_datetime))
  })

  return originMap
})

function goToOrigin(originAlias) {
  if (!originAlias) return

  const originId = catalog.options('we_attempt_origin')?.find(o => o.alias === originAlias)?.id

  if (originId) {
    const routeData = router.resolve({
      name: 'ComercialListado',
      query: { attempt_origin_ids: JSON.stringify([{ value: originId, label: originAlias }]) }
    })
    window.open(routeData.href, '_blank')
  }
}

const formatNum   = v => new Intl.NumberFormat('es-PE').format(v || 0)
const formatMoney = v => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v || 0)

const getScoreColor = rate => {
  const r = Number(rate)
  if (r >= 40) return 'c-green'
  if (r >= 25) return 'c-amber'
  return 'c-red'
}
</script>

<style scoped>
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.exec-masthead {
  background: var(--navy-900, #0f172a);
  color: var(--white, #ffffff);
  border-bottom: 1px solid var(--navy-700, #334155);
}

.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 16px; }

.brand-rule {
  width: 3px;
  height: 42px;
  background: var(--teal-600, #0f766e);
  border-radius: 2px;
  flex-shrink: 0;
}

.brand-eyebrow {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--slate-400, #94a3b8);
  font-weight: 500;
  display: block;
  margin-bottom: 3px;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
  color: var(--white, #ffffff);
}

.masthead-actions { display: flex; gap: 10px; align-items: center; }

.masthead-filters {
  display: flex;
  align-items: center;
  padding: 0 28px;
  min-height: 52px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 20px 10px 0;
}

.filter-label {
  font-size: 9.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--slate-400, #94a3b8);
  font-weight: 600;
  cursor: default;
}

.exec-select {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  color: var(--white, #ffffff);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 3px 0;
  outline: none;
  cursor: pointer;
  min-width: 140px;
  appearance: auto;
}
.exec-select option { color: var(--text-primary, #0f172a); background: var(--white, #ffffff); }

.filter-sep {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 20px 0 0;
}

.exec-body { flex: 1; padding: 24px 28px; }

.exec-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

.loader-ring {
  width: 40px; height: 40px;
  border: 3px solid var(--border, #e2e8f0);
  border-top-color: var(--teal-600, #0f766e);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loader-text {
  font-size: 13px;
  color: var(--text-secondary, #475569);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }

.kpi-card {
  background: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.15s, transform 0.15s;
}
.kpi-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); transform: translateY(-1px); }
.kpi-card-highlight { background: var(--navy-900, #0f172a); border-color: var(--navy-700, #334155); }

.kpi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kpi-card-label {
  font-size: 10px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted, #94a3b8);
}
.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-green { background: #22c55e; }
.ind-amber { background: #f59e0b; }
.ind-blue  { background: #3b82f6; }
.ind-slate { background: var(--slate-400, #94a3b8); }

.kpi-card-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary, #0f172a);
  font-variant-numeric: tabular-nums;
  margin-bottom: 8px;
}
.kpi-card-sub { font-size: 11px; color: var(--text-muted, #94a3b8); font-weight: 400; }

.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.chart-panel {
  background: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.chart-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid var(--slate-100, #f1f5f9);
}
.chart-panel-title { font-size: 13px; font-weight: 700; color: var(--text-primary, #0f172a); letter-spacing: -0.01em; }
.chart-panel-sub   { font-size: 11px; color: var(--text-muted, #94a3b8); margin-top: 2px; }

.chart-area { padding: 16px 20px; flex: 1; }

.chart-legend-inline {
  display: flex;
  gap: 14px;
  align-items: center;
  font-size: 11.5px;
  color: var(--text-secondary, #475569);
  font-weight: 500;
}
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }

.insight-box {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 20px;
  border-top: 1px solid var(--border, #e2e8f0);
  background: var(--slate-50, #f8fafc);
  font-size: 11.5px;
  color: var(--text-secondary, #475569);
  line-height: 1.5;
}

.toggle-group { display: flex; background: var(--slate-100, #f1f5f9); border-radius: 4px; padding: 2px; }
.toggle-btn {
  background: transparent;
  border: none;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.toggle-active-teal { background: var(--white, #ffffff); color: var(--teal-600, #0f766e); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.toggle-active-red  { background: var(--white, #ffffff); color: #b91c1c;                  box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

.panel-scroll-area { overflow-y: auto; max-height: 280px; }

.table-shell {
  background: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.control-table-wrapper { width: 100%; overflow-x: auto; max-height: 50vh; }

.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts {
  padding: 7px 12px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  border-bottom: 2px solid var(--border, #e2e8f0);
  position: sticky;
  top: 0;
  z-index: 2;
}
.ts-a { background: #f0f7ff; color: #3b82f6; border-left: 1px solid #dbeafe; }
.ts-b { background: #f0fdf4; color: #16a34a; border-left: 1px solid #d1fae5; }
.ts-c { background: #f0fdf4; color: #0f766e; border-left: 1px solid #bbf7d0; }

.tbody-row td { padding: 9px 12px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td:not(.sticky-col) { background: #f0f9ff !important; transition: background 0.1s; }

.td-a { background: #f8fbff; border-left: 1px solid #e0eeff; }
.td-b { background: #f7fdf9; border-left: 1px solid #d5f5e0; }
.td-c { background: #f8fafc; border-left: 1px solid var(--border, #e2e8f0); }

.sticky-col { position: sticky; left: 0; z-index: 2; box-shadow: 2px 0 5px -2px rgba(0, 0, 0, 0.12); }
.exec-table thead .sticky-col { z-index: 3; }
.exec-table tbody .sticky-col { border-right: 2px solid var(--border, #e2e8f0); }

.progress-track { width: 100%; height: 5px; background: var(--slate-100, #f1f5f9); border-radius: 3px; overflow: hidden; }
.progress-fill  { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.fill-teal { background: var(--teal-600, #0f766e); }
.fill-red  { background: #b91c1c; }

.exec-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 28px;
  background: var(--white, #ffffff);
  border-top: 1px solid var(--border, #e2e8f0);
  font-size: 11.5px;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
}
.exec-footer strong { color: var(--text-secondary, #475569); }
.footer-sep  { color: var(--border, #e2e8f0); }
.footer-status { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.status-dot  { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok      { background: #22c55e; }
.dot-loading { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }

.c-green { color: #15803d; }
.c-amber { color: #b45309; }
.c-red   { color: #b91c1c; }
.c-teal  { color: #0f766e; font-weight: 600; }

.pending-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  background: var(--slate-50, #f8fafc);
  padding: 16px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 0 0 6px 6px;
}

.pending-card {
  background: var(--white, #ffffff);
  border: 1px solid var(--slate-200, #e2e8f0);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.pending-card-header {
  background: var(--navy-900, #0f172a);
  color: var(--white, #ffffff);
  padding: 12px 16px;
  border-radius: 5px 5px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pending-origin-name {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--slate-100);
}

.pending-badge {
  background: var(--teal-600, #0f766e);
  color: var(--white);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.pending-list-scroll { max-height: 250px; overflow-y: auto; padding: 8px; }

.pending-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--slate-100, #f1f5f9);
  border-radius: 4px;
}
.pending-item:hover { background: var(--slate-50, #f8fafc); }
.pending-item:last-child { border-bottom: none; }

.pending-lead-name { font-size: 12.5px; font-weight: 600; color: var(--text-primary, #0f172a); margin-bottom: 2px; }
.pending-lead-meta { font-size: 11px; color: var(--text-muted, #94a3b8); }

.btn-manage {
  background: transparent;
  border: 1px solid var(--slate-300, #cbd5e1);
  color: var(--text-secondary, #475569);
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-manage:hover {
  background: var(--teal-50, #f0fdf4);
  color: var(--teal-700, #0f766e);
  border-color: var(--teal-300, #5eead4);
}

.mb-4 { margin-bottom: 24px; }
.text-right   { text-align: right; }
.text-center  { text-align: center; }
.text-muted   { color: var(--text-muted, #94a3b8); }
.text-mono    { font-variant-numeric: tabular-nums; }
.fw-600       { font-weight: 600; }
.fw-700       { font-weight: 700; }

.fade-in { animation: fadeIn 0.35s ease; }
.spin    { animation: spin 0.8s linear infinite; }

@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1024px) {
  .kpi-strip    { grid-template-columns: 1fr 1fr; }
  .chart-grid-2 { grid-template-columns: 1fr; }
}
</style>
