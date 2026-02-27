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
            {{ isLoading ? 'Procesando...' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

      <div class="masthead-filters">
        <div class="filter-group">
          <label class="filter-label">ANO</label>
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
            <div class="kpi-card-sub">Promedio: <strong>{{ globalKPIs.promIntentos }}</strong> intentos/lead</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">TASA DE CONTACTABILIDAD</span>
              <div class="kpi-indicator" :class="globalKPIs.tasaContactabilidad >= 40 ? 'ind-green' : 'ind-amber'"></div>
            </div>
            <div class="kpi-card-value" :class="globalKPIs.tasaContactabilidad >= 40 ? 'c-green' : 'c-amber'">
              {{ globalKPIs.tasaContactabilidad }}%
            </div>
            <div class="kpi-card-sub"><strong>{{ formatNum(globalKPIs.contactados) }}</strong> leads contactados</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">EFECTIVIDAD DE CIERRE</span>
              <div class="kpi-indicator ind-green"></div>
            </div>
            <div class="kpi-card-value c-green">{{ globalKPIs.tasaConversion }}%</div>
            <div class="kpi-card-sub"><strong>{{ formatNum(globalKPIs.ventas) }}</strong> ventas concretadas</div>
          </div>

          <div class="kpi-card kpi-card-highlight">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color:#fbbf24">INGRESOS RECUPERADOS</span>
              <div class="kpi-indicator ind-blue"></div>
            </div>
            <div class="kpi-card-value" style="color:#ffffff">{{ formatMoney(globalKPIs.ingresos) }}</div>
            <div class="kpi-card-sub" style="color:#fbbf24;font-weight:600;">Por gestion activa de asesores</div>
          </div>
        </div>

        <!-- Tendencia Horaria -->
        <div class="chart-panel mb-4">
          <div class="chart-panel-header">
            <div>
              <div class="chart-panel-title">Tendencia Horaria: Del Intento al Pago</div>
              <div class="chart-panel-sub">Correlacion entre esfuerzo (llamadas), exito de contacto y cierre final por franja horaria.</div>
            </div>
            <div class="chart-legend-inline">
              <span class="legend-dot" style="background:#f87171;border-radius:2px;"></span>
              <span>% No Contactados</span>
              <span class="legend-dot" style="background:#2563eb;border-radius:50%;"></span>
              <span>% Contactados Efectivos</span>
              <span class="legend-dot" style="background:#0f766e;border-radius:50%;"></span>
              <span>% Cierre s/ Intentos</span>
            </div>
          </div>
          <div class="chart-area" style="height:320px;">
            <Line :data="hourlyFlowChartData" :options="hourlyFlowOptions" />
          </div>
        </div>

        <!-- Grid: Persistencia + Resultados -->
        <div class="chart-grid-2 mb-4">

          <!-- CURVA DE PERSISTENCIA REDISEÑADA -->
          <div class="pc-panel">
            <div class="pc-header">
              <div class="pc-header-left">
                <span class="pc-eyebrow">Analisis de Seguimiento</span>
                <h2 class="pc-title">Curva de Persistencia</h2>
                <p class="pc-sub">En que intento se contacta y se cierra? Numeros reales por vuelta de llamada.</p>
              </div>
              <div class="pc-header-right">
                <div class="pc-summary-pill">
                  <span class="pill-label">Total intentos</span>
                  <span class="pill-value">{{ formatNum(persistenceData.totalIntentos) }}</span>
                </div>
                <div class="pc-summary-pill pill-green">
                  <span class="pill-label">Ventas totales</span>
                  <span class="pill-value">{{ formatNum(persistenceData.totalVentas) }}</span>
                </div>
              </div>
            </div>

            <div v-if="persistenceData.steps.length === 0" class="pc-empty">
              <p>Sin datos para el periodo.</p>
            </div>

            <div v-else class="pc-steps-wrapper">
              <div
                v-for="(step, i) in persistenceData.steps"
                :key="i"
                class="pc-step-col"
                :class="{ 'pc-step-col--peak': i === persistenceData.peakIndex }"
              >
                <div class="step-label">
                  <span class="step-num">{{ step.label }}</span>
                  <span class="step-tag step-tag--peak" v-if="i === persistenceData.peakIndex">Mas activo</span>
                  <span class="step-tag step-tag--drop" v-else-if="i > 0 && getDropPct(i) >= 50">-{{ getDropPct(i) }}%</span>
                </div>

                <div class="step-bar-track">
                  <div class="step-bar-fill" :style="{ height: getBarHeight(step.intentos) + '%' }">
                    <div class="step-bar-shine"></div>
                  </div>
                </div>

                <div class="step-numbers">
                  <div class="sn-card sn-card--intentos">
                    <span class="sn-dot sn-dot--slate"></span>
                    <div>
                      <div class="sn-big">{{ formatNum(step.intentos) }}</div>
                      <div class="sn-lbl">Intentos</div>
                    </div>
                  </div>

                  <div class="sn-arrow">
                    <svg width="8" height="14" viewBox="0 0 8 14"><path d="M4 0v10M1 7l3 5 3-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span class="sn-rate" :class="step.tasaContacto >= 50 ? 'sn-rate--green' : step.tasaContacto >= 25 ? 'sn-rate--amber' : 'sn-rate--red'">
                      {{ step.tasaContacto }}% contacto
                    </span>
                  </div>

                  <div class="sn-card sn-card--contactados">
                    <span class="sn-dot sn-dot--blue"></span>
                    <div>
                      <div class="sn-big sn-big--blue">{{ formatNum(step.contactados) }}</div>
                      <div class="sn-lbl">Contactados</div>
                    </div>
                  </div>

                  <template v-if="step.ventas > 0">
                    <div class="sn-arrow">
                      <svg width="8" height="14" viewBox="0 0 8 14"><path d="M4 0v10M1 7l3 5 3-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      <span class="sn-rate sn-rate--green">{{ step.tasaCierre }}% cerro</span>
                    </div>
                    <div class="sn-card sn-card--ventas">
                      <span class="sn-dot sn-dot--green"></span>
                      <div>
                        <div class="sn-big sn-big--green">{{ formatNum(step.ventas) }}</div>
                        <div class="sn-lbl">Ventas</div>
                      </div>
                    </div>
                  </template>
                  <div v-else class="sn-empty">Sin cierres</div>
                </div>

                <div class="step-connector" v-if="i < persistenceData.steps.length - 1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M14 7l5 5-5 5" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            <div class="pc-insight" v-if="persistenceInsight">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0;margin-top:1px;">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span><strong>Insight:</strong> {{ persistenceInsight }}</span>
            </div>
          </div>

          <!-- Resultados de Llamada -->
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
                    <th class="ts ts-c">Razon Registrada</th>
                    <th class="ts ts-c text-right">Frecuencia</th>
                    <th class="ts ts-c text-right">% Total</th>
                    <th class="ts ts-c" style="width:30%;">Distribucion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(obj, i) in objectionsData" :key="i" class="tbody-row">
                    <td class="td-c fw-600">{{ obj.reason }}</td>
                    <td class="td-c text-right">{{ formatNum(obj.count) }}</td>
                    <td class="td-c text-right fw-700">{{ obj.pct }}%</td>
                    <td class="td-c">
                      <div class="progress-track">
                        <div class="progress-fill" :class="isEffectiveFilter === 1 ? 'fill-teal' : 'fill-red'" :style="`width:${obj.pct}%`"></div>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="objectionsData.length === 0">
                    <td colspan="4" class="text-center text-muted" style="padding:24px;">No hay registros en esta categoria.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Matriz Asesores -->
        <div class="table-shell mb-4" v-if="!isStrictlyComercial">
          <div class="chart-panel-header">
            <div>
              <div class="chart-panel-title">Matriz de Desempeno Individual - Asesores</div>
              <div class="chart-panel-sub">Evaluacion de productividad operativa por asesor en el periodo seleccionado.</div>
            </div>
          </div>
          <div class="table-responsive-custom control-table-wrapper">
            <table class="exec-table">
              <thead>
                <tr class="thead-sub">
                  <th class="ts ts-a sticky-col" style="min-width:180px;">Asesor</th>
                  <th class="ts ts-b text-right">Leads Gestionados</th>
                  <th class="ts ts-b text-right">Llamadas Realizadas</th>
                  <th class="ts ts-b text-right">Contactos Efectivos</th>
                  <th class="ts ts-b text-right">% Contactabilidad</th>
                  <th class="ts ts-b text-right">Ventas (Cierres)</th>
                  <th class="ts ts-b text-right">Tasa Conversion</th>
                  <th class="ts ts-b text-right">Ingresos</th>
                  <th class="ts ts-b text-right">Duracion Prom. (min)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(advisor, index) in aggregatedAdvisors" :key="index" class="tbody-row">
                  <td class="td-a sticky-col fw-700">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;color:#94a3b8;vertical-align:middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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
                  <td colspan="9" class="text-center text-muted" style="padding:24px;">No hay datos para mostrar en este periodo.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Pendientes -->
      <div class="pending-shell mb-4" v-if="Object.keys(pendingTasksByOrigin).length > 0">
        <div class="chart-panel-header" style="border-radius:6px 6px 0 0;background:#fff;border:1px solid #e2e8f0;border-bottom:none;">
          <div>
            <div class="chart-panel-title">
              {{ isStrictlyComercial ? 'Mi Agenda Operativa: Llamadas Pendientes' : 'Agenda Operativa Global: Intentos Pendientes' }}
            </div>
            <div class="chart-panel-sub">Llamadas programadas agrupadas por el origen de la regla o gestion.</div>
          </div>
        </div>
        <div class="pending-grid">
          <div v-for="(group, alias) in pendingTasksByOrigin" :key="alias" class="pending-card">
            <div class="pending-card-header" style="cursor:pointer;" @click="goToGroupFiltered(alias)" title="Ver listado filtrado">
              <span class="pending-origin-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                {{ group.desc }}
              </span>
              <div class="d-flex align-items-center gap-2">
                <span class="pending-badge">{{ group.leads.length }}</span>
                <i class="fa-solid fa-arrow-right-to-bracket opacity-75" style="font-size:11px;"></i>
              </div>
            </div>
            <div class="pending-list-scroll">
              <div v-for="lead in group.leads" :key="lead.lead_id" class="pending-item">
                <div class="pending-item-info">
                  <div class="pending-lead-name">{{ lead.lead_name !== '-' ? lead.lead_name : 'Prospecto sin nombre' }}</div>
                  <div class="pending-lead-meta">
                    Intento #{{ lead.attempt_number }} &bull;
                    <span :class="new Date(lead.contact_datetime) < new Date() ? 'c-red' : 'c-teal'">
                      {{ new Date(lead.contact_datetime).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) }}
                    </span>
                  </div>
                </div>
                <button class="btn-manage" @click="goToLead(lead.lead_id)" title="Ir a la ficha del lead">
                  Atender <i class="fa-solid fa-angle-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>

    <footer class="exec-footer">
      <span>Periodo: <strong>{{ filters.month === 0 ? 'Todo el anio' : filters.month }}</strong> {{ filters.year }}</span>
      <span class="footer-sep">·</span>
      <span>Asesor: <strong>{{ isStrictlyComercial ? 'Mi cuenta' : (filters.advisor === 'all' ? 'Todos' : filters.advisor) }}</strong></span>
      <span class="footer-sep">·</span>
      <span class="footer-status">
        <span class="status-dot" :class="isLoading ? 'dot-loading' : 'dot-ok'"></span>
        {{ isLoading ? 'Actualizando...' : 'Datos sincronizados' }}
      </span>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const dashboardService    = inject(ServiceKeys.Dashboard)
const authService         = inject(ServiceKeys.Auth)
const catalog             = inject('catalog')
const router              = useRouter()

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
      const userData    = JSON.parse(userStr)
      const roles       = userData.roles || []
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
      description: (u.first_name || '') + ' ' + ((u.last_name || '').charAt(0)) + '.'
    }))
  } catch (e) {
    console.error('Error cargando usuarios:', e)
  }
}

async function loadData() {
  isLoading.value = true
  try {
    const finalAdvisor = isStrictlyComercial.value ? storedUser.value?.user_id : filters.value.advisor
    const res = await dashboardService.contactabilityList({
      year:    filters.value.year,
      month:   filters.value.month,
      advisor: finalAdvisor
    })
    rawData.value = res.items || []
  } catch (e) {
    console.error('Error consultando contactabilidad:', e)
  } finally {
    isLoading.value = false
  }
}

// KPIs globales
const globalKPIs = computed(() => {
  let intentos = 0, contactados = 0, ventas = 0, ingresos = 0, leads = 0
  rawData.value.forEach(r => {
    intentos    += r.total_intentos          || 0
    contactados += r.total_contactados       || 0
    ventas      += r.total_ventas            || 0
    ingresos    += r.ingresos_recuperados    || 0
    leads       += r.total_leads_gestionados || 0
  })
  return {
    intentos, contactados, ventas, ingresos, leads,
    tasaContactabilidad: intentos    > 0 ? ((contactados / intentos)  * 100).toFixed(1) : 0,
    tasaConversion:      contactados > 0 ? ((ventas / contactados)    * 100).toFixed(1) : 0,
    promIntentos:        leads       > 0 ? (intentos / leads).toFixed(1)                : 0
  }
})

// Tendencia Horaria
const baseFont = { family: 'inherit', size: 11 }

const hourlyFlowChartData = computed(() => {
  const hours  = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  const dataMap = {}
  hours.forEach(h => { dataMap[h] = { intentos: 0, contactados: 0, noContactados: 0, ventas: 0 } })

  rawData.value.forEach(row => {
    ;(row.chart_tendencia_horaria || []).forEach(item => {
      if (dataMap[item.hora]) {
        const int = item.intentos || 0
        const con = item.contactados || 0
        dataMap[item.hora].intentos      += int
        dataMap[item.hora].contactados   += con
        dataMap[item.hora].noContactados += Math.max(0, int - con)
        dataMap[item.hora].ventas        += item.ventas || 0
      }
    })
  })

  return {
    labels: hours.map(h => String(h).padStart(2,'0') + ':00'),
    datasets: [
      {
        label: 'No Contactados', type: 'line',
        data: hours.map(h => { const d = dataMap[h]; return d.intentos > 0 ? +((d.noContactados / d.intentos) * 100).toFixed(1) : 0 }),
        borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)',
        fill: true, tension: 0.4, borderWidth: 2, borderDash: [5,4],
        pointRadius: 3, pointBackgroundColor: '#f87171', order: 3, yAxisID: 'yPct'
      },
      {
        label: 'Contactados Efectivos', type: 'line',
        data: hours.map(h => { const d = dataMap[h]; return d.intentos > 0 ? +((d.contactados / d.intentos) * 100).toFixed(1) : 0 }),
        borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.06)',
        fill: true, tension: 0.4, borderWidth: 2.5,
        pointRadius: 4, pointBackgroundColor: '#2563eb', order: 2, yAxisID: 'yPct'
      },
      {
        label: 'Cierre s/ Intentos', type: 'line',
        data: hours.map(h => { const d = dataMap[h]; return d.intentos > 0 ? +((d.ventas / d.intentos) * 100).toFixed(1) : 0 }),
        borderColor: '#0f766e', backgroundColor: 'rgba(15,118,110,0.15)',
        fill: true, tension: 0.4, borderWidth: 3,
        pointRadius: 5, pointBackgroundColor: '#0f766e', order: 1, yAxisID: 'yPct'
      }
    ]
  }
})

const hourlyFlowOptions = {
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + ctx.parsed.y + '%' } }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: baseFont } },
    yPct: {
      type: 'linear', position: 'left', beginAtZero: true, max: 100,
      grid: { color: '#f1f5f9' },
      ticks: { font: baseFont, callback: val => val + '%' },
      title: { display: true, text: '% sobre intentos totales', font: { size: 10 }, color: '#94a3b8' }
    }
  }
}

// Persistencia - datos para el nuevo diseño
const persistenceData = computed(() => {
  const keys   = [1, 2, 3, 4, '5+']
  const labels = ['1er intento', '2do intento', '3er intento', '4to intento', '5to+']
  const pMap   = {}
  keys.forEach(k => { pMap[k] = { intentos: 0, contactados: 0, ventas: 0 } })

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

  const steps = keys.map((k, i) => {
    const d = pMap[k]
    return {
      label:        labels[i],
      intentos:     d.intentos,
      contactados:  d.contactados,
      ventas:       d.ventas,
      tasaContacto: d.intentos    > 0 ? +((d.contactados / d.intentos)    * 100).toFixed(0) : 0,
      tasaCierre:   d.contactados > 0 ? +((d.ventas      / d.contactados) * 100).toFixed(0) : 0
    }
  })

  const totalIntentos = steps.reduce((s, r) => s + r.intentos, 0)
  const totalVentas   = steps.reduce((s, r) => s + r.ventas,   0)
  const peakIndex     = steps.reduce((best, s, i) => s.intentos > steps[best].intentos ? i : best, 0)

  return { steps, totalIntentos, totalVentas, peakIndex }
})

const maxIntentosPersistence = computed(() => Math.max(...persistenceData.value.steps.map(s => s.intentos), 1))

function getBarHeight(intentos) {
  return Math.max(6, Math.round((intentos / maxIntentosPersistence.value) * 100))
}

function getDropPct(i) {
  const steps = persistenceData.value.steps
  const prev  = steps[i - 1]?.intentos || 1
  const curr  = steps[i]?.intentos     || 0
  return Math.round(((prev - curr) / prev) * 100)
}

const persistenceInsight = computed(() => {
  const { steps, totalIntentos, totalVentas } = persistenceData.value
  if (!steps.length || steps[0].intentos === 0) return null

  const pctEsfuerzo1 = totalIntentos > 0 ? Math.round((steps[0].intentos / totalIntentos) * 100) : 0
  const pctVentas1   = totalVentas   > 0 ? Math.round((steps[0].ventas   / totalVentas)   * 100) : 0

  const bestClose = [...steps].filter(x => x.contactados > 0).sort((a, b) => b.tasaCierre - a.tasaCierre)[0]
  const extra = bestClose && bestClose.label !== '1er intento' && bestClose.tasaCierre > 0
    ? ' El mejor ratio de cierre se da en el ' + bestClose.label + ' (' + bestClose.tasaCierre + '% de sus contactos compran).'
    : ''

  return 'El ' + pctEsfuerzo1 + '% del esfuerzo total esta en el 1er intento, generando el ' + pctVentas1 + '% de las ventas.' + extra + ' Evalua si los intentos tardios justifican el costo operativo.'
})

// Objeciones
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

// Asesores
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
    contactRate: a.calls     > 0 ? ((a.contacted / a.calls)    * 100).toFixed(1) : 0,
    conversion:  a.contacted > 0 ? ((a.sales / a.contacted)    * 100).toFixed(1) : 0,
    avgTime:     a.countTime > 0 ? (a.sumTime / a.countTime).toFixed(1)          : 0
  })).sort((a, b) => b.sales - a.sales)
})

// Pendientes
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

// Navegacion
function goToGroupFiltered(originAlias) {
  if (!originAlias) return
  const originId        = catalog.options('we_attempt_origin')?.find(o => o.alias === originAlias)?.id
  const originDesc      = catalog.options('we_attempt_origin')?.find(o => o.alias === originAlias)?.description
  const pendingFollowId = catalog.options('we_calling')?.find(o => o.alias === 'we_calling_pending')?.id
  const queryParams     = {}
  if (originId)        queryParams.attempt_origin_ids = JSON.stringify([{ value: originId, label: originDesc }])
  if (pendingFollowId) queryParams.last_follow_ids    = JSON.stringify([{ value: pendingFollowId, label: 'Pendiente' }])
  if (isStrictlyComercial.value && storedUser.value) {
    queryParams.owner_user_ids = JSON.stringify([{ value: storedUser.value.user_id, label: 'Mi cuenta' }])
  } else if (filters.value.advisor !== 'all') {
    const advName = filtroOwners.value.find(u => u.id === filters.value.advisor)?.description || 'Asesor'
    queryParams.owner_user_ids = JSON.stringify([{ value: filters.value.advisor, label: advName }])
  }
  window.open(router.resolve({ name: 'ComercialListado', query: queryParams }).href, '_blank')
}

function goToLead(leadId) {
  if (!leadId) return
  window.open(router.resolve({ name: 'ComercialLeadDetalle', params: { id: leadId } }).href, '_blank')
}

// Helpers
const formatNum   = v => new Intl.NumberFormat('es-PE').format(v || 0)
const formatMoney = v => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v || 0)
const getScoreColor = rate => {
  const r = Number(rate)
  return r >= 40 ? 'c-green' : r >= 25 ? 'c-amber' : 'c-red'
}
</script>

<style scoped>
/* SHELL */
.exec-shell { background: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; }

/* MASTHEAD */
.exec-masthead { background: #0f172a; color: #fff; border-bottom: 1px solid #334155; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 20px 28px 16px; border-bottom: 1px solid rgba(255,255,255,.07); }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 3px; height: 42px; background: #0f766e; border-radius: 2px; flex-shrink: 0; }
.brand-eyebrow { display: block; font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: #94a3b8; font-weight: 500; margin-bottom: 3px; }
.brand-title { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -.01em; color: #fff; }
.masthead-actions { display: flex; gap: 10px; align-items: center; }
.btn-exec-primary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: #0f766e; color: #fff; border: none; border-radius: 5px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background .15s; }
.btn-exec-primary:hover:not(:disabled) { background: #0d9488; }
.btn-exec-primary:disabled { opacity: .6; cursor: not-allowed; }
.masthead-filters { display: flex; align-items: center; padding: 0 28px; min-height: 52px; }
.filter-group { display: flex; flex-direction: column; gap: 2px; padding: 10px 20px 10px 0; }
.filter-label { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8; font-weight: 600; }
.exec-select { background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,.18); color: #fff; font-family: inherit; font-size: 12.5px; font-weight: 500; padding: 3px 0; outline: none; cursor: pointer; min-width: 140px; appearance: auto; }
.exec-select option { color: #0f172a; background: #fff; }
.filter-sep { width: 1px; height: 32px; background: rgba(255,255,255,.1); margin: 0 20px 0 0; }

/* BODY */
.exec-body { flex: 1; padding: 24px 28px; }
.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; }
.loader-ring { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0f766e; border-radius: 50%; animation: spin .8s linear infinite; }
.loader-text { font-size: 13px; color: #475569; font-weight: 500; letter-spacing: .02em; }

/* KPI STRIP */
.kpi-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
.kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); transition: box-shadow .15s, transform .15s; }
.kpi-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); transform: translateY(-1px); }
.kpi-card-highlight { background: #0f172a; border-color: #334155; }
.kpi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kpi-card-label { font-size: 10px; letter-spacing: .13em; text-transform: uppercase; font-weight: 700; color: #94a3b8; }
.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-green { background: #22c55e; } .ind-amber { background: #f59e0b; } .ind-blue { background: #3b82f6; } .ind-slate { background: #94a3b8; }
.kpi-card-value { font-size: 22px; font-weight: 700; letter-spacing: -.02em; color: #0f172a; font-variant-numeric: tabular-nums; margin-bottom: 8px; }
.kpi-card-sub { font-size: 11px; color: #94a3b8; }

/* CHART PANELS */
.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.04); display: flex; flex-direction: column; }
.chart-panel-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.chart-panel-title { font-size: 13px; font-weight: 700; color: #0f172a; letter-spacing: -.01em; }
.chart-panel-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.chart-area { padding: 16px 20px; flex: 1; }
.chart-legend-inline { display: flex; gap: 14px; align-items: center; font-size: 11.5px; color: #475569; font-weight: 500; }
.legend-dot { display: inline-block; width: 8px; height: 8px; margin-right: 4px; }

/* ══ PERSISTENCIA NUEVO DISEÑO ══ */
.pc-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.04); display: flex; flex-direction: column; }
.pc-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px 14px; border-bottom: 1px solid rgba(255,255,255,.06); background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); gap: 12px; }
.pc-header-left { flex: 1; min-width: 0; }
.pc-eyebrow { display: block; font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 3px; }
.pc-title { font-size: 14px; font-weight: 700; color: #f1f5f9; margin: 0 0 3px; letter-spacing: -.015em; }
.pc-sub { font-size: 11px; color: #475569; margin: 0; line-height: 1.4; }
.pc-header-right { display: flex; flex-direction: column; gap: 5px; align-items: flex-end; flex-shrink: 0; }
.pc-summary-pill { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 4px 12px; white-space: nowrap; }
.pc-summary-pill.pill-green { border-color: rgba(34,197,94,.3); background: rgba(34,197,94,.08); }
.pill-label { font-size: 9.5px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: .06em; }
.pill-value { font-size: 13px; font-weight: 700; color: #f1f5f9; font-variant-numeric: tabular-nums; }
.pill-green .pill-value { color: #4ade80; }
.pc-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 24px; color: #94a3b8; font-size: 12.5px; }

.pc-steps-wrapper { display: flex; align-items: stretch; padding: 20px 16px 6px; overflow-x: auto; gap: 0; }

.pc-step-col { flex: 1; min-width: 120px; display: flex; flex-direction: column; align-items: center; position: relative; padding: 0 4px 12px; border-radius: 8px; transition: background .15s; }
.pc-step-col--peak { background: linear-gradient(180deg, #f0f9ff 0%, rgba(240,249,255,0) 80%); }
.pc-step-col--peak .step-bar-fill { background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%); box-shadow: 0 0 10px rgba(59,130,246,.4); }

.step-label { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 8px; }
.step-num { font-size: 10.5px; font-weight: 700; color: #475569; letter-spacing: .03em; text-transform: uppercase; text-align: center; }
.step-tag { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; letter-spacing: .04em; text-transform: uppercase; }
.step-tag--peak { background: #dbeafe; color: #1d4ed8; }
.step-tag--drop { background: #fff7ed; color: #c2410c; }

.step-bar-track { width: 28px; height: 64px; background: #f1f5f9; border-radius: 5px; display: flex; align-items: flex-end; overflow: hidden; margin-bottom: 12px; flex-shrink: 0; }
.step-bar-fill { width: 100%; background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%); border-radius: 5px; position: relative; transition: height .5s cubic-bezier(.34,1.56,.64,1); }
.step-bar-shine { position: absolute; top: 0; left: 0; right: 0; height: 35%; background: rgba(255,255,255,.22); border-radius: 5px 5px 0 0; }

.step-numbers { display: flex; flex-direction: column; align-items: stretch; width: 100%; gap: 0; }

.sn-card { display: flex; align-items: center; gap: 6px; border-radius: 7px; padding: 7px 10px; border: 1px solid transparent; }
.sn-card--intentos   { background: #f8fafc; border-color: #e2e8f0; }
.sn-card--contactados { background: #eff6ff; border-color: #bfdbfe; }
.sn-card--ventas     { background: #f0fdf4; border-color: #bbf7d0; }

.sn-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.sn-dot--slate { background: #94a3b8; } .sn-dot--blue { background: #3b82f6; } .sn-dot--green { background: #22c55e; }

.sn-big { font-size: 18px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; letter-spacing: -.03em; line-height: 1; display: block; }
.sn-big--blue  { color: #1d4ed8; }
.sn-big--green { color: #16a34a; }
.sn-lbl { font-size: 9px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin-top: 2px; display: block; }

.sn-arrow { display: flex; align-items: center; gap: 5px; padding: 2px 4px; color: #94a3b8; }
.sn-rate { font-size: 10px; font-weight: 700; border-radius: 4px; padding: 1px 5px; white-space: nowrap; }
.sn-rate--green { color: #15803d; background: rgba(21,128,61,.08); }
.sn-rate--amber { color: #b45309; background: rgba(180,83,9,.08); }
.sn-rate--red   { color: #b91c1c; background: rgba(185,28,28,.08); }
.sn-empty { font-size: 10px; color: #cbd5e1; font-style: italic; text-align: center; padding: 5px 0; border: 1px dashed #e2e8f0; border-radius: 6px; }

.step-connector { position: absolute; right: -12px; top: 42%; transform: translateY(-50%); z-index: 2; background: #fff; border-radius: 50%; padding: 1px; }

.pc-insight { display: flex; gap: 10px; align-items: flex-start; padding: 11px 20px; border-top: 1px solid #f1f5f9; background: #fffbeb; }
.pc-insight span { font-size: 11.5px; color: #78350f; line-height: 1.55; }
.pc-insight strong { color: #92400e; }

/* RESULTADOS LLAMADA */
.toggle-group { display: flex; background: #f1f5f9; border-radius: 4px; padding: 2px; }
.toggle-btn { background: transparent; border: none; padding: 4px 12px; font-size: 11px; font-weight: 600; color: #475569; border-radius: 3px; cursor: pointer; font-family: inherit; transition: all .15s; }
.toggle-active-teal { background: #fff; color: #0f766e; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
.toggle-active-red  { background: #fff; color: #b91c1c; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
.panel-scroll-area { overflow-y: auto; max-height: 280px; }

/* TABLA ASESORES */
.table-shell { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.control-table-wrapper { width: 100%; overflow-x: auto; max-height: 50vh; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.thead-sub .ts { padding: 7px 12px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 2; }
.ts-a { background: #f0f7ff; color: #3b82f6; border-left: 1px solid #dbeafe; }
.ts-b { background: #f0fdf4; color: #16a34a; border-left: 1px solid #d1fae5; }
.ts-c { background: #f0fdf4; color: #0f766e; border-left: 1px solid #bbf7d0; }
.tbody-row td { padding: 9px 12px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td:not(.sticky-col) { background: #f0f9ff !important; transition: background .1s; }
.td-a { background: #f8fbff; border-left: 1px solid #e0eeff; }
.td-b { background: #f7fdf9; border-left: 1px solid #d5f5e0; }
.td-c { background: #f8fafc; border-left: 1px solid #e2e8f0; }
.sticky-col { position: sticky; left: 0; z-index: 2; box-shadow: 2px 0 5px -2px rgba(0,0,0,.12); }
.exec-table thead .sticky-col { z-index: 3; }
.exec-table tbody .sticky-col { border-right: 2px solid #e2e8f0; }
.progress-track { width: 100%; height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
.fill-teal { background: #0f766e; } .fill-red { background: #b91c1c; }

/* PENDIENTES */
.pending-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap: 16px; background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; border-radius: 0 0 6px 6px; }
.pending-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
.pending-card-header { background: #0f172a; color: #fff; padding: 12px 16px; border-radius: 5px 5px 0 0; display: flex; justify-content: space-between; align-items: center; }
.pending-origin-name { font-size: 11.5px; font-weight: 600; letter-spacing: .02em; display: flex; align-items: center; gap: 8px; color: #f1f5f9; }
.pending-badge { background: #0f766e; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; }
.pending-list-scroll { max-height: 250px; overflow-y: auto; padding: 8px; }
.pending-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f1f5f9; border-radius: 4px; }
.pending-item:hover { background: #f8fafc; }
.pending-item:last-child { border-bottom: none; }
.pending-lead-name { font-size: 12.5px; font-weight: 600; color: #0f172a; margin-bottom: 2px; }
.pending-lead-meta { font-size: 11px; color: #94a3b8; }
.btn-manage { background: transparent; border: 1px solid #cbd5e1; color: #475569; font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 4px; cursor: pointer; transition: all .2s; white-space: nowrap; }
.btn-manage:hover { background: #f0fdf4; color: #0f766e; border-color: #5eead4; }

/* FOOTER */
.exec-footer { display: flex; align-items: center; gap: 10px; padding: 10px 28px; background: #fff; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #94a3b8; font-weight: 500; }
.exec-footer strong { color: #475569; }
.footer-sep { color: #e2e8f0; }
.footer-status { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok { background: #22c55e; }
.dot-loading { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }

/* UTILS */
.c-green { color: #15803d; } .c-amber { color: #b45309; } .c-red { color: #b91c1c; } .c-teal { color: #0f766e; font-weight: 600; }
.mb-4 { margin-bottom: 24px; }
.text-right { text-align: right; } .text-center { text-align: center; } .text-muted { color: #94a3b8; } .text-mono { font-variant-numeric: tabular-nums; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.fade-in { animation: fadeIn .35s ease; }
.spin { animation: spin .8s linear infinite; }
@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes pulse  { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* RESPONSIVE */
@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .chart-grid-2 { grid-template-columns: 1fr; }
  .pc-header { flex-direction: column; gap: 10px; }
  .pc-header-right { flex-direction: row; align-items: flex-start; }
}
@media (max-width: 640px) {
  .exec-body { padding: 16px; }
  .pc-steps-wrapper { padding: 14px 10px 4px; }
  .pc-step-col { min-width: 100px; }
  .sn-big { font-size: 15px; }
}
</style>