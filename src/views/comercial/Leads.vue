<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        <span>Gestión Comercial</span>
        <span class="sub">Listado de Leads</span>
      </div>

      <div class="actions-bar">
        <button
          class="btn me-2"
          :class="isCompact ? 'bg-info text-light' : 'bg-outline-info text-dark'"
          @click="isCompact = !isCompact"
          title="Alternar entre vista agrupada y vista detallada por columnas"
        >
          <i class="fa-solid" :class="isCompact ? 'fa-list' : 'fa-table-columns'"></i>
          <span class="ms-1">Compactado</span>
        </button>
        
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
        <table class="table table-hover" :class="{ dense, 'compact-table': isCompact }">
          
          <thead>
            <tr v-if="!isCompact">
              <th class="ta-center">Acciones</th>
              <th>Status</th>
              <th>Contacto</th>
              <th>T. Consulta</th>
              <th>Programa / Interés</th>
              <th>Ini. Edición</th>
              <th>F. Pago</th>
              <th>Nivel Interés</th>
              <th>Registro</th>
              <th>Seguimiento</th>
            </tr>
            <tr v-else>
              <th class="ta-center">Acciones</th>
              <th>Fecha Reg.</th>
              <th>Status</th>
              <th>Teléfono</th>
              <th>Nombre</th>
              <th>T. Consulta</th>
              <th>Programa</th>
              <th>Tipo</th>
              <th>Modalidad</th>
              <th>Edición</th>
              <th>F. Pago</th>
              <th>Canal origen</th>
              <th>Medio</th>
              <th>Palabra Clave</th>
              <th>Estrategia</th>
              <th>Interés</th>
              <th>Asesor/Usuario</th>
              <th>Seguimiento</th>
            </tr>
          </thead>

          <tbody v-if="!isCompact">
            <tr v-for="l in leadsRaw" :key="l.id" 
                :class="[rowClassForStatus(l.cat_status_alias), { 'row-pressing': pressingRowId === l.id }]"
                @mousedown.left="startPress(l)" 
                @mouseup="cancelPress" 
                @mouseleave="cancelPress">
                
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm me-1" @click="editLead(l)" title="Editar"><i class="fa-solid fa-pen-to-square text-warning"></i></button>
                <button class="btn btn-outline btn-sm" @click="viewLead(l)" title="Clonar/Ver"><i class="fa-solid fa-clone text-primary"></i></button>
              </td>

              <td><span class="fw-600 small text-dark">{{ pipelineMap[l.cat_status_alias] || l.cat_status_lead_label || '—' }}</span></td>
              <td style="min-width:160px">
                <div class="d-flex flex-column">
                  <span class="name text-dark">{{ l.origin_phone }}</span>
                  <span class="small muted">{{ l.full_name_label || 'Sin nombre' }}</span>
                </div>
              </td>
              <td class="minW"><span class="badge badge-neutral">{{ queryMap[l.cat_promotion_alias] || '—' }}</span></td>
              <td style="min-width:280px">
                <div v-if="l.program_label">
                  <div class="name">{{ l.program_label }}</div>
                  <div class="small muted mt-1">
                    {{ l.cat_type_program_label }} <span v-if="l.cat_model_modality_label">• {{ l.cat_model_modality_label }}</span>
                  </div>
                </div>
                <div v-else class="muted small">—</div>
              </td>
              <td class="nowrap"><div class="font-mono small fw-600 text-primary">{{ l.edition_label || '—' }}</div></td>
              <td class="small nowrap text-success fw-bold">{{ l.pay_date || '—' }}</td>
              <td>
                <span v-if="l.cat_interest_alias" class="badge" :class="badgeForInterest(l.cat_interest_alias)">{{ interestMap[l.cat_interest_alias] }}</span>
                <span v-else class="muted small">—</span>
              </td>
              <td style="min-width:120px">
                <div v-if="l.user_registration_label">
                  <div class="small fw-600">{{ l.user_registration_label }}</div>
                  <div class="muted x-small">{{ l.registration_date }}</div>
                </div>
              </td>
              <td class="ta-center" style="min-width:140px">
                <div v-if="l.cat_last_follow_alias" class="badge d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
                  <span>{{ followMap[l.cat_last_follow_alias] }}</span>
                  <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75"></i>
                </div>
                <span v-else class="muted small">—</span>
              </td>
            </tr>
            <tr v-if="!leadsRaw.length"><td colspan="9" class="empty-state">No se encontraron leads con los filtros actuales.</td></tr>
          </tbody>

          <tbody v-else>
            <tr v-for="l in leadsRaw" :key="l.id" 
                :class="[rowClassForStatus(l.cat_status_alias), { 'row-pressing': pressingRowId === l.id }]"
                @mousedown.left="startPress(l)" 
                @mouseup="cancelPress" 
                @mouseleave="cancelPress">

              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm me-1" @click="editLead(l)" title="Editar"><i class="fa-solid fa-pen-to-square text-warning"></i></button>
                <button class="btn btn-outline btn-sm" @click="viewLead(l)" title="Clonar/Ver"><i class="fa-solid fa-clone text-primary"></i></button>
              </td>

              <td class="small nowrap">{{ l.registration_date }}</td>
              <td><span class="badge badge-neutral text-dark border">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span></td>
              <td class="nowrap fw-bold text-dark">{{ l.origin_phone }}</td>
              <td class="nowrap" style="min-width:120px">{{ l.full_name_label }}</td>
              <td class="small" style="min-width:120px">{{ l.cat_promotion_description || '—' }}</td>
              <td class="small fw-600 text-primary">{{ l.program_label || '—' }}</td>
              <td class="small" style="min-width:120px">{{ l.cat_type_program_label || '—' }}</td>
              <td class="small" style="min-width:120px">{{ l.cat_model_modality_label || '—' }}</td>
              <td class="nowrap small font-mono">{{ l.edition_label || '—' }}</td>
              <td>
                <div class="small fw-600 text-success">{{ l.pay_date || '—' }}</div>
              </td>
              <td class="small text-muted fst-italic">{{ l.cat_channel_description || '—' }}</td>
              <td class="small text-muted fst-italic">{{ l.cat_medium_contact_description || '—' }}</td>
              <td class="small text-muted fst-italic">{{ l.cat_word_description || '—' }}</td>
              <td class="small text-info">{{ l.cat_strategy_description || '—' }}</td>
              <td>
                <span v-if="l.cat_interest_alias" class="badge" :class="badgeForInterest(l.cat_interest_alias)">{{ l.cat_interest_description }}</span>
              </td>
              <td class="small">{{ l.user_registration_label }}</td>
              <td class="ta-center">
                <i v-if="l.cat_last_follow_alias" class="fa-solid fa-circle cursor-pointer" 
                   :class="l.cat_last_follow_alias === 'we_follow_lead_answered' ? 'text-success' : 'text-secondary'"
                   :title="l.cat_last_follow_alias"></i>
                <span v-else>—</span>
              </td>
            </tr>
            <tr v-if="!leadsRaw.length"><td colspan="17" class="empty-state">No se encontraron leads con los filtros actuales.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <BaseModal v-model="showFollowModal" title="Gestión Rápida de Contactos" size="xl">
    <div v-if="selectedFollowLead" class="d-flex flex-column h-100">
      <div class="px-4 py-3 bg-light border-bottom d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <div class="avatar-placeholder me-3 bg-white border text-primary rounded-circle d-flex align-items-center justify-content-center" style="width:45px; height:45px; font-size:1.2rem;">
            <i class="fa-regular fa-user"></i>
          </div>
          <div>
             <h6 class="mb-0 fw-bold text-dark">{{ selectedFollowLead.full_name_label || 'Prospecto sin nombre' }}</h6>
             <div class="d-flex gap-3 text-secondary small">
               <span><i class="fa-solid fa-phone me-1"></i>{{ selectedFollowLead.origin_phone }}</span>
               <span><i class="fa-solid fa-bullseye me-1"></i>{{ filtroPipeline.find(e => e.alias == selectedFollowLead.cat_status_alias)?.description || 'Estado desc.' }}</span>
             </div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" @click="addLocalAttempt">
          <i class="fa-solid fa-plus me-1"></i> Nuevo Intento
        </button>
      </div>
      <div class="p-3 bg-white scroll-area">
        <div v-if="editableHistory.length > 0">
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0" style="font-size: 0.85rem;">
              <thead class="table-light">
                <tr>
                  <th style="width: 50px;" class="text-center">#</th>
                  <th style="min-width: 140px;">Estado</th>
                  <th style="min-width: 140px;">Resultado</th>
                  <th style="min-width: 210px;">Fecha/Hora</th>
                  <th style="min-width: 200px;">Observación</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(attempt, idx) in editableHistory" :key="idx" :class="{'bg-blue-50': !attempt.id}">
                  <td class="text-center fw-bold text-muted align-top pt-2">{{ idx + 1 }}</td>
                  <td class="align-top">
                    <SearchSelect v-model="attempt.status_alias" :items="filtroFollow" label-field="description" value-field="alias" placeholder="Estado..." :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'" class="form-control-sm p-0 border-0" />
                  </td>
                  <td class="align-top">
                    <SearchSelect v-model="attempt.calling_alias" :items="filtroCalling" label-field="description" value-field="alias" placeholder="Resultado..." :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'" class="form-control-sm p-0 border-0" />
                  </td>
                  <td class="align-top">
                    <DateTime12 v-model="attempt.contact_datetime" :onlyHours="true" :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'" class="w-100" />
                  </td>
                  <td class="align-top">
                    <textarea v-model="attempt.response" class="form-control form-control-sm text-area-resize" rows="2" placeholder="Escribe una observación..." :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'"></textarea>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="text-center py-5 text-muted"><p>No hay historial previo. Agrega el primer intento.</p></div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100">
        <button class="btn btn-outline-secondary btn-sm" @click="showFollowModal = false">Cancelar</button>
        <button class="btn btn-success btn-sm px-4" @click="saveFastFollow" :disabled="isSavingFollow">
           <i class="fa-solid fa-save me-1"></i> {{ isSavingFollow ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </template>
  </BaseModal>

  <BaseModal v-model="showFilterModal" title="Filtros Avanzados" size="xl">
      <div class="px-3 py-2">
      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <label class="form-label"><i class="fa-solid fa-magnifying-glass me-1 text-primary"></i> Búsqueda General</label>
          <input v-model.trim="filters.q" type="text" class="form-control" placeholder="Nombre, teléfono..." @keyup.enter="applyFilters" />
        </div>
        <div class="col-md-3" v-if="!isComercial">
          <label class="form-label"><i class="fa-solid fa-user-tie me-1 text-primary"></i> Asesor Asignado</label>
          <MultiSelect v-model="filters.owner_user_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="USUARIO..." />
        </div>
        <div class="col-md-3">
          <label class="form-label"><i class="fa-solid fa-user-tag me-1 text-primary"></i> E. Cliente</label>
           <MultiSelect v-model="filters.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="E. CLIENTE..." />
        </div>
      </div>
      <hr class="border-secondary opacity-10 my-3">
<div class="mb-4">
  <h6 class="section-title">Estado, Origen y Ubicación</h6>
  <div class="row g-3">
    <div class="col-md-3 col-6">
      <label class="form-label">Estatus (Pipeline)</label>
      <MultiSelect v-model="filters.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="ESTATUS..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Seguimiento</label>
      <MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="SEGUIMIENTO..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Nivel de Interés</label>
      <MultiSelect v-model="filters.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="INTERES..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">País</label> <MultiSelect v-model="filters.code_country_ids" :items="filtroPaises" label-key="description" value-key="id" placeholder="PAÍS..." />
    </div>

    <div class="col-md-3 col-6">
      <label class="form-label">Canal (Red Social)</label>
      <MultiSelect v-model="filters.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="CANAL..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Medio de Contacto</label> <MultiSelect v-model="filters.medium_contact_ids" :items="filtroMedios" label-key="description" value-key="id" placeholder="MEDIO..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Estrategia</label>
      <MultiSelect v-model="filters.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="ESTRATEGIA..." />
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Palabra Clave</label>
      <MultiSelect v-model="filters.word_ids" :items="mktWordsCatalog" label-key="description" value-key="id" placeholder="PALABRA..." />
    </div>

    <div class="col-md-3 col-6">
      <label class="form-label">Origen Web</label>
      <select class="form-select form-select-sm" v-model="filters.web"><option :value="null">Todos</option><option value="Y">Sí (Web)</option><option value="N">No</option></select>
    </div>
    <div class="col-md-3 col-6">
      <label class="form-label">Es B2B</label>
      <select class="form-select form-select-sm" v-model="filters.b2b"><option :value="null">Todos</option><option value="Y">Sí (Empresas)</option><option value="N">No</option></select>
    </div>
  </div>
</div>
      <div class="program-filter-box mb-4">
        <h6 class="section-title text-primary mb-3"><i class="fa-solid fa-graduation-cap me-1"></i> Interés Académico</h6>
        <div class="row g-3 mb-3">
          <div class="col-md-6"><label class="form-label">Nombre del Programa</label><input v-model="filters.program_text" type="text" class="form-control" placeholder="Ej. Gestión de Proyectos..."></div>
          <div class="col-md-6"><label class="form-label">Promoción</label><MultiSelect v-model="filters.query_ids" :items="filtroQuery" label-key="description" value-key="id" placeholder="PROMO..." /></div>
        </div>
        <div class="row g-3 align-items-end">
          <div class="col-md-3 col-6"><label class="form-label">Tipo</label><MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="TIPO..." /></div>
          <div class="col-md-3 col-6"><label class="form-label">Modalidad</label><MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="MODALIDAD..." /></div>
          <div class="col-md-6"><label class="form-label">Rango Inicio Edición</label><BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango" @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'edition_start')" /></div>
        </div>
      </div>
      <div>
        <h6 class="section-title">Auditoría del Registro</h6>
        <div class="row g-3">
          <div class="col-md-4">
              <label class="form-label">Rango Fecha de Pago</label>
              <BaseDatePicker
                v-model="filters.pay_date_range_string"
                :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                placeholder="Seleccione rango"
                
                @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'pay_date')"
              />
            </div>
          <div class="col-md-4"><label class="form-label">Fecha de Creación</label><BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango" @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'created')" /></div>
          <div class="col-md-4"><label class="form-label">Última Modificación</label><BaseDatePicker v-model="filters.updated_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccione rango" @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'updated')" /></div>
              
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn btn-outline btn-sm" @click="clearFilters"><i class="fa-solid fa-eraser me-1"></i> Limpiar todo</button>
        <div class="d-flex gap-2">
          <button class="btn btn-outline btn-sm" @click="showFilterModal = false">Cerrar</button>
          <button class="btn btn-primary btn-sm px-4" @click="applyFilters"><i class="fa-solid fa-filter me-1"></i> Aplicar Filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, onMounted, inject, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'
import DateTime12 from '@/components/DateTime12.vue'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const comercialService = inject(ServiceKeys.Comercial)
const authService = inject(ServiceKeys.Auth)
const catalog = inject('catalog')

// === ESTADO ===
const showFilterModal = ref(false)
const showFollowModal = ref(false)
const isCompact = ref(true)
const dense = ref(false)
const activeFilterChips = ref([])
const leadsRaw = ref([])
const filtroOwners = ref([])
const pagin = ref({ size: 25, page: 1, total: 0 })

// === LONG PRESS ===
const pressingRowId = ref(null)
let pressTimer = null

// === PERMISOS ===
const storedUserStr = localStorage.getItem('user')
const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null
const isComercial = storedUser?.roles?.includes('COMERCIAL') &&
                    !storedUser?.roles?.includes('LIDER_COMERCIAL') &&
                    !storedUser?.roles?.includes('ADMIN') &&
                    !storedUser?.roles?.includes('GERENCIA');
const currentUserId = storedUser?.user_id;

// === FILTROS ===
const filters = reactive({
  q: '', program_text: '', estado: null,
  moment_ids: [], web: null, b2b: null,
  owner_user_ids: [], status_lead_ids: [], last_follow_ids: [],
  interest_level_ids: [], channel_ids: [], query_ids: [],
  type_program_ids: [], model_modality_ids: [], strategy_ids: [], word_ids: [],
  edition_range_string: null, created_range_string: null, updated_range_string: null,
  rangoFechas: { start: '', end: '' },
  pay_date_from: '',
  medium_contact_ids: [], // <--- NUEVO
  code_country_ids: [],   // <--- NUEVO
  pay_date_to: '',
  pay_date_range_string: null,
  rangoModificacion: { start: '', end: '' },
  edition_start_from: '', edition_start_to: ''
})

// === CATÁLOGOS ===
const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
const filtroModalidad = ref(catalog.options('we_modality') || [])
const filtroPipeline = ref(catalog.options('we_lead_status') || [])
const filtroCanales = ref(catalog.options('we_social_media') || [])
const filtroFollow = ref(catalog.options('we_follow_lead') || [])
const filtroMoment = ref(catalog.options('we_moment') || [])
const filtroQuery = ref(catalog.options('we_category_query') || [])
const filtroInterest = ref(catalog.options('we_lead_interest') || [])
const strategyCatalog = ref(catalog.options('we_type_strategy') || [])
const mktWordsCatalog = ref(catalog.options('we_key_word') || [])
const filtroCalling = ref(catalog.options('we_calling') || [])
const filtroMedios = ref(catalog.options('we_social_media') || []) // Ojo: we_medium_contact
const filtroPaises = ref(catalog.options('we_country') || [])   // Ojo: we_code_country
// === MAPAS COMPUTADOS (OPTIMIZACIÓN) ===
const createMap = (arr) => {
  if (!Array.isArray(arr)) return {}
  return arr.reduce((acc, item) => { acc[item.alias] = item.description; return acc }, {})
}
const pipelineMap = computed(() => createMap(filtroPipeline.value))
const queryMap    = computed(() => createMap(filtroQuery.value))
const interestMap = computed(() => createMap(filtroInterest.value))
const followMap   = computed(() => createMap(filtroFollow.value))

// === PERSISTENCIA ===
const { saveState } = useTablePersistence('crm_leads_filter_state_v1', filters, pagin)

// === VARIABLES MODAL FOLLOW ===
const editableHistory = ref([])
const isSavingFollow = ref(false)
const selectedFollowLead = ref(null)

async function parseQueryAndApply() {
  const q = route.query
  const hasQueryParams = Object.keys(q).length > 0
  
  // Si no hay parámetros, no hacemos nada
  if (!hasQueryParams) return false

  // Limpiamos filtros previos sin recargar (false)
  clearFilters(false)

  // --- HELPER: Convierte "1,2,3" -> [{id:1, description:'...'}, ...] ---
  const hydrate = (key, catalogRef) => {
    // 1. Si no existe el parámetro en la URL, retornar array vacío
    if (!q[key]) return []

    // 2. Obtener array de IDs numéricos
    const ids = q[key].split(',').map(n => parseInt(n)).filter(n => !isNaN(n))

    // 3. Si el catálogo no está listo, devolvemos solo los IDs para no romper la lógica
    if (!catalogRef || !catalogRef.value || catalogRef.value.length === 0) {
      return ids
    }

    // 4. Mapeamos los IDs a los objetos del catálogo
    // filter(Boolean) elimina los 'undefined' si un ID no se encuentra
    return ids.map(id => catalogRef.value.find(item => item.id === id)).filter(Boolean)
  }

  // --- A. FILTROS DE FECHA Y TEXTO (Simples) ---
  if (q.from_date || q.to_date) {
    filters.rangoFechas = { start: q.from_date || '', end: q.to_date || '' }
    if (q.from_date) {
      filters.created_range_string = `${q.from_date} a ${q.to_date || q.from_date}`
    }
  }

  if (q.pay_date_from || q.pay_date_to) {
    filters.pay_date_from = q.pay_date_from || ''
    filters.pay_date_to = q.pay_date_to || ''
    if (q.pay_date_from) {
      filters.pay_date_range_string = `${q.pay_date_from} a ${q.pay_date_to || q.pay_date_from}`
    }
  }

  if (q.program_text) filters.program_text = q.program_text
  if (q.web) filters.web = q.web
  if (q.b2b) filters.b2b = q.b2b


  // --- B. FILTROS DE SELECCIÓN MÚLTIPLE (Hidratados con Objetos) ---
  // Nota: Pasamos la referencia reactiva del catálogo (.value no es necesario aquí, se pasa la ref)
  
  if (q.owner_user_ids)     filters.owner_user_ids     = hydrate('owner_user_ids', filtroOwners)
  if (q.status_lead_ids)    filters.status_lead_ids    = hydrate('status_lead_ids', filtroPipeline)
  if (q.strategy_ids)       filters.strategy_ids       = hydrate('strategy_ids', strategyCatalog)
  if (q.channel_ids)        filters.channel_ids        = hydrate('channel_ids', filtroCanales)
  if (q.word_ids)           filters.word_ids           = hydrate('word_ids', mktWordsCatalog)
  if (q.medium_contact_ids) filters.medium_contact_ids = hydrate('medium_contact_ids', filtroMedios)
  if (q.code_country_ids)   filters.code_country_ids   = hydrate('code_country_ids', filtroPaises)
  if (q.interest_level_ids) filters.interest_level_ids = hydrate('interest_level_ids', filtroInterest)
  if (q.query_ids)          filters.query_ids          = hydrate('query_ids', filtroQuery)
  if (q.last_follow_ids)    filters.last_follow_ids    = hydrate('last_follow_ids', filtroFollow)
  if (q.moment_ids)         filters.moment_ids         = hydrate('moment_ids', filtroMoment)
  
  // Los filtros de programa que faltaban antes:
  if (q.type_program_ids)   filters.type_program_ids   = hydrate('type_program_ids', filtroTiposPrograma)
  if (q.model_modality_ids) filters.model_modality_ids = hydrate('model_modality_ids', filtroModalidad)

  // Limpiamos la URL para que quede limpia visualmente
  await router.replace({ query: {} })

  return true // Retornamos true para indicar que SÍ se aplicaron filtros externos
}
// === LOGICA MODAL SEGUIMIENTO (Restaurada) ===

function openFollowModal(lead) {
  // 1. Asignamos el lead seleccionado
  selectedFollowLead.value = lead

  try {
    let rawDetails = lead.follow_details;

    // 2. Parseo seguro de JSON si viene como string
    if (typeof rawDetails === 'string') {
      try {
        rawDetails = JSON.parse(rawDetails);
      } catch (e) {
        console.warn('No se pudo parsear follow_details', e);
        rawDetails = [];
      }
    }

    // 3. Mapeo para la tabla editable
    if (Array.isArray(rawDetails)) {
      editableHistory.value = rawDetails
        .map(d => {
          if (!d) return null;
          return {
            id: d?.id || d?.lead_contact_attempt_id,
            status_alias: d?.cat_status_alias || d?.cat_status_label,
            calling_alias: d?.cat_result_alias || d?.cat_result_label,
            contact_datetime: d?.contact_datetime
                ? String(d.contact_datetime).replace('T', ' ').slice(0, 16)
                : '',
            response: d?.response || ''
          };
        })
        .filter(item => item !== null);
    } else {
      editableHistory.value = [];
    }
  } catch (error) {
    console.error("Error procesando historial:", error);
    editableHistory.value = [];
  }

  // 4. Abrir modal
  showFollowModal.value = true;
}


async function saveFastFollow() {
  if (!selectedFollowLead.value) return
  isSavingFollow.value = true
  
  try {
    const attemptsPayload = editableHistory.value.map(item => ({
       id: item.id,
       cat_status: getIdFromAlias(item.status_alias, filtroFollow.value),
       cat_result: getIdFromAlias(item.calling_alias, filtroCalling.value),
       contact_datetime: item.contact_datetime,
       response: item.response
    }))

    // Enviamos solo los intentos de contacto para actualizar
    await comercialService.leadUpdate({
        id: selectedFollowLead.value.id,
        lead: {}, // Lead vacío para no tocar datos del perfil
        contact_attempts: attemptsPayload
    })

    toast.success('Seguimiento actualizado correctamente')
    showFollowModal.value = false
    fetchLeads() // Recargamos la lista para ver cambios de color/estado
  } catch (error) {
    console.error(error)
    toast.error('Error al guardar el seguimiento')
  } finally {
    isSavingFollow.value = false
  }
}
// === CHIPS INTELIGENTES MEJORADO ===
function rebuildChips() {
  const chips = []
  
  // Helper Maestro: Maneja tanto IDs numéricos (URL) como Objetos (MultiSelect local)
  const resolveNames = (items, catalogRef) => {
    if (!items || items.length === 0) return ''
    
    return items.map(item => {
      let id = item
      if (typeof item === 'object' && item !== null) {
        id = item.id ?? item.value
      }
      const found = catalogRef.find(c => c.id == id || c.alias == id)
      return found ? found.description : id
    }).join(', ')
  }

  // A. Filtros Simples
  if (filters.q) chips.push({ key: 'q', text: `Buscar: ${filters.q}` })
  if (filters.rangoFechas?.start) chips.push({ key: 'rangoFechas', text: `Reg: ${filters.rangoFechas.start} → ${filters.rangoFechas.end}` })
  if (filters.program_text) chips.push({ key: 'program_text', text: `Prog: ${filters.program_text}` })

  // B. Filtros Arrays
  if (filters.status_lead_ids?.length) {
     chips.push({ key: 'status_lead_ids', text: `Estatus: ${resolveNames(filters.status_lead_ids, filtroPipeline.value)}` })
  }
  if (filters.strategy_ids?.length) {
     chips.push({ key: 'strategy_ids', text: `Estrat: ${resolveNames(filters.strategy_ids, strategyCatalog.value)}` })
  }
  if (filters.channel_ids?.length) {
     chips.push({ key: 'channel_ids', text: `Canal: ${resolveNames(filters.channel_ids, filtroCanales.value)}` })
  }
  if (filters.last_follow_ids?.length) {
     chips.push({ key: 'last_follow_ids', text: `Seguim: ${resolveNames(filters.last_follow_ids, filtroFollow.value)}` })
  }
  if (filters.interest_level_ids?.length) {
     chips.push({ key: 'interest_level_ids', text: `Interés: ${resolveNames(filters.interest_level_ids, filtroInterest.value)}` })
  }
  if (filters.moment_ids?.length) {
     chips.push({ key: 'moment_ids', text: `Etapa: ${resolveNames(filters.moment_ids, filtroMoment.value)}` })
  }
  if (filters.type_program_ids?.length) {
    chips.push({ key: 'type_program_ids', text: `Tipo: ${resolveNames(filters.type_program_ids, filtroTiposPrograma.value)}` })
}
if (filters.model_modality_ids?.length) {
    chips.push({ key: 'model_modality_ids', text: `Modalidad: ${resolveNames(filters.model_modality_ids, filtroModalidad.value)}` })
}
  if (filters.owner_user_ids?.length && !isComercial) {
     chips.push({ key: 'owner_user_ids', text: `Asesor: ${resolveNames(filters.owner_user_ids, filtroOwners.value)}` })
  }
  if (filters.medium_contact_ids?.length) {
     chips.push({ key: 'medium_contact_ids', text: `Medio: ${resolveNames(filters.medium_contact_ids, filtroMedios.value)}` })
  }
  if (filters.code_country_ids?.length) {
     chips.push({ key: 'code_country_ids', text: `País: ${resolveNames(filters.code_country_ids, filtroPaises.value)}` })
  }
  if (filters.word_ids?.length) {
     chips.push({ key: 'word_ids', text: `Palabra: ${resolveNames(filters.word_ids, mktWordsCatalog.value)}` })
  }
  if (filters.pay_date_from) {
    chips.push({ 
      key: 'pay_date', 
      text: `Pago: ${filters.pay_date_from} → ${filters.pay_date_to}` 
    });
  }
  // --- FALTA ESTE BLOQUE ---
  if (filters.query_ids?.length) {
     chips.push({ key: 'query_ids', text: `Promoción: ${resolveNames(filters.query_ids, filtroQuery.value)}` })
  }
  // -------------------------

  // C. Filtros Booleanos/String
  if (filters.web) chips.push({ key: 'web', text: `Web: ${filters.web === 'Y' ? 'Sí' : 'No'}` })
  if (filters.b2b) chips.push({ key: 'b2b', text: `B2B: ${filters.b2b === 'Y' ? 'Sí' : 'No'}` })

  activeFilterChips.value = chips
}
// === API ===
async function fetchLeads() {
  try {
    const activeFlag = filters.estado === 'Activo' ? '1' : filters.estado === 'Inactivo' ? '0' : null
    const extractIds = (arr) => {
      if (!Array.isArray(arr)) return []
      return arr.map(item => (typeof item === 'object' && item !== null) ? (item.id ?? item.value) : item)
    }

    const { items, total: t } = await comercialService.leadList({
      q: filters.q || null,
      page: pagin.value.page,
      pay_date_from: filters.pay_date_from || null, // <--- AÑADIR
    pay_date_to: filters.pay_date_to || null,     // <--- AÑADIR
      size: pagin.value.size,
      from_date: filters.rangoFechas?.start || null,
      medium_contact_ids: extractIds(filters.medium_contact_ids),
       code_country_ids: extractIds(filters.code_country_ids),
      to_date: filters.rangoFechas?.end || null,
      updated_from: filters.rangoModificacion?.start || null,
      updated_to: filters.rangoModificacion?.end || null,
      
      owner_user_ids: extractIds(filters.owner_user_ids),
      status_lead_ids: extractIds(filters.status_lead_ids),
      moment_ids: extractIds(filters.moment_ids),
      strategy_ids: extractIds(filters.strategy_ids),
      word_ids: extractIds(filters.word_ids),
      last_follow_ids: extractIds(filters.last_follow_ids),
      channel_ids: extractIds(filters.channel_ids),
      interest_level_ids: extractIds(filters.interest_level_ids),
      query_ids: extractIds(filters.query_ids),
      type_program_ids: extractIds(filters.type_program_ids),
      model_modality_ids: extractIds(filters.model_modality_ids),
      
      web: filters.web || null,
      b2b: filters.b2b || null,
      program_text: filters.program_text || null,
      edition_start_from: filters.edition_start_from || null,
      edition_start_to: filters.edition_start_to || null,
      active: activeFlag
    })

    leadsRaw.value = items || []
    pagin.value.total = Number(t || 0)

    if (filtroOwners.value.length === 0 && items?.length > 0) {
      await loadOwners()
    }
  } catch (e) {
    console.error('Error cargando leads:', e)
    leadsRaw.value = []
    pagin.value.total = 0
  }
}

// === EVENTOS UI ===
function startPress(lead) {
  pressingRowId.value = lead.id
  pressTimer = setTimeout(() => { openFollowModal(lead); cancelPress() }, 2000)
}
function cancelPress() {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
  pressingRowId.value = null
}

function clearFilters(reload = true) {
  Object.assign(filters, {
    q: '', program_text: '', estado: null, owner_user_ids: [], status_lead_ids: [], moment_ids: [],
    strategy_ids: [], word_ids: [], last_follow_ids: [], interest_level_ids: [], channel_ids: [],
    query_ids: [], type_program_ids: [], model_modality_ids: [], web: null, b2b: null,
    rangoFechas: { start: '', end: '' }, rangoModificacion: { start: '', end: '' },
    edition_start_from: '', edition_start_to: '',
    edition_range_string: null, created_range_string: null, updated_range_string: null
  })
  if (isComercial && currentUserId) filters.owner_user_ids = [currentUserId]
  
  if (reload) {
    pagin.value.page = 1
    localStorage.removeItem('crm_leads_filter_state_v1')
    rebuildChips()
    fetchLeads()
  }
}

// ... resto de funciones (addLocalAttempt, saveFastFollow, etc.) idénticas ...
// Asegurate de incluir loadOwners, openFollowModal, etc.
async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(user => ({ id: user.user_id, description: user.first_name }))
  } catch (e) { console.error(e) }
}
function openFilterModal() { showFilterModal.value = true }
function applyFilters() { showFilterModal.value = false; pagin.value.page = 1; saveState(); rebuildChips(); fetchLeads() }
function clearFilter(key) {
    // ... logica de borrado individual ...
    if (key === 'rangoFechas') { filters.rangoFechas = { start: '', end: '' }; filters.created_range_string = null }
    else if (Array.isArray(filters[key])) filters[key] = []
    else if (key === 'pay_date') {
      filters.pay_date_from = '';
      filters.pay_date_to = '';
      filters.pay_date_range_string = null;
    }
    else filters[key] = null;
    applyFilters()
    
}
function handleDateFilterChange(dateStr, type) {
  let start = '', end = ''
  if (dateStr && dateStr.includes(' a ')) { [start, end] = dateStr.split(' a ') } else if (dateStr) { start = end = dateStr }
  if (type === 'created') { filters.rangoFechas = {start, end}; filters.created_range_string = dateStr }
  else if (type === 'updated') { filters.rangoModificacion = {start, end}; filters.updated_range_string = dateStr }
  else if (type === 'pay_date') {
    filters.pay_date_from = start;
    filters.pay_date_to = end;
    filters.pay_date_range_string = dateStr;
  }
  else if (type === 'edition_start') { filters.edition_start_from = start; filters.edition_start_to = end; filters.edition_range_string = dateStr }
}
// Helpers visuales
function rowClassForStatus(s) { const map = { 'we_lead_status_insc': 'row-inscrito', 'we_lead_status_interesado': 'row-blue', 'we_lead_status_bought': 'row-emerald', 'we_lead_status_will_pay': 'row-emerald', 'we_lead_status_proximo': 'row-yellow', 'we_lead_status_indiferente': 'row-gray', 'we_lead_status_closed': 'row-red', 'we_lead_status_desestimado': 'row-red' }; return map[s] || '' }
function badgeForInterest(s) { const map = { 'we_lead_interest_high': 'badge-success', 'we_lead_interest_medium': 'badge-warning', 'we_lead_interest_low': 'badge-danger' }; return map[s] || 'badge-neutral' }
function badgeForFollow(s) { const map = { 'we_follow_lead_pending': 'badge-light', 'we_follow_lead_answered': 'badge-success', 'we_follow_lead_no_answer': 'badge-danger' }; return map[s] || 'badge-neutral' }
function addLocalAttempt() { const now = new Date(); const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16); editableHistory.value.unshift({ id: null, status_alias: 'we_follow_lead_pending', calling_alias: null, contact_datetime: isoString, response: '' }) }
function getIdFromAlias(alias, catalogArray) { if (!alias || !catalogArray) return null; const item = catalogArray.find(i => i.alias === alias); return item ? item.id : null }
function goNew() { router.push({ name: 'ComercialLeadsNew' }) }
function viewLead(lead) { router.push({ name: 'ComercialLeadsNew', query: { clone_from: lead.id } }) }
function editLead(lead) { router.push({ name: 'ComercialLeadDetalle', params: { id: lead.id } }) }
function handlePaginationChange() {
  fetchLeads()
}

onMounted(async () => {
  if (isComercial && currentUserId) {
    filters.owner_user_ids = [currentUserId]
  }

  loadOwners()

  // Aplicar URL params si los hay, LUEGO rebuilding chips
  await parseQueryAndApply()
  rebuildChips()  // ✅ Siempre al final, cuando los filtros ya están estables
  
  // Disparar en paralelo (fix de performance anterior)
  fetchLeads()
})
</script>

<style scoped>
/* Los mismos estilos optimizados que te pasé antes */
.leads-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 0.6rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 4px solid #6366f1; margin-bottom: 2rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #f3f4f6; }
.title { display: flex; flex-direction: column; gap: 4px; }
.title span { font-weight: 700; font-size: 1.1rem; color: #111827; }
.title .sub { font-weight: 600; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
.card-body { padding: 1.25rem; }
.table-responsive { width: 100%; overflow-x: auto; margin-top: 1rem; }
.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; color: #374151; }
.table thead th { background: #f9fafb; padding: 0.85rem 0.75rem; text-align: left; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
.table td { padding: 0.85rem 0.75rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.table-hover tbody tr:hover { background-color: #f8fafc; }
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
.badge { padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 600; display: inline-block; border: 1px solid transparent; }
.badge-neutral { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
.badge-light { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }
.badge-info { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
.badge-warning { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.badge-success { background: #ecfdf5; color: #065f46; border-color: #d1fae5; }
.badge-danger { background: #fef2f2; color: #991b1b; border-color: #fee2e2; }
.btn { border: 1px solid #d1d5db; padding: 0.45rem 0.75rem; border-radius: 0.4rem; cursor: pointer; transition: all 0.2s; background: #fff; font-size: 0.8rem; font-weight: 600; }
.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
.btn-primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.btn-primary:hover { background: #4338ca; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.form-label { font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; display: block; }
.form-control { width: 100%; border: 1px solid #d1d5db; border-radius: 0.4rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
.form-control:focus { outline: none; border-color: #6366f1; ring: 2px rgba(99, 102, 241, 0.2); }
.section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
.program-filter-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; }
.empty-state { padding: 3rem; text-align: center; color: #9ca3af; font-style: italic; }
.row-inscrito, .row-inscrito > td { background-color: #d1fae5 !important; }
.row-inscrito { border-left: 4px solid #059669 !important; }
.row-inscrito:hover, .row-inscrito:hover > td { background-color: #a7f3d0 !important; }
.row-blue, .row-blue > td { background-color: #f0f9ff !important; }
.row-blue:hover, .row-blue:hover > td { background-color: #e0f2fe !important; }
.row-emerald, .row-emerald > td { background-color: #ecfdf5 !important; }
.row-emerald { border-left: 3px solid #10b981 !important; }
.row-emerald:hover, .row-emerald:hover > td { background-color: #d1fae5 !important; }
.row-yellow, .row-yellow > td { background-color: #fffbeb !important; }
.row-yellow:hover, .row-yellow:hover > td { background-color: #fef3c7 !important; }
.row-red, .row-red > td { background-color: #fef2f2 !important; opacity: 0.95; }
.row-red:hover, .row-red:hover > td { background-color: #fee2e2 !important; }
.row-gray, .row-gray > td { background-color: #f8fafc !important; color: #64748b; }
.row-gray:hover, .row-gray:hover > td { background-color: #f1f5f9 !important; }
tr, td { transition: background-color 0.2s ease; }
.cursor-pointer { cursor: pointer; }
.avatar-placeholder { width: 40px; height: 40px; background-color: #e0e7ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.scroll-area { max-height: 60vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.compact-table { font-size: 0.75rem !important; }
.compact-table th, .compact-table td { padding: 0.25rem 0.5rem !important; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.compact-table td:hover { white-space: normal; overflow: visible; position: relative; z-index: 10; background-color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
tr { position: relative; user-select: none; will-change: background-color; transition: background-color 0.1s ease-in-out; }
tr::after { content: ""; position: absolute; left: 0; bottom: 0; top: 0; height: 100%; width: 0%; background-color: rgba(99, 102, 241, 0.25); transition: width 0.3s ease-out; pointer-events: none; z-index: 5; }
tr.row-pressing::after { width: 100%; transition: width 2s linear; }
</style>