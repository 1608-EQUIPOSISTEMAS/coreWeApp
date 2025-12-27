<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        <span class="sub">Listado</span>
        <SearchSelect
          v-model="selectedType"
          :items="typeList"
          label-field="label"
          value-field="alias"
          placeholder="TIPO…"
          @update:modelValue="applyFilters"
        />
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

      <div v-if="selectedType === 'programs'" class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Nombre del programa</th>
              <th>Categoría</th>
              <th>Modalidad</th>
              <th>Registro</th>
              <th>Última modif.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in programs" :key="p.program_id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editProgram(p)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>
              <td>
                <span class="badge" :class="p.active === 'Y' ? 'badge-success' : 'badge-danger'">
                  {{ p.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="minW">
                <span class="badge badge-neutral">{{ p.cat_type_program_label || '—' }}</span>
              </td>
              <td class="minW">
                <div class="name">{{ p.program_name || '—' }}</div>
              </td>
              <td class="minW">
                <div class="name">{{ p.cat_category_label || '—' }}</div>
              </td>
              <td class="minW">
                <div class="name">{{ p.cat_model_modality_label || '—' }}</div>
              </td>
              <td class="minW"><div>{{ formatDate(p.registration_date) }}</div></td>
              <td class="minW"><div>{{ formatDate(p.modification_date) }}</div></td>
            </tr>

            <tr v-if="!programs.length">
              <td colspan="8" class="empty-state">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selectedType === 'versions'" class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Versión</th>
              <th>Abreviatura</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>Modalidad</th>
              <th>Sesiones</th>
              <th>Esquema</th>
              <th>Cat. Curso</th>
              <th>Estado</th>
              <th>Registro</th>
              <th>Última modif.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in programs" :key="v.id">
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editProgram({ program_id: v.program_id })">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>
              <td class="minW"><div class="name">{{ v.description || '—' }}</div></td>
              <td class="minW">
                <div class="name">{{ v.abbreviation || '—' }}</div>
                <div class="muted small">{{ v.version_code}}</div>
              </td>
              <td class="minW"><div class="name">{{ v.cat_category_label || '—' }}</div></td>
              <td class="minW"><div class="name">{{ v.cat_type_program_label || '—' }}</div></td>
              <td class="minW"><div class="name">{{ v.cat_model_modality_label || '—' }}</div></td>
              <td class="minW"><div class="name">{{ v.sessions || '—' }}</div></td>
              <td class="minW"><div class="name">{{ v.skem_clasification || '—' }}</div></td>
              <td class="minW"><div class="name">{{ v.cat_course_category_label || '—' }}</div></td>
              <td>
                <span class="badge" :class="v.active === 'Y' ? 'badge-success' : 'badge-danger'">
                  {{ v.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="minW"><div>{{ formatDate(v.registration_date) }}</div></td>
              <td class="minW"><div>{{ formatDate(v.modification_date) }}</div></td>
            </tr>

            <tr v-if="!programs.length">
              <td colspan="12" class="empty-state">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de programas" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label">Estado</label>
          <SearchSelect
            v-model="filters.estado"
            :items="filtroEstado"
            label-field="description"
            value-field="value"
            placeholder="ESTADO…"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Tipo de programa</label>
          <SearchSelect
            v-model="filters.cat_type_program"
            :items="filtroTipos"
            label-field="description"
            value-field="id"
            placeholder="TIPO…"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Categoría</label>
          <SearchSelect
            v-model="filters.cat_category"
            :items="filtroCategorias"
            label-field="description"
            value-field="id"
            placeholder="CATEGORÍA…"
          />
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Modalidad</label>
          <SearchSelect
            v-model="filters.cat_model_modality"
            :items="filtroModalidades"
            label-field="description"
            value-field="id"
            placeholder="MODALIDAD…"
          />
        </div>

        <div class="col-12">
          <label class="form-label">Búsqueda (q)</label>
          <div class="input-group">
            <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Buscar por nombre…"
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
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn btn-primary btn-sm" @click="applyFilters">Aplicar filtros</button>
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
/* Solo estilos estructurales de la tarjeta y la tabla */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); margin-bottom: 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
.title { font-weight: 600; font-size: 1rem; color: #111827; display: flex; align-items: baseline; gap: .5rem; }
.title .sub { font-weight: 500; font-size: .8rem; color: #6b7280; }
.card-body { padding: 1rem 1.25rem; }

/* Table */
.table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead th { position: sticky; top: 0; background-color: #f9fafb; text-align: left; font-weight: 600; white-space: nowrap; padding: .6rem .75rem; border-bottom: 1px solid #e5e7eb; }
.table td { padding: .6rem .75rem; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
.table.dense td, .table.dense thead th { padding: .35rem .5rem; }
.nowrap { white-space: nowrap; }
.ta-right { text-align: right; }
.minW { min-width: 140px; }
.empty-state { text-align: center; padding: 1rem; color: #6b7280; font-style: italic; }

.name { font-weight: 600; color: #111827; }
.muted { color: #6b7280; }

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

/* Inputs generales */
.form-label { font-size: .85rem; color: #374151; margin-bottom: .35rem; }
.form-control { border: 1px solid #d1d5db; border-radius: .375rem; padding: .5rem .75rem; font-size: .8rem; }
.input-group-text { background: #f9fafb; border-color: #e5e7eb; }
</style>