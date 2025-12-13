<!-- src/views/ProgramsList.vue -->
<template>
  <div class="card leads-card">
    <!-- HEADER -->
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
          <span class="muted">{{ minimun }} - {{ maximun }} de {{ pagin.total }} registros</span>
          <button
            class="btn btn-outline btn-sm"
            :disabled="pagin.page === 0 || pagin.page === totalPages"
            @click="nextPage"
          >
            Siguiente ›
          </button>
        </div>
      </div>
      <br>
      <!-- Tabla -->
      <div v-if="selectedType=='programs'" class="table-responsive">
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
              <!-- Acciones -->
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editProgram(p)">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <!-- Estado -->
              <td>
                <span class="badge" :class="p.active === 'Y' ? 'badge-success' : 'badge-danger'">
                  {{ p.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <!-- Tipo -->
              <td class="minW">
                <span class="badge badge-neutral">
                  {{ p.cat_type_program_label || '—' }}
                </span>
              </td>

              <!-- Nombre -->
              <td class="minW">
                <div class="name">{{ p.program_name || '—' }}</div>
              </td>

              <!-- Categoría -->
              <td class="minW">
                <div class="name">{{ p.cat_category_label || '—' }}</div>
              </td>

              <!-- Modalidad -->
              <td class="minW">
                <div class="name">{{ p.cat_model_modality_label || '—' }}</div>
              </td>

              <!-- Registro -->
              <td class="minW">
                <div>{{ formatDate(p.registration_date) }}</div>
              </td>

              <!-- Modificación -->
              <td class="minW">
                <div>{{ formatDate(p.modification_date) }}</div>
              </td>
            </tr>

            <tr v-if="!programs.length">
              <td colspan="8" class="empty-state">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- tabla pero de versiones las propeidades son
       v.program_version_id         AS id,
      v.program_id,
      p.program_name,
      v.version_code,
      v.sessions,
      v.active,
      v.registration_date,
      v.modification_date,
      v.observations,
      v.description,
      v.abbreviation,
      v.skem_clasification,
      p.cat_type_program,
      ct.description AS cat_type_program_label,
      p.cat_category,
      cc.description AS cat_category_label,
      p.cat_model_modality,
      cm.description AS cat_model_modality_label -->
      <div v-if="selectedType=='versions'" class="table-responsive">
        <table class="table" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-right">Acciones</th>
              <th>Versión</th>
              <th>Abreviatura</th>
              <th>Tipo</th>
              <th>Linea</th>
              <th>Modalidad</th>
              <th>Sesiones</th>
              <th>Esquema Clasificación</th>
              <th>Categoría Curso</th>
              <th>Estado</th>
              <th>Registro</th>
              <th>Última modif.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in programs" :key="v.id">
              <!-- Acciones -->
              <td class="ta-right nowrap">
                <button class="btn btn-outline btn-md" @click="editProgram({ program_id: v.program_id })">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
              </td>

              <!-- Programa -->
              <td class="minW">
                <div class="name">{{ v.description || '—' }}</div>
              </td>


              <!-- Abreviatura -->
              <td class="minW">
                <div class="name">{{ v.abbreviation || '—' }}</div>
                <div class="muted small">{{ v.version_code}}</div>
              </td>

              <!-- Sesiones -->
              <td class="minW">
                <div class="name">{{ v.cat_category_label || '—' }}</div>
              </td>

              <!-- Sesiones -->
              <td class="minW">
                <div class="name">{{ v.cat_type_program_label || '—' }}</div>
              </td>

              <!-- Sesiones -->
              <td class="minW">
                <div class="name">{{ v.cat_model_modality_label || '—' }}</div>
              </td>
              
              <!-- Sesiones -->
              <td class="minW">
                <div class="name">{{ v.sessions || '—' }}</div>
              </td>

              <!-- Esquema Clasificación -->
              <td class="minW">
                <div class="name">{{ v.skem_clasification || '—' }}</div>
              </td>

              <!-- Categoría Curso -->
              <td class="minW">
                <div class="name">{{ v.cat_course_category_label || '—' }}</div>
              </td>

              <!-- Estado -->
              <td>
                <span class="badge" :class="v.active === 'Y' ? 'badge-success' : 'badge-danger'">
                  {{ v.active === 'Y' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <!-- Registro -->
              <td class="minW">
                <div>{{ formatDate(v.registration_date) }}</div>
              </td>

              <!-- Modificación -->
              <td class="minW">
                <div>{{ formatDate(v.modification_date) }}</div>
              </td>
            </tr>

            <tr v-if="!programs.length">
              <td colspan="11" class="empty-state">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>

  <!-- MODAL FILTROS -->
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
            <span class="input-group-text">
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              v-model.trim="filters.q"
              type="text"
              class="form-control"
              placeholder="Buscar por nombre…"
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
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

const router = useRouter()
const programService = inject(ServiceKeys.Program)
const catalog = inject('catalog')

const typeList = [
  {
    label: "PROGRAMAS",
    alias: "programs"
  },
  {
    label: "VERSIONES",
    alias: "versions"
  }
]

// === estado UI
const showFilterModal = ref(false)
const dense = ref(false)
function openFilterModal () { showFilterModal.value = true }

// === tabla + paginación
const programs = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const totalPages = computed(() =>
  Math.max(1, Math.ceil((pagin.value.total || 0) / pagin.value.size))
)

const maximun = computed(() =>{
  const num = (pagin.value.size * pagin.value.page)
  return (num>pagin.value.total)?pagin.value.total:num 
})


const minimun = computed(() =>
  (pagin.value.size * pagin.value.page)-pagin.value.size +1
)

function resetToFirstPage () {
  pagin.value.page = 1
  saveState()
  fetchPrograms()
}
function nextPage () {
  if (pagin.value.page < totalPages.value) {
    pagin.value.page++
    saveState()
    fetchPrograms()
  }
}
function prevPage () {
  if (pagin.value.page > 1) {
    pagin.value.page--
    saveState()
    fetchPrograms()
  }
}

// === filtros (mapeo a sp_program_list)
const filters = reactive({
  estado: null,              // -> active: true/false/null (service lo mapea)
  cat_type_program: null,    // -> cat_type_program
  cat_category: null,        // -> cat_category
  cat_model_modality: null,  // -> cat_model_modality
  q: ''                      // -> q
})

// combos desde catálogo
const filtroEstado = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]

const filtroTipos = ref(catalog.options('we_program_type') || [])
const filtroCategorias = ref(catalog.options('we_program_category') || [])
const filtroModalidades = ref(catalog.options('we_modality') || [])

// chips
const activeFilterChips = ref([])

function rebuildChips () {
  const chips = []

  if (filters.estado !== null) {
    chips.push({
      key: 'estado',
      text: `Estado: ${filters.estado ? 'Activo' : 'Inactivo'}`
    })
  }
  if (filters.cat_type_program) {
    const it = filtroTipos.value.find(i => i.id === filters.cat_type_program)
    chips.push({
      key: 'cat_type_program',
      text: `Tipo: ${it?.description || filters.cat_type_program}`
    })
  }
  if (filters.cat_category) {
    const it = filtroCategorias.value.find(i => i.id === filters.cat_category)
    chips.push({
      key: 'cat_category',
      text: `Categoría: ${it?.description || filters.cat_category}`
    })
  }
  if (filters.cat_model_modality) {
    const it = filtroModalidades.value.find(i => i.id === filters.cat_model_modality)
    chips.push({
      key: 'cat_model_modality',
      text: `Modalidad: ${it?.description || filters.cat_model_modality}`
    })
  }
  if (filters.q) {
    chips.push({ key: 'q', text: `q: ${filters.q}` })
  }

  activeFilterChips.value = chips
}

function clearFilter (key) {
  if (key === 'estado') {
    filters.estado = null
  } else if (key === 'cat_type_program') {
    filters.cat_type_program = null
  } else if (key === 'cat_category') {
    filters.cat_category = null
  } else if (key === 'cat_model_modality') {
    filters.cat_model_modality = null
  } else if (key === 'q') {
    filters.q = ''
  }
  applyFilters()
}

function clearFilters () {
  Object.assign(filters, {
    estado: null,
    cat_type_program: null,
    cat_category: null,
    cat_model_modality: null,
    q: ''
  })
  pagin.value.page = 1
  localStorage.removeItem(STORAGE_KEY)
  rebuildChips()
  fetchPrograms()
}

function applyFilters () {
  if(!selectedType.value)return
  showFilterModal.value = false
  pagin.value.page = 1
  saveState()
  rebuildChips()
  fetchPrograms()
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

// === acciones
function goNew () {
  router.push({ name: 'ProgramNew' }) // ajusta al nombre concreto de tu ruta
}

function editProgram (p) {
  router.push({ name: 'ProgramEdit', params: { id: p.program_id } })
}

// === carga al backend
async function fetchPrograms () {
  try {

    if(selectedType.value=='programs'){
      const payload = {
        active: filters.estado,                      // true | false | null
        cat_type_program: filters.cat_type_program || null,
        cat_category: filters.cat_category || null,
        cat_model_modality: filters.cat_model_modality || null,
        q: filters.q || null,
        page: pagin.value.page,
        size: pagin.value.size
      }

      const { items, total, page, size } = await programService.programList(payload)

      programs.value = items || []
      pagin.value.total = Number(total || 0)
      pagin.value.page = Number(page || pagin.value.page)
      pagin.value.size = Number(size || pagin.value.size)
    }else{

      const payload = {
        active: filters.estado,                      // true | false | null
        cat_type_program: filters.cat_type_program || null,
        cat_category: filters.cat_category || null,
        cat_model_modality: filters.cat_model_modality || null,
        q: filters.q || null,
        page: pagin.value.page,
        size: pagin.value.size
      }
      

      const { items, total, page, size } = await programService.programVersionList(payload)

      programs.value = items || []
      pagin.value.total = Number(total || 0)
      pagin.value.page = Number(page || pagin.value.page)
      pagin.value.size = Number(size || pagin.value.size)
    }
  } catch (err) {
    console.error('Error cargando programas:', err)
    programs.value = []
    pagin.value.total = 0
  }
}


  const selectedType = ref('versions')

  onMounted(() => {
    loadState()    // <--- NUEVO: Cargar memoria primero
    rebuildChips()
    fetchPrograms()
  })

  // =========================================
// LOGICA LOCALSTORAGE (PERSISTENCIA)
// =========================================
const STORAGE_KEY = 'crm_programs_filter_state_v1'

function saveState() {
  try {
    const state = {
      filters: filters,
      pagination: { 
        size: pagin.value.size, 
        page: pagin.value.page 
      },
      selectedType: selectedType.value // <--- IMPORTANTE: Guardar si es 'programs' o 'versions'
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Error guardando state', e)
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      
      // 1. Restaurar Filtros
      if (parsed.filters) {
        Object.assign(filters, parsed.filters)
      }
      
      // 2. Restaurar Paginación
      if (parsed.pagination) {
        pagin.value.size = parsed.pagination.size || 25
        pagin.value.page = parsed.pagination.page || 1
      }

      // 3. Restaurar Tipo de Vista (Programas vs Versiones)
      if (parsed.selectedType) {
        selectedType.value = parsed.selectedType
      }
    }
  } catch (e) {
    console.error('Error cargando state', e)
  }
}
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
    .divider-vert {
    width: 1px;
    height: 28px;
    background: #e5e7eb;
    margin: 0 .25rem;
    }
    .card-body { padding: 1rem 1.25rem; }

    /* ---------- Searchbox ---------- */
    .searchbox {
    display: inline-flex;
    align-items: center;
    gap: .25rem;
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: .375rem;
    padding: .25rem .5rem;
    }
    .searchbox input {
    border: none;
    outline: none;
    min-width: 260px;
    font-size: .85rem;
    color: #111827;
    }
    .searchbox .btn.icon {
    padding: .1rem .35rem;
    border: none;
    background: transparent;
    color: #6b7280;
    }
    .searchbox .btn.icon:disabled { opacity: .4; cursor: default; }

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
    .table thead th.sortable { cursor: pointer; }
    .table thead th.asc::after,
    .table thead th.desc::after {
    content: ''; display: inline-block; margin-left: .35rem; border: 4px solid transparent;
    }
    .table thead th.asc::after { border-bottom-color: #6b7280; }
    .table thead th.desc::after { border-top-color: #6b7280; }

    .table td {
    padding: .6rem .75rem;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
    }
    .table.dense td, .table.dense thead th { padding: .35rem .5rem; }

    .nowrap { white-space: nowrap; }
    .ta-right { text-align: right; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }

    .empty-state {
    text-align: center; padding: 1rem; color: #6b7280; font-style: italic;
    }

    /* Name cell */
    .name-cell { display: flex; align-items: center; gap: .5rem; }
    .avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: #eef2ff; color: #3730a3; display: inline-flex;
    align-items: center; justify-content: center; font-weight: 700; font-size: .75rem;
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
    .badge-light   { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
    .badge-neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
    .badge-info    { background: #e0f2fe; color: #075985; border-color: #bae6fd; }
    .badge-warning { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .badge-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
    .badge-danger  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

    /* Owner */
    .owner { display: inline-flex; align-items: center; gap: .4rem; }
    .owner-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;
    }

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
    .btn-close { background: transparent; border: none; font-size: 1rem; line-height: 1; cursor: pointer; color: #6b7280; }

    /* ---------- Pagination ---------- */
    .pagination-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: .75rem; padding-top: 1rem; font-size: .8rem; flex-wrap: wrap;
    }
    .page-size { display: inline-flex; align-items: center; gap: .4rem; }
    .page-size select {
    border: 1px solid #d1d5db; border-radius: .375rem; padding: .25rem .4rem; background: #fff;
    }
    .page-info { color: #374151; }
    .pager { display: inline-flex; align-items: center; gap: .5rem; }


    .form-field { display: flex; flex-direction: column; font-size: .8rem; }
    .form-field label { font-weight: 500; margin-bottom: .25rem; color: #374151; }
    .form-field input, .form-field select {
        border: 1px solid #d1d5db; border-radius: .375rem; padding: .5rem .75rem; font-size: .8rem; color: #111827; background: #fff;
    }

    .minW {
        min-width: 160px
    }
    .active-filters {
    display: flex;
    flex-wrap: wrap;
    gap: .4rem;
    margin-bottom: .75rem;
    align-items: center;
    }
    .active-filters .label {
    font-size: .8rem;
    color: #6b7280;
    margin-right: .25rem;
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
    .chip .x {
    margin-left: .35rem;
    color: #6b7280;
    }
    .chip.clear-all {
    background: #fff;
    }
    /* Modal de filtros – look más limpio y consistente */
    .filter-section h6 {
    font-weight: 600;
    color: #111827;
    }

    .form-label {
    font-size: .85rem;
    color: #374151;
    margin-bottom: .35rem;
    }

    /* Ajuste visual de input-group con icono */
    .input-group-text {
    background: #f9fafb;
    border-color: #e5e7eb;
    }
    .form-control {
    border-color: #e5e7eb;
    }

    /* Espaciado menor en xl para que quepan 3 columnas sin verse apretado */
    @media (min-width: 1200px) {
    .row.row-cols-xl-3 > .col {
        padding-bottom: .25rem;
    }
    }

</style>