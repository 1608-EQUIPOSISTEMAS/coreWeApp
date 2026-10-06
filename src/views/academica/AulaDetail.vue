<script setup>
import { FECHA_CORTE_RUBRICA, RUBRICA_V2, rubricaDe } from '@/features/rubrica-auditoria/rubrica.js'
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useToast } from 'vue-toastification'
import apexchart from 'vue3-apexcharts'
import Swal from 'sweetalert2'
import { ServiceKeys } from '@/services'
import { useAiJob } from '@/composables/useAiJob.js'
import { previewSections, readyCount } from '@/features/certificacion/previewSections'
import { isDark } from '@/utils/chartTheme'
import { formatValue } from '@/shared/lib/formatValue'
import BaseModal from '@/components/BaseModal.vue'
import { aulaStatus } from '@/entities/aula/aulaStatus'

const props = defineProps({
  id: { type: [String, Number], required: true },
})

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const router = useRouter()
const route = useRoute()

const editionId = computed(() => Number(props.id))

// Estado real del aula por sus fechas (antes decia "Activo" fijo en toda aula,
// incluso las terminadas). Va junto al titulo, como en el detalle de FICO.
const AULA_STATE_UI = {
  Activo: { label: 'En curso', tone: 'ok', icon: 'fa-circle-play' },
  Proximo: { label: 'Por iniciar', tone: 'info', icon: 'fa-clock' },
  Finalizado: { label: 'Finalizada', tone: '', icon: 'fa-flag-checkered' },
}

// =====================================================================
// HEADER / INFO DEL AULA
// =====================================================================
const aula = ref(null)
const isLoadingAula = ref(false)
const aulaState = computed(() =>
  aula.value ? AULA_STATE_UI[aulaStatus(aula.value.start_date, aula.value.end_date)] : null)

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
// `tone` es el de .ds-pill (neutro = sin tono).
const HISTORY_REASON = {
  we_enrollment_status_retired:        { key: 'ret',  label: 'Retirado',        title: 'Retirados',          icon: 'fa-user-xmark',           tone: 'bad' },
  we_enrollment_status_course_changed: { key: 'cc',   label: 'Cambio de curso', title: 'Cambios de curso',   icon: 'fa-right-left',           tone: 'info' },
  we_enrollment_status_reprogrammed:   { key: 'rp',   label: 'Reprogramado',    title: 'Reprogramados',      icon: 'fa-calendar-day',         tone: 'rose' },
  we_enrollment_status_observed:       { key: 'obs',  label: 'Observado',       title: 'Observados',         icon: 'fa-triangle-exclamation', tone: 'neutro' },
}
const HISTORY_BAJA = { key: 'baja', label: 'Dado de baja', title: 'Dados de baja', icon: 'fa-ban', tone: 'neutro' }
const HISTORY_FICO = { key: 'fico', title: 'FICO no confirmado', icon: 'fa-hourglass-half', tone: 'warn' }
const HISTORY_OTRO = { key: 'otro', title: 'Otros', icon: 'fa-circle-question', tone: 'neutro' }

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
// Misma regla que la etiqueta "Certificar" del detalle FICO: becado que ya
// pago su certificado. El resto de alumnos trae el certificado incluido.
const mustCertify = (s) => s.is_beca === true && s.sold_certificate_paid === true
const ocupLabel = (s) => (s.profile_alias === 'we_profile_student' ? 'E' : 'P')
// B2B: la decision vive en el backend (is_b2b de classroomStudentsList), que
// aplica la MISMA regla que el contador del cronograma: canal 'B2B' con
// cualquier asesor, o documento OS/OP con asesor de convenios (NY12/JF39) o sin
// asesor. Por eso ya no se mira agent_origin aca (fix 17/07: la lista contaba
// 3 B2B donde el cronograma contaba 1).
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

function certificationPreviewHtml(preview) {
  const sections = previewSections(preview).map((s) => `
    <p style="margin:10px 0 2px"><span class="ds-pill ${s.tone}">${s.names.length || ''}</span> <b>${escapeHtml(s.label)}</b></p>
    ${s.names.length ? `<p style="margin:0;font-size:12.5px">${s.names.map(escapeHtml).join(', ')}</p>` : ''}
    ${s.hint ? `<p style="margin:2px 0 0;font-size:12px;opacity:.8">${escapeHtml(s.hint)}</p>` : ''}`)
  return `<div style="text-align:left"><p style="margin:0 0 4px"><b>Grupo en Odoo:</b> ${escapeHtml(preview.group_name)}</p>${sections.join('')}</div>`
}

async function certifyInOdoo() {
  if (dirtyGrades.size) {
    toast.warning('Guarda los cambios de notas antes de certificar')
    return
  }
  // Primero la vista previa (solo lee Odoo): quien entra y por que los demas
  // no, ANTES de confirmar. Pedido de Academica: "que avise los casos".
  isCertifying.value = true
  let preview
  try {
    const res = await editionService.classroomOdooCertifyPreview({ edition_id: editionId.value })
    if (!res?.ok) {
      Swal.fire({ icon: 'error', title: 'No se pudo revisar el aula en Odoo', text: res?.message || 'Error desconocido' })
      return
    }
    preview = res.data
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'No se pudo revisar el aula en Odoo', text: err?.response?.data?.message || err.message })
    return
  } finally {
    isCertifying.value = false
  }
  const ready = readyCount(preview)
  const confirm = await Swal.fire({
    title: ready ? `¿Certificar ${ready} alumno${ready > 1 ? 's' : ''}?` : 'No hay alumnos nuevos para certificar',
    html: certificationPreviewHtml(preview),
    icon: ready ? 'question' : 'info',
    showCancelButton: true,
    showConfirmButton: ready > 0,
    confirmButtonText: 'Sí, certificar',
    cancelButtonText: ready ? 'Cancelar' : 'Cerrar',
    confirmButtonColor: 'var(--we-navy)',
    width: 640,
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
    if (d.grades_missing?.length) warn.push(`<b>No están en el aula de Odoo (ni por nombre), sin nota ni certificado:</b> ${d.grades_missing.join(', ')}<br><small>Matricúlalos en el aula de Odoo o corrige su nombre y vuelve a certificar.</small>`)
    // La nota oficial es la de Odoo: que recalcule NO es una advertencia, por eso
    // va aparte de `warn` (si no, el diálogo salía en amarillo en cada certificación).
    const notaOficial = d.score_mismatches?.length
      ? `<b>Nota oficial con la que certificó Odoo:</b><br>${d.score_mismatches.join('<br>')}`
      : ''
    if (d.pdf_errors?.length) warn.push(`<b>No se generaron PDFs:</b><br>${d.pdf_errors.join('<br>')}`)
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
          ${notaOficial ? `<hr><p>${notaOficial}</p>` : ''}
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

// --- Observaciones IA (Ollama local) -----------------------------------
// El modelo solo produce BORRADORES: entran al draft como filas sucias y se
// persisten con el boton Guardar, siempre tras revision humana.
// Corre en segundo plano (ai-jobs): la request vuelve al instante y se consulta
// el avance, asi un aula grande o un modelo lento no revientan un timeout.
const obsJob = useAiJob()
const isGeneratingObs = obsJob.corriendo
const aulaSummaryIa = ref('')
const iaDraftObs = reactive(new Set()) // observaciones IA aun no guardadas

// "Generando 12 de 25…" mientras corre; el total incluye el resumen del aula.
const obsProgressLabel = computed(() => {
  const p = obsJob.progreso.value
  if (!p?.total) return obsJob.enFila.value > 1 ? 'En fila…' : 'Generando...'
  return `Generando ${p.hechos} de ${p.total}…`
})

async function generateObservations(enrollmentIds = null) {
  if (isGeneratingObs.value) return
  try {
    const job = await obsJob.run(
      () => editionService.startGradesObservations({
        edition_id: editionId.value,
        enrollment_ids: enrollmentIds,
        // Aula completa: si ya hay un resultado con las mismas notas (p. ej.
        // salio y volvio a la pantalla), se recoge sin repetir el modelo.
        // Un alumno puntual es "Regenerar": siempre texto nuevo.
        force: !!enrollmentIds,
      }),
      (id) => editionService.aiJobStatus(id),
    )
    if (job?.estado === 'listo') {
      for (const it of job.data?.items || []) {
        if (!gradesDraft[it.enrollment_id]) gradesDraft[it.enrollment_id] = emptyGradeDraft()
        gradesDraft[it.enrollment_id].observation = it.observation
        dirtyGrades.add(it.enrollment_id)
        iaDraftObs.add(it.enrollment_id)
      }
      if (job.data?.aula_summary) aulaSummaryIa.value = job.data.aula_summary
      const nOk = (job.data?.items || []).length
      const nErr = (job.data?.errors || []).length
      toast.success(
        `Observaciones generadas: ${nOk}${nErr ? ` (fallaron ${nErr})` : ''}. Revisa, edita y guarda.`,
        { timeout: 4000 },
      )
    } else if (job?.estado === 'no_encontrado') {
      toast.error('El servidor se reinició mientras se generaban las observaciones. Vuelve a intentarlo.')
    } else {
      toast.error(job?.message || 'No se pudieron generar las observaciones')
    }
  } catch (err) {
    console.error('Error generando observaciones:', err)
    toast.error(err?.response?.data?.message || 'IA local no disponible.')
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
// Oro, plata y bronce de los primeros puestos, en tonos de .ds-pill.
const TOP_TONES = ['warn', 'neutro', 'orange']

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
  we_enrollment_status_tracking: { label: 'SEG', tone: 'warn' },
  we_enrollment_status_reprogrammed: { label: 'RP', tone: 'rose' },
  we_enrollment_status_course_changed: { label: 'CC', tone: 'info' },
  we_enrollment_status_observed: { label: 'OBS', tone: 'neutro' },
  we_inscription_way_act: { label: 'ACT', tone: 'ok' },
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
// Rubricas (V1 congelada, V2 vigente) y su version por fecha: features/rubrica-auditoria.

// Mapeo IA -> rubrica binaria. Cada item listado se asocia a uno o varios
// criterios del reporte IA (1-9). Si el promedio de scores asociados >=
// AI_CHECK_THRESHOLD, el item se marca. Los items que NO aparecen aca son
// decision manual del auditor: la IA solo ve el transcript de la sesion y no
// puede constatar WhatsApp, plantilla de contacto, carpetas, notificaciones,
// pantallazo, videoclase ni el equipamiento del docente.
const AI_CHECK_THRESHOLD = 3
const IA_TO_RUBRIC = {
  'content.3': { criterios: [2] },     // Estructura -> explica fechas de entrega
  'content.5': { criterios: [5, 4] },  // Talleres + Casos -> taller/casos practicos
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

// Rubrica de la sesion abierta: la que regia cuando se guardo su auditoria.
const activeRubric = computed(() =>
  rubricaDe(auditMap.value?.[selectedSession.value]?.updated_at),
)
// Una auditoria vieja se muestra tal como se lleno, pero no se edita: marcar un
// criterio la guardaria hoy y la pasaria a la rubrica vigente, cambiando la nota
// del docente sin que nadie lo haya pedido.
const isHistoricRubric = computed(() => activeRubric.value.version !== RUBRICA_V2.version)

// Marcas de la rubrica (manuales o de la IA) que aun no se guardaron.
const auditDirty = computed(() => {
  const saved = auditMap.value?.[selectedSession.value]?.criteria || {}
  return Object.entries(sessionDraft).some(([k, v]) => v !== !!saved[k])
})

const confirmDiscardAudit = () =>
  !auditDirty.value || window.confirm('Hay criterios de auditoria sin guardar. ¿Descartarlos?')

// Sin watch(auditMap): loadAudit y selectSession hidratan a mano. El watch
// corria DESPUES de applyAiAutoFill y borraba las marcas de la IA.
function hydrateDraft(sessionNum) {
  for (const k of Object.keys(sessionDraft)) delete sessionDraft[k]
  const saved = auditMap.value?.[sessionNum]?.criteria || {}
  for (const cat of rubricaDe(auditMap.value?.[sessionNum]?.updated_at).categorias) {
    for (const it of cat.items) sessionDraft[it.key] = !!saved[it.key]
  }
}

function selectSession(n) {
  if (n !== selectedSession.value && !confirmDiscardAudit()) return
  selectedSession.value = n
  hydrateDraft(n)
  lastSavedAt.value = auditMap.value?.[n]?.updated_at || null
}

async function saveSession() {
  if (isSavingSession.value || isHistoricRubric.value) return
  isSavingSession.value = true
  try {
    const payload = {
      edition_id: editionId.value,
      session_number: selectedSession.value,
      criteria: { ...sessionDraft },
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
  activeRubric.value.categorias.reduce((a, cat) => a + categoryScore(cat), 0),
)
const totalProgress = computed(() =>
  Math.round((totalScore.value / activeRubric.value.totalItems) * 100),
)

function sessionDotCls(n) {
  const r = auditMap.value?.[n]
  if (!r) return 'sdot-empty'
  const filled = countCriteriaTrue(r.criteria, r.updated_at)
  if (filled === 0 && !r.ai_report) return 'sdot-empty'
  if (filled >= rubricaDe(r.updated_at).totalItems) return 'sdot-done'
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

// Cada analisis cuesta (~S/ 2): el modal muestra lo gastado en el mes.
const aiSpend = ref(null)

function openAiModal() {
  aiError.value = ''
  aiTranscript.value = ''
  aiSyllabusFile.value = null
  showAiModal.value = true
  aiSpend.value = null
  editionService.aiAuditSpend()
    .then((s) => { aiSpend.value = s })
    .catch(() => { aiSpend.value = null }) // solo informativo: si falla, no se muestra
}

// Click handler del boton principal. Si la sesion ya tiene un ai_report
// persistido, no se vuelve a invocar a la IA: se refresca el panel desde BD
// y se notifica al usuario. Asi se evita que tres clicks generen tres
// puntuaciones distintas para el mismo caso. Solo se abre el modal de
// generacion cuando no existe analisis previo en BD.
async function onAnalyzeClick() {
  if (currentAiReport.value) {
    if (!confirmDiscardAudit()) return
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
    // El auto-fill escribe en el draft, y el draft de una rubrica historica no
    // se puede guardar: marcarlo solo dejaria la pantalla mintiendo.
    const applied = isHistoricRubric.value ? 0 : applyAiAutoFill(res.row?.ai_report)
    toast.success(`IA analizada. ${applied} criterios marcados automaticamente`)
    showAiModal.value = false
  } catch (err) {
    console.error(err)
    // El backend responde 400 con { ok:false, message:'...' }. Axios tira
    // esa respuesta como excepcion, asi que el mensaje real esta en
    // err.response.data.message, no en err.message.
    const backendMsg = err?.response?.data?.message
    // La sesion ya tenia analisis (el backend no paga dos veces): mostrarlo.
    if (err?.response?.data?.row) {
      await loadAudit()
      showAiModal.value = false
      toast.info(backendMsg, { timeout: 4000 })
      return
    }
    aiError.value = backendMsg || err?.message || 'Error inesperado'
    // Sin respuesta (timeout, red, proxy) el analisis puede seguir corriendo y
    // guardarse igual en el servidor: recargar lo guardado en vez de invitar a
    // reintentar, que era pagar Gemini dos veces.
    if (!err?.response) {
      aiError.value = 'Se perdio la conexion, pero el analisis puede seguir en curso. Espera unos minutos y recarga el aula antes de volver a intentar.'
      loadAudit()
    }
  } finally {
    isRunningAi.value = false
  }
}

const currentAiReport = computed(() => auditMap.value?.[selectedSession.value]?.ai_report || null)
const currentAiGeneratedAt = computed(() => auditMap.value?.[selectedSession.value]?.ai_generated_at || null)

// Nota numerica (Number | null) en escala /20, lista para promediar/comparar.
// null si el dato no esta disponible (no rompe los reduce).
function toScore20Num(score1to5) {
  const n = Number(score1to5)
  return Number.isFinite(n) ? n * 4 : null
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

// Cuenta solo las claves de la rubrica que le toca a esa auditoria: el JSONB de
// una auditoria vieja trae marcadas claves que la rubrica nueva ya no tiene.
function countCriteriaTrue(criteria, fecha) {
  if (!criteria || typeof criteria !== 'object') return 0
  const { keys } = rubricaDe(fecha)
  return Object.entries(criteria).filter(([key, marked]) => marked && keys.has(key)).length
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
    const rubrica = rubricaDe(row?.updated_at)
    const marked = countCriteriaTrue(row?.criteria, row?.updated_at)
    const manualPct = Math.round((marked / rubrica.totalItems) * 100)
    const manualScore20 = row?.criteria
      ? marked * rubrica.puntosPorCriterio : null
    const aiScore20 = toScore20Num(row?.ai_report?.metricas_rapidas?.puntuacion_global)
    rows.push({
      n,
      manualMarked: marked,
      manualTotal: rubrica.totalItems,
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
// Tono del sistema de diseño por nivel. Los niveles 4 y 5 comparten verde: la
// pantalla distingue bueno/atencion/malo; el matiz fino de 5 niveles queda
// solo en el PDF, que se imprime fuera del tema.
const LEVEL_TONE = { 1: 'bad', 2: 'warn', 3: 'info', 4: 'ok', 5: 'ok' }
const levelTone = (level) => LEVEL_TONE[level]
const notaTone = (n) => levelTone(notaLevel(n))
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
  totalScore.value * activeRubric.value.puntosPorCriterio,
)
const currentConsolidated20 = computed(() =>
  consolidatedScore(currentIaScore20.value, currentAcScore20.value),
)
// "Firme" cuando la rubrica del area academica esta completa al 100%.
const currentFirm = computed(() => totalScore.value === activeRubric.value.totalItems)

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

// ── EXCEPCION AL SISTEMA DE DISEÑO: PDF ───────────────────────────────────
// Desde aqui hasta el fin de exportSessionPdf los colores son hex fijos a
// proposito: el reporte se abre en otra ventana y se imprime, fuera del tema y
// sin acceso a los tokens --ds-*. Paleta de 5 niveles en valores claros.
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
  const rubric = activeRubric.value.categorias.map((cat) => {
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
    <span>Rubrica academica: <b>${totalScore.value} / ${activeRubric.value.totalItems}</b></span>
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
// ── FIN DE LA EXCEPCION DEL PDF ───────────────────────────────────────────

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

// ApexCharts pinta un SVG con colores pasados en JS: no resuelve var(--ds-*).
// Se leen los tokens ya resueltos en :root; leer isDark dentro del computed lo
// vuelve a calcular al cambiar de tema (chartTheme observa data-coreui-theme).
function readDsToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const generalChartOptions = computed(() => {
  const mode = isDark.value ? 'dark' : 'light'
  const t = (name) => readDsToken(`--ds-${name}`)
  const verdictLine = (y, text, tone) => ({
    y,
    borderColor: t(`${tone}-ink`),
    strokeDashArray: 3,
    label: {
      text, position: 'right', offsetX: -6,
      borderColor: 'transparent',
      style: { color: t(`${tone}-ink`), background: t(`soft-${tone}`), fontSize: '9.5px', fontWeight: 700 },
    },
  })
  return {
    chart: {
      type: 'line',
      height: 320,
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
      animations: { enabled: true, speed: 400 },
      zoom: { enabled: false },
    },
    theme: { mode },
    // Una serie en color (consolidada); IA y rubrica son referencias.
    colors: [t('accent'), t('muted'), t('warn')],
    stroke: {
      curve: 'smooth',
      width: [3, 2, 2],
      dashArray: [0, 5, 5],
    },
    markers: {
      size: [6, 4, 4],
      strokeWidth: 2,
      strokeColors: t('surface'),
      hover: { sizeOffset: 2 },
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      fontWeight: 600,
      labels: { colors: t('ink-2') },
      markers: { width: 8, height: 8, radius: 8 },
      itemMargin: { horizontal: 10, vertical: 0 },
    },
    grid: {
      borderColor: t('border'),
      strokeDashArray: 4,
      padding: { top: 6, right: 24, bottom: 0, left: 8 },
    },
    xaxis: {
      categories: generalRows.value.map((r) => `S${r.n}`),
      labels: { style: { fontSize: '11px', colors: t('ink-2') } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: 20,
      tickAmount: 4,
      labels: {
        style: { fontSize: '11px', colors: t('ink-2') },
        formatter: (v) => Number(v).toFixed(0),
      },
    },
    annotations: {
      yaxis: [
        verdictLine(19, 'EXCELENTE', 'ok'),
        verdictLine(17, 'BUENO', 'info'),
        verdictLine(15, 'EN PROCESO', 'warn'),
      ],
    },
    tooltip: {
      theme: mode,
      shared: true,
      intersect: false,
      y: { formatter: (v) => (v == null ? 'sin data' : `${v} / 20`) },
    },
  }
})

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

// Volver o salir del aula con notas o auditoria sin guardar las perdia en
// silencio: la guarda de switchTab solo cubria el cambio de tab.
onBeforeRouteLeave(() => {
  if (dirtyGrades.size && !window.confirm('Hay notas sin guardar. ¿Salir y descartarlas?')) return false
  return confirmDiscardAudit()
})

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
  <div class="ds-page aula-detail">
    <header class="ds-head">
      <div class="ds-head-titles">
        <button class="ad-back" type="button" @click="goBack">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Aulas
        </button>
        <div class="ad-title-row">
          <h1 class="ds-title">{{ aula?.program_abreviature || (isLoadingAula ? 'Cargando...' : 'Aula') }}</h1>
          <span v-if="aulaState" class="ds-pill" :class="aulaState.tone">
            <i class="fa-solid" :class="aulaState.icon" aria-hidden="true"></i> {{ aulaState.label }}
          </span>
        </div>
        <p class="ds-sub">
          <span class="ad-mono">{{ aula?.global_code || '--' }}</span> · edición {{ aula?.specific_code || '--' }}
        </p>
      </div>
    </header>

    <section class="ds-panel" aria-label="Datos del aula">
      <dl class="ds-panel-body ad-facts">
        <div>
          <dt>Docente</dt>
          <dd class="ad-teacher">
            <span class="ad-avatar" aria-hidden="true">{{ teacherInitials }}</span>
            {{ aula?.instructor || '--' }}
          </dd>
        </div>
        <div><dt>Modalidad</dt><dd>{{ aula?.cat_model_modality_label || '--' }}</dd></div>
        <div><dt>Horario</dt><dd>{{ headerSchedule }}</dd></div>
        <div><dt>Inicio → fin</dt><dd>{{ formatDate(aula?.start_date) }} → {{ formatDate(aula?.end_date) }}</dd></div>
        <div><dt>Sesiones</dt><dd class="ad-mono">{{ sessionsTotal || '--' }}</dd></div>
      </dl>
    </section>

    <div class="ds-kpis">
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-users"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span class="ds-kpi-value">
              <span v-if="isLoadingStudents" class="skel-kpi" style="width: 48px"></span>
              <template v-else>{{ formatValue(students.length, 'num') }}</template>
            </span>
          </div>
          <span class="ds-kpi-label">Alumnos</span>
          <!-- El aula cuenta uno menos que las ventas del paquete padre cuando
               hay convalidados. Se avisa aqui para que no parezca un descuadre. -->
          <button
            v-if="historyValidated.length"
            class="ad-kpi-link"
            type="button"
            title="Compraron el paquete pero ya llevaron este curso. Ver detalle en Historial."
            @click="switchTab('historial')"
          >
            +{{ historyValidated.length }} convalidado{{ historyValidated.length > 1 ? 's' : '' }}
          </button>
          <span v-else class="ds-kpi-note">Activos en la lista de notas</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon" :class="{ ok: gradesSummary.approved > 0 }" aria-hidden="true"><i class="fa-solid fa-user-check"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span class="ds-kpi-value">
              <span v-if="isLoadingStudents" class="skel-kpi" style="width: 48px"></span>
              <template v-else>{{ formatValue(gradesSummary.approved, 'num') }}</template>
            </span>
          </div>
          <span class="ds-kpi-label">Aprobados</span>
          <span class="ds-kpi-note">{{ gradesSummary.pct(gradesSummary.approved) }}% del aula</span>
        </div>
      </div>
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-star-half-stroke"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span class="ds-kpi-value">
              <span v-if="isLoadingStudents" class="skel-kpi" style="width: 48px"></span>
              <template v-else>{{ aulaGradeAverage == null ? '--' : fmtNota(aulaGradeAverage) }}</template>
            </span>
          </div>
          <span class="ds-kpi-label">Promedio final</span>
          <span class="ds-kpi-note">Aprueba desde {{ GRADE_RULES.PASS_THRESHOLD }}</span>
        </div>
      </div>
    </div>

    <div class="ds-tabs ad-tabs" role="tablist" aria-label="Secciones del aula">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="String(activeTab === t.id)"
        @click="switchTab(t.id)"
      >
        <i class="fa-solid" :class="t.icon" aria-hidden="true"></i>
        {{ t.label }}
        <span v-if="t.id === 'notas'" class="ad-tab-count">{{ students.length }}</span>
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- NOTAS (Lista de Notas editable)                              -->
    <!-- ============================================================ -->
    <section v-if="activeTab === 'notas'" class="ds-stack">
      <div class="ad-toolbar">
        <input
          v-model="studentQuery"
          class="ds-input ad-search"
          type="search"
          placeholder="Buscar alumno por nombre o DNI"
          aria-label="Buscar alumno por nombre o DNI"
        />
        <div class="ds-tabs" role="group" aria-label="Filtrar alumnos">
          <button
            v-for="f in FILTERS"
            :key="f.id"
            type="button"
            :aria-pressed="String(studentFilter === f.id)"
            @click="studentFilter = f.id"
          >
            {{ f.label }}
          </button>
        </div>
        <span class="ad-legend"><span class="ad-debt-swatch" aria-hidden="true"></span> Con deuda pendiente</span>
        <span class="ad-grow"></span>
        <div class="ad-csv">
          <button
            class="btn-exec btn-exec-outline btn-sm"
            type="button"
            :disabled="!students.length"
            title="Importar o exportar la lista de notas en CSV"
            :aria-expanded="String(showCsvMenu)"
            @click="showCsvMenu = !showCsvMenu"
          >
            <i class="fa-solid fa-file-csv" aria-hidden="true"></i> CSV
            <i class="fa-solid fa-chevron-down ad-caret" aria-hidden="true"></i>
          </button>
          <template v-if="showCsvMenu">
            <!-- backdrop invisible: cierra el menu al clickear fuera sin listeners -->
            <div class="ad-csv-backdrop" @click="showCsvMenu = false"></div>
            <div class="ad-csv-menu">
              <button type="button" @click="showCsvMenu = false; openImportModal()">
                <i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i> Importar notas finales
              </button>
              <button type="button" @click="showCsvMenu = false; exportNotasCsv()">
                <i class="fa-solid fa-file-arrow-down" aria-hidden="true"></i> Exportar CSV
              </button>
            </div>
          </template>
        </div>
        <button
          class="btn-exec btn-exec-outline btn-sm"
          type="button"
          :disabled="isGeneratingObs || !students.length"
          title="Genera borradores de observacion por alumno con la IA local"
          @click="generateObservations()"
        >
          <i class="fa-solid" :class="isGeneratingObs ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'" aria-hidden="true"></i>
          {{ isGeneratingObs ? obsProgressLabel : 'Generar observaciones (IA)' }}
        </button>
        <button
          class="btn-exec btn-exec-outline btn-sm"
          type="button"
          :disabled="isCertifying || !students.length"
          title="Aplica las notas guardadas en Odoo y genera los certificados de los aprobados"
          @click="certifyInOdoo()"
        >
          <i class="fa-solid" :class="isCertifying ? 'fa-spinner fa-spin' : 'fa-certificate'" aria-hidden="true"></i>
          {{ isCertifying ? 'Certificando...' : 'Certificar en Odoo' }}
        </button>
        <button
          class="btn-exec btn-exec-primary btn-sm"
          type="button"
          :disabled="!dirtyGrades.size || isSavingGrades"
          @click="saveGrades"
        >
          <i class="fa-solid" :class="isSavingGrades ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
          {{ isSavingGrades ? 'Guardando...' : 'Guardar cambios' + (dirtyGrades.size ? ` (${dirtyGrades.size})` : '') }}
        </button>
      </div>

      <section v-if="isLoadingStudents && !students.length" class="ds-panel" aria-busy="true">
        <div class="ds-panel-body ds-stack">
          <span v-for="n in 6" :key="n" class="ds-skel"></span>
        </div>
      </section>
      <section v-else-if="!students.length" class="ds-panel">
        <p class="ds-empty ds-empty--lista">Sin alumnos matriculados en esta aula. Si falta alguien, revisa su venta en FICO.</p>
      </section>
      <section v-else class="ds-panel">
        <div class="ds-table-scroll ad-grades-scroll">
          <table class="ds-table ds-table--densa ad-grades">
            <thead>
              <tr>
                <th class="ad-c0" rowspan="2">N°</th>
                <th class="ad-c1" rowspan="2">Apellidos y nombres</th>
                <th rowspan="2">Ocup.</th>
                <th rowspan="2">Mod.</th>
                <th rowspan="2">Seguimiento</th>
                <th rowspan="2">B2B</th>
                <th rowspan="2">Becas</th>
                <th rowspan="2">Membresía</th>
                <th class="ad-group ok" :colspan="(sessionsTotal || 1) + 1">Nota de tests · 6/20</th>
                <th class="ad-group warn" :colspan="(sessionsTotal || 1) + 1">Participación · 2/20</th>
                <th class="ad-group info" colspan="3">Proyecto integrador · 6+8/20</th>
                <th rowspan="2">Nota final</th>
                <th rowspan="2">Resultado</th>
                <th rowspan="2" title="N° del certificado emitido en Odoo">Cert. Odoo</th>
              </tr>
              <tr>
                <th v-for="n in sessionNumbers" :key="'t' + n" class="ad-session">S{{ n }}</th>
                <th class="ad-session ad-strong">TEST</th>
                <th v-for="n in sessionNumbers" :key="'p' + n" class="ad-session">S{{ n }}</th>
                <th class="ad-session ad-strong">PTS</th>
                <th class="ad-session ad-strong">PARCIAL</th>
                <th class="ad-session ad-strong">FINAL</th>
                <th class="ad-session"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(s, idx) in filteredStudents" :key="s.enrollment_id">
                <tr :class="{ 'row-debt': hasDebt(s), 'row-laptop': s.has_laptop_promo, 'row-certify': mustCertify(s) }">
                  <td class="ad-c0 ad-mono">{{ String(idx + 1).padStart(2, '0') }}</td>
                  <td class="ad-c1">
                    <div class="ad-student">
                      <span class="ad-avatar" aria-hidden="true">{{ initialsOf(s.full_name) }}</span>
                      <div class="ad-student-text">
                        <div class="ad-student-name" :title="apellidosNombres(s)">{{ apellidosNombres(s) }}</div>
                        <div class="ad-student-sub" :title="s.email || ''">{{ s.email || handleOfName(s.full_name) }}</div>
                      </div>
                      <i
                        v-if="hasDebt(s)"
                        class="fa-solid fa-circle-exclamation ad-debt-ico"
                        :title="`Deuda pendiente: ${s.fin_overdue} cuota(s) vencida(s)`"
                      ></i>
                      <span
                        v-if="s.personal_account"
                        class="ds-pill neutro"
                        :title="`Usa su propia cuenta de ${s.personal_account}: no entregar cuenta`"
                      >Cuenta propia {{ s.personal_account }}</span>
                    </div>
                  </td>
                  <td class="ad-center">
                    <span class="ds-pill" :class="ocupLabel(s) === 'E' ? 'info' : 'neutro'">{{ ocupLabel(s) }}</span>
                  </td>
                  <td>
                    <span v-if="modalityLabel(s) !== '--'" class="ds-pill" :class="modalityLabel(s) === 'FLEX' ? 'info' : 'neutro'">
                      {{ modalityLabel(s) }}
                    </span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                  <td>
                    <div v-if="(s.parent_codes && s.parent_codes.length) || s.parent_code" class="ad-pill-stack">
                      <span
                        v-for="pc in (s.parent_codes && s.parent_codes.length ? s.parent_codes : [s.parent_code])"
                        :key="pc"
                        class="ds-pill warn ad-mono"
                        :title="s.type_status_label || 'Programa padre'"
                      >{{ pc }}</span>
                    </div>
                    <span
                      v-else-if="typeStatusBadge(s.type_status_alias)"
                      class="ds-pill"
                      :class="typeStatusBadge(s.type_status_alias).tone"
                    >{{ typeStatusBadge(s.type_status_alias).label }}</span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                  <td>
                    <span v-if="b2bLabel(s)" class="ds-pill ad-mono">{{ b2bLabel(s) }}</span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                  <td class="ad-center">
                    <span v-if="s.is_beca" class="ds-pill info"><i class="fa-solid fa-graduation-cap" aria-hidden="true"></i> Beca</span>
                    <span v-if="mustCertify(s)" class="ds-pill ok ad-pill-gap" title="Becado que pago su certificado: hay que certificarlo">
                      <i class="fa-solid fa-certificate" aria-hidden="true"></i> Certificar
                    </span>
                    <span v-if="!s.is_beca" class="ad-muted">--</span>
                  </td>
                  <td class="ad-center">
                    <span v-if="s.membership_active" class="ds-pill warn" :title="`Membresia activa: ${s.membership_tier_name}`">
                      <i class="fa-solid fa-crown" aria-hidden="true"></i> {{ s.membership_tier_name }}
                    </span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                  <td v-for="n in sessionNumbers" :key="'t' + n" class="ad-cell-input">
                    <input
                      class="ad-grade-input"
                      type="number"
                      min="0"
                      :max="GRADE_RULES.TEST_MAX_PER_SESSION"
                      step="1"
                      :aria-label="`Test sesion ${n}`"
                      :value="draftFor(s).tests[String(n)]"
                      @input="draftFor(s).tests[String(n)] = $event.target.value === '' ? null : Math.min(Number($event.target.value), 20); markDirty(s.enrollment_id)"
                    />
                  </td>
                  <td class="ad-total ad-mono">{{ fmtNota(testScore(draftFor(s))) }}</td>
                  <td v-for="n in sessionNumbers" :key="'p' + n" class="ad-cell-input">
                    <input
                      type="checkbox"
                      class="ad-part-check"
                      :aria-label="`Participacion sesion ${n}`"
                      :checked="draftFor(s).participation[String(n)] === true"
                      @change="draftFor(s).participation[String(n)] = $event.target.checked; markDirty(s.enrollment_id)"
                    />
                  </td>
                  <td class="ad-total ad-mono">{{ partScore(draftFor(s)) }}</td>
                  <td class="ad-total ad-mono">{{ fmtNota(partialScore(draftFor(s))) }}</td>
                  <td class="ad-total ad-mono">{{ fmtNota(finalDelivScore(draftFor(s))) }}</td>
                  <td class="ad-center">
                    <button
                      class="btn-icon btn-icon-sm"
                      type="button"
                      :title="expandedRow === s.enrollment_id ? 'Cerrar criterios' : 'Editar criterios de entregables'"
                      :aria-label="expandedRow === s.enrollment_id ? 'Cerrar criterios' : 'Editar criterios de entregables'"
                      :aria-expanded="String(expandedRow === s.enrollment_id)"
                      @click="expandedRow = expandedRow === s.enrollment_id ? null : s.enrollment_id"
                    >
                      <i class="fa-solid" :class="expandedRow === s.enrollment_id ? 'fa-chevron-up' : 'fa-pen-to-square'" aria-hidden="true"></i>
                    </button>
                  </td>
                  <td class="ad-center">
                    <span
                      v-if="hasAnyGrade(draftFor(s))"
                      class="ds-pill ad-mono"
                      :class="notaTone(finalGrade(draftFor(s)))"
                    >{{ fmtNota(finalGrade(draftFor(s))) }}</span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                  <td>
                    <span
                      v-if="hasAnyGrade(draftFor(s))"
                      class="ds-pill"
                      :class="finalGrade(draftFor(s)) >= GRADE_RULES.PASS_THRESHOLD ? 'ok' : 'bad'"
                    >{{ finalGrade(draftFor(s)) >= GRADE_RULES.PASS_THRESHOLD ? 'APROBADO' : 'DESAPROBADO' }}</span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                  <td class="ad-center">
                    <span
                      v-if="certCodeOf(s)"
                      class="ds-pill info"
                      :title="'Certificado emitido en Odoo: ' + certCodeOf(s)"
                    ><i class="fa-solid fa-certificate" aria-hidden="true"></i> N° {{ certCodeOf(s) }}</span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                </tr>
                <tr v-if="expandedRow === s.enrollment_id" class="ad-deliv-row">
                  <td :colspan="gradesColspan">
                    <div class="ad-deliv">
                      <div>
                        <div class="ad-deliv-title">Entregable parcial <span class="ad-muted">(criterios 0-20 · ponderado /20)</span></div>
                        <label v-for="c in PARTIAL_CRITERIA" :key="'pc' + c.key" class="ad-deliv-field">
                          <span>{{ c.key }}. {{ c.label }} <b class="ad-mono">{{ Math.round(c.weight * 100) }}%</b></span>
                          <input
                            class="ad-grade-input ad-grade-input--wide"
                            type="number"
                            min="0"
                            :max="c.max"
                            step="0.5"
                            :value="draftFor(s).partial_criteria[c.key]"
                            @input="draftFor(s).partial_criteria[c.key] = $event.target.value === '' ? null : Math.min(Number($event.target.value), 20); markDirty(s.enrollment_id)"
                          />
                        </label>
                      </div>
                      <div>
                        <div class="ad-deliv-title">Entregable final <span class="ad-muted">(criterios 0-20 · ponderado /20)</span></div>
                        <label v-for="c in FINAL_CRITERIA" :key="'fc' + c.key" class="ad-deliv-field">
                          <span>{{ c.key }}. {{ c.label }} <b class="ad-mono">{{ Math.round(c.weight * 100) }}%</b></span>
                          <input
                            class="ad-grade-input ad-grade-input--wide"
                            type="number"
                            min="0"
                            :max="c.max"
                            step="0.5"
                            :value="draftFor(s).final_criteria[c.key]"
                            @input="draftFor(s).final_criteria[c.key] = $event.target.value === '' ? null : Math.min(Number($event.target.value), 20); markDirty(s.enrollment_id)"
                          />
                        </label>
                      </div>
                      <div>
                        <div class="ad-deliv-title">Datos del aula</div>
                        <label class="ad-deliv-field">
                          <span>N° de grupo</span>
                          <input
                            class="ad-grade-input ad-grade-input--wide"
                            type="number"
                            min="1"
                            step="1"
                            :value="draftFor(s).group_number"
                            @input="draftFor(s).group_number = $event.target.value === '' ? null : Number($event.target.value); markDirty(s.enrollment_id)"
                          />
                        </label>
                        <div class="ad-deliv-field">
                          <span>Correo Odoo (certificación)</span>
                          <span class="ad-mono ad-small" :title="s.platform_user || s.email || ''">
                            {{ s.platform_user || s.email || '--' }}
                          </span>
                        </div>
                        <div class="ad-deliv-flags">
                          <span v-if="s.has_certificate" class="ds-pill warn"><i class="fa-solid fa-certificate" aria-hidden="true"></i> Certificado</span>
                          <span v-if="s.has_laptop_promo" class="ds-pill cyan" title="Esta inscripcion incluye laptop como beneficio">
                            <i class="fa-solid fa-laptop" aria-hidden="true"></i> Traerá laptop
                          </span>
                          <span v-if="b2bLabel(s)" class="ds-pill ad-mono">{{ b2bLabel(s) }}</span>
                          <span v-if="s.membership_active" class="ds-pill warn" :title="`Membresia activa: ${s.membership_tier_name}`">
                            <i class="fa-solid fa-crown" aria-hidden="true"></i> {{ s.membership_tier_name }}
                          </span>
                        </div>
                      </div>
                      <div class="ad-deliv-obs">
                        <div class="ad-deliv-title">
                          Observación (acta)
                          <button
                            class="btn-exec btn-exec-outline btn-sm"
                            type="button"
                            :disabled="isGeneratingObs"
                            title="Regenerar con IA solo para este alumno"
                            @click="generateObservations([s.enrollment_id])"
                          >
                            <i class="fa-solid" :class="isGeneratingObs ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'" aria-hidden="true"></i>
                            Regenerar
                          </button>
                        </div>
                        <textarea
                          class="ds-input ad-obs"
                          :class="{ 'ad-obs--ia': iaDraftObs.has(s.enrollment_id) }"
                          rows="2"
                          maxlength="2000"
                          aria-label="Observacion del alumno para el acta"
                          placeholder="Observacion del alumno para el acta de notas..."
                          :value="draftFor(s).observation"
                          @input="draftFor(s).observation = $event.target.value; markDirty(s.enrollment_id)"
                        ></textarea>
                        <div v-if="iaDraftObs.has(s.enrollment_id)" class="ad-muted ad-small">
                          <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Borrador IA sin guardar — revisa y guarda.
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Leyenda fija: estas dos preguntas llegaban por chat en cada aula
           ("que es este numero?" y "por que el ERP dice 18.6 y Odoo 20?").
           Va visible bajo la tabla, no en un title: el usuario manda captura,
           y en una captura el tooltip no sale. -->
      <p v-if="students.length" class="ds-callout">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>
          <b>Cert. Odoo</b> = N° del certificado ya emitido en Odoo. Un <b>--</b> significa que ese alumno todavía no tiene certificado
          (desaprobado, con deuda pendiente, o el aula aún no se certificó).
          · <b>Nota final</b> = acta interna del ERP: incluye los tests de sesión, y la <b>sesión sin test cargado cuenta 0</b>,
          así que baja mientras falten quizzes por cargar. El certificado se emite con la <b>nota oficial de Odoo</b>, que solo
          promedia parcial, final y participación: por eso suele ser más alta que esta.
        </span>
      </p>

      <!-- Resumenes del formato oficial -->
      <div v-if="students.length" class="ad-summary">
        <section class="ds-panel">
          <header class="ds-panel-head"><h3 class="ds-panel-title">Resumen de alumnos</h3></header>
          <dl class="ds-panel-body ad-sumlist">
            <div><dt>Total de alumnos inscritos</dt><dd>{{ gradesSummary.total }}</dd></div>
            <div><dt>Modalidad regular</dt><dd>{{ gradesSummary.regular }} · {{ gradesSummary.pct(gradesSummary.regular) }}%</dd></div>
            <div><dt>Modalidad Flex</dt><dd>{{ gradesSummary.flex }} · {{ gradesSummary.pct(gradesSummary.flex) }}%</dd></div>
            <div><dt>Alumnos de seguimiento</dt><dd>{{ gradesSummary.tracking }} · {{ gradesSummary.pct(gradesSummary.tracking) }}%</dd></div>
            <div><dt>Certificados</dt><dd>{{ gradesSummary.certified }} · {{ gradesSummary.pct(gradesSummary.certified) }}%</dd></div>
            <div><dt>Aprobados</dt><dd class="ok">{{ gradesSummary.approved }} · {{ gradesSummary.pct(gradesSummary.approved) }}%</dd></div>
            <div><dt>Desaprobados</dt><dd class="bad">{{ gradesSummary.failed }} · {{ gradesSummary.pct(gradesSummary.failed) }}%</dd></div>
          </dl>
        </section>
        <section class="ds-panel">
          <header class="ds-panel-head"><h3 class="ds-panel-title">Test por sesión</h3></header>
          <div class="ds-panel-body ds-table-scroll">
            <table class="ds-table ad-session-table">
              <thead>
                <tr><th></th><th v-for="st in sessionStats" :key="'h' + st.session" class="num">S{{ st.session }}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Con puntos</td>
                  <td v-for="st in sessionStats" :key="'c' + st.session" class="num">{{ st.withTest }}</td>
                </tr>
                <tr>
                  <td>%</td>
                  <td v-for="st in sessionStats" :key="'pc' + st.session" class="num">{{ st.withTestPct }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="ds-panel">
          <header class="ds-panel-head"><h3 class="ds-panel-title">Participaciones por sesión</h3></header>
          <div class="ds-panel-body ds-table-scroll">
            <table class="ds-table ad-session-table">
              <thead>
                <tr><th></th><th v-for="st in sessionStats" :key="'h2' + st.session" class="num">S{{ st.session }}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Participaciones</td>
                  <td v-for="st in sessionStats" :key="'c2' + st.session" class="num">{{ st.participated }}</td>
                </tr>
                <tr>
                  <td>%</td>
                  <td v-for="st in sessionStats" :key="'pc2' + st.session" class="num">{{ st.participatedPct }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section v-if="aulaSummaryIa" class="ds-panel ad-summary-wide">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Resumen del aula (IA)</h3>
            <button class="btn-exec btn-exec-outline btn-sm" type="button" title="Copiar al portapapeles" @click="copyAulaSummary">
              <i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar
            </button>
          </header>
          <div class="ds-panel-body">
            <p class="ad-summary-text">{{ aulaSummaryIa }}</p>
          </div>
          <footer class="ds-panel-foot warn">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>Borrador generado por la IA local — verificar antes de usar en reportes.</span>
          </footer>
        </section>
        <section class="ds-panel">
          <header class="ds-panel-head"><h3 class="ds-panel-title">Primeros puestos</h3></header>
          <div class="ds-panel-body">
            <p v-if="!topStudents.length" class="ds-empty">Sin notas registradas todavía. Carga notas en la tabla de arriba.</p>
            <ol v-else class="ad-top">
              <li v-for="(t, i) in topStudents" :key="t.s.enrollment_id">
                <span class="ds-pill" :class="TOP_TONES[i]">{{ i + 1 }}ª</span>
                <span class="ad-top-name">
                  <span class="ad-student-name">{{ t.s.full_name }}</span>
                  <span class="ad-muted ad-small">{{ t.s.email || '--' }} · {{ t.s.phone || '--' }}</span>
                </span>
                <b class="ad-mono">{{ fmtNota(t.final) }}</b>
              </li>
            </ol>
          </div>
        </section>
      </div>

      <p class="ds-callout">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>
          Nota final = TEST × 30% + Entregable parcial × 30% + Entregable final × 40% + Participación (0-2).
          Aprobado desde {{ GRADE_RULES.PASS_THRESHOLD }}. Los totales definitivos se recalculan al guardar.
        </span>
      </p>
    </section>

    <!-- ============================================================ -->
    <!-- HISTORIAL (alumnos que estuvieron pero ya no estan)          -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'historial'" class="ds-stack">
      <section v-if="isLoadingHistory" class="ds-panel" aria-busy="true">
        <div class="ds-panel-body ds-stack">
          <span v-for="n in 4" :key="n" class="ds-skel"></span>
        </div>
      </section>
      <section v-else-if="!historyLeft.length && !historyValidated.length" class="ds-panel">
        <p class="ds-empty ds-empty--lista">Sin movimientos: ningún alumno se ha retirado o cambiado de esta aula.</p>
      </section>
      <template v-else>
        <!-- CONVALIDADOS: nunca estuvieron y nunca van a estar. Bloque propio
             porque no tienen "fecha de salida" ni "motivo": la tabla de abajo
             los mostraria con todo en "--" y se leeria como dato faltante. -->
        <section v-if="historyValidated.length" class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title ad-hist-title">
              <span class="ds-pill violet" aria-hidden="true"><i class="fa-solid fa-award"></i></span>
              Convalidados
            </h3>
            <span class="ds-chip">{{ historyValidated.length }}</span>
          </header>
          <div class="ds-panel-body ds-table-scroll">
            <table class="ds-table ds-table--densa ad-hist">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Paquete</th>
                  <th>Ya lo llevó en</th>
                  <th>Convalidado el</th>
                  <th>Asesor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in historyValidated" :key="'v' + v.validation_id">
                  <td>
                    <div class="ad-student">
                      <span class="ad-avatar" aria-hidden="true">{{ initialsOf(v.full_name) }}</span>
                      <div class="ad-student-text">
                        <div class="ad-student-name ad-wrap" :title="apellidosNombres(v)">
                          {{ apellidosNombres(v) }}
                          <span class="ds-pill violet">Convalidado</span>
                        </div>
                        <div class="ad-student-sub">{{ v.dni || 'Sin DNI' }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ [v.parent_program_name, v.parent_edition_code].filter(Boolean).join(' ') || '--' }}</td>
                  <!-- Sin matricula previa no es un error: la convalidacion puede
                       venir de otra institucion o de experiencia. Se marca en ambar
                       en vez de inventar una edicion. -->
                  <td
                    :class="{ warn: !validatedPrevLabel(v) }"
                    :title="validatedPrevLabel(v) ? '' : 'La convalidacion no apunta a ninguna matricula del ERP (otra institucion o experiencia).'"
                  >
                    {{ validatedPrevLabel(v) || 'Sin matrícula previa en el ERP' }}
                  </td>
                  <td>{{ formatDate(v.validated_at) }}</td>
                  <td class="ad-mono">{{ v.agent_code || '--' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Una tarjeta por motivo (Retirados, Reprogramados, ...). El titulo de
             la tarjeta ya dice el motivo, asi que no hay columna "Motivo": el
             badge de la fila solo se conserva para los casos cuyo texto varia. -->
        <section v-for="g in historyGroups" :key="g.key" class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title ad-hist-title">
              <span class="ds-pill" :class="g.tone" aria-hidden="true"><i class="fa-solid" :class="g.icon"></i></span>
              {{ g.title }}
            </h3>
            <span class="ds-chip">{{ g.rows.length }}</span>
          </header>
          <div class="ds-panel-body ds-table-scroll">
            <table class="ds-table ds-table--densa ad-hist">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Matriculado</th>
                  <th>Fecha de salida</th>
                  <th>Realizado por</th>
                  <th>Justificación</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in g.rows" :key="h.enrollment_id">
                  <td>
                    <div class="ad-student">
                      <span class="ad-avatar" aria-hidden="true">{{ initialsOf(h.full_name) }}</span>
                      <div class="ad-student-text">
                        <div class="ad-student-name ad-wrap" :title="apellidosNombres(h)">
                          {{ apellidosNombres(h) }}
                          <span class="ds-pill" :class="g.tone">{{ historyReason(h).label }}</span>
                        </div>
                        <div class="ad-student-sub">{{ h.dni || 'Sin DNI' }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ formatDate(h.enrolled_on) }}</td>
                  <td>{{ formatDateTime(h.left_at) }}</td>
                  <td>{{ h.performed_by || '--' }}</td>
                  <td class="ad-hist-just">{{ h.justificacion || '--' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </section>

    <!-- ============================================================ -->
    <!-- AUDITORIA (rubrica)                                         -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'auditoria'" class="ds-stack">
      <section v-if="!sessionsTotal" class="ds-panel">
        <p class="ds-empty ds-empty--lista">El aula no tiene sesiones definidas. Se configuran en la edición del cronograma.</p>
      </section>

      <template v-else>
        <!-- Tira de sesiones con nota consolidada -->
        <div class="ad-sessions">
          <span class="ad-sessions-label">Sesión</span>
          <div class="ds-tabs" role="group" aria-label="Sesiones del aula">
            <button
              v-for="n in sessionNumbers"
              :key="n"
              class="ad-session-btn"
              type="button"
              :aria-pressed="String(selectedSession === n)"
              @click="selectSession(n)"
            >
              <span class="ad-dot" :class="sessionDotCls(n)" aria-hidden="true"></span>
              S{{ n }}
              <span class="ad-session-note" :class="{ pend: sessionConsolidatedNote(n) == null }">
                {{ sessionConsolidatedNote(n) == null ? '—' : '(' + fmtNota(sessionConsolidatedNote(n)) + ')' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Scorecard consolidado -->
        <section class="ds-panel ad-score">
          <div class="ad-score-hero">
            <div class="ad-ring" :class="notaTone(currentConsolidated20)">
              <svg width="92" height="92" viewBox="0 0 92 92" role="img" :aria-label="`Nota consolidada ${fmtNota(currentConsolidated20)} de 20`">
                <circle cx="46" cy="46" r="40" class="ad-ring-track" stroke-width="9" fill="none" />
                <circle
                  cx="46" cy="46" r="40" class="ad-ring-prog" stroke-width="9" fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="RING_CIRC"
                  :stroke-dashoffset="ringOffset(currentConsolidated20)"
                />
              </svg>
              <div class="ad-ring-num"><b>{{ fmtNota(currentConsolidated20) }}</b><span>/ 20</span></div>
            </div>
            <div>
              <div class="ad-score-label">Nota consolidada</div>
              <div class="ad-score-big">{{ currentConsolidated20 == null ? 'Sin datos' : 'Estabilizada' }}</div>
              <span class="ds-pill" :class="currentFirm ? 'ok' : 'warn'">
                <i class="fa-solid" :class="currentFirm ? 'fa-circle-check' : 'fa-clock'" aria-hidden="true"></i>
                {{ currentFirm ? 'Evaluación completa' : 'Provisional · falta área académica' }}
              </span>
            </div>
          </div>
          <div class="ad-score-evals">
            <div class="ad-score-eval">
              <div class="ad-score-eval-head"><span class="ds-pill info">IA</span><span class="ad-score-label">Auditoría automática</span></div>
              <div class="ad-score-value"><b>{{ fmtNota(currentIaScore20) }}</b><span>/ 20</span></div>
              <div class="ds-track"><i class="ad-fill" :class="notaTone(currentIaScore20)" :style="{ width: barWidth(currentIaScore20) }"></i></div>
              <div class="ad-score-weight">Peso {{ PESO_IA_PCT }}%</div>
            </div>
            <div class="ad-score-eval">
              <div class="ad-score-eval-head"><span class="ad-score-label">Área académica</span></div>
              <div class="ad-score-value"><b>{{ fmtNota(currentAcScore20) }}</b><span>/ 20</span></div>
              <div class="ds-track"><i :style="{ width: barWidth(currentAcScore20) }"></i></div>
              <div class="ad-score-weight">Peso {{ PESO_MANUAL_PCT }}% · {{ totalScore }}/{{ activeRubric.totalItems }} criterios marcados</div>
            </div>
          </div>
        </section>

        <!-- Control segmentado + accion IA -->
        <div class="ad-toolbar">
          <div class="ds-tabs" role="tablist" aria-label="Vista de la auditoria">
            <button type="button" role="tab" :aria-selected="String(auditView === 'resumen')" @click="auditView = 'resumen'">
              <i class="fa-solid fa-chart-line" aria-hidden="true"></i> Resumen
            </button>
            <button type="button" role="tab" :aria-selected="String(auditView === 'ia')" @click="auditView = 'ia'">
              <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Auditoría IA
            </button>
            <button type="button" role="tab" :aria-selected="String(auditView === 'academica')" @click="auditView = 'academica'">
              <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i> Evaluación académica
            </button>
          </div>
          <span class="ad-grow"></span>
          <button
            v-if="!currentAiReport"
            class="btn-exec btn-exec-outline"
            type="button"
            title="Generar analisis con IA (consume creditos)"
            @click="onAnalyzeClick"
          >
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
            Analizar con IA
          </button>
          <button
            v-else
            class="btn-exec btn-exec-outline"
            type="button"
            title="Exportar el reporte de la sesion en PDF para entregar al docente"
            @click="exportSessionPdf"
          >
            <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>
            Exportar PDF
          </button>
        </div>

        <!-- ===================== RESUMEN ===================== -->
        <template v-if="auditView === 'resumen'">
          <section v-if="!currentAiReport" class="ds-panel">
            <p class="ds-empty ds-empty--lista">
              <strong class="ad-empty-title">Sesión {{ selectedSession }} sin análisis IA</strong>
              Genera la auditoría IA para ver el resumen, o registra la evaluación académica.
            </p>
          </section>
          <template v-else>
            <div class="ds-kpis">
              <div class="ds-kpi">
                <span class="ds-kpi-icon" :class="notaTone(currentIaScore20)" aria-hidden="true"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                <div class="ds-kpi-body">
                  <div class="ds-kpi-row"><span class="ds-kpi-value">{{ fmtNota(currentIaScore20) }}</span><span class="ad-suffix">/ 20</span></div>
                  <span class="ds-kpi-label">Nota IA</span>
                </div>
              </div>
              <div class="ds-kpi">
                <span class="ds-kpi-icon" :class="notaTone(currentAcScore20)" aria-hidden="true"><i class="fa-solid fa-clipboard-check"></i></span>
                <div class="ds-kpi-body">
                  <div class="ds-kpi-row"><span class="ds-kpi-value">{{ fmtNota(currentAcScore20) }}</span><span class="ad-suffix">/ 20</span></div>
                  <span class="ds-kpi-label">Nota área académica</span>
                </div>
              </div>
              <div class="ds-kpi">
                <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-list-check"></i></span>
                <div class="ds-kpi-body">
                  <div class="ds-kpi-row">
                    <span class="ds-kpi-value">{{ currentMetricas.temas_cubiertos ?? '--' }}</span>
                    <span class="ad-suffix">/ {{ currentMetricas.temas_totales ?? '--' }}</span>
                  </div>
                  <span class="ds-kpi-label">Temas cubiertos</span>
                </div>
              </div>
              <div class="ds-kpi">
                <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-scale-balanced"></i></span>
                <div class="ds-kpi-body ad-grow">
                  <div class="ds-kpi-row">
                    <span class="ds-kpi-value">{{ currentMetricas.porcentaje_practica ?? '--' }}% · {{ currentMetricas.porcentaje_teoria ?? '--' }}%</span>
                  </div>
                  <span class="ds-kpi-label">Balance práctica / teoría</span>
                  <div class="ad-split" aria-hidden="true">
                    <i class="ad-split-p" :style="{ width: (currentMetricas.porcentaje_practica || 0) + '%' }"></i>
                    <i class="ad-split-t" :style="{ width: (currentMetricas.porcentaje_teoria || 0) + '%' }"></i>
                  </div>
                  <div class="ad-legend-row"><span><i class="ad-split-p"></i>Práctica</span><span><i class="ad-split-t"></i>Teoría</span></div>
                </div>
              </div>
            </div>

            <div
              v-if="currentAiReport.fortalezas_top3?.length || currentAiReport.oportunidades_top5?.length"
              class="ds-row"
              :class="currentAiReport.fortalezas_top3?.length && currentAiReport.oportunidades_top5?.length ? 'ds-row--mitad' : 'ds-row--completa'"
            >
              <section v-if="currentAiReport.fortalezas_top3?.length" class="ds-panel">
                <header class="ds-panel-head">
                  <h3 class="ds-panel-title"><span class="ds-pill ok" aria-hidden="true"><i class="fa-solid fa-thumbs-up"></i></span> Fortalezas</h3>
                </header>
                <ul class="ds-panel-body ad-fo">
                  <li v-for="(f, i) in currentAiReport.fortalezas_top3" :key="i"><b>{{ f.titulo }}</b><span>{{ f.detalle }}</span></li>
                </ul>
              </section>
              <section v-if="currentAiReport.oportunidades_top5?.length" class="ds-panel">
                <header class="ds-panel-head">
                  <h3 class="ds-panel-title"><span class="ds-pill warn" aria-hidden="true"><i class="fa-solid fa-bullseye"></i></span> Oportunidades</h3>
                </header>
                <ul class="ds-panel-body ad-fo">
                  <li v-for="(o, i) in currentAiReport.oportunidades_top5" :key="i"><b>{{ o.titulo }}</b><span>{{ o.detalle }}</span></li>
                </ul>
              </section>
            </div>

            <section class="ds-panel">
              <header class="ds-panel-head">
                <h3 class="ds-panel-title">¿Cómo evolucionó el docente sesión a sesión?</h3>
                <span class="ds-panel-hint">Clic en una sesión para abrirla</span>
              </header>
              <div class="ds-panel-body">
                <div class="ad-compare" role="img" aria-label="Comparacion por sesion: auditoria IA y area academica">
                  <div
                    v-for="s in compareSessions"
                    :key="s.n"
                    class="ad-cmp-col"
                    :class="{ current: s.n === selectedSession }"
                    @click="selectSession(s.n)"
                  >
                    <div class="ad-cmp-bars">
                      <template v-if="s.hasIa">
                        <div class="ad-cmp-bar ia" :style="{ height: ((s.ia20 || 0) / 20 * 100) + '%' }"><span>{{ fmtNota(s.ia20) }}</span></div>
                        <div class="ad-cmp-bar ac" :style="{ height: ((s.ac20 || 0) / 20 * 100) + '%' }"><span>{{ s.ac20 ? fmtNota(s.ac20) : '·' }}</span></div>
                      </template>
                      <div v-else class="ad-cmp-pend">pend.</div>
                    </div>
                    <div class="ad-cmp-x">S{{ s.n }}</div>
                  </div>
                </div>
                <div class="ad-legend-row ad-legend-row--center"><span><i class="ia"></i>Auditoría IA</span><span><i class="ac"></i>Área académica</span></div>
              </div>
            </section>
          </template>
        </template>

        <!-- ===================== AUDITORIA IA ===================== -->
        <template v-else-if="auditView === 'ia'">
          <section v-if="!currentAiReport" class="ds-panel">
            <p class="ds-empty ds-empty--lista">
              <strong class="ad-empty-title">Sesión {{ selectedSession }} sin análisis IA</strong>
              La auditoría IA se genera tras realizarse la sesión. Usa "Analizar con IA" para cargarla.
            </p>
          </section>
          <template v-else>
            <section class="ds-panel">
              <header class="ds-panel-head ad-wrap-head">
                <div>
                  <h3 class="ds-panel-title">Análisis IA</h3>
                  <p v-if="currentAiGeneratedAt" class="ds-panel-sub">
                    Generado <b>{{ formatDateTime(currentAiGeneratedAt) }}</b> · {{ currentAiReport.criterios?.length || 0 }} criterios evaluados
                  </p>
                </div>
                <div class="ds-tabs" role="group" aria-label="Ordenar criterios">
                  <button type="button" :aria-pressed="String(iaSort === 'orden')" @click="iaSort = 'orden'">Orden</button>
                  <button type="button" :aria-pressed="String(iaSort === 'bajo')" @click="iaSort = 'bajo'">Puntaje ↑</button>
                  <button type="button" :aria-pressed="String(iaSort === 'alto')" @click="iaSort = 'alto'">Puntaje ↓</button>
                </div>
              </header>
            </section>

            <div class="ad-crit-grid">
              <article v-for="c in sortedAiCriterios" :key="c.id" class="ds-panel ad-crit" :class="levelTone(scoreLevel(c.score))">
                <div class="ds-panel-body ds-stack ad-crit-body">
                  <div class="ad-crit-top">
                    <span class="ad-crit-num ad-mono">#{{ c.id }}</span>
                    <h4 class="ad-crit-title">{{ c.nombre }}</h4>
                    <span class="ds-pill ad-mono" :class="levelTone(scoreLevel(c.score))">{{ c.score }}/5</span>
                  </div>
                  <div class="ad-crit-bar" aria-hidden="true">
                    <i v-for="i in 5" :key="i" :class="{ fill: i <= c.score }"></i>
                  </div>
                  <p class="ad-crit-text">{{ c.comentario }}</p>
                  <div v-if="c.evidencia_timestamps?.length" class="ad-stamps">
                    <span v-for="t in c.evidencia_timestamps" :key="t" class="ds-chip ad-mono">{{ t }}</span>
                  </div>
                </div>
              </article>
            </div>

            <div
              v-if="currentAiReport.fortalezas_top3?.length || currentAiReport.oportunidades_top5?.length"
              class="ds-row"
              :class="currentAiReport.fortalezas_top3?.length && currentAiReport.oportunidades_top5?.length ? 'ds-row--mitad' : 'ds-row--completa'"
            >
              <section v-if="currentAiReport.fortalezas_top3?.length" class="ds-panel">
                <header class="ds-panel-head">
                  <h3 class="ds-panel-title"><span class="ds-pill ok" aria-hidden="true"><i class="fa-solid fa-thumbs-up"></i></span> Fortalezas</h3>
                </header>
                <ul class="ds-panel-body ad-fo">
                  <li v-for="(f, i) in currentAiReport.fortalezas_top3" :key="i"><b>{{ f.titulo }}</b><span>{{ f.detalle }}</span></li>
                </ul>
              </section>
              <section v-if="currentAiReport.oportunidades_top5?.length" class="ds-panel">
                <header class="ds-panel-head">
                  <h3 class="ds-panel-title"><span class="ds-pill warn" aria-hidden="true"><i class="fa-solid fa-bullseye"></i></span> Oportunidades</h3>
                </header>
                <ul class="ds-panel-body ad-fo">
                  <li v-for="(o, i) in currentAiReport.oportunidades_top5" :key="i"><b>{{ o.titulo }}</b><span>{{ o.detalle }}</span></li>
                </ul>
              </section>
            </div>
          </template>
        </template>

        <!-- ===================== EVALUACION ACADEMICA ===================== -->
        <template v-else>
          <section class="ds-panel">
            <header class="ds-panel-head ad-wrap-head">
              <div>
                <h3 class="ds-panel-title">Rúbrica del área académica</h3>
                <p class="ds-panel-sub">
                  {{ isHistoricRubric
                    ? `Auditoria calificada con la rubrica vigente hasta el ${formatDate(FECHA_CORTE_RUBRICA)}.`
                    : `Marca cada criterio cumplido durante la sesion ${selectedSession}.` }}
                </p>
              </div>
              <div class="ad-acad-prog">
                <div class="ad-acad-big ad-mono">{{ totalScore }} / {{ activeRubric.totalItems }}</div>
                <div class="ds-panel-hint">{{ totalProgress }}% completado</div>
              </div>
            </header>
          </section>

          <p v-if="isHistoricRubric" class="ds-callout info">
            <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
            <span>
              Rúbrica anterior ({{ activeRubric.totalItems }} criterios de
              {{ activeRubric.puntosPorCriterio }} punto). Se muestra como se llenó y no se edita:
              volver a guardarla la recalificaría con la rúbrica vigente y cambiaría la nota del docente.
            </span>
          </p>

          <div class="ds-row ds-row--mitad ad-rub-grid" :class="{ 'is-readonly': isHistoricRubric }">
            <section v-for="cat in activeRubric.categorias" :key="cat.key" class="ds-panel">
              <header class="ds-panel-head">
                <h3 class="ds-panel-title">{{ cat.label }}</h3>
                <span class="ds-panel-hint ad-mono">{{ categoryScore(cat) }} / {{ cat.items.length }}</span>
              </header>
              <div class="ds-track ad-rub-track"><i :style="{ width: (categoryScore(cat) / cat.items.length * 100) + '%' }"></i></div>
              <div
                v-for="it in cat.items"
                :key="it.key"
                class="ad-rub-row"
                :class="{ on: sessionDraft[it.key] }"
                role="checkbox"
                :aria-checked="String(!!sessionDraft[it.key])"
                :aria-disabled="String(isHistoricRubric)"
                @click="isHistoricRubric || (sessionDraft[it.key] = !sessionDraft[it.key])"
              >
                <span class="ad-cbx" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
                <span>{{ it.label }}</span>
              </div>
            </section>
          </div>

          <div class="ad-savebar">
            <span class="ad-savebar-text">Criterios marcados <b class="ad-mono">{{ totalScore }} / {{ activeRubric.totalItems }}</b> · {{ totalProgress }}%</span>
            <span v-if="lastSavedAt" class="ad-muted ad-small">Guardado {{ formatDate(lastSavedAt) }}</span>
            <span class="ad-grow"></span>
            <button v-if="!isHistoricRubric" class="btn-exec btn-exec-primary" type="button" :disabled="isSavingSession" @click="saveSession">
              <i class="fa-solid" :class="isSavingSession ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
              {{ isSavingSession ? 'Guardando...' : 'Guardar sesión' }}
            </button>
          </div>
        </template>
      </template>
    </section>

    <!-- ============================================================ -->
    <!-- GENERAL: consolidado IA + rubrica manual                     -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'general'" class="ds-stack">
      <section v-if="!sessionsTotal" class="ds-panel">
        <p class="ds-empty ds-empty--lista">El aula no tiene sesiones definidas. Se configuran en la edición del cronograma.</p>
      </section>
      <template v-else>
        <!-- Hero consolidado del aula -->
        <section class="ds-panel ad-score">
          <div class="ad-score-hero">
            <div class="ad-ring" :class="notaTone(generalAulaAverages.consolidated20)">
              <svg width="92" height="92" viewBox="0 0 92 92" role="img" :aria-label="`Nota consolidada del aula ${fmtNota(generalAulaAverages.consolidated20)} de 20`">
                <circle cx="46" cy="46" r="40" class="ad-ring-track" stroke-width="9" fill="none" />
                <circle
                  cx="46" cy="46" r="40" class="ad-ring-prog" stroke-width="9" fill="none" stroke-linecap="round"
                  :stroke-dasharray="RING_CIRC" :stroke-dashoffset="ringOffset(generalAulaAverages.consolidated20)"
                />
              </svg>
              <div class="ad-ring-num"><b>{{ fmtNota(generalAulaAverages.consolidated20) }}</b><span>/ 20</span></div>
            </div>
            <div>
              <div class="ad-score-label">Nota consolidada del aula</div>
              <div class="ad-score-big">{{ score20Label(generalAulaAverages.consolidated20) }}</div>
              <span class="ds-pill" :class="generalCoverage.full ? 'ok' : 'warn'">
                <i class="fa-solid" :class="generalCoverage.full ? 'fa-circle-check' : 'fa-clock'" aria-hidden="true"></i>
                {{ generalCoverage.full ? 'Muestra completa' : 'Muestra incompleta' }}
              </span>
            </div>
          </div>
          <div class="ad-score-evals">
            <div class="ad-score-eval">
              <div class="ad-score-eval-head"><span class="ds-pill info">IA</span><span class="ad-score-label">Promedio IA</span></div>
              <div class="ad-score-value"><b>{{ fmtNota(generalAulaAverages.ai20) }}</b><span>/ 20</span></div>
              <div class="ds-track"><i class="ad-fill" :class="notaTone(generalAulaAverages.ai20)" :style="{ width: barWidth(generalAulaAverages.ai20) }"></i></div>
              <div class="ad-score-weight">{{ generalAulaAverages.aiSessions }} / {{ sessionsTotal }} sesiones analizadas</div>
            </div>
            <div class="ad-score-eval">
              <div class="ad-score-eval-head"><span class="ad-score-label">Promedio rúbrica manual</span></div>
              <div class="ad-score-value"><b>{{ fmtNota(generalAulaAverages.manual20) }}</b><span>/ 20</span></div>
              <div class="ds-track"><i :style="{ width: barWidth(generalAulaAverages.manual20) }"></i></div>
              <div class="ad-score-weight">{{ generalAulaAverages.manualSessions }} / {{ sessionsTotal }} sesiones evaluadas</div>
            </div>
          </div>
        </section>

        <!-- Evolucion del aula -->
        <section class="ds-panel">
          <header class="ds-panel-head">
            <div>
              <h3 class="ds-panel-title">¿Cómo evoluciona la nota del aula por sesión?</h3>
              <p class="ds-panel-sub">Línea sólida: consolidada. Punteadas: IA y rúbrica manual. Los huecos son sesiones sin evaluar.</p>
            </div>
          </header>
          <div class="ds-panel-body">
            <div role="img" aria-label="Nota del aula por sesion">
              <apexchart type="line" height="300" :options="generalChartOptions" :series="generalChartSeries" />
            </div>

            <div class="ad-coverage">
              <div class="ad-cov-item">
                <div class="ad-cov-head">
                  <span><i class="ad-cov-dot ia" aria-hidden="true"></i>Análisis IA</span>
                  <b>{{ generalCoverage.ai }} / {{ generalCoverage.total }} · {{ generalCoverage.aiPct }}%</b>
                </div>
                <div class="ds-track"><i class="ad-cov-ia" :style="{ width: generalCoverage.aiPct + '%' }"></i></div>
              </div>
              <div class="ad-cov-item">
                <div class="ad-cov-head">
                  <span><i class="ad-cov-dot" aria-hidden="true"></i>Evaluación manual</span>
                  <b>{{ generalCoverage.manual }} / {{ generalCoverage.total }} · {{ generalCoverage.manualPct }}%</b>
                </div>
                <div class="ds-track"><i :style="{ width: generalCoverage.manualPct + '%' }"></i></div>
              </div>
            </div>
          </div>
          <footer v-if="!generalCoverage.full" class="ds-panel-foot warn">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <span>Muestra incompleta. El veredicto del aula puede cambiar conforme se evalúen más sesiones.</span>
          </footer>
        </section>

        <!-- Detalle por sesion -->
        <section class="ds-panel">
          <header class="ds-panel-head"><h3 class="ds-panel-title">Detalle por sesión</h3></header>
          <div class="ds-panel-body ds-table-scroll">
            <table class="ds-table ad-general-table">
              <thead>
                <tr>
                  <th>Sesión</th><th>Rúbrica manual</th><th>Nota IA</th>
                  <th>Nota manual</th><th>Consolidada</th><th>Veredicto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in generalRows" :key="r.n" :class="{ current: r.n === selectedSession }">
                  <td>S{{ r.n }}</td>
                  <td><span class="ad-strong-ink">{{ r.manualMarked }} / {{ r.manualTotal }}</span> <span class="ad-muted">· {{ r.manualPct }}%</span></td>
                  <td>
                    <span v-if="r.hasAi" class="ds-pill ad-mono" :class="notaTone(r.aiScore20)">{{ fmtNota(r.aiScore20) }}</span>
                    <span v-else class="ad-muted">sin análisis</span>
                  </td>
                  <td>
                    <span v-if="r.hasManual" class="ds-pill ad-mono" :class="notaTone(r.manualScore20)">{{ fmtNota(r.manualScore20) }}</span>
                    <span v-else class="ad-muted">sin evaluar</span>
                  </td>
                  <td>
                    <span v-if="r.consolidated20 != null" class="ds-pill ad-mono" :class="notaTone(r.consolidated20)">{{ fmtNota(r.consolidated20) }}</span>
                    <span v-else class="ad-muted">--</span>
                  </td>
                  <td :class="notaTone(r.consolidated20)">{{ score20Label(r.consolidated20) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <p class="ds-callout">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>
            La nota consolidada combina IA y rúbrica manual con pesos {{ PESO_IA_PCT }}% / {{ PESO_MANUAL_PCT }}%.
            Si solo hay una fuente disponible, se usa esa.
          </span>
        </p>
      </template>
    </section>

    <!-- MODAL: importar notas pegadas desde el Google Sheet. -->
    <BaseModal v-model="showImportModal" :title="`Importar notas finales · ${aula?.global_code || 'Aula'}`" size="lg">
      <div class="ds-stack">
        <p class="ds-callout info">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>
            Escribe la <strong>NOTA FINAL (0-20)</strong> solo a los alumnos que quieras actualizar;
            las casillas vacías no se tocan. También puedes <strong>copiar la columna de notas
            del Sheet y pegarla</strong> en la casilla del primer alumno: se reparte hacia abajo
            en orden (verifica que el orden de alumnos coincida con el Sheet). La nota se registra como nota única del alumno
            (tests, PP y PF quedan con ese valor para que la NOTA FINAL calculada coincida).
          </span>
        </p>
        <div class="ad-imp-list">
          <div v-for="(s, idx) in students" :key="s.enrollment_id" class="ad-imp-row">
            <span class="ad-muted ad-mono ad-small">{{ String(idx + 1).padStart(2, '0') }}</span>
            <span class="ad-imp-name">{{ apellidosNombres(s) }}</span>
            <span class="ad-imp-cur" title="Nota final actual">{{ currentFinalLabel(s) }}</span>
            <input
              v-model="importGrades[s.enrollment_id]"
              class="ds-input ad-imp-input"
              type="number"
              min="0"
              max="20"
              step="0.5"
              placeholder="--"
              :aria-label="`Nota final de ${apellidosNombres(s)}`"
              :class="{ 'is-bad': importGrades[s.enrollment_id] && parseNota(importGrades[s.enrollment_id]) == null }"
              @paste="onImportPaste($event, idx)"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="showImportModal = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="!importCount" @click="applyImport">
          <i class="fa-solid fa-check" aria-hidden="true"></i>
          Aplicar{{ importCount ? ` (${importCount} alumnos)` : '' }}
        </button>
      </template>
    </BaseModal>

    <!-- MODAL: ejecutar IA -->
    <BaseModal v-model="showAiModal" :title="`Análisis IA · sesión ${selectedSession}`" size="lg">
      <div class="ds-stack">
        <p v-if="aiSpend" class="ds-callout info">
          <i class="fa-solid fa-coins" aria-hidden="true"></i>
          <span>Gasto IA de este mes: <b>S/ {{ aiSpend.spentPen.toFixed(2) }}</b> en {{ aiSpend.audits }} análisis (~S/ 2 cada uno)</span>
        </p>
        <p class="ad-intro">
          La IA analiza el transcript y el syllabus para puntuar 9 criterios. Las categorías
          <strong>Interacción</strong> y <strong>Contenido</strong> se auto-marcan según los scores.
          <strong>Entorno</strong> y <strong>Comunicación académica</strong> quedan manuales.
        </p>
        <div class="ds-field">
          <div class="ad-field-head">
            <label class="ds-label" for="ad-transcript">Transcript</label>
            <label class="btn-exec btn-exec-outline btn-sm">
              <i class="fa-solid fa-upload" aria-hidden="true"></i> Cargar archivo (.vtt o .txt)
              <input type="file" accept=".vtt,.txt,text/plain,text/vtt" hidden @change="onTranscriptFileChange" />
            </label>
          </div>
          <textarea
            id="ad-transcript"
            v-model="aiTranscript"
            class="ds-input ad-transcript"
            rows="12"
            placeholder="Pega el transcript con timestamps [HH:MM:SS] o sube un archivo .vtt de Teams/Zoom/YouTube.&#10;&#10;Ejemplo:&#10;[00:00:15] Bienvenidos al modulo de Excel...&#10;[00:01:30] Vamos a revisar la sesion anterior..."
          ></textarea>
          <span class="ds-help">
            Acepta WebVTT (Teams, Zoom, YouTube) o texto plano. Se convierte automáticamente al formato [HH:MM:SS].
          </span>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="ad-syllabus">Imagen del syllabus (PNG/JPG)</label>
          <input id="ad-syllabus" class="ad-file" type="file" accept="image/png,image/jpeg,image/webp" @change="onSyllabusChange" />
          <span v-if="aiSyllabusFile" class="ds-help">
            Seleccionado: {{ aiSyllabusFile.name }} ({{ Math.round(aiSyllabusFile.size / 1024) }} KB)
          </span>
        </div>
        <p v-if="aiError" class="ds-callout bad">
          <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
          <span>{{ aiError }}</span>
        </p>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="isRunningAi" @click="showAiModal = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="isRunningAi" @click="runAiAudit">
          <i class="fa-solid" :class="isRunningAi ? 'fa-spinner fa-spin' : 'fa-play'" aria-hidden="true"></i>
          {{ isRunningAi ? 'Analizando...' : 'Ejecutar análisis' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.ad-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
/* Solo lo propio de esta pantalla: matriz de notas, rubrica, anillo y barras.
   Estructura, colores y estados salen de design-system.css (ds-*). */
.ad-mono { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; }
.ad-muted { color: var(--ds-muted); }
.ad-small { font-size: 11.5px; }
.ad-grow { flex: 1; }
.ad-suffix { font-size: 13px; font-weight: 600; color: var(--ds-muted); }

/* ── Encabezado ─────────────────────────────────────────────────────────── */
.ad-back {
  display: inline-flex; align-items: center; gap: 6px;
  margin: 0 0 6px; padding: 0; border: 0; background: none;
  font: inherit; font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); cursor: pointer;
}
.ad-back:hover, .ad-back:focus-visible { color: var(--ds-accent); }
.ad-back i { font-size: 11px; }

.ad-facts { display: flex; flex-wrap: wrap; gap: 12px 28px; margin: 0; }
.ad-facts dt { margin-bottom: 3px; font-size: 11.5px; font-weight: 600; color: var(--ds-muted); }
.ad-facts dd { margin: 0; font-size: 13px; font-weight: 500; color: var(--ds-ink); }
.ad-teacher { display: flex; align-items: center; gap: 6px; }

.ad-avatar {
  width: 26px; height: 26px; flex-shrink: 0;
  display: grid; place-items: center; border-radius: 999px;
  background: var(--ds-soft-neutral); color: var(--ds-ink-2);
  font-size: 10px; font-weight: 700;
}

/* Aviso de convalidados bajo el KPI de Alumnos: lleva al tab Historial. */
.ad-kpi-link {
  display: block; margin-top: 1px; padding: 0; border: 0; background: none;
  font: inherit; font-size: 11.5px; font-weight: 600; color: var(--ds-violet-ink);
  cursor: pointer; text-decoration: underline dotted;
}

/* ds-tabs es inline-flex, pero dentro de .ds-page (flex columna) se estira. */
.ad-tabs { align-self: flex-start; }
.ad-tab-count { margin-left: 2px; font-size: 11px; opacity: 0.75; }

/* ── Barra de acciones de Notas / Auditoria ─────────────────────────────── */
.ad-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.ad-search { width: 260px; height: 32px; }
.ad-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ds-ink-2); }
.ad-debt-swatch { width: 14px; height: 14px; border-radius: var(--ds-radius-control); background: var(--ds-soft-info); border: 1px solid var(--ds-border-strong); }

.ad-csv { position: relative; }
.ad-caret { font-size: 9px; opacity: 0.6; }
.ad-csv-backdrop { position: fixed; inset: 0; z-index: 40; }
.ad-csv-menu {
  position: absolute; right: 0; top: calc(100% + 4px); z-index: 41;
  display: flex; flex-direction: column; min-width: 220px; padding: 4px;
  background: var(--ds-surface); border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm); box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.25);
}
.ad-csv-menu button {
  display: flex; align-items: center; gap: 8px; padding: 8px 11px;
  border: 0; border-radius: var(--ds-radius-control); background: transparent;
  font: inherit; font-size: 12.5px; font-weight: 500; color: var(--ds-ink); text-align: left; cursor: pointer;
}
.ad-csv-menu button:hover, .ad-csv-menu button:focus-visible { background: var(--ds-surface-2); }
.ad-csv-menu button i { width: 14px; text-align: center; color: var(--ds-ink-2); }

/* ── Matriz de notas ────────────────────────────────────────────────────── */
/* Tabla ancha (2 columnas por sesion): scroll horizontal y vertical propio,
   con N° y alumno fijos a la izquierda y la cabecera fija arriba. */
.ad-grades-scroll { max-height: 72vh; overflow: auto; }
.ad-grades { border-collapse: separate; border-spacing: 0; }
.ad-grades th, .ad-grades td { white-space: nowrap; vertical-align: middle; }
.ad-grades th { text-align: center; }
/* Las celdas pintan superficie + tinte como capas: en oscuro los tintes son
   translucidos y una columna fija dejaria ver lo que pasa por debajo. */
.ad-grades thead th {
  position: sticky; top: 0; z-index: 2;
  background-color: var(--ds-surface-2);
  background-image: linear-gradient(var(--ad-tint, transparent), var(--ad-tint, transparent));
  box-shadow: inset 0 -1px 0 var(--ds-border);
}
.ad-grades tbody td {
  background-color: var(--ds-surface);
  background-image: linear-gradient(var(--ad-tint, transparent), var(--ad-tint, transparent));
}
.ad-grades .ad-c0 { position: sticky; left: 0; z-index: 1; width: 38px; min-width: 38px; text-align: center; }
.ad-grades .ad-c1 { position: sticky; left: 38px; z-index: 1; min-width: 220px; max-width: 240px; overflow: hidden; }
.ad-grades thead .ad-c0, .ad-grades thead .ad-c1 { z-index: 3; }
.ad-grades .ad-group.ok { --ad-tint: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.ad-grades .ad-group.warn { --ad-tint: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.ad-grades .ad-group.info { --ad-tint: var(--ds-soft-info); color: var(--ds-info-ink); }
.ad-grades .ad-session { padding: 4px 6px; font-size: 10px; }
.ad-grades .ad-strong { font-weight: 700; }

.ad-grades tbody tr:hover { --ad-tint: var(--ds-soft-neutral); }
/* Orden a proposito: deuda gana a laptop y "certificar" (tarea pendiente de
   Academica) gana a las dos. */
.ad-grades tbody tr.row-laptop { --ad-tint: var(--ds-soft-cyan); }
.ad-grades tbody tr.row-debt { --ad-tint: var(--ds-soft-info); }
.ad-grades tbody tr.row-certify { --ad-tint: var(--ds-soft-ok); }
.ad-grades tbody tr.row-certify .ad-c0 { box-shadow: inset 3px 0 0 var(--ds-ok); }

.ad-center { text-align: center; }
.ad-cell-input { padding: 3px 4px; text-align: center; }
.ad-total { text-align: center; font-weight: 600; color: var(--ds-heading); }
.ad-pill-stack { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.ad-pill-gap { margin-left: 4px; }
.ad-debt-ico { flex-shrink: 0; margin-left: 2px; font-size: 12px; color: var(--ds-info-ink); }

.ad-student { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ad-student-text { flex: 1; min-width: 0; overflow: hidden; }
.ad-student-name { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ad-student-name.ad-wrap { white-space: normal; }
.ad-student-sub { font-size: 10.5px; font-weight: 400; color: var(--ds-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ad-grade-input {
  width: 40px; height: 24px; padding: 0 4px;
  border: 1px solid var(--ds-border-strong); border-radius: var(--ds-radius-control);
  background: var(--ds-surface-2); color: var(--ds-ink);
  font-family: var(--ds-font-mono); font-size: 11.5px; text-align: center;
  color-scheme: light dark;
}
.ad-grade-input:focus { outline: none; border-color: var(--ds-accent); }
.ad-grade-input--wide { width: 64px; }
.ad-grade-input::-webkit-outer-spin-button,
.ad-grade-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ad-part-check { width: 15px; height: 15px; accent-color: var(--ds-warn); cursor: pointer; }

/* Fila de criterios de entregables (se abre con el lapiz) */
.ad-grades .ad-deliv-row > td {
  --ad-tint: var(--ds-surface-2);
  padding: 12px 16px; font-weight: 400; color: var(--ds-ink-2); white-space: normal;
}
.ad-deliv { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; max-width: 980px; }
.ad-deliv-title {
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
  font-size: 12px; font-weight: 700; color: var(--ds-heading);
}
.ad-deliv-field {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-bottom: 6px; font-size: 12px; color: var(--ds-ink-2);
}
.ad-deliv-flags { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
.ad-deliv-obs { grid-column: 1 / -1; }
.ad-obs { max-width: 880px; min-height: 56px; line-height: 1.45; }
.ad-obs--ia { border-color: var(--ds-warn); background: var(--ds-soft-warn); }

/* Resumenes bajo la tabla */
.ad-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--ds-gap); }
.ad-summary-wide { grid-column: 1 / -1; }
.ad-summary-text { margin: 0; font-size: 13px; line-height: 1.55; white-space: pre-wrap; color: var(--ds-ink); }
.ad-sumlist { display: flex; flex-direction: column; gap: 6px; margin: 0; }
.ad-sumlist > div { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; }
.ad-sumlist dt { font-weight: 400; color: var(--ds-ink-2); }
.ad-sumlist dd { margin: 0; font-weight: 700; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.ad-sumlist dd.ok { color: var(--ds-ok-ink); }
.ad-sumlist dd.bad { color: var(--ds-bad-ink); }
.ad-session-table td, .ad-session-table th { padding-left: 6px; }
.ad-top { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.ad-top li { display: flex; align-items: flex-start; gap: 10px; font-size: 12.5px; }
.ad-top-name { flex: 1; display: flex; flex-direction: column; min-width: 0; }

/* ── Historial ──────────────────────────────────────────────────────────── */
.ad-hist-title { display: flex; align-items: center; gap: 9px; }
.ad-hist td { vertical-align: middle; }
.ad-hist-just { max-width: 280px; white-space: normal; }

/* ── Auditoria: tira de sesiones ────────────────────────────────────────── */
.ad-sessions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.ad-sessions-label { font-size: 12px; font-weight: 600; color: var(--ds-muted); }
.ad-session-btn { display: inline-flex; align-items: center; gap: 6px; }
.ad-dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--ds-muted); }
.ad-dot.sdot-partial { background: var(--ds-accent); }
.ad-dot.sdot-done { background: var(--ds-ok); }
.ad-sessions [aria-pressed="true"] .ad-dot { background: var(--ds-on-brand); }
.ad-session-note { font-weight: 700; }
.ad-session-note.pend { font-weight: 500; opacity: 0.7; }

/* ── Scorecard: anillo + dos evaluaciones ───────────────────────────────── */
.ad-score { flex-direction: row; flex-wrap: wrap; }
.ad-score-hero {
  flex: 1; min-width: 280px; display: flex; align-items: center; gap: 14px; padding: 15px 18px;
  border-right: 1px solid var(--ds-border); background: var(--ds-surface-2);
}
.ad-score-label { font-size: 11.5px; font-weight: 600; color: var(--ds-muted); }
.ad-score-big { margin: 2px 0 6px; font-size: 16px; font-weight: 800; color: var(--ds-heading); }
.ad-score-evals { flex: 2; min-width: 300px; display: flex; }
.ad-score-eval { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 14px 18px; border-right: 1px solid var(--ds-border); }
.ad-score-eval:last-child { border-right: 0; }
.ad-score-eval-head { display: flex; align-items: center; gap: 8px; }
.ad-score-value { display: flex; align-items: baseline; gap: 4px; }
.ad-score-value b { font-size: 23px; font-weight: 800; letter-spacing: -0.02em; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.ad-score-value span { font-size: 13px; font-weight: 600; color: var(--ds-muted); }
.ad-score-weight { font-size: 11.5px; font-weight: 600; color: var(--ds-muted); }

.ad-ring { position: relative; width: 68px; height: 68px; flex: none; }
.ad-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ad-ring-track { stroke: var(--ds-surface-3); }
.ad-ring-prog { stroke: var(--ds-accent); transition: stroke-dashoffset 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
.ad-ring.ok .ad-ring-prog { stroke: var(--ds-ok); }
.ad-ring.warn .ad-ring-prog { stroke: var(--ds-warn); }
.ad-ring.bad .ad-ring-prog { stroke: var(--ds-bad); }
.ad-ring-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ad-ring-num b { font-size: 19px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; color: var(--ds-heading); }
.ad-ring-num span { font-size: 9px; font-weight: 700; color: var(--ds-muted); }

/* Relleno de .ds-track por tono (sin tono = --ds-accent del global) */
.ad-fill.ok { background: var(--ds-ok); }
.ad-fill.warn { background: var(--ds-warn); }
.ad-fill.bad { background: var(--ds-bad); }

/* ── Auditoria: resumen ─────────────────────────────────────────────────── */
.ad-empty-title { display: block; margin-bottom: 6px; font-size: 16px; color: var(--ds-ink-2); }
.ad-split { display: flex; height: 8px; margin-top: 10px; border-radius: 999px; overflow: hidden; background: var(--ds-surface-3); }
.ad-split-p { background: var(--ds-accent); }
.ad-split-t { background: var(--ds-warn); }
.ad-legend-row { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: var(--ds-ink-2); }
.ad-legend-row--center { justify-content: center; }
.ad-legend-row i { display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 3px; }
.ad-legend-row i.ia { background: var(--ds-accent-2); }
.ad-legend-row i.ac { background: var(--ds-accent); }

.ad-fo { display: flex; flex-direction: column; margin: 0; list-style: none; }
.ad-fo li { display: flex; flex-direction: column; gap: 2px; padding: 9px 0; border-top: 1px solid var(--ds-border); }
.ad-fo li:first-child { padding-top: 0; border-top: 0; }
.ad-fo b { font-size: 13px; color: var(--ds-heading); }
.ad-fo span { font-size: 12.5px; line-height: 1.45; color: var(--ds-ink-2); }

.ad-compare { display: flex; align-items: flex-end; gap: 16px; height: 150px; padding: 14px 6px 0; }
.ad-cmp-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; height: 100%; cursor: pointer; }
.ad-cmp-bars { display: flex; align-items: flex-end; justify-content: center; gap: 5px; width: 100%; height: 100%; }
.ad-cmp-bar { position: relative; width: 26px; min-height: 2px; border-radius: 6px 6px 0 0; transition: height 0.5s; }
.ad-cmp-bar.ia { background: var(--ds-accent-2); }
.ad-cmp-bar.ac { background: var(--ds-accent); }
.ad-cmp-bar span {
  position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
  font-size: 10px; font-weight: 700; color: var(--ds-ink-2); font-variant-numeric: tabular-nums;
}
.ad-cmp-pend { align-self: flex-end; font-size: 11px; color: var(--ds-muted); }
.ad-cmp-x { font-size: 12px; font-weight: 700; color: var(--ds-ink-2); }
.ad-cmp-col.current .ad-cmp-x { color: var(--ds-accent); }

/* ── Auditoria IA: tarjetas de criterio ─────────────────────────────────── */
.ad-wrap-head { flex-wrap: wrap; }
.ad-crit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 11px; }
/* El borde izquierdo lleva el tono del puntaje (bueno / atencion / malo). */
.ad-crit { position: relative; }
.ad-crit::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ad-edge, transparent); }
.ad-crit.ok { --ad-edge: var(--ds-ok); }
.ad-crit.warn { --ad-edge: var(--ds-warn); }
.ad-crit.bad { --ad-edge: var(--ds-bad); }
.ad-crit.info { --ad-edge: var(--ds-accent); }
.ad-crit-body { gap: 8px; }
.ad-crit-top { display: flex; align-items: flex-start; gap: 10px; }
.ad-crit-num { padding-top: 2px; font-size: 12px; font-weight: 600; color: var(--ds-muted); }
.ad-crit-title { flex: 1; margin: 0; font-size: 13.5px; font-weight: 700; line-height: 1.25; color: var(--ds-heading); }
.ad-crit-bar { display: flex; gap: 4px; }
.ad-crit-bar i { flex: 1; height: 5px; border-radius: 999px; background: var(--ds-surface-3); }
.ad-crit-bar i.fill { background: var(--ad-edge, var(--ds-accent)); }
.ad-crit-text { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ds-ink-2); }
.ad-stamps { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }

/* ── Evaluacion academica: rubrica ──────────────────────────────────────── */
.ad-acad-prog { text-align: right; }
.ad-acad-big { font-size: 18px; font-weight: 800; color: var(--ds-heading); }
.ad-rub-grid { align-items: start; }
.ad-rub-track { border-radius: 0; height: 4px; }
.ad-rub-row {
  display: flex; align-items: flex-start; gap: 11px; padding: 10px 18px;
  border-top: 1px solid var(--ds-border); font-size: 13px; line-height: 1.45; color: var(--ds-ink);
  cursor: pointer; user-select: none; transition: background 0.12s;
}
.ad-rub-row:hover { background: var(--ds-surface-2); }
.ad-rub-row.on { color: var(--ds-ink-2); }
.ad-cbx {
  width: 18px; height: 18px; flex: none; margin-top: 1px;
  display: grid; place-items: center; border-radius: var(--ds-radius-control);
  border: 2px solid var(--ds-border-strong); color: transparent; font-size: 10px; transition: 0.15s;
}
.ad-rub-row.on .ad-cbx { background: var(--ds-accent); border-color: var(--ds-accent); color: var(--ds-surface); }
.ad-rub-grid.is-readonly .ad-rub-row { cursor: default; }
.ad-rub-grid.is-readonly .ad-rub-row:hover { background: transparent; }

/* Barra de guardado: flota sobre la rubrica al hacer scroll (por eso sombra). */
.ad-savebar {
  position: sticky; bottom: 0; z-index: 5;
  display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 12px 18px;
  background: color-mix(in oklab, var(--ds-surface) 88%, transparent); backdrop-filter: blur(10px);
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.25);
}
.ad-savebar-text { font-size: 14px; font-weight: 600; color: var(--ds-ink); }

/* ── General: cobertura y tabla ─────────────────────────────────────────── */
.ad-coverage { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 14px; padding-top: 16px; border-top: 1px solid var(--ds-border); }
.ad-cov-item { display: flex; flex-direction: column; gap: 7px; }
.ad-cov-head { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--ds-ink-2); }
.ad-cov-head b { color: var(--ds-heading); }
.ad-cov-dot { display: inline-block; width: 9px; height: 9px; margin-right: 7px; border-radius: 3px; background: var(--ds-accent); }
.ad-cov-dot.ia, .ad-cov-ia { background: var(--ds-accent-2); }
.ad-general-table tr.current td { background: var(--ds-soft-info); }
.ad-strong-ink { font-weight: 600; color: var(--ds-heading); }

/* ── Modales ────────────────────────────────────────────────────────────── */
.ad-intro { margin: 0; font-size: 13px; line-height: 1.55; color: var(--ds-ink-2); }
.ad-field-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.ad-field-head .ds-label { margin-bottom: 0; }
.ad-transcript { min-height: 160px; font-family: var(--ds-font-mono); font-size: 12px; line-height: 1.5; }
.ad-file { font-size: 12px; padding: 6px 0; color: var(--ds-ink-2); }

.ad-imp-list { max-height: 52vh; overflow-y: auto; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.ad-imp-row { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-bottom: 1px solid var(--ds-border); }
.ad-imp-row:last-child { border-bottom: 0; }
.ad-imp-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--ds-ink); }
.ad-imp-cur { min-width: 34px; font-size: 11.5px; color: var(--ds-muted); text-align: right; }
.ad-imp-input { width: 72px; height: 30px; text-align: center; font-weight: 600; }
.ad-imp-input.is-bad { border-color: var(--ds-bad); color: var(--ds-bad-ink); }

@media (max-width: 900px) {
  .ad-coverage { grid-template-columns: 1fr; }
  .ad-score-hero { border-right: 0; border-bottom: 1px solid var(--ds-border); }
  .ad-search { width: 100%; }
}
</style>
