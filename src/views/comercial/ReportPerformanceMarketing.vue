<template>
  <div class="system-container">

    <div class="filter-bar animate-fade">
      <div class="filter-group">
        <div class="filter-item">
          <label>AÑO</label>
          <select v-model="filters.year" @change="fetchData">
            <option :value="2026">2026</option>
            <option :value="2025">2025</option>
          </select>
        </div>
        <div class="filter-item">
          <label>MES</label>
          <select v-model="filters.month" @change="fetchData">
            <option value="ENE">ENERO</option>
            <option value="FEB">FEBRERO</option>
            <option value="MAR">MARZO</option>
          </select>
        </div>
        <div class="filter-item wide">
          <label>PERIODO (VISTA)</label>
          <select v-model="filters.period" @change="fetchData">
            <option value="ALL">ACUMULADO MENSUAL (MTD)</option>
            <option 
              v-for="opt in currentPeriodOptions" 
              :key="opt.value" 
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="mini-kpis">
        <div class="mini-card">
          <span>VENTA TOTAL (S/.)</span>
          <strong>{{ formatCurrency(totals.ven_monto) }}</strong>
        </div>
        <div class="mini-card">
          <span>TICKET PROM.</span>
          <strong>{{ formatCurrency(totals.ticketProm) }}</strong>
        </div>
        <div class="mini-card highlight">
          <span>% META S/.</span>
          <strong>{{ totals.pctMetaMonto }}%</strong>
        </div>
      </div>
    </div>

    <div class="main-header">
      <div>
        <h1 class="system-title">TABLERO DE CONTROL COMERCIAL</h1>
        <p class="system-subtitle">VISTA: {{ filters.period === 'ALL' ? 'MENSUAL' : filters.period }} - {{ filters.month }} {{ filters.year }}</p>
      </div>

      <div class="header-actions">
         <button @click="fetchData" class="btn-refresh" :disabled="loading" title="Actualizar datos">
            <i class="icon" :class="{ 'spin': loading }">↻</i>
         </button>
         <button @click="toggleView" class="btn-toggle">
            <span v-if="!isDashboard">
               <i class="icon">📊</i> VER GRÁFICOS
            </span>
            <span v-else>
               <i class="icon">📋</i> VER TABLA
            </span>
         </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Cargando métricas...</p>
    </div>

    <div v-else>
        
        <div v-if="!isDashboard" class="view-container animate-fade">
        
          <div class="table-card mb-8">
            <div class="table-wrapper">
            <table>
                <thead>
                <tr class="header-group">
                    <th  class="text-left">ASESOR</th>
                    <th colspan="3" class="group-blue">OBJETIVOS (VACANTES)</th>
                    <th colspan="3" class="group-green">FINANCIERO (S/.)</th> <th colspan="3" class="group-gray">GESTIÓN</th>
                    <th colspan="3" class="group-dark">EFICIENCIA</th>
                </tr>
                <tr class="header-cols">
                    <th>NOMBRE</th>
                    <th class="sub-blue">META #</th>
                    <th class="sub-blue">REAL #</th>
                    <th class="sub-blue">GAP</th>
                    <th class="sub-green">META S/.</th>
                    <th class="sub-green">VENTA S/.</th>
                    <th class="sub-green">TICKET</th>
                    <th class="sub-gray">LEADS</th>
                    <th class="sub-gray">ACTIVOS</th>
                    <th class="sub-gray">% GEST</th>
                    <th class="sub-dark" title="Ventas Cerradas Hoy / Leads Hoy (Operativo)">RATIO</th>
                    <th class="sub-dark" title="Leads de Hoy que compraron / Leads Hoy (Calidad)">% CONV</th>
                    <th class="sub-dark">STATUS</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="tableData.length === 0">
                    <td colspan="13" class="text-center py-4 text-muted">No hay datos para este periodo</td>
                </tr>
                <tr v-for="(row, index) in tableData" :key="index" class="data-row">
                    <td class="font-medium text-dark">{{ row.asesor }}</td>
                    
                    <td class="text-center bg-blue-light">{{ row.obj }}</td>
                    <td class="text-center bg-blue-light font-bold text-dark">{{ row.ven }}</td>
                    <td class="text-center bg-blue-light">
                    <span :class="row.falta > 0 ? 'text-danger' : 'text-success'">
                        {{ row.falta > 0 ? '-' + row.falta : '✓' }}
                    </span>
                    </td>

                    <td class="text-right bg-green-light text-muted text-xs">{{ formatCurrency(row.obj_monto) }}</td>
                    <td class="text-right bg-green-light font-bold text-dark">{{ formatCurrency(row.ven_monto) }}</td>
                    <td class="text-right bg-green-light text-xs">{{ formatCurrency(row.ven_monto / (row.ven || 1)) }}</td>

                    <td class="text-center">{{ row.contactos }}</td>
                    <td class="text-center text-muted">{{ Math.round(row.contactos * 0.85) }}</td>
                    <td class="text-center text-xs">100%</td>
                    
                    <td class="text-center bg-dark-light font-bold text-blue-700">
                        {{ row.ratio }}%
                    </td>
                    <td class="text-center bg-dark-light font-bold">
                        <span :class="getConvClass(row.conv)">{{ row.conv }}%</span>
                    </td>
                    <td class="text-center bg-dark-light">
                        <span class="circle-status" :class="getStatusColor(row.ven, row.obj)"></span>
                    </td>
                </tr>
                </tbody>
                <tfoot>
                <tr class="row-total">
                    <td colspan="1" class="font-bold">TOTAL EQUIPO</td>
                    <td class="text-center">{{ totals.obj }}</td>
                    <td class="text-center text-blue">{{ totals.ven }}</td>
                    <td class="text-center text-danger">-{{ totals.falta }}</td>
                    
                    <td class="text-right">{{ formatCurrency(totals.obj_monto) }}</td>
                    <td class="text-right text-success">{{ formatCurrency(totals.ven_monto) }}</td>
                    <td class="text-right">{{ formatCurrency(totals.ticketProm) }}</td>

                    <td class="text-center">{{ totals.contactos }}</td>
                    <td class="text-center">-</td>
                    <td class="text-center">-</td>
                    <td class="text-center text-blue-700">{{ totals.avgRatio }}%</td>
                    <td class="text-center">{{ totals.avgConv }}%</td>
                    <td class="text-center">{{ totals.pctMetaMonto }}% $$</td>
                </tr>
                </tfoot>
            </table>
            </div>
          </div>

          <div class="daily-section animate-slide-up">
            <div class="daily-header">
            <div>
                <h3 class="section-title">MICRO-GESTIÓN: DESGLOSE POR PERIODO</h3>
                <p class="section-desc">Análisis granular (Ratio Operativo vs Conversión Real)</p>
            </div>
            <div class="filter-wrapper">
                <select v-model="selectedAdvisorCode" class="custom-select">
                <option value="ALL">TOTAL EQUIPO (Consolidado)</option>
                <option v-for="adv in tableData" :key="adv.cod" :value="adv.cod">{{ adv.asesor }}</option>
                </select>
            </div>
            </div>
            <div class="days-grid">
              <div 
                v-for="(day, i) in currentDailyStats" 
                :key="i" 
                class="day-card cursor-pointer hover:shadow-md" 
                :class="{ 'active-day': day.ven > 0 }"
                @click="openDayDetail(day)" 
              >
                <div class="day-header">
                  <span class="day-name">{{ day.name }}</span>
                </div>
                <div class="day-body">
                  <div class="metric-row border-b-2 border-gray-100 pb-1 mb-1">
                    <span class="metric-label text-gray-500 font-bold">LEADS</span>
                    <span class="metric-val text-lg">{{ day.con }}</span>
                  </div>

                  <div class="metric-row items-center">
                    <span class="metric-label text-blue-700 text-[0.65rem]">CIERRES</span>
                    <div class="text-right">
                      <span class="metric-val text-blue-700 font-bold block leading-none">{{ day.ven }}</span>
                      <span class="text-[0.6rem] text-blue-500 font-medium">Ratio: {{ day.ratio_dia }}%</span>
                    </div>
                  </div>

                  <div class="metric-row items-center mt-1">
                    <span class="metric-label text-green-700 text-[0.65rem]">CONVERT.</span>
                    <div class="text-right">
                      <span class="metric-val text-green-700 font-bold block leading-none">{{ day.ven_coh }}</span>
                      <span class="text-[0.6rem] text-green-500 font-medium">Conv: {{ day.conv_dia }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div v-else class="marketing-dashboard animate-fade">
          <div class="split-section mb-6">
            <div class="panel">
            <div class="panel-header"><h4>EVOLUCIÓN DE VENTAS (ACUMULADO)</h4></div>
            <div class="chart-wrapper-large"><Line :data="trendChartData" :options="lineOptions" /></div>
            </div>
            <div class="panel">
            <div class="panel-header"><h4>EMBUDO DE CONVERSIÓN</h4></div>
            <div class="funnel-container">
                <div class="funnel-step step-1"><div class="f-label">LEADS</div><div class="f-value">{{ totals.contactos }}</div><div class="f-bar" style="width: 100%"></div></div>
                <div class="funnel-step step-2"><div class="f-label">CONTACTADOS</div><div class="f-value">{{ Math.round(totals.contactos * 0.85) }}</div><div class="f-bar" style="width: 85%"></div></div>
                <div class="funnel-step step-4"><div class="f-label">VENTAS</div><div class="f-value">{{ totals.ven }}</div><div class="f-bar" :style="`width: ${totals.avgConv}%`"></div></div>
            </div>
            </div>
          </div>
          <div class="split-section">
            <div class="panel"><div class="panel-header"><h4>CUMPLIMIENTO DE META (S/.)</h4></div><div class="chart-wrapper-medium"><Bar :data="revenueChartData" :options="groupedBarOptions" /></div></div>
            <div class="panel"><div class="panel-header"><h4>PARTICIPACIÓN (SHARE)</h4></div><div class="doughnut-container"><Doughnut :data="shareChartData" :options="doughnutOptions" /></div></div>
          </div>
        </div>
    </div>

    <BaseModal 
      v-model="showDetailModal" 
      :title="detailModalTitle" 
      size="lg"
    >
      <div class="flex border-b border-gray-300 mb-0 bg-gray-50 sticky top-0 z-10">
        <button 
          class="px-6 py-3 font-bold text-xs uppercase tracking-wide border-b-2 transition-colors focus:outline-none flex-1 text-center"
          :class="activeTab === 'leads' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
          @click="activeTab = 'leads'"
        >
          LEADS ({{ detailLeads.length }})
        </button>
        <button 
          class="px-6 py-3 font-bold text-xs uppercase tracking-wide border-b-2 transition-colors focus:outline-none flex-1 text-center"
          :class="activeTab === 'sales' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
          @click="activeTab = 'sales'"
        >
          CIERRES ({{ detailSales.length }})
        </button>
      </div>

      <div class="overflow-auto h-[65vh] bg-white custom-scrollbar">
        
        <table v-if="activeTab === 'leads'" class="w-full text-xs text-left border-collapse">
          <thead class="bg-gray-100 text-gray-600 font-bold uppercase sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="p-2 border-b w-16 text-center">Hora</th>
              <th class="p-2 border-b">Contacto</th>
              <th class="p-2 border-b w-24 text-center">Estado</th>
              <th class="p-2 border-b">Observación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="detailLeads.length === 0">
                <td colspan="4" class="p-8 text-center text-gray-400 italic">No hubo leads este día.</td>
            </tr>
            <tr 
              v-for="(l, index) in detailLeads" 
              :key="l.lead_id" 
              class="hover:bg-blue-50 transition-colors"
              :class="{ 'bg-gray-50': index % 2 !== 0, 'bg-green-50': isConverted(l.id_estado) }"
            >
              <td class="p-2 text-gray-500 font-mono text-center">{{ l.hora_registro }}</td>
              <td class="p-2">
                <div class="font-bold text-gray-800 truncate max-w-[180px]" :title="l.nombre_contacto">{{ l.nombre_contacto }}</div>
                <div class="text-[10px] text-blue-600 font-mono">{{ l.telefono }}</div>
              </td>
              <td class="p-2 text-center">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold border inline-block min-w-[70px]"
                  :class="isConverted(l.id_estado) 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-gray-200 text-gray-600 border-gray-300'"
                >
                  {{ l.estado_lead }}
                </span>
                <div v-if="isConverted(l.id_estado)" class="text-[9px] text-green-600 font-bold mt-1">
                   CONVERTIDO
                </div>
              </td>
              <td class="p-2 text-gray-500 max-w-[250px] truncate" :title="l.ultima_observacion">
                {{ l.ultima_observacion || '-' }}
              </td>
            </tr>
          </tbody>
        </table>

        <table v-if="activeTab === 'sales'" class="w-full text-xs text-left border-collapse">
          <thead class="bg-green-50 text-green-800 font-bold uppercase sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="p-2 border-b border-green-200 w-16 text-center">Hora</th>
              <th class="p-2 border-b border-green-200">Alumno</th>
              <th class="p-2 border-b border-green-200">Programa</th>
              <th class="p-2 border-b border-green-200 text-right">Monto</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-green-100">
            <tr v-if="detailSales.length === 0">
                <td colspan="4" class="p-8 text-center text-gray-400 italic">No hubo ventas registradas hoy.</td>
            </tr>
            <tr 
              v-for="(s, index) in detailSales" 
              :key="s.enrollment_id" 
              class="hover:bg-green-50 transition-colors"
              :class="{ 'bg-white': index % 2 === 0, 'bg-gray-50': index % 2 !== 0 }"
            >
              <td class="p-2 text-gray-500 font-mono text-center">{{ s.hora_venta }}</td>
              <td class="p-2">
                <div class="font-bold text-gray-800 truncate max-w-[180px]">{{ s.alumno }}</div>
                <div class="text-[10px] text-gray-400">{{ s.dni }}</div>
              </td>
              <td class="p-2 text-gray-700 font-medium truncate max-w-[200px]" :title="s.nombre_comercial">
                  {{ s.nombre_comercial || 'Sin nombre' }}
              </td>
              <td class="p-2 text-right font-bold text-green-700 font-mono whitespace-nowrap">
                {{ s.moneda_label }} {{ formatCurrencySimple(s.monto_original) }}
              </td>
            </tr>
          </tbody>
        </table>

      </div>

      <template #footer>
         <div class="w-full flex justify-between items-center px-2">
            <span class="text-xs text-gray-400 italic">Mostrando {{ activeTab === 'leads' ? detailLeads.length : detailSales.length }} registros</span>
            <button class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded text-xs font-bold transition-colors" @click="showDetailModal = false">
                CERRAR
            </button>
         </div>
      </template>
    </BaseModal>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, inject, watch } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

const dashboardService = inject(ServiceKeys.Dashboard)

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

// Modal State
const showDetailModal = ref(false)
const detailModalTitle = ref('')
const activeTab = ref('leads')
const detailLeads = ref([])
const detailSales = ref([])

const currentPeriodOptions = computed(() => PERIODS_CONFIG[filters.month] || [])
watch(() => filters.month, () => { filters.period = 'ALL'; fetchData() })

// --- DATA FETCHING ---
async function fetchData() {
    loading.value = true
    try {
        const payload = { year: filters.year, month: filters.month, period: filters.period === 'ALL' ? null : filters.period }
        const rawResponse = await dashboardService.dashboardList(payload)
        const items = rawResponse.items || [] 

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
            g.ven += Number(item.logrado) // Venta Operativa
            g.obj_monto += Number(item.meta_monto)
            g.ven_monto += Number(item.logrado_monto)
            g.contactos += Number(item.consultas)

            const ventasCohorte = Math.round((Number(item.consultas) * Number(item.conversion)) / 100)
            g.acum_ventas_cohorte += ventasCohorte
            
            // LOGICA DESGLOSE DIARIO
            if (filters.period !== 'ALL' && item.desglose_diario && Array.isArray(item.desglose_diario)) {
                item.desglose_diario.forEach(dia => {
                    g.daily.push({
                        name: `${dia.dia_nombre} ${dia.dia_num}`,
                        date: dia.fecha,
                        con: Number(dia.leads),
                        ven: Number(dia.ventas_op), // CIERRES
                        ven_coh: Number(dia.ventas_coh), // CONVERTIDOS
                        
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
                    conv_dia: item.conversion // Acumulado semanal
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

async function openDayDetail(day) {
    if (!day.date) return 
    detailModalTitle.value = `Detalle del ${formatDateLabel(day.date)}`
    detailLeads.value = []; detailSales.value = []
    activeTab.value = day.ven > 0 ? 'sales' : 'leads'
    showDetailModal.value = true
    try {
        const codigo = selectedAdvisorCode.value 
        const [leads, sales] = await Promise.all([
            dashboardService.getDetailLeads({ cod_asesor: codigo === 'ALL' ? null : codigo, date: day.date }),
            dashboardService.getDetailSales({ cod_asesor: codigo === 'ALL' ? null : codigo, date: day.date })
        ])
        detailLeads.value = leads; detailSales.value = sales
    } catch (error) { console.error(error) }
}

// TOTALES GENERALES
const totals = computed(() => {
  const t = tableData.value.reduce((acc, row) => {
    acc.obj += row.obj; acc.ven += row.ven; acc.contactos += row.contactos;
    acc.obj_monto += row.obj_monto; acc.ven_monto += row.ven_monto;
    acc.acum_ventas_cohorte_total += (row.acum_ventas_cohorte || 0);
    return acc
  }, { obj: 0, ven: 0, contactos: 0, obj_monto: 0, ven_monto: 0, acum_ventas_cohorte_total: 0 })

  t.falta = Math.max(0, t.obj - t.ven)
  t.ticketProm = t.ven > 0 ? t.ven_monto / t.ven : 0
  t.pctMetaMonto = t.obj_monto > 0 ? Math.round((t.ven_monto / t.obj_monto) * 100) : 0
  t.avgRatio = t.contactos > 0 ? Math.round((t.ven / t.contactos) * 100) : 0
  t.avgConv = t.contactos > 0 ? Math.round((t.acum_ventas_cohorte_total / t.contactos) * 100) : 0
  return t
})

// LOGICA TOTAL EQUIPO
const currentDailyStats = computed(() => {
  if (tableData.value.length === 0) return []

  if (selectedAdvisorCode.value !== 'ALL') {
    const advisor = tableData.value.find(a => a.cod === selectedAdvisorCode.value)
    if(advisor && advisor.daily) {
        return advisor.daily.map(d => ({ 
            ...d, 
            ratio: d.ratio_dia || 0,
            conv: d.conv_dia || 0
        }))
    }
    return []
  }
  
  // Agrupación Total Equipo
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
        // Calculo real de % sobre el total del día
        ratio_dia: p.con > 0 ? Math.round((p.ven / p.con) * 100) : 0,
        conv_dia: p.con > 0 ? Math.round((p.ven_coh / p.con) * 100) : 0,
        // Mapas para la tarjeta visual
        ratio: p.con > 0 ? Math.round((p.ven / p.con) * 100) : 0,
        conv: p.con > 0 ? Math.round((p.ven_coh / p.con) * 100) : 0
    }))
})

// Helpers
const toggleView = () => isDashboard.value = !isDashboard.value
const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(val)
const formatCurrencySimple = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(val)
const formatDateLabel = (dateStr) => { if(!dateStr) return ''; const p = dateStr.split('-'); return `${p[2]}/${p[1]}/${p[0]}` }
const getConvClass = (val) => val > 20 ? 'text-success' : (val >= 10 ? 'text-blue' : 'text-muted')
const getStatusColor = (ven, obj) => { const pct = obj > 0 ? ven/obj : 0; return pct >= 0.9 ? 'bg-green' : (pct >= 0.5 ? 'bg-yellow' : 'bg-red') }

// Función visual para resaltar conversiones en la tabla
const isConverted = (statusId) => {
    // 3054: Inscrito, 2366: Pagó, 2365: Pagará (opcional)
    return [3054, 2366].includes(Number(statusId))
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

onMounted(() => { fetchData() })
</script>

<style scoped>
/* ESTILOS BASE */
.system-container { font-family: 'Inter', sans-serif; max-width: 1400px; margin: 0 auto; padding: 2rem; background-color: #f8fafc; min-height: 100vh; color: #0f172a; }
.animate-fade { animation: fadeIn 0.4s ease-in-out; }
.animate-slide-up { animation: slideUp 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* HEADER & FILTROS */
.main-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; }
.system-title { font-size: 1.5rem; font-weight: 800; margin: 0; color: #0f172a; }
.system-subtitle { font-size: 0.85rem; font-weight: 600; color: #64748b; margin-top: 0.25rem; text-transform: uppercase; }

.header-actions { display: flex; align-items: stretch; gap: 0.5rem; height: 42px; }
.btn-toggle { background: #0f172a; color: white; border: none; padding: 0 1.5rem; font-weight: 700; font-size: 0.85rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: all 0.2s; height: 100%; }
.btn-refresh { background: white; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; width: 42px; height: 100%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 1.2rem; }
.btn-toggle:hover { background: #1e293b; transform: translateY(-1px); }
.btn-refresh:hover { background-color: #f8fafc; border-color: #cbd5e1; color: #334155; }

/* BARRA DE FILTROS */
.filter-bar { background: white; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
.filter-group { display: flex; gap: 1rem; }
.filter-item label { display: block; font-size: 0.65rem; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
.filter-item select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #334155; outline: none; min-width: 100px; }
.filter-item.wide select { min-width: 220px; }

/* KPIS */
.mini-kpis { display: flex; gap: 1.5rem; border-left: 1px solid #e2e8f0; padding-left: 1.5rem; }
.mini-card { display: flex; flex-direction: column; text-align: right; }
.mini-card span { font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
.mini-card strong { font-size: 1.1rem; color: #0f172a; font-weight: 800; }
.mini-card.highlight strong { color: #10b981; }

/* TABLA AVANZADA */
.table-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; }
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
thead th { padding: 0.75rem 1rem; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }

.group-blue { background: #eff6ff; color: #1e40af; border-left: 2px solid white; }
.group-green { background: #ecfdf5; color: #047857; border-left: 2px solid white; }
.group-gray { background: #f8fafc; color: #475569; border-left: 2px solid white; }
.group-dark { background: #f1f5f9; color: #0f172a; border-left: 2px solid white; }

.sub-blue { background: #eff6ff; color: #1d4ed8; }
.sub-green { background: #ecfdf5; color: #059669; }
.sub-gray { background: #f8fafc; color: #64748b; }
.sub-dark { background: #f1f5f9; color: #334155; }

.data-row td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.bg-green-light { background: #ecfdf5; }
.bg-blue-light { background: #eff6ff; }
.bg-dark-light { background: #f8fafc; }

.circle-status { height: 10px; width: 10px; border-radius: 50%; display: inline-block; }
.bg-green { background-color: #22c55e; }
.bg-yellow { background-color: #eab308; }
.bg-red { background-color: #ef4444; }

.row-total td { background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1; color: #0f172a; padding: 1rem; }

/* SECCIÓN MICRO-GESTION */
.daily-section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; border-top: 4px solid #0f172a; }
.daily-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
.section-title { font-size: 1rem; font-weight: 800; margin: 0; }
.section-desc { font-size: 0.8rem; color: #64748b; margin: 0; }
.custom-select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; min-width: 200px; }

.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.75rem; }
.day-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; transition: all 0.2s; }
.day-card.active-day { border-color: #bae6fd; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.1); }
.day-header { background: #f8fafc; padding: 0.5rem; text-align: center; border-bottom: 1px solid #e2e8f0; }
.day-name { display: block; font-size: 0.6rem; font-weight: 800; color: #64748b; }
.day-date { font-weight: 800; font-size: 0.9rem; }
.day-body { padding: 0.5rem; }
.metric-row { display: flex; justify-content: space-between; padding: 0.25rem 0.5rem; font-size: 0.75rem; border-bottom: 1px solid #f1f5f9; }
.metric-row:last-child { border-bottom: none; }
.metric-row.highlight { background: #ecfdf5; color: #047857; font-weight: 700; border-radius: 4px; }

/* MODAL TABS */
.tab-btn { padding: 0.5rem 1rem; margin-right: 1rem; font-weight: 700; font-size: 0.85rem; color: #64748b; border-bottom: 3px solid transparent; transition: all 0.2s; background: none; border-top: none; border-left: none; border-right: none; cursor: pointer; }
.tab-btn.active { color: #0f172a; border-bottom-color: #0f172a; }
.tab-btn:hover { color: #0f172a; }

/* LOADING */
.loading-container { text-align: center; padding: 4rem; color: #64748b; }
.spinner { border: 3px solid #f3f3f3; border-top: 3px solid #0f172a; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* SCROLLBAR MODAL */
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* DASHBOARD LAYOUT */
.split-section { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
.panel { background: white; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.panel-header { margin-bottom: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
.panel-header h4 { margin: 0; font-size: 0.9rem; font-weight: 800; color: #0f172a; }
.chart-wrapper-medium { height: 280px; }
.chart-wrapper-large { height: 320px; }
.doughnut-container { height: 240px; display: flex; justify-content: center; }

/* FUNNEL */
.funnel-container { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; }
.funnel-step { position: relative; }
.f-label { font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 4px; }
.f-value { position: absolute; right: 0; top: 0; font-weight: 800; color: #0f172a; font-size: 0.9rem; }
.f-bar { height: 28px; background: #cbd5e1; border-radius: 6px; transition: width 1s ease; opacity: 0.9; }
.step-2 .f-bar { background: #93c5fd; }
.step-3 .f-bar { background: #3b82f6; }
.step-4 .f-bar { background: #10b981; }

/* UTILIDADES */
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-success { color: #16a34a; font-weight: 700; }
.text-danger { color: #dc2626; font-weight: 700; }
.text-blue { color: #2563eb; font-weight: 700; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 700; }
.text-xs { font-size: 0.7rem; }
.spin { animation: spin 1s linear infinite; }

@media (max-width: 1024px) { .split-section { grid-template-columns: 1fr; } .days-grid { grid-template-columns: repeat(4, 1fr); } }
</style>