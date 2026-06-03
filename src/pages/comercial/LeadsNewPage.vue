<template>
  <div class="ef-page form-shell">
    <div class="ef-page-header">
      <div class="ef-page-header-left">
        <span class="ef-breadcrumb">CRM Comercial</span>
        <h1 class="ef-page-title">{{ isEdit ? 'Editar Lead' : 'Formulario Comercial' }}</h1>
      </div>
      <div class="ef-header-actions">
        <button type="button" class="ef-btn-outline" @click="cancelar">
          <i class="fa-solid fa-arrow-left"></i> {{ isEdit ? 'Volver' : 'Cancelar' }}
        </button>
      </div>
    </div>

    <main class="ef-body">
      <div class="ef-form-wrapper">

    <LeadInfoFieldset
      :model="form"
      :is-edit="isEdit"
      :query-catalog="filtroQuery"
      :program-type-catalog="filtroTiposPrograma"
      :program-modality-catalog="filtroModalidad"
      @program-changed="onProgramChanged"
      @program-type-changed="onProgramTypeChanged"
      @edition-changed="onEditionChanged"
    />

    <ContactInfoFieldset
      :model="form"
      :is-edit="isEdit"
      :is-delete-status="isDeleteStatus"
      :lead-status-catalog="filtroPipeline"
      :country-catalog="filtroPaises"
      :prospect-situation-catalog="filtroProspectSituation"
      @search-phone="onSearchPhone"
    />

    <CommercialInfoFieldset
      :model="form"
      :lead-interest-catalog="filtroInterest"
      :social-media-catalog="filtroCanales"
      :mkt-words-catalog="mktWordsCatalog"
      :strategy-catalog="strategyCatalog"
    />

    <ContactAttemptsTable
      :contactos="form.contactos"
      :l-attempts="lAttempts"
      :calling-catalog="callingCatalog"
      :is-lider-comercial="isLiderComercial"
      :future-date-config="futureDateConfig"
      @add-attempt="contactAttempts.addContacto"
      @remove-attempt="contactAttempts.removeContacto"
      @toggle-timer="contactAttempts.toggleTimer"
      @type-change="(c, val) => contactAttempts.handleTypeChange(c, val)"
      @toggle-reschedule="toggleReschedule"
    />

    <!-- TODO (QA visual): tabla de intentos de contacto (contactAttempts.* sobre form.contactos)
         y cascade de programa/edicion + carga de lead en edicion (useLeadFormSearch, pendiente). -->

        <div class="d-flex justify-content-end gap-2 mt-4">
          <button class="btn-exec btn-exec-success" @click="showInscriptionModal = true">Inscribir</button>
          <button class="btn-exec btn-exec-primary" :disabled="saving || !!saveBlockReason" @click="guardar">
            {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar') }}
          </button>
        </div>

      </div>
    </main>

    <!-- Modal de inscripcion: ensambla los fieldsets de inscripcion + resumen, cableados
         a insc y a las features (discounts/installments/enroll). Confirmar -> enroll.confirmarInscripcion. -->
    <BaseModal v-model="showInscriptionModal" title="Inscripción" size="xl">
      <InscriptionClientFieldset
        :model="insc" :form="form"
        :doc-type-catalog="docTypeCatalog"
        :certificate-status-catalog="certificateStatusCatalog"
        :insc-modalidades="inscModalidades"
        @search-document="onSearchDocument"
      />
      <InscriptionPaymentFieldset
        :model="insc"
        :payment-channel-catalog="paymentChannelCatalog"
        :currency-catalog="currencyCatalog"
        :payment-method-catalog="paymentMethodCatalog"
        :token-provider-catalog="tokenProviderCatalog"
        :insc-payment-modes="inscPaymentModes"
        :is-channel-general="isChannelGeneral"
        :is-channel-token="isChannelToken"
        :is-channel-web="isChannelWeb"
      />
      <div class="row">
        <InscriptionDiscountFieldset
          :model="insc" :discount-service="discountService"
          :discount-catalog="discountCatalog" :currency-catalog="currencyCatalog"
          :discount-reset-key="discountResetKey" :show="!!insc.montoOriginal"
          @change-porcentual="discounts.onChangeDescuentoPorcentual"
          @change-fijo="discounts.onChangeDescuentoFijo"
          @change-beneficios="discounts.onChangeBeneficios"
        />
      </div>
      <InscriptionDocumentationFieldset
        :model="insc" :form="form"
        :is-channel-general="isChannelGeneral" :is-channel-web="isChannelWeb"
        :is-channel-token="isChannelToken" :is-voucher-optional="isVoucherOptional"
      />
      <InscriptionObservationsFieldset :model="insc" :is-channel-general="isChannelGeneral" />
      <TransactionSummaryCard :insc="insc" :currency-symbol="currencySymbol" :is-installment-mode="isInstallmentMode" />
      <template #footer>
        <button class="btn-exec btn-exec-outline" @click="showInscriptionModal = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" :disabled="enroll.savingInsc.value" @click="enroll.confirmarInscripcion">
          {{ enroll.savingInsc.value ? 'Procesando...' : 'Confirmar Inscripción' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { useLeadFormState } from '@/composables/useLeadFormState.js'
import { useLeadFormValidations } from '@/composables/useLeadFormValidations.js'
import { buildLeadPayload } from '@/composables/useLeadFormPayloads.js'
import { useApplyDiscounts } from '@/features/apply-discounts'
import { usePlanInstallments } from '@/features/plan-installments'
import { useManageContactAttempts } from '@/features/manage-contact-attempts'
import { useEnrollLead } from '@/features/enroll-lead'
import { idByAlias } from '@/shared/lib/catalog.js'
import { isValidEmail } from '@/shared/lib/validators.js'
import LeadInfoFieldset from '@/widgets/lead-form-fieldsets/LeadInfoFieldset.vue'
import ContactInfoFieldset from '@/widgets/lead-form-fieldsets/ContactInfoFieldset.vue'
import CommercialInfoFieldset from '@/widgets/lead-form-fieldsets/CommercialInfoFieldset.vue'
import InscriptionClientFieldset from '@/widgets/lead-form-fieldsets/InscriptionClientFieldset.vue'
import InscriptionPaymentFieldset from '@/widgets/lead-form-fieldsets/InscriptionPaymentFieldset.vue'
import InscriptionDiscountFieldset from '@/widgets/lead-form-fieldsets/InscriptionDiscountFieldset.vue'
import InscriptionDocumentationFieldset from '@/widgets/lead-form-fieldsets/InscriptionDocumentationFieldset.vue'
import InscriptionObservationsFieldset from '@/widgets/lead-form-fieldsets/InscriptionObservationsFieldset.vue'
import TransactionSummaryCard from '@/widgets/transaction-summary/TransactionSummaryCard.vue'
import BaseModal from '@/components/BaseModal.vue'
import ContactAttemptsTable from '@/widgets/lead-form-fieldsets/ContactAttemptsTable.vue'
import { useLeadFormSearch } from '@/composables/useLeadFormSearch.js'

// Pagina orquestadora del formulario de lead + inscripcion. Ensambla el estado
// (useLeadFormState), las validaciones y las features de dinero/cuotas/intentos/
// inscripcion. BORRADOR gateado: el modal de inscripcion (fieldsets aun no
// extraidos) y el cascade de programa quedan como TODO; el flip de ruta ocurre
// solo tras QA visual.

const router = useRouter()
const route = useRoute()
const toast = useToast()

const comercialService = inject(ServiceKeys.Comercial)
const customerService = inject(ServiceKeys.Customer, { customerInfoGet: () => Promise.resolve({}), sunatGet: () => Promise.resolve({}) })
const editionService = inject(ServiceKeys.Edition, { editionCaller: () => Promise.resolve([]) })
const catalog = inject('catalog')

const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
const isLiderComercial = !!storedUser?.roles?.includes('LIDER_COMERCIAL')
const futureDateConfig = { minDate: 'today' }

// Catalogos (resueltos por alias) para fieldsets, validaciones y payload.
const filtroQuery = ref(catalog.options('we_category_query') || [])
const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
const filtroModalidad = ref(catalog.options('we_modality') || [])
const filtroPipeline = ref(catalog.options('we_lead_status') || [])
const filtroPaises = ref(catalog.options('we_country') || [])
const filtroProspectSituation = ref(catalog.options('we_prospect_situation') || [])
const filtroInterest = ref(catalog.options('we_lead_interest') || [])
const filtroCanales = ref(catalog.options('we_social_media') || [])
const mktWordsCatalog = ref(catalog.options('we_key_word') || [])
const strategyCatalog = ref(catalog.options('we_type_strategy') || [])
const paymentChannelCatalog = ref(catalog.options('we_payment_channel') || [])
const lAttempts = ref(catalog.options('we_attempt') || [])
const callingCatalog = ref(catalog.options('we_calling') || [])

// Servicio y catalogos del modal de inscripcion.
const discountService = inject(ServiceKeys.Discount, { discountCaller: () => Promise.resolve([]) })
const docTypeCatalog = ref(catalog.options('we_type_document') || [])
const certificateStatusCatalog = ref(catalog.options('we_certificate_status') || [])
const inscModalidades = ref(catalog.options('we_insc_modality') || [])
const paymentMethodCatalog = ref(catalog.options('we_payment_method') || [])
const tokenProviderCatalog = ref(catalog.options('we_cat_provider') || catalog.options('we_token_provider') || [])
const inscPaymentModes = ref(catalog.options('we_payment_way') || [])
const currencyCatalog = ref(catalog.options('we_currency') || [])
const discountCatalog = ref(catalog.options('we_discount_type') || [])
const attemptOriginCatalog = ref(catalog.options('we_attempt_origin') || [])

// Catalogos que buildLeadPayload necesita (nombres del helper).
const payloadCatalogs = {
  leadStatus: filtroPipeline.value,
  country: filtroPaises.value,
  query: filtroQuery.value,
  leadInterest: filtroInterest.value,
  socialMedia: filtroCanales.value,
  mktWords: mktWordsCatalog.value,
  strategy: strategyCatalog.value,
  prospectSituation: filtroProspectSituation.value,
  client: catalog.options('we_client_type') || [],
  moment: catalog.options('we_moment') || [],
  programModality: filtroModalidad.value,
  programType: filtroTiposPrograma.value,
  attempts: lAttempts.value,
  calling: callingCatalog.value
}

const state = useLeadFormState({ paymentChannelCatalog })
const { form, insc, isChannelGeneral, isChannelToken, isChannelWeb, isVoucherOptional, isInstallmentMode } = state

const leadIdParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit = computed(() => !!leadIdParam.value)
const isDeleteStatus = computed(() => form.status_alias === 'we_lead_status_deleted')
const discountResetKey = ref(0)
const saving = ref(false)
const showInscriptionModal = ref(false)
const currencySymbol = computed(() => {
  const c = currencyCatalog.value.find(x => x.alias === insc.selectedCurrencyAlias)
  return c?.raw?.symbol || c?.symbol || 'S/'
})

const validations = useLeadFormValidations(form, insc, {
  channel: { isChannelGeneral, isChannelToken, isChannelWeb },
  requiresEdition: false,
  cloneFrom: !!route.query?.clone_from
})

const discounts = useApplyDiscounts(insc, { toast, discountResetKey })
const installments = usePlanInstallments(form, insc, { isInstallmentMode, toast })
const contactAttempts = useManageContactAttempts(form)
const search = useLeadFormSearch(form, insc, {
  comercialService,
  customerService,
  editionService,
  toast,
  prospectSituationCatalog: filtroProspectSituation,
  mktWordsCatalog,
  attemptOriginCatalog
})

const saveBlockReason = computed(() => {
  if (!validations.validateLeadInfo()) return 'Falta informacion del Lead'
  if (!validations.validateContactInfo()) return 'Faltan datos del Contacto'
  if (!validations.validateCommercialInfo()) return 'Falta el Estado Comercial'
  return null
})

function makeLeadPayload () {
  return buildLeadPayload({
    form,
    catalogs: payloadCatalogs,
    businessLineOptions: catalog.options('we_business_line') || [],
    businessLine: null
  })
}

const refs = {
  createdLeadId: ref(null),
  createdPersonId: ref(null),
  leadIdParam,
  voucherTouched: ref(false),
  inscInitialized: ref(false),
  showViewModal: ref(false)
}

const enroll = useEnrollLead(form, insc, {
  comercialService,
  toast,
  onSuccess: () => router.push({ name: 'ComercialListado' }),
  buildLeadPayload: makeLeadPayload,
  idByAlias,
  isValidEmail,
  catalogs: { docType: catalog.options('we_type_document') || [], inscModalidades: catalog.options('we_insc_modality') || [], inscPaymentModes: catalog.options('we_payment_way') || [], currency: catalog.options('we_currency') || [], country: filtroPaises.value, certificateStatus: catalog.options('we_certificate_status') || [], paymentMethod: catalog.options('we_payment_method') || [] },
  flags: { isChannelGeneral, isChannelToken, isVoucherOptional },
  installment: {
    isInstallmentMode,
    reservaSplitEnabled: installments.reservaSplitEnabled,
    reservaSplitValid: installments.reservaSplitValid,
    installmentPlanValid: installments.installmentPlanValid,
    reservaDiferidaFecha: installments.reservaDiferidaFecha,
    reservaInmediata: installments.reservaInmediata,
    installmentPlan: installments.installmentPlan
  },
  validators: validations,
  refs
})

function cancelar () { router.push({ name: 'ComercialListado' }) }
const onProgramChanged = search.onProgramaChange
const onProgramTypeChanged = search.onProgramaTypeChange
const onEditionChanged = search.onEditionChange
const onSearchPhone = search.searchLeadByPhone
const onSearchDocument = search.searchCustomerByDocument
function toggleReschedule (c) { c.cat_reschedule_origin = c.cat_reschedule_origin ? null : 5002 }

async function guardar () {
  if (saveBlockReason.value) { toast.warning(saveBlockReason.value); return }
  saving.value = true
  try {
    const payload = makeLeadPayload()
    const resp = isEdit.value
      ? await comercialService.leadUpdate({ id: leadIdParam.value, ...payload })
      : await comercialService.leadRegister(payload)
    if (resp.result === 1) { toast.success(resp.message); router.push({ name: 'ComercialListado' }) }
    else if (resp.result === 0) { toast.error(resp.message) }
    else { toast.warning(resp.message) }
  } catch (err) {
    console.error(err)
    toast.error('Error inesperado al guardar el lead.')
  } finally {
    saving.value = false
  }
}

// Carga el lead en modo edicion (mapea la respuesta del backend al form).
onMounted(async () => {
  if (!isEdit.value) return
  try {
    const res = await search.loadLead(leadIdParam.value)
    refs.createdLeadId.value = res.createdLeadId
    refs.createdPersonId.value = res.createdPersonId
  } catch (e) {
    console.error('[LeadsNewPage] loadLead', e)
    toast.error('No se pudo cargar el lead.')
  }
})

defineExpose({ enroll, discounts, contactAttempts, search })
</script>

<!-- Estilos del formulario: portados verbatim del legacy LeadsNew.vue y namespaced bajo
     .ef-page. NO scoped: deben alcanzar el markup de los fieldsets hijos (widgets), que
     reusan las clases .exec-*/.ef-*. El modal de inscripcion teleporta via BaseModal;
     su estilo se valida en QA. -->
<style src="./leads-new-page.css"></style>
