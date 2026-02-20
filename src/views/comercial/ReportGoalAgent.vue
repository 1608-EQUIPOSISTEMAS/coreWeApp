<template>
  <div class="exec-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gestión Comercial &amp; Financiera</span>
            <h1 class="brand-title">Tablero de Cronograma y Objetivos</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button @click="toggleView" class="btn-exec btn-exec-ghost">
            <svg v-if="!isDashboard" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            {{ isDashboard ? 'Vista Tabular' : 'Vista Gráfica' }}
          </button>
          <button class="btn-exec btn-exec-primary" @click="loadData" :disabled="isLoading">
            <svg :class="{ 'spin': isLoading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {{ isLoading ? 'Actualizando…' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

      <div class="masthead-filters">
        <div class="filter-group">
          <label class="filter-label">AÑO</label>
          <select v-model="filters.year" class="exec-select" @change="loadData">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
            <option :value="2024">2024</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">PERÍODO</label>
          <select v-model="filters.month" class="exec-select" @change="loadData">
            <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">DIMENSIÓN</label>
          <select v-model="selectedMetricGroup" class="exec-select">
            <option value="clientes">Clientes</option>
            <option value="origen">Origen / Vías</option>
            <option value="asesores">Asesores</option>
            <option value="comercial">Estado Comercial</option>
          </select>
        </div>

        <div class="filter-spacer"></div>

        <transition name="slide-fade">
          <div class="masthead-kpis" v-if="!isDashboard && !isLoading">
            <div class="inline-kpi">
              <span class="inline-kpi-label">META M.</span>
              <span class="inline-kpi-value">{{ formatMoney(totalObjetivo) }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">VENTA M.</span>
              <span class="inline-kpi-value accent">{{ formatMoney(totalVenta) }}</span>
            </div>
            <div class="inline-kpi" style="margin-right: 20px;">
              <span class="inline-kpi-label">LOGRO M.</span>
              <span class="inline-kpi-value" :class="pctClass(calcPct(totalVenta, totalObjetivo))">
                {{ calcPct(totalVenta, totalObjetivo) }}%
              </span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">META VAC.</span>
              <span class="inline-kpi-value" style="color: var(--slate-300)">{{ totalObjetivoVacantes }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">INSCRITOS</span>
              <span class="inline-kpi-value" style="color: var(--gold-400)">{{ totalVentaVacantes }}</span>
            </div>
          </div>
        </transition>
      </div>
    </header>

    <main class="exec-body">

      <div v-if="isLoading" class="exec-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Procesando datos del período…</p>
      </div>

      <div v-else-if="!isDashboard" class="view-table">
        <div class="table-shell">
          <table class="exec-table">
            <thead>
              <tr class="thead-group">
                <th class="th-cat" rowspan="3">Cat.</th>
                <th colspan="5" class="th-group th-group-a" rowspan="2">DATOS DEL PROGRAMA</th>
                <th colspan="6" class="th-group th-group-b" rowspan="2">OBJETIVOS &amp; RESULTADOS</th>
                <th :colspan="currentDynamicColumnsFlat.length || 1" class="th-group th-group-c">
                  {{ currentGroupTitle }}
                </th>
              </tr>
              
              <tr class="thead-sub-group">
                <template v-if="currentDynamicColumnGroups.length > 0">
                  <th 
                    v-for="g in currentDynamicColumnGroups" 
                    :key="g.groupName" 
                    :colspan="g.colspan" 
                    class="th-group th-group-c" 
                    style="border-top: 1px solid rgba(16, 185, 129, 0.2); background: #e6f8f1; font-size: 9.5px;"
                  >
                    <span v-if="selectedMetricGroup === 'origen'">{{ g.groupName }}</span>
                    <span v-else>Detalle General</span>
                  </th>
                </template>
                <th v-else class="th-group th-group-c" style="border-top: 1px solid rgba(16, 185, 129, 0.2);">—</th>
              </tr>

              <tr class="thead-sub">
                <th class="ts ts-a text-center">LÍNEA</th>
                <th class="ts ts-a">PROGRAMA</th>
                <th class="ts ts-a text-center">TIPO</th>
                <th class="ts ts-a text-center">INICIO</th>
                <th class="ts ts-a text-center">ED.</th>
                
                <th class="ts ts-b text-right">META S/.</th>
                <th class="ts ts-b text-right">VENTA S/.</th>
                <th class="ts ts-b text-center" style="border-right: 1px solid #d1fae5;">LOGRO M.</th>
                <th class="ts ts-b text-center">META VAC.</th>
                <th class="ts ts-b text-center">INSCRITOS</th>
                <th class="ts ts-b text-center">LOGRO V.</th>
                
                <th
                  v-for="col in currentDynamicColumnsFlat"
                  :key="col.key"
                  class="ts ts-c text-center"
                >
                  <span class="col-dyn-name">{{ col.displayName }}</span>
                  <span class="col-dyn-sub"># / %</span>
                </th>
                <th v-if="currentDynamicColumnsFlat.length === 0" class="ts ts-c text-center text-muted">—</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, i) in processedData"
                :key="i"
                class="tbody-row"
                :class="{ 'row-alt': i % 2 === 0 }"
              >
                <td class="td-cat">
                  <span class="pill" :class="pillClass(row.catg)">{{ row.catg }}</span>
                </td>
                <td class="td-a text-center text-mono text-muted">{{ row.linea }}</td>
                <td class="td-a td-prog" :title="row.programa">{{ row.programa }}</td>
                <td class="td-a text-center">
                  <span class="tipo-tag">{{ row.tipo }}</span>
                </td>
                <td class="td-a text-center text-mono text-muted small">{{ formatDate(row.fecha) }}</td>
                <td class="td-a text-center text-mono text-muted small">{{ row.edicion }}</td>

                <td class="td-b text-right text-muted small">{{ formatMoney(row.objetivo) }}</td>
                <td class="td-b text-right fw-600">{{ formatMoney(row.venta) }}</td>
                <td class="td-b text-center" style="border-right: 1px solid #d5f5e0;">
                  <span class="logro-badge" :class="logroBadgeClass(calcPct(row.venta, row.objetivo))">
                    {{ calcPct(row.venta, row.objetivo) }}%
                  </span>
                </td>
                <td class="td-b text-center text-muted small">{{ row.objetivo_vacantes }}</td>
                <td class="td-b text-center fw-600" style="color: #0f766e;">{{ row.venta_vacantes }}</td>
                <td class="td-b text-center">
                  <span class="logro-badge" :class="logroBadgeClass(calcPct(row.venta_vacantes, row.objetivo_vacantes))">
                    {{ calcPct(row.venta_vacantes, row.objetivo_vacantes) }}%
                  </span>
                </td>

                <td
                  v-for="col in currentDynamicColumnsFlat"
                  :key="col.key"
                  class="td-c text-center"
                  :class="getDynBgClass(row._raw, currentGroupField, col.originalName)"
                >
                  <span class="dyn-count">{{ getDynamicValue(row._raw, currentGroupField, col.originalName, 'cant') }}</span>
                  <span class="dyn-pct">{{ getDynamicValue(row._raw, currentGroupField, col.originalName, 'pct') }}%</span>
                </td>
                <td v-if="currentDynamicColumnsFlat.length === 0" class="td-c text-center text-muted">—</td>
              </tr>
            </tbody>

            <tfoot>
              <tr class="tfoot-row">
                <td colspan="6" class="tfoot-label">TOTALES CONSOLIDADOS</td>
                <td class="text-right fw-600 text-muted">{{ formatMoney(totalObjetivo) }}</td>
                <td class="text-right fw-700 accent-text">{{ formatMoney(totalVenta) }}</td>
                <td class="text-center" style="border-right: 1px solid var(--navy-700);">
                  <span class="logro-badge logro-lg" :class="logroBadgeClass(calcPct(totalVenta, totalObjetivo))">
                    {{ calcPct(totalVenta, totalObjetivo) }}%
                  </span>
                </td>
                <td class="text-center fw-600 text-muted">{{ totalObjetivoVacantes }}</td>
                <td class="text-center fw-700 accent-text">{{ totalVentaVacantes }}</td>
                <td class="text-center">
                  <span class="logro-badge logro-lg" :class="logroBadgeClass(calcPct(totalVentaVacantes, totalObjetivoVacantes))">
                    {{ calcPct(totalVentaVacantes, totalObjetivoVacantes) }}%
                  </span>
                </td>
                <td
                  v-for="col in currentDynamicColumnsFlat"
                  :key="`t-${col.key}`"
                  class="text-center fw-600"
                >
                  {{ getDynamicTotal(currentGroupField, col.originalName) }}
                </td>
                <td v-if="currentDynamicColumnsFlat.length === 0" class="text-center">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div v-else class="view-dashboard">

        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">LOGRO GLOBAL</span>
              <div class="kpi-indicator" :class="kpiStats.globalPct >= 80 ? 'ind-green' : 'ind-amber'"></div>
            </div>
            <div class="kpi-card-value" :class="pctClass(kpiStats.globalPct)">{{ kpiStats.globalPct }}%</div>
            <div class="kpi-progress">
              <div class="kpi-progress-fill" :class="kpiStats.globalPct >= 80 ? 'fill-green' : 'fill-amber'"
                :style="`width: ${Math.min(kpiStats.globalPct, 100)}%`"></div>
            </div>
            <div class="kpi-card-sub">Sobre la meta financiera acumulada</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">VENTA TOTAL</span>
              <div class="kpi-indicator ind-blue"></div>
            </div>
            <div class="kpi-card-value">{{ formatMoney(totalVenta) }}</div>
            <div class="kpi-card-sub meta-line">Meta: {{ formatMoney(totalObjetivo) }}</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">PROGRAMAS ACTIVOS</span>
              <div class="kpi-indicator ind-slate"></div>
            </div>
            <div class="kpi-card-value accent-text">{{ processedData.length }}</div>
            <div class="kpi-card-sub">Registros del período seleccionado</div>
          </div>

          <div class="kpi-card kpi-card-highlight">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color: var(--gold-400)">TOP PROGRAMA</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-400)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div class="kpi-card-value kpi-card-top-name" :title="kpiStats.topProgram.name">{{ kpiStats.topProgram.name }}</div>
            <div class="kpi-card-sub" style="color: var(--gold-400); font-weight: 600;">{{ formatMoney(kpiStats.topProgram.venta) }}</div>
          </div>
        </div>

        <div class="chart-grid-2">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Cumplimiento de Meta por Línea de Negocio</div>
                <div class="chart-panel-sub">Comparativa Meta S/. vs Venta Real S/. agrupado por Línea</div>
              </div>
              <div class="chart-legend-inline">
                <span class="legend-dot" style="background:#cbd5e1"></span><span>Meta</span>
                <span class="legend-dot" style="background:var(--teal-500)"></span><span>Venta</span>
              </div>
            </div>
            <div class="chart-area">
              <Bar :data="lineaRevenueChartData" :options="groupedBarOptions" />
            </div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Ranking — % de Logro por Tipo</div>
                <div class="chart-panel-sub">Desempeño sobre la meta agrupado por Tipo de Programa</div>
              </div>
            </div>
            <div class="chart-area">
              <Bar :data="tipoRankingChartData" :options="rankingBarOptions" />
            </div>
          </div>
        </div>

        <div class="chart-grid-3">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Distribución — {{ currentGroupTitle }}</div>
                <div class="chart-panel-sub">Total acumulado global</div>
              </div>
            </div>
            <div class="chart-area chart-area-donut">
              <Doughnut :data="dynamicDoughnutChartData" :options="doughnutOptions" />
            </div>
          </div>

          <div class="chart-panel chart-panel-wide">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Composición de {{ currentGroupTitle }} por Categoría</div>
                <div class="chart-panel-sub">Distribución en cantidades absolutas agrupadas por Cat.</div>
              </div>
            </div>
            <div class="chart-area">
              <Bar :data="catgStackedChartData" :options="stackedBarOptions" />
            </div>
          </div>
        </div>

        <div class="chart-panel chart-panel-full">
          <div class="chart-panel-header">
            <div>
              <div class="chart-panel-title">Matriz de Portafolio — Adaptación BCG</div>
              <div class="chart-panel-sub">Ventas S/. (Eje X) vs % Cumplimiento de Meta (Eje Y) · Cada punto representa un programa</div>
            </div>
            <div class="bcg-legend">
              <span class="bcg-leg bcg-star">Estrellas</span>
              <span class="bcg-leg bcg-cow">Vacas</span>
              <span class="bcg-leg bcg-q">Interrogantes</span>
              <span class="bcg-leg bcg-dog">Perros</span>
            </div>
          </div>
          <div class="chart-area chart-area-bcg">
            <div class="bcg-quadrant-labels">
              <span class="qlab qlab-tl">INTERROGANTES</span>
              <span class="qlab qlab-tr">ESTRELLAS</span>
              <span class="qlab qlab-bl">PERROS</span>
              <span class="qlab qlab-br">VACAS</span>
            </div>
            <Scatter :data="bcgChartData" :options="bcgChartOptions" />
          </div>
        </div>

      </div>
    </main>

    <footer class="exec-footer">
      <span>Período: <strong>{{ monthName }} {{ filters.year }}</strong></span>
      <span class="footer-sep">·</span>
      <span>Dimensión activa: <strong>{{ currentGroupTitle }}</strong></span>
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
import { ServiceKeys } from '@/services'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Bar, Doughnut, Scatter } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const isLoading = ref(false)
const isDashboard = ref(false)
const selectedMetricGroup = ref('origen')
const filters = ref({ year: 2026, month: 1 })
const rawData = ref([])

const metricGroupDefinitions = {
  clientes:  { title: 'CLIENTES',         field: 'breakdown_clientes' },
  origen:    { title: 'ORIGEN / VÍAS',    field: 'breakdown_origen' },
  asesores:  { title: 'ASESORES',         field: 'breakdown_asesores' },
  comercial: { title: 'ESTADO COMERCIAL', field: 'breakdown_estado_comercial' }
}

const CHART_COLORS = ['#0f766e','#0369a1','#b45309','#7c3aed','#be123c','#0284c7','#12274e','#a16207','#6d28d9','#475569']

onMounted(() => loadData())

async function loadData() {
  isLoading.value = true
  try {
    const payload = { year: filters.value.year, month_num: filters.value.month }
    const response = await dashboardService.programGoalsList(payload)
    rawData.value = response.items || []
  } catch (e) { console.error(e) }
  finally { isLoading.value = false }
}

const toggleView = () => { isDashboard.value = !isDashboard.value }

const currentGroupTitle = computed(() => metricGroupDefinitions[selectedMetricGroup.value].title)
const currentGroupField = computed(() => metricGroupDefinitions[selectedMetricGroup.value].field)
const monthName = computed(() => months[filters.value.month - 1])

// ── LÓGICA DE SUB-CABECERAS ──
const currentDynamicColumnGroups = computed(() => {
  const field = currentGroupField.value
  const groupsMap = {} 

  rawData.value.forEach(row => {
    (row[field] || []).forEach(item => {
      if (item.name) {
        // En "breakdown_origen" el backend enviará "group" (MARKETING, ESTRATEGIAS, OTROS).
        // En otras dimensiones, caerá en el fallback ("General")
        const groupName = item.group || 'General'
        if (!groupsMap[groupName]) groupsMap[groupName] = new Set()
        groupsMap[groupName].add(item.name)
      }
    })
  })

  const result = []
  for (const [groupName, namesSet] of Object.entries(groupsMap)) {
    const sortedNames = Array.from(namesSet).sort().map(name => ({
      key: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      displayName: name, 
      originalName: name,
      group: groupName
    }))
    result.push({
      groupName,
      colspan: sortedNames.length,
      columns: sortedNames
    })
  }

  // Ordenar grupos. Si es origen, fuerza MARKETING > ESTRATEGIAS > OTROS. Si no, alfabético.
  if (field === 'breakdown_origen') {
    const order = { 'MARKETING': 1, 'ESTRATEGIAS': 2, 'OTROS': 3 }
    result.sort((a, b) => (order[a.groupName] || 99) - (order[b.groupName] || 99))
  } else {
    result.sort((a, b) => a.groupName.localeCompare(b.groupName))
  }
  
  return result
})

// Columnas planas extraídas de los grupos ordenados
const currentDynamicColumnsFlat = computed(() => {
  return currentDynamicColumnGroups.value.flatMap(g => g.columns)
})

const processedData = computed(() => rawData.value.map(item => ({
  catg: item.categoria || 'GEN', linea: item.linea || '—',
  programa: item.programa, tipo: item.tipo,
  fecha: item.fecha_inicio || item.inicio,
  edicion: item.codigo_edicion || item.codigo,
  objetivo: item.meta_monto, venta: item.venta_monto,
  objetivo_vacantes: item.meta_vacantes || 0,
  venta_vacantes: item.venta_cantidad || 0,
  _raw: item
})))

const totalObjetivo = computed(() => processedData.value.reduce((s, r) => s + (r.objetivo || 0), 0))
const totalVenta    = computed(() => processedData.value.reduce((s, r) => s + (r.venta || 0), 0))
const totalObjetivoVacantes = computed(() => processedData.value.reduce((s, r) => s + (r.objetivo_vacantes || 0), 0))
const totalVentaVacantes    = computed(() => processedData.value.reduce((s, r) => s + (r.venta_vacantes || 0), 0))

const kpiStats = computed(() => {
  const globalPct = totalObjetivo.value > 0 ? Math.round((totalVenta.value / totalObjetivo.value) * 100) : 0
  const sorted = [...processedData.value].sort((a, b) => b.venta - a.venta)
  return {
    globalPct,
    topProgram: sorted.length ? { name: sorted[0].programa, venta: sorted[0].venta } : { name: '—', venta: 0 }
  }
})

// ── Helpers ──
function getDynamicValue(rawRow, field, searchName, type) {
  const arr = rawRow[field] || []
  const found = arr.find(x => x.name === searchName)
  const cant = found ? Number(found.count) : 0
  if (type === 'cant') return cant
  const total = arr.reduce((s, c) => s + Number(c.count), 0)
  return total > 0 ? Math.round((cant / total) * 100) : 0
}

function getDynamicTotal(field, searchName) {
  return rawData.value.reduce((sum, raw) => {
    const found = (raw[field] || []).find(x => x.name === searchName)
    return sum + (found ? Number(found.count) : 0)
  }, 0)
}

function getDynBgClass(rawRow, field, searchName) {
  const pct = getDynamicValue(rawRow, field, searchName, 'pct')
  if (pct >= 15) return 'bg-dyn-high'
  if (pct > 0)   return 'bg-dyn-low'
  return ''
}

function formatMoney(v) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v || 0)
}
function formatDate(d) { return d ? d.split('T')[0].split('-').reverse().join('/') : '—' }
function calcPct(v, o) { return (!o || o === 0) ? 0 : Math.round((v / o) * 100) }
function truncate(s, n) { return s && s.length > n ? s.substring(0, n) + '…' : (s || '') }
function pctClass(p)    { return p >= 100 ? 'c-green' : p >= 80 ? 'c-blue' : 'c-red' }
function logroBadgeClass(p) { return p >= 100 ? 'logro-success' : p >= 80 ? 'logro-info' : 'logro-danger' }
function pillClass(catg) {
  const m = { CURSO: 'pill-blue', DIPLOMADO: 'pill-violet', PEE: 'pill-amber', 'ESP.': 'pill-teal' }
  return m[catg] || 'pill-slate'
}

// ── Charts Data ──
const dynamicDoughnutChartData = computed(() => ({
  labels: currentDynamicColumnsFlat.value.map(c => c.displayName),
  datasets: [{
    data: currentDynamicColumnsFlat.value.map(c => getDynamicTotal(currentGroupField.value, c.originalName)),
    backgroundColor: CHART_COLORS.slice(0, currentDynamicColumnsFlat.value.length),
    borderWidth: 3, borderColor: '#ffffff'
  }]
}))

const catgStackedChartData = computed(() => {
  const grouped = groupDataBy('catg')
  grouped.sort((a, b) => a.name.localeCompare(b.name)) 
  
  return {
    labels: grouped.map(g => truncate(g.name, 20)),
    datasets: currentDynamicColumnsFlat.value.map((col, idx) => ({
      label: col.displayName,
      data: grouped.map(g => g.rawItems.reduce((sum, raw) => sum + getDynamicValue(raw, currentGroupField.value, col.originalName, 'cant'), 0)),
      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
      stack: 'stack1'
    }))
  }
})

function groupDataBy(key) {
  const grouped = {}
  processedData.value.forEach(d => {
    const val = d[key] || 'Sin Asignar'
    if (!grouped[val]) {
      grouped[val] = { name: val, objetivo: 0, venta: 0, rawItems: [] }
    }
    grouped[val].objetivo += (d.objetivo || 0)
    grouped[val].venta += (d.venta || 0)
    grouped[val].rawItems.push(d._raw)
  })
  return Object.values(grouped)
}

const lineaRevenueChartData = computed(() => {
  const grouped = groupDataBy('linea')
  grouped.sort((a, b) => b.objetivo - a.objetivo) 
  
  return {
    labels: grouped.map(g => truncate(g.name, 22)),
    datasets: [
      { label: 'Meta S/.', data: grouped.map(g => g.objetivo), backgroundColor: '#e2e8f0', borderRadius: 3, borderSkipped: false },
      { label: 'Venta S/.', data: grouped.map(g => g.venta), backgroundColor: '#0f766e', borderRadius: 3, borderSkipped: false }
    ]
  }
})

const tipoRankingChartData = computed(() => {
  const grouped = groupDataBy('tipo')
    .filter(g => g.objetivo > 0 || g.venta > 0)
    .sort((a, b) => calcPct(b.venta, b.objetivo) - calcPct(a.venta, a.objetivo)) 
    
  const pcts = grouped.map(g => calcPct(g.venta, g.objetivo))
  
  return {
    labels: grouped.map(g => truncate(g.name, 22)),
    datasets: [
      {
        label: '% Logro', data: pcts, borderRadius: 4,
        backgroundColor: pcts.map(p => p >= 100 ? '#0f766e' : p >= 80 ? '#0369a1' : '#be123c')
      },
      { label: 'Meta 100%', data: grouped.map(() => 100), type: 'line', borderColor: 'rgba(0,0,0,0.25)', borderDash: [4,3], borderWidth: 1.5, pointRadius: 0, fill: false }
    ]
  }
})

const bcgChartData = computed(() => {
  const avgVenta = totalVenta.value / (processedData.value.length || 1)
  const points = processedData.value.map(d => ({
    x: d.venta, y: calcPct(d.venta, d.objetivo),
    programa: truncate(d.programa, 28), catg: d.catg
  }))
  return {
    datasets: [{
      label: 'Programas',
      data: points,
      backgroundColor: points.map(d =>
        d.x >= avgVenta && d.y >= 100 ? 'rgba(15,118,110,0.82)' :
        d.x >= avgVenta             ? 'rgba(3,105,161,0.82)' :
        d.y >= 100                  ? 'rgba(180,83,9,0.82)'  :
                                      'rgba(190,18,60,0.82)'
      ),
      borderColor: '#fff', borderWidth: 2,
      pointRadius: 9, pointHoverRadius: 12
    }]
  }
})

// ── Chart Options ──
const baseFont = { family: 'inherit', size: 11 }

const groupedBarOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: baseFont } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: baseFont } }
  }
}

const rankingBarOptions = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } } },
  scales: {
    x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%', font: baseFont } },
    y: { grid: { display: false }, ticks: { font: baseFont } }
  }
}

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: baseFont } }
  }
}

const stackedBarOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: baseFont } },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { font: baseFont } },
    y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: baseFont } }
  }
}

const bcgChartOptions = computed(() => {
  const avgVenta = totalVenta.value / (processedData.value.length || 1)
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const d = ctx.raw
            const quad = d.x >= avgVenta && d.y >= 100 ? 'Estrella' : d.x >= avgVenta ? 'Vaca' : d.y >= 100 ? 'Interrogante' : 'Perro'
            return [` ${d.programa}`, ` S/ ${new Intl.NumberFormat('es-PE').format(d.x)}`, ` Logro: ${d.y}%`, ` ▸ ${quad}`]
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Ventas (S/.) →', font: { ...baseFont, weight: 600 } },
        grid: { color: '#f1f5f9' }, ticks: { font: baseFont }
      },
      y: {
        title: { display: true, text: '% Cumplimiento →', font: { ...baseFont, weight: 600 } },
        beginAtZero: true,
        grid: { color: ctx => ctx.tick.value === 100 ? 'rgba(0,0,0,0.2)' : '#f1f5f9' },
        ticks: { font: baseFont }
      }
    }
  }
})
</script>
<style scoped>
/* ═══════════════════════════════════════════════
   TOKENS / RESET
═══════════════════════════════════════════════ */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.exec-shell {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.4;
}

/* ═══════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════ */
.exec-masthead {
  background: #0f172a;
  color: #fff;
  border-bottom: 1px solid #1e293b;
}

.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 14px; }


.brand-rule {
  width: 3px; height: 42px;
  background: #2e3e91; border-radius: 2px; flex-shrink: 0;
}

.brand-eyebrow {
  display: block; font-size: 9.5px; letter-spacing: 0.15em;
  text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 3px;
}

.brand-title {
  font-size: 17px; font-weight: 700; margin: 0;
  letter-spacing: -0.01em; color: #fff;
}

.masthead-actions { display: flex; gap: 10px; align-items: center; }

.btn-exec {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 15px; border-radius: 4px; font-size: 12px;
  font-weight: 600; letter-spacing: 0.01em; cursor: pointer;
  border: none; font-family: inherit;
  transition: background 0.15s, opacity 0.15s;
}
.btn-exec-ghost {
  background: rgba(255,255,255,0.07); color: #94a3b8;
  border: 1px solid rgba(255,255,255,0.12);
}
.btn-exec-ghost:hover { background: rgba(255,255,255,0.12); color: #fff; }
.btn-exec-primary { background: #12274e; color: #fff; }
.btn-exec-primary:hover:not(:disabled) { background: #12274e; }
.btn-exec-primary:disabled { opacity: 0.5; cursor: default; }

/* Filtros */
.masthead-filters {
  display: flex; align-items: center;
  padding: 0 28px; min-height: 52px;
}

.filter-group { display: flex; flex-direction: column; gap: 2px; padding: 10px 20px 10px 0; }

.filter-label {
  font-size: 9px; letter-spacing: 0.13em; text-transform: uppercase;
  color: #64748b; font-weight: 700; cursor: default;
}

.exec-select {
  background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,0.16);
  color: #fff; font-family: 'IBM Plex Sans', inherit;
  font-size: 12.5px; font-weight: 500; padding: 3px 0;
  outline: none; cursor: pointer; min-width: 100px; appearance: auto;
}
.exec-select option { color: #0f172a; background: #fff; }

.filter-sep { width: 1px; height: 30px; background: rgba(255,255,255,0.09); margin: 0 20px 0 0; }
.filter-spacer { flex: 1; }

/* Modalidad toggle */
.modality-toggle { display: flex; }
.mod-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.07em; cursor: pointer;
  background: rgba(255,255,255,0.05); color: #64748b;
  border: 1px solid rgba(255,255,255,0.1);
  font-family: inherit; transition: all 0.15s; text-transform: uppercase;
}
.mod-btn:first-child { border-radius: 3px 0 0 3px; }
.mod-btn:last-child  { border-radius: 0 3px 3px 0; border-left: none; }
.mod-btn.active { background: rgba(20,184,166,0.18); color: #12274e; border-color: rgba(20,184,166,0.4); }

/* KPIs inline */
.masthead-kpis { display: flex; gap: 28px; align-items: center; }
.inline-kpi { text-align: right; }
.inline-kpi-label {
  display: block; font-size: 9px; letter-spacing: 0.13em;
  text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px;
}
.inline-kpi-value {
  font-size: 14px; font-weight: 700; color: #fff;
  font-variant-numeric: tabular-nums;
}
.inline-kpi-value.accent { color: #12274e; }

/* ═══════════════════════════════════════════════
   CUERPO
═══════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 22px 28px; }

.exec-loader {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 420px; gap: 14px;
}
.loader-ring {
  width: 38px; height: 38px;
  border: 3px solid #e2e8f0; border-top-color: #12274e;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
.loader-text { font-size: 13px; color: #64748b; font-weight: 500; letter-spacing: 0.02em; }

/* ═══════════════════════════════════════════════
   TABLA EJECUTIVA
═══════════════════════════════════════════════ */
.view-table { display: flex; flex-direction: column; gap: 18px; }

.table-shell {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;
  overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.exec-table {
  width: 100%; border-collapse: collapse;
  font-size: 12.5px; min-width: 1100px;
}

/* Header grupos */
.thead-group th {
  padding: 7px 10px; font-size: 9.5px; letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #e2e8f0;
}
.th-cat   { background: #0f172a; color: #64748b; padding-left: 14px; border-right: 2px solid #1e293b; min-width: 120px; vertical-align: middle; }
.th-group-a { background: #eff6ff; color: #1e40af; border-left: 2px solid #bfdbfe; text-align: center; }
.th-group-b { background: #f0fdf4; color: #166534; border-left: 2px solid #bbf7d0; text-align: center; }
.th-group-c { background: #f8fafc; color: #475569; border-left: 2px solid #e2e8f0; text-align: center; }
.th-group-d { background: #1e293b; color: #12274e; border-left: 2px solid #334155; text-align: center; }

/* Sub-header */
.thead-sub .ts {
  padding: 6px 10px; font-size: 9px; letter-spacing: 0.08em;
  text-transform: uppercase; font-weight: 600;
  border-bottom: 2px solid #e2e8f0;
}
.ts-a { background: #f0f7ff; color: #2563eb; border-left: 1px solid #dbeafe; }
.ts-b { background: #f0fdf4; color: #16a34a; border-left: 1px solid #d1fae5; }
.ts-c { background: #f8fafc; color: #475569; border-left: 1px solid #e2e8f0; }
.ts-d { background: #1e293b; color: #12274e; border-left: 1px solid #334155; }

/* Body rows */
.tbody-row td { padding: 8px 10px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.tbody-row:last-child td { border-bottom: none; }
.row-alt { background: #fafbfc; }
.tbody-row:hover td { background: #f0f9ff !important; transition: background 0.1s; }

.td-asesor {
  padding-left: 14px; font-weight: 700; color: #0f172a;
  background: #fff; border-right: 2px solid #e2e8f0; white-space: nowrap;
}
.td-a { background: #f8fbff; border-left: 1px solid #e0eeff; }
.td-b { background: #f7fdf9; border-left: 1px solid #d5f5e0; }
.td-c { background: #f8fafc; border-left: 1px solid #e2e8f0; color: #475569; }
.td-d { background: #1a2744; color: #e2e8f0; border-left: 1px solid #2d3f5f; }

/* Tfoot */
.tfoot-row td {
  padding: 9px 10px; background: #0f172a; color: #fff;
  font-size: 12px; font-weight: 600; border-top: 2px solid #1e293b;
}
.tfoot-label { padding-left: 14px; font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; color: #64748b; }

.empty-row { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }

/* Indicadores estado */
.gap-neg { color: #b91c1c; font-weight: 700; }
.gap-pos { color: #15803d; font-weight: 700; }

.actionable { text-decoration: underline dotted #94a3b8; cursor: pointer; transition: color 0.12s; }
.actionable:hover { color: #12274e !important; text-decoration-color: #12274e; }

.status-pill {
  display: inline-block; padding: 2px 9px; border-radius: 3px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
}
.status-ok  { background: #dcfce7; color: #15803d; }
.status-low { background: #fee2e2; color: #b91c1c; }

/* ═══════════════════════════════════════════════
   MICRO-GESTIÓN
═══════════════════════════════════════════════ */
.micro-panel {
  background: #fff; border: 1px solid #e2e8f0;
  border-top: 3px solid #0f172a; border-radius: 6px;
  overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.micro-panel-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
}

.micro-panel-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; color: #0f172a;
}
.micro-panel-sub { font-size: 11px; color: #94a3b8; margin: 3px 0 0 22px; }

.micro-filter { display: flex; flex-direction: column; gap: 3px; }
.filter-label-dark {
  font-size: 9px; letter-spacing: 0.13em; text-transform: uppercase;
  color: #94a3b8; font-weight: 700;
}
.exec-select-dark {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 4px;
  color: #0f172a; font-family: 'IBM Plex Sans', inherit;
  font-size: 12.5px; font-weight: 500; padding: 5px 10px;
  outline: none; cursor: pointer; min-width: 220px;
}
.exec-select-dark:focus { border-color: #12274e; box-shadow: 0 0 0 2px rgba(13,148,136,0.15); }

/* Days grid */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  padding: 16px 20px;
}

.day-card {
  border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden;
  background: #fafbfc; transition: transform 0.15s, box-shadow 0.15s;
}
.day-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.07); }
.day-card-active { border-color: #12274e; background: #fff; }

.day-card-header { padding: 5px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
.dh-active { background: rgba(13,148,136,0.08); }
.dh-empty  { background: #f1f5f9; }
.day-name  { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }
.day-card-active .day-name { color: #12274e; }

.day-card-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.day-metric {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 5px; border-bottom: 1px solid #f1f5f9;
}
.day-metric:last-child { border-bottom: none; padding-bottom: 0; }

.day-metric-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
.day-metric-val   { font-size: 13px; font-weight: 700; color: #0f172a; cursor: pointer; }
.day-metric-val:hover { color: #12274e; }
.day-metric-group { display: flex; flex-direction: column; align-items: flex-end; }
.day-metric-sub   { font-size: 9.5px; color: #94a3b8; font-variant-numeric: tabular-nums; }

/* ═══════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════ */
.view-dashboard { display: flex; flex-direction: column; gap: 18px; }

/* KPI strip */
.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

.kpi-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;
  padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: box-shadow 0.15s, transform 0.15s;
}
.kpi-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }

.kpi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.kpi-card-label {
  font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase;
  font-weight: 700; color: #94a3b8;
}
.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-green { background: #22c55e; }
.ind-red   { background: #ef4444; }
.ind-amber { background: #f59e0b; }
.ind-blue  { background: #3b82f6; }

.kpi-card-value {
  font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums; margin-bottom: 7px; color: #0f172a;
}
.kpi-progress { height: 3px; background: #f1f5f9; border-radius: 2px; margin-bottom: 7px; overflow: hidden; }
.kpi-progress-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.fill-green { background: #22c55e; }
.fill-amber { background: #f59e0b; }
.fill-red   { background: #ef4444; }
.fill-blue  { background: #3b82f6; }
.fill-slate { background: #94a3b8; }
.kpi-card-sub { font-size: 11px; color: #94a3b8; font-variant-numeric: tabular-nums; }

/* Chart panels */
.chart-panel {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;
  overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.chart-panel-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 14px 18px; border-bottom: 1px solid #f1f5f9;
  flex-wrap: wrap; gap: 8px;
}
.chart-panel-title { font-size: 13px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
.chart-panel-sub   { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.chart-area        { padding: 14px 18px; height: 290px; }
.chart-area-lg     { height: 330px; }
.chart-area-donut  { height: 190px; }

.chart-legend-inline {
  display: flex; gap: 14px; align-items: center;
  font-size: 11px; color: #64748b; font-weight: 500; flex-shrink: 0;
}
.legend-line { display: inline-block; width: 22px; height: 2.5px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
.legend-dashed {
  display: inline-block; width: 22px; height: 0;
  border-top: 2px dashed #ef4444; margin-right: 4px; vertical-align: middle;
}
.legend-dot-sq { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }

/* Grids de gráficos */
.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.chart-grid-pipeline {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 16px;
  align-items: start;
}
.chart-col-right { display: flex; flex-direction: column; gap: 16px; min-width: 240px; }

/* Funnel */
.funnel-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
.funnel-step { cursor: pointer; }
.funnel-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.funnel-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
.funnel-label-amber { color: #b45309; }
.funnel-label-green { color: #15803d; }
.funnel-value { font-size: 15px; font-weight: 700; color: #0f172a; }
.funnel-bar   { height: 10px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.funnel-fill  { height: 100%; border-radius: 3px; transition: width 0.7s ease; }
.funnel-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 10px; border-top: 1px solid #f1f5f9;
}
.funnel-footer-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }

/* ═══════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════ */
.exec-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 28px; background: #fff;
  border-top: 1px solid #e2e8f0;
  font-size: 11.5px; color: #94a3b8; font-weight: 500;
}
.exec-footer strong { color: #475569; }
.footer-sep { color: #e2e8f0; }
.footer-spacer { flex: 1; }
.footer-status { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok      { background: #22c55e; }
.dot-loading { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }

/* ═══════════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════════ */
.text-center { text-align: center; }
.text-right  { text-align: right; }
.text-muted  { color: #94a3b8; }
.small       { font-size: 11.5px; }
.fw-600      { font-weight: 600; }
.fw-700      { font-weight: 700; }
.accent-text { color: #12274e; }
.c-green     { color: #15803d; }
.c-amber     { color: #b45309; }
.c-red       { color: #b91c1c; }

/* ═══════════════════════════════════════════════
   ANIMACIONES
═══════════════════════════════════════════════ */
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.spin { animation: spin 0.8s linear infinite; }

.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from   { opacity: 0; transform: translateX(12px); }
.slide-fade-leave-to     { opacity: 0; transform: translateX(-8px); }

/* ═══════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════ */
@media (max-width: 1280px) {
  .chart-grid-pipeline { grid-template-columns: 1fr 1fr; }
  .chart-col-right { flex-direction: row; min-width: unset; grid-column: 1 / -1; }
}
@media (max-width: 1024px) {
  .days-grid { grid-template-columns: repeat(4, 1fr); }
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .chart-grid-2 { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .days-grid { grid-template-columns: repeat(2, 1fr); }
  .kpi-strip { grid-template-columns: 1fr; }
  .exec-body { padding: 14px; }
  .masthead-inner { padding: 14px; flex-direction: column; gap: 12px; align-items: flex-start; }
  .masthead-filters { flex-wrap: wrap; gap: 4px; }
}
</style>