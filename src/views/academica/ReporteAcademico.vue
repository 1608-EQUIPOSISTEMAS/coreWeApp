<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import DateRangePicker from '@/components/DateRangePicker.vue'
import { isoWeekOf } from '@/utils/isoWeek'
import { formatValue } from '@/shared/lib/formatValue.js'
import ReportBars from './report/ReportBars.vue'
import {
  outcomesChart, certificationChart, weeklySessionsChart, teachersChart, monthShort,
  goalTone, teachersAtGoal,
} from '@/features/reporte-academico/reportCharts.js'
import { criterionLabel } from '@/features/rubrica-auditoria/rubrica.js'

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
// Mismos pesos que AulaDetail.vue: si la formula consolidada cambia, ambos
// archivos deben moverse en sincronia con el SP del backend. La nota de la
// rubrica manual NO se calcula aca: llega ya sobre 20 desde el backend, que
// sabe con que version de rubrica se califico cada auditoria.
const NOTA_MAXIMA = 20
const CONSOLIDATED_WEIGHT_IA = 0.7
const CONSOLIDATED_WEIGHT_MANUAL = 0.3
// Meta institucional = umbral de BUENO en la rubrica (>= 17 sobre 20).
const META_20 = 17

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

// UTC-5 fijo (Peru no tiene horario de verano). toISOString() a secas pasaba
// a manana despues de las 19:00 de Lima y marcaba aulas como Finalizado antes.
function todayLima() {
  return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10)
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
        // Sin auditoria el backend manda null; Number(null) es 0 y el aula salia
        // "Deficiente" en vez de "Sin evaluar".
        const aiAvg20 = row.ai_avg_20 == null ? NaN : Number(row.ai_avg_20)
        const manualAvg20 = row.manual_avg_20 == null ? NaN : Number(row.manual_avg_20)
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

// =====================================================================
// RESULTADOS DEL ALUMNO (ultimos 6 meses; no depende del periodo elegido)
// =====================================================================
const outcomes = ref({ meses: [], tarjetas: [], esperando_certificado: [] })

async function loadOutcomes() {
  try {
    outcomes.value = await editionService.academicOutcomes()
  } catch (err) {
    console.error('Error cargando resultados del alumno:', err)
    toast.error('No se pudieron cargar aprobados y certificados')
  }
}


onMounted(() => {
  loadReport()
  loadFollowup()
  loadOutcomes()
  loadAuditGoal()
})

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
    })),
)

function toggleFoco(key) {
  activeFoco.value = activeFoco.value === key ? null : key
}

// Si el foco activo se queda sin aulas (cambio de periodo/filtros), lo soltamos
// para no dejar la tabla vacia con un estado invisible.
watch([focos, periodAulas], () => {
  if (activeFoco.value && !focos.value.some((f) => f.key === activeFoco.value && f.count > 0)) {
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

  return rows
})

// =====================================================================
// SEGUIMIENTO DOCENTES — matriz semana x sesion
// =====================================================================
// El agregado por aula responde "que tan buena es el aula"; esta matriz
// responde "que sesion, de que semana, llego con auditoria". El cronograma
// S1..Sn lo deriva el backend (mismo motor del Control de Ediciones) porque
// depende de feriados y de las reprogramaciones, que no viajan en el reporte.
const sessionsByEdition = ref(new Map())

async function loadFollowup() {
  try {
    const data = await editionService.teacherFollowup({
      date_start: period.value.start,
      date_end: period.value.end,
    })
    sessionsByEdition.value = new Map(
      (data?.editions || []).map((e) => [Number(e.edition_num_id), e.sessions || []]),
    )
  } catch (err) {
    // El resto del reporte sigue siendo utilizable sin la matriz, asi que no
    // tumbamos la vista; el error igual queda visible para no depurar a ciegas.
    console.error('Error cargando el seguimiento por sesion:', err)
    sessionsByEdition.value = new Map()
  }
}

watch(() => [period.value.start, period.value.end], loadFollowup)

function dayMonth(ymd) {
  if (!ymd) return ''
  const [, m, d] = String(ymd).slice(0, 10).split('-')
  return `${Number(d)}/${Number(m)}`
}

// Iconos de gestion del Control de Ediciones. Sin marcar no es "no dictada":
// es "sin gestionar", y por eso lleva su propio simbolo neutro.
const SESSION_STATUS_ICON = { A: 'fa-check', T: 'fa-clock', R: 'fa-rotate' }
const SESSION_STATUS_LABEL = { A: 'dictada', T: 'con tardanza', R: 'reprogramada' }

// La matriz es un calendario: manda la fecha de inicio, no la criticidad
// (que es el criterio de `sorted`, el que alimenta export y decisiones).
const chronological = computed(() =>
  [...filtered.value].sort(
    (a, b) =>
      (a.startDate || '').localeCompare(b.startDate || '') ||
      a.name.localeCompare(b.name, 'es'),
  ),
)

function sessionsOf(aula) {
  return sessionsByEdition.value.get(Number(aula.id)) || []
}

// Ancho de la matriz = curso mas largo de la pagina. Cada aula pinta solo sus
// sesiones y deja el resto de su fila en blanco.
const sessionColumns = computed(() => {
  const max = paged.value.reduce(
    (n, a) => Math.max(n, sessionsOf(a).length, a.sessionsTotal || 0),
    0,
  )
  return Array.from({ length: max }, (_, i) => i + 1)
})

function sessionCell(aula, n) {
  const s = sessionsOf(aula)[n - 1]
  if (!s) return null
  const note = consolidatedScore(s.ai_20, s.manual_20)
  const audited = note != null
  return {
    date: dayMonth(s.date),
    status: s.status,
    icon: SESSION_STATUS_ICON[s.status] || 'fa-minus',
    audited,
    note,
    noteClass: score20Class(note),
    title: `S${n} · ${s.date} · ${SESSION_STATUS_LABEL[s.status] || 'sin gestionar'}` +
      (audited ? ` · ${fmt20(note)}/20` : ' · sin auditoría'),
  }
}

// Filas agrupadas por semana ISO de inicio, en el orden en que ya vienen
// (cronologico), asi cada grupo es un bloque contiguo con su rowspan.
const weekGroups = computed(() => {
  const cols = sessionColumns.value
  const groups = []
  let current = null
  for (const a of paged.value) {
    const wk = a.startDate ? isoWeekOf(a.startDate) : null
    const key = wk ? wk.key : 'sin-fecha'
    if (!current || current.key !== key) {
      current = {
        key,
        label: wk ? `SEM ${wk.week}` : 'SIN FECHA',
        range: wk ? `${dayMonth(wk.monday)} - ${dayMonth(wk.sunday)}` : '',
        rows: [],
      }
      groups.push(current)
    }
    const cells = cols.map((n) => sessionCell(a, n))
    current.rows.push({
      aula: a,
      cells,
      audited: cells.filter((c) => c?.audited).length,
      scheduled: cells.filter(Boolean).length,
    })
  }
  return groups
})

// =====================================================================
// PAGINACION DEL DETALLE
// =====================================================================
// OJO con el orden: watch(filtered) evalua `filtered` inmediatamente en el
// setup, y su cadena toca periodAulas y focoPredicates. Este bloque debe
// vivir DESPUES de esas declaraciones o revienta con TDZ (pagina en blanco).
const PAGE_SIZE = 12
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(chronological.value.length / PAGE_SIZE)))
const paged = computed(() =>
  chronological.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
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
  const n = chronological.value.length
  if (!n) return ''
  const from = (page.value - 1) * PAGE_SIZE + 1
  const to = Math.min(page.value * PAGE_SIZE, n)
  return `${from}–${to} de ${n} aulas`
})

// =====================================================================
// INFORME DE UNA PAGINA (banda + graficos). Las reglas viven en
// features/reporte-academico/reportCharts.js; aqui solo se conectan los datos.
// =====================================================================
const tarjeta = (clave) => outcomes.value.tarjetas.find((t) => t.clave === clave)

// Ultimo mes con resultados: el mes en curso suele estar vacio hasta que los
// docentes cargan notas, y un "0 aprobados" ahi solo asusta.
const lastResultMonth = computed(() => outcomes.value.meses.find((m) => m.evaluados > 0) || null)

const sinEvaluar = computed(() => focos.value.find((f) => f.key === 'activas-sin-evaluar')?.count || 0)

// "30 Ago – 28 Set 2026": el periodo se lee en la banda, sin abrir el calendario.
const periodLabel = computed(() => {
  const f = (ymd) => `${Number(ymd.slice(8, 10))} ${monthShort(ymd.slice(0, 7))}`
  return `${f(period.value.start)} – ${f(period.value.end)} ${period.value.end.slice(0, 4)}`
})

const headlineCards = computed(() => [
  { label: 'aulas en el periodo', valor: kpis.value.total || 0, icono: 'fa-chalkboard-user', tono: '' },
  {
    label: lastResultMonth.value ? `aprobados en ${monthShort(lastResultMonth.value.mes)}` : 'aprobados',
    valor: lastResultMonth.value?.aprobados ?? 0,
    icono: 'fa-user-check',
    tono: 'ok',
  },
  { label: 'aprobados sin certificado', valor: tarjeta('sin_certificado')?.valor || 0, icono: 'fa-award', tono: 'warn' },
  { label: 'aulas en riesgo', valor: kpis.value.atRisk || 0, icono: 'fa-triangle-exclamation', tono: 'bad' },
  { label: 'aulas en curso sin auditar', valor: sinEvaluar.value, icono: 'fa-eye-slash', tono: 'warn' },
])

const outcomesData = computed(() => outcomesChart(outcomes.value.meses))
const outcomesFoot = computed(() => {
  const m = lastResultMonth.value
  if (!m) return 'Todavía no hay notas finales cargadas.'
  const tasa = m.tasa_aprobacion == null
    ? `base insuficiente para una tasa (${m.evaluados} evaluados, mín. 30)`
    : `tasa de aprobación ${formatValue(m.tasa_aprobacion, 'pct')}`
  return `${monthShort(m.mes)}: ${m.aprobados} de ${m.evaluados} aprobaron · ${tasa}. Sin entrega final = jalado a los 7 días del cierre.`
})

const certData = computed(() => certificationChart(outcomes.value.meses))
const waiting = computed(() => outcomes.value.esperando_certificado || [])

const weeklyData = computed(() => weeklySessionsChart(
  [...sessionsByEdition.value.values()],
  { start: period.value.start, end: period.value.end, today: todayLima() },
))
const weeklyFoot = computed(() => {
  const [prog, dict, aud] = weeklyData.value.series.map((s) => s.datos.reduce((x, y) => x + y, 0))
  return `${dict} de ${prog} sesiones programadas figuran como dictadas; ${aud} tienen auditoría.`
})

const teachersData = computed(() => teachersChart(docenteStats.value))

// =====================================================================
// OBJETIVOS DEL AREA (plan 2026) que el ERP puede medir. NPS, satisfaccion y
// resenas viven en Nexus: aqui solo certificacion (85 %) y auditoria (18).
// =====================================================================
const CERT_TONE_MARGIN = 15 // puntos % bajo la meta que todavia son "atencion"
const AUDIT_TONE_MARGIN = 1 // puntos /20 bajo la meta que todavia son "atencion"

const certGoal = computed(() => outcomes.value.objetivo_certificacion || null)
const certTone = computed(() => goalTone(certGoal.value?.tasa, certGoal.value?.meta, CERT_TONE_MARGIN))

const auditGoal = ref({ meta: 18, auditorias_periodo: 0, ventana: null, criterios: [] })
async function loadAuditGoal() {
  try {
    auditGoal.value = await editionService.auditObjective({ date_start: period.value.start, date_end: period.value.end })
  } catch (err) {
    console.error('Error cargando el objetivo de auditoria:', err)
    toast.error('No se pudo cargar el objetivo de auditoría')
  }
}
watch(() => [period.value.start, period.value.end], loadAuditGoal)

const auditTone = computed(() => goalTone(kpis.value.avg20, auditGoal.value.meta, AUDIT_TONE_MARGIN))
const teachersGoal = computed(() => teachersAtGoal(docenteStats.value, auditGoal.value.meta))
// Solo los criterios que de verdad restan; uno cumplido siempre no es accion.
const weakCriteria = computed(() => auditGoal.value.criterios.filter((c) => c.aporte > 0).slice(0, 5))

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
  <div class="ds-page rpt">
    <!-- ============ BANDA: titulo, periodo y lo urgente ============ -->
    <header class="band">
      <div>
        <span class="band-eyebrow">Académica · Informe del periodo</span>
        <h1 class="band-title">Informe académico <span class="band-period">· {{ periodLabel }}</span></h1>
      </div>
      <DateRangePicker v-model="period" />
    </header>

    <div class="headline">
      <div v-for="c in headlineCards" :key="c.label" class="ds-kpi">
        <span class="ds-kpi-icon" :class="c.tono" aria-hidden="true"><i class="fa-solid" :class="c.icono"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ formatValue(c.valor, 'num') }}</span>
          <span class="ds-kpi-label">{{ c.label }}</span>
        </div>
      </div>
    </div>

    <!-- ============ OBJETIVOS DEL AREA ============ -->
    <div class="ds-row ds-row--mitad">
      <article v-if="certGoal" class="ds-panel">
        <h2 class="panel-band">Objetivo · {{ certGoal.meta }} % de alumnos certificados</h2>
        <div class="ds-panel-body">
          <div class="goal">
            <strong class="goal-value" :class="certTone">{{ formatValue(certGoal.tasa, 'pct') }}</strong>
            <span class="goal-of">meta {{ certGoal.meta }} %</span>
          </div>
          <div class="goal-bar" role="img" :aria-label="`Certificación ${certGoal.tasa ?? 0}% de ${certGoal.meta}%`">
            <i :class="certTone" :style="{ width: Math.min(certGoal.tasa || 0, 100) + '%' }"></i>
            <b :style="{ left: certGoal.meta + '%' }"></b>
          </div>
          <p class="goal-note">
            {{ formatValue(certGoal.certificados, 'num') }} de {{ formatValue(certGoal.evaluados, 'num') }} alumnos que terminaron en los últimos 6 meses
            tienen certificado<template v-if="certGoal.faltan"> · faltan <b>{{ formatValue(certGoal.faltan, 'num') }}</b> para la meta</template>.
          </p>
          <table v-if="certGoal.programas_bajos.length" class="ds-table panel-table">
            <caption class="panel-table-caption">Programas que menos certifican</caption>
            <tbody>
              <tr v-for="p in certGoal.programas_bajos" :key="p.programa">
                <td>{{ p.programa }}</td>
                <td class="nowrap">{{ formatValue(p.certificados, 'num') }} de {{ formatValue(p.evaluados, 'num') }}</td>
                <td class="num bad">{{ formatValue(p.tasa, 'pct') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="ds-panel">
        <h2 class="panel-band">Objetivo · auditoría promedio {{ auditGoal.meta }}</h2>
        <div class="ds-panel-body">
          <div class="goal">
            <strong class="goal-value" :class="auditTone">{{ fmt20(kpis.avg20) }}</strong>
            <span class="goal-of">/20 · meta {{ auditGoal.meta }}</span>
          </div>
          <div class="goal-bar" role="img" :aria-label="`Promedio de auditoría ${fmt20(kpis.avg20)} de ${auditGoal.meta}`">
            <i :class="auditTone" :style="{ width: ((kpis.avg20 || 0) / 20) * 100 + '%' }"></i>
            <b :style="{ left: (auditGoal.meta / 20) * 100 + '%' }"></b>
          </div>
          <p class="goal-note">
            <b>{{ teachersGoal.alcanzan }}</b> de {{ teachersGoal.evaluados }} docentes auditados ya promedian
            {{ auditGoal.meta }} o más.
          </p>
          <table v-if="weakCriteria.length" class="ds-table panel-table">
            <caption class="panel-table-caption">
              Criterios que más restan al promedio
              <span v-if="auditGoal.ventana?.ampliada" class="goal-window">
                · últimos 90 días ({{ auditGoal.auditorias_periodo }} auditorías manuales en el periodo, muy pocas para medir)
              </span>
            </caption>
            <tbody>
              <tr v-for="c in weakCriteria" :key="c.key">
                <td>{{ criterionLabel(c.key) }}</td>
                <td class="nowrap">se cumple en {{ formatValue(c.pct, 'pct') }}</td>
                <td class="num ok" :title="`Si se cumpliera siempre, el promedio subiría ${c.aporte} puntos`">+{{ c.aporte }} pts</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="ds-callout warn goal-empty">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>Sin auditorías manuales de rúbrica en los últimos 90 días: sin ellas no se sabe qué criterio corregir para llegar a {{ auditGoal.meta }}.</span>
          </p>
        </div>
      </article>
    </div>

    <!-- ============ GRAFICOS (2 columnas) ============ -->
    <div class="ds-row ds-row--mitad">
      <article v-if="outcomesData.categorias.length" class="ds-panel">
        <h2 class="panel-band">Resultados del alumno por mes</h2>
        <div class="ds-panel-body">
          <ReportBars :grafico="outcomesData" titulo="Aprobados, jalados por nota y sin entrega final por mes" apilado />
        </div>
        <p class="ds-panel-foot">{{ outcomesFoot }}</p>
      </article>

      <article v-if="weeklyData.categorias.length" class="ds-panel">
        <h2 class="panel-band">Sesiones por semana</h2>
        <div class="ds-panel-body">
          <ReportBars :grafico="weeklyData" titulo="Sesiones programadas, dictadas y auditadas por semana" />
        </div>
        <p class="ds-panel-foot">{{ weeklyFoot }}</p>
      </article>

      <article v-if="certData.categorias.length" class="ds-panel">
        <h2 class="panel-band">Certificación</h2>
        <div class="ds-panel-body">
          <ReportBars :grafico="certData" titulo="Aprobados y certificados emitidos por mes" :alto="170" />
          <table v-if="waiting.length" class="ds-table panel-table">
            <caption class="panel-table-caption">Los que más esperan su certificado</caption>
            <tbody>
              <tr v-for="w in waiting" :key="w.alumno + w.aula">
                <td>{{ w.alumno }}</td>
                <td>{{ w.aula }}</td>
                <td class="num bad">{{ formatValue(w.dias, 'num') }} días</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article v-if="teachersData.categorias.length" class="ds-panel">
        <h2 class="panel-band">Calidad por docente</h2>
        <div class="ds-panel-body">
          <ReportBars :grafico="teachersData" titulo="Docentes con el promedio de auditoría más bajo" horizontal :meta="auditGoal.meta" />
        </div>
        <p class="ds-panel-foot">
          Los 5 promedios más bajos del periodo (/20). Línea punteada = objetivo {{ auditGoal.meta }}.
          Promedio de todas las aulas: {{ fmt20(kpis.avg20) }}.
        </p>
      </article>
    </div>

    <!-- ============ TABLA DETALLE (filtros + tabla en un solo panel) ============ -->
    <div class="ds-panel">
      <h2 class="panel-band">Detalle por aula · Auditorías por sesión</h2>
      <div class="table-filters">
        <div class="filter-row">
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
              :disabled="!f.count"
              @click="toggleFoco(f.key)"
            >
              <i class="fa-solid" :class="f.icon"></i>
              <span class="foco-count">{{ f.count }}</span>
              <span class="foco-label">{{ f.label }}</span>
            </button>
          </div>
        </div>
        <div class="filter-row filter-row-2">
          <div class="ds-tabs" role="group" aria-label="Estado del aula">
            <button
              v-for="s in filterStates"
              :key="s"
              type="button"
              :aria-pressed="String(filterStatus === s)"
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
      <div class="ds-table-scroll">
        <table class="detail-table fu-table">
          <thead>
            <tr class="fu-grouprow">
              <th class="th-first" colspan="5">DATOS</th>
              <th class="fu-gr-audit" :colspan="Math.max(1, sessionColumns.length)">
                AUDITORÍAS POR SESIÓN
              </th>
            </tr>
            <tr>
              <th class="th-first fu-th-week">SEMANA</th>
              <th>F. INICIO</th>
              <th>CURSO</th>
              <th>DOCENTE</th>
              <th class="th-center">AUDIT.</th>
              <th v-for="n in sessionColumns" :key="n" class="th-center fu-th-s">S{{ n }}</th>
              <th v-if="!sessionColumns.length" class="th-center">—</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td :colspan="5 + Math.max(1, sessionColumns.length)" class="state-msg">
                <i class="fa-solid fa-spinner fa-spin"></i> Cargando reporte...
              </td>
            </tr>
            <tr v-else-if="!chronological.length">
              <td :colspan="5 + Math.max(1, sessionColumns.length)" class="state-msg">
                <i class="fa-regular fa-folder-open"></i>
                Ninguna aula coincide con los filtros aplicados.
              </td>
            </tr>
            <template v-else>
              <template v-for="g in weekGroups" :key="g.key">
                <tr
                  v-for="(r, i) in g.rows"
                  :key="r.aula.id"
                  class="row-clickable"
                  @click="openAula(r.aula.id)"
                >
                  <td v-if="i === 0" :rowspan="g.rows.length" class="td-first fu-week">
                    <span class="fu-week-num">{{ g.label }}</span>
                    <span class="fu-week-range">{{ g.range }}</span>
                  </td>
                  <td class="fu-date">{{ dayMonth(r.aula.startDate) || '--' }}</td>
                  <td>
                    <div class="aula-cell">
                      <span class="aula-name">{{ r.aula.name }}</span>
                      <span class="aula-edition">{{ r.aula.code }} · {{ r.aula.edition }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="teacher-cell">
                      <span class="avatar">{{ r.aula.teacherInitials }}</span>
                      <span class="teacher-name">{{ r.aula.teacher }}</span>
                    </div>
                  </td>
                  <td class="td-center">
                    <span
                      class="fu-cov"
                      :class="{ on: r.audited > 0 }"
                      :title="`${r.audited} de ${r.scheduled || r.aula.sessionsTotal} sesiones con auditoría`"
                    >{{ r.audited }}/{{ r.scheduled || r.aula.sessionsTotal }}</span>
                  </td>
                  <td
                    v-for="(c, k) in r.cells"
                    :key="k"
                    class="fu-cell"
                    :class="{ 'fu-on': c?.audited, 'fu-off': c && !c.audited }"
                    :title="c?.title"
                  >
                    <template v-if="c">
                      <span class="fu-c-date">{{ c.date }}</span>
                      <span v-if="c.audited" class="fu-c-note" :class="c.noteClass">
                        {{ fmt20(c.note) }}
                      </span>
                      <span v-else class="fu-c-flag" :class="`fu-st-${c.status || 'none'}`">
                        <i class="fa-solid" :class="c.icon"></i>
                      </span>
                    </template>
                  </td>
                  <td v-if="!r.cells.length" class="fu-cell fu-nosched">sin cronograma</td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
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
        Semana ISO de inicio del curso · fecha de cada sesión con su
        reprogramación aplicada. Nota = {{ Math.round(CONSOLIDATED_WEIGHT_IA * 100) }}% IA +
        {{ Math.round(CONSOLIDATED_WEIGHT_MANUAL * 100) }}% rúbrica manual, meta
        {{ META_20.toFixed(1) }} / 20. Sin nota = sesión sin auditoría
        (<i class="fa-solid fa-check"></i> dictada ·
        <i class="fa-solid fa-rotate"></i> reprogramada ·
        <i class="fa-solid fa-clock"></i> tardanza ·
        <i class="fa-solid fa-minus"></i> sin gestionar).
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Informe de una página (DESIGN_SYSTEM §5.2.2): banda + grilla de paneles con
   cabecera de color. Solo tokens --ds-*: el navy de marca no cambia con el tema
   y el resto sí, así que la vista no lleva bloque oscuro propio. */
.rpt {
  font-family: Inter, 'Hanken Grotesk', -apple-system, system-ui, sans-serif;
  font-size: 14px;
  /* Mismo ancho que fico/inscripciones (EnrollmentPage) */
  max-width: 1600px;
  margin: 0 auto;
}

.band {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 16px 24px;
  background: var(--ds-brand); color: var(--ds-on-brand); border-radius: var(--ds-radius);
}
.band-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .75; }
.band-title { margin: 2px 0 0; font-size: 24px; font-weight: 800; color: var(--ds-on-brand); }
.band-period { font-weight: 500; opacity: .8; }
/* 5 cifras a todo el ancho (ds-kpi del sistema); pasan a 2-3 por fila en pantallas chicas. */
.headline { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--ds-gap); }
@media (max-width: 1100px) { .headline { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); } }

.panel-band {
  margin: 0; padding: 10px 16px; text-align: center;
  font-size: 15px; font-weight: 700; color: var(--ds-on-brand); background: var(--ds-brand);
}

/* Objetivos: la cifra contra la meta es lo único grande del panel. */
.goal { display: flex; align-items: baseline; gap: 10px; }
.goal-value { font-size: 44px; font-weight: 800; line-height: 1; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.goal-value.ok { color: var(--ds-ok-ink); }
.goal-value.warn { color: var(--ds-warn-ink); }
.goal-value.bad { color: var(--ds-bad-ink); }
.goal-of { font-size: 14px; font-weight: 600; color: var(--ds-ink-2); }
.goal-bar { position: relative; height: 10px; margin: 12px 0 10px; border-radius: 5px; background: var(--ds-surface-3); }
.goal-bar > i { display: block; height: 100%; border-radius: 5px; background: var(--ds-accent); }
.goal-bar > i.ok { background: var(--ds-ok); }
.goal-bar > i.warn { background: var(--ds-warn); }
.goal-bar > i.bad { background: var(--ds-bad); }
/* Marca de la meta sobre la barra. */
.goal-bar > b { position: absolute; top: -4px; width: 3px; height: 18px; margin-left: -1px; border-radius: 2px; background: var(--ds-ink); }
.goal-note { margin: 0 0 6px; font-size: 13px; color: var(--ds-ink-2); }
.goal-note b { color: var(--ds-ink); }
.goal-window { font-weight: 500; text-transform: none; letter-spacing: 0; }
.goal-empty { margin-top: 10px; }

/* Tablas cortas dentro de un panel (ds-table) con su título como caption. */
.panel-table { margin-top: 8px; }
.panel-table-caption { caption-side: top; text-align: left; padding: 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ds-muted); }
.nowrap { white-space: nowrap; }

/* Colores semanticos por nota (misma rubrica 19/17/15) */
.sg-good  { color: var(--ds-ok-ink); }
.sg-ok    { color: var(--ds-accent); }
.sg-warn  { color: var(--ds-warn-ink); }
.sg-bad   { color: var(--ds-bad-ink); }
.sg-empty { color: var(--ds-ink-2); }

.teacher-cell { display: flex; align-items: center; gap: 10px; }
.avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 50%; flex: 0 0 auto;
  background: var(--ds-brand); color: var(--ds-on-brand); font-size: 11px; font-weight: 700;
}

/* ============ FOCOS (chips "requieren atencion" en el header del detalle) ============ */
.foco {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 13px 7px 11px; border-radius: 999px;
  border: 1px solid var(--ds-border); background: var(--ds-surface); cursor: pointer;
  font-size: 12.5px; color: var(--ds-ink-2); font-weight: 600;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.foco:hover { background: var(--ds-surface-2); }
/* En 0 el foco se ve (el director sabe que se revisó) pero no filtra nada. */
.foco:disabled { opacity: .45; cursor: default; }
.foco:disabled:hover { background: transparent; }
.foco i { font-size: 11px; }
.foco-count { font-weight: 800; font-variant-numeric: tabular-nums; }
.foco-label { color: var(--ds-ink-2); font-weight: 500; }
.foco-red i, .foco-red .foco-count { color: var(--ds-bad-ink); }
.foco-amber i, .foco-amber .foco-count { color: var(--ds-warn-ink); }
/* color-mix en vez de un hex: el borde suave sale del mismo token y sigue al tema. */
.foco-red.active {
  background: var(--ds-soft-bad); border-color: color-mix(in srgb, var(--ds-bad) 35%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-bad) 8%, transparent);
}
.foco-red.active .foco-label { color: var(--ds-bad-ink); }
.foco-amber.active {
  background: var(--ds-soft-warn); border-color: color-mix(in srgb, var(--ds-warn) 35%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-warn) 8%, transparent);
}
.foco-amber.active .foco-label { color: var(--ds-warn-ink); }

/* ============ FILTROS (dentro del panel de la tabla) ============ */
.table-filters { padding: 14px 18px; border-bottom: 1px solid var(--ds-border); }
.filter-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.filter-row-2 { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--ds-border); }
.filter-tabs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.v-tab {
  padding: 7px 12px; border-radius: 8px; border: none;
  font-size: 13px; font-weight: 700; cursor: pointer;
  background: var(--ds-surface-2); color: var(--ds-ink-2); transition: background .15s;
}
.v-tab:hover { background: var(--ds-surface-3); }
.v-tab.active { background: var(--ds-brand); color: var(--ds-on-brand); }
.spacer { flex: 1; }
.chip-count {
  margin-left: 4px; padding: 1px 6px; border-radius: 999px;
  font-size: 10.5px; color: var(--ds-muted); background: var(--ds-surface-3);
}
/* Sobre el navy del estado elegido: blanco translúcido, igual en los dos temas. */
[aria-pressed="true"] > .chip-count { color: var(--ds-on-brand); background: rgba(255, 255, 255, .18); }
.select, .input {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--ds-border); border-radius: 8px;
  padding: 7px 10px; background: var(--ds-surface); font-size: 13px; color: var(--ds-muted);
}
.input { min-width: 230px; }
.select select, .input input {
  border: none; outline: none; font-size: 13px;
  background: transparent; color: var(--ds-ink);
}
.select select { cursor: pointer; max-width: 200px; }
.input input { flex: 1; }
.input input::placeholder { color: var(--ds-muted); }

/* ============ PAGINACION ============ */
.table-pager {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 18px; border-top: 1px solid var(--ds-border);
}
.pager-info { font-size: 12.5px; color: var(--ds-muted); }
.pager-controls { display: flex; align-items: center; gap: 4px; }
.pager-btn {
  min-width: 32px; height: 32px; padding: 0 8px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--ds-border); border-radius: 8px; background: var(--ds-surface);
  font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2);
  cursor: pointer; transition: background .15s;
}
.pager-btn:hover:not(:disabled) { background: var(--ds-surface-2); }
.pager-btn:disabled { opacity: .45; cursor: default; }
.pager-num.active { background: var(--ds-brand); border-color: var(--ds-brand); color: var(--ds-on-brand); }

/* ============ TABLA DETALLE ============
   Propia y no ds-table: por el rowspan de la semana, la primera celda de cada
   fila no es siempre la misma columna (ds-table resalta td:first-child). */
.detail-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.detail-table thead tr {
  background: var(--ds-surface-2); color: var(--ds-muted);
  font-size: 11px; letter-spacing: .05em; text-align: left;
}
.detail-table th { padding: 14px 8px; font-weight: 700; }
.detail-table .th-first { padding-left: 18px; }
.detail-table .th-center { text-align: center; }
.detail-table td { padding: 15px 8px; border-top: 1px solid var(--ds-border); }
.detail-table .td-first { padding-left: 18px; }
.detail-table .td-center { text-align: center; }
.row-clickable { cursor: pointer; transition: background .15s; }
.row-clickable:hover { background: var(--ds-surface-2); }

.aula-cell { display: flex; flex-direction: column; gap: 1px; }
.aula-name { font-weight: 700; color: var(--ds-heading); }
.aula-edition { font-size: 12px; color: var(--ds-muted); }
.teacher-name { font-weight: 600; color: var(--ds-ink); }
.state-msg {
  text-align: center; padding: 36px 12px !important; font-size: 13px; color: var(--ds-muted);
}
.state-msg i { margin-right: 6px; }
.table-foot {
  padding: 14px 18px; font-size: 12px; color: var(--ds-muted);
  border-top: 1px solid var(--ds-border);
}

/* ============ MATRIZ SEGUIMIENTO DOCENTES ============ */
/* La matriz crece con el curso mas largo de la pagina: scroll horizontal
   propio (ds-table-scroll) para que el body de la vista nunca se desborde. */
.fu-table { min-width: 100%; }
.fu-table th, .fu-table td { white-space: nowrap; }
.fu-grouprow th {
  padding: 8px; border-bottom: 1px solid var(--ds-border);
  font-size: 10px; letter-spacing: .12em; text-align: center;
}
.fu-grouprow .th-first { text-align: left; }
.fu-gr-audit { color: var(--ds-accent); }
.fu-th-week { width: 108px; }
.fu-th-s { min-width: 62px; }
.fu-table td { padding: 10px 8px; vertical-align: middle; }

/* Cabecera de semana: una celda con rowspan por bloque, como el Sheet. */
.fu-week {
  background: var(--ds-surface-2); border-left: 3px solid var(--ds-heading);
  text-align: center; line-height: 1.25;
}
.fu-week-num { display: block; font-weight: 800; color: var(--ds-heading); font-size: 13px; }
.fu-week-range { display: block; font-size: 11px; color: var(--ds-muted); }
.fu-date { font-weight: 700; color: var(--ds-ink-2); font-variant-numeric: tabular-nums; }

.fu-cov {
  display: inline-block; padding: 2px 8px; border-radius: 6px;
  font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums;
  background: var(--ds-surface-3); color: var(--ds-ink-2);
}
.fu-cov.on { background: var(--ds-soft-info); color: var(--ds-info-ink); }

.fu-cell { text-align: center; line-height: 1.2; }
.fu-c-date { display: block; font-size: 11px; color: var(--ds-muted); font-variant-numeric: tabular-nums; }
.fu-c-note {
  display: block; margin-top: 2px; font-weight: 800; font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.fu-c-flag { display: block; margin-top: 2px; font-size: 11px; color: var(--ds-muted); }
.fu-st-A { color: var(--ds-ok); }
.fu-st-R { color: var(--ds-warn); }
.fu-st-T { color: var(--ds-bad); }
.fu-on { background: var(--ds-soft-info); }
.fu-nosched { font-size: 12px; color: var(--ds-muted); font-style: italic; }
</style>
