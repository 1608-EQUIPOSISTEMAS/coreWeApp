<template>
  <div class="bot-tab">
    <!-- Filter bar (estilo Leads) -->
    <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': hasFilters }">
      <div class="ep-filter-bar-main">
        <div class="ep-quick-row">
          <span class="ep-section-eyebrow">
            <i class="fa-solid fa-star"></i>
            Calidad CSAT
          </span>
        </div>
        <div class="ep-toolbar">
          <BasePagination v-model="pagin" @change="fetchCsat" :hide-filters="true" />
        </div>
      </div>
      <div class="ep-filter-bar-controls">
        <div class="filter-search-wrap grow">
          <i class="fa-solid fa-magnifying-glass filter-icon"></i>
          <input
            v-model="filters.q"
            type="text"
            class="filter-input"
            placeholder="Buscar alumno o ticket..."
            @input="debouncedSearch"
          />
        </div>
        <div class="rating-select">
          <SearchSelect
            v-model="filters.rating"
            :items="ratingOptions"
            value-field="value"
            label-field="label"
            placeholder="Todas las calificaciones"
            @change="(opt) => { filters.rating = opt?.value ?? null; triggerFilter() }"
          />
        </div>
        <div class="filter-date-wrap">
          <i class="fa-regular fa-calendar filter-icon"></i>
          <BaseDatePicker
            v-model="filters.date_range_string"
            :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
            class="filter-input"
            placeholder="Desde → Hasta"
            @on-change="handleDateChange"
          />
        </div>
        <button v-if="hasFilters" class="ep-btn-control" @click="clearFilters" title="Limpiar filtros">
          <i class="fa-solid fa-xmark"></i>
          <span>Limpiar</span>
        </button>
      </div>
    </section>

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
              <th class="ts ts-c text-center" style="width: 80px;">Chat</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in csatList" :key="c.id" class="tbody-row" v-if="!isLoading">
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
              <td class="td-a text-center">
                <a
                  v-if="c.conversation_id"
                  :href="`https://chat.we-educacion-ejecutiva.site/app/accounts/1/inbox/1/conversations/${c.conversation_id}`"
                  target="_blank"
                  class="btn-icon"
                  title="Abrir conversación en Chatwoot"
                  @click.stop
                >
                  <i class="fa-solid fa-up-right-from-square"></i>
                </a>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
            <tr v-if="!csatList.length && !isLoading">
              <td colspan="6" class="empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <p>No se encontraron encuestas de satisfacción con estos filtros.</p>
              </td>
            </tr>
            <template v-if="isLoading">
              <tr v-for="n in 8" :key="`sk-${n}`" class="tbody-row skel-row">
                <td class="td-a"><div class="skel" style="width:80px;height:12px;"></div></td>
                <td class="td-a"><div class="skel" style="width:90px;height:12px;"></div></td>
                <td class="td-a">
                  <div class="skel mb-1" style="width:120px;height:12px;"></div>
                  <div class="skel" style="width:80px;height:10px;"></div>
                </td>
                <td class="td-a"><div class="skel" style="width:100px;height:14px;"></div></td>
                <td class="td-a"><div class="skel" style="width:80px;height:20px;border-radius:10px;"></div></td>
                <td class="td-a text-center"><div class="skel" style="width:26px;height:26px;border-radius:4px;margin:0 auto;"></div></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
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
  if (rating >= 4) return 'text-warning'
  if (rating === 3) return 'text-secondary'
  return 'text-danger'
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
.bot-tab { display: flex; flex-direction: column; gap: 14px; }

/* === Filter bar (estilo Leads) === */
.ep-section { background: transparent; border: none; padding: 0; margin: 0; }
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border, #E8E8E3);
  border-radius: 10px;
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
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap; padding: 10px 14px;
}
.ep-quick-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.ep-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; flex: 1 1 auto; }
.ep-filter-bar-controls {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px;
  border-top: 1px solid var(--e-border, #E8E8E3);
  background: var(--e-bg-subtle, #FAFAF8);
}
.ep-filter-bar-controls .filter-search-wrap.grow,
.ep-filter-bar-controls .filter-search-wrap.grow .filter-input { flex: 1 1 220px; min-width: 220px; }
.ep-filter-bar-controls .rating-select { width: 230px; }
.ep-filter-bar-controls .filter-date-wrap .filter-input { width: 220px; }

.ep-section-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 600; color: var(--e-text, #14140F);
}
.ep-section-eyebrow i { color: var(--e-accent, #10B981); font-size: 12px; }

.ep-btn-control {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; font-size: 12.5px; font-weight: 600;
  color: var(--e-text, #14140F); background: #fff;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
  cursor: pointer; transition: all .2s ease; font-family: inherit;
}
.ep-btn-control:hover { border-color: var(--e-border-strong, #D4D4CC); background: var(--e-bg-subtle, #FAFAF8); }
.ep-btn-control i { font-size: 11px; }

.filter-search-wrap, .filter-date-wrap { position: relative; display: flex; align-items: center; }
.filter-icon { position: absolute; left: 9px; color: var(--e-text-muted, #A0A099); font-size: 11px; pointer-events: none; z-index: 1; }
.filter-input {
  height: 34px; padding: 0 10px 0 28px;
  border: 1px solid var(--e-border, #E8E8E3); border-radius: 8px;
  background: #fff; font-size: 12px; font-family: inherit;
  color: var(--e-text, #14140F); outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.filter-input:focus { border-color: var(--e-accent, #10B981); box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
.filter-input::placeholder { color: var(--e-text-muted, #A0A099); font-size: 11.5px; }

/* === Tabla === */
.table-shell {
  background: #fff;
  border: 1px solid var(--e-border, #E8E8E3);
  border-radius: 10px;
  overflow: hidden;
}
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 10px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts {
  padding: 10px 14px; font-size: 10px; letter-spacing: 0.06em;
  text-transform: uppercase; font-weight: 600;
  border-bottom: 1px solid var(--e-border, #E8E8E3);
  text-align: left; background: var(--e-bg-subtle, #FAFAF8);
  color: var(--e-text-secondary, #6F6F66); white-space: nowrap;
}
.thead-sub .ts.text-center { text-align: center; }

.tbody-row { transition: background 0.12s; position: relative; }
.tbody-row td {
  padding: 10px 14px; border-bottom: 1px solid var(--e-border, #E8E8E3);
  vertical-align: middle; color: var(--e-text, #14140F);
}
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: var(--e-bg-subtle, #FAFAF8); cursor: pointer; }

.td-a { border-left: 1px solid transparent; }

.text-center { text-align: center; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--e-text-muted, #A0A099); }
.text-dark { color: var(--e-text, #14140F); }
.text-success { color: #059669; }
.accent-text { color: #047857; }
.text-warning { color: #d97706 !important; }
.text-danger { color: #dc2626 !important; }
.text-secondary { color: var(--e-text-secondary, #6F6F66) !important; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: #f1f5f9; color: #475569; border-color: #e2e8f0 !important; }
.pill-teal   { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important; }

.btn-icon {
  background: transparent;
  border: 1px solid var(--e-border, #E8E8E3);
  border-radius: 6px; padding: 4px 8px;
  cursor: pointer; color: var(--e-text-secondary, #6F6F66);
  transition: all .15s; font-size: 12px; vertical-align: middle;
}
.btn-icon:hover:not(:disabled) {
  background: var(--e-bg-subtle, #FAFAF8);
  color: var(--e-text, #14140F);
  border-color: var(--e-border-strong, #D4D4CC);
}

.empty-state { padding: 40px; text-align: center; color: var(--e-text-muted, #A0A099); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--e-text-muted, #A0A099); }
.empty-state p { margin: 0; }

/* === Skeleton === */
.skel-row td { background: var(--e-bg-subtle, #FAFAF8) !important; }
.skel { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 768px) {
  .ep-filter-bar-main { flex-direction: column; align-items: stretch; }
  .ep-toolbar { justify-content: flex-end; }
}

/* === Dark mode === */
[data-coreui-theme="dark"] .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .ep-filter-bar-controls { background: #1F1F1A; border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .ep-btn-control { background: #1A1A14; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] .filter-input { background: #1A1A14; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] .table-shell { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .thead-sub .ts { background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .tbody-row td { color: #E4E4DD; border-bottom-color: #2A2A22; background: #1A1A14; }
[data-coreui-theme="dark"] .tbody-row:hover td { background: #232319; }
[data-coreui-theme="dark"] .text-dark { color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-icon { background: #1A1A14; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .btn-icon:hover { background: #2A2A22; color: #F4F4F0; }
</style>
