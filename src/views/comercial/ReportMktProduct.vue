<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Ventas por canal</h1>
        <p class="ds-sub">Consultas y ventas de {{ monthName(mesInicio).toLowerCase() }} {{ mes.slice(0, 4) }} por canal de marketing y tipo de cliente.</p>
      </div>
    </header>

    <div class="barra">
      <label class="filtro">
        <span class="ds-label">Mes</span>
        <input class="ds-input" type="month" :value="mes" :max="mesActual" @change="ir({ mes: $event.target.value || mesActual })" />
      </label>
      <label class="filtro">
        <span class="ds-label">Asesor</span>
        <select class="ds-input" :value="asesor ?? ''" @change="ir({ asesor: $event.target.value || undefined })">
          <option value="">Todo el equipo</option>
          <option v-for="a in data?.advisors || []" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
        </select>
      </label>
    </div>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-band"><span v-for="n in 4" :key="n" class="ds-skel"></span></div>
      <div class="ds-kpis"><div v-for="n in 3" :key="n" class="ds-kpi"><span class="ds-skel skel-line"></span></div></div>
      <div class="ds-row ds-row--mitad">
        <div v-for="n in 2" :key="n" class="ds-panel"><div class="ds-panel-body"><span v-for="r in 6" :key="r" class="ds-skel skel-line"></span></div></div>
      </div>
    </template>

    <p v-else-if="!total.c && !total.v" class="ds-alert neutro">
      No hay consultas ni ventas en {{ monthName(mesInicio).toLowerCase() }}{{ asesor ? ' para este asesor' : '' }}. Elige otro mes o asesor arriba.
    </p>

    <template v-else>
      <LecturaRapida :items="banda" :periodo="monthName(mesInicio)" />

      <div class="ds-kpis">
        <div v-for="k in kpis" :key="k.key" class="ds-kpi">
          <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i :class="k.icon"></i></span>
          <div class="ds-kpi-body">
            <div class="ds-kpi-row">
              <span class="ds-kpi-value">{{ k.value }}</span>
              <span v-if="k.trend" class="ds-trend" :class="k.trend.tone">{{ k.trend.text }}</span>
            </div>
            <span class="ds-kpi-label">{{ k.label }}</span>
            <span class="ds-kpi-note">{{ k.note }}</span>
          </div>
        </div>
      </div>

      <div class="ds-row ds-row--mitad">
        <article v-for="p in paneles" :key="p.key" class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title">{{ p.title }}</h3>
            <span class="ds-panel-hint">ventas · conversión</span>
          </header>
          <div class="ds-panel-body">
            <ul class="barras" role="list">
              <li v-for="r in p.rows" :key="r.key">
                <span class="barras-nombre">{{ r.label }}</span>
                <span class="ds-track" role="img" :aria-label="`${r.label}: ${r.v} ventas de ${r.c} consultas`">
                  <i :style="{ width: `${p.max ? Math.max(2, (r.v / p.max) * 100) : 0}%` }"></i>
                </span>
                <span class="barras-cifra"><b>{{ formatValue(r.v, 'num') }}</b> de {{ formatValue(r.c, 'num') }}</span>
                <span class="ds-pill" :class="toneClass(r.tone)">{{ r.ratio === null ? '—' : `${pct(r.ratio)}%` }}</span>
              </li>
            </ul>
          </div>
          <footer class="ds-panel-foot" :class="p.footTone">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>{{ p.foot }}</span>
          </footer>
        </article>
      </div>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">¿Cómo se repartió semana a semana?</h3>
          <div class="ds-tabs" aria-label="Semana">
            <button type="button" :aria-pressed="String(semana === null)" @click="semana = null">Mes</button>
            <button v-for="w in data.weeks" :key="w.week" type="button" :aria-pressed="String(semana === w.week)" @click="semana = w.week">
              {{ weekLabel(w) }}
            </button>
          </div>
        </header>
        <div class="ds-panel-body ds-table-scroll">
          <table class="ds-table ds-table--densa matriz">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th v-for="ch in CHANNELS" :key="ch.key" scope="col" class="num">{{ ch.label }}</th>
                <th scope="col" class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tablaSemana" :key="t.key" :class="{ total: t.key === 'total' }">
                <th scope="row">{{ t.label }}</th>
                <td v-for="cell in t.cells" :key="cell.key" class="num">
                  <template v-if="cell.c || cell.v">
                    <b :class="`conv-${toneClass(cell.tone) || 'neutro'}`">{{ formatValue(cell.v, 'num') }}</b><span class="de"> / {{ formatValue(cell.c, 'num') }}</span>
                  </template>
                  <span v-else class="de">·</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Cada celda es ventas / consultas. Las consultas cuentan en la semana en que entraron y las ventas en la semana en que se pagaron: una semana puede vender más de lo que consultó. Verde ≥ {{ CONVERSION_GOAL_PCT }}%, rojo bajo la meta.</span>
        </footer>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { CONVERSION_GOAL_PCT, conversionTone, monthName, pct } from '@/features/plan-comercial/planComercial'
import { CHANNELS, conversion, sumWeeks, byChannel, byType, totals, trend, insights, weekLabel } from '@/features/ventas-canal/ventasCanal'
import LecturaRapida from './plan-comercial/LecturaRapida.vue'

const dashboardService = inject(ServiceKeys.Dashboard)
const route = useRoute()
const router = useRouter()

const pad = (n) => String(n).padStart(2, '0')
const ahora = new Date()
const mesActual = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}`

// Mes y asesor viven en la URL: el enlace que se comparte abre lo mismo.
const mes = computed(() => (/^\d{4}-\d{2}$/.test(route.query.mes || '') ? route.query.mes : mesActual))
const asesor = computed(() => Number(route.query.asesor) || null)
const mesInicio = computed(() => `${mes.value}-01`)
const ir = (cambio) => router.replace({ query: { ...route.query, mes: mes.value, asesor: asesor.value ?? undefined, ...cambio } })

const data = ref(null)
const anterior = ref(null)
const loading = ref(true)
const error = ref('')
const semana = ref(null)

// Las respuestas lentas de un mes viejo no pisan al mes que se eligió después.
let pedido = 0
async function cargar () {
  const seq = ++pedido
  loading.value = true
  error.value = ''
  semana.value = null
  const [y, m] = mes.value.split('-').map(Number)
  const prev = m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 }
  try {
    const [actual, previo] = await Promise.all([
      dashboardService.ventasCanal({ year: y, month: m, advisor: asesor.value }),
      dashboardService.ventasCanal({ ...prev, advisor: asesor.value })
    ])
    if (seq !== pedido) return
    data.value = actual
    anterior.value = previo
  } catch (e) {
    if (seq !== pedido) return
    console.error('[ventas-canal] no se pudo cargar', e)
    error.value = e?.response?.data?.message || 'No se pudo cargar el reporte. Intenta de nuevo en un momento.'
  } finally {
    if (seq === pedido) loading.value = false
  }
}
watch([mes, asesor], cargar, { immediate: true })

const matrizMes = computed(() => sumWeeks(data.value?.weeks || []))
const canales = computed(() => byChannel(matrizMes.value))
const tipos = computed(() => byType(matrizMes.value))
const total = computed(() => totals(matrizMes.value))
const totalPrevio = computed(() => totals(sumWeeks(anterior.value?.weeks || [])))

const banda = computed(() => insights({ month: mesInicio.value, channels: canales.value, types: tipos.value, total: total.value }))

const toneClass = (tone) => (tone === 'neutro' ? '' : tone)

const kpis = computed(() => {
  const t = total.value
  const p = totalPrevio.value
  const mesPrevio = monthName(`${anteriorMes.value}-01`).toLowerCase()
  return [
    { key: 'c', icon: 'fa-solid fa-comments', label: 'Consultas', value: formatValue(t.c, 'num'), trend: trend(t.c, p.c), note: `${formatValue(p.c, 'num')} en ${mesPrevio}`, tone: '' },
    { key: 'v', icon: 'fa-solid fa-cart-shopping', label: 'Ventas pagadas', value: formatValue(t.v, 'num'), trend: trend(t.v, p.v), note: `${formatValue(p.v, 'num')} en ${mesPrevio}`, tone: '' },
    {
      key: 'r',
      icon: 'fa-solid fa-percent',
      label: 'Conversión',
      value: t.ratio === null ? '—' : `${pct(t.ratio)}%`,
      trend: null,
      note: `Meta ${CONVERSION_GOAL_PCT}% · ${p.ratio === null ? 'sin dato' : `${pct(p.ratio)}%`} en ${mesPrevio}`,
      tone: toneClass(t.tone)
    }
  ]
})

const anteriorMes = computed(() => {
  const [y, m] = mes.value.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
})

function panel (key, title, rows, unidad) {
  const conVentas = rows.filter((r) => r.c || r.v)
  const lider = [...conVentas].sort((a, b) => b.v - a.v)[0]
  const bajos = conVentas.filter((r) => r.tone === 'bad').map((r) => r.label)
  return {
    key,
    title,
    rows: conVentas,
    max: Math.max(0, ...conVentas.map((r) => r.v)),
    footTone: bajos.length ? 'warn' : 'ok',
    foot: bajos.length
      ? `${bajos.join(', ')} convierte${bajos.length > 1 ? 'n' : ''} bajo el ${CONVERSION_GOAL_PCT}%.`
      : `${lider ? `${lider.label} lidera las ventas por ${unidad}. ` : ''}Todos sobre el ${CONVERSION_GOAL_PCT}%.`
  }
}

const paneles = computed(() => [
  panel('canal', '¿Qué canal trae las ventas?', canales.value, 'canal'),
  panel('tipo', '¿Qué tipo de cliente compra?', tipos.value, 'tipo de cliente')
])

const tablaSemana = computed(() => {
  const m = sumWeeks(data.value?.weeks || [], semana.value)
  const filas = byType(m).map((t) => ({
    key: t.key,
    label: t.label,
    cells: [
      ...CHANNELS.map((ch) => {
        const cell = m[t.key][ch.key]
        return { key: ch.key, ...cell, tone: conversionTone(conversion(cell)) }
      }),
      { key: 'total', c: t.c, v: t.v, tone: t.tone }
    ]
  }))
  const porCanal = byChannel(m)
  const tot = totals(m)
  filas.push({
    key: 'total',
    label: 'Total',
    cells: [...porCanal.map((ch) => ({ key: ch.key, c: ch.c, v: ch.v, tone: ch.tone })), { key: 'total', c: tot.c, v: tot.v, tone: tot.tone }]
  })
  return filas
})
</script>

<style scoped>
.barra { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.filtro { display: flex; flex-direction: column; gap: 4px; min-width: 180px; }
.skel-line { margin: 8px 0; }

.barras { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.barras li { display: grid; grid-template-columns: 96px 1fr auto 52px; align-items: center; gap: 10px; font-size: 13px; }
.barras-nombre { font-weight: 600; color: var(--ds-ink); }
.barras-cifra { color: var(--ds-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.barras-cifra b { color: var(--ds-ink); }
.barras .ds-pill { justify-content: center; }

.matriz .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.matriz tr.total th, .matriz tr.total td { border-top: 2px solid var(--ds-border); font-weight: 700; }
.matriz .de { color: var(--ds-muted); }
.conv-ok { color: var(--ds-ok-ink); }
.conv-bad { color: var(--ds-bad-ink); }
.conv-warn { color: var(--ds-warn-ink); }
.conv-neutro { color: var(--ds-ink); }

@media (max-width: 600px) {
  .barras li { grid-template-columns: 80px 1fr 48px; }
  .barras-cifra { display: none; }
}
</style>
