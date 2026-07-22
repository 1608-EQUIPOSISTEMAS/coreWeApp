<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

// =====================================================================
// DateRangePicker - estilo Meta Ads Manager
// =====================================================================
// API:
//   v-model = { start, end, compare: { start, end, preset } | null }
// Trabaja con strings 'YYYY-MM-DD' (calendar dates, sin TZ) para evitar
// los problemas de fecha del host/DB documentados en memory.

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ start: null, end: null, compare: null }),
  },
  minDate: { type: String, default: null },
  maxDate: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue'])

// =====================================================================
// FECHAS - aritmetica calendario sin TZ
// =====================================================================
function ymd(date) {
  if (!(date instanceof Date)) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseYmd(s) {
  if (!s || typeof s !== 'string') return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function addDays(s, n) {
  const d = parseYmd(s)
  if (!d) return null
  d.setDate(d.getDate() + n)
  return ymd(d)
}

function addMonths(year, month, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function diffDays(a, b) {
  const A = parseYmd(a), B = parseYmd(b)
  if (!A || !B) return 0
  return Math.round((B - A) / 86400000)
}

function todayYmd() {
  return ymd(new Date())
}

const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MESES_ABBR = ['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sep.','oct.','nov.','dic.']
const DIAS_ABBR  = ['lun','mar','mié','jue','vie','sáb','dom']

function formatShortDate(s) {
  const d = parseYmd(s)
  if (!d) return ''
  return `${d.getDate()} ${MESES_ABBR[d.getMonth()]} ${d.getFullYear()}`
}

// Grid 6x7 para un mes, semana iniciando en lunes.
function monthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const firstWeekday = (first.getDay() + 6) % 7
  const weeks = []
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(year, month, 1 + w * 7 + d - firstWeekday))
    }
    weeks.push(week)
  }
  return weeks
}

// =====================================================================
// STATE
// =====================================================================
const open = ref(false)
const rootRef = ref(null)

const draftStart = ref(null)
const draftEnd = ref(null)
const draftCompareOn = ref(false)
const draftComparePreset = ref('previous')
const draftCompareStart = ref(null)
const draftCompareEnd = ref(null)

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const hoverDate = ref(null)
const selectionPhase = ref('start') // 'start' | 'end'

// =====================================================================
// PRESETS
// =====================================================================
const PRESETS = [
  { id: '7d',  label: 'Últimos 7 días',  days: 7 },
  { id: '14d', label: 'Últimos 14 días', days: 14 },
  { id: '30d', label: 'Últimos 30 días', days: 30 },
]

function applyPreset(preset) {
  const end = todayYmd()
  const start = addDays(end, -(preset.days - 1))
  draftStart.value = start
  draftEnd.value = end
  selectionPhase.value = 'start'
  recomputeCompareIfPreset()
  const startDate = parseYmd(start)
  viewYear.value = startDate.getFullYear()
  viewMonth.value = startDate.getMonth()
}

const activePresetId = computed(() => {
  if (!draftStart.value || !draftEnd.value) return null
  if (draftEnd.value !== todayYmd()) return null
  const span = diffDays(draftStart.value, draftEnd.value) + 1
  return PRESETS.find((p) => p.days === span)?.id || null
})

// =====================================================================
// COMPARE
// =====================================================================
const COMPARE_PRESETS = [
  { id: 'previous',      label: 'Periodo anterior' },
  { id: 'previous_year', label: 'Mismo periodo del año pasado' },
  { id: 'custom',        label: 'Personalizado' },
]

function computeComparePreset(presetId, start, end) {
  if (!start || !end) return { start: null, end: null }
  const span = diffDays(start, end) + 1
  if (presetId === 'previous') {
    return { start: addDays(start, -span), end: addDays(start, -1) }
  }
  if (presetId === 'previous_year') {
    const sd = parseYmd(start), ed = parseYmd(end)
    return {
      start: ymd(new Date(sd.getFullYear() - 1, sd.getMonth(), sd.getDate())),
      end:   ymd(new Date(ed.getFullYear() - 1, ed.getMonth(), ed.getDate())),
    }
  }
  return { start: draftCompareStart.value, end: draftCompareEnd.value }
}

function recomputeCompareIfPreset() {
  if (!draftCompareOn.value) return
  if (draftComparePreset.value === 'custom') return
  const cmp = computeComparePreset(
    draftComparePreset.value, draftStart.value, draftEnd.value,
  )
  draftCompareStart.value = cmp.start
  draftCompareEnd.value = cmp.end
}

watch(draftComparePreset, recomputeCompareIfPreset)
watch(draftCompareOn, (on) => { if (on) recomputeCompareIfPreset() })

// =====================================================================
// SELECCION VIA CLICK EN CALENDARIO
// =====================================================================
function clickDay(date) {
  if (!isSelectable(date)) return
  const s = ymd(date)
  if (selectionPhase.value === 'start') {
    draftStart.value = s
    draftEnd.value = s
    selectionPhase.value = 'end'
    return
  }
  if (s < draftStart.value) {
    draftStart.value = s
    draftEnd.value = s
    selectionPhase.value = 'end'
    return
  }
  draftEnd.value = s
  selectionPhase.value = 'start'
  recomputeCompareIfPreset()
}

function isSelectable(date) {
  const s = ymd(date)
  if (props.minDate && s < props.minDate) return false
  if (props.maxDate && s > props.maxDate) return false
  return true
}

function cellClass(date) {
  const s = ymd(date)
  const cls = []
  const inLeft = date.getFullYear() === viewYear.value && date.getMonth() === viewMonth.value
  const r = addMonths(viewYear.value, viewMonth.value, 1)
  const inRight = date.getFullYear() === r.year && date.getMonth() === r.month
  if (!inLeft && !inRight) cls.push('cell-out')
  if (!isSelectable(date)) cls.push('cell-disabled')
  if (s === todayYmd()) cls.push('cell-today')

  const ds = draftStart.value, de = draftEnd.value
  if (ds && de) {
    if (s === ds) cls.push('cell-start')
    if (s === de) cls.push('cell-end')
    if (s > ds && s < de) cls.push('cell-in-range')
  } else if (ds && s === ds) cls.push('cell-start')

  if (selectionPhase.value === 'end' && ds && hoverDate.value) {
    const h = hoverDate.value
    const lo = h < ds ? h : ds
    const hi = h < ds ? ds : h
    if (s >= lo && s <= hi) cls.push('cell-hover-range')
  }
  return cls
}

function hoverDay(date) { hoverDate.value = ymd(date) }

// =====================================================================
// CALENDARIOS RENDERIZADOS
// =====================================================================
const leftCalendar = computed(() => ({
  year: viewYear.value, month: viewMonth.value,
  weeks: monthMatrix(viewYear.value, viewMonth.value),
}))

const rightCalendar = computed(() => {
  const r = addMonths(viewYear.value, viewMonth.value, 1)
  return { year: r.year, month: r.month, weeks: monthMatrix(r.year, r.month) }
})

function shiftMonths(delta) {
  const r = addMonths(viewYear.value, viewMonth.value, delta)
  viewYear.value = r.year
  viewMonth.value = r.month
}

// =====================================================================
// COMMIT / CANCEL / OPEN
// =====================================================================
function syncDraftFromModel() {
  const v = props.modelValue || {}
  draftStart.value = v.start || null
  draftEnd.value = v.end || null
  draftCompareOn.value = !!v.compare
  if (v.compare) {
    draftCompareStart.value = v.compare.start || null
    draftCompareEnd.value = v.compare.end || null
    draftComparePreset.value = v.compare.preset || 'previous'
  } else {
    draftCompareStart.value = null
    draftCompareEnd.value = null
    draftComparePreset.value = 'previous'
  }
  const anchor = draftStart.value ? parseYmd(draftStart.value) : new Date()
  viewYear.value = anchor.getFullYear()
  viewMonth.value = anchor.getMonth()
  selectionPhase.value = 'start'
}

function openPanel()  { syncDraftFromModel(); open.value = true }
function closePanel() { open.value = false }
function cancel()     { closePanel() }

function commit() {
  emit('update:modelValue', {
    start: draftStart.value,
    end: draftEnd.value,
    compare: draftCompareOn.value
      ? {
          start: draftCompareStart.value,
          end: draftCompareEnd.value,
          preset: draftComparePreset.value,
        }
      : null,
  })
  closePanel()
}

// =====================================================================
// LABEL DEL TRIGGER
// =====================================================================
const triggerLabel = computed(() => {
  const v = props.modelValue || {}
  if (!v.start || !v.end) return 'Seleccionar periodo'
  const span = diffDays(v.start, v.end) + 1
  const presetMatch = PRESETS.find((p) => p.days === span && v.end === todayYmd())
  const prefix = presetMatch ? `${presetMatch.label}: ` : ''
  return `${prefix}${formatShortDate(v.start)} - ${formatShortDate(v.end)}`
})

const hasComparison = computed(() => !!props.modelValue?.compare?.start)

// =====================================================================
// CLICK FUERA = CERRAR
// =====================================================================
function onDocumentClick(ev) {
  if (!open.value || !rootRef.value) return
  if (!rootRef.value.contains(ev.target)) closePanel()
}

onMounted(() => document.addEventListener('mousedown', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick))
</script>

<template>
  <div ref="rootRef" class="drp-root">
    <button
      type="button"
      class="drp-trigger"
      :class="{ 'drp-trigger-open': open }"
      @click="open ? closePanel() : openPanel()"
    >
      <i class="fa-regular fa-calendar"></i>
      <span class="drp-trigger-label">{{ triggerLabel }}</span>
      <span v-if="hasComparison" class="drp-trigger-compare">vs comparar</span>
      <i class="fa-solid fa-chevron-down drp-caret"></i>
    </button>

    <div v-if="open" class="drp-panel">
      <aside class="drp-presets">
        <header class="drp-presets-head">Usados recientemente</header>
        <button
          v-for="p in PRESETS"
          :key="p.id"
          type="button"
          class="drp-preset"
          :class="{ active: activePresetId === p.id }"
          @click="applyPreset(p)"
        >
          <span class="drp-radio" :class="{ checked: activePresetId === p.id }"></span>
          {{ p.label }}
        </button>
      </aside>

      <main class="drp-main">
        <div class="drp-cal-row">
          <button type="button" class="drp-nav" @click="shiftMonths(-1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="drp-cal">
            <div class="drp-cal-head">
              <span class="drp-cal-month">{{ MESES_ABBR[leftCalendar.month] }}</span>
              <span class="drp-cal-year">{{ leftCalendar.year }}</span>
            </div>
            <div class="drp-cal-weekdays">
              <span v-for="d in DIAS_ABBR" :key="d">{{ d }}</span>
            </div>
            <div class="drp-cal-grid">
              <button
                v-for="(date, i) in leftCalendar.weeks.flat()"
                :key="`l-${i}`"
                type="button"
                class="drp-cell"
                :class="cellClass(date)"
                @click="clickDay(date)"
                @mouseenter="hoverDay(date)"
              >{{ date.getDate() }}</button>
            </div>
          </div>
          <div class="drp-cal">
            <div class="drp-cal-head">
              <span class="drp-cal-month">{{ MESES_ABBR[rightCalendar.month] }}</span>
              <span class="drp-cal-year">{{ rightCalendar.year }}</span>
            </div>
            <div class="drp-cal-weekdays">
              <span v-for="d in DIAS_ABBR" :key="`r-${d}`">{{ d }}</span>
            </div>
            <div class="drp-cal-grid">
              <button
                v-for="(date, i) in rightCalendar.weeks.flat()"
                :key="`r-${i}`"
                type="button"
                class="drp-cell"
                :class="cellClass(date)"
                @click="clickDay(date)"
                @mouseenter="hoverDay(date)"
              >{{ date.getDate() }}</button>
            </div>
          </div>
          <button type="button" class="drp-nav" @click="shiftMonths(1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div class="drp-compare">
          <label class="drp-compare-toggle">
            <input type="checkbox" v-model="draftCompareOn" />
            <span class="drp-check"></span>
            <span>Comparar</span>
          </label>
          <div v-if="draftCompareOn" class="drp-compare-controls">
            <select v-model="draftComparePreset" class="drp-select">
              <option v-for="p in COMPARE_PRESETS" :key="p.id" :value="p.id">{{ p.label }}</option>
            </select>
            <span class="drp-compare-range">
              <input
                type="date" class="drp-date-input"
                v-model="draftCompareStart"
                :disabled="draftComparePreset !== 'custom'"
              />
              <span class="drp-dash">–</span>
              <input
                type="date" class="drp-date-input"
                v-model="draftCompareEnd"
                :disabled="draftComparePreset !== 'custom'"
              />
            </span>
          </div>
        </div>

        <footer class="drp-foot">
          <span class="drp-tz">Las fechas se muestran con formato de Hora de Lima</span>
          <div class="drp-foot-actions">
            <button type="button" class="drp-btn" @click="cancel">Cancelar</button>
            <button
              type="button"
              class="drp-btn drp-btn-primary"
              :disabled="!draftStart || !draftEnd"
              @click="commit"
            >Actualizar</button>
          </div>
        </footer>
      </main>
    </div>
  </div>
</template>

<style scoped>
.drp-root {
  position: relative;
  display: inline-block;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --drp-line: #E2E2DC;
  --drp-line-soft: #EEEEE8;
  --drp-ink: #14140F;
  --drp-ink-2: #3A3A33;
  --drp-ink-3: #6F6F66;
  --drp-ink-4: #A0A099;
  --drp-bg-soft: #F7F7F2;
  --drp-accent: #1877F2;
  --drp-accent-soft: #E7F0FE;
}

.drp-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 8px;
  background: white; border: 1px solid var(--drp-line);
  font-size: 13px; color: var(--drp-ink); font-weight: 500;
  cursor: pointer; transition: border-color .15s, box-shadow .15s;
  min-width: 320px;
}
.drp-trigger:hover { border-color: #BFBFB6; }
.drp-trigger-open {
  border-color: var(--drp-accent);
  box-shadow: 0 0 0 3px rgba(24,119,242,.12);
}
.drp-trigger .fa-calendar { color: var(--drp-ink-3); }
.drp-trigger-label { flex: 1; text-align: left; }
.drp-trigger-compare {
  font-size: 10.5px; color: var(--drp-accent); font-weight: 700;
  background: var(--drp-accent-soft); padding: 1px 7px; border-radius: 999px;
}
.drp-caret { color: var(--drp-ink-3); font-size: 10px; }

.drp-panel {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
  display: grid; grid-template-columns: 240px 1fr;
  background: white;
  border: 1px solid var(--drp-line);
  border-radius: 12px;
  box-shadow: 0 6px 32px rgba(20,20,15,.12), 0 1px 3px rgba(20,20,15,.06);
  overflow: hidden;
  min-width: 820px;
  font-size: 13px;
}

.drp-presets {
  background: white;
  border-right: 1px solid var(--drp-line-soft);
  padding: 16px 12px;
  max-height: 460px; overflow-y: auto;
}
.drp-presets-head {
  font-size: 13.5px; font-weight: 700; color: var(--drp-ink);
  padding: 0 8px 12px;
}
.drp-preset {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px 10px; border-radius: 8px;
  border: none; background: transparent; cursor: pointer;
  text-align: left; color: var(--drp-ink-2); font-size: 13px;
  transition: background .12s;
}
.drp-preset:hover { background: var(--drp-bg-soft); }
.drp-preset.active { color: var(--drp-ink); font-weight: 600; }

.drp-radio {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  border: 1.5px solid var(--drp-ink-4); flex-shrink: 0;
}
.drp-radio.checked { border-color: var(--drp-accent); background: white; }
.drp-radio.checked::after {
  content: ''; width: 8px; height: 8px; border-radius: 50%;
  background: var(--drp-accent);
}

.drp-main { padding: 18px 22px 14px; min-width: 0; }

.drp-cal-row {
  display: flex; align-items: flex-start; gap: 18px; justify-content: center;
}
.drp-cal { flex: 0 0 auto; width: 240px; }
.drp-cal-head {
  display: flex; justify-content: center; gap: 6px;
  margin-bottom: 10px;
  font-size: 13px; color: var(--drp-ink); font-weight: 500;
}
.drp-cal-month::after, .drp-cal-year::after {
  content: ' ▾'; color: var(--drp-ink-3); font-size: 10px;
}

.drp-nav {
  width: 28px; height: 28px; border-radius: 50%;
  border: none; background: transparent; cursor: pointer;
  color: var(--drp-ink-2); font-size: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  align-self: center; margin-top: 6px;
}
.drp-nav:hover { background: var(--drp-bg-soft); }

.drp-cal-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}
.drp-cal-weekdays span {
  text-align: center; font-size: 10.5px; color: var(--drp-ink-3);
  font-weight: 500; padding: 4px 0;
}

.drp-cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px;
}
.drp-cell {
  position: relative;
  border: none; background: transparent; cursor: pointer;
  height: 32px; font-size: 12.5px; color: var(--drp-ink);
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .1s;
}
.drp-cell:hover:not(.cell-disabled):not(.cell-out) {
  background: var(--drp-accent-soft);
}
.drp-cell.cell-out      { color: var(--drp-ink-4); cursor: default; }
.drp-cell.cell-disabled { color: var(--drp-ink-4); cursor: not-allowed; }
.drp-cell.cell-today    { font-weight: 700; }
.drp-cell.cell-today::after {
  content: ''; position: absolute; bottom: 4px;
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--drp-accent);
}
.drp-cell.cell-in-range,
.drp-cell.cell-hover-range { background: var(--drp-accent-soft); }
.drp-cell.cell-start,
.drp-cell.cell-end {
  background: var(--drp-accent); color: white; font-weight: 600;
  border-radius: 50%; z-index: 1;
}
.drp-cell.cell-today.cell-start::after,
.drp-cell.cell-today.cell-end::after { background: white; }

.drp-compare {
  margin: 16px 0 4px; padding-top: 14px;
  border-top: 1px solid var(--drp-line-soft);
  display: flex; flex-direction: column; gap: 10px;
}
.drp-compare-toggle {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--drp-ink-2); cursor: pointer;
}
.drp-compare-toggle input { display: none; }
.drp-check {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 4px;
  border: 1.5px solid var(--drp-ink-4); background: white;
}
.drp-compare-toggle input:checked + .drp-check {
  background: var(--drp-accent); border-color: var(--drp-accent);
}
.drp-compare-toggle input:checked + .drp-check::after {
  content: '\2713'; color: white; font-size: 10px; font-weight: 700;
}
.drp-compare-controls {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding-left: 26px;
}
.drp-select {
  border: 1px solid var(--drp-line); border-radius: 6px;
  padding: 5px 8px; font-size: 12.5px; background: white; color: var(--drp-ink);
  min-width: 200px;
}
.drp-compare-range { display: inline-flex; align-items: center; gap: 6px; }
.drp-date-input {
  border: 1px solid var(--drp-line); border-radius: 6px;
  padding: 5px 8px; font-size: 12.5px; background: white;
  color: var(--drp-ink); font-family: inherit;
}
.drp-date-input:disabled { background: var(--drp-bg-soft); color: var(--drp-ink-3); }
.drp-dash { color: var(--drp-ink-3); }

.drp-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px solid var(--drp-line-soft);
}
.drp-tz { font-size: 11.5px; color: var(--drp-ink-3); }
.drp-foot-actions { display: flex; gap: 8px; }
.drp-btn {
  padding: 7px 14px; border-radius: 6px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--drp-line); background: white; color: var(--drp-ink-2);
}
.drp-btn:hover { background: var(--drp-bg-soft); }
.drp-btn-primary {
  background: var(--drp-accent); color: white; border-color: var(--drp-accent);
}
.drp-btn-primary:hover { background: #156EDE; }
.drp-btn-primary:disabled {
  background: var(--drp-ink-4); border-color: var(--drp-ink-4); cursor: not-allowed;
}

/* ═══════════ DARK MODE ═══════════ */
/* El panel NO usa Teleport (absolute dentro de .drp-root), así que
   hereda los tokens redefinidos aquí. Overrides puntuales para los
   `white` / hex hardcodeados fuera de tokens. */
[data-coreui-theme="dark"] .drp-root {
  --drp-line: #2A2A22;
  --drp-line-soft: #24241E;
  --drp-ink: #F4F4F0;
  --drp-ink-2: #C4C4BC;
  --drp-ink-3: #A0A099;
  --drp-ink-4: #6F6F66;
  --drp-bg-soft: #1F1F1A;
  --drp-accent: #60A5FA;
  --drp-accent-soft: rgba(59, 130, 246, 0.16);
  color-scheme: dark;
}
[data-coreui-theme="dark"] .drp-trigger { background: #1A1A14; }
[data-coreui-theme="dark"] .drp-trigger:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .drp-trigger-open {
  border-color: var(--drp-accent);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, .18);
}
[data-coreui-theme="dark"] .drp-panel {
  background: #1A1A14;
  box-shadow: 0 6px 32px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.3);
}
[data-coreui-theme="dark"] .drp-presets { background: #1A1A14; }
[data-coreui-theme="dark"] .drp-radio.checked { background: #1A1A14; }
[data-coreui-theme="dark"] .drp-cell.cell-start,
[data-coreui-theme="dark"] .drp-cell.cell-end { color: #14140F; }
[data-coreui-theme="dark"] .drp-cell.cell-today.cell-start::after,
[data-coreui-theme="dark"] .drp-cell.cell-today.cell-end::after { background: #14140F; }
[data-coreui-theme="dark"] .drp-check { background: #1A1A14; }
[data-coreui-theme="dark"] .drp-compare-toggle input:checked + .drp-check::after { color: #14140F; }
[data-coreui-theme="dark"] .drp-select,
[data-coreui-theme="dark"] .drp-date-input { background: #1A1A14; }
[data-coreui-theme="dark"] .drp-btn { background: #1A1A14; }
[data-coreui-theme="dark"] .drp-btn-primary { background: var(--drp-accent); color: #14140F; }
[data-coreui-theme="dark"] .drp-btn-primary:hover { background: #7FB5FB; }
[data-coreui-theme="dark"] .drp-btn-primary:disabled { color: #F4F4F0; }
</style>
