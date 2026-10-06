<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { addDaysIso } from '@/shared/lib/localDate'
import WeekNavigator from './components/WeekNavigator.vue'
import { useIsoWeekNav, formatDayMonth } from '@/features/academica-week/useIsoWeekNav'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const router = useRouter()

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Mismos codigos que Control de Ediciones (edition_session_control).
const ESTADOS = {
  '': { label: 'Programada', short: '—', tone: '' },
  A: { label: 'Dictada', short: 'A', tone: 'ok' },
  R: { label: 'Reprogramada', short: 'R', tone: 'bad' },
  T: { label: 'Tardanza', short: 'T', tone: 'warn' }
}
const LEGEND = ['A', 'R', 'T', ''].map((code) => ({ code, ...ESTADOS[code] }))

const weekNav = useIsoWeekNav()
const { todayYmd } = weekNav
const data = ref(null)
const isLoading = ref(false)

async function load() {
  isLoading.value = true
  try {
    // Mismo cronograma EFECTIVO que Control de Ediciones (reprogramaciones
    // incluidas) mas la auditoria de cada sesion — aqui solo se pivotea por dia.
    data.value = await editionService.teacherFollowup({
      date_start: weekNav.monday.value,
      date_end: weekNav.sunday.value
    })
  } catch (err) {
    console.error('Error cargando vista semanal:', err)
    toast.error('Error al cargar la vista semanal')
    data.value = null
  } finally {
    isLoading.value = false
  }
}

function moveWeek(delta) {
  weekNav.move(delta)
  load()
}

function goToday() {
  weekNav.goToday()
  load()
}

onMounted(load)

// Minutos desde medianoche del inicio de "07:00 pm - 10:00 pm" para ordenar
// las clases del dia; hora no reconocida va al final.
function startMinutes(label) {
  const m = String(label || '').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m|p\.?\s*m)?/i)
  if (!m) return 9999
  let h = Number(m[1]) % 12
  if (m[3] && /p/i.test(m[3])) h += 12
  return h * 60 + Number(m[2] || 0)
}

// Auditada = tiene nota de la IA o de la rubrica manual (mismo criterio que la
// matriz del Reporte Academico). Solo el guardado manual firma autor.
const isAudited = (s) => s.ai_20 != null || s.manual_20 != null
const auditorOf = (s) => s.audited_by || 'IA'
// Una clase que aun no se dicta no esta "pendiente de auditar". Hoy cuenta:
// la de la mañana ya puede tener auditoria.
const isDue = (s) => s.date <= todayYmd

const AUDIT_FILTERS = [
  { key: 'todas', label: 'Todas', match: () => true },
  { key: 'auditadas', label: 'Auditadas', match: (c) => isAudited(c.session) },
  { key: 'pendientes', label: 'Sin auditar', match: (c) => isDue(c.session) && !isAudited(c.session) }
]
const auditFilter = ref(AUDIT_FILTERS[0])

// Pivote: sesiones cuya fecha efectiva cae en la semana, agrupadas por dia.
const allDays = computed(() => {
  if (!data.value) return []
  const out = []
  const byDate = new Map()
  for (let i = 0; i < 7; i++) {
    const key = addDaysIso(data.value.date_start, i)
    const [, m, d] = key.split('-').map(Number)
    const day = { date: key, name: DAY_NAMES[i], num: d, month: MONTHS[m - 1], classes: [] }
    out.push(day)
    byDate.set(key, day)
  }
  for (const e of data.value.editions || []) {
    for (const s of e.sessions || []) {
      byDate.get(s.date)?.classes.push({ edition: e, session: s })
    }
  }
  for (const d of out) {
    d.classes.sort(
      (a, b) =>
        startMinutes(a.edition.hour_label) - startMinutes(b.edition.hour_label) ||
        String(a.edition.abbreviation).localeCompare(String(b.edition.abbreviation), 'es')
    )
  }
  return out
})

const days = computed(() =>
  allDays.value.map((d) => ({ ...d, classes: d.classes.filter(auditFilter.value.match) }))
)

// Resumen de la semana completa (sin filtro) para los KPIs de la cabecera.
const summary = computed(() => {
  const s = { total: 0, A: 0, R: 0, T: 0, nm: 0, audited: 0, due: 0 }
  for (const d of allDays.value) {
    for (const c of d.classes) {
      s.total++
      if (c.session.status) s[c.session.status]++
      if (c.edition.new_methodology) s.nm++
      if (isAudited(c.session)) s.audited++
      if (isDue(c.session)) s.due++
    }
  }
  return s
})
const totalWeek = computed(() => summary.value.total)

const estadoOf = (s) => ESTADOS[s.status || '']
const openAula = (id) => id && router.push({ name: 'AcademicaAulaDetail', params: { id } })
</script>

<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Vista Semanal</h1>
        <p class="ds-sub">
          Clases dictándose cada día de la semana —
          <b>{{ totalWeek }} {{ totalWeek === 1 ? 'clase' : 'clases' }}</b>
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="isLoading" @click="goToday">
          <i class="fa-regular fa-calendar-check" aria-hidden="true"></i> Hoy
        </button>
        <WeekNavigator
          :week="weekNav.week.value"
          :start="data?.date_start"
          :end="data?.date_end"
          :disabled="isLoading"
          @move="moveWeek"
        />
      </div>
    </header>

    <div class="ds-kpis">
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-regular fa-calendar"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading && !data" class="skel-kpi"></span>
            <template v-else>{{ summary.total }}</template>
          </span>
          <span class="ds-kpi-label">Clases esta semana</span>
          <span class="ds-kpi-note">en los 7 días</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon ok" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading && !data" class="skel-kpi"></span>
            <template v-else>{{ summary.A }}</template>
          </span>
          <span class="ds-kpi-label">Dictadas</span>
          <span class="ds-kpi-note">{{ summary.T }} con tardanza</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon bad" aria-hidden="true"><i class="fa-solid fa-rotate"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading && !data" class="skel-kpi"></span>
            <template v-else>{{ summary.R }}</template>
          </span>
          <span class="ds-kpi-label">Reprogramadas</span>
          <span class="ds-kpi-note">movidas de fecha</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-flask"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading && !data" class="skel-kpi"></span>
            <template v-else>{{ summary.nm }}</template>
          </span>
          <span class="ds-kpi-label">Nueva metodología</span>
          <span class="ds-kpi-note">clases marcadas NM</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-clipboard-check"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading && !data" class="skel-kpi"></span>
            <template v-else>{{ summary.audited }}</template>
          </span>
          <span class="ds-kpi-label">Auditadas</span>
          <span class="ds-kpi-note">de {{ summary.due }} clases ya dictadas</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <div class="legend">
          <span v-for="l in LEGEND" :key="l.code" class="legend-item">
            <span class="ds-pill mark" :class="l.tone">{{ l.short }}</span>{{ l.label }}
          </span>
          <span class="legend-item">
            <span class="ds-pill cyan mark">NM</span>Nueva metodología
          </span>
        </div>
        <div class="ds-tabs" role="group" aria-label="Filtrar por auditoría">
          <button
            v-for="f in AUDIT_FILTERS"
            :key="f.key"
            type="button"
            :aria-pressed="String(auditFilter.key === f.key)"
            @click="auditFilter = f"
          >{{ f.label }}</button>
        </div>
        <span class="ds-panel-hint">Clic en una clase para abrir su aula</span>
      </header>

      <div v-if="isLoading && !data" class="ds-panel-body">
        <span v-for="n in 6" :key="n" class="ds-skel skel-row"></span>
      </div>
      <p v-else-if="!totalWeek" class="ds-empty ds-empty--lista">
        Sin clases esta semana. Usa las flechas para navegar entre semanas.
      </p>

      <div v-else class="ds-panel-body grid-wrap">
        <div class="day-grid">
          <div v-for="d in days" :key="d.date" class="day-col" :class="{ today: d.date === todayYmd }">
            <div class="day-head">
              <span class="dn">{{ d.name }}</span>
              <span class="dd">{{ d.num }} {{ d.month }}</span>
              <span v-if="d.classes.length" class="dc">{{ d.classes.length }}</span>
            </div>
            <div v-if="!d.classes.length" class="day-empty">Sin clases</div>
            <button
              v-for="c in d.classes"
              :key="c.edition.edition_num_id + ':' + c.session.session_number"
              class="cls"
              type="button"
              :class="{ 'cls-nm': c.edition.new_methodology }"
              @click="openAula(c.edition.edition_num_id)"
            >
              <div class="cls-top">
                <span class="hr">{{ c.edition.hour_label || '—' }}</span>
                <span class="ds-pill info sn">S{{ c.session.session_number }}/{{ c.edition.total_sessions }}</span>
              </div>
              <div class="cls-name">{{ c.edition.abbreviation }}</div>
              <div class="cls-code">{{ c.edition.specific_code }}</div>
              <div class="cls-doc">{{ c.edition.instructor || 'Sin docente' }}</div>
              <div class="cls-badges">
                <span v-if="c.edition.new_methodology" class="ds-pill cyan">Nueva metodología</span>
                <span v-if="c.session.status" class="ds-pill" :class="estadoOf(c.session).tone">
                  {{ estadoOf(c.session).label }}
                  <template v-if="c.session.new_date"> · era {{ formatDayMonth(c.session.planned_date) }}</template>
                </span>
                <span v-if="isAudited(c.session)" class="ds-pill violet">
                  <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i> Auditada · {{ auditorOf(c.session) }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ds-ink-2); }
.mark { min-width: 22px; height: 22px; padding: 0 4px; justify-content: center; font-family: var(--ds-font-mono); }
.skel-row { margin: 10px 0; }

/* Kanban de 7 dias: una columna por dia, la de hoy resaltada. */
.grid-wrap { overflow-x: auto; }
.day-grid { display: grid; grid-template-columns: repeat(7, minmax(196px, 1fr)); gap: 12px; min-width: 1180px; }
.day-col {
  display: flex; flex-direction: column; gap: 8px; min-height: 180px; padding: 10px;
  background: var(--ds-surface-2); border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
}
.day-col.today { background: var(--ds-soft-info); border-color: var(--ds-accent); }

.day-head { display: flex; align-items: baseline; gap: 7px; padding: 2px 4px 8px; border-bottom: 1px solid var(--ds-border); }
.dn { font-size: 12px; font-weight: 700; color: var(--ds-ink-2); }
.day-col.today .dn { color: var(--ds-info-ink); }
.dd { font-size: 11.5px; color: var(--ds-muted); }
.dc {
  margin-left: auto; padding: 1px 7px; border: 1px solid var(--ds-border); border-radius: 999px;
  background: var(--ds-surface); font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums;
  font-size: 10.5px; font-weight: 600; color: var(--ds-ink-2);
}
.day-col.today .dc { border-color: transparent; color: var(--ds-info-ink); }
.day-empty { padding: 22px 0; text-align: center; font-size: 12px; color: var(--ds-muted); }

/* Tarjeta de clase; la de nueva metodologia lleva una franja cian a la izquierda. */
.cls {
  position: relative; display: block; width: 100%; padding: 10px 11px; overflow: hidden;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  font: inherit; color: var(--ds-ink); text-align: left; cursor: pointer;
  transition: border-color 0.12s, transform 0.12s;
}
.cls:hover { border-color: var(--ds-border-strong); transform: translateY(-1px); }
.cls:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.cls.cls-nm { padding-left: 14px; }
.cls.cls-nm::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: var(--ds-cyan-ink); }
.cls-top { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.hr {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: var(--ds-font-mono); font-size: 10.5px; font-weight: 600; color: var(--ds-ink-2);
}
.sn { flex: none; margin-left: auto; font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }
.cls-name { font-size: 13px; font-weight: 600; line-height: 1.25; color: var(--ds-heading); }
.cls-code { margin-top: 2px; font-family: var(--ds-font-mono); font-size: 10.5px; color: var(--ds-muted); }
.cls-doc { margin-top: 5px; font-size: 12px; color: var(--ds-ink-2); }
.cls-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
.cls-badges:empty { display: none; }
</style>
