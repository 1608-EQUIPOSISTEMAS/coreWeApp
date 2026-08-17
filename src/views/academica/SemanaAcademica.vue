<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const router = useRouter()

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Mismos codigos que Control de Ediciones (edition_session_control).
const ESTADOS = {
  '': { key: 'pend', label: 'Programada', short: '—' },
  A: { key: 'dictada', label: 'Dictada', short: 'A' },
  R: { key: 'repro', label: 'Reprogramada', short: 'R' },
  T: { key: 'tard', label: 'Tardanza', short: 'T' }
}

// Evita el corrimiento UTC de un dia (mismo helper que ControlEdiciones.vue).
function parseLocal(str) {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
const toYmd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Semana ISO de una fecha (el jueves de la semana define el anio ISO).
function isoWeekOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return { year: d.getFullYear(), week: Math.ceil(((d - jan1) / 86400000 + 1) / 7) }
}

// Un anio ISO tiene 53 semanas si empieza en jueves (o miercoles si es bisiesto).
function weeksInYear(y) {
  const jan1 = new Date(y, 0, 1).getDay()
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  return jan1 === 4 || (leap && jan1 === 3) ? 53 : 52
}

const { year: y0, week: w0 } = isoWeekOf(new Date())
const year = ref(y0)
const week = ref(w0)
const data = ref(null)
const isLoading = ref(false)
const todayYmd = toYmd(new Date())

async function load() {
  isLoading.value = true
  try {
    // Mismo endpoint que Control de Ediciones: trae el cronograma EFECTIVO
    // (reprogramaciones incluidas) — aqui solo se pivotea por dia.
    data.value = await editionService.weeklyControl({ year: year.value, week: week.value })
  } catch (err) {
    console.error('Error cargando vista semanal:', err)
    toast.error('Error al cargar la vista semanal')
    data.value = null
  } finally {
    isLoading.value = false
  }
}

function moveWeek(delta) {
  let w = week.value + delta
  if (w < 1) {
    year.value -= 1
    w = weeksInYear(year.value)
  } else if (w > weeksInYear(year.value)) {
    year.value += 1
    w = 1
  }
  week.value = w
  load()
}

function goToday() {
  const t = isoWeekOf(new Date())
  year.value = t.year
  week.value = t.week
  load()
}

onMounted(load)

const rangeLabel = computed(() => {
  if (!data.value) return ''
  const s = parseLocal(data.value.date_start)
  const e = parseLocal(data.value.date_end)
  return `${s.getDate()} ${MONTHS[s.getMonth()]} al ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
})

// Minutos desde medianoche del inicio de "07:00 pm - 10:00 pm" para ordenar
// las clases del dia; hora no reconocida va al final.
function startMinutes(label) {
  const m = String(label || '').match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m|p\.?\s*m)?/i)
  if (!m) return 9999
  let h = Number(m[1]) % 12
  if (m[3] && /p/i.test(m[3])) h += 12
  return h * 60 + Number(m[2] || 0)
}

// Pivote: sesiones cuya fecha efectiva cae en la semana, agrupadas por dia.
const days = computed(() => {
  if (!data.value) return []
  const monday = parseLocal(data.value.date_start)
  const out = []
  const byDate = new Map()
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const key = toYmd(d)
    const day = { date: key, name: DAY_NAMES[i], num: d.getDate(), month: MONTHS[d.getMonth()], classes: [] }
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

// Resumen de la semana visible para los KPIs de la cabecera.
const summary = computed(() => {
  const s = { total: 0, A: 0, R: 0, T: 0, nm: 0 }
  for (const d of days.value) {
    for (const c of d.classes) {
      s.total++
      if (c.session.status) s[c.session.status]++
      if (c.edition.new_methodology) s.nm++
    }
  }
  return s
})
const totalWeek = computed(() => summary.value.total)

const fmtShort = (ymd) => {
  if (!ymd) return ''
  const d = parseLocal(ymd)
  return `${d.getDate()}/${d.getMonth() + 1}`
}
const estadoOf = (s) => ESTADOS[s.status || '']
const openAula = (id) => id && router.push({ name: 'AcademicaAulaDetail', params: { id } })
</script>

<template>
  <div class="cw-shell">
    <header class="page-head">
      <div class="titles">
        <div class="eyebrow">Academica</div>
        <h1>Vista Semanal</h1>
        <div class="subtitle">
          Clases dictándose cada día de la semana —
          <b>{{ totalWeek }} {{ totalWeek === 1 ? 'clase' : 'clases' }}</b>
        </div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="isLoading" @click="goToday">
          <i class="fa-regular fa-calendar-check"></i> Hoy
        </button>
        <div class="week-nav">
          <button class="arrow" :disabled="isLoading" @click="moveWeek(-1)" title="Semana anterior">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="center">
            <div class="wk">Semana {{ week }}</div>
            <div class="rg">{{ rangeLabel }}</div>
          </div>
          <button class="arrow" :disabled="isLoading" @click="moveWeek(1)" title="Semana siguiente">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi" style="--bar: #2563EB">
        <div class="k-label">
          <span>Clases esta semana</span>
          <i class="fa-regular fa-calendar k-icon"></i>
        </div>
        <div class="k-value">
          <span v-if="isLoading && !data" class="skel skel-kpi"></span>
          <template v-else>{{ summary.total }}</template>
        </div>
        <div class="k-foot"><span>en los 7 días</span></div>
      </div>
      <div class="kpi" style="--bar: #10B981">
        <div class="k-label">
          <span>Dictadas</span>
          <i class="fa-solid fa-check k-icon"></i>
        </div>
        <div class="k-value">
          <span v-if="isLoading && !data" class="skel skel-kpi"></span>
          <template v-else>{{ summary.A }}</template>
        </div>
        <div class="k-foot"><span>{{ summary.T }} con tardanza</span></div>
      </div>
      <div class="kpi" style="--bar: #EF4444">
        <div class="k-label">
          <span>Reprogramadas</span>
          <i class="fa-solid fa-rotate k-icon"></i>
        </div>
        <div class="k-value">
          <span v-if="isLoading && !data" class="skel skel-kpi"></span>
          <template v-else>{{ summary.R }}</template>
        </div>
        <div class="k-foot"><span>movidas de fecha</span></div>
      </div>
      <div class="kpi" style="--bar: #0E7490">
        <div class="k-label">
          <span>Nueva metodología</span>
          <i class="fa-solid fa-flask k-icon"></i>
        </div>
        <div class="k-value">
          <span v-if="isLoading && !data" class="skel skel-kpi"></span>
          <template v-else>{{ summary.nm }}</template>
        </div>
        <div class="k-foot"><span>clases marcadas NM</span></div>
      </div>
    </div>

    <div class="filter-bar">
      <span class="bar-title">Leyenda</span>
      <span class="divider"></span>
      <span v-for="k in ['A', 'R', 'T', '']" :key="k" class="lg">
        <span class="sw" :class="'e-' + ESTADOS[k].key">{{ ESTADOS[k].short }}</span>{{ ESTADOS[k].label }}
      </span>
      <span class="lg">
        <span class="sw e-nm">NM</span>Nueva metodología
      </span>
      <div class="spacer"></div>
      <span class="muted">Clic en una clase para abrir su aula</span>
    </div>

    <div v-if="isLoading && !data" class="empty-state">
      <i class="fa-solid fa-arrows-rotate fa-spin"></i> Cargando…
    </div>
    <div v-else-if="!totalWeek" class="empty-state">
      <div class="big">Sin clases esta semana</div>
      Usa las flechas para navegar entre semanas
    </div>

    <div v-else class="grid-wrap">
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
            :class="{ 'cls-nm': c.edition.new_methodology }"
            @click="openAula(c.edition.edition_num_id)"
          >
            <div class="cls-top">
              <span class="hr">{{ c.edition.hour_label || '—' }}</span>
              <span class="sn">S{{ c.session.session_number }}/{{ c.edition.total_sessions }}</span>
            </div>
            <div class="cls-name">{{ c.edition.abbreviation }}</div>
            <div class="cls-code">{{ c.edition.specific_code }}</div>
            <div class="cls-doc">{{ c.edition.instructor || 'Sin docente' }}</div>
            <div v-if="c.edition.new_methodology" class="cls-badge e-nm">Nueva metodología</div>
            <div v-if="c.session.status" class="cls-badge" :class="'e-' + estadoOf(c.session).key">
              {{ estadoOf(c.session).label }}
              <template v-if="c.session.new_date"> · era {{ fmtShort(c.session.planned_date) }}</template>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mismos tokens que Aulas.vue / ControlEdiciones.vue. La estructura sigue
   siendo el kanban de 7 columnas; solo cambia la piel. */
.cw-shell {
  --bg-soft: #FAFAF8;
  --line: #E8E8E3;
  --line-soft: #EFEFEA;
  --ink: #14140F;
  --ink-2: #3A3A33;
  --ink-3: #6F6F66;
  --ink-4: #A0A099;
  --green: #10B981;
  --green-soft: #ECFDF4;
  --green-ink: #047857;
  --amber-soft: #FEF6E1;
  --amber-ink: #B45309;
  --red-soft: #FEECEC;
  --red-ink: #B91C1C;
  --blue-soft: #ECF2FE;
  --blue-ink: #1D4ED8;
  --nm-soft: #ECFEFF; --nm-ink: #0E7490; /* nueva metodologia */
  --accent: var(--we-navy, #002060);
  --surface: #ffffff;
  --radius: 10px;
  --radius-lg: 14px;
  --shadow-md: 0 1px 2px rgba(20,20,15,0.04), 0 4px 12px rgba(20,20,15,0.06);
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  font-size: 14px;
  max-width: 1600px;
  margin: 0 auto;
}
.cw-shell button { font-family: inherit; cursor: pointer; }
.cw-shell button:disabled { opacity: 0.55; cursor: default; }
.spacer { flex: 1; }
.muted { color: var(--ink-3); font-size: 12px; }

/* ---------- page-head ---------- */
.page-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.page-head .titles { flex: 1; min-width: 0; }
.page-head .eyebrow {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.page-head h1 { margin: 4px 0 2px; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.page-head .subtitle { color: var(--ink-3); font-size: 13.5px; }
.page-head .actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  border: 1px solid var(--line); background: var(--surface);
  color: var(--ink-2); transition: background 0.15s, border-color 0.15s;
}
.btn:hover { background: var(--bg-soft); border-color: #DDD; }

.week-nav {
  display: flex; align-items: center; gap: 2px;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 3px;
}
.week-nav .arrow {
  width: 30px; height: 34px; border-radius: 7px; border: none;
  background: transparent; color: var(--ink-3);
  display: grid; place-items: center; transition: 0.15s;
}
.week-nav .arrow:hover { background: var(--bg-soft); color: var(--ink); }
.week-nav .center { text-align: center; padding: 0 12px; min-width: 138px; }
.week-nav .center .wk { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
.week-nav .center .rg { font-size: 11px; color: var(--ink-3); margin-top: 1px; }

/* ---------- KPIs ---------- */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.kpi {
  background: var(--surface); border-radius: var(--radius);
  padding: 14px 16px; border: 1px solid var(--line);
  position: relative; overflow: hidden;
}
.kpi::before {
  content: ''; position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 3px; border-radius: 2px; background: var(--bar, var(--ink-4));
}
.kpi .k-label {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.kpi .k-icon { color: var(--ink-4); font-size: 14px; }
.kpi .k-value { font-size: 30px; font-weight: 600; letter-spacing: -0.025em; margin-top: 4px; line-height: 1.1; }
.kpi .k-foot { margin-top: 10px; font-size: 12px; color: var(--ink-3); }

/* ---------- barra de leyenda ---------- */
.filter-bar {
  background: var(--surface); border-radius: var(--radius); border: 1px solid var(--line);
  padding: 12px 14px; margin-bottom: 14px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 14px;
}
.filter-bar .bar-title {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.divider { width: 1px; height: 22px; background: var(--line); margin: 0 -4px; }
.lg { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ink-2); }
.sw {
  width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center;
  font-size: 11px; font-weight: 700; font-family: var(--font-mono);
}

.e-pend { background: var(--bg-soft); color: var(--ink-3); border: 1px solid var(--line); }
.e-dictada { background: var(--green-soft); color: var(--green-ink); }
.e-repro { background: var(--red-soft); color: var(--red-ink); }
.e-tard { background: var(--amber-soft); color: var(--amber-ink); }
.e-nm { background: var(--nm-soft); color: var(--nm-ink); }

/* ---------- kanban de 7 dias ---------- */
.grid-wrap { overflow-x: auto; padding-bottom: 6px; }
.day-grid { display: grid; grid-template-columns: repeat(7, minmax(196px, 1fr)); gap: 12px; min-width: 1180px; }
.day-col {
  background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius-lg);
  padding: 10px; display: flex; flex-direction: column; gap: 8px; min-height: 180px;
}
.day-col.today { border-color: var(--blue-ink); background: var(--blue-soft); }

.day-head {
  display: flex; align-items: baseline; gap: 7px;
  padding: 2px 4px 8px; border-bottom: 1px solid var(--line);
}
.day-head .dn {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-3);
}
.day-col.today .day-head .dn { color: var(--blue-ink); }
.day-head .dd { font-size: 11.5px; color: var(--ink-4); }
.day-head .dc {
  margin-left: auto; font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 10.5px; font-weight: 600; color: var(--ink-3);
  background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 1px 7px;
}
.day-col.today .day-head .dc { color: var(--blue-ink); border-color: transparent; }

.day-empty { color: var(--ink-4); font-size: 12px; text-align: center; padding: 22px 0; }

/* tarjeta de clase: mismo lenguaje que .course-card de Aulas, en chico */
.cls {
  display: block; width: 100%; text-align: left;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 10px 11px;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
  position: relative; overflow: hidden;
}
.cls:hover { border-color: #D4D4CC; box-shadow: var(--shadow-md); transform: translateY(-1px); }
.cls.cls-nm::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--nm-ink);
}
.cls.cls-nm { padding-left: 14px; }
.cls-top { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.cls-top .hr {
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; color: var(--ink-3);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cls-top .sn {
  margin-left: auto; flex: none;
  font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 10px; font-weight: 600; color: var(--blue-ink);
  background: var(--blue-soft); border-radius: 999px; padding: 2px 7px;
}
.cls-name { font-size: 13px; font-weight: 600; letter-spacing: -0.005em; line-height: 1.25; }
.cls-code { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-4); margin-top: 2px; }
.cls-doc { font-size: 12px; color: var(--ink-3); margin-top: 5px; }
.cls-badge {
  display: inline-flex; align-items: center; margin-top: 7px;
  border-radius: 999px; padding: 2px 8px;
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
}

.empty-state {
  text-align: center; padding: 70px 20px; color: var(--ink-3);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
}
.empty-state .big { font-size: 18px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; }

/* skeleton (mismo shimmer que Aulas) */
.skel {
  display: block;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skel-kpi { width: 56px; height: 30px; }

@media (max-width: 1100px) {
  .page-head { flex-wrap: wrap; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .cw-shell {
  --bg-soft: #1F1F1A;
  --line: #2A2A22;
  --line-soft: #1F1F1A;
  --ink: #F4F4F0;
  --ink-2: #D4D4CC;
  --ink-3: #A0A099;
  --ink-4: #6F6F66;
  --surface: #1A1A14;
  --green-soft: rgba(16,185,129,0.14);
  --green-ink: #34D399;
  --amber-soft: rgba(245,158,11,0.14);
  --amber-ink: #FBBF24;
  --red-soft: rgba(239,68,68,0.14);
  --red-ink: #F87171;
  --blue-soft: rgba(37,99,235,0.18);
  --blue-ink: #60A5FA;
  --nm-soft: rgba(14,116,144,0.20); --nm-ink: #67E8F9;
  --shadow-md: 0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.35);
}
[data-coreui-theme="dark"] .cw-shell .btn:hover { background: #2A2A22; border-color: #3A3A33; }
[data-coreui-theme="dark"] .cw-shell .cls:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .cw-shell .skel {
  background: linear-gradient(90deg, #1F1F1A 25%, #2A2A22 50%, #1F1F1A 75%);
  background-size: 200% 100%;
}
</style>
