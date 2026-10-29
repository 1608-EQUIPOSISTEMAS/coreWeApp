<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Seguimiento al Alumno</h1>
        <p class="ds-sub">Inscritos, retirados, culminados y notas por aula. Aprueba y se certifica con nota final de 12 o más (redondeada).</p>
      </div>
    </header>

    <div class="ds-kpis">
      <div v-for="k in cards" :key="k.key" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="loading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ formatValue(visibleKpis[k.key], 'num') }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.note }}</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="ds-panel-body sa-toolbar">
        <div class="ds-tabs" role="group" aria-label="Estado del aula">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            :aria-pressed="String(stageFilter === t.key)"
            @click="stageFilter = t.key"
          >
            {{ t.label }} <span class="sa-tab-count">{{ stageCounts[t.key] ?? 0 }}</span>
          </button>
        </div>
        <input
          v-model="search"
          type="search"
          class="ds-input sa-search"
          placeholder="Buscar por curso, código, edición o docente"
          aria-label="Buscar aula"
        />
        <span class="sa-results">{{ formatValue(visible.length, 'num') }} resultados</span>
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

    <p v-if="!loading && !visible.length" class="ds-panel ds-empty ds-empty--lista">
      No hay aulas con estos filtros. Cambia el estado o quita la búsqueda.
    </p>

    <div v-else-if="layout === 'grid'" class="sa-grid">
      <template v-if="loading">
        <div v-for="n in 8" :key="`sk-${n}`" class="sa-card-skel" aria-hidden="true">
          <span class="ds-skel" style="width: 40%; height: 18px"></span>
          <span class="ds-skel" style="width: 70%; height: 20px"></span>
          <span class="ds-skel" style="height: 48px"></span>
          <span class="ds-skel" style="width: 85%"></span>
        </div>
      </template>
      <template v-else>
        <AulaCard v-for="a in visible" :key="a.edition_id" :aula="a.card" @open="openClassroom(a)">
          <template #foot>
            <div class="aula-stat"><b>{{ a.initial }}</b>Inscritos</div>
            <div class="aula-stat"><b class="sa-bad">{{ a.retired }}</b>Retirados</div>
            <div class="aula-stat"><b class="sa-ok">{{ a.approved }}</b>Aprobados</div>
            <div class="aula-stat"><b class="sa-bad">{{ a.failed }}</b>Desaprobados</div>
            <div class="aula-stat"><b>{{ a.no_grade }}</b>Sin nota</div>
            <button class="btn-exec btn-exec-outline btn-sm aula-open" type="button" @click.stop="openClassroom(a)">
              Ver alumnos <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
          </template>
        </AulaCard>
      </template>
    </div>

    <section v-else class="ds-panel">
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa">
          <thead>
            <tr>
              <th>Curso / edición</th>
              <th style="width:170px">Docente</th>
              <th style="width:220px">Correo del docente</th>
              <th class="num" style="width:76px">Sesiones</th>
              <th style="width:150px">Día</th>
              <th style="width:96px">F. inicio</th>
              <th style="width:96px">F. fin</th>
              <th class="num sa-group" style="width:80px" title="Al inicio: los que siguen + los retirados">Inscritos</th>
              <th class="num" style="width:80px" title="Se retiraron, se reprogramaron o cambiaron de curso">Retirados</th>
              <th class="num" style="width:80px" title="Siguen inscritos hoy">Alumnos</th>
              <th class="num" style="width:80px" title="De los alumnos, cuántos están en modalidad Flex">Flex</th>
              <th class="num" style="width:90px" title="Aula finalizada: terminaron con nota final">Culminaron</th>
              <th class="num" style="width:84px">Aprobados</th>
              <th class="num" style="width:100px">Desaprobados</th>
              <th class="num" style="width:72px">Sin nota</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`skr-${n}`">
                <td colspan="15"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <tr
              v-for="a in visible"
              v-else
              :key="a.edition_id"
              class="link"
              tabindex="0"
              @click="openClassroom(a)"
              @keydown.enter="openClassroom(a)"
            >
              <td>
                <div class="sa-main">{{ a.course }}</div>
                <div class="sa-sub">{{ a.card.code }} · {{ a.edition || 'sin edición' }} · {{ AULA_STATUS_UI[a.card.status].label }}</div>
              </td>
              <td>{{ a.card.teacher }}</td>
              <td class="sa-email">{{ a.instructor_email || 'sin correo' }}</td>
              <td class="num">{{ a.sessions ?? '—' }}</td>
              <td>{{ a.card.schedule }}</td>
              <td class="mono">{{ a.card.startDate }}</td>
              <td class="mono">{{ a.card.endDate }}</td>
              <td class="num sa-group"><strong>{{ formatValue(a.initial, 'num') }}</strong></td>
              <td class="num"><span v-if="a.retired" class="ds-pill bad">{{ a.retired }}</span><span v-else class="sa-zero">0</span></td>
              <td class="num">{{ formatValue(a.students, 'num') }}</td>
              <td class="num"><strong v-if="a.flex?.students">{{ a.flex.students }}</strong><span v-else class="sa-zero">0</span></td>
              <td class="num"><span v-if="a.completed === null" class="sa-zero" title="El aula aún no termina">—</span><strong v-else>{{ formatValue(a.completed, 'num') }}</strong></td>
              <td class="num"><span v-if="a.approved" class="ds-pill ok">{{ a.approved }}</span><span v-else class="sa-zero">0</span></td>
              <td class="num"><span v-if="a.failed" class="ds-pill bad">{{ a.failed }}</span><span v-else class="sa-zero">0</span></td>
              <td class="num"><span v-if="a.no_grade" class="ds-pill">{{ a.no_grade }}</span><span v-else class="sa-zero">0</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <BaseModal v-model="modalOpen" :title="modalTitle" size="xl">
      <div v-if="current" class="sa-modal-sub">
        {{ current.card.teacher }} · {{ current.card.schedule }} · {{ current.card.startDate }} → {{ current.card.endDate }}
        · {{ current.initial }} inscritos · <span class="sa-bad">{{ current.retired }} retirados</span>
        <template v-if="current.completed !== null">· {{ current.completed }} culminaron</template>
        · <span class="sa-ok">{{ current.approved }} aprobados</span>
        · <span class="sa-bad">{{ current.failed }} desaprobados</span>
        · {{ current.no_grade }} sin nota
      </div>
      <div v-if="!students" class="ds-skel" style="height: 120px"></div>
      <div v-else class="ds-table-scroll">
        <table class="ds-table ds-table--densa">
          <thead>
            <tr>
              <th>Alumno / documento</th>
              <th style="width:260px">Correo</th>
              <th class="num" style="width:90px">Nota final</th>
              <th style="width:120px">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in students" :key="s.enrollment_id" :class="{ 'sa-row-out': s.status === 'retired' }">
              <td>
                <div class="sa-main">{{ s.full_name }} <span v-if="s.is_flex" class="ds-pill sa-flex">Flex</span></div>
                <div class="sa-sub">{{ s.document_number || 'sin DNI' }}</div>
              </td>
              <td class="sa-email">{{ s.email || 'sin correo' }}</td>
              <td class="num mono">{{ formatValue(s.final_grade, 'nota') }}</td>
              <td>
                <span v-if="s.status === 'retired'" class="ds-pill bad">{{ EXIT_REASON[s.reason] || 'Retirado' }}</span>
                <span v-else class="ds-pill" :class="GRADE[s.status].tone">{{ GRADE[s.status].label }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import { formatValue } from '@/shared/lib/formatValue.js'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { aulaStatus, AULA_STATUS_UI } from '@/entities/aula/aulaStatus'
import AulaCard from '@/entities/aula/AulaCard.vue'

const toast = useToast()
const seguimientoService = inject(ServiceKeys.AcademicaSeguimiento)
const fmt = useEnrollmentFormatters()

// status sale del backend (academica-seguimiento.entity.js gradeStatus).
const GRADE = {
  approved: { label: 'Aprobado', tone: 'ok' },
  failed: { label: 'Desaprobado', tone: 'bad' },
  no_grade: { label: 'Sin nota', tone: '' }
}
// Los que salieron del aula (status 'retired', listClassroomDepartures): van al
// final y en rojo; la etiqueta dice por que salieron.
const EXIT_REASON = {
  we_enrollment_status_retired: 'Retirado',
  we_enrollment_status_reprogrammed: 'Reprogramado',
  we_enrollment_status_course_changed: 'Cambio de curso'
}
// Mismas pestañas que Aulas; arranca en Activo, que es donde se hace el seguimiento.
const TABS = [
  { key: 'all', label: 'Todas' },
  ...Object.entries(AULA_STATUS_UI).map(([key, s]) => ({ key, label: s.label }))
]
const cards = [
  { key: 'initial', label: 'Inscritos', note: 'al inicio del aula', icon: 'fa-user-plus', tone: 'info' },
  { key: 'retired', label: 'Retirados', note: 'retiros, reprogramados y cambios de curso', icon: 'fa-user-xmark', tone: 'bad' },
  { key: 'completed', label: 'Culminaron', note: 'con nota, en aulas finalizadas', icon: 'fa-flag-checkered', tone: 'ok' },
  { key: 'students', label: 'Alumnos', note: 'siguen inscritos hoy', icon: 'fa-user-graduate', tone: 'info' },
  { key: 'approved', label: 'Aprobados', note: 'nota final de 12 o más', icon: 'fa-circle-check', tone: 'ok' },
  { key: 'failed', label: 'Desaprobados', note: 'no se certifican', icon: 'fa-circle-xmark', tone: 'bad' }
]

const classrooms = ref([])
const loading = ref(false)
const search = ref('')
const stageFilter = ref('Activo')
// El listado es la vista principal (pedido del usuario 26/10/26); las tarjetas
// quedan como alternativa en el mismo selector, igual que en Aulas.
const layout = ref('list')

// La tarjeta compartida pide la forma de Aulas (entities/aula/AulaCard.vue).
// Sin color de segmento: la barra va en el acento por defecto.
function toCard (a) {
  return {
    code: a.code || '--',
    edition: a.edition || '',
    name: a.course || 'Sin nombre',
    teacher: a.instructor || '--',
    sessions: Number(a.sessions) || 0,
    students: a.students,
    startDate: fmt.formatDate(a.start_date),
    endDate: fmt.formatDate(a.end_date),
    schedule: [a.days, a.hours].filter(Boolean).join(' ') || '--',
    status: aulaStatus(a.start_date, a.end_date)
  }
}

const stageCounts = computed(() => {
  const counts = { all: classrooms.value.length }
  for (const a of classrooms.value) counts[a.card.status] = (counts[a.card.status] || 0) + 1
  return counts
})

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return classrooms.value.filter(a =>
    (stageFilter.value === 'all' || a.card.status === stageFilter.value) &&
    (!q || [a.course, a.instructor, a.code, a.edition].some(v => String(v || '').toLowerCase().includes(q)))
  )
})

// Los KPIs siguen a los filtros: "cuántos aprobaron en las aulas que estoy viendo".
const visibleKpis = computed(() => {
  const k = { initial: 0, retired: 0, completed: 0, students: 0, approved: 0, failed: 0 }
  // completed es null en aulas que aun no terminan: suma 0.
  for (const a of visible.value) for (const key of Object.keys(k)) k[key] += a[key] ?? 0
  return k
})

// Alumnos del aula en un modal. Se piden al abrirla y quedan en memoria:
// volver a abrir la misma aula no repite la consulta.
const modalOpen = ref(false)
const current = ref(null)
const studentsByEdition = reactive({})
const students = computed(() => current.value && studentsByEdition[current.value.edition_id])
const modalTitle = computed(() => current.value ? `${current.value.course} · ${current.value.edition || current.value.code}` : '')

async function openClassroom (a) {
  current.value = a
  modalOpen.value = true
  if (studentsByEdition[a.edition_id]) return
  try {
    studentsByEdition[a.edition_id] = await seguimientoService.alumnos(a.edition_id)
  } catch (err) {
    modalOpen.value = false
    toast.error(err?.response?.data?.message || 'No se pudieron cargar los alumnos del aula.')
  }
}

async function load () {
  loading.value = true
  try {
    const r = await seguimientoService.aulas()
    classrooms.value = (r?.items || []).map(a => ({ ...a, card: toCard(a) }))
  } catch (err) {
    console.error('[SeguimientoAlumno]', err)
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudieron cargar las aulas.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* Barra igual a la de Aulas: estado, búsqueda, resultados y vista en una línea */
.sa-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.sa-search { flex: 1 1 240px; max-width: 360px; }
.sa-results { margin-left: auto; font-size: 12px; color: var(--ds-muted); white-space: nowrap; }
.sa-tab-count { margin-left: 4px; font-size: 11px; opacity: 0.7; font-variant-numeric: tabular-nums; }

.sa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--ds-gap); }
.sa-card-skel {
  display: flex; flex-direction: column; gap: 12px; padding: 18px 16px 16px;
  background: var(--ds-surface); border: 1px solid var(--ds-border);
  border-top: 3px solid var(--ds-surface-3); border-radius: var(--ds-radius);
}
/* Cifras del pie: verde aprobados, rojo desaprobados (el resto, color de la tarjeta). */
.aula-stat b.sa-ok, .sa-ok { color: var(--ds-ok-ink); }
.aula-stat b.sa-bad, .sa-bad { color: var(--ds-bad-ink); }

.sa-main { font-weight: 600; color: var(--ds-ink); line-height: 1.3; }
.sa-sub { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.sa-zero { color: var(--ds-muted); }
.sa-flex { margin-left: 6px; font-size: 10.5px; vertical-align: middle; }
.sa-email { word-break: break-all; }
/* Separa el bloque de conteos (total → aprobados → desaprobados) del resto. */
.sa-group { border-left: 1px solid var(--ds-border); }
/* Alumno que salio del aula: todo el texto de la fila en rojo. */
.sa-row-out td, .sa-row-out .sa-main, .sa-row-out .sa-sub { color: var(--ds-bad-ink); }
.sa-modal-sub { margin-bottom: 12px; font-size: 12.5px; color: var(--ds-ink-2); }
.mono { font-variant-numeric: tabular-nums; }

@media (max-width: 900px) {
  .sa-search { max-width: none; }
  .sa-results { margin-left: 0; }
  .sa-grid { grid-template-columns: 1fr; }
}
</style>
