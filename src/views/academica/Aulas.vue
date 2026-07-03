<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import AulasFilterModal from './AulasFilterModal.vue'

const editionService = inject(ServiceKeys.Edition)
const catalog = inject('catalog')
const toast = useToast()
const router = useRouter()

function openAula(id) {
  if (!id) return
  router.push({ name: 'AcademicaAulaDetail', params: { id } })
}

const SEGMENT_COLORS = {
  A1: '#2563EB',
  A2: '#F59E0B',
  A3: '#EAB308',
  A4: '#84CC16',
  A5: '#EF4444',
  A6: '#8B5CF6',
}
const FALLBACK_COLOR = '#6366F1'

function initials(name) {
  if (!name) return '--'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso) {
  if (!iso) return '--'
  const s = String(iso).slice(0, 10)
  const [y, m, d] = s.split('-')
  if (!y || !m || !d) return '--'
  return `${d}/${m}/${y}`
}

function todayLima() {
  return new Date().toISOString().slice(0, 10)
}

function deriveStatus(row) {
  if (row.active === 'N') return 'Finalizado'
  const today = todayLima()
  const start = row.start_date ? String(row.start_date).slice(0, 10) : null
  const end = row.end_date ? String(row.end_date).slice(0, 10) : null
  if (!start) return 'Proximo'
  if (start > today) return 'Proximo'
  if (end && end < today) return 'Finalizado'
  return 'Activo'
}

function buildSchedule(row) {
  if (!Array.isArray(row.schedules) || !row.schedules.length) return '--'
  const s = row.schedules[0]
  const parts = [s.day_combination_label, s.hour_combination_label].filter(Boolean)
  return parts.length ? parts.join(' ') : '--'
}

// Defaults para metricas que aun no tienen SP propio.
// `students` se sobrescribe con el conteo real (FICO aprobadas) en loadCourses.
function getCourseMetrics() {
  return {
    students: null,
    attendance: null,
    average: null,
    atRisk: 0,
  }
}

function mapRow(row) {
  const metrics = getCourseMetrics(row)
  return {
    id: row.edition_num_id ?? row.global_code,
    code: row.global_code || row.version_code || '--',
    name: row.program_abreviature || 'Sin nombre',
    edition: row.specific_code || '',
    modality: row.cat_model_modality_label || '--',
    agent: row.cat_segment || '',
    teacher: row.instructor || '--',
    teacherInitials: initials(row.instructor),
    sessions: Number(row.program_sessions) || 0,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    rawStart: row.start_date ? String(row.start_date).slice(0, 10) : null,
    rawEnd: row.end_date ? String(row.end_date).slice(0, 10) : null,
    schedule: buildSchedule(row),
    status: deriveStatus(row),
    color: SEGMENT_COLORS[row.cat_segment] || FALLBACK_COLOR,
    ...metrics,
  }
}

const COURSES = ref([])
const isLoading = ref(false)

async function loadCourses() {
  isLoading.value = true
  try {
    const courseTypeId = (catalog?.options?.('we_program_type') || [])
      .find((o) => o.alias === 'we_program_type_course')?.id
    const payload = {
      active: 'Y',
      page: 1,
      size: 500,
      type_program_ids: courseTypeId ? [{ value: courseTypeId }] : [],
    }
    const { items } = await editionService.editionList(payload)
    // Excluimos cat_segment === 'A5' porque representa cursos cancelados:
    // la vista academica no los considera (ni en conteos, ni en tarjetas, ni
    // en KPIs). El filtro ocurre aca y no en `filtered` para que el numero
    // "X aulas en el periodo" tampoco los cuente.
    const baseRows = (Array.isArray(items) ? items : [])
      .filter((row) => String(row?.cat_segment || '').toUpperCase() !== 'A5')
      .map(mapRow)

    const editionIds = baseRows.map((c) => c.id).filter((id) => Number.isFinite(id))
    const metricsById = await fetchMetricsByEdition(editionIds)

    COURSES.value = baseRows.map((c) => ({ ...c, ...(metricsById[c.id] || {}) }))
  } catch (err) {
    console.error('Error cargando aulas:', err)
    toast.error('Error al cargar aulas')
    COURSES.value = []
  } finally {
    isLoading.value = false
  }
}

async function fetchMetricsByEdition(editionIds) {
  if (!editionIds.length) return {}
  try {
    const rows = await editionService.classroomMetricsList({ edition_ids: editionIds })
    const map = {}
    for (const r of rows || []) {
      map[r.edition_num_id] = {
        students: Number(r.students) || 0,
      }
    }
    return map
  } catch (err) {
    console.warn('No se pudo obtener metricas de aulas:', err?.message || err)
    return {}
  }
}

onMounted(loadCourses)

const layout = ref('grid')
const filter = ref('Activo')

// === Filtros avanzados (mismo patron que FICO EnrollmentFilterModal, pero
// client-side: todo el dataset ya esta en COURSES, no hay refetch) ===
const showFilterModal = ref(false)
const advFilters = reactive({
  q: '',
  modality_ids: [],
  segment_ids: [],
  teacher_ids: [],
  start_range_string: null,
  start_from: null,
  start_to: null,
  end_range_string: null,
  end_from: null,
  end_to: null,
})

// Catalogos del modal derivados de los datos cargados (valores unicos).
const distinct = (key) =>
  [...new Set(COURSES.value.map((c) => c[key]).filter((v) => v && v !== '--'))]
    .sort()
    .map((v) => ({ id: v, description: v }))
const filtroModalidad = computed(() => distinct('modality'))
const filtroSegmento = computed(() => distinct('agent'))
const filtroDocente = computed(() => distinct('teacher'))

// El locale Spanish de flatpickr usa ' a ' como rangeSeparator; el ingles ' to '.
function handleDateChange(dateStr, type) {
  const p = dateStr ? String(dateStr).split(/\s+(?:to|a)\s+/i) : []
  const from = p[0] || null
  const to = p[1] || p[0] || null
  if (type === 'start') { advFilters.start_from = from; advFilters.start_to = to }
  if (type === 'end') { advFilters.end_from = from; advFilters.end_to = to }
}

const selectedSet = (arr) => new Set((arr || []).map((i) => i.value ?? i.id ?? i))
const inRange = (d, from, to) => !!d && (!from || d >= from) && (!to || d <= to)

const filtered = computed(() => {
  const mods = selectedSet(advFilters.modality_ids)
  const segs = selectedSet(advFilters.segment_ids)
  const teach = selectedSet(advFilters.teacher_ids)
  return COURSES.value.filter((c) => {
    if (filter.value !== 'Todos' && c.status !== filter.value) return false
    if (mods.size && !mods.has(c.modality)) return false
    if (segs.size && !segs.has(c.agent)) return false
    if (teach.size && !teach.has(c.teacher)) return false
    if (advFilters.start_from || advFilters.start_to) {
      if (!inRange(c.rawStart, advFilters.start_from, advFilters.start_to)) return false
    }
    if (advFilters.end_from || advFilters.end_to) {
      if (!inRange(c.rawEnd, advFilters.end_from, advFilters.end_to)) return false
    }
    if (advFilters.q) {
      const q = advFilters.q.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.teacher.toLowerCase().includes(q)
      )
    }
    return true
  })
})

// Chips activos: computed en vez del rebuild manual de enrollment porque el
// filtrado es reactivo/client-side y no hay "aplicar" contra backend.
const activeFilterChips = computed(() => {
  const chips = []
  const mc = (key, lbl, items) => {
    if (!items?.length) return
    const ls = items.map((i) => i.label || i.description || i.value || i)
    chips.push({ key, label: ls.length === 1 ? `${lbl}: ${ls[0]}` : `${lbl}: ${ls.length} sel.`, details: ls })
  }
  if (advFilters.q) chips.push({ key: 'q', label: `Busqueda: ${advFilters.q}` })
  mc('modality_ids', 'Modalidad', advFilters.modality_ids)
  mc('segment_ids', 'Segmento', advFilters.segment_ids)
  mc('teacher_ids', 'Docente', advFilters.teacher_ids)
  if (advFilters.start_from) chips.push({ key: 'start_range', label: `Inicio: ${advFilters.start_from} a ${advFilters.start_to}` })
  if (advFilters.end_from) chips.push({ key: 'end_range', label: `Fin: ${advFilters.end_from} a ${advFilters.end_to}` })
  return chips
})

function clearAdvFilter(key) {
  if (key === 'q') advFilters.q = ''
  else if (key === 'start_range') Object.assign(advFilters, { start_range_string: null, start_from: null, start_to: null })
  else if (key === 'end_range') Object.assign(advFilters, { end_range_string: null, end_from: null, end_to: null })
  else advFilters[key] = []
}

function clearAdvFilters() {
  Object.assign(advFilters, {
    q: '', modality_ids: [], segment_ids: [], teacher_ids: [],
    start_range_string: null, start_from: null, start_to: null,
    end_range_string: null, end_from: null, end_to: null,
  })
}

const activeCourses = computed(() => COURSES.value.filter((c) => c.status === 'Activo'))
const totalActive = computed(() => activeCourses.value.length)

const totalStudents = computed(() => {
  const list = activeCourses.value.filter((c) => Number.isFinite(c.students))
  return list.length ? list.reduce((a, c) => a + c.students, 0) : null
})
const totalAtRisk = computed(() => {
  const list = activeCourses.value.filter((c) => Number.isFinite(c.atRisk))
  return list.length ? list.reduce((a, c) => a + c.atRisk, 0) : null
})
const avgAttendance = computed(() => {
  const list = activeCourses.value.filter((c) => Number.isFinite(c.attendance))
  if (!list.length) return null
  return Math.round(list.reduce((a, c) => a + c.attendance, 0) / list.length)
})

const filterStates = ['Todos', 'Activo', 'Proximo', 'Finalizado']
const countByStatus = (s) =>
  s === 'Todos' ? COURSES.value.length : COURSES.value.filter((c) => c.status === s).length

const statusPillClass = (s) =>
  s === 'Activo' ? 'ok' : s === 'Finalizado' ? 'neutral' : 'info'
</script>

<template>
  <div class="aulas-shell">
    <header class="page-head">
      <div class="titles">
        <div class="eyebrow">Academica</div>
        <h1>Aulas</h1>
        <div class="subtitle">
          Gestion de cursos, asistencias y notas - {{ COURSES.length }} aulas en el periodo 2026-I
        </div>
      </div>
      <div class="actions">
        <button class="btn">
          <i class="fa-solid fa-download"></i> Exportar
        </button>
        <button class="btn" :disabled="isLoading" @click="loadCourses">
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': isLoading }"></i> Sincronizar
        </button>
        <button class="btn primary">
          <i class="fa-solid fa-plus"></i> Nueva aula
        </button>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi" style="--bar: #10B981">
        <div class="k-label">
          <span>Aulas activas</span>
          <i class="fa-solid fa-graduation-cap k-icon"></i>
        </div>
        <div class="k-value">{{ totalActive }}</div>
        <div class="k-foot">
          <span>de {{ COURSES.length }} totales</span>
        </div>
      </div>
      <div class="kpi" style="--bar: #2563EB">
        <div class="k-label">
          <span>Alumnos en curso</span>
          <i class="fa-solid fa-users k-icon"></i>
        </div>
        <div class="k-value">{{ totalStudents ?? '--' }}</div>
        <div class="k-foot">
          <span>matriculados</span>
        </div>
      </div>
      <div class="kpi" style="--bar: #F59E0B">
        <div class="k-label">
          <span>Asistencia promedio</span>
          <i class="fa-solid fa-arrow-trend-up k-icon"></i>
        </div>
        <div class="k-value">{{ avgAttendance == null ? '--' : avgAttendance + '%' }}</div>
        <div class="k-foot">
          <span>en aulas activas</span>
        </div>
      </div>
      <div class="kpi" style="--bar: #EF4444">
        <div class="k-label">
          <span>Alumnos en riesgo</span>
          <i class="fa-solid fa-triangle-exclamation k-icon"></i>
        </div>
        <div class="k-value">{{ totalAtRisk ?? '--' }}</div>
        <div class="k-foot">
          <span>requieren seguimiento</span>
        </div>
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
        <input v-model="advFilters.q" placeholder="Buscar por nombre, codigo o docente..." />
      </div>
      <button class="chip" :class="{ active: activeFilterChips.length > 0 }" @click="showFilterModal = true">
        <i class="fa-solid fa-filter"></i> Mas filtros
        <span v-if="activeFilterChips.length" class="chip-count">{{ activeFilterChips.length }}</span>
      </button>
      <div class="spacer"></div>
      <span class="muted">{{ filtered.length }} resultados</span>
      <div class="toggle-group">
        <button :class="{ active: layout === 'grid' }" @click="layout = 'grid'">
          <i class="fa-solid fa-table-cells"></i> Tarjetas
        </button>
        <button :class="{ active: layout === 'list' }" @click="layout = 'list'">
          <i class="fa-solid fa-list"></i> Tabla
        </button>
      </div>
    </div>

    <div v-if="activeFilterChips.length" class="filter-strip">
      <span class="filter-strip-badge">
        <i class="fa-solid fa-circle-half-stroke"></i>
        Filtros activos
        <span class="filter-strip-count">{{ activeFilterChips.length }}</span>
      </span>
      <BaseFilterChips :items="activeFilterChips" @remove="clearAdvFilter" @clear-all="clearAdvFilters" />
    </div>

    <AulasFilterModal
      :visible="showFilterModal"
      @update:visible="v => showFilterModal = v"
      :filters="advFilters"
      :filtro-modalidad="filtroModalidad"
      :filtro-segmento="filtroSegmento"
      :filtro-docente="filtroDocente"
      @apply="showFilterModal = false"
      @clear="clearAdvFilters"
      @date-change="handleDateChange"
    />

    <div v-if="layout === 'grid'" class="course-grid">
      <article
        v-for="c in filtered"
        :key="c.id"
        class="course-card"
        :style="{ '--cbar': c.color }"
        @click="openAula(c.id)"
      >
        <div class="c-bar"></div>
        <div class="c-head">
          <div>
            <span class="c-code">{{ c.code }}</span>
            <span class="c-edition">{{ c.edition }}</span>
          </div>
          <div class="row">
            <span v-if="c.atRisk > 0" class="alert-flag">
              <i class="fa-solid fa-triangle-exclamation"></i> {{ c.atRisk }}
            </span>
            <span class="status-pill" :class="statusPillClass(c.status)">
              <span class="dot"></span>{{ c.status }}
            </span>
          </div>
        </div>
        <h3>{{ c.name }}</h3>
        <div class="c-teacher">
          <div class="av" :style="{ background: c.color }">{{ c.teacherInitials }}</div>
          <div>
            <div class="tn">{{ c.teacher }}</div>
            <div class="tr">Docente</div>
          </div>
        </div>
        <div class="c-meta">
          <div class="m">
            <i class="fa-solid fa-graduation-cap"></i>
            <strong>{{ c.sessions || '--' }}</strong> {{ c.sessions === 1 ? 'sesion' : 'sesiones' }}
          </div>
          <div class="m">
            <i class="fa-solid fa-users"></i> <strong>{{ c.students ?? '--' }}</strong> alumnos
          </div>
          <div class="m">
            <i class="fa-regular fa-calendar"></i> {{ c.startDate }} -> {{ c.endDate }}
          </div>
          <div class="m">
            <i class="fa-regular fa-clock"></i> {{ c.schedule }}
          </div>
        </div>
        <div class="c-stats">
          <div class="s">
            <b>{{ c.attendance || '-' }}{{ c.attendance ? '%' : '' }}</b>Asistencia
          </div>
          <div class="s">
            <b>{{ c.average || '-' }}</b>Prom. nota
          </div>
          <div class="spacer"></div>
          <button class="btn sm" @click.stop="openAula(c.id)">
            Ver aula <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </article>
    </div>

    <table v-else class="course-table">
      <thead>
        <tr>
          <th>Codigo</th>
          <th>Curso</th>
          <th>Docente</th>
          <th>Modalidad</th>
          <th class="center">Alumnos</th>
          <th class="center">Asist.</th>
          <th class="center">Prom.</th>
          <th>Riesgo</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in filtered" :key="c.id" @click="openAula(c.id)">
          <td class="mono">{{ c.code }}</td>
          <td class="ct-name">
            {{ c.name }}<div class="sub">{{ c.edition }}</div>
          </td>
          <td>
            <div class="row">
              <div class="t-av" :style="{ background: c.color }">{{ c.teacherInitials }}</div>
              {{ c.teacher }}
            </div>
          </td>
          <td>{{ c.modality }}</td>
          <td class="center mono">{{ c.students ?? '--' }}</td>
          <td class="center mono">{{ c.attendance ? c.attendance + '%' : '-' }}</td>
          <td class="center mono bold">{{ c.average || '-' }}</td>
          <td>
            <span v-if="c.atRisk > 0" class="alert-flag">
              <i class="fa-solid fa-triangle-exclamation"></i> {{ c.atRisk }}
            </span>
            <span v-else class="muted small">-</span>
          </td>
          <td>
            <span class="status-pill" :class="statusPillClass(c.status)">
              <span class="dot"></span>{{ c.status }}
            </span>
          </td>
          <td class="right">
            <button class="row-action">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
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

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  font-size: 14px;
  max-width: 1600px;
  margin: 0 auto;
}

.row { display: flex; align-items: center; gap: 8px; }
.spacer { flex: 1; }
.muted { color: var(--ink-3); font-size: 12px; }
.small { font-size: 11.5px; }
.bold { font-weight: 600; }
.center { text-align: center; }
.right { text-align: right; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* page-head */
.page-head {
  display: flex; align-items: flex-start; gap: 16px;
  margin-bottom: 18px;
}
.page-head .titles { flex: 1; min-width: 0; }
.page-head .eyebrow {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.page-head h1 {
  margin: 4px 0 2px; font-size: 26px; font-weight: 600;
  letter-spacing: -0.02em;
}
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
.btn.primary {
  background: var(--ink); color: white; border-color: var(--ink);
}
.btn.primary:hover { background: #2A2A22; }
.btn.sm { padding: 5px 9px; font-size: 12.5px; }

/* KPIs */
.kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 14px; margin-bottom: 18px;
}
.kpi {
  background: white; border-radius: var(--radius);
  padding: 14px 16px; border: 1px solid var(--line);
  position: relative; overflow: hidden;
}
.kpi::before {
  content: ''; position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 3px; border-radius: 2px;
  background: var(--bar, var(--ink-4));
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
.kpi .k-delta { font-weight: 500; }
.kpi .k-delta.up { color: var(--green-ink); }
.kpi .k-delta.down { color: var(--red-ink); }

/* filter bar */
.filter-bar {
  background: white; border-radius: var(--radius);
  border: 1px solid var(--line);
  padding: 12px 14px;
  margin-bottom: 14px;
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
.chip .dot {
  width: 6px; height: 6px; border-radius: 999px; background: currentColor;
}
.chip .chip-count { color: var(--ink-4); font-size: 11px; }
.chip.active .chip-count { color: var(--green-ink); opacity: 0.7; }
.divider { width: 1px; height: 22px; background: var(--line); margin: 0 4px; }
.input {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; background: white; font-size: 13px;
  min-width: 240px; color: var(--ink-3);
}
.input input {
  border: none; outline: none; font-size: 13px;
  flex: 1; background: transparent; color: var(--ink);
}
.input input::placeholder { color: var(--ink-4); }

.toggle-group {
  display: inline-flex; padding: 3px;
  background: var(--bg-soft); border: 1px solid var(--line);
  border-radius: 8px;
}
.toggle-group button {
  border: none; background: transparent;
  padding: 5px 10px; border-radius: 6px;
  font-size: 12.5px; color: var(--ink-3); cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.toggle-group button.active {
  background: white; color: var(--ink);
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  font-weight: 500;
}

/* Strip de filtros activos: mismo patron visual que el de FICO enrollment. */
.filter-strip {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 14px; margin: -8px 0 14px;
  border: 1px solid rgba(16, 185, 129, 0.32); border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.filter-strip-badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11.5px; font-weight: 600; color: var(--green-ink);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.filter-strip-badge i { font-size: 11px; }
.filter-strip-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--green); color: #fff; border-radius: 9px;
  font-size: 10.5px; font-weight: 700;
}
.filter-strip :deep(.active-filters) { margin-bottom: 0; flex: 1 1 auto; }
.filter-strip :deep(.active-filters .label) { display: none; }

/* status pills */
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.status-pill .dot {
  width: 5px; height: 5px; border-radius: 999px; background: currentColor;
}
.status-pill.ok { background: var(--green-soft); color: var(--green-ink); }
.status-pill.warn { background: var(--amber-soft); color: var(--amber-ink); }
.status-pill.danger { background: var(--red-soft); color: var(--red-ink); }
.status-pill.info { background: var(--blue-soft); color: var(--blue-ink); }
.status-pill.neutral { background: var(--bg-soft); color: var(--ink-3); }

.alert-flag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 999px;
  background: var(--red-soft); color: var(--red-ink);
}

/* course grid */
.course-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.course-card {
  background: white; border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  padding: 16px; cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
  position: relative; overflow: hidden;
}
.course-card:hover {
  border-color: #D4D4CC;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.course-card .c-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--cbar, var(--green));
}
.course-card .c-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px; margin-bottom: 12px;
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
  display: flex; align-items: center; gap: 8px;
  margin: 12px 0;
  padding: 10px; background: var(--bg-soft); border-radius: 8px;
}
.course-card .c-teacher .av {
  width: 28px; height: 28px; border-radius: 999px;
  display: grid; place-items: center;
  color: white; font-weight: 600; font-size: 11px;
}
.course-card .c-teacher .tn { font-size: 12.5px; font-weight: 500; line-height: 1.2; }
.course-card .c-teacher .tr { font-size: 11px; color: var(--ink-3); }
.course-card .c-meta {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px;
  font-size: 12px;
}
.course-card .c-meta .m {
  display: flex; align-items: center; gap: 6px; color: var(--ink-3);
}
.course-card .c-meta .m i { font-size: 11px; }
.course-card .c-meta .m strong { color: var(--ink); font-weight: 500; }
.course-card .c-stats {
  display: flex; align-items: center; gap: 14px;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px solid var(--line-soft);
}
.course-card .c-stats .s { font-size: 11px; color: var(--ink-3); }
.course-card .c-stats .s b {
  color: var(--ink); font-size: 14px; font-weight: 600; display: block;
}

/* table */
.course-table {
  width: 100%; background: white;
  border: 1px solid var(--line); border-radius: var(--radius);
  border-collapse: collapse; overflow: hidden;
  font-size: 13px;
}
.course-table th, .course-table td {
  text-align: left; padding: 10px 14px;
  border-bottom: 1px solid var(--line-soft);
}
.course-table th {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
  background: var(--bg-soft);
}
.course-table tr { cursor: pointer; }
.course-table tbody tr:hover { background: #FAFAF6; }
.course-table tr:last-child td { border-bottom: none; }
.course-table .ct-name { font-weight: 500; }
.course-table .ct-name .sub {
  font-size: 11px; color: var(--ink-3); font-weight: 400;
}
.t-av {
  width: 22px; height: 22px; border-radius: 999px; color: white;
  display: grid; place-items: center; font-size: 9.5px; font-weight: 700;
}
.row-action {
  width: 24px; height: 24px; border-radius: 6px;
  background: transparent; border: none;
  display: grid; place-items: center; color: var(--ink-3);
  cursor: pointer;
}
.row-action:hover { background: var(--bg-soft); color: var(--ink); }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

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
}
[data-coreui-theme="dark"] .aulas-shell .btn {
  background: #1F1F1A;
  border-color: #2A2A22;
  color: #D4D4CC;
}
[data-coreui-theme="dark"] .aulas-shell .btn:hover {
  background: #2A2A22;
  border-color: #3A3A33;
}
[data-coreui-theme="dark"] .aulas-shell .btn.primary {
  background: #F4F4F0;
  border-color: #F4F4F0;
  color: #14140F;
}
[data-coreui-theme="dark"] .aulas-shell .btn.primary:hover { background: #E4E4DD; }
[data-coreui-theme="dark"] .aulas-shell .kpi { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .filter-strip {
  border-color: rgba(52, 211, 153, 0.32);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0.04));
}
[data-coreui-theme="dark"] .aulas-shell .chip { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .chip:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .chip.active {
  background: rgba(16,185,129,0.16);
  color: #34D399;
  border-color: rgba(16,185,129,0.3);
}
[data-coreui-theme="dark"] .aulas-shell .input { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aulas-shell .input input { color: #F4F4F0; }
[data-coreui-theme="dark"] .aulas-shell .toggle-group { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .aulas-shell .toggle-group button.active {
  background: #2A2A22; color: #F4F4F0;
}
[data-coreui-theme="dark"] .aulas-shell .course-card { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .course-card:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .aulas-shell .course-card .c-code { background: #1F1F1A; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .aulas-shell .course-card .c-teacher { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .course-table { background: #1A1A14; }
[data-coreui-theme="dark"] .aulas-shell .course-table th { background: #1F1F1A; }
[data-coreui-theme="dark"] .aulas-shell .course-table tbody tr:hover { background: #1F1F1A; }
</style>
