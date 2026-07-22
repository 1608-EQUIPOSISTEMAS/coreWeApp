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

const totalWeek = computed(() => days.value.reduce((n, d) => n + d.classes.length, 0))

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
    <div class="week-head">
      <div>
        <div class="eyebrow">ACADÉMICA</div>
        <h1>Vista Semanal</h1>
        <div class="sub">
          Clases dictándose cada día de la semana —
          <b>{{ totalWeek }} {{ totalWeek === 1 ? 'clase' : 'clases' }}</b>
        </div>
      </div>
      <div class="grow" />
      <button class="btn ghost today" :disabled="isLoading" @click="goToday">Hoy</button>
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

    <div class="legend">
      <span v-for="k in ['A', 'R', 'T', '']" :key="k" class="lg">
        <span class="sw" :class="'e-' + ESTADOS[k].key">{{ ESTADOS[k].short }}</span>{{ ESTADOS[k].label }}
      </span>
      <span class="lg">
        <span class="sw e-nm">NM</span>Nueva metodología
      </span>
      <span class="lg hint">Clic en una clase para abrir su aula</span>
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
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap');

/* Mismos tokens que ControlEdiciones.vue */
.cw-shell {
  --font-sans: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  --font-mono: 'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  --accent: #002060; /* navy corporativo WE */
  --accent-ink: #ffffff;
  --surface: #ffffff;
  --surface-2: #faf9f8;
  --surface-3: #f1efed;
  --border: #e8e6e3;
  --border-strong: #d8d4d0;
  --ink: #1b1917;
  --ink-2: #57534e;
  --ink-3: #8d877f;
  --shadow: 0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 1px rgba(28, 25, 23, 0.03);
  --s1-bg: #fde8e6; --s1-fg: #c0362c; /* repro */
  --s2-bg: #fdeccb; --s2-fg: #a96208; /* tardanza */
  --s4-bg: #d9f3df; --s4-fg: #1d7a40; /* dictada */
  --nm-bg: #cffafe; --nm-fg: #0e7490; /* nueva metodologia */
  font-family: var(--font-sans);
  color: var(--ink);
}
.cw-shell button { font-family: inherit; cursor: pointer; }
.cw-shell button:disabled { opacity: 0.55; cursor: default; }

/* ---------- head (identico a ControlEdiciones) ---------- */
.week-head { display: flex; align-items: flex-end; gap: 14px; margin: 6px 2px 20px; }
.week-head .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: var(--ink-3); }
.week-head h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.015em; margin: 4px 0 6px; }
.week-head .sub { font-size: 14.5px; color: var(--ink-2); }
.week-head .grow { flex: 1; }

.week-nav { display: flex; align-items: center; gap: 4px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; box-shadow: var(--shadow); padding: 6px; }
.week-nav .arrow { width: 40px; height: 40px; border-radius: 10px; border: none; background: transparent; color: var(--ink-2);
  display: grid; place-items: center; transition: 0.15s; }
.week-nav .arrow:hover { background: var(--surface-3); color: var(--ink); }
.week-nav .center { text-align: center; padding: 0 18px; min-width: 150px; }
.week-nav .center .wk { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
.week-nav .center .rg { font-size: 12px; color: var(--ink-3); font-weight: 600; margin-top: 1px; }

.btn { border: 1px solid var(--border-strong); background: var(--surface); color: var(--ink); border-radius: 10px;
  padding: 7px 13px; font-size: 13px; font-weight: 600; transition: 0.15s; }
.btn.ghost { background: transparent; }
.btn.ghost:hover { background: var(--surface-3); }
.btn.today { align-self: center; }

/* ---------- legend ---------- */
.legend { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.legend .lg { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
.legend .hint { margin-left: auto; color: var(--ink-3); font-weight: 500; }
.sw { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; font-size: 11px;
  font-weight: 800; font-family: var(--font-mono); }

.e-pend { background: var(--surface-3); color: var(--ink-3); border: 1px solid var(--border); }
.e-dictada { background: var(--s4-bg); color: var(--s4-fg); }
.e-repro { background: var(--s1-bg); color: var(--s1-fg); }
.e-tard { background: var(--s2-bg); color: var(--s2-fg); }
.e-nm { background: var(--nm-bg); color: var(--nm-fg); }

/* ---------- agenda grid ---------- */
.grid-wrap { overflow-x: auto; padding-bottom: 6px; }
.day-grid { display: grid; grid-template-columns: repeat(7, minmax(196px, 1fr)); gap: 12px; min-width: 1180px; }
.day-col { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow);
  padding: 10px; display: flex; flex-direction: column; gap: 8px; min-height: 180px; }
.day-col.today { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), var(--shadow); }

.day-head { display: flex; align-items: baseline; gap: 7px; padding: 2px 4px 6px; border-bottom: 1px solid var(--border); }
.day-head .dn { font-size: 13px; font-weight: 800; letter-spacing: -0.005em; }
.day-col.today .day-head .dn { color: var(--accent); }
.day-head .dd { font-size: 11.5px; color: var(--ink-3); font-weight: 600; }
.day-head .dc { margin-left: auto; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--accent);
  background: rgba(107, 92, 240, 0.13); border-radius: 7px; padding: 2px 7px; }

.day-empty { color: var(--ink-3); font-size: 12px; text-align: center; padding: 22px 0; }

.cls { display: block; width: 100%; text-align: left; background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 11px; padding: 9px 11px; transition: 0.13s; }
.cls:hover { border-color: var(--accent); background: var(--surface); }
.cls.cls-nm { border-left: 3px solid var(--nm-fg); }
.cls.cls-nm:hover { border-color: var(--nm-fg); }
.cls-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.cls-top .hr { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--ink-2); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.cls-top .sn { margin-left: auto; flex: none; font-family: var(--font-mono); font-size: 10.5px; font-weight: 800;
  color: var(--accent); background: rgba(107, 92, 240, 0.13); border-radius: 6px; padding: 2px 6px; }
.cls-name { font-size: 13.5px; font-weight: 700; letter-spacing: -0.005em; line-height: 1.25; }
.cls-code { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-3); font-weight: 600; margin-top: 1px; }
.cls-doc { font-size: 12px; color: var(--ink-2); font-weight: 600; margin-top: 4px; }
.cls-badge { display: inline-flex; align-items: center; margin-top: 6px; border-radius: 7px; padding: 3px 8px;
  font-size: 10.5px; font-weight: 800; font-family: var(--font-mono); letter-spacing: 0.02em; }

.empty-state { text-align: center; padding: 70px 20px; color: var(--ink-3); }
.empty-state .big { font-size: 18px; font-weight: 700; color: var(--ink-2); margin-bottom: 6px; }

@media (max-width: 900px) {
  .week-head { flex-wrap: wrap; }
}
</style>
