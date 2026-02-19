<template>
  <div class="card border-0 shadow-sm mb-4">

    <div class="card-header bg-white p-4 border-bottom">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-1 fw-bold text-primary">
            <i class="fa-solid fa-calendar-check me-2"></i>Tablero de Cronograma Objetivos
          </h4>
          <span class="text-muted small">
            Gestión comercial y financiera por programas — {{ filters.year }}
          </span>
        </div>

        <div class="d-flex gap-2 align-items-center">
          <button @click="toggleView" class="btn btn-outline-secondary px-3 py-2 shadow-sm">
            <span v-if="!isDashboard">
              <i class="fa-solid fa-chart-pie me-2"></i>Ver Gráficos
            </span>
            <span v-else>
              <i class="fa-solid fa-table me-2"></i>Ver Tabla
            </span>
          </button>

          <button
            class="btn btn-primary px-4 py-2 shadow-sm btn-hover-effect"
            @click="loadData"
            :disabled="isLoading"
          >
            <i class="fa-solid fa-sync me-2" :class="{ 'fa-spin': isLoading }"></i>
            {{ isLoading ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>
      </div>

      <div class="filter-bar bg-light rounded-3 p-3 border">
        <div class="row g-3 align-items-end">

          <div class="col-md-2">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-regular fa-calendar me-1"></i> Año
            </label>
            <select v-model="filters.year" class="form-select bg-white" @change="loadData">
              <option :value="2026">2026</option>
              <option :value="2025">2025</option>
              <option :value="2024">2024</option>
            </select>
          </div>

          <div class="col-md-2">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-solid fa-calendar-days me-1"></i> Mes
            </label>
            <select v-model="filters.month" class="form-select bg-white" @change="loadData">
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

          <div class="col-md-4">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-solid fa-layer-group me-1"></i> Vista de Métricas
            </label>
            <select v-model="selectedMetricGroup" class="form-select bg-white">
              <option value="clientes"> CLIENTES </option>
              <option value="origen"> ORIGEN</option>
              <option value="asesores"> ASESORES</option>
              <option value="comercial"> ESTADO COMERCIAL</option>
            </select>
          </div>

          <div class="col-md-4" v-show="!isDashboard">
             <div class="d-flex gap-3 justify-content-end h-100 align-items-end">
                <div class="kpi-inline text-end">
                    <div class="x-small fw-bold text-uppercase text-secondary ls-1">Meta S/.</div>
                    <div class="fw-bold text-dark fs-6">{{ formatMoney(totalObjetivo) }}</div>
                </div>
                <div class="kpi-inline text-end">
                    <div class="x-small fw-bold text-uppercase text-secondary ls-1">Venta S/.</div>
                    <div class="fw-bold text-primary fs-6">{{ formatMoney(totalVenta) }}</div>
                </div>
                <div class="kpi-inline text-end">
                    <div class="x-small fw-bold text-uppercase text-secondary ls-1">% Logro</div>
                    <div class="fw-bold text-success fs-6">{{ calcPct(totalVenta, totalObjetivo) }}%</div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>

    <div class="card-body bg-body-tertiary" style="min-height: 500px;">

      <div v-if="isLoading" class="d-flex flex-column align-items-center justify-content-center h-100 py-5 fade-in">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
        <h5 class="text-muted fw-bold">Calculando objetivos...</h5>
      </div>

      <div v-else class="animate__animated animate__fadeIn p-2">

        <div v-if="!isDashboard">
          <div class="card border-0 shadow-sm mb-4 widget-card">
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0 small align-middle" style="min-width: 1200px;">
                  <thead class="table-light sticky-top">
                    <tr>
                      <th class="ps-3 py-2 border-0" rowspan="2" style="vertical-align:middle">CATEGORÍA</th>
                      <th colspan="5" class="text-center py-2 border-0 border-start group-header-blue">DATOS DEL PROGRAMA</th>
                      <th colspan="3" class="text-center py-2 border-0 border-start group-header-green">OBJETIVOS Y LOGROS</th>
                      <th :colspan="currentDynamicColumns.length || 1" class="text-center py-2 border-0 border-start group-header-gray text-uppercase">
                        {{ currentGroupTitle }}
                      </th>
                    </tr>
                    <tr class="table-light">
                      <th class="text-center py-2 border-0 border-start sub-blue">LÍNEA</th>
                      <th class="text-start py-2 border-0 sub-blue">PROGRAMA</th>
                      <th class="text-center py-2 border-0 sub-blue">TIPO</th>
                      <th class="text-center py-2 border-0 sub-blue">INICIO</th>
                      <th class="text-center py-2 border-0 sub-blue">EDICIÓN</th>

                      <th class="text-end py-2 border-0 border-start sub-green">META S/.</th>
                      <th class="text-end py-2 border-0 sub-green">VENTA S/.</th>
                      <th class="text-center py-2 border-0 sub-green">%</th>

                      <th
                        v-for="col in currentDynamicColumns"
                        :key="col.key"
                        class="text-center py-2 border-0 border-start sub-gray"
                      >
                        <div class="d-flex flex-column">
                          <span class="text-uppercase" style="white-space: nowrap;">{{ col.displayName }}</span>
                          <div class="d-flex justify-content-center gap-2 x-small text-muted fw-normal mt-1">
                             <span>#</span> <span class="border-start ps-2">%</span>
                          </div>
                        </div>
                      </th>
                      <th v-if="currentDynamicColumns.length === 0" class="text-center py-2 border-0 border-start sub-gray text-muted fw-normal">
                        Sin datos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in processedData" :key="index" class="cursor-pointer row-hover">
                      <td class="ps-3 py-2 border-0 fw-bold">
                         <span class="badge rounded-pill" :class="getBadgeClass(row.catg)">{{ row.catg }}</span>
                      </td>
                      <td class="text-center py-2 border-0 border-start bg-blue-subtle text-muted">{{ row.linea }}</td>
                      <td class="py-2 border-0 bg-blue-subtle fw-bold text-dark text-truncate" style="max-width: 200px;" :title="row.programa">{{ row.programa }}</td>
                      <td class="text-center py-2 border-0 bg-blue-subtle">
                           <span class="badge border text-dark bg-white" style="font-size: 0.7rem;">{{ row.tipo }}</span>
                      </td>
                      <td class="text-center py-2 border-0 bg-blue-subtle text-muted x-small">{{ formatDate(row.fecha) }}</td>
                      <td class="text-center py-2 border-0 bg-blue-subtle text-muted x-small">{{ row.edicion }}</td>

                      <td class="text-end py-2 border-0 border-start bg-success-subtle text-muted x-small">{{ formatMoney(row.objetivo) }}</td>
                      <td class="text-end py-2 border-0 bg-success-subtle fw-bold text-dark">{{ formatMoney(row.venta) }}</td>
                      <td class="text-center py-2 border-0 bg-success-subtle">
                           <span :class="getPctColorClass(calcPct(row.venta, row.objetivo))">{{ calcPct(row.venta, row.objetivo) }}%</span>
                      </td>

                      <td
                        v-for="col in currentDynamicColumns"
                        :key="col.key"
                        class="text-center py-2 border-0 border-start"
                      >
                        <div class="d-flex justify-content-center gap-2">
                           <span class="fw-bold text-dark">{{ getDynamicValue(row._raw, currentGroupField, col.originalName, 'cant') }}</span>
                           <span class="text-muted border-start ps-2 x-small" style="min-width: 30px;">{{ getDynamicValue(row._raw, currentGroupField, col.originalName, 'pct') }}%</span>
                        </div>
                      </td>
                      <td v-if="currentDynamicColumns.length === 0" class="text-center py-2 border-0 border-start">-</td>
                    </tr>
                  </tbody>
                  <tfoot>
                      <tr class="table-secondary fw-bold border-top">
                          <td class="ps-3 py-2" colspan="6">TOTALES GENERALES</td>
                          <td class="text-end py-2">{{ formatMoney(totalObjetivo) }}</td>
                          <td class="text-end py-2 text-primary">{{ formatMoney(totalVenta) }}</td>
                          <td class="text-center py-2">
                               <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2">
                                  {{ calcPct(totalVenta, totalObjetivo) }}%
                               </span>
                          </td>
                          <td
                            v-for="col in currentDynamicColumns"
                            :key="`t-${col.key}`"
                            class="text-center py-2 border-start"
                          >
                              {{ getDynamicTotal(currentGroupField, col.originalName) }}
                          </td>
                          <td v-if="currentDynamicColumns.length === 0" class="text-center py-2 border-start">-</td>
                      </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div v-else>
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm kpi-dash-card h-100">
                <div class="card-body p-3">
                  <div class="d-flex align-items-center gap-3">
                    <div class="kpi-icon bg-success-subtle rounded-3 p-2">
                      <i class="fa-solid fa-money-bill-trend-up text-success fs-5"></i>
                    </div>
                    <div>
                      <div class="x-small fw-bold text-uppercase text-secondary">Logro Global Financiero</div>
                      <div class="fw-bold fs-5" :class="getPctColorClass(kpiStats.globalPct)">{{ kpiStats.globalPct }}%</div>
                    </div>
                  </div>
                  <div class="progress mt-2" style="height:4px; border-radius:2px;">
                    <div class="progress-bar" :class="kpiStats.globalPct >= 80 ? 'bg-success' : 'bg-warning'" :style="`width:${Math.min(100, kpiStats.globalPct)}%`"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm kpi-dash-card h-100">
                <div class="card-body p-3">
                  <div class="d-flex align-items-center gap-3">
                    <div class="kpi-icon bg-primary-subtle rounded-3 p-2">
                      <i class="fa-solid fa-sack-dollar text-primary fs-5"></i>
                    </div>
                    <div>
                      <div class="x-small fw-bold text-uppercase text-secondary">Venta Total S/.</div>
                      <div class="fw-bold fs-5 text-dark">{{ formatMoney(totalVenta) }}</div>
                    </div>
                  </div>
                  <div class="x-small text-muted mt-1">Meta: {{ formatMoney(totalObjetivo) }}</div>
                </div>
              </div>
            </div>

            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm kpi-dash-card h-100">
                <div class="card-body p-3">
                  <div class="d-flex align-items-center gap-3">
                    <div class="kpi-icon bg-info-subtle rounded-3 p-2">
                      <i class="fa-solid fa-layer-group text-info fs-5"></i>
                    </div>
                    <div>
                      <div class="x-small fw-bold text-uppercase text-secondary">Total Programas</div>
                      <div class="fw-bold fs-5 text-info">{{ processedData.length }}</div>
                    </div>
                  </div>
                  <div class="x-small text-muted mt-1">Activos en el periodo</div>
                </div>
              </div>
            </div>

            <div class="col-6 col-md-3">
              <div class="card border-0 shadow-sm kpi-dash-card h-100">
                <div class="card-body p-3">
                  <div class="d-flex align-items-center gap-3">
                    <div class="kpi-icon bg-warning-subtle rounded-3 p-2">
                      <i class="fa-solid fa-star text-warning fs-5"></i>
                    </div>
                    <div class="text-truncate">
                      <div class="x-small fw-bold text-uppercase text-secondary">Top Programa (Ventas)</div>
                      <div class="fw-bold fs-6 text-dark text-truncate" :title="kpiStats.topProgram.name">{{ kpiStats.topProgram.name }}</div>
                    </div>
                  </div>
                  <div class="x-small text-muted mt-1 fw-bold text-warning">{{ formatMoney(kpiStats.topProgram.venta) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="row g-4 mb-4">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center">
                  <span class="bg-primary-subtle text-primary p-1 rounded me-2"><i class="fa-solid fa-chart-column"></i></span>
                  <div>
                    <span class="fw-bold text-dark">Cumplimiento de Meta S/. por Programa</span>
                    <div class="x-small text-muted">Comparativa Meta vs Venta Real</div>
                  </div>
                </div>
                <div class="card-body" style="height: 320px;">
                  <Bar :data="programRevenueChartData" :options="groupedBarOptions" />
                </div>
              </div>
            </div>

            <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center">
                  <span class="bg-warning-subtle text-warning p-1 rounded me-2"><i class="fa-solid fa-ranking-star"></i></span>
                  <div>
                    <span class="fw-bold text-dark">Ranking % de Logro</span>
                    <div class="x-small text-muted">Desempeño sobre la meta establecida</div>
                  </div>
                </div>
                <div class="card-body" style="height: 320px;">
                  <Bar :data="rankingChartData" :options="rankingBarOptions" />
                </div>
              </div>
            </div>
          </div>

          <div class="row g-4">
            <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <span class="bg-secondary-subtle text-secondary p-1 rounded me-2"><i class="fa-solid fa-chart-pie"></i></span>
                    <span class="fw-bold text-dark text-uppercase">TOTAL {{ currentGroupTitle }}</span>
                  </div>
                </div>
                <div class="card-body d-flex align-items-center justify-content-center" style="height: 320px;">
                  <Doughnut :data="dynamicDoughnutChartData" :options="doughnutOptions" />
                </div>
              </div>
            </div>

            <div class="col-lg-8">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center">
                  <span class="bg-info-subtle text-info p-1 rounded me-2"><i class="fa-solid fa-layer-group"></i></span>
                  <div>
                    <span class="fw-bold text-dark text-uppercase">Composición de {{ currentGroupTitle }} por Programa</span>
                    <div class="x-small text-muted">Distribución en valores absolutos (Cantidades)</div>
                  </div>
                </div>
                <div class="card-body" style="height: 320px;">
                  <Bar :data="dynamicStackedChartData" :options="stackedBarOptions" />
                </div>
              </div>
            </div>
          </div>
          <div class="row g-4 mt-1">
            <div class="col-12">
              <div class="card border-0 shadow-sm widget-card">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <span class="bg-dark-subtle text-dark p-1 rounded me-2"><i class="fa-solid fa-chess-knight"></i></span>
                    <div>
                      <span class="fw-bold text-dark text-uppercase">Matriz de Portafolio (Adaptación BCG)</span>
                      <div class="x-small text-muted">Ventas en S/. (Eje X) vs % de Cumplimiento de Meta (Eje Y)</div>
                    </div>
                  </div>
                  <div class="d-flex gap-3 x-small fw-bold">
                    <span class="text-success"><i class="fa-solid fa-circle me-1"></i>Estrellas</span>
                    <span class="text-primary"><i class="fa-solid fa-circle me-1"></i>Vacas</span>
                    <span class="text-warning"><i class="fa-solid fa-circle me-1"></i>Interrogantes</span>
                    <span class="text-danger"><i class="fa-solid fa-circle me-1"></i>Perros</span>
                  </div>
                </div>
                <div class="card-body position-relative" style="height: 380px;">
                  <div class="position-absolute text-muted opacity-25 fw-bold fs-3" style="top: 10%; right: 5%;">ESTRELLAS</div>
                  <div class="position-absolute text-muted opacity-25 fw-bold fs-3" style="bottom: 15%; right: 5%;">VACAS</div>
                  <div class="position-absolute text-muted opacity-25 fw-bold fs-3" style="top: 10%; left: 10%;">INTERROGANTES</div>
                  <div class="position-absolute text-muted opacity-25 fw-bold fs-3" style="bottom: 15%; left: 10%;">PERROS</div>

                  <Scatter :data="bcgChartData" :options="bcgChartOptions" />
                </div>
              </div>
            </div>
          </div>
        </div> </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'

// IMPORTACIONES CHART.JS
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)

const isLoading = ref(false)
const isDashboard = ref(false)
const selectedMetricGroup = ref('origen')
const filters = ref({ year: 2026, month: 1 })
const rawData = ref([])

// === CONFIGURACIÓN DINÁMICA ===
const metricGroupDefinitions = {
  clientes:  { title: 'CLIENTES',          field: 'breakdown_clientes' },
  origen:    { title: 'ORIGEN - VÍAS',     field: 'breakdown_origen' },
  asesores:  { title: 'ASESORES',          field: 'breakdown_asesores' },
  comercial: { title: 'ESTADO COMERCIAL',  field: 'breakdown_estados' }
}

// Paleta de colores para gráficos dinámicos
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6', '#f97316', '#64748b']

onMounted(() => { loadData() })

async function loadData() {
  isLoading.value = true
  try {
    const payload = { year: filters.value.year, month_num: filters.value.month }
    const response = await dashboardService.programGoalsList(payload)
    rawData.value = response.items || []
  } catch (error) { console.error("Error:", error) }
  finally { isLoading.value = false }
}

const toggleView = () => isDashboard.value = !isDashboard.value

// === LÓGICA DE PIVOT DINÁMICO ===
const currentGroupTitle = computed(() => metricGroupDefinitions[selectedMetricGroup.value].title)
const currentGroupField = computed(() => metricGroupDefinitions[selectedMetricGroup.value].field)

const currentDynamicColumns = computed(() => {
    const field = currentGroupField.value
    const uniqueNames = new Set()
    rawData.value.forEach(row => {
        (row[field] || []).forEach(item => { if (item.name) uniqueNames.add(item.name) })
    })
    return Array.from(uniqueNames).sort().map(name => ({
        key: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        displayName: name,
        originalName: name
    }))
})

const processedData = computed(() => {
    return rawData.value.map(item => ({
        catg: item.categoria || 'GEN', linea: item.linea || '-',
        programa: item.programa, tipo: item.tipo, fecha: item.inicio, edicion: item.codigo,
        objetivo: item.meta_monto, venta: item.venta_monto,
        _raw: item
    }))
})

// === TOTALES ===
const totalObjetivo = computed(() => processedData.value.reduce((acc, row) => acc + (row.objetivo || 0), 0))
const totalVenta = computed(() => processedData.value.reduce((acc, row) => acc + (row.venta || 0), 0))

const kpiStats = computed(() => {
  const globalPct = totalObjetivo.value > 0 ? Math.round((totalVenta.value / totalObjetivo.value) * 100) : 0

  let topName = 'Sin Datos'
  let topVenta = 0
  if (processedData.value.length > 0) {
    const sorted = [...processedData.value].sort((a,b) => b.venta - a.venta)
    topName = sorted[0].programa
    topVenta = sorted[0].venta
  }
  return { globalPct, topProgram: { name: topName, venta: topVenta } }
})

// === HELPERS ===
function getDynamicValue(rawRow, field, searchName, type) {
    const arrayData = rawRow[field] || []
    const found = arrayData.find(x => x.name === searchName)
    const cant = found ? Number(found.count) : 0
    if (type === 'cant') return cant
    const totalGroupLeads = arrayData.reduce((acc, curr) => acc + Number(curr.count), 0)
    return totalGroupLeads > 0 ? Math.round((cant / totalGroupLeads) * 100) : 0
}

function getDynamicTotal(field, searchName) {
    return rawData.value.reduce((sum, rawRow) => {
        const arrayData = rawRow[field] || []
        const found = arrayData.find(x => x.name === searchName)
        return sum + (found ? Number(found.count) : 0)
    }, 0)
}

function formatMoney(value) { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(value) }
function truncate(str, max) { return str.length > max ? str.substring(0, max) + '...' : str }
function formatDate(dateString) { if(!dateString) return '-'; return dateString.split('T')[0].split('-').reverse().join('/') }
function calcPct(venta, objetivo) { return (!objetivo || objetivo === 0) ? 0 : Math.round((venta / objetivo) * 100) }

function getPctColorClass(pct) {
  if (pct >= 100) return 'text-success fw-bold'
  if (pct >= 80) return 'text-primary fw-bold'
  return 'text-danger fw-bold'
}

function getBadgeClass(catg) {
  const map = { 'CURSO': 'bg-primary-subtle text-primary border border-primary-subtle', 'DIPLOMADO': 'bg-purple-subtle text-purple border border-purple-subtle', 'PEE': 'bg-warning-subtle text-warning-emphasis border border-warning-subtle', 'ESP.': 'bg-info-subtle text-info-emphasis border border-info-subtle' }
  return map[catg] || 'bg-light text-secondary border'
}

// ══════════════════════════════════════
//   DATA PARA GRÁFICOS
// ══════════════════════════════════════

// 1. Meta S/. vs Real S/. por Programa
const programRevenueChartData = computed(() => {
  const labels = processedData.value.map(d => truncate(d.programa, 25))
  return {
    labels,
    datasets: [
      { label: 'Meta S/.', data: processedData.value.map(d => d.objetivo), backgroundColor: '#e2e8f0', borderRadius: 4 },
      { label: 'Venta S/.', data: processedData.value.map(d => d.venta), backgroundColor: '#10b981', borderRadius: 4 }
    ]
  }
})

// 2. Ranking % Cumplimiento (Horizontal Bar)
const rankingChartData = computed(() => {
  const sorted = [...processedData.value]
    .filter(d => d.objetivo > 0 || d.venta > 0)
    .sort((a, b) => (b.venta / (b.objetivo || 1)) - (a.venta / (a.objetivo || 1)))

  const pcts = sorted.map(d => d.objetivo > 0 ? Math.round((d.venta / d.objetivo) * 100) : 0)
  const colors = pcts.map(p => p >= 100 ? 'rgba(16, 185, 129, 0.85)' : p >= 80 ? 'rgba(59, 130, 246, 0.85)' : 'rgba(239, 68, 68, 0.85)')

  return {
    labels: sorted.map(d => truncate(d.programa, 20)),
    datasets: [
      { label: '% Cumplimiento', data: pcts, backgroundColor: colors, borderRadius: 6 },
      { label: 'Meta 100%', data: sorted.map(() => 100), type: 'line', borderColor: 'rgba(0,0,0,0.3)', borderDash: [5,3], borderWidth: 1, pointRadius: 0, fill: false }
    ]
  }
})

// 3. Dona Dinámica (Totales de la vista actual)
const dynamicDoughnutChartData = computed(() => {
  const labels = currentDynamicColumns.value.map(c => c.displayName)
  const data = currentDynamicColumns.value.map(c => getDynamicTotal(currentGroupField.value, c.originalName))

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: CHART_COLORS.slice(0, labels.length),
      borderWidth: 2, borderColor: '#ffffff'
    }]
  }
})

// 4. Barras Apiladas Dinámicas por Programa
const dynamicStackedChartData = computed(() => {
  const labels = processedData.value.map(d => truncate(d.programa, 20))

  const datasets = currentDynamicColumns.value.map((col, idx) => ({
    label: col.displayName,
    data: processedData.value.map(row => getDynamicValue(row._raw, currentGroupField.value, col.originalName, 'cant')),
    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
    stack: 'stack1'
  }))

  return { labels, datasets }
})

// ══════════════════════════════════════
//   OPCIONES DE CHART.JS
// ══════════════════════════════════════

const groupedBarOptions = {
  responsive: true, maintainAspectRatio: false,
  scales: { x: { grid: { display: false } } },
  plugins: { legend: { display: true, position: 'bottom' } }
}

const rankingBarOptions = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw}% de la meta` } } },
  scales: {
    x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => v + '%' } },
    y: { grid: { display: false } }
  }
}

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false, cutout: '65%',
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }
}

const stackedBarOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { stacked: true, grid: { display: false } },
    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } }
  }
}
</script>

<style scoped>
/* ESTILOS (Combinación del tablero anterior + utilidades del Dashboard) */
.widget-card { border-radius: 0.5rem; overflow: hidden; }
.row-hover:hover { background-color: #f1f5f9; }
.cursor-pointer { cursor: pointer; }
.ls-1 { letter-spacing: 0.05em; }
.x-small { font-size: 0.7rem; }
.sticky-top { position: sticky; top: 0; z-index: 5; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.fade-in { animation: fadeIn 0.5s ease-in-out; }

/* Dashboard Cards */
.kpi-dash-card { transition: transform 0.15s, box-shadow 0.15s; border-radius: 0.5rem; overflow: hidden; }
.kpi-dash-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
.kpi-icon { display: flex; align-items: center; justify-content: center; min-width: 42px; height: 42px; }
.kpi-inline { min-width: 80px; }

/* Colores de Tabla */
.group-header-blue { background: #eff6ff; color: #1e40af; }
.group-header-green { background: #ecfdf5; color: #047857; }
.group-header-gray { background: #f8fafc; color: #475569; }

.sub-blue { background: #eff6ff; color: #1d4ed8; }
.sub-green { background: #ecfdf5; color: #059669; }
.sub-gray { background: #f8fafc; color: #64748b; }

.bg-blue-subtle { background-color: #eff6ff !important; }
.bg-success-subtle { background-color: #ecfdf5 !important; }

/* Badges Custom */
.bg-purple-subtle { background-color: #f3e8ff !important; }
.text-purple { color: #7e22ce !important; }
.border-purple-subtle { border-color: #d8b4fe !important; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
