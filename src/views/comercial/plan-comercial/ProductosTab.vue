<template>
  <div class="ds-stack">
    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-kpis"><span v-for="n in 3" :key="n" class="ds-skel kpi-skel"></span></div>
      <div class="ds-panel"><div class="ds-panel-body"><span v-for="r in 6" :key="r" class="ds-skel skel-line"></span></div></div>
    </template>

    <template v-else-if="filas.length">
      <div class="ds-kpis">
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-cart-shopping"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(total.ventas, 'num') }}</span>
            <span class="ds-kpi-label">Ventas online de {{ monthName(month).toLowerCase() }}</span>
            <span class="ds-kpi-note">{{ total.obj === null ? 'Sin objetivo cargado' : `Objetivo: ${formatValue(total.obj, 'num')}` }}</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" :class="KPI_TONE[goalTone(total.cumplimiento)]" aria-hidden="true"><i class="fa-solid fa-bullseye"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ fmtPct(total.cumplimiento) }}</span>
            <span class="ds-kpi-label">Cumplimiento del objetivo</span>
            <span class="ds-kpi-note">Solo productos con objetivo</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-trophy"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ lider ? lider.label : '—' }}</span>
            <span class="ds-kpi-label">Producto que más vende</span>
            <span class="ds-kpi-note">{{ lider ? `${formatValue(lider.ventas, 'num')} ventas` : 'Sin ventas en el mes' }}</span>
          </div>
        </div>
      </div>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">Ventas por producto</h3>
            <p class="ds-panel-sub">Contra el objetivo del mes, por canal y por tipo de cliente. Sin dato = venta sin consulta registrada (casi siempre la web).</p>
          </div>
        </header>
        <div class="ds-panel-body ds-table-scroll">
          <table class="ds-table tabla-productos">
            <thead>
              <tr class="grupos">
                <th></th>
                <th colspan="3" class="sep">Objetivo</th>
                <th colspan="4" class="sep">Canal</th>
                <th colspan="4" class="sep">Tipo de cliente</th>
              </tr>
              <tr>
                <th>Producto</th>
                <th class="num sep">Obj.</th><th class="num">Ventas</th><th class="num">% cumpl.</th>
                <th class="num sep">Mkt</th><th class="num">Com</th><th class="num">WEB</th><th class="num">Otros</th>
                <th class="num sep">Nuevo</th><th class="num">Lead</th><th class="num">Comunidad</th><th class="num">Sin dato</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in filas" :key="f.product">
                <td class="fuerte">{{ f.label }}</td>
                <td class="num sep">{{ formatValue(f.obj, 'num') }}</td>
                <td class="num fuerte">{{ formatValue(f.ventas, 'num') }}</td>
                <td class="num"><span class="ds-pill" :class="goalTone(f.cumplimiento)">{{ fmtPct(f.cumplimiento) }}</span></td>
                <td v-for="(k, i) in CANALES" :key="k" class="num" :class="{ sep: i === 0 }">{{ formatValue(f.canal[k], 'num') }}</td>
                <td v-for="(k, i) in TIPOS" :key="k" class="num" :class="{ sep: i === 0, suave: k === 'SIN_DATO' }">{{ formatValue(f.tipo[k], 'num') }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td class="num sep">{{ formatValue(total.obj, 'num') }}</td>
                <td class="num">{{ formatValue(total.ventas, 'num') }}</td>
                <td class="num"><span class="ds-pill" :class="goalTone(total.cumplimiento)">{{ fmtPct(total.cumplimiento) }}</span></td>
                <td v-for="(k, i) in CANALES" :key="k" class="num" :class="{ sep: i === 0 }">{{ formatValue(sumBy((f) => f.canal[k]), 'num') }}</td>
                <td v-for="(k, i) in TIPOS" :key="k" class="num" :class="{ sep: i === 0 }">{{ formatValue(sumBy((f) => f.tipo[k]), 'num') }}</td>
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
import { compliance, goalTone, pct, monthName, ONLINE_PRODUCTS } from '@/features/plan-comercial/planComercial'

const props = defineProps({
  month: { type: String, required: true },
  reloadKey: { type: Number, default: 0 }
})

const CANALES = ['MKT', 'COM', 'WEB', 'OTROS']
const TIPOS = ['NEW', 'LDS', 'CWE', 'SIN_DATO']
const KPI_TONE = { ok: 'ok', rose: 'warn', neutro: '' }

const service = inject(ServiceKeys.PlanComercial)
const data = ref(null)
const loading = ref(false)
const error = ref('')

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    data.value = await service.productos(props.month)
  } catch (err) {
    console.error('[PlanComercial] productos', { month: props.month, err })
    error.value = err?.response?.data?.message || 'No se pudieron cargar las ventas por producto. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch(() => [props.month, props.reloadKey], cargar, { immediate: true })

const labelOf = Object.fromEntries(ONLINE_PRODUCTS.map((p) => [p.id, p.label]))
const filas = computed(() => (data.value?.productos ?? []).map((f) => ({
  ...f, label: labelOf[f.product], cumplimiento: compliance(f.ventas, f.obj)
})))
const sumBy = (pick) => filas.value.reduce((s, f) => s + pick(f), 0)

// El cumplimiento total solo mira los productos con objetivo: sumar ventas sin
// meta contra la meta de otros lo inflaría.
const total = computed(() => {
  const conObj = filas.value.filter((f) => f.obj !== null)
  const obj = conObj.length ? conObj.reduce((s, f) => s + f.obj, 0) : null
  return { obj, ventas: sumBy((f) => f.ventas), cumplimiento: compliance(conObj.reduce((s, f) => s + f.ventas, 0), obj) }
})
const lider = computed(() => [...filas.value].sort((a, b) => b.ventas - a.ventas).find((f) => f.ventas > 0) ?? null)

const fmtPct = (ratio) => formatValue(pct(ratio), 'pct')
</script>

<style scoped>
.skel-line { margin: 10px 0; }
.kpi-skel { height: 78px; }
.tabla-productos { min-width: 900px; }
.tabla-productos .grupos th { padding-top: 0; font-size: 11px; font-weight: 700; color: var(--ds-heading); text-align: center; }
.tabla-productos .sep { border-left: 1px solid var(--ds-border); padding-left: 12px; }
.tabla-productos td.fuerte { font-weight: 700; color: var(--ds-ink); }
.tabla-productos td.suave { color: var(--ds-muted); }
.tabla-productos tfoot td { font-weight: 700; color: var(--ds-heading); background: var(--ds-surface-2); border-top: 1px solid var(--ds-border-strong); }
</style>
