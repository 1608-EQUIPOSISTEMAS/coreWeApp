<template>
  <div class="ds-page ds-page--destacada">
    <header class="ds-head ds-head--fija">
      <div class="ds-head-titles">
        <h1 class="ds-title">Ventas Online &amp; En Vivo</h1>
        <p class="ds-sub">{{ subtitle }}</p>
      </div>
      <div class="ds-head-actions">
        <div class="ds-tabs" role="group" aria-label="Periodo">
          <button v-for="g in GRANULARITIES" :key="g.id" type="button" :aria-pressed="String(gran === g.id)" @click="setQuery({ g: g.id })">{{ g.label }}</button>
        </div>
        <select
          v-if="currentGran.input === QUARTER_INPUT"
          class="ds-input period-input"
          :value="periodInputValue(gran, date)"
          aria-label="Elegir trimestre"
          @change="onPeriodInput($event.target.value)"
        >
          <option v-for="q in quarterOptions(today)" :key="q.value" :value="q.value">{{ q.label }}</option>
        </select>
        <input
          v-else
          class="ds-input period-input"
          :type="currentGran.input"
          :value="periodInputValue(gran, date)"
          :min="currentGran.input === 'number' ? 2020 : undefined"
          :max="currentGran.input === 'number' ? 2100 : undefined"
          :aria-label="`Elegir ${currentGran.label.toLowerCase()}`"
          @change="onPeriodInput($event.target.value)"
        />
      </div>
    </header>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <div class="ds-kpis">
      <template v-if="!sales">
        <div v-for="n in 4" :key="n" class="ds-kpi"><span class="ds-skel"></span></div>
      </template>
      <div v-for="c in cards" v-else :key="c.key" class="ds-kpi" :class="c.linea && `kpi-linea kpi-linea--${c.linea}`">
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
    </div>

    <template v-if="sales">
      <div class="ds-row" :class="trend ? 'ds-row--hero' : 'ds-row--completa'">
        <article v-if="trend" class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title">{{ trend.titulo }}</h3>
            <div class="ds-tabs" role="group" aria-label="Línea en el gráfico">
              <button type="button" :aria-pressed="String(trendLine === null)" @click="trendLine = null">Todos</button>
              <button v-for="s in sales.secciones" :key="s.key" type="button" :aria-pressed="String(trendLine === s.key)" @click="trendLine = s.key">{{ s.label }}</button>
            </div>
          </header>
          <div class="ds-panel-body">
            <ResultChart :grafico="trend.grafico" :alto="280" />
          </div>
        </article>
        <ResultWidget :widget="lineMixWidget(sales)" />
      </div>

      <div class="ds-row ds-row--tercios">
        <ResultWidget v-for="s in sales.secciones" :key="s.key" :widget="rankingWidget(s)" />
      </div>

      <div v-for="(par, i) in pairs(formatWidgets(sales))" :key="'formato-' + i" class="ds-row" :class="par.length === 2 ? 'ds-row--mitad' : 'ds-row--completa'">
        <ResultWidget v-for="w in par" :key="w.titulo" :widget="w" />
      </div>

      <div class="ds-row ds-row--mitad">
        <ResultWidget :widget="typesWidget(sales)" />
        <ResultWidget :widget="membershipWidget(sales)" />
      </div>

      <div v-if="drops" class="ds-row ds-row--completa">
        <ResultWidget :widget="drops" />
      </div>

      <article class="ds-panel">
        <header class="ds-panel-head detalle-head">
          <h3 class="ds-panel-title">Detalle por programa</h3>
          <div class="ds-tabs" role="tablist" aria-label="Línea">
            <button v-for="s in sales.secciones" :key="s.key" type="button" role="tab" :aria-selected="String(detail.key === s.key)" @click="setQuery({ linea: s.key })">{{ s.label }}</button>
          </div>
          <div v-if="typeTabs(detail).length" class="ds-tabs" role="tablist" :aria-label="`Tipo de programa en ${detail.label}`">
            <button v-for="t in typeTabs(detail)" :key="t.id" type="button" role="tab" :aria-selected="String(typeOf(detail.key) === t.id)" @click="selectedType[detail.key] = t.id">{{ t.label }}</button>
          </div>
        </header>
        <div class="ds-panel-body">
          <p v-if="!detail.programas.length" class="ds-empty">Sin ventas de {{ detail.label }} en el periodo. Cambia el periodo arriba.</p>
          <div v-else class="ds-table-scroll">
            <table class="ds-table">
              <thead>
                <tr>
                  <th class="num">#</th>
                  <th>Programa</th>
                  <th>Tipo</th>
                  <th class="num">Ventas</th>
                  <th class="num">Vendido</th>
                  <th class="num">% de la línea</th>
                  <th class="num">{{ prevText(gran) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in ranking.filas" :key="p.program_id" class="link" tabindex="0" @click="openProgram(p)" @keydown.enter="openProgram(p)">
                  <td class="num">{{ p.puesto }}</td>
                  <td>{{ p.programa }}</td>
                  <td>{{ p.tipo }}</td>
                  <td class="num"><strong>{{ formatValue(p.n, 'num') }}</strong></td>
                  <td class="num">{{ formatValue(p.soles, 'soles') }}</td>
                  <td class="num">{{ formatValue(p.pct, 'pct') }}</td>
                  <td class="num"><span class="ds-pill" :class="p.movimiento.tono">{{ p.movimiento.texto }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <footer v-if="ranking.total > TABLE_LIMIT" class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Se muestran {{ TABLE_LIMIT }} de {{ ranking.total }}; filtra por tipo para ver más.</span>
        </footer>
      </article>
      <p class="note">Ventas aprobadas por FICO por F. PAGO, sin becas, RP, B2B ni Fundación: la misma cifra que Finanzas › Ventas y Rentabilidad.</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { toLocalIsoDate } from '@/shared/lib/localDate.js'
import ResultWidget from '@/views/dashboard/ResultWidget.vue'
import ResultChart from '@/views/dashboard/ResultChart.vue'
import { dateFromInput } from '@/features/fico-rentabilidad/rentabilidad.js'
import {
  GRANULARITIES, ALL_TYPES, TABLE_LIMIT, sectionCards, typeTabs, topPrograms,
  trendWidget, lineMixWidget, rankingWidget, typesWidget, membershipWidget,
  formatWidgets, pairs, dropsWidget,
  QUARTER_INPUT, quarterOptions, periodText, prevText, periodInputValue, dateFromPeriodInput
} from '@/features/producto-ventas/productSales.js'

const programService = inject(ServiceKeys.Program)
const route = useRoute()
const router = useRouter()

// Periodo y linea del detalle en la URL: el enlace compartido abre lo mismo.
const today = toLocalIsoDate()
const gran = computed(() => (GRANULARITIES.some(g => g.id === route.query.g) ? route.query.g : 'mes'))
const date = computed(() => dateFromInput('dia', route.query.d) ?? today)
const currentGran = computed(() => GRANULARITIES.find(g => g.id === gran.value))

const setQuery = patch => router.replace({ query: { ...route.query, ...patch } })
function onPeriodInput (value) {
  const next = dateFromPeriodInput(gran.value, value)
  if (next) setQuery({ d: next })
}

const sales = ref(null)
const error = ref('')
const selectedType = reactive({})

async function load () {
  sales.value = null
  error.value = ''
  try {
    sales.value = await programService.ventas({ granularity: gran.value, date: date.value })
  } catch (err) {
    console.error('Error cargando las ventas por producto:', err)
    error.value = 'No se pudieron cargar las ventas. Intenta de nuevo en un momento.'
  }
}
watch([gran, date], load, { immediate: true })

const subtitle = computed(() => {
  const label = periodText(gran.value, date.value)
  return sales.value?.period.partial
    ? `${label} hasta hoy · ${prevText(gran.value)}, a los mismos días`
    : `${label} · ${prevText(gran.value)}`
})
const cards = computed(() => sectionCards(sales.value, gran.value))
// Una linea a la vez para leerla en su escala; "Todos" (null) vuelve a las tres.
const trendLine = ref(null)
const trend = computed(() => trendWidget(sales.value, gran.value, trendLine.value))
const drops = computed(() => dropsWidget(sales.value))
const detail = computed(() => sales.value.secciones.find(s => s.key === route.query.linea) ?? sales.value.secciones[0])
const typeOf = key => selectedType[key] ?? ALL_TYPES
const ranking = computed(() => topPrograms(detail.value, typeOf(detail.value.key)))
const openProgram = p => router.push({ name: 'ProgramEdit', params: { id: p.program_id } })
</script>

<style scoped>
.period-input { width: 150px; }
.detalle-head { flex-wrap: wrap; }
.note { margin: 0; font-size: 12px; color: var(--ds-muted); }
/* Borde de la card con el color de su linea: el mismo del grafico y la dona. */
.kpi-linea { border-left-width: 4px; }
.kpi-linea--envivo { border-left-color: var(--ds-line-envivo); }
.kpi-linea--online { border-left-color: var(--ds-line-online); }
.kpi-linea--membresia { border-left-color: var(--ds-reference); }
</style>
