<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">{{ selectedType === 'programs' ? 'Programas' : 'Versiones de programa' }}</h1>
        <p class="ds-sub">
          {{ formatValue(pagin.total, 'num') }} {{ selectedType === 'programs' ? 'programas' : 'versiones' }} con los filtros actuales
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" @click="goNew">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo programa
        </button>
      </div>
    </header>

    <BaseFilterChips
      :items="activeFilterChips"
      @remove="clearFilter($event)"
      @clear-all="clearFilters"
    />

    <section class="ds-panel">
      <div class="ds-panel-body pg-body">
        <div class="pg-toolbar">
          <BasePagination
            v-model="pagin"
            @open-filters="openFilterModal"
            @change="handlePaginationChange"
          />
          <div class="pg-view">
            <span class="ds-label pg-view-label">Vista</span>
            <SearchSelect
              v-model="selectedType"
              :items="typeList"
              label-field="label"
              value-field="alias"
              placeholder="TIPO…"
              @update:modelValue="applyFilters"
              class="pg-view-select"
            />
          </div>
        </div>

        <div class="ds-table-scroll">
          <table v-if="selectedType === 'programs'" class="ds-table ds-table--lista">
            <thead>
              <tr>
                <th>Programa</th>
                <th>Tipo / categoría</th>
                <th>Modalidad</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>Última modif.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n">
                  <td colspan="7"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="p in programs" :key="p.program_id">
                  <td>{{ p.program_name || '—' }}</td>
                  <td>
                    <span class="ds-pill">{{ p.cat_type_program_label || '—' }}</span>
                    <span class="pg-sub">{{ p.cat_category_label || '—' }}</span>
                  </td>
                  <td>{{ p.cat_model_modality_label || '—' }}</td>
                  <td>
                    <span class="ds-pill" :class="p.active === 'Y' ? 'ok' : ''">
                      {{ p.active === 'Y' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="num">{{ formatDate(p.registration_date) }}</td>
                  <td class="num">{{ formatDate(p.modification_date) }}</td>
                  <td class="num">
                    <button class="btn-icon btn-icon-sm" type="button" title="Editar programa" aria-label="Editar programa" @click="editProgram(p)">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!programs.length">
                  <td colspan="7" class="ds-empty ds-empty--lista">
                    No hay programas con estos filtros. Quita un filtro o cambia la vista para ver más.
                  </td>
                </tr>
              </template>
            </tbody>
          </table>

          <table v-if="selectedType === 'versions'" class="ds-table ds-table--lista">
            <thead>
              <tr>
                <th>Versión / código</th>
                <th>Categoría / tipo</th>
                <th class="num">Sesiones</th>
                <th>Esquema</th>
                <th>Cat. curso</th>
                <th>Estado</th>
                <th>Modificación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n">
                  <td colspan="8"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="v in programs" :key="v.id">
                  <td>
                    {{ v.abbreviation }}
                    <span class="pg-sub mono">{{ v.version_code }}</span>
                  </td>
                  <td>
                    {{ v.cat_category_label || '—' }}
                    <span class="pg-sub">{{ v.cat_type_program_label || '—' }}</span>
                  </td>
                  <td class="num">{{ v.sessions || '0' }}</td>
                  <td>{{ v.skem_clasification || '—' }}</td>
                  <td>{{ v.cat_course_category_label || '—' }}</td>
                  <td>
                    <span class="ds-pill" :class="v.active === 'Y' ? 'ok' : ''">
                      {{ v.active === 'Y' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="num">{{ formatDate(v.modification_date) }}</td>
                  <td class="num">
                    <button class="btn-icon btn-icon-sm" type="button" title="Editar versión" aria-label="Editar versión" @click="editProgram({ program_id: v.program_id })">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!programs.length">
                  <td colspan="8" class="ds-empty ds-empty--lista">
                    No hay versiones con estos filtros. Quita un filtro o cambia la vista para ver más.
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de búsqueda" size="lg">
    <div class="flt-body">
      <div class="ds-field">
        <label class="ds-label" for="programs-flt-q">Búsqueda general</label>
        <input id="programs-flt-q" v-model.trim="filters.q" type="search" class="ds-input" placeholder="Buscar por nombre o descripción..." @keyup.enter="applyFilters" />
      </div>

      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-tags" aria-hidden="true"></i> Clasificación</legend>
        <div class="flt-grid">
          <div class="ds-field">
            <label class="ds-label">Estado</label>
            <SearchSelect v-model="filters.estado" :items="filtroEstado" label-field="description" value-field="value" placeholder="Todos..." />
          </div>
          <div class="ds-field">
            <label class="ds-label">Tipo de programa</label>
            <SearchSelect v-model="filters.cat_type_program" :items="filtroTipos" label-field="description" value-field="id" placeholder="Seleccionar..." />
          </div>
          <div class="ds-field">
            <label class="ds-label">Categoría</label>
            <SearchSelect v-model="filters.cat_category" :items="filtroCategorias" label-field="description" value-field="id" placeholder="Seleccionar..." />
          </div>
          <div class="ds-field">
            <label class="ds-label">Modalidad</label>
            <SearchSelect v-model="filters.cat_model_modality" :items="filtroModalidades" label-field="description" value-field="id" placeholder="Seleccionar..." />
          </div>
        </div>
      </fieldset>
    </div>
    <template #footer>
      <div class="flt-footer">
        <button class="btn-exec btn-exec-ghost" type="button" @click="clearFilters"><i class="fa-solid fa-eraser" aria-hidden="true"></i> Limpiar todo</button>
        <div class="flt-actions">
          <button class="btn-exec btn-exec-outline" type="button" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary" type="button" @click="applyFilters"><i class="fa-solid fa-filter" aria-hidden="true"></i> Aplicar filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.pg-body { display: flex; flex-direction: column; gap: 14px; }

/* Paginación y selector de vista en una línea; bajo 600px se apilan */
.pg-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
.pg-view { display: flex; align-items: center; gap: 8px; flex: 0 1 240px; min-width: 0; }
.pg-view-label { margin: 0; }
.pg-view-select { flex: 1; min-width: 0; }

/* Segunda línea de la celda (categoría bajo el tipo, código bajo la versión) */
.pg-sub { display: block; margin-top: 3px; font-size: 11.5px; font-weight: 400; color: var(--ds-muted); }
.mono { font-family: var(--ds-font-mono); }

/* Modal de filtros: mismo esquema que AulasFilterModal */
.flt-body { display: flex; flex-direction: column; gap: var(--ds-gap); }
.flt-fieldset { margin: 0; padding: 14px 18px 16px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); }
.flt-legend {
  display: flex; align-items: center; gap: 6px;
  width: auto; margin: 0; padding: 0 8px; float: none;
  font-size: 12px; font-weight: 700; color: var(--ds-ink-2);
}
.flt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.flt-footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; width: 100%; }
.flt-actions { display: flex; gap: 8px; }

@media (max-width: 600px) {
  .pg-view { flex-basis: 100%; }
  .flt-grid { grid-template-columns: 1fr; }
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
import { formatValue } from '@/shared/lib/formatValue'

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
const isLoading = ref(false)

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
  if (key === 'cat_model_modality') filters.cat_model_modality = null
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
    cat_model_modality: null,
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
  if (filters.cat_model_modality) {
    const it = filtroModalidades.value.find(i => i.id === filters.cat_model_modality)
    chips.push({ key: 'cat_model_modality', text: `Modalidad: ${it?.description || filters.cat_model_modality}` })
  }
  if (filters.q) {
    chips.push({ key: 'q', text: `q: "${filters.q}"` })
  }
  activeFilterChips.value = chips
}

// === API ===
async function fetchPrograms() {
  isLoading.value = true
  try {
    const payload = {
      active: filters.estado,
      cat_type_program: filters.cat_type_program || null,
      cat_category: filters.cat_category || null,
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
  } finally {
    isLoading.value = false
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
