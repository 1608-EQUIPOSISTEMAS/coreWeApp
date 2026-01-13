<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        <span>Gestión Comercial</span>
        <span class="sub">Listado de Leads</span>
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

      <div class="table-responsive">
        <table class="table table-hover" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-center">Acciones</th>
              <th>Status</th>
              <th>Contacto</th>
              <th>T. Promoción</th>
              <th>Programa / Interés</th>
              <th>Ini. Edición</th>
              <th>Nivel Interés</th>
              <th>Registro</th>
              <th>Modificación</th>
              <th>Seguimiento</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in leadsRaw" :key="l.id">
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm me-1" @click="editLead(l)" title="Editar">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
                <button class="btn btn-outline btn-sm" @click="viewLead(l)" title="Clonar/Ver">
                  <i class="fa-solid fa-clone text-primary"></i>
                </button>
              </td>

              <td>
                <span v-if="l.cat_status_alias" class="badge" :class="badgeForStatus(l.cat_status_alias)">
                  {{ filtroPipeline.find(e=>e.alias==l.cat_status_alias)?.description }}
                </span>
              </td>

              <td style="min-width:160px">
                <div class="d-flex flex-column">
                  <span class="name text-dark">{{ l.origin_phone }}</span>
                  <span class="small muted">{{ l.full_name_label || 'Sin nombre' }}</span>
                </div>
              </td>

              <td class="minW">
                <span class="badge badge-neutral">
                   {{ filtroQuery.find(e=>e.alias==l.cat_promotion_alias)?.description || '—' }}
                </span>
              </td>

              <td style="min-width:280px">
                <div v-if="l.program_label">
                  <div class="name">{{ l.program_label }}</div>
                  <div class="small muted mt-1">
                    {{ l.cat_type_program_label }}
                    <span v-if="l.cat_model_modality_label">• {{ l.cat_model_modality_label }}</span>
                  </div>
                </div>
                <div v-else class="muted small">—</div>
              </td>

              <td class="nowrap">
                <div class="font-mono small fw-600 text-primary">
                    {{ l.edition_label || '—' }}
                </div>
              </td>

              <td>
                <span v-if="l.cat_interest_alias" class="badge" :class="badgeForInterest(l.cat_interest_alias)">
                  {{ filtroInterest.find(e=>e.alias==l.cat_interest_alias)?.description }}
                </span>
                <span v-else class="muted small">—</span>
              </td>

              <td style="min-width:120px">
                <div v-if="l.user_registration_label">
                  <div class="small fw-600">{{ l.user_registration_label }}</div>
                  <div class="muted x-small">{{ l.registration_date }}</div>
                </div>
              </td>

              <td style="min-width:120px">
                <div v-if="l.user_modification_label">
                  <div class="small fw-600">{{ l.user_modification_label }}</div>
                  <div class="muted x-small">{{ l.modification_date }}</div>
                </div>
              </td>

              <td>
                <span v-if="l.cat_last_follow_alias" class="badge" :class="badgeForFollow(l.cat_last_follow_alias)">
                  {{ filtroFollow?.find(e=>e.alias==l.cat_last_follow_alias)?.description }}
                </span>
              </td>
            </tr>

            <tr v-if="!leadsRaw.length">
              <td colspan="10" class="empty-state">No se encontraron leads con los filtros actuales.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFilterModal" title="Filtros Avanzados" size="lg">
    <div class="px-3 py-2">

      <div class="row g-3 mb-4">
        <div class="col-md-7">
          <label class="form-label">
            <i class="fa-solid fa-magnifying-glass me-1 text-primary"></i> Búsqueda General
          </label>
          <input
            v-model.trim="filters.q"
            type="text"
            class="form-control"
            placeholder="Nombre, teléfono..."
            @keyup.enter="applyFilters"
          />
        </div>

        <div class="col-md-5">
          <label class="form-label">
            <i class="fa-solid fa-user-tie me-1 text-primary"></i> Asesor Asignado
          </label>
           <MultiSelect
              v-model="filters.owner_user_ids"
                :items="filtroOwners"
                label-key="description"
                value-key="id"
                placeholder="USUARIO..."
            />
        </div>
      </div>

      <hr class="border-secondary opacity-10 my-3">

      <div class="mb-4">
        <h6 class="section-title">Estado y Clasificación</h6>
        <div class="row g-3">
          <div class="col-md-3 col-6">
            <label class="form-label">Estatus (Pipeline)</label>
           <MultiSelect
              v-model="filters.status_lead_ids"
                :items="filtroPipeline"
                label-key="description"
                value-key="alias"
                placeholder="ESTATUS..."
            />
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Seguimiento</label>
            <MultiSelect
              v-model="filters.last_follow_ids"
                :items="filtroFollow"
                label-key="description"
                value-key="id"
                placeholder="SEGUIMIENTO..."
            />
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Nivel de Interés</label>
            <MultiSelect
              v-model="filters.interest_level_ids"
                :items="filtroInterest"
                label-key="description"
                value-key="id"
                placeholder="INTERES..."
            />
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Canal Origen</label>
            <MultiSelect
              v-model="filters.channel_ids"
                :items="filtroCanales"
                label-key="description"
                value-key="id"
                placeholder="CANAL..."
            />
          </div>
        </div>
      </div>

      <div class="program-filter-box mb-4">
        <h6 class="section-title text-primary mb-3">
          <i class="fa-solid fa-graduation-cap me-1"></i> Interés Académico
        </h6>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Nombre del Programa</label>
            <input v-model="filters.program_text" type="text" class="form-control" placeholder="Ej. Gestión de Proyectos...">
          </div>
          <div class="col-md-6">
            <label class="form-label">Promoción</label>
           <MultiSelect
              v-model="filters.query_ids"
                :items="filtroQuery"
                label-key="description"
                value-key="id"
                placeholder="PROMO..."
            />
          </div>
        </div>

        <div class="row g-3 align-items-end">
          <div class="col-md-3 col-6">
            <label class="form-label">Tipo</label>
           <MultiSelect
              v-model="filters.type_program_ids"
                :items="filtroTiposPrograma"
                label-key="description"
                value-key="id"
                placeholder="TIPO..."
            />
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Modalidad</label>
           <MultiSelect
              v-model="filters.model_modality_ids"
                :items="filtroModalidad"
                label-key="description"
                value-key="id"
                placeholder="MODALIDAD..."
            />
          </div>
          <div class="col-md-6">
            <label class="form-label">Rango Inicio Edición</label>
            <BaseDatePicker
              v-model="filters.edition_range_string"
              :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
              placeholder="Seleccione rango"
              @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'edition_start')"
            />
          </div>
        </div>
      </div>

      <div>
        <h6 class="section-title">Auditoría del Registro</h6>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Fecha de Creación</label>
            <BaseDatePicker
              v-model="filters.created_range_string"
              :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
              placeholder="Seleccione rango"
              @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'created')"
            />
          </div>
          <div class="col-md-6">
            <label class="form-label">Última Modificación</label>
            <BaseDatePicker
              v-model="filters.updated_range_string"
              :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
              placeholder="Seleccione rango"
              @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'updated')"
            />
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn btn-outline btn-sm" @click="clearFilters">
          <i class="fa-solid fa-eraser me-1"></i> Limpiar todo
        </button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn btn-primary btn-sm px-4" @click="applyFilters">
            <i class="fa-solid fa-filter me-1"></i> Aplicar Filtros
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
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'

const router = useRouter()
const comercialService = inject(ServiceKeys.Comercial)
const authService = inject(ServiceKeys.Auth)
const catalog = inject('catalog')

// === ESTADO UI ===
const showFilterModal = ref(false)
const dense = ref(false)
const activeFilterChips = ref([])
const leadsRaw = ref([])
const filtroOwners = ref([])

// === PAGINACIÓN ===
const pagin = ref({ size: 25, page: 1, total: 0 })

// === FILTROS ===
const filters = reactive({
  q: '',
  program_text: '',
  estado: null,
  
  // Arrays para MultiSelect
  owner_user_ids: [],
  status_lead_ids: [],
  last_follow_ids: [],
  interest_level_ids: [],
  channel_ids: [],
  query_ids: [],
  type_program_ids: [],
  model_modality_ids: [],

  // Strings visuales para los date pickers
  edition_range_string: null,
  created_range_string: null,
  updated_range_string: null,

  // Valores reales para la API
  rangoFechas: { start: '', end: '' },
  rangoModificacion: { start: '', end: '' },
  edition_start_from: '',
  edition_start_to: ''
})

// === CATÁLOGOS ===
const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
const filtroModalidad = ref(catalog.options('we_modality') || [])
const filtroPipeline = ref(catalog.options('we_lead_status') || [])
const filtroCanales = ref(catalog.options('we_social_media') || [])
const filtroFollow = ref(catalog.options('we_follow_lead') || [])
const filtroQuery = ref(catalog.options('we_category_query') || [])
const filtroInterest = ref(catalog.options('we_lead_interest') || [])

// === PERSISTENCIA ===
const { saveState } = useTablePersistence('crm_leads_filter_state_v1', filters, pagin)

// === FUNCIONES DE PAGINACIÓN Y FILTROS ===
function handlePaginationChange() {
  saveState()
  fetchLeads()
}

function openFilterModal() {
  showFilterModal.value = true
}

function applyFilters() {
  showFilterModal.value = false
  pagin.value.page = 1
  saveState()
  rebuildChips()
  fetchLeads()
}

function clearFilter(key) {
  // Casos especiales para rangos de fecha
  if (key === 'rangoFechas') {
    filters.rangoFechas = { start: '', end: '' }
    filters.created_range_string = null
  } else if (key === 'rangoModificacion') {
    filters.rangoModificacion = { start: '', end: '' }
    filters.updated_range_string = null
  } else if (key === 'edition_start') {
    filters.edition_start_from = ''
    filters.edition_start_to = ''
    filters.edition_range_string = null
  }
  // Casos especiales para Arrays (MultiSelect)
  else if (key === 'owner_user_ids') filters.owner_user_ids = []
  else if (key === 'status_lead_ids') filters.status_lead_ids = []
  else if (key === 'last_follow_ids') filters.last_follow_ids = []
  else if (key === 'interest_level_ids') filters.interest_level_ids = []
  else if (key === 'channel_ids') filters.channel_ids = []
  else if (key === 'query_ids') filters.query_ids = []
  else if (key === 'type_program_ids') filters.type_program_ids = []
  else if (key === 'model_modality_ids') filters.model_modality_ids = []
  // Casos simples
  else if (key === 'q') filters.q = ''
  else if (key === 'program_text') filters.program_text = ''
  else if (key === 'estado') filters.estado = null
  
  applyFilters()
}

function clearFilters() {
  Object.assign(filters, {
    q: '',
    program_text: '',
    estado: null,
    
    // Limpiar todos los arrays
    owner_user_ids: [],
    status_lead_ids: [],
    last_follow_ids: [],
    interest_level_ids: [],
    channel_ids: [],
    query_ids: [],
    type_program_ids: [],
    model_modality_ids: [],
    
    // Limpiar rangos de fecha
    rangoFechas: { start: '', end: '' },
    rangoModificacion: { start: '', end: '' },
    edition_start_from: '',
    edition_start_to: '',
    edition_range_string: null,
    created_range_string: null,
    updated_range_string: null
  })

  pagin.value.page = 1
  localStorage.removeItem('crm_leads_filter_state_v1')
  rebuildChips()
  fetchLeads()
}

 function rebuildChips() {
  const chips = []

  // --- Filtros de Texto / Fecha (Sin cambios) ---

  if (filters.q) {
    chips.push({ key: 'q', text: `Buscar: ${filters.q}` })
  }

  if (filters.rangoFechas?.start || filters.rangoFechas?.end) {
    chips.push({
      key: 'rangoFechas',
      text: `Reg: ${filters.rangoFechas.start} → ${filters.rangoFechas.end}`
    })
  }

  if (filters.rangoModificacion?.start || filters.rangoModificacion?.end) {
    chips.push({
      key: 'rangoModificacion',
      text: `Mod: ${filters.rangoModificacion.start} → ${filters.rangoModificacion.end}`
    })
  }

  if (filters.edition_start_from || filters.edition_start_to) {
    chips.push({
      key: 'edition_start',
      text: `Edición: ${filters.edition_start_from} → ${filters.edition_start_to}`
    })
  }

  if (filters.program_text) {
    chips.push({
      key: 'program_text',
      text: `Prog: ${filters.program_text}`
    })
  }

  // --- MultiSelect Chips (Ajustados para asignación directa) ---

  if (filters.owner_user_ids && filters.owner_user_ids.length > 0) {
    chips.push({
      key: 'owner_user_ids',
      text: `Asesores: ${filters.owner_user_ids.length}`,
      details: filters.owner_user_ids
    })
  }

  if (filters.status_lead_ids && filters.status_lead_ids.length > 0) {
    chips.push({
      key: 'status_lead_ids',
      text: `Estatus: ${filters.status_lead_ids.length}`,
      details: filters.status_lead_ids
    })
  }

  if (filters.last_follow_ids && filters.last_follow_ids.length > 0) {
    chips.push({
      key: 'last_follow_ids',
      text: `Seguimiento: ${filters.last_follow_ids.length}`,
      details: filters.last_follow_ids
    })
  }

  if (filters.interest_level_ids && filters.interest_level_ids.length > 0) {
    chips.push({
      key: 'interest_level_ids',
      text: `Interés: ${filters.interest_level_ids.length}`,
      details: filters.interest_level_ids
    })
  }

  if (filters.channel_ids && filters.channel_ids.length > 0) {
    chips.push({
      key: 'channel_ids',
      text: `Canales: ${filters.channel_ids.length}`,
      details: filters.channel_ids
    })
  }

  if (filters.query_ids && filters.query_ids.length > 0) {
    chips.push({
      key: 'query_ids',
      text: `Promoción: ${filters.query_ids.length}`,
      details: filters.query_ids
    })
  }

  if (filters.type_program_ids && filters.type_program_ids.length > 0) {
    chips.push({
      key: 'type_program_ids',
      text: `Tipo: ${filters.type_program_ids.length}`,
      details: filters.type_program_ids
    })
  }

  if (filters.model_modality_ids && filters.model_modality_ids.length > 0) {
    chips.push({
      key: 'model_modality_ids',
      text: `Modalidad: ${filters.model_modality_ids.length}`,
      details: filters.model_modality_ids
    })
  }

  activeFilterChips.value = chips
}

// === API FETCH ===
async function fetchLeads() {
  try {
    const activeFlag = filters.estado === 'Activo' ? '1'
      : filters.estado === 'Inactivo' ? '0'
      : null

    const { items, total: t } = await comercialService.leadList({
      q: filters.q || null,
      page: pagin.value.page,
      size: pagin.value.size,
      from_date: filters.rangoFechas?.start || null,
      to_date: filters.rangoFechas?.end || null,
      updated_from: filters.rangoModificacion?.start || null,
      updated_to: filters.rangoModificacion?.end || null,
      
      // Enviar arrays solo si tienen elementos
      status_lead_ids: filters.status_lead_ids.length ? filters.status_lead_ids : null,
      last_follow_ids: filters.last_follow_ids.length ? filters.last_follow_ids : null,
      channel_ids: filters.channel_ids.length ? filters.channel_ids : null,
      interest_level_ids: filters.interest_level_ids.length ? filters.interest_level_ids : null,
      query_ids: filters.query_ids.length ? filters.query_ids : null,
      type_program_ids: filters.type_program_ids.length ? filters.type_program_ids : null,
      model_modality_ids: filters.model_modality_ids.length ? filters.model_modality_ids : null,
      owner_user_ids: filters.owner_user_ids.length ? filters.owner_user_ids : null,
      
      program_text: filters.program_text || null,
      edition_start_from: filters.edition_start_from || null,
      edition_start_to: filters.edition_start_to || null,
      active: activeFlag
    })

    leadsRaw.value = items || []
    pagin.value.total = Number(t || 0)

    // Cargar owners si aún no están cargados
    if (filtroOwners.value.length === 0 && items?.length > 0) {
      await loadOwners()
    }
  } catch (e) {
    console.error('Error cargando leads:', e)
    leadsRaw.value = []
    pagin.value.total = 0
  }
}

async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(user => ({
      id: user.user_id,
      description: user.first_name
    }))
  } catch (e) {
    console.error('Error cargando asesores:', e)
    filtroOwners.value = []
  }
}

// === NAVEGACIÓN ===
function goNew() {
  router.push({ name: 'ComercialLeadsNew' })
}

function viewLead(lead) {
  router.push({ name: 'ComercialLeadsNew', query: { clone_from: lead.id } })
}

function editLead(lead) {
  router.push({ name: 'ComercialLeadDetalle', params: { id: lead.id } })
}

// === HELPERS PARA BADGES ===
function badgeForStatus(s) {
  const map = {
    'we_lead_status_interesado': 'badge-info',
    'we_lead_status_closed': 'badge-danger',
    'we_lead_status_atendido': 'badge-success',
    'we_lead_status_proximo': 'badge-warning',
    'we_lead_status_bought': 'badge-success',
    'we_lead_status_will_pay': 'badge-success',
    'we_lead_status_indiferente': 'badge-light',
    'we_lead_status_desestimado': 'badge-danger'
  }
  return map[s] || 'badge-neutral'
}

function badgeForInterest(s) {
  const map = {
    'we_lead_interest_high': 'badge-success',
    'we_lead_interest_medium': 'badge-warning',
    'we_lead_interest_low': 'badge-danger'
  }
  return map[s] || 'badge-neutral'
}

function badgeForFollow(s) {
  const map = {
    'we_follow_lead_pending': 'badge-light',
    'we_follow_lead_answered': 'badge-success',
    'we_follow_lead_no_answer': 'badge-danger'
  }
  return map[s] || 'badge-neutral'
}

// === MANEJO DE CAMBIOS EN DATEPICKER ===
function handleDateFilterChange(dateStr, type) {
  let start = ''
  let end = ''

  if (dateStr && dateStr.includes(' to ')) {
    const parts = dateStr.split(' to ')
    start = parts[0]
    end = parts[1]
  } else if (dateStr) {
    start = dateStr
    end = dateStr
  }

  // Asignar según el tipo
  if (type === 'created') {
    filters.rangoFechas.start = start
    filters.rangoFechas.end = end
    filters.created_range_string = dateStr
  } else if (type === 'updated') {
    filters.rangoModificacion.start = start
    filters.rangoModificacion.end = end
    filters.updated_range_string = dateStr
  } else if (type === 'edition_start') {
    filters.edition_start_from = start
    filters.edition_start_to = end
    filters.edition_range_string = dateStr
  }
}

// === LIFECYCLE ===
onMounted(() => {
  rebuildChips()
  fetchLeads()
})
</script>

<style scoped>
/* Contenedor Principal (Estilo FICO) */
.leads-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.6rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #6366f1; /* Color Indigo */
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

.card-body { padding: 1.25rem; }

/* Tabla Unificada */
.table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
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
.table.dense td, .table.dense thead th { padding: .4rem .6rem; }

.ta-center { text-align: center; }
.nowrap { white-space: nowrap; }
.fw-600 { font-weight: 600; }

.name { font-weight: 600; color: #1e293b; line-height: 1.2; font-size: 0.9rem; }
.muted { color: #6b7280; }
.text-dark { color: #111827; }
.text-primary { color: #4f46e5; }
.text-warning { color: #d97706; }
.small { font-size: 0.75rem; }
.x-small { font-size: 0.68rem; }
.minW { min-width: 120px; }

/* Badges (Pasteles) */
.badge { padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 600; display: inline-block; border: 1px solid transparent; }
.badge-neutral { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
.badge-light { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }
.badge-info { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
.badge-warning { background: #fef3c7; color: #92400e; border-color: #fde68a; }
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

/* Estilos de Modal */
.form-label { font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; display: block; }
.form-control { width: 100%; border: 1px solid #d1d5db; border-radius: 0.4rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
.form-control:focus { outline: none; border-color: #6366f1; ring: 2px rgba(99, 102, 241, 0.2); }
.section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
.program-filter-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; }
.empty-state { padding: 3rem; text-align: center; color: #9ca3af; font-style: italic; }
</style>
