<template>
  <section class="ds-panel">
    <div class="cxc-toolbar">
      <div class="cxc-year" role="group" aria-label="Año">
        <button class="btn-icon btn-icon-sm" type="button" title="Año anterior" aria-label="Año anterior" @click="year--">
          <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
        <strong class="cxc-year-label">{{ year }}</strong>
        <button class="btn-icon btn-icon-sm" type="button" title="Año siguiente" aria-label="Año siguiente" @click="year++">
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
      <span class="cxc-note">Saldo de cuotas de ventas aprobadas por FICO, por mes de vencimiento. Sin inicial, anuladas ni retiros/RP/CC.</span>
    </div>

    <div class="cxc-kpis">
      <div v-for="k in KPI_CARDS" :key="k.key" class="cxc-kpi" :class="k.key">
        <span class="cxc-kpi-label">{{ k.label }}</span>
        <div class="cxc-kpi-values">
          <span v-if="loading" class="skel-kpi"></span>
          <template v-else>
            <span class="cxc-kpi-main mono">S/ {{ fmt(data?.kpis?.[k.key]?.pen) }}</span>
            <span class="cxc-kpi-sub mono">$ {{ fmt(data?.kpis?.[k.key]?.usd) }}</span>
          </template>
        </div>
        <span class="cxc-kpi-note">{{ k.note }}</span>
      </div>
    </div>

    <p v-if="loading" class="ds-empty ds-empty--lista">Cargando…</p>
    <div v-else-if="data" class="ds-table-scroll cxc-wrap">
      <table class="cxc-table">
        <thead>
          <tr>
            <th>Mes</th>
            <th>Programa</th>
            <th class="num">PEN <span class="cur">S/</span></th>
            <th class="num">USD <span class="cur">$</span></th>
          </tr>
        </thead>
        <tbody v-for="m in data.months" :key="m.month">
          <tr v-for="(l, i) in m.lines" :key="l.key">
            <th v-if="i === 0" :rowspan="m.lines.length + 1" scope="rowgroup" class="cxc-month">
              <strong>{{ MONTHS[m.month - 1] }}</strong>
            </th>
            <td class="cxc-line">{{ l.label }}</td>
            <td class="num mono" :class="{ zero: !l.pen }">{{ fmt(l.pen) }}</td>
            <td class="num mono" :class="{ zero: !l.usd }">{{ fmt(l.usd) }}</td>
          </tr>
          <tr class="cxc-subtotal">
            <td>Total {{ MONTHS[m.month - 1] }}</td>
            <td class="num mono">{{ fmt(m.total.pen) }}</td>
            <td class="num mono">{{ fmt(m.total.usd) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="cxc-grand">
            <th colspan="2">Total {{ year }}</th>
            <td class="num mono">{{ fmt(data.total.pen) }}</td>
            <td class="num mono">{{ fmt(data.total.usd) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const KPI_CARDS = [
  { key: 'projected', label: 'Ingreso proyectado', note: 'Monto de las cuotas que vencen en el año' },
  { key: 'received', label: 'Ingreso recibido', note: 'Lo ya pagado de esas cuotas' },
  { key: 'debt', label: 'Monto deuda', note: 'Lo que falta cobrar (suma del cuadro)' }
]

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()
const year = ref(new Date().getFullYear())
const data = ref(null)
const loading = ref(false)

const fmt = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function load () {
  loading.value = true
  try {
    data.value = await ficoService.getReceivablesSummary({ year: year.value })
  } catch (err) {
    console.error('[CxcSummary]', err)
    toast.error(err?.response?.data?.message || 'No se pudo cargar la CxC.')
    data.value = null
  } finally {
    loading.value = false
  }
}

watch(year, load)
onMounted(load)
</script>

<style scoped>
.cxc-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding: 12px 18px; border-bottom: 1px solid var(--ds-border); }
.cxc-year { display: inline-flex; align-items: center; gap: 6px; }
.cxc-year-label { min-width: 44px; text-align: center; color: var(--ds-heading); }
.cxc-note { flex: 1; min-width: 200px; font-size: 12px; color: var(--ds-muted); }

.cxc-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; padding: 16px 18px; }
.cxc-kpi { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border: 1px solid var(--ds-border); border-left: 4px solid var(--ds-border); border-radius: 10px; background: var(--ds-surface); }
.cxc-kpi.projected { border-left-color: #1b2a4e; }
.cxc-kpi.received { border-left-color: var(--ds-good, #2e9e6a); }
.cxc-kpi.debt { border-left-color: var(--ds-bad, #d64545); }
.cxc-kpi-label { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--ds-ink-2); }
.cxc-kpi-values { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; min-height: 26px; }
.cxc-kpi-main { font-size: 20px; font-weight: 800; color: var(--ds-heading); }
.cxc-kpi-sub { font-size: 13px; font-weight: 600; color: var(--ds-ink-2); }
.cxc-kpi-note { font-size: 11.5px; color: var(--ds-muted); }

.cxc-wrap { padding: 0 18px 18px; }
.cxc-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; border-radius: 10px; overflow: hidden; }
.cxc-table thead th { padding: 12px 16px; background: #1b2a4e; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; text-align: left; }
.cxc-table thead .cur { opacity: .6; }
.cxc-table td { padding: 10px 16px; border-bottom: 1px solid var(--ds-border); background: var(--ds-surface); }
.cxc-table .num { text-align: right; }
.cxc-month { width: 170px; padding: 14px 16px; vertical-align: top; text-align: left; background: var(--ds-surface-2); border-bottom: 4px solid var(--ds-surface-2); }
.cxc-month strong { display: block; font-size: 12.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--ds-heading); }
.cxc-line { font-weight: 600; color: var(--ds-heading); }
.cxc-table td.zero { color: var(--ds-muted); opacity: .7; }
.cxc-subtotal td { padding: 12px 16px; background: #e3ecf9; font-weight: 800; color: var(--ds-heading); border-bottom: 4px solid var(--ds-surface-2); }
.cxc-subtotal td:first-child { font-size: 11.5px; letter-spacing: .04em; text-transform: uppercase; }
.cxc-subtotal td.num { font-size: 13.5px; }
.cxc-grand th, .cxc-grand td { padding: 14px 16px; background: #1b2a4e; color: #fff; font-weight: 800; font-size: 13.5px; text-align: left; text-transform: uppercase; }
.cxc-grand td.num { text-align: right; }
.mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.skel-kpi { display: inline-block; width: 140px; height: 20px; border-radius: 6px; background: var(--ds-surface-3); }
</style>
