<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Estados de gestion (mismos codigos que edition_session_control).
const ESTADOS = {
  '': { key: 'pend', label: 'Pendiente', short: '—' },
  A: { key: 'dictada', label: 'Dictada', short: 'A' },
  R: { key: 'repro', label: 'Reprogramada', short: 'R' },
  T: { key: 'tard', label: 'Tardanza', short: 'T' }
}
const ORDER = ['', 'A', 'R', 'T']

// Evita el corrimiento UTC de un dia (mismo helper que ScheduleBoard.vue).
function parseLocal(str) {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Semana ISO de una fecha (el jueves de la semana define el anio ISO).
function isoWeekOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return { year: d.getFullYear(), week: Math.ceil(((d - jan1) / 86400000 + 1) / 7) }
}

const { year: y0, week: w0 } = isoWeekOf(new Date())
const year = ref(y0)
const week = ref(w0)
const data = ref(null)
const isLoading = ref(false)
const savingKey = ref(null)
// Popover "Marcar sesion": { edition, session, top, left, mode: 'pick'|'date', dateVal }
const pop = ref(null)

async function load() {
  isLoading.value = true
  pop.value = null
  try {
    data.value = await editionService.weeklyControl({ year: year.value, week: week.value })
  } catch (err) {
    console.error('Error cargando control de ediciones:', err)
    toast.error('Error al cargar el control de ediciones')
    data.value = null
  } finally {
    isLoading.value = false
  }
}

// Un anio ISO tiene 53 semanas si empieza en jueves (o miercoles si es bisiesto).
function weeksInYear(y) {
  const jan1 = new Date(y, 0, 1).getDay()
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  return jan1 === 4 || (leap && jan1 === 3) ? 53 : 52
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

onMounted(load)

const rangeLabel = computed(() => {
  if (!data.value) return ''
  const s = parseLocal(data.value.date_start)
  const e = parseLocal(data.value.date_end)
  return `${s.getDate()} ${MONTHS[s.getMonth()]} al ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
})

const editions = computed(() => data.value?.editions || [])
const maxSessions = computed(() =>
  editions.value.reduce((m, e) => Math.max(m, e.sessions.length), 0)
)

// Filtros por columna (texto: contiene, sin distinguir tildes/mayusculas;
// Frecuencia: select de combinaciones dia+horario existentes).
const filters = ref({ curso: '', docente: '', ns: '', freq: '', actual: '', repros: '', tard: '' })
const norm = (v) =>
  String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const freqLabel = (e) => [e.day_label, e.hour_label].filter(Boolean).join(' · ') || '—'
const filteredEditions = computed(() => {
  const f = filters.value
  return editions.value.filter((e) => {
    if (f.curso && !(norm(e.abbreviation).includes(norm(f.curso)) || norm(e.specific_code).includes(norm(f.curso)))) return false
    if (f.docente && !norm(e.instructor).includes(norm(f.docente))) return false
    if (f.ns && String(e.total_sessions) !== f.ns) return false
    if (f.freq && freqLabel(e) !== f.freq) return false
    if (f.actual && e.current_label !== f.actual) return false
    if (f.repros && (f.repros === '0' ? e.repro_count !== 0 : e.repro_count === 0)) return false
    if (f.tard && (f.tard === '0' ? e.tardy_count !== 0 : e.tardy_count === 0)) return false
    return true
  })
})
const nsOptions = computed(() =>
  [...new Set(editions.value.map((e) => e.total_sessions))].sort((a, b) => a - b)
)
const freqOptions = computed(() =>
  [...new Set(editions.value.map(freqLabel))].sort((a, b) => a.localeCompare(b, 'es'))
)
const actualOptions = computed(() =>
  [...new Set(editions.value.map((e) => e.current_label).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }))
)

// Una sesion "es de la semana" si su fecha efectiva cae en el rango visible.
const inWeek = (s) =>
  !!data.value && s.date >= data.value.date_start && s.date <= data.value.date_end

// Celda a resaltar por curso: su sesion ACTUAL (primera aun no dictada, ni A
// ni T) — la misma regla que el pill "Actual". CULMINÓ => sin resaltado.
const currentIdx = (e) =>
  e.sessions.findIndex((s) => s.status !== 'A' && s.status !== 'T')

// Resumen sobre las sesiones que ocurren en la semana visible (una frecuencia
// Lun-Mie aporta 2 sesiones a la semana), respetando los filtros activos.
const summary = computed(() => {
  const s = { total: 0, A: 0, R: 0, T: 0, pend: 0 }
  for (const e of filteredEditions.value) {
    for (const ses of e.sessions) {
      if (!inWeek(ses)) continue
      s.total++
      if (ses.status) s[ses.status]++
      else s.pend++
    }
  }
  return s
})

const fmtShort = (ymd) => {
  if (!ymd) return ''
  const d = parseLocal(ymd)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

const initials = (name) =>
  String(name || '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

const cellKey = (e, n) => `${e.edition_num_id}:${n}`
const estadoOf = (s) => ESTADOS[s.status || '']

async function save(edition, session, status, newDate) {
  savingKey.value = cellKey(edition, session.session_number)
  try {
    const row = await editionService.sessionControlSave({
      edition_num_id: edition.edition_num_id,
      session_number: session.session_number,
      status: status || null,
      new_date: newDate || null
    })
    // El backend devuelve la fila recalculada (una R reubica esa sesion
    // cronologicamente entre las demas): se reemplaza in-place.
    const idx = editions.value.findIndex((x) => x.edition_num_id === edition.edition_num_id)
    if (row && idx !== -1) data.value.editions.splice(idx, 1, row)
  } catch (err) {
    console.error('Error guardando estado de sesion:', err)
    toast.error(err.response?.data?.message || 'No se pudo guardar el estado de la sesión')
  } finally {
    savingKey.value = null
  }
}

function openPop(event, edition, session) {
  const r = event.currentTarget.getBoundingClientRect()
  pop.value = {
    edition,
    session,
    mode: 'pick',
    dateVal: session.new_date || session.planned_date,
    top: Math.min(r.bottom + 6, window.innerHeight - 250),
    left: Math.min(r.left, window.innerWidth - 210)
  }
}

function pick(status) {
  const { edition, session } = pop.value
  if (status === 'R') {
    // Tope por curso: cada cambio de fecha (incluida una re-reprogramacion)
    // consume una; el backend tambien lo valida.
    if (edition.repro_count >= (edition.repro_max || 3)) {
      pop.value = null
      toast.warning(`Este curso ya usó sus ${edition.repro_max || 3} reprogramaciones`)
      return
    }
    // Reprogramada: pedir a que fecha se reprogramo antes de guardar.
    pop.value.mode = 'date'
    return
  }
  pop.value = null
  save(edition, session, status, null)
}

function confirmRepro() {
  const { edition, session, dateVal } = pop.value
  pop.value = null
  save(edition, session, 'R', dateVal || null)
}
</script>

<template>
  <div class="cw-shell">
    <div class="week-head">
      <div>
        <div class="eyebrow">ACADÉMICA</div>
        <h1>Control de Ediciones</h1>
        <div class="sub">
          Gestión por sesión de las aulas en curso en la semana —
          <b>{{ filteredEditions.length }} {{ filteredEditions.length === 1 ? 'aula' : 'aulas' }}</b>
          <template v-if="filteredEditions.length !== editions.length"> de {{ editions.length }}</template>
        </div>
      </div>
      <div class="grow" />
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

    <div class="week-summary">
      <div class="sum-chip">
        <span class="ic ic-accent"><i class="fa-regular fa-calendar"></i></span>
        <div><div class="n">{{ summary.total }}</div><div class="l">Sesiones esta semana</div></div>
      </div>
      <div class="sum-chip">
        <span class="ic ic-ok"><i class="fa-solid fa-check"></i></span>
        <div><div class="n">{{ summary.A }}</div><div class="l">Dictadas</div></div>
      </div>
      <div class="sum-chip">
        <span class="ic ic-bad"><i class="fa-solid fa-rotate"></i></span>
        <div><div class="n">{{ summary.R }}</div><div class="l">Reprogramadas</div></div>
      </div>
      <div class="sum-chip">
        <span class="ic ic-warn"><i class="fa-solid fa-triangle-exclamation"></i></span>
        <div><div class="n">{{ summary.T }}</div><div class="l">Tardanzas</div></div>
      </div>
      <div class="sum-chip">
        <span class="ic ic-mute"><i class="fa-regular fa-clock"></i></span>
        <div><div class="n">{{ summary.pend }}</div><div class="l">Pendientes</div></div>
      </div>
    </div>

    <div class="legend">
      <span v-for="k in ['A', 'R', 'T', '']" :key="k" class="lg">
        <span class="sw" :class="'e-' + ESTADOS[k].key">{{ ESTADOS[k].short }}</span>{{ ESTADOS[k].label }}
      </span>
    </div>

    <div v-if="isLoading && !data" class="empty-state">
      <i class="fa-solid fa-arrows-rotate fa-spin"></i> Cargando…
    </div>
    <div v-else-if="!editions.length" class="empty-state">
      <div class="big">Ninguna aula inicia esta semana</div>
      Usa las flechas para navegar entre semanas
    </div>

    <div v-else class="tbl-wrap">
      <table class="week">
        <thead>
          <tr>
            <th class="col-curso">Curso</th>
            <th>Docente</th>
            <th class="num">#S</th>
            <th>Frecuencia</th>
            <th v-for="n in maxSessions" :key="n" class="s-col">S{{ n }}</th>
            <th class="num">Actual</th>
            <th class="num" title="Reprogramaciones">Repros</th>
            <th class="num" title="Tardanzas">Tard.</th>
          </tr>
          <tr class="flt-row">
            <th class="col-curso">
              <input v-model.trim="filters.curso" class="flt" type="text" placeholder="Curso / código…" />
            </th>
            <th><input v-model.trim="filters.docente" class="flt" type="text" placeholder="Docente…" /></th>
            <th>
              <select v-model="filters.ns" class="flt">
                <option value="">—</option>
                <option v-for="o in nsOptions" :key="o" :value="String(o)">{{ o }}</option>
              </select>
            </th>
            <th>
              <select v-model="filters.freq" class="flt">
                <option value="">—</option>
                <option v-for="o in freqOptions" :key="o" :value="o">{{ o }}</option>
              </select>
            </th>
            <th :colspan="maxSessions"></th>
            <th>
              <select v-model="filters.actual" class="flt">
                <option value="">—</option>
                <option v-for="o in actualOptions" :key="o" :value="o">{{ o }}</option>
              </select>
            </th>
            <th>
              <select v-model="filters.repros" class="flt">
                <option value="">—</option>
                <option value="0">0</option>
                <option value="1+">1+</option>
              </select>
            </th>
            <th>
              <select v-model="filters.tard" class="flt">
                <option value="">—</option>
                <option value="0">0</option>
                <option value="1+">1+</option>
              </select>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filteredEditions.length">
            <td :colspan="maxSessions + 7" class="no-match">
              Ningún aula coincide con los filtros
            </td>
          </tr>
          <tr v-for="e in filteredEditions" :key="e.edition_num_id">
            <td class="col-curso">
              <div class="curso-name">{{ e.abbreviation }}</div>
              <div class="curso-ed">{{ e.specific_code }}</div>
            </td>
            <td>
              <div class="doc-cell">
                <span class="doc-av">{{ initials(e.instructor) || '·' }}</span>
                <span class="doc-name">{{ e.instructor || '—' }}</span>
              </div>
            </td>
            <td class="nS">{{ e.total_sessions }}</td>
            <td>
              <div class="freq-cell">
                <div class="f">{{ e.day_label || '—' }}</div>
                <div class="h">{{ e.hour_label }}</div>
              </div>
            </td>
            <td
              v-for="n in maxSessions"
              :key="n"
              class="s-cell"
              :class="{ 's-now': currentIdx(e) === n - 1 }"
            >
              <span v-if="!e.sessions[n - 1]" class="s-empty">·</span>
              <button
                v-else
                class="s-btn"
                :disabled="savingKey === cellKey(e, n)"
                @click="openPop($event, e, e.sessions[n - 1])"
              >
                <span class="s-date">
                  <s v-if="e.sessions[n - 1].new_date" class="s-old">
                    {{ fmtShort(e.sessions[n - 1].planned_date) }}
                  </s>
                  {{ fmtShort(e.sessions[n - 1].date) }}
                </span>
                <span class="s-badge" :class="'e-' + estadoOf(e.sessions[n - 1]).key">
                  <span class="g" :class="'dot-' + estadoOf(e.sessions[n - 1]).key" />
                  {{ estadoOf(e.sessions[n - 1]).short }}
                </span>
              </button>
            </td>
            <td class="num">
              <span class="cur-pill" :class="{ done: e.current_label === 'CULMINÓ' }">
                {{ e.current_label || '—' }}
              </span>
            </td>
            <td
              class="cnt"
              :class="e.repro_count ? 'hot' : 'zero'"
              :title="`${e.repro_count} de ${e.repro_max || 3} reprogramaciones usadas`"
            >{{ e.repro_count }}</td>
            <td class="cnt" :class="e.tardy_count ? 'warm' : 'zero'">{{ e.tardy_count }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="week-foot" v-if="editions.length">
      <i class="fa-solid fa-circle" style="font-size: 7px; color: var(--accent)"></i>
      Celda resaltada = sesión actual de cada curso (la primera aún no dictada). Haz clic en cualquier sesión para marcar su estado.
    </div>

    <!-- Popover MARCAR SESIÓN -->
    <template v-if="pop">
      <div class="pop-backdrop" @click="pop = null" @contextmenu.prevent="pop = null" />
      <div class="pop" :style="{ top: pop.top + 'px', left: pop.left + 'px' }">
        <template v-if="pop.mode === 'pick'">
          <div class="pop-h">MARCAR SESIÓN {{ pop.session.session_number }}</div>
          <button
            v-for="k in ORDER"
            :key="k"
            class="pop-opt"
            :class="{ on: (pop.session.status || '') === k }"
            @click="pick(k)"
          >
            <span class="sw" :class="'e-' + ESTADOS[k].key">{{ ESTADOS[k].short }}</span>
            {{ ESTADOS[k].label }}
            <span v-if="(pop.session.status || '') === k" class="ck">
              <i class="fa-solid fa-check"></i>
            </span>
          </button>
        </template>
        <template v-else>
          <div class="pop-h">¿A QUÉ FECHA SE REPROGRAMÓ?</div>
          <div class="pop-date">
            <input type="date" v-model="pop.dateVal" />
            <div class="pop-hint">
              Fecha original: <b>{{ fmtShort(pop.session.planned_date) }}</b> —
              la sesión se reubica en el orden según su nueva fecha; las demás
              conservan su fecha.
              <br />
              Quedan <b>{{ Math.max(0, (pop.edition.repro_max || 3) - pop.edition.repro_count) }}</b>
              de {{ pop.edition.repro_max || 3 }} reprogramaciones para este curso.
            </div>
            <div class="pop-actions">
              <button class="btn ghost" @click="pop.mode = 'pick'">Volver</button>
              <button class="btn accent" :disabled="!pop.dateVal" @click="confirmRepro">
                Guardar
              </button>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap');

/* Tokens del sistema de diseño (claude.ai/design "Aulas nuevas", tema light) */
.cw-shell {
  --font-sans: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  --font-mono: 'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  --accent: #002060; /* navy corporativo WE */
  --accent-ink: #ffffff;
  --r-lg: 16px;
  --surface: #ffffff;
  --surface-2: #faf9f8;
  --surface-3: #f1efed;
  --border: #e8e6e3;
  --border-strong: #d8d4d0;
  --ink: #1b1917;
  --ink-2: #57534e;
  --ink-3: #8d877f;
  --shadow: 0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 1px rgba(28, 25, 23, 0.03);
  --shadow-lg: 0 10px 30px -12px rgba(28, 25, 23, 0.18);
  --s1-bg: #fde8e6; --s1-fg: #c0362c; /* repro */
  --s2-bg: #fdeccb; --s2-fg: #a96208; /* tardanza */
  --s4-bg: #d9f3df; --s4-fg: #1d7a40; /* dictada */
  font-family: var(--font-sans);
  color: var(--ink);
}
.cw-shell button { font-family: inherit; cursor: pointer; }
.cw-shell button:disabled { opacity: 0.55; cursor: default; }

/* ---------- head ---------- */
.week-head { display: flex; align-items: flex-end; gap: 24px; margin: 6px 2px 20px; }
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

/* ---------- summary chips ---------- */
.week-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.sum-chip { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; box-shadow: var(--shadow); padding: 11px 15px; }
.sum-chip .ic { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex: none; font-size: 15px; }
.sum-chip .n { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
.sum-chip .l { font-size: 11.5px; color: var(--ink-3); font-weight: 600; margin-top: 3px; }
.ic-accent { background: rgba(107, 92, 240, 0.14); color: var(--accent); }
.ic-ok { background: var(--s4-bg); color: var(--s4-fg); }
.ic-bad { background: var(--s1-bg); color: var(--s1-fg); }
.ic-warn { background: var(--s2-bg); color: var(--s2-fg); }
.ic-mute { background: var(--surface-3); color: var(--ink-2); }

/* ---------- legend ---------- */
.legend { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.legend .lg { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
.sw { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; font-size: 11px;
  font-weight: 800; font-family: var(--font-mono); }

/* ---------- estado colors ---------- */
.e-pend { background: var(--surface-3); color: var(--ink-3); border: 1px solid var(--border); }
.e-dictada { background: var(--s4-bg); color: var(--s4-fg); }
.e-repro { background: var(--s1-bg); color: var(--s1-fg); }
.e-tard { background: var(--s2-bg); color: var(--s2-fg); }
.dot-pend { background: var(--ink-3); }
.dot-dictada { background: var(--s4-fg); }
.dot-repro { background: var(--s1-fg); }
.dot-tard { background: var(--s2-fg); }

/* ---------- table ---------- */
.tbl-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
  box-shadow: var(--shadow); overflow: auto; }
table.week { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 1160px; }
table.week th, table.week td { text-align: left; }
table.week thead th { position: sticky; top: 0; z-index: 6; background: var(--surface-3); color: var(--ink-2);
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; padding: 13px 14px; border-bottom: 1px solid var(--border);
  white-space: nowrap; }
table.week thead th.s-col { text-align: center; width: 92px; }
table.week thead th.s-col.now { color: var(--accent); }
table.week thead th.num, table.week td.num { text-align: center; }
table.week thead th.num { width: 62px; }

.col-curso { position: sticky; left: 0; z-index: 5; background: var(--surface); min-width: 232px; }
table.week thead th.col-curso { z-index: 7; background: var(--surface-3); }

/* fila de filtros por columna */
.flt-row th { position: sticky; top: 41px; z-index: 6; background: var(--surface-2); padding: 6px 8px; }
.flt-row th.col-curso { z-index: 7; background: var(--surface-2); }
.flt { width: 100%; min-width: 60px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface);
  color: var(--ink); font-family: var(--font-sans); font-size: 12px; font-weight: 500; padding: 5px 8px; }
.flt::placeholder { color: var(--ink-3); }
.flt:focus { outline: none; border-color: var(--accent); }
select.flt { cursor: pointer; }
.no-match { text-align: center; color: var(--ink-3); padding: 28px 0 !important; font-size: 13px; }
table.week tbody tr:hover .col-curso { background: var(--surface-2); }

table.week tbody td { padding: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
table.week tbody tr:last-child td { border-bottom: none; }
table.week tbody tr:hover td { background: var(--surface-2); }

.curso-name { font-size: 14.5px; font-weight: 700; letter-spacing: -0.005em; }
.curso-ed { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-3); font-weight: 600; margin-top: 2px; }
.doc-cell { display: flex; align-items: center; gap: 9px; }
.doc-av { width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: var(--accent-ink);
  font-size: 10px; font-weight: 700; display: grid; place-items: center; flex: none; }
.doc-name { font-size: 13.5px; font-weight: 600; white-space: nowrap; }
.freq-cell .f { font-size: 13.5px; font-weight: 600; white-space: nowrap; }
.freq-cell .h { font-size: 11.5px; color: var(--ink-3); font-weight: 500; margin-top: 1px; white-space: nowrap; }
.nS { text-align: center; font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--ink-2); }

/* columna de la semana resaltada */
table.week td.s-now { background: rgba(107, 92, 240, 0.06); }
table.week tbody tr:hover td.s-now { background: rgba(107, 92, 240, 0.1); }
table.week th.s-now { background: #e9e5fb; }

/* session cell */
td.s-cell { text-align: center; padding: 8px; }
.s-empty { color: var(--ink-3); font-size: 13px; }
.s-btn { display: inline-flex; flex-direction: column; align-items: center; gap: 5px; width: 76px; padding: 6px 4px;
  border-radius: 10px; border: 1px solid transparent; background: transparent; transition: 0.13s; }
.s-btn:hover { border-color: var(--border-strong); background: var(--surface); }
.s-date { font-family: var(--font-mono); font-size: 12.5px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.s-old { color: var(--ink-3); font-weight: 500; font-size: 11px; margin-right: 3px; }
.s-badge { width: 100%; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; gap: 5px;
  font-size: 11px; font-weight: 800; font-family: var(--font-mono); letter-spacing: 0.02em; }
.s-badge .g { width: 6px; height: 6px; border-radius: 50%; }

/* sesión actual + contadores */
.cur-pill { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 12px;
  font-weight: 800; color: var(--accent); background: rgba(107, 92, 240, 0.13); border-radius: 8px; padding: 4px 10px;
  white-space: nowrap; }
.cur-pill.done { color: var(--s4-fg); background: var(--s4-bg); }
.cnt { text-align: center; font-family: var(--font-mono); font-size: 15px; font-weight: 700; }
.cnt.zero { color: var(--ink-3); }
.cnt.hot { color: var(--s1-fg); }
.cnt.warm { color: var(--s2-fg); }

.week-foot { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 12.5px; color: var(--ink-3); }

/* ---------- popover ---------- */
.pop-backdrop { position: fixed; inset: 0; z-index: 1090; }
.pop { position: fixed; z-index: 1091; background: var(--surface); border: 1px solid var(--border-strong);
  border-radius: 12px; box-shadow: var(--shadow-lg); padding: 6px; min-width: 190px;
  font-family: var(--font-sans); color: var(--ink); }
.pop-h { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--ink-3); padding: 7px 10px 5px; }
.pop-opt { display: flex; align-items: center; gap: 10px; width: 100%; border: none; background: transparent;
  border-radius: 8px; padding: 9px 10px; font-size: 13.5px; font-weight: 600; color: var(--ink); text-align: left;
  transition: 0.12s; }
.pop-opt:hover { background: var(--surface-2); }
.pop-opt.on { background: var(--surface-3); }
.pop-opt .ck { margin-left: auto; color: var(--accent); display: flex; }
.pop-date { padding: 4px 10px 10px; max-width: 230px; }
.pop-date input[type='date'] { width: 100%; border: 1px solid var(--border-strong); border-radius: 8px;
  padding: 7px 9px; font-family: var(--font-mono); font-size: 12.5px; color: var(--ink); background: var(--surface); }
.pop-hint { font-size: 11.5px; color: var(--ink-3); line-height: 1.45; margin: 8px 0 10px; }
.pop-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn { border: 1px solid var(--border-strong); background: var(--surface); color: var(--ink); border-radius: 10px;
  padding: 7px 13px; font-size: 13px; font-weight: 600; transition: 0.15s; }
.btn.ghost { background: transparent; }
.btn.ghost:hover { background: var(--surface-3); }
.btn.accent { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.btn.accent:hover { filter: brightness(1.06); }

.empty-state { text-align: center; padding: 70px 20px; color: var(--ink-3); }
.empty-state .big { font-size: 18px; font-weight: 700; color: var(--ink-2); margin-bottom: 6px; }

@media (max-width: 900px) {
  .week-head { flex-wrap: wrap; }
}
</style>
