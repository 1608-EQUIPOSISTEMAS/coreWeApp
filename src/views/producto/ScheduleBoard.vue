<template>
  <div class="board-shell">
    <!-- ══ Encabezado ══ -->
    <header class="board-head">
      <div class="board-title">
        <i class="fa-solid fa-calendar-days board-title-icon"></i>
        <div>
          <span class="board-eyebrow">Vista de solo lectura</span>
          <h1>Cronograma {{ months[selectedMonth - 1] }} {{ selectedYear }}</h1>
        </div>
      </div>

      <div class="board-controls">
        <div class="period-nav">
          <button type="button" @click="changeMonth(-1)" title="Mes anterior"><i class="fa-solid fa-chevron-left"></i></button>
          <select v-model.number="selectedMonth" @change="fetchAll" class="ctrl-select">
            <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
          </select>
          <select v-model.number="selectedYear" @change="fetchAll" class="ctrl-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <button type="button" @click="changeMonth(1)" title="Mes siguiente"><i class="fa-solid fa-chevron-right"></i></button>
        </div>

        <select v-model="lineFilter" class="ctrl-select">
          <option value="">Todas las líneas</option>
          <option v-for="l in businessLines" :key="l.id" :value="l.description">{{ l.description }}</option>
        </select>

        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model.trim="search" type="search" placeholder="Curso, docente, código…" />
        </div>

        <div class="kpi"><span>EDICIONES</span><b>{{ visibleCount }}</b></div>
        <button type="button" class="refresh-btn" @click="fetchAll" title="Recargar"><i class="fa-solid fa-rotate"></i></button>
      </div>
    </header>

    <!-- ══ Tabla ══ -->
    <div class="board-table-wrap">
      <table class="board-table">
        <thead>
          <tr class="th-groups">
            <th class="th-num" rowspan="2">N°</th>
            <th colspan="6" class="grp grp-id">IDENTIFICACIÓN</th>
            <th colspan="10" class="grp grp-cro">CRONOGRAMA</th>
            <th class="th-obs" rowspan="2">OBSERVACIÓN</th>
            <th colspan="6" class="grp grp-aula">AULA / INSCRITOS</th>
            <th colspan="3" class="grp grp-goal">OBJETIVO</th>
          </tr>
          <tr class="th-cols">
            <th>SEG</th>
            <th>LÍNEA</th>
            <th>TIPO</th>
            <th>ED.</th>
            <th class="num" title="Cuenta apertura">CA</th>
            <th class="curso-col">CURSO</th>
            <th class="num" title="Mejora">MEJ</th>
            <th class="num" title="Ficha / Expediente">FICH</th>
            <th>DOCENTE</th>
            <th class="num" title="Pre-confirmación">P.C</th>
            <th class="num" title="Confirmación">CONF</th>
            <th>DÍAS</th>
            <th>INICIO</th>
            <th>HORARIO</th>
            <th>FIN</th>
            <th class="num" title="Sesiones">SES</th>
            <th class="num" title="Venta directa">VEN</th>
            <th class="num" title="Cambio de curso / seguimiento">SEG</th>
            <th class="num" title="Membresía">MEM</th>
            <th class="num" title="Convenio B2B">B2B</th>
            <th class="num" title="Beca — no suma al aula">BEC</th>
            <th class="num aula-col" title="Total en aula">AULA</th>
            <th class="num" title="Vacantes faltantes (aula − objetivo)">V.F</th>
            <th class="num" title="Objetivo de vacantes">OB.V</th>
            <th class="num" title="N° de consultas (leads)">CONS</th>
          </tr>
        </thead>

        <tbody v-if="isLoading">
          <tr v-for="n in 8" :key="'sk' + n" class="sk-row"><td :colspan="27"><span class="sk-bar" :style="{ width: (45 + (n * 13) % 40) + '%' }"></span></td></tr>
        </tbody>

        <tbody v-else>
          <template v-for="week in filteredWeeks" :key="week.schedule">
            <tr v-if="week.items.length" class="week-band" @click="week.isOpen = !week.isOpen">
              <td :colspan="27">
                <i class="fa-solid" :class="week.isOpen ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                <span class="week-name">Semana {{ week.schedule }}</span>
                <span class="week-count">{{ week.items.length }} ediciones</span>
              </td>
            </tr>

            <tr
              v-for="(e, i) in week.items"
              v-show="week.isOpen"
              :key="e.edition_num_id"
              class="data-row"
              :class="'seg-' + (e.cat_segment || '').toLowerCase()"
            >
              <td class="td-num">{{ rowNumber(week, i) }}</td>

              <!-- Identificación -->
              <td><span class="seg-pill">{{ e.cat_segment || '—' }}</span></td>
              <td class="td-line">{{ e.business_line_label || e.program_line_business || '—' }}</td>
              <td class="td-type">{{ e.cat_course_category_label || e.program_type || '—' }}</td>
              <td class="mono">{{ e.version_code || '—' }}</td>
              <td class="num mono muted">{{ e.calc_da ?? 0 }}</td>
              <td class="td-curso">
                <span class="curso-name">{{ e.program_abreviature || '—' }}</span>
                <span v-if="statusBadge(e)" class="status-badge" :class="statusBadge(e).cls">{{ statusBadge(e).label }}</span>
              </td>

              <!-- Cronograma -->
              <td class="num"><span class="dot" :class="e.upgrade ? 'dot-on' : 'dot-off'"></span></td>
              <td class="num"><span class="dot" :class="e.expedient ? 'dot-on' : 'dot-off'"></span></td>
              <td class="td-doc" :title="e.instructor">{{ e.instructor || '—' }}</td>
              <td class="num"><span class="dot" :class="e.preconfirmation ? 'dot-on' : 'dot-off'"></span></td>
              <td class="num"><span class="dot" :class="e.confirmation ? 'dot-conf' : 'dot-off'"></span></td>
              <td class="td-days">{{ daysLabel(e) }}</td>
              <td class="mono">{{ formatDate(e.start_date) }}</td>
              <td class="td-hour">{{ hourLabel(e) }}</td>
              <td class="mono">{{ formatDate(e.end_date) }}</td>
              <td class="num mono">{{ e.program_sessions ?? '—' }}</td>

              <!-- Observación -->
              <td class="td-obs" :title="e.notes">{{ e.notes || '—' }}</td>

              <!-- Aula -->
              <td class="num" :class="{ muted: !e.cnt_ventas }">{{ e.cnt_ventas ?? 0 }}</td>
              <td class="num" :class="{ muted: !e.cnt_segui }">{{ e.cnt_segui ?? 0 }}</td>
              <td class="num" :class="{ muted: !e.cnt_memb }">{{ e.cnt_memb ?? 0 }}</td>
              <td class="num" :class="{ muted: !e.cnt_b2b }">{{ e.cnt_b2b ?? 0 }}</td>
              <td class="num beca" :class="{ muted: !e.cnt_becas }">{{ e.cnt_becas ?? 0 }}</td>
              <td class="num aula-col">{{ e.cnt_aula ?? 0 }}</td>

              <!-- Objetivo -->
              <td class="num" :class="e.vf < 0 ? 'vf-neg' : 'vf-pos'">{{ e.vf > 0 ? '+' + e.vf : e.vf }}</td>
              <td class="num mono muted">{{ e.meta_vacantes || '—' }}</td>
              <td class="num mono">{{ e.consultas ?? 0 }}</td>
            </tr>
          </template>

          <tr v-if="!filteredWeeks.some(w => w.items.length)">
            <td :colspan="27" class="empty">
              <i class="fa-solid fa-calendar-xmark"></i>
              <p>No hay ediciones para este filtro.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const editionService = inject(ServiceKeys.Edition)
const dashboardService = inject(ServiceKeys.Dashboard)
const catalog = inject('catalog')
const toast = useToast()

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const years = [2024, 2025, 2026]

const today = new Date()
const selectedMonth = ref(today.getMonth() + 1)
const selectedYear = ref(today.getFullYear())
const schedules = ref([])
const isLoading = ref(false)
const search = ref('')
const lineFilter = ref('')

const businessLines = (catalog && catalog.options('we_business_line')) || []

// ── Carga: ediciones del mes + objetivos + consultas, fusionados por edición ──
async function fetchAll() {
  isLoading.value = true
  try {
    const { items } = await editionService.editionByWeekList({
      page: 1, size: 200,
      selectedMonth: selectedMonth.value,
      selectedYear: selectedYear.value
    })
    const weeks = Array.isArray(items) ? items : []
    const ids = weeks.flatMap(w => (w.items || []).map(e => e.edition_num_id)).filter(Boolean)

    const [goals, leads] = await Promise.all([
      dashboardService.programGoalsList({ year: selectedYear.value, month_num: selectedMonth.value }).catch(() => ({ items: [] })),
      ids.length ? dashboardService.leadsPerEditionList({ edition_ids: ids }).catch(() => []) : Promise.resolve([])
    ])

    const goalByEd = {}
    ;(goals.items || []).forEach(g => { goalByEd[g.edition_id] = Number(g.meta_vacantes || 0) })
    const consByEd = {}
    ;(leads || []).forEach(l => { consByEd[l.edition_num_id] = l.consultas })

    weeks.forEach(w => (w.items || []).forEach(e => {
      e.meta_vacantes = goalByEd[e.edition_num_id] || 0
      e.consultas = consByEd[e.edition_num_id] ?? 0
      // V.F = vacantes faltantes = aula − objetivo (negativo = faltan por llenar)
      e.vf = (e.cnt_aula ?? 0) - e.meta_vacantes
    }))

    schedules.value = weeks.map(w => ({ ...w, isOpen: true }))
  } catch (err) {
    console.error('Error cargando cronograma:', err)
    toast.error('No se pudo cargar el cronograma')
    schedules.value = []
  } finally {
    isLoading.value = false
  }
}

function changeMonth(delta) {
  let m = selectedMonth.value + delta
  let y = selectedYear.value
  if (m <= 0) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
  selectedMonth.value = m
  selectedYear.value = y
  fetchAll()
}

// ── Filtros (texto + línea) ──
const filteredWeeks = computed(() => {
  const q = search.value.toLowerCase()
  const line = lineFilter.value
  return schedules.value.map(w => ({
    ...w,
    items: (w.items || []).filter(e => {
      if (line && (e.business_line_label || e.program_line_business) !== line) return false
      if (!q) return true
      return [e.program_abreviature, e.instructor, e.version_code, e.global_code, e.specific_code]
        .some(v => (v || '').toLowerCase().includes(q))
    })
  }))
})

const visibleCount = computed(() => filteredWeeks.value.reduce((s, w) => s + w.items.length, 0))

function rowNumber(week, i) {
  let n = i + 1
  for (const w of filteredWeeks.value) {
    if (w.schedule === week.schedule) break
    n += w.items.length
  }
  return n
}

// ── Helpers de presentación ──
function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}
function daysLabel(e) { return e.schedules?.[0]?.day_combination_label || '—' }
function hourLabel(e) {
  if (!e.schedules?.length) return '—'
  const base = e.schedules[0].hour_combination_label || ''
  return e.schedules.length > 1 ? `${base} (+${e.schedules.length - 1})` : base
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO (contribución): implementar getCourseStatus(edition)
//
// Devuelve el estado del curso para pintar un badge junto al nombre, o null si
// no se quiere badge. Esta es una decisión de UX con varios criterios válidos:
//   - ¿Qué significa "por iniciar" — sólo futuro, o "inicia en ≤ N días"?
//   - ¿Se distingue "en curso" (entre inicio y fin) de "finalizado"?
//   - ¿Importa el estado de confirmación (e.confirmation) además de las fechas?
//
// Campos disponibles: edition.start_date, edition.end_date (strings ISO/fecha),
// edition.confirmation (bool). Compara contra `new Date()`.
//
// Debe retornar: null  ó  { label: 'En curso', cls: 'st-live' }
// Clases CSS ya definidas abajo: st-soon (ámbar), st-live (verde), st-done (gris).
//
// ponytail: stub a propósito — devuelve null (sin badge) hasta implementarlo.
function getCourseStatus(_edition) {
  // return { label: '...', cls: 'st-soon' | 'st-live' | 'st-done' }
  return null
}
function statusBadge(e) { return getCourseStatus(e) }

onMounted(fetchAll)
</script>

<style scoped>
.board-shell {
  --grp-id: #1e3a5f; --grp-cro: #0f5132; --grp-aula: #6b4d00; --grp-goal: #5b21b6;
  --gold: #b8860b; --ink: #1f2937; --line: #e5e7eb;
  font-size: 13px; color: var(--ink); padding-bottom: 3rem;
}

/* Head */
.board-head {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  gap: 1rem; padding: 1rem 1.25rem; background: #fff; border: 1px solid var(--line);
  border-radius: 10px; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.board-title { display: flex; align-items: center; gap: .8rem; }
.board-title-icon { width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: grid; place-items: center; font-size: 1.1rem; }
.board-eyebrow { font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
.board-title h1 { font-size: 1.15rem; font-weight: 700; margin: 0; line-height: 1.2; }
.board-controls { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.period-nav { display: flex; align-items: center; gap: 2px; background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 2px; }
.period-nav button { border: 0; background: transparent; width: 28px; height: 28px; border-radius: 6px; color: #64748b; cursor: pointer; }
.period-nav button:hover { background: #e2e8f0; }
.ctrl-select { border: 1px solid var(--line); border-radius: 8px; padding: .35rem .5rem; font-size: .8rem; background: #fff; color: var(--ink); }
.search-box { display: flex; align-items: center; gap: .4rem; border: 1px solid var(--line); border-radius: 8px; padding: .35rem .6rem; background: #fff; }
.search-box i { color: #94a3b8; font-size: .8rem; }
.search-box input { border: 0; outline: 0; font-size: .8rem; width: 170px; }
.kpi { display: flex; flex-direction: column; align-items: center; padding: 0 .5rem; }
.kpi span { font-size: .6rem; letter-spacing: .06em; color: #94a3b8; font-weight: 700; }
.kpi b { font-size: 1rem; color: var(--gold); }
.refresh-btn { border: 1px solid var(--line); background: #fff; width: 32px; height: 32px; border-radius: 8px; color: #64748b; cursor: pointer; }
.refresh-btn:hover { background: #f1f5f9; }

/* Table */
.board-table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; background: #fff; max-height: calc(100vh - 180px); }
.board-table { border-collapse: separate; border-spacing: 0; width: 100%; white-space: nowrap; }
.board-table th, .board-table td { border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f5f6f8; padding: 5px 8px; text-align: left; }
.board-table thead th { position: sticky; top: 0; z-index: 3; }

.th-groups .grp { color: #fff; text-align: center; font-size: .68rem; letter-spacing: .05em; font-weight: 700; padding: 6px 8px; }
.grp-id { background: var(--grp-id); } .grp-cro { background: var(--grp-cro); }
.grp-aula { background: var(--grp-aula); } .grp-goal { background: var(--grp-goal); }
.th-num, .th-obs { background: #0f172a; color: #fff; vertical-align: bottom; font-size: .68rem; text-align: center; }
.th-groups .th-num { top: 0; }
.th-cols th { top: 28px; background: #f8fafc; color: #475569; font-size: .66rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
.th-cols th.num, .board-table td.num { text-align: center; }
.curso-col { min-width: 210px; }
.aula-col { background: #fffbeb !important; color: var(--gold) !important; font-weight: 800; }

/* Week band */
.week-band td { background: linear-gradient(90deg, #f1f5f9, #f8fafc); cursor: pointer; padding: 7px 12px; font-weight: 700; color: #334155; position: sticky; left: 0; }
.week-band:hover td { background: #e2e8f0; }
.week-band i { margin-right: .5rem; color: #64748b; }
.week-name { font-size: .82rem; }
.week-count { float: right; background: #2563eb; color: #fff; border-radius: 999px; padding: 1px 10px; font-size: .68rem; font-weight: 600; }

/* Data rows */
.data-row td { font-size: .78rem; vertical-align: middle; }
.data-row:hover td { filter: brightness(.97); }
.td-num { text-align: center; color: #94a3b8; font-weight: 600; }
.mono { font-family: ui-monospace, 'Cascadia Code', monospace; font-size: .74rem; }
.muted { color: #cbd5e1; }
.td-line, .td-type { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.td-doc { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
.td-days, .td-hour { font-size: .74rem; color: #475569; }
.td-curso { min-width: 210px; }
.curso-name { font-weight: 600; color: #111827; }
.td-obs { max-width: 180px; overflow: hidden; text-overflow: ellipsis; font-size: .72rem; color: #64748b; font-style: italic; }
.beca { opacity: .7; }
.vf-neg { color: #dc2626; font-weight: 700; }
.vf-pos { color: #16a34a; font-weight: 700; }

/* Status dots (read-only) */
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.dot-on { background: #3b82f6; } .dot-conf { background: #16a34a; } .dot-off { background: #e2e8f0; border: 1px solid #cbd5e1; }

/* Status badge (getCourseStatus) */
.status-badge { display: inline-block; margin-left: .4rem; font-size: .6rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; vertical-align: middle; }
.st-soon { background: #fef3c7; color: #92400e; }
.st-live { background: #dcfce7; color: #166534; }
.st-done { background: #f1f5f9; color: #64748b; }

/* Segment row tints (paleta del editor) */
.seg-a1 td { background: #eff6ff; } .seg-a2 td { background: #fbebd8; } .seg-a3 td { background: #f9f6d8; }
.seg-a4 td { background: #f8f4c9; } .seg-a5 td { background: #f9d5d8; } .seg-a6 td { background: #ebddfa; }
.seg-pill { display: inline-block; min-width: 26px; text-align: center; font-size: .66rem; font-weight: 700; padding: 1px 6px; border-radius: 5px; background: rgba(0,0,0,.06); color: #334155; }

/* Skeleton + empty */
.sk-row td { padding: 9px 8px; }
.sk-bar { display: block; height: 11px; border-radius: 6px; background: linear-gradient(90deg,#f1f5f9,#e2e8f0,#f1f5f9); background-size: 200% 100%; animation: sk 1.2s infinite; }
@keyframes sk { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.empty { text-align: center; padding: 3rem; color: #94a3b8; }
.empty i { font-size: 2rem; opacity: .4; display: block; margin-bottom: .5rem; }
</style>
