<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        Convenios B2B
        <span class="sub">Listado</span>
      </div>
      <div class="actions-bar">
        <button class="btn btn-outline" @click="openFilterModal">
          <i class="fa-solid fa-filter me-1"></i> Filtros
        </button>
        <button class="btn btn-primary" @click="goNew">
          + Nuevo Convenio
        </button>
      </div>
    </div>

    <div class="card-body">
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
              <th class="ta-center">Vigencia</th>
              <th class="ta-center">Estado</th>
              <th class="ta-center">Descuentos Config.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in agreements" :key="item.agreement_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-sm me-1" @click="viewDetail(item)" title="Ver detalle">
                  <i class="fa-solid fa-eye text-info"></i>
                </button>
                <button class="btn btn-outline btn-sm" @click="editAgreement(item)" title="Editar">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <td class="minW">
                <div class="name">{{ item.company_name }}</div>
                <small class="text-muted mono" v-if="item.document_number">{{ item.document_number }}</small>
              </td>

              <td class="ta-center">
                <div class="small mono">
                  <div><i class="fa-solid fa-play text-success me-1"></i>{{ formatDate(item.start_date) }}</div>
                  <div v-if="item.end_date">
                    <i class="fa-solid fa-stop text-danger me-1"></i>{{ formatDate(item.end_date) }}
                  </div>
                  <div v-else class="text-muted">
                    <i class="fa-solid fa-infinity me-1"></i>Indefinido
                  </div>
                </div>
              </td>

              <td class="ta-center">
                <span class="badge" :class="statusClass(item)">{{ statusLabel(item) }}</span>
              </td>

              <td class="ta-center">
                <span v-if="item.discounts_count > 0" class="badge badge-info fw-bold">
                  {{ item.discounts_count }}
                </span>
                <span v-else class="text-muted small">Sin configurar</span>
              </td>
            </tr>

            <tr v-if="!loading && !agreements.length">
              <td colspan="5" class="empty-state">Sin resultados.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="5" class="empty-state">Cargando...</td>
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

  <!-- Modal filtros -->
  <BaseModal v-model="showFilterModal" title="Filtros de convenios" size="md">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">Empresa</label>
          <input
            v-model.trim="filters.q"
            type="text"
            class="form-control"
            placeholder="Nombre o RUC..."
            @keyup.enter="applyFilters"
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

const showFilterModal = ref(false)
const loading = ref(false)
function openFilterModal() { showFilterModal.value = true }

const statusOptions = [
  { value: 'active',  description: 'Activo' },
  { value: 'expired', description: 'Vencido' },
]

const agreements = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil((pagin.value.total || 0) / pagin.value.size)))

function resetToFirstPage() { pagin.value.page = 1; fetchAgreements() }
function nextPage() { if (pagin.value.page < totalPages.value) { pagin.value.page++; fetchAgreements() } }
function prevPage() { if (pagin.value.page > 1) { pagin.value.page--; fetchAgreements() } }

const filters = reactive({ q: '', status: null })
const activeFilterChips = ref([])

function rebuildChips() {
  const chips = []
  if (filters.q) chips.push({ key: 'q', text: `Empresa: ${filters.q}` })
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
  filters.status = null
  pagin.value.page = 1
  rebuildChips()
  fetchAgreements()
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  rebuildChips()
  fetchAgreements()
}

function formatDate(value) {
  if (!value) return '—'
  const [y, m, d] = String(value).split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function statusLabel(item) {
  if (item.status) return { active: 'Activo', expired: 'Vencido' }[item.status] ?? item.status
  if (item.end_date && item.end_date < new Date().toISOString().slice(0, 10)) return 'Vencido'
  return 'Activo'
}

function statusClass(item) {
  return statusLabel(item) === 'Activo' ? 'badge-success' : 'badge-warning'
}

function goNew() { router.push({ name: 'B2BAgreementNew' }) }
function editAgreement(item) { router.push({ name: 'B2BAgreementEdit', params: { id: item.agreement_id } }) }
function viewDetail(item) { router.push({ name: 'B2BAgreementEdit', params: { id: item.agreement_id } }) }

async function fetchAgreements() {
  loading.value = true
  try {
    const { items, total, page, size } = await b2bService.agreementList({
      q: filters.q || null,
      status: filters.status || null,
      page: pagin.value.page,
      size: pagin.value.size,
    })
    agreements.value = items || []
    pagin.value.total = Number(total || 0)
    pagin.value.page = Number(page || pagin.value.page)
    pagin.value.size = Number(size || pagin.value.size)
  } catch (err) {
    console.error('Error cargando convenios:', err)
    agreements.value = []
    pagin.value.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => { rebuildChips(); fetchAgreements() })
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
.small { font-size: .8rem; }
.name { font-weight: 600; color: #111827; }
.muted { color: #6b7280; }
.empty-state { text-align: center; padding: 1.5rem; color: #6b7280; font-style: italic; }
.badge { display: inline-block; padding: .2rem .5rem; font-size: .72rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.badge-warning { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
.badge-info { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
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
</style>
