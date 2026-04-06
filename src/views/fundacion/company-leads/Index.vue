<template>
  <div class="exec-shell list-shell">
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">FUNDACIÓN</span>
            <h1 class="brand-title">Leads Empresas — Fundación</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-ghost" @click="openFilterModal">
            <i class="fa-solid fa-filter"></i> Filtros
          </button>
          <button class="btn-exec btn-exec-primary" @click="goNew">
            <i class="fa-solid fa-plus"></i> Nuevo Lead Empresa
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body">
      <div class="toolbar-chips mb-2" v-if="activeFilterChips.length">
        <BaseFilterChips :items="activeFilterChips" @remove="clearFilter" @clear-all="clearFilters" />
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width:80px">Acciones</th>
                <th class="ts ts-c">Empresa Vinculada</th>
                <th class="ts ts-c">Contacto (Razón Social)</th>
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
                    <button v-if="activeFilterChips.length" class="hf-clear-btn" @click="clearFilters" title="Limpiar">
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
              <tr v-for="l in leadsRaw" :key="l.lead_id" @dblclick="editLead(l)">
                <td class="td-a text-center">
                  <button class="btn-exec btn-exec-ghost btn-exec-sm me-1" @click="editLead(l)" title="Editar">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                  </button>
                </td>
                <td class="td-a nowrap fw-600">
                  <div>{{ l.company_name || '—' }}</div>
                  <small class="text-muted mono">{{ l.company_document || '' }}</small>
                </td>
                <td class="td-a nowrap">
                  <div class="fw-600 text-dark">{{ l.full_name_label || l.full_name || '—' }}</div>
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
                <td colspan="9" class="empty-state">No se encontraron leads empresa fundación con los filtros actuales.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="exec-pagination mt-2">
        <BasePagination v-model="pagin" @open-filters="openFilterModal" @change="handlePaginationChange" />
      </div>
    </main>
  </div>

  <!-- Modal de filtros -->
  <BaseModal v-model="showFilterModal" title="Filtros" size="md">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Empresa (nombre o RUC)</label>
          <input v-model.trim="filtersDraft.company_q" type="text" class="form-control" placeholder="Empresa S.A.C. / 20..." />
        </div>
        <div class="col-12">
          <label class="form-label">Nombre del contacto</label>
          <input v-model.trim="filtersDraft.q" type="text" class="form-control" placeholder="Nombre..." />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline btn-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn btn-primary btn-sm" @click="applyModalFilters">Aplicar</button>
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
function goNew() { router.push({ name: 'FundacionCompanyLeadNew' }) }
function editLead(l) { router.push({ name: 'FundacionCompanyLeadEdit', params: { id: l.lead_id } }) }

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
    const { items, total: t, page: p } = await comercialService.leadList({
      has_company: true,
      business_line: 'we_business_line_fundacion',
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
    console.error('Error cargando leads empresa fundación:', err)
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
