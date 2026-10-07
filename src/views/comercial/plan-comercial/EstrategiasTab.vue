<template>
  <div class="ds-stack">
    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-kpis"><span v-for="n in 3" :key="n" class="ds-skel kpi-skel"></span></div>
      <div class="ds-panel"><div class="ds-panel-body"><span v-for="r in 6" :key="r" class="ds-skel skel-line"></span></div></div>
    </template>

    <template v-else-if="data">
      <div class="ds-kpis">
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-comments"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(data.total.consultas, 'num') }}</span>
            <span class="ds-kpi-label">Consultas con estrategia</span>
            <span class="ds-kpi-note">Registradas en {{ monthName(month).toLowerCase() }}</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-cart-shopping"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(data.total.ventas, 'num') }}</span>
            <span class="ds-kpi-label">Ventas de esas estrategias</span>
            <span class="ds-kpi-note">Pagadas en el mes</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" :class="KPI_TONE[conversionTone(data.total.conversion)]" aria-hidden="true"><i class="fa-solid fa-percent"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ fmtPct(data.total.conversion) }}</span>
            <span class="ds-kpi-label">Conversión</span>
            <span class="ds-kpi-note">Meta {{ CONVERSION_GOAL_PCT }}%</span>
          </div>
        </div>
      </div>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">¿Qué estrategia trae más ventas?</h3>
            <p class="ds-panel-sub">
              Consultas registradas y ventas pagadas en el mes. Una venta puede venir de una consulta de otro mes, por eso la conversión puede pasar del 100%.
              Toca una estrategia para ver sus programas.
            </p>
          </div>
        </header>
        <div class="ds-panel-body ds-table-scroll">
          <table v-if="data.estrategias.length" class="ds-table tabla-estrategias">
            <thead>
              <tr><th>Estrategia</th><th class="num">Consultas</th><th class="num">Ventas</th><th class="num">Conversión</th></tr>
            </thead>
            <tbody>
              <template v-for="e in data.estrategias" :key="e.estrategia">
                <tr class="fila-estrategia" :aria-expanded="String(abierta === e.estrategia)" tabindex="0" @click="alternar(e.estrategia)" @keydown.enter="alternar(e.estrategia)">
                  <td>
                    <i class="fa-solid caret" :class="abierta === e.estrategia ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i>
                    {{ e.estrategia }}
                  </td>
                  <td class="num">{{ formatValue(e.consultas, 'num') }}</td>
                  <td class="num fuerte">{{ formatValue(e.ventas, 'num') }}</td>
                  <td class="num"><span class="ds-pill" :class="conversionTone(e.conversion)">{{ fmtPct(e.conversion) }}</span></td>
                </tr>
                <template v-if="abierta === e.estrategia">
                  <tr v-for="p in e.programas" :key="p.programa" class="fila-programa">
                    <td>{{ p.programa }}</td>
                    <td class="num">{{ formatValue(p.consultas, 'num') }}</td>
                    <td class="num">{{ formatValue(p.ventas, 'num') }}</td>
                    <td class="num">{{ fmtPct(p.consultas ? p.ventas / p.consultas : null) }}</td>
                  </tr>
                </template>
              </template>
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td class="num">{{ formatValue(data.total.consultas, 'num') }}</td>
                <td class="num">{{ formatValue(data.total.ventas, 'num') }}</td>
                <td class="num">{{ fmtPct(data.total.conversion) }}</td>
              </tr>
            </tfoot>
          </table>
          <p v-else class="ds-empty">Ninguna consulta de {{ monthName(month).toLowerCase() }} tiene estrategia.</p>
        </div>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { pct, monthName, conversionTone, CONVERSION_GOAL_PCT } from '@/features/plan-comercial/planComercial'

// Reemplaza "7. Reporte de Estrategias": la estrategia es la de la consulta
// (leads.cat_type_strategy) y la venta la hereda. Sin objetivos por ahora.
const props = defineProps({
  month: { type: String, required: true },
  reloadKey: { type: Number, default: 0 }
})

const KPI_TONE = { ok: 'ok', warn: 'warn', bad: 'bad', neutro: '' }

const service = inject(ServiceKeys.PlanComercial)
const data = ref(null)
const loading = ref(false)
const error = ref('')
const abierta = ref(null)

async function cargar () {
  loading.value = true
  error.value = ''
  abierta.value = null
  try {
    data.value = await service.estrategias(props.month)
  } catch (err) {
    console.error('[PlanComercial] estrategias', { month: props.month, err })
    error.value = err?.response?.data?.message || 'No se pudieron cargar las estrategias. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch(() => [props.month, props.reloadKey], cargar, { immediate: true })

const alternar = (estrategia) => { abierta.value = abierta.value === estrategia ? null : estrategia }
const fmtPct = (ratio) => formatValue(pct(ratio), 'pct')
</script>

<style scoped>
.skel-line { margin: 10px 0; }
.kpi-skel { height: 78px; }
.tabla-estrategias { min-width: 520px; }
.fila-estrategia { cursor: pointer; }
.fila-estrategia:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.caret { width: 14px; margin-right: 6px; font-size: 10px; color: var(--ds-muted); }
.fila-programa td { font-size: 12px; color: var(--ds-ink-2); background: var(--ds-surface-2); }
.fila-programa td:first-child { padding-left: 34px; }
.tabla-estrategias td.fuerte { font-weight: 700; color: var(--ds-ink); }
.tabla-estrategias tfoot td { font-weight: 700; color: var(--ds-heading); background: var(--ds-surface-2); border-top: 1px solid var(--ds-border-strong); }
</style>
