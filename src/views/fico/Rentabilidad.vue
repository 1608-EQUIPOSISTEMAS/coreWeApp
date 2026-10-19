<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Ventas y rentabilidad</h1>
        <p class="ds-sub">{{ subtitle }}</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" @click="showCalc = true">
          <i class="fa-solid fa-circle-question" aria-hidden="true"></i> ¿Cómo se calcula?
        </button>
      </div>
    </header>

    <div class="toolbar">
      <div class="ds-tabs" role="tablist" aria-label="Secciones">
        <button v-for="t in TABS" :key="t.id" type="button" role="tab" :aria-selected="String(tab === t.id)" @click="setQuery({ tab: t.id })">{{ t.label }}</button>
      </div>
      <div class="toolbar-period">
        <div v-if="tab !== 'costos'" class="ds-tabs" role="group" aria-label="Periodo">
          <button v-for="g in GRANULARITIES" :key="g.id" type="button" :aria-pressed="String(gran === g.id)" @click="setGranularity(g.id)">{{ g.label }}</button>
        </div>
        <input
          class="ds-input period-input"
          :type="currentGran.input"
          :value="tab === 'costos' ? year : inputValue(gran, date)"
          :min="currentGran.input === 'number' ? 2020 : undefined"
          :max="currentGran.input === 'number' ? 2100 : undefined"
          :aria-label="tab === 'costos' ? 'Año de los costos' : `Elegir ${currentGran.label.toLowerCase()}`"
          @change="onPeriodInput($event.target.value)"
        />
        <div v-if="tab === 'ventas'" class="ds-tabs" role="group" aria-label="Medida">
          <button v-for="m in MEASURES" :key="m.id" type="button" :aria-pressed="String(measure === m.id)" @click="setQuery({ m: m.id })">{{ m.label }}</button>
        </div>
      </div>
    </div>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <!-- Ventas por línea -->
    <template v-if="tab === 'ventas'">
      <div class="ds-kpis">
        <template v-if="!sales">
          <div v-for="n in 4" :key="n" class="ds-kpi"><span class="ds-skel"></span></div>
        </template>
        <template v-else>
        <div v-for="c in salesKpiCards" :key="c.label" class="ds-kpi">
          <span class="ds-kpi-icon" :class="c.tone" aria-hidden="true"><i class="fa-solid" :class="c.icono"></i></span>
          <div class="ds-kpi-body">
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ formatValue(c.valor, c.unidad) }}</span>
              <span v-if="c.trend" class="ds-trend" :class="c.tone">{{ c.trend }}</span>
            </div>
            <span class="ds-kpi-label">{{ c.label }}</span>
            <span class="ds-kpi-note">{{ c.note }}</span>
          </div>
        </div>
        </template>
      </div>

      <article v-if="sales?.serie" class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">¿Cómo se {{ measure === 'cobrado' ? 'cobró' : 'vendió' }} a lo largo {{ gran === 'anio' ? 'del año' : 'del mes' }}?</h3>
          <span class="ds-panel-hint">en soles, por {{ gran === 'anio' ? 'mes' : 'día' }}</span>
        </header>
        <div class="ds-panel-body">
          <ReportBars :grafico="sales.serie" :titulo="`Soles ${measure} por ${gran === 'anio' ? 'mes' : 'día'}`" :alto="220" />
        </div>
      </article>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">¿Qué línea, tipo y programa {{ measure === 'cobrado' ? 'trajo la plata' : 'vende más' }}?</h3>
          <span class="ds-panel-hint">clic en una fila para abrirla · {{ prevLabel(gran) }}</span>
        </header>
        <div class="ds-panel-body">
          <span v-if="!sales" class="ds-skel"></span>
          <LineTree v-else :key="`v-${sales.period.from}-${measure}`" :lineas="sales.lineas" :columns="salesColumns" />
        </div>
        <footer v-if="sales" class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span v-if="measure === 'vendido'">Ventas aprobadas por FICO por F. PAGO, sin becas ni destinos de RP/CC. Dólares a S/ 3.75.</span>
          <span v-else>Pagos recibidos en el periodo (iniciales y cuotas, de ventas de cualquier fecha), cargados al programa de la venta.</span>
        </footer>
      </article>
    </template>

    <!-- Rentabilidad por programa -->
    <template v-else-if="tab === 'rentabilidad'">
      <p v-if="gran === 'dia'" class="ds-callout info">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>La rentabilidad no se mide por día: se muestra {{ periodLabel('mes', date) }}.</span>
      </p>
      <p v-for="w in warnings" :key="w.text" class="ds-callout" :class="w.tone">
        <i class="fa-solid" :class="w.tone === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-info'" aria-hidden="true"></i>
        <span>{{ w.text }} <a v-if="w.text.includes('Costos')" href="#" @click.prevent="setQuery({ tab: 'costos' })">Ir a Costos</a></span>
      </p>

      <div class="ds-kpis">
        <template v-if="!profit">
          <div v-for="n in 5" :key="n" class="ds-kpi"><span class="ds-skel"></span></div>
        </template>
        <template v-else>
        <div v-for="c in profitKpiCards" :key="c.label" class="ds-kpi">
          <span class="ds-kpi-icon" :class="c.tone" aria-hidden="true"><i class="fa-solid" :class="c.icono"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(c.valor, c.unidad) }}</span>
            <span class="ds-kpi-label">{{ c.label }}</span>
            <span class="ds-kpi-note">{{ c.note }}</span>
          </div>
        </div>
        </template>
      </div>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">¿Qué programas dejan plata y cuáles la pierden?</h3>
          <button class="btn-exec btn-exec-ghost btn-sm" type="button" @click="showCalc = true">
            <i class="fa-solid fa-calculator" aria-hidden="true"></i> De dónde sale
          </button>
        </header>
        <div class="ds-panel-body">
          <span v-if="!profit" class="ds-skel"></span>
          <LineTree v-else :key="`r-${profit.period.from}`" :lineas="profit.lineas" :columns="PROFIT_COLUMNS" empty="Sin ventas ni ediciones en el periodo. Cambia el periodo arriba." />
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Verde: deja plata. Ámbar: margen bajo el promedio de su línea. Rojo: los costos superan lo vendido.</span>
        </footer>
      </article>
    </template>

    <CostosPanel v-else :year="year" />

    <CalculoModal v-model="showCalc" :kpis="profit?.kpis ?? null" />
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { toLocalIsoDate } from '@/shared/lib/localDate.js'
import ReportBars from '@/views/academica/report/ReportBars.vue'
import LineTree from './rentabilidad/LineTree.vue'
import CostosPanel from './rentabilidad/CostosPanel.vue'
import CalculoModal from './rentabilidad/CalculoModal.vue'
import {
  TABS, GRANULARITIES, MEASURES, inputValue, dateFromInput, periodLabel, prevLabel,
  salesCards, profitCards, coverageWarnings
} from '@/features/fico-rentabilidad/rentabilidad.js'

const ficoService = inject(ServiceKeys.Fico)
const route = useRoute()
const router = useRouter()

// Pestaña, periodo y medida viven en la URL: el enlace compartido abre lo mismo.
const today = toLocalIsoDate()
const tab = computed(() => (TABS.some(t => t.id === route.query.tab) ? route.query.tab : 'ventas'))
const gran = computed(() => (GRANULARITIES.some(g => g.id === route.query.g) ? route.query.g : 'mes'))
const date = computed(() => dateFromInput('dia', route.query.d) ?? today)
const measure = computed(() => (MEASURES.some(m => m.id === route.query.m) ? route.query.m : 'vendido'))
const year = computed(() => Number(date.value.slice(0, 4)))
const currentGran = computed(() => (tab.value === 'costos' ? GRANULARITIES[2] : GRANULARITIES.find(g => g.id === gran.value)))

const setQuery = patch => router.replace({ query: { ...route.query, ...patch } })
const setGranularity = g => setQuery({ g })
function onPeriodInput (value) {
  const next = dateFromInput(currentGran.value.id, value)
  if (next) setQuery({ d: next })
}

const subtitle = computed(() => {
  if (tab.value === 'costos') return `Costos que alimentan la rentabilidad · ${year.value}`
  if (tab.value === 'rentabilidad') return `${periodLabel(gran.value === 'dia' ? 'mes' : gran.value, date.value)} · margen de contribución por programa`
  const label = periodLabel(gran.value, date.value)
  return sales.value?.period.partial
    ? `${label} hasta hoy · ${prevLabel(gran.value)}, a los mismos días`
    : `${label} · ${prevLabel(gran.value)}`
})

const sales = ref(null)
const profit = ref(null)
const error = ref('')
const showCalc = ref(false)

async function loadSales () {
  sales.value = null
  error.value = ''
  try {
    sales.value = await ficoService.ventasPorLinea({ granularity: gran.value, date: date.value, measure: measure.value })
  } catch (err) {
    console.error('Error cargando ventas por línea:', err)
    error.value = 'No se pudieron cargar las ventas. Intenta de nuevo en un momento.'
  }
}
async function loadProfit () {
  profit.value = null
  error.value = ''
  try {
    profit.value = await ficoService.rentabilidad({ granularity: gran.value, date: date.value })
  } catch (err) {
    console.error('Error cargando la rentabilidad:', err)
    error.value = 'No se pudo calcular la rentabilidad. Intenta de nuevo en un momento.'
  }
}

watch([tab, gran, date, measure], () => {
  if (tab.value === 'ventas') loadSales()
  else if (tab.value === 'rentabilidad') loadProfit()
}, { immediate: true })

const salesKpiCards = computed(() => salesCards(sales.value, gran.value))
const profitKpiCards = computed(() => profitCards(profit.value))
const warnings = computed(() => (profit.value ? coverageWarnings(profit.value.cobertura) : []))

const salesColumns = computed(() => [
  { key: 'soles', label: measure.value === 'cobrado' ? 'Cobrado' : 'Vendido', unit: 'soles', strong: true },
  { key: 'n', label: measure.value === 'cobrado' ? 'Pagos' : 'Ventas', unit: 'num' },
  { key: 'pct', label: '% del total', unit: 'pct' },
  { key: 'prev', label: 'Periodo anterior', unit: 'soles' },
  { key: 'trend', label: 'Variación', kind: 'trend' }
])
const PROFIT_COLUMNS = [
  { key: 'ingreso', label: 'Ingreso', unit: 'soles' },
  { key: 'docente', label: 'Costo docente', unit: 'soles' },
  { key: 'publicidad', label: 'Publicidad', unit: 'soles' },
  { key: 'margen', label: 'Margen', unit: 'soles', strong: true, toned: true },
  { key: 'margen_pct', label: 'Margen %', unit: 'pct', toned: true }
]
</script>

<style scoped>
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.toolbar-period { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.period-input { width: 170px; }
</style>
