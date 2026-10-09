<template>
  <div class="ds-stack">
    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-kpis"><span v-for="n in 3" :key="n" class="ds-skel kpi-skel"></span></div>
      <div class="ds-panel"><div class="ds-panel-body"><span v-for="r in 8" :key="r" class="ds-skel skel-line"></span></div></div>
    </template>

    <template v-else-if="data">
      <div class="ds-kpis">
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-cart-shopping"></i></span>
          <div class="ds-kpi-body">
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ formatValue(totalAnio, 'num') }}</span>
              <span v-if="variacion !== null" class="ds-trend" :class="variacion >= 0 ? 'ok' : 'bad'">{{ variacion >= 0 ? '↑' : '↓' }} {{ Math.abs(variacion) }}%</span>
            </div>
            <span class="ds-kpi-label">Ventas de {{ year }}</span>
            <span class="ds-kpi-note">{{ anterior ? `${anterior.year}, mismos meses: ${formatValue(mismoPeriodoAnterior, 'num')}` : 'Sin año anterior en el ERP' }}</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-calendar-check"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ mejorMes ? monthName(mejorMes.mes) : '—' }}</span>
            <span class="ds-kpi-label">Mejor mes</span>
            <span class="ds-kpi-note">{{ mejorMes ? `${formatValue(mejorMes.n, 'num')} ventas` : 'Sin ventas' }}</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-trophy"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ lider ? lider.alias || lider.nombre : '—' }}</span>
            <span class="ds-kpi-label">Asesor que más vende</span>
            <span class="ds-kpi-note">{{ lider ? `${fmtPct(lider.participacion)} de las ventas del año` : 'Sin ventas' }}</span>
          </div>
        </div>
      </div>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">¿Vendemos más que el año pasado?</h3>
            <p class="ds-panel-sub">Ventas por mes de F. pago. El ERP tiene ventas desde septiembre de 2025.</p>
          </div>
          <div class="leyenda" aria-hidden="true">
            <span v-for="c in data.curva" :key="c.year"><i :class="c.year === year ? 'accent' : 'ref'"></i>{{ c.year }}</span>
          </div>
        </header>
        <div class="ds-panel-body">
          <ColumnChart :groups="curvaChart" :bar-width="12" aria-label="Ventas por mes, año contra año" />
        </div>
      </article>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">Ventas por asesor, mes a mes</h3>
            <p class="ds-panel-sub">{{ year }} · la venta web va a WEB aunque traiga asesor · % = participación en el año</p>
          </div>
        </header>
        <div class="ds-panel-body ds-table-scroll">
          <table class="ds-table tabla-anual">
            <thead>
              <tr>
                <th>Mes</th>
                <th v-for="a in data.asesores" :key="a.id ?? 'sin'" class="num" :title="a.nombre">{{ a.alias || a.nombre }}</th>
                <th class="num sep">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in MESES" :key="m">
                <td>{{ monthName(m) }}</td>
                <td v-for="a in data.asesores" :key="a.id ?? 'sin'" class="num" :class="{ suave: !a.meses[i] }">{{ a.meses[i] ? formatValue(a.meses[i], 'num') : '—' }}</td>
                <td class="num sep fuerte">{{ formatValue(data.total[i], 'num') }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td v-for="a in data.asesores" :key="a.id ?? 'sin'" class="num">{{ formatValue(a.total, 'num') }}</td>
                <td class="num sep">{{ formatValue(totalAnio, 'num') }}</td>
              </tr>
              <tr>
                <td>% del año</td>
                <td v-for="a in data.asesores" :key="a.id ?? 'sin'" class="num">{{ fmtPct(a.participacion) }}</td>
                <td class="num sep">{{ totalAnio ? '100%' : '—' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { pct, monthName, monthShort } from '@/features/plan-comercial/planComercial'
import ColumnChart from './ColumnChart.vue'

// Reemplaza "6. Reporte General" (Curva V + V Asesoras). Las reglas viven en
// el backend (annualReport); aquí solo se pinta.
const props = defineProps({
  month: { type: String, required: true },
  reloadKey: { type: Number, default: 0 }
})

const service = inject(ServiceKeys.PlanComercial)
const data = ref(null)
const loading = ref(false)
const error = ref('')

const year = computed(() => Number(props.month.slice(0, 4)))
const MESES = computed(() => Array.from({ length: 12 }, (_, i) => `${year.value}-${String(i + 1).padStart(2, '0')}-01`))

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    data.value = await service.anual(year.value)
  } catch (err) {
    console.error('[PlanComercial] anual', { year: year.value, err })
    error.value = err?.response?.data?.message || 'No se pudo cargar el reporte anual. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch([year, () => props.reloadKey], cargar, { immediate: true })

const fmtPct = (ratio) => formatValue(pct(ratio), 'pct')
const totalAnio = computed(() => (data.value?.total ?? []).reduce((s, x) => s + x, 0))
const anterior = computed(() => data.value?.curva.find((c) => c.year === year.value - 1) ?? null)

// Contra el año anterior solo en los meses que este año ya tiene ventas: comparar
// un año en curso con uno cerrado siempre daría caída.
const mesesConVenta = computed(() => (data.value?.total ?? []).map((n, i) => (n > 0 ? i : -1)).filter((i) => i >= 0))
const mismoPeriodoAnterior = computed(() => (anterior.value ? mesesConVenta.value.reduce((s, i) => s + anterior.value.meses[i], 0) : 0))
const variacion = computed(() => (mismoPeriodoAnterior.value ? Math.round(((totalAnio.value - mismoPeriodoAnterior.value) / mismoPeriodoAnterior.value) * 100) : null))

const mejorMes = computed(() => {
  const t = data.value?.total ?? []
  const n = Math.max(0, ...t)
  return n ? { mes: MESES.value[t.indexOf(n)], n } : null
})
const lider = computed(() => data.value?.asesores[0] ?? null)

const curvaChart = computed(() => MESES.value.map((m, i) => ({
  key: m,
  label: monthShort(m),
  bars: (data.value?.curva ?? []).map((c) => ({ value: c.meses[i], tone: c.year === year.value ? 'accent' : 'ref', label: c.meses[i] || undefined }))
})))
</script>

<style scoped>
.skel-line { margin: 10px 0; }
.kpi-skel { height: 78px; }
.leyenda { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11.5px; color: var(--ds-ink-2); }
.leyenda span { display: inline-flex; align-items: center; gap: 5px; }
.leyenda i { width: 10px; height: 10px; border-radius: 2px; background: var(--ds-reference); }
.leyenda i.accent { background: var(--ds-accent); }
.tabla-anual { min-width: 720px; }
.tabla-anual .sep { border-left: 1px solid var(--ds-border); padding-left: 12px; }
.tabla-anual td.fuerte { font-weight: 700; color: var(--ds-ink); }
.tabla-anual td.suave { color: var(--ds-muted); }
.tabla-anual tfoot td { font-weight: 700; color: var(--ds-heading); background: var(--ds-surface-2); border-top: 1px solid var(--ds-border-strong); }
</style>
