<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">B2B</span>
            <h1 class="brand-title">Leads Empresas</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-ghost" @click="goNew">
            <i class="fa-solid fa-plus"></i> Nuevo Lead Empresa
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div class="toolbar-chips mb-2" v-if="activeFilterChips.length">
        <BaseFilterChips :items="activeFilterChips" @remove="clearFilter" @clear-all="clearFilters" />
      </div>

      <div class="exec-toolbar">
        <div class="toolbar-pagination">
          <BasePagination v-model="pagin" @open-filters="openFilterModal" @change="handlePaginationChange" />
        </div>
        <div class="toolbar-actions">
          <button class="btn-exec btn-exec-outline" @click="openFilterModal">
            <i class="fa-solid fa-filter"></i> Filtros
          </button>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width:80px">Acciones</th>
                <th class="ts ts-c">Empresa Vinculada</th>
                <th class="ts ts-c">Nombre del Contacto</th>
                <th class="ts ts-c">Programa / Interés</th>
                <th class="ts ts-c">Status</th>
                <th class="ts ts-c">F. Pago</th>
                <th class="ts ts-c">Interés</th>
                <th class="ts ts-c">Registro</th>
                <th class="ts ts-c">Seguimiento</th>
              </tr>
              <tr class="thead-filter">
                <th class="tf tf-actions-cell">
                  <div class="hf-actions-group">
                    <button v-if="activeFilterChips.length" class="hf-clear-btn" @click="clearFilters" title="Limpiar filtros">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </th>
                <th class="tf">
                  <input v-model="filters.company_q" type="text" class="hf-input" placeholder="Empresa..." @input="debouncedFilter" @keyup.enter="triggerFilter" />
                </th>
                <th class="tf">
                  <input v-model="filters.q" type="text" class="hf-input" placeholder="Nombre..." @input="debouncedFilter" @keyup.enter="triggerFilter" />
                </th>
                <th class="tf">
                  <MultiSelect v-model="filters.program_version_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" label-key="abbreviation" value-key="program_version_id" placeholder="Programa..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
                <th class="tf">
                  <MultiSelect v-model="filters.status_lead_ids" :items="leadStatusCatalog" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
                <th class="tf"></th>
                <th class="tf">
                  <MultiSelect v-model="filters.interest_level_ids" :items="leadInterestCatalog" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
                <th class="tf"></th>
                <th class="tf">
                  <MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." class="hf-multiselect" @update:model-value="triggerFilter" />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in leadsRaw" :key="l.lead_id" class="tbody-row" @dblclick="editLead(l)">
                <td class="td-a text-center">
                  <button class="btn-icon" @click="editLead(l)" title="Editar">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                  </button>
                </td>
                <td class="td-a nowrap">
                  <div class="fw-600">{{ l.company_name || '—' }}</div>
                  <small class="text-muted text-mono">{{ l.company_document || '' }}</small>
                </td>
                <td class="td-a nowrap">
                  <div class="fw-600">{{ l.full_name_label || l.full_name || '—' }}</div>
                  <small class="text-muted">{{ l.origin_phone || '' }}</small>
                </td>
                <td class="td-a small fw-600 accent-text">{{ l.program_label || '—' }}</td>
                <td class="td-a">
                  <span class="pill pill-slate border">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
                </td>
                <td class="td-a small fw-700 pay-date-cell">{{ l.pay_date || '—' }}</td>
                <td class="td-a">
                  <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">{{ l.cat_interest_description }}</span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td class="td-a small nowrap text-muted">{{ l.system_registration_date || '—' }}</td>
                <td class="td-a text-center" style="min-width:140px">
                  <div v-if="l.cat_last_follow_alias" class="pill d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
                    <span>{{ followMap[l.cat_last_follow_alias] }}</span>
                  </div>
                  <span v-else class="text-muted small">—</span>
                </td>
              </tr>
              <tr v-if="!leadsRaw.length">
                <td colspan="9" class="empty-state">No se encontraron leads empresa con los filtros actuales.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>

  <!-- Modal de filtros -->
  <BaseModal v-model="showFilterModal" title="Filtros avanzados" size="md">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="exec-label">Empresa (nombre o RUC)</label>
          <input v-model.trim="filtersDraft.company_q" type="text" class="exec-input-light w-100" placeholder="Empresa S.A.C. / 20..." />
        </div>
        <div class="col-12">
          <label class="exec-label">Nombre del contacto</label>
          <input v-model.trim="filtersDraft.q" type="text" class="exec-input-light w-100" placeholder="Nombre..." />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn-exec btn-exec-outline btn-exec-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn-exec btn-exec-outline btn-exec-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary btn-exec-sm" @click="applyModalFilters">Aplicar</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseModal from '@/components/BaseModal.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import { ServiceKeys } from '@/services'

const router = useRouter()
const route = useRoute()
const comercialService = inject(ServiceKeys.Comercial)
const b2bService = inject(ServiceKeys.B2b)
const programService = inject(ServiceKeys.Program)
const catalogSvc = inject('catalog')

// Catálogos
const leadStatusCatalog = ref(catalogSvc?.options('we_lead_status') || [])
const leadInterestCatalog = ref(catalogSvc?.options('we_lead_interest') || [])
const followCatalog = ref(catalogSvc?.options('we_follow_lead') || [])

const filtroFollow = computed(() => followCatalog.value)
const followMap = computed(() =>
  Object.fromEntries(followCatalog.value.map(f => [f.alias, f.description]))
)

// Estado
const showFilterModal = ref(false)
const leadsRaw = ref([])
const pagin = ref({ page: 1, size: 25, total: 0 })

// Filtros inline
const filters = reactive({
  q: '',
  company_q: '',
  status_lead_ids: [],
  program_version_ids: [],
  interest_level_ids: [],
  last_follow_ids: [],
})

// Filtros modal (draft)
const filtersDraft = reactive({ q: '', company_q: '' })

const activeFilterChips = ref([])

function rebuildChips() {
  const chips = []
  if (filters.q) chips.push({ key: 'q', label: `Nombre: ${filters.q}` })
  if (filters.company_q) chips.push({ key: 'company_q', label: `Empresa: ${filters.company_q}` })
  activeFilterChips.value = chips
}

function clearFilter(key) {
  filters[key] = Array.isArray(filters[key]) ? [] : ''
  rebuildChips()
  fetchLeads()
}

function clearFilters() {
  filters.q = ''
  filters.company_q = ''
  filters.status_lead_ids = []
  filters.program_version_ids = []
  filters.interest_level_ids = []
  filters.last_follow_ids = []
  filtersDraft.q = ''
  filtersDraft.company_q = ''
  rebuildChips()
  fetchLeads()
}

function applyModalFilters() {
  filters.q = filtersDraft.q
  filters.company_q = filtersDraft.company_q
  showFilterModal.value = false
  rebuildChips()
  fetchLeads()
}

let debounceTimer = null
function debouncedFilter() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { rebuildChips(); fetchLeads() }, 400)
}

function triggerFilter() { rebuildChips(); fetchLeads() }
function openFilterModal() {
  filtersDraft.q = filters.q
  filtersDraft.company_q = filters.company_q
  showFilterModal.value = true
}

function handlePaginationChange() { fetchLeads() }

// Navegación
function goNew() { router.push({ name: 'B2BCompanyLeadNew' }) }
function editLead(l) { router.push({ name: 'B2BCompanyLeadEdit', params: { id: l.lead_id } }) }

// Badge helpers
function badgeForInterest(alias) {
  if (alias === 'we_lead_interest_high')   return 'pill-green'
  if (alias === 'we_lead_interest_medium') return 'pill-yellow'
  if (alias === 'we_lead_interest_low')    return 'pill-red'
  return 'pill-slate'
}
function badgeForFollow(alias) {
  if (alias?.includes('hot'))   return 'pill-green'
  if (alias?.includes('warm'))  return 'pill-yellow'
  if (alias?.includes('cold'))  return 'pill-red'
  return 'pill-slate'
}

// Fetch
async function fetchLeads() {
  try {
    const getIds = (arr) => (Array.isArray(arr) ? arr.map(i => (typeof i === 'object' ? i.value : i)) : [])
    const { items, total: t, page: p } = await b2bService.companyLeadList({
      q: filters.q || null,
      company_q: filters.company_q || null,
      page: pagin.value.page,
      size: pagin.value.size,
      status_lead_ids: getIds(filters.status_lead_ids),
      program_version_ids: getIds(filters.program_version_ids),
      interest_level_ids: getIds(filters.interest_level_ids),
      last_follow_ids: getIds(filters.last_follow_ids),
    })
    leadsRaw.value = items || []
    pagin.value.total = Number(t || 0)
    pagin.value.page  = Number(p || pagin.value.page)
  } catch (err) {
    console.error('Error cargando leads empresa:', err)
    leadsRaw.value = []
  }
}

onMounted(() => {
  if (route.query.company_id) {
    filters.company_q = route.query.company_name || route.query.company_id
    filtersDraft.company_q = filters.company_q
    rebuildChips()
  }
  fetchLeads()
})
</script>

<style scoped>
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--text-primary, #0f172a);
}

/* ══ MASTHEAD ═══════════════════════════════════════════════════ */
.exec-masthead {
  background: var(--navy-900, #0f172a);
  color: #fff;
  border-bottom: 1px solid var(--navy-700, #334155);
  position: sticky;
  top: 0;
  z-index: 100;
}
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }
.masthead-actions { display: flex; gap: 10px; align-items: center; }

/* ══ BODY ════════════════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 20px 28px; }
.exec-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }

/* ══ BOTONES ═════════════════════════════════════════════════════ */
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-ghost { background: rgba(255,255,255,.07); color: var(--slate-300, #cbd5e1); border-color: rgba(255,255,255,.12); }
.btn-exec-ghost:hover:not(:disabled) { background: rgba(255,255,255,.13); color: #fff; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }
.btn-exec-sm { padding: 5px 10px; font-size: 11.5px; }
.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; vertical-align: middle; }
.btn-icon:hover { background: var(--slate-100, #f1f5f9); border-color: var(--slate-300, #cbd5e1); }

/* ══ TABLA ═══════════════════════════════════════════════════════ */
.table-shell { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: visible; }
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 6px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }

.tbody-row { transition: background 0.12s; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; color: var(--text-primary, #0f172a); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

.td-a { border-left: 1px solid transparent; }
.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted, #94a3b8); }
.accent-text { color: #0d9488; }
.small { font-size: 11.5px; }
.pay-date-cell { color: #15803d; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate  { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); border-color: var(--slate-200, #e2e8f0) !important; }
.pill-green  { background: #dcfce7; color: #15803d; }
.pill-yellow { background: #fef9c3; color: #854d0e; }
.pill-red    { background: #fee2e2; color: #b91c1c; }
.pill-teal   { background: #ccfbf1; color: #0f766e; }

.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }

/* ══ FILTROS INLINE EN CABECERA ══════════════════════════════════ */
.thead-filter .tf { padding: 5px 6px; background: #f0f4f8; border-bottom: 2px solid var(--teal-500, #14b8a6); vertical-align: middle; position: relative; }
.hf-input { width: 100%; height: 28px; padding: 3px 8px; font-size: 11px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20,184,166,.15); }
.hf-input::placeholder { color: var(--slate-400, #94a3b8); font-size: 10.5px; }
.hf-multiselect { --ms-font-size: 11px; --ms-line-height: 1.3; --ms-min-height: 28px; --ms-py: 2px; --ms-px: 6px; --ms-tag-py: 1px; --ms-tag-px: 4px; --ms-tag-font-size: 9.5px; --ms-border-color: var(--border, #e2e8f0); --ms-border-color-active: var(--teal-500, #14b8a6); --ms-ring-color: rgba(20,184,166,.15); font-size: 11px; }
.hf-clear-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 4px; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 11px; transition: all .15s; }
.hf-clear-btn:hover { background: #fee2e2; border-color: #f87171; }
.tf-actions-cell { text-align: center; }
.hf-actions-group { display: flex; flex-direction: column; align-items: center; gap: 4px; }

/* Dropdown de los últimos filtros abre a la izquierda */
.thead-filter .tf:nth-last-child(-n+3) :deep(.multiselect-dropdown) { left: auto !important; right: 0 !important; }

/* ══ INPUTS MODAL ════════════════════════════════════════════════ */
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.exec-input-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-input-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

@media (max-width: 768px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-toolbar { flex-direction: column-reverse; align-items: stretch; }
  .exec-body { padding: 16px 12px; }
}
</style>
