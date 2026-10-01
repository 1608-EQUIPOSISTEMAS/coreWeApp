<template>
  <div class="ds-page enrollment-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Inscripciones</h1>
        <p class="ds-sub">{{ subtitle }}</p>
      </div>
      <div class="ds-head-actions">
        <span
          v-if="sheetStatus"
          class="ep-sheet-status"
          :class="`is-${sheetStatus.tone}`"
          role="status"
          title="Google Sheets se actualiza solo cuando hay cambios (entre 1 y 5 minutos)"
        >
          <i class="fa-solid" :class="sheetStatus.icon" aria-hidden="true"></i>
          {{ sheetStatus.text }}
        </span>
        <div class="ds-tabs" role="group" aria-label="Vista de la tabla">
          <button type="button" :aria-pressed="list.viewMode.value === 'compact'" title="Alt + 1" @click="list.viewMode.value = 'compact'">
            <i class="fa-solid fa-list" aria-hidden="true"></i> Compacta
          </button>
          <button type="button" :aria-pressed="list.viewMode.value === 'expanded'" title="Alt + 2" @click="list.viewMode.value = 'expanded'">
            <i class="fa-solid fa-table-columns" aria-hidden="true"></i> Expandida
          </button>
        </div>
        <button class="btn-exec btn-exec-primary" type="button" @click="list.goNew()">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nueva inscripción
        </button>
      </div>
    </header>

    <div class="ds-kpis">
      <div v-for="k in kpis" :key="k.clave" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tono" aria-hidden="true"><i class="fa-solid" :class="k.icono"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="list.isLoading.value" class="skel-kpi"></span>
            <template v-else>
              <span class="ds-kpi-value">{{ k.valor }}</span>
              <span v-if="k.trend" class="ds-trend" :class="k.trend.tono">{{ k.trend.texto }}</span>
            </template>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.nota }}</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="ep-toolbar">
        <div class="ds-tabs" role="group" aria-label="Vistas rápidas">
          <button
            v-for="v in list.savedViews.value"
            :key="v.key"
            type="button"
            :aria-pressed="list.activeViewKey.value === v.key"
            @click="list.applySavedView(v.key)"
          >
            <i class="fa-solid" :class="v.icon" aria-hidden="true"></i> {{ v.label }}
          </button>
        </div>
        <BasePagination v-model="list.pagin.value" :emit-refresh="true" @open-filters="list.openFilterModal" @change="list.handlePaginationChange" @refresh="list.forceRefresh" />
      </div>
      <div v-if="list.activeFilterChips.value.length > 0" class="ep-chips">
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
          @select-row="list.selectEnrollment"
          @clear-col-filters="list.clearColFilters"
          @update-filter="(key, value) => { list.colFilters[key] = value }"
        />

        <EnrollmentExpandedTable
          v-if="list.viewMode.value === 'expanded'"
          :enrollments="list.filteredEnrollments.value"
          :col-filters="list.colFilters"
          :is-loading="list.isLoading.value"
          @clear-col-filters="list.clearColFilters"
          @update-filter="(key, value) => { list.colFilters[key] = value }"
        />
      </div>

      <transition name="ep-panel-slide">
        <EnrollmentSidePanel
          v-if="list.viewMode.value === 'compact' && list.selectedEnrollment.value"
          :enrollment="list.selectedEnrollment.value"
          @close="list.clearSelection"
          @view-full="goToFullDetail"
          @deleted="onEnrollmentDeleted"
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
      :filtro-programas="list.filtroProgramas.value"
      :filtro-ediciones="list.filtroEdiciones.value"
      :filtro-orden="list.filtroOrden.value"
      @apply="onModalApply"
      @clear="onClearAll"
    />

  </div>
</template>

<script setup>
import { computed, inject, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useEnrollmentList } from '@/composables/useEnrollmentList'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { buildDailyKpis } from '@/entities/enrollment/dailyKpis.js'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import EnrollmentCompactTable from './EnrollmentCompactTable.vue'
import EnrollmentExpandedTable from './EnrollmentExpandedTable.vue'
import EnrollmentFilterModal from './EnrollmentFilterModal.vue'
import EnrollmentSidePanel from './EnrollmentSidePanel.vue'

const list = useEnrollmentList()
const router = useRouter()
const route = useRoute()
const integrationService = inject(ServiceKeys.Integration)

// === Estado del sync automatico a Google Sheets ===
// El backend sube los cambios solo (cron fico-sheets-autosync); aqui solo se
// muestra si el Sheet esta al dia. Se consulta cada minuto, lo mismo que mira
// el vigilante del backend.
const syncState = ref(null)
let syncStatusTimer = null

async function refreshSyncStatus () {
  try {
    syncState.value = (await integrationService.getFicoSyncStatus())?.data ?? null
  } catch (err) {
    // Solo informativo: si falla, el indicador desaparece y la pagina sigue.
    console.warn('[sheetStatus]', err?.message)
    syncState.value = null
  }
}

const hhmm = (iso) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
const sheetStatus = computed(() => {
  const st = syncState.value
  if (!st) return null
  if (st.running) return { tone: 'info', icon: 'fa-rotate fa-spin', text: 'Actualizando Sheets…' }
  if (st.last_status === 'failed') return { tone: 'bad', icon: 'fa-triangle-exclamation', text: 'Sheets: falló la última actualización' }
  if (st.pending_changes) return { tone: 'warn', icon: 'fa-clock', text: 'Sheets: cambios por subir' }
  if (st.last_ok_at) return { tone: 'ok', icon: 'fa-circle-check', text: `Sheets al día · ${hhmm(st.last_ok_at)}` }
  return null
})

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

const kpis = computed(() => buildDailyKpis(list.kpisDaily.value.today, list.kpisDaily.value.yesterday))

const subtitle = computed(() => {
  const total = list.pagin.value.total
  return total ? `${formatValue(total, 'num')} inscripciones con estos filtros` : 'Revisa, aprueba y cobra las ventas del día'
})

function goToFullDetail (e) {
  router.push({
    name: 'enrollmentDetail',
    params: { id: e.enrollment_id },
    state: { enrollment: JSON.parse(JSON.stringify(e)) }
  })
}

function onEnrollmentDeleted (id) {
  list.clearSelection()
  // Sensación inmediata: quitamos la fila del listado al instante en vez de
  // esperar al refetch. El listado lee de una vista materializada que el backend
  // refresca tras el borrado (~4s), así que un refetch inmediato aún podría
  // traer la fila eliminada de vuelta (parpadeo). Quitamos local y reconciliamos
  // contra el servidor una vez asentada la MV.
  if (id != null) {
    list.enrollments.value = list.enrollments.value.filter(e => e.enrollment_id !== id)
    if (list.pagin.value.total > 0) list.pagin.value.total -= 1
  }
  setTimeout(() => list.fetchEnrollments(), 5000)
}

function onChipRemove (key) { list.activeViewKey.value = null; list.clearFilter(key) }
function onClearAll () { list.activeViewKey.value = null; list.clearFilters() }
function onModalApply (draft) { list.activeViewKey.value = null; list.applyDraftFilters(draft) }

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
  refreshSyncStatus()
  syncStatusTimer = setInterval(refreshSyncStatus, 60_000)
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

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  clearInterval(syncStatusTimer)
})
</script>

<style scoped>
/* Estructura y colores salen de ds-* (design-system.css): aquí solo lo propio
   de esta página. Sin bloque dark: los tokens cambian solos. */

.ep-sheet-status {
  display: inline-flex; align-items: center; gap: 7px;
  height: 36px; box-sizing: border-box; padding: 0 12px;
  font-size: 12.5px; font-weight: 600; white-space: nowrap;
  border-radius: var(--ds-radius-sm); border: 1px solid var(--ds-border);
  background: var(--ds-surface); color: var(--ds-ink-2);
}
.ep-sheet-status.is-ok i { color: var(--ds-ok); }
.ep-sheet-status.is-info i { color: var(--ds-accent); }
.ep-sheet-status.is-warn { border-color: transparent; background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.ep-sheet-status.is-bad { border-color: transparent; background: var(--ds-soft-bad); color: var(--ds-bad-ink); }

.ds-tabs > button i { margin-right: 4px; font-size: 11px; }

/* Vistas rápidas a la izquierda, paginación a la derecha. */
.ep-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px 16px; flex-wrap: wrap;
  padding: 10px 14px;
}
.ep-chips {
  padding: 8px 14px;
  border-top: 1px solid var(--ds-border);
  background: var(--ds-surface-2);
}
.ep-chips :deep(.active-filters) { margin-bottom: 0; }

/* Tabla + panel lateral (el panel entra solo al elegir una fila). */
.ep-split {
  display: flex;
  gap: var(--ds-gap);
  align-items: flex-start;
}
.ep-split-main {
  flex: 1;
  min-width: 0;
  transition: max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.ep-split.has-panel .ep-split-main { max-width: calc(100% - 396px); }

.ep-panel-slide-enter-active,
.ep-panel-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
}
.ep-panel-slide-enter-from,
.ep-panel-slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

@media (max-width: 1280px) {
  .ep-split.has-panel .ep-split-main { max-width: calc(100% - 356px); }
}
@media (max-width: 1024px) {
  .ep-split { flex-direction: column; }
  .ep-split.has-panel .ep-split-main { max-width: 100%; }
}
</style>
