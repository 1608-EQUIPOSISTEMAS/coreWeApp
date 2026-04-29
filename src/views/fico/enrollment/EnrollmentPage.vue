<template>
  <div class="enrollment-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">FICO</span>
        <h1 class="ep-title">Inscripciones</h1>
        <span class="ep-subtitle">Panel de control diario</span>
      </div>
      <div class="ep-masthead-actions">
        <div class="ep-view-toggle">
          <button :class="['ep-toggle-btn', { 'is-active': list.viewMode.value === 'compact' }]" @click="list.viewMode.value = 'compact'">
            <i class="fa-solid fa-list"></i> Compacta
          </button>
          <button :class="['ep-toggle-btn', { 'is-active': list.viewMode.value === 'expanded' }]" @click="list.viewMode.value = 'expanded'">
            <i class="fa-solid fa-table-columns"></i> Expandida
          </button>
        </div>
        <button class="ep-btn-sheet" :disabled="syncingSheet" @click="syncToSheet" title="Subir ventas aprobadas a Google Sheets">
          <i class="fa-solid" :class="syncingSheet ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'"></i>
          {{ syncingSheet ? 'Sincronizando...' : 'Sincronizar ventas' }}
        </button>
        <button class="ep-btn-new" @click="list.goNew()"><i class="fa-solid fa-plus"></i> Nueva inscripcion</button>
      </div>
    </header>

    <!-- KPI Section -->
    <section class="ep-section">
      <div class="ep-kpis">
        <article v-for="k in kpiCards" :key="k.key" class="ep-kpi" :class="[`ep-kpi-${k.color}`, { 'is-missing': k.isMissing }]">
          <div class="ep-kpi-head">
            <span class="ep-kpi-label">{{ k.label }}</span>
            <i class="fa-solid ep-kpi-icon" :class="k.icon"></i>
          </div>
          <div class="ep-kpi-main">
            <span class="ep-kpi-value">{{ k.formatted }}</span>
            <span v-if="!k.isMissing" class="ep-kpi-delta" :class="deltaClass(k.delta, k.invertDelta)">
              <i class="fa-solid" :class="deltaIcon(k.delta)"></i>
              {{ formatDelta(k.delta, k.unit) }}
            </span>
          </div>
          <span class="ep-kpi-foot">
            <template v-if="!k.isMissing">vs ayer <strong>{{ (k.unit === 'money' ? 'S/ ' : '') + formatVal(k.yesterday, k.unit) }}</strong></template>
            <template v-else>Sin datos disponibles</template>
          </span>
        </article>
      </div>
    </section>

    <!-- Saved Views + Toolbar -->
    <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': list.activeFilterChips.value.length > 0 }">
      <div class="ep-filter-bar-main">
        <nav class="ep-tabs" aria-label="Vistas rapidas">
          <button
            v-for="v in list.savedViews.value"
            :key="v.key"
            :class="['ep-tab', { 'is-active': list.activeViewKey.value === v.key, 'is-highlight': v.highlight }]"
            @click="list.applySavedView(v.key)"
          >
            <i class="fa-solid" :class="v.icon"></i> {{ v.label }}
          </button>
        </nav>

        <div class="ep-toolbar">
          <BasePagination v-model="list.pagin.value" @open-filters="list.openFilterModal" @change="list.handlePaginationChange" />
        </div>
      </div>

      <div v-if="list.activeFilterChips.value.length > 0" class="ep-filter-strip">
        <span class="ep-filter-strip-badge">
          <i class="fa-solid fa-circle-half-stroke"></i>
          Filtros activos
          <span class="ep-filter-strip-count">{{ list.activeFilterChips.value.length }}</span>
        </span>
        <BaseFilterChips :items="list.activeFilterChips.value" @remove="onChipRemove" @clear-all="onClearAll" />
      </div>
    </section>

    <!-- Split: table + panel (panel slides in only on row selection) -->
    <div class="ep-split" :class="{ 'has-panel': list.viewMode.value === 'compact' && !!list.selectedEnrollment.value }">
      <div class="ep-split-main">
        <EnrollmentCompactTable
          v-if="list.viewMode.value === 'compact'"
          :enrollments="list.filteredEnrollments.value"
          :col-filters="list.colFilters"
          :unique-agents="list.uniqueAgents.value"
          :unique-estados="list.uniqueEstados.value"
          :is-loading="list.isLoading.value"
          :selected-id="list.selectedEnrollment.value?.enrollment_id"
          :selected-ids="bulkSelected"
          @select-row="list.selectEnrollment"
          @toggle-select="toggleSelectOne"
          @toggle-select-all="toggleSelectAll"
        />

        <EnrollmentExpandedTable
          v-if="list.viewMode.value === 'expanded'"
          :enrollments="list.filteredEnrollments.value"
          :is-loading="list.isLoading.value"
        />
      </div>

      <transition name="ep-panel-slide">
        <EnrollmentSidePanel
          v-if="list.viewMode.value === 'compact' && list.selectedEnrollment.value"
          :enrollment="list.selectedEnrollment.value"
          @close="list.clearSelection"
          @view-full="goToFullDetail"
        />
      </transition>
    </div>

    <!-- Barra flotante de acciones en lote -->
    <Transition name="ep-bulk-fade">
      <div v-if="bulkSelected.size > 0" class="ep-bulk-bar">
        <div class="ep-bulk-info">
          <i class="fa-solid fa-check-double"></i>
          <strong>{{ bulkSelected.size }}</strong> {{ bulkSelected.size === 1 ? 'inscripcion seleccionada' : 'inscripciones seleccionadas' }}
        </div>
        <div class="ep-bulk-actions">
          <button class="ep-bulk-btn ep-bulk-btn-secondary" @click="clearBulkSelection">
            <i class="fa-solid fa-xmark"></i> Limpiar
          </button>
          <button class="ep-bulk-btn ep-bulk-btn-primary" @click="processSelectionInQueue">
            <i class="fa-solid fa-list-check"></i> Procesar en cola
          </button>
        </div>
      </div>
    </Transition>

    <EnrollmentFilterModal
      :visible="list.showFilterModal.value"
      @update:visible="v => list.showFilterModal.value = v"
      :filters="list.filters"
      :filtro-status="list.filtroStatus.value"
      :filtro-owners="list.filtroOwners.value"
      :filtro-payment-channel="list.filtroPaymentChannel.value"
      :filtro-tipos-programa="list.filtroTiposPrograma.value"
      :filtro-modalidad="list.filtroModalidad.value"
      :filtro-orden="list.filtroOrden.value"
      @apply="onModalApply"
      @clear="onClearAll"
      @date-change="list.handleDateChange"
    />
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useEnrollmentList } from '@/composables/useEnrollmentList'
import { ServiceKeys } from '@/services'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import EnrollmentCompactTable from './EnrollmentCompactTable.vue'
import EnrollmentExpandedTable from './EnrollmentExpandedTable.vue'
import EnrollmentFilterModal from './EnrollmentFilterModal.vue'
import EnrollmentSidePanel from './EnrollmentSidePanel.vue'

const list = useEnrollmentList()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const integrationService = inject(ServiceKeys.Integration)

// === Sync ventas a Google Sheets ===
const syncingSheet = ref(false)
async function syncToSheet () {
  if (syncingSheet.value) return
  syncingSheet.value = true
  try {
    const resp = await integrationService.syncFicoToSheets()
    const ventas = resp?.data?.ventas?.rows_synced ?? 0
    const aula = resp?.data?.aula?.rows_synced ?? 0
    toast.success(`Ventas: ${ventas} filas · Aula: ${aula} filas sincronizadas`, { timeout: 5000 })
  } catch (err) {
    console.error('[syncToSheet]', err)
    const msg = err?.response?.data?.error || err?.message || 'Error al sincronizar'
    toast.error(`No se pudo sincronizar: ${msg}`, { timeout: 7000 })
  } finally {
    syncingSheet.value = false
  }
}

// === URL sync: persiste vista + busqueda + pagina en query params ===
// Permite compartir URLs y conservar contexto al hacer F5.
// Solo sincroniza los filtros mas comunes; el resto sigue persistiendo en localStorage.
let syncingFromUrl = false

function syncFiltersToUrl () {
  if (syncingFromUrl) return
  const q = {}
  if (list.activeViewKey.value && list.activeViewKey.value !== 'all') q.view = list.activeViewKey.value
  if (list.filters.q) q.q = list.filters.q
  if (list.pagin.value.page > 1) q.page = String(list.pagin.value.page)
  router.replace({ query: q }).catch(() => {})
}

function applyFromUrl () {
  syncingFromUrl = true
  try {
    const view = route.query.view
    const q = route.query.q
    const page = parseInt(route.query.page) || 1
    if (view && typeof view === 'string') {
      list.applySavedView(view)
    }
    if (q && typeof q === 'string') {
      list.filters.q = q
    }
    if (page > 1) {
      list.pagin.value.page = page
    }
  } finally {
    syncingFromUrl = false
  }
}

watch(() => list.activeViewKey.value, syncFiltersToUrl)
watch(() => list.filters.q, syncFiltersToUrl)
watch(() => list.pagin.value.page, syncFiltersToUrl)

// === Bulk selection ===
// Set de enrollment_id seleccionados. Se usa en la columna checkbox del listado
// y en la barra flotante de acciones.
const bulkSelected = ref(new Set())

function toggleSelectOne (enrollmentId) {
  const id = Number(enrollmentId)
  const next = new Set(bulkSelected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  bulkSelected.value = next
}

function toggleSelectAll (checked) {
  if (!checked) {
    bulkSelected.value = new Set()
    return
  }
  const next = new Set()
  list.filteredEnrollments.value.forEach(e => next.add(Number(e.enrollment_id)))
  bulkSelected.value = next
}

function clearBulkSelection () {
  bulkSelected.value = new Set()
}

// "Procesar en cola": guarda los IDs en localStorage y navega al primero.
// EnrollmentDetailView lee la cola en startRedirect y avanza al siguiente al confirmar.
function processSelectionInQueue () {
  const ids = Array.from(bulkSelected.value)
  if (ids.length === 0) return
  try {
    localStorage.setItem('fico_processing_queue', JSON.stringify(ids))
  } catch (e) { /* ignore */ }
  clearBulkSelection()
  router.push({ name: 'enrollmentDetail', params: { id: String(ids[0]) } })
}

// Build KPI cards. When data is partial (DB couldn't return full sample),
// breakdown KPIs come back null — show '—' instead of fake zeros.
const kpiCards = computed(() => {
  const t = list.kpisDaily.value.today
  const y = list.kpisDaily.value.yesterday
  const card = (key, label, icon, color, valToday, valYday, unit, invertDelta = false) => {
    const isMissing = valToday == null
    const delta = isMissing ? 0 : valToday - (valYday || 0)
    return {
      key, label, icon, color,
      today: valToday, yesterday: valYday,
      delta, isMissing, unit, invertDelta,
      formatted: isMissing ? '—' : (unit === 'money' ? 'S/ ' : '') + formatVal(valToday, unit)
    }
  }
  return [
    card('total',     'Inscripciones', 'fa-user-plus',       'indigo', t.total,     y.total,     'count'),
    card('pending',   'Pendientes',    'fa-hourglass-half',  'amber',  t.pending,   y.pending,   'count', true),
    card('confirmed', 'Confirmadas',   'fa-circle-check',    'green',  t.confirmed, y.confirmed, 'count'),
    card('amount',    'Monto neto',    'fa-coins',           'teal',   t.amount,    y.amount,    'money')
  ]
})

function formatVal (n, unit) {
  if (unit === 'money') return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return Number(n || 0).toLocaleString('es-PE')
}
function formatDelta (delta, unit) {
  if (delta === 0) return 'sin cambio'
  const abs = Math.abs(delta)
  return (delta > 0 ? '+' : '-') + (unit === 'money' ? 'S/ ' : '') + formatVal(abs, unit)
}
function deltaIcon (delta) {
  if (delta > 0) return 'fa-arrow-up'
  if (delta < 0) return 'fa-arrow-down'
  return 'fa-minus'
}
// invertDelta=true means "going up is bad" (e.g., more pendientes is worse).
function deltaClass (delta, invert = false) {
  if (delta === 0) return 'is-flat'
  const positive = invert ? delta < 0 : delta > 0
  return positive ? 'is-up' : 'is-down'
}

function goToFullDetail (e) {
  router.push({
    name: 'enrollmentDetail',
    params: { id: e.enrollment_id },
    state: { enrollment: JSON.parse(JSON.stringify(e)) }
  })
}

function onChipRemove (key) { list.activeViewKey.value = null; list.clearFilter(key) }
function onClearAll () { list.activeViewKey.value = null; list.clearFilters() }
function onModalApply () { list.activeViewKey.value = null; list.applyFilters() }

function onKeyDown (e) {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
  if (e.key === '1') {
    e.preventDefault()
    list.viewMode.value = 'compact'
  } else if (e.key === '2') {
    e.preventDefault()
    list.viewMode.value = 'expanded'
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  list.loadOwners()
  // Prioridad de carga:
  // 1. URL query params (si hay) -> contexto compartido por link
  // 2. localStorage (manejado por useTablePersistence dentro del composable)
  // 3. Default segun viewMode actual: compact aplica filtro Activo, expanded
  //    no aplica filtro de student_status (muestra todos).
  const hasUrlParams = !!(route.query.view || route.query.q || route.query.page)
  if (hasUrlParams) {
    applyFromUrl()
  } else if (list.viewMode.value === 'compact') {
    list.applyCompactViewFilter()
  } else if (list.viewMode.value === 'expanded') {
    list.applyExpandedViewFilter()
  }
  await list.fetchEnrollments()
  list.fetchKpisDaily()
})

// Switch de vista: re-aplica el filtro de student_status correspondiente y refetch.
// Compact = solo Activos. Expanded = todos los estados.
watch(() => list.viewMode.value, (newMode, oldMode) => {
  if (!oldMode || newMode === oldMode) return
  if (newMode === 'compact') {
    list.applyCompactViewFilter()
  } else if (newMode === 'expanded') {
    list.applyExpandedViewFilter()
  }
  list.pagin.value.page = 1
  list.fetchEnrollments()
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.enrollment-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
}

/* === Masthead === */
.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}
.ep-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ep-breadcrumb {
  font-size: 11px;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.ep-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle {
  font-size: 13.5px;
  color: var(--e-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}
.ep-masthead-actions { display: flex; align-items: center; gap: 10px; }
.ep-view-toggle { display: flex; background: #fff; border: 1px solid var(--e-border); border-radius: 8px; padding: 3px; }
.ep-toggle-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 12px; font-weight: 500;
  color: var(--e-text-secondary); background: transparent;
  border: none; border-radius: 6px; cursor: pointer;
  transition: all .2s ease; font-family: inherit;
}
.ep-toggle-btn.is-active {
  background: var(--e-bg-subtle);
  color: var(--e-text); font-weight: 600;
}
.ep-toggle-btn:not(.is-active):hover { color: var(--e-text); }
.ep-btn-new {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; font-size: 13px; font-weight: 600;
  color: #fff; background: var(--e-text);
  border: none; border-radius: 8px; cursor: pointer;
  transition: background .2s ease; font-family: inherit;
  letter-spacing: -0.01em;
}
.ep-btn-new:hover { background: #333; }
.ep-btn-new i { font-size: 11px; }

.ep-btn-sheet {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 13px; font-weight: 600;
  color: var(--e-text); background: #fff;
  border: 1px solid var(--e-border); border-radius: 8px; cursor: pointer;
  transition: all .2s ease; font-family: inherit;
}
.ep-btn-sheet:hover:not(:disabled) { border-color: #34A853; color: #1E7E34; background: #F0FDF4; }
.ep-btn-sheet:disabled { opacity: 0.6; cursor: not-allowed; }
.ep-btn-sheet i { font-size: 11px; }

/* === Section wrapper (transparent by default — Aulas style) === */
.ep-section {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
}
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(16, 185, 129, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.06);
}
.ep-filter-bar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.ep-section.ep-filter-bar .ep-tabs {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
  flex: 0 1 auto;
}
.ep-section.ep-filter-bar .ep-toolbar {
  flex: 1 1 auto;
  justify-content: flex-end;
}

/* Strip de filtros activos: aparece debajo de la fila principal cuando hay chips.
   Tinte verde sutil para reforzar el estado "modo filtrado". */
.ep-filter-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-top: 1px solid var(--e-border);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.ep-filter-strip-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: #047857;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.ep-filter-strip-badge i { font-size: 11px; }
.ep-filter-strip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  background: var(--e-accent);
  color: #fff;
  border-radius: 9px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
/* La barra de chips dentro del strip ya no necesita su margin-bottom ni el
   label "Filtros:" propio (lo reemplaza el badge). */
.ep-filter-strip :deep(.active-filters) {
  margin-bottom: 0;
  flex: 1 1 auto;
}
.ep-filter-strip :deep(.active-filters .label) {
  display: none;
}
.ep-section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.ep-section-title {
  font-size: 13px; font-weight: 700; margin: 0;
  color: var(--e-text); letter-spacing: -0.01em;
}
.ep-section-meta {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; color: var(--e-text-muted); font-weight: 500;
}
.ep-section-meta i { font-size: 10px; }
.ep-refresh-btn {
  width: 26px; height: 26px;
  border: 1px solid var(--e-border);
  background: #fff;
  border-radius: 6px; cursor: pointer;
  color: var(--e-text-secondary); font-size: 11px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 0.15s ease; margin-left: 4px;
}
.ep-refresh-btn:hover:not(:disabled) {
  background: var(--e-accent-soft);
  border-color: var(--e-accent);
  color: var(--e-accent);
}
.ep-refresh-btn:disabled { opacity: 0.5; cursor: wait; }

/* === KPI cards === */
.ep-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.ep-kpi {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.ep-kpi:hover {
  border-color: var(--e-border-strong);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04);
}
.ep-kpi::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: currentColor;
}
.ep-kpi-head {
  display: flex; justify-content: space-between; align-items: center;
}
.ep-kpi-label {
  font-size: 11px; font-weight: 600;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ep-kpi-icon {
  font-size: 12px;
  color: currentColor;
  opacity: 0.65;
}
.ep-kpi-main {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 8px;
}
.ep-kpi-value {
  font-size: 30px;
  font-weight: 600;
  color: var(--e-text);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.ep-kpi-delta {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600;
  padding: 3px 7px; border-radius: 5px;
  font-variant-numeric: tabular-nums;
}
.ep-kpi-delta i { font-size: 9px; }
.ep-kpi-delta.is-up   { color: #047857; background: #ECFDF5; }
.ep-kpi-delta.is-down { color: #B91C1C; background: #FEF2F2; }
.ep-kpi-delta.is-flat { color: var(--e-text-muted); background: #F5F5F5; }
.ep-kpi-foot {
  font-size: 11px; color: var(--e-text-muted);
  border-top: 1px solid var(--e-border);
  padding-top: 8px; margin-top: 2px;
}
.ep-kpi-foot strong { color: var(--e-text-secondary); font-weight: 600; font-variant-numeric: tabular-nums; }

.ep-kpi-indigo { color: #6366F1; }
.ep-kpi-amber  { color: #D97706; }
.ep-kpi-green  { color: #10B981; }
.ep-kpi-teal   { color: #0D9488; }

/* Visually de-emphasize KPIs whose data couldn't be loaded */
.ep-kpi.is-missing { color: #A3A3A3; }
.ep-kpi.is-missing .ep-kpi-value { color: #A3A3A3; font-size: 22px; }

/* === Tabs === */
.ep-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--e-border);
}
.ep-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px;
  font-size: 12.5px; font-weight: 500;
  color: var(--e-text-secondary);
  background: var(--e-bg-subtle);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s ease;
  font-family: inherit;
}
.ep-tab i { font-size: 11px; opacity: 0.7; }
.ep-tab:hover {
  color: var(--e-text);
  background: #F5F5F5;
}
.ep-tab.is-active {
  color: var(--e-accent);
  background: var(--e-accent-soft);
  border-color: rgba(13, 148, 136, 0.25);
  font-weight: 600;
}
.ep-tab.is-active i { opacity: 1; }

/* Tab destacado (vista por defecto = trabajo del dia).
   Mantiene el minimalismo: solo un punto sutil que indica "este es el atajo principal". */
.ep-tab.is-highlight i { opacity: 1; }
.ep-tab.is-highlight::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--e-accent);
  margin-right: 6px;
  vertical-align: middle;
}

/* === Bulk action bar === */
.ep-bulk-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 18px;
  background: #1A1A1A;
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,.20);
  z-index: 1000;
  font-size: 13px;
}
.ep-bulk-info { display: flex; align-items: center; gap: 8px; }
.ep-bulk-info i { color: #34D399; }
.ep-bulk-info strong { font-size: 14px; }
.ep-bulk-actions { display: flex; gap: 8px; }
.ep-bulk-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all .15s;
}
.ep-bulk-btn-secondary {
  background: rgba(255,255,255,.10);
  color: rgba(255,255,255,.85);
}
.ep-bulk-btn-secondary:hover { background: rgba(255,255,255,.18); }
.ep-bulk-btn-primary {
  background: #0D9488;
  color: #fff;
}
.ep-bulk-btn-primary:hover { background: #0F766E; }

.ep-bulk-fade-enter-active,
.ep-bulk-fade-leave-active {
  transition: opacity .2s, transform .2s;
}
.ep-bulk-fade-enter-from,
.ep-bulk-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

/* === Toolbar === */
.ep-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}

/* === Split layout === */
.ep-split {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.ep-split-main {
  flex: 1;
  min-width: 0;
  transition: max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.ep-split.has-panel .ep-split-main {
  max-width: calc(100% - 396px);
}

/* Panel slide animation */
.ep-panel-slide-enter-active,
.ep-panel-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
}
.ep-panel-slide-enter-from,
.ep-panel-slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* Responsive */
@media (max-width: 1280px) {
  .ep-kpis { grid-template-columns: repeat(2, 1fr); }
  .ep-split.has-panel .ep-split-main { max-width: calc(100% - 356px); }
}
@media (max-width: 1024px) {
  .ep-split { flex-direction: column; }
  .ep-split.has-panel .ep-split-main { max-width: 100%; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .enrollment-page {
  --e-bg: #1A1A14;
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16,185,129,0.16);
}
[data-coreui-theme="dark"] .enrollment-page .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .enrollment-page .ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(52, 211, 153, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}
[data-coreui-theme="dark"] .enrollment-page .ep-filter-strip {
  border-top-color: #2A2A22;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0.04));
}
[data-coreui-theme="dark"] .enrollment-page .ep-filter-strip-badge { color: #34D399; }
[data-coreui-theme="dark"] .enrollment-page .ep-kpi { background: #1A1A14; }
[data-coreui-theme="dark"] .enrollment-page .ep-kpi:hover {
  border-color: #3A3A33;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.35);
}
[data-coreui-theme="dark"] .enrollment-page .ep-view-toggle { background: #1A1A14; }
[data-coreui-theme="dark"] .enrollment-page .ep-toggle-btn.is-active { background: #2A2A22; }
[data-coreui-theme="dark"] .enrollment-page .ep-btn-sheet {
  background: #1A1A14;
}
[data-coreui-theme="dark"] .enrollment-page .ep-btn-new { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .enrollment-page .ep-btn-new:hover { background: #E4E4DD; }
[data-coreui-theme="dark"] .enrollment-page .ep-tab { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .enrollment-page .ep-tab:hover { background: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .enrollment-page .ep-refresh-btn {
  background: #1A1A14;
}
[data-coreui-theme="dark"] .enrollment-page .ep-kpi-delta.is-up { background: rgba(16,185,129,0.16); color: #34D399; }
[data-coreui-theme="dark"] .enrollment-page .ep-kpi-delta.is-down { background: rgba(239,68,68,0.16); color: #F87171; }
[data-coreui-theme="dark"] .enrollment-page .ep-kpi-delta.is-flat { background: #2A2A22; color: #A0A099; }
</style>
