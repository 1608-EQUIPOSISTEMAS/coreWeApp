<template>
  <div class="ds-stack">
    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-band"><span v-for="n in 4" :key="n" class="ds-skel"></span></div>
      <div class="ds-row ds-row--mitad">
        <div v-for="n in 2" :key="n" class="ds-panel"><div class="ds-panel-body"><span v-for="r in 6" :key="r" class="ds-skel skel-line"></span></div></div>
      </div>
    </template>

    <template v-else-if="actual">
      <LecturaRapida :items="insights" :periodo="monthName(month)" />

      <div class="ds-row ds-row--mitad">
        <article class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">¿Qué semanas llegaron al objetivo?</h3>
              <p class="ds-panel-sub">Vacantes: objetivo contra logro · {{ monthName(month) }}</p>
            </div>
            <div class="leyenda" aria-hidden="true">
              <span><i class="ref"></i>Objetivo</span><span><i class="ok"></i>Cumple</span><span><i class="rose"></i>No cumple</span>
            </div>
          </header>
          <div class="ds-panel-body">
            <ColumnChart :groups="semanasChart" aria-label="Vacantes por semana, objetivo contra logro" />
          </div>
        </article>

        <article class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">¿Cómo venimos mes a mes?</h3>
              <p class="ds-panel-sub">% de logro sobre el objetivo · elige un mes para ver su detalle</p>
            </div>
            <div class="leyenda" aria-hidden="true">
              <span><i class="accent"></i>Vacantes</span><span><i class="accent-2"></i>Ingresos</span>
            </div>
          </header>
          <div class="ds-panel-body">
            <ColumnChart
              :groups="mesesChart"
              :bar-width="12"
              :reference="1"
              reference-label="100%"
              selectable
              aria-label="Cumplimiento mensual de vacantes e ingresos"
              @select="$emit('select-month', $event)"
            />
          </div>
        </article>
      </div>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">Detalle semanal de {{ monthName(month).toLowerCase() }}</h3>
            <p class="ds-panel-sub">Planificado, avance de vacantes y avance de ingresos. Los dólares se pasan a soles a {{ usdToPen }}.</p>
          </div>
        </header>
        <div class="ds-panel-body ds-table-scroll">
          <table class="ds-table tabla-semanal">
            <thead>
              <tr class="grupos">
                <th colspan="2">Semana</th>
                <th colspan="3" class="sep">Planificado</th>
                <th colspan="2" class="sep">Avance de vacantes</th>
                <th colspan="5" class="sep">Avance de ingresos</th>
              </tr>
              <tr>
                <th>Sem.</th><th>Días</th>
                <th class="num sep">% part.</th><th class="num">Obj. #</th><th class="num">Obj. S/</th>
                <th class="num sep">Logro</th><th class="num">% cumpl.</th>
                <th class="num sep">% part.</th><th class="num">Soles</th><th class="num">Dólares</th><th class="num">Total S/</th><th class="num">% cumpl.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in actual.weeks" :key="w.date_start">
                <td>{{ w.week_label }}</td>
                <td>{{ periodOf(w) }}</td>
                <td class="num sep">{{ fmtPct(w.part_obj) }}</td>
                <td class="num">{{ formatValue(w.obj_vacantes, 'num') }}</td>
                <td class="num">{{ formatValue(w.obj_ingresos, 'soles') }}</td>
                <td class="num sep fuerte">{{ formatValue(w.vacantes, 'num') }}</td>
                <td class="num"><span class="ds-pill" :class="goalTone(w.cumplimiento)">{{ fmtPct(w.cumplimiento) }}</span></td>
                <td class="num sep">{{ fmtPct(w.part_ingresos) }}</td>
                <td class="num">{{ formatValue(w.ingresos_pen, 'soles') }}</td>
                <td class="num">{{ formatValue(w.ingresos_usd, 'usd') }}</td>
                <td class="num fuerte">{{ formatValue(w.ingresos, 'soles') }}</td>
                <td class="num"><span class="ds-pill" :class="goalTone(w.cumplimiento_ingresos)">{{ fmtPct(w.cumplimiento_ingresos) }}</span></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">Total del mes</td>
                <td class="num sep">{{ actual.obj_vacantes ? '100%' : '—' }}</td>
                <td class="num">{{ formatValue(actual.obj_vacantes, 'num') }}</td>
                <td class="num">{{ formatValue(actual.obj_ingresos, 'soles') }}</td>
                <td class="num sep">{{ formatValue(actual.vacantes, 'num') }}</td>
                <td class="num"><span class="ds-pill" :class="goalTone(actual.cumplimiento)">{{ fmtPct(actual.cumplimiento) }}</span></td>
                <td class="num sep">{{ actual.ingresos ? '100%' : '—' }}</td>
                <td class="num">{{ formatValue(actual.ingresos_pen, 'soles') }}</td>
                <td class="num">{{ formatValue(actual.ingresos_usd, 'usd') }}</td>
                <td class="num">{{ formatValue(actual.ingresos, 'soles') }}</td>
                <td class="num"><span class="ds-pill" :class="goalTone(actual.cumplimiento_ingresos)">{{ fmtPct(actual.cumplimiento_ingresos) }}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </template>

    <p v-else class="ds-alert neutro">No hay datos de {{ monthName(month).toLowerCase() }}. Elige otro mes arriba.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { monthTotals, objetivosInsights, goalTone, pct, periodOf, monthName, monthShort } from '@/features/plan-comercial/planComercial'
import LecturaRapida from './LecturaRapida.vue'
import ColumnChart from './ColumnChart.vue'

const props = defineProps({
  month: { type: String, required: true },
  reloadKey: { type: Number, default: 0 }
})
defineEmits(['select-month'])

const service = inject(ServiceKeys.PlanComercial)
const data = ref(null)
const loading = ref(false)
const error = ref('')

const year = computed(() => Number(props.month.slice(0, 4)))

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    data.value = await service.objetivos(year.value)
  } catch (err) {
    console.error('[PlanComercial] objetivos', { year: year.value, err })
    error.value = err?.response?.data?.message || 'No se pudieron cargar los objetivos. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
// Cambiar de mes dentro del mismo año no vuelve a pedir nada: el año ya está.
watch([year, () => props.reloadKey], cargar, { immediate: true })

const usdToPen = computed(() => data.value?.usd_to_pen ?? 0)
const totales = computed(() => (data.value?.months ?? []).map((m) => monthTotals(m, usdToPen.value)))
const indice = computed(() => totales.value.findIndex((m) => m.month_start === props.month))
const actual = computed(() => totales.value[indice.value] ?? null)
const insights = computed(() => (actual.value ? objetivosInsights(totales.value, indice.value) : []))

const fmtPct = (ratio) => formatValue(pct(ratio), 'pct')

const semanasChart = computed(() => actual.value.weeks.map((w) => ({
  key: w.date_start,
  label: w.week_label,
  sub: periodOf(w),
  bars: [
    { value: w.obj_vacantes ?? 0, tone: 'ref', label: w.obj_vacantes ?? undefined },
    { value: w.vacantes, tone: w.obj_vacantes ? goalTone(w.cumplimiento) : 'bar', label: w.vacantes }
  ]
})))

const mesesChart = computed(() => totales.value.map((m) => ({
  key: m.month_start,
  label: monthShort(m.month_start),
  sub: `${fmtPct(m.cumplimiento)} · ${fmtPct(m.cumplimiento_ingresos)}`,
  selected: m.month_start === props.month,
  bars: [
    { value: m.cumplimiento ?? 0, tone: 'accent' },
    { value: m.cumplimiento_ingresos ?? 0, tone: 'accent-2' }
  ]
})))
</script>

<style scoped>
.skel-line { margin: 10px 0; }
.leyenda { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11.5px; color: var(--ds-ink-2); }
.leyenda span { display: inline-flex; align-items: center; gap: 5px; }
.leyenda i { width: 10px; height: 10px; border-radius: 2px; background: var(--ds-bar); }
.leyenda i.ref { background: var(--ds-reference); }
.leyenda i.ok { background: var(--ds-ok); }
.leyenda i.rose { background: var(--ds-rose); }
.leyenda i.accent { background: var(--ds-accent); }
.leyenda i.accent-2 { background: var(--ds-accent-2); }

.tabla-semanal { min-width: 980px; }
.tabla-semanal .grupos th { padding-top: 0; font-size: 11px; font-weight: 700; color: var(--ds-heading); }
.tabla-semanal .sep { border-left: 1px solid var(--ds-border); padding-left: 12px; }
.tabla-semanal td.fuerte { font-weight: 700; color: var(--ds-ink); }
.tabla-semanal tfoot td { font-weight: 700; color: var(--ds-heading); background: var(--ds-surface-2); border-top: 1px solid var(--ds-border-strong); }
</style>
