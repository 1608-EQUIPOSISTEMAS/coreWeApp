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
    // El backend devuelve la fila recalculada (una R corre las fechas de las
    // sesiones siguientes): se reemplaza in-place.
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
    <header class="page-head">
      <div class="titles">
        <div class="eyebrow">Academica</div>
        <h1>Control de Ediciones</h1>
        <div class="subtitle">
          Gestión por sesión de las aulas en curso en la semana —
          <b>{{ filteredEditions.length }} {{ filteredEditions.length === 1 ? 'aula' : 'aulas' }}</b>
          <template v-if="filteredEditions.length !== editions.length"> de {{ editions.length }}</template>
        </div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="isLoading" @click="load">
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': isLoading }"></i> Sincronizar
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
          <span>Sesiones esta semana</span>
          <i class="fa-regular fa-calendar k-icon"></i>
        </div>
        <div class="k-value">
          <span v-if="isLoading && !data" class="skel skel-kpi"></span>
          <template v-else>{{ summary.total }}</template>
        </div>
        <div class="k-foot"><span>en el rango visible</span></div>
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
        <div class="k-foot"><span>marcadas como A</span></div>
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
        <div class="k-foot"><span>corren las siguientes</span></div>
      </div>
      <div class="kpi" style="--bar: #F59E0B">
        <div class="k-label">
          <span>Tardanzas</span>
          <i class="fa-solid fa-triangle-exclamation k-icon"></i>
        </div>
        <div class="k-value">
          <span v-if="isLoading && !data" class="skel skel-kpi"></span>
          <template v-else>{{ summary.T }}</template>
        </div>
        <div class="k-foot"><span>dictadas con retraso</span></div>
      </div>
      <div class="kpi" style="--bar: #A0A099">
        <div class="k-label">
          <span>Pendientes</span>
          <i class="fa-regular fa-clock k-icon"></i>
        </div>
        <div class="k-value">
          <span v-if="isLoading && !data" class="skel skel-kpi"></span>
          <template v-else>{{ summary.pend }}</template>
        </div>
        <div class="k-foot"><span>sin marcar</span></div>
      </div>
    </div>

    <div class="filter-bar">
      <span class="bar-title">Leyenda</span>
      <span class="divider"></span>
      <span v-for="k in ['A', 'R', 'T', '']" :key="k" class="lg">
        <span class="sw" :class="'e-' + ESTADOS[k].key">{{ ESTADOS[k].short }}</span>{{ ESTADOS[k].label }}
      </span>
      <div class="spacer"></div>
      <span class="muted">{{ filteredEditions.length }} resultados</span>
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
              las sesiones siguientes corren desde la nueva fecha,
              manteniendo la frecuencia del curso.
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
/* Mismos tokens que Aulas.vue: cambiarlos aca sin tocarlos alla desincroniza
   las dos vistas academicas. El dark mode del final solo redefine variables. */
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
  --accent: var(--we-navy, #002060);
  --surface: #ffffff;
  --radius: 10px;
  --radius-lg: 14px;
  --shadow-md: 0 1px 2px rgba(20,20,15,0.04), 0 4px 12px rgba(20,20,15,0.06);
  --shadow-lg: 0 10px 30px -12px rgba(20,20,15,0.22);
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
.btn.ghost { background: transparent; }
.btn.ghost:hover { background: var(--bg-soft); }
.btn.accent { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn.accent:hover { background: var(--we-navy-dark, #001540); }

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
.kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 18px; }
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

/* ---------- barra de leyenda (mismo card que el filter-bar de Aulas) ---------- */
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

/* ---------- estado colors (tokens compartidos => dark mode gratis) ---------- */
.e-pend { background: var(--bg-soft); color: var(--ink-3); border: 1px solid var(--line); }
.e-dictada { background: var(--green-soft); color: var(--green-ink); }
.e-repro { background: var(--red-soft); color: var(--red-ink); }
.e-tard { background: var(--amber-soft); color: var(--amber-ink); }
.dot-pend { background: var(--ink-3); }
.dot-dictada { background: var(--green-ink); }
.dot-repro { background: var(--red-ink); }
.dot-tard { background: var(--amber-ink); }

/* ---------- table ---------- */
.tbl-wrap {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); overflow: auto;
}
table.week { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 1160px; font-size: 13px; }
table.week th, table.week td { text-align: left; }
table.week thead th {
  position: sticky; top: 0; z-index: 6; background: var(--bg-soft); color: var(--ink-3);
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 10px 14px; border-bottom: 1px solid var(--line); white-space: nowrap;
}
table.week thead th.s-col { text-align: center; width: 92px; }
table.week thead th.num, table.week td.num { text-align: center; }
table.week thead th.num { width: 62px; }

.col-curso { position: sticky; left: 0; z-index: 5; background: var(--surface); min-width: 232px; }
table.week thead th.col-curso { z-index: 7; background: var(--bg-soft); }

/* fila de filtros por columna */
.flt-row th { position: sticky; top: 37px; z-index: 6; background: var(--bg-soft); padding: 6px 8px; }
.flt-row th.col-curso { z-index: 7; }
.flt {
  width: 100%; min-width: 60px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface); color: var(--ink); font-family: inherit;
  font-size: 12px; padding: 5px 8px;
}
.flt::placeholder { color: var(--ink-4); }
.flt:focus { outline: none; border-color: var(--accent); }
select.flt { cursor: pointer; }
.no-match { text-align: center; color: var(--ink-3); padding: 28px 0 !important; font-size: 13px; }

table.week tbody td { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
table.week tbody tr:last-child td { border-bottom: none; }
table.week tbody tr:hover td, table.week tbody tr:hover .col-curso { background: var(--bg-soft); }

.curso-name { font-size: 13.5px; font-weight: 500; letter-spacing: -0.005em; }
.curso-ed { font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); margin-top: 2px; }
.doc-cell { display: flex; align-items: center; gap: 8px; }
.doc-av {
  width: 22px; height: 22px; border-radius: 999px; background: var(--accent); color: #fff;
  font-size: 9.5px; font-weight: 700; display: grid; place-items: center; flex: none;
}
.doc-name { font-size: 13px; white-space: nowrap; }
.freq-cell .f { font-size: 13px; white-space: nowrap; }
.freq-cell .h { font-size: 11px; color: var(--ink-3); margin-top: 1px; white-space: nowrap; }
.nS {
  text-align: center; font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 13px; font-weight: 600; color: var(--ink-2);
}

/* celda de la sesion actual resaltada */
table.week td.s-now { background: var(--blue-soft); }
table.week tbody tr:hover td.s-now { background: var(--blue-soft); filter: brightness(0.985); }

/* session cell */
td.s-cell { text-align: center; padding: 8px; }
.s-empty { color: var(--ink-4); font-size: 13px; }
.s-btn {
  display: inline-flex; flex-direction: column; align-items: center; gap: 5px;
  width: 76px; padding: 6px 4px; border-radius: 8px;
  border: 1px solid transparent; background: transparent; transition: 0.13s;
}
.s-btn:hover { border-color: var(--line); background: var(--surface); box-shadow: var(--shadow-md); }
.s-date {
  font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 12px; font-weight: 600; color: var(--ink); white-space: nowrap;
}
.s-old { color: var(--ink-4); font-weight: 400; font-size: 11px; margin-right: 3px; }
.s-badge {
  width: 100%; height: 22px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em;
}
.s-badge .g { width: 5px; height: 5px; border-radius: 999px; }

/* sesión actual + contadores */
.cur-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  color: var(--blue-ink); background: var(--blue-soft);
  border-radius: 999px; padding: 3px 9px; white-space: nowrap;
}
.cur-pill.done { color: var(--green-ink); background: var(--green-soft); }
.cnt {
  text-align: center; font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 14px; font-weight: 600;
}
.cnt.zero { color: var(--ink-4); }
.cnt.hot { color: var(--red-ink); }
.cnt.warm { color: var(--amber-ink); }

.week-foot { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 12px; color: var(--ink-3); }
.week-foot i { color: var(--blue-ink) !important; }

/* ---------- popover ---------- */
.pop-backdrop { position: fixed; inset: 0; z-index: 1090; }
.pop {
  position: fixed; z-index: 1091; background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius); box-shadow: var(--shadow-lg); padding: 6px; min-width: 190px;
  font-family: inherit; color: var(--ink);
}
.pop-h {
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3); padding: 7px 10px 5px;
}
.pop-opt {
  display: flex; align-items: center; gap: 10px; width: 100%; border: none; background: transparent;
  border-radius: 8px; padding: 9px 10px; font-size: 13px; color: var(--ink); text-align: left; transition: 0.12s;
}
.pop-opt:hover { background: var(--bg-soft); }
.pop-opt.on { background: var(--bg-soft); font-weight: 500; }
.pop-opt .ck { margin-left: auto; color: var(--accent); display: flex; }
.pop-date { padding: 4px 10px 10px; max-width: 230px; }
.pop-date input[type='date'] {
  width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px;
  font-family: var(--font-mono); font-size: 12.5px; color: var(--ink); background: var(--surface);
}
.pop-hint { font-size: 11.5px; color: var(--ink-3); line-height: 1.45; margin: 8px 0 10px; }
.pop-actions { display: flex; gap: 8px; justify-content: flex-end; }

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

@media (max-width: 1400px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
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
  --shadow-md: 0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.35);
  --shadow-lg: 0 10px 30px -12px rgba(0,0,0,0.6);
}
[data-coreui-theme="dark"] .cw-shell .btn:hover { background: #2A2A22; border-color: #3A3A33; }
[data-coreui-theme="dark"] .cw-shell .btn.accent { border-color: #2f4a8a; color: #fff; }
[data-coreui-theme="dark"] .cw-shell .btn.accent:hover { background: #1a3a75; }
[data-coreui-theme="dark"] .cw-shell .doc-av { background: #2f4a8a; }
[data-coreui-theme="dark"] .cw-shell .flt { background: #1F1F1A; color: #F4F4F0; }
[data-coreui-theme="dark"] .cw-shell .skel {
  background: linear-gradient(90deg, #1F1F1A 25%, #2A2A22 50%, #1F1F1A 75%);
  background-size: 200% 100%;
}
</style>
