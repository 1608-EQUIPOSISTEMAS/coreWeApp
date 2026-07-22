<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        Empresas B2B
        <span class="sub">Listado</span>
      </div>
      <div class="actions-bar">
        <button class="btn btn-outline" @click="openFilterModal">
          <i class="fa-solid fa-filter me-1"></i> Filtros
        </button>
        <button class="btn btn-primary" @click="goNew">
          + Nueva Empresa
        </button>
      </div>
    </div>

    <div class="card-body">
      <!-- Chips de filtros activos -->
      <div v-if="activeFilterChips.length" class="active-filters">
        <span class="label">Filtros:</span>
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          class="chip"
          @click="clearFilter(chip.key)"
        >
          {{ chip.text }} <span class="x">×</span>
        </button>
        <button class="chip clear-all" @click="clearFilters">Limpiar todo</button>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Razón Social</th>
              <th>RUC / Doc.</th>
              <th>Tipo</th>
              <th class="ta-center">Contratos Activos</th>
              <th>Contacto Principal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in companies" :key="item.company_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-sm me-1" @click="viewDetail(item)" title="Ver detalle">
                  <i class="fa-solid fa-eye text-info"></i>
                </button>
                <button class="btn btn-outline btn-sm me-1" @click="editCompany(item)" title="Editar">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
                <button class="btn btn-outline btn-sm" @click="viewLeads(item)" title="Ver Leads">
                  <i class="fa-solid fa-building-user text-primary"></i>
                </button>
              </td>

              <td class="minW">
                <div class="name">{{ item.razon_social }}</div>
                <small class="text-muted" v-if="item.commercial_name">{{ item.commercial_name }}</small>
              </td>

              <td class="mono">{{ item.document_number || '—' }}</td>

              <td>
                <span v-if="item.is_intermediary === 'Y'" class="badge badge-intermediary">
                  <i class="fa-solid fa-handshake me-1"></i> Intermediaria
                </span>
                <span v-else class="badge badge-neutral">Normal</span>
              </td>

              <td class="ta-center">
                <span v-if="item.active_contracts_count > 0" class="badge badge-success fw-bold">
                  {{ item.active_contracts_count }}
                </span>
                <span v-else class="text-muted">—</span>
              </td>

              <td>
                <div v-if="item.primary_contact_name">
                  <div class="fw-500">{{ item.primary_contact_name }}</div>
                  <small class="text-muted" v-if="item.primary_contact_email">
                    <i class="fa-solid fa-envelope me-1"></i>{{ item.primary_contact_email }}
                  </small>
                </div>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>

            <tr v-if="!loading && !companies.length">
              <td colspan="6" class="empty-state">Sin resultados.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="6" class="empty-state">Cargando...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <div class="page-size">
          <label>Tamaño</label>
          <select v-model.number="pagin.size" @change="resetToFirstPage">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="pager">
          <button class="btn btn-outline btn-sm" :disabled="pagin.page === 1" @click="prevPage">
            ‹ Anterior
          </button>
          <span class="muted">Página {{ pagin.page }} de {{ totalPages }}</span>
          <button class="btn btn-outline btn-sm" :disabled="pagin.page === totalPages" @click="nextPage">
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de filtros -->
  <BaseModal v-model="showFilterModal" title="Filtros de empresas" size="md">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Buscar (Razón Social o RUC)</label>
          <div class="input-group">
            <span class="input-group-text">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Nombre o número de documento..."
              @keyup.enter="applyFilters"
            />
          </div>
        </div>

        <div class="col-12">
          <div class="form-check form-switch-custom">
            <input
              id="onlyWithContracts"
              v-model="filters.only_with_contracts"
              type="checkbox"
              class="form-check-input"
            />
            <label class="form-check-label" for="onlyWithContracts">
              Solo empresas con contratos activos
            </label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline btn-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn btn-primary btn-sm" @click="applyFilters">Aplicar</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import { ServiceKeys } from '@/services'

const router = useRouter()
const b2bService = inject(ServiceKeys.B2b)

// UI
const showFilterModal = ref(false)
const loading = ref(false)
function openFilterModal() { showFilterModal.value = true }

// Tabla + paginación
const companies = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil((pagin.value.total || 0) / pagin.value.size)))

function resetToFirstPage() { pagin.value.page = 1; fetchCompanies() }
function nextPage() { if (pagin.value.page < totalPages.value) { pagin.value.page++; fetchCompanies() } }
function prevPage() { if (pagin.value.page > 1) { pagin.value.page--; fetchCompanies() } }

// Filtros
const filters = reactive({ q: '', only_with_contracts: false })
const activeFilterChips = ref([])

function rebuildChips() {
  const chips = []
  if (filters.q) chips.push({ key: 'q', text: `Buscar: ${filters.q}` })
  if (filters.only_with_contracts) chips.push({ key: 'only_with_contracts', text: 'Con contratos activos' })
  activeFilterChips.value = chips
}

function clearFilter(key) {
  if (key === 'q') filters.q = ''
  if (key === 'only_with_contracts') filters.only_with_contracts = false
  applyFilters()
}

function clearFilters() {
  filters.q = ''
  filters.only_with_contracts = false
  pagin.value.page = 1
  rebuildChips()
  fetchCompanies()
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  rebuildChips()
  fetchCompanies()
}

// Navegación
function goNew() { router.push({ name: 'B2BCompanyNew' }) }
function editCompany(item) { router.push({ name: 'B2BCompanyEdit', params: { id: item.company_id } }) }
function viewDetail(item) { router.push({ name: 'B2BCompanyEdit', params: { id: item.company_id } }) }
function viewLeads(item) { router.push({ name: 'B2BCompanyLeads', query: { company_id: item.company_id, company_name: item.razon_social } }) }

// Backend
async function fetchCompanies() {
  loading.value = true
  try {
    const { items, total, page, size } = await b2bService.companyList({
      q: filters.q || null,
      only_with_contracts: filters.only_with_contracts || null,
      page: pagin.value.page,
      size: pagin.value.size,
    })
    companies.value = items || []
    pagin.value.total = Number(total || 0)
    pagin.value.page = Number(page || pagin.value.page)
    pagin.value.size = Number(size || pagin.value.size)
  } catch (err) {
    console.error('Error cargando empresas:', err)
    companies.value = []
    pagin.value.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => { rebuildChips(); fetchCompanies() })
</script>

<style scoped>
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); margin-bottom: 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
.title { font-weight: 600; font-size: 1rem; color: #111827; display: flex; align-items: baseline; gap: .5rem; }
.title .sub { font-weight: 500; font-size: .8rem; color: #6b7280; }
.actions-bar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.card-body { padding: 1rem 1.25rem; }
.active-filters { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; align-items: center; }
.active-filters .label { font-size: .8rem; color: #6b7280; margin-right: .25rem; }
.chip { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; border-radius: 999px; padding: .2rem .6rem; font-size: .75rem; cursor: pointer; }
.chip .x { margin-left: .35rem; color: #6b7280; }
.chip.clear-all { background: #fff; }
.table-responsive { width: 100%; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead th { position: sticky; top: 0; background-color: #f9fafb; text-align: left; font-weight: 600; white-space: nowrap; padding: .6rem .75rem; border-bottom: 1px solid #e5e7eb; }
.table td { padding: .6rem .75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.ta-right { text-align: right; }
.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.mono { font-family: monospace; font-size: .82rem; }
.fw-500 { font-weight: 500; }
.name { font-weight: 600; color: #111827; }
.muted { color: #6b7280; }
.empty-state { text-align: center; padding: 1.5rem; color: #6b7280; font-style: italic; }
.badge { display: inline-block; padding: .2rem .5rem; font-size: .72rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.badge-neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
.badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.badge-intermediary { background: #ede9fe; color: #5b21b6; border-color: #ddd6fe; }
.btn { display: inline-block; font-size: .8rem; line-height: 1rem; font-weight: 500; border-radius: .375rem; padding: .5rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .5rem; font-size: .75rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding-top: 1rem; font-size: .8rem; flex-wrap: wrap; }
.page-size { display: inline-flex; align-items: center; gap: .4rem; }
.page-size select { border: 1px solid #d1d5db; border-radius: .375rem; padding: .25rem .4rem; background: #fff; }
.pager { display: inline-flex; align-items: center; gap: .5rem; }
.minW { min-width: 160px; }
.form-check-input { cursor: pointer; }
.input-group { display: flex; }
.input-group-text { background: #f9fafb; border: 1px solid #e5e7eb; border-right: none; padding: .4rem .6rem; border-radius: .375rem 0 0 .375rem; }
.form-control { border: 1px solid #e5e7eb; border-radius: 0 .375rem .375rem 0; padding: .4rem .6rem; flex: 1; }

/* ══ DARK MODE ══ */
[data-coreui-theme="dark"] .card { background: #1A1A14; border-color: #2A2A22; box-shadow: 0 1px 2px rgba(0,0,0,.4); color: #F4F4F0; }
[data-coreui-theme="dark"] .card-header { border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .title { color: #F4F4F0; }
[data-coreui-theme="dark"] .title .sub { color: #A0A099; }
[data-coreui-theme="dark"] .active-filters .label { color: #A0A099; }
[data-coreui-theme="dark"] .chip { background: #24241E; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .chip .x { color: #A0A099; }
[data-coreui-theme="dark"] .chip.clear-all { background: #1A1A14; }
[data-coreui-theme="dark"] .table thead th { background-color: #1F1F1A; color: #F4F4F0; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .table td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .name { color: #F4F4F0; }
[data-coreui-theme="dark"] .muted { color: #A0A099; }
[data-coreui-theme="dark"] .empty-state { color: #A0A099; }
[data-coreui-theme="dark"] .badge-neutral { background: #24241E; color: #F4F4F0; border-color: #2A2A22; }
[data-coreui-theme="dark"] .badge-success { background: rgba(16,185,129,.14); color: #34D399; border-color: rgba(16,185,129,.3); }
[data-coreui-theme="dark"] .badge-intermediary { background: rgba(139,92,246,.14); color: #A78BFA; border-color: rgba(139,92,246,.3); }
[data-coreui-theme="dark"] .btn { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
[data-coreui-theme="dark"] .btn-outline { background-color: #1A1A14; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .page-size select { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .input-group-text { background: #1F1F1A; border-color: #3A3A33; color: #A0A099; }
[data-coreui-theme="dark"] .form-control { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .form-label { color: #A0A099; }
</style>
