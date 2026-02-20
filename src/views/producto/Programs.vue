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

      <div class="toolbar-chips">
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

        <div class="masthead-actions">
          <div class="d-flex align-items-center gap-2 me-2">
            <span class="exec-label mb-0 text-secondary" style="font-size: 10px;">VISTA:</span>
            <SearchSelect
              v-model="selectedType"
              :items="typeList"
              label-field="label"
              value-field="alias"
              placeholder="TIPO…"
              @update:modelValue="applyFilters"
              class="exec-select-light"
              style="width: 160px; min-height: 32px;"
            />
          </div>

          <button class="btn-exec btn-exec-primary" @click="goNew">
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
                  <button class="btn-icon" @click="editProgram(p)" title="Editar Programa">
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
                  <button class="btn-icon" @click="editProgram({ program_id: v.program_id })" title="Editar Versión">
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
    <div class="px-4 py-3">

      <div class="row g-3 mb-4">
        <div class="col-12">
          <label class="exec-label">Búsqueda General</label>
          <input v-model.trim="filters.q" type="text" class="exec-input-light w-100" placeholder="Buscar por nombre o descripción..." @keyup.enter="applyFilters" />
        </div>
      </div>

      <div class="exec-fieldset">
        <h6 class="fieldset-title">Criterios de Clasificación</h6>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="exec-label">Estado</label>
            <SearchSelect v-model="filters.estado" :items="filtroEstado" label-field="description" value-field="value" placeholder="Todos..." class="exec-select-light w-100" />
          </div>
          <div class="col-md-6">
            <label class="exec-label">Tipo de Programa</label>
            <SearchSelect v-model="filters.cat_type_program" :items="filtroTipos" label-field="description" value-field="id" placeholder="Seleccionar..." class="exec-select-light w-100" />
          </div>
          <div class="col-md-6">
            <label class="exec-label">Categoría</label>
            <SearchSelect v-model="filters.cat_category" :items="filtroCategorias" label-field="description" value-field="id" placeholder="Seleccionar..." class="exec-select-light w-100" />
          </div>
          <div class="col-md-6">
            <label class="exec-label">Modalidad</label>
            <MultiSelect
              v-model="filters.modality_ids"
              :items="filtroModalidades"
              label-key="description"
              value-key="id"
              placeholder="Modalidades..."
            />
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
      modality_ids: filters.modality_ids.length ? filters.modality_ids : null,
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

<style scoped>
/* ═══════════════════════════════════════════════
   TOKENS & BASE
═══════════════════════════════════════════════ */
:root {
  --navy-900: #0f172a; --navy-800: #1e293b; --navy-700: #334155;
  --slate-400: #94a3b8; --slate-300: #cbd5e1; --slate-100: #f1f5f9; --slate-50:  #f8fafc;
  --teal-600:  #12274e; --teal-500:  #12274e;
  --blue-600:  #2563eb;
  --amber-500: #f59e0b;
  --red-600:   #dc2626;
  --gold-400:  #fbbf24;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;
}

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

.exec-shell {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: var(--slate-50);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

/* ═══════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════ */
.exec-masthead { background: var(--navy-900); color: var(--white); border-bottom: 1px solid var(--navy-700); }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 2px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: var(--white); }

.masthead-actions { display: flex; gap: 10px; align-items: center; }
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
.btn-exec-ghost { background: rgba(255,255,255,0.07); color: var(--slate-300); border: 1px solid rgba(255,255,255,0.12); }
.btn-exec-ghost:hover { background: rgba(255,255,255,0.12); color: var(--white); }
.btn-exec-active { background: var(--white); color: var(--navy-900); border: 1px solid var(--white); }
.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-danger { background: rgba(220, 38, 38, 0.15); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.3); }
.btn-exec-warning { background: var(--amber-500); color: var(--navy-900); border: 1px solid var(--amber-500); }
.btn-exec-success { background: #15803d; color: var(--white); }
.btn-exec-outline { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-exec-outline:hover { background: var(--slate-50); color: var(--text-primary); }

/* ═══════════════════════════════════════════════
   BODY & TOOLBAR
═══════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 24px 28px; }
.exec-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; }
.toolbar-chips { flex: 1; min-width: 0; }
.toolbar-pagination { flex-shrink: 0; }

/* ═══════════════════════════════════════════════
   DATA GRID (TABLA)
═══════════════════════════════════════════════ */
.table-shell { background: var(--white); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.table-responsive-custom { width: 100%; overflow-x: auto; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }

.brand-rule {
  width: 3px; height: 42px;
  background: #2e3e91; border-radius: 2px; flex-shrink: 0;
}
/* Cabeceras (Sub) */
.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border); text-align: left; background: #fafbfc; color: var(--text-secondary); }
.thead-sub .ts.text-center { text-align: center; }

/* Filas Body */
.tbody-row { transition: background 0.15s; position: relative; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50); vertical-align: middle; color: var(--text-primary); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

/* Celdas específicas */
.td-a { border-left: 1px solid transparent; }

/* Utilidades Texto */
.text-center { text-align: center; } .text-right { text-align: right; }
.text-mono { font-family: 'IBM Plex Mono', monospace; }
.fw-500 { font-weight: 500; } .fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted); } .accent-text { color: var(--teal-600); }
.c-green { color: #15803d; } .c-red { color: #dc2626; }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }
.nowrap { white-space: nowrap; }

/* Badges / Pills */
.pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; }
.pill-slate { background: var(--slate-100); color: var(--text-secondary); }
.pill-teal  { background: #ccfbf1; color: #0f766e; }
.pill-blue  { background: #dbeafe; color: #1d4ed8; }
.pill-amber { background: #fef3c7; color: #92400e; }
.pill-red   { background: #fee2e2; color: #b91c1c; }

/* Botones Icono Tabla */
.btn-icon { background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary); transition: all 0.15s; }
.btn-icon:hover { background: var(--slate-100); color: var(--text-primary); border-color: var(--slate-300); }

/* Empty state / Loaders */
.empty-state { padding: 40px; text-align: center; color: var(--slate-400); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; }

/* ═══════════════════════════════════════════════
   MODALES (Estilos internos)
═══════════════════════════════════════════════ */
.exec-fieldset { background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: 16px 20px; }
.fieldset-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid var(--slate-100); padding-bottom: 6px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
.exec-input-light, .exec-select-light { background: var(--white); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary); transition: border-color 0.15s; }
.exec-input-light:focus, .exec-select-light:focus { outline: none; border-color: var(--teal-500); }

</style>
