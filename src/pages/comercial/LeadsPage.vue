<template>
  <div class="leads-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">COMERCIAL</span>
        <h1 class="ep-title">Listado de Leads</h1>
        <span class="ep-subtitle">Gestión de leads y oportunidades</span>
      </div>
      <div class="ep-masthead-actions">
        <div class="ep-view-toggle">
          <button :class="['ep-toggle-btn', { 'is-active': !isCompact }]" @click="isCompact = false">
            <i class="fa-solid fa-table-columns"></i> Expandida
          </button>
          <button :class="['ep-toggle-btn', { 'is-active': isCompact }]" @click="isCompact = true">
            <i class="fa-solid fa-list"></i> Compacta
          </button>
        </div>
        <button
          class="ep-btn-control"
          :class="restrictions.hasActiveRestrictions.value ? 'ep-btn-danger' : ''"
          :title="isComercial ? 'Mis Permisos de Visualización' : 'Control de Asesores'"
          @click="restrictions.openControlModal"
        >
          <i class="fa-solid" :class="isComercial ? 'fa-user-lock' : 'fa-shield-halved'"></i>
          <span>{{ isComercial ? 'Mis Permisos' : 'Control' }}</span>
        </button>
        <button v-if="!restrictions.hasActiveRestrictions.value" class="ep-btn-new" @click="goNew">
          <i class="fa-solid fa-plus"></i> Nuevo Lead
        </button>
      </div>
    </header>

    <main class="ep-body">
      <LeadFilterBar
        :active-quick-view="store.activeQuickView"
        :filter-chips="store.activeFilterChips"
        :filtro-orden="orderOptions"
        :pagination="paginationView"
        @quick-view="fastViews.applyQuickView"
        @order-change="onOrderChange"
        @filter-remove="onFilterRemove"
        @filter-clear-all="onClearAll"
        @pagination-change="onPaginationChange"
        @open-filters="showFilterModal = true"
      />

      <LeadListTable
        :leads="store.leadsRaw"
        :is-compact="isCompact"
        :is-loading="store.isTableLoading"
        :col-groups="colGroups"
        :maps="catalogMaps"
        :is-comercial="isComercial"
        @row-click="followUp.openFollowModal"
        @action:edit="editLead"
        @action:enrollment="enrollment.openEnrollmentModal"
        @toggle-col-group="onToggleColGroup"
      />
    </main>

    <!-- Modales: la logica vive en las features; estos widgets solo presentan + emiten.
         Catalogos largos (filtros avanzados / restricciones) quedan en sus defaults
         hasta completar el cableado en QA visual. -->
    <FollowUpModal
      :show="followUp.showFollowModal.value"
      :lead="followUp.selectedFollowLead.value"
      :attempts="followUp.editableHistory.value"
      :is-loading="followUp.isLoadingFollow.value"
      :is-saving="followUp.isSavingFollow.value"
      :pipeline="filtroPipeline"
      :l-attempts="lAttempts"
      @update:show="v => (followUp.showFollowModal.value = v)"
      @add-attempt="followUp.addLocalAttempt"
      @toggle-timer="followUp.toggleTimer"
      @type-change="(a, val) => followUp.handleTypeChange(a, val)"
      @save="followUp.saveFastFollow"
    />

    <AdvancedFilterModal
      :show="showFilterModal"
      :filters="store.filters"
      :is-comercial="isComercial"
      :filtro-owners="filtroOwners"
      :filtro-pipeline="filtroPipeline"
      @update:show="v => (showFilterModal = v)"
      @apply="onApplyFilters"
      @clear="onClearAll"
    />

    <AdvisorRestrictionModal
      :show="restrictions.showControlModal.value"
      :asesores="restrictions.asesoresControl.value"
      :is-comercial="isComercial"
      :is-saving="restrictions.isSavingRestrictions.value"
      :has-active-restrictions="restrictions.hasActiveRestrictions.value"
      :filtro-pipeline="filtroPipeline"
      @update:show="v => (restrictions.showControlModal.value = v)"
      @save="restrictions.saveControlRestrictions"
      @date-change="(asesor, dateStr, type) => restrictions.handleAsesorDateChange(asesor, dateStr, type)"
    />

    <LeadEnrollmentModal
      :show="enrollment.showEnrollmentModal.value"
      :data="enrollment.enrollmentData.value"
      :is-loading="enrollment.isLoadingEnrollment.value"
      :observed="enrollment.enrollmentObserved.value"
      :resubmitting="enrollment.resubmittingEnrollment.value"
      @update:show="v => (enrollment.showEnrollmentModal.value = v)"
      @resubmit="enrollment.handleResubmitFromModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { useLeadStore } from '@/entities/lead/lead.store.js'
import { createLeadApi } from '@/entities/lead/lead.api.js'
import { useFastViews } from '@/features/lead-filtering'
import { useAdvisorRestrictions } from '@/features/advisor-restrictions'
import { useEnrollmentModal } from '@/features/enrollment-modal'
import { useLeadFollowUp } from '@/features/lead-follow-up'
import LeadFilterBar from '@/widgets/LeadFilterBar.vue'
import LeadListTable from '@/widgets/LeadListTable.vue'
import FollowUpModal from '@/widgets/lead-follow-up-modal/FollowUpModal.vue'
import AdvancedFilterModal from '@/widgets/AdvancedFilterModal.vue'
import AdvisorRestrictionModal from '@/widgets/advisor-restriction-modal/AdvisorRestrictionModal.vue'
import LeadEnrollmentModal from '@/widgets/LeadEnrollmentModal.vue'

// Pagina orquestadora del listado de leads. Ensambla el store de dominio, las
// features (filtros rapidos, restricciones, modal de matricula, seguimiento) y los
// widgets de presentacion. NO contiene logica de negocio: delega en store/features.
// BORRADOR gateado: el flip de ruta y el borrado de views/comercial/Leads.vue
// ocurren solo tras QA visual (ver docs/architecture/FRONTEND_FSD_PLAN.md).

const router = useRouter()
const route = useRoute()
const toast = useToast()

const comercialService = inject(ServiceKeys.Comercial)
const authService = inject(ServiceKeys.Auth)
const ficoService = inject(ServiceKeys.Fico)
const catalog = inject('catalog')

// Catalogos que consumen las features (resueltos por alias).
const filtroPipeline = ref(catalog.options('we_lead_status') || [])
const filtroInterest = ref(catalog.options('we_lead_interest') || [])
const filtroFollow = ref(catalog.options('we_calling') || [])
const filtroCalling = ref(catalog.options('we_calling') || [])
const lAttempts = ref(catalog.options('we_attempt') || [])
const attemptOriginCatalog = ref(catalog.options('we_attempt_origin') || [])
const filtroOwners = ref([])

// Permisos: el comercial restringido solo ve sus propios leads.
const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
const isComercial = !!(storedUser?.roles?.includes('COMERCIAL') &&
  !storedUser?.roles?.includes('LIDER_COMERCIAL') &&
  !storedUser?.roles?.includes('ADMIN') &&
  !storedUser?.roles?.includes('GERENCIA'))
const currentUserId = storedUser?.user_id ?? null

const store = useLeadStore()
const leadApi = createLeadApi(comercialService)

// Estado de presentacion de la tabla (vista compacta + grupos de columnas) que el
// orquestador conserva localmente.
const isCompact = ref(false)
const colGroups = ref({})
const catalogMaps = ref({})
const showFilterModal = ref(false)

// Opciones del selector de orden del listado (espejo de los chips order_by 0/1/2).
const orderOptions = [
  { value: 0, label: 'Más reciente' },
  { value: 1, label: 'Inicio de edición' },
  { value: 2, label: 'Fecha de pago' }
]
// El LeadFilterBar lee el orden seleccionado de pagination.order_by; el store lo
// guarda en filters.order_by, asi que se compone aqui.
const paginationView = computed(() => ({ ...store.pagin, order_by: store.filters.order_by }))

async function loadOwners () {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = (arr || []).map(u => {
      const fName = (u.first_name || '').trim()
      const lName = (u.last_name || '').trim()
      let fullName = fName
      if (lName) fullName += ` ${lName.charAt(0)}.`
      return { id: u.user_id, description: fullName.trim() || `Usuario ${u.user_id}` }
    })
  } catch (e) { console.error(e) }
}

const fastViews = useFastViews(store, { interest: filtroInterest, pipeline: filtroPipeline, follow: filtroFollow })

const restrictions = useAdvisorRestrictions({
  api: leadApi,
  ctx: { currentUserId, isComercial, storedUser },
  owners: filtroOwners,
  loadOwners,
  toast
})

const enrollment = useEnrollmentModal({ comercial: comercialService, fico: ficoService, toast })

const followUp = useLeadFollowUp(
  { comercial: comercialService },
  {
    comercial: comercialService,
    catalogs: { attemptOrigin: attemptOriginCatalog, calling: filtroCalling, attempts: lAttempts, pipeline: filtroPipeline },
    toast,
    onAfterSave: () => store.fetchLeads(leadApi)
  }
)

function goNew () { router.push({ name: 'ComercialLeadsNew' }) }
function editLead (lead) { router.push({ name: 'ComercialLeadsNew', params: { id: lead.id } }) }
function onOrderChange (val) { store.updateSingleFilter('order_by', val); store.rebuildChips(); store.fetchLeads(leadApi) }
function onPaginationChange (p) { store.setPagination(p || {}); store.fetchLeads(leadApi) }
function onFilterRemove (key) { store.clearFilters(false); store.updateSingleFilter(key, Array.isArray(store.filters[key]) ? [] : null); store.applyFilters() }
function onClearAll () { store.clearFilters(true) }
function onToggleColGroup (key) { colGroups.value[key] = !colGroups.value[key] }
function onApplyFilters () { showFilterModal.value = false; store.applyFilters() }

// Aplica los filtros desde el query string de la ruta sobre el store.
function parseQueryAndApply () {
  const q = route.query || {}
  if (!Object.keys(q).length) return false
  store.clearFilters(false)
  const f = store.filters
  if (q.q) f.q = q.q
  if (q.origin_seller_phone) f.origin_seller_phone = q.origin_seller_phone
  if (q.program_text) f.program_text = q.program_text
  if (q.web) f.web = q.web
  if (q.b2b) f.b2b = q.b2b
  if (q.pay_date_from || q.pay_date_to) {
    f.pay_date_from = q.pay_date_from || ''
    f.pay_date_to = q.pay_date_to || ''
  }
  if (q.edition_start_from) {
    f.edition_start_from = q.edition_start_from
    f.edition_start_to = q.edition_start_to || q.edition_start_from
  }
  return true
}

onMounted(async () => {
  try {
    store.initializeFilters({ isComercial, currentUserId })
    if (isComercial && currentUserId) restrictions.checkMyRestrictions()
    await loadOwners()
    parseQueryAndApply()
    store.rebuildChips()
    await store.fetchLeads(leadApi)
  } catch (e) {
    console.error('[LeadsPage] init', e)
  }
})
</script>

<!-- Estilos del listado: portados verbatim del legacy Leads.vue y namespaced bajo
     .leads-page. NO scoped a proposito: deben alcanzar el markup de los widgets hijos
     (LeadFilterBar, LeadListTable, modales), que reusan las mismas clases .ep-*. -->
<style src="./leads-page.css"></style>
