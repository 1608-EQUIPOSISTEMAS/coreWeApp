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

      <!-- Barra de Filtros (mismo contenedor que Control Comercial) -->
      <div class="filter-bar bg-light rounded-3 p-3 border">
        <div class="row g-3 align-items-end">

          <!-- Año -->
          <div class="col-md-2">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-regular fa-calendar me-1"></i> Año
            </label>
            <select class="form-select bg-white" v-model="filters.year" @change="fetchData">
              <option :value="2026">2026</option>
              <option :value="2025">2025</option>
            </select>
          </div>

          <!-- Mes -->
          <div class="col-md-2">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-solid fa-calendar-days me-1"></i> Mes
            </label>
            <select class="form-select bg-white" v-model="filters.month" @change="fetchData">
              <option value="ENE">Enero</option>
              <option value="FEB">Febrero</option>
              <option value="MAR">Marzo</option>
              <option value="ABR">Abril</option>
              <option value="MAY">Mayo</option>
              <option value="JUN">Junio</option>
              <option value="JUL">Julio</option>
              <option value="AGO">Agosto</option>
              <option value="SEP">Septiembre</option>
              <option value="OCT">Octubre</option>
              <option value="NOV">Noviembre</option>
              <option value="DIC">Diciembre</option>
            </select>
          </div>

          <!-- Periodo -->
          <div class="col-md-4">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-solid fa-clock-rotate-left me-1"></i> Periodo (Vista)
            </label>
            <select class="form-select bg-white" v-model="filters.period" @change="fetchData">
              <option value="ALL">Acumulado Mensual (MTD)</option>
              <option
                v-for="opt in currentPeriodOptions"
                :key="opt.value"
                :value="opt.value"
              >{{ opt.label }}</option>
            </select>
          </div>

          <!-- Mini KPIs integrados en la barra de filtros -->
          <div class="col-md-4">
            <div class="d-flex gap-3 justify-content-end h-100 align-items-end">
              <div
                class="kpi-inline text-end cursor-pointer"
                @click="drillDown({ type: 'sales' })"
                title="Ver todas las ventas del mes"
              >
                <div class="x-small fw-bold text-uppercase text-secondary ls-1">Venta Total</div>
                <div class="fw-bold text-primary fs-6">{{ formatCurrency(totals.ven_monto) }}</div>
              </div>
              <div class="kpi-inline text-end">
                <div class="x-small fw-bold text-uppercase text-secondary ls-1">Ticket Prom.</div>
                <div class="fw-bold text-dark fs-6">{{ formatCurrency(totals.ticketProm) }}</div>
              </div>
              <div class="kpi-inline text-end">
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
            <div class="card-header bg-white fw-bold text-dark border-bottom py-3 d-flex align-items-center">
              <span class="bg-primary-subtle text-primary p-1 rounded me-2">
                <i class="fa-solid fa-user-tie"></i>
              </span>
              Rendimiento por Asesor — Objetivos y Financiero
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0 small align-middle">
                  <thead class="table-light sticky-top">
                    <tr>
                      <th class="ps-3 py-2 border-0" rowspan="2" style="vertical-align:middle">ASESOR</th>
                      <th colspan="3" class="text-center py-2 border-0 border-start group-header-blue">OBJETIVOS (VACANTES)</th>
                      <th colspan="3" class="text-center py-2 border-0 border-start group-header-green">FINANCIERO (S/.)</th>
                      <th colspan="3" class="text-center py-2 border-0 border-start group-header-gray">GESTIÓN</th>
                      <th colspan="3" class="text-center py-2 border-0 border-start group-header-dark">EFICIENCIA</th>
                    </tr>
                    <tr class="table-light">
                      <th class="text-center py-2 border-0 border-start sub-blue">META #</th>
                      <th class="text-center py-2 border-0 sub-blue">REAL #</th>
                      <th class="text-center py-2 border-0 sub-blue">GAP</th>
                      <th class="text-center py-2 border-0 border-start sub-green">META S/.</th>
                      <th class="text-center py-2 border-0 sub-green">VENTA S/.</th>
                      <th class="text-center py-2 border-0 sub-green">TICKET</th>
                      <th class="text-center py-2 border-0 border-start sub-gray">LEADS</th>
                      <th class="text-center py-2 border-0 sub-gray">ACTIVOS</th>
                      <th class="text-center py-2 border-0 sub-gray">% GEST</th>
                      <th class="text-center py-2 border-0 border-start sub-dark" title="Ventas Operativas / Leads">RATIO</th>
                      <th class="text-center py-2 border-0 sub-dark" title="Ventas Cohorte / Leads">% CONV</th>
                      <th class="text-center pe-3 py-2 border-0 sub-dark">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="tableData.length === 0">
                      <td colspan="13" class="text-center py-4 text-muted">No hay datos para este periodo</td>
                    </tr>
                    <tr v-for="(row, index) in tableData" :key="index" class="cursor-pointer row-hover">
                      <td class="ps-3 py-2 border-0 fw-bold text-dark">{{ row.asesor }}</td>

                      <td class="text-center py-2 border-0 border-start bg-blue-subtle">{{ row.obj }}</td>
                      <td class="text-center py-2 border-0 bg-blue-subtle fw-bold cursor-pointer cell-actionable"
                          @click.stop="drillDown({ advisor: row.cod, type: 'sales' })"
                          title="Ver ventas">{{ row.ven }}</td>
                      <td class="text-center py-2 border-0 bg-blue-subtle">
                        <span :class="row.falta > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'">
                          {{ row.falta > 0 ? '-' + row.falta : '✓' }}
                        </span>
                      </td>

                      <td class="text-end py-2 border-0 border-start bg-success-subtle text-muted x-small">{{ formatCurrency(row.obj_monto) }}</td>
                      <td class="text-end py-2 border-0 bg-success-subtle fw-bold text-dark">{{ formatCurrency(row.ven_monto) }}</td>
                      <td class="text-end py-2 border-0 bg-success-subtle x-small">{{ formatCurrency(row.ven_monto / (row.ven || 1)) }}</td>

                      <td class="text-center py-2 border-0 border-start cell-actionable"
                          @click.stop="drillDown({ advisor: row.cod, type: 'leads' })"
                          title="Ver leads asignados">{{ row.contactos }}</td>
                      <td class="text-center py-2 border-0 text-muted">{{ Math.round(row.contactos * 0.85) }}</td>
                      <td class="text-center py-2 border-0 x-small">100%</td>

                      <td class="text-center py-2 border-0 border-start fw-bold text-primary">{{ row.ratio }}%</td>
                      <td class="text-center py-2 border-0 fw-bold">
                        <span :class="getConvClass(row.conv)">{{ row.conv }}%</span>
                      </td>
                      <td class="text-center pe-3 py-2 border-0">
                        <span class="badge rounded-pill"
                              :class="getStatusBadge(row.ven, row.obj)">
                          {{ getStatusLabel(row.ven, row.obj) }}
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
                      <td class="text-end py-2 text-success">{{ formatCurrency(totals.ven_monto) }}</td>
                      <td class="text-end py-2">{{ formatCurrency(totals.ticketProm) }}</td>
                      <td class="text-center py-2 cursor-pointer text-decoration-underline" @click="drillDown({ type: 'leads' })">{{ totals.contactos }}</td>
                      <td class="text-center py-2 text-muted">—</td>
                      <td class="text-center py-2 text-muted">—</td>
                      <td class="text-center py-2 text-primary">{{ totals.avgRatio }}%</td>
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
                        @click="drillDown({ date: day.date, type: 'leads', advisor: selectedAdvisorCode })"
                      >{{ day.con }}</span>
                    </div>
                    <!-- Cierres -->
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="x-small fw-bold text-uppercase text-primary">Cierres</span>
                      <div class="text-end">
                        <span
                          class="fw-bold text-primary d-block pointer-badge"
                          @click="drillDown({ date: day.date, type: 'sales', advisor: selectedAdvisorCode })"
                        >{{ day.ven }}</span>
                        <span class="x-small text-muted">{{ day.ratio_dia }}%</span>
                      </div>
                    </div>
                    <!-- Conversión -->
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="x-small fw-bold text-uppercase text-success">Conv.</span>
                      <div class="text-end">
                        <span class="fw-bold text-success d-block">{{ day.ven_coh }}</span>
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
                  <div class="funnel-step">
                    <div class="d-flex justify-content-between mb-1">
                      <span class="x-small fw-bold text-uppercase text-secondary">Contactados</span>
                      <span class="fw-bold text-dark">{{ Math.round(totals.contactos * 0.85) }}</span>
                    </div>
                    <div class="progress" style="height: 20px; border-radius: 6px;">
                      <div class="progress-bar bg-primary" style="width: 85%"></div>
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
const filters = reactive({ year: 2026, month: 'ENE', period: 'ALL' })
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

async function fetchData() {
  loading.value = true
  activePeriodRange.start = null
  activePeriodRange.end = null
  try {
    const payload = { year: filters.year, month: filters.month, period: filters.period === 'ALL' ? null : filters.period }
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
      g.acum_ventas_cohorte += ventasCohorte

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
        g.daily.push({
          name: item.week, date: '',
          con: Number(item.consultas),
          ven: Number(item.logrado),
          ven_coh: ventasCohorte,
          conv_dia: item.conversion
        })
      }
    })

    tableData.value = Object.values(grouped).map(adv => {
      adv.falta = Math.max(0, adv.obj - adv.ven)
      adv.ratio = adv.contactos > 0 ? Math.round((adv.ven / adv.contactos) * 100) : 0
      adv.conv = adv.contactos > 0 ? Math.round((adv.acum_ventas_cohorte / adv.contactos) * 100) : 0
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
  'we_lead_status_anulado',    // Anulado  ← ajusta el alias exacto si difiere
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
  const { date, type, advisor } = params
  const query = {}

  // ── 1. Rango de fechas ──────────────────────────────────────
  if (date) {
    // Clic en celda de día específico
    // NOTA: Si 'date' también viene del backend con hora, aplícale .split('T')[0] aquí también por seguridad
    query.pay_date_from = String(date).split('T')[0]
    query.pay_date_to   = String(date).split('T')[0]
  }
  // 2. FILTRO POR PERIODO (S1, S2...)
  else if (filters.period !== 'ALL' && activePeriodRange.start && activePeriodRange.end) {
      // Ahora enviamos "2026-01-26" limpio
      query.pay_date_from = activePeriodRange.start
      query.pay_date_to   = activePeriodRange.end
  } 
  // 3. FILTRO MENSUAL (ALL)
  else {
    const monthIndex = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
      .indexOf(filters.month)
    const y = filters.year
    // Aquí calculamos inicio y fin de mes manualmente
    const toSql = (d) => d.toISOString().split('T')[0]
    query.pay_date_from = toSql(new Date(y, monthIndex, 1))
    query.pay_date_to   = toSql(new Date(y, monthIndex + 1, 0))
  }

  // ── 2. Filtro de Asesor ─────────────────────────────────────
  const targetAdvisor =
    (advisor && advisor !== 'ALL') ? advisor
    : (selectedAdvisorCode.value !== 'ALL' ? selectedAdvisorCode.value : null)

  if (targetAdvisor) {
    if (!isNaN(targetAdvisor)) {
      query.owner_user_ids = targetAdvisor
    } else {
      const found = usersMap.value.find(
        u => u.username === targetAdvisor || u.first_name === targetAdvisor
      )
      if (found) query.owner_user_ids = found.user_id
    }
  }

  // ── 3. Filtro de Estado según tipo ──────────────────────────
  if (type === 'sales') {
    // Ventas: solo estados de cierre
    const salesAliases = [
      'we_lead_status_bought',
      'we_lead_status_insc',
      'we_lead_status_matriculado',
    ]
    const ids = salesAliases
      .map(alias => catalog.options('we_lead_status').find(s => s.alias === alias)?.id)
      .filter(Boolean)
      .join(',')
    if (ids) query.status_lead_ids = ids

  } else {
    // Leads generales (type === 'leads', o cualquier otro):
    // excluir los 4 estados muertos → mostramos sólo los activos
    const activeIds = getActiveStatusIds()
    if (activeIds) query.status_lead_ids = activeIds
  }

  // ── 4. Redirección ──────────────────────────────────────────
  const routeData = router.resolve({ path: '/comercial/leads', query })
  window.open(routeData.href, '_blank')
}






const totals = computed(() => {
  const t = tableData.value.reduce((acc, row) => {
    acc.obj += row.obj; acc.ven += row.ven; acc.contactos += row.contactos
    acc.obj_monto += row.obj_monto; acc.ven_monto += row.ven_monto
    acc.acum_ventas_cohorte_total += (row.acum_ventas_cohorte || 0)
    return acc
  }, { obj: 0, ven: 0, contactos: 0, obj_monto: 0, ven_monto: 0, acum_ventas_cohorte_total: 0 })
  t.falta = Math.max(0, t.obj - t.ven)
  t.ticketProm = t.ven > 0 ? t.ven_monto / t.ven : 0
  t.pctMetaMonto = t.obj_monto > 0 ? Math.round((t.ven_monto / t.obj_monto) * 100) : 0
  t.avgRatio = t.contactos > 0 ? Math.round((t.ven / t.contactos) * 100) : 0
  t.avgConv = t.contactos > 0 ? Math.round((t.acum_ventas_cohorte_total / t.contactos) * 100) : 0
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
const getStatusBadge = (ven, obj) => {
  const pct = obj > 0 ? ven / obj : 0
  if (pct >= 0.9) return 'bg-success-subtle text-success border border-success-subtle'
  if (pct >= 0.5) return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
  return 'bg-danger-subtle text-danger border border-danger-subtle'
}
const getStatusLabel = (ven, obj) => {
  const pct = obj > 0 ? ven / obj : 0
  if (pct >= 0.9) return '✓ OK'
  if (pct >= 0.5) return '~ Par'
  return '✗ Bajo'
}

const trendChartData = computed(() => {
  const labels = currentDailyStats.value.map(d => d.name)
  const values = currentDailyStats.value.map(d => d.ven)
  const cumulative = values.reduce((acc, curr, i) => [...acc, curr + (acc[i-1] || 0)], [])
  return { labels, datasets: [{ label: 'Ventas Acumuladas', data: cumulative, borderColor: '#0f172a', backgroundColor: 'rgba(15, 23, 42, 0.1)', fill: true, tension: 0.4 }] }
})
const revenueChartData = computed(() => {
  const active = tableData.value.filter(d => d.obj > 0)
  return { labels: active.map(d => d.asesor), datasets: [{ label: 'Meta S/.', data: active.map(d => d.obj_monto), backgroundColor: '#e2e8f0', borderRadius: 4 }, { label: 'Real S/.', data: active.map(d => d.ven_monto), backgroundColor: '#10b981', borderRadius: 4 }] }
})
const shareChartData = computed(() => {
  const top = tableData.value.filter(d => d.ven > 0)
  return { labels: top.map(d => d.asesor), datasets: [{ data: top.map(d => d.ven), backgroundColor: ['#0f172a','#334155','#64748b','#94a3b8'], borderWidth: 0 }] }
})
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