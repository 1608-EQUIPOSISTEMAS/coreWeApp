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
            <p class="ds-panel-sub">Objetivo y logro por semana · {{ monthName(month).toLowerCase() }} · el equipo lleva el objetivo del área, no la suma de los asesores</p>
          </div>
          <div class="escala" aria-label="Escala de colores">
            <span class="heat rose-strong">&lt; 80%</span><span class="heat rose">80–99%</span><span class="heat ok">100–119%</span><span class="heat top">≥ 120%</span>
          </div>
        </header>
        <div class="ds-panel-body ds-table-scroll">
          <table class="ds-table mapa">
            <thead>
              <tr class="grupos">
                <th colspan="2"></th>
                <th v-for="c in mapa.columnas" :key="c.key" colspan="4" class="sep" :class="{ equipo: c.equipo }">{{ c.nombre }}</th>
              </tr>
              <tr>
                <th>Sem.</th><th>Días</th>
                <template v-for="c in mapa.columnas" :key="c.key">
                  <th class="num sep" :class="{ equipo: c.equipo }">% part.</th>
                  <th class="num" :class="{ equipo: c.equipo }">Obj.</th>
                  <th class="num" :class="{ equipo: c.equipo }">% logro</th>
                  <th class="num" :class="{ equipo: c.equipo }">Logro</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(w, wi) in report.weeks" :key="w.date_start">
                <td class="sem">{{ w.week_label }}</td>
                <td class="dias">{{ periodOf(w) }}</td>
                <template v-for="c in mapa.columnas" :key="c.key">
                  <td class="num sep suave" :class="{ equipo: c.equipo }">{{ fmtPct(c.semanas[wi].part) }}</td>
                  <td class="num" :class="{ equipo: c.equipo }">{{ formatValue(c.semanas[wi].obj, 'num') }}</td>
                  <td class="num" :class="{ equipo: c.equipo }"><span class="heat" :class="c.semanas[wi].tono">{{ fmtPct(c.semanas[wi].ratio) }}</span></td>
                  <td class="num fuerte" :class="{ equipo: c.equipo }">{{ c.semanas[wi].logro }}</td>
                </template>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">Total</td>
                <template v-for="c in mapa.columnas" :key="c.key">
                  <td class="num sep" :class="{ equipo: c.equipo }">{{ c.obj ? '100%' : '—' }}</td>
                  <td class="num" :class="{ equipo: c.equipo }">{{ formatValue(c.obj, 'num') }}</td>
                  <td class="num" :class="{ equipo: c.equipo }"><span class="heat" :class="c.total.tono">{{ fmtPct(c.total.ratio) }}</span></td>
                  <td class="num" :class="{ equipo: c.equipo }">{{ c.total.logro }}</td>
                </template>
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

// Una semana de una columna del mapa. La semana en curso no se juzga todavia y
// la que no empezo no tiene logro que mostrar.
function celda (logro, obj, objMes, semana) {
  const ratio = semana && !semana.empezo ? null : compliance(logro, obj)
  return {
    part: objMes ? (obj ?? 0) / objMes : null,
    obj,
    ratio,
    logro: semana && !semana.empezo ? '—' : logro,
    tono: semana?.en_curso || ratio === null ? 'neutro' : heatTone(ratio)
  }
}

// Columnas = equipo + cada asesor, con la estructura de la hoja: % part. | Obj. | % logro | Logro.
const mapa = computed(() => {
  const { weeks, people, team } = report.value
  const equipo = {
    key: 'equipo',
    nombre: 'Equipo',
    equipo: true,
    obj: team.obj,
    semanas: weeks.map((w) => celda(w.vacantes, w.obj_vacantes, team.obj, w)),
    total: celda(team.logro, team.obj)
  }
  const asesores = people.map((p) => ({
    key: p.user_id,
    nombre: displayName(p.nombre),
    equipo: false,
    obj: p.obj,
    semanas: weeks.map((w, wi) => celda(p.semanas[wi].vacantes, p.semanas[wi].obj, p.obj, w)),
    total: celda(p.logro, p.obj)
  }))
  return { columnas: [equipo, ...asesores] }
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

.mapa { min-width: 720px; font-size: 12.5px; }
.mapa .grupos th { padding-top: 0; font-size: 11.5px; font-weight: 700; color: var(--ds-heading); text-align: center; }
.mapa .sep { border-left: 1px solid var(--ds-border); }
.mapa td.sem { font-weight: 700; color: var(--ds-heading); }
.mapa td.dias, .mapa td.suave { color: var(--ds-muted); white-space: nowrap; }
.mapa td.fuerte { font-weight: 700; color: var(--ds-ink); }
/* El bloque del equipo se tiñe: su objetivo es el del area, no la suma de los asesores. */
.mapa .equipo { background: var(--ds-surface-2); }
.mapa tfoot td { font-weight: 700; color: var(--ds-heading); border-top: 1px solid var(--ds-border-strong); }

.heat { display: inline-block; min-width: 44px; padding: 2px 7px; text-align: center; border-radius: var(--ds-radius-sm); background: var(--ds-soft-neutral); color: var(--ds-ink-2); font-variant-numeric: tabular-nums; }
.heat { font-weight: 700; }
.heat.rose-strong { background: var(--ds-rose-strong); color: var(--ds-rose-ink); }
.heat.rose { background: var(--ds-soft-rose); color: var(--ds-rose-ink); }
.heat.ok { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
/* Sobre el 120%: el verde lleno invierte el texto para que se note a distancia. */
.heat.top { background: var(--ds-ok-ink); color: var(--ds-surface); }
</style>
