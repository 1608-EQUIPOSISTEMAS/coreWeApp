<template>
  <div class="board-shell">
    <!-- ════ HEADER ════ -->
    <header class="cg-header">
      <div class="cg-brand">
        <div class="cg-logo">
          <span class="cg-logo-bar"><i></i><i></i></span>
          <span class="cg-logo-month">{{ monthAbbr }}</span>
        </div>
        <div>
          <div class="cg-eyebrow">Vista de solo lectura · Cronograma</div>
          <h1 class="cg-title">{{ periodLabel }}</h1>
        </div>
      </div>

      <div class="cg-controls">
        <div class="cg-nav">
          <button type="button" @click="changeMonth(-1)" title="Mes anterior">‹</button>
          <select v-model.number="selectedMonth" @change="fetchAll" class="cg-nav-select">
            <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
          </select>
          <select v-model.number="selectedYear" @change="fetchAll" class="cg-nav-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <button type="button" @click="changeMonth(1)" title="Mes siguiente">›</button>
        </div>

        <div class="cg-search">
          <span>⌕</span>
          <input v-model.trim="search" type="search" placeholder="Buscar curso, docente, código…" />
        </div>

        <select v-model="lineFilter" class="cg-select">
          <option value="">Todas las líneas</option>
          <option v-for="l in businessLines" :key="l.id" :value="l.description">{{ l.description }}</option>
        </select>

        <button type="button" class="cg-reload" @click="fetchAll" title="Recargar">↻</button>
      </div>
    </header>

    <!-- ════ KPIs ════ -->
    <div class="cg-kpis">
      <div v-for="k in kpis" :key="k.label" class="cg-kpi">
        <div class="cg-kpi-head">
          <span class="cg-kpi-dot" :style="{ background: k.color }"></span>
          <span class="cg-kpi-label">{{ k.label }}</span>
        </div>
        <div class="cg-kpi-val"><span>{{ k.value }}</span><small>{{ k.unit }}</small></div>
      </div>
    </div>

    <!-- ════ TABLA ════ -->
    <div class="cg-card">
      <div class="cg-scroll">
        <!-- header de columnas -->
        <div class="cg-grid cg-colhead">
          <span class="cg-colh">Curso · Identificación</span>
          <span class="cg-colh">Cronograma</span>
          <span class="cg-colh">Docente</span>
          <span class="cg-colh">Confirmación</span>
          <div>
            <div class="cg-colh cg-colh-aula">Aula / Inscritos</div>
            <div class="cg-aula-grid cg-aula-head">
              <span>VEN</span><span>SEG</span><span>MEM</span><span>B2B</span><span>BEC</span><span class="amber">AULA</span>
            </div>
          </div>
          <span class="cg-colh">Objetivo</span>
          <span class="cg-colh cg-colh-cons">Consultas</span>
          <span></span>
        </div>

        <!-- skeleton -->
        <template v-if="isLoading">
          <div v-for="n in 7" :key="'sk' + n" class="cg-grid cg-skrow">
            <span class="cg-sk" :style="{ width: (45 + (n * 13) % 40) + '%' }"></span>
            <span class="cg-sk" style="width:80%"></span>
            <span class="cg-sk" style="width:70%"></span>
            <span class="cg-sk"></span>
            <span class="cg-sk"></span>
            <span class="cg-sk"></span>
            <span class="cg-sk"></span>
            <span></span>
          </div>
        </template>

        <!-- contenido -->
        <template v-else>
          <div v-for="week in displayWeeks" :key="week.schedule">
            <!-- banda de semana -->
            <div class="cg-band" @click="toggleWeek(week.schedule)">
              <span class="cg-caret" :class="{ closed: !week.isOpen }">▾</span>
              <span class="cg-band-accent"></span>
              <span class="cg-band-label">Semana {{ week.schedule }}</span>
              <span class="cg-band-count">{{ week.count }} ediciones</span>
              <span class="cg-band-summary">{{ week.summary }}</span>
            </div>

            <!-- filas -->
            <div v-show="week.isOpen" v-for="it in week.items" :key="it.e.edition_num_id" class="cg-rowwrap">
              <div
                class="cg-grid cg-row"
                :style="{ borderLeftColor: it.sc.color, background: it.sc.tint }"
                @click="toggleRow(it.e.edition_num_id)"
              >
                <!-- Curso / Identificación -->
                <div class="cg-min">
                  <div class="cg-ident-top">
                    <span class="cg-seg" :style="{ background: it.sc.color + '1A', color: it.sc.color }">{{ it.e.cat_segment || '—' }}</span>
                    <span class="cg-vcode">{{ it.e.version_code || '—' }}</span>
                  </div>
                  <div class="cg-course">{{ it.e.program_abreviature || '—' }}</div>
                  <div class="cg-linetype">{{ lineLabel(it.e) }} · {{ typeLabel(it.e) }}</div>
                </div>

                <!-- Cronograma -->
                <div class="cg-min">
                  <div class="cg-dates">{{ fmtShort(it.e.start_date) }}<span class="cg-arrow">→</span>{{ fmtShort(it.e.end_date) }}</div>
                  <div class="cg-sched"><b>{{ daysLabel(it.e) }}</b><span class="sep">·</span><span>{{ hourLabel(it.e) }}</span></div>
                </div>

                <!-- Docente -->
                <div class="cg-doc">
                  <span class="cg-doc-eyebrow">Docente</span>
                  <span class="cg-docname">{{ it.e.instructor || '—' }}</span>
                </div>

                <!-- Confirmación -->
                <div class="cg-conf">
                  <div><span class="cg-dot" :class="it.e.preconfirmation ? 'on' : 'off'"></span><span>Pre-conf.</span></div>
                  <div><span class="cg-dot" :class="it.e.confirmation ? 'on' : 'off'"></span><span>Confirmado</span></div>
                  <div><span class="cg-dot" :class="it.e.expedient ? 'on' : 'off'"></span><span>Ficha</span></div>
                </div>

                <!-- Aula / Inscritos -->
                <div class="cg-aula-grid">
                  <span class="cg-num" :class="{ zero: !it.e.cnt_ventas }">{{ it.e.cnt_ventas ?? 0 }}</span>
                  <span class="cg-num" :class="{ zero: !it.e.cnt_segui }">{{ it.e.cnt_segui ?? 0 }}</span>
                  <span class="cg-num" :class="{ zero: !it.e.cnt_memb }">{{ it.e.cnt_memb ?? 0 }}</span>
                  <span class="cg-num" :class="{ zero: !it.e.cnt_b2b }">{{ it.e.cnt_b2b ?? 0 }}</span>
                  <span class="cg-num bec" :class="{ zero: !it.e.cnt_becas }">{{ it.e.cnt_becas ?? 0 }}</span>
                  <span class="cg-aula">{{ it.e.cnt_aula ?? 0 }}</span>
                </div>

                <!-- Objetivo -->
                <div>
                  <div class="cg-goal-top">
                    <span class="cg-goal-meta">Meta {{ it.e.meta_vacantes || '—' }}</span>
                    <span class="cg-goal-pct" :style="{ color: it.fl.color }">{{ it.fl.pct }}%</span>
                  </div>
                  <div class="cg-bar"><div :style="{ width: it.fl.w + '%', background: it.fl.color }"></div></div>
                </div>

                <!-- Consultas (leads, excluye Desestimado/Cerrado) -->
                <div class="cg-cons">
                  <span class="cg-cons-num" :class="{ zero: !it.e.cnt_consultas }">{{ it.e.cnt_consultas ?? 0 }}</span>
                </div>

                <!-- chevron -->
                <div class="cg-chev"><span :class="{ open: it.open }">▾</span></div>
              </div>

              <!-- detalle expandible -->
              <div v-if="it.open" class="cg-detail">
                <div class="cg-detail-grid">
                  <div v-for="sec in it.sections" :key="sec.title">
                    <div class="cg-sec-head">
                      <span class="cg-sec-bar" :style="{ background: sec.accent }"></span>
                      <span class="cg-sec-title" :style="{ color: sec.accent }">{{ sec.title }}</span>
                    </div>
                    <div v-for="f in sec.fields" :key="f.k" class="cg-field">
                      <span class="cg-field-k">{{ f.k }}</span>
                      <span class="cg-field-v" :class="f.cls">{{ f.v }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="it.e.notes && it.e.notes !== '—'" class="cg-note">
                  <span class="cg-note-label">Observación</span>
                  <span class="cg-note-text">{{ it.e.notes }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- vacío -->
          <div v-if="!displayWeeks.length" class="cg-empty">
            <div class="cg-empty-icon">⌖</div>
            <div class="cg-empty-title">No hay ediciones para este filtro</div>
            <div class="cg-empty-sub">Prueba con otro mes, línea o término de búsqueda.</div>
          </div>
        </template>
      </div>
    </div>

    <div class="cg-foot">
      <span class="cg-foot-dot"></span>
      <span>Haz clic en cualquier fila para ver el detalle completo · Identificación, Cronograma, Aula e Inscritos y Objetivo.</span>
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
const MABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Paleta por segmento (borde + tinte). Las líneas/tipos reales vienen de la data.
const SEG_COLORS = {
  A1: { color: '#2563EB', tint: '#EFF6FF' }, A2: { color: '#EA580C', tint: '#FFF7ED' },
  A3: { color: '#0D9488', tint: '#F0FDFA' }, A4: { color: '#D97706', tint: '#FFFBEB' },
  A5: { color: '#DB2777', tint: '#FDF2F8' }, A6: { color: '#7C3AED', tint: '#F5F3FF' },
}
const DEFAULT_SEG = { color: '#64748B', tint: '#F8FAFC' }
function segColor(e) { return SEG_COLORS[(e.cat_segment || '').toUpperCase()] || DEFAULT_SEG }

const today = new Date()
const selectedMonth = ref(today.getMonth() + 1)
const selectedYear = ref(today.getFullYear())
const schedules = ref([])
const isLoading = ref(false)
const search = ref('')
const lineFilter = ref('')
const openRows = ref({})
const closedWeeks = ref({})

const businessLines = (catalog && catalog.options('we_business_line')) || []

const monthAbbr = computed(() => MABBR[selectedMonth.value - 1].toUpperCase())
const periodLabel = computed(() => `${months[selectedMonth.value - 1]} ${selectedYear.value}`)

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
      e.vf = (e.cnt_aula ?? 0) - e.meta_vacantes
    }))

    schedules.value = weeks
    openRows.value = {}
    closedWeeks.value = {}
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

function toggleRow(id) { openRows.value = { ...openRows.value, [id]: !openRows.value[id] } }
function toggleWeek(s) { closedWeeks.value = { ...closedWeeks.value, [s]: !closedWeeks.value[s] } }

// ── Reglas derivadas (importadas del diseño) ──
// Estado por fechas: < inicio → Por iniciar, > fin → Finalizado, en medio → En curso.
function statusOf(e) {
  const s = parseLocal(e.start_date)
  const en = parseLocal(e.end_date)
  if (s && today < s) return { key: 'Por iniciar', live: false }
  if (en && today > en) return { key: 'Finalizado', live: false }
  return { key: 'En curso', live: true }
}
function fillOf(e) {
  const aula = e.cnt_aula ?? 0
  const obj = e.meta_vacantes ?? 0
  const pct = obj > 0 ? Math.round((aula / obj) * 100) : 0
  let color = '#EF4444'
  if (pct >= 100) color = '#6366F1'
  else if (pct >= 80) color = '#10B981'
  else if (pct >= 50) color = '#F59E0B'
  return { pct, color, w: Math.min(100, pct) }
}

// ── Filtros (texto + línea) ──
const filteredWeeks = computed(() => {
  const q = search.value.toLowerCase()
  const line = lineFilter.value
  return schedules.value.map(w => ({
    schedule: w.schedule,
    items: (w.items || []).filter(e => {
      if ((e.cat_segment || '').toUpperCase() === 'A5') return false // A5 = cancelados, no se muestran
      if (line && lineLabel(e) !== line) return false
      if (!q) return true
      return [e.program_abreviature, e.instructor, e.version_code, e.global_code, e.specific_code, lineLabel(e), typeLabel(e)]
        .some(v => (v || '').toLowerCase().includes(q))
    })
  }))
})

const displayWeeks = computed(() => filteredWeeks.value
  .filter(w => w.items.length)
  .map(w => {
    const items = w.items.map(e => ({
      e, sc: segColor(e), fl: fillOf(e), st: statusOf(e),
      open: !!openRows.value[e.edition_num_id], sections: detailSections(e),
    }))
    const live = items.filter(it => it.st.live).length
    const avg = items.length ? Math.round(items.reduce((s, it) => s + it.fl.pct, 0) / items.length) : 0
    return {
      schedule: w.schedule, count: items.length, items,
      isOpen: !closedWeeks.value[w.schedule],
      summary: `${live} en curso · ${avg}% llenado prom.`,
    }
  }))

// ── KPIs (sobre lo filtrado) ──
const kpis = computed(() => {
  const all = filteredWeeks.value.flatMap(w => w.items)
  const sum = k => all.reduce((s, e) => s + (e[k] ?? 0), 0)
  return [
    { label: 'Ventas', value: sum('cnt_ventas'), unit: 'directas', color: '#16205A' },
    { label: 'En aula', value: sum('cnt_aula'), unit: 'inscritos', color: '#B45309' },
    { label: 'En curso', value: all.filter(e => statusOf(e).live).length, unit: 'activas', color: '#10B981' },
    { label: 'Por iniciar', value: all.filter(e => statusOf(e).key === 'Por iniciar').length, unit: 'próximas', color: '#6366F1' },
    { label: 'Finalizadas', value: all.filter(e => statusOf(e).key === 'Finalizado').length, unit: 'cerradas', color: '#94A3B8' },
  ]
})

// ── Helpers de presentación ──
function lineLabel(e) { return e.business_line_label || e.program_line_business || '—' }
function typeLabel(e) { return e.cat_course_category_label || e.program_type || '—' }
// Parse local para evitar el corrimiento de un día: "2025-05-21" en local, no UTC.
function parseLocal(v) {
  if (!v) return null
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
function fmtShort(v) {
  const d = parseLocal(v)
  return d ? `${d.getDate()} ${MABBR[d.getMonth()]}` : '—'
}
function fmtFull(v) {
  const d = parseLocal(v)
  return d ? `${String(d.getDate()).padStart(2, '0')} ${MABBR[d.getMonth()]} ${d.getFullYear()}` : '—'
}
function daysLabel(e) { return e.schedules?.[0]?.day_combination_label || '—' }
function hourLabel(e) {
  if (!e.schedules?.length) return '—'
  const base = e.schedules[0].hour_combination_label || ''
  return e.schedules.length > 1 ? `${base} (+${e.schedules.length - 1})` : base
}

function detailSections(e) {
  const yesno = b => ({ v: b ? 'Sí' : 'No', cls: b ? 'v-yes' : 'v-no' })
  const falt = (e.meta_vacantes || 0) - (e.cnt_aula ?? 0)
  return [
    { title: 'Identificación', accent: '#475569', fields: [
      { k: 'Segmento', v: e.cat_segment || '—' },
      { k: 'Línea', v: lineLabel(e) },
      { k: 'Tipo', v: typeLabel(e) },
      { k: 'Edición', v: e.version_code || '—', cls: 'v-mono' },
      { k: 'Cuenta apertura', v: e.calc_da ?? 0, cls: 'v-mono' },
    ] },
    { title: 'Cronograma', accent: '#0F766E', fields: [
      { k: 'Inicio', v: fmtFull(e.start_date), cls: 'v-mono' },
      { k: 'Fin', v: fmtFull(e.end_date), cls: 'v-mono' },
      { k: 'Días', v: daysLabel(e) },
      { k: 'Horario', v: hourLabel(e), cls: 'v-mono' },
      { k: 'Sesiones', v: e.program_sessions ?? '—' },
      { k: 'Mejora', ...yesno(e.upgrade) },
      { k: 'Ficha / Expediente', ...yesno(e.expedient) },
      { k: 'Pre-confirmación', ...yesno(e.preconfirmation) },
      { k: 'Confirmación', ...yesno(e.confirmation) },
    ] },
    { title: 'Aula / Inscritos', accent: '#B45309', fields: [
      { k: 'Venta directa', v: e.cnt_ventas ?? 0 },
      { k: 'Seguimiento', v: e.cnt_segui ?? 0 },
      { k: 'Membresía', v: e.cnt_memb ?? 0 },
      { k: 'Convenio B2B', v: e.cnt_b2b ?? 0 },
      { k: 'Becas', v: e.cnt_becas ?? 0, cls: 'v-muted' },
      { k: 'Total en aula', v: e.cnt_aula ?? 0, cls: 'v-strong' },
    ] },
    { title: 'Objetivo', accent: '#6D28D9', fields: [
      { k: 'Objetivo vacantes', v: e.meta_vacantes || '—' },
      { k: 'Vacantes faltantes', v: falt > 0 ? falt : 'Completo', cls: falt > 0 ? 'v-neg' : 'v-pos' },
      { k: '% Llenado', v: fillOf(e).pct + '%' },
      { k: 'Consultas (leads)', v: e.consultas ?? 0 },
    ] },
  ]
}

onMounted(fetchAll)
</script>

<style scoped>
.board-shell {
  --navy: #16205A; --line: #E6EAF0; --ink: #1E293B;
  color: var(--ink); padding: 4px 2px 3rem;
}

/* Header */
.cg-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 18px; margin-bottom: 18px; }
.cg-brand { display: flex; align-items: center; gap: 15px; }
.cg-logo { width: 50px; height: 50px; border-radius: 13px; background: var(--navy); overflow: hidden; box-shadow: 0 6px 16px rgba(22,32,90,.28); flex-shrink: 0; }
.cg-logo-bar { height: 15px; background: #0E1640; display: flex; align-items: center; gap: 5px; padding-left: 9px; }
.cg-logo-bar i { width: 4px; height: 4px; border-radius: 50%; background: #fff; opacity: .85; }
.cg-logo-month { height: 35px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; letter-spacing: .04em; }
.cg-eyebrow { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #94A3B8; font-weight: 700; margin-bottom: 3px; }
.cg-title { font-size: 25px; font-weight: 700; margin: 0; line-height: 1.1; color: var(--navy); letter-spacing: -.01em; }

.cg-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.cg-nav { display: flex; align-items: center; gap: 2px; background: #fff; border: 1px solid #E2E8F0; border-radius: 11px; padding: 3px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.cg-nav button { border: 0; background: transparent; height: 30px; border-radius: 8px; color: #475569; cursor: pointer; }
.cg-nav button:not(.cg-nav-select) { width: 32px; font-size: 17px; line-height: 1; }
.cg-nav-select { border: 0; background: transparent; height: 30px; border-radius: 8px; color: var(--navy); font-size: 12.5px; font-weight: 600; font-family: inherit; cursor: pointer; outline: none; padding: 0 4px; }
.cg-nav-select:hover { background: #F1F5F9; }
.cg-nav button:hover { background: #F1F5F9; }
.cg-search { position: relative; display: flex; align-items: center; }
.cg-search span { position: absolute; left: 11px; color: #94A3B8; font-size: 13px; pointer-events: none; }
.cg-search input { border: 1px solid #E2E8F0; border-radius: 11px; padding: 8px 12px 8px 28px; font-size: 13px; font-family: inherit; width: 230px; background: #fff; color: var(--ink); outline: none; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.cg-search input:focus { border-color: #A5B4FC; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.cg-select { border: 1px solid #E2E8F0; border-radius: 11px; padding: 8px 11px; font-size: 13px; font-family: inherit; background: #fff; color: var(--ink); outline: none; cursor: pointer; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.cg-reload { border: 1px solid #E2E8F0; background: #fff; width: 38px; height: 38px; border-radius: 11px; color: #475569; cursor: pointer; font-size: 15px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.cg-reload:hover { background: #F1F5F9; color: var(--navy); }

/* KPIs */
.cg-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 18px; }
.cg-kpi { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(15,23,42,.04); }
.cg-kpi-head { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.cg-kpi-dot { width: 8px; height: 8px; border-radius: 3px; }
.cg-kpi-label { font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; color: #94A3B8; font-weight: 700; }
.cg-kpi-val { display: flex; align-items: baseline; gap: 6px; }
.cg-kpi-val span { font-size: 27px; font-weight: 700; color: var(--navy); line-height: 1; font-variant-numeric: tabular-nums; }
.cg-kpi-val small { font-size: 12px; color: #94A3B8; font-weight: 500; }

/* Card + scroll */
.cg-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 4px 20px rgba(15,23,42,.06); overflow: hidden; }
.cg-scroll { max-height: calc(100vh - 150px); overflow: auto; }
.cg-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.cg-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; border: 2px solid #fff; }

/* Grid compartido (header + filas) */
.cg-grid { display: grid; grid-template-columns: minmax(190px,1.2fr) minmax(175px,1.1fr) minmax(130px,.9fr) 104px 216px 146px 72px 38px; gap: 14px; align-items: center; }
.cg-colhead { padding: 9px 18px 9px 22px; position: sticky; top: 0; z-index: 6; background: #FBFCFE; border-bottom: 1px solid var(--line); }
.cg-colh { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: #94A3B8; font-weight: 700; }
.cg-colh-aula { color: #B45309; font-size: 9px; letter-spacing: .06em; margin-bottom: 3px; text-align: center; }
.cg-aula-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; align-items: center; }
.cg-aula-head span { font-size: 9.5px; color: #94A3B8; font-weight: 700; text-align: center; }
.cg-aula-head .amber { color: #B45309; }

/* Skeleton */
.cg-skrow { padding: 16px 18px 16px 22px; border-top: 1px solid #F1F4F9; }
.cg-sk { height: 13px; border-radius: 6px; background: linear-gradient(90deg,#F1F5F9,#E5EAF1,#F1F5F9); background-size: 200% 100%; animation: cgsk 1.3s infinite; }
@keyframes cgsk { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

/* Banda de semana */
.cg-band { display: flex; align-items: center; gap: 11px; padding: 10px 18px 10px 22px; background: #F4F6FB; border-top: 1px solid var(--line); cursor: pointer; position: sticky; top: 45px; z-index: 5; }
.cg-band:hover { background: #EDF1F8; }
.cg-caret { color: #64748B; font-size: 11px; width: 12px; display: inline-block; transition: transform .15s; }
.cg-caret.closed { transform: rotate(-90deg); }
.cg-band-accent { width: 7px; height: 18px; border-radius: 3px; background: var(--navy); }
.cg-band-label { font-size: 13.5px; font-weight: 700; color: var(--navy); }
.cg-band-count { font-size: 11px; font-weight: 600; color: #64748B; background: #fff; border: 1px solid #E2E8F0; border-radius: 999px; padding: 1px 9px; }
.cg-band-summary { margin-left: auto; font-size: 11.5px; color: #94A3B8; font-weight: 500; }

/* Filas */
.cg-rowwrap { border-top: 1px solid #F1F4F9; }
.cg-row { padding: 15px 18px 15px 19px; cursor: pointer; border-left: 3px solid; transition: box-shadow .15s, border-left-width .15s; }
.cg-row:hover { border-left-width: 6px; box-shadow: inset 0 0 0 9999px rgba(255,255,255,.35); }
.cg-min { min-width: 0; }
.cg-ident-top { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
.cg-seg { display: inline-block; min-width: 24px; text-align: center; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
.cg-vcode { font-family: ui-monospace, 'IBM Plex Mono', monospace; font-size: 10.5px; color: #94A3B8; font-weight: 500; }
.cg-course { font-size: 13.5px; font-weight: 600; color: var(--navy); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cg-linetype { font-size: 11.5px; color: #94A3B8; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cg-dates { font-family: ui-monospace, 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; color: var(--navy); white-space: nowrap; }
.cg-arrow { color: #CBD5E1; margin: 0 5px; }
.cg-sched { font-size: 11.5px; color: #64748B; margin-top: 3px; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cg-sched b { color: #475569; font-weight: 600; }
.cg-sched .sep { color: #CBD5E1; }
.cg-doc { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cg-doc-eyebrow { font-size: 9.5px; letter-spacing: .07em; text-transform: uppercase; color: #B4BECC; font-weight: 700; }
.cg-docname { font-size: 13px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cg-conf { display: flex; flex-direction: column; gap: 4px; }
.cg-conf > div { display: flex; align-items: center; gap: 7px; font-size: 11px; color: #64748B; }
.cg-dot { width: 9px; height: 9px; border-radius: 50%; box-sizing: border-box; flex-shrink: 0; }
.cg-dot.on { background: #10B981; box-shadow: 0 0 0 2px #D1FAE5; }
.cg-dot.off { background: #fff; border: 1.5px solid #CBD5E1; }
.cg-num { font-size: 13px; font-variant-numeric: tabular-nums; text-align: center; font-weight: 600; color: #334155; }
.cg-num.zero { font-weight: 400; color: #D5DCE6; }
.cg-num.bec { font-weight: 500; color: #94A3B8; }
.cg-num.bec.zero { color: #D5DCE6; }
.cg-aula { font-size: 14px; font-weight: 700; text-align: center; color: #B45309; font-variant-numeric: tabular-nums; }
.cg-colh-cons { text-align: center; }
.cg-cons { text-align: center; }
.cg-cons-num { font-size: 14px; font-weight: 700; text-align: center; color: #2563EB; font-variant-numeric: tabular-nums; }
.cg-cons-num.zero { font-weight: 400; color: #D5DCE6; }
.cg-goal-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 5px; }
.cg-goal-meta { font-size: 11px; color: #94A3B8; font-weight: 500; }
.cg-goal-pct { font-size: 10px; font-weight: 700; }
.cg-bar { height: 6px; border-radius: 999px; background: #EEF2F6; overflow: hidden; }
.cg-bar > div { height: 100%; border-radius: 999px; transition: width .4s; }
.cg-chev { display: flex; justify-content: center; color: #94A3B8; font-size: 11px; }
.cg-chev span { display: inline-block; transition: transform .18s; transform: rotate(-90deg); }
.cg-chev span.open { transform: rotate(0); }

/* Detalle expandible */
.cg-detail { background: #F8FAFD; border-top: 1px solid #EAEEF4; padding: 20px 24px 22px 22px; animation: cgfade .18s ease; }
@keyframes cgfade { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
.cg-detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; }
.cg-sec-head { display: flex; align-items: center; gap: 7px; margin-bottom: 11px; }
.cg-sec-bar { width: 4px; height: 13px; border-radius: 2px; }
.cg-sec-title { font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; font-weight: 700; }
.cg-field { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid #EEF2F7; }
.cg-field-k { font-size: 11.5px; color: #94A3B8; white-space: nowrap; }
.cg-field-v { font-size: 12.5px; font-weight: 600; color: #334155; text-align: right; }
.cg-field-v.v-mono { font-family: ui-monospace, 'IBM Plex Mono', monospace; color: var(--navy); }
.cg-field-v.v-yes { color: #047857; }
.cg-field-v.v-no { color: #CBD5E1; font-weight: 500; }
.cg-field-v.v-muted { color: #94A3B8; font-weight: 500; }
.cg-field-v.v-strong { color: var(--navy); font-weight: 700; }
.cg-field-v.v-neg { color: #DC2626; font-weight: 700; }
.cg-field-v.v-pos { color: #16A34A; font-weight: 700; }
.cg-note { margin-top: 18px; display: flex; align-items: center; gap: 9px; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; }
.cg-note-label { font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; font-weight: 700; color: #94A3B8; }
.cg-note-text { font-size: 12.5px; color: #475569; font-style: italic; }

/* Vacío + pie */
.cg-empty { text-align: center; padding: 64px 24px; color: #94A3B8; }
.cg-empty-icon { font-size: 34px; margin-bottom: 10px; opacity: .5; }
.cg-empty-title { font-size: 14px; font-weight: 600; color: #64748B; }
.cg-empty-sub { font-size: 12.5px; margin-top: 4px; }
.cg-foot { margin-top: 14px; display: flex; align-items: center; gap: 8px; color: #94A3B8; font-size: 11.5px; }
.cg-foot-dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; }

@media (max-width: 1100px) {
  .cg-kpis { grid-template-columns: repeat(2, 1fr); }
  .cg-detail-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
