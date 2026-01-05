<template>
  <div class="card instructors-card">
    <div class="card-header">
      <div class="title">
        <span>Instructores</span>
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
              <th>Instructor / Documento</th>
              <th>Ocupación / País</th>
              <th>Registro</th>
              <th>Última modif.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in instructors" :key="i.instructor_id">
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm" @click="editInstructor(i)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <td>
                <span class="badge" :class="i.instructor_active === 'Y' ? 'badge-success' : 'badge-danger'">
                  {{ i.instructor_active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td>
                <div class="name">{{ buildFullName(i) }}</div>
                <div class="font-mono x-small text-primary mt-1">
                  <span v-if="i.cat_type_document_label">{{ i.cat_type_document_label }}:</span>
                  {{ i.document_number || 'S/N' }}
                </div>
              </td>

              <td>
                <div class="small fw-600">{{ i.cat_occupation_label || '—' }}</div>
                <div class="muted small">{{ i.cat_country_label || '—' }}</div>
              </td>

              <td><div class="small muted">{{ formatDate(i.registration_date) }}</div></td>
              <td><div class="small muted">{{ formatDate(i.modification_date) }}</div></td>
            </tr>

            <tr v-if="!instructors.length">
              <td colspan="6" class="empty-state">No se encontraron instructores.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de Instructores" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Estado Instructor</label>
          <SearchSelect
            v-model="filters.estado_instructor"
            :items="filtroEstadoInstructor"
            label-field="description"
            value-field="value"
            placeholder="Todos..."
          />
        </div>

        <div class="col-md-8">
          <label class="form-label">Búsqueda (q)</label>
          <input
            v-model.trim="filters.q"
            type="text"
            class="form-control"
            placeholder="Buscar por nombre, documento..."
            @keyup.enter="applyFilters"
          />
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
import { ServiceKeys } from '@/services'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'

const router = useRouter()
const instructorService = inject(ServiceKeys.Instructor)
// const catalog = inject('catalog') // Descomentar si usas catálogos

// === Estado UI ===
const showFilterModal = ref(false)
function openFilterModal() { showFilterModal.value = true }

// === Datos ===
const instructors = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })

// === Filtros ===
const filters = reactive({
  estado_instructor: null,
  cat_occupation: null,
  cat_person_status: null,
  q: ''
})

// === Catálogos Locales ===
const filtroEstadoInstructor = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]
const activeFilterChips = ref([])

// =================================================================
// 1. LÓGICA DE PERSISTENCIA
// =================================================================
const { saveState } = useTablePersistence('crm_instructors_filter_state_v1', filters, pagin)

// =================================================================
// 2. ACCIONES Y EVENTOS
// =================================================================
function handlePaginationChange() {
  saveState()
  fetchInstructors()
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  saveState()
  rebuildChips()
  fetchInstructors()
}

function clearFilter(key) {
  if (key === 'estado_instructor') filters.estado_instructor = null
  else if (key === 'cat_occupation') filters.cat_occupation = null
  else if (key === 'cat_person_status') filters.cat_person_status = null
  else if (key === 'q') filters.q = ''
  
  applyFilters()
}

function clearFilters() {
  Object.assign(filters, {
    estado_instructor: null,
    cat_occupation: null,
    cat_person_status: null,
    q: ''
  })
  pagin.value.page = 1
  localStorage.removeItem('crm_instructors_filter_state_v1')
  rebuildChips()
  fetchInstructors()
}

function rebuildChips() {
  const chips = []
  if (filters.estado_instructor !== null) {
    chips.push({ key: 'estado_instructor', text: `Estado: ${filters.estado_instructor ? 'Activo' : 'Inactivo'}` })
  }
  if (filters.q) {
    chips.push({ key: 'q', text: `q: ${filters.q}` })
  }
  activeFilterChips.value = chips
}

// === API ===
async function fetchInstructors() {
  try {
    const payload = {
      active: filters.estado_instructor,
      cat_occupation: filters.cat_occupation || null,
      cat_person_status: filters.cat_person_status || null,
      q: filters.q || null,
      page: pagin.value.page,
      size: pagin.value.size
    }

    const { items, total, page, size } = await instructorService.instructorList(payload)

    instructors.value = items || []
    pagin.value.total = Number(total || 0)
    if(page) pagin.value.page = Number(page)
    if(size) pagin.value.size = Number(size)

  } catch (err) {
    console.error('Error cargando instructores:', err)
    instructors.value = []
    pagin.value.total = 0
  }
}

// === Helpers Visuales ===
function formatDate(value) {
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

function buildFullName(i) {
  const parts = [i.first_name, i.last_name, i.mother_last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

function goNew() { router.push({ name: 'InstructorNew' }) }
function editInstructor(i) { router.push({ name: 'InstructorEdit', params: { id: i.instructor_id } }) }

// === Lifecycle ===
onMounted(() => {
  rebuildChips()
  fetchInstructors()
})
</script>

<style scoped>
/* Contenedor Principal (Estilo FICO - Igual a Programas) */
.instructors-card { 
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
.font-mono { font-weight: 600;  }
.ta-right { text-align: right; }
.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.fw-600 { font-weight: 600; }

.name { font-weight: 600; color: #1e293b; line-height: 1.2; font-size: 0.9rem; }
.muted { color: #6b7280; }
.small { font-size: 0.75rem; }
.x-small { font-size: 0.68rem; }
.text-primary { color: #4f46e5; }
.text-warning { color: #d97706; }

/* Badges (Estilo FICO) */
.badge { padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 600; display: inline-block; border: 1px solid transparent; }
.badge-neutral { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
.badge-success { background: #ecfdf5; color: #065f46; border-color: #d1fae5; }
.badge-danger { background: #fef2f2; color: #991b1b; border-color: #fee2e2; }

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

/* Filtros y Inputs */
.form-label { font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; display: block; }
.form-control { width: 100%; border: 1px solid #d1d5db; border-radius: 0.4rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
.form-control:focus { outline: none; border-color: #6366f1; ring: 2px rgba(99, 102, 241, 0.2); }

.empty-state { padding: 3rem; text-align: center; color: #9ca3af; font-style: italic; }
</style>