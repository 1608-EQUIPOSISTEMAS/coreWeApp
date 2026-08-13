<script setup>
import { ref, reactive, computed, onMounted, inject, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import apexchart from 'vue3-apexcharts'
import Swal from 'sweetalert2'
import { ServiceKeys } from '@/services'

const props = defineProps({
  id: { type: [String, Number], required: true },
})

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const router = useRouter()
const route = useRoute()

const editionId = computed(() => Number(props.id))
const currentUserId = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u.user_id || u.id || null
  } catch { return null }
})

// =====================================================================
// HEADER / INFO DEL AULA
// =====================================================================
const aula = ref(null)
const isLoadingAula = ref(false)

async function loadAula() {
  isLoadingAula.value = true
  try {
    const detail = await editionService.editionGet({ id: editionId.value })
    aula.value = detail || null

    // editionGet (sp_edition_tree_get) devuelve la estructura padre/hijos +
    // schedules + sesiones, pero NO trae program_abreviature ni instructor.
    // Antes se enriquecia con editionList (SP de 15s: hacia lentisimo abrir
    // CUALQUIER aula); ahora se usa la consulta ligera del modulo academico
    // filtrada a esta edicion (~0.3s). Misma fuente que /academica/aulas.
    if (detail && (!detail.program_abreviature || !detail.instructor)) {
      try {
        const rows = await editionService.academicReport({ edition_id: editionId.value })
        const match = (rows || [])[0]
        if (match) {
          aula.value = {
            ...detail,
            program_abreviature: detail.program_abreviature || match.program_abreviature,
            instructor: detail.instructor || match.instructor,
            cat_segment: detail.cat_segment || match.cat_segment,
          }
        }
      } catch (err) {
        console.warn('No se pudo enriquecer aula con academicReport:', err?.message || err)
      }
    }
  } catch (err) {
    console.error('Error cargando aula:', err)
    toast.error('No se pudo cargar el aula')
    aula.value = null
  } finally {
    isLoadingAula.value = false
  }
}

function formatDate(iso) {
  if (!iso) return '--'
  const s = String(iso).slice(0, 10)
  const [y, m, d] = s.split('-')
  return y && m && d ? `${d}/${m}/${y}` : '--'
}

const headerSchedule = computed(() => {
  const s = aula.value?.schedules?.[0]
  if (!s) return '--'
  return [s.day_combination_label, s.hour_combination_label].filter(Boolean).join(' ') || '--'
})

const sessionsTotal = computed(() =>
  Number(aula.value?.sessions || aula.value?.program_sessions || 0),
)
const sessionNumbers = computed(() =>
  Array.from({ length: sessionsTotal.value }, (_, i) => i + 1),
)

const teacherInitials = computed(() => {
  const t = aula.value?.instructor
  if (!t) return '--'
  return t.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
})

// =====================================================================
// TABS
// =====================================================================
const TABS = [
  { id: 'notas', label: 'Notas', icon: 'fa-list-check' },
  { id: 'historial', label: 'Historial', icon: 'fa-clock-rotate-left' },
  { id: 'auditoria', label: 'Auditoria', icon: 'fa-clipboard-check' },
  { id: 'general', label: 'General', icon: 'fa-chart-line' },
]

// Permite preseleccionar el tab via query (?tab=general). Lo usa el Reporte
// Academico para que el drill-down caiga directo en la vista consolidada.
// ?tab=asistencia (deeplinks antiguos) cae en Notas, que la reemplaza.
const TAB_IDS = TABS.map((t) => t.id)
const queryTab = route?.query?.tab === 'asistencia' ? 'notas' : route?.query?.tab
const initialTab = TAB_IDS.includes(queryTab) ? queryTab : 'notas'
const activeTab = ref(initialTab)

function switchTab(id) {
  if (
    activeTab.value === 'notas' && id !== 'notas' && dirtyGrades.size &&
    !window.confirm('Hay notas sin guardar. ¿Salir del tab y descartar el aviso de cambios?')
  ) return
  activeTab.value = id
  if (id === 'notas') {
    if (!students.value.length) loadStudents()
    if (gradesMap.value === null) loadGrades()
  }
  if (id === 'historial' && history.value === null) loadHistory()
  if (id === 'auditoria' && !auditMap.value) loadAudit()
  // El tab General consume `auditMap` igual que Auditoria, asi que
  // disparamos el mismo fetch para no requerir entrar antes a Auditoria.
  if (id === 'general' && !auditMap.value) loadAudit()
}

// =====================================================================
// NOTAS: alumnos + Lista de Notas editable (formato area academica ISO 21001)
// =====================================================================
const students = ref([])
const isLoadingStudents = ref(false)
const studentFilter = ref('todos')
const studentQuery = ref('')

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'aprobados', label: 'Aprobados' },
  { id: 'desaprobados', label: 'Desaprobados' },
  { id: 'seguimiento', label: 'Seguimiento' },
]

async function loadStudents() {
  isLoadingStudents.value = true
  try {
    students.value = await editionService.classroomStudentsList({ edition_id: editionId.value })
    hydrateGradesDraft()
  } catch (err) {
    console.error('Error cargando alumnos:', err)
    toast.error('Error cargando alumnos del aula')
    students.value = []
  } finally {
    isLoadingStudents.value = false
  }
}

// =====================================================================
// HISTORIAL: alumnos que NO figuran en la lista activa. null = aun no cargado.
// =====================================================================
// Trae DOS grupos: `left` (retiros/CC/RP/bajas) y `validated`
// (convalidados: compraron el paquete padre pero ya llevaron este curso antes,
// asi que nunca van a asistir). Se carga en onMounted, no al abrir el tab,
// porque la cabecera necesita el contador de convalidados desde el inicio.
const history = ref(null)
const isLoadingHistory = ref(false)

const historyLeft = computed(() => history.value?.left || [])
const historyValidated = computed(() => history.value?.validated || [])

async function loadHistory() {
  isLoadingHistory.value = true
  try {
    history.value = await editionService.classroomStudentsHistory({ edition_id: editionId.value })
  } catch (err) {
    console.error('Error cargando historial:', err)
    toast.error('Error cargando el historial del aula')
    history.value = { left: [], validated: [] }
  } finally {
    isLoadingHistory.value = false
  }
}

// "E9-26 · 21 may - 25 jun 26": donde el convalidado SI llevo el curso.
function validatedPrevLabel(v) {
  if (!v.prev_edition_code && !v.prev_start_date) return null
  const rango = [v.prev_start_date, v.prev_end_date].filter(Boolean).map(formatDate).join(' - ')
  return [v.prev_edition_code, rango].filter(Boolean).join(' · ')
}

// Motivo de salida legible + la tarjeta en la que cae. Prioriza el estado de
// tipo (retiro/cambio/etc); luego baja manual; luego FICO no confirmado.
// `title` es el titulo de la tarjeta (plural) y `label` el badge de la fila.
const HISTORY_REASON = {
  we_enrollment_status_retired:        { key: 'ret',  label: 'Retirado',        title: 'Retirados',          icon: 'fa-user-xmark',           cls: 'hb-ret' },
  we_enrollment_status_course_changed: { key: 'cc',   label: 'Cambio de curso', title: 'Cambios de curso',   icon: 'fa-right-left',           cls: 'hb-cc' },
  we_enrollment_status_reprogrammed:   { key: 'rp',   label: 'Reprogramado',    title: 'Reprogramados',      icon: 'fa-calendar-day',         cls: 'hb-rp' },
  we_enrollment_status_observed:       { key: 'obs',  label: 'Observado',       title: 'Observados',         icon: 'fa-triangle-exclamation', cls: 'hb-obs' },
}
const HISTORY_BAJA = { key: 'baja', label: 'Dado de baja', title: 'Dados de baja', icon: 'fa-ban', cls: 'hb-baja' }
const HISTORY_FICO = { key: 'fico', title: 'FICO no confirmado', icon: 'fa-hourglass-half', cls: 'hb-fico' }
const HISTORY_OTRO = { key: 'otro', title: 'Otros', icon: 'fa-circle-question', cls: 'hb-otro' }

function historyReason(h) {
  const m = HISTORY_REASON[h.type_status_alias]
  if (m) return m
  if (h.active === 'N') return HISTORY_BAJA
  if (h.fico_status_alias !== 'we_enrollment_status_checked') {
    return { ...HISTORY_FICO, label: h.fico_status_label || 'FICO no confirmado' }
  }
  return { ...HISTORY_OTRO, label: h.type_status_label || '--' }
}

// Una tarjeta por motivo, en orden fijo: primero las salidas reales, al final
// los casos de datos. Solo se emiten las que tienen filas.
const HISTORY_CARD_ORDER = ['ret', 'rp', 'cc', 'obs', 'baja', 'fico', 'otro']
const historyGroups = computed(() => {
  const buckets = new Map()
  for (const h of historyLeft.value) {
    const r = historyReason(h)
    if (!buckets.has(r.key)) buckets.set(r.key, { ...r, rows: [] })
    buckets.get(r.key).rows.push(h)
  }
  return HISTORY_CARD_ORDER.map((k) => buckets.get(k)).filter(Boolean)
})

// Reglas de calculo (espejo de GRADE_RULES en Backend edition.entity.js; al
// guardar, el backend recalcula los totales y es la fuente de verdad).
const GRADE_RULES = {
  TEST_MAX_PER_SESSION: 20, // nota del TEST FINAL del quiz de la sesion (0-20)
  WEIGHT_TEST: 0.3,
  WEIGHT_PARTIAL: 0.3,
  WEIGHT_FINAL: 0.4,
  PARTICIPATION_MAX: 2,
  PASS_THRESHOLD: 12,
  CAP_FINAL_AT_20: true,
}
// Cada criterio se califica de 0 a 20; el total /20 es el promedio ponderado.
const PARTIAL_CRITERIA = [
  { key: '1', label: 'Identificacion del problema central', max: 20, weight: 0.4 },
  { key: '2', label: 'Analisis del entorno y datos', max: 20, weight: 0.4 },
  { key: '3', label: 'Claridad y estructura del documento', max: 20, weight: 0.2 },
]
const FINAL_CRITERIA = [
  { key: '1', label: 'Pensamiento Estrategico', max: 20, weight: 0.3 },
  { key: '2', label: 'Decision y Justificacion', max: 20, weight: 0.3 },
  { key: '3', label: 'Presentacion Ejecutiva', max: 20, weight: 0.2 },
  { key: '4', label: 'Comunicacion y Adaptacion', max: 20, weight: 0.2 },
]

// gradesMap: enrollment_id -> fila guardada en BD (null = aun no cargado).
// gradesDraft: enrollment_id -> copia editable; dirtyGrades junta los ids
// modificados para guardarlos en un solo bulk.
const gradesMap = ref(null)
const gradesDraft = reactive({})
const dirtyGrades = reactive(new Set())
const expandedRow = ref(null)
const isSavingGrades = ref(false)

function emptyGradeDraft() {
  return {
    tests: {},
    participation: {},
    partial_criteria: {},
    final_criteria: {},
    group_number: null,
    observation: '',
  }
}

async function loadGrades() {
  try {
    const rows = await editionService.classroomGradesGet({ edition_id: editionId.value })
    const map = {}
    for (const r of rows || []) map[r.enrollment_id] = r
    gradesMap.value = map
    hydrateGradesDraft()
  } catch (err) {
    console.error('Error cargando notas:', err)
    toast.error('Error cargando la lista de notas')
    gradesMap.value = {}
  }
}

// Crea/refresca el draft de cada alumno desde la fila guardada (o vacio).
// Se invoca al cargar alumnos y al cargar notas (cualquiera llega primero).
function hydrateGradesDraft() {
  for (const s of students.value) {
    const saved = gradesMap.value?.[s.enrollment_id]
    if (gradesDraft[s.enrollment_id] && !saved) continue
    if (dirtyGrades.has(s.enrollment_id)) continue
    gradesDraft[s.enrollment_id] = saved
      ? {
          tests: { ...(saved.tests || {}) },
          participation: { ...(saved.participation || {}) },
          partial_criteria: { ...(saved.partial_criteria || {}) },
          final_criteria: { ...(saved.final_criteria || {}) },
          group_number: saved.group_number ?? null,
          observation: saved.observation || '',
        }
      : emptyGradeDraft()
  }
}

function draftFor(s) {
  if (!gradesDraft[s.enrollment_id]) gradesDraft[s.enrollment_id] = emptyGradeDraft()
  return gradesDraft[s.enrollment_id]
}

function markDirty(eid) {
  dirtyGrades.add(eid)
}

// --- Calculo en vivo (mismas formulas que el backend) -----------------
const round2g = (n) => Math.round(n * 100) / 100
const sumVals = (obj) =>
  Object.values(obj || {}).reduce((a, v) => a + (Number.isFinite(Number(v)) ? Number(v) : 0), 0)

function testScore(d) {
  const n = sessionsTotal.value
  return n ? round2g(sumVals(d.tests) / n) : 0
}
function partScore(d) {
  const n = sessionsTotal.value
  if (!n) return 0
  const checks = Object.values(d.participation || {}).filter((v) => v === true).length
  return Math.min(Math.round((checks * GRADE_RULES.PARTICIPATION_MAX) / n), GRADE_RULES.PARTICIPATION_MAX)
}
const weightedScore = (criteria, defs) =>
  round2g(defs.reduce((acc, c) => {
    const v = Number(criteria?.[c.key])
    return acc + (Number.isFinite(v) ? v * c.weight : 0)
  }, 0))
function partialScore(d) {
  return weightedScore(d.partial_criteria, PARTIAL_CRITERIA)
}
function finalDelivScore(d) {
  return weightedScore(d.final_criteria, FINAL_CRITERIA)
}
function finalGrade(d) {
  let g = round2g(
    testScore(d) * GRADE_RULES.WEIGHT_TEST +
    partialScore(d) * GRADE_RULES.WEIGHT_PARTIAL +
    finalDelivScore(d) * GRADE_RULES.WEIGHT_FINAL +
    partScore(d),
  )
  if (GRADE_RULES.CAP_FINAL_AT_20) g = Math.min(g, 20)
  return g
}
// "Tiene notas" = al menos una celda ESCRITA. Un 0 tecleado cuenta como nota
// (alumno evaluado con 0 -> DESAPROBADO); una celda vacia no.
function hasAnyGrade(d) {
  const hasNum = (obj) =>
    Object.values(obj || {}).some((v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)))
  return (
    hasNum(d.tests) ||
    Object.values(d.participation || {}).some((v) => v === true) ||
    hasNum(d.partial_criteria) ||
    hasNum(d.final_criteria)
  )
}
const hasDebt = (s) => Number(s.fin_overdue) > 0
const ocupLabel = (s) => (s.profile_alias === 'we_profile_student' ? 'E' : 'P')
// B2B: la decision vive en el backend (is_b2b de classroomStudentsList),
// que aplica la MISMA regla que el contador del cronograma: doctype B2B, o
// canal B2B con asesor convenio (NY12/JF39) o sin asesor. Un comercial con
// codigo B2B es VENTA — por eso ya no se mira agent_origin aca (fix 17/07:
// la lista contaba 3 B2B donde el cronograma contaba 1).
const isB2bStudent = (s) => s.is_b2b === true
// Etiqueta estilo FICO: "B2B - JF39" (origen + codigo de asesor) cuando hay
// ambos; "B2B" cuando solo hay doctype.
function b2bLabel(s) {
  if (!isB2bStudent(s)) return null
  const origin = (s.agent_origin || '').trim().toUpperCase()
  const code = (s.agent_code || '').trim().toUpperCase()
  if (!origin.includes('B2B')) return 'B2B'
  return code && !origin.includes(code) ? `${origin} - ${code}` : origin
}

async function saveGrades() {
  if (isSavingGrades.value || !dirtyGrades.size) return
  isSavingGrades.value = true
  try {
    const items = [...dirtyGrades]
      .filter((eid) => gradesDraft[eid])
      .map((eid) => {
        const d = gradesDraft[eid]
        // Solo numeros validos: v-model.number deja '' cuando se vacia un input.
        const numMap = (obj) => {
          const out = {}
          for (const [k, v] of Object.entries(obj || {})) {
            if (v === '' || v === null || v === undefined) continue
            const n = Number(v)
            if (Number.isFinite(n)) out[k] = n
          }
          return out
        }
        const boolMap = (obj) => {
          const out = {}
          for (const [k, v] of Object.entries(obj || {})) out[k] = v === true
          return out
        }
        const groupNum = Number(d.group_number)
        return {
          enrollment_id: Number(eid),
          tests: numMap(d.tests),
          participation: boolMap(d.participation),
          partial_criteria: numMap(d.partial_criteria),
          final_criteria: numMap(d.final_criteria),
          group_number: Number.isInteger(groupNum) && groupNum > 0 ? groupNum : null,
          observation: (d.observation || '').trim() || null,
        }
      })
    if (!items.length) return
    const res = await editionService.classroomGradesSave({
      edition_id: editionId.value,
      items,
      user_id: currentUserId.value,
    })
    if (res?.ok) {
      const map = { ...(gradesMap.value || {}) }
      for (const row of res.data || []) {
        map[row.enrollment_id] = row
        iaDraftObs.delete(row.enrollment_id)
      }
      gradesMap.value = map
      dirtyGrades.clear()
      // Re-hidratar drafts: el backend puede devolver filas extra (entregables
      // grupales propagados a companeros de grupo que no se editaron aqui)
      hydrateGradesDraft()
      toast.success(`Notas guardadas (${(res.data || []).length} alumnos)`, { timeout: 2000 })
    } else {
      toast.error(res?.message || 'No se pudieron guardar las notas')
    }
  } catch (err) {
    console.error('Error guardando notas:', err)
    toast.error('Error guardando la lista de notas')
  } finally {
    isSavingGrades.value = false
  }
}

// --- Certificar en Odoo -------------------------------------------------
// Aplica las notas guardadas del ERP a las Evaluaciones de Odoo y corre el
// proceso de certificación masiva completo (cargar → aprobados → PDFs).
const isCertifying = ref(false)
const certCodeOf = (s) => gradesMap.value?.[s.enrollment_id]?.odoo_cert_code || null
async function certifyInOdoo() {
  if (dirtyGrades.size) {
    toast.warning('Guarda los cambios de notas antes de certificar')
    return
  }
  const confirm = await Swal.fire({
    title: '¿Certificar en Odoo?',
    html: 'Se aplicarán las <b>notas guardadas</b> a las Evaluaciones de Odoo y se ejecutará el <b>proceso de certificación masiva</b>.<br>Solo se certifican <b>aprobados sin deuda pendiente</b>.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, certificar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#002060',
  })
  if (!confirm.isConfirmed) return

  isCertifying.value = true
  Swal.fire({
    title: 'Certificando en Odoo...',
    html: 'Aplicando notas y generando certificados.<br>Esto puede tardar unos minutos.',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  })
  try {
    const res = await editionService.classroomOdooCertify({ edition_id: editionId.value })
    if (!res?.ok) {
      Swal.fire({ icon: 'error', title: 'No se pudo certificar', text: res?.message || 'Error desconocido' })
      return
    }
    const d = res.data
    await loadGrades() // refresca la columna Cert. con los códigos recién emitidos
    const warn = []
    if (d.students_with_debt?.length) warn.push(`<b>Excluidos por deuda pendiente (no se certifican):</b> ${d.students_with_debt.join(', ')}`)
    if (d.grades_missing?.length) warn.push(`<b>No encontrados en Odoo (ni por nombre):</b> ${d.grades_missing.join(', ')}`)
    if (d.score_mismatches?.length) warn.push(`<b>Notas que Odoo recalculó distinto:</b><br>${d.score_mismatches.join('<br>')}`)
    if (d.pdf_errors?.length) warn.push(`<b>PDFs con error:</b><br>${d.pdf_errors.join('<br>')}`)
    Swal.fire({
      icon: warn.length ? 'warning' : 'success',
      title: d.new_certificates
        ? `Proceso ${d.process_name || ''} · ${d.new_certificates} certificados nuevos`
        : `Sin certificados nuevos por emitir`,
      html: `
        <div style="text-align:left">
          <p><b>Grupo:</b> ${d.group_name}</p>
          <p><b>Notas aplicadas en Odoo:</b> ${d.grades_applied} alumnos
             ${d.students_without_grades ? `(${d.students_without_grades} sin notas en el ERP)` : ''}</p>
          ${d.matched_by_name ? `<p><b>Vinculados por nombre (sin id previo):</b> ${d.matched_by_name}</p>` : ''}
          ${d.already_certified ? `<p><b>Ya tenían certificado (no se duplican):</b> ${d.already_certified}</p>` : ''}
          <p><b>Certificados del grupo:</b> ${d.certificates_total} · <b>PDFs generados ahora:</b> ${d.pdfs_generated}</p>
          ${warn.length ? `<hr><p>${warn.join('</p><p>')}</p>` : ''}
        </div>`,
      width: 640,
    })
  } catch (err) {
    console.error('Error certificando en Odoo:', err)
    Swal.fire({ icon: 'error', title: 'Error certificando en Odoo', text: err?.response?.data?.message || err.message })
  } finally {
    isCertifying.value = false
  }
}

// --- Exportar CSV de la lista de notas ---------------------------------
// Genera el archivo en el cliente con los datos ya cargados en la tabla
// (mismo mecanismo de descarga blob que el "Exportar aula" de FICO, pero
// sin modal ni llamada extra al backend). Exporta TODOS los alumnos del
// aula, ignorando busqueda/filtros activos.
function exportNotasCsv() {
  if (!students.value.length) return
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = [
    'N', 'Apellidos y nombres', 'Email', 'Celular', 'DNI', 'Ocup.', 'Mod.', 'Seguimiento', 'B2B', 'Beca', 'Membresia',
    ...sessionNumbers.value.map((n) => `Test S${n}`), 'TEST',
    ...sessionNumbers.value.map((n) => `Part. S${n}`), 'PTS',
    'PARCIAL', 'FINAL', 'NOTA FINAL', 'RESULTADO', 'GRUPO', 'OBSERVACION',
  ]
  const rows = students.value.map((s, idx) => {
    const d = draftFor(s)
    const graded = hasAnyGrade(d)
    const parents = s.parent_codes?.length ? s.parent_codes : (s.parent_code ? [s.parent_code] : [])
    const seg = parents.join(' / ') || typeStatusBadge(s.type_status_alias)?.label || ''
    return [
      String(idx + 1).padStart(2, '0'),
      apellidosNombres(s),
      s.email || '',
      // ponytail: Excel se come el "+51" y los ceros a la izquierda si lo lee
      // como numero; el prefijo tab lo fuerza a texto.
      s.phone ? `\t${s.phone}` : '',
      s.dni || '',
      ocupLabel(s),
      modalityLabel(s),
      seg,
      b2bLabel(s) || '',
      s.is_beca ? 'BECA' : '',
      s.membership_active ? s.membership_tier_name : '',
      ...sessionNumbers.value.map((n) => d.tests[String(n)] ?? ''),
      testScore(d),
      ...sessionNumbers.value.map((n) => (d.participation[String(n)] === true ? 'X' : '')),
      partScore(d),
      partialScore(d),
      finalDelivScore(d),
      graded ? finalGrade(d) : '',
      graded ? (finalGrade(d) >= GRADE_RULES.PASS_THRESHOLD ? 'APROBADO' : 'DESAPROBADO') : '',
      d.group_number ?? '',
      d.observation || '',
    ]
  })
  // BOM para que Excel abra los acentos en UTF-8 correctamente.
  const csv = '\ufeff' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `notas_${aula.value?.global_code || editionId.value}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('Descarga lista.')
}

// --- Importar notas finales (aulas que aun viven en el Google Sheet) ----
// Modal simple: lista de alumnos + una casilla de NOTA FINAL (0-20). No se
// interpreta la metodologia del Sheet: la nota digitada se replica en tests,
// PP y PF (los pesos suman 1.0 y participacion queda como este) para que la
// NOTA FINAL calculada sea exactamente esa. Sin endpoint nuevo: rellena
// gradesDraft + dirty y se persiste con el "Guardar cambios" de siempre.
const showCsvMenu = ref(false)
const showImportModal = ref(false)
const importGrades = reactive({}) // enrollment_id -> texto del input

function openImportModal() {
  for (const k of Object.keys(importGrades)) delete importGrades[k]
  showImportModal.value = true
}

const parseNota = (v) => {
  const raw = String(v ?? '').trim().replace(',', '.')
  if (raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  // En el Sheet a veces ponen 21 a los que destacan; la escala tope es 20,
  // asi que todo lo que exceda se importa como 20 en vez de rechazarse.
  return Math.min(n, 20)
}

const importCount = computed(
  () => students.value.filter((s) => parseNota(importGrades[s.enrollment_id]) != null).length,
)

// Pegar la columna completa copiada del Sheet: si el texto pegado trae varias
// lineas, se reparte hacia abajo desde el alumno donde se pega (misma logica
// que pegar en el propio Sheet). Lineas vacias no tocan a ese alumno.
function onImportPaste(e, startIdx) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!/[\n\t]/.test(text)) return // pegado de un solo valor: comportamiento normal
  e.preventDefault()
  const lines = text.replace(/\r/g, '').split('\n')
  lines.forEach((line, i) => {
    const s = students.value[startIdx + i]
    if (!s) return
    // si copiaron varias columnas, tomamos la primera celda; coma decimal -> punto
    const val = line.split('\t')[0].trim().replace(',', '.')
    if (val !== '') importGrades[s.enrollment_id] = val
  })
}

// Nota actual del alumno como referencia en el modal ('--' si no tiene).
function currentFinalLabel(s) {
  const d = gradesDraft[s.enrollment_id]
  return d && hasAnyGrade(d) ? fmtNota(finalGrade(d)) : '--'
}

function applyImport() {
  let applied = 0
  for (const s of students.value) {
    const n = parseNota(importGrades[s.enrollment_id])
    if (n == null) continue
    const d = draftFor(s)
    for (const sn of sessionNumbers.value) d.tests[String(sn)] = n
    for (const c of PARTIAL_CRITERIA) d.partial_criteria[c.key] = n
    for (const c of FINAL_CRITERIA) d.final_criteria[c.key] = n
    markDirty(s.enrollment_id)
    applied += 1
  }
  if (!applied) return
  showImportModal.value = false
  toast.success(`${applied} alumnos actualizados. Revisa la tabla y pulsa "Guardar cambios".`, { timeout: 4000 })
}

// --- Observaciones IA (Ollama local via tunel) -------------------------
// El modelo solo produce BORRADORES: entran al draft como filas sucias y se
// persisten con el boton Guardar, siempre tras revision humana.
const isGeneratingObs = ref(false)
const aulaSummaryIa = ref('')
const iaDraftObs = reactive(new Set()) // observaciones IA aun no guardadas

async function generateObservations(enrollmentIds = null) {
  if (isGeneratingObs.value) return
  isGeneratingObs.value = true
  try {
    const res = await editionService.classroomGradesObservations({
      edition_id: editionId.value,
      enrollment_ids: enrollmentIds,
    })
    if (res?.ok) {
      for (const it of res.data?.items || []) {
        if (!gradesDraft[it.enrollment_id]) gradesDraft[it.enrollment_id] = emptyGradeDraft()
        gradesDraft[it.enrollment_id].observation = it.observation
        dirtyGrades.add(it.enrollment_id)
        iaDraftObs.add(it.enrollment_id)
      }
      if (res.data?.aula_summary) aulaSummaryIa.value = res.data.aula_summary
      const nOk = (res.data?.items || []).length
      const nErr = (res.data?.errors || []).length
      toast.success(
        `Observaciones generadas: ${nOk}${nErr ? ` (fallaron ${nErr})` : ''}. Revisa, edita y guarda.`,
        { timeout: 4000 },
      )
    } else {
      toast.error(res?.message || 'No se pudieron generar las observaciones')
    }
  } catch (err) {
    console.error('Error generando observaciones:', err)
    toast.error(err?.response?.data?.message || 'IA local no disponible. Verifica el tunel a Ollama.')
  } finally {
    isGeneratingObs.value = false
  }
}

function copyAulaSummary() {
  navigator.clipboard?.writeText(aulaSummaryIa.value)
  toast.success('Resumen copiado', { timeout: 1200 })
}

const filteredStudents = computed(() => {
  const q = studentQuery.value.trim().toLowerCase()
  return students.value.filter((s) => {
    if (q) {
      const hay = `${s.full_name || ''} ${s.dni || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (studentFilter.value === 'todos') return true
    const d = gradesDraft[s.enrollment_id]
    const graded = d ? hasAnyGrade(d) : false
    const final = d ? finalGrade(d) : 0
    if (studentFilter.value === 'aprobados') return graded && final >= GRADE_RULES.PASS_THRESHOLD
    if (studentFilter.value === 'desaprobados') return !graded || final < GRADE_RULES.PASS_THRESHOLD
    if (studentFilter.value === 'seguimiento') return s.type_status_alias === 'we_enrollment_status_tracking'
    return true
  })
})

// --- Resumenes (formato del sheet oficial), sobre todos los alumnos ----
const gradesSummary = computed(() => {
  const total = students.value.length
  const flex = students.value.filter((s) => s.modality_alias === 'we_insc_modality_flexible').length
  const tracking = students.value.filter((s) => s.type_status_alias === 'we_enrollment_status_tracking').length
  const certified = students.value.filter((s) => s.has_certificate === true).length
  let approved = 0
  for (const s of students.value) {
    const d = gradesDraft[s.enrollment_id]
    if (d && hasAnyGrade(d) && finalGrade(d) >= GRADE_RULES.PASS_THRESHOLD) approved += 1
  }
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  return {
    total,
    regular: total - flex,
    flex,
    tracking,
    certified,
    approved,
    failed: total - approved,
    pct,
  }
})

// Por sesion: cuantos alumnos tienen puntos de test y cuantos participaron.
const sessionStats = computed(() =>
  sessionNumbers.value.map((n) => {
    let withTest = 0
    let participated = 0
    for (const s of students.value) {
      const d = gradesDraft[s.enrollment_id]
      if (!d) continue
      if (Number(d.tests?.[String(n)]) > 0) withTest += 1
      if (d.participation?.[String(n)] === true) participated += 1
    }
    const total = students.value.length || 1
    return {
      session: n,
      withTest,
      withTestPct: Math.round((withTest / total) * 100),
      participated,
      participatedPct: Math.round((participated / total) * 100),
    }
  }),
)

// Primeros puestos: top 3 por nota final entre alumnos con alguna nota.
const topStudents = computed(() => {
  return students.value
    .map((s) => {
      const d = gradesDraft[s.enrollment_id]
      return d && hasAnyGrade(d) ? { s, final: finalGrade(d) } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.final - a.final)
    .slice(0, 3)
})

// Promedio de nota final del aula (solo alumnos con alguna nota), para el KPI.
const aulaGradeAverage = computed(() => {
  const finals = students.value
    .map((s) => {
      const d = gradesDraft[s.enrollment_id]
      return d && hasAnyGrade(d) ? finalGrade(d) : null
    })
    .filter((v) => v != null)
  if (!finals.length) return null
  return round2g(finals.reduce((a, b) => a + b, 0) / finals.length)
})

const gradesColspan = computed(() => 2 * (sessionsTotal.value || 0) + 14)

const TYPE_STATUS_BADGE = {
  we_enrollment_status_tracking: { label: 'SEG', cls: 'tb-seg' },
  we_enrollment_status_reprogrammed: { label: 'RP', cls: 'tb-rp' },
  we_enrollment_status_course_changed: { label: 'CC', cls: 'tb-cc' },
  we_enrollment_status_observed: { label: 'OBS', cls: 'tb-obs' },
  we_inscription_way_act: { label: 'ACT', cls: 'tb-act' },
}
const typeStatusBadge = (alias) => TYPE_STATUS_BADGE[alias]

function modalityLabel(s) {
  const a = s.modality_alias
  if (a === 'we_insc_modality_flexible') return 'FLEX'
  if (a === 'we_insc_modality_regular' || a === 'we_insc_modality_normal') return 'REGULAR'
  return s.modality_label || '--'
}

function initialsOf(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function handleOfName(name) {
  if (!name) return ''
  const first = (name.split(/\s+/)[0] || '').toLowerCase()
  return '@' + first.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Acta de notas: apellidos primero. Arma "APELLIDOS, NOMBRES" con los campos
// separados del backend; cae a full_name si por algun motivo no vienen.
function apellidosNombres(s) {
  const ap = [s.last_name, s.mother_last_name].filter(Boolean).join(' ').trim()
  const no = (s.first_name || '').trim()
  if (ap && no) return `${ap}, ${no}`
  return ap || no || s.full_name || ''
}

// =====================================================================
// AUDITORIA: rubrica por sesion
// =====================================================================
const RUBRIC = [
  {
    key: 'interaction',
    label: 'Interaccion con el alumno',
    items: [
      { key: 'interaction.1', label: 'Brinda oportunidades de participacion' },
      { key: 'interaction.2', label: 'Resuelve dudas durante la sesion' },
      { key: 'interaction.3', label: 'Responde consultas por el canal de WhatsApp' },
      { key: 'interaction.4', label: 'Utiliza plantilla de contacto al alumno' },
      { key: 'interaction.5', label: 'Acompanamiento continuo para monitorear niveles de aprendizaje de los estudiantes' },
    ],
  },
  {
    key: 'content',
    label: 'Contenido y dinamica de clase',
    items: [
      { key: 'content.1', label: 'El material visual debe estar actualizado en un tiempo no mas de 5 anos de antiguedad' },
      { key: 'content.2', label: 'Refuerza el uso de las carpetas de M. de Revision y M. Complementario' },
      { key: 'content.3', label: 'El docente explica las fechas establecidas de entrega de proyectos' },
      { key: 'content.4', label: 'Comparte por lo menos 1 video relativo al tema' },
      { key: 'content.5', label: 'Desarrolla la sesion a traves de taller y/o casos practicos' },
      { key: 'content.6', label: 'Evalua lo aprendido por medio de una herramienta tecnologica en cada sesion' },
    ],
  },
  {
    key: 'environment',
    label: 'Entorno',
    items: [
      { key: 'environment.1', label: 'Equipamiento tecnico adecuado (conexion a internet, audio en buen estado y camara encendida en todo momento de la sesion)' },
      { key: 'environment.2', label: 'Puntualidad al ingreso y culminacion de la sesion' },
      { key: 'environment.3', label: 'Audio claro (sin interferencias)' },
    ],
  },
  {
    key: 'communication',
    label: 'Comunicacion academica',
    items: [
      { key: 'communication.1', label: 'Responde a notificaciones' },
      { key: 'communication.2', label: 'Envia el pantallazo de apertura de sesion' },
      { key: 'communication.3', label: 'Registra la asistencia durante la sesion' },
      { key: 'communication.4', label: 'Comunica si tiene alguna duda o consulta, o le falta un recurso por lo menos 48 horas antes de empezar la sesion' },
      { key: 'communication.5', label: 'Notifica la actualizacion de la videoclase' },
      { key: 'communication.6', label: 'El docente cumple con la fecha establecida de entrega de notas' },
    ],
  },
]

const RUBRIC_TOTAL_ITEMS = RUBRIC.reduce((a, c) => a + c.items.length, 0)

// Mapeo IA -> rubrica binaria. Cada item de las 2 primeras categorias se
// asocia a uno o varios criterios del reporte IA (1-9). Si el promedio de
// scores asociados >= AI_CHECK_THRESHOLD, el item se marca. Items no
// detectables por IA (WhatsApp, plantilla, carpetas, video) -> aiCriteria
// vacio: el auto-fill los deja como estaban (decision manual del auditor).
const AI_CHECK_THRESHOLD = 3
const IA_TO_RUBRIC = {
  'interaction.1': { criterios: [7] },        // Engagement -> oportunidades de participacion
  'interaction.2': { criterios: [7, 6] },     // Engagement + Claridad -> resuelve dudas
  'interaction.3': { criterios: [] },         // WhatsApp -> manual
  'interaction.4': { criterios: [] },         // plantilla contacto -> manual
  'interaction.5': { criterios: [7], min: 4 },// acompanamiento continuo -> exige score alto
  'content.1':     { criterios: [4] },        // Casos y ejemplos -> material visual
  'content.2':     { criterios: [] },         // carpetas M. Revision -> manual
  'content.3':     { criterios: [2] },        // Estructura -> explica fechas de entrega
  'content.4':     { criterios: [] },         // video -> manual (no inferible)
  'content.5':     { criterios: [5, 4] },     // Talleres + Casos -> taller/casos practicos
  'content.6':     { criterios: [5], min: 4 },// Talleres -> herramienta tecnologica
}

function aiScoreMap(report) {
  const m = {}
  for (const c of (report?.criterios || [])) m[c.id] = Number(c.score) || 0
  return m
}

function applyAiAutoFill(report) {
  const scores = aiScoreMap(report)
  let applied = 0
  for (const [itemKey, mapDef] of Object.entries(IA_TO_RUBRIC)) {
    const ids = mapDef.criterios
    if (!ids.length) continue
    const vals = ids.map((id) => scores[id]).filter((v) => Number.isFinite(v) && v > 0)
    if (!vals.length) continue
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const threshold = mapDef.min || AI_CHECK_THRESHOLD
    if (avg >= threshold) {
      sessionDraft[itemKey] = true
      applied += 1
    }
  }
  return applied
}

// auditMap: sessionNumber -> { criteria: { 'interaction.1': true, ... }, updated_at, updated_by }
const auditMap = ref(null)
const selectedSession = ref(1)
const sessionDraft = reactive({})
const isSavingSession = ref(false)
const lastSavedAt = ref(null)

async function loadAudit() {
  try {
    const rows = await editionService.classroomAuditGet({ edition_id: editionId.value })
    const map = {}
    for (const r of rows || []) map[r.session_number] = r
    auditMap.value = map
    hydrateDraft(selectedSession.value)
  } catch (err) {
    console.error('Error cargando rubrica:', err)
    toast.error('Error cargando rubrica de auditoria')
    auditMap.value = {}
  }
}

function hydrateDraft(sessionNum) {
  for (const k of Object.keys(sessionDraft)) delete sessionDraft[k]
  const saved = auditMap.value?.[sessionNum]?.criteria || {}
  for (const cat of RUBRIC) {
    for (const it of cat.items) sessionDraft[it.key] = !!saved[it.key]
  }
}

function selectSession(n) {
  selectedSession.value = n
  hydrateDraft(n)
  lastSavedAt.value = auditMap.value?.[n]?.updated_at || null
}

async function saveSession() {
  if (isSavingSession.value) return
  isSavingSession.value = true
  try {
    const payload = {
      edition_id: editionId.value,
      session_number: selectedSession.value,
      criteria: { ...sessionDraft },
      user_id: currentUserId.value,
    }
    const res = await editionService.classroomAuditSave(payload)
    if (res?.ok) {
      // Merge sobre la entrada previa: preserva ai_report / ai_metadata si
      // por algun motivo el backend devolvio una fila parcial. Defensivo.
      const prev = auditMap.value?.[selectedSession.value] || {}
      auditMap.value = {
        ...(auditMap.value || {}),
        [selectedSession.value]: { ...prev, ...res.row },
      }
      lastSavedAt.value = res.row?.updated_at || new Date().toISOString()
      toast.success(`Sesion ${selectedSession.value} guardada`, { timeout: 1500 })
    } else {
      toast.error(res?.message || 'No se pudo guardar la rubrica')
    }
  } catch (err) {
    console.error('Error guardando rubrica:', err)
    toast.error('Error guardando rubrica')
  } finally {
    isSavingSession.value = false
  }
}

function categoryScore(cat) {
  return cat.items.reduce((a, it) => a + (sessionDraft[it.key] ? 1 : 0), 0)
}
const totalScore = computed(() =>
  RUBRIC.reduce((a, cat) => a + categoryScore(cat), 0),
)
const totalProgress = computed(() =>
  RUBRIC_TOTAL_ITEMS ? Math.round((totalScore.value / RUBRIC_TOTAL_ITEMS) * 100) : 0,
)

function sessionDotCls(n) {
  const r = auditMap.value?.[n]
  if (!r) return 'sdot-empty'
  const criteria = r.criteria || {}
  const filled = Object.values(criteria).filter(Boolean).length
  if (filled === 0 && !r.ai_report) return 'sdot-empty'
  if (filled >= RUBRIC_TOTAL_ITEMS) return 'sdot-done'
  return 'sdot-partial'
}

// ---------------------------------------------------------------------
// IA: modal de carga + reporte
// ---------------------------------------------------------------------
const showAiModal = ref(false)
const aiTranscript = ref('')
const aiSyllabusFile = ref(null)
const isRunningAi = ref(false)
const aiError = ref('')

function openAiModal() {
  aiError.value = ''
  aiTranscript.value = ''
  aiSyllabusFile.value = null
  showAiModal.value = true
}

// Click handler del boton principal. Si la sesion ya tiene un ai_report
// persistido, no se vuelve a invocar a la IA: se refresca el panel desde BD
// y se notifica al usuario. Asi se evita que tres clicks generen tres
// puntuaciones distintas para el mismo caso. Solo se abre el modal de
// generacion cuando no existe analisis previo en BD.
async function onAnalyzeClick() {
  if (currentAiReport.value) {
    await loadAudit()
    toast.info('Analisis IA cargado desde base de datos (no se regenero).', { timeout: 2500 })
    return
  }
  openAiModal()
}

function onSyllabusChange(e) {
  const f = e?.target?.files?.[0]
  aiSyllabusFile.value = f || null
}

// Convierte VTT (WebVTT, formato de subtitulos de Teams/Zoom/YouTube) al
// formato `[HH:MM:SS] texto` que espera el parser del FastAPI. Toma solo
// el primer timestamp de cada cue (start) y concatena el texto. Filtra los
// nombres de hablante "ANGEL: ..." si vienen al inicio.
function vttToTimestamped(vttText) {
  const lines = vttText.split(/\r?\n/)
  const out = []
  let i = 0
  // Saltar header WEBVTT y notas/styles
  while (i < lines.length && !/^\d{1,2}:\d{2}/.test(lines[i])) i++
  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:[.,]\d+)?\s*-->/)
    if (m) {
      const hh = m[1].padStart(2, '0')
      const mm = m[2]
      const ss = m[3]
      i++
      const textParts = []
      while (i < lines.length && lines[i].trim() !== '') {
        let t = lines[i].replace(/<[^>]+>/g, '').trim()
        t = t.replace(/^[A-Z][A-Z ]+:\s*/, '')
        if (t) textParts.push(t)
        i++
      }
      if (textParts.length) {
        out.push(`[${hh}:${mm}:${ss}] ${textParts.join(' ')}`)
      }
    }
    i++
  }
  return out.join('\n')
}

function onTranscriptFileChange(e) {
  const f = e?.target?.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = String(ev.target?.result || '')
    const name = (f.name || '').toLowerCase()
    if (name.endsWith('.vtt') || /^WEBVTT/i.test(text.slice(0, 20))) {
      const converted = vttToTimestamped(text)
      if (!converted.trim()) {
        aiError.value = 'No se pudieron extraer cues del archivo VTT'
        return
      }
      aiTranscript.value = converted
      toast.success(`VTT cargado: ${converted.split('\n').length} segmentos`, { timeout: 2000 })
    } else {
      aiTranscript.value = text
      toast.success(`Transcript cargado (${(text.length / 1024).toFixed(1)} KB)`, { timeout: 2000 })
    }
  }
  reader.onerror = () => { aiError.value = 'No se pudo leer el archivo' }
  reader.readAsText(f, 'utf-8')
  // Reset para permitir re-subir el mismo archivo
  e.target.value = ''
}

async function runAiAudit() {
  if (isRunningAi.value) return
  if (!aiTranscript.value.trim()) {
    aiError.value = 'Pega el transcript con timestamps [HH:MM:SS]'
    return
  }
  if (!aiSyllabusFile.value) {
    aiError.value = 'Sube la imagen del syllabus'
    return
  }
  isRunningAi.value = true
  aiError.value = ''
  try {
    const res = await editionService.classroomAuditRunAi({
      edition_id: editionId.value,
      session_number: selectedSession.value,
      transcript_text: aiTranscript.value,
      syllabus_image: aiSyllabusFile.value,
    })
    if (!res?.ok) {
      aiError.value = res?.message || 'Error desconocido'
      return
    }
    // Mergea la fila devuelta al map (mantiene criteria manuales si existian)
    const prev = auditMap.value?.[selectedSession.value] || {}
    auditMap.value = {
      ...(auditMap.value || {}),
      [selectedSession.value]: { ...prev, ...res.row },
    }
    const applied = applyAiAutoFill(res.row?.ai_report)
    toast.success(`IA analizada. ${applied} criterios marcados automaticamente`)
    showAiModal.value = false
  } catch (err) {
    console.error(err)
    // El backend responde 400 con { ok:false, message:'...' }. Axios tira
    // esa respuesta como excepcion, asi que el mensaje real esta en
    // err.response.data.message, no en err.message.
    const backendMsg = err?.response?.data?.message
    aiError.value = backendMsg || err?.message || 'Error inesperado'
  } finally {
    isRunningAi.value = false
  }
}

const currentAiReport = computed(() => auditMap.value?.[selectedSession.value]?.ai_report || null)
const currentAiMeta = computed(() => auditMap.value?.[selectedSession.value]?.ai_metadata || null)
const currentAiGeneratedAt = computed(() => auditMap.value?.[selectedSession.value]?.ai_generated_at || null)

function aiScoreClass(score) {
  if (score >= 4) return 'aisc-good'
  if (score >= 3) return 'aisc-ok'
  if (score >= 2) return 'aisc-warn'
  return 'aisc-bad'
}

// Convierte la puntuacion global IA (escala interna 1-5) a la escala academica
// peruana 0-20 que ve el usuario. Devuelve '--' si no hay valor o no es numerico.
function toScore20(score1to5) {
  const n = Number(score1to5)
  if (!Number.isFinite(n)) return '--'
  return (n * 4).toFixed(1)
}

// Nota numerica (Number | null) en escala /20, lista para promediar/comparar.
// null si el dato no esta disponible (no rompe los reduce).
function toScore20Num(score1to5) {
  const n = Number(score1to5)
  return Number.isFinite(n) ? n * 4 : null
}

// Convierte el % de rubrica manual (0-100) a la escala /20.
function manualPctToScore20(pct) {
  const n = Number(pct)
  return Number.isFinite(n) ? (n / 100) * 20 : null
}

// Formula consolidada IA-dominante: la IA es exhaustiva y reproducible
// (analiza transcript + syllabus con 9 criterios), la rubrica manual valida.
// Si solo hay una fuente, se usa esa (ver consolidatedScore).
const CONSOLIDATED_WEIGHT_IA = 0.7
const CONSOLIDATED_WEIGHT_MANUAL = 0.3
function consolidatedScore(noteIa20, noteManual20) {
  const ia = Number.isFinite(noteIa20) ? noteIa20 : null
  const man = Number.isFinite(noteManual20) ? noteManual20 : null
  if (ia == null && man == null) return null
  if (ia == null) return man
  if (man == null) return ia
  return ia * CONSOLIDATED_WEIGHT_IA + man * CONSOLIDATED_WEIGHT_MANUAL
}

function countCriteriaTrue(criteria) {
  if (!criteria || typeof criteria !== 'object') return 0
  return Object.values(criteria).filter(Boolean).length
}

// Fila por sesion para el reporte consolidado. Cada elemento incluye:
//   - n: numero de sesion
//   - manualMarked / manualTotal / manualPct
//   - aiScore20 (Number|null)
//   - manualScore20 (Number|null)
//   - consolidated20 (Number|null) — segun la formula configurable arriba
const generalRows = computed(() => {
  const total = sessionsTotal.value || 0
  const rows = []
  for (let n = 1; n <= total; n++) {
    const row = auditMap.value?.[n] || null
    const marked = countCriteriaTrue(row?.criteria)
    const manualPct = RUBRIC_TOTAL_ITEMS
      ? Math.round((marked / RUBRIC_TOTAL_ITEMS) * 100) : 0
    const manualScore20 = row?.criteria
      ? manualPctToScore20(manualPct) : null
    const aiScore20 = toScore20Num(row?.ai_report?.metricas_rapidas?.puntuacion_global)
    rows.push({
      n,
      manualMarked: marked,
      manualTotal: RUBRIC_TOTAL_ITEMS,
      manualPct,
      manualScore20,
      aiScore20,
      hasManual: !!row?.criteria && marked > 0,
      hasAi: !!row?.ai_report,
      consolidated20: consolidatedScore(aiScore20, manualScore20),
    })
  }
  return rows
})

function avg(nums) {
  const valid = nums.filter((v) => Number.isFinite(v))
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

const generalAulaAverages = computed(() => {
  const rows = generalRows.value
  return {
    ai20:           avg(rows.map((r) => r.aiScore20)),
    manual20:       avg(rows.map((r) => r.manualScore20)),
    consolidated20: avg(rows.map((r) => r.consolidated20)),
    aiSessions:     rows.filter((r) => r.hasAi).length,
    manualSessions: rows.filter((r) => r.hasManual).length,
  }
})

// =====================================================================
// AUDITORIA: rediseno visual (scorecard consolidado + subvistas)
// =====================================================================
// Subvista activa dentro del tab Auditoria y orden de los criterios IA.
const auditView = ref('resumen') // 'resumen' | 'ia' | 'academica'
const iaSort = ref('orden')      // 'orden' | 'bajo' | 'alto'

// Nivel de color 1..5 segun una nota /20 (mismos cortes que el diseno).
function notaLevel(n) {
  if (!Number.isFinite(n)) return 3
  const r = n / 20
  if (r < 0.4) return 1
  if (r < 0.55) return 2
  if (r < 0.7) return 3
  if (r < 0.85) return 4
  return 5
}
// Nivel 1..5 directo del score IA de un criterio (1-5).
function scoreLevel(s) {
  return Math.max(1, Math.min(5, Math.round(Number(s) || 0)))
}
// Formatea una nota: entero sin decimales, resto con 1 decimal, '--' si no hay.
function fmtNota(n) {
  if (!Number.isFinite(n)) return '--'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

// Geometria del anillo (r=40) y ancho de barras a partir de una nota /20.
const RING_CIRC = 2 * Math.PI * 40
function ringOffset(note20) {
  const pct = Number.isFinite(note20) ? Math.max(0, Math.min(1, note20 / 20)) : 0
  return RING_CIRC * (1 - pct)
}
function barWidth(note20) {
  const pct = Number.isFinite(note20) ? Math.max(0, Math.min(1, note20 / 20)) * 100 : 0
  return pct + '%'
}

// Notas de la sesion seleccionada. El Area Academica usa el draft en vivo
// (totalScore) para que el scorecard reaccione al marcar checkboxes.
const currentIaScore20 = computed(() =>
  toScore20Num(currentAiReport.value?.metricas_rapidas?.puntuacion_global),
)
const currentAcScore20 = computed(() =>
  RUBRIC_TOTAL_ITEMS ? (totalScore.value / RUBRIC_TOTAL_ITEMS) * 20 : null,
)
const currentConsolidated20 = computed(() =>
  consolidatedScore(currentIaScore20.value, currentAcScore20.value),
)
// "Firme" cuando la rubrica del area academica esta completa al 100%.
const currentFirm = computed(() => totalScore.value === RUBRIC_TOTAL_ITEMS)

// Pesos mostrados en el scorecard (derivados de la formula consolidada).
const PESO_IA_PCT = Math.round(CONSOLIDATED_WEIGHT_IA * 100)
const PESO_MANUAL_PCT = Math.round(CONSOLIDATED_WEIGHT_MANUAL * 100)

// Nota consolidada persistida por sesion para la tira (reusa generalRows).
function sessionConsolidatedNote(n) {
  const row = generalRows.value.find((r) => r.n === n)
  return row ? row.consolidated20 : null
}

// Criterios IA ordenados segun el control de orden.
const sortedAiCriterios = computed(() => {
  const list = [...(currentAiReport.value?.criterios || [])]
  if (iaSort.value === 'bajo') list.sort((a, b) => (a.score || 0) - (b.score || 0))
  if (iaSort.value === 'alto') list.sort((a, b) => (b.score || 0) - (a.score || 0))
  return list
})

// Comparacion S1..N para el mini-grafico de la vista Resumen.
const compareSessions = computed(() =>
  generalRows.value.map((r) => ({
    n: r.n,
    ia20: Number.isFinite(r.aiScore20) ? r.aiScore20 : null,
    ac20: Number.isFinite(r.manualScore20) ? r.manualScore20 : null,
    hasIa: r.hasAi,
  })),
)

const currentMetricas = computed(() => currentAiReport.value?.metricas_rapidas || {})

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Paleta de 5 niveles (valores claros, fijos para que el PDF no dependa del tema).
const PDF_PALETTE = {
  1: ['#fde8e6', '#c0362c'], 2: ['#fdeccb', '#a96208'], 3: ['#dde8fd', '#2256c9'],
  4: ['#d9f3df', '#1d7a40'], 5: ['#cdf1e4', '#0a7a5c'],
}

// Exporta un reporte concreto de la sesion (para entregar al docente) abriendo
// un documento imprimible autocontenido; el navegador lo guarda como PDF. Sin
// dependencias: reutiliza los datos ya cargados del reporte IA y la rubrica.
function exportSessionPdf() {
  const report = currentAiReport.value
  if (!report) {
    toast.info('Genera primero el analisis IA para exportar el reporte.')
    return
  }
  const a = aula.value || {}
  const m = report.metricas_rapidas || {}
  const programa = a.program_abreviature || a.program_name || a.program || 'Programa'
  const edicion = a.global_code || a.edition_code || ''
  const docente = a.instructor || '--'

  const scoreBox = (label, note20, accent) => {
    const lvl = notaLevel(note20)
    const fg = accent ? '#3f3bd6' : PDF_PALETTE[lvl][1]
    return `<div class="sbox"><div class="sl">${label}</div>
      <div class="sv" style="color:${fg}">${fmtNota(note20)}<small>/ 20</small></div></div>`
  }
  const crits = (report.criterios || []).map((c) => {
    const [bg, fg] = PDF_PALETTE[scoreLevel(c.score)]
    const ts = (c.evidencia_timestamps || []).map((t) => `<span class="ts">${escapeHtml(t)}</span>`).join('')
    return `<div class="crit">
      <div class="crit-h"><b>#${c.id} ${escapeHtml(c.nombre)}</b>
        <span class="cb" style="background:${bg};color:${fg}">${c.score}/5</span></div>
      <p>${escapeHtml(c.comentario)}</p>${ts ? `<div class="tss">${ts}</div>` : ''}</div>`
  }).join('')
  const liList = (arr) => (arr || []).map(
    (x) => `<li><b>${escapeHtml(x.titulo)}.</b> ${escapeHtml(x.detalle)}</li>`,
  ).join('')
  const rubric = RUBRIC.map((cat) => {
    const done = cat.items.filter((it) => sessionDraft[it.key]).length
    const items = cat.items.map((it) => {
      const on = !!sessionDraft[it.key]
      return `<div class="ri ${on ? 'on' : 'off'}"><span class="rb">${on ? '&#10003;' : ''}</span>${escapeHtml(it.label)}</div>`
    }).join('')
    return `<div class="rcat"><div class="rcat-h"><b>${escapeHtml(cat.label)}</b>
      <span>${done}/${cat.items.length}</span></div>${items}</div>`
  }).join('')

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Reporte Auditoria - ${escapeHtml(programa)} - Sesion ${selectedSession.value}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1b1917; margin: 0; padding: 32px 36px; font-size: 12px; }
  .hd { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 14px; margin-bottom: 18px; }
  .hd .eyebrow { font-size: 10px; letter-spacing: .12em; color: #6366f1; font-weight: 700; }
  .hd h1 { font-size: 20px; margin: 4px 0 6px; }
  .hd .meta { font-size: 11px; color: #57534e; }
  .hd .meta b { color: #1b1917; }
  .hd .badge-we { font-size: 11px; font-weight: 800; color: #6366f1; text-align: right; }
  .scores { display: flex; gap: 12px; margin-bottom: 18px; }
  .sbox { flex: 1; border: 1px solid #e8e6e3; border-radius: 10px; padding: 12px 14px; }
  .sbox.main { background: #f5f4ff; border-color: #d7d5fb; }
  .sl { font-size: 10px; letter-spacing: .06em; color: #8d877f; font-weight: 700; }
  .sv { font-size: 26px; font-weight: 800; margin-top: 2px; }
  .sv small { font-size: 11px; color: #8d877f; font-weight: 600; margin-left: 3px; }
  .row2 { display: flex; gap: 18px; font-size: 11px; color: #57534e; margin-bottom: 18px; }
  .row2 b { color: #1b1917; }
  h2 { font-size: 13px; margin: 22px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #e8e6e3; }
  .crit { border: 1px solid #e8e6e3; border-radius: 9px; padding: 10px 12px; margin-bottom: 9px; break-inside: avoid; }
  .crit-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .crit-h b { font-size: 12px; }
  .cb { font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 8px; }
  .crit p { margin: 0; font-size: 11px; line-height: 1.5; color: #44403c; }
  .tss { margin-top: 6px; }
  .ts { display: inline-block; font-size: 10px; background: #f1efed; border: 1px solid #e8e6e3; border-radius: 5px; padding: 1px 6px; margin: 2px 4px 0 0; color: #57534e; }
  .fo { display: flex; gap: 16px; }
  .fo > div { flex: 1; }
  .fo h3 { font-size: 12px; margin: 0 0 6px; }
  .fo ul { margin: 0; padding-left: 16px; }
  .fo li { font-size: 11px; line-height: 1.5; margin-bottom: 5px; }
  .rgrid { display: flex; flex-wrap: wrap; gap: 12px; }
  .rcat { flex: 1 1 46%; border: 1px solid #e8e6e3; border-radius: 9px; overflow: hidden; break-inside: avoid; }
  .rcat-h { display: flex; justify-content: space-between; background: #faf9f8; padding: 7px 11px; font-size: 11px; border-bottom: 1px solid #e8e6e3; }
  .ri { font-size: 10.5px; padding: 6px 11px; border-top: 1px solid #f1efed; display: flex; gap: 8px; align-items: flex-start; line-height: 1.4; }
  .ri:first-of-type { border-top: none; }
  .rb { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #d8d4d0; flex: none; text-align: center; line-height: 12px; font-size: 10px; }
  .ri.on .rb { background: #6366f1; border-color: #6366f1; color: #fff; }
  .ri.off { color: #8d877f; }
  .ft { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e8e6e3; font-size: 10px; color: #8d877f; }
  @page { margin: 14mm; }
</style></head><body>
  <div class="hd">
    <div>
      <div class="eyebrow">REPORTE DE AUDITORIA PEDAGOGICA</div>
      <h1>${escapeHtml(programa)} &middot; Sesion ${selectedSession.value}</h1>
      <div class="meta">Docente: <b>${escapeHtml(docente)}</b>${edicion ? ` &middot; Edicion: <b>${escapeHtml(edicion)}</b>` : ''}
        ${currentAiGeneratedAt.value ? ` &middot; Analisis IA: <b>${escapeHtml(formatDateTime(currentAiGeneratedAt.value))}</b>` : ''}</div>
    </div>
    <div class="badge-we">WE Educacion<br>Ejecutiva</div>
  </div>

  <div class="scores">
    <div class="sbox main">${scoreBox('NOTA CONSOLIDADA', currentConsolidated20.value, true)}</div>
    ${scoreBox('AUDITORIA IA', currentIaScore20.value)}
    ${scoreBox('AREA ACADEMICA', currentAcScore20.value)}
  </div>
  <div class="row2">
    <span>Veredicto: <b>${escapeHtml(score20Label(currentConsolidated20.value))}</b></span>
    <span>Balance practica/teoria: <b>${m.porcentaje_practica ?? '--'}% / ${m.porcentaje_teoria ?? '--'}%</b></span>
    <span>Temas cubiertos: <b>${m.temas_cubiertos ?? '--'} / ${m.temas_totales ?? '--'}</b></span>
    <span>Rubrica academica: <b>${totalScore.value} / ${RUBRIC_TOTAL_ITEMS}</b></span>
  </div>

  <h2>Criterios evaluados por IA</h2>
  ${crits}

  ${(report.fortalezas_top3?.length || report.oportunidades_top5?.length) ? `<h2>Fortalezas y oportunidades</h2>
  <div class="fo">
    <div><h3>Fortalezas</h3><ul>${liList(report.fortalezas_top3)}</ul></div>
    <div><h3>Oportunidades</h3><ul>${liList(report.oportunidades_top5)}</ul></div>
  </div>` : ''}

  <h2>Evaluacion del area academica</h2>
  <div class="rgrid">${rubric}</div>

  <div class="ft">Generado el ${escapeHtml(formatDateTime(new Date().toISOString()))} &middot;
    Nota consolidada = IA ${PESO_IA_PCT}% + Area academica ${PESO_MANUAL_PCT}%. Si solo hay una fuente, se usa esa.</div>
</body></html>`

  const w = window.open('', '_blank', 'width=920,height=1000')
  if (!w) {
    toast.error('Permite las ventanas emergentes para exportar el PDF.')
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { try { w.print() } catch { /* el usuario puede imprimir manualmente */ } }, 400)
}

// =====================================================================
// EVOLUCION POR SESION (chart) + COBERTURA DE MUESTRA
// =====================================================================
// Las sesiones sin data se envian como `null` para que ApexCharts las dibuje
// como huecos en la linea. Pasarlas como 0 mentiria visualmente: una sesion
// no evaluada no es lo mismo que una sesion en la que el aula saco 0.
const generalChartSeries = computed(() => {
  const rows = generalRows.value
  return [
    {
      name: 'Consolidada',
      data: rows.map((r) =>
        Number.isFinite(r.consolidated20) ? +r.consolidated20.toFixed(1) : null,
      ),
    },
    {
      name: 'IA',
      data: rows.map((r) =>
        r.hasAi && Number.isFinite(r.aiScore20) ? +r.aiScore20.toFixed(1) : null,
      ),
    },
    {
      name: 'Rubrica manual',
      data: rows.map((r) =>
        r.hasManual && Number.isFinite(r.manualScore20) ? +r.manualScore20.toFixed(1) : null,
      ),
    },
  ]
})

const generalChartOptions = computed(() => ({
  chart: {
    type: 'line',
    height: 320,
    toolbar: { show: false },
    fontFamily: 'inherit',
    animations: { enabled: true, speed: 400 },
    zoom: { enabled: false },
  },
  colors: ['#6366f1', '#94a3b8', '#f59e0b'],
  stroke: {
    curve: 'smooth',
    width: [3, 2, 2],
    dashArray: [0, 5, 5],
  },
  markers: {
    size: [6, 4, 4],
    strokeWidth: 2,
    strokeColors: '#fff',
    hover: { sizeOffset: 2 },
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '11px',
    fontWeight: 600,
    markers: { width: 8, height: 8, radius: 8 },
    itemMargin: { horizontal: 10, vertical: 0 },
  },
  grid: {
    borderColor: 'rgba(0,0,0,.06)',
    strokeDashArray: 4,
    padding: { top: 6, right: 24, bottom: 0, left: 8 },
  },
  xaxis: {
    categories: generalRows.value.map((r) => `S${r.n}`),
    labels: { style: { fontSize: '11px', colors: '#64748b' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
  },
  yaxis: {
    min: 0,
    max: 20,
    tickAmount: 4,
    labels: {
      style: { fontSize: '11px', colors: '#64748b' },
      formatter: (v) => Number(v).toFixed(0),
    },
  },
  annotations: {
    yaxis: [
      {
        y: 19,
        borderColor: '#047857',
        strokeDashArray: 3,
        label: {
          text: 'EXCELENTE', position: 'right', offsetX: -6,
          style: { color: '#047857', background: 'rgba(4,120,87,.08)',
            fontSize: '9.5px', fontWeight: 700 },
        },
      },
      {
        y: 17,
        borderColor: '#1D4ED8',
        strokeDashArray: 3,
        label: {
          text: 'BUENO', position: 'right', offsetX: -6,
          style: { color: '#1D4ED8', background: 'rgba(29,78,216,.08)',
            fontSize: '9.5px', fontWeight: 700 },
        },
      },
      {
        y: 15,
        borderColor: '#B45309',
        strokeDashArray: 3,
        label: {
          text: 'EN PROCESO', position: 'right', offsetX: -6,
          style: { color: '#B45309', background: 'rgba(180,83,9,.08)',
            fontSize: '9.5px', fontWeight: 700 },
        },
      },
    ],
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: { formatter: (v) => (v == null ? 'sin data' : `${v} / 20`) },
  },
}))

const generalCoverage = computed(() => {
  const rows = generalRows.value
  const total = rows.length || 0
  const ai = rows.filter((r) => r.hasAi).length
  const man = rows.filter((r) => r.hasManual).length
  return {
    total,
    ai,
    manual: man,
    aiPct: total ? Math.round((ai / total) * 100) : 0,
    manualPct: total ? Math.round((man / total) * 100) : 0,
    full: total > 0 && ai === total && man === total,
  }
})

function score20Label(n) {
  if (!Number.isFinite(n)) return '--'
  if (n >= 19) return 'EXCELENTE'
  if (n >= 17) return 'BUENO'
  if (n >= 15) return 'EN PROCESO'
  return 'DEFICIENTE'
}

function formatDateTime(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d)) return '--'
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function goBack() {
  router.push({ name: 'AcademicaAulas' })
}

// Re-hidratar el draft cuando llega la data por primera vez
watch(auditMap, (v) => {
  if (v) hydrateDraft(selectedSession.value)
}, { immediate: false })

onMounted(async () => {
  await loadAula()
  loadStudents()
  loadGrades()
  // El contador de convalidados vive en la cabecera, no solo en el tab.
  loadHistory()
  // Si el deeplink trae ?tab=general o ?tab=auditoria, precargamos el audit
  // para que la vista no quede vacia esperando al primer click.
  if (activeTab.value === 'auditoria' || activeTab.value === 'general') {
    loadAudit()
  }
})
</script>

<template>
  <div class="aula-detail">
    <header class="page-head">
      <button class="back-btn" @click="goBack">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="head-left">
        <div class="head-tags">
          <span class="tag mono">{{ aula?.global_code || '--' }}</span>
          <span class="tag muted">EDICION {{ aula?.specific_code || '--' }}</span>
          <span class="status-pill ok"><span class="dot"></span> ACTIVO</span>
        </div>
        <h1>{{ aula?.program_abreviature || (isLoadingAula ? 'Cargando...' : 'Aula') }}</h1>
        <div class="info-row">
          <div class="info-cell">
            <div class="ic-label">Docente</div>
            <div class="ic-value docente">
              <span class="av">{{ teacherInitials }}</span>
              <span>{{ aula?.instructor || '--' }}</span>
            </div>
          </div>
          <div class="info-cell">
            <div class="ic-label">Modalidad</div>
            <div class="ic-value">{{ aula?.cat_model_modality_label || '--' }}</div>
          </div>
          <div class="info-cell">
            <div class="ic-label">Horario</div>
            <div class="ic-value">{{ headerSchedule }}</div>
          </div>
          <div class="info-cell">
            <div class="ic-label">Inicio &rarr; Fin</div>
            <div class="ic-value">{{ formatDate(aula?.start_date) }} &rarr; {{ formatDate(aula?.end_date) }}</div>
          </div>
          <div class="info-cell">
            <div class="ic-label">Sesiones</div>
            <div class="ic-value mono">{{ sessionsTotal || '--' }}</div>
          </div>
        </div>
      </div>
      <div class="head-kpis">
        <div class="hk">
          <div class="hk-label">Alumnos</div>
          <div class="hk-value mono">
            <span v-if="isLoadingStudents" class="skel-kpi" style="width:48px"></span>
            <template v-else>{{ students.length }}</template>
          </div>
          <!-- El aula cuenta uno menos que las ventas del paquete padre cuando
               hay convalidados. Se avisa aqui para que no parezca un descuadre. -->
          <button
            v-if="historyValidated.length"
            class="hk-sub"
            title="Compraron el paquete pero ya llevaron este curso. Ver detalle en Historial."
            @click="switchTab('historial')"
          >
            +{{ historyValidated.length }} convalidado{{ historyValidated.length > 1 ? 's' : '' }}
          </button>
        </div>
        <div class="hk">
          <div class="hk-label">Aprobados</div>
          <div class="hk-value mono" :class="{ muted: !isLoadingStudents && !gradesSummary.approved }">
            <span v-if="isLoadingStudents" class="skel-kpi" style="width:48px"></span>
            <template v-else>{{ gradesSummary.approved }}</template>
          </div>
        </div>
        <div class="hk">
          <div class="hk-label">Prom. final</div>
          <div class="hk-value mono" :class="{ muted: !isLoadingStudents && aulaGradeAverage == null }">
            <span v-if="isLoadingStudents" class="skel-kpi" style="width:48px"></span>
            <template v-else>{{ aulaGradeAverage == null ? '--' : fmtNota(aulaGradeAverage) }}</template>
          </div>
        </div>
      </div>
    </header>

    <nav class="tabs">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="tab"
        :class="{ active: activeTab === t.id }"
        @click="switchTab(t.id)"
      >
        <i class="fa-solid" :class="t.icon"></i>
        {{ t.label }}
        <span v-if="t.id === 'notas'" class="tab-count">{{ students.length }}</span>
      </button>
    </nav>

    <!-- ============================================================ -->
    <!-- NOTAS (Lista de Notas editable)                              -->
    <!-- ============================================================ -->
    <section v-if="activeTab === 'notas'" class="tab-body">
      <div class="toolbar">
        <div class="input">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model="studentQuery" placeholder="Buscar alumno por nombre o DNI" />
        </div>
        <div class="chip-group">
          <button
            v-for="f in FILTERS"
            :key="f.id"
            class="chip"
            :class="{ active: studentFilter === f.id }"
            @click="studentFilter = f.id"
          >
            <span v-if="studentFilter === f.id" class="dot"></span>
            {{ f.label }}
          </button>
        </div>
        <div class="legend">
          <span class="lg"><span class="debt-swatch"></span> Con deuda pendiente</span>
        </div>
        <div class="spacer"></div>
        <div class="csv-menu-wrap">
          <button
            class="btn"
            :disabled="!students.length"
            title="Importar o exportar la lista de notas en CSV"
            @click="showCsvMenu = !showCsvMenu"
          >
            <i class="fa-solid fa-file-csv"></i> CSV <i class="fa-solid fa-chevron-down csv-caret"></i>
          </button>
          <template v-if="showCsvMenu">
            <!-- backdrop invisible: cierra el menu al clickear fuera sin listeners -->
            <div class="csv-menu-backdrop" @click="showCsvMenu = false"></div>
            <div class="csv-menu">
              <button @click="showCsvMenu = false; openImportModal()">
                <i class="fa-solid fa-file-arrow-up"></i> Importar notas finales
              </button>
              <button @click="showCsvMenu = false; exportNotasCsv()">
                <i class="fa-solid fa-file-arrow-down"></i> Exportar CSV
              </button>
            </div>
          </template>
        </div>
        <button
          class="btn"
          :disabled="isGeneratingObs || !students.length"
          title="Genera borradores de observacion por alumno con la IA local"
          @click="generateObservations()"
        >
          <i class="fa-solid" :class="isGeneratingObs ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
          {{ isGeneratingObs ? 'Generando...' : 'Generar observaciones (IA)' }}
        </button>
        <button
          class="btn"
          :disabled="isCertifying || !students.length"
          title="Aplica las notas guardadas en Odoo y genera los certificados de los aprobados"
          @click="certifyInOdoo()"
        >
          <i class="fa-solid" :class="isCertifying ? 'fa-spinner fa-spin' : 'fa-certificate'"></i>
          {{ isCertifying ? 'Certificando...' : 'Certificar en Odoo' }}
        </button>
        <button
          class="btn primary"
          :disabled="!dirtyGrades.size || isSavingGrades"
          @click="saveGrades"
        >
          <i class="fa-solid" :class="isSavingGrades ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ isSavingGrades ? 'Guardando...' : 'Guardar cambios' + (dirtyGrades.size ? ` (${dirtyGrades.size})` : '') }}
        </button>
      </div>

      <div v-if="isLoadingStudents && !students.length" class="state-msg">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando alumnos...
      </div>
      <div v-else-if="!students.length" class="state-msg muted">
        <i class="fa-regular fa-folder-open"></i> Sin alumnos matriculados en esta aula.
      </div>
      <div v-else class="att-matrix-scroll">
        <table class="att-matrix grades-table">
          <thead>
            <tr class="th-groups">
              <th class="sticky-c0" rowspan="2">N&deg;</th>
              <th class="sticky-c1" rowspan="2">Apellidos y nombres</th>
              <th rowspan="2">Ocup.</th>
              <th rowspan="2">Mod.</th>
              <th rowspan="2">Seguimiento</th>
              <th rowspan="2">B2B</th>
              <th rowspan="2">Becas</th>
              <th rowspan="2">Membresia</th>
              <th class="th-group-att" :colspan="(sessionsTotal || 1) + 1">Nota de tests &middot; 6/20</th>
              <th class="th-group-part" :colspan="(sessionsTotal || 1) + 1">Participacion &middot; 2/20</th>
              <th class="th-group-pi" colspan="3">Proyecto integrador &middot; 6+8/20</th>
              <th rowspan="2" class="th-summary">Nota final</th>
              <th rowspan="2">Resultado</th>
              <th rowspan="2">Cert.</th>
            </tr>
            <tr>
              <th v-for="n in sessionNumbers" :key="'t' + n" class="th-session att">S{{ n }}</th>
              <th class="th-session att th-total">TEST</th>
              <th v-for="n in sessionNumbers" :key="'p' + n" class="th-session part">S{{ n }}</th>
              <th class="th-session part th-total">PTS</th>
              <th class="th-session pi th-total">PARCIAL</th>
              <th class="th-session pi th-total">FINAL</th>
              <th class="th-session pi"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(s, idx) in filteredStudents" :key="s.enrollment_id">
              <tr :class="{ 'row-debt': hasDebt(s), 'row-laptop': s.has_laptop_promo }">
                <td class="sticky-c0 mono small">{{ String(idx + 1).padStart(2, '0') }}</td>
                <td class="sticky-c1">
                  <div class="student-name-cell">
                    <span class="av-sm">{{ initialsOf(s.full_name) }}</span>
                    <div>
                      <div class="sn-name" :title="apellidosNombres(s)">
                        {{ apellidosNombres(s) }}
                      </div>
                      <div class="sn-handle" :title="s.email || ''">
                        {{ s.email || handleOfName(s.full_name) }}
                      </div>
                    </div>
                    <i
                      v-if="hasDebt(s)"
                      class="fa-solid fa-circle-exclamation debt-ico"
                      :title="`Deuda pendiente: ${s.fin_overdue} cuota(s) vencida(s)`"
                    ></i>
                  </div>
                </td>
                <td class="td-center">
                  <span class="ocup-pill" :class="ocupLabel(s).toLowerCase()">{{ ocupLabel(s) }}</span>
                </td>
                <td>
                  <span v-if="modalityLabel(s) !== '--'" class="mod-pill" :class="modalityLabel(s).toLowerCase()">
                    {{ modalityLabel(s) }}
                  </span>
                  <span v-else class="muted">--</span>
                </td>
                <td>
                  <div v-if="(s.parent_codes && s.parent_codes.length) || s.parent_code" class="seg-stack">
                    <span v-for="pc in (s.parent_codes && s.parent_codes.length ? s.parent_codes : [s.parent_code])"
                          :key="pc"
                          class="type-badge tb-seg mono"
                          :title="s.type_status_label || 'Programa padre'">
                      {{ pc }}
                    </span>
                  </div>
                  <span v-else-if="typeStatusBadge(s.type_status_alias)"
                        class="type-badge"
                        :class="typeStatusBadge(s.type_status_alias).cls">
                    {{ typeStatusBadge(s.type_status_alias).label }}
                  </span>
                  <span v-else class="muted small">--</span>
                </td>
                <td>
                  <span v-if="b2bLabel(s)" class="type-badge tb-obs mono">{{ b2bLabel(s) }}</span>
                  <span v-else class="muted small">--</span>
                </td>
                <td class="td-center">
                  <span v-if="s.is_beca" class="type-badge tb-beca"><i class="fa-solid fa-graduation-cap"></i> Beca</span>
                  <span v-else class="muted small">--</span>
                </td>
                <td class="td-center">
                  <span v-if="s.membership_active" class="type-badge tb-member" :title="`Membresia activa: ${s.membership_tier_name}`">
                    <i class="fa-solid fa-crown"></i> {{ s.membership_tier_name }}
                  </span>
                  <span v-else class="muted small">--</span>
                </td>
                <td v-for="n in sessionNumbers" :key="'t' + n" class="td-att">
                  <input
                    class="grade-input"
                    type="number"
                    min="0"
                    :max="GRADE_RULES.TEST_MAX_PER_SESSION"
                    step="1"
                    :value="draftFor(s).tests[String(n)]"
                    @input="draftFor(s).tests[String(n)] = $event.target.value === '' ? null : Math.min(Number($event.target.value), 20); markDirty(s.enrollment_id)"
                  />
                </td>
                <td class="td-total mono">{{ fmtNota(testScore(draftFor(s))) }}</td>
                <td v-for="n in sessionNumbers" :key="'p' + n" class="td-part">
                  <input
                    type="checkbox"
                    class="part-check"
                    :checked="draftFor(s).participation[String(n)] === true"
                    @change="draftFor(s).participation[String(n)] = $event.target.checked; markDirty(s.enrollment_id)"
                  />
                </td>
                <td class="td-total mono">{{ partScore(draftFor(s)) }}</td>
                <td class="td-total mono">{{ fmtNota(partialScore(draftFor(s))) }}</td>
                <td class="td-total mono">{{ fmtNota(finalDelivScore(draftFor(s))) }}</td>
                <td class="td-center">
                  <button
                    class="expand-btn"
                    :title="expandedRow === s.enrollment_id ? 'Cerrar criterios' : 'Editar criterios de entregables'"
                    @click="expandedRow = expandedRow === s.enrollment_id ? null : s.enrollment_id"
                  >
                    <i class="fa-solid" :class="expandedRow === s.enrollment_id ? 'fa-chevron-up' : 'fa-pen-to-square'"></i>
                  </button>
                </td>
                <td class="td-summary">
                  <span
                    v-if="hasAnyGrade(draftFor(s))"
                    class="score-badge strong"
                    :class="'sv-' + notaLevel(finalGrade(draftFor(s)))"
                  >{{ fmtNota(finalGrade(draftFor(s))) }}</span>
                  <span v-else class="muted small">--</span>
                </td>
                <td>
                  <span
                    v-if="hasAnyGrade(draftFor(s))"
                    class="result-pill"
                    :class="finalGrade(draftFor(s)) >= GRADE_RULES.PASS_THRESHOLD ? 'ok' : 'bad'"
                  >{{ finalGrade(draftFor(s)) >= GRADE_RULES.PASS_THRESHOLD ? 'APROBADO' : 'DESAPROBADO' }}</span>
                  <span v-else class="muted small">--</span>
                </td>
                <td class="td-center">
                  <span
                    v-if="certCodeOf(s)"
                    class="cert-pill"
                    :title="'Certificado emitido en Odoo: ' + certCodeOf(s)"
                  ><i class="fa-solid fa-certificate"></i> {{ certCodeOf(s) }}</span>
                  <span v-else class="muted small">--</span>
                </td>
              </tr>
              <tr v-if="expandedRow === s.enrollment_id" class="deliv-subrow">
                <td :colspan="gradesColspan">
                  <div class="deliv-grid">
                    <div class="deliv-group">
                      <div class="deliv-title">Entregable parcial <span class="muted">(criterios 0-20 &middot; ponderado /20)</span></div>
                      <label v-for="c in PARTIAL_CRITERIA" :key="'pc' + c.key" class="deliv-field">
                        <span>{{ c.key }}. {{ c.label }} <b class="mono">{{ Math.round(c.weight * 100) }}%</b></span>
                        <input
                          class="grade-input wide"
                          type="number"
                          min="0"
                          :max="c.max"
                          step="0.5"
                          :value="draftFor(s).partial_criteria[c.key]"
                          @input="draftFor(s).partial_criteria[c.key] = $event.target.value === '' ? null : Math.min(Number($event.target.value), 20); markDirty(s.enrollment_id)"
                        />
                      </label>
                    </div>
                    <div class="deliv-group">
                      <div class="deliv-title">Entregable final <span class="muted">(criterios 0-20 &middot; ponderado /20)</span></div>
                      <label v-for="c in FINAL_CRITERIA" :key="'fc' + c.key" class="deliv-field">
                        <span>{{ c.key }}. {{ c.label }} <b class="mono">{{ Math.round(c.weight * 100) }}%</b></span>
                        <input
                          class="grade-input wide"
                          type="number"
                          min="0"
                          :max="c.max"
                          step="0.5"
                          :value="draftFor(s).final_criteria[c.key]"
                          @input="draftFor(s).final_criteria[c.key] = $event.target.value === '' ? null : Math.min(Number($event.target.value), 20); markDirty(s.enrollment_id)"
                        />
                      </label>
                    </div>
                    <div class="deliv-group">
                      <div class="deliv-title">Datos del aula</div>
                      <label class="deliv-field">
                        <span>N&deg; de grupo</span>
                        <input
                          class="grade-input wide"
                          type="number"
                          min="1"
                          step="1"
                          :value="draftFor(s).group_number"
                          @input="draftFor(s).group_number = $event.target.value === '' ? null : Number($event.target.value); markDirty(s.enrollment_id)"
                        />
                      </label>
                      <label class="deliv-field">
                        <span>Correo Odoo (certificacion)</span>
                        <span class="mono small" :title="s.platform_user || s.email || ''">
                          {{ s.platform_user || s.email || '--' }}
                        </span>
                      </label>
                      <div class="deliv-flags">
                        <span v-if="s.has_certificate" class="type-badge tb-seg"><i class="fa-solid fa-certificate"></i> Certificado</span>
                        <span v-if="s.has_laptop_promo" class="type-badge tb-laptop" title="Esta inscripcion incluye laptop como beneficio">
                          <i class="fa-solid fa-laptop"></i> Traera laptop
                        </span>
                        <span v-if="b2bLabel(s)" class="type-badge tb-obs mono">{{ b2bLabel(s) }}</span>
                        <span v-if="s.membership_active" class="type-badge tb-member" :title="`Membresia activa: ${s.membership_tier_name}`">
                          <i class="fa-solid fa-crown"></i> {{ s.membership_tier_name }}
                        </span>
                      </div>
                    </div>
                    <div class="deliv-group obs-group">
                      <div class="deliv-title">
                        Observacion (acta)
                        <button
                          class="btn btn-xs"
                          :disabled="isGeneratingObs"
                          title="Regenerar con IA solo para este alumno"
                          @click="generateObservations([s.enrollment_id])"
                        >
                          <i class="fa-solid" :class="isGeneratingObs ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                          Regenerar
                        </button>
                      </div>
                      <textarea
                        class="obs-textarea"
                        :class="{ 'ia-draft': iaDraftObs.has(s.enrollment_id) }"
                        rows="2"
                        maxlength="2000"
                        placeholder="Observacion del alumno para el acta de notas..."
                        :value="draftFor(s).observation"
                        @input="draftFor(s).observation = $event.target.value; markDirty(s.enrollment_id)"
                      ></textarea>
                      <div v-if="iaDraftObs.has(s.enrollment_id)" class="muted small">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Borrador IA sin guardar — revisa y guarda.
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Resumenes del formato oficial -->
      <div v-if="students.length" class="summary-grid">
        <div class="summary-card">
          <h3 class="sum-title"><i class="fa-solid fa-users"></i> Resumen de alumnos</h3>
          <div class="sum-rows">
            <div class="sum-row"><span>Total de alumnos inscritos</span><b class="mono">{{ gradesSummary.total }}</b></div>
            <div class="sum-row"><span>Modalidad regular</span><b class="mono">{{ gradesSummary.regular }} &middot; {{ gradesSummary.pct(gradesSummary.regular) }}%</b></div>
            <div class="sum-row"><span>Modalidad Flex</span><b class="mono">{{ gradesSummary.flex }} &middot; {{ gradesSummary.pct(gradesSummary.flex) }}%</b></div>
            <div class="sum-row"><span>Alumnos de seguimiento</span><b class="mono">{{ gradesSummary.tracking }} &middot; {{ gradesSummary.pct(gradesSummary.tracking) }}%</b></div>
            <div class="sum-row"><span>Certificados</span><b class="mono">{{ gradesSummary.certified }} &middot; {{ gradesSummary.pct(gradesSummary.certified) }}%</b></div>
            <div class="sum-row"><span>Aprobados</span><b class="mono ok-ink">{{ gradesSummary.approved }} &middot; {{ gradesSummary.pct(gradesSummary.approved) }}%</b></div>
            <div class="sum-row"><span>Desaprobados</span><b class="mono bad-ink">{{ gradesSummary.failed }} &middot; {{ gradesSummary.pct(gradesSummary.failed) }}%</b></div>
          </div>
        </div>
        <div class="summary-card">
          <h3 class="sum-title"><i class="fa-solid fa-clipboard-question"></i> Test por sesion</h3>
          <table class="sum-table">
            <thead>
              <tr><th></th><th v-for="st in sessionStats" :key="'h' + st.session">S{{ st.session }}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Con puntos</td>
                <td v-for="st in sessionStats" :key="'c' + st.session" class="mono">{{ st.withTest }}</td>
              </tr>
              <tr class="muted">
                <td>%</td>
                <td v-for="st in sessionStats" :key="'pc' + st.session" class="mono">{{ st.withTestPct }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="summary-card">
          <h3 class="sum-title"><i class="fa-solid fa-hand"></i> Participaciones por sesion</h3>
          <table class="sum-table">
            <thead>
              <tr><th></th><th v-for="st in sessionStats" :key="'h2' + st.session">S{{ st.session }}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Participaciones</td>
                <td v-for="st in sessionStats" :key="'c2' + st.session" class="mono">{{ st.participated }}</td>
              </tr>
              <tr class="muted">
                <td>%</td>
                <td v-for="st in sessionStats" :key="'pc2' + st.session" class="mono">{{ st.participatedPct }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="aulaSummaryIa" class="summary-card obs-summary-card">
          <h3 class="sum-title">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Resumen del aula (IA)
            <button class="btn btn-xs" title="Copiar al portapapeles" @click="copyAulaSummary">
              <i class="fa-regular fa-copy"></i> Copiar
            </button>
          </h3>
          <p class="obs-summary-text">{{ aulaSummaryIa }}</p>
          <div class="muted small">Borrador generado por la IA local — verificar antes de usar en reportes.</div>
        </div>
        <div class="summary-card">
          <h3 class="sum-title"><i class="fa-solid fa-trophy"></i> Primeros puestos</h3>
          <div v-if="!topStudents.length" class="muted small">Sin notas registradas todavia.</div>
          <div v-else class="sum-rows">
            <div v-for="(t, i) in topStudents" :key="t.s.enrollment_id" class="sum-row top-row">
              <span class="top-pos" :class="'pos-' + (i + 1)">{{ i + 1 }}&ordf;</span>
              <span class="top-name">
                <span class="sn-name">{{ t.s.full_name }}</span>
                <span class="muted small">{{ t.s.email || '--' }} &middot; {{ t.s.phone || '--' }}</span>
              </span>
              <b class="mono">{{ fmtNota(t.final) }}</b>
            </div>
          </div>
        </div>
      </div>

      <p class="footer-note">
        <i class="fa-solid fa-circle-info"></i>
        Nota final = TEST &times; 30% + Entregable parcial &times; 30% + Entregable final &times; 40% + Participacion (0-2).
        Aprobado desde {{ GRADE_RULES.PASS_THRESHOLD }}. Los totales definitivos se recalculan al guardar.
      </p>
    </section>

    <!-- ============================================================ -->
    <!-- HISTORIAL (alumnos que estuvieron pero ya no estan)          -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'historial'" class="tab-body">
      <div v-if="isLoadingHistory" class="state-msg muted">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...
      </div>
      <div v-else-if="!historyLeft.length && !historyValidated.length" class="state-msg muted">
        <i class="fa-regular fa-folder-open"></i>
        Sin movimientos: ningun alumno se ha retirado o cambiado de este aula.
      </div>
      <div v-else class="hist-wrap">
        <!-- CONVALIDADOS: nunca estuvieron y nunca van a estar. Bloque propio
             porque no tienen "fecha de salida" ni "motivo": la tabla de abajo
             los mostraria con todo en "--" y se leeria como dato faltante. -->
        <section v-if="historyValidated.length" class="hist-card">
          <header class="hist-head">
            <span class="hist-ic hb-conv"><i class="fa-solid fa-award"></i></span>
            <h3 class="hist-title">Convalidados</h3>
            <span class="hist-count">{{ historyValidated.length }}</span>
          </header>
          <!-- Mismo armazon que la Lista de Notas (att-matrix-scroll/att-matrix):
               se reusan sus clases en vez de copiar el CSS, asi las dos tablas no
               pueden divergir. hist-matrix solo alinea a la izquierda el texto. -->
          <div class="att-matrix-scroll">
            <table class="att-matrix hist-matrix">
              <thead>
                <tr>
                  <th class="sticky-c1">Alumno</th>
                  <th>Paquete</th>
                  <th>Ya lo llevo en</th>
                  <th>Convalidado el</th>
                  <th>Asesor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in historyValidated" :key="'v' + v.validation_id">
                  <td class="sticky-c1">
                    <div class="student-name-cell">
                      <span class="av-sm">{{ initialsOf(v.full_name) }}</span>
                      <div>
                        <div class="sn-name" :title="apellidosNombres(v)">
                          {{ apellidosNombres(v) }}
                          <span class="hist-badge hb-conv">Convalidado</span>
                        </div>
                        <div class="sn-handle">{{ v.dni || 'Sin DNI' }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ [v.parent_program_name, v.parent_edition_code].filter(Boolean).join(' ') || '--' }}</td>
                  <!-- Sin matricula previa no es un error: la convalidacion puede
                       venir de otra institucion o de experiencia. Se marca en ambar
                       en vez de inventar una edicion. -->
                  <td
                    :class="{ 'hist-warn': !validatedPrevLabel(v) }"
                    :title="validatedPrevLabel(v) ? '' : 'La convalidacion no apunta a ninguna matricula del ERP (otra institucion o experiencia).'"
                  >
                    {{ validatedPrevLabel(v) || 'Sin matricula previa en el ERP' }}
                  </td>
                  <td>{{ formatDate(v.validated_at) }}</td>
                  <td class="mono">{{ v.agent_code || '--' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Una tarjeta por motivo (Retirados, Reprogramados, ...). El titulo de
             la tarjeta ya dice el motivo, asi que no hay columna "Motivo": el
             badge de la fila solo se conserva para los casos cuyo texto varia. -->
        <section v-for="g in historyGroups" :key="g.key" class="hist-card">
          <header class="hist-head">
            <span class="hist-ic" :class="g.cls"><i class="fa-solid" :class="g.icon"></i></span>
            <h3 class="hist-title">{{ g.title }}</h3>
            <span class="hist-count">{{ g.rows.length }}</span>
          </header>
          <div class="att-matrix-scroll">
            <table class="att-matrix hist-matrix">
              <thead>
                <tr>
                  <th class="sticky-c1">Alumno</th>
                  <th>Matriculado</th>
                  <th>Fecha de salida</th>
                  <th>Realizado por</th>
                  <th>Justificacion</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in g.rows" :key="h.enrollment_id">
                  <td class="sticky-c1">
                    <div class="student-name-cell">
                      <span class="av-sm">{{ initialsOf(h.full_name) }}</span>
                      <div>
                        <div class="sn-name" :title="apellidosNombres(h)">
                          {{ apellidosNombres(h) }}
                          <span class="hist-badge" :class="g.cls">{{ historyReason(h).label }}</span>
                        </div>
                        <div class="sn-handle">{{ h.dni || 'Sin DNI' }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ formatDate(h.enrolled_on) }}</td>
                  <td>{{ formatDateTime(h.left_at) }}</td>
                  <td>{{ h.performed_by || '--' }}</td>
                  <td class="hist-just">{{ h.justificacion || '--' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- AUDITORIA (rubrica)                                         -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'auditoria'" class="tab-body">
      <div v-if="!sessionsTotal" class="state-msg muted">
        <i class="fa-regular fa-folder-open"></i> El aula no tiene sesiones definidas.
      </div>

      <div v-else class="audit-rd">
        <!-- Tira de sesiones con nota consolidada -->
        <div class="ar-sess-strip">
          <span class="ar-sess-lbl">Sesion</span>
          <button
            v-for="n in sessionNumbers"
            :key="n"
            class="ar-sess-pill"
            :class="{ active: selectedSession === n }"
            @click="selectSession(n)"
          >
            <span class="ar-dot" :class="sessionDotCls(n)"></span>
            <span class="slabel">S{{ n }}</span>
            <span class="note" :class="{ pend: sessionConsolidatedNote(n) == null }">
              {{ sessionConsolidatedNote(n) == null ? '—' : '(' + fmtNota(sessionConsolidatedNote(n)) + ')' }}
            </span>
          </button>
        </div>

        <!-- Scorecard consolidado -->
        <div class="ar-scorecard">
          <div class="sc-hero">
            <div class="sc-ring" :class="'lvl-' + notaLevel(currentConsolidated20)">
              <svg width="92" height="92" viewBox="0 0 92 92">
                <circle cx="46" cy="46" r="40" class="ring-track" stroke-width="9" fill="none" />
                <circle
                  cx="46" cy="46" r="40" class="ring-prog" stroke-width="9" fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="RING_CIRC"
                  :stroke-dashoffset="ringOffset(currentConsolidated20)"
                />
              </svg>
              <div class="ring-num"><b>{{ fmtNota(currentConsolidated20) }}</b><span>/ 20</span></div>
            </div>
            <div>
              <div class="label">NOTA CONSOLIDADA</div>
              <div class="big">{{ currentConsolidated20 == null ? 'Sin datos' : 'Estabilizada' }}</div>
              <div class="prov" :class="{ firm: currentFirm }">
                <i class="fa-solid" :class="currentFirm ? 'fa-circle-check' : 'fa-clock'"></i>
                {{ currentFirm ? 'Evaluacion completa' : 'Provisional · falta area academica' }}
              </div>
            </div>
          </div>
          <div class="sc-evals">
            <div class="sc-eval">
              <div class="head"><span class="badge-ia">IA</span><span class="tag">AUDITORIA AUTOMATICA</span></div>
              <div class="score"><b>{{ fmtNota(currentIaScore20) }}</b><span>/ 20</span></div>
              <div class="bar"><i :class="'fill-' + notaLevel(currentIaScore20)" :style="{ width: barWidth(currentIaScore20) }"></i></div>
              <div class="weight">Peso {{ PESO_IA_PCT }}%</div>
            </div>
            <div class="sc-eval">
              <div class="head"><span class="tag">AREA ACADEMICA</span></div>
              <div class="score"><b>{{ fmtNota(currentAcScore20) }}</b><span>/ 20</span></div>
              <div class="bar"><i class="fill-accent" :style="{ width: barWidth(currentAcScore20) }"></i></div>
              <div class="weight">Peso {{ PESO_MANUAL_PCT }}% · {{ totalScore }}/{{ RUBRIC_TOTAL_ITEMS }} criterios marcados</div>
            </div>
          </div>
        </div>

        <!-- Control segmentado + accion IA -->
        <div class="ar-toolbar">
          <div class="ar-segmented">
            <button :class="{ on: auditView === 'resumen' }" @click="auditView = 'resumen'">
              <i class="fa-solid fa-chart-line"></i> Resumen
            </button>
            <button :class="{ on: auditView === 'ia' }" @click="auditView = 'ia'">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Auditoria IA
            </button>
            <button :class="{ on: auditView === 'academica' }" @click="auditView = 'academica'">
              <i class="fa-solid fa-clipboard-check"></i> Evaluacion Academica
            </button>
          </div>
          <div class="ar-grow"></div>
          <button
            v-if="!currentAiReport"
            class="ar-btn"
            title="Generar analisis con IA (consume creditos)"
            @click="onAnalyzeClick"
          >
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            Analizar con IA
          </button>
          <button
            v-else
            class="ar-btn primary"
            title="Exportar el reporte de la sesion en PDF para entregar al docente"
            @click="exportSessionPdf"
          >
            <i class="fa-solid fa-file-pdf"></i>
            Exportar PDF
          </button>
        </div>

        <!-- ===================== RESUMEN ===================== -->
        <div v-if="auditView === 'resumen'" class="ar-stack">
          <div v-if="!currentAiReport" class="ar-empty">
            <div class="big">Sesion {{ selectedSession }} sin analisis IA</div>
            Genera la auditoria IA para ver el resumen, o registra la evaluacion academica.
          </div>
          <template v-else>
            <div class="ar-metrics">
              <div class="ar-metric">
                <div class="lbl">NOTA IA</div>
                <div class="big">{{ fmtNota(currentIaScore20) }} <span class="suf">/ 20</span></div>
              </div>
              <div class="ar-metric">
                <div class="lbl">NOTA AREA ACADEMICA</div>
                <div class="big">{{ fmtNota(currentAcScore20) }} <span class="suf">/ 20</span></div>
              </div>
              <div class="ar-metric">
                <div class="lbl">TEMAS CUBIERTOS</div>
                <div class="big">{{ currentMetricas.temas_cubiertos ?? '--' }} <span class="suf">/ {{ currentMetricas.temas_totales ?? '--' }}</span></div>
              </div>
              <div class="ar-metric">
                <div class="lbl">BALANCE PRACTICA / TEORIA</div>
                <div class="big sm">{{ currentMetricas.porcentaje_practica ?? '--' }}% · {{ currentMetricas.porcentaje_teoria ?? '--' }}%</div>
                <div class="split-bar">
                  <div class="p" :style="{ width: (currentMetricas.porcentaje_practica || 0) + '%' }"></div>
                  <div class="t" :style="{ width: (currentMetricas.porcentaje_teoria || 0) + '%' }"></div>
                </div>
                <div class="split-legend"><span><i class="li-p"></i>Practica</span><span><i class="li-t"></i>Teoria</span></div>
              </div>
            </div>

            <div class="ar-fo-grid">
              <div class="ar-fo str" v-if="currentAiReport.fortalezas_top3?.length">
                <div class="fo-head"><span class="ic"><i class="fa-solid fa-thumbs-up"></i></span>Fortalezas</div>
                <div class="fo-item" v-for="(f, i) in currentAiReport.fortalezas_top3" :key="i">
                  <div class="t">{{ f.titulo }}</div><div class="d">{{ f.detalle }}</div>
                </div>
              </div>
              <div class="ar-fo opp" v-if="currentAiReport.oportunidades_top5?.length">
                <div class="fo-head"><span class="ic"><i class="fa-solid fa-bullseye"></i></span>Oportunidades</div>
                <div class="fo-item" v-for="(o, i) in currentAiReport.oportunidades_top5" :key="i">
                  <div class="t">{{ o.titulo }}</div><div class="d">{{ o.detalle }}</div>
                </div>
              </div>
            </div>

            <div class="ar-card ar-compare-card">
              <div class="ar-card-head">
                <span class="ic"><i class="fa-solid fa-chart-column"></i></span>
                <div>
                  <div class="ar-eyebrow">EVOLUCION DEL DOCENTE</div>
                  <h3 class="ar-card-title">Comparacion por sesion</h3>
                </div>
              </div>
              <div class="ar-compare">
                <div
                  v-for="s in compareSessions"
                  :key="s.n"
                  class="cmp-col"
                  :class="{ current: s.n === selectedSession }"
                  @click="selectSession(s.n)"
                >
                  <div class="cmp-bars">
                    <template v-if="s.hasIa">
                      <div class="cmp-bar ia" :style="{ height: ((s.ia20 || 0) / 20 * 100) + '%' }"><span class="v">{{ fmtNota(s.ia20) }}</span></div>
                      <div class="cmp-bar ac" :style="{ height: ((s.ac20 || 0) / 20 * 100) + '%' }"><span class="v">{{ s.ac20 ? fmtNota(s.ac20) : '·' }}</span></div>
                    </template>
                    <div v-else class="cmp-pend">pend.</div>
                  </div>
                  <div class="cmp-x">S{{ s.n }}</div>
                </div>
              </div>
              <div class="split-legend center"><span><i class="li-ia"></i>Auditoria IA</span><span><i class="li-ac"></i>Area academica</span></div>
            </div>
          </template>
        </div>

        <!-- ===================== AUDITORIA IA ===================== -->
        <div v-else-if="auditView === 'ia'" class="ar-stack">
          <div v-if="!currentAiReport" class="ar-empty">
            <div class="big">Sesion {{ selectedSession }} sin analisis IA</div>
            La auditoria IA se genera tras realizarse la sesion. Usa "Analizar con IA" para cargarla.
          </div>
          <template v-else>
            <div class="ar-card ar-ia-toolbar">
              <div>
                <div class="ar-eyebrow accent">● ANALISIS IA</div>
                <div class="ar-metaline" v-if="currentAiGeneratedAt">
                  Generado <b>{{ formatDateTime(currentAiGeneratedAt) }}</b> · {{ currentAiReport.criterios?.length || 0 }} criterios evaluados
                </div>
              </div>
              <div class="ar-grow"></div>
              <div class="ar-sort">
                <button :class="{ on: iaSort === 'orden' }" @click="iaSort = 'orden'">Orden</button>
                <button :class="{ on: iaSort === 'bajo' }" @click="iaSort = 'bajo'">Puntaje ↑</button>
                <button :class="{ on: iaSort === 'alto' }" @click="iaSort = 'alto'">Puntaje ↓</button>
              </div>
            </div>

            <div class="ar-crit-grid">
              <article v-for="c in sortedAiCriterios" :key="c.id" class="ar-crit" :class="'bc-' + scoreLevel(c.score)">
                <div class="crit-top">
                  <span class="num">#{{ c.id }}</span>
                  <h4 class="crit-title">{{ c.nombre }}</h4>
                  <span class="score-badge" :class="'sv-' + scoreLevel(c.score)">{{ c.score }}/5</span>
                </div>
                <div class="scorebar">
                  <i v-for="i in 5" :key="i" :class="{ fill: i <= c.score }"></i>
                </div>
                <p class="crit-text">{{ c.comentario }}</p>
                <div v-if="c.evidencia_timestamps?.length" class="stamps">
                  <span v-for="t in c.evidencia_timestamps" :key="t" class="stamp">{{ t }}</span>
                </div>
              </article>
            </div>

            <div class="ar-fo-grid">
              <div class="ar-fo str" v-if="currentAiReport.fortalezas_top3?.length">
                <div class="fo-head"><span class="ic"><i class="fa-solid fa-thumbs-up"></i></span>Fortalezas</div>
                <div class="fo-item" v-for="(f, i) in currentAiReport.fortalezas_top3" :key="i">
                  <div class="t">{{ f.titulo }}</div><div class="d">{{ f.detalle }}</div>
                </div>
              </div>
              <div class="ar-fo opp" v-if="currentAiReport.oportunidades_top5?.length">
                <div class="fo-head"><span class="ic"><i class="fa-solid fa-bullseye"></i></span>Oportunidades</div>
                <div class="fo-item" v-for="(o, i) in currentAiReport.oportunidades_top5" :key="i">
                  <div class="t">{{ o.titulo }}</div><div class="d">{{ o.detalle }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ===================== EVALUACION ACADEMICA ===================== -->
        <div v-else class="ar-stack">
          <div class="ar-card ar-acad-head">
            <div>
              <div class="ar-eyebrow">RUBRICA DEL AREA ACADEMICA</div>
              <div class="ar-metaline">Marca cada criterio cumplido durante la sesion {{ selectedSession }}.</div>
            </div>
            <div class="ar-grow"></div>
            <div class="ar-acad-prog">
              <div class="big">{{ totalScore }} / {{ RUBRIC_TOTAL_ITEMS }}</div>
              <div class="ar-metaline">{{ totalProgress }}% completado</div>
            </div>
          </div>

          <div class="ar-rub-grid">
            <div v-for="cat in RUBRIC" :key="cat.key" class="ar-rub-cat">
              <div class="rc-head">
                <h3>{{ cat.label }}</h3>
                <span class="rc-prog">{{ categoryScore(cat) }} / {{ cat.items.length }}</span>
              </div>
              <div class="rc-bar"><i :style="{ width: (categoryScore(cat) / cat.items.length * 100) + '%' }"></i></div>
              <div
                v-for="it in cat.items"
                :key="it.key"
                class="rub-row"
                :class="{ on: sessionDraft[it.key] }"
                @click="sessionDraft[it.key] = !sessionDraft[it.key]"
              >
                <span class="cbx"><i class="fa-solid fa-check"></i></span>
                <span class="rtext">{{ it.label }}</span>
              </div>
            </div>
          </div>

          <div class="ar-savebar">
            <span class="prog-text">Criterios marcados <b>{{ totalScore }} / {{ RUBRIC_TOTAL_ITEMS }}</b> · {{ totalProgress }}%</span>
            <span v-if="lastSavedAt" class="ar-saved">Guardado {{ formatDate(lastSavedAt) }}</span>
            <span class="ar-grow"></span>
            <button class="ar-btn primary" :disabled="isSavingSession" @click="saveSession">
              <i v-if="isSavingSession" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-save"></i>
              Guardar sesion
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- GENERAL: consolidado IA + rubrica manual                     -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'general'" class="tab-body">
      <div v-if="!sessionsTotal" class="state-msg muted">
        <i class="fa-regular fa-folder-open"></i> El aula no tiene sesiones definidas.
      </div>
      <div v-else class="audit-rd">
        <!-- Hero consolidado del aula -->
        <div class="ar-scorecard">
          <div class="sc-hero">
            <div class="sc-ring" :class="'lvl-' + notaLevel(generalAulaAverages.consolidated20)">
              <svg width="92" height="92" viewBox="0 0 92 92">
                <circle cx="46" cy="46" r="40" class="ring-track" stroke-width="9" fill="none" />
                <circle
                  cx="46" cy="46" r="40" class="ring-prog" stroke-width="9" fill="none" stroke-linecap="round"
                  :stroke-dasharray="RING_CIRC" :stroke-dashoffset="ringOffset(generalAulaAverages.consolidated20)"
                />
              </svg>
              <div class="ring-num"><b>{{ fmtNota(generalAulaAverages.consolidated20) }}</b><span>/ 20</span></div>
            </div>
            <div>
              <div class="label">NOTA CONSOLIDADA DEL AULA</div>
              <div class="big">{{ score20Label(generalAulaAverages.consolidated20) }}</div>
              <div class="prov" :class="{ firm: generalCoverage.full }">
                <i class="fa-solid" :class="generalCoverage.full ? 'fa-circle-check' : 'fa-clock'"></i>
                {{ generalCoverage.full ? 'Muestra completa' : 'Muestra incompleta' }}
              </div>
            </div>
          </div>
          <div class="sc-evals">
            <div class="sc-eval">
              <div class="head"><span class="badge-ia">IA</span><span class="tag">PROMEDIO IA</span></div>
              <div class="score"><b>{{ fmtNota(generalAulaAverages.ai20) }}</b><span>/ 20</span></div>
              <div class="bar"><i :class="'fill-' + notaLevel(generalAulaAverages.ai20)" :style="{ width: barWidth(generalAulaAverages.ai20) }"></i></div>
              <div class="weight">{{ generalAulaAverages.aiSessions }} / {{ sessionsTotal }} sesiones analizadas</div>
            </div>
            <div class="sc-eval">
              <div class="head"><span class="tag">PROMEDIO RUBRICA MANUAL</span></div>
              <div class="score"><b>{{ fmtNota(generalAulaAverages.manual20) }}</b><span>/ 20</span></div>
              <div class="bar"><i class="fill-accent" :style="{ width: barWidth(generalAulaAverages.manual20) }"></i></div>
              <div class="weight">{{ generalAulaAverages.manualSessions }} / {{ sessionsTotal }} sesiones evaluadas</div>
            </div>
          </div>
        </div>

        <!-- Evolucion del aula -->
        <div class="ar-card">
          <div class="ar-card-head">
            <span class="ic"><i class="fa-solid fa-chart-line"></i></span>
            <div>
              <div class="ar-eyebrow">EVOLUCION DEL AULA</div>
              <h3 class="ar-card-title">Nota por sesion</h3>
              <p class="ar-metaline ar-chart-hint">
                Linea solida: consolidada. Punteadas: IA y rubrica manual. Los huecos son sesiones sin evaluar.
              </p>
            </div>
          </div>
          <apexchart type="line" height="300" :options="generalChartOptions" :series="generalChartSeries" />

          <div class="ar-coverage">
            <div class="cov-item">
              <div class="cov-head">
                <span class="cov-name"><i class="cov-dot ia"></i>Analisis IA</span>
                <span class="cov-count">{{ generalCoverage.ai }} / {{ generalCoverage.total }} · {{ generalCoverage.aiPct }}%</span>
              </div>
              <div class="cov-bar"><i class="ia" :style="{ width: generalCoverage.aiPct + '%' }"></i></div>
            </div>
            <div class="cov-item">
              <div class="cov-head">
                <span class="cov-name"><i class="cov-dot ac"></i>Evaluacion manual</span>
                <span class="cov-count">{{ generalCoverage.manual }} / {{ generalCoverage.total }} · {{ generalCoverage.manualPct }}%</span>
              </div>
              <div class="cov-bar"><i class="ac" :style="{ width: generalCoverage.manualPct + '%' }"></i></div>
            </div>
          </div>
          <p v-if="!generalCoverage.full" class="ar-warn">
            <i class="fa-solid fa-triangle-exclamation"></i>
            Muestra incompleta. El veredicto del aula puede cambiar conforme se evaluen mas sesiones.
          </p>
        </div>

        <!-- Detalle por sesion -->
        <div class="ar-card ar-table-card">
          <div class="ar-eyebrow">DETALLE POR SESION</div>
          <div class="ar-table-scroll">
            <table class="ar-table">
              <thead>
                <tr>
                  <th>Sesion</th><th>Rubrica manual</th><th>Nota IA</th>
                  <th>Nota manual</th><th>Consolidada</th><th>Veredicto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in generalRows" :key="r.n" :class="{ current: r.n === selectedSession }">
                  <td class="td-s">S{{ r.n }}</td>
                  <td><span class="num">{{ r.manualMarked }} / {{ r.manualTotal }}</span> <span class="ar-muted">· {{ r.manualPct }}%</span></td>
                  <td>
                    <span v-if="r.hasAi" class="score-badge" :class="'sv-' + notaLevel(r.aiScore20)">{{ fmtNota(r.aiScore20) }}</span>
                    <span v-else class="ar-muted">sin analisis</span>
                  </td>
                  <td>
                    <span v-if="r.hasManual" class="score-badge" :class="'sv-' + notaLevel(r.manualScore20)">{{ fmtNota(r.manualScore20) }}</span>
                    <span v-else class="ar-muted">sin evaluar</span>
                  </td>
                  <td>
                    <span v-if="r.consolidated20 != null" class="score-badge strong" :class="'sv-' + notaLevel(r.consolidated20)">{{ fmtNota(r.consolidated20) }}</span>
                    <span v-else class="ar-muted">--</span>
                  </td>
                  <td><span class="ar-verdict" :class="'sv-' + notaLevel(r.consolidated20)">{{ score20Label(r.consolidated20) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="ar-footer-note">
          <i class="fa-solid fa-circle-info"></i>
          La nota consolidada combina IA y rubrica manual con pesos {{ PESO_IA_PCT }}% / {{ PESO_MANUAL_PCT }}%.
          Si solo hay una fuente disponible, se usa esa.
        </p>
      </div>
    </section>

    <!-- MODAL: importar notas pegadas desde el Google Sheet. Mismo shell
         visual que el modal de IA (clases aam-*). -->
    <Teleport to="body">
      <div v-if="showImportModal" class="aula-ai-modal-overlay" @click.self="showImportModal = false">
        <div class="aula-ai-modal">
          <header class="aam-head">
            <div>
              <div class="aam-eyebrow"><i class="fa-solid fa-file-arrow-up"></i> Importar notas finales</div>
              <h3>{{ aula?.global_code || 'Aula' }}</h3>
            </div>
            <button class="aam-close" @click="showImportModal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="aam-body">
            <p class="aam-intro">
              Escribe la <strong>NOTA FINAL (0-20)</strong> solo a los alumnos que quieras actualizar;
              las casillas vacias no se tocan. Tambien puedes <strong>copiar la columna de notas
              del Sheet y pegarla</strong> en la casilla del primer alumno: se reparte hacia abajo
              en orden (verifica que el orden de alumnos coincida con el Sheet). La nota se registra como nota unica del alumno
              (tests, PP y PF quedan con ese valor para que la NOTA FINAL calculada coincida).
            </p>
            <div class="imp-list">
              <div v-for="(s, idx) in students" :key="s.enrollment_id" class="imp-row">
                <span class="imp-num mono">{{ String(idx + 1).padStart(2, '0') }}</span>
                <span class="imp-name">{{ apellidosNombres(s) }}</span>
                <span class="imp-cur" title="Nota final actual">{{ currentFinalLabel(s) }}</span>
                <input
                  v-model="importGrades[s.enrollment_id]"
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  placeholder="--"
                  :class="{ bad: importGrades[s.enrollment_id] && parseNota(importGrades[s.enrollment_id]) == null }"
                  @paste="onImportPaste($event, idx)"
                />
              </div>
            </div>
          </div>
          <footer class="aam-foot">
            <button class="btn" @click="showImportModal = false">Cancelar</button>
            <button class="btn primary" :disabled="!importCount" @click="applyImport">
              <i class="fa-solid fa-check"></i>
              Aplicar{{ importCount ? ` (${importCount} alumnos)` : '' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- MODAL: ejecutar IA. Teleport a <body> para escapar de cualquier
         transform/filter del layout padre que rompa position:fixed. -->
    <Teleport to="body">
      <div v-if="showAiModal" class="aula-ai-modal-overlay" @click.self="showAiModal = false">
        <div class="aula-ai-modal">
          <header class="aam-head">
            <div>
              <div class="aam-eyebrow"><i class="fa-solid fa-wand-magic-sparkles"></i> Analisis IA</div>
              <h3>Sesion {{ selectedSession }}</h3>
            </div>
            <button class="aam-close" @click="showAiModal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="aam-body">
            <p class="aam-intro">
              La IA analiza el transcript y el syllabus para puntuar 9 criterios. Las categorias
              <strong>Interaccion</strong> y <strong>Contenido</strong> se auto-marcan segun los scores.
              <strong>Entorno</strong> y <strong>Comunicacion academica</strong> quedan manuales.
            </p>
            <div class="aam-field">
              <div class="aam-field-head">
                <label>Transcript</label>
                <label class="aam-upload-btn">
                  <i class="fa-solid fa-upload"></i> Cargar archivo (.vtt o .txt)
                  <input type="file" accept=".vtt,.txt,text/plain,text/vtt" @change="onTranscriptFileChange" hidden />
                </label>
              </div>
              <textarea
                v-model="aiTranscript"
                rows="12"
                placeholder="Pega el transcript con timestamps [HH:MM:SS] o sube un archivo .vtt de Teams/Zoom/YouTube.&#10;&#10;Ejemplo:&#10;[00:00:15] Bienvenidos al modulo de Excel...&#10;[00:01:30] Vamos a revisar la sesion anterior..."
              ></textarea>
              <span class="aam-hint muted small">
                Acepta WebVTT (Teams, Zoom, YouTube) o texto plano. Se convierte automaticamente al formato [HH:MM:SS].
              </span>
            </div>
            <div class="aam-field">
              <label>Imagen del syllabus (PNG/JPG)</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" @change="onSyllabusChange" />
              <span v-if="aiSyllabusFile" class="muted small">
                Seleccionado: {{ aiSyllabusFile.name }} ({{ Math.round(aiSyllabusFile.size / 1024) }} KB)
              </span>
            </div>
            <div v-if="aiError" class="aam-error">
              <i class="fa-solid fa-circle-exclamation"></i> {{ aiError }}
            </div>
          </div>
          <footer class="aam-foot">
            <button class="btn" @click="showAiModal = false" :disabled="isRunningAi">Cancelar</button>
            <button class="btn primary" @click="runAiAudit" :disabled="isRunningAi">
              <i v-if="isRunningAi" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-play"></i>
              {{ isRunningAi ? 'Analizando...' : 'Ejecutar analisis' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.aula-detail {
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
  --slate-soft: #F1F3F5;
  --slate-ink: #475569;
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

.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.muted { color: var(--ink-3); }
.small { font-size: 11.5px; }
.text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; display: inline-block; }
.spacer { flex: 1; }
.dot-sep { color: var(--ink-4); }

/* HEADER */
.page-head {
  background: white; border: 1px solid var(--line); border-radius: var(--radius-lg);
  padding: 16px 18px; margin-bottom: 16px;
  display: flex; gap: 16px; position: relative;
}
.back-btn {
  width: 32px; height: 32px; flex-shrink: 0;
  border: 1px solid var(--line); border-radius: 8px;
  background: white; cursor: pointer; color: var(--ink-3);
}
.back-btn:hover { background: var(--bg-soft); color: var(--ink); }
.head-left { flex: 1; min-width: 0; }
.head-tags { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.tag {
  display: inline-block; padding: 2px 7px; border-radius: 5px;
  background: var(--bg-soft); border: 1px solid var(--line-soft);
  font-size: 10.5px; font-weight: 600; color: var(--ink-2);
  letter-spacing: 0.04em;
}
.tag.muted { color: var(--ink-3); background: transparent; border-color: transparent; }
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.status-pill .dot { width: 5px; height: 5px; border-radius: 999px; background: currentColor; }
.status-pill.ok { background: var(--green-soft); color: var(--green-ink); }

.page-head h1 {
  margin: 4px 0 10px; font-size: 22px; font-weight: 600;
  letter-spacing: -0.02em;
}

.info-row { display: flex; gap: 22px; flex-wrap: wrap; }
.info-cell { min-width: 0; }
.ic-label {
  font-size: 10.5px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;
}
.ic-value { font-size: 13px; font-weight: 500; }
.ic-value.docente { display: flex; align-items: center; gap: 6px; }
.ic-value .av {
  width: 22px; height: 22px; border-radius: 999px;
  background: var(--red-soft); color: var(--red-ink);
  display: grid; place-items: center; font-size: 10px; font-weight: 700;
}

.head-kpis {
  display: flex; gap: 20px; flex-shrink: 0;
  padding-left: 18px; border-left: 1px solid var(--line);
}
.hk { text-align: right; }
.hk-label {
  font-size: 10.5px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.hk-value { font-size: 22px; font-weight: 600; color: var(--green-ink); margin-top: 4px; }
.hk-value.muted { color: var(--ink-3); }
.hk:first-child .hk-value { color: var(--ink); }

/* TABS */
.tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 14px;
}
.tab {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: none;
  padding: 9px 14px; cursor: pointer;
  font-size: 13px; font-weight: 500; color: var(--ink-3);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.tab:hover { color: var(--ink-2); }
.tab.active { color: var(--ink); border-bottom-color: var(--green); }
.tab i { font-size: 11px; }
.tab-count {
  background: var(--bg-soft); color: var(--ink-3);
  border-radius: 999px; padding: 1px 7px;
  font-size: 10.5px; font-weight: 600;
}
.tab.active .tab-count { background: var(--green-soft); color: var(--green-ink); }

.tab-body { min-height: 200px; }
.state-msg { text-align: center; padding: 60px 20px; color: var(--ink-3); font-size: 13.5px; }
.state-msg i { margin-right: 6px; }

/* TOOLBAR */
.toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  background: white; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 10px 12px; margin-bottom: 12px;
}
.input {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; min-width: 260px; color: var(--ink-3);
  font-size: 13px;
}
.input input { border: none; outline: none; flex: 1; background: transparent; color: var(--ink); font-size: 13px; }
.input input::placeholder { color: var(--ink-4); }
.chip-group { display: flex; gap: 5px; }
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--line); background: white;
  font-size: 12px; color: var(--ink-2); cursor: pointer;
}
.chip:hover { background: var(--bg-soft); }
.chip.active { background: var(--green-soft); color: var(--green-ink); border-color: #C8EFD8; font-weight: 500; }
.chip .dot { width: 5px; height: 5px; border-radius: 999px; background: currentColor; }
.legend { display: flex; gap: 12px; }
.lg { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--ink-3); }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 11px; border-radius: 8px;
  font-size: 12.5px; font-weight: 500;
  border: 1px solid var(--line); background: white;
  color: var(--ink-2); cursor: pointer;
}
.btn:hover:not(:disabled) { background: var(--bg-soft); }
.btn.primary { background: var(--we-navy, #002060); color: white; border-color: var(--we-navy, #002060); }
.btn.primary:hover:not(:disabled) { background: var(--we-navy-dark, #001540); }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* Menu desplegable Importar/Exportar CSV */
.csv-menu-wrap { position: relative; }
.csv-caret { font-size: 9px; opacity: 0.6; }
.csv-menu-backdrop { position: fixed; inset: 0; z-index: 40; }
.csv-menu {
  position: absolute; right: 0; top: calc(100% + 4px); z-index: 41;
  min-width: 220px; padding: 4px;
  background: white; border: 1px solid var(--line);
  border-radius: 10px; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column;
}
.csv-menu button {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 11px; border: none; border-radius: 7px;
  background: transparent; text-align: left; cursor: pointer;
  font-size: 12.5px; font-weight: 500; color: var(--ink-2);
}
.csv-menu button:hover { background: var(--bg-soft); }
.csv-menu button i { width: 14px; text-align: center; opacity: 0.7; }

/* MATRIZ DE ASISTENCIA */
.att-matrix-scroll {
  background: white; border: 1px solid var(--line);
  border-radius: var(--radius); overflow: auto; max-height: 72vh;
}
.att-matrix {
  width: 100%; border-collapse: separate; border-spacing: 0;
  font-size: 12.5px;
}
.att-matrix th, .att-matrix td {
  padding: 7px 9px; border-bottom: 1px solid var(--line-soft);
  white-space: nowrap; vertical-align: middle;
}
.att-matrix thead th {
  position: sticky; top: 0; z-index: 2;
  background: var(--bg-soft);
  font-size: 10px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.05em;
  text-align: center; border-bottom: 1px solid var(--line);
}
.att-matrix thead .th-groups th { border-bottom: 1px solid var(--line-soft); }
.att-matrix .th-group-att { background: #ECF8F2 !important; color: var(--green-ink); }
.att-matrix .th-group-part { background: #FEF6E1 !important; color: var(--amber-ink); }
.att-matrix .th-session { padding: 4px 6px; font-size: 9.5px; }
.att-matrix .th-summary { min-width: 70px; }
.att-matrix .sticky-c0 {
  position: sticky; left: 0; z-index: 1; background: white;
  width: 38px; text-align: center; color: var(--ink-3);
}
.att-matrix .sticky-c1 {
  position: sticky; left: 38px; z-index: 1; background: white;
  min-width: 220px; max-width: 240px;
}
.att-matrix .sticky-c2 {
  position: sticky; left: 278px; z-index: 1; background: white;
  min-width: 90px; border-right: 1px solid var(--line-soft);
}
.att-matrix thead .sticky-c0,
.att-matrix thead .sticky-c1,
.att-matrix thead .sticky-c2 { z-index: 3; background: var(--bg-soft); }
.att-matrix tbody tr:hover td { background: #FAFAF6; }
.att-matrix tbody tr:hover .sticky-c0,
.att-matrix tbody tr:hover .sticky-c1,
.att-matrix tbody tr:hover .sticky-c2 { background: #FAFAF6; }

.student-name-cell { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
.student-name-cell > div { flex: 1; min-width: 0; overflow: hidden; }
.av-sm {
  width: 26px; height: 26px; border-radius: 999px;
  background: var(--slate-soft); color: var(--slate-ink);
  display: grid; place-items: center; font-size: 10px; font-weight: 700;
  flex-shrink: 0;
}
.sn-name {
  font-weight: 500; font-size: 12.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sn-handle {
  font-size: 10.5px; color: var(--ink-3);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.contact-cell { font-size: 11.5px; line-height: 1.3; }
.contact-cell .small { font-size: 10.5px; }

.mod-pill {
  display: inline-block; padding: 1px 7px; border-radius: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  font-family: var(--font-mono);
}
.mod-pill.flex { background: var(--blue-soft); color: var(--blue-ink); }
.mod-pill.regular { background: var(--slate-soft); color: var(--slate-ink); }

.type-badge {
  display: inline-block; padding: 1px 6px; border-radius: 4px;
  font-size: 10px; font-weight: 600; font-family: var(--font-mono);
}
.tb-seg { background: var(--amber-soft); color: var(--amber-ink); }
.seg-stack { display: inline-flex; flex-direction: column; gap: 2px; align-items: flex-start; }
.tb-rp  { background: #FCE4EC; color: #BE185D; }
.tb-cc  { background: var(--blue-soft); color: var(--blue-ink); }
.tb-obs { background: var(--slate-soft); color: var(--slate-ink); }
.tb-act { background: #E5F5EC; color: #1D7A4D; }
.tb-member { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
.tb-member i { margin-right: 2px; font-size: 9px; }
.tb-beca { background: #E0F2FE; color: #075985; border: 1px solid #7DD3FC; }
.tb-beca i { margin-right: 2px; font-size: 9px; }
/* Mismos colores que la etiqueta "Traera laptop" del panel FICO */
.tb-laptop { background: #ECFEFF; color: #155E75; border: 1px solid #A5F3FC; }
.tb-laptop i { margin-right: 2px; font-size: 9px; color: #0891B2; }

/* HISTORIAL */
.hist-wrap { display: grid; gap: 16px; padding: 4px 2px; }
.hist-card {
  background: white; border: 1px solid var(--line);
  border-radius: var(--radius); overflow: hidden;
}
/* La tabla ya vive dentro de la tarjeta: pierde su borde y su radio propios. */
.hist-card .att-matrix-scroll {
  border: 0; border-radius: 0; background: transparent; max-height: 60vh;
}
.hist-head {
  display: flex; align-items: center; gap: 9px;
  padding: 10px 14px; background: var(--bg-soft);
  border-bottom: 1px solid var(--line);
}
/* Reusa los colores de los badges (hb-*) para el icono de la tarjeta. */
.hist-ic {
  width: 26px; height: 26px; border-radius: 7px; flex: 0 0 auto;
  display: grid; place-items: center; font-size: 11px;
}
/* Variante de .att-matrix para tablas de texto: solo cambia la alineacion.
   Todo lo demas (tarjeta, banda de cabecera, densidad, hover) se hereda. */
.hist-matrix thead th,
.hist-matrix td { text-align: left; }
/* sticky-c1 se ancla a 38px por la columna N° de Notas, que aqui no existe. */
.hist-matrix .sticky-c1 { left: 0; }
.hist-matrix .sn-name { white-space: normal; }
.hist-just {
  color: var(--ink-3); max-width: 280px;
  white-space: normal; /* .att-matrix pone nowrap: la justificacion es texto largo */
}
.hist-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 11px; font-weight: 600;
}
.hb-ret  { background: #FEE2E2; color: #B91C1C; }
.hb-cc   { background: var(--blue-soft); color: var(--blue-ink); }
.hb-rp   { background: #FCE4EC; color: #BE185D; }
.hb-obs  { background: var(--slate-soft); color: var(--slate-ink); }
.hb-baja { background: #F3F4F6; color: #4B5563; }
.hb-fico { background: var(--amber-soft); color: var(--amber-ink); }
.hb-otro { background: var(--slate-soft); color: var(--slate-ink); }
/* Convalidado: violeta, para que no se confunda con ninguna salida del aula. */
.hb-conv { background: #EDE9FE; color: #6D28D9; }

.hist-title {
  font-size: 12.5px; font-weight: 600; color: var(--ink);
  text-transform: uppercase; letter-spacing: .05em; margin: 0;
}
.hist-count {
  margin-left: auto; min-width: 22px; padding: 2px 9px; border-radius: 10px;
  background: white; border: 1px solid var(--line); color: var(--ink-3);
  font-size: 11px; font-weight: 600; text-align: center;
}
.hist-warn { color: var(--amber-ink); }

/* Aviso de convalidados en la cabecera, bajo el KPI de Alumnos. */
.hk-sub {
  margin-top: 2px; padding: 0; border: 0; background: none;
  font-size: 11px; font-weight: 600; color: #6D28D9;
  cursor: pointer; text-decoration: underline dotted;
}
.hk-sub:hover { color: #4C1D95; }

.td-att { padding: 3px 4px !important; text-align: center; }
.td-part { padding: 3px 4px !important; text-align: center; }

.td-summary { text-align: center; }

/* LISTA DE NOTAS */
.att-matrix .th-group-pi { background: #EEF2FB !important; color: var(--blue-ink); }
.att-matrix .th-total { font-weight: 700; }
.td-total { text-align: center; font-weight: 600; background: #FBFBF7; }
.td-center { text-align: center; }
.grade-input {
  width: 40px; height: 24px; padding: 0 4px;
  border: 1px solid var(--line); border-radius: 5px;
  font-family: var(--font-mono); font-size: 11.5px; text-align: center;
  background: white; color: var(--ink);
}
.grade-input:focus { outline: none; border-color: var(--green-ink); }
.grade-input.wide { width: 64px; }
.grade-input::-webkit-outer-spin-button,
.grade-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.part-check { width: 15px; height: 15px; accent-color: var(--amber-ink); cursor: pointer; }
.ocup-pill {
  display: inline-grid; place-items: center;
  width: 22px; height: 20px; border-radius: 4px;
  font-size: 10px; font-weight: 700; font-family: var(--font-mono);
}
.ocup-pill.p { background: var(--slate-soft); color: var(--slate-ink); }
.ocup-pill.e { background: var(--blue-soft); color: var(--blue-ink); }
.row-debt td { background: #EAF2FD !important; }
.row-debt .sticky-c0, .row-debt .sticky-c1 { background: #EAF2FD !important; }
/* Promo LAPTOP: fila con tinte cian (mismo color que la tabla FICO).
   Si el alumno ademas tiene deuda, gana el azul de deuda (doble clase). */
.row-laptop td { background: #ECFEFF !important; }
.row-laptop .sticky-c0, .row-laptop .sticky-c1 { background: #ECFEFF !important; }
.row-debt.row-laptop td,
.row-debt.row-laptop .sticky-c0, .row-debt.row-laptop .sticky-c1 { background: #EAF2FD !important; }
.debt-ico { color: var(--blue-ink); font-size: 12px; margin-left: 2px; flex-shrink: 0; }
.grades-table .sticky-c1 { overflow: hidden; }
.debt-swatch {
  display: inline-block; width: 14px; height: 14px;
  border-radius: 4px; background: #EAF2FD; border: 1px solid #C8DCF5;
}
.expand-btn {
  display: inline-grid; place-items: center;
  width: 24px; height: 24px; border-radius: 5px;
  background: transparent; border: 1px solid var(--line);
  color: var(--ink-3); cursor: pointer; font-size: 10.5px;
}
.expand-btn:hover { color: var(--green-ink); border-color: var(--green-ink); }
.result-pill {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em;
}
.result-pill.ok { background: #E5F5EC; color: #1D7A4D; }
.result-pill.bad { background: #FDEAEA; color: #B43E3E; }
.cert-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em;
  background: #EAF0FA; color: #002060; white-space: nowrap;
}

.deliv-subrow > td { background: #FBFBF5; padding: 12px 16px; }
.deliv-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px; max-width: 980px;
}
.deliv-title {
  font-size: 11px; font-weight: 700; color: var(--ink);
  text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px;
}
.deliv-field {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; font-size: 12px; color: var(--ink-2, var(--ink));
  margin-bottom: 6px; white-space: normal;
}
.deliv-flags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }

/* Observaciones IA */
.obs-group { grid-column: 1 / -1; }
.obs-group .deliv-title { display: flex; align-items: center; gap: 10px; }
.btn-xs {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 5px; cursor: pointer;
  background: white; border: 1px solid var(--line);
  font-size: 10px; font-weight: 600; color: var(--ink-2, var(--ink));
  text-transform: none; letter-spacing: normal;
}
.btn-xs:hover:not(:disabled) { border-color: var(--green-ink); color: var(--green-ink); }
.btn-xs:disabled { opacity: 0.55; cursor: not-allowed; }
.obs-textarea {
  width: 100%; max-width: 880px; resize: vertical;
  border: 1px solid var(--line); border-radius: 6px;
  padding: 7px 9px; font-size: 12.5px; line-height: 1.45;
  font-family: inherit; background: white; color: var(--ink);
  white-space: normal;
}
.obs-textarea:focus { outline: none; border-color: var(--green-ink); }
.obs-textarea.ia-draft { border-color: var(--amber-ink); background: #FFFDF4; }
.obs-summary-card { grid-column: 1 / -1; }
.obs-summary-text { font-size: 13px; line-height: 1.55; margin: 0 0 8px; white-space: pre-wrap; }

.summary-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px; margin-top: 14px;
}
.summary-card {
  background: white; border: 1px solid var(--line);
  border-radius: var(--radius); padding: 14px 16px;
}
.sum-title {
  font-size: 11px; font-weight: 700; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.05em;
  margin: 0 0 10px; display: flex; align-items: center; gap: 7px;
}
.sum-rows { display: flex; flex-direction: column; gap: 6px; }
.sum-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; font-size: 12.5px;
}
.sum-row .ok-ink { color: #1D7A4D; }
.sum-row .bad-ink { color: #B43E3E; }
.sum-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.sum-table th, .sum-table td { padding: 3px 6px; text-align: center; }
.sum-table th { font-size: 10px; color: var(--ink-3); font-weight: 600; }
.sum-table td:first-child, .sum-table th:first-child { text-align: left; }
.top-row { align-items: flex-start; }
.top-pos {
  flex: 0 0 auto; display: inline-grid; place-items: center;
  width: 26px; height: 26px; border-radius: 999px;
  font-size: 11px; font-weight: 700; font-family: var(--font-mono);
}
.pos-1 { background: #FCF3D7; color: #9A7A1E; }
.pos-2 { background: #EEF0F3; color: #5A6572; }
.pos-3 { background: #F7E9DC; color: #9A6230; }
.top-name { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.footer-note {
  font-size: 12px; color: var(--ink-3); margin: 12px 0 0;
  display: flex; align-items: center; gap: 6px;
}
.footer-note i { color: var(--ink-4); }

/* RUBRICA */
.session-strip {
  display: flex; align-items: center; gap: 10px;
  background: white; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 10px 12px; margin-bottom: 12px;
}
.session-strip-label {
  font-size: 10.5px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.session-chips { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
.schip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px; border-radius: 6px;
  border: 1px solid var(--line); background: white;
  font-size: 12px; font-family: var(--font-mono); color: var(--ink-2);
  cursor: pointer;
}
.schip:hover { background: var(--bg-soft); }
.schip.active { background: var(--we-navy, #002060); color: white; border-color: var(--we-navy, #002060); }
.sdot { width: 6px; height: 6px; border-radius: 999px; background: var(--ink-4); }
.schip.active .sdot { background: white; }
.sdot.sdot-empty { background: var(--ink-4); }
.sdot.sdot-partial { background: #F59E0B; }
.sdot.sdot-done { background: var(--green); }

.rubric-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 14px;
}
.rh-eyebrow {
  font-size: 10.5px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.rh-title { margin: 4px 0 6px; font-size: 18px; font-weight: 600; }
.rh-meta { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--ink-2); }
.rh-actions { display: flex; gap: 8px; align-items: center; }
.ai-btn {
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  color: white; border-color: transparent;
}
.ai-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
}

/* AI PANEL */
.ai-panel {
  background: linear-gradient(180deg, #FAFAFE 0%, white 60%);
  border: 1px solid #E0E2FF; border-radius: var(--radius);
  padding: 14px 16px; margin-bottom: 14px;
}
.ai-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
  padding-bottom: 10px; border-bottom: 1px solid #E0E2FF;
}
.ai-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; color: #4F46E5;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.ai-when { margin-left: 6px; }
.ai-summary { display: flex; gap: 18px; }
.ai-summary-item { display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; }
.ai-summary-item strong { font-size: 14px; color: var(--ink); }

.ai-crits {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px; margin-bottom: 12px;
}
.ai-crit {
  background: white; border: 1px solid var(--line-soft);
  border-radius: 8px; padding: 10px 12px;
}
.ai-crit-head {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.ai-crit-id { font-size: 10.5px; color: var(--ink-3); }
.ai-crit-name { flex: 1; font-size: 12px; font-weight: 600; }
.ai-score {
  font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
  font-family: var(--font-mono);
}
.aisc-good { background: var(--green-soft); color: var(--green-ink); }
.aisc-ok   { background: var(--blue-soft); color: var(--blue-ink); }
.aisc-warn { background: var(--amber-soft); color: var(--amber-ink); }
.aisc-bad  { background: var(--red-soft); color: var(--red-ink); }

.sg-good  { color: var(--green-ink); }
.sg-ok    { color: var(--blue-ink); }
.sg-warn  { color: var(--amber-ink); }
.sg-bad   { color: var(--red-ink); }
.sg-empty { color: var(--ink-3); }

.gen-summary {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  margin-bottom: 16px;
}
.gen-summary-card {
  background: white; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
}
.gen-summary-card-main {
  border-color: var(--indigo, #6366f1);
  background: linear-gradient(180deg, rgba(99,102,241,.04) 0%, white 60%);
}
.gen-summary-card .gen-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
  color: var(--ink-3); font-weight: 600;
}
.gen-summary-card strong { font-size: 26px; font-weight: 700; line-height: 1; }

.gen-table-wrap {
  background: white; border: 1px solid var(--line); border-radius: var(--radius);
  overflow: hidden;
}
.gen-table { width: 100%; border-collapse: collapse; }
.gen-table th, .gen-table td {
  padding: 10px 14px; font-size: 12px; text-align: left;
  border-bottom: 1px solid var(--line-soft);
}
.gen-table thead th {
  background: var(--bg-soft, #fafafa); font-weight: 600; color: var(--ink-2);
  font-size: 11px; text-transform: uppercase; letter-spacing: .03em;
}
.gen-table tbody tr:last-child td { border-bottom: none; }
.gen-table .td-session { font-weight: 700; }
.gen-verdict {
  display: inline-block; padding: 2px 8px; border-radius: 5px;
  font-size: 10.5px; font-weight: 700; letter-spacing: .03em;
  background: var(--slate-soft);
}
.gen-verdict.sg-good { background: var(--green-soft); }
.gen-verdict.sg-ok   { background: var(--blue-soft); }
.gen-verdict.sg-warn { background: var(--amber-soft); }
.gen-verdict.sg-bad  { background: var(--red-soft); }

.gen-trend-card {
  background: white; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 16px 18px; margin-bottom: 16px;
}
.gen-trend-head { margin-bottom: 6px; }
.gen-trend-hint { margin: 4px 0 0; }

.gen-coverage {
  margin-top: 12px; padding-top: 14px;
  border-top: 1px dashed var(--line-soft);
}
.gen-coverage-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 22px;
  margin-top: 10px;
}
.gen-coverage-item { display: flex; flex-direction: column; gap: 6px; }
.gcv-head {
  display: flex; align-items: baseline; justify-content: space-between;
}
.gcv-name {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--ink-2); font-weight: 600;
}
.gcv-count { font-size: 12px; color: var(--ink-2); }
.gcv-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
}
.gcv-dot-ai     { background: #6366f1; }
.gcv-dot-manual { background: #f59e0b; }
.gcv-bar {
  position: relative; height: 6px;
  background: var(--bg-soft, #f1f5f9);
  border-radius: 999px; overflow: hidden;
}
.gcv-fill {
  position: absolute; top: 0; bottom: 0; left: 0;
  border-radius: inherit;
  transition: width .3s ease;
}
.gcv-fill-ai     { background: #6366f1; }
.gcv-fill-manual { background: #f59e0b; }
.gen-coverage-warn {
  display: flex; align-items: center; gap: 6px;
  margin: 12px 0 0; font-size: 11.5px;
  color: var(--amber-ink);
}
.ai-crit-comment { font-size: 11.5px; line-height: 1.45; color: var(--ink-2); margin: 0 0 6px; }
.ai-stamps { display: flex; flex-wrap: wrap; gap: 4px; }
.ai-stamp {
  background: var(--slate-soft); color: var(--slate-ink);
  font-size: 10px; padding: 1px 5px; border-radius: 4px;
}

.ai-insights {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-top: 8px;
}
.ai-insight-block { background: white; border: 1px solid var(--line-soft); border-radius: 8px; padding: 10px 12px; }
.ai-insight-block h4 { margin: 0 0 8px; font-size: 12.5px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.ai-insight-block ul { list-style: none; padding: 0; margin: 0; font-size: 11.5px; }
.ai-insight-block li { padding: 5px 0; border-top: 1px dashed var(--line-soft); }
.ai-insight-block li:first-child { border-top: none; }
.ai-insight-block li strong { display: block; color: var(--ink); }
.ai-insight-block li span { display: block; margin-top: 2px; line-height: 1.4; }


.rubric-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
}
.rubric-cat {
  background: white; border: 1px solid var(--line); border-radius: var(--radius);
  padding: 14px 16px;
}
.rc-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding-bottom: 10px;
  border-bottom: 1px solid var(--line-soft);
  margin-bottom: 8px;
}
.rc-head h3 { margin: 0; font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; }
.rc-total {
  background: var(--bg-soft); padding: 2px 8px; border-radius: 5px;
  font-size: 11.5px; font-weight: 600; color: var(--ink-2);
}
.rc-items { list-style: none; padding: 0; margin: 0; }
.rc-item { padding: 6px 0; }
.rc-check {
  display: flex; gap: 9px; cursor: pointer; align-items: flex-start;
  font-size: 12.5px; line-height: 1.45;
}
.rc-check input { position: absolute; opacity: 0; pointer-events: none; }
.rc-box {
  flex-shrink: 0; width: 18px; height: 18px;
  border: 1.5px solid var(--line); border-radius: 4px;
  background: white;
  display: grid; place-items: center;
  margin-top: 1px;
  transition: background 0.12s, border-color 0.12s;
}
.rc-box i {
  color: white; font-size: 10px; opacity: 0;
  transition: opacity 0.12s;
}
.rc-check input:checked ~ .rc-box {
  background: var(--green); border-color: var(--green);
}
.rc-check input:checked ~ .rc-box i { opacity: 1; }
.rc-text { color: var(--ink-2); }
.rc-check input:checked ~ .rc-text { color: var(--ink); }

@media (max-width: 1100px) {
  .rubric-grid { grid-template-columns: 1fr; }
  .info-row { gap: 14px; }
  .head-kpis { padding-left: 12px; gap: 14px; }
}

/* DARK MODE */
[data-coreui-theme="dark"] .aula-detail {
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
  --slate-soft: #2A2A22;
  --slate-ink: #A0A099;
}
[data-coreui-theme="dark"] .aula-detail .page-head,
[data-coreui-theme="dark"] .aula-detail .toolbar,
[data-coreui-theme="dark"] .aula-detail .session-strip,
[data-coreui-theme="dark"] .aula-detail .rubric-cat,
[data-coreui-theme="dark"] .aula-detail .att-matrix-scroll { background: #1A1A14; }
[data-coreui-theme="dark"] .aula-detail .back-btn,
[data-coreui-theme="dark"] .aula-detail .btn,
[data-coreui-theme="dark"] .aula-detail .input,
[data-coreui-theme="dark"] .aula-detail .chip,
[data-coreui-theme="dark"] .aula-detail .schip { background: #1A1A14; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aula-detail .csv-menu { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .aula-detail .csv-menu button { color: #D4D4CC; }
[data-coreui-theme="dark"] .aula-detail .csv-menu button:hover { background: #22221C; }
[data-coreui-theme="dark"] .aula-detail .att-matrix thead th,
[data-coreui-theme="dark"] .aula-detail .att-matrix .sticky-c0,
[data-coreui-theme="dark"] .aula-detail .att-matrix .sticky-c1,
[data-coreui-theme="dark"] .aula-detail .att-matrix .sticky-c2 { background: #1A1A14; }
[data-coreui-theme="dark"] .aula-detail .att-matrix thead .sticky-c0,
[data-coreui-theme="dark"] .aula-detail .att-matrix thead .sticky-c1,
[data-coreui-theme="dark"] .aula-detail .att-matrix thead .sticky-c2 { background: #1F1F1A; }
[data-coreui-theme="dark"] .aula-detail .grade-input { background: #14140F; border-color: #3A3A33; color: #E8E8E0; }
[data-coreui-theme="dark"] .aula-detail .td-total { background: #1F1F1A; }
[data-coreui-theme="dark"] .aula-detail .row-debt td,
[data-coreui-theme="dark"] .aula-detail .row-debt .sticky-c0,
[data-coreui-theme="dark"] .aula-detail .row-debt .sticky-c1 { background: #1B2536 !important; }
[data-coreui-theme="dark"] .aula-detail .row-laptop td,
[data-coreui-theme="dark"] .aula-detail .row-laptop .sticky-c0,
[data-coreui-theme="dark"] .aula-detail .row-laptop .sticky-c1 { background: rgba(8, 145, 178, 0.14) !important; }
[data-coreui-theme="dark"] .aula-detail .row-debt.row-laptop td,
[data-coreui-theme="dark"] .aula-detail .row-debt.row-laptop .sticky-c0,
[data-coreui-theme="dark"] .aula-detail .row-debt.row-laptop .sticky-c1 { background: #1B2536 !important; }
[data-coreui-theme="dark"] .aula-detail .deliv-subrow > td { background: #1F1F1A; }
[data-coreui-theme="dark"] .aula-detail .summary-card { background: #1A1A14; border-color: #3A3A33; }
[data-coreui-theme="dark"] .aula-detail .hist-card { background: #1A1A14; border-color: #3A3A33; }
[data-coreui-theme="dark"] .aula-detail .hist-head { background: #1F1F1A; border-color: #3A3A33; }
[data-coreui-theme="dark"] .aula-detail .hist-count { background: #14140F; border-color: #3A3A33; }
[data-coreui-theme="dark"] .aula-detail .obs-textarea,
[data-coreui-theme="dark"] .aula-detail .btn-xs { background: #14140F; border-color: #3A3A33; color: #E8E8E0; }
[data-coreui-theme="dark"] .aula-detail .obs-textarea.ia-draft { background: #221F12; }
[data-coreui-theme="dark"] .aula-detail .rc-box { background: #1A1A14; border-color: #3A3A33; }
[data-coreui-theme="dark"] .aula-detail .ai-panel {
  background: linear-gradient(180deg, #1A1A24 0%, #1A1A14 60%);
  border-color: #3A3A55;
}
[data-coreui-theme="dark"] .aula-detail .ai-panel-head { border-color: #3A3A55; }
[data-coreui-theme="dark"] .aula-detail .ai-crit,
[data-coreui-theme="dark"] .aula-detail .ai-insight-block { background: #1A1A14; border-color: #2A2A22; }

/* ==================================================================== */
/* AUDITORIA - REDISENO (portado del prototipo, namespaced .audit-rd)   */
/* ==================================================================== */
.audit-rd {
  --ar-accent: #6366f1;
  --ar-accent-ink: #ffffff;
  --ar-surface: #ffffff;
  --ar-surface-2: #faf9f8;
  --ar-surface-3: #f1efed;
  --ar-border: #e8e6e3;
  --ar-border-strong: #d8d4d0;
  --ar-ink: #1b1917;
  --ar-ink-2: #57534e;
  --ar-ink-3: #8d877f;
  --ar-track: #ece9e6;
  --ar-seg-on: #ffffff;
  --ar-shadow: 0 1px 2px rgba(28, 25, 23, .05), 0 1px 1px rgba(28, 25, 23, .03);
  --ar-shadow-lg: 0 10px 30px -12px rgba(28, 25, 23, .18);
  --ar-s1-bg: #fde8e6; --ar-s1-fg: #c0362c;
  --ar-s2-bg: #fdeccb; --ar-s2-fg: #a96208;
  --ar-s3-bg: #dde8fd; --ar-s3-fg: #2256c9;
  --ar-s4-bg: #d9f3df; --ar-s4-fg: #1d7a40;
  --ar-s5-bg: #cdf1e4; --ar-s5-fg: #0a7a5c;
  /* Misma fuente que el resto del ERP (no monospace, era incongruente).
     tabular-nums mantiene los numeros alineados sin cambiar de familia. */
  --ar-mono: inherit;
  --ar-r-sm: 8px; --ar-r: 12px; --ar-r-lg: 16px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  color: var(--ar-ink);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

/* tira de sesiones */
.audit-rd .ar-sess-strip { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.audit-rd .ar-sess-lbl { font-size: 11px; font-weight: 700; letter-spacing: .09em; color: var(--ar-ink-3); margin-right: 4px; }
.audit-rd .ar-sess-pill {
  display: inline-flex; flex-direction: row; align-items: center; gap: 7px;
  background: var(--ar-surface); border: 1px solid var(--ar-border); border-radius: 10px; padding: 8px 14px;
  transition: .15s; cursor: pointer;
}
.audit-rd .ar-sess-pill:hover { border-color: var(--ar-border-strong); }
.audit-rd .ar-sess-pill .slabel { font-size: 13.5px; font-weight: 700; color: var(--ar-ink-2); }
.audit-rd .ar-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ar-ink-3); flex: none; }
.audit-rd .ar-dot.sdot-empty { background: var(--ar-ink-3); }
.audit-rd .ar-dot.sdot-partial { background: var(--ar-accent); }
.audit-rd .ar-dot.sdot-done { background: var(--ar-s4-fg); }
.audit-rd .ar-sess-pill .note { font-size: 13px; font-weight: 700; color: var(--ar-ink); }
.audit-rd .ar-sess-pill .note.pend { color: var(--ar-ink-3); font-weight: 600; }
.audit-rd .ar-sess-pill.active { background: var(--ar-accent); border-color: var(--ar-accent); }
.audit-rd .ar-sess-pill.active .slabel, .audit-rd .ar-sess-pill.active .note { color: var(--ar-accent-ink); }
.audit-rd .ar-sess-pill.active .ar-dot { background: var(--ar-accent-ink) !important; }

/* scorecard */
.audit-rd .ar-scorecard {
  background: var(--ar-surface); border: 1px solid var(--ar-border); border-radius: var(--ar-r-lg);
  box-shadow: var(--ar-shadow); display: flex; align-items: stretch; overflow: hidden; flex-wrap: wrap;
}
.audit-rd .sc-hero {
  padding: 15px 18px; display: flex; gap: 14px; align-items: center;
  background: linear-gradient(135deg, color-mix(in oklab, var(--ar-accent) 9%, var(--ar-surface)), var(--ar-surface));
  border-right: 1px solid var(--ar-border); min-width: 280px; flex: 1;
}
.audit-rd .sc-ring { position: relative; width: 68px; height: 68px; flex: none; }
.audit-rd .sc-ring svg { transform: rotate(-90deg); width: 100%; height: 100%; }
.audit-rd .sc-ring .ring-track { stroke: var(--ar-track); }
.audit-rd .sc-ring .ring-prog { stroke: var(--ar-s3-fg); transition: stroke-dashoffset .6s cubic-bezier(.2, .8, .2, 1); }
.audit-rd .sc-ring.lvl-1 .ring-prog { stroke: var(--ar-s1-fg); }
.audit-rd .sc-ring.lvl-2 .ring-prog { stroke: var(--ar-s2-fg); }
.audit-rd .sc-ring.lvl-3 .ring-prog { stroke: var(--ar-s3-fg); }
.audit-rd .sc-ring.lvl-4 .ring-prog { stroke: var(--ar-s4-fg); }
.audit-rd .sc-ring.lvl-5 .ring-prog { stroke: var(--ar-s5-fg); }
.audit-rd .sc-ring .ring-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.audit-rd .sc-ring .ring-num b { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
.audit-rd .sc-ring .ring-num span { font-size: 9px; color: var(--ar-ink-3); font-weight: 700; }
.audit-rd .sc-hero .label { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; color: var(--ar-ink-3); }
.audit-rd .sc-hero .big { font-size: 16px; font-weight: 800; margin-top: 2px; }
.audit-rd .sc-hero .prov {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 11.5px; font-weight: 600;
  color: var(--ar-s2-fg); background: var(--ar-s2-bg); border-radius: 20px; padding: 2px 9px;
}
.audit-rd .sc-hero .prov.firm { color: var(--ar-s4-fg); background: var(--ar-s4-bg); }
.audit-rd .sc-evals { display: flex; flex: 2; min-width: 300px; }
.audit-rd .sc-eval { flex: 1; padding: 14px 18px; border-right: 1px solid var(--ar-border); display: flex; flex-direction: column; gap: 8px; }
.audit-rd .sc-eval:last-child { border-right: none; }
.audit-rd .sc-eval .head { display: flex; align-items: center; gap: 8px; }
.audit-rd .sc-eval .head .tag { font-size: 11px; font-weight: 700; letter-spacing: .07em; color: var(--ar-ink-3); }
.audit-rd .sc-eval .head .badge-ia {
  font-size: 10px; font-weight: 800; letter-spacing: .04em; color: var(--ar-accent);
  background: color-mix(in oklab, var(--ar-accent) 14%, transparent); border-radius: 5px; padding: 2px 7px;
}
.audit-rd .sc-eval .score { display: flex; align-items: baseline; gap: 4px; }
.audit-rd .sc-eval .score b { font-size: 23px; font-weight: 800; letter-spacing: -0.02em; }
.audit-rd .sc-eval .score span { font-size: 13px; color: var(--ar-ink-3); font-weight: 600; }
.audit-rd .bar { height: 8px; border-radius: 20px; background: var(--ar-track); overflow: hidden; }
.audit-rd .bar > i { display: block; height: 100%; border-radius: 20px; transition: width .5s cubic-bezier(.2, .8, .2, 1); }
.audit-rd .bar > i.fill-1 { background: var(--ar-s1-fg); }
.audit-rd .bar > i.fill-2 { background: var(--ar-s2-fg); }
.audit-rd .bar > i.fill-3 { background: var(--ar-s3-fg); }
.audit-rd .bar > i.fill-4 { background: var(--ar-s4-fg); }
.audit-rd .bar > i.fill-5 { background: var(--ar-s5-fg); }
.audit-rd .bar > i.fill-accent { background: var(--ar-accent); }
.audit-rd .sc-eval .weight { font-size: 11px; color: var(--ar-ink-3); font-weight: 600; }

/* toolbar + segmented */
.audit-rd .ar-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.audit-rd .ar-grow { flex: 1; }
.audit-rd .ar-segmented { display: inline-flex; background: var(--ar-surface-3); border-radius: 12px; padding: 4px; gap: 2px; }
.audit-rd .ar-segmented button {
  border: none; background: transparent; padding: 7px 13px; border-radius: 9px; font-size: 13px; font-weight: 600;
  color: var(--ar-ink-2); display: flex; align-items: center; gap: 7px; transition: .15s; cursor: pointer;
}
.audit-rd .ar-segmented button.on { background: var(--ar-seg-on); color: var(--ar-ink); box-shadow: var(--ar-shadow); }
.audit-rd .ar-segmented button .pip { font-size: 11px; font-family: var(--ar-mono); color: var(--ar-ink-3); }

/* botones */
.audit-rd .ar-btn {
  border: 1px solid var(--ar-border-strong); background: var(--ar-surface); color: var(--ar-ink); border-radius: 9px;
  padding: 8px 13px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 7px;
  transition: .15s; cursor: pointer;
}
.audit-rd .ar-btn:hover { background: var(--ar-surface-3); }
.audit-rd .ar-btn:disabled { opacity: .6; cursor: default; }
.audit-rd .ar-btn.primary { background: var(--ar-accent); color: var(--ar-accent-ink); border-color: var(--ar-accent); }
.audit-rd .ar-btn.primary:hover { filter: brightness(1.06); background: var(--ar-accent); }

/* stacks / cards / generic */
.audit-rd .ar-stack { display: flex; flex-direction: column; gap: 11px; }
.audit-rd .ar-card { background: var(--ar-surface); border: 1px solid var(--ar-border); border-radius: var(--ar-r-lg); box-shadow: var(--ar-shadow); padding: 15px 18px; }
.audit-rd .ar-eyebrow { font-size: 10.5px; font-weight: 700; letter-spacing: .1em; color: var(--ar-ink-3); }
.audit-rd .ar-eyebrow.accent { color: var(--ar-accent); }
.audit-rd .ar-card-title { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; margin: 2px 0 0; }
.audit-rd .ar-card-head { display: flex; align-items: flex-start; gap: 11px; padding-bottom: 13px; margin-bottom: 18px; border-bottom: 1px solid var(--ar-border); }
.audit-rd .ar-card-head .ic { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-size: 14px; flex: none; background: color-mix(in oklab, var(--ar-accent) 12%, transparent); color: var(--ar-accent); }
.audit-rd .ar-metaline { font-size: 12.5px; color: var(--ar-ink-3); }
.audit-rd .ar-metaline b { color: var(--ar-ink-2); }
.audit-rd .ar-empty { text-align: center; padding: 60px 20px; color: var(--ar-ink-3); background: var(--ar-surface); border: 1px dashed var(--ar-border); border-radius: var(--ar-r); }
.audit-rd .ar-empty .big { font-size: 17px; font-weight: 700; color: var(--ar-ink-2); margin-bottom: 6px; }

/* metrics */
.audit-rd .ar-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 11px; }
.audit-rd .ar-metric { background: var(--ar-surface); border: 1px solid var(--ar-border); border-radius: var(--ar-r); padding: 14px 16px; box-shadow: var(--ar-shadow); }
.audit-rd .ar-metric .lbl { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; color: var(--ar-ink-3); margin-bottom: 8px; }
.audit-rd .ar-metric .big { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
.audit-rd .ar-metric .big.sm { font-size: 17px; }
.audit-rd .ar-metric .big .suf { font-size: 14px; color: var(--ar-ink-3); font-weight: 600; }
.audit-rd .split-bar { display: flex; height: 10px; border-radius: 20px; overflow: hidden; margin-top: 12px; background: var(--ar-track); }
.audit-rd .split-bar .p { background: var(--ar-accent); }
.audit-rd .split-bar .t { background: var(--ar-s2-fg); }
.audit-rd .split-legend { display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--ar-ink-2); }
.audit-rd .split-legend.center { justify-content: center; }
.audit-rd .split-legend i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 6px; }
.audit-rd .split-legend .li-p, .audit-rd .split-legend .li-ac { background: var(--ar-accent); }
.audit-rd .split-legend .li-t { background: var(--ar-s2-fg); }
.audit-rd .split-legend .li-ia { background: color-mix(in oklab, var(--ar-accent) 60%, var(--ar-surface)); }

/* fortalezas / oportunidades */
.audit-rd .ar-fo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; align-items: start; }
.audit-rd .ar-fo { background: var(--ar-surface); border: 1px solid var(--ar-border); border-radius: var(--ar-r-lg); box-shadow: var(--ar-shadow); padding: 15px 18px; }
.audit-rd .ar-fo .fo-head { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 800; margin-bottom: 10px; }
.audit-rd .ar-fo .fo-head .ic { width: 27px; height: 27px; border-radius: 8px; display: grid; place-items: center; font-size: 13px; }
.audit-rd .ar-fo.str .ic { background: var(--ar-s4-bg); color: var(--ar-s4-fg); }
.audit-rd .ar-fo.opp .ic { background: var(--ar-s2-bg); color: var(--ar-s2-fg); }
.audit-rd .ar-fo .fo-item { padding: 9px 0; border-top: 1px solid var(--ar-border); }
.audit-rd .ar-fo .fo-item:first-of-type { border-top: none; }
.audit-rd .ar-fo .fo-item .t { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
.audit-rd .ar-fo .fo-item .d { font-size: 12.5px; line-height: 1.45; color: var(--ar-ink-2); }

/* compare chart */
.audit-rd .ar-ia-toolbar, .audit-rd .ar-acad-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.audit-rd .ar-sort { display: inline-flex; gap: 2px; background: var(--ar-surface-3); border-radius: 9px; padding: 3px; }
.audit-rd .ar-sort button { border: none; background: transparent; font-size: 12.5px; font-weight: 600; color: var(--ar-ink-2); padding: 6px 11px; border-radius: 7px; cursor: pointer; }
.audit-rd .ar-sort button.on { background: var(--ar-seg-on); color: var(--ar-ink); box-shadow: var(--ar-shadow); }
.audit-rd .ar-compare { display: flex; align-items: flex-end; gap: 16px; height: 150px; padding: 14px 6px 0; }
.audit-rd .cmp-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; cursor: pointer; }
.audit-rd .cmp-bars { display: flex; gap: 5px; align-items: flex-end; height: 100%; width: 100%; justify-content: center; }
.audit-rd .cmp-bar { width: 26px; border-radius: 6px 6px 0 0; position: relative; transition: height .5s; min-height: 2px; }
.audit-rd .cmp-bar.ia { background: color-mix(in oklab, var(--ar-accent) 60%, var(--ar-surface)); }
.audit-rd .cmp-bar.ac { background: var(--ar-accent); }
.audit-rd .cmp-bar .v { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 10px; font-family: var(--ar-mono); color: var(--ar-ink-2); font-weight: 700; }
.audit-rd .cmp-pend { align-self: flex-end; color: var(--ar-ink-3); font-size: 11px; font-family: var(--ar-mono); }
.audit-rd .cmp-x { font-size: 12px; font-weight: 700; color: var(--ar-ink-2); }
.audit-rd .cmp-col.current .cmp-x { color: var(--ar-accent); }

/* IA criterion cards */
.audit-rd .ar-crit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 11px; }
.audit-rd .ar-crit {
  background: var(--ar-surface); border: 1px solid var(--ar-border); border-radius: var(--ar-r); padding: 13px 15px;
  display: flex; flex-direction: column; gap: 8px; box-shadow: var(--ar-shadow); position: relative; overflow: hidden;
}
.audit-rd .ar-crit::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ar-edge, transparent); }
.audit-rd .ar-crit.bc-1 { --ar-edge: var(--ar-s1-fg); --ar-barc: var(--ar-s1-fg); }
.audit-rd .ar-crit.bc-2 { --ar-edge: var(--ar-s2-fg); --ar-barc: var(--ar-s2-fg); }
.audit-rd .ar-crit.bc-3 { --ar-edge: var(--ar-s3-fg); --ar-barc: var(--ar-s3-fg); }
.audit-rd .ar-crit.bc-4 { --ar-edge: var(--ar-s4-fg); --ar-barc: var(--ar-s4-fg); }
.audit-rd .ar-crit.bc-5 { --ar-edge: var(--ar-s5-fg); --ar-barc: var(--ar-s5-fg); }
.audit-rd .ar-crit .crit-top { display: flex; align-items: flex-start; gap: 10px; }
.audit-rd .ar-crit .num { font-family: var(--ar-mono); font-size: 12px; color: var(--ar-ink-3); font-weight: 600; padding-top: 2px; }
.audit-rd .ar-crit .crit-title { font-size: 13.5px; font-weight: 700; flex: 1; line-height: 1.25; margin: 0; }
.audit-rd .ar-crit .score-badge { font-family: var(--ar-mono); font-size: 11.5px; font-weight: 700; border-radius: 7px; padding: 3px 9px; white-space: nowrap; }
.audit-rd .score-badge.sv-1 { background: var(--ar-s1-bg); color: var(--ar-s1-fg); }
.audit-rd .score-badge.sv-2 { background: var(--ar-s2-bg); color: var(--ar-s2-fg); }
.audit-rd .score-badge.sv-3 { background: var(--ar-s3-bg); color: var(--ar-s3-fg); }
.audit-rd .score-badge.sv-4 { background: var(--ar-s4-bg); color: var(--ar-s4-fg); }
.audit-rd .score-badge.sv-5 { background: var(--ar-s5-bg); color: var(--ar-s5-fg); }
.audit-rd .ar-crit .scorebar { display: flex; gap: 4px; }
.audit-rd .ar-crit .scorebar i { height: 5px; flex: 1; border-radius: 20px; background: var(--ar-track); }
.audit-rd .ar-crit .scorebar i.fill { background: var(--ar-barc); }
.audit-rd .ar-crit .crit-text { font-size: 12.5px; line-height: 1.5; color: var(--ar-ink-2); margin: 0; }
.audit-rd .ar-crit .stamps { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
.audit-rd .ar-crit .stamp { font-family: var(--ar-mono); font-size: 11px; color: var(--ar-ink-2); background: var(--ar-surface-3); border: 1px solid var(--ar-border); border-radius: 6px; padding: 2px 7px; }

/* rubrica academica */
.audit-rd .ar-acad-prog { text-align: right; }
.audit-rd .ar-acad-prog .big { font-family: var(--ar-mono); font-size: 18px; font-weight: 800; }
.audit-rd .ar-rub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; align-items: start; }
.audit-rd .ar-rub-cat { background: var(--ar-surface); border: 1px solid var(--ar-border); border-radius: var(--ar-r); box-shadow: var(--ar-shadow); overflow: hidden; }
.audit-rd .ar-rub-cat .rc-head { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-bottom: 1px solid var(--ar-border); }
.audit-rd .ar-rub-cat .rc-head h3 { font-size: 13.5px; font-weight: 800; margin: 0; flex: 1; }
.audit-rd .ar-rub-cat .rc-prog { font-family: var(--ar-mono); font-size: 12px; font-weight: 700; color: var(--ar-ink-2); }
.audit-rd .ar-rub-cat .rc-bar { height: 4px; background: var(--ar-track); }
.audit-rd .ar-rub-cat .rc-bar > i { display: block; height: 100%; background: var(--ar-accent); transition: width .4s; }
.audit-rd .rub-row { display: flex; align-items: flex-start; gap: 11px; padding: 10px 15px; border-top: 1px solid var(--ar-border); cursor: pointer; transition: background .12s; user-select: none; }
.audit-rd .rub-row:hover { background: var(--ar-surface-2); }
.audit-rd .rub-row .cbx { width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--ar-border-strong); flex: none; margin-top: 1px; display: grid; place-items: center; transition: .15s; color: transparent; font-size: 10px; }
.audit-rd .rub-row.on .cbx { background: var(--ar-accent); border-color: var(--ar-accent); color: var(--ar-accent-ink); }
.audit-rd .rub-row .rtext { font-size: 13px; line-height: 1.45; color: var(--ar-ink); }
.audit-rd .rub-row.on .rtext { color: var(--ar-ink-2); }

/* save bar */
.audit-rd .ar-savebar {
  position: sticky; bottom: 0; z-index: 5; margin-top: 2px;
  background: color-mix(in oklab, var(--ar-surface) 88%, transparent); backdrop-filter: blur(10px);
  border: 1px solid var(--ar-border); border-radius: var(--ar-r); box-shadow: var(--ar-shadow-lg);
  display: flex; align-items: center; gap: 16px; padding: 12px 18px; flex-wrap: wrap;
}
.audit-rd .ar-savebar .prog-text { font-size: 14px; font-weight: 600; }
.audit-rd .ar-savebar .prog-text b { font-family: var(--ar-mono); }
.audit-rd .ar-savebar .ar-saved { font-size: 12px; color: var(--ar-ink-3); }

/* ---- General: cobertura, tabla, veredicto ---- */
.audit-rd .ar-chart-hint { margin: 4px 0 8px; }
.audit-rd .ar-coverage { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 14px; padding-top: 16px; border-top: 1px solid var(--ar-border); }
.audit-rd .cov-item { display: flex; flex-direction: column; gap: 7px; }
.audit-rd .cov-head { display: flex; align-items: center; justify-content: space-between; }
.audit-rd .cov-name { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--ar-ink-2); }
.audit-rd .cov-dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }
.audit-rd .cov-dot.ia { background: color-mix(in oklab, var(--ar-accent) 60%, var(--ar-surface)); }
.audit-rd .cov-dot.ac { background: var(--ar-accent); }
.audit-rd .cov-count { font-size: 12.5px; font-weight: 700; color: var(--ar-ink-2); }
.audit-rd .cov-bar { height: 8px; border-radius: 20px; background: var(--ar-track); overflow: hidden; }
.audit-rd .cov-bar > i { display: block; height: 100%; border-radius: 20px; transition: width .5s cubic-bezier(.2, .8, .2, 1); }
.audit-rd .cov-bar > i.ia { background: color-mix(in oklab, var(--ar-accent) 60%, var(--ar-surface)); }
.audit-rd .cov-bar > i.ac { background: var(--ar-accent); }
.audit-rd .ar-warn { display: flex; align-items: center; gap: 8px; margin: 14px 0 0; font-size: 12.5px; color: var(--ar-s2-fg); background: var(--ar-s2-bg); border-radius: 8px; padding: 9px 12px; }

.audit-rd .ar-table-card { padding: 18px 0 6px; }
.audit-rd .ar-table-card .ar-eyebrow { padding: 0 22px 12px; }
.audit-rd .ar-table-scroll { overflow-x: auto; }
.audit-rd .ar-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.audit-rd .ar-table thead th {
  text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .06em; color: var(--ar-ink-3);
  padding: 8px 16px; border-bottom: 1px solid var(--ar-border); white-space: nowrap;
}
.audit-rd .ar-table tbody td { padding: 9px 14px; border-bottom: 1px solid var(--ar-border); color: var(--ar-ink-2); white-space: nowrap; }
.audit-rd .ar-table tbody tr:last-child td { border-bottom: none; }
.audit-rd .ar-table tbody tr.current { background: color-mix(in oklab, var(--ar-accent) 6%, transparent); }
.audit-rd .ar-table .td-s { font-weight: 700; color: var(--ar-ink); }
.audit-rd .ar-table .num { font-weight: 600; color: var(--ar-ink); }
.audit-rd .ar-muted { color: var(--ar-ink-3); font-size: 12.5px; }
.audit-rd .ar-table .score-badge { font-size: 12px; font-weight: 700; border-radius: 7px; padding: 3px 9px; }
.audit-rd .ar-table .score-badge.strong { font-size: 13px; }
.audit-rd .ar-verdict { font-size: 11px; font-weight: 800; letter-spacing: .05em; }
.audit-rd .ar-verdict.sv-1 { color: var(--ar-s1-fg); }
.audit-rd .ar-verdict.sv-2 { color: var(--ar-s2-fg); }
.audit-rd .ar-verdict.sv-3 { color: var(--ar-s3-fg); }
.audit-rd .ar-verdict.sv-4 { color: var(--ar-s4-fg); }
.audit-rd .ar-verdict.sv-5 { color: var(--ar-s5-fg); }
.audit-rd .ar-footer-note { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ar-ink-3); margin: 2px 0 0; }

@media (max-width: 1100px) {
  .audit-rd .ar-fo-grid, .audit-rd .ar-rub-grid { grid-template-columns: 1fr; }
  .audit-rd .ar-coverage { grid-template-columns: 1fr; }
}

/* ---- DARK (CoreUI) ---- */
[data-coreui-theme="dark"] .audit-rd {
  --ar-surface: #1d1a17;
  --ar-surface-2: #221e1b;
  --ar-surface-3: #2a2521;
  --ar-border: #2f2a26;
  --ar-border-strong: #423b35;
  --ar-ink: #f6f3ef;
  --ar-ink-2: #b0a99f;
  --ar-ink-3: #7d756b;
  --ar-track: #2a2521;
  --ar-seg-on: #3b342d;
  --ar-shadow: 0 1px 2px rgba(0, 0, 0, .4);
  --ar-shadow-lg: 0 14px 40px -14px rgba(0, 0, 0, .6);
  --ar-s1-bg: #3a1c1a; --ar-s1-fg: #f0a39b;
  --ar-s2-bg: #392713; --ar-s2-fg: #f2c179;
  --ar-s3-bg: #1c2c4a; --ar-s3-fg: #9cc0f5;
  --ar-s4-bg: #163020; --ar-s4-fg: #82dca0;
  --ar-s5-bg: #0f2e26; --ar-s5-fg: #6fd9b6;
}

</style>

<style>
/* MODAL IA (no-scoped: el modal se teleporta a <body> y no recibe
   los selectores [data-v-xxxx] de scoped). Prefijo "aam-" para evitar
   colisiones con clases globales. */
.aula-ai-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(20, 20, 15, 0.55);
  backdrop-filter: blur(4px);
  display: grid; place-items: center;
  z-index: 10000; padding: 20px;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
}
.aula-ai-modal {
  background: white; border-radius: 14px;
  width: 100%; max-width: 720px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  color: #14140F;
}
.aam-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid #E8E8E3;
}
.aam-head h3 { margin: 4px 0 0; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.aam-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; color: #4F46E5;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.aam-close {
  width: 30px; height: 30px; border-radius: 7px;
  border: 1px solid #E8E8E3; background: white;
  color: #6F6F66; cursor: pointer;
  display: grid; place-items: center;
}
.aam-close:hover { background: #FAFAF8; color: #14140F; }

.aam-body { padding: 18px 22px; overflow: auto; }
.aam-intro {
  font-size: 13px; color: #3A3A33; margin: 0 0 16px;
  line-height: 1.55;
}

.aam-field { margin-bottom: 16px; }
.aam-field-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 6px;
}
.aam-field label {
  display: block; font-size: 11.5px; font-weight: 600;
  color: #6F6F66; text-transform: uppercase; letter-spacing: 0.04em;
}
.aam-upload-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 7px;
  background: #FAFAF8; border: 1px solid #E8E8E3;
  font-size: 11.5px; font-weight: 500; color: #3A3A33;
  cursor: pointer; text-transform: none; letter-spacing: 0;
}
.aam-upload-btn:hover { background: #F1F3F5; border-color: #D4D4CC; }
.aam-field textarea {
  width: 100%; resize: vertical; min-height: 160px;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px; line-height: 1.5;
  padding: 10px 12px; border: 1px solid #E8E8E3; border-radius: 8px;
  background: #FAFAF8; color: #14140F; outline: none;
}
.aam-field textarea:focus { background: white; border-color: #6F6F66; }
.aam-field input[type="file"] { font-size: 12px; padding: 6px 0; }
.aam-hint { display: block; margin-top: 5px; font-size: 11px; color: #6F6F66; }

.aam-error {
  background: #FEECEC; color: #B91C1C;
  padding: 9px 12px; border-radius: 8px;
  font-size: 12.5px; margin-top: 8px;
  display: flex; align-items: center; gap: 6px;
}

.aam-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 22px; border-top: 1px solid #E8E8E3;
}
.aam-foot .btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  border: 1px solid #E8E8E3; background: white;
  color: #3A3A33; cursor: pointer;
}
.aam-foot .btn:hover:not(:disabled) { background: #FAFAF8; }
.aam-foot .btn.primary { background: var(--we-navy, #002060); color: white; border-color: var(--we-navy, #002060); }
.aam-foot .btn.primary:hover:not(:disabled) { background: var(--we-navy-dark, #001540); }
.aam-foot .btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* Importar notas finales: lista de alumnos con casilla de nota */
.imp-list {
  border: 1px solid #E8E8E3; border-radius: 10px;
  max-height: 52vh; overflow-y: auto;
}
.imp-row {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 12px; border-bottom: 1px solid #F0F0EB;
}
.imp-row:last-child { border-bottom: none; }
.imp-num { font-size: 11px; color: #9C9C93; }
.imp-name { flex: 1; font-size: 13px; font-weight: 500; color: #3A3A33; }
.imp-cur { font-size: 11.5px; color: #9C9C93; min-width: 34px; text-align: right; }
.imp-row input {
  width: 68px; padding: 5px 8px; text-align: center;
  border: 1px solid #E8E8E3; border-radius: 7px;
  font-size: 13px; font-weight: 600; color: #3A3A33; background: white;
}
.imp-row input:focus { outline: none; border-color: var(--we-navy, #002060); }
.imp-row input.bad { border-color: #B91C1C; color: #B91C1C; }
[data-coreui-theme="dark"] .imp-list { border-color: #2A2A22; }
[data-coreui-theme="dark"] .imp-row { border-color: #24241E; }
[data-coreui-theme="dark"] .imp-name { color: #D4D4CC; }
[data-coreui-theme="dark"] .imp-row input { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }

/* Dark mode */
[data-coreui-theme="dark"] .aula-ai-modal {
  background: #1A1A14; color: #F4F4F0;
}
[data-coreui-theme="dark"] .aula-ai-modal .aam-head,
[data-coreui-theme="dark"] .aula-ai-modal .aam-foot { border-color: #2A2A22; }
[data-coreui-theme="dark"] .aula-ai-modal .aam-close,
[data-coreui-theme="dark"] .aula-ai-modal .aam-upload-btn { background: #1F1F1A; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aula-ai-modal .aam-field textarea { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .aula-ai-modal .aam-foot .btn { background: #1F1F1A; border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .aula-ai-modal .aam-foot .btn.primary { background: var(--we-navy, #002060); color: #fff; border-color: #2f4a8a; }
</style>
