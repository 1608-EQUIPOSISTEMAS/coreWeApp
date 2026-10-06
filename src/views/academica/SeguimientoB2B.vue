<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { aulaStatus } from '@/entities/aula/aulaStatus'
import { normalizeText as norm, initials } from '@/shared/lib/text'
import { formatDayMonth } from '@/features/academica-week/useIsoWeekNav'
import SessionMarkPopover from './components/SessionMarkPopover.vue'

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
  '': { label: 'Sin marcar', short: '-', tone: '' },
  P: { label: 'Presente', short: 'P', tone: 'ok' },
  T: { label: 'Tardanza', short: 'T', tone: 'warn' },
  F: { label: 'Falta', short: 'F', tone: 'bad' },
  J: { label: 'Justificado', short: 'J', tone: 'info' },
}
// Orden del popover "Marcar sesion" (mismo patron que Control de Ediciones).
const MARK_OPTIONS = ['', 'P', 'T', 'F', 'J'].map((code) => ({ code, ...ESTADOS[code] }))
const LEGEND = ['P', 'T', 'F', 'J', ''].map((code) => ({ code, ...ESTADOS[code] }))

// Franja de la tarjeta, avatar del docente y badge de estado comparten tono:
// Proximo en ambar y no en azul, porque el azul ya es el del conteo B2B y
// la cabecera mostraria dos badges identicos pegados.
const STATUS_TONE = { Activo: 'ok', Proximo: 'warn', Finalizado: '' }
// El valor interno es 'Proximo' (aulaStatus); en pantalla va con tilde.
const statusLabel = (s) => (s === 'Proximo' ? 'Próximo' : s)

function formatDate(iso) {
  if (!iso) return '--'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : '--'
}

// Estado del aula sobre el cronograma REAL derivado (sessions ya trae las
// reprogramaciones aplicadas), con fallback a start/end de la edicion.
function deriveStatus(e) {
  return aulaStatus(
    e.sessions?.[0]?.date || e.start_date,
    e.sessions?.[e.sessions.length - 1]?.date || e.end_date,
  )
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
      teacherInitials: initials(e.instructor) || '--',
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

// Nota final: viene de la Lista de Notas, SOLO LECTURA. Escala 0-20.
const gradeTone = (g) => (g === null ? '' : g >= 13 ? 'ok' : g >= 11 ? 'warn' : 'bad')
const pctTone = (p) => (p === null ? '' : p >= 80 ? 'ok' : p >= 60 ? 'warn' : 'bad')

const savingKey = ref(null)
const cellKey = (s, n) => `${s.enrollment_id}:${n}`
const markOf = (s, n) => s.attendance?.[String(n)] || ''
const estadoOf = (s, n) => ESTADOS[markOf(s, n)]
// Motivo escrito por academica al justificar. Solo las celdas 'J' tienen uno.
const noteOf = (s, n) => s.attendance_notes?.[String(n)] || ''

// Popover "Marcar sesion": { aula, student, n, anchor, asking }
// `asking` = el segundo paso, donde academica escribe el motivo de la 'J'.
const pop = ref(null)
const motivo = ref('')

function openPop(event, aula, student, n) {
  pop.value = { aula, student, n, asking: false, anchor: event.currentTarget.getBoundingClientRect() }
}

const popTitle = computed(() =>
  pop.value?.asking ? `Justificar sesión ${pop.value.n}` : `Marcar sesión ${pop.value?.n}`
)

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
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Seguimiento B2B</h1>
        <p class="ds-sub">
          Alumnos de convenios corporativos en aulas En Vivo — {{ AULAS.length }} aulas con matrícula B2B
        </p>
      </div>
    </header>

    <div class="ds-kpis">
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-building"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ filtered.length }}</template>
          </span>
          <span class="ds-kpi-label">Aulas con B2B</span>
          <span class="ds-kpi-note">de {{ AULAS.length }} totales</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-users"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ totalAlumnos }}</template>
          </span>
          <span class="ds-kpi-label">Alumnos B2B</span>
          <span class="ds-kpi-note">matriculados</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon" :class="pctTone(avgAsistencia)" aria-hidden="true"><i class="fa-solid fa-arrow-trend-up"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ avgAsistencia == null ? '--' : avgAsistencia + '%' }}</template>
          </span>
          <span class="ds-kpi-label">Asistencia promedio</span>
          <span class="ds-kpi-note">sobre sesiones ya tomadas</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon bad" aria-hidden="true"><i class="fa-solid fa-user-xmark"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">
            <span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ totalFaltas }}</template>
          </span>
          <span class="ds-kpi-label">Faltas registradas</span>
          <span class="ds-kpi-note">{{ conNota }} con nota final</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="ds-panel-body toolbar">
        <div class="ds-tabs" role="group" aria-label="Filtrar aulas por estado">
          <button
            v-for="s in filterStates"
            :key="s"
            type="button"
            :aria-pressed="String(filter === s)"
            @click="filter = s"
          >
            {{ statusLabel(s) }} <span class="count">{{ countByStatus(s) }}</span>
          </button>
        </div>
        <input
          v-model.trim="q"
          class="ds-input search"
          type="search"
          placeholder="Buscar por curso, docente, alumno o DNI..."
          aria-label="Buscar por curso, docente, alumno o DNI"
        />
        <span class="toolbar-count">{{ filtered.length }} aulas · {{ totalAlumnos }} alumnos</span>
        <div class="legend">
          <span v-for="l in LEGEND" :key="l.code" class="legend-item">
            <span class="ds-pill mark" :class="l.tone">{{ l.short }}</span>{{ l.label }}
          </span>
        </div>
      </div>
    </section>

    <template v-if="isLoading">
      <article v-for="n in 4" :key="'sk' + n" class="ds-panel">
        <div class="ds-panel-body">
          <span class="ds-skel skel-title"></span>
          <span class="ds-skel skel-block"></span>
          <span class="ds-skel skel-table"></span>
        </div>
      </article>
    </template>

    <p v-else-if="!filtered.length" class="ds-panel ds-empty ds-empty--lista">
      <template v-if="q">Ninguna aula o alumno coincide con la búsqueda. Prueba con otro nombre o DNI.</template>
      <template v-else>Ninguna aula En Vivo en estado "{{ filter }}" tiene matrícula B2B. Elige otro estado arriba.</template>
    </p>

    <template v-else>
      <article
        v-for="c in filtered"
        :key="c.edition_num_id"
        class="ds-panel aula-card"
        :class="STATUS_TONE[c.status]"
      >
        <header class="ds-panel-head">
          <div>
            <span class="code">{{ c.version_code || c.abbreviation }}</span>
            <span class="edition">{{ c.specific_code }}</span>
            <h3 class="ds-panel-title aula-title">{{ c.abbreviation }}</h3>
          </div>
          <div class="pills">
            <span class="ds-pill info">{{ c.students.length }} B2B</span>
            <span class="ds-pill" :class="STATUS_TONE[c.status]">{{ statusLabel(c.status) }}</span>
          </div>
        </header>

        <div class="ds-panel-body">
          <div class="teacher">
            <div class="av" :class="STATUS_TONE[c.status]" aria-hidden="true">{{ c.teacherInitials }}</div>
            <div>
              <div class="tn">{{ c.instructor || '--' }}</div>
              <div class="tr">Docente</div>
            </div>
            <div class="meta">
              <span>
                <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
                <strong>{{ c.total_sessions || '--' }}</strong> {{ c.total_sessions === 1 ? 'sesión' : 'sesiones' }}
              </span>
              <span>
                <i class="fa-regular fa-calendar" aria-hidden="true"></i> {{ formatDate(c.start_date) }} → {{ formatDate(c.end_date) }}
              </span>
              <span>
                <i class="fa-regular fa-clock" aria-hidden="true"></i> {{ c.schedule }}
              </span>
            </div>
          </div>

          <div class="ds-table-scroll">
            <table class="ds-table ds-table--lista attendance">
              <thead>
                <tr>
                  <th class="col-al">Alumno</th>
                  <th>DNI</th>
                  <th>Contacto</th>
                  <th v-for="s in c.sessions" :key="s.session_number" class="center s-col">
                    S{{ s.session_number }}<div class="sub">{{ formatDayMonth(s.date) }}</div>
                  </th>
                  <th class="center a-col">Asist.</th>
                  <th class="center n-col" title="Se lee de la Lista de Notas - aquí no se edita">Nota final</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="st in c.students" :key="st.enrollment_id">
                  <td class="col-al">
                    <a
                      class="al-link"
                      :href="aulaHref(c)"
                      target="_blank"
                      rel="noopener"
                      :title="`Abrir el aula ${c.abbreviation} ${c.specific_code} en una pestaña nueva`"
                    >
                      {{ st.full_name }}
                      <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                    </a>
                  </td>
                  <td class="mono">{{ st.dni || '--' }}</td>
                  <td>
                    <div class="ct">{{ st.email || '--' }}</div>
                    <div class="ct sub">{{ st.phone || '' }}</div>
                  </td>
                  <td v-for="s in c.sessions" :key="s.session_number" class="center s-cell">
                    <button
                      class="ds-pill s-btn"
                      type="button"
                      :class="estadoOf(st, s.session_number).tone"
                      :disabled="savingKey === cellKey(st, s.session_number)"
                      :title="`S${s.session_number} - ${formatDayMonth(s.date)} - ${estadoOf(st, s.session_number).label} (clic para marcar)`"
                      :aria-label="`Marcar sesión ${s.session_number} de ${st.full_name}: ${estadoOf(st, s.session_number).label}`"
                      @click="openPop($event, c, st, s.session_number)"
                      @mouseenter="showTip($event, st, s.session_number)"
                      @mouseleave="hideTip"
                    >
                      {{ estadoOf(st, s.session_number).short }}
                    </button>
                  </td>
                  <td>
                    <div class="asist" :class="pctTone(st.summary.pct)">
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
                    <span class="ds-pill mono" :class="gradeTone(st.final_grade)">
                      {{ st.final_grade === null ? '--' : Number(st.final_grade).toFixed(2) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>

      <p class="ds-callout">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>
          Clic en una celda para marcar Sin marcar / Presente / Tardanza / Falta / Justificado.
          La justificación pide un motivo y se lee pasando el cursor por la celda <b>J</b>; no baja el
          porcentaje de asistencia ni cuenta como falta. Esta asistencia es
          exclusiva del módulo B2B: no se escribe ni se lee en la Lista de Notas. La columna
          <b>Nota final</b> sí viene de la Lista de Notas y aquí es de solo lectura.
        </span>
      </p>
    </template>

    <SessionMarkPopover
      v-if="pop"
      :anchor="pop.anchor"
      :width="270"
      :height="280"
      :title="popTitle"
      :options="MARK_OPTIONS"
      :selected="markOf(pop.student, pop.n)"
      @pick="pick"
      @close="pop = null"
    >
      <template v-if="pop.asking" #step>
        <div class="justify-step">
          <textarea
            v-model="motivo"
            class="ds-input"
            rows="3"
            maxlength="500"
            autofocus
            aria-label="Motivo de la justificación"
            placeholder="Motivo de la justificación (lo verá quien pase por la celda)"
          ></textarea>
          <div class="justify-actions">
            <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="pop = null">Cancelar</button>
            <button class="btn-exec btn-exec-primary btn-sm" type="button" :disabled="!motivo.trim()" @click="saveJustification">
              Guardar
            </button>
          </div>
        </div>
      </template>
    </SessionMarkPopover>

    <!-- Justificacion en hover: solo lectura, sin backdrop (no bloquea el clic) -->
    <div v-if="tip" class="tip" role="tooltip" :style="{ top: tip.top + 'px', left: tip.left + 'px' }">
      <div class="tip-h"><span class="ds-pill info mark">J</span> Justificación S{{ tip.n }}</div>
      <p class="tip-b">{{ tip.text }}</p>
    </div>
  </div>
</template>

<style scoped>
.center { text-align: center; }
.mono { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }
.mark { width: 20px; height: 20px; padding: 0; justify-content: center; font-family: var(--ds-font-mono); }

/* Barra de filtros: estado, busqueda, conteo y leyenda en una sola linea. */
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
.count { margin-left: 4px; font-size: 11px; opacity: 0.7; }
.search { flex: 0 1 300px; min-width: 220px; }
.toolbar-count { margin-left: auto; font-size: 12px; color: var(--ds-muted); }
.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ds-ink-2); }

/* Tarjeta por aula: franja superior y avatar con el tono del estado. */
.aula-card { border-top: 3px solid var(--ds-muted); }
.aula-card.ok { border-top-color: var(--ds-ok); }
.aula-card.warn { border-top-color: var(--ds-warn); }
.code {
  padding: 2px 7px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control);
  background: var(--ds-surface-2); font-family: var(--ds-font-mono); font-size: 11px; font-weight: 600; color: var(--ds-ink-2);
}
.edition { margin-left: 6px; font-size: 10.5px; font-weight: 600; color: var(--ds-muted); }
.aula-title { margin-top: 6px; font-size: 16px; }
.pills { display: flex; align-items: center; gap: 8px; align-self: flex-start; }

.teacher {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  margin-bottom: 12px; padding: 10px; border-radius: var(--ds-radius-sm); background: var(--ds-surface-2);
}
.av {
  width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px;
  background: var(--ds-muted); color: var(--ds-on-brand); font-size: 11px; font-weight: 600;
}
.av.ok { background: var(--ds-ok); }
.av.warn { background: var(--ds-warn); }
.tn { font-size: 12.5px; font-weight: 600; line-height: 1.2; color: var(--ds-ink); }
.tr { font-size: 11px; color: var(--ds-muted); }
.meta { display: flex; flex-wrap: wrap; gap: 16px; margin-left: auto; font-size: 12px; color: var(--ds-ink-2); }
.meta span { display: inline-flex; align-items: center; gap: 6px; }
.meta i { font-size: 11px; }
.meta strong { font-weight: 600; color: var(--ds-ink); }

/* Matriz alumno x sesion: el alumno queda fijo al hacer scroll horizontal. */
.attendance th, .attendance td { text-align: left; }
.attendance .center { text-align: center; }
.attendance .col-al { position: sticky; left: 0; z-index: 2; min-width: 210px; background: var(--ds-surface); }
.attendance thead th.col-al { z-index: 3; }
.attendance th.s-col { width: 58px; }
.attendance th.a-col { width: 100px; }
.attendance th.n-col { width: 84px; }
.sub { font-family: var(--ds-font-mono); font-size: 11px; font-weight: 400; color: var(--ds-muted); }
.ct { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }

.al-link { display: inline-flex; align-items: center; gap: 6px; color: inherit; text-decoration: none; }
.al-link i { font-size: 9.5px; color: var(--ds-muted); opacity: 0; transition: opacity 0.12s; }
.al-link:hover, .al-link:focus-visible { color: var(--ds-accent); text-decoration: underline; }
.al-link:hover i, .al-link:focus-visible i { opacity: 1; }

.attendance td.s-cell { padding: 5px 4px; }
.s-btn {
  width: 32px; height: 28px; justify-content: center; border: 1px solid transparent;
  font-family: var(--ds-font-mono); font-size: 12px; cursor: pointer; transition: border-color 0.12s;
}
.s-btn:hover:not(:disabled) { border-color: var(--ds-border-strong); }
.s-btn:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.s-btn:disabled { opacity: 0.5; cursor: default; }

/* Asist.: el % manda, la fraccion lo contextualiza y la barra ata las dos. */
.asist { width: 76px; margin: 0 auto; color: var(--ds-muted); }
.asist.ok { color: var(--ds-ok-ink); }
.asist.warn { color: var(--ds-warn-ink); }
.asist.bad { color: var(--ds-bad-ink); }
.a-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.a-val { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 600; line-height: 1; }
.a-frac { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; font-size: 10.5px; line-height: 1; color: var(--ds-muted); }
.a-bar { height: 3px; margin-top: 5px; overflow: hidden; border-radius: 2px; background: var(--ds-surface-3); }
.a-bar span { display: block; height: 100%; border-radius: 2px; background: currentColor; }

.skel-title { width: 40%; height: 20px; margin-bottom: 12px; }
.skel-block { height: 48px; margin-bottom: 12px; }
.skel-table { height: 90px; }

.justify-step { padding: 0 4px 2px; }
.justify-step textarea { min-width: 240px; margin-bottom: 6px; }
.justify-actions { display: flex; justify-content: flex-end; gap: 6px; }

/* Justificacion en hover, solo lectura */
.tip {
  position: fixed; z-index: 1092; max-width: 280px; padding: 10px 12px; pointer-events: none;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.35); color: var(--ds-ink);
}
.tip-h { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; font-size: 11.5px; font-weight: 700; color: var(--ds-ink-2); }
.tip-b { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ds-ink-2); white-space: pre-wrap; }
</style>
