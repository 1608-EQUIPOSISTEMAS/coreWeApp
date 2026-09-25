<template>
  <div class="ds-stack">
    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-band"><span v-for="n in 4" :key="n" class="ds-skel"></span></div>
      <div v-for="n in 3" :key="n" class="ds-panel"><div class="ds-panel-body"><span class="ds-skel"></span></div></div>
    </template>

    <template v-else-if="semanas.length">
      <LecturaRapida v-if="insights.length" :items="insights" :periodo="monthName(month)" />

      <div class="ds-row ds-row--mitad">
        <article class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">¿Qué día se vende más?</h3>
              <p class="ds-panel-sub">Ventas promedio del equipo por día de la semana, en días con consultas</p>
            </div>
          </header>
          <div class="ds-panel-body">
            <ColumnChart v-if="diasChart.some((g) => g.bars[0].value > 0)" :groups="diasChart" :bar-width="34" aria-label="Ventas promedio por día de la semana" />
            <p v-else class="ds-empty">Todavía no hay ventas en días con consultas. Elige un mes anterior arriba.</p>
          </div>
        </article>

        <article class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">¿Quién convierte sus consultas?</h3>
              <p class="ds-panel-sub">Ventas / consultas por semana · meta {{ CONVERSION_GOAL_PCT }}%</p>
            </div>
          </header>
          <div class="ds-panel-body ds-table-scroll">
            <p v-if="!matriz.rows.length" class="ds-empty">Nadie registró consultas en estas semanas.</p>
            <table v-else class="ds-table conversion">
              <thead>
                <tr>
                  <th>Asesor</th>
                  <th v-for="w in matriz.weeks" :key="w.date_start" class="num">{{ w.week_label }}</th>
                  <th class="num">Periodo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in matriz.rows" :key="r.user_id">
                  <td>{{ displayName(r.nombre) }}</td>
                  <td v-for="(c, i) in r.semanas" :key="i" class="num"><span class="ds-pill" :class="c.tone">{{ fmtPct(c.ratio) }}</span></td>
                  <td class="num"><span class="ds-pill" :class="r.total.tone">{{ fmtPct(r.total.ratio) }}</span></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Equipo</td>
                  <td v-for="(c, i) in matriz.equipo.semanas" :key="i" class="num"><span class="ds-pill" :class="c.tone">{{ fmtPct(c.ratio) }}</span></td>
                  <td class="num"><span class="ds-pill" :class="matriz.equipo.total.tone">{{ fmtPct(matriz.equipo.total.ratio) }}</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </article>
      </div>

      <div class="semanas-head">
        <h2 class="ds-panel-title">Semanas</h2>
        <div class="leyenda">
          <span class="dia top">▲ Día con más ventas</span>
          <span class="dia rose">▼ Día con menos ventas</span>
          <span>Ratio día = objetivo ÷ 5 · B2B se muestra pero no suma a las ventas</span>
        </div>
      </div>

      <article v-for="w in semanas" :key="w.date_start" class="ds-panel">
        <button
          type="button"
          class="semana"
          :aria-expanded="String(abierta(w))"
          :disabled="!w.tiene_datos"
          @click="alternar(w)"
        >
          <i class="fa-solid fa-chevron-right chev" :class="{ open: abierta(w) }" aria-hidden="true"></i>
          <span class="semana-titulo">
            <strong>{{ w.week_label }} · {{ weekRangeLabel(w) }}</strong>
            <small>{{ estado(w) }}</small>
          </span>
          <span class="stats">
            <span><small>Obj. ventas</small><b>{{ formatValue(w.obj, 'num') }}</b></span>
            <span><small>Ventas</small><b>{{ w.ventas }}</b></span>
            <span><small>Falta</small><b>{{ faltaTexto(w.falta) }}</b></span>
            <span><small>Conversión</small><b class="ds-pill" :class="w.conversion_tone">{{ fmtPct(w.conversion) }}</b></span>
            <span><small>Logro</small><b class="ds-pill" :class="w.cumplimiento_tone">{{ fmtPct(w.cumplimiento) }}</b></span>
          </span>
          <span class="tira" aria-hidden="true">
            <span v-for="(v, d) in w.dia_ventas" :key="d">
              <i :class="tonoDia(w, d)" :style="{ height: `${w.dia_consultas[d] ? Math.max(3, (v / maxDia(w)) * 30) : 3}px` }"></i>
              <em>{{ weekdayShort(d).charAt(0) }}</em>
            </span>
          </span>
        </button>

        <template v-if="abierta(w)">
          <!-- Resumen de la semana: lo que cada asesor lleva y le falta -->
          <div class="ds-table-scroll detalle">
            <table class="diario resumen">
              <thead>
                <tr>
                  <th class="izq">N°</th><th class="izq">Asesor</th><th class="izq">Código</th>
                  <th class="sep">Obj.</th><th>Consultas</th><th>Ventas</th><th>Falta</th><th>Conversión</th><th>Ratio día</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in w.rows" :key="r.user_id">
                  <td class="izq suave">{{ r.n }}</td>
                  <td class="izq nombre">{{ displayName(r.nombre) }}</td>
                  <td class="izq codigo">{{ r.alias }}</td>
                  <td class="sep">{{ formatValue(r.obj, 'num') }}</td>
                  <td>{{ formatValue(r.total_consultas, 'num') }}</td>
                  <td><span v-if="r.obj" class="ds-pill" :class="r.ventas_tone">{{ r.total_ventas }}</span><template v-else>{{ r.total_ventas }}</template></td>
                  <td :class="{ ok: r.falta !== null && r.falta <= 0 }">{{ faltaTexto(r.falta) }}</td>
                  <td><span v-if="r.conversion !== null" class="ds-pill" :class="r.conversion_tone">{{ fmtPct(r.conversion) }}</span></td>
                  <td class="suave">{{ formatValue(r.ratio_dia, 'num') }}</td>
                </tr>
                <tr class="b2b">
                  <td></td>
                  <td class="izq nombre">B2B</td>
                  <td class="izq codigo">Convenios</td>
                  <td class="sep"></td><td></td><td>{{ w.b2b.total_ventas }}</td>
                  <td colspan="3" class="izq suave">no suma a las ventas del equipo</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total">
                  <td></td>
                  <td class="izq" colspan="2">Total equipo</td>
                  <td class="sep">{{ formatValue(w.obj, 'num') }}</td>
                  <td>{{ w.consultas }}</td>
                  <td><span v-if="w.obj" class="ds-pill" :class="w.cumplimiento_tone">{{ w.ventas }}</span><template v-else>{{ w.ventas }}</template></td>
                  <td :class="{ ok: w.falta !== null && w.falta <= 0 }">{{ faltaTexto(w.falta) }}</td>
                  <td><span class="ds-pill" :class="w.conversion_tone">{{ fmtPct(w.conversion) }}</span></td>
                  <td>{{ w.obj === null ? '—' : Math.round(w.obj / 5) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Día por día, de lunes a domingo -->
          <div class="ds-table-scroll detalle">
            <table class="diario">
              <thead>
                <tr class="grupos">
                  <th colspan="2" class="fijo izq">Por día</th>
                  <th v-for="(dia, d) in w.dias" :key="dia" colspan="3" class="sep" :class="tonoDia(w, d)">
                    {{ marca(w, d) }}{{ weekdayName(d) }} {{ Number(dia.slice(8)) }}/{{ Number(dia.slice(5, 7)) }}
                  </th>
                </tr>
                <tr>
                  <th class="fijo izq">N°</th><th class="fijo2 izq">Asesor</th>
                  <template v-for="dia in w.dias" :key="dia"><th class="sep">Cons.</th><th>Ventas</th><th>Conv.</th></template>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in w.rows" :key="r.user_id">
                  <td class="fijo izq suave">{{ r.n }}</td>
                  <td class="fijo2 izq nombre">{{ displayName(r.nombre) }}</td>
                  <template v-for="(c, d) in r.dias" :key="d">
                    <td class="sep">{{ c.consultas ?? '' }}</td><td>{{ c.ventas }}</td>
                    <td><span v-if="c.conversion !== null" class="ds-pill" :class="c.tone">{{ fmtPct(c.conversion) }}</span></td>
                  </template>
                </tr>
                <tr class="b2b">
                  <td class="fijo"></td>
                  <td class="fijo2 izq nombre">B2B</td>
                  <template v-for="(v, d) in w.b2b.ventas" :key="d"><td class="sep"></td><td>{{ v }}</td><td></td></template>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total">
                  <td class="fijo"></td>
                  <td class="fijo2 izq">Total del día</td>
                  <template v-for="(dia, d) in w.dias" :key="dia">
                    <td class="sep">{{ w.dia_consultas[d] }}</td><td>{{ w.dia_ventas[d] }}</td>
                    <td><span class="ds-pill" :class="conversionTone(w.dia_conversion[d])">{{ fmtPct(w.dia_conversion[d]) }}</span></td>
                  </template>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import {
  CONVERSION_GOAL_PCT, dailyWeek, averageByWeekday, conversionMatrix, ventasInsights, conversionTone,
  pct, monthName, weekdayName, weekdayShort, weekRangeLabel, displayName, referenceWeek
} from '@/features/plan-comercial/planComercial'
import LecturaRapida from './LecturaRapida.vue'
import ColumnChart from './ColumnChart.vue'

const props = defineProps({
  month: { type: String, required: true },
  today: { type: String, required: true },
  reloadKey: { type: Number, default: 0 }
})

const service = inject(ServiceKeys.PlanComercial)
const data = ref(null)
const loading = ref(false)
const error = ref('')
const abiertas = ref({})

async function cargar () {
  loading.value = true
  error.value = ''
  abiertas.value = {}
  try {
    data.value = await service.ventasDiarias(props.month)
  } catch (err) {
    console.error('[PlanComercial] ventas diarias', { month: props.month, err })
    error.value = err?.response?.data?.message || 'No se pudo cargar el reporte diario. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch(() => [props.month, props.reloadKey], cargar, { immediate: true })

const semanas = computed(() => (data.value?.weeks ?? []).map((w) => dailyWeek(w, props.today)))
const matriz = computed(() => conversionMatrix(semanas.value))
const insights = computed(() => ventasInsights(semanas.value, matriz.value, props.today))

const diasChart = computed(() => {
  const prom = averageByWeekday(semanas.value)
  const conVenta = prom.filter((p) => p > 0)
  const max = Math.max(...prom)
  const min = conVenta.length ? Math.min(...conVenta) : null
  return prom.map((p, d) => {
    const tone = max > 0 && p === max ? 'ok' : p === min && min !== max ? 'rose' : 'accent'
    return {
      key: d,
      label: weekdayShort(d),
      tone: tone === 'accent' ? undefined : tone,
      bars: [{ value: p, tone, label: p.toFixed(1).replace('.', ',') }]
    }
  })
})

// Se abre sola la semana en curso (o la ultima con datos); el resto, a pedido.
const semanaPorDefecto = computed(() => referenceWeek(semanas.value)?.date_start)
const abierta = (w) => w.tiene_datos && (abiertas.value[w.date_start] ?? w.date_start === semanaPorDefecto.value)
const alternar = (w) => { abiertas.value = { ...abiertas.value, [w.date_start]: !abierta(w) } }

const fmtPct = (ratio) => formatValue(pct(ratio), 'pct')
// Falta negativo = se paso del objetivo: se muestra como "+N".
const faltaTexto = (falta) => (falta === null ? '—' : falta <= 0 ? '+' + -falta : String(falta))
const maxDia = (w) => Math.max(1, ...w.dia_ventas)
const tonoDia = (w, d) => (w.mejores.includes(d) ? 'top' : w.peores.includes(d) ? 'rose' : w.dia_consultas[d] ? '' : 'vacio')
const marca = (w, d) => (w.mejores.includes(d) ? '▲ ' : w.peores.includes(d) ? '▼ ' : '')
function estado (w) {
  if (!w.tiene_datos) return 'Sin registros'
  if (w.dias_con_registro === 7) return 'Semana completa'
  return `${w.dias_con_registro} de 7 días con consultas`
}
</script>

<style scoped>
.conversion td:first-child { white-space: nowrap; }
.conversion tfoot td { font-weight: 700; color: var(--ds-heading); border-top: 1px solid var(--ds-border-strong); }

.semanas-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; margin-top: 4px; }
.semanas-head .ds-panel-title { font-size: 16px; }
.leyenda { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11.5px; color: var(--ds-ink-2); }
.dia { padding: 3px 8px; border-radius: var(--ds-radius-control); font-weight: 700; }
.dia.top { background: var(--ds-ok-ink); color: var(--ds-surface); }
.dia.rose { background: var(--ds-rose-strong); color: var(--ds-rose-ink); }

.semana { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 22px; width: 100%; padding: 14px 18px; border: 0; background: transparent; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.semana:hover:not(:disabled) { background: var(--ds-surface-2); }
.semana:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.semana:disabled { cursor: default; opacity: 0.7; }
.chev { width: 12px; font-size: 12px; color: var(--ds-heading); transition: transform 0.15s; }
.chev.open { transform: rotate(90deg); }
.semana-titulo { display: flex; flex-direction: column; flex: 1 1 220px; min-width: 0; }
.semana-titulo strong { font-size: 15px; color: var(--ds-heading); }
.semana-titulo small { font-size: 12px; color: var(--ds-muted); }
.stats { display: flex; flex-wrap: wrap; gap: 18px; }
.stats > span { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.stats small { font-size: 11px; font-weight: 600; color: var(--ds-muted); }
.stats b { font-size: 17px; font-weight: 800; color: var(--ds-ink); font-variant-numeric: tabular-nums; }
.stats b.ds-pill { font-size: 13px; padding: 3px 8px; }
.tira { display: flex; align-items: flex-end; gap: 5px; height: 44px; }
.tira > span { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; height: 100%; }
.tira i { width: 12px; border-radius: 2px; background: var(--ds-bar); }
.tira i.top { background: var(--ds-ok); }
.tira i.rose { background: var(--ds-rose); }
.tira i.vacio { background: var(--ds-surface-3); }
.tira em { font-size: 10px; font-style: normal; font-weight: 600; color: var(--ds-muted); }

@media (prefers-reduced-motion: reduce) { .chev { transition: none; } }

.detalle { border-top: 1px solid var(--ds-border); }
.diario { border-collapse: collapse; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.diario th, .diario td { height: 34px; padding: 0 10px; text-align: right; white-space: nowrap; border-bottom: 1px solid var(--ds-border); background: var(--ds-surface); }
.diario th { font-size: 11px; font-weight: 600; color: var(--ds-muted); }
.diario .grupos th { text-align: center; font-weight: 700; color: var(--ds-heading); background: var(--ds-surface-2); }
.diario .grupos th.top { background: var(--ds-ok-ink); color: var(--ds-surface); }
.diario .grupos th.rose { background: var(--ds-rose-strong); color: var(--ds-rose-ink); }
.diario .izq { text-align: left; }
.diario .sep { border-left: 1px solid var(--ds-border); }
.diario .fijo { position: sticky; left: 0; z-index: 1; width: 40px; min-width: 40px; }
.diario .fijo2 { position: sticky; left: 40px; z-index: 1; min-width: 110px; box-shadow: 1px 0 0 var(--ds-border); }
.diario .nombre { font-weight: 700; color: var(--ds-heading); }
.diario .codigo, .diario .suave { color: var(--ds-muted); }
.diario td.ok { font-weight: 700; color: var(--ds-ok-ink); }
.diario tr.total td { font-weight: 700; color: var(--ds-heading); background: var(--ds-surface-2); border-top: 1px solid var(--ds-border-strong); }
.diario tr.b2b td { color: var(--ds-ink-2); font-style: italic; }
.diario tr.b2b td.nombre { color: var(--ds-ink-2); }
.resumen { min-width: 640px; }
.detalle + .detalle { margin-top: 8px; }
</style>
