<template>
  <div class="card leads-card">
    <!-- HEADER -->
    <div class="card-header">
      <div class="title">
        Instructores
        <span class="sub">Listado</span>
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

    <!-- BODY -->
    <div class="card-body">
      <!-- Chips de filtros activos -->
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

      <!-- Tabla -->
      <div class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Estado instructor</th>
              <th>Estado persona</th>
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
              <!-- Acciones -->
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editInstructor(i)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <!-- Estado instructor -->
              <td>
                <span
                  class="badge"
                  :class="i.instructor_active === 'Y' ? 'badge-success' : 'badge-danger'"
                >
                  {{ i.instructor_active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <!-- Estado persona -->
              <td>
                <span
                  class="badge"
                  :class="i.person_active === 'Y' ? 'badge-success' : 'badge-danger'"
                >
                  {{ i.person_active === 'Y' ? 'Activa' : 'Inactiva' }}
                </span>
              </td>

              <!-- Nombre -->
              <td class="minW">
                <div class="name">
                  {{ buildFullName(i) }}
                </div>
              </td>

              <!-- Documento -->
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

              <!-- Ocupación -->
              <td class="minW">
                <div class="name">{{ i.cat_occupation_label || '—' }}</div>
              </td>

              <!-- País -->
              <td class="minW">
                <div class="name">{{ i.cat_country_label || '—' }}</div>
              </td>

              <!-- Registro -->
              <td class="minW">
                <div>{{ formatDate(i.registration_date) }}</div>
              </td>

              <!-- Modificación -->
              <td class="minW">
                <div>{{ formatDate(i.modification_date) }}</div>
              </td>
            </tr>

            <tr v-if="!instructors.length">
              <td colspan="9" class="empty-state">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER: paginación -->
      <div class="pagination-bar">
        <div class="page-size">
          <label>Tamaño</label>
          <select v-model.number="pagin.size" @change="resetToFirstPage">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="300">300</option>
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

  <!-- MODAL FILTROS -->
  <BaseModal v-model="showFilterModal" title="Filtros de instructores" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <label class="form-label">Estado instructor</label>
          <SearchSelect
            v-model="filters.estado_instructor"
            :items="filtroEstadoInstructor"
            label-field="description"
            value-field="value"
            placeholder="ESTADO…"
          />
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label">Ocupación</label>
          <SearchSelect
            v-model="filters.cat_occupation"
            :items="filtroOcupaciones"
            label-field="description"
            value-field="id"
            placeholder="OCUPACIÓN…"
          />
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label">Estado de persona</label>
          <SearchSelect
            v-model="filters.cat_person_status"
            :items="filtroEstadosPersona"
            label-field="description"
            value-field="id"
            placeholder="ESTADO PERSONA…"
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
              placeholder="Buscar por nombre o documento…"
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
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')

// === estado UI
const showFilterModal = ref(false)
const dense = ref(false)
function openFilterModal () { showFilterModal.value = true }

// === tabla + paginación
const instructors = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const totalPages = computed(() =>
  Math.max(1, Math.ceil((pagin.value.total || 0) / pagin.value.size))
)
function resetToFirstPage () {
  pagin.value.page = 1
  fetchInstructors()
}
function nextPage () {
  if (pagin.value.page < totalPages.value) {
    pagin.value.page++
    fetchInstructors()
  }
}
function prevPage () {
  if (pagin.value.page > 1) {
    pagin.value.page--
    fetchInstructors()
  }
}

// === filtros (mapeo a sp_instructor_list)
const filters = reactive({
  estado_instructor: null, // -> active (instructor.active)
  cat_occupation: null,    // -> cat_occupation
  cat_person_status: null, // -> cat_person_status
  q: ''                    // -> q
})

// combos desde catálogo (ajusta keys a tus catálogos reales)
const filtroEstadoInstructor = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]

const filtroOcupaciones = ref(catalog.options('occupation') || [])
const filtroEstadosPersona = ref(catalog.options('person_status') || [])

// chips
const activeFilterChips = ref([])

function rebuildChips () {
  const chips = []

  if (filters.estado_instructor !== null) {
    chips.push({
      key: 'estado_instructor',
      text: `Instructor: ${filters.estado_instructor ? 'Activo' : 'Inactivo'}`
    })
  }
  if (filters.cat_occupation) {
    const it = filtroOcupaciones.value.find(i => i.id === filters.cat_occupation)
    chips.push({
      key: 'cat_occupation',
      text: `Ocupación: ${it?.description || filters.cat_occupation}`
    })
  }
  if (filters.cat_person_status) {
    const it = filtroEstadosPersona.value.find(i => i.id === filters.cat_person_status)
    chips.push({
      key: 'cat_person_status',
      text: `Estado persona: ${it?.description || filters.cat_person_status}`
    })
  }
  if (filters.q) {
    chips.push({ key: 'q', text: `q: ${filters.q}` })
  }

  activeFilterChips.value = chips
}

function clearFilter (key) {
  if (key === 'estado_instructor') {
    filters.estado_instructor = null
  } else if (key === 'cat_occupation') {
    filters.cat_occupation = null
  } else if (key === 'cat_person_status') {
    filters.cat_person_status = null
  } else if (key === 'q') {
    filters.q = ''
  }
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
  rebuildChips()
  fetchInstructors()
}

function applyFilters () {
  showFilterModal.value = false
  pagin.value.page = 1
  rebuildChips()
  fetchInstructors()
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
  } catch {
    return '—'
  }
}

function buildFullName (i) {
  const parts = [i.first_name, i.last_name, i.mother_last_name]
    .filter(Boolean)
  return parts.length ? parts.join(' ') : '—'
}

// === acciones
function goNew () {
  router.push({ name: 'InstructorNew' }) // ajusta al nombre concreto de tu ruta
}

function editInstructor (i) {
  router.push({ name: 'InstructorEdit', params: { id: i.instructor_id } })
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
    pagin.value.page = Number(page || pagin.value.page)
    pagin.value.size = Number(size || pagin.value.size)
  } catch (err) {
    console.error('Error cargando instructores:', err)
    instructors.value = []
    pagin.value.total = 0
  }
}

onMounted(() => {
  rebuildChips()
  fetchInstructors()
})
</script>

<style scoped>
/* ---------- Card ---------- */
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
  font-weight: 600;
  font-size: 1rem;
  color: #111827;
  display: flex;
  align-items: baseline;
  gap: .5rem;
}
.title .sub {
  font-weight: 500;
  font-size: .8rem;
  color: #6b7280;
}
.actions-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}
.card-body { padding: 1rem 1.25rem; }

/* ---------- Active filter chips ---------- */
.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  margin-bottom: .75rem;
  align-items: center;
}
.active-filters .label {
  font-size: .8rem; color: #6b7280; margin-right: .25rem;
}
.chip {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  border-radius: 999px;
  padding: .2rem .6rem;
  font-size: .75rem;
  cursor: pointer;
}
.chip .x { margin-left: .35rem; color: #6b7280; }
.chip.clear-all { background: #fff; }

/* ---------- Table ---------- */
.table-responsive { width: 100%; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead th {
  position: sticky; top: 0;
  background-color: #f9fafb;
  text-align: left; font-weight: 600; white-space: nowrap;
  padding: .6rem .75rem;
  border-bottom: 1px solid #e5e7eb;
  cursor: default;
}
.table td {
  padding: .6rem .75rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}
.table.dense td, .table.dense thead th { padding: .35rem .5rem; }

.nowrap { white-space: nowrap; }
.ta-right { text-align: right; }
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
               "Liberation Mono", monospace;
}

.empty-state {
  text-align: center; padding: 1rem; color: #6b7280; font-style: italic;
}

.name { font-weight: 600; color: #111827; }
.muted { color: #6b7280; }

/* Badges */
.badge {
  display: inline-block;
  padding: .2rem .45rem;
  font-size: .72rem;
  border-radius: .5rem;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge-neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
.badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.badge-danger  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

/* ---------- Buttons ---------- */
.btn {
  display: inline-block;
  font-size: .8rem;
  line-height: 1rem;
  font-weight: 500;
  border-radius: .375rem;
  padding: .5rem .75rem;
  border: 1px solid #d1d5db;
  background-color: #fff;
  cursor: pointer;
  color: #374151;
}
.btn[disabled] { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: .25rem .5rem; font-size: .75rem; line-height: .875rem; }
.btn-primary { background-color: #2563eb; border-color: #2563eb; color: #fff; }
.btn-outline { background-color: #fff; border-color: #d1d5db; color: #374151; }

/* ---------- Pagination ---------- */
.pagination-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: .75rem; padding-top: 1rem; font-size: .8rem; flex-wrap: wrap;
}
.page-size { display: inline-flex; align-items: center; gap: .4rem; }
.page-size select {
  border: 1px solid #d1d5db; border-radius: .375rem;
  padding: .25rem .4rem; background: #fff;
}
.pager { display: inline-flex; align-items: center; gap: .5rem; }

.minW { min-width: 160px; }

/* Modal inputs */
.form-label {
  font-size: .85rem;
  color: #374151;
  margin-bottom: .35rem;
}
.input-group-text {
  background: #f9fafb;
  border-color: #e5e7eb;
}
.form-control {
  border-color: #e5e7eb;
}
</style>
