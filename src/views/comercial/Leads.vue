<template>
  <div class="card leads-card">
    <div class="card-header">
      <div class="title">
        <span>Gestión Comercial</span>
        <span class="sub">Listado de Leads</span>
      </div>

      <div class="actions-bar">
        <button
          class="btn btn-outline-secondary me-2"
          @click="showMetaModal = true"
          :disabled="!leadsRaw.length"
          title="Ver estadísticas de la lista actual"
        >
          <i class="fa-solid fa-chart-pie me-1"></i> Resumen
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
        <table class="table table-hover" :class="{ dense }">
          <thead>
            <tr>
              <th class="ta-center">Acciones</th>
              <th>Status</th>
              <th>Contacto</th>
              <th>T. Consulta</th>
              <th>Programa / Interés</th>
              <th>Ini. Edición</th>
              <th>Nivel Interés</th>
              <th>Registro</th>
              <th>Seguimiento</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in leadsRaw" :class="rowClassForStatus(l.cat_status_alias)" :key="l.id">
              <td class="ta-center nowrap">
                <button class="btn btn-outline btn-sm me-1" @click="editLead(l)" title="Editar">
                  <i class="fa-solid fa-pen-to-square text-warning"></i>
                </button>
                <button class="btn btn-outline btn-sm" @click="viewLead(l)" title="Clonar/Ver">
                  <i class="fa-solid fa-clone text-primary"></i>
                </button>
              </td>
              <td>
                <span class="fw-600 small text-dark">
                  {{ filtroPipeline.find(e => e.alias == l.cat_status_alias)?.description }}
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

              <td class="ta-center" style="min-width:140px">
                <div
                  v-if="l.cat_last_follow_alias"
                  class="badge cursor-pointer hover-scale d-inline-flex align-items-center gap-1"
                  :class="badgeForFollow(l.cat_last_follow_alias)"
                  @click.stop="openFollowModal(l)"
                  title="Ver detalle del último intento"
                >
                  <span>{{ filtroFollow?.find(e=>e.alias==l.cat_last_follow_alias)?.description }}</span>
                  <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75" style="font-size: 0.75rem;"></i>
                </div>
                <span v-else class="muted small">—</span>
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

  <BaseModal v-model="showFollowModal" title="Gestión Rápida de Contactos" size="lg">
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
               <span><i class="fa-solid fa-bullseye me-1"></i>{{ selectedFollowLead.cat_status_lead_label || 'Estado desc.' }}</span>
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
                    <SearchSelect
                      v-model="attempt.status_alias"
                      :items="filtroFollow"
                      label-field="description"
                      value-field="alias"
                      placeholder="Estado..."
                      :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'"
                      class="form-control-sm p-0 border-0"
                    />
                  </td>
                  <td class="align-top">
                    <SearchSelect
                      v-model="attempt.calling_alias"
                      :items="filtroCalling"
                      label-field="description"
                      value-field="alias"
                      placeholder="Resultado..."
                      :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'"
                      class="form-control-sm p-0 border-0"
                    />
                  </td>
                  <td class="align-top">
                    <DateTime12
                      v-model="attempt.contact_datetime"
                      :onlyHours="true"
                      :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'"
                      class="w-100"
                    />
                  </td>
                  <td class="align-top">
                    <textarea
                      v-model="attempt.response"
                      class="form-control form-control-sm text-area-resize"
                      rows="2"
                      placeholder="Escribe una observación..."
                      :disabled="!!attempt.id && attempt.status_alias !== 'we_follow_lead_pending'"
                    ></textarea>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="text-center py-5 text-muted">
           <p>No hay historial previo. Agrega el primer intento.</p>
        </div>
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

  <BaseModal v-model="showFilterModal" title="Filtros Avanzados" size="lg">
    <div class="px-3 py-2">

      <div class="row g-3 mb-4">
        <div class="col-md-6">
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

        <div class="col-md-3" v-if="!isComercial">
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
        <div class="col-md-3">
          <label class="form-label">
            <i class="fa-solid fa-user-tag me-1 text-primary"></i> E. Cliente
          </label>
           <MultiSelect
              v-model="filters.moment_ids"
                :items="filtroMoment"
                label-key="description"
                value-key="id"
                placeholder="E. CLIENTE..."
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
                value-key="id"
                placeholder="ESTATUS..."
            />
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Origen Web</label>
            <select class="form-select form-select-sm" v-model="filters.web">
              <option :value="null">Todos</option>
              <option value="Y">Sí (Web)</option>
              <option value="N">No</option>
            </select>
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Es B2B</label>
            <select class="form-select form-select-sm" v-model="filters.b2b">
              <option :value="null">Todos</option>
              <option value="Y">Sí (Empresas)</option>
              <option value="N">No</option>
            </select>
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

  <BaseModal v-model="showMetaModal" title="Resumen de Leads en Pantalla" size="xl">
    <div class="meta-dashboard p-3" v-if="metaSummary">
      <div class="row g-4 mb-4">
        <div class="col-lg-8">
          <div class="meta-card h-100 card border-0 shadow-sm">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-2">
              <h6 class="mb-0 fw-bold"><i class="fa-solid fa-layer-group text-primary me-2"></i> Por Tipo de Programa</h6>
            </div>
            <div class="card-body">
              <div class="row g-2">
                <div v-for="(line, idx) in metaSummary.byProgramType" :key="idx" class="col-md-4 col-6">
                  <div class="p-3 rounded border bg-light h-100 d-flex justify-content-between align-items-center">
                    <span class="fw-600 text-secondary" style="font-size: 0.85rem;">{{ line.name }}</span>
                    <span class="badge bg-white text-dark border fs-6">{{ line.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="meta-card h-100 card border-0 shadow-sm">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-2">
              <h6 class="mb-0 fw-bold"><i class="fa-solid fa-filter text-success me-2"></i> Pipeline (Estado)</h6>
            </div>
            <div class="card-body">
              <div class="d-flex flex-column gap-3">
                <div v-for="(cat, idx) in metaSummary.byStatus.slice(0, 5)" :key="idx">
                  <div class="d-flex justify-content-between mb-1 small fw-bold">
                    <span>{{ cat.name }}</span>
                    <span>{{ cat.count }}</span>
                  </div>
                  <div class="progress" style="height: 6px;">
                    <div class="progress-bar bg-info" role="progressbar"
                         :style="{ width: (cat.count / metaSummary.general.total * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-md-6">
          <div class="meta-card h-100 card border-0 shadow-sm">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-2">
              <h6 class="mb-0 fw-bold"><i class="fa-solid fa-bullhorn text-warning me-2"></i> Canal de Origen</h6>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm table-hover mb-0 align-middle small">
                  <thead class="table-light">
                    <tr>
                      <th class="px-3">Canal</th>
                      <th class="text-center px-3">Cantidad</th>
                      <th class="text-end px-3">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(type, idx) in metaSummary.byChannel" :key="idx">
                      <td class="px-3 fw-500">{{ type.name }}</td>
                      <td class="text-center fw-bold text-dark">{{ type.count }}</td>
                      <td class="text-end px-3 text-muted">{{ Math.round((type.count / metaSummary.general.total) * 100) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="meta-card h-100 card border-0 shadow-sm">
            <div class="card-header bg-white border-bottom-0 pt-3 pb-2">
              <h6 class="mb-0 fw-bold"><i class="fa-solid fa-temperature-half text-danger me-2"></i> Termómetro (Interés)</h6>
            </div>
            <div class="card-body p-0">
               <div class="table-responsive">
                <table class="table table-sm table-hover mb-0 align-middle small">
                  <thead class="table-light">
                    <tr>
                      <th class="px-3">Nivel</th>
                      <th class="text-center px-3">Cant.</th>
                      <th class="px-3">Acción Sugerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(seg, idx) in metaSummary.byInterest" :key="idx">
                      <td class="px-3">
                        <span class="badge" :class="getBadgeClassInterest(seg.code)">{{ seg.name }}</span>
                      </td>
                      <td class="text-center fw-bold">{{ seg.count }}</td>
                      <td class="px-3 text-muted fst-italic">{{ seg.action }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-outline-secondary btn-sm" @click="showMetaModal = false">Cerrar</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, onMounted, inject, computed } from 'vue'
import { useRouter } from 'vue-router'
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

const showMetaModal = ref(false)
const toast = useToast()
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

// === 1. LÓGICA DE PERMISOS ===
const storedUserStr = localStorage.getItem('user')
const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null

// Detectamos si tiene rol COMERCIAL (y NO es Admin/Gerencia)
const isComercial = storedUser?.roles?.includes('COMERCIAL') &&
                    !storedUser?.roles?.includes('ADMIN') &&
                    !storedUser?.roles?.includes('GERENCIA');

const currentUserId = storedUser?.user_id;

// === FILTROS ===
const filters = reactive({
  q: '',
  program_text: '',
  estado: null,
  moment_ids: [],
  // Arrays para MultiSelect
  web: null, // Nuevo
  b2b: null, // Nuevo
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
const filtroMoment = ref(catalog.options('we_moment') || [])
const filtroQuery = ref(catalog.options('we_category_query') || [])
const filtroInterest = ref(catalog.options('we_lead_interest') || [])

// === PERSISTENCIA ===
const { saveState } = useTablePersistence('crm_leads_filter_state_v1', filters, pagin)

// === LOGICA RESUMEN (DASHBOARD LOCAL) ===
const metaSummary = computed(() => {
  const data = leadsRaw.value || []
  const total = data.length

  if (total === 0) return null

  // Contadores Generales
  let b2bCount = 0
  let salesCount = 0
  let highInterestCount = 0

  // Mapas para agrupaciones
  const statusMap = {}
  const typeMap = {}   // Tipo Programa
  const channelMap = {} // Canal
  const interestMap = {} // Interés

  data.forEach(l => {
    // 1. General
    if (l.b2b === 'Y' || l.b2b === true) b2bCount++
    // Detectar venta (ajusta los alias según tu catálogo real si difieren)
    if (['we_lead_status_bought', 'we_lead_status_insc', 'we_lead_status_matriculado'].includes(l.cat_status_alias)) {
        salesCount++
    }
    if (l.cat_interest_alias === 'we_lead_interest_high') {
        highInterestCount++
    }

    // 2. Agrupar por Status (Pipeline)
    const statusName = l.cat_status_lead_label || 'Sin Estado'
    statusMap[statusName] = (statusMap[statusName] || 0) + 1

    // 3. Agrupar por Tipo Programa (Lines)
    const typeName = l.cat_type_program_label || 'Otros'
    typeMap[typeName] = (typeMap[typeName] || 0) + 1

    // 4. Agrupar por Canal
    const channelName = l.cat_channel_label || 'Desconocido'
    channelMap[channelName] = (channelMap[channelName] || 0) + 1

    // 5. Agrupar por Interés (Segments)
    const intLabel = l.cat_interest_label || 'Sin definir'
    const intCode = l.cat_interest_alias // para el color
    if (!interestMap[intLabel]) {
        interestMap[intLabel] = { count: 0, code: intCode }
    }
    interestMap[intLabel].count++
  })

  // Funciones de ayuda para transformar Objeto a Array y Ordenar
  const mapToArray = (obj) => Object.entries(obj)
    .map(([k, v]) => ({ name: k, count: v }))
    .sort((a, b) => b.count - a.count)

  const interestArray = Object.entries(interestMap).map(([k, val]) => {
      let action = 'Segmentar'
      if(val.code === 'we_lead_interest_high') action = 'Llamar prioridad'
      else if(val.code === 'we_lead_interest_medium') action = 'Nutrir / Email'
      else if(val.code === 'we_lead_interest_low') action = 'Campaña general'

      return { name: k, count: val.count, code: val.code, action }
  }).sort((a,b) => b.count - a.count)

  return {
    general: {
      total,
      b2b: b2bCount,
      sales: salesCount,
      highInterestCount,
      percentage: total > 0 ? Math.round((salesCount / total) * 100) : 0
    },
    byStatus: mapToArray(statusMap),
    byProgramType: mapToArray(typeMap),
    byChannel: mapToArray(channelMap),
    byInterest: interestArray
  }
})

// Helper para colores del modal (Interés)
function getBadgeClassInterest(alias) {
    if (alias === 'we_lead_interest_high') return 'bg-danger text-white'
    if (alias === 'we_lead_interest_medium') return 'bg-warning text-dark'
    return 'bg-secondary text-white'
}

// === FUNCIONES DE PAGINACIÓN Y FILTROS ===
function handlePaginationChange() {
  saveState()
  fetchLeads()
}
const filtroCalling = ref(catalog.options('we_calling') || [])
const editableHistory = ref([])
const isSavingFollow = ref(false)
const selectedFollowLead = ref(null)

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
  else if (key === 'owner_user_ids') {
     if (isComercial) return;
     filters.owner_user_ids = []
  }
  else if (key === 'status_lead_ids') filters.status_lead_ids = []
  else if (key === 'moment_ids') filters.moment_ids = []
  else if (key === 'last_follow_ids') filters.last_follow_ids = []
  else if (key === 'interest_level_ids') filters.interest_level_ids = []
  else if (key === 'channel_ids') filters.channel_ids = []
  else if (key === 'query_ids') filters.query_ids = []
  else if (key === 'type_program_ids') filters.type_program_ids = []
  else if (key === 'model_modality_ids') filters.model_modality_ids = []
  else if (key === 'web') filters.web = null
  else if (key === 'b2b') filters.b2b = null
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
    owner_user_ids: [],
    status_lead_ids: [],
    moment_ids: [],
    last_follow_ids: [],
    interest_level_ids: [],
    channel_ids: [],
    query_ids: [],
    type_program_ids: [],
    model_modality_ids: [],
    web: null,
    b2b: null,
    rangoFechas: { start: '', end: '' },
    rangoModificacion: { start: '', end: '' },
    edition_start_from: '',
    edition_start_to: '',
    edition_range_string: null,
    created_range_string: null,
    updated_range_string: null
  })

  if (isComercial && currentUserId) {
    filters.owner_user_ids = [currentUserId]
  }

  pagin.value.page = 1
  localStorage.removeItem('crm_leads_filter_state_v1')
  rebuildChips()
  fetchLeads()
}

function rebuildChips() {
  const chips = []

  if (filters.q) chips.push({ key: 'q', text: `Buscar: ${filters.q}` })

  if (filters.rangoFechas?.start || filters.rangoFechas?.end) {
    chips.push({ key: 'rangoFechas', text: `Reg: ${filters.rangoFechas.start} → ${filters.rangoFechas.end}` })
  }
  if (filters.rangoModificacion?.start || filters.rangoModificacion?.end) {
    chips.push({ key: 'rangoModificacion', text: `Mod: ${filters.rangoModificacion.start} → ${filters.rangoModificacion.end}` })
  }
  if (filters.edition_start_from || filters.edition_start_to) {
    chips.push({ key: 'edition_start', text: `Edición: ${filters.edition_start_from} → ${filters.edition_start_to}` })
  }
  if (filters.program_text) chips.push({ key: 'program_text', text: `Prog: ${filters.program_text}` })

  if (filters.owner_user_ids && filters.owner_user_ids.length > 0) {
    if (!isComercial) {
        chips.push({ key: 'owner_user_ids', text: `Asesores: ${filters.owner_user_ids.length}`, details: filters.owner_user_ids })
    }
  }
  if (filters.status_lead_ids && filters.status_lead_ids.length > 0) {
    chips.push({ key: 'status_lead_ids', text: `Estatus: ${filters.status_lead_ids.length}`, details: filters.status_lead_ids })
  }
  if (filters.moment_ids && filters.moment_ids.length > 0) {
    chips.push({ key: 'moment_ids', text: `E. Cliente: ${filters.moment_ids.length}`, details: filters.moment_ids })
  }
  if (filters.last_follow_ids && filters.last_follow_ids.length > 0) {
    chips.push({ key: 'last_follow_ids', text: `Seguimiento: ${filters.last_follow_ids.length}`, details: filters.last_follow_ids })
  }
  if (filters.interest_level_ids && filters.interest_level_ids.length > 0) {
    chips.push({ key: 'interest_level_ids', text: `Interés: ${filters.interest_level_ids.length}`, details: filters.interest_level_ids })
  }
  if (filters.channel_ids && filters.channel_ids.length > 0) {
    chips.push({ key: 'channel_ids', text: `Canales: ${filters.channel_ids.length}`, details: filters.channel_ids })
  }
  if (filters.query_ids && filters.query_ids.length > 0) {
    chips.push({ key: 'query_ids', text: `Promoción: ${filters.query_ids.length}`, details: filters.query_ids })
  }
  if (filters.type_program_ids && filters.type_program_ids.length > 0) {
    chips.push({ key: 'type_program_ids', text: `Tipo: ${filters.type_program_ids.length}`, details: filters.type_program_ids })
  }
  if (filters.model_modality_ids && filters.model_modality_ids.length > 0) {
    chips.push({ key: 'model_modality_ids', text: `Modalidad: ${filters.model_modality_ids.length}`, details: filters.model_modality_ids })
  }

  if (filters.web) {
    const label = filters.web === 'Y' ? 'Sí' : 'No'
    chips.push({ key: 'web', text: `Web: ${label}` })
  }
  if (filters.b2b) {
    const label = filters.b2b === 'Y' ? 'Sí' : 'No'
    chips.push({ key: 'b2b', text: `B2B: ${label}` })
  }

  activeFilterChips.value = chips
}

// === MODAL SEGUIMIENTO ===
function openFollowModal(lead) {
  // 1. Asignamos el lead seleccionado
  selectedFollowLead.value = lead

  try {
    let rawDetails = lead.follow_details;

    // 2. CASO BORDE: A veces la BD devuelve el JSON como String. Intentamos parsear.
    if (typeof rawDetails === 'string') {
      try {
        rawDetails = JSON.parse(rawDetails);
      } catch (e) {
        console.warn('No se pudo parsear follow_details', e);
        rawDetails = [];
      }
    }

    // 3. Verificamos si es un Array válido
    if (Array.isArray(rawDetails)) {

      editableHistory.value = rawDetails
        .map(d => {
          // 4. PROTECCIÓN CRÍTICA: Si el elemento 'd' es nulo o undefined, lo saltamos
          if (!d) return null;

          // 5. Mapeo seguro (usando Optional Chaining '?.' por si acaso)
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
        .filter(item => item !== null); // 6. Eliminamos los nulos que generamos arriba

    } else {
      // Si no es array, inicializamos vacío
      editableHistory.value = [];
    }

  } catch (error) {
    console.error("Error procesando historial:", error);
    // En caso de error fatal, mostramos historial vacío para no bloquear la UI
    editableHistory.value = [];
  }

  // 7. Finalmente mostramos el modal
  showFollowModal.value = true;
}

function addLocalAttempt() {
  const now = new Date()
  const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  editableHistory.value.unshift({
    id: null,
    status_alias: 'we_follow_lead_pending',
    calling_alias: null,
    contact_datetime: isoString,
    response: ''
  })
}

function getIdFromAlias(alias, catalogArray) {
   if (!alias || !catalogArray) return null // Agrega validación de catalogArray
   const item = catalogArray.find(i => i.alias === alias)
   return item ? item.id : null
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

    // Usa leadUpdate para guardar solo los intentos
    await comercialService.leadUpdate({
        id: selectedFollowLead.value.id,
        lead: {},
        contact_attempts: attemptsPayload
    })

    toast.success('Seguimiento actualizado correctamente')
    showFollowModal.value = false
    fetchLeads()
  } catch (error) {
    console.error(error)
    toast.error('Error al guardar el seguimiento')
  } finally {
    isSavingFollow.value = false
  }
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

      owner_user_ids: filters.owner_user_ids,
      status_lead_ids: filters.status_lead_ids,
      moment_ids: filters.moment_ids,
      last_follow_ids: filters.last_follow_ids,
      channel_ids: filters.channel_ids,
      interest_level_ids: filters.interest_level_ids,
      query_ids: filters.query_ids,
      type_program_ids: filters.type_program_ids,
      model_modality_ids: filters.model_modality_ids,
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

function rowClassForStatus(s) {
  const map = {
    'we_lead_status_insc': 'row-inscrito',
    'we_lead_status_interesado': 'row-blue',
    'we_lead_status_bought': 'row-emerald',
    'we_lead_status_will_pay': 'row-emerald',
    'we_lead_status_proximo': 'row-yellow',
    'we_lead_status_indiferente': 'row-gray',
    'we_lead_status_closed': 'row-red',
    'we_lead_status_desestimado': 'row-red'
  }
  return map[s] || ''
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

onMounted(() => {
  if (isComercial && currentUserId) {
    filters.owner_user_ids = [currentUserId]
  }
  rebuildChips()
  fetchLeads()
})
</script>

<style scoped>
.leads-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.6rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #6366f1;
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

/* Badges */
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

/* Modal y Utilitarios */
.form-label { font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; display: block; }
.form-control { width: 100%; border: 1px solid #d1d5db; border-radius: 0.4rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
.form-control:focus { outline: none; border-color: #6366f1; ring: 2px rgba(99, 102, 241, 0.2); }
.section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
.program-filter-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; }
.empty-state { padding: 3rem; text-align: center; color: #9ca3af; font-style: italic; }

/* Colores de Fila */
.row-inscrito, .row-inscrito > td { background-color: #d1fae5 !important; }
.row-inscrito { border-left: 4px solid #059669 !important; }
.row-inscrito:hover, .row-inscrito:hover > td { background-color: #a7f3d0 !important; }

.row-blue, .row-blue > td { background-color: #f0f9ff !important; }
.row-blue:hover, .row-blue:hover > td { background-color: #e0f2fe !important; }

.row-green, .row-green > td { background-color: #f0fdf4 !important; }
.row-green:hover, .row-green:hover > td { background-color: #dcfce7 !important; }

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
.hover-scale { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.hover-scale:hover { transform: scale(1.05); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

.avatar-placeholder { width: 40px; height: 40px; background-color: #e0e7ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }

.scroll-area { max-height: 60vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }

.meta-dashboard { background-color: #f8f9fa; min-height: 400px; }
.meta-card { transition: transform 0.2s; }
.letter-spacing-1 { letter-spacing: 1px; }
.fw-500 { font-weight: 500; }
.fw-600 { font-weight: 600; }
</style>
