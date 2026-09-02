<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const router = useRouter()

// Clic en un alumno -> su aula en pestana nueva. Es un <a href> real y no un
// window.open: ctrl+clic y clic central funcionan solos, y el clic en las
// celdas de asistencia (dentro de la misma fila) no se pisa con la navegacion.
const aulaHref = (c) =>
  router.resolve({ name: 'AcademicaAulaDetail', params: { id: c.edition_num_id } }).href

// Asistencia MANUAL de este modulo. Vive en b2b_attendance, no toca la Lista
// de Notas (y la Lista de Notas no la toca a ella). Sin marcar != falta.
const ESTADOS = {
  '': { key: 'pend', label: 'Sin marcar', short: '-' },
  P: { key: 'pres', label: 'Presente', short: 'P' },
  T: { key: 'tard', label: 'Tardanza', short: 'T' },
  F: { key: 'falta', label: 'Falta', short: 'F' },
  J: { key: 'just', label: 'Justificado', short: 'J' },
}
// Orden del popover "Marcar sesion" (mismo patron que Control de Ediciones).
const ORDER = ['', 'P', 'T', 'F', 'J']

// Barra superior de la tarjeta + avatar del docente. Mismo color que el badge
// de estado (ver badgeClass): Proximo en ambar, no en azul.
const STATUS_COLORS = { Activo: '#10B981', Proximo: '#F59E0B', Finalizado: '#A0A099' }

const currentUserId = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u.user_id || u.id || null
  } catch { return null }
})

function initials(name) {
  if (!name) return '--'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function formatDate(iso) {
  if (!iso) return '--'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : '--'
}

const fmtShort = (iso) => {
  if (!iso) return ''
  const [, m, d] = String(iso).slice(0, 10).split('-')
  return `${Number(d)}/${Number(m)}`
}

// Estado del aula sobre el cronograma REAL derivado (sessions ya trae las
// reprogramaciones aplicadas), con fallback a start/end de la edicion.
function deriveStatus(e) {
  const today = new Date().toISOString().slice(0, 10)
  const first = e.sessions?.[0]?.date || e.start_date
  const last = e.sessions?.[e.sessions.length - 1]?.date || e.end_date
  if (!first) return 'Proximo'
  if (first > today) return 'Proximo'
  if (last && last < today) return 'Finalizado'
  return 'Activo'
}

const AULAS = ref([])
const isLoading = ref(false)

async function load() {
  isLoading.value = true
  try {
    // Una sola llamada con TODAS las aulas: los contadores por estado
    // (Activo/Proximo/Finalizado) tienen que ser reales, y filtrar en el
    // cliente evita un refetch por cada chip.
    const rows = await editionService.b2bTrackingList({ scope: 'todas' })
    AULAS.value = (Array.isArray(rows) ? rows : []).map((e) => ({
      ...e,
      status: deriveStatus(e),
      teacherInitials: initials(e.instructor),
      schedule: [e.day_label, e.hour_label].filter(Boolean).join(' ') || '--',
    }))
  } catch (err) {
    console.error('Error cargando seguimiento B2B:', err)
    toast.error('Error al cargar el seguimiento B2B')
    AULAS.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const filter = ref('Activo')
const q = ref('')
const filterStates = ['Todos', 'Activo', 'Proximo', 'Finalizado']
const countByStatus = (s) =>
  s === 'Todos' ? AULAS.value.length : AULAS.value.filter((c) => c.status === s).length

const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// La busqueda tambien mira a los alumnos: si matchea por alumno, el aula se
// muestra solo con los que coinciden (buscar una persona no debe obligar a
// leer las 20 filas de su aula).
const filtered = computed(() => {
  const needle = norm(q.value)
  return AULAS.value
    .filter((c) => filter.value === 'Todos' || c.status === filter.value)
    .map((c) => {
      if (!needle) return c
      const aulaMatch =
        norm(c.abbreviation).includes(needle) ||
        norm(c.specific_code).includes(needle) ||
        norm(c.instructor).includes(needle)
      if (aulaMatch) return c
      const students = c.students.filter(
        (s) => norm(s.full_name).includes(needle) || String(s.dni || '').includes(q.value),
      )
      return students.length ? { ...c, students } : null
    })
    .filter(Boolean)
})

const totalAlumnos = computed(() => filtered.value.reduce((a, c) => a + c.students.length, 0))
const totalFaltas = computed(() =>
  filtered.value.reduce((a, c) => a + c.students.reduce((b, s) => b + s.summary.absent, 0), 0),
)
const avgAsistencia = computed(() => {
  const list = filtered.value.flatMap((c) => c.students).filter((s) => s.summary.pct !== null)
  return list.length ? Math.round(list.reduce((a, s) => a + s.summary.pct, 0) / list.length) : null
})
const conNota = computed(() =>
  filtered.value.reduce((a, c) => a + c.students.filter((s) => s.final_grade !== null).length, 0),
)

// El badge de conteo B2B ya ocupa el azul: si "Proximo" tambien fuera azul,
// la cabecera mostraria dos badges identicos pegados. Proximo va en ambar.
const badgeClass = (s) => (s === 'Activo' ? 'ok' : s === 'Finalizado' ? 'neutral' : 'warn')
// Nota final: viene de la Lista de Notas, SOLO LECTURA. Escala 0-20.
const gradeClass = (g) => (g === null ? 'na' : g >= 13 ? 'ok' : g >= 11 ? 'mid' : 'bad')
const pctClass = (p) => (p === null ? 'na' : p >= 80 ? 'ok' : p >= 60 ? 'mid' : 'bad')

const savingKey = ref(null)
const cellKey = (s, n) => `${s.enrollment_id}:${n}`
const markOf = (s, n) => s.attendance?.[String(n)] || ''
const estadoOf = (s, n) => ESTADOS[markOf(s, n)]
// Motivo escrito por academica al justificar. Solo las celdas 'J' tienen uno.
const noteOf = (s, n) => s.attendance_notes?.[String(n)] || ''

// Popover "Marcar sesion": { aula, student, n, top, left, asking }
// `asking` = el segundo paso, donde academica escribe el motivo de la 'J'.
const pop = ref(null)
const motivo = ref('')

function openPop(event, aula, student, n) {
  const r = event.currentTarget.getBoundingClientRect()
  pop.value = {
    aula, student, n, asking: false,
    top: Math.min(r.bottom + 6, window.innerHeight - 280),
    left: Math.min(r.left, window.innerWidth - 270),
  }
}

function pick(status) {
  const { aula, student, n } = pop.value
  // Justificar no se guarda de un clic: el modulo existe para que academica
  // DIGA por que. El popover pasa al paso del motivo en vez de cerrarse.
  if (status === 'J') {
    motivo.value = noteOf(student, n)
    pop.value = { ...pop.value, asking: true }
    return
  }
  pop.value = null
  if (status !== markOf(student, n)) setMark(aula, student, n, status)
}

function saveJustification() {
  const texto = motivo.value.trim()
  if (!texto) return
  const { aula, student, n } = pop.value
  pop.value = null
  setMark(aula, student, n, 'J', texto)
}

async function setMark(aula, student, n, next, note = null) {
  const key = cellKey(student, n)
  if (savingKey.value === key) return
  savingKey.value = key
  try {
    await editionService.b2bAttendanceSave({
      enrollment_id: student.enrollment_id,
      program_edition_id: aula.edition_num_id,
      session_number: n,
      status: next || null,
      note,
      user_id: currentUserId.value,
    })
    // Se actualiza recien tras confirmar el guardado. Objeto nuevo para que
    // los computed que leen attendance se recalculen.
    const att = { ...(student.attendance || {}) }
    if (next) att[String(n)] = next
    else delete att[String(n)]
    student.attendance = att
    // El motivo vive solo mientras la sesion siga justificada.
    const notes = { ...(student.attendance_notes || {}) }
    if (next === 'J') notes[String(n)] = note
    else delete notes[String(n)]
    student.attendance_notes = notes
    student.summary = summarize(att, aula.total_sessions)
  } catch (err) {
    console.error('Error guardando asistencia B2B:', err)
    toast.error(err.response?.data?.message || 'No se pudo guardar la asistencia')
  } finally {
    savingKey.value = null
  }
}

// Popup de SOLO LECTURA con la justificacion. Va en hover y no en clic
// porque el clic de la celda ya es "marcar sesion".
const tip = ref(null)

function showTip(event, student, n) {
  const text = noteOf(student, n)
  if (!text) return
  const r = event.currentTarget.getBoundingClientRect()
  tip.value = {
    text, n,
    top: Math.min(r.bottom + 6, window.innerHeight - 160),
    left: Math.max(8, Math.min(r.left - 100, window.innerWidth - 300)),
  }
}

const hideTip = () => { tip.value = null }

// Espejo de b2bAttendanceSummary del backend: se recalcula en el cliente para
// no recargar toda la lista por cada clic. Si cambia la regla alla, cambia aca.
function summarize(att, totalSessions) {
  const marks = Object.values(att || {})
  const present = marks.filter((s) => s === 'P').length
  const tardy = marks.filter((s) => s === 'T').length
  const absent = marks.filter((s) => s === 'F').length
  const justified = marks.filter((s) => s === 'J').length
  const taken = present + tardy + absent + justified
  return {
    present, tardy, absent, justified, taken,
    pending: Math.max(0, (Number(totalSessions) || 0) - taken),
    // La justificada NO penaliza: cuenta como asistida igual que la tardanza.
    pct: taken ? Math.round(((present + tardy + justified) / taken) * 100) : null,
  }
}
</script>

<template>
  <div class="aulas-shell">
    <header class="page-head">
      <div class="titles">
        <div class="eyebrow">Academica</div>
        <h1>Seguimiento B2B</h1>
        <div class="subtitle">
          Alumnos de convenios corporativos en aulas En Vivo - {{ AULAS.length }} aulas con matricula B2B
        </div>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi" style="--bar: #10B981">
        <div class="k-label">
          <span>Aulas con B2B</span>
          <i class="fa-solid fa-building k-icon"></i>
        </div>
        <div class="k-value"><span v-if="isLoading" class="skel skel-kpi"></span><template v-else>{{ filtered.length }}</template></div>
        <div class="k-foot"><span>de {{ AULAS.length }} totales</span></div>
      </div>
      <div class="kpi" style="--bar: #2563EB">
        <div class="k-label">
          <span>Alumnos B2B</span>
          <i class="fa-solid fa-users k-icon"></i>
        </div>
        <div class="k-value"><span v-if="isLoading" class="skel skel-kpi"></span><template v-else>{{ totalAlumnos }}</template></div>
        <div class="k-foot"><span>matriculados</span></div>
      </div>
      <div class="kpi" style="--bar: #F59E0B">
        <div class="k-label">
          <span>Asistencia promedio</span>
          <i class="fa-solid fa-arrow-trend-up k-icon"></i>
        </div>
        <div class="k-value"><span v-if="isLoading" class="skel skel-kpi"></span><template v-else>{{ avgAsistencia == null ? '--' : avgAsistencia + '%' }}</template></div>
        <div class="k-foot"><span>sobre sesiones ya tomadas</span></div>
      </div>
      <div class="kpi" style="--bar: #EF4444">
        <div class="k-label">
          <span>Faltas registradas</span>
          <i class="fa-solid fa-user-xmark k-icon"></i>
        </div>
        <div class="k-value"><span v-if="isLoading" class="skel skel-kpi"></span><template v-else>{{ totalFaltas }}</template></div>
        <div class="k-foot"><span>{{ conNota }} con nota final</span></div>
      </div>
    </div>

    <div class="filter-bar">
      <button
        v-for="s in filterStates"
        :key="s"
        class="chip"
        :class="{ active: filter === s }"
        @click="filter = s"
      >
        <span v-if="filter === s" class="dot"></span>
        {{ s }}
        <span class="chip-count">{{ countByStatus(s) }}</span>
      </button>
      <span class="divider"></span>
      <div class="input">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model.trim="q" placeholder="Buscar por curso, docente, alumno o DNI..." />
      </div>
      <div class="spacer"></div>
      <span class="muted">{{ filtered.length }} aulas - {{ totalAlumnos }} alumnos</span>
      <span class="divider"></span>
      <span v-for="k in ['P', 'T', 'F', 'J', '']" :key="k" class="legend">
        <span class="sw" :class="'e-' + ESTADOS[k].key">{{ ESTADOS[k].short }}</span>{{ ESTADOS[k].label }}
      </span>
    </div>

    <div v-if="isLoading" class="course-grid">
      <article v-for="n in 4" :key="'sk' + n" class="course-card skel-card">
        <div class="c-bar skel"></div>
        <div class="c-head">
          <span class="skel" style="width: 90px; height: 18px"></span>
          <span class="skel" style="width: 60px; height: 18px"></span>
        </div>
        <div class="skel" style="width: 70%; height: 20px; margin-bottom: 12px"></div>
        <div class="skel" style="height: 48px; margin-bottom: 12px"></div>
        <div class="skel" style="height: 90px"></div>
      </article>
    </div>

    <div v-else-if="!filtered.length" class="empty-state">
      <i class="fa-regular fa-folder-open"></i>
      <div class="big">Sin alumnos B2B</div>
      <span v-if="q">Ninguna aula o alumno coincide con la busqueda</span>
      <span v-else>Ninguna aula En Vivo en estado "{{ filter }}" tiene matricula B2B</span>
    </div>

    <div v-else class="course-grid">
      <article
        v-for="c in filtered"
        :key="c.edition_num_id"
        class="course-card"
        :style="{ '--cbar': STATUS_COLORS[c.status] }"
      >
        <div class="c-bar"></div>
        <div class="c-head">
          <div>
            <span class="c-code">{{ c.version_code || c.abbreviation }}</span>
            <span class="c-edition">{{ c.specific_code }}</span>
          </div>
          <div class="row">
            <span class="badge b2b">{{ c.students.length }} B2B</span>
            <span class="badge" :class="badgeClass(c.status)">{{ c.status }}</span>
          </div>
        </div>
        <h3>{{ c.abbreviation }}</h3>
        <div class="c-teacher">
          <div class="av" :style="{ background: STATUS_COLORS[c.status] }">{{ c.teacherInitials }}</div>
          <div>
            <div class="tn">{{ c.instructor || '--' }}</div>
            <div class="tr">Docente</div>
          </div>
          <div class="spacer"></div>
          <div class="c-meta">
            <div class="m">
              <i class="fa-solid fa-graduation-cap"></i>
              <strong>{{ c.total_sessions || '--' }}</strong> {{ c.total_sessions === 1 ? 'sesion' : 'sesiones' }}
            </div>
            <div class="m">
              <i class="fa-regular fa-calendar"></i> {{ formatDate(c.start_date) }} -> {{ formatDate(c.end_date) }}
            </div>
            <div class="m">
              <i class="fa-regular fa-clock"></i> {{ c.schedule }}
            </div>
          </div>
        </div>

        <div class="tbl-wrap">
          <table class="course-table">
            <thead>
              <tr>
                <th class="col-al">Alumno</th>
                <th>DNI</th>
                <th>Contacto</th>
                <th v-for="s in c.sessions" :key="s.session_number" class="center s-col">
                  S{{ s.session_number }}<div class="sub">{{ fmtShort(s.date) }}</div>
                </th>
                <th class="center a-col">Asist.</th>
                <th class="center n-col" title="Se lee de la Lista de Notas - aqui no se edita">Nota final</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="st in c.students" :key="st.enrollment_id">
                <td class="ct-name col-al">
                  <a
                    class="al-link"
                    :href="aulaHref(c)"
                    target="_blank"
                    rel="noopener"
                    :title="`Abrir el aula ${c.abbreviation} ${c.specific_code} en una pestana nueva`"
                  >
                    {{ st.full_name }}
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </a>
                </td>
                <td class="mono">{{ st.dni || '--' }}</td>
                <td>
                  <div class="ct">{{ st.email || '--' }}</div>
                  <div class="ct sub">{{ st.phone || '' }}</div>
                </td>
                <td v-for="s in c.sessions" :key="s.session_number" class="center s-cell">
                  <button
                    class="s-btn"
                    :class="'e-' + estadoOf(st, s.session_number).key"
                    :disabled="savingKey === cellKey(st, s.session_number)"
                    :title="`S${s.session_number} - ${fmtShort(s.date)} - ${estadoOf(st, s.session_number).label} (clic para marcar)`"
                    @click="openPop($event, c, st, s.session_number)"
                    @mouseenter="showTip($event, st, s.session_number)"
                    @mouseleave="hideTip"
                  >
                    {{ estadoOf(st, s.session_number).short }}
                  </button>
                </td>
                <td class="asist-cell">
                  <div class="asist" :class="pctClass(st.summary.pct)">
                    <div class="a-top">
                      <b class="a-val">{{ st.summary.pct === null ? '--' : st.summary.pct + '%' }}</b>
                      <span class="a-frac">{{ st.summary.taken }}/{{ c.total_sessions }}</span>
                    </div>
                    <div class="a-bar">
                      <span :style="{ width: (st.summary.pct || 0) + '%' }"></span>
                    </div>
                  </div>
                </td>
                <td class="center">
                  <span class="score-pill" :class="gradeClass(st.final_grade)">
                    {{ st.final_grade === null ? '--' : Number(st.final_grade).toFixed(2) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>

    <div class="page-foot" v-if="!isLoading && filtered.length">
      <i class="fa-solid fa-circle-info"></i>
      Clic en una celda para marcar Sin marcar / Presente / Tardanza / Falta / Justificado.
      La justificacion pide un motivo y se lee pasando el cursor por la celda <b>J</b>; no baja el
      porcentaje de asistencia ni cuenta como falta. Esta asistencia es
      exclusiva del modulo B2B: no se escribe ni se lee en la Lista de Notas. La columna
      <b>Nota final</b> si viene de la Lista de Notas y aqui es de solo lectura.
    </div>

    <!-- Popover MARCAR SESION (mismo componente visual que Control de Ediciones) -->
    <template v-if="pop">
      <div class="pop-backdrop" @click="pop = null" @contextmenu.prevent="pop = null" />
      <div class="pop" :style="{ top: pop.top + 'px', left: pop.left + 'px' }">
        <template v-if="pop.asking">
          <div class="pop-h">JUSTIFICAR SESION {{ pop.n }}</div>
          <textarea
            v-model="motivo"
            class="pop-ta"
            rows="3"
            maxlength="500"
            autofocus
            placeholder="Motivo de la justificacion (lo vera quien pase por la celda)"
          ></textarea>
          <div class="pop-actions">
            <button class="pop-btn" @click="pop = null">Cancelar</button>
            <button class="pop-btn primary" :disabled="!motivo.trim()" @click="saveJustification">
              Guardar
            </button>
          </div>
        </template>
        <template v-else>
          <div class="pop-h">MARCAR SESION {{ pop.n }}</div>
          <button
            v-for="k in ORDER"
            :key="k"
            class="pop-opt"
            :class="{ on: markOf(pop.student, pop.n) === k }"
            @click="pick(k)"
          >
            <span class="sw" :class="'e-' + ESTADOS[k].key">{{ ESTADOS[k].short }}</span>
            {{ ESTADOS[k].label }}
            <span v-if="markOf(pop.student, pop.n) === k" class="ck">
              <i class="fa-solid fa-check"></i>
            </span>
          </button>
        </template>
      </div>
    </template>

    <!-- Justificacion en hover: solo lectura, sin backdrop (no bloquea el clic) -->
    <div v-if="tip" class="tip" :style="{ top: tip.top + 'px', left: tip.left + 'px' }">
      <div class="tip-h"><span class="sw e-just">J</span> Justificacion S{{ tip.n }}</div>
      <p class="tip-b">{{ tip.text }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Mismo sistema de diseno que Aulas.vue (tokens, KPIs, filter-bar, card). */
.aulas-shell {
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

.row { display: flex; align-items: center; gap: 8px; }
.spacer { flex: 1; }
.muted { color: var(--ink-3); font-size: 12px; }
.center { text-align: center; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* page-head */
.page-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.page-head .titles { flex: 1; min-width: 0; }
.page-head .eyebrow {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.page-head h1 { margin: 4px 0 2px; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.page-head .subtitle { color: var(--ink-3); font-size: 13.5px; }
.page-head .actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

/* buttons */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  border: 1px solid var(--line); background: white;
  color: var(--ink-2); cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn:hover { background: var(--bg-soft); border-color: #DDD; }
.btn:disabled { opacity: 0.6; cursor: default; }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.kpi {
  background: white; border-radius: var(--radius);
  padding: 14px 16px; border: 1px solid var(--line);
  position: relative; overflow: hidden;
}
.kpi::before {
  content: ''; position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 3px; border-radius: 2px; background: var(--bar, var(--ink-4));
}
.kpi .k-label {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.kpi .k-icon { color: var(--ink-4); font-size: 14px; }
.kpi .k-value {
  font-size: 30px; font-weight: 600; letter-spacing: -0.025em;
  margin-top: 4px; line-height: 1.1;
}
.kpi .k-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px; font-size: 12px; color: var(--ink-3);
}

/* filter bar */
.filter-bar {
  background: white; border-radius: var(--radius);
  border: 1px solid var(--line);
  padding: 12px 14px; margin-bottom: 14px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
}
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px;
  background: white; border: 1px solid var(--line);
  font-size: 12.5px; color: var(--ink-2); cursor: pointer;
  transition: background 0.15s;
}
.chip:hover { background: var(--bg-soft); }
.chip.active {
  background: #ECF8F2; color: var(--green-ink);
  border-color: #C8EFD8; font-weight: 500;
}
.chip .dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.chip .chip-count { color: var(--ink-4); font-size: 11px; }
.chip.active .chip-count { color: var(--green-ink); opacity: 0.7; }
.divider { width: 1px; height: 22px; background: var(--line); margin: 0 4px; }
.input {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; background: white; font-size: 13px;
  min-width: 260px; color: var(--ink-3);
}
.input input {
  border: none; outline: none; font-size: 13px;
  flex: 1; background: transparent; color: var(--ink);
}
.input input::placeholder { color: var(--ink-4); }

.legend { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-3); }
.sw {
  width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center;
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 700;
}

/* estados de asistencia */
.e-pend { background: var(--bg-soft); color: var(--ink-4); border: 1px solid var(--line); }
.e-pres { background: var(--green-soft); color: var(--green-ink); }
.e-tard { background: var(--amber-soft); color: var(--amber-ink); }
.e-falta { background: var(--red-soft); color: var(--red-ink); }
.e-just { background: var(--blue-soft); color: var(--blue-ink); }

/* Badges de cabecera. Rectangulo redondeado compacto: sin icono, sin punto y
   sin border-radius de pildora — eso era lo que los hacia anchos y blandos. */
.badge {
  display: inline-block;
  padding: 3px 8px; border-radius: 6px;
  font-size: 10px; font-weight: 700; line-height: 1.4;
  text-transform: uppercase; letter-spacing: 0.05em;
  white-space: nowrap;
}
.badge.b2b { background: var(--blue-soft); color: var(--blue-ink); }
.badge.ok { background: var(--green-soft); color: var(--green-ink); }
.badge.warn { background: var(--amber-soft); color: var(--amber-ink); }
.badge.neutral { background: var(--bg-soft); color: var(--ink-3); }

/* course grid: una tarjeta por aula, a ancho completo (lleva la grilla de
   asistencia dentro, no entra en 320px como las tarjetas de Aulas). */
.course-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
.course-card {
  background: white; border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  padding: 16px; position: relative; overflow: hidden;
  transition: box-shadow 0.12s, border-color 0.12s;
}
.course-card:hover { border-color: #D4D4CC; box-shadow: var(--shadow-md); }
.course-card .c-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--cbar, var(--green));
}
.course-card .c-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px; margin-bottom: 8px;
}
.course-card .c-code {
  font-family: var(--font-mono); font-size: 11px;
  font-weight: 600; color: var(--ink-3);
  background: var(--bg-soft); padding: 2px 7px; border-radius: 5px;
  border: 1px solid var(--line-soft);
}
.course-card .c-edition {
  margin-left: 6px; font-size: 10.5px; color: var(--ink-4);
  font-weight: 600; letter-spacing: 0.05em;
}
.course-card h3 {
  margin: 0 0 4px; font-size: 16px; font-weight: 600;
  letter-spacing: -0.015em; line-height: 1.25;
}
.course-card .c-teacher {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin: 12px 0; padding: 10px; background: var(--bg-soft); border-radius: 8px;
}
.course-card .c-teacher .av {
  width: 28px; height: 28px; border-radius: 999px;
  display: grid; place-items: center;
  color: white; font-weight: 600; font-size: 11px;
}
.course-card .c-teacher .tn { font-size: 12.5px; font-weight: 500; line-height: 1.2; }
.course-card .c-teacher .tr { font-size: 11px; color: var(--ink-3); }
.course-card .c-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; }
.course-card .c-meta .m { display: flex; align-items: center; gap: 6px; color: var(--ink-3); }
.course-card .c-meta .m i { font-size: 11px; }
.course-card .c-meta .m strong { color: var(--ink); font-weight: 500; }

/* table */
.tbl-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); }
.course-table {
  width: 100%; background: white;
  border-collapse: collapse; font-size: 13px;
}
.course-table th, .course-table td {
  text-align: left; padding: 9px 12px;
  border-bottom: 1px solid var(--line-soft);
}
.course-table th {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
  background: var(--bg-soft); white-space: nowrap;
}
.course-table th.s-col { width: 58px; }
.course-table th.a-col { width: 100px; }
.course-table th.n-col { width: 84px; }
.course-table th .sub { text-transform: none; letter-spacing: 0; }
.course-table tbody tr:hover { background: #FAFAF6; }
.course-table tbody tr:hover .col-al { background: #FAFAF6; }
.course-table tr:last-child td { border-bottom: none; }
.course-table .ct-name { font-weight: 500; }
.col-al { position: sticky; left: 0; z-index: 2; background: white; min-width: 210px; }
.course-table th.col-al { z-index: 3; background: var(--bg-soft); }
.sub { font-size: 11px; color: var(--ink-3); font-weight: 400; font-family: var(--font-mono); }
.sub.center { text-align: center; }
.ct { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }

.al-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: inherit; text-decoration: none; cursor: pointer;
}
.al-link i { font-size: 9.5px; color: var(--ink-4); opacity: 0; transition: opacity 0.12s; }
.al-link:hover { color: var(--blue-ink); text-decoration: underline; }
.al-link:hover i { opacity: 1; }

td.s-cell { padding: 5px 4px; }
.s-btn {
  width: 32px; height: 28px; border-radius: 7px; border: 1px solid transparent;
  font-family: var(--font-mono); font-size: 12px; font-weight: 700;
  cursor: pointer; transition: filter 0.12s, border-color 0.12s;
}
.s-btn:hover:not(:disabled) { filter: brightness(0.95); border-color: #D4D4CC; }
.s-btn:disabled { opacity: 0.5; cursor: default; }

/* Badges: hugging content. Nada de min-width — el ancho fijo dejaba aire
   muerto a los lados con valores cortos ("--", "8.00"). */
.score-pill {
  display: inline-block; font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 12px; font-weight: 600; border-radius: 6px; padding: 3px 7px; line-height: 1.3;
}
.score-pill.ok { background: var(--green-soft); color: var(--green-ink); }
.score-pill.mid { background: var(--amber-soft); color: var(--amber-ink); }
.score-pill.bad { background: var(--red-soft); color: var(--red-ink); }
.score-pill.na { background: var(--bg-soft); color: var(--ink-4); }

/* ASIST.: un bloque, no dos piezas sueltas. El % manda (grande, a la
   izquierda), la fraccion lo contextualiza (chica, a la derecha, alineada al
   borde) y la barra ata las dos a un mismo ancho. */
.asist-cell { padding: 8px 12px; }
.asist { width: 76px; margin: 0 auto; }
.asist .a-top {
  display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
}
.asist .a-val {
  font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 14px; font-weight: 600; letter-spacing: -0.02em; line-height: 1;
}
.asist .a-frac {
  font-family: var(--font-mono); font-variant-numeric: tabular-nums;
  font-size: 10.5px; color: var(--ink-4); line-height: 1;
}
.asist .a-bar {
  height: 3px; border-radius: 2px; background: var(--line); margin-top: 5px; overflow: hidden;
}
.asist .a-bar span { display: block; height: 100%; border-radius: 2px; background: currentColor; }
.asist.ok { color: var(--green-ink); }
.asist.mid { color: var(--amber-ink); }
.asist.bad { color: var(--red-ink); }
.asist.na { color: var(--ink-4); }
.asist.na .a-val { color: var(--ink-4); }

.page-foot {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 16px; font-size: 12.5px; color: var(--ink-3); line-height: 1.5;
}
.page-foot i { margin-top: 2px; }
.empty-state {
  text-align: center; padding: 70px 20px; color: var(--ink-3);
  background: white; border: 1px solid var(--line); border-radius: var(--radius);
}
.empty-state i { font-size: 26px; color: var(--ink-4); }
.empty-state .big { font-size: 17px; font-weight: 600; color: var(--ink-2); margin: 10px 0 4px; }

/* skeleton loading (mismo shimmer que Aulas) */
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
.skel-card { pointer-events: none; }
.skel-card .c-bar { height: 3px; }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ---------- popover "marcar sesion" (identico al de ControlEdiciones) ---------- */
.pop-backdrop { position: fixed; inset: 0; z-index: 1090; }
.pop {
  position: fixed; z-index: 1091; background: var(--pop-bg, #fff);
  border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: 0 10px 30px -12px rgba(20,20,15,0.22);
  padding: 6px; min-width: 190px; color: var(--ink);
}
.pop-h {
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3); padding: 7px 10px 5px;
}
.pop-opt {
  display: flex; align-items: center; gap: 10px; width: 100%;
  border: none; background: transparent; border-radius: 8px; padding: 9px 10px;
  font-family: inherit; font-size: 13px; color: var(--ink); text-align: left;
  cursor: pointer; transition: 0.12s;
}
.pop-opt:hover { background: var(--bg-soft); }
.pop-opt.on { background: var(--bg-soft); font-weight: 500; }
.pop-opt .ck { margin-left: auto; color: var(--we-navy, #002060); display: flex; }
.pop-ta {
  width: 100%; min-width: 240px; resize: vertical; margin: 0 0 6px;
  border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px;
  font-family: inherit; font-size: 13px; color: var(--ink); background: transparent;
}
.pop-ta:focus { outline: none; border-color: var(--we-navy, #002060); }
.pop-actions { display: flex; justify-content: flex-end; gap: 6px; padding: 0 0 2px; }
.pop-btn {
  border: 1px solid var(--line); background: transparent; border-radius: 8px;
  padding: 6px 12px; font-family: inherit; font-size: 12.5px; color: var(--ink); cursor: pointer;
}
.pop-btn:hover { background: var(--bg-soft); }
.pop-btn.primary { background: var(--we-navy, #002060); border-color: var(--we-navy, #002060); color: #fff; }
.pop-btn.primary:disabled { opacity: 0.45; cursor: not-allowed; }

/* popup de la justificacion (hover, solo lectura) */
.tip {
  position: fixed; z-index: 1092; max-width: 280px;
  background: var(--pop-bg, #fff); border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: 0 10px 30px -12px rgba(20,20,15,0.22); padding: 10px 12px; color: var(--ink);
  pointer-events: none;
}
.tip-h {
  display: flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px;
}
.tip-b { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-2); white-space: pre-wrap; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .aulas-shell {
  --bg-soft: #1F1F1A;
  --line: #2A2A22;
  --line-soft: #1F1F1A;
  --ink: #F4F4F0;
  --ink-2: #D4D4CC;
  --ink-3: #A0A099;
  --ink-4: #6F6F66;
  --green-soft: rgba(16,185,129,0.14);
  --green-ink: #34D399;
  --amber-soft: rgba(245,158,11,0.14);
  --amber-ink: #FBBF24;
  --red-soft: rgba(239,68,68,0.14);
  --red-ink: #F87171;
  --blue-soft: rgba(37,99,235,0.18);
  --blue-ink: #60A5FA;
  --shadow-md: 0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.35);
  --pop-bg: #1A1A14;
}
[data-coreui-theme="dark"] .aulas-shell .pop,
[data-coreui-theme="dark"] .aulas-shell .tip { box-shadow: 0 10px 30px -12px rgba(0,0,0,0.6); }
[data-coreui-theme="dark"] .aulas-shell .pop-ta { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .aulas-shell .pop-btn { border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .pop-btn:hover { background: #2A2A22; }
[data-coreui-theme="dark"] .aulas-shell .pop-btn.primary { background: #8FAADC; border-color: #8FAADC; color: #14140F; }
[data-coreui-theme="dark"] .aulas-shell .pop-opt .ck { color: #8FAADC; }
[data-coreui-theme="dark"] .aulas-shell .btn { background: #1F1F1A; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .btn:hover { background: #2A2A22; border-color: #3A3A33; }
[data-coreui-theme="dark"] .aulas-shell .kpi { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .chip { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .chip:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .chip.active {
  background: rgba(16,185,129,0.16); color: #34D399; border-color: rgba(16,185,129,0.3);
}
[data-coreui-theme="dark"] .aulas-shell .input { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .input input { color: #F4F4F0; }
[data-coreui-theme="dark"] .aulas-shell .course-card { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .course-card:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .aulas-shell .course-card .c-code { background: #1F1F1A; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .aulas-shell .course-card .c-teacher { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .course-table { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .course-table th { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .col-al { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .course-table th.col-al { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .course-table tbody tr:hover,
[data-coreui-theme="dark"] .aulas-shell .course-table tbody tr:hover .col-al { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .empty-state { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .s-btn:hover:not(:disabled) { filter: brightness(1.15); border-color: #3A3A33; }
[data-coreui-theme="dark"] .aulas-shell .asist .a-bar { background: #2A2A22; }
[data-coreui-theme="dark"] .aulas-shell .skel {
  background: linear-gradient(90deg, #1F1F1A 25%, #2A2A22 50%, #1F1F1A 75%);
  background-size: 200% 100%;
}
</style>
