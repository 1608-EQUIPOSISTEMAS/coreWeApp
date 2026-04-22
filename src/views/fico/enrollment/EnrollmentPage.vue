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
        <button class="ep-btn-new" @click="list.goNew()"><i class="fa-solid fa-plus"></i> Nueva inscripcion</button>
      </div>
    </header>

    <!-- KPI Section -->
    <section class="ep-section">
      <div class="ep-section-head">
        <h2 class="ep-section-title">Indicadores de hoy</h2>
        <span class="ep-section-meta">
          <i class="fa-solid fa-clock"></i>
          {{ kpiTimestamp }}
          <button class="ep-refresh-btn" :disabled="list.kpisDaily.value.loading" @click="list.fetchKpisDaily()" title="Actualizar">
            <i class="fa-solid" :class="list.kpisDaily.value.loading ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
          </button>
        </span>
      </div>

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
    <section class="ep-section">
      <nav class="ep-tabs" aria-label="Vistas rapidas">
        <button
          v-for="v in list.savedViews.value"
          :key="v.key"
          :class="['ep-tab', { 'is-active': list.activeViewKey.value === v.key }]"
          @click="list.applySavedView(v.key)"
        >
          <i class="fa-solid" :class="v.icon"></i> {{ v.label }}
        </button>
      </nav>

      <div class="ep-toolbar">
        <BaseFilterChips :items="list.activeFilterChips.value" @remove="onChipRemove" @clear-all="onClearAll" />
        <BasePagination v-model="list.pagin.value" @open-filters="list.openFilterModal" @change="list.handlePaginationChange" />
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
          @select-row="list.selectEnrollment"
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
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useEnrollmentList } from '@/composables/useEnrollmentList'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import EnrollmentCompactTable from './EnrollmentCompactTable.vue'
import EnrollmentExpandedTable from './EnrollmentExpandedTable.vue'
import EnrollmentFilterModal from './EnrollmentFilterModal.vue'
import EnrollmentSidePanel from './EnrollmentSidePanel.vue'

const list = useEnrollmentList()
const router = useRouter()

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

const kpiTimestamp = computed(() => {
  const at = list.kpisDaily.value.loadedAt
  if (!at) return list.kpisDaily.value.loading ? 'Cargando...' : 'Sin datos'
  return `Actualizado ${at.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
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
  await list.fetchEnrollments()
  list.fetchKpisDaily()
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.enrollment-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAFA;
  --e-border: #EFEFEF;
  --e-border-strong: #E5E5E5;
  --e-text: #1A1A1A;
  --e-text-secondary: #737373;
  --e-text-muted: #A3A3A3;
  --e-accent: #0D9488;
  --e-accent-soft: #F0FDFA;

  background: #FAFAFA;
  padding: 28px 32px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  min-height: 100vh;
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
  font-size: 24px;
  font-weight: 700;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle {
  font-size: 12.5px;
  color: var(--e-text-muted);
  font-weight: 500;
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

/* === Section wrapper === */
.ep-section {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.ep-section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
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
  font-size: 26px;
  font-weight: 700;
  color: var(--e-text);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
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
  margin-bottom: 14px;
  flex-wrap: wrap;
  padding-bottom: 12px;
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
</style>
