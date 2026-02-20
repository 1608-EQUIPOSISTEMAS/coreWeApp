<template>
  <div class="exec-shell">

    <!-- ══════════════ MASTHEAD ══════════════ -->
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Desempeño Comercial · Equipo de Ventas</span>
            <h1 class="brand-title">Tablero de Asesor y Objetivos</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button @click="toggleView" class="btn-exec btn-exec-ghost">
            <svg v-if="!isDashboard" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8"/><rect x="14" y="2" width="8" height="8"/><rect x="2" y="14" width="8" height="8"/><rect x="14" y="14" width="8" height="8"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            {{ isDashboard ? 'Vista Tabular' : 'Vista Gráfica' }}
          </button>
          <button class="btn-exec btn-exec-primary" @click="fetchData" :disabled="loading">
            <svg :class="{ 'spin': loading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {{ loading ? 'Actualizando…' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

      <!-- Franja de filtros -->
      <div class="masthead-filters">

        <div class="filter-group">
          <label class="filter-label">MODALIDAD</label>
          <div class="modality-toggle">
            <button class="mod-btn" :class="{ active: filters.modality === 'NO_ONLINE' }"
              @click="filters.modality = 'NO_ONLINE'; fetchData()">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              EN VIVO
            </button>
            <button class="mod-btn" :class="{ active: filters.modality === 'ONLINE' }"
              @click="filters.modality = 'ONLINE'; fetchData()">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>
              ONLINE
            </button>
          </div>
        </div>

        <div class="filter-sep"></div>

        <div class="filter-group">
          <label class="filter-label">AÑO</label>
          <select class="exec-select" v-model="filters.year" @change="fetchData">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
          </select>
        </div>

        <div class="filter-sep"></div>

        <div class="filter-group">
          <label class="filter-label">MES</label>
          <select class="exec-select" v-model="filters.month" @change="fetchData">
            <option value="ENE">Enero</option>
            <option value="FEB">Febrero</option>
            <option value="MAR">Marzo</option>
          </select>
        </div>

        <div class="filter-sep"></div>

        <div class="filter-group">
          <label class="filter-label">PERÍODO</label>
          <select class="exec-select" v-model="filters.period" @change="fetchData">
            <option value="ALL">Acumulado (MTD)</option>
            <option v-for="opt in currentPeriodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <div class="filter-spacer"></div>

        <transition name="slide-fade">
          <div class="masthead-kpis" v-if="!loading">
            <div class="inline-kpi" @click="drillDown({ type: 'sales' })" style="cursor:pointer" title="Ver ventas">
              <span class="inline-kpi-label">VENTA TOTAL</span>
              <span class="inline-kpi-value accent">{{ formatCurrency(totals.ven_monto) }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">TICKET PROM.</span>
              <span class="inline-kpi-value">{{ formatCurrency(totals.ticketProm) }}</span>
            </div>
            <div class="inline-kpi">
              <span class="inline-kpi-label">% META S/.</span>
              <span class="inline-kpi-value" :class="totals.pctMetaMonto >= 80 ? 'c-green' : totals.pctMetaMonto >= 50 ? 'c-amber' : 'c-red'">
                {{ totals.pctMetaMonto }}%
              </span>
            </div>
          </div>
        </transition>

      </div>
    </header>

    <!-- ══════════════ CUERPO ══════════════ -->
    <main class="exec-body">

      <div v-if="loading" class="exec-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Cargando métricas del equipo…</p>
      </div>

      <!-- ── VISTA TABLA ── -->
      <div v-else-if="!isDashboard" class="view-table">

        <div class="table-shell">
          <table class="exec-table">
            <thead>
              <tr class="thead-group">
                <th class="th-cat" rowspan="2">ASESOR</th>
                <th colspan="3" class="th-group th-group-a">OBJETIVOS (VACANTES)</th>
                <th colspan="3" class="th-group th-group-b">FINANCIERO (S/.)</th>
                <th colspan="3" class="th-group th-group-c">RESULTADOS</th>
                <th colspan="4" class="th-group th-group-d">LOGROS</th>
              </tr>
              <tr class="thead-sub">
                <th class="ts ts-a text-center">META #</th>
                <th class="ts ts-a text-center">REAL #</th>
                <th class="ts ts-a text-center">GAP</th>
                <th class="ts ts-b text-right">META S/.</th>
                <th class="ts ts-b text-right">VENTA S/.</th>
                <th class="ts ts-b text-right">TICKET</th>
                <th class="ts ts-c text-center">LEADS</th>
                <th class="ts ts-c text-center">ACTIVOS</th>
                <th class="ts ts-c text-center">% GEST</th>
                <th class="ts ts-d text-center">RATIO</th>
                <th class="ts ts-d text-center">CONV. #</th>
                <th class="ts ts-d text-center">% CONV</th>
                <th class="ts ts-d text-center">STATUS</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="tableData.length === 0">
                <td colspan="14" class="empty-row">No hay datos para este período</td>
              </tr>
              <tr v-for="(row, index) in tableData" :key="index" class="tbody-row" :class="{ 'row-alt': index % 2 === 0 }">
                <td class="td-asesor">{{ row.asesor }}</td>

                <td class="td-a text-center">{{ row.obj }}</td>
                <td class="td-a text-center fw-600 actionable" @click.stop="drillDown({ advisor: row.cod, type: 'sales' })">{{ row.ven }}</td>
                <td class="td-a text-center">
                  <span :class="row.falta > 0 ? 'gap-neg' : 'gap-pos'">{{ row.falta > 0 ? '−' + row.falta : '✓' }}</span>
                </td>

                <td class="td-b text-right text-muted small">{{ formatCurrency(row.obj_monto) }}</td>
                <td class="td-b text-right fw-600 actionable" @click.stop="drillDown({ advisor: row.cod, type: 'sales' })">{{ formatCurrency(row.ven_monto) }}</td>
                <td class="td-b text-right small text-muted">{{ formatCurrency(row.ven_monto / (row.ven || 1)) }}</td>

                <td class="td-c text-center actionable" @click.stop="drillDown({ advisor: row.cod, type: 'leads' })">{{ row.contactos }}</td>
                <td class="td-c text-center text-muted actionable" @click.stop="drillDown({ advisor: row.cod, type: 'active_leads' })">{{ row.activos }}</td>
                <td class="td-c text-center small">{{ row.pct_gestion }}%</td>

                <td class="td-d text-center fw-700 accent-text">{{ row.ratio }}%</td>
                <td class="td-d text-center fw-600 actionable" @click.stop="drillDown({ advisor: row.cod, type: 'cohort_sales' })">{{ row.acum_ventas_cohorte }}</td>
                <td class="td-d text-center">
                  <span :class="convClass(row.conv)">{{ row.conv }}%</span>
                </td>
                <td class="td-d text-center">
                  <span class="status-pill" :class="row.ratio >= 15 ? 'status-ok' : 'status-low'">
                    {{ row.ratio >= 15 ? 'OK' : 'BAJO' }}
                  </span>
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr class="tfoot-row">
                <td class="tfoot-label">TOTAL EQUIPO</td>
                <td class="text-center fw-600">{{ totals.obj }}</td>
                <td class="text-center fw-600 actionable accent-text" @click="drillDown({ type: 'sales' })">{{ totals.ven }}</td>
                <td class="text-center c-red fw-600">−{{ totals.falta }}</td>
                <td class="text-right fw-600 text-muted">{{ formatCurrency(totals.obj_monto) }}</td>
                <td class="text-right fw-700 accent-text actionable" @click="drillDown({ type: 'sales' })">{{ formatCurrency(totals.ven_monto) }}</td>
                <td class="text-right fw-600 text-muted">{{ formatCurrency(totals.ticketProm) }}</td>
                <td class="text-center fw-600 actionable" @click="drillDown({ type: 'leads' })">{{ totals.contactos }}</td>
                <td class="text-center text-muted actionable" @click="drillDown({ type: 'active_leads' })">{{ totals.activos }}</td>
                <td class="text-center text-muted">{{ totals.avgGestion }}%</td>
                <td class="text-center fw-700 accent-text">{{ totals.avgRatio }}%</td>
                <td class="text-center fw-600 actionable" @click="drillDown({ type: 'cohort_sales' })">{{ totals.acum_ventas_cohorte_total }}</td>
                <td class="text-center fw-600">{{ totals.avgConv }}%</td>
                <td class="text-center">
                  <span class="status-pill" :class="totals.pctMetaMonto >= 80 ? 'status-ok' : 'status-low'">{{ totals.pctMetaMonto }}% $$</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Micro-gestión -->
        <div class="micro-panel">
          <div class="micro-panel-header">
            <div class="micro-panel-title-block">
              <div class="micro-panel-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Micro-Gestión: Desglose por Período
              </div>
              <p class="micro-panel-sub">Haga clic en los números para ver el detalle de registros</p>
            </div>
            <div class="micro-filter">
              <label class="filter-label-dark">ASESOR</label>
              <select v-model="selectedAdvisorCode" class="exec-select-dark">
                <option value="ALL">Total Equipo (Consolidado)</option>
                <option v-for="adv in tableData" :key="adv.cod" :value="adv.cod">{{ adv.asesor }}</option>
              </select>
            </div>
          </div>

          <div class="days-grid">
            <div v-for="(day, i) in currentDailyStats" :key="i" class="day-card" :class="{ 'day-card-active': day.ven > 0 }">
              <div class="day-card-header" :class="day.ven > 0 ? 'dh-active' : 'dh-empty'">
                <span class="day-name">{{ day.name }}</span>
              </div>
              <div class="day-card-body">
                <div class="day-metric">
                  <span class="day-metric-label">Leads</span>
                  <span class="day-metric-val actionable" @click="drillDown({ date: day.date || day.name, type: 'leads', advisor: selectedAdvisorCode })">{{ day.con }}</span>
                </div>
                <div class="day-metric day-metric-accent">
                  <span class="day-metric-label">Ventas</span>
                  <div class="day-metric-group">
                    <span class="day-metric-val accent-text actionable" @click="drillDown({ date: day.date || day.name, type: 'sales', advisor: selectedAdvisorCode })">{{ day.ven }}</span>
                    <span class="day-metric-sub">{{ day.ratio_dia }}%</span>
                  </div>
                </div>
                <div class="day-metric">
                  <span class="day-metric-label">Conv.</span>
                  <div class="day-metric-group">
                    <span class="day-metric-val c-green actionable" @click="drillDown({ date: day.date || day.name, type: 'cohort_sales', advisor: selectedAdvisorCode })">{{ day.ven_coh }}</span>
                    <span class="day-metric-sub">{{ day.conv_dia }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── VISTA DASHBOARD ── -->
      <div v-else class="view-dashboard">

        <!-- KPI Strip -->
        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">% META UNIDADES</span>
              <div class="kpi-indicator" :class="totals.obj > 0 && (totals.ven/totals.obj) >= 0.8 ? 'ind-green' : 'ind-red'"></div>
            </div>
            <div class="kpi-card-value" :class="totals.obj > 0 && (totals.ven/totals.obj) >= 0.8 ? 'c-green' : 'c-red'">
              {{ totals.obj > 0 ? Math.round((totals.ven / totals.obj) * 100) : 0 }}%
            </div>
            <div class="kpi-progress">
              <div class="kpi-progress-fill" :class="totals.obj > 0 && (totals.ven/totals.obj) >= 0.8 ? 'fill-green' : 'fill-red'"
                :style="`width:${Math.min(100, totals.obj > 0 ? Math.round((totals.ven/totals.obj)*100) : 0)}%`"></div>
            </div>
            <div class="kpi-card-sub">{{ totals.ven }} de {{ totals.obj }} ventas realizadas</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">% META S/.</span>
              <div class="kpi-indicator" :class="totals.pctMetaMonto >= 80 ? 'ind-green' : 'ind-amber'"></div>
            </div>
            <div class="kpi-card-value" :class="totals.pctMetaMonto >= 80 ? 'c-green' : totals.pctMetaMonto >= 50 ? 'c-amber' : 'c-red'">
              {{ totals.pctMetaMonto }}%
            </div>
            <div class="kpi-progress">
              <div class="kpi-progress-fill" :class="totals.pctMetaMonto >= 80 ? 'fill-green' : 'fill-amber'"
                :style="`width:${Math.min(100, totals.pctMetaMonto)}%`"></div>
            </div>
            <div class="kpi-card-sub">{{ formatCurrency(totals.ven_monto) }} de {{ formatCurrency(totals.obj_monto) }}</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">RATIO LEADS → VENTA</span>
              <div class="kpi-indicator ind-blue"></div>
            </div>
            <div class="kpi-card-value accent-text">{{ totals.avgRatio }}%</div>
            <div class="kpi-progress">
              <div class="kpi-progress-fill fill-blue" :style="`width:${Math.min(100, totals.avgRatio * 3)}%`"></div>
            </div>
            <div class="kpi-card-sub">Eficiencia de contacto del período</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-card-header">
              <span class="kpi-card-label">LEADS ACTIVOS</span>
              <div class="kpi-indicator ind-amber"></div>
            </div>
            <div class="kpi-card-value" style="color:#b45309;">{{ totals.activos }}</div>
            <div class="kpi-progress">
              <div class="kpi-progress-fill fill-amber" :style="`width:${Math.min(100, totals.avgGestion)}%`"></div>
            </div>
            <div class="kpi-card-sub">{{ totals.avgGestion }}% gestionados del total</div>
          </div>
        </div>

        <!-- Evolución + Proyección (full width) -->
        <div class="chart-panel">
          <div class="chart-panel-header">
            <div>
              <div class="chart-panel-title">Evolución de Ventas vs Proyección de Meta</div>
              <div class="chart-panel-sub">Acumulado real vs ritmo ideal para cumplir la meta del período</div>
            </div>
            <div class="chart-legend-inline">
              <span class="legend-line" style="background:#0f172a;"></span><span>Acumulado Real</span>
              <span class="legend-dashed"></span><span>Meta Proyectada</span>
              <span class="legend-dot-sq" style="background:rgba(59,130,246,0.75)"></span><span>Ventas</span>
              <span class="legend-dot-sq" style="background:#e2e8f0"></span><span>Leads</span>
            </div>
          </div>
          <div class="chart-area chart-area-lg">
            <Line :data="trendChartData" :options="lineOptions" />
          </div>
        </div>

        <!-- Fila 2 -->
        <div class="chart-grid-2">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Ranking — % Cumplimiento de Meta</div>
                <div class="chart-panel-sub">Ventas reales vs objetivo por asesor</div>
              </div>
            </div>
            <div class="chart-area"><Bar :data="rankingChartData" :options="rankingBarOptions" /></div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Ratio vs Conversión por Asesor</div>
                <div class="chart-panel-sub">Ratio = Ventas/Leads período · Conversión = Ventas cohorte/Leads</div>
              </div>
            </div>
            <div class="chart-area"><Bar :data="conversionChartData" :options="convBarOptions" /></div>
          </div>
        </div>

        <!-- Fila 3: Pipeline + Revenue + Embudo/Share -->
        <div class="chart-grid-pipeline">
          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Pipeline de Leads por Asesor</div>
                <div class="chart-panel-sub">Leads totales, activos y convertidos</div>
              </div>
            </div>
            <div class="chart-area"><Bar :data="pipelineChartData" :options="pipelineBarOptions" /></div>
          </div>

          <div class="chart-panel">
            <div class="chart-panel-header">
              <div>
                <div class="chart-panel-title">Cumplimiento de Meta (S/.)</div>
                <div class="chart-panel-sub">Meta vs real financiero por asesor</div>
              </div>
            </div>
            <div class="chart-area"><Bar :data="revenueChartData" :options="groupedBarOptions" /></div>
          </div>

          <!-- Columna derecha: Embudo + Share apilados -->
          <div class="chart-col-right">
            <div class="chart-panel">
              <div class="chart-panel-header">
                <div class="chart-panel-title">Embudo del Equipo</div>
              </div>
              <div class="funnel-body">
                <div class="funnel-step" @click="drillDown({ type: 'leads' })">
                  <div class="funnel-step-header">
                    <span class="funnel-label">Leads</span>
                    <span class="funnel-value">{{ totals.contactos }}</span>
                  </div>
                  <div class="funnel-bar"><div class="funnel-fill fill-slate" style="width:100%"></div></div>
                </div>
                <div class="funnel-step" @click="drillDown({ type: 'active_leads' })">
                  <div class="funnel-step-header">
                    <span class="funnel-label funnel-label-amber">Activos</span>
                    <span class="funnel-value c-amber">{{ totals.activos }}</span>
                  </div>
                  <div class="funnel-bar"><div class="funnel-fill fill-amber" :style="`width:${totals.avgGestion}%`"></div></div>
                </div>
                <div class="funnel-step" @click="drillDown({ type: 'sales' })">
                  <div class="funnel-step-header">
                    <span class="funnel-label funnel-label-green">Ventas</span>
                    <span class="funnel-value c-green">{{ totals.ven }}</span>
                  </div>
                  <div class="funnel-bar"><div class="funnel-fill fill-green" :style="`width:${totals.avgConv}%`"></div></div>
                </div>
                <div class="funnel-footer">
                  <span class="funnel-footer-label">Conv. Global</span>
                  <span class="fw-700" :class="convClass(totals.avgConv)">{{ totals.avgConv }}%</span>
                </div>
              </div>
            </div>

            <div class="chart-panel">
              <div class="chart-panel-header">
                <div class="chart-panel-title">Participación (Share)</div>
              </div>
              <div class="chart-area chart-area-donut">
                <Doughnut :data="shareChartData" :options="doughnutOptions" />
              </div>
            </div>
          </div>
        </div>

        <!-- Fila 4: Ticket + Volumen -->
        <div class="chart-panel">
          <div class="chart-panel-header">
            <div>
              <div class="chart-panel-title">Ticket Promedio y Volumen de Ventas por Asesor</div>
              <div class="chart-panel-sub">Monto promedio por venta (eje izq.) vs número de ventas (eje der.)</div>
            </div>
          </div>
          <div class="chart-area"><Bar :data="ticketChartData" :options="ticketBarOptions" /></div>
        </div>

      </div>
    </main>

    <!-- ══════════════ FOOTER ══════════════ -->
    <footer class="exec-footer">
      <span>Vista: <strong>{{ filters.period === 'ALL' ? 'Mensual (MTD)' : filters.period }}</strong></span>
      <span class="footer-sep">·</span>
      <span>Período: <strong>{{ filters.month }} {{ filters.year }}</strong></span>
      <span class="footer-sep">·</span>
      <span>Modalidad: <strong>{{ filters.modality === 'NO_ONLINE' ? 'En Vivo' : 'Online' }}</strong></span>
      <span class="footer-spacer"></span>
      <span class="footer-status">
        <span class="status-dot" :class="loading ? 'dot-loading' : 'dot-ok'"></span>
        {{ loading ? 'Actualizando datos…' : 'Datos sincronizados' }}
      </span>
    </footer>

  </div>
</template>

<script setup>
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
const filters = reactive({ year: 2026, month: 'ENE', period: 'ALL', modality: 'NO_ONLINE' })
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
    const payload = { year: filters.year, month: filters.month, period: filters.period === 'ALL' ? null : filters.period, modality: filters.modality }
    const rawResponse = await dashboardService.dashboardList(payload)
    const items = rawResponse.items || []
    if (items.length > 0 && filters.period !== 'ALL') {
      const rawStart = items[0].fecha_inicio
      const rawEnd = items[0].fecha_fin
      if (rawStart) activePeriodRange.start = String(rawStart).split('T')[0]
      if (rawEnd) activePeriodRange.end = String(rawEnd).split('T')[0]
      console.log("Rango detectado:", activePeriodRange)
    }

    const grouped = {}
    items.forEach(item => {
      if (!grouped[item.cod_asesor]) {
        grouped[item.cod_asesor] = {
          asesor: item.asesor, cod: item.cod_asesor,
          obj: 0, ven: 0, falta: 0, obj_monto: 0, ven_monto: 0, contactos: 0,
          activos: 0, acum_ventas_cohorte: 0, daily: []
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
            name: `${dia.dia_nombre} ${dia.dia_num}`, date: dia.fecha,
            con: Number(dia.leads), ven: Number(dia.ventas_op), ven_coh: Number(dia.ventas_coh),
            ratio_dia: dia.leads > 0 ? Math.round((dia.ventas_op / dia.leads) * 100) : 0,
            conv_dia: dia.leads > 0 ? Math.round((dia.ventas_coh / dia.leads) * 100) : 0
          })
        })
      } else {
        g.daily.push({
          name: item.week, date: '', con: Number(item.consultas), ven: Number(item.logrado),
          ven_coh: ventasCohorte,
          ratio_dia: Number(item.consultas) > 0 ? Math.round((Number(item.logrado) / Number(item.consultas)) * 100) : 0,
          conv_dia: item.conversion
        })
      }
    })

    tableData.value = Object.values(grouped).map(adv => {
      adv.falta = Math.max(0, adv.obj - adv.ven)
      adv.ratio = adv.contactos > 0 ? Math.round((adv.ven / adv.contactos) * 100) : 0
      adv.conv = adv.contactos > 0 ? Math.round((adv.acum_ventas_cohorte / adv.contactos) * 100) : 0
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
  'we_lead_status_desestimado', 'we_lead_status_indiferente',
  'we_lead_status_closed', 'we_lead_status_anullment',
]

function getActiveStatusIds() {
  return catalog.options('we_lead_status')
    .filter(s => !DEAD_STATUS_ALIASES.includes(s.alias))
    .map(s => s.id).filter(Boolean).join(',')
}

function drillDown(params = {}) {
  const { date, type, advisor } = params;
  const query = {};
  let dStart = null, dEnd = null;
  const monthIndex = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].indexOf(filters.month);
  const y = filters.year;
  const monthNumStr = String(monthIndex + 1).padStart(2, '0');
  const toSql = (d) => d.toISOString().split('T')[0];

  if (date && String(date).includes('-')) {
    dStart = String(date).split('T')[0]; dEnd = String(date).split('T')[0];
  } else if (date && String(date).startsWith('S')) {
    const periodData = PERIODS_CONFIG[filters.month]?.find(p => p.value === date);
    if (periodData) {
      const matches = periodData.label.match(/\((\d{2})(?:-(\d{2}))?/);
      if (matches) {
        dStart = `${y}-${monthNumStr}-${String(parseInt(matches[1], 10)).padStart(2, '0')}`;
        dEnd = `${y}-${monthNumStr}-${String(matches[2] ? parseInt(matches[2], 10) : parseInt(matches[1], 10)).padStart(2, '0')}`;
      } else {
        dStart = toSql(new Date(y, monthIndex, 1)); dEnd = toSql(new Date(y, monthIndex + 1, 0));
      }
    }
  } else if (filters.period !== 'ALL') {
    const periodData = PERIODS_CONFIG[filters.month]?.find(p => p.value === filters.period);
    if (periodData) {
      const matches = periodData.label.match(/\((\d{2})(?:-(\d{2}))?/);
      if (matches) {
        dStart = `${y}-${monthNumStr}-${String(parseInt(matches[1], 10)).padStart(2, '0')}`;
        dEnd = `${y}-${monthNumStr}-${String(matches[2] ? parseInt(matches[2], 10) : parseInt(matches[1], 10)).padStart(2, '0')}`;
      } else { dStart = activePeriodRange.start; dEnd = activePeriodRange.end; }
    } else { dStart = activePeriodRange.start; dEnd = activePeriodRange.end; }
  } else {
    dStart = toSql(new Date(y, monthIndex, 1)); dEnd = toSql(new Date(y, monthIndex + 1, 0));
  }

  if (type === 'sales') { query.pay_date_from = dStart; query.pay_date_to = dEnd; }
  else if (['leads', 'active_leads', 'cohort_sales'].includes(type)) { query.from_date = dStart; query.to_date = dEnd; }

  const targetAdvisor = (advisor && advisor !== 'ALL') ? advisor : (selectedAdvisorCode.value !== 'ALL' ? selectedAdvisorCode.value : null)
  if (targetAdvisor) {
    const advisorRow = tableData.value.find(r => r.cod == targetAdvisor)
    if (advisorRow) {
      query.owner_user_ids = encodeFilter([{ value: advisorRow.cod, label: advisorRow.asesor }])
    } else {
      const found = usersMap.value.find(u => u.user_id == targetAdvisor)
      if (found) query.owner_user_ids = encodeFilter([{ value: found.user_id, label: found.first_name }])
    }
  }

  const salesAliases = ['we_lead_status_bought', 'we_lead_status_insc', 'we_lead_status_matriculado']
  if (type === 'sales' || type === 'cohort_sales') {
    const salesItems = salesAliases.map(alias => catalog.options('we_lead_status').find(s => s.alias === alias)).filter(Boolean).map(s => ({ value: s.id, label: s.description }))
    if (salesItems.length) query.status_lead_ids = encodeFilter(salesItems)
  } else if (type === 'leads' || type === 'active_leads') {
    const activeItems = catalog.options('we_lead_status').filter(s => !DEAD_STATUS_ALIASES.includes(s.alias)).map(s => ({ value: s.id, label: s.description }))
    if (activeItems.length) query.status_lead_ids = encodeFilter(activeItems)
    if (type === 'active_leads') {
      const pendingFollow = catalog.options('we_follow_lead').find(s => s.alias === 'we_follow_lead_pending')
      if (pendingFollow) query.last_follow_ids = encodeFilter([{ value: pendingFollow.id, label: pendingFollow.description }])
    }
  }

  const ONLINE_ALIAS = 'we_modality_online'
  if (filters.modality === 'NO_ONLINE') {
    const noOnlineItems = catalog.options('we_modality').filter(m => m.alias !== ONLINE_ALIAS).map(m => ({ value: m.id, label: m.description }))
    if (noOnlineItems.length) query.model_modality_ids = encodeFilter(noOnlineItems)
  } else if (filters.modality === 'ONLINE') {
    const onlineItem = catalog.options('we_modality').find(m => m.alias === ONLINE_ALIAS)
    if (onlineItem) query.model_modality_ids = encodeFilter([{ value: onlineItem.id, label: onlineItem.description }])
  }

  console.log(`Filtro Drilldown - Tipo: ${type}, Inicio: ${dStart}, Fin: ${dEnd}`);
  const routeData = router.resolve({ path: '/comercial/leads', query })
  window.open(routeData.href, '_blank')
}
 const convClass = (val) =>
      val > 20 ? 'c-green fw-700'
               : val >= 10 ? 'accent-text fw-700'
               : 'text-muted'
const totals = computed(() => {
  const t = tableData.value.reduce((acc, row) => {
    acc.obj += row.obj; acc.ven += row.ven; acc.contactos += row.contactos;
    acc.obj_monto += row.obj_monto; acc.ven_monto += row.ven_monto;
    acc.activos += row.activos; acc.acum_ventas_cohorte_total += row.acum_ventas_cohorte;
    return acc
  }, { obj: 0, ven: 0, contactos: 0, obj_monto: 0, ven_monto: 0, activos: 0, acum_ventas_cohorte_total: 0 })
  t.falta = Math.max(0, t.obj - t.ven)
  t.ticketProm = t.ven > 0 ? t.ven_monto / t.ven : 0
  t.pctMetaMonto = t.obj_monto > 0 ? Math.round((t.ven_monto / t.obj_monto) * 100) : 0
  t.avgRatio = t.contactos > 0 ? Math.round((t.ven / t.contactos) * 100) : 0
  t.avgConv = t.contactos > 0 ? Math.round((t.acum_ventas_cohorte_total / t.contactos) * 100) : 0
  t.avgGestion = t.contactos > 0 ? Math.round((t.activos / t.contactos) * 100) : 0
  return t
})

const currentDailyStats = computed(() => {
  if (tableData.value.length === 0) return []
  if (selectedAdvisorCode.value !== 'ALL') {
    const advisor = tableData.value.find(a => a.cod === selectedAdvisorCode.value)
    if(advisor && advisor.daily) return advisor.daily.map(d => ({ ...d, ratio: d.ratio_dia || 0, conv: d.conv_dia || 0 }))
    return []
  }
  const periodsMap = {}
  tableData.value.forEach(adv => {
    adv.daily.forEach(d => {
      const key = d.date || d.name
      if(!periodsMap[key]) periodsMap[key] = { name: d.name, date: d.date, con: 0, ven: 0, ven_coh: 0 }
      periodsMap[key].con += d.con; periodsMap[key].ven += d.ven; periodsMap[key].ven_coh += (d.ven_coh || 0)
    })
  })
  return Object.values(periodsMap)
    .sort((a, b) => { if (a.date && b.date) return a.date.localeCompare(b.date); return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) })
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
const getStatusBadge = (RATIO) => RATIO >= 15 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'
const getStatusLabel = (RATIO) => RATIO >= 15 ? '✓ OK' : '✗ Bajo'

// ══════════════════════════════════════
//   COMPUTED: CHART DATA
// ══════════════════════════════════════

/**
 * 1. EVOLUCIÓN + PROYECCIÓN DE META
 * - Ventas Acumuladas reales (línea negra)
 * - Meta Proyectada lineal (línea roja punteada) → de 0 a totals.obj distribuido linealmente
 * - Ventas por Periodo (barra azul)
 * - Consultas/Leads (barra gris)
 */
const trendChartData = computed(() => {
  if (!currentDailyStats.value || currentDailyStats.value.length === 0) return { labels: [], datasets: [] }

  const stats = currentDailyStats.value
  const n = stats.length
  const labels = stats.map(d => d.name)
  const ventasDiarias = stats.map(d => Number(d.ven) || 0)
  const consultasDiarias = stats.map(d => Number(d.con) || 0)

  // Acumulado real
  const cumulative = ventasDiarias.reduce((acc, curr, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + curr); return acc
  }, [])

  // Proyección lineal de la meta total (distribuida uniformemente entre todos los periodos)
  const metaTotal = totals.obj
  const projection = Array.from({ length: n }, (_, i) => Math.round((metaTotal / n) * (i + 1)))

  return {
    labels,
    datasets: [
      {
        type: 'line',
        label: 'Ventas Acumuladas',
        data: cumulative,
        borderColor: '#0f172a',
        backgroundColor: 'rgba(15, 23, 42, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#0f172a',
        order: 1
      },
      {
        type: 'line',
        label: 'Meta Proyectada',
        data: projection,
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [8, 4],
        fill: false,
        tension: 0,
        pointRadius: 3,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        order: 2
      },
      {
        type: 'bar',
        label: 'Ventas Periodo',
        data: ventasDiarias,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderRadius: 5,
        order: 4
      },
      {
        type: 'bar',
        label: 'Consultas (Leads)',
        data: consultasDiarias,
        backgroundColor: 'rgba(226, 232, 240, 0.8)',
        borderRadius: 5,
        order: 5
      }
    ]
  }
})

/**
 * 2. RANKING: % CUMPLIMIENTO DE META POR ASESOR
 * Barra horizontal con colores por rendimiento
 */
const rankingChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }

  const sorted = [...tableData.value]
    .filter(d => d.obj > 0 || d.ven > 0)
    .sort((a, b) => (b.ven / (b.obj || 1)) - (a.ven / (a.obj || 1)))

  const pcts = sorted.map(d => d.obj > 0 ? Math.round((d.ven / d.obj) * 100) : 0)
  const colors = pcts.map(p => p >= 100 ? 'rgba(16, 185, 129, 0.85)' : p >= 70 ? 'rgba(59, 130, 246, 0.85)' : p >= 40 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(239, 68, 68, 0.85)')

  return {
    labels: sorted.map(d => d.asesor),
    datasets: [
      {
        label: '% Cumplimiento Meta (#)',
        data: pcts,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Meta 100%',
        data: sorted.map(() => 100),
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        borderWidth: 1.5,
        borderDash: [5, 3],
        type: 'line',
        pointRadius: 0,
        fill: false,
      }
    ]
  }
})

/**
 * 3. RATIO vs CONVERSIÓN POR ASESOR (grouped bar)
 */
const conversionChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }

  const sorted = [...tableData.value].filter(d => d.contactos > 0).sort((a, b) => b.ratio - a.ratio)

  return {
    labels: sorted.map(d => d.asesor),
    datasets: [
      {
        label: 'Ratio % (Ventas / Leads periodo)',
        data: sorted.map(d => d.ratio),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 5,
      },
      {
        label: '% Conversión Cohorte',
        data: sorted.map(d => d.conv),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 5,
      }
    ]
  }
})

/**
 * 4. PIPELINE DE LEADS POR ASESOR
 * Barras apiladas: Leads totales = Activos + Gestionados + Convertidos
 */
const pipelineChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }

  const sorted = [...tableData.value].filter(d => d.contactos > 0).sort((a, b) => b.contactos - a.contactos)

  return {
    labels: sorted.map(d => d.asesor),
    datasets: [
      {
        label: 'Ventas (Convertidos)',
        data: sorted.map(d => d.ven),
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 5, bottomRight: 5 },
        stack: 'pipeline'
      },
      {
        label: 'Activos (Pendientes)',
        data: sorted.map(d => d.activos),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        stack: 'pipeline'
      },
      {
        label: 'Restantes',
        data: sorted.map(d => Math.max(0, d.contactos - d.activos - d.ven)),
        backgroundColor: 'rgba(203, 213, 225, 0.7)',
        borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
        stack: 'pipeline'
      }
    ]
  }
})

/**
 * 5. TICKET PROM Y VOLUMEN por Asesor
 */
const ticketChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }

  const sorted = [...tableData.value].filter(d => d.ven > 0).sort((a, b) => (b.ven_monto / b.ven) - (a.ven_monto / a.ven))
  const tickets = sorted.map(d => d.ven > 0 ? Math.round(d.ven_monto / d.ven) : 0)
  const ticketColors = tickets.map((t, i) => {
    const max = Math.max(...tickets)
    const ratio = t / (max || 1)
    return `rgba(15, 23, 42, ${0.3 + ratio * 0.7})`
  })

  return {
    labels: sorted.map(d => d.asesor),
    datasets: [
      {
        type: 'bar',
        label: 'Ticket Promedio (S/.)',
        data: tickets,
        backgroundColor: ticketColors,
        borderRadius: 6,
        yAxisID: 'yTicket',
        order: 2
      },
      {
        type: 'line',
        label: 'Nº Ventas',
        data: sorted.map(d => d.ven),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
        fill: false,
        yAxisID: 'yVentas',
        order: 1
      }
    ]
  }
})

// Computed para revenueChart y shareChart (sin cambios)
const revenueChartData = computed(() => {
  const active = tableData.value.filter(d => selectedAdvisorCode.value !== 'ALL' ? d.cod === selectedAdvisorCode.value : (d.obj_monto > 0 || d.ven_monto > 0 || d.obj > 0))
  return {
    labels: active.map(d => d.asesor),
    datasets: [
      { label: 'Meta S/.', data: active.map(d => Number(d.obj_monto) || 0), backgroundColor: '#e2e8f0', borderRadius: 4 },
      { label: 'Real S/.', data: active.map(d => Number(d.ven_monto) || 0), backgroundColor: '#10b981', borderRadius: 4 }
    ]
  }
})

const shareChartData = computed(() => {
  if (tableData.value.length === 0) return { labels: [], datasets: [] }
  const top = tableData.value.filter(d => Number(d.ven) > 0)
  const filteredTop = selectedAdvisorCode.value !== 'ALL' ? top.filter(d => d.cod === selectedAdvisorCode.value) : top
  return {
    labels: filteredTop.map(d => d.asesor),
    datasets: [{
      data: filteredTop.map(d => Number(d.ven)),
      backgroundColor: ['#0f172a','#334155','#64748b','#94a3b8','#cbd5e1','#e2e8f0','#f1f5f9','#2563eb','#3b82f6','#60a5fa'],
      borderWidth: 1, borderColor: '#ffffff'
    }]
  }
})

// ══════════════════════════════════════
//   CHART OPTIONS
// ══════════════════════════════════════

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'top', labels: { boxWidth: 14, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          if (ctx.dataset.label === 'Meta Proyectada' || ctx.dataset.label === 'Ventas Acumuladas') return ` ${ctx.dataset.label}: ${ctx.raw} ventas`
          return ` ${ctx.dataset.label}: ${ctx.raw}`
        }
      }
    }
  },
  scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } } }
}

const rankingBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ctx.dataset.label === '% Cumplimiento Meta (#)' ? ` ${ctx.raw}% de la meta` : ` Referencia: ${ctx.raw}%`
      }
    }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { beginAtZero: true, max: Math.max(120, ...(rankingChartData.value?.datasets?.[0]?.data || [120])), ticks: { callback: v => v + '%', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
  }
}

const convBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%` } }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { beginAtZero: true, ticks: { callback: v => v + '%', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
  }
}

const pipelineBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } }
  }
}

const ticketBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          if (ctx.dataset.yAxisID === 'yTicket') return ` Ticket: S/. ${new Intl.NumberFormat('es-PE').format(ctx.raw)}`
          return ` Ventas: ${ctx.raw}`
        }
      }
    }
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    yTicket: { type: 'linear', position: 'left', beginAtZero: true, ticks: { callback: v => 'S/' + new Intl.NumberFormat('es-PE').format(v), font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
    yVentas: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } }
  }
}

const groupedBarOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } }, plugins: { legend: { display: true, position: 'bottom' } } }
const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'right', labels: { boxWidth: 9, font: { size: 9 } } } } }
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
.btn-exec-primary { background: #0d9488; color: #fff; }
.btn-exec-primary:hover:not(:disabled) { background: #14b8a6; }
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
.mod-btn.active { background: rgba(20,184,166,0.18); color: #14b8a6; border-color: rgba(20,184,166,0.4); }

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
.inline-kpi-value.accent { color: #14b8a6; }

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
  border: 3px solid #e2e8f0; border-top-color: #0d9488;
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
.th-group-d { background: #1e293b; color: #14b8a6; border-left: 2px solid #334155; text-align: center; }

/* Sub-header */
.thead-sub .ts {
  padding: 6px 10px; font-size: 9px; letter-spacing: 0.08em;
  text-transform: uppercase; font-weight: 600;
  border-bottom: 2px solid #e2e8f0;
}
.ts-a { background: #f0f7ff; color: #2563eb; border-left: 1px solid #dbeafe; }
.ts-b { background: #f0fdf4; color: #16a34a; border-left: 1px solid #d1fae5; }
.ts-c { background: #f8fafc; color: #475569; border-left: 1px solid #e2e8f0; }
.ts-d { background: #1e293b; color: #0d9488; border-left: 1px solid #334155; }

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
.actionable:hover { color: #0d9488 !important; text-decoration-color: #0d9488; }

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
.exec-select-dark:focus { border-color: #0d9488; box-shadow: 0 0 0 2px rgba(13,148,136,0.15); }

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
.day-card-active { border-color: #0d9488; background: #fff; }

.day-card-header { padding: 5px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
.dh-active { background: rgba(13,148,136,0.08); }
.dh-empty  { background: #f1f5f9; }
.day-name  { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }
.day-card-active .day-name { color: #0d9488; }

.day-card-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.day-metric {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 5px; border-bottom: 1px solid #f1f5f9;
}
.day-metric:last-child { border-bottom: none; padding-bottom: 0; }

.day-metric-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
.day-metric-val   { font-size: 13px; font-weight: 700; color: #0f172a; cursor: pointer; }
.day-metric-val:hover { color: #0d9488; }
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
.accent-text { color: #0d9488; }
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