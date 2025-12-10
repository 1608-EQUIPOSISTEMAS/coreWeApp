<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        Descuentos y Promociones
        <span class="sub">Listado General</span>
      </div>

      <div class="actions-bar">
        <button class="btn btn-outline" @click="openFilterModal">
          <i class="fa-solid fa-filter me-1"></i> Filtros
        </button>
        <button class="btn btn-primary" @click="goNew">
          <i class="fa-solid fa-plus me-1"></i> Nuevo
        </button>
      </div>
    </div>

    <div class="card-body">
      <div v-if="activeFilterChips.length" class="active-filters">
        <span class="label">Filtros activos:</span>
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          class="chip animate__animated animate__fadeIn"
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
              <th class="ta-right" style="width: 80px">Acciones</th>
              <th style="width: 100px">Estado</th>
              <th>Descripción / Alias</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Alcance</th>
              <th>Vigencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in discounts" :key="d.discount_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-sm border-0" title="Editar" @click="editDiscount(d)">
                  <i class="fa-solid fa-pen-to-square text-primary"></i>
                </button>
              </td>

              <td>
                <span
                  class="badge"
                  :class="d.active ? 'badge-success' : 'badge-danger'"
                >
                  {{ d.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td class="minW">
                <div class="d-flex flex-column">
                  <span class="fw-bold text-dark">{{ d.description }}</span>
                  <span class="mono text-muted small" v-if="d.alias">
                    <i class="fa-solid fa-tag me-1" style="font-size: 0.7em"></i>{{ d.alias }}
                  </span>
                </div>
              </td>

              <td>
                <span class="badge badge-value">
                  {{ d.value_formatted }}
                </span>
              </td>

              <td>
                <div class="text-xs text-secondary">
                  {{ d.cat_discount_type_label || '—' }}
                </div>
                <div class="tiny-text text-muted" v-if="d.cat_currency_type_alias !== 'we_currency_pen' && d.cat_currency_type_label">
                   {{ d.cat_currency_type_label }}
                </div>
              </td>

              <td>
                <span class="badge" :class="d.is_global ? 'badge-global' : 'badge-specific'">
                   <i class="fa-solid" :class="d.is_global ? 'fa-globe' : 'fa-list-check'"></i>
                   {{ d.is_global ? 'Global' : 'Específico' }}
                </span>
              </td>

              <td class="minW">
                <div class="d-flex flex-column" style="font-size: 0.8rem">
                    <span v-if="d.start_date">
                        <i class="fa-regular fa-calendar text-muted me-1"></i>{{ formatDate(d.start_date) }}
                    </span>
                    <span v-if="d.end_date" class="text-muted">
                        hasta {{ formatDate(d.end_date) }}
                    </span>
                    <span v-if="!d.start_date && !d.end_date" class="text-muted">—</span>
                </div>
              </td>
            </tr>

            <tr v-if="!loading && !discounts.length">
              <td colspan="7" class="empty-state">
                <div class="py-4">
                    <i class="fa-regular fa-folder-open mb-2 fs-4 d-block"></i>
                    No se encontraron descuentos con los filtros actuales.
                </div>
              </td>
            </tr>
            <tr v-if="loading">
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-spinner fa-spin text-primary fs-4"></i>
                    <div class="mt-2 text-muted small">Cargando datos...</div>
                </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <div class="page-size">
          <label>Mostrar</label>
          <select v-model.number="pagin.size" @change="resetToFirstPage">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <span>registros</span>
        </div>

        <div class="pager">
          <button
            class="btn btn-outline btn-sm"
            :disabled="pagin.page === 1 || loading"
            @click="prevPage"
          >
            ‹ Anterior
          </button>
          <span class="muted">Página {{ pagin.page }} de {{ totalPages }}</span>
          <button
            class="btn btn-outline btn-sm"
            :disabled="pagin.page >= totalPages || loading"
            @click="nextPage"
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtrar Descuentos" size="lg">
    <div class="filter-modal-content p-3">
      
      <div class="row mb-3">
        <div class="col-12">
           <label class="form-label fw-bold text-primary">
             <i class="fa-solid fa-magnifying-glass me-1"></i> Búsqueda general
           </label>
           <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Buscar por descripción, alias o valor (ej: 'Beca', '20%')..."
              @keyup.enter="applyFilters"
            />
        </div>
      </div>

      <hr class="border-secondary opacity-10 my-3">

      <label class="form-label fw-bold text-primary mb-2">
        <i class="fa-solid fa-sliders me-1"></i> Características
      </label>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label small text-muted">Tipo de beneficio</label>
          <SearchSelect
            v-model="filters.cat_discount_type"
            :items="catalogs.discountTypes"
            label-field="description"
            value-field="id"
            placeholder="Todos los tipos"
            clearable
          />
        </div>

        <div class="col-md-6">
            <label class="form-label small text-muted">Alcance</label>
            <div class="btn-group w-100" role="group">
                <input type="radio" class="btn-check" name="scope" id="scope_all" :value="null" v-model="filters.is_global" autocomplete="off">
                <label class="btn btn-outline-secondary" for="scope_all">Todos</label>

                <input type="radio" class="btn-check" name="scope" id="scope_global" :value="true" v-model="filters.is_global" autocomplete="off">
                <label class="btn btn-outline-secondary" for="scope_global">Globales</label>

                <input type="radio" class="btn-check" name="scope" id="scope_specific" :value="false" v-model="filters.is_global" autocomplete="off">
                <label class="btn btn-outline-secondary" for="scope_specific">Específicos</label>
            </div>
        </div>
      </div>

      <hr class="border-secondary opacity-10 my-3">

      <div class="row g-3 align-items-center">
         <div class="col-md-6">
            <label class="form-label fw-bold text-primary mb-2">
                <i class="fa-regular fa-circle-check me-1"></i> Estado
            </label>
            <select class="form-select" v-model="filters.active">
                <option :value="null">Mostrar todos (Activos e Inactivos)</option>
                <option :value="true">Solo Activos</option>
                <option :value="false">Solo Inactivos</option>
            </select>
         </div>
      </div>

    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn btn-link text-secondary text-decoration-none btn-sm px-0" @click="clearFilters">
            <i class="fa-solid fa-eraser me-1"></i> Limpiar filtros
        </button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" @click="showFilterModal = false">
            Cancelar
          </button>
          <button class="btn btn-primary btn-sm px-4" @click="applyFilters">
            Aplicar Filtros
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
import { ServiceKeys } from '@/services' // Asegúrate de tener esto mapeado

const router = useRouter()
// Inyección de servicios y catálogos
const discountService = inject(ServiceKeys.Discount)
const catalog = inject('catalog')

// === Estado UI ===
const showFilterModal = ref(false)
const dense = ref(false)
const loading = ref(false)

function openFilterModal() { showFilterModal.value = true }

// === Datos Tabla ===
const discounts = ref([])
const pagin = reactive({ size: 25, page: 1, total: 0 })

const totalPages = computed(() =>
  Math.max(1, Math.ceil((pagin.total || 0) / pagin.size))
)

// === Catálogos para filtros ===
const catalogs = ref({
    discountTypes: catalog.options('we_discount_type') || []
})

// === Filtros (Modelo reactivo) ===
// active: null (todos), true (activos), false (inactivos)
// is_global: null (todos), true (global), false (especifico)
const filters = reactive({
  active: null,
  cat_discount_type: null,
  is_global: null,
  q: ''
})

// === Chips de Filtros Activos ===
const activeFilterChips = computed(() => {
  const chips = []

  // Filtro de Texto
  if (filters.q) {
    chips.push({ key: 'q', text: `Buscar: "${filters.q}"` })
  }

  // Filtro de Tipo
  if (filters.cat_discount_type) {
    const item = catalogs.value.discountTypes.find(i => i.id === filters.cat_discount_type)
    chips.push({
      key: 'cat_discount_type',
      text: `Tipo: ${item?.description || '...'}`
    })
  }

  // Filtro Global/Especifico
  if (filters.is_global !== null) {
    chips.push({
      key: 'is_global',
      text: filters.is_global ? 'Alcance: Global' : 'Alcance: Específico'
    })
  }

  // Filtro Estado
  if (filters.active !== null) {
    chips.push({
      key: 'active',
      text: filters.active ? 'Estado: Activo' : 'Estado: Inactivo'
    })
  }

  return chips
})

// === Métodos de Filtrado ===

function clearFilter(key) {
  if (key === 'q') filters.q = ''
  if (key === 'cat_discount_type') filters.cat_discount_type = null
  if (key === 'is_global') filters.is_global = null
  if (key === 'active') filters.active = null
  
  applyFilters()
}

function clearFilters() {
  Object.assign(filters, {
    q: '',
    cat_discount_type: null,
    is_global: null,
    active: null
  })
  applyFilters()
}

function applyFilters() {
  pagin.page = 1
  showFilterModal.value = false
  fetchDiscounts()
}

// === Paginación ===
function resetToFirstPage() {
  pagin.page = 1
  fetchDiscounts()
}
function nextPage() {
  if (pagin.page < totalPages.value) {
    pagin.page++
    fetchDiscounts()
  }
}
function prevPage() {
  if (pagin.page > 1) {
    pagin.page--
    fetchDiscounts()
  }
}

// === API Fetch ===
async function fetchDiscounts() {
  loading.value = true
  try {
    const payload = {
      q: filters.q || null,
      cat_discount_type: filters.cat_discount_type || null,
      is_global: filters.is_global, // pasa null, true o false directo
      active: filters.active,       // pasa null, true o false directo
      page: pagin.page,
      size: pagin.size
    }

    const res = await discountService.discountList(payload)
    
    discounts.value = res.items || []
    pagin.total = Number(res.total || 0)
    // Actualizamos page/size por seguridad si el back los ajustó
    pagin.page = Number(res.page || pagin.page)
    pagin.size = Number(res.size || pagin.size)

  } catch (error) {
    console.error("Error fetching discounts:", error)
    discounts.value = []
    pagin.total = 0
  } finally {
    loading.value = false
  }
}

// === Navegación / Acciones ===
function goNew() {
  router.push({ name: 'DiscountNew' }) // Asegúrate de tener esta ruta
}

function editDiscount(d) {
  router.push({ name: 'DiscountEdit', params: { id: d.discount_id } })
}

// === Helpers ===
function formatDate(isoStr) {
  if (!isoStr) return ''
  // Corta la fecha YYYY-MM-DD si viene con hora
  const datePart = isoStr.split('T')[0]
  const [y, m, d] = datePart.split('-')
  return `${d}/${m}/${y}`
}

onMounted(() => {
  fetchDiscounts()
})
</script>

<style scoped>
/* Reutilizando estilos base y agregando específicos */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0,0,0,.05);
  margin-bottom: 1.5rem;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}
.title {
  font-weight: 600; font-size: 1rem; color: #111827;
  display: flex; align-items: baseline; gap: .5rem;
}
.title .sub { font-weight: 500; font-size: .8rem; color: #6b7280; }
.actions-bar { display: flex; gap: .5rem; }
.card-body { padding: 1rem 1.25rem; }

/* Chips */
.active-filters { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1rem; align-items: center; }
.active-filters .label { font-size: .8rem; color: #6b7280; margin-right: .25rem; }
.chip {
  background: #eff6ff; border: 1px solid #dbeafe; color: #1e40af;
  border-radius: 999px; padding: .2rem .6rem; font-size: .75rem; cursor: pointer;
  transition: all 0.2s;
}
.chip:hover { background: #dbeafe; }
.chip .x { margin-left: .35rem; opacity: 0.6; }
.chip.clear-all { background: #fff; border-color: #e5e7eb; color: #6b7280; }

/* Table */
.table-responsive { min-height: 250px; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead th {
  background-color: #f9fafb; text-align: left; font-weight: 600;
  padding: .75rem; border-bottom: 1px solid #e5e7eb; color: #4b5563;
  text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em;
}
.table td { padding: .75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }

/* Badges y Textos */
.badge { display: inline-block; padding: .25rem .5rem; font-size: .7rem; border-radius: .375rem; font-weight: 600; }
.badge-success { background: #dcfce7; color: #166534; }
.badge-danger { background: #fee2e2; color: #991b1b; }

.badge-value { background: #f3f4f6; border: 1px solid #e5e7eb; color: #111827; font-family: 'Consolas', monospace; font-size: 0.8rem; }

.badge-global { background: #f0f9ff; color: #0369a1; border: 1px solid #e0f2fe; }
.badge-specific { background: #fdf4ff; color: #a21caf; border: 1px solid #fae8ff; }

.mono { font-family: ui-monospace, SFMono-Regular, monospace; }
.tiny-text { font-size: 0.7rem; }
.minW { min-width: 140px; }

/* Botones */
.btn { border-radius: .375rem; padding: .5rem .75rem; font-size: .85rem; font-weight: 500; transition: .2s; }
.btn-primary { background: #2563eb; border: 1px solid #2563eb; color: #fff; }
.btn-outline { background: #fff; border: 1px solid #d1d5db; color: #374151; }
.btn-link { background: none; border: none; }

/* Pagination */
.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; font-size: 0.85rem; color: #6b7280; }
.page-size select { border: 1px solid #d1d5db; border-radius: 4px; padding: 2px 5px; margin: 0 5px; }

/* Modal Tweaks */
.filter-modal-content label { font-size: 0.85rem; }
.btn-group .btn-outline-secondary { border-color: #d1d5db; color: #4b5563; }
.btn-group .btn-check:checked + .btn-outline-secondary { background-color: #f3f4f6; color: #111827; border-color: #9ca3af; font-weight: 600; }

.empty-state { text-align: center; color: #9ca3af; font-style: italic; }
</style>