<template>
  <div class="card border-0 shadow-sm mb-4">

    <!-- ═══════════════════════════════════════════════
         CARD HEADER: Título + Filtros (mismo patrón que Control Comercial)
    ════════════════════════════════════════════════ -->
    <div class="card-header bg-white p-4 border-bottom">

      <!-- Título + Botones de acción -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-1 fw-bold text-primary">
            <i class="fa-solid fa-bullseye me-2"></i>Tablero de Asesor Objetivos
          </h4>
          <span class="text-muted small">
            VISTA: {{ filters.period === 'ALL' ? 'MENSUAL' : filters.period }} — {{ filters.month }} {{ filters.year }}
          </span>
        </div>

        <div class="d-flex gap-2 align-items-center">
          <!-- Toggle Vista -->
          <button @click="toggleView" class="btn btn-outline-secondary px-3 py-2 shadow-sm">
            <span v-if="!isDashboard">
              <i class="fa-solid fa-chart-bar me-2"></i>Ver Gráficos
            </span>
            <span v-else>
              <i class="fa-solid fa-table me-2"></i>Ver Tabla
            </span>
          </button>
          <!-- Actualizar -->
          <button
            class="btn btn-primary px-4 py-2 shadow-sm btn-hover-effect"
            @click="fetchData"
            :disabled="loading"
          >
            <i class="fa-solid fa-sync me-2" :class="{ 'fa-spin': loading }"></i>
            {{ loading ? 'Cargando...' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

        <div class="filter-bar bg-light rounded-3 p-3 border">
                <div class="row g-3 align-items-end">
                
                    <div class="col-12 col-sm-6 col-lg-3 col-xl-2">
                    <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                        <i class="fa-solid fa-layer-group me-1"></i> Modalidad
                    </label>
                    <div class="btn-group w-100" role="group">
                        <button 
                        type="button" 
                        class="btn btn-sm"
                        :class="filters.modality === 'NO_ONLINE' ? 'btn-dark' : 'btn-outline-secondary'"
                        @click="filters.modality = 'NO_ONLINE'; fetchData()"
                        >
                        <i class="fa-solid fa-chalkboard-user me-1"></i> EN VIVO
                        </button>
                        <button 
                        type="button" 
                        class="btn btn-sm"
                        :class="filters.modality === 'ONLINE' ? 'btn-primary' : 'btn-outline-secondary'"
                        @click="filters.modality = 'ONLINE'; fetchData()"
                        >
                        <i class="fa-solid fa-wifi me-1"></i> ONLINE
                        </button>
                    </div>
                    </div>

                <div class="col-6 col-sm-3 col-lg-2">
                    <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                    <i class="fa-regular fa-calendar me-1"></i> Año
                    </label>
                    <select class="form-select bg-white" v-model="filters.year" @change="fetchData">
                    <option :value="2026">2026</option>
                    <option :value="2025">2025</option>
                    </select>
                </div>

                <div class="col-6 col-sm-3 col-lg-2">
                    <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                    <i class="fa-solid fa-calendar-days me-1"></i> Mes
                    </label>
                    <select class="form-select bg-white" v-model="filters.month" @change="fetchData">
                    <option value="ENE">Enero</option>
                    <option value="FEB">Febrero</option>
                    <option value="MAR">Marzo</option>
                    </select>
                </div>

                <div class="col-12 col-md-6 col-lg-3 col-xl-2">
                    <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                    <i class="fa-solid fa-clock-rotate-left me-1"></i> Periodo (Vista)
                    </label>
                    <select class="form-select bg-white" v-model="filters.period" @change="fetchData">
                    <option value="ALL">Acumulado (MTD)</option>
                    <option
                        v-for="opt in currentPeriodOptions"
                        :key="opt.value"
                        :value="opt.value"
                    >{{ opt.label }}</option>
                    </select>
                </div>

                <div class="col-12 col-md-6 col-lg-12 col-xl-4 mt-3 mt-xl-0">
                    <div class="d-flex flex-wrap gap-3 justify-content-start justify-content-xl-end h-100 align-items-end">
                    <div
                        class="kpi-inline text-start text-xl-end cursor-pointer"
                        @click="drillDown({ type: 'sales' })"
                        title="Ver todas las ventas del mes"
                    >
                        <div class="x-small fw-bold text-uppercase text-secondary ls-1">Venta Total</div>
                        <div class="fw-bold text-primary fs-6">{{ formatCurrency(totals.ven_monto) }}</div>
                    </div>
                    <div class="kpi-inline text-start text-xl-end border-start ps-3 border-xl-0 ps-xl-0">
                        <div class="x-small fw-bold text-uppercase text-secondary ls-1">Ticket Prom.</div>
                        <div class="fw-bold text-dark fs-6">{{ formatCurrency(totals.ticketProm) }}</div>
                    </div>
                    <div class="kpi-inline text-start text-xl-end border-start ps-3 border-xl-0 ps-xl-0">
                        <div class="x-small fw-bold text-uppercase text-secondary ls-1">% Meta S/.</div>
                        <div class="fw-bold text-success fs-6">{{ totals.pctMetaMonto }}%</div>
                    </div>
                    </div>
                </div>

                </div>
            </div>
    </div>

    <!-- ═══════════════════════════════════════════════
         CARD BODY: Contenido principal
    ════════════════════════════════════════════════ -->
    <div class="card-body bg-body-tertiary" style="min-height: 500px;">

      <!-- Loading -->
      <div v-if="loading" class="d-flex flex-column align-items-center justify-content-center h-100 py-5 fade-in">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
        <h5 class="text-muted fw-bold">Cargando métricas...</h5>
      </div>

      <div v-else class="animate__animated animate__fadeIn p-2">

        <!-- ── VISTA TABLA ── -->
        <div v-if="!isDashboard">

          <!-- Tabla Principal de Asesores -->
<div class="card border-0 shadow-sm mb-4 widget-card">
    <div class="card-body p-0">
      <div class="table-responsive">
        <table class="table table-hover mb-0 small align-middle">
          <thead class="table-light sticky-top">
            <tr>
              <th class="ps-3 py-2 border-0" rowspan="2" style="vertical-align:middle">ASESOR</th>
              <th colspan="3" class="text-center py-2 border-0 border-start group-header-blue">OBJETIVOS (VACANTES)</th>
              <th colspan="3" class="text-center py-2 border-0 border-start group-header-green">FINANCIERO (S/.)</th>
              <th colspan="3" class="text-center py-2 border-0 border-start group-header-gray">RESULTADOS</th>
              <th colspan="4" class="text-center py-2 border-0 border-start group-header-dark">LOGROS</th>
            </tr>
            <tr class="table-light">
              <th class="text-center py-2 border-0 border-start sub-blue">META #</th>
              <th class="text-center py-2 border-0 sub-blue" title="Ventas Operativas (Fecha de Pago)">REAL #</th>
              <th class="text-center py-2 border-0 sub-blue">GAP</th>
              
              <th class="text-center py-2 border-0 border-start sub-green">META S/.</th>
              <th class="text-center py-2 border-0 sub-green">VENTA S/.</th>
              <th class="text-center py-2 border-0 sub-green">TICKET</th>
              
              <th class="text-center py-2 border-0 border-start sub-gray">LEADS</th>
              <th class="text-center py-2 border-0 sub-gray" title="Leads con estado pendiente (Last Follow)">ACTIVOS</th>
              <th class="text-center py-2 border-0 sub-gray">% GEST</th>
              
              <th class="text-center py-2 border-0 border-start sub-dark" title="Real # / Leads">RATIO</th>
              <th class="text-center py-2 border-0 sub-dark" title="Ventas según fecha de registro del lead">CONV. #</th>
              <th class="text-center py-2 border-0 sub-dark" title="Conv # / Leads">% CONV</th>
              <th class="text-center pe-3 py-2 border-0 sub-dark">STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="tableData.length === 0">
              <td colspan="14" class="text-center py-4 text-muted">No hay datos para este periodo</td>
            </tr>
            <tr v-for="(row, index) in tableData" :key="index" class="cursor-pointer row-hover">
              <td class="ps-3 py-2 border-0 fw-bold text-dark">{{ row.asesor }}</td>

              <td class="text-center py-2 border-0 border-start bg-blue-subtle">{{ row.obj }}</td>
              <td class="text-center py-2 border-0 bg-blue-subtle fw-bold cursor-pointer cell-actionable"
                  @click.stop="drillDown({ advisor: row.cod, type: 'sales' })">
                {{ row.ven }}
              </td>
              <td class="text-center py-2 border-0 bg-blue-subtle">
                <span :class="row.falta > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'">
                  {{ row.falta > 0 ? '-' + row.falta : '✓' }}
                </span>
              </td>

              <td class="text-end py-2 border-0 border-start bg-success-subtle text-muted x-small">{{ formatCurrency(row.obj_monto) }}</td>
              <td class="text-end py-2 border-0 bg-success-subtle fw-bold text-dark cursor-pointer text-decoration-underline"
                    @click.stop="drillDown({ advisor: row.cod, type: 'sales' })" title="Ver detalle de ventas (Monto)">
                {{ formatCurrency(row.ven_monto) }}
                </td>
              <td class="text-end py-2 border-0 bg-success-subtle x-small">{{ formatCurrency(row.ven_monto / (row.ven || 1)) }}</td>

              <td class="text-center py-2 border-0 border-start cell-actionable"
                  @click.stop="drillDown({ advisor: row.cod, type: 'leads' })">
                {{ row.contactos }}
              </td>
              <td class="text-center py-2 border-0 text-muted cursor-pointer text-decoration-underline"
                    @click.stop="drillDown({ advisor: row.cod, type: 'active_leads' })" title="Ver leads activos / pendientes de gestión">
                {{ row.activos }}
                </td>
              <td class="text-center py-2 border-0 x-small">{{ row.pct_gestion }}%</td>

              <td class="text-center py-2 border-0 border-start fw-bold text-primary">{{ row.ratio }}%</td>
              <td class="text-center py-2 border-0 fw-bold text-dark cursor-pointer text-decoration-underline"
                    @click.stop="drillDown({ advisor: row.cod, type: 'cohort_sales' })" title="Ver ventas provenientes de leads de este periodo">
                {{ row.acum_ventas_cohorte }}
                </td>
              <td class="text-center py-2 border-0 fw-bold">
                <span :class="getConvClass(row.conv)">{{ row.conv }}%</span>
              </td>
              <td class="text-center pe-3 py-2 border-0">
                <span class="badge rounded-pill" :class="getStatusBadge(row.ratio)">
                  {{ getStatusLabel(row.ratio) }}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="table-secondary fw-bold border-top">
              <td class="ps-3 py-2">TOTAL EQUIPO</td>
              <td class="text-center py-2">{{ totals.obj }}</td>
              <td class="text-center py-2 text-primary cursor-pointer text-decoration-underline" @click="drillDown({ type: 'sales' })">{{ totals.ven }}</td>
              <td class="text-center py-2 text-danger">-{{ totals.falta }}</td>
              <td class="text-end py-2">{{ formatCurrency(totals.obj_monto) }}</td>
              <td class="text-end py-2 text-success cursor-pointer text-decoration-underline" 
                    @click="drillDown({ type: 'sales' })">
                {{ formatCurrency(totals.ven_monto) }}
                </td>
              <td class="text-end py-2">{{ formatCurrency(totals.ticketProm) }}</td>
              
              <td class="text-center py-2 cursor-pointer text-decoration-underline" @click="drillDown({ type: 'leads' })">{{ totals.contactos }}</td>
              <td class="text-center py-2 text-muted cursor-pointer text-decoration-underline" 
                    @click="drillDown({ type: 'active_leads' })">
                {{ totals.activos }}
                </td>
              <td class="text-center py-2 text-muted">{{ totals.avgGestion }}%</td>
              
              <td class="text-center py-2 text-primary">{{ totals.avgRatio }}%</td>
              <td class="text-center py-2 text-dark cursor-pointer text-decoration-underline" 
                    @click="drillDown({ type: 'cohort_sales' })">
                {{ totals.acum_ventas_cohorte_total }}
                </td>
              <td class="text-center py-2">{{ totals.avgConv }}%</td>
              <td class="text-center pe-3 py-2">
                 <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2">
                  {{ totals.pctMetaMonto }}% $$
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>

          <!-- Sección Micro-gestión diaria -->
          <div class="card border-0 shadow-sm widget-card mb-2" style="border-top: 3px solid #0f172a !important;">
            <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-bold text-dark d-flex align-items-center">
                  <span class="bg-dark-subtle text-dark p-1 rounded me-2">
                    <i class="fa-solid fa-table-cells-large"></i>
                  </span>
                  Micro-Gestión: Desglose por Periodo
                </div>
                <div class="text-muted small mt-1 ms-1">Haga clic en los números para ver el detalle de registros</div>
              </div>
              <div>
                <label class="form-label small fw-bold text-uppercase text-secondary mb-1 d-block">
                  <i class="fa-solid fa-user-tie me-1"></i> Asesor
                </label>
                <select v-model="selectedAdvisorCode" class="form-select form-select-sm bg-white" style="min-width: 220px;">
                  <option value="ALL">Total Equipo (Consolidado)</option>
                  <option v-for="adv in tableData" :key="adv.cod" :value="adv.cod">{{ adv.asesor }}</option>
                </select>
              </div>
            </div>
            <div class="card-body p-3">
              <div class="days-grid">
                <div
                  v-for="(day, i) in currentDailyStats"
                  :key="i"
                  class="card border day-card h-100"
                  :class="{ 'border-primary': day.ven > 0, 'border-light': day.ven === 0 }"
                >
                  <div class="card-header py-2 px-2 text-center border-bottom"
                       :class="day.ven > 0 ? 'bg-primary-subtle' : 'bg-light'">
                    <span class="x-small fw-bold text-uppercase" :class="day.ven > 0 ? 'text-primary' : 'text-secondary'">
                      {{ day.name }}
                    </span>
                  </div>
                  <div class="card-body p-2">
                    <!-- Leads -->
                    <div class="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom">
                      <span class="x-small fw-bold text-uppercase text-secondary">Leads</span>
                      <span
                        class="fw-bold text-dark pointer-badge"
                        @click="drillDown({ date: day.date || day.name, type: 'leads', advisor: selectedAdvisorCode })"
                      >{{ day.con }}</span>
                    </div>
                    <!-- Cierres -->
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="x-small fw-bold text-uppercase text-primary">Ventas Dia</span>
                      <div class="text-end">
                        <span
                          class="fw-bold text-primary d-block pointer-badge"
                          @click="drillDown({ date: day.date || day.name, type: 'sales', advisor: selectedAdvisorCode })"
                        >{{ day.ven }}</span>
                        <span class="x-small text-muted">{{ day.ratio_dia }}%</span>
                      </div>
                    </div>
                    <!-- Conversión -->
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="x-small fw-bold text-uppercase text-success">Conv.</span>
                        <div class="text-end">
                            <span 
                            class="fw-bold text-success d-block pointer-badge text-decoration-underline cursor-pointer"
                          @click="drillDown({ date: day.date || day.name, type: 'cohort_sales', advisor: selectedAdvisorCode })"
                            title="Ver ventas generadas por los leads de este día"
                            >
                            {{ day.ven_coh }}
                            </span>
                            <span class="x-small text-muted">{{ day.conv_dia }}%</span>
                        </div>
                        </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ── VISTA DASHBOARD / GRÁFICOS ── -->
        <div v-else>

          <!-- Fila 1: Evolución + Embudo -->
          <div class="row g-4 mb-4">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white fw-bold text-dark border-bottom py-3 d-flex align-items-center">
                  <span class="bg-dark-subtle text-dark p-1 rounded me-2">
                    <i class="fa-solid fa-chart-line"></i>
                  </span>
                  Evolución de Ventas (Acumulado)
                </div>
                <div class="card-body" style="height: 320px;">
                  <Line :data="trendChartData" :options="lineOptions" />
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white fw-bold text-primary border-bottom py-3 d-flex align-items-center">
                  <span class="bg-primary-subtle text-primary p-1 rounded me-2">
                    <i class="fa-solid fa-filter"></i>
                  </span>
                  Embudo de Conversión
                </div>
                <div class="card-body d-flex flex-column justify-content-center gap-3 p-4">
                  <div class="funnel-step cursor-pointer" @click="drillDown({ type: 'leads' })">
                    <div class="d-flex justify-content-between mb-1">
                      <span class="x-small fw-bold text-uppercase text-secondary">Leads</span>
                      <span class="fw-bold text-dark">{{ totals.contactos }}</span>
                    </div>
                    <div class="progress" style="height: 20px; border-radius: 6px;">
                      <div class="progress-bar bg-secondary" style="width: 100%"></div>
                    </div>
                  </div>
                  <div class="funnel-step cursor-pointer" @click="drillDown({ type: 'sales' })">
                    <div class="d-flex justify-content-between mb-1">
                      <span class="x-small fw-bold text-uppercase text-success">Ventas</span>
                      <span class="fw-bold text-success">{{ totals.ven }}</span>
                    </div>
                    <div class="progress" style="height: 20px; border-radius: 6px;">
                      <div class="progress-bar bg-success" :style="`width: ${totals.avgConv}%`"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Fila 2: Cumplimiento + Participación -->
          <div class="row g-4">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white fw-bold text-success border-bottom py-3 d-flex align-items-center">
                  <span class="bg-success-subtle text-success p-1 rounded me-2">
                    <i class="fa-solid fa-money-bill-trend-up"></i>
                  </span>
                  Cumplimiento de Meta (S/.)
                </div>
                <div class="card-body" style="height: 280px;">
                  <Bar :data="revenueChartData" :options="groupedBarOptions" />
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white fw-bold text-secondary border-bottom py-3 d-flex align-items-center">
                  <span class="bg-secondary-subtle text-secondary p-1 rounded me-2">
                    <i class="fa-solid fa-chart-pie"></i>
                  </span>
                  Participación (Share)
                </div>
                <div class="card-body d-flex align-items-center justify-content-center" style="height: 280px;">
                  <Doughnut :data="shareChartData" :options="doughnutOptions" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// ── El script es idéntico al original, sin cambios ──
import { ref, computed, reactive, onMounted, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { ServiceKeys } from '@/services'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)
const authService = inject(ServiceKeys.Auth)
const catalog = inject('catalog')
const router = useRouter()

const PERIODS_CONFIG = {
  ENE: [{value:'S1',label:'S1 (01-04 Ene)'},{value:'S2',label:'S2 (05-11 Ene)'},{value:'S3',label:'S3 (12-18 Ene)'},{value:'S4',label:'S4 (19-25 Ene)'},{value:'S5',label:'S5 (26-31 Ene)'}],
  FEB: [{value:'S5',label:'S5 (01 Feb)'},{value:'S6',label:'S6 (02-08 Feb)'},{value:'S7',label:'S7 (09-15 Feb)'},{value:'S8',label:'S8 (16-22 Feb)'},{value:'S9',label:'S9 (23-28 Feb)'}],
  MAR: [{value:'S9',label:'S9 (01 Mar)'},{value:'S10',label:'S10 (02-08 Mar)'},{value:'S11',label:'S11 (09-15 Mar)'},{value:'S12',label:'S12 (16-22 Mar)'},{value:'S13',label:'S13 (23-29 Mar)'},{value:'S14',label:'S14 (30-31 Mar)'}]
}

const isDashboard = ref(false)
const loading = ref(false)
const selectedAdvisorCode = ref('ALL')
const tableData = ref([])
const filters = reactive({ 
  year: 2026, 
  month: 'ENE', 
  period: 'ALL',
  modality: 'NO_ONLINE'   // <-- NUEVO, default no-online
})
const usersMap = ref([])

const currentPeriodOptions = computed(() => PERIODS_CONFIG[filters.month] || [])
watch(() => filters.month, () => { filters.period = 'ALL'; fetchData() })

onMounted(async () => {
  try {
    const users = await authService.userList({})
    usersMap.value = users
  } catch(e) { console.error('Error users', e) }
  fetchData()
})
const activePeriodRange = reactive({ start: null, end: null })
const encodeFilter = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return undefined
  return JSON.stringify(arr.map(i => ({ value: i.value ?? i.id, label: i.label ?? i.description })))
}
async function fetchData() {
  loading.value = true
  activePeriodRange.start = null
  activePeriodRange.end = null
  try {
    const payload = { 
    year: filters.year, 
    month: filters.month, 
    period: filters.period === 'ALL' ? null : filters.period,
    modality: filters.modality   // <-- NUEVO
    }
    const rawResponse = await dashboardService.dashboardList(payload)
    const items = rawResponse.items || []
   if (items.length > 0 && filters.period !== 'ALL') {
      // El backend devuelve: "2026-01-26T05:00:00.000Z"
      // Cortamos el string en la "T" para obtener "2026-01-26"
      
      const rawStart = items[0].fecha_inicio
      const rawEnd = items[0].fecha_fin

      // Validación segura para extraer YYYY-MM-DD
      if (rawStart) {
        activePeriodRange.start = String(rawStart).split('T')[0]
      }
      if (rawEnd) {
        activePeriodRange.end = String(rawEnd).split('T')[0]
      }
      
      // Console log para verificar que se guardó bien (puedes borrarlo luego)
      console.log("Rango detectado:", activePeriodRange)
    }

    const grouped = {}

    items.forEach(item => {
      if (!grouped[item.cod_asesor]) {
        grouped[item.cod_asesor] = {
          asesor: item.asesor, cod: item.cod_asesor,
          obj: 0, ven: 0, falta: 0, obj_monto: 0, ven_monto: 0, contactos: 0,
          activos: 0, 
          acum_ventas_cohorte: 0,
          daily: []
        }
      }
      const g = grouped[item.cod_asesor]
      g.obj += Number(item.objetivo)
      g.ven += Number(item.logrado)
      g.obj_monto += Number(item.meta_monto)
      g.ven_monto += Number(item.logrado_monto)
      g.contactos += Number(item.consultas)
      const ventasCohorte = Math.round((Number(item.consultas) * Number(item.conversion)) / 100)
        g.activos += Number(item.leads_activos || 0)
      g.acum_ventas_cohorte += Number(item.venta_cohorte || 0)
        if (filters.period !== 'ALL' && item.desglose_diario && Array.isArray(item.desglose_diario)) {
        item.desglose_diario.forEach(dia => {
          g.daily.push({
            name: `${dia.dia_nombre} ${dia.dia_num}`,
            date: dia.fecha,
            con: Number(dia.leads),
            ven: Number(dia.ventas_op),
            ven_coh: Number(dia.ventas_coh),
            ratio_dia: dia.leads > 0 ? Math.round((dia.ventas_op / dia.leads) * 100) : 0,
            conv_dia: dia.leads > 0 ? Math.round((dia.ventas_coh / dia.leads) * 100) : 0
          })
        })
      } else {
        // --- AQUÍ ESTABA EL ERROR: Faltaba calcular ratio_dia ---
        g.daily.push({
          name: item.week, date: '',
          con: Number(item.consultas),
          ven: Number(item.logrado),
          ven_coh: ventasCohorte,
          ratio_dia: Number(item.consultas) > 0 ? Math.round((Number(item.logrado) / Number(item.consultas)) * 100) : 0, // <-- LÍNEA NUEVA
          conv_dia: item.conversion
        })
      }
    })

    tableData.value = Object.values(grouped).map(adv => {
      adv.falta = Math.max(0, adv.obj - adv.ven)
      
      // Cálculos de porcentajes finales para la tabla
      adv.ratio = adv.contactos > 0 ? Math.round((adv.ven / adv.contactos) * 100) : 0
      adv.conv = adv.contactos > 0 ? Math.round((adv.acum_ventas_cohorte / adv.contactos) * 100) : 0
      
      // NUEVO: % Gestión
      adv.pct_gestion = adv.contactos > 0 ? Math.round((adv.activos / adv.contactos) * 100) : 0

      adv.daily.sort((a, b) => {
        if(a.date && b.date) return a.date.localeCompare(b.date)
        return a.name.localeCompare(b.name)
      })
      return adv
    })
  } catch (error) {
    console.error("Error:", error); tableData.value = []
  } finally { loading.value = false }
}

const DEAD_STATUS_ALIASES = [
  'we_lead_status_desestimado',
  'we_lead_status_indiferente',
  'we_lead_status_closed',     // Cerrado
  'we_lead_status_anullment',    // Anulado  ← ajusta el alias exacto si difiere
]

/**
 * Devuelve los IDs de TODOS los estados del pipeline
 * excepto los 4 "muertos". Se usa en drill-downs de leads generales.
 */
function getActiveStatusIds() {
  return catalog
    .options('we_lead_status')
    .filter(s => !DEAD_STATUS_ALIASES.includes(s.alias))
    .map(s => s.id)
    .filter(Boolean)
    .join(',')
}


function drillDown(params = {}) {
  const { date, type, advisor } = params;
  const query = {};

  // ── 1. Determinar Fechas Base ──────────────────────────────────────
  let dStart = null;
  let dEnd = null;

  // Helpers
  const monthIndex = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].indexOf(filters.month);
  const y = filters.year;
  const monthNumStr = String(monthIndex + 1).padStart(2, '0');
  const toSql = (d) => d.toISOString().split('T')[0];

  // LOGICA PRINCIPAL DE FECHAS
  if (date && String(date).includes('-')) {
    // CASO A: Es un día específico (ej. "2026-01-15T...")
    dStart = String(date).split('T')[0];
    dEnd = String(date).split('T')[0];

  } else if (date && String(date).startsWith('S')) {
    // CASO B: Hicieron clic en una tarjeta de SEMANA en la vista ALL (ej. date = "S2")
    const periodData = PERIODS_CONFIG[filters.month]?.find(p => p.value === date);
    
    if (periodData) {
      const matches = periodData.label.match(/\((\d{2})(?:-(\d{2}))?/);
      if (matches) {
        const startDay = parseInt(matches[1], 10);
        const endDay = matches[2] ? parseInt(matches[2], 10) : startDay;
        
        dStart = `${y}-${monthNumStr}-${String(startDay).padStart(2, '0')}`;
        dEnd = `${y}-${monthNumStr}-${String(endDay).padStart(2, '0')}`;
      } else {
        // Fallback si falla el regex
        dStart = toSql(new Date(y, monthIndex, 1));
        dEnd = toSql(new Date(y, monthIndex + 1, 0));
      }
    }

  } else if (filters.period !== 'ALL') {
    // CASO C: Hay una semana seleccionada en el filtro superior, pero hicieron clic
    // en un botón general (como los totales de la tabla o embudo)
    const periodData = PERIODS_CONFIG[filters.month]?.find(p => p.value === filters.period);
    
    if (periodData) {
      const matches = periodData.label.match(/\((\d{2})(?:-(\d{2}))?/);
      if (matches) {
        const startDay = parseInt(matches[1], 10);
        const endDay = matches[2] ? parseInt(matches[2], 10) : startDay;
        
        dStart = `${y}-${monthNumStr}-${String(startDay).padStart(2, '0')}`;
        dEnd = `${y}-${monthNumStr}-${String(endDay).padStart(2, '0')}`;
      } else {
         dStart = activePeriodRange.start;
         dEnd = activePeriodRange.end;
      }
    } else {
      dStart = activePeriodRange.start;
      dEnd = activePeriodRange.end;
    }

  } else {
    // CASO D: Mes Completo (clic en tabla o embudo estando en vista ALL)
    dStart = toSql(new Date(y, monthIndex, 1));
    dEnd = toSql(new Date(y, monthIndex + 1, 0));
  }


  // ── 2. Aplicar Fechas según el Tipo de métrica ────────────────────
  if (type === 'sales') {
    query.pay_date_from = dStart;
    query.pay_date_to = dEnd;
  } else if (['leads', 'active_leads', 'cohort_sales'].includes(type)) {
    query.from_date = dStart;
    query.to_date = dEnd;
  }

  // ── 3. Filtro de Asesor ─────────────────────────────────────
  const targetAdvisor = (advisor && advisor !== 'ALL') ? advisor : (selectedAdvisorCode.value !== 'ALL' ? selectedAdvisorCode.value : null)
  if (targetAdvisor) {
    const advisorRow = tableData.value.find(r => r.cod == targetAdvisor)
    if (advisorRow) {
      query.owner_user_ids = encodeFilter([{ value: advisorRow.cod, label: advisorRow.asesor }])
    } else {
      const found = usersMap.value.find(u => u.user_id == targetAdvisor)
      if (found) {
        query.owner_user_ids = encodeFilter([{ value: found.user_id, label: found.first_name }])
      }
    }
  }

  // ── 4. Filtro de Estado ───────────────────────────────────────────
  const salesAliases = ['we_lead_status_bought', 'we_lead_status_insc', 'we_lead_status_matriculado']

  if (type === 'sales' || type === 'cohort_sales') {
    const salesItems = salesAliases
      .map(alias => catalog.options('we_lead_status').find(s => s.alias === alias))
      .filter(Boolean)
      .map(s => ({ value: s.id, label: s.description }))
    if (salesItems.length) query.status_lead_ids = encodeFilter(salesItems)

  } else if (type === 'leads' || type === 'active_leads') {
    const activeItems = catalog.options('we_lead_status')
      .filter(s => !DEAD_STATUS_ALIASES.includes(s.alias))
      .map(s => ({ value: s.id, label: s.description }))
    if (activeItems.length) query.status_lead_ids = encodeFilter(activeItems)

    if (type === 'active_leads') {
       const pendingFollow = catalog.options('we_follow_lead').find(s => s.alias === 'we_follow_lead_pending')
       if (pendingFollow) {
         query.last_follow_ids = encodeFilter([{ value: pendingFollow.id, label: pendingFollow.description }])
       }
    }
  }

  // ── 5. Filtro de Modalidad ────────────────────────────────────────
  const ONLINE_ALIAS = 'we_modality_online'
  if (filters.modality === 'NO_ONLINE') {
    const noOnlineItems = catalog.options('we_modality')
      .filter(m => m.alias !== ONLINE_ALIAS)
      .map(m => ({ value: m.id, label: m.description }))
    if (noOnlineItems.length) query.model_modality_ids = encodeFilter(noOnlineItems)
  } else if (filters.modality === 'ONLINE') {
    const onlineItem = catalog.options('we_modality').find(m => m.alias === ONLINE_ALIAS)
    if (onlineItem) query.model_modality_ids = encodeFilter([{ value: onlineItem.id, label: onlineItem.description }])
  }

  // ── 6. Redirección ───────────────────────────────────────────
  console.log(`Filtro Drilldown - Tipo: ${type}, Inicio: ${dStart}, Fin: ${dEnd}`);
  const routeData = router.resolve({ path: '/comercial/leads', query })
  window.open(routeData.href, '_blank')
}
const totals = computed(() => {
  const t = tableData.value.reduce((acc, row) => {
    acc.obj += row.obj
    acc.ven += row.ven
    acc.contactos += row.contactos
    acc.obj_monto += row.obj_monto
    acc.ven_monto += row.ven_monto
    
    // Sumamos los valores absolutos
    acc.activos += row.activos 
    acc.acum_ventas_cohorte_total += row.acum_ventas_cohorte
    
    return acc
  }, { 
    obj: 0, ven: 0, contactos: 0, obj_monto: 0, ven_monto: 0, 
    activos: 0, acum_ventas_cohorte_total: 0 
  })

  t.falta = Math.max(0, t.obj - t.ven)
  t.ticketProm = t.ven > 0 ? t.ven_monto / t.ven : 0
  t.pctMetaMonto = t.obj_monto > 0 ? Math.round((t.ven_monto / t.obj_monto) * 100) : 0
  
  // Ratios generales
  t.avgRatio = t.contactos > 0 ? Math.round((t.ven / t.contactos) * 100) : 0
  t.avgConv = t.contactos > 0 ? Math.round((t.acum_ventas_cohorte_total / t.contactos) * 100) : 0
  
  // NUEVO: Promedio de gestión global
  t.avgGestion = t.contactos > 0 ? Math.round((t.activos / t.contactos) * 100) : 0
  
  return t
})

const currentDailyStats = computed(() => {
  if (tableData.value.length === 0) return []
  if (selectedAdvisorCode.value !== 'ALL') {
    const advisor = tableData.value.find(a => a.cod === selectedAdvisorCode.value)
    if(advisor && advisor.daily) {
      return advisor.daily.map(d => ({ ...d, ratio: d.ratio_dia || 0, conv: d.conv_dia || 0 }))
    }
    return []
  }
  const periodsMap = {}
  tableData.value.forEach(adv => {
    adv.daily.forEach(d => {
      const key = d.date || d.name
      if(!periodsMap[key]) {
        periodsMap[key] = { name: d.name, date: d.date, con: 0, ven: 0, ven_coh: 0 }
      }
      periodsMap[key].con += d.con
      periodsMap[key].ven += d.ven
      periodsMap[key].ven_coh += (d.ven_coh || 0)
    })
  })
  return Object.values(periodsMap)
    .sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date)
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })
    .map(p => ({
      ...p,
      ratio_dia: p.con > 0 ? Math.round((p.ven / p.con) * 100) : 0,
      conv_dia: p.con > 0 ? Math.round((p.ven_coh / p.con) * 100) : 0,
      ratio: p.con > 0 ? Math.round((p.ven / p.con) * 100) : 0,
      conv: p.con > 0 ? Math.round((p.ven_coh / p.con) * 100) : 0
    }))
})

const toggleView = () => isDashboard.value = !isDashboard.value
const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(val)
const getConvClass = (val) => val > 20 ? 'text-success fw-bold' : (val >= 10 ? 'text-primary fw-bold' : 'text-muted')

// Status como badge Bootstrap en lugar de círculo de color
const getStatusBadge = (RATIO) => {
  // Cambiamos 0.9 (90%) por 0.15 (15%)
  if (RATIO >= 15) return 'bg-success-subtle text-success border border-success-subtle'
  return 'bg-danger-subtle text-danger border border-danger-subtle'
}

const getStatusLabel = (RATIO) => {
  // Cambiamos 0.9 (90%) por 0.15 (15%)
  if (RATIO >= 15) return '✓ OK'
  return '✗ Bajo'
}

const trendChartData = computed(() => {
  if (!currentDailyStats.value || currentDailyStats.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const labels = currentDailyStats.value.map(d => d.name);
  const ventasDiarias = currentDailyStats.value.map(d => Number(d.ven) || 0);
  const consultasDiarias = currentDailyStats.value.map(d => Number(d.con) || 0);
  
  // Calcula el acumulado sumando el día anterior
  const cumulative = ventasDiarias.reduce((acc, curr, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + curr);
    return acc;
  }, []);

  return {
    labels,
    datasets: [
      {
        type: 'line',
        label: 'Ventas Acumuladas',
        data: cumulative,
        borderColor: '#0f172a',
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        order: 1 // Dibuja la línea por encima de las barras
      },
      {
        type: 'bar',
        label: 'Consultas (Leads)',
        data: consultasDiarias,
        backgroundColor: '#e2e8f0', // Gris clarito para no robar atención
        borderRadius: 4,
        order: 3
      },
      {
        type: 'bar',
        label: 'Ventas Periodo',
        data: ventasDiarias,
        backgroundColor: '#3b82f6', // Azul primario
        borderRadius: 4,
        order: 2
      }
    ]
  };
});
const revenueChartData = computed(() => {
  const active = tableData.value.filter(d => {
    // Si elegimos un asesor, solo mostramos a ese
    if (selectedAdvisorCode.value !== 'ALL') return d.cod === selectedAdvisorCode.value;
    // Si es todo el equipo, mostramos a los que tengan meta o venta (evita asesores inactivos)
    return d.obj_monto > 0 || d.ven_monto > 0 || d.obj > 0;
  });

  return {
    labels: active.map(d => d.asesor),
    datasets: [
      {
        label: 'Meta S/.',
        data: active.map(d => Number(d.obj_monto) || 0),
        backgroundColor: '#e2e8f0',
        borderRadius: 4
      },
      {
        label: 'Real S/.',
        data: active.map(d => Number(d.ven_monto) || 0),
        backgroundColor: '#10b981',
        borderRadius: 4
      }
    ]
  };
});

const shareChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] };

  // La dona solo tiene sentido si vemos a todo el equipo comparándose entre sí
  // Filtramos solo a los que tienen al menos 1 venta operativa
  const top = tableData.value.filter(d => Number(d.ven) > 0);

  // Si seleccionamos a un solo asesor, no tiene sentido ver una dona del 100% de él mismo, 
  // pero lo dejamos para que no desaparezca el gráfico.
  const filteredTop = selectedAdvisorCode.value !== 'ALL' 
    ? top.filter(d => d.cod === selectedAdvisorCode.value) 
    : top;

  return {
    labels: filteredTop.map(d => d.asesor),
    datasets: [{
      data: filteredTop.map(d => Number(d.ven)),
      // Agregué más colores por si tienes muchos asesores
      backgroundColor: ['#0f172a','#334155','#64748b','#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9', '#2563eb', '#3b82f6', '#60a5fa'],
      borderWidth: 1,
      borderColor: '#ffffff' // Borde blanco para separar las tajadas
    }]
  };
}); 
const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
const groupedBarOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } }, plugins: { legend: { display: true, position: 'bottom' } } }
const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } }
</script>

<style scoped>
/* ── Reutiliza los mismos tokens visuales de Control Comercial ── */
.kpi-card { transition: transform 0.2s, box-shadow 0.2s; }
.kpi-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1) !important; }
.widget-card { border-radius: 0.5rem; overflow: hidden; }
.row-hover:hover { background-color: #f1f5f9; }
.cursor-pointer { cursor: pointer; }
.pointer-badge { cursor: pointer; }
.pointer-badge:hover { color: #2563eb !important; }
.ls-1 { letter-spacing: 0.05em; }
.x-small { font-size: 0.7rem; }
.sticky-top { position: sticky; top: 0; z-index: 5; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.fade-in { animation: fadeIn 0.5s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* KPIs inline en la barra de filtros */
.kpi-inline { min-width: 80px; }

/* Columnas de tabla con color agrupado */
.group-header-blue { background: #eff6ff; color: #1e40af; }
.group-header-green { background: #ecfdf5; color: #047857; }
.group-header-gray { background: #f8fafc; color: #475569; }
.group-header-dark { background: #f1f5f9; color: #0f172a; }
.sub-blue { background: #eff6ff; color: #1d4ed8; }
.sub-green { background: #ecfdf5; color: #059669; }
.sub-gray { background: #f8fafc; color: #64748b; }
.sub-dark { background: #f1f5f9; color: #334155; }
.bg-blue-subtle { background-color: #eff6ff !important; }
.cell-actionable { text-decoration: underline dotted; }
.cell-actionable:hover { background-color: #dbeafe !important; color: #1e40af; }

/* Micro-gestión: grid de días */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.6rem;
}
.day-card { transition: transform 0.15s, box-shadow 0.15s; }
.day-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.08) !important; }

/* Funnel en vista gráficos */
.funnel-step .progress { transition: width 0.8s ease; }

@media (max-width: 1024px) {
  .days-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 640px) {
  .days-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>