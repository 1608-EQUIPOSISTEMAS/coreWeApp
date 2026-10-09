<template>
  <div class="ds-stack">
    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-kpis"><span v-for="n in 3" :key="n" class="ds-skel kpi-skel"></span></div>
      <div class="ds-row ds-row--mitad">
        <div v-for="n in 2" :key="n" class="ds-panel"><div class="ds-panel-body"><span v-for="r in 6" :key="r" class="ds-skel skel-line"></span></div></div>
      </div>
    </template>

    <template v-else-if="actual">
      <div class="ds-kpis">
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-cart-shopping"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(actual.ventas, 'num') }}</span>
            <span class="ds-kpi-label">Ventas de {{ monthName(month).toLowerCase() }}</span>
            <span class="ds-kpi-note">Por F. pago, sin B2B, eventos ni RP/CC</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-user-check"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(actual.cwe, 'num') }}</span>
            <span class="ds-kpi-label">De clientes que ya compraron</span>
            <span class="ds-kpi-note">{{ formatValue(actual.ventas - actual.cwe, 'num') }} de clientes nuevos</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-rotate"></i></span>
          <div class="ds-kpi-body">
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ fmtPct(tasa(actual)) }}</span>
              <span v-if="variacion !== null" class="ds-trend" :class="variacion > 0 ? 'ok' : variacion < 0 ? 'bad' : ''">
                {{ variacion > 0 ? '↑' : variacion < 0 ? '↓' : '=' }} {{ Math.abs(variacion) }} pts
              </span>
            </div>
            <span class="ds-kpi-label">Re-compra</span>
            <span class="ds-kpi-note">{{ anterior ? `${monthName(anterior.month_start)}: ${fmtPct(tasa(anterior))}` : 'Primer mes del año' }}</span>
          </div>
        </div>
      </div>

      <div class="ds-row ds-row--mitad">
        <article class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">Re-compra semana a semana</h3>
              <p class="ds-panel-sub">{{ monthName(month) }} · semanas recortadas al mes</p>
            </div>
          </header>
          <div class="ds-panel-body ds-table-scroll">
            <table class="ds-table">
              <thead>
                <tr><th>Sem.</th><th>Días</th><th class="num">Ventas</th><th class="num">Clientes WE</th><th class="num">Re-compra</th></tr>
              </thead>
              <tbody>
                <tr v-for="w in actual.weeks" :key="w.date_start">
                  <td>{{ w.week_label }}</td>
                  <td>{{ periodOf(w) }}</td>
                  <td class="num">{{ formatValue(w.ventas, 'num') }}</td>
                  <td class="num">{{ formatValue(w.cwe, 'num') }}</td>
                  <td class="num fuerte">{{ fmtPct(tasa(w)) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2">Total del mes</td>
                  <td class="num">{{ formatValue(actual.ventas, 'num') }}</td>
                  <td class="num">{{ formatValue(actual.cwe, 'num') }}</td>
                  <td class="num">{{ fmtPct(tasa(actual)) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </article>

        <article class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">¿Cómo va la re-compra mes a mes?</h3>
              <p class="ds-panel-sub">% de ventas de clientes que ya compraron · elige un mes para ver sus semanas</p>
            </div>
          </header>
          <div class="ds-panel-body">
            <ColumnChart
              :groups="mesesChart"
              :bar-width="16"
              selectable
              aria-label="Re-compra por mes"
              @select="$emit('select-month', $event)"
            />
          </div>
        </article>
      </div>
    </template>

    <p v-else class="ds-alert neutro">{{ monthName(month) }} todavía no empieza. Elige otro mes arriba.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { compliance, pct, periodOf, monthName, monthShort } from '@/features/plan-comercial/planComercial'
import ColumnChart from './ColumnChart.vue'

// Re-compra = ventas de personas que ya habían comprado antes (en el ERP o en
// el histórico por teléfono), sin límite de tiempo. La regla vive en el backend.
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
    data.value = await service.recompra(year.value)
  } catch (err) {
    console.error('[PlanComercial] recompra', { year: year.value, err })
    error.value = err?.response?.data?.message || 'No se pudo cargar la re-compra. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch([year, () => props.reloadKey], cargar, { immediate: true })

const meses = computed(() => data.value?.months ?? [])
const indice = computed(() => meses.value.findIndex((m) => m.month_start === props.month))
const actual = computed(() => meses.value[indice.value] ?? null)
const anterior = computed(() => (indice.value > 0 ? meses.value[indice.value - 1] : null))

const tasa = (r) => compliance(r.cwe, r.ventas)
const fmtPct = (ratio) => formatValue(pct(ratio), 'pct')
const variacion = computed(() => {
  if (!anterior.value) return null
  const a = pct(tasa(actual.value))
  const b = pct(tasa(anterior.value))
  return a === null || b === null ? null : a - b
})

const mesesChart = computed(() => meses.value.map((m) => ({
  key: m.month_start,
  label: monthShort(m.month_start),
  sub: fmtPct(tasa(m)),
  selected: m.month_start === props.month,
  bars: [{ value: pct(tasa(m)) ?? 0, tone: 'accent' }]
})))
</script>

<style scoped>
.skel-line { margin: 10px 0; }
.kpi-skel { height: 78px; }
.ds-table td.fuerte { font-weight: 700; color: var(--ds-ink); }
.ds-table tfoot td { font-weight: 700; color: var(--ds-heading); background: var(--ds-surface-2); border-top: 1px solid var(--ds-border-strong); }
</style>
