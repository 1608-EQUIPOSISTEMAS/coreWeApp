<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import AulasFilterModal from './AulasFilterModal.vue'
import StudentSearchPanel from './StudentSearchPanel.vue'
import { aulaStatus } from '@/entities/aula/aulaStatus'
import { formatValue } from '@/shared/lib/formatValue'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const router = useRouter()

function openAula(id) {
  if (!id) return
  router.push({ name: 'AcademicaAulaDetail', params: { id } })
}

// Color de identidad del segmento (barra de la tarjeta y avatar). Tokens y no
// hex para que cambie solo con el modo oscuro. A5 no figura: se descarta al cargar.
// Mismos tonos que el cronograma (styles/cronograma-fila.css): A3 turquesa, A4 naranja.
const SEGMENT_COLORS = {
  A1: 'var(--ds-accent)',
  A2: 'var(--ds-warn)',
  A3: 'var(--ds-cyan-ink)',
  A4: 'var(--ds-orange-ink)',
  A6: 'var(--ds-violet-ink)',
}
const FALLBACK_COLOR = 'var(--ds-accent-2)'

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


function buildSchedule(row) {
  const parts = [row.day_combination_label, row.hour_combination_label].filter(Boolean)
  return parts.length ? parts.join(' ') : '--'
}

function mapRow(row) {
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
    status: aulaStatus(row.start_date, row.end_date),
    color: SEGMENT_COLORS[row.cat_segment] || FALLBACK_COLOR,
    // Conteo real (FICO aprobadas sin hijos) ya viene unido en la consulta.
    students: row.students == null ? null : Number(row.students),
  }
}

const COURSES = ref([])
const isLoading = ref(false)

async function loadCourses() {
  isLoading.value = true
  try {
    // Una sola llamada ligera (misma que el Reporte Academico): trae cursos +
    // horario + conteo de alumnos juntos. Reemplaza al par editionList (SP de
    // 15s/3MB) + classroomMetricsList. El equivalente del viejo active='Y'
    // se aplica aca (los A5 ya cubren active='N' salvo segmento explicito).
    const rows = await editionService.academicReport()
    // Excluimos cat_segment === 'A5' porque representa cursos cancelados:
    // la vista academica no los considera (ni en conteos, ni en tarjetas, ni
    // en KPIs). El filtro ocurre aca y no en `filtered` para que el numero
    // "X aulas en el periodo" tampoco los cuente.
    COURSES.value = (Array.isArray(rows) ? rows : [])
      .filter((row) => row.active === 'Y')
      .filter((row) => String(row?.cat_segment || '').toUpperCase() !== 'A5')
      .map(mapRow)
  } catch (err) {
    console.error('Error cargando aulas:', err)
    toast.error('Error al cargar aulas')
    COURSES.value = []
  } finally {
    isLoading.value = false
  }
}

// Estado de certificacion de las aulas terminadas (consulta a Odoo, aparte
// para no demorar la lista). Pedido de Academica: que avise lo pendiente.
const certStatus = ref(new Map())
// Hasta que Odoo responde, el KPI "Por certificar" dice "—" y no un 0 falso.
const certChecked = ref(false)
const certFailed = ref(false)
async function loadCertStatus() {
  try {
    const rows = await editionService.classroomsCertificationStatus()
    certStatus.value = new Map(rows.filter((r) => r.status).map((r) => [Number(r.edition_num_id), r.status]))
    certChecked.value = true
  } catch (err) {
    certFailed.value = true
    toast.warning(err?.response?.data?.message || 'No se pudo consultar en Odoo qué aulas faltan certificar')
  }
}
const certOf = (c) => certStatus.value.get(Number(c.id)) || null
const onlyPendingCert = ref(false)
const pendingCertCount = computed(() => COURSES.value.filter((c) => certOf(c)?.pending).length)
function togglePendingCert() {
  onlyPendingCert.value = !onlyPendingCert.value
  if (onlyPendingCert.value) filter.value = 'Todos' // las pendientes ya terminaron: que el chip de estado no las esconda
}

onMounted(() => {
  loadCourses()
  loadCertStatus()
})

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

const selectedSet = (arr) => new Set((arr || []).map((i) => i.value ?? i.id ?? i))
const inRange = (d, from, to) => !!d && (!from || d >= from) && (!to || d <= to)

const filtered = computed(() => {
  const mods = selectedSet(advFilters.modality_ids)
  const segs = selectedSet(advFilters.segment_ids)
  const teach = selectedSet(advFilters.teacher_ids)
  return COURSES.value.filter((c) => {
    if (filter.value !== 'Todos' && c.status !== filter.value) return false
    if (onlyPendingCert.value && !certOf(c)?.pending) return false
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
const avgStudentsPerActive = computed(() => {
  const list = activeCourses.value.filter((c) => Number.isFinite(c.students))
  return list.length ? Math.round(totalStudents.value / list.length) : null
})

const filterStates = ['Todos', 'Activo', 'Proximo', 'Finalizado']
const countByStatus = (s) =>
  s === 'Todos' ? COURSES.value.length : COURSES.value.filter((c) => c.status === s).length

// Estado del aula → texto y tono de .ds-pill. El valor interno 'Proximo' viene
// de aulaStatus y se usa en los filtros: solo cambia lo que se lee.
const STATUS_UI = {
  Todos: { label: 'Todas', tone: '' },
  Activo: { label: 'Activo', tone: 'ok' },
  Proximo: { label: 'Próximo', tone: 'info' },
  Finalizado: { label: 'Finalizado', tone: '' },
}
const statusLabel = (s) => STATUS_UI[s]?.label ?? s
const statusTone = (s) => STATUS_UI[s]?.tone ?? ''

const totalProximo = computed(() => countByStatus('Proximo'))

const kpis = computed(() => [
  {
    key: 'activas',
    icon: 'fa-graduation-cap',
    tone: 'ok',
    value: formatValue(totalActive.value, 'num'),
    label: 'Aulas activas',
    note: `de ${formatValue(COURSES.value.length, 'num')} aulas en total`,
  },
  {
    key: 'alumnos',
    icon: 'fa-users',
    tone: '',
    value: formatValue(totalStudents.value, 'num'),
    label: 'Alumnos en aulas activas',
    note: avgStudentsPerActive.value == null ? 'Sin conteo de matriculados' : `${formatValue(avgStudentsPerActive.value, 'num')} por aula en promedio`,
  },
  {
    key: 'proximas',
    icon: 'fa-calendar-plus',
    tone: '',
    value: formatValue(totalProximo.value, 'num'),
    label: 'Próximas a iniciar',
    note: 'Aún no empiezan su dictado',
  },
  {
    key: 'certificar',
    icon: 'fa-certificate',
    tone: pendingCertCount.value ? 'warn' : 'ok',
    value: formatValue(certChecked.value ? pendingCertCount.value : null, 'num'),
    label: 'Por certificar',
    note: certChecked.value ? 'Terminadas sin certificado en Odoo' : certFailed.value ? 'Odoo no respondió' : 'Consultando Odoo…',
  },
])

const subtitle = computed(() => {
  if (isLoading.value) return 'Cargando aulas…'
  const total = COURSES.value.length
  return `${formatValue(filtered.value.length, 'num')} de ${formatValue(total, 'num')} aulas · cursos, asistencias y notas`
})
</script>

<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Aulas</h1>
        <p class="ds-sub">{{ subtitle }}</p>
      </div>
    </header>

    <StudentSearchPanel />

    <div class="ds-kpis">
      <div v-for="k in kpis" :key="k.key" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="isLoading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ k.value }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.note }}</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="ds-panel-body aulas-toolbar">
        <div class="ds-tabs" role="group" aria-label="Estado del aula">
          <button
            v-for="s in filterStates"
            :key="s"
            type="button"
            :aria-pressed="String(filter === s)"
            @click="filter = s"
          >
            {{ statusLabel(s) }} <span class="tab-count">{{ countByStatus(s) }}</span>
          </button>
          <button
            v-if="pendingCertCount"
            type="button"
            :aria-pressed="String(onlyPendingCert)"
            title="Aulas terminadas con aprobados al día que aún no tienen certificado en Odoo"
            @click="togglePendingCert"
          >
            <i class="fa-solid fa-certificate" aria-hidden="true"></i> Por certificar
            <span class="tab-count">{{ pendingCertCount }}</span>
          </button>
        </div>
        <input
          v-model="advFilters.q"
          class="ds-input aulas-search"
          type="search"
          aria-label="Buscar aula"
          placeholder="Buscar por nombre, código o docente"
        />
        <button class="btn-exec btn-exec-outline" type="button" @click="showFilterModal = true">
          <i class="fa-solid fa-filter" aria-hidden="true"></i> Más filtros
          <span v-if="activeFilterChips.length" class="ds-chip">{{ activeFilterChips.length }}</span>
        </button>
        <span class="aulas-count">{{ formatValue(filtered.length, 'num') }} resultados</span>
        <div class="ds-tabs" role="group" aria-label="Vista">
          <button type="button" :aria-pressed="String(layout === 'grid')" @click="layout = 'grid'">
            <i class="fa-solid fa-table-cells" aria-hidden="true"></i> Tarjetas
          </button>
          <button type="button" :aria-pressed="String(layout === 'list')" @click="layout = 'list'">
            <i class="fa-solid fa-list" aria-hidden="true"></i> Tabla
          </button>
        </div>
      </div>
    </section>

    <BaseFilterChips
      v-if="activeFilterChips.length"
      :items="activeFilterChips"
      @remove="clearAdvFilter"
      @clear-all="clearAdvFilters"
    />

    <AulasFilterModal
      :visible="showFilterModal"
      @update:visible="v => showFilterModal = v"
      :filters="advFilters"
      :filtro-modalidad="filtroModalidad"
      :filtro-segmento="filtroSegmento"
      :filtro-docente="filtroDocente"
      @apply="(f) => Object.assign(advFilters, f)"
      @clear="clearAdvFilters(); showFilterModal = false"
    />

    <p v-if="!isLoading && !filtered.length" class="ds-panel ds-empty ds-empty--lista">
      No hay aulas con estos filtros. Cambia el estado o quita un filtro para ver más.
    </p>

    <div v-else-if="layout === 'grid'" class="aula-grid">
      <template v-if="isLoading">
        <article v-for="n in 8" :key="'sk' + n" class="aula-card aula-card--skel" aria-hidden="true">
          <span class="ds-skel" style="width: 40%; height: 18px"></span>
          <span class="ds-skel" style="width: 70%; height: 20px"></span>
          <span class="ds-skel" style="height: 48px"></span>
          <span class="ds-skel" style="width: 85%"></span>
          <span class="ds-skel" style="width: 60%"></span>
        </article>
      </template>
      <template v-else>
        <article
          v-for="c in filtered"
          :key="c.id"
          class="aula-card"
          :style="{ '--aula-color': c.color }"
          tabindex="0"
          :aria-label="`Abrir aula ${c.name} ${c.edition}`"
          @click="openAula(c.id)"
          @keydown.enter="openAula(c.id)"
        >
          <div class="aula-card-head">
            <div>
              <span class="aula-code">{{ c.code }}</span>
              <span class="aula-edition">{{ c.edition }}</span>
            </div>
            <div class="aula-pills">
              <span class="ds-pill" :class="statusTone(c.status)">{{ statusLabel(c.status) }}</span>
              <span v-if="certOf(c)" class="ds-pill" :class="certOf(c).tone">{{ certOf(c).label }}</span>
            </div>
          </div>
          <h3 class="aula-name">{{ c.name }}</h3>
          <div class="aula-teacher">
            <span class="aula-avatar" aria-hidden="true">{{ c.teacherInitials }}</span>
            <div>
              <div class="aula-teacher-name">{{ c.teacher }}</div>
              <div class="aula-teacher-role">Docente</div>
            </div>
          </div>
          <div class="aula-meta">
            <span>
              <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
              <strong>{{ c.sessions || '—' }}</strong> {{ c.sessions === 1 ? 'sesión' : 'sesiones' }}
            </span>
            <span>
              <i class="fa-solid fa-users" aria-hidden="true"></i>
              <strong>{{ formatValue(c.students, 'num') }}</strong> alumnos
            </span>
            <span>
              <i class="fa-regular fa-calendar" aria-hidden="true"></i> {{ c.startDate }} → {{ c.endDate }}
            </span>
            <span>
              <i class="fa-regular fa-clock" aria-hidden="true"></i> {{ c.schedule }}
            </span>
          </div>
          <div class="aula-foot">
            <div class="aula-stat">
              <b>{{ formatValue(c.sessions, 'num') }}</b>Sesiones
            </div>
            <button class="btn-exec btn-exec-outline btn-sm aula-open" type="button" @click.stop="openAula(c.id)">
              Ver aula <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </article>
      </template>
    </div>

    <section v-else class="ds-panel">
      <div class="ds-panel-body">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista">
            <thead>
              <tr>
                <th>Código</th>
                <th>Curso</th>
                <th>Docente</th>
                <th>Modalidad</th>
                <th class="num">Alumnos</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'skr' + n">
                  <td colspan="7"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <template v-else>
                <tr
                  v-for="c in filtered"
                  :key="c.id"
                  class="link"
                  tabindex="0"
                  @click="openAula(c.id)"
                  @keydown.enter="openAula(c.id)"
                >
                  <td class="mono">{{ c.code }}</td>
                  <td>
                    <span class="aula-row-name">{{ c.name }}</span>
                    <span class="aula-row-sub">{{ c.edition }}</span>
                  </td>
                  <td>
                    <span class="aula-row-teacher">
                      <span class="aula-avatar aula-avatar--sm" :style="{ '--aula-color': c.color }" aria-hidden="true">{{ c.teacherInitials }}</span>
                      {{ c.teacher }}
                    </span>
                  </td>
                  <td>{{ c.modality }}</td>
                  <td class="num">{{ formatValue(c.students, 'num') }}</td>
                  <td>
                    <span class="aula-pills">
                      <span class="ds-pill" :class="statusTone(c.status)">{{ statusLabel(c.status) }}</span>
                      <span v-if="certOf(c)" class="ds-pill" :class="certOf(c).tone">{{ certOf(c).label }}</span>
                    </span>
                  </td>
                  <td class="num">
                    <button
                      class="btn-icon btn-icon-sm"
                      type="button"
                      title="Abrir aula"
                      aria-label="Abrir aula"
                      @click.stop="openAula(c.id)"
                    >
                      <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Barra de filtros: estado, búsqueda, más filtros y vista en una sola línea */
.aulas-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.aulas-search { flex: 1 1 240px; max-width: 360px; }
.aulas-count { margin-left: auto; font-size: 12px; color: var(--ds-muted); white-space: nowrap; }
.tab-count { margin-left: 4px; font-size: 11px; opacity: 0.7; font-variant-numeric: tabular-nums; }

/* Grilla de tarjetas de aula: propia de esta vista */
.aula-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--ds-gap); }
.aula-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 18px 16px 16px;
  overflow: hidden;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius);
  cursor: pointer;
  transition: border-color 0.12s;
}
/* Barra superior con el color del segmento */
.aula-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--aula-color, var(--ds-accent));
}
.aula-card:hover { border-color: var(--ds-border-strong); }
.aula-card:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.aula-card--skel { cursor: default; pointer-events: none; }
.aula-card--skel::before { background: var(--ds-surface-3); }

.aula-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.aula-pills { display: inline-flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.aula-code {
  padding: 2px 7px;
  font-family: var(--ds-font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ds-ink-2);
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
}
.aula-edition { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--ds-muted); }
.aula-name { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.25; color: var(--ds-heading); }

.aula-teacher { display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--ds-surface-2); border-radius: var(--ds-radius-sm); }
.aula-teacher-name { font-size: 12.5px; font-weight: 600; line-height: 1.2; color: var(--ds-ink); }
.aula-teacher-role { font-size: 11px; color: var(--ds-muted); }
/* Iniciales en --ds-surface: blancas sobre el color en claro y oscuras en modo
   oscuro, donde los tonos del segmento se aclaran y el blanco perdería contraste. */
.aula-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: var(--ds-surface);
  background: var(--aula-color, var(--ds-accent));
}
.aula-avatar--sm { width: 22px; height: 22px; font-size: 9.5px; }

.aula-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; font-size: 12px; color: var(--ds-ink-2); }
.aula-meta span { display: flex; align-items: center; gap: 6px; min-width: 0; }
.aula-meta i { font-size: 11px; color: var(--ds-muted); }
.aula-meta strong { font-weight: 600; color: var(--ds-ink); }

.aula-foot { display: flex; align-items: center; gap: 14px; padding-top: 12px; border-top: 1px solid var(--ds-border); }
.aula-stat { font-size: 11px; color: var(--ds-muted); }
.aula-stat b { display: block; font-size: 14px; font-weight: 700; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.aula-open { margin-left: auto; }

.mono { font-family: var(--ds-font-mono); }
.aula-row-name { display: block; font-weight: 600; color: var(--ds-ink); }
.aula-row-sub { display: block; font-size: 11px; color: var(--ds-muted); }
.aula-row-teacher { display: inline-flex; align-items: center; gap: 8px; }

@media (max-width: 900px) {
  .aulas-search { max-width: none; }
  .aulas-count { margin-left: 0; }
  .aula-grid { grid-template-columns: 1fr; }
}
</style>
