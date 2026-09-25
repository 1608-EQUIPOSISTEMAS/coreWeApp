<template>
  <div class="ds-stack">
    <p v-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="loading">
      <div class="ds-band"><span v-for="n in 4" :key="n" class="ds-skel"></span></div>
      <div class="ds-panel"><div class="ds-panel-body"><span v-for="r in 5" :key="r" class="ds-skel skel-line"></span></div></div>
    </template>

    <template v-else-if="report">
      <LecturaRapida :items="insights" :periodo="monthName(month)" />

      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">¿Quién va cumpliendo su objetivo?</h3>
            <p class="ds-panel-sub">Logro del mes sobre el objetivo de cada asesor · la marca es el 100%</p>
          </div>
        </header>
        <div class="ds-panel-body">
          <p v-if="!report.ranking.length" class="ds-empty">
            Nadie tiene objetivo cargado en {{ monthName(month).toLowerCase() }}. {{ puedeEditar ? 'Usa "Cargar objetivos" arriba.' : 'Pídeselo al líder comercial.' }}
          </p>
          <ol v-else class="ranking">
            <li v-for="(p, i) in report.ranking" :key="p.user_id">
              <span class="pos">{{ i + 1 }}</span>
              <div class="quien">
                <strong>{{ displayName(p.nombre) }}</strong>
                <span>{{ p.alias }} · {{ fmtPct(p.part_plan) }} del plan</span>
              </div>
              <div class="barra" role="img" :aria-label="`${displayName(p.nombre)}: ${fmtPct(p.cumplimiento)} de cumplimiento`">
                <i :class="goalTone(p.cumplimiento)" :style="{ width: `${Math.min(p.cumplimiento / escala, 1) * 100}%` }"></i>
                <b :style="{ left: `${(1 / escala) * 100}%` }"></b>
              </div>
              <span class="ds-pill" :class="goalTone(p.cumplimiento)">{{ fmtPct(p.cumplimiento) }}</span>
              <span class="cifra"><strong>{{ p.logro }}</strong> / {{ p.obj }}</span>
              <span class="falta" :class="p.falta <= 0 ? 'ok' : 'rose'">{{ p.falta <= 0 ? `+${-p.falta} sobre el objetivo` : `Faltan ${p.falta}` }}</span>
              <span class="aporte">Aporta {{ fmtPct(p.aporte) }} del logro</span>
            </li>
          </ol>
        </div>
      </article>

      <article class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title">¿En qué semana se quedó cada uno?</h3>
            <p class="ds-panel-sub">Logro / objetivo por semana · {{ monthName(month).toLowerCase() }}</p>
          </div>
          <div class="escala" aria-label="Escala de colores">
            <span class="heat rose-strong">&lt; 80%</span><span class="heat rose">80–99%</span><span class="heat ok">100–119%</span><span class="heat top">≥ 120%</span>
          </div>
        </header>
        <div class="ds-panel-body ds-table-scroll">
          <table class="mapa">
            <thead>
              <tr>
                <th scope="col">Sem.</th><th scope="col">Días</th><th scope="col">Equipo</th>
                <th v-for="p in report.people" :key="p.user_id" scope="col">{{ displayName(p.nombre) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fila in mapa.semanas" :key="fila.key">
                <th scope="row">{{ fila.label }}</th>
                <td class="dias">{{ fila.dias }}</td>
                <td v-for="(c, i) in fila.celdas" :key="i">
                  <span class="heat" :class="c.tono"><strong>{{ c.valor }}</strong><small>{{ c.detalle }}</small></span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colspan="2">Total</th>
                <td v-for="(c, i) in mapa.total" :key="i">
                  <span class="heat" :class="c.tono"><strong>{{ c.valor }}</strong><small>{{ c.detalle }}</small></span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <footer class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Fuera del mapa: {{ fueraDelMapa }}. El equipo suma todas las ventas del mes.</span>
        </footer>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { asesoresReport, asesoresInsights, goalTone, heatTone, compliance, pct, periodOf, monthName, displayName } from '@/features/plan-comercial/planComercial'
import LecturaRapida from './LecturaRapida.vue'

const props = defineProps({
  month: { type: String, required: true },
  today: { type: String, required: true },
  puedeEditar: { type: Boolean, default: false },
  reloadKey: { type: Number, default: 0 }
})

const service = inject(ServiceKeys.PlanComercial)
const data = ref(null)
const loading = ref(false)
const error = ref('')

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    data.value = await service.asesores(props.month)
  } catch (err) {
    console.error('[PlanComercial] asesores', { month: props.month, err })
    error.value = err?.response?.data?.message || 'No se pudieron cargar los objetivos por asesor. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch(() => [props.month, props.reloadKey], cargar, { immediate: true })

const report = computed(() => (data.value ? asesoresReport(data.value, props.today) : null))
const insights = computed(() => asesoresInsights(report.value))
// La barra llega hasta el 125% (o mas si alguien se paso): la marca del 100%
// queda siempre a la vista.
const escala = computed(() => Math.max(1.25, ...report.value.ranking.map((p) => p.cumplimiento)))
const fueraDelMapa = computed(() => {
  const sum = (k) => data.value.weeks.reduce((s, w) => s + w[k], 0)
  return `${sum('otros')} ventas de otras áreas y ${sum('b2b')} de convenios B2B`
})

const fmtPct = (ratio) => formatValue(pct(ratio), 'pct')

// Una celda del mapa: "logro / objetivo" y el %. La semana en curso no se juzga
// todavia y la que no empezo no tiene logro que mostrar.
function celda (logro, obj, semana) {
  const sinObjetivo = obj === null
  if (semana && !semana.empezo) return { tono: 'neutro', valor: '—', detalle: sinObjetivo ? 'sin objetivo' : `obj. ${obj}` }
  const ratio = compliance(logro, obj)
  const enCurso = semana?.en_curso
  return {
    tono: enCurso ? 'neutro' : heatTone(ratio),
    valor: sinObjetivo ? String(logro) : `${logro} / ${obj}`,
    detalle: sinObjetivo ? 'sin objetivo' : enCurso ? `obj. ${obj} · en curso` : fmtPct(ratio)
  }
}

// Filas = semanas, columnas = equipo + cada asesor.
const mapa = computed(() => {
  const { weeks, people, team } = report.value
  return {
    semanas: weeks.map((w, wi) => ({
      key: w.date_start,
      label: w.week_label,
      dias: periodOf(w),
      celdas: [celda(w.vacantes, w.obj_vacantes, w), ...people.map((p) => celda(p.semanas[wi].vacantes, p.semanas[wi].obj, w))]
    })),
    total: [celda(team.logro, team.obj), ...people.map((p) => celda(p.logro, p.obj))]
  }
})
</script>

<style scoped>
.skel-line { margin: 12px 0; }

.ranking { list-style: none; margin: 0; padding: 0; }
.ranking li {
  display: grid;
  grid-template-columns: 24px minmax(110px, 150px) minmax(120px, 1fr) 64px 80px 140px 150px;
  gap: 14px;
  align-items: center;
  padding: 11px 0;
  border-top: 1px solid var(--ds-border);
}
.ranking li:first-child { border-top: 0; }
.pos { font-size: 17px; font-weight: 800; color: var(--ds-muted); }
.quien { display: flex; flex-direction: column; min-width: 0; }
.quien strong { font-size: 14px; color: var(--ds-heading); }
.quien span { font-size: 11.5px; color: var(--ds-muted); }
.barra { position: relative; height: 10px; border-radius: 5px; background: var(--ds-surface-3); }
.barra i { position: absolute; inset: 0 auto 0 0; border-radius: 5px; background: var(--ds-bar); }
.barra i.ok { background: var(--ds-ok); }
.barra i.rose { background: var(--ds-rose); }
.barra b { position: absolute; top: -4px; width: 2px; height: 18px; margin-left: -1px; border-radius: 1px; background: var(--ds-heading); }
.cifra { font-size: 13.5px; font-variant-numeric: tabular-nums; color: var(--ds-ink-2); }
.cifra strong { color: var(--ds-ink); }
.falta { font-size: 12.5px; font-weight: 600; }
.falta.ok { color: var(--ds-ok-ink); }
.falta.rose { color: var(--ds-rose-ink); }
.aporte { font-size: 12px; color: var(--ds-ink-2); }

@media (max-width: 900px) {
  .ranking li { grid-template-columns: 24px 1fr auto; row-gap: 6px; }
  .barra { grid-column: 2 / -1; }
  .cifra, .falta, .aporte { grid-column: 2 / -1; }
}

.escala { display: flex; flex-wrap: wrap; gap: 4px; }
.escala .heat { padding: 3px 8px; font-size: 11px; font-weight: 700; }

.mapa { width: 100%; min-width: 720px; border-collapse: separate; border-spacing: 4px; font-size: 12.5px; }
.mapa th { font-size: 11.5px; font-weight: 700; color: var(--ds-heading); text-align: center; white-space: nowrap; }
.mapa th[scope="row"] { text-align: left; }
.mapa thead th:nth-child(-n + 2) { text-align: left; color: var(--ds-muted); }
.mapa td.dias { color: var(--ds-ink-2); white-space: nowrap; }
.mapa tfoot th { color: var(--ds-heading); }

.heat { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 6px 8px; border-radius: var(--ds-radius-sm); background: var(--ds-soft-neutral); color: var(--ds-ink-2); font-variant-numeric: tabular-nums; }
.heat strong { font-size: 14px; font-weight: 800; }
.heat small { font-size: 10.5px; font-weight: 500; opacity: 0.85; }
.heat.rose-strong { background: var(--ds-rose-strong); color: var(--ds-rose-ink); }
.heat.rose { background: var(--ds-soft-rose); color: var(--ds-rose-ink); }
.heat.ok { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
/* Sobre el 120%: el verde lleno invierte el texto para que se note a distancia. */
.heat.top { background: var(--ds-ok-ink); color: var(--ds-surface); }
</style>
