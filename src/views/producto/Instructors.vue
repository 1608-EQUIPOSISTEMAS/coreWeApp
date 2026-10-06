<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Docentes</h1>
        <p class="ds-sub">
          {{ isLoading ? 'Cargando docentes…' : `${formatValue(pagin.total, 'num')} docentes${activeFilterChips.length ? ' con los filtros aplicados' : ' registrados'}` }}
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" @click="goNew">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo docente
        </button>
      </div>
    </header>

    <BaseFilterChips
      :items="activeFilterChips"
      @remove="clearFilter"
      @clear-all="clearFilters"
    />

    <section class="ds-panel">
      <div class="ds-panel-body">
        <BasePagination
          v-model="pagin"
          @open-filters="openFilterModal"
          @change="handlePaginationChange"
        />
        <div class="table-responsive-custom">
          <table class="ds-table ds-table--lista">
            <thead>
              <tr>
                <th class="ins-col-action"><span class="visually-hidden">Acciones</span></th>
                <th>Estado</th>
                <th>Docente</th>
                <th>Documento</th>
                <th>Registro</th>
                <th>Última modif.</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n">
                  <td colspan="6"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <tr v-else-if="!instructors.length">
                <td colspan="6" class="ds-empty ds-empty--lista">
                  No hay instructores con estos filtros. Quita un filtro o usa "Limpiar todo" para ver la lista completa.
                </td>
              </tr>
              <template v-else>
                <tr v-for="i in instructors" :key="i.instructor_id">
                  <td class="ins-col-action">
                    <button
                      class="btn-icon btn-icon-sm"
                      type="button"
                      title="Editar instructor"
                      aria-label="Editar instructor"
                      @click="editInstructor(i)"
                    >
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                  </td>
                  <td>
                    <span class="ds-pill" :class="i.instructor_active === 'Y' ? 'ok' : 'bad'">
                      <i class="fa-solid" :class="i.instructor_active === 'Y' ? 'fa-circle-check' : 'fa-circle-xmark'" aria-hidden="true"></i>
                      {{ i.instructor_active === 'Y' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="ins-name">{{ buildFullName(i) }}</td>
                  <td class="ins-mono">
                    <span v-if="i.cat_type_document_label">{{ i.cat_type_document_label }}:</span>
                    {{ i.document_number || 'S/N' }}
                  </td>
                  <td class="ins-date">{{ formatDate(i.registration_date) }}</td>
                  <td class="ins-date">{{ formatDate(i.modification_date) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtrar instructores" size="md">
    <div class="ds-form-grid">
      <div class="ds-field">
        <label class="ds-label">Estado</label>
        <SearchSelect
          v-model="filters.estado_instructor"
          :items="filtroEstadoInstructor"
          label-field="description"
          value-field="value"
          placeholder="Todos..."
        />
      </div>
      <div class="ds-field">
        <label class="ds-label" for="ins-flt-q">Búsqueda</label>
        <input
          id="ins-flt-q"
          v-model.trim="filters.q"
          type="search"
          class="ds-input"
          placeholder="Nombre o documento"
          @keyup.enter="applyFilters"
        />
      </div>
    </div>

    <template #footer>
      <div class="ins-modal-foot">
        <button class="btn-exec btn-exec-ghost" type="button" @click="clearFilters">
          <i class="fa-solid fa-eraser" aria-hidden="true"></i> Limpiar todo
        </button>
        <div class="ins-modal-actions">
          <button class="btn-exec btn-exec-outline" type="button" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary" type="button" @click="applyFilters">
            <i class="fa-solid fa-filter" aria-hidden="true"></i> Aplicar filtros
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Columna angosta: solo el botón de editar; el estado va primero porque es lo
   que se revisa al barrer la lista (activos vs. inactivos). */
.ins-col-action { width: 48px; text-align: center; }
.ins-name { font-weight: 600; color: var(--ds-heading); }
.ins-mono { font-family: var(--ds-font-mono); font-size: 12px; white-space: nowrap; }
.ins-date { color: var(--ds-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }

/* El pie del BaseModal no trae layout propio: "Limpiar" a la izquierda y las
   acciones a la derecha; a 400 px se apilan sin desbordar. */
.ins-modal-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
.ins-modal-actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { formatValue } from '@/shared/lib/formatValue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'

const router = useRouter()
const instructorService = inject(ServiceKeys.Instructor)

// === Estado UI ===
const showFilterModal = ref(false)
function openFilterModal() { showFilterModal.value = true }

// === Datos ===
const instructors = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })
const isLoading = ref(false)

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
  isLoading.value = true
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
  } finally {
    isLoading.value = false
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
