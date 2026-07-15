<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apexchart from 'vue3-apexcharts'
import { ServiceKeys } from '@/services'
import DateRangePicker from '@/components/DateRangePicker.vue'

const editionService = inject(ServiceKeys.Edition)
const catalog = inject('catalog')
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
    const courseTypeId = (catalog?.options?.('we_program_type') || [])
      .find((o) => o.alias === 'we_program_type_course')?.id

    // Fetch sin filtro de active: permite seleccionar periodos historicos
    // (aulas finalizadas) sin volver a llamar al backend al cambiar el rango.
    const { items } = await editionService.editionList({
      active: null,
      page: 1,
      size: 500,
      type_program_ids: courseTypeId ? [{ value: courseTypeId }] : [],
    })

    // Excluimos A5 (cancelados) igual que en Aulas.vue para mantener consistencia.
    const baseRows = (Array.isArray(items) ? items : [])
      .filter((row) => String(row?.cat_segment || '').toUpperCase() !== 'A5')
      .map((row) => ({
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
      }))

    const editionIds = baseRows.map((r) => r.id).filter(Number.isFinite)
    if (!editionIds.length) {
      aulas.value = []
      return
    }

    const summary = await editionService.classroomAuditSummaryList({
      edition_ids: editionIds,
    })

    const summaryById = Object.fromEntries(
      (summary || []).map((s) => [s.edition_num_id, s]),
    )

    aulas.value = baseRows.map((r) => {
      const s = summaryById[r.id] || {}
      const aiAvg20 = Number(s.ai_avg_20)
      const manualAvg20 = Number(s.manual_avg_20)
      const ai = Number.isFinite(aiAvg20) ? aiAvg20 : null
      const man = Number.isFinite(manualAvg20) ? manualAvg20 : null
      const consolidated = consolidatedScore(ai, man)
      return {
        ...r,
        sessionsAi: Number(s.sessions_ai) || 0,
        sessionsManual: Number(s.sessions_manual) || 0,
        aiAvg20: ai,
        manualAvg20: man,
        consolidated20: consolidated,
        verdict: score20Label(consolidated),
        verdictClass: score20Class(consolidated),
        lastActivityAt: s.last_activity_at || null,
        lastActivityRel: formatRelative(s.last_activity_at),
        hasAudit: (Number(s.sessions_ai) || 0) + (Number(s.sessions_manual) || 0) > 0,
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
const filterVerdict = ref('Todos')
const filterDocente = ref('')
const query = ref('')
// Foco activo: senal accionable seleccionada desde la banda superior.
// Compone con el resto de filtros (no los reemplaza).
const activeFoco = ref(null)

const filterStates = ['Todos', 'Activo', 'Proximo', 'Finalizado']
const verdictFilters = ['Todos', 'DEFICIENTE', 'EN PROCESO', 'BUENO', 'EXCELENTE', 'SIN EVALUAR']

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
    .filter((a) => filterVerdict.value === 'Todos' || a.verdict === filterVerdict.value)
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
  if (diff === 0) return { value: 0, class: 'd-flat', arrow: '' }
  const isUp = diff > 0
  const isGood = betterWhen === 'up' ? isUp : !isUp
  return {
    value: diff,
    class: isGood ? 'd-good' : 'd-bad',
    arrow: isUp ? '↑' : '↓',
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

const donutSeries = computed(() => {
  const c = verdictDistribution.value
  return [c.EXCELENTE, c.BUENO, c['EN PROCESO'], c.DEFICIENTE, c['SIN EVALUAR']]
})

const donutOptions = computed(() => ({
  chart: {
    type: 'donut',
    fontFamily: 'inherit',
    toolbar: { show: false },
  },
  labels: ['Excelente', 'Bueno', 'En proceso', 'Deficiente', 'Sin evaluar'],
  colors: ['#047857', '#1D4ED8', '#B45309', '#B91C1C', '#A0A099'],
  stroke: { width: 2, colors: ['#fff'] },
  legend: {
    position: 'right',
    fontSize: '12px',
    fontWeight: 500,
    markers: { width: 10, height: 10, radius: 10 },
    itemMargin: { horizontal: 4, vertical: 4 },
    formatter: (label, opts) => {
      const val = opts.w.globals.series[opts.seriesIndex] || 0
      return `${label}<span style="color:#A0A099;margin-left:6px">${val}</span>`
    },
  },
  dataLabels: {
    enabled: true,
    formatter: (val, opts) => opts.w.globals.series[opts.seriesIndex] || '',
    style: { fontSize: '11px', fontWeight: 700, colors: ['#fff'] },
    dropShadow: { enabled: false },
  },
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          name: { fontSize: '11px', color: '#6F6F66', offsetY: 18 },
          value: {
            fontSize: '24px', fontWeight: 700, color: '#14140F', offsetY: -16,
            formatter: (v) => Number(v).toString(),
          },
          total: {
            show: true,
            label: 'Aulas en periodo',
            color: '#6F6F66',
            fontSize: '11px',
            fontWeight: 600,
            formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
          },
        },
      },
    },
  },
  tooltip: { y: { formatter: (v) => `${v} aula${v === 1 ? '' : 's'}` } },
  responsive: [
    { breakpoint: 900, options: { legend: { position: 'bottom' } } },
  ],
}))

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
const DIST_ORDER = [
  ['EXCELENTE', 'sg-good'],
  ['BUENO', 'sg-ok'],
  ['EN PROCESO', 'sg-warn'],
  ['DEFICIENTE', 'sg-bad'],
  ['SIN EVALUAR', 'sg-empty'],
]

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
        dist: { EXCELENTE: 0, BUENO: 0, 'EN PROCESO': 0, DEFICIENTE: 0, 'SIN EVALUAR': 0 },
      }
      map.set(name, d)
    }
    d.total += 1
    if (a.hasAudit) d.evaluated += 1
    if (a.verdict === 'DEFICIENTE' || a.verdict === 'EN PROCESO') d.atRisk += 1
    if (a.verdict === 'BUENO' || a.verdict === 'EXCELENTE') d.good += 1
    if (Number.isFinite(a.consolidated20)) d.scores.push(a.consolidated20)
    d.dist[a.verdict] = (d.dist[a.verdict] || 0) + 1
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
      segments: DIST_ORDER
        .map(([k, cls]) => ({ key: k, cls, pct: (d.dist[k] / d.total) * 100 }))
        .filter((s) => s.pct > 0),
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
  <div class="reporte-shell">
    <header class="page-head">
      <div class="titles">
        <div class="eyebrow">Academica</div>
        <h1>Reporte Academico</h1>
        <div class="subtitle">
          Auditoria consolidada por periodo — IA + rubrica manual
        </div>
      </div>
      <div class="actions">
        <DateRangePicker v-model="period" />
        <button
          class="btn"
          :disabled="isLoading || !sorted.length"
          title="Exportar la tabla filtrada a CSV"
          @click="exportCsv"
        >
          <i class="fa-solid fa-file-arrow-down"></i>
          Exportar
        </button>
        <button class="btn" :disabled="isLoading" @click="loadReport">
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': isLoading }"></i>
          Sincronizar
        </button>
      </div>
    </header>

    <!-- Banda de focos: solo aparece cuando hay algo que accionar. Clic =
         filtra la tabla por ese foco (toggle). -->
    <transition name="focos-fade">
      <div v-if="focos.length" class="focos-bar">
        <div class="focos-lead">
          <i class="fa-solid fa-bolt"></i>
          <span>Requieren atencion</span>
        </div>
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
        <button
          v-if="activeFoco"
          class="foco-clear"
          @click="activeFoco = null"
        >
          <i class="fa-solid fa-xmark"></i> Quitar filtro
        </button>
      </div>
    </transition>

    <div class="kpi-grid">
      <div class="kpi" style="--bar: #6366f1">
        <div class="k-label">
          <span>Aulas evaluadas</span>
          <i class="fa-solid fa-clipboard-check k-icon"></i>
        </div>
        <div class="k-value">{{ kpis.evaluated }} / {{ kpis.total }}</div>
        <div class="k-foot">
          <span>{{ kpis.evaluatedPct }}% del periodo</span>
          <span v-if="kpiDeltas?.evaluated" class="k-delta" :class="kpiDeltas.evaluated.class">
            {{ kpiDeltas.evaluated.arrow }} {{ Math.abs(kpiDeltas.evaluated.value) }}
          </span>
        </div>
      </div>
      <div class="kpi" :style="{ '--bar': kpis.avg20 == null ? '#A0A099' : '#10B981' }">
        <div class="k-label">
          <span>Promedio consolidado</span>
          <i class="fa-solid fa-chart-line k-icon"></i>
        </div>
        <div class="k-value mono" :class="kpis.avgClass">
          {{ fmt20(kpis.avg20) }} <span class="k-unit">/ 20</span>
        </div>
        <div class="k-foot">
          <span>{{ kpis.avgLabel }}</span>
          <span v-if="kpiDeltas?.avg20" class="k-delta" :class="kpiDeltas.avg20.class">
            {{ kpiDeltas.avg20.arrow }} {{ Math.abs(kpiDeltas.avg20.value).toFixed(1) }}
          </span>
        </div>
      </div>
      <div class="kpi" style="--bar: #EF4444">
        <div class="k-label">
          <span>Aulas en riesgo</span>
          <i class="fa-solid fa-triangle-exclamation k-icon"></i>
        </div>
        <div class="k-value">{{ kpis.atRisk }}</div>
        <div class="k-foot">
          <span>DEFICIENTE + EN PROCESO</span>
          <span v-if="kpiDeltas?.atRisk" class="k-delta" :class="kpiDeltas.atRisk.class">
            {{ kpiDeltas.atRisk.arrow }} {{ Math.abs(kpiDeltas.atRisk.value) }}
          </span>
        </div>
      </div>
      <div class="kpi" style="--bar: #10B981">
        <div class="k-label">
          <span>Aulas en buen estado</span>
          <i class="fa-solid fa-circle-check k-icon"></i>
        </div>
        <div class="k-value">{{ kpis.good }}</div>
        <div class="k-foot">
          <span>BUENO + EXCELENTE</span>
          <span v-if="kpiDeltas?.good" class="k-delta" :class="kpiDeltas.good.class">
            {{ kpiDeltas.good.arrow }} {{ Math.abs(kpiDeltas.good.value) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Cobertura como tira compacta: dos barras en linea, sin ocupar un panel
         entero. La sumatoria detallada vive en el tooltip. -->
    <div class="coverage-strip">
      <span class="cs-title">Cobertura del periodo</span>
      <div
        class="cs-item"
        :title="`IA: ${globalCoverage.aiSessions} de ${globalCoverage.totalSessions} sesiones`"
      >
        <span class="coverage-dot coverage-dot-ai"></span>
        <span class="cs-label">IA</span>
        <span class="cs-bar"><span class="coverage-fill coverage-fill-ai" :style="{ width: globalCoverage.aiPct + '%' }"></span></span>
        <span class="cs-fig mono">{{ globalCoverage.aiPct }}%</span>
      </div>
      <div
        class="cs-item"
        :title="`Manual: ${globalCoverage.manualSessions} de ${globalCoverage.totalSessions} sesiones`"
      >
        <span class="coverage-dot coverage-dot-manual"></span>
        <span class="cs-label">Manual</span>
        <span class="cs-bar"><span class="coverage-fill coverage-fill-manual" :style="{ width: globalCoverage.manualPct + '%' }"></span></span>
        <span class="cs-fig mono">{{ globalCoverage.manualPct }}%</span>
      </div>
      <span class="cs-meta muted small">
        {{ globalCoverage.aulas }} aulas &middot; {{ globalCoverage.totalSessions }} sesiones
      </span>
    </div>

    <div class="insights-row">
      <div class="panel donut-panel">
        <header class="panel-head">
          <div>
            <span class="panel-eyebrow">Distribucion de veredictos</span>
            <h3>Donde estamos como institucion</h3>
          </div>
        </header>
        <div v-if="!periodAulas.length" class="panel-empty">
          <i class="fa-regular fa-folder-open"></i>
          No hay aulas en el periodo seleccionado.
        </div>
        <apexchart
          v-else
          type="donut"
          height="260"
          :options="donutOptions"
          :series="donutSeries"
        />
      </div>

      <div class="panel ranking-panel">
        <header class="panel-head ranking-head">
        <div>
          <span class="panel-eyebrow">Ranking de docentes</span>
          <h3>Quien necesita acompañamiento</h3>
        </div>
        <div class="ranking-sort">
          <span class="sort-label">Ordenar por</span>
          <button
            v-for="opt in docenteSortOptions"
            :key="opt.id"
            class="sort-chip"
            :class="{ active: docenteSort === opt.id }"
            @click="docenteSort = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
      </header>

      <div v-if="!docenteStats.length" class="panel-empty">
        <i class="fa-regular fa-folder-open"></i>
        No hay docentes con aulas en el periodo.
      </div>

      <div v-else class="ranking-scroll">
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="rk-pos">#</th>
            <th>Docente</th>
            <th class="th-center">Aulas</th>
            <th>Distribucion</th>
            <th class="th-num">Promedio</th>
            <th class="th-num">En riesgo</th>
            <th class="th-num">Evaluadas</th>
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
            <td class="rk-pos">
              <span class="rk-medal" :class="`rk-medal-${i + 1}`">{{ i + 1 }}</span>
            </td>
            <td>
              <div class="teacher-cell">
                <span class="avatar">{{ d.initials }}</span>
                <span class="rk-name">{{ d.teacher }}</span>
              </div>
            </td>
            <td class="td-center mono">{{ d.total }}</td>
            <td>
              <span class="dist-bar" :title="`${d.good} ok / ${d.atRisk} riesgo`">
                <span
                  v-for="seg in d.segments"
                  :key="seg.key"
                  class="dist-seg"
                  :class="`${seg.cls}-bg`"
                  :style="{ width: seg.pct + '%' }"
                ></span>
              </span>
            </td>
            <td class="td-num">
              <span class="rk-avg mono" :class="d.avgClass">{{ fmt20(d.avg20) }}</span>
            </td>
            <td class="td-num">
              <span class="rk-risk" :class="{ 'rk-risk-on': d.atRisk > 0 }">
                {{ d.atRisk }}
              </span>
            </td>
            <td class="td-num">
              <div class="rk-cov">
                <span class="rk-cov-bar">
                  <span class="rk-cov-fill" :style="{ width: d.evaluatedPct + '%' }"></span>
                </span>
                <span class="muted small mono">{{ d.evaluatedPct }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <div class="ranking-foot">
        <i class="fa-solid fa-circle-info"></i>
        Promedio = media simple por aula. Clic en un docente filtra la tabla.
      </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-title">Estado</span>
        <button
          v-for="s in filterStates"
          :key="s"
          class="chip"
          :class="{ active: filterStatus === s }"
          @click="filterStatus = s"
        >
          {{ s }}
          <span class="chip-count">{{ countByStatus(s) }}</span>
        </button>
      </div>
      <div class="divider"></div>
      <div class="filter-group">
        <span class="filter-title">Veredicto</span>
        <button
          v-for="v in verdictFilters"
          :key="v"
          class="chip chip-verdict"
          :class="{ active: filterVerdict === v }"
          @click="filterVerdict = v"
        >
          {{ v }}
        </button>
      </div>
      <div class="divider"></div>
      <div class="filter-group">
        <span class="filter-title">Docente</span>
        <div class="select">
          <i class="fa-solid fa-chalkboard-user"></i>
          <select v-model="filterDocente">
            <option value="">Todos los docentes</option>
            <option v-for="d in docenteOptions" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="input">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          v-model="query"
          type="text"
          placeholder="Buscar aula, codigo o docente..."
        />
      </div>
    </div>

    <div class="table-wrap">
      <table class="report-table">
        <thead>
          <tr>
            <th>Aula</th>
            <th>Docente</th>
            <th class="th-center">Cobertura</th>
            <th class="th-num">Nota IA</th>
            <th class="th-num">Nota manual</th>
            <th class="th-num">Consolidada</th>
            <th>Veredicto</th>
            <th>Ultima actividad</th>
            <th class="th-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="state-msg">
              <i class="fa-solid fa-spinner fa-spin"></i> Cargando reporte...
            </td>
          </tr>
          <tr v-else-if="!sorted.length">
            <td colspan="9" class="state-msg muted">
              <i class="fa-regular fa-folder-open"></i>
              Ninguna aula coincide con los filtros aplicados.
            </td>
          </tr>
          <tr
            v-for="a in sorted"
            v-else
            :key="a.id"
            class="row-clickable"
            @click="openAula(a.id)"
          >
            <td>
              <div class="aula-cell">
                <span class="aula-code mono">{{ a.code }}</span>
                <span class="aula-name">{{ a.name }}</span>
                <span class="aula-edition muted small">{{ a.edition }}</span>
              </div>
            </td>
            <td>
              <div class="teacher-cell">
                <span class="avatar">{{ a.teacherInitials }}</span>
                <span>{{ a.teacher }}</span>
              </div>
            </td>
            <td class="td-center">
              <div class="cov-inline">
                <span class="cov-mini" :title="`IA: ${a.sessionsAi} / ${a.sessionsTotal}`">
                  <i class="fa-solid fa-robot"></i>
                  <span class="mono">{{ a.sessionsAi }}/{{ a.sessionsTotal }}</span>
                </span>
                <span class="cov-mini" :title="`Manual: ${a.sessionsManual} / ${a.sessionsTotal}`">
                  <i class="fa-solid fa-clipboard-check"></i>
                  <span class="mono">{{ a.sessionsManual }}/{{ a.sessionsTotal }}</span>
                </span>
              </div>
            </td>
            <td class="td-num">
              <span v-if="a.aiAvg20 != null" class="mono" :class="score20Class(a.aiAvg20)">
                {{ fmt20(a.aiAvg20) }}
              </span>
              <span v-else class="muted small">--</span>
            </td>
            <td class="td-num">
              <span v-if="a.manualAvg20 != null" class="mono" :class="score20Class(a.manualAvg20)">
                {{ fmt20(a.manualAvg20) }}
              </span>
              <span v-else class="muted small">--</span>
            </td>
            <td class="td-num">
              <strong v-if="a.consolidated20 != null" class="mono" :class="a.verdictClass">
                {{ fmt20(a.consolidated20) }} / 20
              </strong>
              <span v-else class="muted small">sin data</span>
            </td>
            <td>
              <span class="verdict-pill" :class="a.verdictClass">{{ a.verdict }}</span>
            </td>
            <td>
              <span v-if="a.lastActivityRel" class="muted small">{{ a.lastActivityRel }}</span>
              <span v-else class="muted small">--</span>
            </td>
            <td class="td-actions">
              <button class="row-action" title="Abrir aula" @click.stop="openAula(a.id)">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="footer-note">
      <i class="fa-solid fa-circle-info"></i>
      La nota consolidada combina IA y rubrica manual con pesos
      {{ Math.round(CONSOLIDATED_WEIGHT_IA * 100) }}% / {{ Math.round(CONSOLIDATED_WEIGHT_MANUAL * 100) }}%.
      Las aulas SIN EVALUAR no se promedian en el KPI institucional.
    </p>
  </div>
</template>

<style scoped>
.reporte-shell {
  --bg-soft: #FAFAF8;
  --line: #E8E8E3;
  --line-soft: #EFEFEA;
  --ink: #14140F;
  --ink-2: #3A3A33;
  --ink-3: #6F6F66;
  --ink-4: #A0A099;
  --green-soft: #ECFDF4;
  --green-ink: #047857;
  --amber-soft: #FEF6E1;
  --amber-ink: #B45309;
  --red-soft: #FEECEC;
  --red-ink: #B91C1C;
  --blue-soft: #ECF2FE;
  --blue-ink: #1D4ED8;
  --indigo: #6366f1;
  --radius: 10px;
  --shadow-md: 0 1px 2px rgba(20,20,15,0.04), 0 4px 12px rgba(20,20,15,0.06);
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  font-size: 14px;
  max-width: 1600px;
  margin: 0 auto;
}

.muted { color: var(--ink-3); }
.small { font-size: 11.5px; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.spacer { flex: 1; }

.sg-good  { color: var(--green-ink); }
.sg-ok    { color: var(--blue-ink); }
.sg-warn  { color: var(--amber-ink); }
.sg-bad   { color: var(--red-ink); }
.sg-empty { color: var(--ink-4); }

.page-head {
  display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px;
}
.page-head .titles { flex: 1; min-width: 0; }
.page-head .eyebrow {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.page-head h1 {
  margin: 4px 0 2px; font-size: 26px; font-weight: 600; letter-spacing: -0.02em;
}
.page-head .subtitle { color: var(--ink-3); font-size: 13.5px; }
.page-head .actions { display: flex; gap: 8px; flex-shrink: 0; }

.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 8px; font-size: 13px; font-weight: 500;
  border: 1px solid var(--line); background: white; color: var(--ink-2);
  cursor: pointer; transition: background .15s, border-color .15s;
}
.btn:hover { background: var(--bg-soft); border-color: #DDD; }
.btn:disabled { opacity: .6; cursor: not-allowed; }

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
  width: 3px; border-radius: 2px; background: var(--bar, var(--ink-4));
}
.kpi .k-label {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.kpi .k-icon { color: var(--ink-4); font-size: 14px; }
.kpi .k-value {
  font-size: 28px; font-weight: 600; letter-spacing: -0.025em;
  margin-top: 4px; line-height: 1.1;
}
.kpi .k-unit { font-size: 14px; color: var(--ink-3); font-weight: 500; margin-left: 2px; }
.kpi .k-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px; font-size: 12px; color: var(--ink-3);
}
.k-delta {
  font-size: 11px; font-weight: 700;
  padding: 1px 7px; border-radius: 999px;
  letter-spacing: 0.02em;
}
.k-delta.d-good { color: var(--green-ink); background: var(--green-soft); }
.k-delta.d-bad  { color: var(--red-ink);   background: var(--red-soft); }
.k-delta.d-flat { color: var(--ink-3);     background: var(--bg-soft); }

.panels-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  margin-bottom: 18px;
}
@media (max-width: 1100px) {
  .panels-row { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
.panel {
  background: white; border-radius: var(--radius);
  border: 1px solid var(--line); padding: 16px 18px;
}
.panel-head { margin-bottom: 8px; }
.panel-eyebrow {
  font-size: 11px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.panel-head h3 {
  margin: 4px 0 0; font-size: 15px; font-weight: 600; color: var(--ink);
}
.panel-empty {
  display: flex; align-items: center; gap: 8px; justify-content: center;
  padding: 60px 0; color: var(--ink-3); font-size: 13px;
}

.coverage-block { margin-top: 8px; }
.coverage-stat {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-top: 14px; margin-bottom: 6px;
}
.coverage-stat:first-child { margin-top: 4px; }
.coverage-label {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12.5px; color: var(--ink-2); font-weight: 600;
}
.coverage-figure { font-size: 12.5px; color: var(--ink-2); }
.coverage-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
}
.coverage-dot-ai     { background: #6366f1; }
.coverage-dot-manual { background: #f59e0b; }
.coverage-bar {
  position: relative; height: 8px; background: var(--bg-soft);
  border-radius: 999px; overflow: hidden;
}
.coverage-fill {
  position: absolute; top: 0; bottom: 0; left: 0;
  border-radius: inherit; transition: width .3s ease;
}
.coverage-fill-ai     { background: #6366f1; }
.coverage-fill-manual { background: #f59e0b; }
.coverage-foot {
  margin-top: 16px; font-size: 11.5px; color: var(--ink-3);
  display: flex; align-items: center; gap: 6px;
}

.filter-bar {
  background: white; border-radius: var(--radius);
  border: 1px solid var(--line);
  padding: 10px 14px; margin-bottom: 14px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
}
.filter-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.filter-title {
  font-size: 10.5px; font-weight: 700; color: var(--ink-4);
  text-transform: uppercase; letter-spacing: 0.06em; margin-right: 4px;
}
.divider { width: 1px; height: 22px; background: var(--line); margin: 0 4px; }

.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px;
  background: white; border: 1px solid var(--line);
  font-size: 12px; color: var(--ink-2); cursor: pointer;
  transition: background .15s;
}
.chip:hover { background: var(--bg-soft); }
.chip.active {
  background: var(--ink); color: white; border-color: var(--ink);
  font-weight: 500;
}
.chip .chip-count {
  color: var(--ink-4); font-size: 10.5px;
  background: var(--bg-soft); padding: 1px 6px; border-radius: 999px;
}
.chip.active .chip-count { color: white; background: rgba(255,255,255,.18); }

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

.select {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; background: white; font-size: 13px;
  color: var(--ink-3);
}
.select i { font-size: 12px; }
.select select {
  border: none; outline: none; font-size: 13px;
  background: transparent; color: var(--ink); cursor: pointer;
  max-width: 200px;
}

.table-wrap {
  background: white; border: 1px solid var(--line);
  border-radius: var(--radius); overflow: hidden;
}
.report-table { width: 100%; border-collapse: collapse; }
.report-table th, .report-table td {
  padding: 11px 14px; font-size: 12.5px; text-align: left;
  border-bottom: 1px solid var(--line-soft);
}
.report-table thead th {
  background: var(--bg-soft); font-weight: 600; color: var(--ink-2);
  font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em;
}
.report-table tbody tr:last-child td { border-bottom: none; }
.report-table .th-center { text-align: center; }
.report-table .th-num { text-align: right; }
.report-table .th-actions { width: 36px; }
.report-table .td-center { text-align: center; }
.report-table .td-num { text-align: right; }
.report-table .td-actions { text-align: right; }

.row-clickable { cursor: pointer; transition: background .15s; }
.row-clickable:hover { background: #FBFBF8; }

.aula-cell { display: flex; flex-direction: column; gap: 1px; }
.aula-code { font-size: 10.5px; color: var(--ink-3); }
.aula-name { font-weight: 600; color: var(--ink); }
.aula-edition { font-size: 10.5px; }

.teacher-cell { display: flex; align-items: center; gap: 8px; }
.avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--indigo); color: white;
  font-size: 10px; font-weight: 700; letter-spacing: 0.02em;
}

.cov-inline { display: inline-flex; gap: 10px; }
.cov-mini {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11.5px; color: var(--ink-3);
}
.cov-mini i { font-size: 10px; color: var(--ink-4); }

.verdict-pill {
  display: inline-block; padding: 3px 9px; border-radius: 999px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  background: var(--bg-soft); color: var(--ink-3);
}
.verdict-pill.sg-good  { background: var(--green-soft); color: var(--green-ink); }
.verdict-pill.sg-ok    { background: var(--blue-soft);  color: var(--blue-ink); }
.verdict-pill.sg-warn  { background: var(--amber-soft); color: var(--amber-ink); }
.verdict-pill.sg-bad   { background: var(--red-soft);   color: var(--red-ink); }
.verdict-pill.sg-empty { background: var(--bg-soft);    color: var(--ink-3); }

.row-action {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid var(--line); background: white; color: var(--ink-3);
  cursor: pointer; transition: background .15s, color .15s;
}
.row-action:hover { background: var(--bg-soft); color: var(--ink); }

.state-msg {
  text-align: center; padding: 36px 12px; font-size: 13px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

.footer-note {
  margin: 16px 0 0; font-size: 11.5px; color: var(--ink-3);
  display: flex; align-items: center; gap: 6px;
}

/* =================================================================
   COBERTURA — tira compacta
   ================================================================= */
.coverage-strip {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  background: white; border: 1px solid var(--line);
  border-radius: var(--radius); padding: 10px 16px; margin-bottom: 14px;
}
.cs-title {
  font-size: 10.5px; font-weight: 700; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.cs-item { display: inline-flex; align-items: center; gap: 8px; min-width: 200px; flex: 1; }
.cs-label { font-size: 12px; color: var(--ink-2); font-weight: 600; width: 44px; }
.cs-bar {
  position: relative; flex: 1; height: 8px; min-width: 80px;
  background: var(--bg-soft); border-radius: 999px; overflow: hidden;
}
.cs-fig { font-size: 12px; color: var(--ink-2); width: 36px; text-align: right; }
.cs-meta { margin-left: auto; white-space: nowrap; }

/* =================================================================
   FILA DE INSIGHTS — donut + ranking lado a lado
   ================================================================= */
.insights-row {
  display: grid; grid-template-columns: 2fr 3fr; gap: 14px;
  margin-bottom: 18px; align-items: stretch;
}
/* Altura comun para ambos paneles. El donut se centra sin estirarse (si le
   damos flex-grow al wrapper, ApexCharts se reescala y se infla). */
.donut-panel, .ranking-panel { height: 380px; }
.donut-panel { display: flex; flex-direction: column; }
.donut-panel > .vue-apexcharts { margin: auto 0; }
.ranking-panel { display: flex; flex-direction: column; min-height: 0; }
.ranking-scroll { flex: 1; min-height: 0; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
.ranking-table thead th {
  position: sticky; top: 0; z-index: 1; background: white;
}
@media (max-width: 1000px) {
  .insights-row { grid-template-columns: 1fr; }
  .coverage-strip { gap: 10px; }
}

/* =================================================================
   BANDA DE FOCOS DE ATENCION
   ================================================================= */
.focos-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  background: white; border: 1px solid var(--line);
  border-radius: var(--radius); padding: 10px 14px; margin-bottom: 18px;
}
.focos-lead {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 10.5px; font-weight: 700; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.06em; margin-right: 4px;
}
.focos-lead i { color: var(--amber-ink); }
.foco {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 10px; border-radius: 999px;
  border: 1px solid var(--line); background: white; cursor: pointer;
  font-size: 12px; color: var(--ink-2);
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.foco:hover { background: var(--bg-soft); }
.foco-count { font-weight: 800; font-variant-numeric: tabular-nums; }
.foco-label { color: var(--ink-3); }
.foco i { font-size: 11px; }
.foco-red   i, .foco-red   .foco-count { color: var(--red-ink); }
.foco-amber i, .foco-amber .foco-count { color: var(--amber-ink); }
.foco-red.active {
  background: var(--red-soft); border-color: #F3C9C9;
  box-shadow: 0 0 0 3px rgba(185,28,28,.08);
}
.foco-red.active .foco-label { color: var(--red-ink); }
.foco-amber.active {
  background: var(--amber-soft); border-color: #F0DDB0;
  box-shadow: 0 0 0 3px rgba(180,83,9,.08);
}
.foco-amber.active .foco-label { color: var(--amber-ink); }
.foco-clear {
  display: inline-flex; align-items: center; gap: 5px;
  margin-left: auto; padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--line); background: white; cursor: pointer;
  font-size: 11.5px; color: var(--ink-3);
}
.foco-clear:hover { background: var(--bg-soft); color: var(--ink); }
.focos-fade-enter-active, .focos-fade-leave-active { transition: opacity .2s, transform .2s; }
.focos-fade-enter-from, .focos-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* =================================================================
   RANKING DE DOCENTES
   ================================================================= */
.ranking-panel { margin-bottom: 18px; padding: 16px 18px; }
.ranking-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; margin-bottom: 12px;
}
.ranking-sort { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sort-label {
  font-size: 10.5px; font-weight: 700; color: var(--ink-4);
  text-transform: uppercase; letter-spacing: 0.06em; margin-right: 2px;
}
.sort-chip {
  padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--line); background: white; cursor: pointer;
  font-size: 11.5px; color: var(--ink-2); transition: background .15s;
}
.sort-chip:hover { background: var(--bg-soft); }
.sort-chip.active { background: var(--ink); color: white; border-color: var(--ink); font-weight: 500; }

.ranking-table { width: 100%; border-collapse: collapse; }
.ranking-table th, .ranking-table td {
  padding: 9px 12px; font-size: 12.5px; text-align: left;
  border-bottom: 1px solid var(--line-soft);
}
.ranking-table thead th {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--ink-3); font-weight: 600;
}
.ranking-table .th-center { text-align: center; }
.ranking-table .th-num { text-align: right; }
.ranking-table tbody tr:last-child td { border-bottom: none; }
.ranking-table .td-center { text-align: center; }
.ranking-table .td-num { text-align: right; }

.rk-row { cursor: pointer; transition: background .15s; }
.rk-row:hover { background: #FBFBF8; }
.rk-row.selected { background: var(--blue-soft); }
.rk-pos { width: 34px; text-align: center; }
.rk-medal {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: 11px; font-weight: 800; color: var(--ink-3);
  background: var(--bg-soft); font-variant-numeric: tabular-nums;
}
.rk-medal-1 { background: #FCEFC7; color: #92670A; }
.rk-medal-2 { background: #EDEDE8; color: #5A5A52; }
.rk-medal-3 { background: #F6E2CF; color: #93540F; }
.rk-name { font-weight: 600; color: var(--ink); }

.dist-bar {
  display: inline-flex; width: 100%; max-width: 180px; height: 8px;
  border-radius: 999px; overflow: hidden; background: var(--bg-soft);
}
.dist-seg { height: 100%; display: block; }
.sg-good-bg  { background: #047857; }
.sg-ok-bg    { background: #1D4ED8; }
.sg-warn-bg  { background: #B45309; }
.sg-bad-bg   { background: #B91C1C; }
.sg-empty-bg { background: #D5D5CE; }

.rk-avg {
  display: inline-block; min-width: 38px; padding: 2px 8px;
  border-radius: 6px; font-weight: 700; background: var(--bg-soft);
}
.rk-avg.sg-good  { background: var(--green-soft); }
.rk-avg.sg-ok    { background: var(--blue-soft); }
.rk-avg.sg-warn  { background: var(--amber-soft); }
.rk-avg.sg-bad   { background: var(--red-soft); }
.rk-risk { font-weight: 700; color: var(--ink-4); font-variant-numeric: tabular-nums; }
.rk-risk-on { color: var(--red-ink); }

.rk-cov { display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; }
.rk-cov-bar {
  position: relative; width: 56px; height: 6px;
  background: var(--bg-soft); border-radius: 999px; overflow: hidden;
}
.rk-cov-fill {
  position: absolute; inset: 0 auto 0 0; background: var(--green-ink);
  border-radius: inherit; transition: width .3s ease;
}
.ranking-foot {
  margin-top: 12px; font-size: 11.5px; color: var(--ink-3);
  display: flex; align-items: center; gap: 6px;
}

@media (max-width: 720px) {
  .ranking-table .dist-bar { max-width: 90px; }
  .focos-bar { gap: 6px; }
}
</style>
