<template>
  <div class="ds-page">
    <header class="band">
      <div>
        <span class="band-eyebrow">Comercial · Informe del periodo</span>
        <h1 class="band-title">Informe comercial <span class="band-period">· {{ periodLabel }}</span></h1>
      </div>
      <DateRangePicker v-model="period" :presets="PERIOD_PRESETS" :comparable="false" />
    </header>

    <div v-if="!report" class="goal-empty">{{ loading ? 'Cargando informe…' : 'No se pudo cargar el informe.' }}</div>

    <template v-else>
      <div class="headline">
        <div v-for="c in headlineCards" :key="c.label" class="ds-kpi">
          <span class="ds-kpi-icon" :class="c.tono" aria-hidden="true"><i class="fa-solid" :class="c.icono"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ formatValue(c.valor, c.unidad) }}</span>
            <span class="ds-kpi-label">{{ c.label }}</span>
          </div>
        </div>
      </div>

      <div class="panel-grid">
        <!-- 1 y 2. Ventas En Vivo y membresías contra objetivo -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · 100 % de ventas En Vivo</h2>
          <div class="bpanel-body">
            <div class="goal">
              <strong class="goal-value" :class="vivo.tono">{{ vivo.meta ? formatValue(vivo.pct, 'pct') : formatValue(vivo.logrado, 'num') }}</strong>
              <span class="goal-of">{{ vivo.meta ? `${vivo.logrado} de ${vivo.meta} ventas` : 'ventas · sin objetivo cargado' }}</span>
            </div>
            <div v-if="vivo.meta" class="goal-bar" role="img" :aria-label="`Ventas En Vivo ${vivo.pct}% del objetivo; a la fecha se esperaba ${vivo.esperado}%`">
              <i :class="vivo.tono" :style="{ width: Math.min(vivo.pct, 100) + '%' }"></i>
              <b :style="{ left: vivo.esperado + '%' }" :title="`Esperado a la fecha: ${vivo.esperado}%`"></b>
            </div>
            <p class="goal-note">
              <template v-if="vivo.meta">A la fecha se esperaba <b>{{ vivo.esperado }} %</b> · al ritmo actual cierra en <b>{{ vivo.proyeccion }}</b>. </template>
              Membresías: <b>{{ report.membresias.logrado }}</b> ({{ report.membresias.black }} Black), sin objetivo cargado.
            </p>
            <ReportBars :grafico="salesChart" titulo="Ventas En Vivo por mes contra el objetivo" :alto="200" />
          </div>
          <p class="bpanel-foot">Venta = inscripción pagada y aprobada por FICO, por mes de F. PAGO. RP y cambio de curso cuentan en la compra original; sin becas, B2B ni eventos.</p>
        </article>

        <!-- 3 a 6. Conversión -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivos de conversión</h2>
          <div class="bpanel-body">
            <table class="goal-table conv-table">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col" class="num">Meta</th>
                  <th v-for="m in report.meses" :key="m.mes" scope="col" class="num">{{ monthShort(m.mes) }}</th>
                  <th scope="col" class="num">Ventas / consultas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in CONVERSION_ROWS" :key="t.clave" :class="{ 'conv-total': t.clave === 'PONDERADA' }">
                  <th scope="row" class="goal-name">{{ t.label }}</th>
                  <td class="num goal-sub">{{ formatValue(report.conversion[t.clave].meta, 'pct') }}</td>
                  <td v-for="m in report.meses" :key="m.mes" class="num goal-fig" :class="m.conversion[t.clave].tono">
                    {{ formatValue(m.conversion[t.clave].tasa, 'pct') }}
                  </td>
                  <td class="num goal-sub">{{ report.conversion[t.clave].ventas }} / {{ report.conversion[t.clave].consultas }}</td>
                </tr>
              </tbody>
            </table>
            <p class="goal-note conv-note">
              La meta del total se pondera por la mezcla de consultas del mes: con más clientes NEW, la exigencia baja.
            </p>
          </div>
          <p class="bpanel-foot">Consultas registradas en el mes contra consultas pagadas en el mes. "—" = menos de 30 consultas: muy pocas para una tasa. Sin consultas de Fundación ni B2B.</p>
        </article>

        <!-- 7. Recompra -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · {{ report.recompra.meta }} % de recompra en comunidad WE</h2>
          <div class="bpanel-body">
            <table class="goal-table">
              <thead>
                <tr>
                  <th scope="col">Primera compra</th>
                  <th scope="col" class="num">Clientes</th>
                  <th scope="col" class="num">Recompraron</th>
                  <th scope="col" class="num">Tasa</th>
                  <th scope="col" class="num">Ventana</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in cohorts" :key="c.mes">
                  <th scope="row" class="goal-name">{{ monthName(c.mes) }} {{ c.mes.slice(0, 4) }}</th>
                  <td class="num">{{ c.clientes }}</td>
                  <td class="num">{{ c.recompraron }}</td>
                  <td class="num goal-fig" :class="c.tono">{{ formatValue(c.tasa, 'pct') }}</td>
                  <td class="num goal-sub">{{ c.cerrada ? 'cerrada' : `mes ${c.meses_transcurridos} de 12` }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="bpanel-foot">Clientes cuya primera compra cae en el mes y que compran otro programa en los 12 meses siguientes. Una cohorte abierta todavía puede subir: se juzga al cerrar.</p>
        </article>

        <!-- 12. Consultas contra plan -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · {{ plan.meta_pct }} % de consultas planificadas</h2>
          <div class="bpanel-body">
            <div class="goal">
              <strong class="goal-value" :class="plan.tono">{{ formatValue(plan.pct, 'pct') }}</strong>
              <span class="goal-of">{{ plan.consultas }} de {{ plan.meta }} consultas planificadas</span>
            </div>
            <table class="goal-table">
              <caption>Por canal · ediciones que empiezan en el periodo</caption>
              <tbody>
                <tr v-for="c in plan.canales" :key="c.canal">
                  <th scope="row" class="goal-name">{{ CHANNEL_LABELS[c.canal] }}</th>
                  <td class="channel-bar">
                    <div v-if="c.meta" class="goal-bar goal-bar--thin" role="img" :aria-label="`${CHANNEL_LABELS[c.canal]}: ${c.pct}% del plan`">
                      <i :class="c.tono" :style="{ width: Math.min(c.pct, 100) + '%' }"></i>
                      <b :style="{ left: plan.meta_pct + '%' }"></b>
                    </div>
                  </td>
                  <td class="num goal-sub">{{ c.consultas }} / {{ c.meta || 'sin plan' }}</td>
                  <td class="num goal-fig" :class="c.tono">{{ formatValue(c.pct, 'pct') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="bpanel-foot">Plan de Gerencia → Objetivos, por edición. La marca de cada barra es el piso de {{ plan.meta_pct }} %.</p>
        </article>

        <!-- 11. Renovación Black -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · 75 % de renovación Black</h2>
          <div class="bpanel-body">
            <p class="goal-empty">
              <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
              Sin tasa todavía: el ERP no registra la renovación como tal. Mientras tanto, esta es la lista para llamar.
            </p>
            <table v-if="report.black_por_vencer.length" class="wait-table">
              <caption>Black que vencen en los próximos 60 días ({{ report.black_por_vencer.length }})</caption>
              <tbody>
                <tr v-for="b in blackTop" :key="b.enrollment_id">
                  <td class="wait-name">{{ b.alumno }}</td>
                  <td class="wait-aula">vence {{ formatDay(b.vence) }}</td>
                  <td class="wait-days">{{ b.dias }} d</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="goal-note">Ninguna Black vence en los próximos 60 días.</p>
          </div>
          <p class="bpanel-foot">Vencimiento = arranque de la membresía + 1 año. Quien ya compró otra Black no aparece.</p>
        </article>

        <!-- 9. Extranjeros + lo que no se mide -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · {{ report.extranjeros.meta }} % de clientes extranjeros</h2>
          <div class="bpanel-body">
            <div class="goal">
              <strong class="goal-value" :class="report.extranjeros.tono">{{ formatValue(report.extranjeros.pct, 'pct') }}</strong>
              <span class="goal-of">meta {{ report.extranjeros.meta }} %</span>
            </div>
            <div class="goal-bar" role="img" :aria-label="`Clientes extranjeros ${report.extranjeros.pct ?? 0}% de ${report.extranjeros.meta}%`">
              <i :class="report.extranjeros.tono" :style="{ width: Math.min((report.extranjeros.pct || 0) * 5, 100) + '%' }"></i>
              <b :style="{ left: report.extranjeros.meta * 5 + '%' }"></b>
            </div>
            <p class="goal-note">
              <b>{{ report.extranjeros.ventas }}</b> de {{ report.extranjeros.con_pais }} ventas con país conocido (teléfono de otro país o venta en dólares).
            </p>
            <table class="goal-table">
              <caption>Objetivos sin dato en el ERP</caption>
              <tbody>
                <tr v-for="s in report.sin_medir" :key="s.objetivo">
                  <td class="goal-name">{{ s.objetivo }}</td>
                  <td class="goal-sub unmeasured">{{ s.motivo }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="bpanel-foot">La barra llega hasta 20 %: la meta queda a la mitad.</p>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { monthName, monthShort } from '@/features/plan-comercial/planComercial'
import ReportBars from '@/views/academica/report/ReportBars.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'

const planService = inject(ServiceKeys.PlanComercial)
const toast = useToast()

const CONVERSION_ROWS = [
  { clave: 'NEW', label: 'NEW' },
  { clave: 'LDS', label: 'LDS' },
  { clave: 'CWE', label: 'CWE' },
  { clave: 'WEB', label: 'Canal Web' },
  { clave: 'PONDERADA', label: 'Total' }
]
const CHANNEL_LABELS = { MARKETING: 'Marketing', COMERCIAL: 'Comercial', WEB: 'Web', OTROS: 'Otros' }
const BLACK_LIST_LIMIT = 10

// Los objetivos del área son mensuales: los accesos rápidos son meses.
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const monthRange = (offset) => (hoy) => {
  const [y, m] = hoy.split('-').map(Number)
  const start = ymd(new Date(y, m - 1 + offset, 1))
  const end = offset === 0 ? hoy : ymd(new Date(y, m + offset, 0))
  return { start, end }
}
const PERIOD_PRESETS = [
  { id: 'mes', label: 'Este mes', range: monthRange(0) },
  { id: 'mes-1', label: 'Mes pasado', range: monthRange(-1) },
  { id: 'mes-2', label: 'Hace dos meses', range: monthRange(-2) }
]

const period = ref({ ...monthRange(0)(ymd(new Date())), compare: null })
const report = ref(null)
const loading = ref(false)

async function load () {
  loading.value = true
  try {
    report.value = await planService.reporte({ date_start: period.value.start, date_end: period.value.end })
  } catch (err) {
    console.error('Error cargando el informe comercial:', err)
    toast.error('No se pudo cargar el informe comercial')
    report.value = null
  } finally {
    loading.value = false
  }
}
watch(() => [period.value.start, period.value.end], load, { immediate: true })

// "1 Set – 28 Set 2026": el periodo se lee en la banda sin abrir el calendario.
const periodLabel = computed(() => {
  const f = (d) => `${Number(d.slice(8, 10))} ${monthShort(d)}`
  return `${f(period.value.start)} – ${f(period.value.end)} ${period.value.end.slice(0, 4)}`
})
const vivo = computed(() => report.value.vivo)
const plan = computed(() => report.value.consultas_plan)
// Una cohorte sin clientes (antes del ERP) no dice nada.
const cohorts = computed(() => report.value.recompra.cohortes.filter((c) => c.clientes > 0))
const blackTop = computed(() => report.value.black_por_vencer.slice(0, BLACK_LIST_LIMIT))
const formatDay = (ymd) => `${Number(ymd.slice(8, 10))} ${monthShort(ymd)}`

const headlineCards = computed(() => {
  const r = report.value
  const conv = r.conversion
  return [
    {
      label: vivo.value.meta ? `ventas En Vivo · ${formatValue(vivo.value.pct, 'pct')} de ${vivo.value.meta}` : 'ventas En Vivo · sin objetivo',
      valor: vivo.value.logrado, unidad: 'num', icono: 'fa-chalkboard-user', tono: vivo.value.tono
    },
    { label: `membresías · ${r.membresias.black} Black`, valor: r.membresias.logrado, unidad: 'num', icono: 'fa-crown', tono: null },
    {
      label: `conversión total · meta ${formatValue(conv.PONDERADA.meta, 'pct')}`,
      valor: conv.PONDERADA.tasa, unidad: 'pct', icono: 'fa-filter', tono: conv.PONDERADA.tono
    },
    { label: `conversión Canal Web · meta ${conv.WEB.meta}%`, valor: conv.WEB.tasa, unidad: 'pct', icono: 'fa-globe', tono: conv.WEB.tono },
    {
      label: `consultas vs plan · piso ${plan.value.meta_pct}%`,
      valor: plan.value.pct, unidad: 'pct', icono: 'fa-comments', tono: plan.value.tono
    }
  ]
})

const salesChart = computed(() => ({
  categorias: report.value.meses.map((m) => monthShort(m.mes)),
  series: [
    { nombre: 'En Vivo', tono: 'accent', datos: report.value.meses.map((m) => m.vivo) },
    { nombre: 'Objetivo', tono: 'soft', datos: report.value.meses.map((m) => m.meta_vivo) }
  ]
}))
</script>

<style scoped>
/* Mismo "informe de una página" que ReporteAcademico.vue (DESIGN_SYSTEM §5.2.2).
   ponytail: copia de las reglas de ese informe; al tercer reporte de área pasan
   a design-system.css como ds-report-*. */
.band {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 16px 24px; margin-bottom: var(--ds-gap);
  background: var(--ds-brand); color: var(--ds-on-brand); border-radius: var(--ds-radius);
}
.band-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .75; }
.band-title { margin: 2px 0 0; font-size: 24px; font-weight: 800; color: var(--ds-on-brand); }
.band-period { font-weight: 500; opacity: .8; }
.headline { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--ds-gap); margin-bottom: var(--ds-gap); }
@media (max-width: 1100px) { .headline { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); } }

.panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ds-gap); margin-bottom: var(--ds-gap); }
.bpanel {
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
}
.panel-band {
  margin: 0; padding: 10px 16px; text-align: center;
  font-size: 15px; font-weight: 700; color: var(--ds-on-brand); background: var(--ds-brand);
}
.bpanel-body { flex: 1; padding: 14px 16px 6px; }
.bpanel-foot { margin: 0; padding: 10px 16px 14px; font-size: 12px; color: var(--ds-ink-2); border-top: 1px solid var(--ds-border); }

.goal { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
.goal-value { font-size: 44px; font-weight: 800; line-height: 1; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.goal-value.ok { color: var(--ds-ok-ink); }
.goal-value.warn { color: var(--ds-warn-ink); }
.goal-value.bad { color: var(--ds-bad-ink); }
.goal-of { font-size: 14px; font-weight: 600; color: var(--ds-ink-2); }
.goal-bar { position: relative; height: 10px; margin: 12px 0 10px; border-radius: 5px; background: var(--ds-surface-3); }
.goal-bar--thin { height: 8px; margin: 0; }
.goal-bar > i { display: block; height: 100%; border-radius: 5px; background: var(--ds-accent); }
.goal-bar > i.ok { background: var(--ds-ok); }
.goal-bar > i.warn { background: var(--ds-warn); }
.goal-bar > i.bad { background: var(--ds-bad); }
/* Marca de la meta (o de lo esperado a la fecha) sobre la barra. */
.goal-bar > b { position: absolute; top: -4px; width: 3px; height: 18px; margin-left: -1px; border-radius: 2px; background: var(--ds-ink); }
.goal-bar--thin > b { top: -3px; height: 14px; }
.goal-note { margin: 0 0 6px; font-size: 13px; color: var(--ds-ink-2); }
.goal-note b { color: var(--ds-ink); }
.goal-table { width: 100%; margin-top: 8px; border-collapse: collapse; font-size: 12.5px; }
.goal-table caption { caption-side: top; text-align: left; padding: 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ds-muted); }
.goal-table th, .goal-table td { padding: 7px 4px; border-top: 1px solid var(--ds-border); color: var(--ds-ink); vertical-align: middle; text-align: left; }
.goal-table thead th { font-size: 11px; font-weight: 700; color: var(--ds-muted); border-top: 0; }
.goal-table .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.goal-name { font-weight: 600; }
.goal-sub { color: var(--ds-ink-2); white-space: nowrap; }
.goal-fig { font-weight: 800; white-space: nowrap; }
.goal-fig.ok { color: var(--ds-ok-ink); }
.goal-fig.warn { color: var(--ds-warn-ink); }
.goal-fig.bad { color: var(--ds-bad-ink); }
.goal-empty { margin: 0 0 10px; padding: 10px 12px; border-radius: var(--ds-radius-sm); font-size: 12.5px; color: var(--ds-warn-ink); background: var(--ds-soft-warn); }
.goal-empty i { margin-right: 6px; }

.conv-table .conv-total th, .conv-table .conv-total td { border-top: 2px solid var(--ds-border-strong, var(--ds-border)); }
.conv-note { margin-top: 10px; }
.channel-bar { width: 45%; }
.unmeasured { white-space: normal; }

.wait-table { width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 12.5px; }
.wait-table caption { caption-side: top; text-align: left; padding: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ds-muted); }
.wait-table td { padding: 6px 4px; border-top: 1px solid var(--ds-border); color: var(--ds-ink); }
.wait-name { font-weight: 600; }
.wait-aula { color: var(--ds-ink-2); white-space: nowrap; }
.wait-days { text-align: right; font-weight: 700; color: var(--ds-warn-ink); white-space: nowrap; }

@media (max-width: 900px) {
  .panel-grid { grid-template-columns: 1fr; }
  .conv-table { display: block; overflow-x: auto; }
}
</style>
