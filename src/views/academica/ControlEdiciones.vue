<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import WeekNavigator from './components/WeekNavigator.vue'
import SessionMarkPopover from './components/SessionMarkPopover.vue'
import { useIsoWeekNav, formatDayMonth } from '@/features/academica-week/useIsoWeekNav'
import { normalizeText as norm, initials } from '@/shared/lib/text'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()

// Estados de gestion (mismos codigos que edition_session_control).
const ESTADOS = {
  '': { label: 'Pendiente', short: '—', tone: '' },
  A: { label: 'Dictada', short: 'A', tone: 'ok' },
  R: { label: 'Reprogramada', short: 'R', tone: 'bad' },
  T: { label: 'Tardanza', short: 'T', tone: 'warn' }
}
const MARK_OPTIONS = ['', 'A', 'R', 'T'].map((code) => ({ code, ...ESTADOS[code] }))
const LEGEND = ['A', 'R', 'T', ''].map((code) => ({ code, ...ESTADOS[code] }))
const DEFAULT_REPRO_MAX = 3

const weekNav = useIsoWeekNav()
const data = ref(null)
const isLoading = ref(false)
const savingKey = ref(null)
// Popover "Marcar sesion": { edition, session, anchor, mode: 'pick'|'date', dateVal }
const pop = ref(null)

// Dos caras de la misma semana: 'curso' gestiona sesion por sesion las aulas en
// marcha; 'cierre' lista las que TERMINAN y su checklist de cierre. Comparten
// navegacion, filtros de texto y consulta; cambian columnas y guardado.
const mode = ref('curso')
const closureData = ref(null)

async function load() {
  isLoading.value = true
  pop.value = null
  try {
    const semana = { year: weekNav.year.value, week: weekNav.week.value }
    if (mode.value === 'cierre') closureData.value = await editionService.weeklyClosures(semana)
    else data.value = await editionService.weeklyControl(semana)
  } catch (err) {
    console.error('Error cargando control de ediciones:', err)
    toast.error('Error al cargar el control de ediciones')
    if (mode.value === 'cierre') closureData.value = null
    else data.value = null
  } finally {
    isLoading.value = false
  }
}

function setMode(next) {
  if (mode.value === next) return
  mode.value = next
  load()
}

function moveWeek(delta) {
  weekNav.move(delta)
  load()
}

onMounted(load)

// El rango sale del dataset que se esta viendo: en 'cierre' el otro se queda en
// la semana vieja porque moveWeek solo recarga el activo.
const activeData = computed(() => (mode.value === 'cierre' ? closureData.value : data.value))

const editions = computed(() => data.value?.editions || [])
const maxSessions = computed(() =>
  editions.value.reduce((m, e) => Math.max(m, e.sessions.length), 0)
)

// Filtros por columna: texto = contiene (sin distinguir tildes ni mayusculas),
// el resto = lista de valores elegidos en el desplegable.
const filters = ref({ curso: '', codigo: '', docente: '', ns: [], freq: [], actual: [], repros: [], tard: [] })
const freqLabel = (e) => [e.day_label, e.hour_label].filter(Boolean).join(' · ') || '—'

// Repros y tardanzas no se filtran por su numero exacto (nadie busca "3
// reprogramaciones") sino por tenerlas o no.
const countLabel = (field) => (e) => (e[field] === 0 ? '0' : '1+')

// Los tres filtros de texto valen para las dos tablas: es la misma aula, solo
// cambia lo que se muestra de ella.
const matchesText = (e) => {
  const f = filters.value
  if (f.curso && !(norm(e.abbreviation).includes(norm(f.curso)) || norm(e.specific_code).includes(norm(f.curso)))) return false
  if (f.codigo && !norm(e.class_code).includes(norm(f.codigo))) return false
  if (f.docente && !norm(e.instructor).includes(norm(f.docente))) return false
  return true
}

const filteredEditions = computed(() => {
  const f = filters.value
  return editions.value.filter((e) => {
    if (!matchesText(e)) return false
    if (f.ns.length && !f.ns.includes(String(e.total_sessions))) return false
    if (f.freq.length && !f.freq.includes(freqLabel(e))) return false
    if (f.actual.length && !f.actual.includes(e.current_label || '(Vacío)')) return false
    if (f.repros.length && !f.repros.includes(countLabel('repro_count')(e))) return false
    if (f.tard.length && !f.tard.includes(countLabel('tardy_count')(e))) return false
    return true
  })
})

// ---------- cierre de cursos ----------
// Las etiquetas y el orden de las casillas los manda el backend (CLOSURE_CHECKS):
// agregar una tarea no toca esta vista.
const checkDefs = computed(() => closureData.value?.checks || [])
const closures = computed(() => closureData.value?.editions || [])
const filteredClosures = computed(() => closures.value.filter(matchesText))

const closureSummary = computed(() => {
  const total = filteredClosures.value.length
  const listos = filteredClosures.value.filter((e) => e.done_count === checkDefs.value.length).length
  const tareas = filteredClosures.value.reduce((a, e) => a + e.done_count, 0)
  return { total, listos, pendientes: total - listos, tareas }
})

async function toggleCheck(row, field) {
  savingKey.value = `${row.edition_num_id}:${field}`
  try {
    const updated = await editionService.closureSave({
      edition_num_id: row.edition_num_id,
      field,
      value: !row.checks[field]
    })
    const idx = closures.value.findIndex((x) => x.edition_num_id === row.edition_num_id)
    if (updated && idx !== -1) closureData.value.editions.splice(idx, 1, updated)
  } catch (err) {
    console.error('Error guardando el cierre:', err)
    toast.error(err.response?.data?.message || 'No se pudo guardar la tarea de cierre')
  } finally {
    savingKey.value = null
  }
}

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

const cellKey = (e, n) => `${e.edition_num_id}:${n}`
const estadoOf = (s) => ESTADOS[s.status || '']
const reproMax = (edition) => edition.repro_max || DEFAULT_REPRO_MAX
const reprosLeft = (edition) => Math.max(0, reproMax(edition) - edition.repro_count)

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
  pop.value = {
    edition,
    session,
    mode: 'pick',
    dateVal: session.new_date || session.planned_date,
    anchor: event.currentTarget.getBoundingClientRect()
  }
}

const popTitle = computed(() =>
  pop.value?.mode === 'date' ? '¿A qué fecha se reprogramó?' : `Marcar sesión ${pop.value?.session.session_number}`
)

function pick(status) {
  const { edition, session } = pop.value
  if (status === 'R') {
    // Tope por curso: cada cambio de fecha (incluida una re-reprogramacion)
    // consume una; el backend tambien lo valida.
    if (edition.repro_count >= reproMax(edition)) {
      pop.value = null
      toast.warning(`Este curso ya usó sus ${reproMax(edition)} reprogramaciones`)
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
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Control de Ediciones</h1>
        <p v-if="mode === 'cierre'" class="ds-sub">
          Aulas que cierran en la semana y su checklist —
          <b>{{ filteredClosures.length }} {{ filteredClosures.length === 1 ? 'cierre' : 'cierres' }}</b>
          <template v-if="filteredClosures.length !== closures.length"> de {{ closures.length }}</template>
        </p>
        <p v-else class="ds-sub">
          Gestión por sesión de las aulas en curso en la semana —
          <b>{{ filteredEditions.length }} {{ filteredEditions.length === 1 ? 'aula' : 'aulas' }}</b>
          <template v-if="filteredEditions.length !== editions.length"> de {{ editions.length }}</template>
        </p>
      </div>
      <div class="ds-head-actions">
        <div class="ds-tabs" role="tablist" aria-label="Vista del control">
          <button
            type="button"
            role="tab"
            :aria-selected="String(mode === 'curso')"
            :disabled="isLoading"
            @click="setMode('curso')"
          >En curso</button>
          <button
            type="button"
            role="tab"
            :aria-selected="String(mode === 'cierre')"
            :disabled="isLoading"
            @click="setMode('cierre')"
          >Cierres</button>
        </div>
        <WeekNavigator
          :week="weekNav.week.value"
          :start="activeData?.date_start"
          :end="activeData?.date_end"
          :disabled="isLoading"
          @move="moveWeek"
        />
      </div>
    </header>

    <template v-if="mode === 'curso'">
      <div class="ds-kpis">
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-regular fa-calendar"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">
              <span v-if="isLoading && !data" class="skel-kpi"></span>
              <template v-else>{{ summary.total }}</template>
            </span>
            <span class="ds-kpi-label">Sesiones esta semana</span>
            <span class="ds-kpi-note">en el rango visible</span>
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
            <span class="ds-kpi-note">marcadas como A</span>
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
            <span class="ds-kpi-note">corren las siguientes</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon warn" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">
              <span v-if="isLoading && !data" class="skel-kpi"></span>
              <template v-else>{{ summary.T }}</template>
            </span>
            <span class="ds-kpi-label">Tardanzas</span>
            <span class="ds-kpi-note">dictadas con retraso</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-regular fa-clock"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">
              <span v-if="isLoading && !data" class="skel-kpi"></span>
              <template v-else>{{ summary.pend }}</template>
            </span>
            <span class="ds-kpi-label">Pendientes</span>
            <span class="ds-kpi-note">sin marcar</span>
          </div>
        </div>
      </div>

      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">¿Cómo va cada sesión de la semana?</h3>
          <div class="legend">
            <span v-for="l in LEGEND" :key="l.code" class="legend-item">
              <span class="ds-pill mark" :class="l.tone">{{ l.short }}</span>{{ l.label }}
            </span>
          </div>
          <span class="ds-panel-hint">{{ filteredEditions.length }} resultados</span>
        </header>

        <div v-if="isLoading && !data" class="ds-panel-body">
          <span v-for="n in 6" :key="n" class="ds-skel skel-row"></span>
        </div>
        <p v-else-if="!editions.length" class="ds-empty ds-empty--lista">
          Ninguna aula en curso esta semana. Usa las flechas para navegar entre semanas.
        </p>

        <div v-else class="ds-table-scroll">
          <table class="ds-table ds-table--lista matrix">
            <thead>
              <tr>
                <th class="col-curso">Curso</th>
                <th>Docente</th>
                <th class="col-cod">Código</th>
                <th class="center">#S</th>
                <th>Frecuencia</th>
                <th v-for="n in maxSessions" :key="n" class="s-col">S{{ n }}</th>
                <th class="center">Actual</th>
                <th class="center" title="Reprogramaciones">Repros</th>
                <th class="center" title="Tardanzas">Tard.</th>
              </tr>
              <!-- Toda columna filtra desde esta fila: texto -> caja de escribir,
                   categoria -> desplegable. Las opciones salen de `editions` (todas)
                   y no de las filtradas, si no se irian achicando solas. -->
              <tr class="flt-row">
                <th class="col-curso">
                  <input v-model.trim="filters.curso" class="ds-input flt" type="text" placeholder="Curso / código…" aria-label="Filtrar por curso o código" />
                </th>
                <th>
                  <input v-model.trim="filters.docente" class="ds-input flt" type="text" placeholder="Docente…" aria-label="Filtrar por docente" />
                </th>
                <th class="col-cod">
                  <input v-model.trim="filters.codigo" class="ds-input flt" type="text" placeholder="Código…" aria-label="Filtrar por código de clase" />
                </th>
                <th>
                  <ColumnFilterDropdown
                    column-label="#S"
                    :all-items="editions"
                    :value-extractor="e => String(e.total_sessions)"
                    v-model="filters.ns"
                  />
                </th>
                <th>
                  <ColumnFilterDropdown
                    column-label="Frecuencia"
                    :all-items="editions"
                    :value-extractor="freqLabel"
                    v-model="filters.freq"
                  />
                </th>
                <th :colspan="maxSessions"></th>
                <th>
                  <ColumnFilterDropdown
                    column-label="Actual"
                    :all-items="editions"
                    :value-extractor="e => e.current_label || '(Vacío)'"
                    v-model="filters.actual"
                  />
                </th>
                <th>
                  <ColumnFilterDropdown
                    column-label="Repros"
                    :all-items="editions"
                    :value-extractor="countLabel('repro_count')"
                    v-model="filters.repros"
                  />
                </th>
                <th>
                  <ColumnFilterDropdown
                    column-label="Tard."
                    :all-items="editions"
                    :value-extractor="countLabel('tardy_count')"
                    v-model="filters.tard"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredEditions.length">
                <td :colspan="maxSessions + 8" class="ds-empty ds-empty--lista">
                  Ningún aula coincide con los filtros. Quita un filtro para ver más.
                </td>
              </tr>
              <tr v-for="e in filteredEditions" :key="e.edition_num_id">
                <td class="col-curso">
                  <div class="curso-name">{{ e.abbreviation }}</div>
                  <div class="mono-sub">{{ e.specific_code }}</div>
                </td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-av" aria-hidden="true">{{ initials(e.instructor) || '·' }}</span>
                    <span class="nowrap">{{ e.instructor || '—' }}</span>
                  </div>
                </td>
                <td class="col-cod mono nowrap">{{ e.class_code || '—' }}</td>
                <td class="center mono">{{ e.total_sessions }}</td>
                <td>
                  <div class="nowrap">{{ e.day_label || '—' }}</div>
                  <div class="sub nowrap">{{ e.hour_label }}</div>
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
                    type="button"
                    :disabled="savingKey === cellKey(e, n)"
                    :aria-label="`Marcar sesión ${n} de ${e.abbreviation}: ${estadoOf(e.sessions[n - 1]).label}`"
                    @click="openPop($event, e, e.sessions[n - 1])"
                  >
                    <span class="s-date">
                      <s v-if="e.sessions[n - 1].new_date" class="s-old">
                        {{ formatDayMonth(e.sessions[n - 1].planned_date) }}
                      </s>
                      {{ formatDayMonth(e.sessions[n - 1].date) }}
                    </span>
                    <span class="ds-pill s-badge" :class="estadoOf(e.sessions[n - 1]).tone">
                      <span class="s-dot" aria-hidden="true" />
                      {{ estadoOf(e.sessions[n - 1]).short }}
                    </span>
                  </button>
                </td>
                <td class="center">
                  <span class="ds-pill mono" :class="e.current_label === 'CULMINÓ' ? 'ok' : 'info'">
                    {{ e.current_label || '—' }}
                  </span>
                </td>
                <td
                  class="cnt"
                  :class="e.repro_count ? 'bad' : 'zero'"
                  :title="`${e.repro_count} de ${reproMax(e)} reprogramaciones usadas`"
                >{{ e.repro_count }}</td>
                <td class="cnt" :class="e.tardy_count ? 'warn' : 'zero'">{{ e.tardy_count }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer v-if="editions.length" class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>Celda resaltada = sesión actual de cada curso (la primera aún no dictada). Haz clic en cualquier sesión para marcar su estado.</span>
        </footer>
      </section>
    </template>

    <template v-else>
      <div class="ds-kpis">
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-regular fa-flag"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">
              <span v-if="isLoading && !closureData" class="skel-kpi"></span>
              <template v-else>{{ closureSummary.total }}</template>
            </span>
            <span class="ds-kpi-label">Cierres esta semana</span>
            <span class="ds-kpi-note">aulas que terminan</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon ok" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">
              <span v-if="isLoading && !closureData" class="skel-kpi"></span>
              <template v-else>{{ closureSummary.listos }}</template>
            </span>
            <span class="ds-kpi-label">Cerradas</span>
            <span class="ds-kpi-note">con las {{ checkDefs.length }} tareas hechas</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon warn" aria-hidden="true"><i class="fa-regular fa-clock"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">
              <span v-if="isLoading && !closureData" class="skel-kpi"></span>
              <template v-else>{{ closureSummary.pendientes }}</template>
            </span>
            <span class="ds-kpi-label">Pendientes</span>
            <span class="ds-kpi-note">les falta alguna tarea</span>
          </div>
        </div>
        <div class="ds-kpi">
          <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-list-check"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">
              <span v-if="isLoading && !closureData" class="skel-kpi"></span>
              <template v-else>{{ closureSummary.tareas }}</template>
            </span>
            <span class="ds-kpi-label">Tareas hechas</span>
            <span class="ds-kpi-note">de {{ closureSummary.total * checkDefs.length }}</span>
          </div>
        </div>
      </div>

      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">¿Qué aulas terminan y qué les falta para cerrar?</h3>
          <span class="ds-panel-hint">{{ filteredClosures.length }} resultados</span>
        </header>

        <div v-if="isLoading && !closureData" class="ds-panel-body">
          <span v-for="n in 6" :key="n" class="ds-skel skel-row"></span>
        </div>
        <p v-else-if="!closures.length" class="ds-empty ds-empty--lista">
          Ningún aula cierra esta semana. Usa la flecha › para revisar los cierres de la semana que viene.
        </p>

        <div v-else class="ds-table-scroll">
          <table class="ds-table ds-table--lista matrix">
            <thead>
              <tr>
                <th class="col-curso">Curso</th>
                <th class="col-cod">Código</th>
                <th>Docente</th>
                <th class="center">Cierra</th>
                <th v-for="c in checkDefs" :key="c.field" class="chk-col">{{ c.label }}</th>
                <th class="center">Avance</th>
              </tr>
              <tr class="flt-row">
                <th class="col-curso">
                  <input v-model.trim="filters.curso" class="ds-input flt" type="text" placeholder="Curso / código…" aria-label="Filtrar por curso o código" />
                </th>
                <th class="col-cod">
                  <input v-model.trim="filters.codigo" class="ds-input flt" type="text" placeholder="Código…" aria-label="Filtrar por código de clase" />
                </th>
                <th>
                  <input v-model.trim="filters.docente" class="ds-input flt" type="text" placeholder="Docente…" aria-label="Filtrar por docente" />
                </th>
                <th :colspan="checkDefs.length + 2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredClosures.length">
                <td :colspan="checkDefs.length + 5" class="ds-empty ds-empty--lista">
                  Ningún cierre coincide con los filtros. Quita un filtro para ver más.
                </td>
              </tr>
              <tr v-for="e in filteredClosures" :key="e.edition_num_id">
                <td class="col-curso">
                  <div class="curso-name">{{ e.abbreviation }}</div>
                  <div class="mono-sub">{{ e.specific_code }}</div>
                </td>
                <td class="col-cod mono nowrap">{{ e.class_code || '—' }}</td>
                <td>
                  <div class="doc-cell">
                    <span class="doc-av" aria-hidden="true">{{ initials(e.instructor) || '·' }}</span>
                    <span class="nowrap">{{ e.instructor || '—' }}</span>
                  </div>
                </td>
                <td class="center"><span class="ds-pill info mono">{{ formatDayMonth(e.closing_date) }}</span></td>
                <td v-for="c in checkDefs" :key="c.field" class="center">
                  <button
                    class="chk"
                    type="button"
                    :class="{ on: e.checks[c.field] }"
                    :disabled="savingKey === `${e.edition_num_id}:${c.field}`"
                    :title="c.label"
                    :aria-label="c.label"
                    :aria-pressed="!!e.checks[c.field]"
                    @click="toggleCheck(e, c.field)"
                  >
                    <i :class="e.checks[c.field] ? 'fa-solid fa-check' : 'fa-regular fa-square'" aria-hidden="true"></i>
                  </button>
                </td>
                <td class="cnt" :class="e.done_count === checkDefs.length ? 'zero' : 'warn'">
                  {{ e.done_count }}/{{ checkDefs.length }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer v-if="closures.length" class="ds-panel-foot">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>La fecha de cierre es la última sesión con reprogramaciones aplicadas, no el fin planificado.</span>
        </footer>
      </section>
    </template>

    <SessionMarkPopover
      v-if="pop"
      :anchor="pop.anchor"
      :width="210"
      :height="250"
      :title="popTitle"
      :options="MARK_OPTIONS"
      :selected="pop.session.status || ''"
      @pick="pick"
      @close="pop = null"
    >
      <template v-if="pop.mode === 'date'" #step>
        <div class="repro-step">
          <input v-model="pop.dateVal" class="ds-input mono" type="date" aria-label="Nueva fecha de la sesión" />
          <p class="repro-hint">
            Fecha original: <b>{{ formatDayMonth(pop.session.planned_date) }}</b> —
            las sesiones siguientes corren desde la nueva fecha,
            manteniendo la frecuencia del curso.
            <br />
            Quedan <b>{{ reprosLeft(pop.edition) }}</b>
            de {{ reproMax(pop.edition) }} reprogramaciones para este curso.
          </p>
          <div class="repro-actions">
            <button class="btn-exec btn-exec-ghost btn-sm" type="button" @click="pop.mode = 'pick'">Volver</button>
            <button
              class="btn-exec btn-exec-primary btn-sm"
              type="button"
              :disabled="!pop.dateVal || pop.dateVal === pop.session.date"
              @click="confirmRepro"
            >Guardar</button>
          </div>
        </div>
      </template>
    </SessionMarkPopover>
  </div>
</template>

<style scoped>
/* Matriz aula x sesion: columna del curso fija al hacer scroll horizontal y
   la fila de filtros fija bajo el encabezado. */
.matrix { min-width: 1160px; }
.matrix th, .matrix td { text-align: left; }
.matrix .center { text-align: center; }
.matrix .col-curso { position: sticky; left: 0; z-index: 2; min-width: 232px; background: var(--ds-surface); }
.matrix thead th.col-curso { z-index: 3; }
.matrix .col-cod { width: 124px; }
.flt-row th { top: 36px; padding: 6px 8px; }
.flt { height: 30px; min-width: 60px; font-size: 12px; }

.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin-left: auto; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ds-ink-2); }
.mark { width: 22px; height: 22px; padding: 0; justify-content: center; font-family: var(--ds-font-mono); }

.curso-name { font-weight: 600; }
.mono, .mono-sub { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }
.mono-sub { margin-top: 2px; font-size: 11px; font-weight: 400; color: var(--ds-muted); }
.sub { margin-top: 1px; font-size: 11px; color: var(--ds-muted); }
.nowrap { white-space: nowrap; }

.doc-cell { display: flex; align-items: center; gap: 8px; }
.doc-av {
  flex: none; width: 22px; height: 22px; display: grid; place-items: center;
  border-radius: 999px; background: var(--ds-brand); color: var(--ds-on-brand);
  font-size: 9.5px; font-weight: 700;
}

/* Celda de sesion: fecha efectiva arriba (tachada la original si se movio) y
   el estado debajo. La sesion actual de cada curso va resaltada. */
.matrix th.s-col { width: 92px; text-align: center; }
.matrix td.s-cell { padding: 8px; text-align: center; }
.matrix td.s-now, .matrix tbody tr:hover td.s-now { background: var(--ds-soft-info); }
.s-empty { color: var(--ds-muted); }
.s-btn {
  display: inline-flex; flex-direction: column; align-items: center; gap: 5px;
  width: 76px; padding: 6px 4px; border: 1px solid transparent; border-radius: var(--ds-radius-sm);
  background: transparent; cursor: pointer; transition: border-color 0.13s, background 0.13s;
}
.s-btn:hover:not(:disabled) { border-color: var(--ds-border); background: var(--ds-surface); }
.s-btn:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.s-btn:disabled { opacity: 0.55; cursor: default; }
.s-date { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; font-size: 12px; font-weight: 600; color: var(--ds-ink); white-space: nowrap; }
.s-old { margin-right: 3px; font-size: 11px; font-weight: 400; color: var(--ds-muted); }
.s-badge { width: 100%; height: 22px; justify-content: center; gap: 5px; }
.s-dot { width: 5px; height: 5px; border-radius: 999px; background: currentColor; }

/* Contadores: el tono sale de tener o no reprogramaciones/tardanzas. */
.matrix td.cnt { text-align: center; font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 600; }
.matrix td.cnt.zero { color: var(--ds-muted); }

.matrix th.chk-col { width: 92px; font-size: 10.5px; line-height: 1.25; }
.chk {
  width: 30px; height: 30px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  background: var(--ds-surface); color: var(--ds-muted); cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.chk:hover:not(:disabled) { border-color: var(--ds-accent); color: var(--ds-accent); }
.chk:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.chk:disabled { opacity: 0.55; cursor: default; }
.chk.on { background: var(--ds-soft-ok); border-color: var(--ds-ok); color: var(--ds-ok-ink); }

.skel-row { margin: 10px 0; }

.repro-step { max-width: 230px; padding: 4px 10px 10px; }
.repro-hint { margin: 8px 0 10px; font-size: 11.5px; line-height: 1.45; color: var(--ds-ink-2); }
.repro-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
