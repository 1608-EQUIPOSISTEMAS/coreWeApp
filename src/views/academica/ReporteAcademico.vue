<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import DateRangePicker from '@/components/DateRangePicker.vue'

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const router = useRouter()

// =====================================================================
// PERIODO DEL REPORTE
// =====================================================================
// Default: ultimos 30 dias incluyendo hoy. Las fechas viajan como
// 'YYYY-MM-DD' (calendar dates, sin TZ) por la regla de
// memory/timezone-production.md.
function ymdLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function addDaysYmd(s, n) {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return ymdLocal(dt)
}
const todayStr = ymdLocal(new Date())
const period = ref({
  start: addDaysYmd(todayStr, -29),
  end: todayStr,
  compare: null,
})

// Aula esta "activa en el periodo" si sus fechas se superponen con el rango.
// Manejo de bordes:
//  - start_date NULL  -> consideramos que arranca lo antes posible (siempre <= periodEnd)
//  - end_date NULL    -> consideramos que sigue vigente (siempre >= periodStart)
function overlapsPeriod(aulaStart, aulaEnd, periodStart, periodEnd) {
  const aStart = aulaStart || '0000-01-01'
  const aEnd   = aulaEnd   || '9999-12-31'
  return aStart <= periodEnd && aEnd >= periodStart
}

// =====================================================================
// FORMULAS DE EVALUACION
// =====================================================================
// Mismas constantes que AulaDetail.vue. Si la rubrica cambia, ambos
// archivos deben moverse en sincronia con el SP del backend.
const RUBRIC_TOTAL_ITEMS = 20
const CONSOLIDATED_WEIGHT_IA = 0.7
const CONSOLIDATED_WEIGHT_MANUAL = 0.3
// Meta institucional = umbral de BUENO en la rubrica (>= 17 sobre 20).
const META_20 = 17
// Una brecha IA vs manual mayor a este umbral marca el aula como divergente.
const GAP_THRESHOLD = 5

function consolidatedScore(noteIa20, noteManual20) {
  const ia = Number.isFinite(noteIa20) ? noteIa20 : null
  const man = Number.isFinite(noteManual20) ? noteManual20 : null
  if (ia == null && man == null) return null
  if (ia == null) return man
  if (man == null) return ia
  return ia * CONSOLIDATED_WEIGHT_IA + man * CONSOLIDATED_WEIGHT_MANUAL
}

function score20Class(n) {
  if (!Number.isFinite(n)) return 'sg-empty'
  if (n >= 19) return 'sg-good'
  if (n >= 17) return 'sg-ok'
  if (n >= 15) return 'sg-warn'
  return 'sg-bad'
}

function score20Label(n) {
  if (!Number.isFinite(n)) return 'SIN EVALUAR'
  if (n >= 19) return 'EXCELENTE'
  if (n >= 17) return 'BUENO'
  if (n >= 15) return 'EN PROCESO'
  return 'DEFICIENTE'
}

function fmt20(n) {
  return Number.isFinite(n) ? n.toFixed(1) : '--'
}

// =====================================================================
// CARGA DE DATOS
// =====================================================================
const aulas = ref([])
const isLoading = ref(false)

function initials(name) {
  if (!name) return '--'
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]).join('').toUpperCase()
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

function formatRelative(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  const diffMs = Date.now() - d.getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`
  return `hace ${Math.floor(days / 30)}m`
}

async function loadReport() {
  isLoading.value = true
  try {
    // Una sola llamada ligera: el backend une ediciones curso + resumen de
    // auditoria en la misma consulta (antes: editionList de ~3MB/15s + un
    // segundo request; ahora ~300KB/1s). Sin filtro de active para poder
    // seleccionar periodos historicos sin volver al backend.
    const rows = await editionService.academicReport()

    // Excluimos A5 (cancelados) igual que en Aulas.vue para mantener consistencia.
    aulas.value = (Array.isArray(rows) ? rows : [])
      .filter((row) => String(row?.cat_segment || '').toUpperCase() !== 'A5')
      .map((row) => {
        const aiAvg20 = Number(row.ai_avg_20)
        const manualAvg20 = Number(row.manual_avg_20)
        const ai = Number.isFinite(aiAvg20) ? aiAvg20 : null
        const man = Number.isFinite(manualAvg20) ? manualAvg20 : null
        const consolidated = consolidatedScore(ai, man)
        return {
          id: row.edition_num_id,
          code: row.global_code || row.version_code || '--',
          name: row.program_abreviature || 'Sin nombre',
          edition: row.specific_code || '',
          teacher: row.instructor || '--',
          teacherInitials: initials(row.instructor),
          modality: row.cat_model_modality_label || '--',
          segment: row.cat_segment || '',
          sessionsTotal: Number(row.program_sessions) || 0,
          status: deriveStatus(row),
          startDate: row.start_date ? String(row.start_date).slice(0, 10) : null,
          endDate: row.end_date ? String(row.end_date).slice(0, 10) : null,
          sessionsAi: Number(row.sessions_ai) || 0,
          sessionsManual: Number(row.sessions_manual) || 0,
          aiAvg20: ai,
          manualAvg20: man,
          consolidated20: consolidated,
          verdict: score20Label(consolidated),
          verdictClass: score20Class(consolidated),
          lastActivityAt: row.last_activity_at || null,
          lastActivityRel: formatRelative(row.last_activity_at),
          hasAudit: (Number(row.sessions_ai) || 0) + (Number(row.sessions_manual) || 0) > 0,
        }
      })
  } catch (err) {
    console.error('Error cargando reporte academico:', err)
    toast.error('Error al cargar el reporte')
    aulas.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadReport)

// =====================================================================
// FILTROS
// =====================================================================
const filterStatus = ref('Todos')
const filterDocente = ref('')
const query = ref('')
// Foco activo: senal accionable seleccionada desde la banda superior.
// Compone con el resto de filtros (no los reemplaza).
const activeFoco = ref(null)

const filterStates = ['Todos', 'Activo', 'Proximo', 'Finalizado']

// Docentes presentes en el periodo, ordenados alfabeticamente. Se derivan del
// universo del periodo (no del catalogo completo de instructores) para no
// ofrecer docentes que no dictan ninguna aula en la ventana seleccionada.
const docenteOptions = computed(() => {
  const seen = new Set()
  for (const a of periodAulas.value) {
    if (a.teacher && a.teacher !== '--') seen.add(a.teacher)
  }
  return [...seen].sort((x, y) => x.localeCompare(y, 'es'))
})

// La tabla parte del universo del periodo, no de aulas.value. El periodo
// es la fuente de verdad — los chips de estado/veredicto/busqueda son
// refinamientos secundarios sobre ese universo.
const filtered = computed(() => {
  return periodAulas.value
    .filter((a) => filterStatus.value === 'Todos' || a.status === filterStatus.value)
    .filter((a) => !filterDocente.value || a.teacher === filterDocente.value)
    .filter((a) => !activeFoco.value || focoPredicates[activeFoco.value](a))
    .filter((a) => {
      if (!query.value) return true
      const q = query.value.toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.teacher.toLowerCase().includes(q)
      )
    })
})

// Ordenamiento: criticos primero — el objetivo del reporte es accionar sobre
// aulas en riesgo, no celebrar las que ya estan bien.
const sorted = computed(() => {
  const verdictPriority = {
    DEFICIENTE: 0, 'EN PROCESO': 1, 'SIN EVALUAR': 2, BUENO: 3, EXCELENTE: 4,
  }
  return [...filtered.value].sort((a, b) => {
    const pa = verdictPriority[a.verdict] ?? 99
    const pb = verdictPriority[b.verdict] ?? 99
    if (pa !== pb) return pa - pb
    const sa = Number.isFinite(a.consolidated20) ? a.consolidated20 : 99
    const sb = Number.isFinite(b.consolidated20) ? b.consolidated20 : 99
    return sa - sb
  })
})

const countByStatus = (s) =>
  s === 'Todos'
    ? periodAulas.value.length
    : periodAulas.value.filter((a) => a.status === s).length

// =====================================================================
// UNIVERSO DEL PERIODO
// =====================================================================
// Aulas que se superponen con el periodo elegido. Este es el universo
// para todos los KPIs, distribucion y cobertura — la idea es responder
// "como estuvo la calidad academica durante esta ventana de tiempo".
const periodAulas = computed(() =>
  aulas.value.filter((a) =>
    overlapsPeriod(a.startDate, a.endDate, period.value.start, period.value.end),
  ),
)

// Si el docente seleccionado deja de existir en el periodo (cambio de rango),
// limpiamos el filtro para evitar un estado fantasma que oculta toda la tabla.
watch(docenteOptions, (opts) => {
  if (filterDocente.value && !opts.includes(filterDocente.value)) {
    filterDocente.value = ''
  }
})

const compareAulas = computed(() => {
  const c = period.value.compare
  if (!c || !c.start || !c.end) return null
  return aulas.value.filter((a) => overlapsPeriod(a.startDate, a.endDate, c.start, c.end))
})

function buildKpis(list) {
  if (!list) return null
  const total = list.length
  const evaluated = list.filter((a) => a.hasAudit).length
  const atRisk = list.filter((a) =>
    a.verdict === 'DEFICIENTE' || a.verdict === 'EN PROCESO').length
  const good = list.filter((a) =>
    a.verdict === 'BUENO' || a.verdict === 'EXCELENTE').length
  const validScores = list.map((a) => a.consolidated20).filter((n) => Number.isFinite(n))
  const avg = validScores.length
    ? validScores.reduce((a, b) => a + b, 0) / validScores.length
    : null
  return {
    total, evaluated, atRisk, good,
    avg20: avg,
    evaluatedPct: total ? Math.round((evaluated / total) * 100) : 0,
  }
}

const kpis = computed(() => {
  const base = buildKpis(periodAulas.value) || {}
  return {
    ...base,
    avgClass: score20Class(base.avg20),
    avgLabel: score20Label(base.avg20),
  }
})

const compareKpis = computed(() => buildKpis(compareAulas.value))

// Delta numerico crudo + clase semantica. La "direccion buena" depende del
// metric: para riesgo, bajar es bueno; para todo lo demas, subir es bueno.
function delta(curr, prev, betterWhen = 'up') {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null
  const diff = curr - prev
  if (diff === 0) return { value: 0, class: 'd-flat', dir: '' }
  const isUp = diff > 0
  const isGood = betterWhen === 'up' ? isUp : !isUp
  return {
    value: diff,
    class: isGood ? 'd-good' : 'd-bad',
    dir: isUp ? 'up' : 'down',
  }
}

const kpiDeltas = computed(() => {
  const c = compareKpis.value
  if (!c) return null
  const k = kpis.value
  return {
    evaluated: delta(k.evaluated, c.evaluated, 'up'),
    avg20:     delta(k.avg20,     c.avg20,     'up'),
    atRisk:    delta(k.atRisk,    c.atRisk,    'down'),
    good:      delta(k.good,      c.good,      'up'),
  }
})

// Distribucion para el donut. Las aulas SIN EVALUAR se cuentan aparte
// — meterlas en DEFICIENTE seria injusto (no es lo mismo "mal evaluada" que
// "no medida todavia").
const verdictDistribution = computed(() => {
  const list = periodAulas.value
  const counts = {
    EXCELENTE: 0, BUENO: 0, 'EN PROCESO': 0, DEFICIENTE: 0, 'SIN EVALUAR': 0,
  }
  for (const a of list) {
    counts[a.verdict] = (counts[a.verdict] || 0) + 1
  }
  return counts
})

// Donut SVG (mismo patron del diseño "Reporte de Trafico": circulos con
// pathLength=100, dash = pct del segmento, offset acumulado negativo).
const DONUT_META = [
  ['EXCELENTE', 'Excelente', 'var(--green)'],
  ['BUENO', 'Bueno', 'var(--blue)'],
  ['EN PROCESO', 'En proceso', 'var(--amber)'],
  ['DEFICIENTE', 'Deficiente', 'var(--red-deep)'],
  ['SIN EVALUAR', 'Sin evaluar', 'var(--donut-empty)'],
]

const donutView = computed(() => {
  const counts = verdictDistribution.value
  const total = periodAulas.value.length
  let acc = 0
  const segments = []
  const legend = []
  for (const [key, name, color] of DONUT_META) {
    const count = counts[key] || 0
    const pct = total ? (count / total) * 100 : 0
    legend.push({ key, name, color, count, pct: Math.round(pct) })
    if (count > 0) {
      segments.push({
        key, name, color, count, pct: Math.round(pct),
        dash: `${pct.toFixed(3)} ${(100 - pct).toFixed(3)}`,
        offset: (-acc).toFixed(3),
      })
      acc += pct
    }
  }
  return { total, segments, legend }
})

const globalCoverage = computed(() => {
  const list = periodAulas.value
  let totalSessions = 0
  let aiSessions = 0
  let manualSessions = 0
  for (const a of list) {
    totalSessions += a.sessionsTotal || 0
    aiSessions += a.sessionsAi || 0
    manualSessions += a.sessionsManual || 0
  }
  return {
    aulas: list.length,
    totalSessions,
    aiSessions,
    manualSessions,
    aiPct: totalSessions ? Math.round((aiSessions / totalSessions) * 100) : 0,
    manualPct: totalSessions ? Math.round((manualSessions / totalSessions) * 100) : 0,
  }
})

// Tooltip del donut: sigue al mouse dentro del contenedor .donut. Se limpia
// al salir del grafico; mientras esta activo, los demas segmentos se atenuan.
const donutTip = ref(null)

function moveDonutTip(e, seg) {
  const box = e.currentTarget.closest('.donut').getBoundingClientRect()
  donutTip.value = {
    key: seg.key, name: seg.name, count: seg.count, pct: seg.pct, color: seg.color,
    x: e.clientX - box.left + 14,
    y: e.clientY - box.top - 12,
  }
}

// Cobertura combinada IA + manual sobre el doble de sesiones dictadas
// (cada sesion deberia tener ambas evaluaciones).
const coveragePct = computed(() => {
  const c = globalCoverage.value
  const denom = c.totalSessions * 2
  return denom ? Math.round(((c.aiSessions + c.manualSessions) / denom) * 100) : 0
})

// =====================================================================
// EL HALLAZGO — brecha IA vs manual sobre el universo del periodo
// =====================================================================
const scoreAverages = computed(() => {
  const list = periodAulas.value
  const avg = (arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null)
  const ias = list.map((a) => a.aiAvg20).filter(Number.isFinite)
  const mans = list.map((a) => a.manualAvg20).filter(Number.isFinite)
  const both = list.filter(
    (a) => Number.isFinite(a.aiAvg20) && Number.isFinite(a.manualAvg20),
  )
  const bigGap = both.filter(
    (a) => Math.abs(a.manualAvg20 - a.aiAvg20) > GAP_THRESHOLD,
  ).length
  const ia = avg(ias)
  const man = avg(mans)
  return {
    ia, manual: man,
    gap: ia != null && man != null ? Math.abs(man - ia) : null,
    both: both.length,
    bigGap,
  }
})

// Posicion horizontal (%) de un marcador en la escala 0-20.
function scalePos(n) {
  return Math.min(97, Math.max(3, (n / RUBRIC_TOTAL_ITEMS) * 100))
}

function gapOf(a) {
  if (!Number.isFinite(a.aiAvg20) || !Number.isFinite(a.manualAvg20)) return null
  return Math.abs(a.manualAvg20 - a.aiAvg20)
}

// =====================================================================
// RESUMEN EJECUTIVO (banner)
// =====================================================================
// Nota 16/07: se retiró el semaforo "INSTITUCIÓN EN RIESGO/OBSERVACIÓN/META"
// — el auditor IA es reciente y la etiqueta alarmaba sin contexto. El banner
// hoy solo presenta el promedio y la meta como hechos.
const hero = computed(() => {
  const k = kpis.value
  if (!k.total || k.avg20 == null) return { empty: true }
  return { empty: false, avg: k.avg20, gapToMeta: META_20 - k.avg20 }
})

// =====================================================================
// FOCOS DE ATENCION  (senales accionables derivadas del cruce de datos)
// =====================================================================
// La idea: que el reporte responda "que tengo que mirar HOY" sin que el
// director tenga que escanear toda la tabla. Cada foco es un predicado sobre
// el universo del periodo; solo se muestran los que tienen >0 aulas.
function daysSince(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// Un aula activa que lleva mas de STALE_DAYS sin auditoria nueva esta
// "enfriandose": se dicta pero nadie la mide hace rato.
const STALE_DAYS = 14

const focoPredicates = {
  'activas-sin-evaluar': (a) => a.status === 'Activo' && !a.hasAudit,
  'deficientes-activas': (a) => a.status === 'Activo' && a.verdict === 'DEFICIENTE',
  'cobertura-incompleta': (a) =>
    a.status === 'Activo' && a.hasAudit && a.sessionsTotal > 0 &&
    (a.sessionsAi < a.sessionsTotal || a.sessionsManual < a.sessionsTotal),
  'sin-actividad': (a) => {
    if (a.status !== 'Activo' || !a.hasAudit) return false
    const d = daysSince(a.lastActivityAt)
    return d != null && d > STALE_DAYS
  },
}

const FOCO_META = {
  'activas-sin-evaluar': {
    label: 'Activas sin evaluar', icon: 'fa-eye-slash', tone: 'red',
    hint: 'En curso sin ningun control de calidad',
  },
  'deficientes-activas': {
    label: 'Deficientes en curso', icon: 'fa-triangle-exclamation', tone: 'red',
    hint: 'Nota deficiente y todavia dictandose',
  },
  'cobertura-incompleta': {
    label: 'Cobertura incompleta', icon: 'fa-gauge-simple-high', tone: 'amber',
    hint: 'Sesiones activas aun sin evaluar',
  },
  'sin-actividad': {
    label: `Frias +${STALE_DAYS}d`, icon: 'fa-clock', tone: 'amber',
    hint: 'Activas sin auditorias recientes',
  },
}

const focos = computed(() =>
  Object.keys(focoPredicates)
    .map((key) => ({
      key,
      ...FOCO_META[key],
      count: periodAulas.value.filter(focoPredicates[key]).length,
    }))
    .filter((f) => f.count > 0),
)

// Aulas unicas que disparan al menos un foco — alimenta el banner ejecutivo.
const actionCount = computed(() =>
  periodAulas.value.filter((a) =>
    Object.values(focoPredicates).some((p) => p(a)),
  ).length,
)

function toggleFoco(key) {
  activeFoco.value = activeFoco.value === key ? null : key
}

// Si el foco activo se queda sin aulas (cambio de periodo/filtros), lo soltamos
// para no dejar la tabla vacia con un estado invisible.
watch([focos, periodAulas], () => {
  if (activeFoco.value && !focos.value.some((f) => f.key === activeFoco.value)) {
    activeFoco.value = null
  }
})

// =====================================================================
// RANKING DE DOCENTES
// =====================================================================
// Agregacion por docente sobre el universo del periodo. Decision de modelado:
// usamos MEDIA SIMPLE de las notas consolidadas finitas (no ponderada por
// sesiones) — la pregunta es "como ensena este docente", no "cuantas sesiones
// acumulo". Un aula chica pesa igual que una grande.
const docenteSort = ref('risk') // 'risk' | 'avg' | 'aulas'
const docenteSortOptions = [
  { id: 'risk', label: 'En riesgo' },
  { id: 'avg', label: 'Promedio' },
  { id: 'aulas', label: 'N.º aulas' },
]

const docenteStats = computed(() => {
  const map = new Map()
  for (const a of periodAulas.value) {
    const name = a.teacher && a.teacher !== '--' ? a.teacher : 'Sin docente'
    let d = map.get(name)
    if (!d) {
      d = {
        teacher: name, initials: initials(name),
        total: 0, evaluated: 0, atRisk: 0, good: 0, scores: [],
      }
      map.set(name, d)
    }
    d.total += 1
    if (a.hasAudit) d.evaluated += 1
    if (a.verdict === 'DEFICIENTE' || a.verdict === 'EN PROCESO') d.atRisk += 1
    if (a.verdict === 'BUENO' || a.verdict === 'EXCELENTE') d.good += 1
    if (Number.isFinite(a.consolidated20)) d.scores.push(a.consolidated20)
  }

  const rows = [...map.values()].map((d) => {
    const avg = d.scores.length
      ? d.scores.reduce((x, y) => x + y, 0) / d.scores.length
      : null
    return {
      ...d,
      avg20: avg,
      avgClass: score20Class(avg),
      evaluatedPct: d.total ? Math.round((d.evaluated / d.total) * 100) : 0,
      riskPct: d.total ? Math.round((d.atRisk / d.total) * 100) : 0,
    }
  })

  const sorters = {
    risk: (a, b) =>
      b.atRisk - a.atRisk ||
      b.riskPct - a.riskPct ||
      (a.avg20 ?? 99) - (b.avg20 ?? 99),
    avg: (a, b) => (a.avg20 ?? 99) - (b.avg20 ?? 99),
    aulas: (a, b) => b.total - a.total || (a.avg20 ?? 99) - (b.avg20 ?? 99),
  }
  return rows.sort(sorters[docenteSort.value] || sorters.risk)
})

// Click en una fila del ranking => enfoca la tabla en ese docente (toggle).
function focusDocente(name) {
  filterDocente.value = filterDocente.value === name ? '' : name
}

// =====================================================================
// DECISIONES RECOMENDADAS
// =====================================================================
// Fuente primaria: la IA local del servidor (el mismo Ollama que redacta las
// observaciones de notas) genera SIEMPRE 3 recomendaciones a partir del
// snapshot de indicadores del periodo. Si la IA no responde, caemos a las
// cartas heuristicas de abajo (cobertura / acompanamiento).
const aiDecisions = ref(null)
const aiLoading = ref(false)
let aiLastKey = null
let aiTimer = null

function round1(n) {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null
}

function buildSnapshot() {
  const k = kpis.value
  const cov = globalCoverage.value
  const worst = docenteStats.value
    .filter((d) => Number.isFinite(d.avg20) && d.teacher !== 'Sin docente')
    .sort((a, b) => a.avg20 - b.avg20)
    .slice(0, 3)
    .map((d) => ({
      name: String(d.teacher).slice(0, 120),
      avg: round1(d.avg20),
      at_risk: d.atRisk,
      total: d.total,
    }))
  const critical = sorted.value
    .filter((a) => Number.isFinite(a.consolidated20))
    .slice(0, 5)
    .map((a) => ({
      code: String(a.code).slice(0, 30),
      name: String(a.name).slice(0, 120),
      score: round1(a.consolidated20),
      verdict: String(a.verdict).slice(0, 20),
    }))
  return {
    period_start: period.value.start,
    period_end: period.value.end,
    total: k.total ?? 0,
    evaluated: k.evaluated ?? 0,
    at_risk: k.atRisk ?? 0,
    avg_consolidated: round1(k.avg20),
    avg_ia: round1(scoreAverages.value.ia),
    avg_manual: round1(scoreAverages.value.manual),
    goal: META_20,
    coverage_pct: coveragePct.value,
    coverage_ia_pct: cov.aiPct,
    coverage_manual_pct: cov.manualPct,
    worst_teachers: worst,
    critical_aulas: critical,
  }
}

async function generateAiDecisions(force = false) {
  if (!periodAulas.value.length || kpis.value.avg20 == null) {
    aiDecisions.value = null
    aiLastKey = null
    return
  }
  if (aiLoading.value) return
  const snapshot = buildSnapshot()
  const key = JSON.stringify(snapshot)
  if (!force && key === aiLastKey) return
  // Marcamos el intento ANTES de llamar: si la IA no esta disponible, el
  // auto-flujo no vuelve a golpear el endpoint con el mismo snapshot (solo
  // el boton Regenerar fuerza otra corrida).
  aiLastKey = key
  aiLoading.value = true
  try {
    const res = await editionService.reportRecommendations({ snapshot })
    aiDecisions.value = res?.ok && Array.isArray(res.data) && res.data.length === 3
      ? res.data
      : null
  } catch (err) {
    // Sin IA (tunel caido, 502): el panel cae a las cartas heuristicas.
    console.warn('Recomendaciones IA no disponibles:', err?.message || err)
    aiDecisions.value = null
  } finally {
    aiLoading.value = false
  }
}

// Regenera cuando cambia el universo del periodo (carga inicial o cambio de
// rango). Debounce corto para no disparar el 7B en cada arrastre del picker.
watch([() => periodAulas.value.length, () => kpis.value.avg20], () => {
  clearTimeout(aiTimer)
  aiTimer = setTimeout(() => generateAiDecisions(), 800)
})

// Cartas a mostrar: IA primero; heuristicas como respaldo.
const AI_TONES = ['blue', 'amber', 'green']
const displayDecisions = computed(() => {
  if (aiDecisions.value) {
    return aiDecisions.value.map((d, i) => ({
      tag: d.etiqueta,
      tone: AI_TONES[i % AI_TONES.length],
      impact: 'Sugerencia IA',
      title: d.titulo,
      body: d.detalle,
      owner: d.responsable,
    }))
  }
  return decisions.value
})

// Cartas heuristicas de respaldo (sin IA). Solo aparece la carta cuya
// condicion se cumple.
// Nota 16/07: la carta "Recalibrar la rúbrica IA" se retiró a pedido del
// usuario — la rúbrica ya fue recalibrada y el auditor IA es reciente, no
// conviene mostrar una alerta roja sobre él por ahora.
const decisions = computed(() => {
  const out = []

  const cov = globalCoverage.value
  if (cov.totalSessions && coveragePct.value < 90) {
    out.push({
      tag: 'COBERTURA', tone: 'amber', impact: 'Impacto medio',
      title: 'Cerrar evidencia faltante',
      body: `La cobertura del periodo es ${coveragePct.value}% (IA ${cov.aiPct}% · manual ${cov.manualPct}%). Sin evidencia completa el consolidado no es confiable.`,
      owner: 'Coordinadores de área',
    })
  }

  const candidatos = docenteStats.value.filter(
    (d) => Number.isFinite(d.avg20) && d.evaluatedPct >= 50 && d.teacher !== 'Sin docente',
  )
  if (candidatos.length) {
    const worst = candidatos.reduce((w, d) => (d.avg20 < w.avg20 ? d : w))
    if (worst.avg20 < META_20) {
      out.push({
        tag: 'ACOMPAÑAMIENTO', tone: 'blue', impact: 'Esfuerzo bajo',
        title: `Plan para ${worst.teacher}`,
        body: `Promedio más bajo del periodo (${fmt20(worst.avg20)}) con el ${worst.evaluatedPct}% de sus aulas evaluadas — el dato es sólido. Agendar mentoría y revisar sus ${worst.atRisk} aula(s) en riesgo.`,
        owner: 'Jefatura Académica',
      })
    }
  }

  return out.slice(0, 3)
})

// =====================================================================
// PAGINACION DEL DETALLE
// =====================================================================
// OJO con el orden: watch(filtered) evalua `filtered` inmediatamente en el
// setup, y su cadena toca periodAulas y focoPredicates. Este bloque debe
// vivir DESPUES de esas declaraciones o revienta con TDZ (pagina en blanco).
const PAGE_SIZE = 12
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const paged = computed(() =>
  sorted.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)
// Cualquier cambio de filtros/periodo regenera `filtered`: volver a la pagina 1
// evita quedar parado en una pagina que ya no existe.
watch(filtered, () => { page.value = 1 })

const pagerPages = computed(() => {
  const t = totalPages.value
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const cur = page.value
  const marks = [...new Set([1, cur - 1, cur, cur + 1, t])]
    .filter((p) => p >= 1 && p <= t)
    .sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const p of marks) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
})

const pagerInfo = computed(() => {
  const n = sorted.value.length
  if (!n) return ''
  const from = (page.value - 1) * PAGE_SIZE + 1
  const to = Math.min(page.value * PAGE_SIZE, n)
  return `${from}–${to} de ${n} aulas`
})

// =====================================================================
// EXPORT CSV  (tabla filtrada — para llevar a reuniones)
// =====================================================================
function csvCell(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv() {
  const rows = sorted.value
  if (!rows.length) {
    toast.info('No hay aulas para exportar con los filtros actuales')
    return
  }
  const header = [
    'Codigo', 'Aula', 'Edicion', 'Docente', 'Estado',
    'Sesiones', 'Cobertura IA', 'Cobertura manual',
    'Nota IA', 'Nota manual', 'Consolidada', 'Veredicto', 'Ultima actividad',
  ]
  const lines = [header.join(',')]
  for (const a of rows) {
    lines.push([
      a.code, a.name, a.edition, a.teacher, a.status,
      a.sessionsTotal, `${a.sessionsAi}/${a.sessionsTotal}`, `${a.sessionsManual}/${a.sessionsTotal}`,
      fmt20(a.aiAvg20), fmt20(a.manualAvg20), fmt20(a.consolidated20), a.verdict,
      a.lastActivityAt || '',
    ].map(csvCell).join(','))
  }
  // BOM + CRLF para que Excel respete acentos y saltos de linea.
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-academico_${period.value.start}_${period.value.end}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`Exportadas ${rows.length} aulas`)
}

// =====================================================================
// NAVEGACION
// =====================================================================
function openAula(id) {
  if (!id) return
  router.push({
    name: 'AcademicaAulaDetail',
    params: { id },
    query: { tab: 'general' },
  })
}
</script>

<template>
  <div class="rpt">
    <!-- ============ HEADER ============ -->
    <div class="rpt-head">
      <div class="rpt-titles">
        <div class="eyebrow">ACADÉMICA · REPORTE EJECUTIVO</div>
        <h1>Estado académico del periodo</h1>
      </div>
      <div class="rpt-actions">
        <DateRangePicker v-model="period" />
        <button
          class="btn-navy"
          :disabled="isLoading || !sorted.length"
          title="Exportar la tabla filtrada a CSV"
          @click="exportCsv"
        >
          <i class="fa-solid fa-file-arrow-down"></i> Exportar
        </button>
      </div>
    </div>

    <!-- ============ ACTO 1 — RESUMEN EJECUTIVO ============ -->
    <div class="hero">
      <template v-if="!hero.empty">
        <div class="hero-main">
          <div class="hero-badge hb-neutral">
            <i class="fa-solid fa-circle"></i> RESUMEN DEL PERIODO
          </div>
          <div class="hero-headline">
            El promedio consolidado del periodo es <span class="hl">{{ fmt20(hero.avg) }}</span> sobre 20,
            con la meta institucional en {{ META_20.toFixed(1) }}.
          </div>
          <div class="hero-detail">
            La rúbrica manual promedia <b>{{ fmt20(scoreAverages.manual) }}</b> y la evaluación IA
            <b>{{ fmt20(scoreAverages.ia) }}</b>. {{ kpis.evaluated }} de {{ kpis.total }} aulas
            cuentan con evaluación en la ventana seleccionada.
          </div>
        </div>
        <div class="hero-side">
          <div class="hero-stat">
            <span class="hs-label">Aulas evaluadas</span>
            <span class="hs-value">{{ kpis.evaluated }}<span class="hs-dim"> / {{ kpis.total }}</span></span>
          </div>
          <div class="hero-stat">
            <span class="hs-label">Aulas en riesgo</span>
            <span class="hs-value hs-red">{{ kpis.atRisk }}</span>
          </div>
          <div class="hero-stat">
            <span class="hs-label">Requieren acción hoy</span>
            <span class="hs-value hs-amber">{{ actionCount }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="hero-main">
          <div class="hero-badge hb-neutral">
            <i class="fa-solid fa-circle"></i> SIN DATOS SUFICIENTES
          </div>
          <div class="hero-headline">
            No hay aulas evaluadas en el periodo seleccionado.
          </div>
          <div class="hero-detail">Ajusta el rango de fechas o sincroniza el reporte.</div>
        </div>
      </template>
    </div>

    <!-- ============ KPI SCORECARD ============ -->
    <div class="kpi-grid">
      <div
        class="kpi"
        :style="{ '--accent': kpis.avg20 == null ? '#94a3b8' : kpis.avg20 >= META_20 ? '#12a150' : kpis.avg20 >= 15 ? '#f0932b' : '#d64545' }"
      >
        <div class="k-top">
          <span class="k-label">PROMEDIO CONSOLIDADO</span>
          <span v-if="kpiDeltas?.avg20" class="k-delta" :class="kpiDeltas.avg20.class">
            <i v-if="kpiDeltas.avg20.dir" class="fa-solid" :class="kpiDeltas.avg20.dir === 'up' ? 'fa-caret-up' : 'fa-caret-down'"></i>
            {{ Math.abs(kpiDeltas.avg20.value).toFixed(1) }}
          </span>
        </div>
        <div class="k-value" :class="kpis.avgClass"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ fmt20(kpis.avg20) }}<span class="k-suffix"> /20</span></template></div>
        <div class="k-meter">
          <div class="k-context"><span>Meta {{ META_20.toFixed(1) }}</span><span class="k-pct">{{ kpis.avg20 != null ? Math.min(100, Math.round((kpis.avg20 / META_20) * 100)) : 0 }}%</span></div>
          <div class="k-bar"><div class="k-fill" :style="{ width: (kpis.avg20 != null ? Math.min(100, Math.round((kpis.avg20 / META_20) * 100)) : 0) + '%' }"></div></div>
        </div>
      </div>

      <div class="kpi" style="--accent: #12a150">
        <div class="k-top">
          <span class="k-label">AULAS EN META (≥{{ META_20 }})</span>
          <span v-if="kpiDeltas?.good" class="k-delta" :class="kpiDeltas.good.class">
            <i v-if="kpiDeltas.good.dir" class="fa-solid" :class="kpiDeltas.good.dir === 'up' ? 'fa-caret-up' : 'fa-caret-down'"></i>
            {{ Math.abs(kpiDeltas.good.value) }}
          </span>
        </div>
        <div class="k-value"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ kpis.good ?? 0 }}<span class="k-suffix"> /{{ kpis.total ?? 0 }}</span></template></div>
        <div class="k-meter">
          <div class="k-context"><span>Bueno + Excelente</span><span class="k-pct">{{ kpis.total ? Math.round((kpis.good / kpis.total) * 100) : 0 }}%</span></div>
          <div class="k-bar"><div class="k-fill" :style="{ width: (kpis.total ? Math.round((kpis.good / kpis.total) * 100) : 0) + '%' }"></div></div>
        </div>
      </div>

      <div class="kpi" style="--accent: #f0932b">
        <div class="k-top">
          <span class="k-label">AULAS EN RIESGO</span>
          <span v-if="kpiDeltas?.atRisk" class="k-delta" :class="kpiDeltas.atRisk.class">
            <i v-if="kpiDeltas.atRisk.dir" class="fa-solid" :class="kpiDeltas.atRisk.dir === 'up' ? 'fa-caret-up' : 'fa-caret-down'"></i>
            {{ Math.abs(kpiDeltas.atRisk.value) }}
          </span>
        </div>
        <div class="k-value"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ kpis.atRisk ?? 0 }}</template></div>
        <div class="k-meter">
          <div class="k-context"><span>Deficiente + En proceso</span><span class="k-pct">{{ kpis.total ? Math.round((kpis.atRisk / kpis.total) * 100) : 0 }}%</span></div>
          <div class="k-bar"><div class="k-fill" :style="{ width: (kpis.total ? Math.round((kpis.atRisk / kpis.total) * 100) : 0) + '%' }"></div></div>
        </div>
      </div>

      <div class="kpi" style="--accent: #5b6cf0">
        <div class="k-top">
          <span class="k-label">COBERTURA EVIDENCIA</span>
          <span v-if="kpiDeltas?.evaluated" class="k-delta" :class="kpiDeltas.evaluated.class">
            <i v-if="kpiDeltas.evaluated.dir" class="fa-solid" :class="kpiDeltas.evaluated.dir === 'up' ? 'fa-caret-up' : 'fa-caret-down'"></i>
            {{ Math.abs(kpiDeltas.evaluated.value) }}
          </span>
        </div>
        <div class="k-value"><span v-if="isLoading" class="skel-kpi"></span><template v-else>{{ coveragePct }}<span class="k-suffix">%</span></template></div>
        <div class="k-meter">
          <div class="k-context"><span>IA {{ globalCoverage.aiPct }}% · Manual {{ globalCoverage.manualPct }}%</span><span class="k-pct">{{ coveragePct }}%</span></div>
          <div class="k-bar"><div class="k-fill" :style="{ width: coveragePct + '%' }"></div></div>
        </div>
      </div>
    </div>

    <!-- ============ ACTO 2 — EL HALLAZGO + DISTRIBUCION ============ -->
    <div class="act2">
      <!-- Brecha IA vs Manual -->
      <div class="card gap-card">
        <div class="card-eyebrow-row">
          <span class="card-eyebrow">EL HALLAZGO</span>
          <span v-if="scoreAverages.gap != null" class="gap-chip">
            BRECHA DE {{ scoreAverages.gap.toFixed(1) }} PTS
          </span>
        </div>
        <h3 class="card-title">IA vs. rúbrica manual</h3>
        <p class="card-desc">
          El consolidado pondera {{ Math.round(CONSOLIDATED_WEIGHT_IA * 100) }}% IA /
          {{ Math.round(CONSOLIDATED_WEIGHT_MANUAL * 100) }}% manual. Cuando ambas fuentes
          divergen, el promedio queda atrapado en medio.
        </p>

        <div v-if="scoreAverages.ia != null || scoreAverages.manual != null" class="scale">
          <div class="scale-track"></div>
          <div class="scale-meta" :style="{ left: scalePos(META_20) + '%' }"></div>
          <div class="scale-meta-label" :style="{ left: scalePos(META_20) + '%' }">Meta {{ META_20.toFixed(1) }}</div>
          <div
            v-if="scoreAverages.ia != null"
            class="scale-marker"
            :style="{ left: scalePos(scoreAverages.ia) + '%' }"
          >
            <span class="sm-label sm-ia">IA</span>
            <span class="sm-dot sm-dot-ia"></span>
            <span class="sm-value sm-ia">{{ fmt20(scoreAverages.ia) }}</span>
            <span class="sm-tip">
              <span class="dt-dot" style="background: var(--indigo)"></span>
              <b>Evaluación IA</b>&nbsp;· promedio {{ fmt20(scoreAverages.ia) }} / 20
            </span>
          </div>
          <div
            v-if="kpis.avg20 != null"
            class="scale-marker"
            :style="{ left: scalePos(kpis.avg20) + '%' }"
          >
            <span class="sm-label sm-cons">Consol.</span>
            <span class="sm-dot sm-dot-cons"></span>
            <span class="sm-value sm-cons">{{ fmt20(kpis.avg20) }}</span>
            <span class="sm-tip">
              <span class="dt-dot" style="background: var(--amber)"></span>
              <b>Consolidado</b>&nbsp;· {{ Math.round(CONSOLIDATED_WEIGHT_IA * 100) }}% IA + {{ Math.round(CONSOLIDATED_WEIGHT_MANUAL * 100) }}% manual = {{ fmt20(kpis.avg20) }} / 20
            </span>
          </div>
          <div
            v-if="scoreAverages.manual != null"
            class="scale-marker"
            :style="{ left: scalePos(scoreAverages.manual) + '%' }"
          >
            <span class="sm-label sm-man">Manual</span>
            <span class="sm-dot sm-dot-man"></span>
            <span class="sm-value sm-man">{{ fmt20(scoreAverages.manual) }}</span>
            <span class="sm-tip">
              <span class="dt-dot" style="background: var(--green)"></span>
              <b>Rúbrica manual</b>&nbsp;· promedio {{ fmt20(scoreAverages.manual) }} / 20
            </span>
          </div>
          <span class="scale-end scale-0">0</span>
          <span class="scale-end scale-20">20</span>
        </div>
        <div v-else class="panel-empty">
          <i class="fa-regular fa-folder-open"></i> Sin notas en el periodo seleccionado.
        </div>

        <div class="gap-stats">
          <div class="gap-stat">
            <div class="gs-label">Aulas donde IA y manual difieren &gt;{{ GAP_THRESHOLD }} pts</div>
            <div class="gs-value gs-red">{{ scoreAverages.bigGap }} <span class="gs-dim">de {{ scoreAverages.both }}</span></div>
          </div>
          <div class="gap-stat">
            <div class="gs-label">Cobertura promedio de evidencia</div>
            <div class="gs-value gs-amber">{{ coveragePct }}% <span class="gs-dim">{{ coveragePct < 100 ? 'incompleta' : 'completa' }}</span></div>
          </div>
        </div>
      </div>

      <!-- Donut -->
      <div class="card donut-card">
        <span class="card-eyebrow">DISTRIBUCIÓN DE VEREDICTOS</span>
        <h3 class="card-title">Dónde estamos</h3>
        <div v-if="!donutView.total" class="panel-empty">
          <i class="fa-regular fa-folder-open"></i> No hay aulas en el periodo.
        </div>
        <template v-else>
          <div class="donut-wrap">
            <div class="donut" @mouseleave="donutTip = null">
              <svg viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#eef1f6" stroke-width="30"></circle>
                <circle
                  v-for="seg in donutView.segments"
                  :key="seg.key"
                  class="donut-seg"
                  :class="{ dim: donutTip && donutTip.key !== seg.key }"
                  cx="100" cy="100" r="80" fill="none"
                  :style="{ stroke: seg.color }" stroke-width="30" pathLength="100"
                  :stroke-dasharray="seg.dash" :stroke-dashoffset="seg.offset"
                  @mousemove="moveDonutTip($event, seg)"
                ></circle>
              </svg>
              <div class="donut-center">
                <div class="dc-value">{{ donutView.total }}</div>
                <div class="dc-label">aulas</div>
              </div>
              <div
                v-if="donutTip"
                class="donut-tip"
                :style="{ left: donutTip.x + 'px', top: donutTip.y + 'px' }"
              >
                <span class="dt-dot" :style="{ background: donutTip.color }"></span>
                <b>{{ donutTip.name }}</b>&nbsp;· {{ donutTip.count }} aula{{ donutTip.count === 1 ? '' : 's' }} ({{ donutTip.pct }}%)
              </div>
            </div>
          </div>
          <div class="donut-legend">
            <div v-for="l in donutView.legend" :key="l.key" class="dl-row">
              <span class="dl-dot" :style="{ background: l.color }"></span>
              <span class="dl-name">{{ l.name }}</span>
              <span class="dl-pct">{{ l.pct }}%</span>
              <span class="dl-count">{{ l.count }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ============ ACTO 3 — QUIEN + QUE HACER ============ -->
    <div class="act3">
      <!-- Ranking docentes -->
      <div class="card ranking-card">
        <div class="ranking-head">
          <div>
            <span class="card-eyebrow">RANKING DE DOCENTES</span>
            <h3 class="card-title">Quién necesita acompañamiento</h3>
          </div>
          <div class="seg-tabs">
            <button
              v-for="opt in docenteSortOptions"
              :key="opt.id"
              class="seg-tab"
              :class="{ active: docenteSort === opt.id }"
              @click="docenteSort = opt.id"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="!docenteStats.length" class="panel-empty">
          <i class="fa-regular fa-folder-open"></i> No hay docentes con aulas en el periodo.
        </div>

        <div v-else class="ranking-scroll">
          <table class="rk-table">
            <thead>
              <tr>
                <th class="th-first">#</th>
                <th>DOCENTE</th>
                <th class="th-center">AULAS</th>
                <th class="th-center">PROMEDIO</th>
                <th class="th-center">EN RIESGO</th>
                <th class="th-last">EVALUADAS</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, i) in docenteStats"
                :key="d.teacher"
                class="rk-row"
                :class="{ selected: filterDocente === d.teacher }"
                @click="focusDocente(d.teacher)"
              >
                <td class="td-first"><span class="rk-pos">{{ i + 1 }}</span></td>
                <td>
                  <div class="teacher-cell">
                    <span class="avatar">{{ d.initials }}</span>
                    <span class="rk-name">{{ d.teacher }}</span>
                  </div>
                </td>
                <td class="td-center td-strong">{{ d.total }}</td>
                <td class="td-center">
                  <span class="score-pill" :class="d.avgClass">{{ fmt20(d.avg20) }}</span>
                </td>
                <td class="td-center rk-risk" :class="{ on: d.atRisk > 0 }">{{ d.atRisk }}</td>
                <td class="td-last">
                  <div class="rk-cov">
                    <span class="rk-cov-bar"><span class="rk-cov-fill" :style="{ width: d.evaluatedPct + '%' }"></span></span>
                    <span class="rk-cov-fig">{{ d.evaluatedPct }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-foot">
          <i class="fa-solid fa-circle-info"></i>
          Promedio = media simple por aula. Clic en un docente filtra la tabla.
        </div>
      </div>

      <!-- Decisiones -->
      <div class="card decisions-card">
        <div class="dec-head">
          <div>
            <span class="card-eyebrow">DECISIONES RECOMENDADAS</span>
            <h3 class="card-title">Qué hacer esta semana</h3>
          </div>
          <button
            class="ai-btn"
            :disabled="aiLoading || !periodAulas.length"
            title="Regenerar recomendaciones con la IA local"
            @click="generateAiDecisions(true)"
          >
            <i class="fa-solid" :class="aiLoading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
            {{ aiLoading ? 'Generando...' : 'Regenerar' }}
          </button>
        </div>
        <div v-if="aiLoading && !displayDecisions.length" class="panel-empty">
          <i class="fa-solid fa-spinner fa-spin"></i> La IA está redactando las recomendaciones...
        </div>
        <div v-else-if="!displayDecisions.length" class="panel-empty">
          <i class="fa-solid fa-circle-check"></i> Sin acciones pendientes con los datos del periodo.
        </div>
        <div v-else class="decisions-list">
          <div v-for="(d, i) in displayDecisions" :key="i" class="decision" :class="`dec-${d.tone}`">
            <div class="dec-accent"></div>
            <div class="dec-body">
              <div class="dec-top">
                <span class="dec-tag">{{ d.tag }}</span>
                <span class="dec-impact">{{ d.impact }}</span>
              </div>
              <div class="dec-title">{{ d.title }}</div>
              <div class="dec-text">{{ d.body }}</div>
              <div class="dec-owner">Responsable · <b>{{ d.owner }}</b></div>
            </div>
          </div>
        </div>
        <div v-if="aiDecisions" class="ai-note">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          Generado por la IA del servidor con los indicadores del periodo.
        </div>
      </div>
    </div>

    <!-- ============ TABLA DETALLE (filtros + tabla en una sola card) ============ -->
    <div class="card table-card">
      <div class="table-filters">
        <div class="filter-row">
          <div class="filter-title">DETALLE POR AULA <span class="ft-hint">· clic para filtrar</span></div>
          <div class="filter-tabs">
            <button class="v-tab" :class="{ active: !activeFoco }" @click="activeFoco = null">
              Todos
            </button>
            <button
              v-for="f in focos"
              :key="f.key"
              class="foco"
              :class="[`foco-${f.tone}`, { active: activeFoco === f.key }]"
              :title="f.hint"
              @click="toggleFoco(f.key)"
            >
              <i class="fa-solid" :class="f.icon"></i>
              <span class="foco-count">{{ f.count }}</span>
              <span class="foco-label">{{ f.label }}</span>
            </button>
          </div>
        </div>
        <div class="filter-row filter-row-2">
          <div class="filter-group">
            <button
              v-for="s in filterStates"
              :key="s"
              class="chip"
              :class="{ active: filterStatus === s }"
              @click="filterStatus = s"
            >
              {{ s }} <span class="chip-count">{{ countByStatus(s) }}</span>
            </button>
          </div>
          <div class="spacer"></div>
          <div class="select">
            <i class="fa-solid fa-chalkboard-user"></i>
            <select v-model="filterDocente">
              <option value="">Todos los docentes</option>
              <option v-for="d in docenteOptions" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="query" type="text" placeholder="Buscar aula, código o docente..." />
          </div>
        </div>
      </div>
      <table class="detail-table">
        <thead>
          <tr>
            <th class="th-first">AULA</th>
            <th>DOCENTE</th>
            <th>COBERTURA</th>
            <th class="th-center">NOTA IA</th>
            <th class="th-center">MANUAL</th>
            <th class="th-center">BRECHA</th>
            <th class="th-center">CONSOLIDADA</th>
            <th>VEREDICTO</th>
            <th class="th-last">ÚLT. ACT.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="state-msg">
              <i class="fa-solid fa-spinner fa-spin"></i> Cargando reporte...
            </td>
          </tr>
          <tr v-else-if="!sorted.length">
            <td colspan="9" class="state-msg">
              <i class="fa-regular fa-folder-open"></i>
              Ninguna aula coincide con los filtros aplicados.
            </td>
          </tr>
          <tr
            v-for="a in paged"
            v-else
            :key="a.id"
            class="row-clickable"
            @click="openAula(a.id)"
          >
            <td class="td-first">
              <div class="aula-cell">
                <span class="aula-code">{{ a.code }}</span>
                <span class="aula-name">{{ a.name }}</span>
                <span class="aula-edition">{{ a.edition }}</span>
              </div>
            </td>
            <td>
              <div class="teacher-cell">
                <span class="avatar">{{ a.teacherInitials }}</span>
                <span class="teacher-name">{{ a.teacher }}</span>
              </div>
            </td>
            <td class="td-cov">
              <span class="cov-mini" :title="`IA: ${a.sessionsAi} / ${a.sessionsTotal}`">
                <i class="fa-solid fa-robot"></i> {{ a.sessionsAi }}/{{ a.sessionsTotal }}
              </span>
              <span class="cov-mini" :title="`Manual: ${a.sessionsManual} / ${a.sessionsTotal}`">
                <i class="fa-solid fa-clipboard-check"></i> {{ a.sessionsManual }}/{{ a.sessionsTotal }}
              </span>
            </td>
            <td class="td-center num-ia">{{ a.aiAvg20 != null ? fmt20(a.aiAvg20) : '--' }}</td>
            <td class="td-center num-man">{{ a.manualAvg20 != null ? fmt20(a.manualAvg20) : '--' }}</td>
            <td class="td-center">
              <span
                v-if="gapOf(a) != null"
                class="gap-pill"
                :class="{ big: gapOf(a) > GAP_THRESHOLD }"
              >{{ gapOf(a).toFixed(1) }}</span>
              <span v-else class="dim">--</span>
            </td>
            <td class="td-center num-cons" :class="a.verdictClass">
              {{ a.consolidated20 != null ? fmt20(a.consolidated20) : '--' }}
            </td>
            <td>
              <span class="verdict-pill" :class="a.verdictClass">{{ a.verdict }}</span>
            </td>
            <td class="td-last td-rel">{{ a.lastActivityRel || '--' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="totalPages > 1" class="table-pager">
        <span class="pager-info">{{ pagerInfo }}</span>
        <div class="pager-controls">
          <button class="pager-btn" :disabled="page === 1" @click="page--">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <button
            v-for="(p, i) in pagerPages"
            :key="`${p}-${i}`"
            class="pager-btn pager-num"
            :class="{ active: p === page }"
            :disabled="p === '…'"
            @click="typeof p === 'number' && (page = p)"
          >{{ p }}</button>
          <button class="pager-btn" :disabled="page === totalPages" @click="page++">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
      <div class="table-foot">
        Consolidada = {{ Math.round(CONSOLIDATED_WEIGHT_IA * 100) }}% IA +
        {{ Math.round(CONSOLIDATED_WEIGHT_MANUAL * 100) }}% rúbrica manual ·
        Brecha = |manual − IA|. Meta institucional: {{ META_20.toFixed(1) }} / 20.
        Las aulas SIN EVALUAR no se promedian en el KPI institucional.
      </div>
    </div>
  </div>
</template>

<style scoped>
.rpt {
  --navy: #1b2a5b;
  --navy-2: #16244f;
  --bg: #f4f6fa;
  --line: #e6e9f0;
  --line-soft: #f0f2f6;
  --ink: #0f172a;
  --slate: #475569;
  --slate-2: #64748b;
  --mut: #94a3b8;
  --mut-2: #b6bccb;
  --eyebrow: #8a93a5;
  --green: #12a150;
  --green-ink: #12703a;
  --green-soft: #e7f6ee;
  --red: #d64545;
  --red-deep: #b23b3b;
  --red-soft: #fdecec;
  --amber: #f0932b;
  --amber-ink: #c97a1a;
  --amber-soft: #fdf3e6;
  --blue: #2f6bdb;
  --blue-soft: #eef2fb;
  --indigo: #5b6cf0;
  --indigo-ink: #3f4fb8;
  --donut-empty: #c4cad6;

  font-family: Inter, 'Hanken Grotesk', -apple-system, system-ui, sans-serif;
  color: var(--ink);
  font-size: 14px;
  /* Mismo ancho que fico/inscripciones (EnrollmentPage) */
  max-width: 1600px;
  margin: 0 auto;
}

.spacer { flex: 1; }
.dim { color: var(--mut-2); }

/* Colores semanticos por nota (misma rubrica 19/17/15) */
.sg-good  { color: var(--green-ink); }
.sg-ok    { color: var(--blue); }
.sg-warn  { color: var(--amber-ink); }
.sg-bad   { color: var(--red); }
.sg-empty { color: var(--slate-2); }

/* ============ HEADER ============ */
.rpt-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 24px; margin-bottom: 20px;
}
.eyebrow {
  font-size: 12px; font-weight: 700; letter-spacing: .14em;
  color: var(--eyebrow); margin-bottom: 7px;
}
.rpt-head h1 {
  margin: 0; font-size: 30px; font-weight: 800;
  letter-spacing: -.02em; color: var(--navy);
}
.rpt-actions {
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap; justify-content: flex-end;
}
.btn-navy {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 16px; background: var(--navy); border: none;
  border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff;
  cursor: pointer; transition: background .15s;
}
.btn-navy:hover { background: var(--navy-2); }
.btn-navy:disabled { opacity: .55; cursor: not-allowed; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 15px; background: #fff; border: 1px solid var(--line);
  border-radius: 10px; font-size: 14px; font-weight: 600; color: var(--slate);
  cursor: pointer; transition: background .15s;
}
.btn-ghost:hover { background: var(--bg); }
.btn-ghost:disabled { opacity: .55; cursor: not-allowed; }

/* ============ HERO BANNER ============ */
.hero {
  background: linear-gradient(180deg, var(--navy) 0%, var(--navy-2) 100%);
  border-radius: 16px; padding: 28px 30px; margin-bottom: 22px;
  color: #fff; display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px;
}
.hero-badge {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 6px 13px; border-radius: 20px;
  font-size: 12px; font-weight: 800; letter-spacing: .08em; margin-bottom: 16px;
}
.hero-badge i { font-size: 7px; }
.hb-neutral {
  background: rgba(255, 255, 255, .1); border: 1px solid rgba(255, 255, 255, .25);
  color: #c8d0e8;
}
.hero-headline {
  font-size: 25px; font-weight: 800; line-height: 1.28; letter-spacing: -.01em;
}
.hero-headline .hl { color: #ffd27a; }
.hero-detail {
  margin-top: 16px; font-size: 15px; color: #b9c2dd; line-height: 1.5; max-width: 640px;
}
.hero-detail b { color: #fff; }
.hero-side { display: flex; flex-direction: column; gap: 12px; justify-content: center; }
.hero-stat {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; background: rgba(255, 255, 255, .06); border-radius: 11px;
}
.hs-label { font-size: 13px; color: #b9c2dd; }
.hs-value { font-size: 20px; font-weight: 800; }
.hs-dim { color: #8593bd; font-size: 15px; }
.hs-red { color: #ffb4b4; }
.hs-amber { color: #ffd27a; }

/* ============ KPI SCORECARD ============ */
.kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 20px; margin-bottom: 22px;
}
.kpi {
  background: #fff; border: 1px solid var(--line);
  border-left: 4px solid var(--accent, var(--mut));
  border-radius: 14px; padding: 18px 20px;
}
.k-top { display: flex; align-items: center; justify-content: space-between; }
.k-label {
  font-size: 11px; font-weight: 700; letter-spacing: .09em; color: var(--eyebrow);
}
.k-delta {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 8px; border-radius: 7px; font-size: 12px; font-weight: 700;
}
.k-delta i { font-size: 11px; }
.k-delta.d-good { background: var(--green-soft); color: var(--green-ink); }
.k-delta.d-bad  { background: var(--red-soft); color: var(--red); }
.k-delta.d-flat { background: var(--line-soft); color: var(--slate-2); }
.k-value {
  margin-top: 12px; font-size: 32px; font-weight: 800; color: var(--navy);
  font-variant-numeric: tabular-nums; line-height: 1;
}
.k-suffix { font-size: 17px; color: var(--mut); font-weight: 700; }
.k-meter { margin-top: 13px; }
.k-context {
  display: flex; justify-content: space-between;
  font-size: 12px; color: var(--mut); margin-bottom: 5px;
}
.k-pct { color: var(--slate); font-weight: 600; }
.k-bar { height: 6px; background: #eef1f6; border-radius: 4px; overflow: hidden; }
.k-fill {
  height: 100%; border-radius: 4px; background: var(--accent, var(--mut));
  transition: width .3s ease;
}

/* ============ CARDS GENERICAS ============ */
.card {
  background: #fff; border: 1px solid var(--line); border-radius: 14px;
}
.card-eyebrow {
  font-size: 12px; font-weight: 700; letter-spacing: .08em; color: var(--eyebrow);
}
.card-eyebrow-row { display: flex; align-items: center; gap: 10px; }
.card-title {
  font-size: 19px; font-weight: 800; color: var(--navy);
  margin: 5px 0 4px;
}
.card-desc { font-size: 14px; color: var(--slate-2); margin: 0 0 26px; line-height: 1.5; }
.card-foot {
  margin-top: 12px; padding: 12px 18px 14px; font-size: 12px; color: var(--mut);
  border-top: 1px solid var(--line-soft);
  display: flex; align-items: center; gap: 6px;
}
.panel-empty {
  display: flex; align-items: center; gap: 8px; justify-content: center;
  padding: 48px 0; color: var(--mut); font-size: 13px;
}

/* ============ ACTO 2 ============ */
.act2 {
  display: grid; grid-template-columns: 1.25fr .9fr; gap: 20px; margin-bottom: 22px;
}
.gap-card { padding: 24px 26px; }
.gap-chip {
  padding: 2px 9px; background: var(--amber-soft); border-radius: 6px;
  font-size: 11px; font-weight: 800; color: var(--amber-ink);
}

.scale { position: relative; height: 112px; margin: 0 6px; }
.scale-track {
  position: absolute; top: 54px; left: 0; right: 0; height: 8px;
  background: linear-gradient(90deg, #fbe3e3 0%, #fdf0e0 55%, #e3f2ea 100%);
  border-radius: 5px;
}
.scale-meta {
  position: absolute; top: 34px; width: 2px; height: 48px; background: var(--green);
}
.scale-meta-label {
  position: absolute; top: 16px; transform: translateX(-50%);
  font-size: 12px; font-weight: 800; color: var(--green-ink); white-space: nowrap;
}
.scale-marker {
  position: absolute; top: 34px; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center;
  cursor: pointer;
}
/* Popover estilizado (mismo look que el tooltip del donut) que aparece
   sobre el marcador al hacer hover. CSS puro, sin JS. */
.sm-tip {
  position: absolute; bottom: calc(100% + 10px); left: 50%;
  transform: translateX(-50%) translateY(3px);
  display: flex; align-items: center; gap: 7px;
  padding: 7px 11px; background: #fff; border: 1px solid var(--line);
  border-radius: 9px; box-shadow: 0 4px 14px rgba(15, 23, 42, .12);
  font-size: 12.5px; font-weight: 400; color: var(--slate);
  white-space: nowrap; opacity: 0; pointer-events: none;
  transition: opacity .12s, transform .12s; z-index: 10;
}
.sm-tip b { color: var(--navy); }
.scale-marker:hover .sm-tip {
  opacity: 1; transform: translateX(-50%) translateY(0);
}
.sm-label { margin-bottom: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.sm-value { margin-top: 6px; font-size: 13px; font-weight: 800; white-space: nowrap; }
.sm-dot {
  width: 26px; height: 26px; border-radius: 50%;
  border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .15);
}
.sm-ia { color: var(--indigo-ink); }
.sm-dot-ia { background: var(--indigo); }
.sm-cons { color: var(--amber-ink); }
.sm-dot-cons { background: var(--amber); }
.sm-man { color: var(--green-ink); }
.sm-dot-man { background: var(--green); }
.scale-end {
  position: absolute; bottom: 0; font-size: 11px; color: var(--mut-2); font-weight: 600;
}
.scale-0 { left: 0; }
.scale-20 { right: 0; }

.gap-stats { display: flex; gap: 12px; margin-top: 24px; }
.gap-stat {
  flex: 1; padding: 14px 16px; background: #f7f9fc;
  border: 1px solid var(--line); border-radius: 10px;
}
.gs-label { font-size: 12px; color: var(--mut); font-weight: 600; }
.gs-value { font-size: 24px; font-weight: 800; margin-top: 4px; }
.gs-red { color: var(--red); }
.gs-amber { color: var(--amber-ink); }
.gs-dim { font-size: 14px; color: var(--mut); font-weight: 600; }

.donut-card { padding: 22px 24px 24px; }
.donut-wrap { display: flex; align-items: center; justify-content: center; margin-top: 14px; }
.donut { position: relative; width: 186px; height: 186px; }
.donut svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  pointer-events: none;
}
.donut-seg { transition: opacity .15s; cursor: pointer; }
.donut-seg.dim { opacity: .3; }
.donut-tip {
  position: absolute; z-index: 10; pointer-events: none;
  display: flex; align-items: center; gap: 7px;
  padding: 7px 11px; background: #fff; border: 1px solid var(--line);
  border-radius: 9px; box-shadow: 0 4px 14px rgba(15, 23, 42, .12);
  font-size: 12.5px; color: var(--slate); white-space: nowrap;
}
.donut-tip b { color: var(--navy); }
.dt-dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
.dc-value { font-size: 34px; font-weight: 800; color: var(--navy); line-height: 1; }
.dc-label { font-size: 11px; color: var(--mut); margin-top: 3px; }
.donut-legend { display: flex; flex-direction: column; gap: 9px; margin-top: 18px; }
.dl-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.dl-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.dl-name { flex: 1; color: var(--slate); font-weight: 500; }
.dl-pct { color: var(--mut); font-variant-numeric: tabular-nums; }
.dl-count {
  font-weight: 800; color: var(--navy); font-variant-numeric: tabular-nums;
  width: 24px; text-align: right;
}

/* ============ ACTO 3 ============ */
.act3 {
  display: grid; grid-template-columns: 1.15fr 1fr; gap: 20px; margin-bottom: 22px;
}
.ranking-card { padding: 22px 0 0; display: flex; flex-direction: column; min-height: 0; }
.ranking-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; padding: 0 18px 6px;
}
.seg-tabs { display: flex; background: #eef1f6; border-radius: 9px; padding: 3px; flex: 0 0 auto; }
.seg-tab {
  padding: 7px 11px; font-size: 12px; font-weight: 700; border-radius: 7px;
  border: none; background: transparent; color: var(--mut); cursor: pointer;
}
.seg-tab.active { background: var(--navy); color: #fff; }

.ranking-scroll { max-height: 420px; overflow-y: auto; }
.rk-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.rk-table thead th {
  position: sticky; top: 0; background: #fff; z-index: 1;
  padding: 10px 8px 8px; font-size: 11px; font-weight: 700;
  letter-spacing: .05em; color: var(--eyebrow); text-align: left;
}
.rk-table .th-first { padding-left: 18px; }
.rk-table .th-last { padding-right: 18px; text-align: right; }
.rk-table .th-center { text-align: center; }
.rk-table td { padding: 12px 8px; border-top: 1px solid var(--line-soft); }
.rk-table .td-first { padding-left: 18px; }
.rk-table .td-last { padding-right: 18px; }
.rk-table .td-center { text-align: center; }
.td-strong { font-weight: 600; color: var(--slate); }
.rk-row { cursor: pointer; transition: background .15s; }
.rk-row:hover { background: #fbfcfe; }
.rk-row.selected { background: var(--blue-soft); }
.rk-pos {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--bg); color: var(--eyebrow);
  font-weight: 800; font-size: 12px; font-variant-numeric: tabular-nums;
}
.teacher-cell { display: flex; align-items: center; gap: 10px; }
.avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 50%; flex: 0 0 auto;
  background: var(--navy); color: #fff; font-size: 11px; font-weight: 700;
}
.rk-name { font-weight: 600; color: var(--navy); }
.score-pill {
  display: inline-block; padding: 3px 9px; border-radius: 7px;
  font-weight: 800; font-variant-numeric: tabular-nums; background: var(--line-soft);
}
.score-pill.sg-good { background: var(--green-soft); }
.score-pill.sg-ok   { background: var(--blue-soft); }
.score-pill.sg-warn { background: var(--amber-soft); }
.score-pill.sg-bad  { background: var(--red-soft); }
.rk-risk { font-weight: 800; color: var(--mut-2); font-variant-numeric: tabular-nums; }
.rk-risk.on { color: var(--red); }
.rk-cov { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.rk-cov-bar {
  width: 52px; height: 5px; background: #eef1f6;
  border-radius: 3px; overflow: hidden;
}
.rk-cov-fill {
  display: block; height: 100%; background: var(--green);
  border-radius: 3px; transition: width .3s ease;
}
.rk-cov-fig { font-size: 13px; font-weight: 600; color: var(--slate); }

.decisions-card { padding: 22px 24px 24px; }
.dec-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.ai-btn {
  display: inline-flex; align-items: center; gap: 7px; flex: 0 0 auto;
  padding: 8px 13px; border-radius: 9px; border: 1px solid var(--line);
  background: #fff; font-size: 12.5px; font-weight: 700; color: var(--indigo-ink);
  cursor: pointer; transition: background .15s, border-color .15s;
}
.ai-btn:hover { background: var(--blue-soft); border-color: #cdd9f3; }
.ai-btn:disabled { opacity: .6; cursor: not-allowed; }
.ai-note {
  margin-top: 14px; font-size: 11.5px; color: var(--mut);
  display: flex; align-items: center; gap: 6px;
}
.ai-note i { color: var(--indigo); font-size: 11px; }
.decisions-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.decision {
  display: flex; gap: 14px; padding: 16px;
  border: 1px solid var(--line); border-radius: 12px; background: #fbfcfe;
}
.dec-accent { width: 4px; border-radius: 3px; flex: 0 0 auto; }
.dec-red .dec-accent { background: var(--red); }
.dec-amber .dec-accent { background: var(--amber); }
.dec-blue .dec-accent { background: var(--blue); }
.dec-green .dec-accent { background: var(--green); }
.dec-body { flex: 1; }
.dec-top {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 7px;
}
.dec-tag {
  display: inline-flex; padding: 3px 9px; border-radius: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: .05em;
}
.dec-red .dec-tag { background: var(--red-soft); color: var(--red); }
.dec-amber .dec-tag { background: var(--amber-soft); color: var(--amber-ink); }
.dec-blue .dec-tag { background: var(--blue-soft); color: var(--blue); }
.dec-green .dec-tag { background: var(--green-soft); color: var(--green-ink); }
.dec-impact { font-size: 11px; font-weight: 700; color: var(--mut); }
.dec-title { font-size: 15px; font-weight: 700; color: var(--navy); margin-bottom: 5px; }
.dec-text { font-size: 13px; color: var(--slate-2); line-height: 1.5; }
.dec-owner {
  margin-top: 11px; padding-top: 10px; border-top: 1px solid var(--line-soft);
  font-size: 12px; color: var(--mut);
}
.dec-owner b { color: var(--navy); font-weight: 600; }

/* ============ FOCOS (chips "requieren atencion" en el header del detalle) ============ */
.foco {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 13px 7px 11px; border-radius: 999px;
  border: 1px solid var(--line); background: #fff; cursor: pointer;
  font-size: 12.5px; color: var(--slate); font-weight: 600;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.foco:hover { background: var(--bg); }
.foco i { font-size: 11px; }
.foco-count { font-weight: 800; font-variant-numeric: tabular-nums; }
.foco-label { color: var(--slate-2); font-weight: 500; }
.foco-red i, .foco-red .foco-count { color: var(--red); }
.foco-amber i, .foco-amber .foco-count { color: var(--amber-ink); }
.foco-red.active {
  background: var(--red-soft); border-color: #f3c9c9;
  box-shadow: 0 0 0 3px rgba(214, 69, 69, .08);
}
.foco-red.active .foco-label { color: var(--red); }
.foco-amber.active {
  background: var(--amber-soft); border-color: #f0ddb0;
  box-shadow: 0 0 0 3px rgba(201, 122, 26, .08);
}
.foco-amber.active .foco-label { color: var(--amber-ink); }
/* ============ FILTROS (dentro de la card de la tabla) ============ */
.table-filters { padding: 14px 18px; border-bottom: 1px solid var(--line-soft); }
.filter-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.filter-row-2 { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line-soft); }
.filter-title { font-size: 13px; font-weight: 800; color: var(--navy); }
.ft-hint { color: var(--mut); font-weight: 600; }
.filter-tabs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.v-tab {
  padding: 7px 12px; border-radius: 8px; border: none;
  font-size: 13px; font-weight: 700; cursor: pointer;
  background: var(--bg); color: var(--slate); transition: background .15s;
}
.v-tab:hover { background: #eaedf4; }
.v-tab.active { background: var(--navy); color: #fff; }

/* ============ PAGINACION ============ */
.table-pager {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 18px; border-top: 1px solid var(--line-soft);
}
.pager-info { font-size: 12.5px; color: var(--mut); }
.pager-controls { display: flex; align-items: center; gap: 4px; }
.pager-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); border-radius: 8px; background: #fff;
  font-size: 12.5px; font-weight: 600; color: var(--slate);
  cursor: pointer; transition: background .15s;
}
.pager-btn:hover:not(:disabled) { background: var(--bg); }
.pager-btn:disabled { opacity: .45; cursor: default; }
.pager-num.active { background: var(--navy); border-color: var(--navy); color: #fff; }
.filter-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: 999px;
  background: #fff; border: 1px solid var(--line);
  font-size: 12px; font-weight: 600; color: var(--slate);
  cursor: pointer; transition: background .15s;
}
.chip:hover { background: var(--bg); }
.chip.active { background: var(--navy); color: #fff; border-color: var(--navy); }
.chip-count {
  color: var(--mut); font-size: 10.5px;
  background: var(--bg); padding: 1px 6px; border-radius: 999px;
}
.chip.active .chip-count { color: #fff; background: rgba(255, 255, 255, .18); }
.select {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 7px 10px; background: #fff; font-size: 13px; color: var(--mut);
}
.select select {
  border: none; outline: none; font-size: 13px;
  background: transparent; color: var(--ink); cursor: pointer; max-width: 200px;
}
.input {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 7px 10px; background: #fff; font-size: 13px;
  min-width: 230px; color: var(--mut);
}
.input input {
  border: none; outline: none; font-size: 13px;
  flex: 1; background: transparent; color: var(--ink);
}
.input input::placeholder { color: var(--mut-2); }

/* ============ TABLA DETALLE ============ */
.table-card { overflow: hidden; }
.detail-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.detail-table thead tr {
  background: #fafbfd; color: var(--eyebrow);
  font-size: 11px; letter-spacing: .05em; text-align: left;
}
.detail-table th { padding: 14px 8px; font-weight: 700; }
.detail-table .th-first { padding-left: 18px; }
.detail-table .th-last { padding-right: 18px; text-align: right; }
.detail-table .th-center { text-align: center; }
.detail-table td { padding: 15px 8px; border-top: 1px solid var(--line-soft); }
.detail-table .td-first { padding-left: 18px; }
.detail-table .td-last { padding-right: 18px; }
.detail-table .td-center { text-align: center; }
.row-clickable { cursor: pointer; transition: background .15s; }
.row-clickable:hover { background: #fbfcfe; }

.aula-cell { display: flex; flex-direction: column; gap: 1px; }
.aula-code { font-size: 11px; font-weight: 700; color: var(--mut-2); }
.aula-name { font-weight: 700; color: var(--navy); }
.aula-edition { font-size: 12px; color: var(--mut); }
.teacher-name { font-weight: 600; color: #334155; }

.td-cov { white-space: nowrap; }
.cov-mini {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 13px; color: var(--slate-2); font-weight: 600;
  font-variant-numeric: tabular-nums; margin-right: 12px;
}
.cov-mini i { font-size: 11px; color: var(--mut); }

.num-ia { font-weight: 700; color: var(--indigo-ink); font-variant-numeric: tabular-nums; }
.num-man { font-weight: 700; color: var(--green-ink); font-variant-numeric: tabular-nums; }
.num-cons { font-weight: 800; font-variant-numeric: tabular-nums; }

.gap-pill {
  display: inline-block; padding: 2px 8px; border-radius: 6px;
  font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums;
  background: #f1f5f9; color: var(--slate-2);
}
.gap-pill.big { background: var(--red-soft); color: var(--red); }

.verdict-pill {
  display: inline-block; padding: 4px 11px; border-radius: 8px;
  font-size: 12px; font-weight: 700;
  background: #f1f5f9; color: var(--slate-2);
}
.verdict-pill.sg-bad   { background: var(--red-soft); color: var(--red); }
.verdict-pill.sg-warn  { background: var(--amber-soft); color: var(--amber-ink); }
.verdict-pill.sg-ok    { background: var(--blue-soft); color: var(--blue); }
.verdict-pill.sg-good  { background: var(--green-soft); color: var(--green-ink); }
.verdict-pill.sg-empty { background: #f1f5f9; color: var(--slate-2); }

.td-rel { text-align: right; color: var(--mut); font-size: 13px; }
.state-msg {
  text-align: center; padding: 36px 12px !important; font-size: 13px; color: var(--mut);
}
.state-msg i { margin-right: 6px; }
.table-foot {
  padding: 14px 18px; font-size: 12px; color: var(--mut);
  border-top: 1px solid var(--line-soft);
}

/* ============ RESPONSIVE ============ */
@media (max-width: 1100px) {
  .hero { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .act2, .act3 { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .rpt-head { flex-direction: column; }
}

/* ══════════ DARK MODE ══════════ */
/* --navy NO se voltea: sigue siendo fondo de hero/botones/avatars (navy + texto
   blanco funciona en ambos temas). Los usos de --navy como TEXTO se corrigen
   selector por selector mas abajo. */
[data-coreui-theme="dark"] .rpt {
  --bg: #1F1F1A;
  --line: #2A2A22;
  --line-soft: #24241E;
  --ink: #F4F4F0;
  --slate: #C9C9C1;
  --slate-2: #A0A099;
  --mut: #8A8A80;
  --mut-2: #8A8A80;
  --eyebrow: #8A8A80;
  --green: #34D399;
  --green-ink: #34D399;
  --green-soft: rgba(16, 185, 129, .14);
  --red: #F87171;
  --red-deep: #F87171;
  --red-soft: rgba(239, 68, 68, .14);
  --amber: #FBBF24;
  --amber-ink: #FBBF24;
  --amber-soft: rgba(245, 158, 11, .14);
  --blue: #60A5FA;
  --blue-soft: rgba(59, 130, 246, .14);
  --indigo: #818CF8;
  --indigo-ink: #A5B4FC;
  --donut-empty: #6E6E64;
}
/* usos de --navy como texto */
[data-coreui-theme="dark"] .rpt .rpt-head h1,
[data-coreui-theme="dark"] .rpt .card-title,
[data-coreui-theme="dark"] .rpt .k-value,
[data-coreui-theme="dark"] .rpt .dc-value,
[data-coreui-theme="dark"] .rpt .dl-count,
[data-coreui-theme="dark"] .rpt .sm-tip b,
[data-coreui-theme="dark"] .rpt .donut-tip b,
[data-coreui-theme="dark"] .rpt .rk-name,
[data-coreui-theme="dark"] .rpt .aula-name,
[data-coreui-theme="dark"] .rpt .dec-title,
[data-coreui-theme="dark"] .rpt .dec-owner b,
[data-coreui-theme="dark"] .rpt .filter-title { color: #8FAADC; }
/* superficies */
[data-coreui-theme="dark"] .rpt .kpi,
[data-coreui-theme="dark"] .rpt .card { background: #1A1A14; }
[data-coreui-theme="dark"] .rpt .btn-ghost,
[data-coreui-theme="dark"] .rpt .ai-btn,
[data-coreui-theme="dark"] .rpt .foco,
[data-coreui-theme="dark"] .rpt .chip,
[data-coreui-theme="dark"] .rpt .select,
[data-coreui-theme="dark"] .rpt .input,
[data-coreui-theme="dark"] .rpt .pager-btn { background: #1F1F1A; }
[data-coreui-theme="dark"] .rpt .btn-ghost:hover { background: #24241E; }
[data-coreui-theme="dark"] .rpt .k-bar,
[data-coreui-theme="dark"] .rpt .rk-cov-bar,
[data-coreui-theme="dark"] .rpt .seg-tabs { background: #24241E; }
[data-coreui-theme="dark"] .rpt .v-tab:hover { background: #2A2A22; }
[data-coreui-theme="dark"] .rpt .rk-table thead th { background: #1A1A14; }
[data-coreui-theme="dark"] .rpt .rk-row:hover,
[data-coreui-theme="dark"] .rpt .row-clickable:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .rpt .decision,
[data-coreui-theme="dark"] .rpt .gap-stat { background: #1F1F1A; }
[data-coreui-theme="dark"] .rpt .detail-table thead tr { background: #1F1F1A; }
[data-coreui-theme="dark"] .rpt .sm-tip,
[data-coreui-theme="dark"] .rpt .donut-tip { background: #1F1F1A; box-shadow: 0 4px 14px rgba(0, 0, 0, .45); }
[data-coreui-theme="dark"] .rpt .sm-dot { border-color: #1A1A14; box-shadow: 0 2px 6px rgba(0, 0, 0, .45); }
[data-coreui-theme="dark"] .rpt .ai-btn:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .rpt .foco-red.active { border-color: rgba(239, 68, 68, .4); box-shadow: 0 0 0 3px rgba(239, 68, 68, .1); }
[data-coreui-theme="dark"] .rpt .foco-amber.active { border-color: rgba(245, 158, 11, .4); box-shadow: 0 0 0 3px rgba(245, 158, 11, .1); }
[data-coreui-theme="dark"] .rpt .gap-pill,
[data-coreui-theme="dark"] .rpt .verdict-pill,
[data-coreui-theme="dark"] .rpt .verdict-pill.sg-empty { background: #24241E; }
[data-coreui-theme="dark"] .rpt .teacher-name { color: #DDDDD6; }
[data-coreui-theme="dark"] .rpt .scale-track {
  background: linear-gradient(90deg, rgba(239, 68, 68, .24) 0%, rgba(245, 158, 11, .22) 55%, rgba(16, 185, 129, .24) 100%);
}
/* anillo base del donut (color en atributo del SVG) */
[data-coreui-theme="dark"] .rpt .donut svg circle[stroke="#eef1f6"] { stroke: #24241E; }
</style>
