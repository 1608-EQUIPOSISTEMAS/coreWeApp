<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        Instructores
        <span class="sub">Listado</span>
      </div>

      <div class="actions-bar">
        <button class="btn btn-primary" @click="goNew">
          + Nuevo
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
      
      <br>

      <div class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Estado instructor</th>
              <th>Nombre completo</th>
              <th>Documento</th>
              <th>Ocupación</th>
              <th>País</th>
              <th>Registro</th>
              <th>Última modif.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in instructors" :key="i.instructor_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editInstructor(i)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <td>
                <span
                  class="badge"
                  :class="i.instructor_active === 'Y' ? 'badge-success' : 'badge-danger'"
                >
                  {{ i.instructor_active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td class="minW">
                <div class="name">
                  {{ buildFullName(i) }}
                </div>
              </td>

              <td class="minW">
                <div class="mono">
                  <span class="badge badge-neutral" v-if="i.cat_type_document_label">
                    {{ i.cat_type_document_label }}
                  </span>
                  <span v-if="i.document_number">
                    &nbsp;{{ i.document_number }}
                  </span>
                  <span v-else>—</span>
                </div>
              </td>

              <td class="minW">
                <div class="name">{{ i.cat_occupation_label || '—' }}</div>
              </td>

              <td class="minW">
                <div class="name">{{ i.cat_country_label || '—' }}</div>
              </td>

              <td class="minW">
                <div>{{ formatDate(i.registration_date) }}</div>
              </td>

              <td class="minW">
                <div>{{ formatDate(i.modification_date) }}</div>
              </td>
            </tr>

            <tr v-if="!instructors.length">
              <td colspan="8" class="empty-state">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de instructores" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Estado instructor</label>
          <SearchSelect
            v-model="filters.estado_instructor"
            :items="filtroEstadoInstructor"
            label-field="description"
            value-field="value"
            placeholder="ESTADO…"
          />
        </div>

        <div class="col-md-8">
          <label class="form-label">Búsqueda (q)</label>
          <div class="input-group">
            <span class="input-group-text">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Buscar por nombre o documento…"
              @keyup.enter="applyFilters"
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
import { ref, reactive, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

// === NUEVAS IMPORTACIONES ===
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'

const router = useRouter()
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')

// === estado UI
const showFilterModal = ref(false)
const dense = ref(false)
function openFilterModal () { showFilterModal.value = true }

// === tabla + paginación
const instructors = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })

// === filtros (mapeo a sp_instructor_list)
const filters = reactive({
  estado_instructor: null, // -> active
  cat_occupation: null,    // -> cat_occupation
  cat_person_status: null, // -> cat_person_status
  q: ''                    // -> q
})

// === Catálogos ===
const filtroEstadoInstructor = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]
// const filtroOcupaciones = ref(catalog.options('occupation') || [])
// const filtroEstadosPersona = ref(catalog.options('person_status') || [])
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

function applyFilters () {
  showFilterModal.value = false
  pagin.value.page = 1
  saveState()
  rebuildChips()
  fetchInstructors()
}

function clearFilter (key) {
  if (key === 'estado_instructor') filters.estado_instructor = null
  else if (key === 'cat_occupation') filters.cat_occupation = null
  else if (key === 'cat_person_status') filters.cat_person_status = null
  else if (key === 'q') filters.q = ''
  
  applyFilters()
}

function clearFilters () {
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

function rebuildChips () {
  const chips = []
  if (filters.estado_instructor !== null) {
    chips.push({ key: 'estado_instructor', text: `Instructor: ${filters.estado_instructor ? 'Activo' : 'Inactivo'}` })
  }
  // (Opcional si usas los filtros de ocupación/estado persona)
  /*
  if (filters.cat_occupation) {
    const it = filtroOcupaciones.value.find(i => i.id === filters.cat_occupation)
    chips.push({ key: 'cat_occupation', text: `Ocupación: ${it?.description || filters.cat_occupation}` })
  }
  if (filters.cat_person_status) {
    const it = filtroEstadosPersona.value.find(i => i.id === filters.cat_person_status)
    chips.push({ key: 'cat_person_status', text: `Estado persona: ${it?.description || filters.cat_person_status}` })
  }
  */
  if (filters.q) {
    chips.push({ key: 'q', text: `q: ${filters.q}` })
  }
  activeFilterChips.value = chips
}


// === carga al backend
async function fetchInstructors () {
  try {
    const payload = {
      active: filters.estado_instructor,            // true | false | null
      cat_occupation: filters.cat_occupation || null,
      cat_person_status: filters.cat_person_status || null,
      q: filters.q || null,
      page: pagin.value.page,
      size: pagin.value.size
    }

    const { items, total, page, size } =
      await instructorService.instructorList(payload)

    instructors.value = items || []
    pagin.value.total = Number(total || 0)
    // Asegurar sincronización si el backend corrige la página
    if(page) pagin.value.page = Number(page)
    if(size) pagin.value.size = Number(size)

  } catch (err) {
    console.error('Error cargando instructores:', err)
    instructors.value = []
    pagin.value.total = 0
  }
}

// === helpers ===
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

function buildFullName (i) {
  const parts = [i.first_name, i.last_name, i.mother_last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

// === acciones de navegación ===
function goNew () {
  router.push({ name: 'InstructorNew' }) 
}

function editInstructor (i) {
  router.push({ name: 'InstructorEdit', params: { id: i.instructor_id } })
}

// === Lifecycle ===
onMounted(() => {
  rebuildChips()
  fetchInstructors()
})
</script>

<style scoped>
/* Solo estilos estructurales esenciales */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); margin-bottom: 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
.title { font-weight: 600; font-size: 1rem; color: #111827; display: flex; align-items: baseline; gap: .5rem; }
.title .sub { font-weight: 500; font-size: .8rem; color: #6b7280; }
.actions-bar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.card-body { padding: 1rem 1.25rem; }

/* Table */
.table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead th { position: sticky; top: 0; background-color: #f9fafb; text-align: left; font-weight: 600; white-space: nowrap; padding: .6rem .75rem; border-bottom: 1px solid #e5e7eb; }
.table td { padding: .6rem .75rem; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
.table.dense td, .table.dense thead th { padding: .35rem .5rem; }
.nowrap { white-space: nowrap; }
.ta-right { text-align: right; }
.minW { min-width: 160px; }
.empty-state { text-align: center; padding: 1rem; color: #6b7280; font-style: italic; }

.name { font-weight: 600; color: #111827; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

/* Badges */
.badge { display: inline-block; padding: .2rem .45rem; font-size: .72rem; border-radius: .5rem; border: 1px solid transparent; white-space: nowrap; }
.badge-neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
.badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.badge-danger { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

/* Buttons */
.btn { display: inline-block; font-size: .8rem; font-weight: 500; border-radius: .375rem; padding: .5rem .75rem; border: 1px solid #d1d5db; background-color: #fff; cursor: pointer; color: #374151; }
.btn-sm { padding: .25rem .5rem; font-size: .75rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }

/* Modal Inputs */
.form-label { font-size: .85rem; color: #374151; margin-bottom: .35rem; }
.input-group-text { background: #f9fafb; border-color: #e5e7eb; }
.form-control { border-color: #e5e7eb; border-radius: .375rem; padding: .5rem .75rem; font-size: .8rem; }
</style>