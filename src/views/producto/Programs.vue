<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gestión Académica</span>
            <h1 class="brand-title">Listado de {{ selectedType === 'programs' ? 'Programas' : 'Versiones' }}</h1>
          </div>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div class="toolbar-chips mb-3">
        <BaseFilterChips
          :items="activeFilterChips"
          @remove="clearFilter($event)"
          @clear-all="clearFilters"
        />
      </div>

      <div class="exec-toolbar">
        <div class="toolbar-pagination">
          <BasePagination
            v-model="pagin"
            @open-filters="openFilterModal"
            @change="handlePaginationChange"
          />
        </div>

        <div class="toolbar-actions">
          <div class="toolbar-view-selector">
            <span class="exec-label mb-0 text-secondary" style="font-size: 10px;">VISTA:</span>
            <SearchSelect
              v-model="selectedType"
              :items="typeList"
              label-field="label"
              value-field="alias"
              placeholder="TIPO…"
              @update:modelValue="applyFilters"
              class="flex-grow-1"
            />
          </div>

          <button class="btn-exec btn-exec-primary w-sm-100" @click="goNew">
            <i class="fa-solid fa-plus"></i> Nuevo
          </button>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">

          <table v-if="selectedType === 'programs'" class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width: 80px;">Acciones</th>
                <th class="ts ts-c text-center">Estado</th>
                <th class="ts ts-c">Tipo / Categoría</th>
                <th class="ts ts-c">Nombre del Programa</th>
                <th class="ts ts-c">Modalidad</th>
                <th class="ts ts-c">Registro</th>
                <th class="ts ts-c">Última modif.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in programs" :key="p.program_id" class="tbody-row">
                <td class="td-a text-center nowrap">
                  <button class="btn-icon btn-icon-sm" @click="editProgram(p)" title="Editar Programa">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                  </button>
                </td>
                <td class="td-a text-center">
                  <span class="pill border" :class="p.active === 'Y' ? 'pill-teal' : 'pill-red'">
                    {{ p.active === 'Y' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="td-a">
                  <div class="pill pill-slate border mb-1">{{ p.cat_type_program_label || '—' }}</div>
                  <div class="text-muted small">{{ p.cat_category_label || '—' }}</div>
                </td>
                <td class="td-a">
                  <div class="fw-600 text-dark">{{ p.program_name || '—' }}</div>
                </td>
                <td class="td-a">
                  <div class="small fw-600">{{ p.cat_model_modality_label || '—' }}</div>
                </td>
                <td class="td-a"><div class="small text-muted">{{ formatDate(p.registration_date) }}</div></td>
                <td class="td-a"><div class="small text-muted">{{ formatDate(p.modification_date) }}</div></td>
              </tr>
              <tr v-if="!programs.length">
                <td colspan="7" class="empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <p>No se encontraron programas con los filtros actuales.</p>
                </td>
              </tr>
            </tbody>
          </table>

          <table v-if="selectedType === 'versions'" class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width: 80px;">Acciones</th>
                <th class="ts ts-c">Versión / Código</th>
                <th class="ts ts-c">Categoría / Tipo</th>
                <th class="ts ts-c text-center">Sesiones</th>
                <th class="ts ts-c">Esquema</th>
                <th class="ts ts-c">Cat. Curso</th>
                <th class="ts ts-c text-center">Estado</th>
                <th class="ts ts-c">Modificación</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in programs" :key="v.id" class="tbody-row">
                <td class="td-a text-center nowrap">
                  <button class="btn-icon btn-icon-sm" @click="editProgram({ program_id: v.program_id })" title="Editar Versión">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                  </button>
                </td>
                <td class="td-a">
                  <div class="small fw-600 text-dark">{{ v.abbreviation }}</div>
                  <div class="text-mono x-small accent-text mt-1">{{ v.version_code }}</div>
                </td>
                <td class="td-a">
                  <div class="small fw-600">{{ v.cat_category_label || '—' }}</div>
                  <div class="text-muted x-small">{{ v.cat_type_program_label || '—' }}</div>
                </td>
                <td class="td-a text-center">
                  <span class="pill pill-slate border">{{ v.sessions || '0' }}</span>
                </td>
                <td class="td-a"><div class="small">{{ v.skem_clasification || '—' }}</div></td>
                <td class="td-a"><div class="small">{{ v.cat_course_category_label || '—' }}</div></td>
                <td class="td-a text-center">
                  <span class="pill border" :class="v.active === 'Y' ? 'pill-teal' : 'pill-red'">
                    {{ v.active === 'Y' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="td-a">
                  <div class="small text-muted">{{ formatDate(v.modification_date) }}</div>
                </td>
              </tr>
              <tr v-if="!programs.length">
                <td colspan="8" class="empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <p>No se encontraron versiones con los filtros actuales.</p>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </main>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de Búsqueda" size="lg">
    <div class="px-4 py-3 form-contrast">

      <div class="row g-3 mb-4">
        <div class="col-12">
          <label class="exec-label">Búsqueda General</label>
          <input v-model.trim="filters.q" type="text" class="form-control w-100" placeholder="Buscar por nombre o descripción..." @keyup.enter="applyFilters" />
        </div>
      </div>

      <div class="exec-fieldset">
        <h6 class="fieldset-title">Criterios de Clasificación</h6>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="exec-label">Estado</label>
            <SearchSelect v-model="filters.estado" :items="filtroEstado" label-field="description" value-field="value" placeholder="Todos..." class="w-100" />
          </div>
          <div class="col-md-6">
            <label class="exec-label">Tipo de Programa</label>
            <SearchSelect v-model="filters.cat_type_program" :items="filtroTipos" label-field="description" value-field="id" placeholder="Seleccionar..." class="w-100" />
          </div>
          <div class="col-md-6">
            <label class="exec-label">Categoría</label>
            <SearchSelect v-model="filters.cat_category" :items="filtroCategorias" label-field="description" value-field="id" placeholder="Seleccionar..." class="w-100" />
          </div>
          <div class="col-md-6">
            <label class="exec-label">Modalidad</label>
            
            <SearchSelect v-model="filters.cat_model_modality" :items="filtroModalidades" label-field="description" value-field="id" placeholder="Seleccionar..." class="w-100" />

          </div>
        </div>
      </div>

    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn-exec btn-exec-outline" @click="clearFilters"><i class="fa-solid fa-eraser me-1"></i> Limpiar todo</button>
        <div class="d-flex gap-2">
          <button class="btn-exec btn-exec-outline" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary" @click="applyFilters"><i class="fa-solid fa-filter me-1"></i> Aplicar Filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>

</template>

<style scoped>
/* ═══════════════════════════════════════════════
   ESTRUCTURA BASE DE LA VISTA
   (Asumiendo uso de CSS Global para botones, inputs y pills)
═══════════════════════════════════════════════ */
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Masthead */
.exec-masthead { background: var(--navy-900, #0f172a); color: var(--white, #ffffff); border-bottom: 1px solid var(--navy-700, #334155); }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #12274e); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: var(--white, #ffffff); }

.exec-body { flex: 1; padding: 24px 28px; }

/* ═══════════════════════════════════════════════
   TOOLBAR RESPONSIVE
═══════════════════════════════════════════════ */
.exec-toolbar { 
  display: flex; 
  flex-wrap: wrap; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 20px; 
  gap: 16px; 
}
.toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-view-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 220px;
}

@media (max-width: 768px) {
  .exec-toolbar {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .toolbar-actions {
    justify-content: space-between;
  }
  .toolbar-pagination {
    display: flex;
    justify-content: center;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 8px;
  }
}

@media (max-width: 480px) {
  .toolbar-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-view-selector {
    width: 100%;
    justify-content: space-between;
  }
  .w-sm-100 {
    width: 100%;
    justify-content: center;
  }
}

/* ═══════════════════════════════════════════════
   DATA GRID (TABLA)
═══════════════════════════════════════════════ */
.table-shell { background: var(--white, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.table-responsive-custom { width: 100%; overflow-x: auto; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

/* Cabeceras */
.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); }
.thead-sub .ts.text-center { text-align: center; }

/* Filas Body */
.tbody-row { transition: background 0.15s; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; color: var(--text-primary, #0f172a); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: var(--slate-50, #f8fafc); cursor: pointer; }

/* Celdas específicas */
.td-a { border-left: 1px solid transparent; }

/* Utilidades Texto de Tabla */
.text-center { text-align: center; } 
.nowrap { white-space: nowrap; }

/* Empty state */
.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; color: var(--slate-300, #cbd5e1); }

/* ═══════════════════════════════════════════════
   MODAL DE FILTROS & CONTRASTE
═══════════════════════════════════════════════ */
.exec-fieldset { background: var(--white, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 16px 20px; }
.fieldset-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary, #475569); font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid var(--slate-100, #f1f5f9); padding-bottom: 6px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }

/* Contraste forzado para inputs dentro del modal */
.form-contrast .form-control,
.form-contrast :deep(.searchselect-control),
.form-contrast :deep(.multiselect-control) {
  background-color: var(--slate-50, #f8fafc) !important;
  border-color: var(--slate-300, #cbd5e1) !important;
}

.form-contrast .form-control:focus,
.form-contrast :deep(.searchselect-control:focus-within),
.form-contrast :deep(.multiselect-control:focus-within) {
  background-color: var(--white, #ffffff) !important;
  border-color: var(--teal-500, #12274e) !important;
  box-shadow: 0 0 0 3px rgba(18, 39, 78, 0.1) !important;
}
</style>
<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'
import MultiSelect from '../../components/MultiSelect.vue'

const router = useRouter()
const programService = inject(ServiceKeys.Program)
const catalog = inject('catalog')

const typeList = [
  { label: "PROGRAMAS", alias: "programs" },
  { label: "VERSIONES", alias: "versions" }
]

// === Estado UI ===
const showFilterModal = ref(false)
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
  cat_model_modality:null,
  modality_ids: [],
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
  if (key === 'modality_ids') {
    filters.modality_ids = []
  }
  else if (key === 'estado') filters.estado = null
  else if (key === 'cat_type_program') filters.cat_type_program = null
  else if (key === 'cat_category') filters.cat_category = null
  else if (key === 'q') filters.q = ''

  applyFilters()
}

function clearFilters() {
  Object.assign(filters, {
    estado: null,
    cat_type_program: null,
    cat_category: null,
    modality_ids: [],
    q: ''
  })
  pagin.value.page = 1
  localStorage.removeItem('crm_programs_filter_state_v1')
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
  if (filters.modality_ids && filters.modality_ids.length > 0) {
    chips.push({
        key: 'modality_ids',
        text: `Modalidad: ${filters.modality_ids.length}`,
        details: filters.modality_ids
    })
  }
  if (filters.q) {
    chips.push({ key: 'q', text: `q: "${filters.q}"` })
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
      // modality_ids: filters.modality_ids.length ? filters.modality_ids : null,
      cat_model_modality: filters.cat_model_modality,
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
  rebuildChips()
  fetchPrograms()
})
</script>
