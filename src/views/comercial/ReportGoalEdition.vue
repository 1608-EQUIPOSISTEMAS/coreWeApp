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
          <div class="masthead-kpis" v-if="!isDashboard">
            <div class="inline-kpi">
              <span class="inline-kpi-label">META M.</span>
              <span v-if="isLoading" class="skel-kpi"></span>
              <span v-else class="inline-kpi-value">{{ formatMoney(totalObjetivo) }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">VENTA M.</span>
              <span v-if="isLoading" class="skel-kpi"></span>
              <span v-else class="inline-kpi-value accent">{{ formatMoney(totalVenta) }}</span>
            </div>
            <div class="inline-kpi" style="margin-right: 20px;">
              <span class="inline-kpi-label">LOGRO M.</span>
              <span v-if="isLoading" class="skel-kpi" style="width:48px"></span>
              <span v-else class="inline-kpi-value" :class="pctClass(calcPct(totalVenta, totalObjetivo))">
                {{ calcPct(totalVenta, totalObjetivo) }}%
              </span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">META VAC.</span>
              <span v-if="isLoading" class="skel-kpi" style="width:48px"></span>
              <span v-else class="inline-kpi-value" style="color: var(--slate-300)">{{ totalObjetivoVacantes }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">INSCRITOS</span>
              <span v-if="isLoading" class="skel-kpi" style="width:48px"></span>
              <span v-else class="inline-kpi-value" style="color: var(--gold-400)">{{ totalVentaVacantes }}</span>
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
          <div class="table-responsive-custom">
            <table class="exec-table">
              <thead>
                <tr class="thead-group">
                  <th class="th-cat" rowspan="3">CAT.</th>
                  <th colspan="6" class="th-group th-group-a sticky-group-a" rowspan="2">DATOS DEL PROGRAMA</th>
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
                      class="th-subgroup"
                      :class="subgroupClass(g.groupName)"
                    >
                      {{ selectedMetricGroup === 'origen' ? g.groupName : 'Detalle General' }}
                    </th>
                  </template>
                  <th v-else class="th-subgroup th-subgroup-general">—</th>
                </tr>

                <tr class="thead-sub">
                  <th class="ts ts-a text-center sticky-num" >#</th>
                  <th class="ts ts-a sticky-linea">LÍNEA</th>
                  <th class="ts ts-a td-prog sticky-prog">PROGRAMA</th>
                  <th class="ts ts-a sticky-tipo">TIPO</th>
                  <th class="ts ts-a text-center sticky-ini">INICIO</th>
                  <th class="ts ts-a sticky-ed">ED.</th>

                  <th class="ts ts-b text-right">META S/.</th>
                  <th class="ts ts-b text-right">VENTA S/.</th>
                  <th class="ts ts-b text-center" style="border-right: 1px solid #fde68a;">LOGRO M.</th>
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

                <!-- FILA 4: Filtros — toda columna filtra desde aca, ningun
                     control vive en el encabezado. La celda de CAT. va aparte
                     porque su <th> solo abarca las 3 primeras filas. -->
                <tr class="thead-filter">
                  <td class="tf td-cat">
                    <ColumnFilterDropdown column-label="Categoría" :all-items="processedData" :value-extractor="item => item.catg" v-model="columnFilters.catg" />
                  </td>
                  <td class="tf sticky-num"></td>
                  <td class="tf sticky-linea">
                    <ColumnFilterDropdown column-label="Línea" :all-items="processedData" :value-extractor="item => item.linea" v-model="columnFilters.linea" />
                  </td>
                  <td class="tf sticky-prog">
                    <ColumnFilterDropdown column-label="Programa" :all-items="processedData" :value-extractor="item => item.programa" v-model="columnFilters.programa" />
                  </td>
                  <td class="tf sticky-tipo">
                    <ColumnFilterDropdown column-label="Tipo" :all-items="processedData" :value-extractor="item => item.tipo" v-model="columnFilters.tipo" />
                  </td>
                  <td class="tf sticky-ini">
                    <BaseDatePicker v-model="columnFilters.inicio" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Inicio..." />
                  </td>
                  <td class="tf sticky-ed">
                    <ColumnFilterDropdown column-label="Edición" :all-items="processedData" :value-extractor="item => item.edicion" v-model="columnFilters.edicion" />
                  </td>

                  <td class="tf" colspan="6"></td>
                  <td class="tf" :colspan="currentDynamicColumnsFlat.length || 1"></td>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(row, i) in filteredProcessedData"
                  :key="i"
                  class="tbody-row"
                  :class="{ 'row-alt': i % 2 === 0 }"
                >
                  <td class="td-cat">
                    <span class="pill" :class="pillClass(row.catg)">{{ row.catg }}</span>
                  </td>
                  <td class="td-a text-center text-muted fw-bold sticky-num" style="font-size: 11px;">
                  {{ i + 1 }}
                </td>
                  <td class="td-a text-center text-mono text-muted sticky-linea">{{ row.linea }}</td>
                  <td class="td-a td-prog sticky-prog" :title="row.programa">{{ row.programa }}</td>
                  <td  class="td-a text-center sticky-tipo">
                    <span class="tipo-tag">{{ row.tipo }}</span>
                  </td>
                  <td  class="td-a text-center text-mono text-muted small sticky-ini">{{ formatDate(row.fecha) }}</td>
                  <td class="td-a text-center text-mono text-muted small sticky-ed">{{ row.edicion }}</td>

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
                  <td colspan="7" class="tfoot-label">TOTALES CONSOLIDADOS (FILTRADOS)</td>
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
      </div>

      <div v-else class="view-dashboard">

        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">LOGRO GLOBAL</span>
              <div class="kpi-indicator" :class="kpiStats.globalPct >= 80 ? 'ind-green' : 'ind-amber'"></div>
            </div>
            <div class="kpi-card-value" :class="pctClass(kpiStats.globalPct)"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ kpiStats.globalPct }}%</template></div>
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
            <div class="kpi-card-value"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ formatMoney(totalVenta) }}</template></div>
            <div class="kpi-card-sub meta-line">Meta: {{ formatMoney(totalObjetivo) }}</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">PROGRAMAS ACTIVOS</span>
              <div class="kpi-indicator ind-slate"></div>
            </div>
            <div class="kpi-card-value accent-text"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ filteredProcessedData.length }}</template></div>
            <div class="kpi-card-sub">Registros del período seleccionado</div>
          </div>

          <div class="kpi-card kpi-card-highlight">
            <div class="kpi-card-header">
              <span class="kpi-card-label" style="color: var(--gold-400)">TOP PROGRAMA</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-400)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div class="kpi-card-value kpi-card-top-name" :title="kpiStats.topProgram.name"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ kpiStats.topProgram.name }}</template></div>
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
            <div class="chart-area">
              <Scatter :data="bcgChartData" :options="bcgChartOptions" />
            </div>
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
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Bar, Doughnut, Scatter } from 'vue-chartjs'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { inDateRange } from '@/utils/dateRange'
import { isDark } from '@/utils/chartTheme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const isLoading = ref(false)
const isDashboard = ref(false)
const selectedMetricGroup = ref('origen')
const filters = ref({ year: 2026, month: 1 })
const rawData = ref([])

// === ESTADO DE FILTROS DE COLUMNA ===
// `inicio` guarda el rango de flatpickr ("2026-08-01 a 2026-08-14"); el resto,
// la lista de valores elegidos.
const emptyColumnFilters = () => ({
  catg: [],
  linea: [],
  programa: [],
  tipo: [],
  inicio: '',
  edicion: []
})

const columnFilters = reactive(emptyColumnFilters())

const metricGroupDefinitions = {
  clientes:  { title: 'CLIENTES',        field: 'breakdown_clientes' },
  origen:    { title: 'ORIGEN / VÍAS',   field: 'breakdown_origen' },
  asesores:  { title: 'ASESORES',        field: 'breakdown_asesores' },
  comercial: { title: 'ESTADO COMERCIAL', field: 'breakdown_estados' }
}

const CHART_COLORS = computed(() => ['#0f766e','#0369a1','#b45309','#7c3aed','#be123c','#0284c7', isDark.value ? '#8FAADC' : '#12274e','#a16207','#6d28d9','#475569'])

onMounted(() => loadData())

async function loadData() {
  isLoading.value = true

  // Limpiar filtros rápidos de columna al cambiar de mes/año
  Object.assign(columnFilters, emptyColumnFilters())

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
// ══════════════════════════════════════════════════════════════════
const currentDynamicColumnGroups = computed(() => {
  const field = currentGroupField.value
  const groupsMap = {}

  rawData.value.forEach(row => {
    ;(row[field] || []).forEach(item => {
      if (!item.name) return
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

  if (field === 'breakdown_origen') {
    const order = { 'MARKETING': 1, 'ESTRATEGIAS': 2, 'OTROS': 3 }
    result.sort((a, b) => (order[a.groupName] || 99) - (order[b.groupName] || 99))
  } else {
    result.sort((a, b) => a.groupName.localeCompare(b.groupName))
  }

  return result
})

const currentDynamicColumnsFlat = computed(() =>
  currentDynamicColumnGroups.value.flatMap(g => g.columns)
)

function subgroupClass(groupName) {
  const map = { 'MARKETING': 'th-subgroup-marketing', 'ESTRATEGIAS': 'th-subgroup-estrategias', 'OTROS': 'th-subgroup-otros' }
  return map[groupName] || 'th-subgroup-general'
}

// ══════════════════════════════════════════════════════════════════
// DATOS PROCESADOS Y FILTRADOS
// ══════════════════════════════════════════════════════════════════

// 1. Data Mapeada base
const processedData = computed(() => rawData.value.map(item => ({
  catg: item.categoria || 'GEN',
  linea: item.linea || '—',
  programa: item.programa || '—',
  tipo: item.tipo || '—',
  fecha: item.fecha_inicio || item.inicio,
  edicion: item.codigo_edicion || item.codigo || '—',
  objetivo: item.meta_monto,
  venta: item.venta_monto,
  objetivo_vacantes: item.meta_vacantes || 0,
  venta_vacantes: item.venta_cantidad || 0,
  _raw: item
})))

// 2. Data Filtrada por las columnas
const filteredProcessedData = computed(() => {
  return processedData.value.filter(row => {
    if (columnFilters.catg.length && !columnFilters.catg.includes(row.catg)) return false;
    if (columnFilters.linea.length && !columnFilters.linea.includes(row.linea)) return false;
    if (columnFilters.programa.length && !columnFilters.programa.includes(row.programa)) return false;
    if (columnFilters.tipo.length && !columnFilters.tipo.includes(row.tipo)) return false;
    if (columnFilters.edicion.length && !columnFilters.edicion.includes(row.edicion)) return false;
    if (columnFilters.inicio && !inDateRange(row.fecha, columnFilters.inicio)) return false;
    return true;
  })
})

// === TODOS LOS TOTALES AHORA ESCUCHAN A 'filteredProcessedData' ===
const totalObjetivo         = computed(() => filteredProcessedData.value.reduce((s, r) => s + (r.objetivo || 0), 0))
const totalVenta            = computed(() => filteredProcessedData.value.reduce((s, r) => s + (r.venta || 0), 0))
const totalObjetivoVacantes = computed(() => filteredProcessedData.value.reduce((s, r) => s + (r.objetivo_vacantes || 0), 0))
const totalVentaVacantes    = computed(() => filteredProcessedData.value.reduce((s, r) => s + (r.venta_vacantes || 0), 0))

const kpiStats = computed(() => {
  const globalPct = totalObjetivo.value > 0 ? Math.round((totalVenta.value / totalObjetivo.value) * 100) : 0
  const sorted = [...filteredProcessedData.value].sort((a, b) => b.venta - a.venta)
  return {
    globalPct,
    topProgram: sorted.length ? { name: sorted[0].programa, venta: sorted[0].venta } : { name: '—', venta: 0 }
  }
})

// ══════════════════════════════════════════════════════════════════
// HELPERS DINÁMICOS
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
  return filteredProcessedData.value.reduce((sum, row) => {
    const found = (row._raw[field] || []).find(x => x.name === searchName)
    return sum + (found ? Number(found.count) : 0)
  }, 0)
}

function getDynBgClass(rawRow, field, searchName) {
  const pct = getDynamicValue(rawRow, field, searchName, 'pct')
  if (pct >= 15) return 'bg-dyn-high'
  if (pct > 0)   return 'bg-dyn-low'
  return ''
}

function formatMoney(v) { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v || 0) }
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
  filteredProcessedData.value.forEach(d => {
    const val = d[key] || 'Sin Asignar'
    if (!grouped[val]) grouped[val] = { name: val, objetivo: 0, venta: 0, rawItems: [] }
    grouped[val].objetivo += (d.objetivo || 0)
    grouped[val].venta    += (d.venta || 0)
    grouped[val].rawItems.push(d._raw)
  })
  return Object.values(grouped)
}

// ══════════════════════════════════════════════════════════════════
// DATOS DE GRÁFICOS (Ahora escuchan los filtros)
// ══════════════════════════════════════════════════════════════════

const dynamicDoughnutChartData = computed(() => ({
  labels: currentDynamicColumnsFlat.value.map(c => c.displayName),
  datasets: [{
    data: currentDynamicColumnsFlat.value.map(c => getDynamicTotal(currentGroupField.value, c.originalName)),
    backgroundColor: CHART_COLORS.value.slice(0, currentDynamicColumnsFlat.value.length),
    borderWidth: 3, borderColor: isDark.value ? '#1A1A14' : '#ffffff'
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
      backgroundColor: CHART_COLORS.value[idx % CHART_COLORS.value.length],
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
      { label: 'Meta S/.', data: grouped.map(g => g.objetivo), backgroundColor: isDark.value ? '#3A3A33' : '#e2e8f0', borderRadius: 3, borderSkipped: false },
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
      { label: 'Meta 100%', data: grouped.map(() => 100), type: 'line', borderColor: isDark.value ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,0.25)', borderDash: [4,3], borderWidth: 1.5, pointRadius: 0, fill: false }
    ]
  }
})

const bcgChartData = computed(() => {
  const avgVenta = totalVenta.value / (filteredProcessedData.value.length || 1)
  const points = filteredProcessedData.value.map(d => ({
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
      borderColor: isDark.value ? '#1A1A14' : '#fff', borderWidth: 2,
      pointRadius: 9, pointHoverRadius: 12
    }]
  }
})

// ── Chart Options ──
const baseFont = { family: 'inherit', size: 11 }

const groupedBarOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false }, ticks: { font: baseFont } }, y: { grid: { color: isDark.value ? '#2A2A22' : '#f1f5f9' }, ticks: { font: baseFont } } }
}))

const rankingBarOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } } },
  scales: { x: { beginAtZero: true, grid: { color: isDark.value ? '#2A2A22' : '#f1f5f9' }, ticks: { callback: v => v + '%', font: baseFont } }, y: { grid: { display: false }, ticks: { font: baseFont } } }
}))

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '68%',
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: baseFont } } }
}

const stackedBarOptions = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: baseFont } }, tooltip: { mode: 'index', intersect: false } },
  scales: { x: { stacked: true, grid: { display: false }, ticks: { font: baseFont } }, y: { stacked: true, beginAtZero: true, grid: { color: isDark.value ? '#2A2A22' : '#f1f5f9' }, ticks: { font: baseFont } } }
}))

const bcgChartOptions = computed(() => {
  const avgVenta = totalVenta.value / (filteredProcessedData.value.length || 1)
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
      x: { title: { display: true, text: 'Ventas (S/.) →', font: { ...baseFont, weight: 600 } }, grid: { color: isDark.value ? '#2A2A22' : '#f1f5f9' }, ticks: { font: baseFont } },
      y: { title: { display: true, text: '% Cumplimiento →', font: { ...baseFont, weight: 600 } }, beginAtZero: true, grid: { color: ctx => ctx.tick.value === 100 ? (isDark.value ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,0.2)') : (isDark.value ? '#2A2A22' : '#f1f5f9') }, ticks: { font: baseFont } }
    }
  }
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   ESTRUCTURA BASE DE LA VISTA
   (Los tokens, .btn-exec, .pill y tipografías vienen del CSS Global)
═══════════════════════════════════════════════ */
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ═══════════════════════════════════════════════
   MASTHEAD & FILTROS INLINE
═══════════════════════════════════════════════ */
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
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 16px; }

.brand-rule {
  width: 3px; height: 42px;
  background: var(--teal-600, #12274e); /* Alineado a color marca */
  border-radius: 2px; flex-shrink: 0;
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

/* Filtros en línea del Header */
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
  color: var(--slate-400, #94a3b8);
  font-weight: 600;
  cursor: default;
}

.exec-select {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.18);
  color: var(--white, #ffffff);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 3px 0;
  outline: none;
  cursor: pointer;
  min-width: 110px;
  appearance: auto;
}
.exec-select option { color: var(--text-primary, #0f172a); background: var(--white, #ffffff); }

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
  color: var(--slate-400, #94a3b8);
  font-weight: 600;
  margin-bottom: 2px;
}

.inline-kpi-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--white, #ffffff);
  font-variant-numeric: tabular-nums;
}
.inline-kpi-value.accent { color: #5eead4; } /* Teal más claro para resaltar en fondo oscuro */

/* ═══════════════════════════════════════════════
   BODY & LOADER
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
  border: 3px solid var(--border, #e2e8f0);
  border-top-color: var(--teal-600, #12274e);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loader-text { font-size: 13px; color: var(--text-secondary, #475569); font-weight: 500; letter-spacing: 0.02em; }

/* ═══════════════════════════════════════════════
   TABLA EJECUTIVA (Compleja / Multi-nivel)
═══════════════════════════════════════════════ */
.table-shell {
  background: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px; 
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.exec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  min-width: 1400px;
}

/* El thead hereda el position: sticky del CSS global,
   solo definimos los estilos específicos de esta tabla */

.thead-group th {
  padding: 8px 10px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.th-cat {
  background: var(--navy-900, #0f172a);
  color: var(--slate-400, #94a3b8);
  width: 72px;
  padding-left: 14px;
  border-right: 2px solid var(--navy-700, #334155);
}

.th-group-a { background: #eff6ff; color: #1e40af; border-left: 2px solid #bfdbfe; }
.th-group-b {
  background: #fffbeb;
  color: #92400e;
  border-left: 2px solid #fde68a;
}

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
  border-bottom: 2px solid var(--border, #e2e8f0);
}

.th-subgroup-marketing { background: #eef2ff; color: #3730a3; border-left: 2px solid #c7d2fe; border-top: 2px solid #818cf8; }
.th-subgroup-estrategias { background: #fffbeb; color: #92400e; border-left: 2px solid #fde68a; border-top: 2px solid #f59e0b; }
.th-subgroup-otros { background: #f8fafc; color: #475569; border-left: 2px solid #cbd5e1; border-top: 2px solid #94a3b8; }
.th-subgroup-general { background: #f0fdf4; color: #0f766e; border-left: 2px solid #bbf7d0; border-top: 2px solid #6ee7b7; }

.thead-sub .ts {
  padding: 7px 10px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  border-bottom: 2px solid var(--border, #e2e8f0);
}

/* ── Fila de filtros de columna ── */
.thead-filter .tf {
  padding: 5px 6px;
  background: #f0f7ff;
  border-bottom: 2px solid var(--border, #e2e8f0);
  vertical-align: middle;
}
/* flatpickr renderiza su propio input (altInput), fuera del alcance de los
   estilos del trigger: hay que igualarlo a mano o la fila queda despareja. */
.thead-filter :deep(.exec-flatpickr-input) {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  color: #1e293b;
  background: #fff;
  box-sizing: border-box;
  outline: none;
}
.thead-filter :deep(.exec-flatpickr-input:focus) { border-color: #002060; }

.ts-a { background: #f0f7ff; color: #3b82f6; border-left: 1px solid #dbeafe; }
.ts-b {
  background: #fefce8;
  color: #a16207;
  border-left: 1px solid #fef08a;
}.ts-c { background: #f0fdf4; color: #0f766e; border-left: 1px solid #bbf7d0; }

.col-dyn-name { display: block; }
.col-dyn-sub  { display: block; font-size: 9px; color: #6b7280; font-weight: 400; letter-spacing: 0; margin-top: 1px; }

/* Filas */
.tbody-row td {
  padding: 9px 10px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}
.tbody-row:last-child td { border-bottom: none; }
.row-alt { background: #fafbfc; }
.tbody-row:hover td:not(.td-c):not(.td-cat) { background: #f0f9ff !important; transition: background 0.1s; }
.tbody-row:hover td.td-c { background: #f1f5f9 !important; transition: background 0.1s; }

.td-cat { padding-left: 14px; border-right: 2px solid var(--navy-800, #1e293b); background: var(--navy-900, #0f172a) !important; color: #fff; }
.td-a { background: #f8fbff; border-left: 1px solid #e0eeff; }
.td-b {
  background: #fefce8;
  border-left: 1px solid #fef08a;
}.td-c { background: #f8fafc; color: var(--text-primary, #0f172a); border-left: 1px solid var(--border, #e2e8f0); }
.td-prog { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }

/* TFoot Fijo (Opcional: Si quieres que el TFoot también flote abajo) */
.tfoot-row td {
  padding: 10px 10px;
  background: var(--navy-900, #0f172a);
  color: var(--white, #ffffff);
  font-size: 12px;
  font-weight: 600;
  border-top: 2px solid var(--navy-700, #334155);
  position: sticky; /* Hacemos el tfoot sticky también */
  bottom: 0;
  z-index: 10;
}
.tfoot-label { padding-left: 14px; letter-spacing: 0.05em; font-size: 11px; text-transform: uppercase; color: var(--slate-400, #94a3b8); }

/* Badges Especiales y Tags */
.tipo-tag {
  display: inline-block;
  padding: 2px 7px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary, #475569);
  background: var(--white, #ffffff);
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

/* Utilidades Locales (Solo las que no están en global) */
.text-right  { text-align: right; }
.c-green { color: #15803d; }
.c-blue  { color: #1d4ed8; }
.c-red   { color: #b91c1c; }

/* Celdas Dinámicas de Color */
.bg-dyn-high { background-color: #d1fae5 !important; border-left-color: #6ee7b7 !important; }
.bg-dyn-low { background-color: #fee2e2 !important; border-left-color: #fca5a5 !important; }
.tbody-row:hover td.bg-dyn-high { background-color: #a7f3d0 !important; }
.tbody-row:hover td.bg-dyn-low  { background-color: #fecaca !important; }

/* Columnas dinámicas: ancho mínimo */
.th-group-c, .ts-c, .td-c { white-space: nowrap; min-width: 90px; }


/* ═══════════════════════════════════════════════
   DASHBOARD VIEW (Resto del código sin tocar)
═══════════════════════════════════════════════ */
.view-dashboard { display: flex; flex-direction: column; gap: 20px; }

/* ... (Todo el CSS de .kpi-strip, .chart-panel, y matriz BCG se mantiene idéntico) ... */
.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi-card { background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: box-shadow 0.15s, transform 0.15s; }
.kpi-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
.kpi-card-highlight { background: var(--navy-900); border-color: var(--navy-700); }
.kpi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kpi-card-label { font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; font-weight: 700; color: var(--text-muted); }
.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-green { background: #22c55e; } .ind-amber { background: #f59e0b; } .ind-blue  { background: #3b82f6; } .ind-slate { background: var(--slate-400); }
.kpi-card-value { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary); font-variant-numeric: tabular-nums; margin-bottom: 8px; }
.kpi-card-top-name { font-size: 13px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; color: var(--white); font-weight: 600; letter-spacing: 0; }
.kpi-progress { height: 3px; background: var(--slate-100); border-radius: 2px; margin-bottom: 8px; overflow: hidden; }
.kpi-progress-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.fill-green { background: #22c55e; } .fill-amber { background: #f59e0b; }
.kpi-card-sub { font-size: 11px; color: var(--text-muted); font-weight: 400; }
.meta-line { font-variant-numeric: tabular-nums; }

.chart-panel { background: var(--white); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.chart-panel-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; border-bottom: 1px solid var(--slate-100); }
.chart-panel-title { font-size: 13px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em; }
.chart-panel-sub   { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.chart-area         { padding: 16px 20px; height: 300px; }
.chart-area-donut   { height: 300px; }
.chart-area-bcg     { position: relative; height: 370px; padding: 16px 20px 16px; }

.chart-legend-inline { display: flex; gap: 14px; align-items: center; font-size: 11.5px; color: var(--text-secondary); font-weight: 500; }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }

.chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-grid-3 { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }

.bcg-quadrant-labels { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.qlab { position: absolute; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.06; color: var(--text-primary); }
.qlab-tl { top: 12%; left: 8%; } .qlab-tr { top: 12%; right: 8%; } .qlab-bl { bottom: 18%; left: 8%; } .qlab-br { bottom: 18%; right: 8%; }
.bcg-legend { display: flex; gap: 16px; align-items: center; }
.bcg-leg { font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 5px; }
.bcg-leg::before { content: ''; display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.bcg-star::before { background: rgba(15,118,110,0.85); } .bcg-cow::before  { background: rgba(3,105,161,0.85); }
.bcg-q::before    { background: rgba(180,83,9,0.85); } .bcg-dog::before  { background: rgba(190,18,60,0.85); }
.bcg-star { color: #0f766e; } .bcg-cow  { color: #0369a1; } .bcg-q    { color: #b45309; } .bcg-dog  { color: #be123c; }

/* ═══════════════════════════════════════════════
   FOOTER & ANIMACIONES
═══════════════════════════════════════════════ */
.exec-footer {
  display: flex; align-items: center; gap: 10px; padding: 10px 28px;
  background: var(--white); border-top: 1px solid var(--border);
  font-size: 11.5px; color: var(--text-muted); font-weight: 500;
}
.exec-footer strong { color: var(--text-secondary); }
.footer-sep { color: var(--border); }
.footer-status { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.dot-ok      { background: #22c55e; }
.dot-loading { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }

@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.spin { animation: spin 0.8s linear infinite; }

.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from   { opacity: 0; transform: translateX(12px); }
.slide-fade-leave-to     { opacity: 0; transform: translateX(-8px); }
/* ═══════════════════════════════════════════════
   STICKY COLUMNS — Anchos fijos + left acumulado
   CAT(72) → NUM(40) → LINEA(70) → PROG(210) → TIPO(90) → INI(80) → ED(70)
═══════════════════════════════════════════════ */

/* CAT: posición 0 */
.td-cat, .th-cat {
  position: sticky;
  left: 0;
  z-index: 3;
  width: 72px;
  min-width: 72px;
  max-width: 72px;
}

/* NUM: left = 72 */
.sticky-num {
  position: sticky;
  left: 72px;
  z-index: 2;
  width: 40px;
  min-width: 40px;
  max-width: 40px;
}

/* LÍNEA: left = 72+40 = 112 */
.sticky-linea {
  position: sticky;
  left: 112px;
  z-index: 2;
  width: 70px;
  min-width: 70px;
  max-width: 70px;
}

/* PROGRAMA: left = 112+70 = 182 */
.sticky-prog {
  position: sticky;
  left: 182px;
  z-index: 2;
  width: 210px;
  min-width: 210px;
  max-width: 210px;
}

/* TIPO: left = 182+210 = 392 */
.sticky-tipo {
  position: sticky;
  left: 392px;
  z-index: 2;
  width: 90px;
  min-width: 90px;
  max-width: 90px;
}

/* INICIO: left = 392+90 = 482 */
.sticky-ini {
  position: sticky;
  left: 482px;
  z-index: 2;
  width: 80px;
  min-width: 80px;
  max-width: 80px;
}

/* ED.: left = 482+80 = 562 — sombra de cierre del grupo */
.sticky-ed {
  position: sticky;
  left: 562px;
  z-index: 2;
  width: 70px;
  min-width: 70px;
  max-width: 70px;
  box-shadow: 4px 0 8px rgba(0,0,0,0.10);
  border-right: 2px solid #bfdbfe !important;
}

/* GRUPO "DATOS DEL PROGRAMA": empieza donde CAT termina */
.sticky-group-a {
  position: sticky;
  left: 72px;
  z-index: 4;
  background: #eff6ff !important;
}

/* thead z-index superior para tapar las celdas que pasan por debajo */
thead .sticky-num,
thead .sticky-linea,
thead .sticky-prog,
thead .sticky-tipo,
thead .sticky-ini,
thead .sticky-ed { z-index: 4; }

/* ── Fondos sólidos thead ── */
thead .sticky-num,
thead .sticky-linea,
thead .sticky-prog,
thead .sticky-tipo,
thead .sticky-ini,
thead .sticky-ed   { background: #f0f7ff !important; }

/* ── Fondos sólidos tbody ── */
.tbody-row .sticky-num,
.tbody-row .sticky-linea,
.tbody-row .sticky-prog,
.tbody-row .sticky-tipo,
.tbody-row .sticky-ini,
.tbody-row .sticky-ed    { background: #f8fbff !important; }

.tbody-row.row-alt .sticky-num,
.tbody-row.row-alt .sticky-linea,
.tbody-row.row-alt .sticky-prog,
.tbody-row.row-alt .sticky-tipo,
.tbody-row.row-alt .sticky-ini,
.tbody-row.row-alt .sticky-ed  { background: #f0f7ff !important; }

.tbody-row:hover .sticky-num,
.tbody-row:hover .sticky-linea,
.tbody-row:hover .sticky-prog,
.tbody-row:hover .sticky-tipo,
.tbody-row:hover .sticky-ini,
.tbody-row:hover .sticky-ed    { background: #e0f0ff !important; }

/* ── tfoot ── */
.tfoot-row .sticky-num,
.tfoot-row .sticky-linea,
.tfoot-row .sticky-prog,
.tfoot-row .sticky-tipo,
.tfoot-row .sticky-ini,
.tfoot-row .sticky-ed  { background: var(--navy-900, #0f172a) !important; }
.tbody-row td.td-b[style*="border-right"] {
  border-right-color: #fde68a !important;
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .exec-shell {
  /* tokens: los var(--x, fallback) de esta vista y del CSS global los recogen */
  --slate-50: #1F1F1A; --slate-100: #24241E; --slate-300: #3A3A33; --slate-400: #8A8A80;
  --border: #2A2A22; --white: #1A1A14;
  --text-primary: #F4F4F0; --text-secondary: #A0A099; --text-muted: #8A8A80;
  --teal-600: #8FAADC; --teal-500: #8FAADC; --gold-400: #FBBF24;
}
/* masthead (el global lo fuerza claro con !important) */
[data-coreui-theme="dark"] .exec-shell .exec-masthead .brand-eyebrow,
[data-coreui-theme="dark"] .exec-shell .exec-masthead .filter-label,
[data-coreui-theme="dark"] .exec-shell .exec-masthead .inline-kpi-label { color: #A0A099 !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-primary { background: #F4F4F0 !important; color: #14140F !important; border-color: #F4F4F0 !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-primary:hover:not(:disabled) { background: #E4E4DD !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-ghost { background: #1A1A14 !important; color: #A0A099 !important; border-color: #2A2A22 !important; }
[data-coreui-theme="dark"] .exec-shell .exec-masthead .btn-exec-ghost:hover { background: #24241E !important; color: #F4F4F0 !important; }
[data-coreui-theme="dark"] .exec-shell .inline-kpi-value.accent { color: #8FAADC !important; }
/* cabeceras de grupo (tintes pastel → tintes oscuros) */
[data-coreui-theme="dark"] .th-group-a { background: rgba(59,130,246,.14); color: #60A5FA; border-left-color: rgba(59,130,246,.35); }
[data-coreui-theme="dark"] .th-group-b { background: rgba(245,158,11,.14); color: #FBBF24; border-left-color: rgba(245,158,11,.35); }
[data-coreui-theme="dark"] .th-group-c { background: rgba(16,185,129,.14); color: #34D399; border-left-color: rgba(16,185,129,.35); }
[data-coreui-theme="dark"] .th-subgroup-marketing { background: rgba(99,102,241,.14); color: #A5B4FC; border-left-color: rgba(99,102,241,.35); }
[data-coreui-theme="dark"] .th-subgroup-estrategias { background: rgba(245,158,11,.14); color: #FBBF24; border-left-color: rgba(245,158,11,.35); }
[data-coreui-theme="dark"] .th-subgroup-otros { background: #1F1F1A; color: #A0A099; border-left-color: #3A3A33; border-top-color: #8A8A80; }
[data-coreui-theme="dark"] .th-subgroup-general { background: rgba(16,185,129,.14); color: #34D399; border-left-color: rgba(16,185,129,.35); }
[data-coreui-theme="dark"] .ts-a { background: #1B1D22; color: #60A5FA; border-left-color: rgba(59,130,246,.25); }
[data-coreui-theme="dark"] .ts-b { background: rgba(245,158,11,.10); color: #FBBF24; border-left-color: rgba(245,158,11,.25); }
[data-coreui-theme="dark"] .ts-c { background: rgba(16,185,129,.10); color: #34D399; border-left-color: rgba(16,185,129,.25); }
[data-coreui-theme="dark"] .thead-sub th.ts-b[style*="border-right"] { border-right-color: rgba(245,158,11,.35) !important; }
[data-coreui-theme="dark"] .col-dyn-sub { color: #8A8A80; }
/* filas */
[data-coreui-theme="dark"] .tbody-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .row-alt { background: rgba(255,255,255,.02); }
[data-coreui-theme="dark"] .tbody-row:hover td:not(.td-c):not(.td-cat) { background: rgba(59,130,246,.08) !important; }
[data-coreui-theme="dark"] .tbody-row:hover td.td-c { background: #24241E !important; }
[data-coreui-theme="dark"] .td-a { background: #1B1D22; border-left-color: #252A35; }
[data-coreui-theme="dark"] .td-b { background: rgba(245,158,11,.06); border-left-color: rgba(245,158,11,.20); }
[data-coreui-theme="dark"] .tbody-row td.td-b[style*="border-right"] { border-right-color: rgba(245,158,11,.35) !important; }
[data-coreui-theme="dark"] .td-c { background: #1F1F1A; }
/* badges y textos de estado */
[data-coreui-theme="dark"] .logro-success { background: rgba(16,185,129,.16); color: #34D399; }
[data-coreui-theme="dark"] .logro-info { background: rgba(59,130,246,.16); color: #60A5FA; }
[data-coreui-theme="dark"] .logro-danger { background: rgba(239,68,68,.16); color: #F87171; }
[data-coreui-theme="dark"] .dyn-count { color: #2DD4BF; }
[data-coreui-theme="dark"] .dyn-pct { color: #8A8A80; border-left-color: #2A2A22; }
[data-coreui-theme="dark"] .c-green { color: #34D399; }
[data-coreui-theme="dark"] .c-blue { color: #60A5FA; }
[data-coreui-theme="dark"] .c-red { color: #F87171; }
[data-coreui-theme="dark"] .exec-shell td[style*="#0f766e"] { color: #2DD4BF !important; }
/* celdas dinámicas de color */
[data-coreui-theme="dark"] .bg-dyn-high { background-color: rgba(16,185,129,.20) !important; border-left-color: rgba(16,185,129,.45) !important; }
[data-coreui-theme="dark"] .bg-dyn-low { background-color: rgba(239,68,68,.18) !important; border-left-color: rgba(239,68,68,.40) !important; }
[data-coreui-theme="dark"] .tbody-row:hover td.bg-dyn-high { background-color: rgba(16,185,129,.32) !important; }
[data-coreui-theme="dark"] .tbody-row:hover td.bg-dyn-low { background-color: rgba(239,68,68,.30) !important; }
/* footer de tabla navy: el texto debe seguir claro aunque --white sea oscuro */
[data-coreui-theme="dark"] .tfoot-row td { color: #F4F4F0; }
[data-coreui-theme="dark"] .kpi-card-top-name { color: #F4F4F0; }
/* leyenda BCG */
[data-coreui-theme="dark"] .bcg-star { color: #2DD4BF; }
[data-coreui-theme="dark"] .bcg-cow { color: #38BDF8; }
[data-coreui-theme="dark"] .bcg-q { color: #FBBF24; }
[data-coreui-theme="dark"] .bcg-dog { color: #FB7185; }
[data-coreui-theme="dark"] .qlab { opacity: 0.14; }
/* columnas sticky: fondos SÓLIDOS (no rgba, para que no se transparente al scrollear) */
[data-coreui-theme="dark"] thead .sticky-num,
[data-coreui-theme="dark"] thead .sticky-linea,
[data-coreui-theme="dark"] thead .sticky-prog,
[data-coreui-theme="dark"] thead .sticky-tipo,
[data-coreui-theme="dark"] thead .sticky-ini,
[data-coreui-theme="dark"] thead .sticky-ed { background: #1E212A !important; }
[data-coreui-theme="dark"] .thead-filter .tf { background: #1E212A; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .thead-filter :deep(.exec-flatpickr-input) {
  background: #14140F;
  border-color: #3A3A33;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .thead-filter :deep(.exec-flatpickr-input:focus) { border-color: #8FAADC; }
[data-coreui-theme="dark"] .sticky-group-a { background: #1E212A !important; }
[data-coreui-theme="dark"] .tbody-row .sticky-num,
[data-coreui-theme="dark"] .tbody-row .sticky-linea,
[data-coreui-theme="dark"] .tbody-row .sticky-prog,
[data-coreui-theme="dark"] .tbody-row .sticky-tipo,
[data-coreui-theme="dark"] .tbody-row .sticky-ini,
[data-coreui-theme="dark"] .tbody-row .sticky-ed { background: #1B1D22 !important; }
[data-coreui-theme="dark"] .tbody-row.row-alt .sticky-num,
[data-coreui-theme="dark"] .tbody-row.row-alt .sticky-linea,
[data-coreui-theme="dark"] .tbody-row.row-alt .sticky-prog,
[data-coreui-theme="dark"] .tbody-row.row-alt .sticky-tipo,
[data-coreui-theme="dark"] .tbody-row.row-alt .sticky-ini,
[data-coreui-theme="dark"] .tbody-row.row-alt .sticky-ed { background: #1E212A !important; }
[data-coreui-theme="dark"] .tbody-row:hover .sticky-num,
[data-coreui-theme="dark"] .tbody-row:hover .sticky-linea,
[data-coreui-theme="dark"] .tbody-row:hover .sticky-prog,
[data-coreui-theme="dark"] .tbody-row:hover .sticky-tipo,
[data-coreui-theme="dark"] .tbody-row:hover .sticky-ini,
[data-coreui-theme="dark"] .tbody-row:hover .sticky-ed { background: #232834 !important; }
[data-coreui-theme="dark"] .sticky-ed { box-shadow: 4px 0 8px rgba(0,0,0,.35); border-right-color: rgba(96,165,250,.35) !important; }
</style>
