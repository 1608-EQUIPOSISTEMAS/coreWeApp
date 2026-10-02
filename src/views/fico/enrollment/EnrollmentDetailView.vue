<template>
  <div class="ds-page edv">
    <header class="ds-head">
      <div class="ds-head-titles">
        <button class="edv-back" type="button" @click="goBack">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Inscripciones
        </button>
        <div class="edv-title-row">
          <h1 class="ds-title">{{ studentName || `Inscripción #${enrollmentId}` }}</h1>
          <template v-if="!notFound && !loading">
            <span class="edv-status" :class="statusTone">
              <i class="fa-solid" :class="STATUS_ICON[statusTone]" aria-hidden="true"></i> {{ statusLabel }}
            </span>
            <span v-if="showCertificarPill" class="edv-status ok">
              <i class="fa-solid fa-certificate" aria-hidden="true"></i> Certificar
            </span>
          </template>
        </div>
        <p v-if="!notFound && headerSub" class="ds-sub">{{ headerSub }}</p>
      </div>
      <div v-if="!notFound && !loading && totalNav > 0" class="ds-head-actions">
        <!-- Cola de pendientes del mismo dia de pago. Dentro de la cola: anterior /
             posicion / siguiente con texto. Fuera (venta ya aprobada): un solo
             boton que lleva al primero, sin flechas muertas. -->
        <template v-if="totalNav > 0">
          <div v-if="currentNavIndex >= 0" class="edv-nav" role="group" :aria-label="`Pendientes del ${fmt.formatDate(enrollment?.pay_date)}`">
            <button
              class="edv-nav-btn"
              type="button"
              :disabled="!prevNavTarget"
              :title="prevNavTarget ? `Anterior: ${prevNavTarget.student_full_name}` : 'Es el primero'"
              @click="goToPrevPending"
            >
              <i class="fa-solid fa-chevron-left" aria-hidden="true"></i> Anterior
            </button>
            <span class="edv-nav-counter">
              <span><strong>{{ currentNavIndex + 1 }}</strong> de {{ totalNav }}</span>
              <small>pendientes del {{ fmt.formatDate(enrollment?.pay_date) }}</small>
            </span>
            <button
              class="edv-nav-btn"
              type="button"
              :disabled="!nextNavTarget"
              :title="nextNavTarget ? `Siguiente: ${nextNavTarget.student_full_name}` : 'Es el último'"
              @click="goToNextPending"
            >
              Siguiente <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
          <button
            v-else-if="nextNavTarget"
            class="btn-exec btn-exec-outline btn-sm"
            type="button"
            :title="`Siguiente: ${nextNavTarget.student_full_name}`"
            @click="goToNextPending"
          >
            Siguiente pendiente <span class="edv-nav-badge">{{ totalNav }}</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </template>
      </div>
    </header>

    <div v-if="loading" class="edv-layout" aria-busy="true" aria-label="Cargando detalle">
      <div class="ds-panel edv-skel"><span v-for="n in 8" :key="n" class="ds-skel"></span></div>
      <div class="ds-panel edv-skel"><span v-for="n in 12" :key="n" class="ds-skel"></span></div>
    </div>

    <p v-else-if="notFound" class="ds-alert neutro" role="alert">
      No se encontró la inscripción #{{ enrollmentId }}. Vuelve a la lista y ábrela de nuevo.
    </p>

    <div v-else class="edv-layout">
      <aside class="edv-aside">
        <EnrollmentHeader
          :enrollment="enrollment"
          :detail="detail"
          :current-profile="currentProfile"
          :summary="paymentSummary"
          :currency-symbol="saleSymbol"
          :odoo-email="odooEmail"
          :odoo-password="odooPassword"
        />
      </aside>

      <main class="ds-panel edv-main">
        <div class="ds-panel-head">
          <div class="ds-tabs" role="tablist" aria-label="Secciones de la inscripción">
            <button type="button" role="tab" :aria-selected="activeTab === 'finanzas'" @click="activeTab = 'finanzas'">
              <i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i> Finanzas
            </button>
            <button v-if="modalMode === 'view'" type="button" role="tab" :aria-selected="activeTab === 'acciones'" @click="activeTab = 'acciones'">
              <i class="fa-solid fa-bolt" aria-hidden="true"></i> Acciones
            </button>
            <button type="button" role="tab" :aria-selected="activeTab === 'historial'" @click="activeTab = 'historial'">
              <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> Historial
              <span v-if="auditLog.length" class="edv-count">{{ auditLog.length }}</span>
            </button>
          </div>
        </div>

        <div class="ds-panel-body">
          <!-- Membresia: fecha de activacion en modo confirm -->
          <div
            v-if="activeTab === 'finanzas' && modalMode === 'confirm' && isMembershipEnrollment"
            class="edv-callout warn"
          >
            <p class="edv-callout-title">
              <i class="fa-solid fa-calendar-day" aria-hidden="true"></i> Activación de membresía
            </p>
            <div class="ds-field edv-date">
              <label class="ds-label" for="edv-activation">Fecha de activación</label>
              <input
                id="edv-activation"
                v-model="activationDate"
                type="date"
                :min="todayIso"
                :max="maxActivationDate"
                class="ds-input"
              />
            </div>
            <p v-if="isActivationDeferred" class="edv-callout-text">
              El correo de bienvenida sale hoy con sus credenciales; el acceso a los cursos se habilita el
              <strong>{{ fmt.formatDate(activationDate) }}</strong> a las 9am (Lima).
            </p>
            <p v-else class="edv-callout-text">Activación inmediata al confirmar el pago.</p>
          </div>

          <!-- Membresia: activacion ya programada (modo view) -->
          <div
            v-if="activeTab === 'finanzas' && modalMode === 'view' && hasFutureScheduledActivation"
            class="edv-callout info"
          >
            <p class="edv-callout-title">
              <i class="fa-solid fa-clock" aria-hidden="true"></i> Activación programada
            </p>
            <p class="edv-callout-text">
              Esta membresía se activará el <strong>{{ fmt.formatDate(scheduledActivationDate) }}</strong> (9am Lima).
              El correo de bienvenida y la inscripción en Odoo se ejecutarán automáticamente.
            </p>
            <div v-if="!isReschedulingActivation">
              <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="isReschedulingActivation = true; newActivationDate = todayIso">
                <i class="fa-solid fa-calendar-pen" aria-hidden="true"></i> Reprogramar fecha
              </button>
            </div>
            <template v-else>
              <div class="ds-field edv-date">
                <label class="ds-label" for="edv-reschedule">Nueva fecha</label>
                <input
                  id="edv-reschedule"
                  v-model="newActivationDate"
                  type="date"
                  :min="todayIso"
                  :max="maxActivationDate"
                  class="ds-input"
                />
              </div>
              <div class="edv-callout-actions">
                <button class="btn-exec btn-exec-outline btn-sm" type="button" :disabled="savingReschedule" @click="isReschedulingActivation = false; newActivationDate = ''">
                  Cancelar
                </button>
                <button
                  class="btn-exec btn-exec-primary btn-sm"
                  type="button"
                  :disabled="!newActivationDate || savingReschedule || newActivationDate <= todayIso"
                  @click="handleRescheduleActivation"
                >
                  <i class="fa-solid" :class="savingReschedule ? 'fa-spinner fa-spin' : 'fa-check'" aria-hidden="true"></i>
                  {{ savingReschedule ? 'Guardando…' : 'Confirmar reprogramación' }}
                </button>
              </div>
            </template>
          </div>

          <EnrollmentFinancials
            v-show="activeTab === 'finanzas'"
            :enrollment="enrollment"
            :detail="detail"
            :catalogs="catalogData"
            :form="ficoForm"
            :installments="modalInstallments"
            :mode="modalMode"
            :is-editing="isEditing"
            :saving="savingFinancials"
            :last-payment="lastPayment"
            :enrollment-id="enrollmentId"
            :validations="validations"
            :program-children="programChildrenList"
            :activation-date="isMembershipEnrollment ? activationDate : null"
            @start-edit="startEditing"
            @cancel-edit="cancelEditing"
            @save-edit="handleSaveEdit"
            @confirm-payment="handleConfirmPayment"
            @confirm-plan="handleConfirmPlan"
            @save-cuotas="handleSaveCuotasData"
            @add-cuota="addCuota"
            @remove-cuota="removeCuota"
            @confirm-cuota="handleConfirmCuota"
            @save-additional="handleSaveAdditional"
            @update-additional="handleUpdateAdditional"
            @reject-enrollment="handleRejectEnrollment"
            @toggle-validation="handleToggleValidation"
            @change-edition="handleChangeEdition"
            @open-reschedule="rescheduleVisible = true"
            @edit-cuota-amount="openEditAmount"
            @correct-initial="openCorrectInitial"
            @revert-cuota="openRevert"
          />

          <EnrollmentActions
            v-if="modalMode === 'view'"
            v-show="activeTab === 'acciones'"
            :enrollment="enrollment"
            :detail="detail"
            :catalogs="catalogData"
            :mode="modalMode"
            :current-modality="currentModality"
            :current-profile="currentProfile"
            :modality-options="modalityOptions"
            :profile-options="profileOptions"
            :odoo-email="odooEmail"
            :student-flags="studentFlags"
            @action-completed="handleActionCompleted"
          />

          <EnrollmentAuditLog
            v-show="activeTab === 'historial'"
            :audit-log="auditLog"
          />
        </div>
      </main>
    </div>

    <RescheduleInstallmentsModal
      v-model:visible="rescheduleVisible"
      :enrollment="enrollment"
      :installments="modalInstallments"
      :edition-end-date="editionEndDate"
      :catalogs="catalogData"
      @completed="handleRescheduleCompleted"
    />

    <EditInstallmentAmountModal
      v-model:visible="editAmountVisible"
      :installment="editAmountTarget"
      :saving="savingEditAmount"
      @submit="handleEditAmountSubmit"
    />

    <EditInstallmentAmountModal
      v-model:visible="correctInitialVisible"
      :installment="correctInitialTarget"
      :saving="savingCorrectInitial"
      title="Corregir pago inicial"
      @submit="handleCorrectInitialSubmit"
    />

    <RevertInstallmentModal
      v-model:visible="revertVisible"
      :installment="revertTarget"
      :saving="savingRevert"
      @submit="handleRevertSubmit"
    />

    <AddInstallmentModal
      v-model:visible="addInstallmentVisible"
      :next-number="nextInstallmentNumber"
      :saving="savingAddInstallment"
      @submit="handleAddInstallmentSubmit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, inject, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useEnrollmentCatalogs } from '@/composables/useEnrollmentCatalogs'
import { useToast } from 'vue-toastification'
import { useToastWithAction } from '@/composables/useToastWithAction'
import EnrollmentHeader from './EnrollmentHeader.vue'
import EnrollmentFinancials from './EnrollmentFinancials.vue'
import EnrollmentActions from './EnrollmentActions.vue'
import EnrollmentAuditLog from './EnrollmentAuditLog.vue'
import RescheduleInstallmentsModal from './RescheduleInstallmentsModal.vue'
import EditInstallmentAmountModal from './EditInstallmentAmountModal.vue'
import RevertInstallmentModal from './RevertInstallmentModal.vue'
import AddInstallmentModal from './AddInstallmentModal.vue'
import { toLocalIsoDate } from '@/shared/lib/localDate.js'
import { findEnrollmentById } from '@/entities/enrollment/findEnrollmentById.js'
import { currencySymbol } from '@/entities/enrollment/currencySymbol.js'
import { resolveInstallmentStatus } from '@/entities/enrollment/installmentStatus.js'
import { summarizePayment } from '@/entities/enrollment/paymentSummary.js'

const props = defineProps({
  id: { type: [String, Number], required: true }
})

const router = useRouter()
const route = useRoute()
const ficoService = inject(ServiceKeys.Fico)
const catalogService = inject('catalog', null)
const toast = useToast()
const toastWA = useToastWithAction()
const fmt = useEnrollmentFormatters()
const catalogs = useEnrollmentCatalogs()

const loading = ref(true)
// La inscripcion del URL no se pudo cargar: no se muestra nada que permita
// aprobar o cobrar (ver findEnrollmentById).
const notFound = ref(false)
const enrollment = ref(null)
const detail = ref({ installments: [], payment_history: [] })
const auditLog = ref([])
const activeTab = ref('finanzas')

// Odoo
const odooEmail = ref(null)
const odooPassword = ref(null)
const studentFlags = ref(null)

// Profile & Modality
const activeProfileId = ref(null)
const activeModalityId = ref(null)

// Membresia: heuristica por nombre (el
// backend re-valida con programs.is_membership). El datepicker solo aparece
// cuando isMembershipEnrollment=true; el resto del flujo es identico al regular.
const isMembershipEnrollment = computed(() => {
  const name = (detail.value?.program_name || enrollment.value?.program_name || '').toUpperCase()
  return /MEMB|GOLD|PLAT|PLUS|BLACK/.test(name)
})

// A5 pending review: el SP de confirmacion regular no maneja este estado.
// Enrutamos a approvePendingReview cuando se detecta (handleConfirmPayment/Plan).
const isPendingReview = computed(() => {
  const alias = detail.value?.cat_type_status_alias
    || enrollment.value?.cat_type_status_alias
    || enrollment.value?.type_status_alias
  return alias === 'we_enrollment_status_pending_review'
})
const todayIso = computed(() => toLocalIsoDate())
const maxActivationDate = computed(() => {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return toLocalIsoDate(d)
})
const activationDate = ref('')
const isActivationDeferred = computed(() => {
  return isMembershipEnrollment.value && activationDate.value && activationDate.value > todayIso.value
})
const scheduledActivationDate = computed(() => detail.value?.membership_activation_date || null)
const hasFutureScheduledActivation = computed(() => {
  if (!isMembershipEnrollment.value || !scheduledActivationDate.value) return false
  return String(scheduledActivationDate.value).slice(0, 10) > todayIso.value
})
const isReschedulingActivation = ref(false)
const newActivationDate = ref('')
const savingReschedule = ref(false)
async function handleRescheduleActivation () {
  if (!newActivationDate.value || savingReschedule.value) return
  savingReschedule.value = true
  try {
    await ficoService.updateMembershipActivationDate(
      Number(enrollmentId.value),
      newActivationDate.value
    )
    toast.success(`Activacion reprogramada para ${fmt.formatDate(newActivationDate.value)}.`)
    isReschedulingActivation.value = false
    newActivationDate.value = ''
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error(err?.message || 'No se pudo reprogramar la fecha.')
  } finally { savingReschedule.value = false }
}

// Financials
const isEditing = ref(false)
const savingFinancials = ref(false)
const modalInstallments = ref([])
// Snapshot por installment_id de los valores al entrar en modo edicion;
// se usa para diff y para auditar solo cuotas pagadas realmente modificadas.
const paidCuotaSnapshot = ref(new Map())

const ficoForm = reactive({
  cat_currency: null,
  cat_payment_medium: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: '',
  payment_date: ''
})


// Validations
const validations = ref([])
const programChildrenList = ref([])

// Reschedule installments
const rescheduleVisible = ref(false)
const editAmountVisible = ref(false)
const editAmountTarget = ref(null)
const savingEditAmount = ref(false)
const correctInitialVisible = ref(false)
const correctInitialTarget = ref(null)
const savingCorrectInitial = ref(false)
const revertVisible = ref(false)
const revertTarget = ref(null)
const savingRevert = ref(false)
const addInstallmentVisible = ref(false)
const savingAddInstallment = ref(false)
const nextInstallmentNumber = computed(() => {
  const existing = (modalInstallments.value || [])
    .filter(i => i.installment_number > 0 && !i.is_reserva)
    .map(i => Number(i.installment_number) || 0)
  return existing.length ? Math.max(...existing) + 1 : 1
})
const editionEndDate = computed(() =>
  enrollment.value?.edition_end_date
  || detail.value?.edition_end_date
  || null
)

// Navegacion entre pendientes del mismo dia de pago
const sameDayPending = ref([])

const enrollmentId = computed(() => Number(props.id))

const catalogData = computed(() => ({
  catCurrency: catalogs.catCurrency.value,
  catPaymentMedium: catalogs.catPaymentMedium.value,
  catBusinessEntity: catalogs.catBusinessEntity.value,
  catFinancialEntity: catalogs.catFinancialEntity.value,
  allBankAccounts: catalogs.allBankAccounts.value,
  filteredAccounts: catalogs.filteredAccounts
}))

const modalMode = computed(() => {
  const s = (enrollment.value?.confirmation || enrollment.value?.student_status || '').toLowerCase()
  if (s.includes('aprob') || s.includes('confirm')) return 'view'
  return 'confirm'
})

const saleSymbol = computed(() => currencySymbol(detail.value?.cat_currency_id, catalogs.catCurrency.value))

// Misma regla que la barra de Finanzas: la ficha y la pestaña no pueden diferir.
const paymentSummary = computed(() => summarizePayment({
  enrollment: enrollment.value,
  detail: detail.value,
  installments: modalInstallments.value,
  mode: modalMode.value
}))

const statusLabel = computed(() => {
  const s = enrollment.value?.confirmation
  if (!s || s.toLowerCase().includes('pendiente')) return 'Pendiente Revisar'
  return s
})
// El estado va junto al nombre y con icono: arriba a la derecha, como pill
// chico, se perdia (pedido del usuario).
const STATUS_ICON = { ok: 'fa-circle-check', warn: 'fa-clock', bad: 'fa-circle-xmark' }
const statusTone = computed(() => fmt.statusTone(enrollment.value?.confirmation))
const studentName = computed(() => detail.value.student_full_name || enrollment.value?.student_full_name || '')
const headerSub = computed(() => {
  const program = detail.value.program_name || enrollment.value?.program_name
  const edition = detail.value.edition_code || enrollment.value?.edition_code
  return [program, edition, `#${enrollmentId.value}`].filter(Boolean).join(' · ')
})

// Etiqueta "Certificar": becado (total 0 con descuento) que ya pago su
// certificado (pago adicional registrado -> cat_certificate_status = paid).
const showCertificarPill = computed(() => {
  const d = detail.value || {}
  const isBeca = paymentSummary.value.total === 0 && (Number(d.discount_amount) || Number(enrollment.value?.total_discounted) || 0) > 0
  return isBeca && d.certificate_status_alias === 'we_certificate_status_paid'
})

const lastPayment = computed(() => {
  const hist = detail.value?.payment_history
  if (!hist || !Array.isArray(hist) || !hist.length) return null
  // Pagos sueltos (installment_id null: certificado/reasignacion) viven en el
  // nav Adicionales, no en el bloque de contado.
  return hist.find(p => p.installment_id != null) || null
})

// Respaldo cuando el catalogo no trae el grupo: no basta con que exista el
// servicio, la lista puede llegar VACIA (el cache CORE_CATALOG_V3 no siempre
// trae we_profile) y el perfil salia '---'. Ids = tabla catalog en la BD.
const PROFILE_FALLBACK = [
  { id: 3086, description: 'PROFESIONAL' },
  { id: 3087, description: 'ESTUDIANTE' },
  { id: 3200, description: 'GENERAL' }
]
const MODALITY_FALLBACK = [
  { id: 2626, description: 'Normal (Regular)', alias: 'we_insc_modality_normal' },
  { id: 2625, description: 'Flexible (Flex)', alias: 'we_insc_modality_flexible' }
]

const profileOptions = computed(() => {
  const fromCatalog = (catalogService?.options('we_profile') || []).map(i => ({
    id: i.id ?? i.raw?.id,
    description: i.description ?? i.raw?.description
  }))
  return fromCatalog.length ? fromCatalog : PROFILE_FALLBACK
})

const currentProfile = computed(() => {
  const profId = activeProfileId.value || detail.value?.cat_profile_id || enrollment.value?.cat_profile_id
  if (!profId) return enrollment.value?.occupation_label === 'E' ? 'ESTUDIANTE' : 'PROFESIONAL'
  const found = profileOptions.value.find(p => p.id === profId)
  return found?.description || '---'
})

const modalityOptions = computed(() => {
  const fromCatalog = (catalogService?.options('we_insc_modality') || []).map(i => ({
    id: i.id ?? i.raw?.id,
    description: i.description ?? i.raw?.description,
    alias: i.alias
  }))
  return fromCatalog.length ? fromCatalog : MODALITY_FALLBACK
})

const currentModality = computed(() => {
  const modId = activeModalityId.value || detail.value?.cat_inscription_modality_id || enrollment.value?.cat_inscription_modality
  if (!modId) return enrollment.value?.modality || enrollment.value?.student_type_label || '---'
  const found = modalityOptions.value.find(m => m.id === modId)
  return found?.description || enrollment.value?.modality || '---'
})

function goBack () {
  router.push({ name: 'enrollment' })
}

function buildInstallments () {
  const inst = detail.value?.installments || []
  const payments = detail.value?.payment_history || []
  const commercialDate = detail.value?.commercial_pay_date
    ? String(detail.value.commercial_pay_date).slice(0, 10)
    : ''
  modalInstallments.value = inst.map(i => {
    const pay = payments.find(p => p.installment_id === i.installment_id)
    const isInicial = i.installment_number === 0 || i.is_reserva
    return {
      ...i,
      status: resolveInstallmentStatus(i.status_alias),
      _cat_currency: pay?.cat_payment_medium_id ? (detail.value?.cat_currency_id || null) : (i.cat_currency || null),
      _cat_payment_medium: pay?.cat_payment_medium_id || i.cat_payment_medium || null,
      _cat_business_entity: pay?.cat_business_entity_id || i.cat_business_entity || null,
      _bank_account_id: pay?.bank_account_id || i.bank_account_id || null,
      _transaction_code: pay?.transaction_code || i.transaction_code || '',
      _voucher_url: pay?.evidence_url || i.evidence_url || null,
      _payment_date: pay?.payment_date
        ? String(pay.payment_date).slice(0, 10)
        : (isInicial ? commercialDate : ''),
      _payment_id: pay?.payment_id || null,
      _isNew: false
    }
  })
}

// Toma el estado actual de una cuota pagada para detectar diff al guardar.
function snapshotPaidCuota (c) {
  return {
    amount: Number(c.amount) || 0,
    due_date: c.due_date ? String(c.due_date).slice(0, 10) : null,
    cat_currency: c._cat_currency || null,
    cat_payment_medium: c._cat_payment_medium || null,
    cat_business_entity: c._cat_business_entity || null,
    bank_account_id: c._bank_account_id || null,
    transaction_code: c._transaction_code || '',
    payment_date: c._payment_date ? String(c._payment_date).slice(0, 10) : '',
    payment_id: c._payment_id || null
  }
}

function addCuota () {
  // En modo view sobre un plan ya pendiente, agregar una cuota es una accion
  // auditada -> modal con justificacion. En el flujo de armado inicial (mode
  // 'confirm' o plan en borrador) seguimos con la fila inline original.
  const planPendiente = modalInstallments.value.some(i => i.installment_number > 0 && !i.is_reserva)
  if (modalMode.value === 'view' && planPendiente) {
    // Limpia cualquier fila inline huerfana de un click previo antes de abrir el modal.
    modalInstallments.value = modalInstallments.value.filter(i => !i._isNew)
    addInstallmentVisible.value = true
    return
  }

  const cuotas = modalInstallments.value.filter(i => i.installment_number !== 0 && !i.is_reserva)
  modalInstallments.value.push({
    installment_number: cuotas.length + 1,
    amount: 0,
    due_date: '',
    status: 'pending',
    _cat_currency: null,
    _cat_payment_medium: null,
    _cat_business_entity: null,
    _bank_account_id: null,
    _transaction_code: '',
    _voucher_url: null,
    _payment_date: '',
    _isNew: true
  })
}

async function handleAddInstallmentSubmit (payload) {
  savingAddInstallment.value = true
  try {
    await ficoService.addInstallment({
      enrollment_id: enrollmentId.value,
      amount: payload.amount,
      due_date: payload.due_date,
      justificacion: payload.justificacion
    })
    toast.success('Cuota agregada al plan.')
    addInstallmentVisible.value = false
    await refreshDetail()
  } catch (err) {
    console.error('[addInstallment]', err)
    toast.error(apiErrorMessage(err) || 'No se pudo agregar la cuota.')
  } finally {
    savingAddInstallment.value = false
  }
}

function removeCuota (idx) {
  const cuotas = modalInstallments.value.filter(i => i.installment_number !== 0 && !i.is_reserva)
  const cuota = cuotas[idx]
  const realIdx = modalInstallments.value.indexOf(cuota)
  if (realIdx !== -1) modalInstallments.value.splice(realIdx, 1)
}

function resetFicoForm () {
  ficoForm.cat_currency = null
  ficoForm.cat_payment_medium = null
  ficoForm.cat_business_entity = null
  ficoForm.bank_account_id = null
  ficoForm.transaction_code = ''
  ficoForm.payment_date = ''
}

function startEditing () {
  const p = lastPayment.value
  ficoForm.cat_currency = detail.value?.cat_currency_id || null
  ficoForm.cat_payment_medium = p?.cat_payment_medium_id || null
  ficoForm.cat_business_entity = p?.cat_business_entity_id || null
  ficoForm.bank_account_id = p?.bank_account_id || null
  ficoForm.transaction_code = p?.transaction_code || ''
  ficoForm.payment_date = p?.payment_date ? String(p.payment_date).slice(0, 10) : ''
  paidCuotaSnapshot.value = new Map(
    modalInstallments.value
      .filter(c => c.status === 'paid' && c.installment_id && !(c.installment_number === 0 || c.is_reserva))
      .map(c => [c.installment_id, snapshotPaidCuota(c)])
  )
  isEditing.value = true
}

function cancelEditing () {
  isEditing.value = false
  paidCuotaSnapshot.value = new Map()
  resetFicoForm()
}

// Compara cada cuota pagada con su snapshot inicial y devuelve solo las modificadas.
// Excluye la cuota inicial (ya viaja en el bloque `fields` principal del inicial).
function collectPaidCuotaDiffs () {
  const out = []
  for (const c of modalInstallments.value) {
    if (c.status !== 'paid' || !c.installment_id) continue
    if (c.installment_number === 0 || c.is_reserva) continue
    const before = paidCuotaSnapshot.value.get(c.installment_id)
    if (!before) continue
    const after = snapshotPaidCuota(c)
    const dirty = Object.keys(after).some(k => (after[k] ?? null) !== (before[k] ?? null))
    if (!dirty) continue
    out.push({
      installment_id: c.installment_id,
      installment_number: c.installment_number,
      payment_id: before.payment_id,
      before,
      after
    })
  }
  return out
}

async function handleSaveEdit (justificacion) {
  savingFinancials.value = true
  try {
    const eid = enrollmentId.value
    const isCuotas = enrollment.value && !fmt.isContado(enrollment.value)
    const ini = isCuotas ? modalInstallments.value.find(i => i.installment_number === 0 || i.is_reserva) : null
    const fields = {}
    fields.cat_payment_medium = ini ? ini._cat_payment_medium : ficoForm.cat_payment_medium
    fields.cat_business_entity = ini ? ini._cat_business_entity : ficoForm.cat_business_entity
    fields.bank_account_id = ini ? ini._bank_account_id : ficoForm.bank_account_id
    fields.transaction_code = ini ? ini._transaction_code : ficoForm.transaction_code
    fields.cat_currency = ini ? ini._cat_currency : ficoForm.cat_currency
    fields.payment_date = ini ? ini._payment_date : ficoForm.payment_date

    const paidDiffs = collectPaidCuotaDiffs()
    if (paidDiffs.length) fields.paid_installments = paidDiffs

    await ficoService.enrollmentUpdate({ enrollment_id: eid, justificacion: justificacion.trim(), fields })
    toast.success('Cambios guardados correctamente.')
    isEditing.value = false
    paidCuotaSnapshot.value = new Map()
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error('Error al guardar cambios.')
  } finally {
    savingFinancials.value = false
  }
}

// Toda membresia sale por la cola del backend (job membership_activation): el
// worker inscribe en Odoo y manda la bienvenida con reintentos. Esta pantalla NO
// debe disparar el correo, o el alumno recibe sus credenciales dos veces.
// Devuelve true cuando ya se avisó y el caller solo tiene que salir.
function announceQueuedMembership (resp, encabezado) {
  if (!resp?.membership_queued) return false
  toast.success(
    resp.membership_deferred
      ? `${encabezado} Activacion programada para ${fmt.formatDate(resp.activation_date)} (9am).`
      : `${encabezado} El correo de bienvenida sale en unos segundos.`,
    { timeout: 6000 }
  )
  return true
}

async function handleConfirmPayment (sapCreds = {}) {
  savingFinancials.value = true
  try {
    const eid = enrollmentId.value

    // A5 pending review: enrutar a approvePendingReview (sp_fico_confirm_payment
    // no maneja este estado y dejaria la inscripcion en limbo).
    if (isPendingReview.value) {
      const activationArg = isMembershipEnrollment.value && activationDate.value
        ? activationDate.value
        : null
      const a5Resp = await ficoService.approvePendingReview(eid, activationArg)
      if (a5Resp?.result !== 1) {
        toast.error(a5Resp?.message || 'No se pudo aprobar la migracion A5.', { timeout: 7000 })
        savingFinancials.value = false
        return
      }
      if (a5Resp?.membership_deferred) {
        toast.success(
          `Migracion aprobada. Activacion programada para ${fmt.formatDate(a5Resp.activation_date)} (9am).`,
          { timeout: 6000 }
        )
      } else {
        toast.success('Migracion aprobada. Cuotas transferidas y notificaciones enviadas.', { timeout: 5000 })
      }
      goBack()
      return
    }

    // OS/OP: se aprueba la inscripcion sin grabar pago. Los datos bancarios ni
    // se mandan (no existen todavia); la cuota queda pendiente en Cobranzas.
    const payload = sapCreds.documental
      ? { enrollment_id: eid, action: 'confirm_documental' }
      : {
          enrollment_id: eid,
          action: 'confirm_contado',
          cat_currency: ficoForm.cat_currency,
          cat_payment_medium: ficoForm.cat_payment_medium,
          cat_business_entity: ficoForm.cat_business_entity,
          bank_account_id: ficoForm.bank_account_id,
          transaction_code: ficoForm.transaction_code,
          payment_date: ficoForm.payment_date || null
        }
    if (isMembershipEnrollment.value && activationDate.value) {
      payload.activation_date = activationDate.value
    }
    const resp = await ficoService.confirmPayment(payload)
    if (resp?.result === 2 && Array.isArray(resp.validation_errors) && resp.validation_errors.length > 0) {
      const lines = resp.validation_errors.map(e => `• ${e.message}`).join('\n')
      toastWA.errorWithAction({
        title: 'No se puede confirmar el pago',
        message: `Faltan acciones previas:\n${lines}`,
        actionLabel: 'Ir a Convalidaciones',
        onAction: () => {
          const el = document.querySelector('[data-section="convalidacion"]') || document.querySelector('.ef-validation-warn, .ef-edition-warn')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
      savingFinancials.value = false
      return
    }
    if (resp?.result !== 1) {
      toast.error(resp?.message || 'No se pudo confirmar el pago.', { timeout: 7000 })
      savingFinancials.value = false
      return
    }
    if (announceQueuedMembership(resp, 'Pago confirmado.')) {
      goBack()
      return
    }
    // Un congreso no se inscribe en Odoo: el backend lo omite y lo avisa aqui.
    if (sapCreds.documental) {
      toast.success('Inscripcion confirmada. El pago de la OS/OP queda pendiente de cobro.', { timeout: 5000 })
    } else {
      toast.success(resp?.odoo_skipped
        ? 'Pago registrado. Evento: no se inscribe en Odoo, solo se envia el correo.'
        : 'Pago registrado e inscripcion en Odoo completada.', { timeout: 4000 })
    }
    try {
      const emailResult = await ficoService.sendConfirmationEmail(eid, sapCreds)
      if (emailResult?.success) {
        toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
      } else {
        toast.error(`Error al enviar correo: ${emailResult?.error || 'fallo desconocido'}`, { timeout: 6000 })
      }
    } catch (emailErr) {
      console.error('[sendConfirmationEmail]', emailErr)
      const msg = apiErrorMessage(emailErr) || emailErr?.message || 'fallo desconocido'
      toast.error(`Error al enviar correo: ${msg}`, { timeout: 7000 })
    }
    goBack()
  } catch (err) {
    console.error('[confirmPayment]', err)
    const msg = apiErrorMessage(err) || err?.message || 'error desconocido'
    toast.error(`Error al confirmar el pago: ${msg}`, { timeout: 7000 })
  } finally {
    savingFinancials.value = false
  }
}

async function handleConfirmPlan (sapCreds = {}) {
  savingFinancials.value = true
  try {
    const eid = enrollmentId.value
    const inicial = modalInstallments.value.find(i => i.installment_number === 0 || i.is_reserva)
    const keepInstallments = modalInstallments.value.map(c => ({
      installment_id: c.installment_id || null,
      installment_number: c.installment_number,
      amount: Number(c.amount) || 0,
      due_date: c.due_date || null,
      is_new: c._isNew || false,
      cat_currency: c._cat_currency || null,
      cat_payment_medium: c._cat_payment_medium || null,
      cat_business_entity: c._cat_business_entity || null,
      bank_account_id: c._bank_account_id || null,
      transaction_code: c._transaction_code || ''
    }))
    // A5 pending review: enrutar a approvePendingReview (mismo motivo que en
    // handleConfirmPayment).
    if (isPendingReview.value) {
      const activationArg = isMembershipEnrollment.value && activationDate.value
        ? activationDate.value
        : null
      const a5Resp = await ficoService.approvePendingReview(eid, activationArg)
      if (a5Resp?.result !== 1) {
        toast.error(a5Resp?.message || 'No se pudo aprobar la migracion A5.', { timeout: 7000 })
        savingFinancials.value = false
        return
      }
      if (a5Resp?.membership_deferred) {
        toast.success(
          `Migracion aprobada. Activacion programada para ${fmt.formatDate(a5Resp.activation_date)} (9am).`,
          { timeout: 6000 }
        )
      } else {
        toast.success('Migracion aprobada. Cuotas transferidas y notificaciones enviadas.', { timeout: 5000 })
      }
      goBack()
      return
    }

    const planPayload = {
      enrollment_id: eid,
      action: 'confirm_plan',
      installments: keepInstallments,
      cat_currency: inicial?._cat_currency || null,
      cat_payment_medium: inicial?._cat_payment_medium || null,
      cat_business_entity: inicial?._cat_business_entity || null,
      bank_account_id: inicial?._bank_account_id || null,
      transaction_code: inicial?._transaction_code || '',
      payment_date: inicial?._payment_date || null
    }
    if (isMembershipEnrollment.value && activationDate.value) {
      planPayload.activation_date = activationDate.value
    }
    const resp = await ficoService.confirmPayment(planPayload)
    if (resp?.result === 2 && Array.isArray(resp.validation_errors) && resp.validation_errors.length > 0) {
      const lines = resp.validation_errors.map(e => `• ${e.message}`).join('\n')
      toastWA.errorWithAction({
        title: 'No se puede confirmar el plan',
        message: `Faltan acciones previas:\n${lines}`,
        actionLabel: 'Ir a Convalidaciones',
        onAction: () => {
          const el = document.querySelector('[data-section="convalidacion"]') || document.querySelector('.ef-validation-warn, .ef-edition-warn')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
      savingFinancials.value = false
      return
    }
    if (resp?.result !== 1) {
      toast.error(resp?.message || 'No se pudo confirmar el plan.', { timeout: 7000 })
      savingFinancials.value = false
      return
    }
    if (announceQueuedMembership(resp, 'Plan confirmado.')) {
      goBack()
      return
    }
    toast.success(resp?.odoo_skipped
      ? 'Plan de cuotas confirmado. Evento: no se inscribe en Odoo, solo se envia el correo.'
      : 'Plan de cuotas confirmado e inscripcion en Odoo completada.', { timeout: 4000 })
    const emailResult = await ficoService.sendConfirmationEmail(eid, sapCreds)
    if (emailResult?.success) {
      toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
    } else {
      toast.error(`Error al enviar correo: ${emailResult?.error || 'fallo desconocido'}`, { timeout: 6000 })
    }
    goBack()
  } catch (err) {
    console.error(err)
    toast.error('Error al confirmar el plan.')
  } finally {
    savingFinancials.value = false
  }
}

async function handleConfirmCuota (cuota) {
  try {
    const res = await ficoService.confirmInstallment({
      installment_id: cuota.installment_id,
      enrollment_id: enrollmentId.value,
      cat_currency: cuota._cat_currency,
      cat_payment_medium: cuota._cat_payment_medium,
      cat_business_entity: cuota._cat_business_entity,
      bank_account_id: cuota._bank_account_id,
      transaction_code: cuota._transaction_code,
      voucher_url: cuota._voucher_url,
      payment_date: cuota._payment_date || null,
      // Pago con detraccion: el backend deriva el monto del pago restando este,
      // y graba las dos filas de payments en la misma transaccion.
      detraction: cuota._detraction
        ? {
            amount: Number(cuota._detraction.amount),
            bank_account_id: cuota._detraction.bank_account_id,
            transaction_code: cuota._detraction.transaction_code,
            voucher_url: cuota._detraction._voucher_url
          }
        : null
    })
    toast.success(`Cuota ${cuota.installment_number} confirmada.`)
    if (res?.data?.email_sent) {
      toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
    } else if (res?.data && res.data.email_sent === false) {
      toast.warning('Cuota confirmada, pero el correo no pudo enviarse. Revisa el audit log.', { timeout: 6000 })
    }
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error(apiErrorMessage(err) || 'Error al confirmar cuota.')
  }
}

// Pago adicional del becado (certificado): registra el pago y activa la
// etiqueta Certificar; el refresh trae certificate_status_alias actualizado.
async function handleSaveAdditional (payload) {
  savingFinancials.value = true
  try {
    await ficoService.registerAdditionalPayment({ enrollment_id: enrollmentId.value, ...payload })
    toast.success('Pago de certificado registrado. Etiqueta Certificar activada.')
    await refreshDetail()
    refreshAuditLog()
  } catch (err) {
    console.error(err)
    toast.error(apiErrorMessage(err) || 'Error al registrar el pago adicional.')
  } finally {
    savingFinancials.value = false
  }
}

// Edicion del pago de certificado (nav Adicionales): exige justificacion y el
// backend audita el diff old -> new, visible en el Historial.
async function handleUpdateAdditional (payload) {
  savingFinancials.value = true
  try {
    await ficoService.editAdditionalPayment({ enrollment_id: enrollmentId.value, ...payload })
    toast.success('Pago de certificado actualizado.')
    await refreshDetail()
    refreshAuditLog()
  } catch (err) {
    console.error(err)
    toast.error(apiErrorMessage(err) || 'Error al actualizar el pago adicional.')
  } finally {
    savingFinancials.value = false
  }
}

async function handleSaveCuotasData () {
  savingFinancials.value = true
  try {
    const eid = enrollmentId.value
    const inicial = modalInstallments.value.find(i => i.installment_number === 0 || i.is_reserva)
    const cuotas = modalInstallments.value.filter(i => i.installment_number !== 0 && !i.is_reserva)
    const allInst = [...(inicial ? [inicial] : []), ...cuotas]
    const installments = allInst
      .filter(c => c.status !== 'paid')
      .map(c => ({
        installment_id: c.installment_id || null,
        installment_number: c.installment_number,
        amount: Number(c.amount) || 0,
        due_date: c.due_date || null,
        cat_currency: c._cat_currency,
        cat_payment_medium: c._cat_payment_medium,
        cat_business_entity: c._cat_business_entity,
        bank_account_id: c._bank_account_id,
        transaction_code: c._transaction_code,
        is_new: c._isNew || false
      }))
    await ficoService.confirmPayment({ enrollment_id: eid, action: 'update_installments_data', installments })
    toast.success('Datos financieros guardados correctamente.', { timeout: 3000 })
    ficoService.sendPaymentConfirmationEmail(eid).then(r => {
      if (r?.success) toast.info('Correo de confirmacion de cuota enviado.', { timeout: 4000 })
    }).catch(() => {})
    ficoService.syncInstallmentPayment(eid).then(r => {
      if (r?.success) toast.info('Cuota sincronizada con Odoo.', { timeout: 4000 })
    }).catch(() => {})
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error('Error al guardar los datos financieros.')
  } finally {
    savingFinancials.value = false
  }
}

async function handleRejectEnrollment (payload) {
  // Acepta el string legacy y el objeto { reason, clearCcRequirement }.
  const reason = typeof payload === 'string' ? payload : (payload?.reason || '')
  try {
    await ficoService.rejectEnrollment({
      enrollment_id: enrollmentId.value,
      reason: reason.trim(),
      clear_cc_requirement: payload?.clearCcRequirement === true
    })
    toast.success('Inscripcion observada. Se notifico al asesor.')
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error(apiErrorMessage(err) || 'Error al observar inscripcion.')
  }
}

function handleRescheduleCompleted () {
  refreshDetail()
}

function openEditAmount (cuota) {
  if (!cuota?.installment_id) return
  editAmountTarget.value = cuota
  editAmountVisible.value = true
}

async function handleEditAmountSubmit (payload) {
  savingEditAmount.value = true
  try {
    await ficoService.editInstallmentAmount({
      enrollment_id: enrollmentId.value,
      installment_id: payload.installment_id,
      new_amount: payload.new_amount,
      justificacion: payload.justificacion
    })
    toast.success('Monto de cuota actualizado.')
    editAmountVisible.value = false
    editAmountTarget.value = null
    await refreshDetail()
  } catch (err) {
    console.error('[editInstallmentAmount]', err)
    toast.error(apiErrorMessage(err) || 'No se pudo editar el monto.')
  } finally {
    savingEditAmount.value = false
  }
}

// message primero: con el formato por defecto de Fastify `error` es solo el
// texto del status ("Bad Request") y el motivo real (el DomainError) va en `message`.
function apiErrorMessage (err) {
  const data = err?.response?.data
  return data?.message || data?.error
}

// El backend corrige la BD pero no puede deshacer lo que ya salio (correo,
// Odoo): esos avisos se muestran aparte y con mas tiempo para que se lean.
function showCorrectionWarnings (result) {
  for (const warning of result?.warnings || []) toast.warning(warning, { timeout: 9000 })
}

function openCorrectInitial (inicial) {
  if (!inicial?.installment_id) return
  correctInitialTarget.value = inicial
  correctInitialVisible.value = true
}

async function handleCorrectInitialSubmit (payload) {
  savingCorrectInitial.value = true
  try {
    const result = await ficoService.correctInitialPayment({
      enrollment_id: enrollmentId.value,
      new_amount: payload.new_amount,
      justificacion: payload.justificacion
    })
    toast.success(result?.message || 'Pago inicial corregido.')
    showCorrectionWarnings(result)
    correctInitialVisible.value = false
    correctInitialTarget.value = null
    await refreshDetail()
  } catch (err) {
    console.error('[correctInitialPayment]', err)
    toast.error(apiErrorMessage(err) || 'No se pudo corregir el pago inicial.')
  } finally {
    savingCorrectInitial.value = false
  }
}

function openRevert (cuota) {
  if (!cuota?.installment_id) return
  revertTarget.value = cuota
  revertVisible.value = true
}

async function handleRevertSubmit (payload) {
  savingRevert.value = true
  try {
    const result = await ficoService.revertInstallmentPayment({
      enrollment_id: enrollmentId.value,
      installment_id: payload.installment_id,
      justificacion: payload.justificacion
    })
    toast.success('Cuota devuelta a pendiente.')
    showCorrectionWarnings(result)
    revertVisible.value = false
    revertTarget.value = null
    await refreshDetail()
  } catch (err) {
    console.error('[revertInstallmentPayment]', err)
    toast.error(apiErrorMessage(err) || 'No se pudo revertir la cuota.')
  } finally {
    savingRevert.value = false
  }
}

// Carga la cola de pendientes con la misma fecha de pago para navegar entre
// ellos con las flechas del topbar. Se invoca al montar y queda fija durante
// la sesion de revision (no se re-llama tras confirmar — el operador navega
// manualmente al siguiente).
async function loadSameDayPending () {
  const currentPayDate = enrollment.value?.pay_date
  if (!currentPayDate) {
    sameDayPending.value = []
    return
  }
  try {
    const result = await ficoService.enrollmentList({
      confirmations: ['Pendiente Revisar', 'Pendiente'],
      size: 500,
      page: 1
    })
    const items = result?.items || []
    sameDayPending.value = items.filter(i => i.pay_date === currentPayDate)
  } catch (err) {
    console.error('[loadSameDayPending]', err)
    sameDayPending.value = []
  }
}

const currentNavIndex = computed(() =>
  sameDayPending.value.findIndex(i => Number(i.enrollment_id) === enrollmentId.value)
)
const totalNav        = computed(() => sameDayPending.value.length)
const prevNavTarget   = computed(() => {
  const idx = currentNavIndex.value
  return idx > 0 ? sameDayPending.value[idx - 1] : null
})
// Si la venta abierta no esta en la cola (ya aprobada), la flecha lleva al
// primer pendiente del dia: antes mostraba "— / 7" con las dos flechas muertas.
const nextNavTarget   = computed(() => {
  const idx = currentNavIndex.value
  if (idx < 0) return sameDayPending.value[0] || null
  return idx < sameDayPending.value.length - 1 ? sameDayPending.value[idx + 1] : null
})

function goToPrevPending () {
  if (prevNavTarget.value) {
    router.push({ name: 'enrollmentDetail', params: { id: String(prevNavTarget.value.enrollment_id) } })
  }
}
function goToNextPending () {
  if (nextNavTarget.value) {
    router.push({ name: 'enrollmentDetail', params: { id: String(nextNavTarget.value.enrollment_id) } })
  }
}

function handleActionCompleted () {
  refreshDetail()
}

// La fila de UNA venta, pedida por id: el SP la lee de la vista viva (no de la
// foto que refresca el cron), asi una venta recien creada desde Tokens se abre
// al instante. findEnrollmentById es la red: nunca se toma otra venta.
async function fetchEnrollmentRow () {
  const result = await ficoService.enrollmentList({ enrollment_id: enrollmentId.value, size: 1, page: 1 })
  return findEnrollmentById(result?.items || (Array.isArray(result) ? result : []), enrollmentId.value)
}

async function refreshDetail () {
  try {
    const [paymentResponse, freshRow] = await Promise.all([
      ficoService.getPaymentDetail(enrollmentId.value),
      fetchEnrollmentRow()
    ])
    detail.value = paymentResponse || { installments: [], payment_history: [] }
    if (freshRow) enrollment.value = freshRow
    buildInstallments()
    refreshAuditLog()

    if (!ficoForm.payment_date && !lastPayment.value?.payment_date) {
      const commercialDate = detail.value?.commercial_pay_date
      if (commercialDate) ficoForm.payment_date = String(commercialDate).slice(0, 10)
    }

    // Default fecha de activacion = hoy para membresias en modo confirm.
    // Si el alumno la quiere futura, FICO la sube en el datepicker antes de
    // confirmar; el default mantiene el comportamiento legacy (inmediato).
    if (isMembershipEnrollment.value && !activationDate.value) {
      activationDate.value = todayIso.value
    }
  } catch (err) {
    console.error(err)
  }
}

function refreshAuditLog () {
  ficoService.getAuditLog(enrollmentId.value).then(r => { auditLog.value = r || [] }).catch(() => {})
}

async function loadEnrollment () {
  loading.value = true
  resetFicoForm()
  activeProfileId.value = null
  activeModalityId.value = null
  odooEmail.value = null
  odooPassword.value = null

  notFound.value = false
  const routeState = window.history.state?.enrollment
  if (routeState) {
    enrollment.value = routeState
  } else {
    try {
      const match = await fetchEnrollmentRow()
      enrollment.value = match || {}
      notFound.value = !match
    } catch (err) {
      console.error('Error cargando enrollment:', err)
      enrollment.value = {}
      notFound.value = true
    }
  }

  try {
    const response = await ficoService.getPaymentDetail(enrollmentId.value)
    detail.value = response || { installments: [], payment_history: [] }
  } catch (err) {
    console.error('Error cargando detalle:', err)
    detail.value = { installments: [], payment_history: [] }
  } finally {
    loading.value = false
    buildInstallments()
  }

  ficoService.getEnrollmentFlags(enrollmentId.value).then(flags => {
    if (flags) {
      activeProfileId.value = flags.cat_profile_id || null
      activeModalityId.value = flags.cat_inscription_modality || null
      odooEmail.value = flags.odoo_email || null
      odooPassword.value = flags.odoo_password || null
      studentFlags.value = flags
    }
    loadValidationData()
  }).catch(() => { loadValidationData() })

  refreshAuditLog()
  loadSameDayPending()
}

function loadValidationData () {
  const pvId = studentFlags.value?.program_version_id || enrollment.value?.program_version_id
  const parentEditionId = detail.value?.program_edition_id || enrollment.value?.program_edition_id || null
  if (pvId) {
    ficoService.getProgramChildren(pvId, parentEditionId).then(children => {
      programChildrenList.value = children || []
    }).catch(() => { programChildrenList.value = [] })
  }
  ficoService.getValidations(enrollmentId.value).then(vals => {
    validations.value = vals || []
  }).catch(() => { validations.value = [] })
}

async function handleToggleValidation (childVersionId) {
  const current = [...validations.value]
  const exists = current.some(v => v.child_version_id === childVersionId)
  let updated
  if (exists) {
    updated = current.filter(v => v.child_version_id !== childVersionId)
  } else {
    updated = [...current, { child_version_id: childVersionId }]
  }
  try {
    await ficoService.saveValidations({
      enrollment_id: enrollmentId.value,
      validations: updated
    })
    validations.value = updated
  } catch (err) {
    console.error(err)
  }
}

async function handleChangeEdition ({ childVersionId, editionId }) {
  // Cambio de edicion sobre un modulo a INSCRIBIR (no convalidar).
  // - Si el modulo ya estaba en validations como convalidado (cross/same_edition),
  //   actualizar su custom_edition_id manteniendo ese tipo.
  // - Si NO estaba, registrarlo con validation_type='edition_override' para que
  //   isValidated lo IGNORE pero se persista la edicion preferida.
  // - Si el usuario vuelve a "Misma edicion" (editionId null) sobre un override,
  //   eliminamos el registro para no dejar basura.
  const current = [...validations.value]
  const idx = current.findIndex(v => v.child_version_id === childVersionId)

  if (idx >= 0) {
    const prev = current[idx]
    const wasOverride = prev.validation_type === 'edition_override'
    if (wasOverride && !editionId) {
      current.splice(idx, 1)
    } else if (wasOverride) {
      current[idx] = { ...prev, custom_edition_id: editionId, validation_type: 'edition_override' }
    } else {
      current[idx] = { ...prev, custom_edition_id: editionId || null, validation_type: editionId ? 'cross_edition' : 'same_edition' }
    }
  } else if (editionId) {
    current.push({ child_version_id: childVersionId, custom_edition_id: editionId, validation_type: 'edition_override' })
  }

  try {
    await ficoService.saveValidations({ enrollment_id: enrollmentId.value, validations: current })
    validations.value = current
  } catch (err) { console.error(err) }
}

onMounted(() => {
  catalogs.loadCatalogs()
  loadEnrollment()
})

// Vue Router reusa la instancia del componente al navegar entre /inscripciones/:id
// con distintos ids (mismo route name). Sin este watch, props.id cambia pero los
// datos en pantalla quedan del inscripto anterior.
watch(enrollmentId, (newId, oldId) => {
  if (newId === oldId || !newId) return
  loadEnrollment()
})
</script>

<style scoped>
/* Marco ds-*: la ficha (EnrollmentHeader/Odoo) queda fija a la izquierda y
   las pestañas en un panel; el scroll es el de la página, no uno interno. */
.edv-back {
  display: inline-flex; align-items: center; gap: 6px;
  margin: 0 0 6px; padding: 0; border: 0; background: none;
  font: inherit; font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); cursor: pointer;
}
.edv-back:hover, .edv-back:focus-visible { color: var(--ds-accent); }
.edv-back i { font-size: 11px; }

.edv-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.edv-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border: 1px solid; border-radius: 999px;
  font-size: 12.5px; font-weight: 700; line-height: 1; white-space: nowrap;
}
.edv-status.ok { border-color: var(--ds-ok); background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.edv-status.warn { border-color: var(--ds-warn); background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.edv-status.bad { border-color: var(--ds-bad); background: var(--ds-soft-bad); color: var(--ds-bad-ink); }

.edv-nav {
  display: inline-flex; align-items: stretch; overflow: hidden;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control); background: var(--ds-surface);
}
.edv-nav-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer;
  border: 0; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--ds-ink);
}
.edv-nav-btn i { font-size: 10px; }
.edv-nav-btn:hover:not(:disabled) { background: var(--ds-surface-2); color: var(--ds-accent); }
.edv-nav-btn:disabled { color: var(--ds-muted); cursor: not-allowed; }
.edv-nav-btn:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.edv-nav-counter {
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3px 14px;
  border-inline: 1px solid var(--ds-border); font-size: 12.5px; color: var(--ds-ink); line-height: 1.2; font-variant-numeric: tabular-nums;
}
.edv-nav-counter small { font-size: 10.5px; color: var(--ds-muted); }
.edv-nav-badge {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-soft-warn); color: var(--ds-warn-ink); font-size: 10.5px; font-weight: 700;
}

.edv-layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: var(--ds-gap); align-items: start; }
.edv-aside {
  display: flex; flex-direction: column; gap: var(--ds-gap);
  position: sticky; top: calc(var(--layout-header-h) + 12px);
}
.edv-skel { gap: 12px; padding: 18px; }
.edv-skel .ds-skel:nth-child(3n) { width: 60%; }

.edv-main .ds-panel-head { padding: 10px 18px; }
.edv-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ds-tabs > button[aria-selected="true"] .edv-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

.edv-callout {
  display: flex; flex-direction: column; gap: 10px;
  margin-bottom: var(--ds-gap); padding: 14px 16px; border-radius: var(--ds-radius-sm);
}
.edv-callout.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.edv-callout.info { background: var(--ds-soft-info); color: var(--ds-info-ink); }
.edv-callout-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 13px; font-weight: 700; }
.edv-callout-text { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ds-ink); }
.edv-callout-actions { display: flex; gap: 8px; }
.edv-date { max-width: 220px; }

@media (max-width: 1100px) {
  .edv-layout { grid-template-columns: 1fr; }
  .edv-aside { position: static; }
}
</style>
