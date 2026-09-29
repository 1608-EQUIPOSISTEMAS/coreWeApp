<template>
  <div class="ds-page">
    <header class="band">
      <div>
        <span class="band-eyebrow">Finanzas · Informe del periodo</span>
        <h1 class="band-title">Informe de finanzas <span class="band-period">· {{ periodLabel }}</span></h1>
      </div>
      <DateRangePicker v-model="period" :presets="PERIOD_PRESETS" :comparable="false" />
    </header>

    <div v-if="!report" class="goal-empty">{{ loading ? 'Cargando informe…' : 'No se pudo cargar el informe.' }}</div>

    <template v-else>
      <div class="panel-grid">
        <!-- 1. Alumnos que pagan sus cuotas -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · {{ metas.cumplen }} % de alumnos pagan sus cuotas</h2>
          <div class="bpanel-body">
            <div class="goal">
              <strong class="goal-value" :class="alumnos.tono_cumplen">{{ formatValue(alumnos.pct_cumplen, 'pct') }}</strong>
              <span class="goal-of">{{ alumnos.cumplen }} de {{ alumnos.alumnos }} alumnos</span>
            </div>
            <div class="goal-bar" role="img" :aria-label="`${alumnos.pct_cumplen ?? 0}% de alumnos al día; meta ${metas.cumplen}%`">
              <i :class="alumnos.tono_cumplen" :style="{ width: (alumnos.pct_cumplen || 0) + '%' }"></i>
              <b :style="{ left: metas.cumplen + '%' }" :title="`Meta ${metas.cumplen}%`"></b>
            </div>
            <p class="goal-note">
              <template v-if="alumnos.impagas.cuotas">
                Siguen impagas <b>{{ alumnos.impagas.cuotas }} cuotas</b> por <b>{{ formatValue(alumnos.impagas.soles, 'soles') }}</b>.
                <RouterLink to="/fico/cobranzas">Ver en Cobranzas</RouterLink>
              </template>
              <template v-else>Ninguna cuota vencida del periodo sigue impaga.</template>
            </p>
          </div>
          <p class="bpanel-foot">Alumnos con cuotas vencidas en el periodo; cumple quien las pagó todas (a hoy, aunque sea tarde). Sin la inicial ni el contado, ni ventas retiradas, reprogramadas o con cambio de curso.</p>
        </article>

        <!-- 3. Pagan dentro del plazo -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · {{ metas.puntual }} % paga dentro del plazo</h2>
          <div class="bpanel-body">
            <div class="goal">
              <strong class="goal-value" :class="alumnos.tono_puntual">{{ formatValue(alumnos.pct_puntual, 'pct') }}</strong>
              <span class="goal-of">{{ alumnos.puntuales }} de {{ alumnos.alumnos }} alumnos</span>
            </div>
            <div class="stack" role="img" :aria-label="`A tiempo ${alumnos.puntuales}, tarde ${alumnos.tarde}, no pagaron ${alumnos.no_pagan}`">
              <i v-for="s in reparto" :key="s.clave" :class="s.clave" :style="{ width: s.pct + '%' }"></i>
              <b :style="{ left: metas.puntual + '%' }" :title="`Meta ${metas.puntual}%`"></b>
            </div>
            <ul class="legend">
              <li v-for="s in reparto" :key="s.clave"><i :class="s.clave"></i>{{ s.label }} <b>{{ s.n }}</b></li>
            </ul>
          </div>
          <p class="bpanel-foot">A tiempo = pagó todas sus cuotas del periodo hasta el día de vencimiento. La marca es la meta.</p>
        </article>

        <!-- 2. Cobranza de cuotas -->
        <article class="bpanel">
          <h2 class="panel-band">Objetivo · {{ formatValue(metas.cobranza_mensual, 'soles') }} de cobranza al mes</h2>
          <div class="bpanel-body">
            <div class="goal">
              <strong class="goal-value" :class="cobranza.tono">{{ formatValue(cobranza.logrado, 'soles') }}</strong>
              <span class="goal-of">{{ formatValue(cobranza.pct, 'pct') }} de {{ formatValue(cobranza.meta, 'soles') }}</span>
            </div>
            <div class="goal-bar" role="img" :aria-label="`Cobranza ${cobranza.pct}% de la meta; a la fecha se esperaba ${cobranza.esperado}%`">
              <i :class="cobranza.tono" :style="{ width: Math.min(cobranza.pct || 0, 100) + '%' }"></i>
              <b :style="{ left: cobranza.esperado + '%' }" :title="`Esperado a la fecha: ${cobranza.esperado}%`"></b>
            </div>
            <p class="goal-note">
              A la fecha se esperaba <b>{{ cobranza.esperado }} %</b> · al ritmo actual cierra en <b>{{ formatValue(cobranza.proyeccion, 'soles') }}</b>.
            </p>
            <ReportBars :grafico="cobranzaChart" titulo="Cobranza de cuotas por mes contra la meta" :alto="200" />
          </div>
          <p class="bpanel-foot">Pagos de cuotas por fecha de pago, en soles (dólares a 3.75). La meta de un rango parcial se prorratea por días.</p>
        </article>

        <!-- Proyección: lo que ya está programado contra la meta -->
        <article class="bpanel">
          <h2 class="panel-band">Cobranza proyectada · próximos {{ proyeccion.meses.length }} meses</h2>
          <div class="bpanel-body">
            <table class="goal-table">
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col" class="num">Cobrado</th>
                  <th scope="col" class="num">Por vencer</th>
                  <th scope="col" class="num">Esperado</th>
                  <th scope="col" class="bar-col"><span class="sr-only">Avance contra la meta</span></th>
                  <th scope="col" class="num">Falta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in proyeccion.meses" :key="m.mes">
                  <th scope="row" class="goal-name">{{ monthName(m.mes) }}</th>
                  <td class="num goal-sub">{{ formatValue(m.cobrado, 'soles') }}</td>
                  <td class="num goal-sub">{{ formatValue(m.programado, 'soles') }}</td>
                  <td class="num goal-fig" :class="m.tono">{{ formatValue(m.esperado, 'soles') }}</td>
                  <td class="bar-col">
                    <div class="goal-bar goal-bar--thin" role="img" :aria-label="`Esperado ${formatValue(m.esperado, 'soles')} de ${formatValue(m.meta, 'soles')}`">
                      <i :class="m.tono" :style="{ width: Math.min(((m.esperado || 0) / m.meta) * 100, 100) + '%' }"></i>
                    </div>
                  </td>
                  <td class="num goal-fig" :class="{ bad: m.falta }">{{ m.falta ? formatValue(m.falta, 'soles') : '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p class="goal-note proj-note">
              Esperado = lo cobrado + lo que falta vencer × <b>{{ formatValue(proyeccion.tasa, 'pct') }}</b>, lo que de verdad se cobró de las cuotas en los meses cerrados.
              Lo que falta se cubre con <b>ventas nuevas en cuotas</b>, no solo cobrando mejor.
            </p>
          </div>
          <p class="bpanel-foot">Foto de hoy, sin importar el periodo elegido. No incluye pagos tardíos de cuotas vencidas en meses anteriores.</p>
        </article>

        <!-- Deuda vencida por antigüedad -->
        <article class="bpanel">
          <h2 class="panel-band">Deuda vencida · {{ formatValue(deuda.total, 'soles') }}</h2>
          <div class="bpanel-body">
            <div class="stack" role="img" :aria-label="agingLabel">
              <i v-for="t in deuda.tramos" :key="t.clave" :class="AGING_TONES[t.clave]" :style="{ width: (deuda.total ? (t.soles / deuda.total) * 100 : 0) + '%' }"></i>
            </div>
            <ul class="legend">
              <li v-for="t in deuda.tramos" :key="t.clave">
                <i :class="AGING_TONES[t.clave]"></i>{{ t.label }} <b>{{ formatValue(t.soles, 'soles') }}</b> · {{ t.alumnos }} alumnos
              </li>
            </ul>
            <table v-if="deuda.top.length" class="wait-table">
              <caption>Los {{ deuda.top.length }} que más deben de {{ deuda.alumnos }} alumnos</caption>
              <tbody>
                <tr v-for="d in deuda.top" :key="d.alumno">
                  <td class="wait-name">{{ d.alumno }}</td>
                  <td class="goal-sub">{{ d.cuotas }} {{ d.cuotas === 1 ? 'cuota' : 'cuotas' }}</td>
                  <td class="wait-days" :class="{ viejo: d.dias > 90 }">{{ d.dias }} d</td>
                  <td class="num goal-fig">{{ formatValue(d.soles, 'soles') }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="goal-note">No hay cuotas vencidas impagas.</p>
            <p class="goal-note"><RouterLink to="/fico/cobranzas">Ver todas en Cobranzas</RouterLink></p>
          </div>
          <p class="bpanel-foot">Foto de hoy. Días = atraso de su cuota más vieja. Pasados los 90 días la deuda casi siempre termina en retiro: llamar primero a los de 31 a 90.</p>
        </article>

        <!-- Recaudación por medio de pago -->
        <article class="bpanel">
          <h2 class="panel-band">Recaudación por medio de pago · {{ formatValue(report.medios.total, 'soles') }}</h2>
          <div class="bpanel-body">
            <table class="goal-table">
              <tbody>
                <tr v-for="m in report.medios.medios" :key="m.medio">
                  <th scope="row" class="goal-name">{{ m.medio }}</th>
                  <td class="bar-col">
                    <div class="goal-bar goal-bar--thin" role="img" :aria-label="`${m.medio}: ${m.pct}% de lo recaudado`">
                      <i :class="{ bad: m.medio === NO_METHOD_LABEL }" :style="{ width: (m.pct || 0) + '%' }"></i>
                    </div>
                  </td>
                  <td class="num goal-sub">{{ m.pagos }} pagos</td>
                  <td class="num goal-sub">{{ formatValue(m.soles, 'soles') }}</td>
                  <td class="num goal-fig">{{ formatValue(m.pct, 'pct') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="bpanel-foot">Todo lo que entró en el periodo (ventas y cuotas), por fecha de pago y en soles. "Sin medio registrado" es un pago que FICO confirmó sin elegir el medio.</p>
        </article>

        <!-- Evolución + 4. IGV -->
        <article class="bpanel">
          <h2 class="panel-band">Últimos 6 meses</h2>
          <div class="bpanel-body">
            <table class="goal-table">
              <thead>
                <tr>
                  <th scope="col">Objetivo</th>
                  <th scope="col" class="num">Meta</th>
                  <th v-for="m in report.meses" :key="m.mes" scope="col" class="num">{{ monthShort(m.mes) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in SERIES" :key="f.label">
                  <th scope="row" class="goal-name">{{ f.label }}</th>
                  <td class="num goal-sub">{{ formatValue(f.meta(metas), f.unidad) }}</td>
                  <td v-for="m in report.meses" :key="m.mes" class="num goal-fig" :class="m[f.tono]">
                    {{ formatValue(m[f.valor], f.unidad) }}
                  </td>
                </tr>
              </tbody>
            </table>
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
          <p class="bpanel-foot">Cada mes junta las cuotas que vencieron en él. Lo pagado tarde sigue sumando a "pagan sus cuotas".</p>
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

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()

// Mientras más vieja la deuda, más difícil de recuperar.
const AGING_TONES = { '1-30': 'accent', '31-90': 'warn', '90+': 'bad' }
const NO_METHOD_LABEL = 'Sin medio registrado'

const SERIES = [
  { label: 'Pagan sus cuotas', valor: 'pct_cumplen', tono: 'tono_cumplen', unidad: 'pct', meta: (m) => m.cumplen },
  { label: 'Pagan a tiempo', valor: 'pct_puntual', tono: 'tono_puntual', unidad: 'pct', meta: (m) => m.puntual },
  { label: 'Cobranza', valor: 'cobrado', tono: 'tono_cobranza', unidad: 'soles', meta: (m) => m.cobranza_mensual }
]

// Mes completo, tambien el que va en curso: la meta es mensual y el backend
// juzga el avance contra los dias habiles que van hasta hoy.
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const monthRange = (offset) => (hoy) => {
  const [y, m] = hoy.split('-').map(Number)
  return { start: ymd(new Date(y, m - 1 + offset, 1)), end: ymd(new Date(y, m + offset, 0)) }
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
    report.value = await ficoService.reporte({ date_start: period.value.start, date_end: period.value.end })
  } catch (err) {
    console.error('Error cargando el informe de finanzas:', err)
    toast.error('No se pudo cargar el informe de finanzas')
    report.value = null
  } finally {
    loading.value = false
  }
}
watch(() => [period.value.start, period.value.end], load, { immediate: true })

const periodLabel = computed(() => {
  const f = (d) => `${Number(d.slice(8, 10))} ${monthShort(d)}`
  return `${f(period.value.start)} – ${f(period.value.end)} ${period.value.end.slice(0, 4)}`
})
const metas = computed(() => report.value.metas)
const alumnos = computed(() => report.value.alumnos)
const cobranza = computed(() => report.value.cobranza)
const proyeccion = computed(() => report.value.proyeccion)
const deuda = computed(() => report.value.deuda)
const agingLabel = computed(() => deuda.value.tramos.map((t) => `${t.label}: ${formatValue(t.soles, 'soles')}`).join(', '))

// A tiempo / tarde / no pagó suman el 100 % de los alumnos: una sola barra.
const reparto = computed(() => {
  const a = alumnos.value
  const pct = (n) => (a.alumnos ? (n / a.alumnos) * 100 : 0)
  return [
    { clave: 'ok', label: 'A tiempo', n: a.puntuales, pct: pct(a.puntuales) },
    { clave: 'warn', label: 'Tarde', n: a.tarde, pct: pct(a.tarde) },
    { clave: 'bad', label: 'No pagaron', n: a.no_pagan, pct: pct(a.no_pagan) }
  ]
})

const cobranzaChart = computed(() => ({
  categorias: report.value.meses.map((m) => monthShort(m.mes)),
  series: [
    { nombre: 'Cobrado', tono: 'accent', datos: report.value.meses.map((m) => m.cobrado) },
    { nombre: 'Meta', tono: 'soft', datos: report.value.meses.map((m) => m.meta_cobranza) }
  ]
}))
</script>

<style scoped>
/* Mismo "informe de una página" que ReporteComercial.vue (DESIGN_SYSTEM §5.2.2).
   ponytail: tercera copia de estas reglas; pendiente subirlas a design-system.css
   como ds-report-* y que los tres informes las usen. */
.band {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 16px 24px; margin-bottom: var(--ds-gap);
  background: var(--ds-brand); color: var(--ds-on-brand); border-radius: var(--ds-radius);
}
.band-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .75; }
.band-title { margin: 2px 0 0; font-size: 24px; font-weight: 800; color: var(--ds-on-brand); }
.band-period { font-weight: 500; opacity: .8; }

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
.goal-bar, .stack { position: relative; display: flex; height: 10px; margin: 12px 0 10px; border-radius: 5px; background: var(--ds-surface-3); }
.goal-bar > i, .stack > i { display: block; height: 100%; background: var(--ds-accent); }
.goal-bar > i { border-radius: 5px; }
.stack > i:first-of-type { border-radius: 5px 0 0 5px; }
.stack > i:last-of-type { border-radius: 0 5px 5px 0; }
.goal-bar > i.ok, .stack > i.ok, .legend i.ok { background: var(--ds-ok); }
.goal-bar > i.warn, .stack > i.warn, .legend i.warn { background: var(--ds-warn); }
.goal-bar > i.bad, .stack > i.bad, .legend i.bad { background: var(--ds-bad); }
/* Marca de la meta (o de lo esperado a la fecha) sobre la barra. */
.goal-bar > b, .stack > b { position: absolute; top: -4px; width: 3px; height: 18px; margin-left: -1px; border-radius: 2px; background: var(--ds-ink); }
.goal-note { margin: 0 0 6px; font-size: 13px; color: var(--ds-ink-2); }
.goal-note b { color: var(--ds-ink); }
.goal-note a { margin-left: 4px; font-weight: 600; color: var(--ds-accent); }

.goal-bar--thin { height: 8px; margin: 0; }
.bar-col { width: 32%; }
.proj-note { margin-top: 10px; }
.stack > i.accent, .legend i.accent { background: var(--ds-accent); }

.wait-table { width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 12.5px; }
.wait-table caption { caption-side: top; text-align: left; padding: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ds-muted); }
.wait-table td { padding: 6px 4px; border-top: 1px solid var(--ds-border); color: var(--ds-ink); }
.wait-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.wait-name { font-weight: 600; }
.wait-days { text-align: right; font-weight: 700; color: var(--ds-warn-ink); white-space: nowrap; }
.wait-days.viejo { color: var(--ds-bad-ink); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.legend { display: flex; gap: 16px; flex-wrap: wrap; margin: 0 0 6px; padding: 0; list-style: none; font-size: 13px; color: var(--ds-ink-2); }
.legend i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; }
.legend b { color: var(--ds-ink); }

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
.unmeasured { white-space: normal; }

@media (max-width: 900px) {
  .panel-grid { grid-template-columns: 1fr; }
  .goal-table { display: block; overflow-x: auto; }
}
</style>
