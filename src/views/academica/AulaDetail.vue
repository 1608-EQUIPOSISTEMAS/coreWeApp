<script setup>
import { ref, reactive, computed, onMounted, inject, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import apexchart from 'vue3-apexcharts'
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
    // schedules + sesiones, pero NO trae program_abreviature ni instructor
    // (esos los expone sp_edition_list a traves de joins distintos). Si
    // alguno falta, hacemos una segunda llamada al list filtrando por el
    // codigo global y mergeamos. Es la misma fuente de datos que usa la
    // pagina /academica/aulas, asi que los valores son consistentes.
    if (detail && (!detail.program_abreviature || !detail.instructor)) {
      try {
        const code = detail.global_code
        if (code) {
          const { items } = await editionService.editionList({
            active: null,
            q: code,
            page: 1,
            size: 50,
          })
          const match = (items || []).find(
            (r) => Number(r.edition_num_id) === editionId.value,
          )
          if (match) {
            aula.value = {
              ...detail,
              program_abreviature: detail.program_abreviature || match.program_abreviature,
              instructor: detail.instructor || match.instructor,
              cat_segment: detail.cat_segment || match.cat_segment,
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo enriquecer aula con editionList:', err?.message || err)
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
  { id: 'asistencia', label: 'Asistencia', icon: 'fa-clipboard-user' },
  { id: 'auditoria', label: 'Auditoria', icon: 'fa-clipboard-check' },
  { id: 'general', label: 'General', icon: 'fa-chart-line' },
]

// Permite preseleccionar el tab via query (?tab=general). Lo usa el Reporte
// Academico para que el drill-down caiga directo en la vista consolidada.
const TAB_IDS = TABS.map((t) => t.id)
const initialTab = TAB_IDS.includes(route?.query?.tab) ? route.query.tab : 'asistencia'
const activeTab = ref(initialTab)

function switchTab(id) {
  activeTab.value = id
  if (id === 'asistencia' && !students.value.length) loadStudents()
  if (id === 'auditoria' && !auditMap.value) loadAudit()
  // El tab General consume `auditMap` igual que Auditoria, asi que
  // disparamos el mismo fetch para no requerir entrar antes a Auditoria.
  if (id === 'general' && !auditMap.value) loadAudit()
}

// =====================================================================
// ASISTENCIA: alumnos + matriz
// =====================================================================
const students = ref([])
const isLoadingStudents = ref(false)
const studentFilter = ref('todos')
const studentQuery = ref('')

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'en_riesgo', label: 'En riesgo' },
  { id: 'bajo_rend', label: 'Bajo rend.' },
]

async function loadStudents() {
  isLoadingStudents.value = true
  try {
    students.value = await editionService.classroomStudentsList({ edition_id: editionId.value })
  } catch (err) {
    console.error('Error cargando alumnos:', err)
    toast.error('Error cargando alumnos del aula')
    students.value = []
  } finally {
    isLoadingStudents.value = false
  }
}

const filteredStudents = computed(() => {
  const q = studentQuery.value.trim().toLowerCase()
  return students.value.filter((s) => {
    if (q) {
      const hay = `${s.full_name || ''} ${s.dni || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

// TODO: enchufar SP de asistencia real (matriz alumno x sesion).
// Devolver 'P' | 'T' | 'F' | null por (enrollment_id, session_number).
function getAttendance(/* enrollmentId, sessionNumber */) {
  return null
}

// TODO: enchufar SP de participacion (notas 1-5 por sesion por alumno).
function getParticipation(/* enrollmentId, sessionNumber */) {
  return null
}

const ATTENDANCE_CELL = {
  P: { label: 'P', cls: 'att-p', title: 'Presente' },
  T: { label: 'T', cls: 'att-t', title: 'Tarde' },
  F: { label: 'F', cls: 'att-f', title: 'Falta' },
}
const attendanceCell = (v) => ATTENDANCE_CELL[v] || { label: '--', cls: 'att-empty', title: 'Sin registro' }

const TYPE_STATUS_BADGE = {
  we_enrollment_status_tracking: { label: 'SEG', cls: 'tb-seg' },
  we_enrollment_status_reprogrammed: { label: 'RP', cls: 'tb-rp' },
  we_enrollment_status_course_changed: { label: 'CC', cls: 'tb-cc' },
  we_enrollment_status_observed: { label: 'OBS', cls: 'tb-obs' },
}
const typeStatusBadge = (alias) => TYPE_STATUS_BADGE[alias]

function modalityLabel(s) {
  const a = s.modality_alias
  if (a === 'we_insc_modality_flexible') return 'FLEX'
  if (a === 'we_insc_modality_regular') return 'REGULAR'
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

function fmt20(n) {
  return Number.isFinite(n) ? n.toFixed(1) : '--'
}

function score20Class(n) {
  if (!Number.isFinite(n)) return 'sg-empty'
  if (n >= 19) return 'sg-good'
  if (n >= 17) return 'sg-ok'
  if (n >= 15) return 'sg-warn'
  return 'sg-bad'
}

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
          <div class="hk-value mono">{{ students.length || (isLoadingStudents ? '...' : 0) }}</div>
        </div>
        <div class="hk">
          <div class="hk-label">Asistencia</div>
          <div class="hk-value mono muted">--</div>
        </div>
        <div class="hk">
          <div class="hk-label">Prom. final</div>
          <div class="hk-value mono muted">--</div>
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
        <span v-if="t.id === 'asistencia'" class="tab-count">{{ students.length }}</span>
      </button>
    </nav>

    <!-- ============================================================ -->
    <!-- ASISTENCIA                                                   -->
    <!-- ============================================================ -->
    <section v-if="activeTab === 'asistencia'" class="tab-body">
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
          <span class="lg"><span class="att-cell att-p">P</span> Presente</span>
          <span class="lg"><span class="att-cell att-t">T</span> Tarde</span>
          <span class="lg"><span class="att-cell att-f">F</span> Falta</span>
        </div>
        <div class="spacer"></div>
        <button class="btn" disabled>
          <i class="fa-regular fa-paper-plane"></i> Mensaje
        </button>
        <button class="btn" disabled>
          <i class="fa-solid fa-download"></i> Exportar
        </button>
        <button class="btn primary" disabled>
          <i class="fa-solid fa-check"></i> Tomar asistencia
        </button>
      </div>

      <div v-if="isLoadingStudents && !students.length" class="state-msg">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando alumnos...
      </div>
      <div v-else-if="!students.length" class="state-msg muted">
        <i class="fa-regular fa-folder-open"></i> Sin alumnos matriculados en esta aula.
      </div>
      <div v-else class="att-matrix-scroll">
        <table class="att-matrix">
          <thead>
            <tr class="th-groups">
              <th class="sticky-c0" rowspan="2">N&deg;</th>
              <th class="sticky-c1" rowspan="2">Nombre y apellidos</th>
              <th class="sticky-c2" rowspan="2">DNI</th>
              <th rowspan="2">Contacto</th>
              <th rowspan="2">Modalidad</th>
              <th rowspan="2">Estado</th>
              <th class="th-group-att" :colspan="sessionsTotal || 1">Asistencia</th>
              <th class="th-group-part" :colspan="sessionsTotal || 1">Participacion</th>
              <th rowspan="2" class="th-summary">% Asist.</th>
            </tr>
            <tr>
              <th v-for="n in sessionNumbers" :key="'a' + n" class="th-session att">S{{ n }}</th>
              <th v-for="n in sessionNumbers" :key="'p' + n" class="th-session part">S{{ n }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in filteredStudents" :key="s.enrollment_id">
              <td class="sticky-c0 mono small">{{ String(idx + 1).padStart(2, '0') }}</td>
              <td class="sticky-c1">
                <div class="student-name-cell">
                  <span class="av-sm">{{ initialsOf(s.full_name) }}</span>
                  <div>
                    <div class="sn-name">{{ s.full_name }}</div>
                    <div class="sn-handle">{{ handleOfName(s.full_name) }}</div>
                  </div>
                </div>
              </td>
              <td class="sticky-c2 mono">{{ s.dni || '--' }}</td>
              <td>
                <div class="contact-cell">
                  <div class="mono">{{ s.phone || '--' }}</div>
                  <div class="muted small text-truncate" :title="s.email">{{ s.email || '--' }}</div>
                </div>
              </td>
              <td>
                <span v-if="modalityLabel(s) !== '--'" class="mod-pill" :class="modalityLabel(s).toLowerCase()">
                  {{ modalityLabel(s) }}
                </span>
                <span v-else class="muted">--</span>
              </td>
              <td>
                <span v-if="typeStatusBadge(s.type_status_alias)"
                      class="type-badge"
                      :class="typeStatusBadge(s.type_status_alias).cls">
                  {{ typeStatusBadge(s.type_status_alias).label }}
                </span>
                <span v-else class="muted small">--</span>
              </td>
              <td v-for="n in sessionNumbers" :key="'a' + n" class="td-att">
                <span
                  class="att-cell"
                  :class="attendanceCell(getAttendance(s.enrollment_id, n)).cls"
                  :title="attendanceCell(getAttendance(s.enrollment_id, n)).title"
                >{{ attendanceCell(getAttendance(s.enrollment_id, n)).label }}</span>
              </td>
              <td v-for="n in sessionNumbers" :key="'p' + n" class="td-part">
                <span class="part-cell">{{ getParticipation(s.enrollment_id, n) ?? '--' }}</span>
              </td>
              <td class="td-summary mono muted">--</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="footer-note">
        <i class="fa-solid fa-circle-info"></i>
        Asistencia y participacion mostraran datos cuando se habilite el registro por sesion.
        Los filtros "En curso", "En riesgo" y "Bajo rend." se activaran al disponer de esas metricas.
      </p>
    </section>

    <!-- ============================================================ -->
    <!-- AUDITORIA (rubrica)                                         -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'auditoria'" class="tab-body">
      <div v-if="!sessionsTotal" class="state-msg muted">
        <i class="fa-regular fa-folder-open"></i> El aula no tiene sesiones definidas.
      </div>
      <template v-else>
        <div class="session-strip">
          <div class="session-strip-label">Sesion</div>
          <div class="session-chips">
            <button
              v-for="n in sessionNumbers"
              :key="n"
              class="schip"
              :class="{ active: selectedSession === n }"
              @click="selectSession(n)"
            >
              <span class="sdot" :class="sessionDotCls(n)"></span>
              S{{ n }}
            </button>
          </div>
        </div>

        <div class="rubric-head">
          <div>
            <div class="rh-eyebrow">Rubrica de evaluacion al docente</div>
            <h2 class="rh-title">Sesion {{ selectedSession }}</h2>
            <div class="rh-meta">
              <span>Criterios marcados: <strong class="mono">{{ totalScore }} / {{ RUBRIC_TOTAL_ITEMS }}</strong></span>
              <span class="dot-sep">&middot;</span>
              <span class="mono">{{ totalProgress }}%</span>
              <span v-if="lastSavedAt" class="dot-sep">&middot;</span>
              <span v-if="lastSavedAt" class="muted small">Guardado {{ formatDate(lastSavedAt) }}</span>
            </div>
          </div>
          <div class="rh-actions">
            <button
              class="btn ai-btn"
              :title="currentAiReport ? 'El analisis ya esta guardado en BD; se muestra la version persistida' : 'Generar analisis con IA (consume creditos)'"
              @click="onAnalyzeClick"
            >
              <i class="fa-solid" :class="currentAiReport ? 'fa-database' : 'fa-wand-magic-sparkles'"></i>
              {{ currentAiReport ? 'Ver analisis guardado' : 'Analizar con IA' }}
            </button>
            <button class="btn primary" :disabled="isSavingSession" @click="saveSession">
              <i v-if="isSavingSession" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-save"></i>
              Guardar sesion
            </button>
          </div>
        </div>

        <section v-if="currentAiReport" class="ai-panel">
          <header class="ai-panel-head">
            <div>
              <span class="ai-eyebrow"><i class="fa-solid fa-sparkles"></i> Analisis IA</span>
              <span v-if="currentAiGeneratedAt" class="ai-when muted small">
                · Generado {{ formatDateTime(currentAiGeneratedAt) }}
              </span>
            </div>
            <div class="ai-summary">
              <div class="ai-summary-item">
                <span class="muted">Nota global</span>
                <strong class="mono">{{ toScore20(currentAiReport.metricas_rapidas?.puntuacion_global) }} / 20</strong>
              </div>
              <div class="ai-summary-item">
                <span class="muted">Practica / Teoria</span>
                <strong class="mono">
                  {{ currentAiReport.metricas_rapidas?.porcentaje_practica ?? '--' }}% /
                  {{ currentAiReport.metricas_rapidas?.porcentaje_teoria ?? '--' }}%
                </strong>
              </div>
              <div class="ai-summary-item">
                <span class="muted">Temas</span>
                <strong class="mono">
                  {{ currentAiReport.metricas_rapidas?.temas_cubiertos ?? '--' }} /
                  {{ currentAiReport.metricas_rapidas?.temas_totales ?? '--' }}
                </strong>
              </div>
            </div>
          </header>

          <div class="ai-crits">
            <div v-for="c in currentAiReport.criterios" :key="c.id" class="ai-crit">
              <div class="ai-crit-head">
                <span class="ai-crit-id mono">#{{ c.id }}</span>
                <span class="ai-crit-name">{{ c.nombre }}</span>
                <span class="ai-score" :class="aiScoreClass(c.score)">{{ c.score }}/5</span>
              </div>
              <p class="ai-crit-comment">{{ c.comentario }}</p>
              <div v-if="c.evidencia_timestamps?.length" class="ai-stamps">
                <span v-for="t in c.evidencia_timestamps" :key="t" class="ai-stamp mono">{{ t }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentAiReport.fortalezas_top3?.length || currentAiReport.oportunidades_top5?.length" class="ai-insights">
            <div v-if="currentAiReport.fortalezas_top3?.length" class="ai-insight-block">
              <h4><i class="fa-solid fa-thumbs-up"></i> Fortalezas</h4>
              <ul>
                <li v-for="(f, i) in currentAiReport.fortalezas_top3" :key="i">
                  <strong>{{ f.titulo }}</strong>
                  <span class="muted small">{{ f.detalle }}</span>
                </li>
              </ul>
            </div>
            <div v-if="currentAiReport.oportunidades_top5?.length" class="ai-insight-block">
              <h4><i class="fa-solid fa-bullseye"></i> Oportunidades</h4>
              <ul>
                <li v-for="(o, i) in currentAiReport.oportunidades_top5" :key="i">
                  <strong>{{ o.titulo }}</strong>
                  <span class="muted small">{{ o.detalle }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div class="rubric-grid">
          <section
            v-for="cat in RUBRIC"
            :key="cat.key"
            class="rubric-cat"
          >
            <header class="rc-head">
              <h3>{{ cat.label }}</h3>
              <span class="rc-total mono">{{ categoryScore(cat) }} / {{ cat.items.length }}</span>
            </header>
            <ul class="rc-items">
              <li v-for="it in cat.items" :key="it.key" class="rc-item">
                <label class="rc-check">
                  <input type="checkbox" v-model="sessionDraft[it.key]" />
                  <span class="rc-box"><i class="fa-solid fa-check"></i></span>
                  <span class="rc-text">{{ it.label }}</span>
                </label>
              </li>
            </ul>
          </section>
        </div>
      </template>
    </section>

    <!-- ============================================================ -->
    <!-- GENERAL: consolidado IA + rubrica manual                     -->
    <!-- ============================================================ -->
    <section v-else-if="activeTab === 'general'" class="tab-body">
      <div v-if="!sessionsTotal" class="state-msg muted">
        <i class="fa-regular fa-folder-open"></i> El aula no tiene sesiones definidas.
      </div>
      <template v-else>
        <div class="gen-summary">
          <div class="gen-summary-card">
            <span class="gen-label">Promedio IA</span>
            <strong class="mono" :class="score20Class(generalAulaAverages.ai20)">
              {{ fmt20(generalAulaAverages.ai20) }} / 20
            </strong>
            <span class="muted small">
              {{ generalAulaAverages.aiSessions }} / {{ sessionsTotal }} sesiones analizadas
            </span>
          </div>
          <div class="gen-summary-card">
            <span class="gen-label">Promedio Rubrica Manual</span>
            <strong class="mono" :class="score20Class(generalAulaAverages.manual20)">
              {{ fmt20(generalAulaAverages.manual20) }} / 20
            </strong>
            <span class="muted small">
              {{ generalAulaAverages.manualSessions }} / {{ sessionsTotal }} sesiones evaluadas
            </span>
          </div>
          <div class="gen-summary-card gen-summary-card-main">
            <span class="gen-label">Nota Consolidada del Aula</span>
            <strong class="mono" :class="score20Class(generalAulaAverages.consolidated20)">
              {{ fmt20(generalAulaAverages.consolidated20) }} / 20
            </strong>
            <span class="muted small">
              {{ score20Label(generalAulaAverages.consolidated20) }}
            </span>
          </div>
        </div>

        <div class="gen-trend-card">
          <div class="gen-trend-head">
            <div>
              <span class="gen-label">Evolucion del aula</span>
              <p class="gen-trend-hint muted small">
                Linea solida: nota consolidada. Punteadas: IA y rubrica manual.
                Los huecos indican sesiones aun no evaluadas.
              </p>
            </div>
          </div>
          <apexchart
            type="line"
            height="320"
            :options="generalChartOptions"
            :series="generalChartSeries"
          />

          <div class="gen-coverage">
            <span class="gen-label">Cobertura del aula</span>
            <div class="gen-coverage-row">
              <div class="gen-coverage-item">
                <div class="gcv-head">
                  <span class="gcv-name">
                    <span class="gcv-dot gcv-dot-ai"></span> Analisis IA
                  </span>
                  <span class="gcv-count mono">
                    {{ generalCoverage.ai }} / {{ generalCoverage.total }}
                    <span class="muted small">&middot; {{ generalCoverage.aiPct }}%</span>
                  </span>
                </div>
                <div class="gcv-bar">
                  <span
                    class="gcv-fill gcv-fill-ai"
                    :style="{ width: generalCoverage.aiPct + '%' }"
                  ></span>
                </div>
              </div>
              <div class="gen-coverage-item">
                <div class="gcv-head">
                  <span class="gcv-name">
                    <span class="gcv-dot gcv-dot-manual"></span> Evaluacion manual
                  </span>
                  <span class="gcv-count mono">
                    {{ generalCoverage.manual }} / {{ generalCoverage.total }}
                    <span class="muted small">&middot; {{ generalCoverage.manualPct }}%</span>
                  </span>
                </div>
                <div class="gcv-bar">
                  <span
                    class="gcv-fill gcv-fill-manual"
                    :style="{ width: generalCoverage.manualPct + '%' }"
                  ></span>
                </div>
              </div>
            </div>
            <p v-if="!generalCoverage.full" class="gen-coverage-warn">
              <i class="fa-solid fa-triangle-exclamation"></i>
              Muestra incompleta. El veredicto del aula puede cambiar conforme
              se evaluen mas sesiones.
            </p>
          </div>
        </div>

        <div class="gen-table-wrap">
          <table class="gen-table">
            <thead>
              <tr>
                <th class="th-session">Sesion</th>
                <th>Rubrica manual</th>
                <th>Nota IA</th>
                <th>Nota manual</th>
                <th>Consolidada</th>
                <th>Veredicto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in generalRows" :key="r.n">
                <td class="td-session mono">S{{ r.n }}</td>
                <td>
                  <span class="mono">{{ r.manualMarked }} / {{ r.manualTotal }}</span>
                  <span class="muted small"> &middot; {{ r.manualPct }}%</span>
                </td>
                <td>
                  <span v-if="r.hasAi" class="mono" :class="score20Class(r.aiScore20)">
                    {{ fmt20(r.aiScore20) }} / 20
                  </span>
                  <span v-else class="muted small">sin analisis</span>
                </td>
                <td>
                  <span v-if="r.hasManual" class="mono" :class="score20Class(r.manualScore20)">
                    {{ fmt20(r.manualScore20) }} / 20
                  </span>
                  <span v-else class="muted small">sin evaluar</span>
                </td>
                <td>
                  <strong class="mono" :class="score20Class(r.consolidated20)">
                    {{ fmt20(r.consolidated20) }} / 20
                  </strong>
                </td>
                <td>
                  <span class="gen-verdict" :class="score20Class(r.consolidated20)">
                    {{ score20Label(r.consolidated20) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="footer-note">
          <i class="fa-solid fa-circle-info"></i>
          La nota consolidada combina IA y rubrica manual con pesos
          {{ Math.round(CONSOLIDATED_WEIGHT_IA * 100) }}% / {{ Math.round(CONSOLIDATED_WEIGHT_MANUAL * 100) }}%.
          Si solo hay una fuente disponible, se usa esa.
        </p>
      </template>
    </section>

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
              {{ isRunningAi ? 'Analizando... (30-60s)' : 'Ejecutar analisis' }}
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

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
.btn.primary { background: var(--ink); color: white; border-color: var(--ink); }
.btn.primary:hover:not(:disabled) { background: #2A2A22; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

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

.student-name-cell { display: flex; align-items: center; gap: 8px; }
.av-sm {
  width: 26px; height: 26px; border-radius: 999px;
  background: var(--slate-soft); color: var(--slate-ink);
  display: grid; place-items: center; font-size: 10px; font-weight: 700;
  flex-shrink: 0;
}
.sn-name { font-weight: 500; font-size: 12.5px; }
.sn-handle { font-size: 10.5px; color: var(--ink-3); }

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
.tb-rp  { background: #FCE4EC; color: #BE185D; }
.tb-cc  { background: var(--blue-soft); color: var(--blue-ink); }
.tb-obs { background: var(--slate-soft); color: var(--slate-ink); }

.td-att { padding: 3px 4px !important; text-align: center; }
.td-part { padding: 3px 4px !important; text-align: center; }
.att-cell {
  display: inline-grid; place-items: center;
  width: 24px; height: 22px; border-radius: 5px;
  font-size: 10.5px; font-weight: 700;
  font-family: var(--font-mono);
}
.att-p { background: var(--green); color: white; }
.att-t { background: #F59E0B; color: white; }
.att-f { background: #EF4444; color: white; }
.att-empty { background: var(--bg-soft); color: var(--ink-4); }
.part-cell {
  display: inline-grid; place-items: center;
  width: 24px; height: 22px; border-radius: 5px;
  font-size: 11px; font-weight: 600;
  background: var(--amber-soft); color: var(--amber-ink);
  font-family: var(--font-mono);
}

.td-summary { text-align: center; }

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
.schip.active { background: var(--ink); color: white; border-color: var(--ink); }
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
[data-coreui-theme="dark"] .aula-detail .att-matrix thead th,
[data-coreui-theme="dark"] .aula-detail .att-matrix .sticky-c0,
[data-coreui-theme="dark"] .aula-detail .att-matrix .sticky-c1,
[data-coreui-theme="dark"] .aula-detail .att-matrix .sticky-c2 { background: #1A1A14; }
[data-coreui-theme="dark"] .aula-detail .att-matrix thead .sticky-c0,
[data-coreui-theme="dark"] .aula-detail .att-matrix thead .sticky-c1,
[data-coreui-theme="dark"] .aula-detail .att-matrix thead .sticky-c2 { background: #1F1F1A; }
[data-coreui-theme="dark"] .aula-detail .rc-box { background: #1A1A14; border-color: #3A3A33; }
[data-coreui-theme="dark"] .aula-detail .ai-panel {
  background: linear-gradient(180deg, #1A1A24 0%, #1A1A14 60%);
  border-color: #3A3A55;
}
[data-coreui-theme="dark"] .aula-detail .ai-panel-head { border-color: #3A3A55; }
[data-coreui-theme="dark"] .aula-detail .ai-crit,
[data-coreui-theme="dark"] .aula-detail .ai-insight-block { background: #1A1A14; border-color: #2A2A22; }

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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
.aam-foot .btn.primary { background: #14140F; color: white; border-color: #14140F; }
.aam-foot .btn.primary:hover:not(:disabled) { background: #2A2A22; }
.aam-foot .btn:disabled { opacity: 0.55; cursor: not-allowed; }

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
[data-coreui-theme="dark"] .aula-ai-modal .aam-foot .btn.primary { background: #F4F4F0; color: #14140F; border-color: #F4F4F0; }
</style>
