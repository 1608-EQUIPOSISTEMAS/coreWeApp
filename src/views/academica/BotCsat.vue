<template>
  <main class="exec-body">
    <div class="exec-toolbar mb-4">
      <div class="toolbar-pagination">
        <BasePagination v-model="pagin" @change="fetchCsat" />
      </div>
      <div class="toolbar-actions">
        <div style="width: 220px;">
          <SearchSelect
            v-model="filters.rating"
            :items="ratingOptions"
            value-field="value"
            label-field="label"
            placeholder="Todas las calificaciones"
            @change="(opt) => { filters.rating = opt?.value ?? null; triggerFilter() }"
          />
        </div>
        
        <div style="width: 220px;">
          <BaseDatePicker 
            v-model="filters.date_range_string" 
            :config="{ mode: 'range', dateFormat: 'Y-m-d' }" 
            class="exec-input-light w-100" 
            placeholder="Filtrar fechas..." 
            @on-change="handleDateChange" 
          />
        </div>
        
        <input 
          v-model="filters.q" 
          type="text" 
          class="exec-input-light" 
          style="width: 200px;"
          placeholder="Buscar alumno o ticket..." 
          @input="debouncedSearch"
        />
        
        <button v-if="hasFilters" class="btn-exec btn-exec-outline" @click="clearFilters">
          <i class="fa-solid fa-eraser"></i>
        </button>
      </div>
    </div>

    <div class="table-shell">
      <div class="table-responsive-custom">
        <table class="exec-table">
          <thead>
            <tr class="thead-sub">
              <th class="ts ts-c" style="width: 140px;">Fecha</th>
              <th class="ts ts-c" style="width: 130px;">Ticket #</th>
              <th class="ts ts-c">Alumno</th>
              <th class="ts ts-c" style="width: 180px;">Calificación (CSAT)</th>
              <th class="ts ts-c" style="width: 180px;">Cierre</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in csatList" :key="c.id" class="tbody-row">
              <td class="td-a small fw-600 text-dark">{{ c.created_at_fmt }}</td>
              <td class="td-a fw-700 text-mono accent-text">{{ c.ticket_number || '—' }}</td>
              <td class="td-a">
                <div class="d-flex flex-column">
                  <span class="fw-600 text-dark">{{ c.student_name || 'Desconocido' }}</span>
                  <span class="small text-muted"><i class="fa-brands fa-whatsapp text-success me-1"></i>{{ c.phone || '—' }}</span>
                </div>
              </td>
              <td class="td-a">
                <div class="d-flex align-items-center gap-2">
                  <div :class="ratingColorClass(c.rating)" style="font-size: 14px;">
                    <i v-for="n in 5" :key="n" class="fa-star" :class="n <= c.rating ? 'fa-solid' : 'fa-regular opacity-40'"></i>
                  </div>
                  <span class="fw-700" :class="ratingTextColorClass(c.rating)">{{ c.rating }}.0</span>
                </div>
              </td>
              <td class="td-a small">
                <span v-if="c.resolved_by_agent" class="pill pill-slate border"><i class="fa-solid fa-user-tie me-1"></i> Por Asesor</span>
                <span v-else class="pill pill-teal border"><i class="fa-solid fa-robot me-1"></i> Por el Bot</span>
              </td>
            </tr>
            <tr v-if="!csatList.length && !isLoading">
              <td colspan="5" class="empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <p>No se encontraron encuestas de satisfacción con estos filtros.</p>
              </td>
            </tr>
            <tr v-if="isLoading">
              <td colspan="5" class="text-center py-5"><div class="loader-ring mx-auto"></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onActivated, inject } from 'vue'
import BasePagination from '@/components/BasePagination.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { ServiceKeys } from '@/services'

const botService = inject(ServiceKeys.Bot)

const ratingOptions = [
  { value: 5, label: '⭐⭐⭐⭐⭐ (5) Excelente' },
  { value: 4, label: '⭐⭐⭐⭐ (4) Bueno' },
  { value: 3, label: '⭐⭐⭐ (3) Regular' },
  { value: 2, label: '⭐⭐ (2) Malo' },
  { value: 1, label: '⭐ (1) Pésimo' },
]

const csatList = ref([])
const isLoading = ref(false)
const pagin = ref({ size: 25, page: 1, total: 0 })

const filters = reactive({
  q: '',
  rating: null,
  from_date: null,
  to_date: null,
  date_range_string: null
})

const hasFilters = computed(() => !!filters.q || !!filters.rating || !!filters.from_date)

let searchTimer = null
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => triggerFilter(), 400)
}

function triggerFilter() {
  pagin.value.page = 1
  fetchCsat()
}

function handleDateChange(dates, dateStr) {
  if (dateStr && dateStr.includes(' a ')) {
    const [start, end] = dateStr.split(' a ')
    filters.from_date = start
    filters.to_date = end
  } else if (dateStr) {
    filters.from_date = dateStr
    filters.to_date = dateStr
  } else {
    filters.from_date = null
    filters.to_date = null
  }
  triggerFilter()
}

function clearFilters() {
  filters.q = ''
  filters.rating = null
  filters.from_date = null
  filters.to_date = null
  filters.date_range_string = null
  triggerFilter()
}

async function fetchCsat() {
  isLoading.value = true
  try {
    const tableResp = await botService.botCsatList({
      q: filters.q || null,
      rating: filters.rating || null,
      from_date: filters.from_date || null,
      to_date: filters.to_date || null,
      page: pagin.value.page,
      size: pagin.value.size
    })
    csatList.value = tableResp.items || []
    pagin.value.total = tableResp.total || 0
  } catch (error) {
    console.error("Error al obtener CSAT", error)
  } finally {
    isLoading.value = false
  }
}

// Helpers de Diseño
function ratingColorClass(rating) {
  if (rating >= 4) return 'text-warning' // Amarillo para 4-5
  if (rating === 3) return 'text-secondary' // Gris para 3
  return 'text-danger' // Rojo para 1-2
}
function ratingTextColorClass(rating) {
  if (rating >= 4) return 'text-warning'
  if (rating === 3) return 'text-secondary'
  return 'text-danger'
}

onActivated(() => {
  fetchCsat()
})
</script>

<style scoped>
.exec-body { flex: 1; padding: 20px 28px; }
.exec-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; text-decoration: none; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }

.table-shell { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: visible; }
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 6px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }

.tbody-row { transition: background 0.12s; position: relative; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; color: var(--text-primary, #0f172a); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

.row-blue     { border-left: 3px solid #3b82f6; } .row-blue > td      { background: #f0f9ff; }
.row-emerald  { border-left: 3px solid #0d9488; } .row-emerald > td   { background: #f0fdfa; }
.row-yellow   { border-left: 3px solid #f59e0b; } .row-yellow > td    { background: #fffbeb; }

.td-a { border-left: 1px solid transparent; }

.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted, #94a3b8); }
.accent-text { color: #0d9488; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }
.pill-amber  { background: #fef3c7; color: #92400e; border-color: #fde68a !important; }

.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; vertical-align: middle; }
.btn-icon:hover:not(:disabled) { background: var(--slate-100, #f1f5f9); color: var(--text-primary, #0f172a); border-color: var(--slate-300, #cbd5e1); }

.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--slate-300, #cbd5e1); }
.empty-state p { margin: 0; }

.fieldset-title { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-secondary, #475569); font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid var(--slate-100, #f1f5f9); padding-bottom: 6px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }

.exec-select-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-select-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-textarea { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; resize: vertical; min-height: 64px; display: block; }
.exec-textarea:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

.enrollment-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.enrollment-title { font-size: 14px; font-weight: 700; color: #0d9488; margin: 0; text-transform: uppercase; letter-spacing: .03em; }
.enrollment-sub { font-size: 11.5px; color: var(--text-muted, #94a3b8); margin-top: 4px; font-weight: 500; }
.info-block { display: flex; flex-direction: column; gap: 2px; }
.info-value { font-size: 13px; font-weight: 600; color: var(--text-primary, #0f172a); }

.finance-card { background: var(--slate-50, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 14px; }
.lead-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f0f9ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 1px solid #e0f2fe; flex-shrink: 0; }

.exec-alert { padding: 12px 16px; border-radius: 6px; font-size: 12.5px; border-left: 4px solid; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }

.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 16px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--border, #e2e8f0); border-top-color: #0d9488; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ══ FILTROS INLINE EN CABECERA ═══════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #f0f4f8; border-bottom: 2px solid var(--teal-500, #14b8a6); vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20, 184, 166, .15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.tf-actions-cell { text-align: center; }

@media (max-width: 768px) {
  .exec-body { padding: 16px 12px; }
  .exec-toolbar { flex-direction: column-reverse; align-items: stretch; }
  .toolbar-actions { justify-content: flex-end; }
}
.exec-body { padding: 20px 28px; }
.lead-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f0f9ff; color: #2563eb; display: flex; align-items: center; justify-content: center; border: 1px solid #e0f2fe; }
.finance-card { background: var(--slate-50, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.file-item { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; }
.exec-body { padding: 20px 28px; }
.text-warning { color: #f59e0b !important; }
.text-danger { color: #ef4444 !important; }
.text-secondary { color: #94a3b8 !important; }
</style>