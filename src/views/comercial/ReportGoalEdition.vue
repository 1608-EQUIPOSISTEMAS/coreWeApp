<template>
  <div class="exec-shell">

    <!-- ══════════════ MASTHEAD ══════════════ -->
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

      <!-- Filtros integrados en masthead -->
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

        <!-- KPIs en línea (solo en tabla) -->
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

    <!-- ══════════════ CUERPO ══════════════ -->
    <main class="exec-body">

      <!-- Estado: Cargando -->
      <div v-if="isLoading" class="exec-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Procesando datos del período…</p>
      </div>

      <!-- ── VISTA TABLA ── -->
      <div v-else-if="!isDashboard" class="view-table">
        <div class="table-shell">
          <table class="exec-table">
            <thead>
              <!-- FILA 1: Grupos principales -->
              <tr class="thead-group">
                <th class="th-cat" rowspan="3">Cat.</th>
                <th colspan="5" class="th-group th-group-a" rowspan="2">DATOS DEL PROGRAMA</th>
                <th colspan="6" class="th-group th-group-b" rowspan="2">OBJETIVOS &amp; RESULTADOS</th>
                <th :colspan="currentDynamicColumnsFlat.length || 1" class="th-group th-group-c">
                  {{ currentGroupTitle }}
                </th>
              </tr>

              <!-- FILA 2: Sub-grupos (MARKETING / ESTRATEGIAS / OTROS, o "General") -->
              <tr class="thead-sub-group">
                <template v-if="currentDynamicColumnGroups.length > 0">
                  <th
                    v-for="g in currentDynamicColumnGroups"
                    :key="g.groupName"
                    :colspan="g.colspan"
                    class="th-subgroup"
                    :class="subgroupClass(g.groupName)"
                  >
                    {{ selectedMetricGroup === 'origen' ? g.groupName : 'Detalle General' }}
                  </th>
                </template>
                <th v-else class="th-subgroup th-subgroup-general">—</th>
              </tr>

              <!-- FILA 3: Columnas individuales -->
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

      <!-- ── VISTA DASHBOARD ── -->
      <div v-else class="view-dashboard">

        <!-- KPI Strip -->
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

        <!-- Matriz BCG -->
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

    <!-- Footer de estado -->
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
  comercial: { title: 'ESTADO COMERCIAL', field: 'breakdown_estados' }
}

const CHART_COLORS = ['#0f766e','#0369a1','#b45309','#7c3aed','#be123c','#0284c7','#0d9488','#a16207','#6d28d9','#475569']

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

// ══════════════════════════════════════════════════════════════════
// LÓGICA DE COLUMNAS AGRUPADAS
// Para "breakdown_origen" el backend incluye el campo "group" en cada
// ítem del JSON: { group: "MARKETING"|"ESTRATEGIAS"|"OTROS", name, count }
// Para otras dimensiones el grupo se asume "General".
// ══════════════════════════════════════════════════════════════════

const currentDynamicColumnGroups = computed(() => {
  const field = currentGroupField.value
  const groupsMap = {}

  rawData.value.forEach(row => {
    ;(row[field] || []).forEach(item => {
      if (!item.name) return
      // En breakdown_origen el backend envía "group"; en los demás usamos "General"
      const groupName = item.group || 'General'
      if (!groupsMap[groupName]) groupsMap[groupName] = new Set()
      groupsMap[groupName].add(item.name)
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
    result.push({ groupName, colspan: sortedNames.length, columns: sortedNames })
  }

  // Ordenar grupos: MARKETING → ESTRATEGIAS → OTROS para origen; alfabético para el resto
  if (field === 'breakdown_origen') {
    const order = { 'MARKETING': 1, 'ESTRATEGIAS': 2, 'OTROS': 3 }
    result.sort((a, b) => (order[a.groupName] || 99) - (order[b.groupName] || 99))
  } else {
    result.sort((a, b) => a.groupName.localeCompare(b.groupName))
  }

  return result
})

// Lista plana de columnas respetando el orden de los grupos
const currentDynamicColumnsFlat = computed(() =>
  currentDynamicColumnGroups.value.flatMap(g => g.columns)
)

// Clase visual para cada sub-grupo en el encabezado
function subgroupClass(groupName) {
  const map = {
    'MARKETING':   'th-subgroup-marketing',
    'ESTRATEGIAS': 'th-subgroup-estrategias',
    'OTROS':       'th-subgroup-otros',
  }
  return map[groupName] || 'th-subgroup-general'
}

// ══════════════════════════════════════════════════════════════════
// DATOS PROCESADOS
// ══════════════════════════════════════════════════════════════════

const processedData = computed(() => rawData.value.map(item => ({
  catg: item.categoria || 'GEN',
  linea: item.linea || '—',
  programa: item.programa,
  tipo: item.tipo,
  fecha: item.fecha_inicio || item.inicio,
  edicion: item.codigo_edicion || item.codigo,
  objetivo: item.meta_monto,
  venta: item.venta_monto,
  objetivo_vacantes: item.meta_vacantes || 0,
  venta_vacantes: item.venta_cantidad || 0,
  _raw: item
})))

const totalObjetivo         = computed(() => processedData.value.reduce((s, r) => s + (r.objetivo || 0), 0))
const totalVenta            = computed(() => processedData.value.reduce((s, r) => s + (r.venta || 0), 0))
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

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

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
function formatDate(d)      { return d ? d.split('T')[0].split('-').reverse().join('/') : '—' }
function calcPct(v, o)      { return (!o || o === 0) ? 0 : Math.round((v / o) * 100) }
function truncate(s, n)     { return s && s.length > n ? s.substring(0, n) + '…' : (s || '') }
function pctClass(p)        { return p >= 100 ? 'c-green' : p >= 80 ? 'c-blue' : 'c-red' }
function logroBadgeClass(p) { return p >= 100 ? 'logro-success' : p >= 80 ? 'logro-info' : 'logro-danger' }
function pillClass(catg) {
  const m = { CURSO: 'pill-blue', DIPLOMADO: 'pill-violet', PEE: 'pill-amber', 'ESP.': 'pill-teal' }
  return m[catg] || 'pill-slate'
}

function groupDataBy(key) {
  const grouped = {}
  processedData.value.forEach(d => {
    const val = d[key] || 'Sin Asignar'
    if (!grouped[val]) grouped[val] = { name: val, objetivo: 0, venta: 0, rawItems: [] }
    grouped[val].objetivo += (d.objetivo || 0)
    grouped[val].venta    += (d.venta || 0)
    grouped[val].rawItems.push(d._raw)
  })
  return Object.values(grouped)
}

// ══════════════════════════════════════════════════════════════════
// DATOS DE GRÁFICOS
// ══════════════════════════════════════════════════════════════════

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
      data: grouped.map(g =>
        g.rawItems.reduce((sum, raw) => sum + getDynamicValue(raw, currentGroupField.value, col.originalName, 'cant'), 0)
      ),
      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
      stack: 'stack1'
    }))
  }
})

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
        d.x >= avgVenta               ? 'rgba(3,105,161,0.82)'  :
        d.y >= 100                    ? 'rgba(180,83,9,0.82)'   :
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
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: baseFont } } }
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
            const quad = d.x >= avgVenta && d.y >= 100 ? 'Estrella'
              : d.x >= avgVenta ? 'Vaca'
              : d.y >= 100      ? 'Interrogante'
              :                   'Perro'
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
   TOKENS
═══════════════════════════════════════════════ */
:root {
  --navy-900: #0f172a;
  --navy-800: #1e293b;
  --navy-700: #334155;
  --slate-400: #94a3b8;
  --slate-300: #cbd5e1;
  --slate-100: #f1f5f9;
  --slate-50:  #f8fafc;
  --teal-600:  #0d9488;
  --teal-500:  #14b8a6;
  --blue-600:  #2563eb;
  --red-600:   #dc2626;
  --gold-400:  #fbbf24;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;
}

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.exec-shell {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: var(--slate-50);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  --teal-500: #14b8a6;
  --gold-400: #fbbf24;
}

/* ═══════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════ */
.exec-masthead {
  background: var(--navy-900);
  color: var(--white);
  border-bottom: 1px solid var(--navy-700);
}

.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 16px; }

.brand-rule {
  width: 3px; height: 42px;
  background: #2e3e91; border-radius: 2px; flex-shrink: 0;
}

.brand-eyebrow {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--slate-400);
  font-weight: 500;
  display: block;
  margin-bottom: 3px;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
  color: var(--white);
}

.masthead-actions { display: flex; gap: 10px; align-items: center; }

.btn-exec {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s;
}

.btn-exec-ghost {
  background: rgba(255,255,255,0.07);
  color: var(--slate-300);
  border: 1px solid rgba(255,255,255,0.12);
}
.btn-exec-ghost:hover { background: rgba(255,255,255,0.12); color: var(--white); }

.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-primary:disabled { opacity: 0.55; cursor: default; }

/* Filtros */
.masthead-filters {
  display: flex;
  align-items: center;
  gap: 0;
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
  color: var(--slate-400);
  font-weight: 600;
  cursor: default;
}

.exec-select {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.18);
  color: var(--white);
  font-family: 'IBM Plex Sans', inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 3px 0;
  outline: none;
  cursor: pointer;
  min-width: 110px;
  appearance: auto;
}
.exec-select option { color: var(--text-primary); background: var(--white); }

.filter-sep {
  width: 1px;
  height: 32px;
  background: rgba(255,255,255,0.1);
  margin: 0 20px 0 0;
}

.filter-spacer { flex: 1; }

/* KPIs inline */
.masthead-kpis { display: flex; gap: 32px; align-items: center; }
.inline-kpi { text-align: right; }

.inline-kpi-label {
  display: block;
  font-size: 9.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--slate-400);
  font-weight: 600;
  margin-bottom: 2px;
}

.inline-kpi-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--white);
  font-variant-numeric: tabular-nums;
}
.inline-kpi-value.accent { color: var(--teal-500); }

/* ═══════════════════════════════════════════════
   BODY
═══════════════════════════════════════════════ */
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
  border: 3px solid var(--border);
  border-top-color: var(--teal-600);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loader-text { font-size: 13px; color: var(--text-secondary); font-weight: 500; letter-spacing: 0.02em; }

/* ═══════════════════════════════════════════════
   TABLA EJECUTIVA
═══════════════════════════════════════════════ */
.table-shell {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02);
  -webkit-overflow-scrolling: touch;
}

.exec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  min-width: 1400px;
}

.thead-group th {
  padding: 8px 10px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  border-bottom: 1px solid var(--border);
}

.th-cat {
  background: var(--navy-900);
  color: var(--slate-400);
  width: 72px;
  padding-left: 14px;
  border-right: 2px solid var(--navy-700);
}

.th-group-a { background: #eff6ff; color: #1e40af; border-left: 2px solid #bfdbfe; }
.th-group-b { background: #f0fdf4; color: #166534; border-left: 2px solid #bbf7d0; }
.th-group-c { background: #f0fdf4; color: #0f766e; border-left: 2px solid #bbf7d0; }

/* ── Sub-cabeceras agrupadas ── */
.thead-sub-group th { padding: 0; }

.th-subgroup {
  padding: 5px 10px !important;
  font-size: 9.5px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  font-weight: 800;
  text-align: center;
  border-bottom: 2px solid var(--border);
}

/* MARKETING: azul índigo */
.th-subgroup-marketing {
  background: #eef2ff;
  color: #3730a3;
  border-left: 2px solid #c7d2fe;
  border-top: 2px solid #818cf8;
}

/* ESTRATEGIAS: ámbar dorado */
.th-subgroup-estrategias {
  background: #fffbeb;
  color: #92400e;
  border-left: 2px solid #fde68a;
  border-top: 2px solid #f59e0b;
}

/* OTROS: gris pizarra */
.th-subgroup-otros {
  background: #f8fafc;
  color: #475569;
  border-left: 2px solid #cbd5e1;
  border-top: 2px solid #94a3b8;
}

/* Genérico (otras dimensiones) */
.th-subgroup-general {
  background: #f0fdf4;
  color: #0f766e;
  border-left: 2px solid #bbf7d0;
  border-top: 2px solid #6ee7b7;
}

.thead-sub .ts {
  padding: 7px 10px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
}

.ts-a { background: #f0f7ff; color: #3b82f6; border-left: 1px solid #dbeafe; }
.ts-b { background: #f0fdf4; color: #16a34a; border-left: 1px solid #d1fae5; }
.ts-c { background: #f0fdf4; color: #0f766e; border-left: 1px solid #bbf7d0; }

.col-dyn-name { display: block; }
.col-dyn-sub  { display: block; font-size: 9px; color: #6b7280; font-weight: 400; letter-spacing: 0; margin-top: 1px; }

.tbody-row td {
  padding: 9px 10px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}
.tbody-row:last-child td { border-bottom: none; }
.row-alt { background: #fafbfc; }
.tbody-row:hover td:not(.td-c):not(.td-cat) { background: #f0f9ff !important; transition: background 0.1s; }
.tbody-row:hover td.td-c { background: #f1f5f9 !important; transition: background 0.1s; }

.td-cat { padding-left: 14px; border-right: 2px solid var(--navy-800); background: var(--navy-900) !important; }
.td-a { background: #f8fbff; border-left: 1px solid #e0eeff; }
.td-b { background: #f7fdf9; border-left: 1px solid #d5f5e0; }
.td-c { background: #f8fafc; color: var(--text-primary); border-left: 1px solid var(--border); }
.td-prog { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }

.tfoot-row td {
  padding: 10px 10px;
  background: var(--navy-900);
  color: var(--white);
  font-size: 12px;
  font-weight: 600;
  border-top: 2px solid var(--navy-700);
}
.tfoot-label { padding-left: 14px; letter-spacing: 0.05em; font-size: 11px; text-transform: uppercase; color: var(--slate-400); }

/* Badges */
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.pill-blue   { background: #dbeafe; color: #1d4ed8; }
.pill-violet { background: #ede9fe; color: #6d28d9; }
.pill-amber  { background: #fef3c7; color: #92400e; }
.pill-teal   { background: #ccfbf1; color: #0f766e; }
.pill-slate  { background: #f1f5f9; color: #475569; }

.tipo-tag {
  display: inline-block;
  padding: 2px 7px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--white);
}

.logro-badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.logro-success { background: #dcfce7; color: #15803d; }
.logro-info    { background: #dbeafe; color: #1d4ed8; }
.logro-danger  { background: #fee2e2; color: #b91c1c; }
.logro-lg      { padding: 3px 12px; font-size: 12px; }

.dyn-count { font-weight: 700; color: #0f766e; margin-right: 6px; }
.dyn-pct   { font-size: 11px; color: #94a3b8; border-left: 1px solid #e2e8f0; padding-left: 6px; }

/* Text utilities */
.text-center { text-align: center; }
.text-right  { text-align: right; }
.text-mono   { font-family: 'IBM Plex Mono', monospace; }
.text-muted  { color: var(--text-muted); }
.small       { font-size: 11.5px; }
.fw-600      { font-weight: 600; }
.fw-700      { font-weight: 700; }
.accent-text { color: var(--teal-600); }
.c-green { color: #15803d; }
.c-blue  { color: #1d4ed8; }
.c-red   { color: #b91c1c; }

/* ═══════════════════════════════════════════════
   DASHBOARD VIEW
═══════════════════════════════════════════════ */
.view-dashboard { display: flex; flex-direction: column; gap: 20px; }

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.kpi-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: box-shadow 0.15s, transform 0.15s;
}
.kpi-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
.kpi-card-highlight { background: var(--navy-900); border-color: var(--navy-700); }

.kpi-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kpi-card-label {
  font-size: 10px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted);
}

.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-green { background: #22c55e; }
.ind-amber { background: #f59e0b; }
.ind-blue  { background: #3b82f6; }
.ind-slate { background: var(--slate-400); }

.kpi-card-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  margin-bottom: 8px;
}
.kpi-card-top-name {
  font-size: 13px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--white);
  font-weight: 600;
  letter-spacing: 0;
}

.kpi-progress {
  height: 3px;
  background: var(--slate-100);
  border-radius: 2px;
  margin-bottom: 8px;
  overflow: hidden;
}
.kpi-progress-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.fill-green { background: #22c55e; }
.fill-amber { background: #f59e0b; }

.kpi-card-sub { font-size: 11px; color: var(--text-muted); font-weight: 400; }
.meta-line { font-variant-numeric: tabular-nums; }

/* Chart Panels */
.chart-panel {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.chart-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid var(--slate-100);
}

.chart-panel-title { font-size: 13px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em; }
.chart-panel-sub   { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.chart-area         { padding: 16px 20px; height: 300px; }
.chart-area-donut   { height: 300px; }
.chart-area-bcg     { position: relative; height: 370px; padding: 16px 20px 16px; }

.chart-legend-inline {
  display: flex;
  gap: 14px;
  align-items: center;
  font-size: 11.5px;
  color: var(--text-secondary);
  font-weight: 500;
}
.legend-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 2px;
  margin-right: 4px;
}

.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-grid-3 { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }

/* BCG */
.bcg-quadrant-labels { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.qlab {
  position: absolute;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.06;
  color: var(--text-primary);
}
.qlab-tl { top: 12%; left: 8%; }
.qlab-tr { top: 12%; right: 8%; }
.qlab-bl { bottom: 18%; left: 8%; }
.qlab-br { bottom: 18%; right: 8%; }

.bcg-legend { display: flex; gap: 16px; align-items: center; }
.bcg-leg {
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
}
.bcg-leg::before { content: ''; display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.bcg-star::before { background: rgba(15,118,110,0.85); }
.bcg-cow::before  { background: rgba(3,105,161,0.85); }
.bcg-q::before    { background: rgba(180,83,9,0.85); }
.bcg-dog::before  { background: rgba(190,18,60,0.85); }
.bcg-star { color: #0f766e; }
.bcg-cow  { color: #0369a1; }
.bcg-q    { color: #b45309; }
.bcg-dog  { color: #be123c; }

/* ═══════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════ */
.exec-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 28px;
  background: var(--white);
  border-top: 1px solid var(--border);
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 500;
}
.exec-footer strong { color: var(--text-secondary); }
.footer-sep { color: var(--border); }
.footer-status { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok      { background: #22c55e; }
.dot-loading { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }

/* ═══════════════════════════════════════════════
   CELDAS DINÁMICAS CONDICIONALES
═══════════════════════════════════════════════ */
.bg-dyn-high {
  background-color: #d1fae5 !important;
  border-left-color: #6ee7b7 !important;
}
.bg-dyn-low {
  background-color: #fee2e2 !important;
  border-left-color: #fca5a5 !important;
}
.tbody-row:hover td.bg-dyn-high { background-color: #a7f3d0 !important; }
.tbody-row:hover td.bg-dyn-low  { background-color: #fecaca !important; }

/* Columnas dinámicas: ancho mínimo y no wrap */
.th-group-c, .ts-c, .td-c {
  white-space: nowrap;
  min-width: 90px;
}

/* ═══════════════════════════════════════════════
   ANIMACIONES
═══════════════════════════════════════════════ */
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.spin { animation: spin 0.8s linear infinite; }

.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from   { opacity: 0; transform: translateX(12px); }
.slide-fade-leave-to     { opacity: 0; transform: translateX(-8px); }
</style>