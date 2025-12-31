<template>
  <div class="card programs-card">
    <div class="card-header">
      <div class="title">
        <span>Gestión Académica</span>
        <div class="type-selector-wrapper">
          <span class="sub me-2">Listado de</span>
          <SearchSelect
            v-model="selectedType"
            :items="typeList"
            label-field="label"
            value-field="alias"
            placeholder="TIPO…"
            @update:modelValue="applyFilters"
          />
        </div>
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

      <div v-if="selectedType === 'programs'" class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th class="ta-center">Acciones</th>
              <th>Estado</th>
              <th>Tipo / Categoría</th>
              <th>Nombre del Programa</th>
              <th>Modalidad</th>
              <th>Registro</th>
              <th>Última modif.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in programs" :key="p.program_id">
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm" @click="editProgram(p)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>
              <td>
                <span class="badge" :class="p.active === 'Y' ? 'badge-success' : 'badge-danger'">
                  {{ p.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="badge badge-neutral mb-1">{{ p.cat_type_program_label || '—' }}</div>
                <div class="muted small">{{ p.cat_category_label || '—' }}</div>
              </td>
              <td>
                <div class="name">{{ p.program_name || '—' }}</div>
              </td>
              <td>
                <div class="small fw-600">{{ p.cat_model_modality_label || '—' }}</div>
              </td>
              <td><div class="small muted">{{ formatDate(p.registration_date) }}</div></td>
              <td><div class="small muted">{{ formatDate(p.modification_date) }}</div></td>
            </tr>
            <tr v-if="!programs.length">
              <td colspan="7" class="empty-state">No se encontraron programas.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selectedType === 'versions'" class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th class="ta-center">Acciones</th>
              <th>Versión / Código</th>
              <th>Categoría / Tipo</th>
              <th class="ta-center">Sesiones</th>
              <th>Esquema</th>
              <th>Cat. Curso</th>
              <th>Estado</th>
              <th>Modificación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in programs" :key="v.id">
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm" @click="editProgram({ program_id: v.program_id })">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>
              <td>
                <div class="small">{{ v.abbreviation }}</div>
                <div class="font-mono x-small text-primary mt-1">{{ v.version_code }}</div>
              </td>
              <td>
                <div class="small fw-600">{{ v.cat_category_label || '—' }}</div>
                <div class="muted x-small">{{ v.cat_type_program_label || '—' }}</div>
              </td>
              <td class="ta-center">
                <span class="badge badge-neutral">{{ v.sessions || '0' }}</span>
              </td>
              <td><div class="small">{{ v.skem_clasification || '—' }}</div></td>
              <td><div class="small">{{ v.cat_course_category_label || '—' }}</div></td>
              <td>
                <span class="badge" :class="v.active === 'Y' ? 'badge-success' : 'badge-danger'">
                  {{ v.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="small muted">{{ formatDate(v.modification_date) }}</div>
              </td>
            </tr>
            <tr v-if="!programs.length">
              <td colspan="8" class="empty-state">No se encontraron versiones.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de Búsqueda" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Estado</label>
          <SearchSelect v-model="filters.estado" :items="filtroEstado" label-field="description" value-field="value" placeholder="Todos..." />
        </div>
        <div class="col-md-6">
          <label class="form-label">Tipo de Programa</label>
          <SearchSelect v-model="filters.cat_type_program" :items="filtroTipos" label-field="description" value-field="id" placeholder="Seleccionar..." />
        </div>
        <div class="col-md-6">
          <label class="form-label">Categoría</label>
          <SearchSelect v-model="filters.cat_category" :items="filtroCategorias" label-field="description" value-field="id" placeholder="Seleccionar..." />
        </div>
        <div class="col-md-6">
          <label class="form-label">Modalidad</label>
          <SearchSelect v-model="filters.cat_model_modality" :items="filtroModalidades" label-field="description" value-field="id" placeholder="Seleccionar..." />
        </div>
        <div class="col-12">
          <label class="form-label">Búsqueda (q)</label>
          <input v-model.trim="filters.q" type="text" class="form-control" placeholder="Buscar por nombre o descripción..." @keyup.enter="applyFilters" />
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

// === NUEVOS COMPONENTES ===
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'

const router = useRouter()
const programService = inject(ServiceKeys.Program)
const catalog = inject('catalog')

const typeList = [
  { label: "PROGRAMAS", alias: "programs" },
  { label: "VERSIONES", alias: "versions" }
]

// === Estado UI ===
const showFilterModal = ref(false)
const dense = ref(false)
function openFilterModal () { showFilterModal.value = true }

// === Datos ===
const programs = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const selectedType = ref('versions') // Valor por defecto

// === Filtros ===
const filters = reactive({
  estado: null,           
  cat_type_program: null, 
  cat_category: null,     
  cat_model_modality: null,
  q: ''                   
})

// === Catálogos ===
const filtroEstado = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]
const filtroTipos = ref(catalog.options('we_program_type') || [])
const filtroCategorias = ref(catalog.options('we_program_category') || [])
const filtroModalidades = ref(catalog.options('we_modality') || [])
const activeFilterChips = ref([])

// =================================================================
// 1. LÓGICA DE PERSISTENCIA
// =================================================================
// Pasamos 'selectedType' como 4to argumento para que recuerde si estabas viendo programas o versiones
const { saveState } = useTablePersistence('crm_programs_filter_state_v1', filters, pagin, selectedType)

// =================================================================
// 2. ACCIONES Y EVENTOS
// =================================================================

function handlePaginationChange() {
  saveState()
  fetchPrograms()
}

function applyFilters() {
  if(!selectedType.value) return
  showFilterModal.value = false
  pagin.value.page = 1
  saveState()
  rebuildChips()
  fetchPrograms()
}

function clearFilter(key) {
  if (key === 'estado') filters.estado = null
  else if (key === 'cat_type_program') filters.cat_type_program = null
  else if (key === 'cat_category') filters.cat_category = null
  else if (key === 'cat_model_modality') filters.cat_model_modality = null
  else if (key === 'q') filters.q = ''
  
  applyFilters()
}

function clearFilters() {
  // 1. Limpiar estado reactivo
  Object.assign(filters, {
    estado: null,
    cat_type_program: null,
    cat_category: null,
    cat_model_modality: null,
    q: ''
  })
  pagin.value.page = 1
  
  // 2. Limpiar Storage
  localStorage.removeItem('crm_programs_filter_state_v1')
  
  // 3. Recargar
  rebuildChips()
  fetchPrograms()
}

function rebuildChips() {
  const chips = []
  if (filters.estado !== null) {
    chips.push({ key: 'estado', text: `Estado: ${filters.estado ? 'Activo' : 'Inactivo'}` })
  }
  if (filters.cat_type_program) {
    const it = filtroTipos.value.find(i => i.id === filters.cat_type_program)
    chips.push({ key: 'cat_type_program', text: `Tipo: ${it?.description || filters.cat_type_program}` })
  }
  if (filters.cat_category) {
    const it = filtroCategorias.value.find(i => i.id === filters.cat_category)
    chips.push({ key: 'cat_category', text: `Categoría: ${it?.description || filters.cat_category}` })
  }
  if (filters.cat_model_modality) {
    const it = filtroModalidades.value.find(i => i.id === filters.cat_model_modality)
    chips.push({ key: 'cat_model_modality', text: `Modalidad: ${it?.description || filters.cat_model_modality}` })
  }
  if (filters.q) {
    chips.push({ key: 'q', text: `q: ${filters.q}` })
  }
  activeFilterChips.value = chips
}

// === API ===
async function fetchPrograms() {
  try {
    const payload = {
      active: filters.estado,
      cat_type_program: filters.cat_type_program || null,
      cat_category: filters.cat_category || null,
      cat_model_modality: filters.cat_model_modality || null,
      q: filters.q || null,
      page: pagin.value.page,
      size: pagin.value.size
    }

    let result
    if (selectedType.value === 'programs') {
      result = await programService.programList(payload)
    } else {
      result = await programService.programVersionList(payload)
    }

    const { items, total, page, size } = result
    programs.value = items || []
    pagin.value.total = Number(total || 0)
    // Actualizamos page/size por seguridad si el back los devuelve corregidos
    if(page) pagin.value.page = Number(page)
    if(size) pagin.value.size = Number(size)

  } catch (err) {
    console.error('Error cargando programas:', err)
    programs.value = []
    pagin.value.total = 0
  }
}

// === Helpers visuales ===
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

function goNew() {
  router.push({ name: 'ProgramNew' }) 
}
function editProgram(p) {
  router.push({ name: 'ProgramEdit', params: { id: p.program_id || p.id } })
}

// === Lifecycle ===
onMounted(() => {
  // useTablePersistence carga el estado automáticamente al inicio
  rebuildChips()
  fetchPrograms()
})
</script>
<style scoped>
/* Contenedor Principal (Estilo FICO) */
.programs-card { 
  background: #fff; 
  border: 1px solid #e5e7eb; 
  border-radius: 0.6rem; 
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #6366f1; /* Color Indigo para Académico */
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

.type-selector-wrapper { display: flex; align-items: center; margin-top: 5px; }

.card-body { padding: 1.25rem; }

/* Tabla Unificada */
.table-responsive { width: 100%; overflow-x: auto; }
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
.font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-weight: 600; }
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