<template>
  <div class="exec-shell list-shell">
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gestión Académica</span>
            <h1 class="brand-title">Listado de Instructores</h1>
          </div>
        </div>
      </div>
    </header>

    <main class="exec-body">
      <div class="toolbar-chips">
        <BaseFilterChips
          :items="activeFilterChips"
          @remove="clearFilter"
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
          <button class="btn-exec btn-exec-primary" @click="goNew">
            <i class="fa-solid fa-plus"></i> Nuevo Instructor
          </button>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width: 80px;">Acciones</th>
                <th class="ts ts-c">Estado</th>
                <th class="ts ts-c">Instructor / Documento</th>
                <th class="ts ts-c">Ocupación / País</th>
                <th class="ts ts-c">Registro</th>
                <th class="ts ts-c">Última modif.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in instructors" :key="i.instructor_id" class="tbody-row">
                <td class="td-a text-center nowrap">
                  <button class="btn-icon" @click="editInstructor(i)" title="Editar">
                    <i class="fa-solid fa-pen-to-square text-warning"></i>
                  </button>
                </td>

                <td class="td-a">
                  <span class="pill" :class="i.instructor_active === 'Y' ? 'pill-teal' : 'pill-red'">
                    {{ i.instructor_active === 'Y' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>

                <td class="td-a">
                  <div class="fw-600 text-dark">{{ buildFullName(i) }}</div>
                  <div class="text-mono small mt-1 accent-text">
                    <span v-if="i.cat_type_document_label">{{ i.cat_type_document_label }}:</span>
                    {{ i.document_number || 'S/N' }}
                  </div>
                </td>

                <td class="td-a">
                  <div class="small fw-600 text-dark">{{ i.cat_occupation_label || '—' }}</div>
                  <div class="small text-muted">{{ i.cat_country_label || '—' }}</div>
                </td>

                <td class="td-a small text-muted">{{ formatDate(i.registration_date) }}</td>
                <td class="td-a small text-muted">{{ formatDate(i.modification_date) }}</td>
              </tr>

              <tr v-if="!instructors.length">
                <td colspan="6" class="empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <p>No se encontraron instructores con los filtros actuales.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros de Instructores" size="lg">
    <div class="px-4 py-3">
      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title">Búsqueda General y Estado</h6>
        <div class="row g-3">
          <div class="col-md-4">
            <label class="exec-label">Estado Instructor</label>
            <SearchSelect
              v-model="filters.estado_instructor"
              :items="filtroEstadoInstructor"
              label-field="description"
              value-field="value"
              placeholder="Todos..."
              class="exec-select-light w-100"
            />
          </div>

          <div class="col-md-8">
            <label class="exec-label">Búsqueda (q)</label>
            <input
              v-model.trim="filters.q"
              type="text"
              class="exec-input-light w-100"
              placeholder="Buscar por nombre, documento..."
              @keyup.enter="applyFilters"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn-exec btn-exec-outline" @click="clearFilters">
          <i class="fa-solid fa-eraser me-1"></i> Limpiar todo
        </button>
        <div class="d-flex gap-2">
          <button class="btn-exec btn-exec-outline" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary" @click="applyFilters">
            <i class="fa-solid fa-filter me-1"></i> Aplicar Filtros
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

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

.brand-rule {
  width: 3px; height: 42px;
  background: #2e3e91; border-radius: 2px; flex-shrink: 0;
}
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: var(--white); }

.masthead-actions { display: flex; gap: 10px; align-items: center; }
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
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

/* Cabeceras */
.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border); text-align: left; background: #fafbfc; color: var(--text-secondary); }
.thead-sub .ts.text-center { text-align: center; }

/* Filas Body */
.tbody-row { transition: background 0.15s; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50); vertical-align: middle; color: var(--text-primary); }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }

/* Utilidades Texto */
.text-center { text-align: center; }
.text-mono { font-family: 'IBM Plex Mono', monospace; }
.fw-600 { font-weight: 600; }
.text-muted { color: var(--text-muted); } .accent-text { color: var(--teal-600); }
.small { font-size: 11.5px; }
.nowrap { white-space: nowrap; }

/* Badges / Pills */
.pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; }
.pill-teal  { background: #ccfbf1; color: #0f766e; }
.pill-red   { background: #fee2e2; color: #b91c1c; }

/* Botones Icono Tabla */
.btn-icon { background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary); transition: all 0.15s; }
.btn-icon:hover { background: var(--slate-100); color: var(--text-primary); border-color: var(--slate-300); }

/* Empty state */
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
