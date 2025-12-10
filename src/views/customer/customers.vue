<template>
  <div class="card customers-card">
    <div class="card-header">
      <div class="title">
        Clientes
        <span class="sub">Listado General</span>
      </div>

      <div class="actions-bar">
        <button class="btn btn-outline" @click="openFilterModal">
          Filtros
        </button>
        <button class="btn btn-primary" @click="goNew">
          + Nuevo
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
          :title="chip.title"
        >
          {{ chip.text }} <span class="x">×</span>
        </button>
        <button class="chip clear-all" @click="clearFilters">Limpiar todo</button>
      </div>

      <div class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Cliente (Razón Social / Nombre)</th>
              <th>Documento</th>
              <th>Segmento</th>
              <th>Estado Cliente</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in customers" :key="c.customer_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editCustomer(c)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <td>
                <span
                  class="badge"
                  :class="c.active === 'Y' ? 'badge-success' : 'badge-danger'"
                >
                  {{ c.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td class="text-center">
                <i 
                  class="fa-solid" 
                  :class="c.company_id ? 'fa-building text-primary' : 'fa-user text-secondary'"
                  :title="c.company_id ? 'Empresa' : 'Persona'"
                ></i>
              </td>

              <td class="minW">
                <div class="name">
                  {{ c.display_name || '—' }}
                </div>
              </td>

              <td class="minW">
                <div class="mono">
                  <span v-if="c.document_number">{{ c.document_number }}</span>
                  <span v-else>—</span>
                </div>
              </td>

              <td class="minW">
                 <span class="badge badge-neutral" v-if="c.cat_customer_segment_label">
                    {{ c.cat_customer_segment_label }}
                 </span>
                 <span v-else>—</span>
              </td>

              <td class="minW">
                <div class="name">{{ c.cat_customer_status_label || '—' }}</div>
              </td>

              <td class="minW">
                <div>{{ formatDate(c.registration_date) }}</div>
              </td>
            </tr>

            <tr v-if="!customers.length">
              <td colspan="8" class="empty-state">Sin resultados.</td>
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
            <option :value="100">100</option>
          </select>
        </div>

        <div class="pager">
          <button
            class="btn btn-outline btn-sm"
            :disabled="pagin.page === 1"
            @click="prevPage"
          >
            ‹ Anterior
          </button>
          <span class="muted">Página {{ pagin.page }} de {{ totalPages }}</span>
          <button
            class="btn btn-outline btn-sm"
            :disabled="pagin.page === 0 || pagin.page === totalPages"
            @click="nextPage"
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de Clientes" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <label class="form-label">Estado</label>
          <SearchSelect
            v-model="filters.active"
            :items="filtroEstado"
            label-field="description"
            value-field="value"
            placeholder="ESTADO..."
          />
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label">Segmento</label>
          <SearchSelect
            v-model="filters.cat_customer_segment"
            :items="filtroSegmentos"
            label-field="description"
            value-field="id"
            placeholder="SEGMENTO..."
          />
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label">Estado Cliente</label>
          <SearchSelect
            v-model="filters.cat_customer_status"
            :items="filtroEstadosCliente"
            label-field="description"
            value-field="id"
            placeholder="ESTATUS..."
          />
        </div>

        <div class="col-12">
          <label class="form-label">Búsqueda (q)</label>
          <div class="input-group">
            <span class="input-group-text">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Nombre, Razón Social, RUC, DNI..."
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline btn-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">
            Cerrar
          </button>
          <button class="btn btn-primary btn-sm" @click="applyFilters">
            Aplicar filtros
          </button>
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
const customerService = inject(ServiceKeys.Customer) // Asegúrate de tener Customer en ServiceKeys
const catalog = inject('catalog')

// === estado UI
const showFilterModal = ref(false)
const dense = ref(false)
function openFilterModal () { showFilterModal.value = true }

// === tabla + paginación
const customers = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const totalPages = computed(() =>
  Math.max(1, Math.ceil((pagin.value.total || 0) / pagin.value.size))
)

function resetToFirstPage () { pagin.value.page = 1; fetchCustomers() }
function nextPage () { if (pagin.value.page < totalPages.value) { pagin.value.page++; fetchCustomers() } }
function prevPage () { if (pagin.value.page > 1) { pagin.value.page--; fetchCustomers() } }

// === filtros
const filters = reactive({
  active: null,
  cat_customer_segment: null,
  cat_customer_status: null,
  q: ''
})

const filtroEstado = [
  { value: null, description: 'Todos' },
  { value: 'Y', description: 'Activo' },
  { value: 'N', description: 'Inactivo' }
]

// Cargar opciones del catálogo (Ajusta los strings 'customer_segment' según tu BD)
const filtroSegmentos = ref(catalog.options('customer_segment') || []) 
const filtroEstadosCliente = ref(catalog.options('customer_status') || [])

// chips logic
const activeFilterChips = ref([])

function rebuildChips () {
  const chips = []
  if (filters.active !== null) {
    chips.push({ key: 'active', text: `Estado: ${filters.active === 'Y' ? 'Activo' : 'Inactivo'}` })
  }
  if (filters.cat_customer_segment) {
    const it = filtroSegmentos.value.find(i => i.id === filters.cat_customer_segment)
    chips.push({ key: 'cat_customer_segment', text: `Segmento: ${it?.description || filters.cat_customer_segment}` })
  }
  if (filters.cat_customer_status) {
    const it = filtroEstadosCliente.value.find(i => i.id === filters.cat_customer_status)
    chips.push({ key: 'cat_customer_status', text: `Estatus: ${it?.description || filters.cat_customer_status}` })
  }
  if (filters.q) chips.push({ key: 'q', text: `q: ${filters.q}` })
  
  activeFilterChips.value = chips
}

function clearFilter (key) {
  if (key === 'active') filters.active = null
  else if (key === 'cat_customer_segment') filters.cat_customer_segment = null
  else if (key === 'cat_customer_status') filters.cat_customer_status = null
  else if (key === 'q') filters.q = ''
  applyFilters()
}

function clearFilters () {
  Object.assign(filters, { active: null, cat_customer_segment: null, cat_customer_status: null, q: '' })
  pagin.value.page = 1
  rebuildChips()
  fetchCustomers()
}

function applyFilters () {
  showFilterModal.value = false
  pagin.value.page = 1
  rebuildChips()
  fetchCustomers()
}

// === helpers
function formatDate (value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = d.getFullYear()
    return `${dd}/${mm}/${yy}`
  } catch { return '—' }
}

// === acciones
function goNew () {
  router.push({ name: 'CustomerNew' })
}

function editCustomer (c) {
  router.push({ name: 'CustomerEdit', params: { id: c.customer_id } })
}

// === API
async function fetchCustomers () {
  try {
    const payload = {
      active: filters.active,
      cat_customer_segment: filters.cat_customer_segment,
      cat_customer_status: filters.cat_customer_status,
      q: filters.q,
      page: pagin.value.page,
      size: pagin.value.size
    }
    const { items, total, page, size } = await customerService.customerList(payload)
    
    customers.value = items || []
    pagin.value.total = Number(total || 0)
    pagin.value.page = Number(page || pagin.value.page)
    pagin.value.size = Number(size || pagin.value.size)
  } catch (err) {
    console.error('Error cargando clientes:', err)
    customers.value = []
  }
}

onMounted(() => {
  rebuildChips()
  fetchCustomers()
})
</script>

<style scoped>
/* Copiar exactamente los estilos de InstructorList.vue */
/* ---------- Card ---------- */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); margin-bottom: 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
.title { font-weight: 600; font-size: 1rem; color: #111827; display: flex; align-items: baseline; gap: .5rem; }
.title .sub { font-weight: 500; font-size: .8rem; color: #6b7280; }
.actions-bar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.card-body { padding: 1rem 1.25rem; }

/* ---------- Active filter chips ---------- */
.active-filters { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; align-items: center; }
.active-filters .label { font-size: .8rem; color: #6b7280; margin-right: .25rem; }
.chip { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; border-radius: 999px; padding: .2rem .6rem; font-size: .75rem; cursor: pointer; }
.chip .x { margin-left: .35rem; color: #6b7280; }
.chip.clear-all { background: #fff; }

/* ---------- Table ---------- */
.table-responsive { width: 100%; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead th { position: sticky; top: 0; background-color: #f9fafb; text-align: left; font-weight: 600; white-space: nowrap; padding: .6rem .75rem; border-bottom: 1px solid #e5e7eb; cursor: default; }
.table td { padding: .6rem .75rem; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
.table.dense td, .table.dense thead th { padding: .35rem .5rem; }

.nowrap { white-space: nowrap; }
.ta-right { text-align: right; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.empty-state { text-align: center; padding: 1rem; color: #6b7280; font-style: italic; }
.name { font-weight: 600; color: #111827; }
.muted { color: #6b7280; }

/* Badges */
.badge { display: inline-block; padding: .2rem .45rem; font-size: .72rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.badge-neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
.badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.badge-danger  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

/* ---------- Buttons ---------- */
.btn { display: inline-block; font-size: .8rem; line-height: 1rem; font-weight: 500; border-radius: .375rem; padding: .5rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .5rem; font-size: .75rem; line-height: .875rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }

/* ---------- Pagination ---------- */
.pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding-top: 1rem; font-size: .8rem; flex-wrap: wrap; }
.page-size { display: inline-flex; align-items: center; gap: .4rem; }
.page-size select { border: 1px solid #d1d5db; border-radius: .375rem; padding: .25rem .4rem; background: #fff; }
.pager { display: inline-flex; align-items: center; gap: .5rem; }

.minW { min-width: 140px; }

/* Modal inputs */
.form-label { font-size: .85rem; color: #374151; margin-bottom: .35rem; }
.input-group-text { background: #f9fafb; border-color: #e5e7eb; }
.form-control { border-color: #e5e7eb; }
</style>