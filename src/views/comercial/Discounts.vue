<template>
  <div class="card discounts-card">
    <div class="card-header">
      <div class="title">
        <span>Descuentos y Promociones</span>
        <span class="sub">Listado General</span>
      </div>

      <div class="actions-bar">
        <button class="btn btn-primary" @click="goNew">
          <i class="fa-solid fa-plus me-1"></i> Nuevo
        </button>
      </div>
    </div>

    <div class="card-body">
      <BaseFilterChips 
        :items="activeFilterChips"
        @remove="clearFilter"
        @clear-all="clearFilters"
      />

      <div class="pagination-bar">
        <BasePagination
          v-model="pagin"
          @open-filters="openFilterModal"
          @change="handlePaginationChange"
        />
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th class="ta-center">Acciones</th>
              <th>Estado</th>
              <th>Descripción / Alias</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Alcance</th>
              <th>Vigencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in discounts" :key="d.discount_id">
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm" @click="editDiscount(d)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <td>
                <span class="badge" :class="d.active ? 'badge-success' : 'badge-danger'">
                  {{ d.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td>
                <div class="name">{{ d.description }}</div>
                <div class="font-mono x-small text-muted mt-1" v-if="d.alias">
                  <i class="fa-solid fa-tag me-1"></i>{{ d.alias }}
                </div>
              </td>

              <td>
                <span class="badge badge-value">
                  {{ d.value_formatted }}
                </span>
              </td>

              <td>
                <div class="small fw-600">{{ d.cat_discount_type_label || '—' }}</div>
                <div class="muted x-small" v-if="d.cat_currency_type_alias !== 'we_currency_pen'">
                   {{ d.cat_currency_type_label }}
                </div>
              </td>

              <td>
                <span class="badge" :class="d.is_global ? 'badge-global' : 'badge-specific'">
                  <i class="fa-solid me-1" :class="d.is_global ? 'fa-globe' : 'fa-list-check'"></i>
                  {{ d.is_global ? 'Global' : 'Específico' }}
                </span>
              </td>

              <td>
                <div class="d-flex flex-column small">
                  <span v-if="d.start_date" class="muted">
                     Desde: {{ formatDate(d.start_date) }}
                  </span>
                  <span v-if="d.end_date" class="text-danger">
                     Hasta: {{ formatDate(d.end_date) }}
                  </span>
                  <span v-if="!d.start_date && !d.end_date" class="muted">—</span>
                </div>
              </td>
            </tr>

            <tr v-if="!discounts.length">
              <td colspan="7" class="empty-state">No se encontraron descuentos.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de Descuentos" size="lg">
    <div class="px-3 py-2">
      <div class="row mb-3">
        <div class="col-12">
          <label class="form-label">Búsqueda General</label>
          <div class="input-group">
            <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Buscar por descripción, alias o valor..."
              @keyup.enter="applyFilters"
            />
          </div>
        </div>
      </div>
      
      <hr class="border-secondary opacity-10 my-3">

      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Tipo de Beneficio</label>
          <SearchSelect
            v-model="filters.cat_discount_type"
            :items="catalogs.discountTypes"
            label-field="description"
            value-field="id"
            placeholder="Todos..."
          />
        </div>
        
        <div class="col-md-6">
           <label class="form-label">Estado</label>
           <SearchSelect
            v-model="filters.active"
            :items="filtroEstado"
            label-field="description"
            value-field="value"
            placeholder="Todos..."
          />
        </div>

        <div class="col-12">
           <label class="form-label mb-2">Alcance del Descuento</label>
           <div class="d-flex gap-3">
             <div class="form-check">
               <input class="form-check-input" type="radio" :value="null" v-model="filters.is_global" id="scope_all">
               <label class="form-check-label" for="scope_all">Todos</label>
             </div>
             <div class="form-check">
               <input class="form-check-input" type="radio" :value="true" v-model="filters.is_global" id="scope_global">
               <label class="form-check-label" for="scope_global">Globales</label>
             </div>
             <div class="form-check">
               <input class="form-check-input" type="radio" :value="false" v-model="filters.is_global" id="scope_specific">
               <label class="form-check-label" for="scope_specific">Específicos</label>
             </div>
           </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline btn-sm" @click="clearFilters">Limpiar</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn btn-primary btn-sm" @click="applyFilters">Aplicar Filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import { ServiceKeys } from '@/services'
import { useTablePersistence } from '@/composables/useTablePersistence'

const router = useRouter()
const discountService = inject(ServiceKeys.Discount)
const catalog = inject('catalog')

// === Estado UI ===
const showFilterModal = ref(false)
function openFilterModal() { showFilterModal.value = true }

// === Datos ===
const discounts = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })

// === Filtros ===
const filters = reactive({
  active: null,
  cat_discount_type: null,
  is_global: null,
  q: ''
})

// === Catálogos ===
const catalogs = ref({
  discountTypes: catalog.options('we_discount_type') || []
})
const filtroEstado = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]
const activeFilterChips = ref([])

// =================================================================
// 1. LÓGICA DE PERSISTENCIA
// =================================================================
const { saveState } = useTablePersistence('crm_discounts_filter_state_v1', filters, pagin)

// =================================================================
// 2. ACCIONES Y EVENTOS
// =================================================================
function handlePaginationChange() {
  saveState()
  fetchDiscounts()
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  saveState()
  rebuildChips()
  fetchDiscounts()
}

function clearFilter(key) {
  if (key === 'active') filters.active = null
  else if (key === 'cat_discount_type') filters.cat_discount_type = null
  else if (key === 'is_global') filters.is_global = null
  else if (key === 'q') filters.q = ''
  applyFilters()
}

function clearFilters() {
  Object.assign(filters, {
    active: null,
    cat_discount_type: null,
    is_global: null,
    q: ''
  })
  pagin.value.page = 1
  localStorage.removeItem('crm_discounts_filter_state_v1')
  rebuildChips()
  fetchDiscounts()
}

function rebuildChips() {
  const chips = []
  
  if (filters.q) {
    chips.push({ key: 'q', text: `Buscar: ${filters.q}` })
  }
  if (filters.active !== null) {
    chips.push({ key: 'active', text: `Estado: ${filters.active ? 'Activo' : 'Inactivo'}` })
  }
  if (filters.cat_discount_type) {
    const item = catalogs.value.discountTypes.find(i => i.id === filters.cat_discount_type)
    chips.push({ key: 'cat_discount_type', text: `Tipo: ${item?.description || filters.cat_discount_type}` })
  }
  if (filters.is_global !== null) {
    chips.push({ key: 'is_global', text: filters.is_global ? 'Alcance: Global' : 'Alcance: Específico' })
  }

  activeFilterChips.value = chips
}

// === API ===
async function fetchDiscounts() {
  try {
    const payload = {
      q: filters.q || null,
      cat_discount_type: filters.cat_discount_type || null,
      is_global: filters.is_global, 
      active: filters.active,
      page: pagin.value.page,
      size: pagin.value.size
    }

    const res = await discountService.discountList(payload)
    
    discounts.value = res.items || []
    pagin.value.total = Number(res.total || 0)
    if(res.page) pagin.value.page = Number(res.page)
    if(res.size) pagin.value.size = Number(res.size)

  } catch (error) {
    console.error("Error fetching discounts:", error)
    discounts.value = []
    pagin.value.total = 0
  }
}

// === Helpers Visuales ===
function formatDate(isoStr) {
  if (!isoStr) return ''
  const datePart = isoStr.split('T')[0]
  const [y, m, d] = datePart.split('-')
  return `${d}/${m}/${y}`
}

function goNew() { router.push({ name: 'DiscountNew' }) }
function editDiscount(d) { router.push({ name: 'DiscountEdit', params: { id: d.discount_id } }) }

// === Lifecycle ===
onMounted(() => {
  rebuildChips()
  fetchDiscounts()
})
</script>

<style scoped>
/* Contenedor Principal (Estilo FICO) */
.discounts-card { 
  background: #fff; 
  border: 1px solid #e5e7eb; 
  border-radius: 0.6rem; 
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #6366f1; /* Color Indigo */
  margin-bottom: 2rem;
}

.card-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 1.25rem; 
  border-bottom: 1px solid #f3f4f6; 
}

.title { display: flex; flex-direction: column; gap: 4px; }
.title span { font-weight: 700; font-size: 1.1rem; color: #111827; }
.title .sub { font-weight: 600; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }

.card-body { padding: 1.25rem; }

/* Tabla Unificada */
.table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #374151; }
.table thead th { 
  background: #f9fafb; 
  padding: 0.85rem 0.75rem; 
  text-align: left; 
  font-weight: 600; 
  color: #4b5563; 
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}
.table td { padding: 0.85rem 0.75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.table-hover tbody tr:hover { background-color: #f8fafc; }

/* Tipografía */
.font-mono { font-weight: 600 }
.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.fw-600 { font-weight: 600; }

.name { font-weight: 600; color: #1e293b; line-height: 1.2; font-size: 0.9rem; }
.muted { color: #6b7280; }
.text-danger { color: #dc2626; }
.small { font-size: 0.75rem; }
.x-small { font-size: 0.68rem; }
.text-warning { color: #d97706; }

/* Badges Generales */
.badge { padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 600; display: inline-block; border: 1px solid transparent; }
.badge-success { background: #ecfdf5; color: #065f46; border-color: #d1fae5; }
.badge-danger { background: #fef2f2; color: #991b1b; border-color: #fee2e2; }

/* Badges Específicos de Descuento */
.badge-value { 
  background: #f8fafc; 
  border: 1px solid #cbd5e1; 
  color: #0f172a; 
  font-size: 0.8rem; 
}

.badge-global { background: #f0f9ff; color: #0369a1; border-color: #e0f2fe; }
.badge-specific { background: #fdf4ff; color: #a21caf; border-color: #fae8ff; }

/* Botones */
.btn { 
  border: 1px solid #d1d5db; 
  padding: 0.45rem 0.75rem; 
  border-radius: 0.4rem; 
  cursor: pointer; 
  transition: all 0.2s; 
  background: #fff;
  font-size: 0.8rem;
  font-weight: 600;
}
.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
.btn-primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.btn-primary:hover { background: #4338ca; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }

/* Inputs y Modal */
.form-label { font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; display: block; }
.form-control { width: 100%; border: 1px solid #d1d5db; border-radius: 0.4rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
.form-control:focus { outline: none; border-color: #6366f1; ring: 2px rgba(99, 102, 241, 0.2); }
.input-group-text { background: #f9fafb; border-color: #d1d5db; color: #6b7280; }

.empty-state { padding: 3rem; text-align: center; color: #9ca3af; font-style: italic; }
</style>