<template>
  <div class="ds-page">
    <header class="band">
      <div>
        <span class="band-eyebrow">Producto · Informe del periodo</span>
        <h1 class="band-title">Informe de producto <span class="band-period">· {{ periodLabel }}</span></h1>
      </div>
      <div class="ds-tabs" role="tablist" aria-label="Línea de producto">
        <button v-for="l in LINES" :key="l.id" type="button" role="tab" :aria-selected="linea === l.id" @click="linea = l.id">{{ l.label }}</button>
      </div>
      <DateRangePicker v-model="period" :presets="PERIOD_PRESETS" :comparable="false" />
    </header>

    <div v-if="!report" class="goal-empty">{{ loading ? 'Cargando informe…' : 'No se pudo cargar el informe.' }}</div>

    <template v-else>
      <div class="headline">
        <div v-for="c in headlineCards" :key="c.label" class="ds-kpi">
          <span class="ds-kpi-icon" :class="c.tono" aria-hidden="true"><i class="fa-solid" :class="c.icono"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ c.valor }}</span>
            <span class="ds-kpi-label">{{ c.label }}</span>
          </div>
        </div>
      </div>

      <div class="panel-grid">
      <article v-for="o in report.objetivos" :key="o.clave" class="bpanel">
        <h2 class="panel-band">Objetivo · {{ o.objetivo }}</h2>
        <div class="bpanel-body">
          <div class="goal">
            <strong class="goal-value" :class="o.tono">{{ o.logrado }}</strong>
            <span class="goal-of">de {{ o.meta }} en el periodo</span>
          </div>
          <div class="goal-bar" role="img" :aria-label="`${o.logrado} de ${o.meta} ${o.label.toLowerCase()}`">
            <i :class="o.tono" :style="{ width: Math.min(o.pct || 0, 100) + '%' }"></i>
          </div>
          <table v-if="o.cursos.length" class="goal-table">
            <tbody>
              <tr v-for="c in o.cursos" :key="c.programa + c.dia">
                <th scope="row" class="goal-name">{{ c.programa }}</th>
                <td class="goal-sub">{{ c.version }}</td>
                <td class="num goal-sub">{{ dayLabel(c.dia) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="goal-note sin-datos">Ningún curso en el periodo.</p>
        </div>
        <p class="bpanel-foot">{{ FOOTS[o.clave] }} La meta de un rango parcial se prorratea por días.</p>
      </article>

      <article v-if="report.operacion" class="bpanel bpanel--ancho">
        <h2 class="panel-band">Cronograma del periodo · {{ report.operacion.programados }} cursos programados</h2>
        <div class="bpanel-body">
          <div class="cifras">
            <div v-for="c in CIFRAS_OPERACION" :key="c.clave" class="cifra" :class="c.grupo">
              <span class="cifra-label">{{ c.label }}</span>
              <strong class="cifra-valor">{{ report.operacion[c.clave] }}</strong>
              <span class="cifra-sub">{{ c.sub(report.operacion) }}</span>
            </div>
          </div>
          <table class="goal-table">
            <thead>
              <tr>
                <th scope="col">Mes</th>
                <th v-for="c in CIFRAS_OPERACION" :key="c.clave" scope="col" class="num">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in report.meses" :key="m.mes">
                <th scope="row" class="goal-name">{{ monthShort(m.mes) }}</th>
                <td v-for="c in CIFRAS_OPERACION" :key="c.clave" class="num" :class="c.clave === 'programados' ? 'goal-fig' : 'goal-sub'">{{ m.operacion[c.clave] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="bpanel-foot">
          Cursos por mes de inicio. Seguimiento = el curso es el 2do módulo en adelante de un paquete. A5 = edición cancelada.
          La meta de ventas es la de Gerencia por edición (paquetes incluidos) y solo se juzga la edición que ya arrancó.
          Cambios = ediciones a las que se les movió fecha, horario o docente; el historial empieza el 25/08/26.
          Docentes nuevos = altas en Producto → Docentes, de todas las líneas.
        </p>
      </article>

      <template v-if="report.operacion">
        <article class="bpanel">
          <h2 class="panel-band">Cursos programados por mes</h2>
          <div class="bpanel-body">
            <ReportBars :grafico="cronogramaChart" titulo="Cursos por mes de inicio: aperturas, seguimientos y cancelados" apilado :alto="260" />
          </div>
          <p class="bpanel-foot">Cada barra es el total programado del mes. Mucho A5 = se programó más de lo que se pudo vender.</p>
        </article>

        <article class="bpanel">
          <h2 class="panel-band">Ediciones contra su meta de ventas</h2>
          <div class="bpanel-body">
            <ReportBars :grafico="metasChart" titulo="Ediciones iniciadas que llegan o no a su meta de ventas por mes" apilado :alto="260" />
          </div>
          <p class="bpanel-foot">Solo ediciones que ya arrancaron; el mes en curso todavía está vendiendo.</p>
        </article>
      </template>

      <article class="bpanel bpanel--ancho">
        <h2 class="panel-band">Últimos 6 meses</h2>
        <div class="bpanel-body">
          <ReportBars :grafico="objetivosChart" titulo="Cursos por objetivo y mes contra la meta mensual" :alto="240" />
          <table class="goal-table">
            <thead>
              <tr>
                <th scope="col">Objetivo</th>
                <th scope="col" class="num">Meta al mes</th>
                <th v-for="m in report.meses" :key="m.mes" scope="col" class="num">{{ monthShort(m.mes) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in report.objetivos" :key="o.clave">
                <th scope="row" class="goal-name">{{ o.label }}</th>
                <td class="num goal-sub">{{ o.mensual }}</td>
                <td v-for="m in report.meses" :key="m.mes" class="num goal-fig" :class="m[o.clave].tono">{{ m[o.clave].logrado }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="bpanel-foot">El mes en curso se juzga por su ritmo (días hábiles transcurridos), no contra el mes completo.</p>
      </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { monthShort } from '@/features/plan-comercial/planComercial'
import DateRangePicker from '@/components/DateRangePicker.vue'
import ReportBars from '@/views/academica/report/ReportBars.vue'

// Una sola pagina con una pestaña por linea; la pestaña va en ?linea= para
// poder compartir el link.
const LINES = [{ id: 'envivo', label: 'En vivo' }, { id: 'online', label: 'Online' }]
const route = useRoute()
const router = useRouter()
const linea = ref(LINES.some((l) => l.id === route.query.linea) ? route.query.linea : LINES[0].id)
watch(linea, (id) => router.replace({ query: { ...route.query, linea: id } }))

const programService = inject(ServiceKeys.Program)
const toast = useToast()

const FOOTS = {
  fichas: 'Programas creados en Producto → Programas, por fecha de alta.',
  lanzados: 'Programa nuevo cuya primera edición arranca en el periodo. Los programas cargados al inicio del ERP (21/11/25) no cuentan.',
  mejorados: 'Versión nueva (V2, V5…) de un programa que ya existía, por fecha de alta de la versión.'
}

const OBJECTIVE_ICONS = { fichas: 'fa-file-circle-plus', lanzados: 'fa-rocket', mejorados: 'fa-wand-magic-sparkles' }

// Una tarjeta por objetivo medido y, en En vivo, lo clave del cronograma.
const headlineCards = computed(() => {
  const r = report.value
  const cards = r.objetivos.map((o) => ({ label: `${o.label.toLowerCase()} · meta ${o.meta}`, valor: o.logrado, icono: OBJECTIVE_ICONS[o.clave], tono: o.tono }))
  const op = r.operacion
  if (!op) return cards
  return [
    ...cards,
    { label: `cursos programados · ${op.seguimientos} seguimientos`, valor: op.programados, icono: 'fa-calendar-days', tono: null },
    { label: 'cursos cancelados (A5)', valor: op.a5, icono: 'fa-ban', tono: op.a5 ? 'warn' : null },
    { label: `llegan a su meta de ventas · ${op.meta_ok} de ${op.meta_ok + op.meta_no}`, valor: op.pct_meta_ok === null ? '—' : `${op.pct_meta_ok} %`, icono: 'fa-bullseye', tono: null }
  ]
})

const OBJECTIVE_TONES = ['accent', 'ok']
const serieMensual = (campo) => report.value.meses.map(campo)
const categorias = computed(() => report.value.meses.map((m) => monthShort(m.mes)))

// Aperturas + seguimientos + A5 = programados (el seguimiento cancelado cuenta como A5).
const cronogramaChart = computed(() => ({
  categorias: categorias.value,
  series: [
    { nombre: 'Aperturas', tono: 'accent', datos: serieMensual(({ operacion: o }) => o.programados - o.seguimientos - o.a5) },
    { nombre: 'Seguimientos', tono: 'soft', datos: serieMensual((m) => m.operacion.seguimientos) },
    { nombre: 'A5', tono: 'warn', datos: serieMensual((m) => m.operacion.a5) }
  ]
}))

const metasChart = computed(() => ({
  categorias: categorias.value,
  series: [
    { nombre: 'Llegan a meta', tono: 'ok', datos: serieMensual((m) => m.operacion.meta_ok) },
    { nombre: 'No llegan', tono: 'bad', datos: serieMensual((m) => m.operacion.meta_no) }
  ]
}))

// Las dos metas de cada linea son de 2 al mes salvo "mejorados" (1): una barra
// gris por objetivo seria ruido, va la del primero y la tabla muestra ambas.
const objetivosChart = computed(() => ({
  categorias: categorias.value,
  series: [
    ...report.value.objetivos.map((o, i) => ({ nombre: o.label, tono: OBJECTIVE_TONES[i], datos: serieMensual((m) => m[o.clave].logrado) })),
    { nombre: `Meta ${report.value.objetivos[0].label.toLowerCase()}`, tono: 'soft', datos: serieMensual(() => report.value.objetivos[0].mensual) }
  ]
}))

// Programados, seguimientos y A5 son cursos; las metas, ediciones ya iniciadas.
const CIFRAS_OPERACION = [
  { clave: 'programados', label: 'Programados', sub: () => 'cursos que inician' },
  { clave: 'seguimientos', label: 'Seguimientos', sub: (o) => `${o.programados ? Math.round((o.seguimientos / o.programados) * 100) : 0} % de los cursos` },
  { clave: 'a5', label: 'A5', sub: () => 'cancelados', grupo: 'salida' },
  { clave: 'cambios', label: 'Cambios', sub: () => 'fecha, horario o docente', grupo: 'salida' },
  { clave: 'docentes', label: 'Docentes nuevos', sub: () => 'altas del periodo' },
  { clave: 'meta_ok', label: 'Llegan a meta', sub: (o) => (o.pct_meta_ok !== null ? `${o.pct_meta_ok} % de las ediciones` : 'sin ediciones iniciadas'), grupo: 'ok' },
  { clave: 'meta_no', label: 'No llegan', sub: () => 'a su meta de ventas', grupo: 'salida' }
]

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const monthRange = (offset) => (hoy) => {
  const [y, m] = hoy.split('-').map(Number)
  return { start: ymd(new Date(y, m - 1 + offset, 1)), end: ymd(new Date(y, m + offset, 0)) }
}
// La meta de En vivo es trimestral (6 lanzamientos): el trimestre va de preset.
const quarterRange = (hoy) => {
  const [y, m] = hoy.split('-').map(Number)
  const q = Math.floor((m - 1) / 3) * 3
  return { start: ymd(new Date(y, q, 1)), end: ymd(new Date(y, q + 3, 0)) }
}
const PERIOD_PRESETS = [
  { id: 'mes', label: 'Este mes', range: monthRange(0) },
  { id: 'mes-1', label: 'Mes pasado', range: monthRange(-1) },
  { id: 'trimestre', label: 'Este trimestre', range: quarterRange }
]

const period = ref({ ...monthRange(0)(ymd(new Date())), compare: null })
const report = ref(null)
const loading = ref(false)

async function load () {
  loading.value = true
  try {
    report.value = await programService.reporte({ linea: linea.value, date_start: period.value.start, date_end: period.value.end })
  } catch (err) {
    console.error('Error cargando el informe de producto:', err)
    toast.error('No se pudo cargar el informe de producto')
    report.value = null
  } finally {
    loading.value = false
  }
}
watch(() => [linea.value, period.value.start, period.value.end], load, { immediate: true })

const dayLabel = (d) => `${Number(d.slice(8, 10))} ${monthShort(d)}`
const periodLabel = computed(() => `${dayLabel(period.value.start)} – ${dayLabel(period.value.end)} ${period.value.end.slice(0, 4)}`)
</script>

<style scoped>
/* Mismo "informe de una página" que ReporteFico.vue (DESIGN_SYSTEM §5.2.2).
   ponytail: cuarta copia de estas reglas; pendiente subirlas a design-system.css
   como ds-report-* y que los informes las usen. */
.band {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 16px 24px; margin-bottom: var(--ds-gap);
  background: var(--ds-brand); color: var(--ds-on-brand); border-radius: var(--ds-radius);
}
.band-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .75; }
.band-title { margin: 2px 0 0; font-size: 24px; font-weight: 800; color: var(--ds-on-brand); }
.band-period { font-weight: 500; opacity: .8; }

.headline { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--ds-gap); margin-bottom: var(--ds-gap); }

.panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ds-gap); margin-bottom: var(--ds-gap); }
.bpanel {
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
}
.bpanel--ancho { grid-column: 1 / -1; }
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
.goal-bar { position: relative; display: flex; height: 10px; margin: 12px 0 10px; border-radius: 5px; background: var(--ds-surface-3); }
.goal-bar > i { display: block; height: 100%; border-radius: 5px; background: var(--ds-accent); }
.goal-bar > i.ok { background: var(--ds-ok); }
.goal-bar > i.warn { background: var(--ds-warn); }
.goal-bar > i.bad { background: var(--ds-bad); }
.goal-note { margin: 0 0 6px; font-size: 13px; color: var(--ds-ink-2); }
.sin-datos { padding: 24px 0; text-align: center; }

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

.cifras { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }
.cifra { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }
.cifra.salida { background: var(--ds-soft-warn); }
.cifra.ok { background: var(--ds-soft-ok); }
.cifra-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ds-muted); }
.cifra-valor { font-size: 26px; font-weight: 800; line-height: 1.1; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.cifra.salida .cifra-valor { color: var(--ds-warn-ink); }
.cifra.ok .cifra-valor { color: var(--ds-ok-ink); }
.cifra-sub { font-size: 12px; color: var(--ds-ink-2); }
@media (max-width: 1100px) { .cifras { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); } }

@media (max-width: 900px) {
  .panel-grid { grid-template-columns: 1fr; }
  .goal-table { display: block; overflow-x: auto; }
}
</style>
