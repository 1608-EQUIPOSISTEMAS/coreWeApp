<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        Contratos B2B
        <span class="sub">Listado</span>
      </div>
      <div class="actions-bar">
        <button class="btn btn-outline" @click="openFilterModal">
          <i class="fa-solid fa-filter me-1"></i> Filtros
        </button>
        <button class="btn btn-primary" @click="goNew">
          + Nuevo Contrato
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
              <th>Empresa</th>
              <th>Tipo de Contrato</th>
              <th>Nombre del Contrato</th>
              <th class="ta-right">Monto</th>
              <th class="ta-right">Pagado</th>
              <th class="ta-right">Saldo</th>
              <th class="ta-center">Cupos</th>
              <th class="ta-center">F. Cierre</th>
              <th class="ta-center">F. Inicio</th>
              <th class="ta-center">F. Fin</th>
              <th class="ta-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in contracts" :key="item.contract_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-sm me-1" @click="viewDetail(item)" title="Ver detalle">
                  <i class="fa-solid fa-eye text-info"></i>
                </button>
                <button class="btn btn-outline btn-sm" @click="editContract(item)" title="Editar">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <td class="minW">
                <div class="name">{{ item.company_name }}</div>
                <small class="text-muted mono" v-if="item.document_number">{{ item.document_number }}</small>
              </td>

              <td>
                <span class="badge badge-neutral">{{ item.contract_type_label || '—' }}</span>
              </td>

              <td class="minW">{{ item.contract_name || '—' }}</td>

              <td class="ta-right mono small nowrap">{{ money(item.total_amount, item.currency_alias) }}</td>
              <td class="ta-right mono small nowrap">{{ money(item.paid_amount, item.currency_alias) }}</td>
              <td class="ta-right mono small nowrap" :class="{ 'saldo-deuda': Number(item.pending_amount) > 0 }">
                {{ money(item.pending_amount, item.currency_alias) }}
              </td>

              <td class="ta-center nowrap">
                <span class="badge" :class="Number(item.seats_available) < 0 ? 'badge-danger' : 'badge-neutral'">
                  {{ item.seats_assigned }}/{{ item.number_of_licenses || 0 }}
                </span>
                <small class="text-muted d-block" v-if="Number(item.seats_enrolled) > 0">
                  {{ item.seats_enrolled }} inscritos
                </small>
              </td>

              <td class="ta-center mono small">{{ item.close_date ? formatDate(item.close_date) : '—' }}</td>

              <td class="ta-center mono small">{{ formatDate(item.start_date) }}</td>

              <td class="ta-center mono small">
                {{ item.end_date ? formatDate(item.end_date) : '—' }}
              </td>

              <td class="ta-center">
                <span class="badge" :class="statusClass(item)">{{ statusLabel(item) }}</span>
              </td>
            </tr>

            <tr v-if="!loading && !contracts.length">
              <td colspan="12" class="empty-state">Sin resultados.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="12" class="empty-state">Cargando...</td>
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
          <button class="btn btn-outline btn-sm" :disabled="pagin.page === 1" @click="prevPage">‹ Anterior</button>
          <span class="muted">Página {{ pagin.page }} de {{ totalPages }}</span>
          <button class="btn btn-outline btn-sm" :disabled="pagin.page === totalPages" @click="nextPage">Siguiente ›</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de filtros -->
  <BaseModal v-model="showFilterModal" title="Filtros de contratos" size="md">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Empresa</label>
          <input
            v-model.trim="filters.q"
            type="text"
            class="form-control"
            placeholder="Nombre o RUC de empresa..."
            @keyup.enter="applyFilters"
          />
        </div>

        <div class="col-12">
          <label class="form-label">Tipo de Contrato</label>
          <SearchSelect
            v-model="filters.cat_contract_type"
            :items="catalogs.contractTypeList"
            label-field="description"
            value-field="id"
            placeholder="Todos los tipos..."
          />
        </div>

        <div class="col-12">
          <label class="form-label">Estado</label>
          <SearchSelect
            v-model="filters.status"
            :items="statusOptions"
            label-field="description"
            value-field="value"
            placeholder="Todos los estados..."
          />
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
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

const router = useRouter()
const b2bService = inject(ServiceKeys.B2b)
const catalog = inject('catalog')

// UI
const showFilterModal = ref(false)
const loading = ref(false)
function openFilterModal() { showFilterModal.value = true }

// Catálogos
const catalogs = ref({
  contractTypeList: catalog?.options('we_b2b_contract') || [],
})

const statusOptions = [
  { value: 'active', description: 'Activo' },
  { value: 'expired', description: 'Vencido' },
  { value: 'cancelled', description: 'Cancelado' },
]

// Tabla + paginación
const contracts = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil((pagin.value.total || 0) / pagin.value.size)))

function resetToFirstPage() { pagin.value.page = 1; fetchContracts() }
function nextPage() { if (pagin.value.page < totalPages.value) { pagin.value.page++; fetchContracts() } }
function prevPage() { if (pagin.value.page > 1) { pagin.value.page--; fetchContracts() } }

// Filtros
const filters = reactive({ q: '', cat_contract_type: null, status: null })
const activeFilterChips = ref([])

function rebuildChips() {
  const chips = []
  if (filters.q) chips.push({ key: 'q', text: `Empresa: ${filters.q}` })
  if (filters.cat_contract_type) {
    const found = catalogs.value.contractTypeList.find(c => c.id === filters.cat_contract_type)
    chips.push({ key: 'cat_contract_type', text: `Tipo: ${found?.description || filters.cat_contract_type}` })
  }
  if (filters.status) {
    const found = statusOptions.find(s => s.value === filters.status)
    chips.push({ key: 'status', text: `Estado: ${found?.description || filters.status}` })
  }
  activeFilterChips.value = chips
}

function clearFilter(key) {
  filters[key] = key === 'q' ? '' : null
  applyFilters()
}

function clearFilters() {
  filters.q = ''
  filters.cat_contract_type = null
  filters.status = null
  pagin.value.page = 1
  rebuildChips()
  fetchContracts()
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  rebuildChips()
  fetchContracts()
}

// Helpers de estado
function statusLabel(item) {
  if (item.status) return { active: 'Activo', expired: 'Vencido', cancelled: 'Cancelado' }[item.status] ?? item.status
  if (item.active === 'N') return 'Cancelado'
  if (item.end_date && item.end_date < new Date().toISOString().slice(0, 10)) return 'Vencido'
  return 'Activo'
}

function statusClass(item) {
  const label = statusLabel(item)
  if (label === 'Activo') return 'badge-success'
  if (label === 'Vencido') return 'badge-warning'
  return 'badge-danger'
}

function formatDate(value) {
  if (!value) return '—'
  const [y, m, d] = String(value).split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// El simbolo sale del alias del catalogo de moneda, no de la plaza del navegador:
// un contrato en USD tiene que leerse en USD aunque el usuario este en Peru.
function money(value, currencyAlias) {
  if (value === null || value === undefined || value === '') return '—'
  const simbolo = currencyAlias === 'we_currency_dollars' ? '$' : 'S/'
  return `${simbolo} ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Navegación
function goNew() { router.push({ name: 'B2BContractNew' }) }
function editContract(item) { router.push({ name: 'B2BContractEdit', params: { id: item.contract_id } }) }
function viewDetail(item) { router.push({ name: 'B2BContractEdit', params: { id: item.contract_id } }) }

// Backend
async function fetchContracts() {
  loading.value = true
  try {
    const { items, total, page, size } = await b2bService.contractList({
      q: filters.q || null,
      cat_contract_type: filters.cat_contract_type || null,
      status: filters.status || null,
      page: pagin.value.page,
      size: pagin.value.size,
    })
    contracts.value = items || []
    pagin.value.total = Number(total || 0)
    pagin.value.page = Number(page || pagin.value.page)
    pagin.value.size = Number(size || pagin.value.size)
  } catch (err) {
    console.error('Error cargando contratos:', err)
    contracts.value = []
    pagin.value.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => { rebuildChips(); fetchContracts() })
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
.saldo-deuda { color: #b45309; font-weight: 600; }
.name { font-weight: 600; color: #111827; }
.small { font-size: .8rem; }
.muted { color: #6b7280; }
.empty-state { text-align: center; padding: 1.5rem; color: #6b7280; font-style: italic; }
.badge { display: inline-block; padding: .2rem .5rem; font-size: .72rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.badge-neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
.badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.badge-warning { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
.badge-danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.btn { display: inline-flex; align-items: center; font-size: .8rem; font-weight: 500; border-radius: .375rem; padding: .4rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .5rem; font-size: .75rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding-top: 1rem; font-size: .8rem; flex-wrap: wrap; }
.page-size { display: inline-flex; align-items: center; gap: .4rem; }
.page-size select { border: 1px solid #d1d5db; border-radius: .375rem; padding: .25rem .4rem; background: #fff; }
.pager { display: inline-flex; align-items: center; gap: .5rem; }
.minW { min-width: 160px; }
.form-control { border: 1px solid #e5e7eb; border-radius: .375rem; padding: .4rem .6rem; width: 100%; font-size: .875rem; }
.form-label { font-size: .85rem; font-weight: 500; color: #374151; display: block; margin-bottom: .3rem; }

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
[data-coreui-theme="dark"] .badge-warning { background: rgba(245,158,11,.14); color: #FBBF24; border-color: rgba(245,158,11,.3); }
[data-coreui-theme="dark"] .saldo-deuda { color: #FBBF24; }
[data-coreui-theme="dark"] .badge-danger { background: rgba(239,68,68,.14); color: #F87171; border-color: rgba(239,68,68,.3); }
[data-coreui-theme="dark"] .btn { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
[data-coreui-theme="dark"] .btn-outline { background-color: #1A1A14; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .page-size select { background: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .form-control { background-color: #1F1F1A; border-color: #3A3A33; color: #F4F4F0; }
[data-coreui-theme="dark"] .form-label { color: #A0A099; }
</style>
