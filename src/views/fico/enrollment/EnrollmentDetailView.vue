<template>
  <div class="edv-page">
    <!-- Top bar -->
    <div class="edv-topbar">
      <button class="edv-back" @click="goBack">
        <i class="fa-solid fa-arrow-left"></i> Volver al listado
      </button>
      <div class="edv-topbar-info">
        <span class="edv-topbar-name">{{ detail.student_full_name || enrollment?.student_full_name || '' }}</span>
        <span class="edv-topbar-program">{{ detail.program_name || enrollment?.program_name || '' }}</span>
        <span class="edv-topbar-pill" :class="statusPillClass">{{ statusLabel }}</span>
      </div>
      <div v-if="totalNav > 0" class="edv-topbar-nav" :title="`Pendientes del ${fmt.formatDate(enrollment?.pay_date)}`">
        <span class="edv-nav-counter">
          {{ currentNavIndex >= 0 ? currentNavIndex + 1 : '—' }} / {{ totalNav }}
        </span>
        <button class="edv-nav-btn" :disabled="!prevNavTarget" @click="goToPrevPending" :title="prevNavTarget ? `Anterior: ${prevNavTarget.student_full_name}` : 'No hay anterior'">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button class="edv-nav-btn" :disabled="!nextNavTarget" @click="goToNextPending" :title="nextNavTarget ? `Siguiente: ${nextNavTarget.student_full_name}` : 'No hay siguiente'">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="edv-loading">
      <div class="edv-spinner"></div>
      <span>Cargando detalle...</span>
    </div>

    <!-- Two-column layout -->
    <div v-else class="edv-layout">
      <!-- LEFT PANEL (40%) - Info fija -->
      <aside class="edv-sidebar">
        <EnrollmentHeader
          :enrollment="enrollment"
          :detail="detail"
          :current-profile="currentProfile"
          :total="modalTotal"
        />
        <EnrollmentOdoo
          :odoo-email="odooEmail"
          :odoo-password="odooPassword"
        />
      </aside>

      <!-- RIGHT PANEL (60%) - Tabs de contenido -->
      <main class="edv-main">
        <div class="edv-tabs">
          <button
            :class="['edv-tab', { active: activeTab === 'finanzas' }]"
            @click="activeTab = 'finanzas'"
          >
            <i class="fa-solid fa-file-invoice-dollar"></i> Finanzas
          </button>
          <button
            v-if="modalMode === 'view'"
            :class="['edv-tab', { active: activeTab === 'acciones' }]"
            @click="activeTab = 'acciones'"
          >
            <i class="fa-solid fa-bolt"></i> Acciones
          </button>
          <button
            :class="['edv-tab', { active: activeTab === 'historial' }]"
            @click="activeTab = 'historial'"
          >
            <i class="fa-solid fa-clock-rotate-left"></i> Historial
            <span v-if="auditLog.length" class="edv-tab-badge">{{ auditLog.length }}</span>
          </button>
        </div>

        <div class="edv-tab-content">
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
            @start-edit="startEditing"
            @cancel-edit="cancelEditing"
            @save-edit="handleSaveEdit"
            @confirm-payment="handleConfirmPayment"
            @confirm-plan="handleConfirmPlan"
            @save-cuotas="handleSaveCuotasData"
            @add-cuota="addCuota"
            @remove-cuota="removeCuota"
            @confirm-cuota="handleConfirmCuota"
            @reject-enrollment="handleRejectEnrollment"
            @toggle-validation="handleToggleValidation"
            @change-edition="handleChangeEdition"
            @open-reschedule="rescheduleVisible = true"
            @edit-cuota-amount="openEditAmount"
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
      @completed="handleRescheduleCompleted"
    />

    <EditInstallmentAmountModal
      v-model:visible="editAmountVisible"
      :installment="editAmountTarget"
      :saving="savingEditAmount"
      @submit="handleEditAmountSubmit"
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
import EnrollmentOdoo from './EnrollmentOdoo.vue'
import EnrollmentFinancials from './EnrollmentFinancials.vue'
import EnrollmentActions from './EnrollmentActions.vue'
import EnrollmentAuditLog from './EnrollmentAuditLog.vue'
import RescheduleInstallmentsModal from './RescheduleInstallmentsModal.vue'
import EditInstallmentAmountModal from './EditInstallmentAmountModal.vue'
import AddInstallmentModal from './AddInstallmentModal.vue'

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

// Financials
const isEditing = ref(false)
const savingFinancials = ref(false)
const modalInstallments = ref([])

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

const modalTotal = computed(() => {
  if (modalInstallments.value?.length) {
    return modalInstallments.value.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  }
  return Number(enrollment.value?.total_to_pay) || Number(detail.value?.net_amount) || 0
})

const statusLabel = computed(() => {
  const s = enrollment.value?.confirmation
  if (!s || s.toLowerCase().includes('pendiente')) return 'Pendiente Revisar'
  return s
})
const statusPillClass = computed(() => fmt.statusPill(enrollment.value?.confirmation))

const lastPayment = computed(() => {
  const hist = detail.value?.payment_history
  if (!hist || !Array.isArray(hist) || !hist.length) return null
  return hist[0]
})

const profileOptions = computed(() => {
  if (catalogService) {
    return catalogService.options('we_profile').map(i => ({
      id: i.id ?? i.raw?.id,
      description: i.description ?? i.raw?.description
    }))
  }
  return [
    { id: 3086, description: 'PROFESIONAL' },
    { id: 3087, description: 'ESTUDIANTE' },
    { id: 3200, description: 'GENERAL' }
  ]
})

const currentProfile = computed(() => {
  const profId = activeProfileId.value || detail.value?.cat_profile_id || enrollment.value?.cat_profile_id
  if (!profId) return enrollment.value?.occupation_label === 'E' ? 'ESTUDIANTE' : 'PROFESIONAL'
  const found = profileOptions.value.find(p => p.id === profId)
  return found?.description || '---'
})

const modalityOptions = computed(() => {
  if (catalogService) {
    return catalogService.options('we_insc_modality').map(i => ({
      id: i.id ?? i.raw?.id,
      description: i.description ?? i.raw?.description,
      alias: i.alias
    }))
  }
  return [
    { id: 2626, description: 'Normal (Regular)', alias: 'we_insc_modality_normal' },
    { id: 2625, description: 'Flexible (Flex)', alias: 'we_insc_modality_flexible' }
  ]
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

function resolveInstallmentStatus (i) {
  const alias = i.status_alias || ''
  if (alias.includes('paid')) return 'paid'
  if (alias.includes('pending')) return 'pending'
  return 'draft'
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
      status: resolveInstallmentStatus(i),
      _cat_currency: pay?.cat_payment_medium_id ? (detail.value?.cat_currency_id || null) : (i.cat_currency || null),
      _cat_payment_medium: pay?.cat_payment_medium_id || i.cat_payment_medium || null,
      _cat_business_entity: pay?.cat_business_entity_id || i.cat_business_entity || null,
      _bank_account_id: pay?.bank_account_id || i.bank_account_id || null,
      _transaction_code: pay?.transaction_code || i.transaction_code || '',
      _voucher_url: pay?.evidence_url || i.evidence_url || null,
      _payment_date: pay?.payment_date
        ? String(pay.payment_date).slice(0, 10)
        : (isInicial ? commercialDate : ''),
      _isNew: false
    }
  })
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
    toast.error(err?.response?.data?.error || 'No se pudo agregar la cuota.')
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
  isEditing.value = true
}

function cancelEditing () {
  isEditing.value = false
  resetFicoForm()
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
    fields.notes = detail.value?.notes || null
    await ficoService.enrollmentUpdate({ enrollment_id: eid, justificacion: justificacion.trim(), fields })
    toast.success('Cambios guardados correctamente.')
    isEditing.value = false
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error('Error al guardar cambios.')
  } finally {
    savingFinancials.value = false
  }
}

async function handleConfirmPayment () {
  savingFinancials.value = true
  try {
    const eid = enrollmentId.value
    const resp = await ficoService.confirmPayment({
      enrollment_id: eid,
      action: 'confirm_contado',
      cat_currency: ficoForm.cat_currency,
      cat_payment_medium: ficoForm.cat_payment_medium,
      cat_business_entity: ficoForm.cat_business_entity,
      bank_account_id: ficoForm.bank_account_id,
      transaction_code: ficoForm.transaction_code,
      payment_date: ficoForm.payment_date || null
    })
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
    toast.success('Pago registrado e inscripcion en Odoo completada.', { timeout: 4000 })
    try {
      const emailResult = await ficoService.sendConfirmationEmail(eid)
      if (emailResult?.success) {
        toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
      } else {
        toast.error(`Error al enviar correo: ${emailResult?.error || 'fallo desconocido'}`, { timeout: 6000 })
      }
    } catch (emailErr) {
      console.error('[sendConfirmationEmail]', emailErr)
      const msg = emailErr?.response?.data?.error || emailErr?.message || 'fallo desconocido'
      toast.error(`Error al enviar correo: ${msg}`, { timeout: 7000 })
    }
    await refreshDetail()
  } catch (err) {
    console.error('[confirmPayment]', err)
    const msg = err?.response?.data?.error || err?.message || 'error desconocido'
    toast.error(`Error al confirmar el pago: ${msg}`, { timeout: 7000 })
  } finally {
    savingFinancials.value = false
  }
}

async function handleConfirmPlan () {
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
    const resp = await ficoService.confirmPayment({
      enrollment_id: eid,
      action: 'confirm_plan',
      installments: keepInstallments,
      cat_currency: inicial?._cat_currency || null,
      cat_payment_medium: inicial?._cat_payment_medium || null,
      cat_business_entity: inicial?._cat_business_entity || null,
      bank_account_id: inicial?._bank_account_id || null,
      transaction_code: inicial?._transaction_code || '',
      payment_date: inicial?._payment_date || null
    })
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
    toast.success('Plan de cuotas confirmado e inscripcion en Odoo completada.', { timeout: 4000 })
    const emailResult = await ficoService.sendConfirmationEmail(eid)
    if (emailResult?.success) {
      toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
    } else {
      toast.error(`Error al enviar correo: ${emailResult?.error || 'fallo desconocido'}`, { timeout: 6000 })
    }
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error('Error al confirmar el plan.')
  } finally {
    savingFinancials.value = false
  }
}

async function handleConfirmCuota (cuota) {
  try {
    await ficoService.confirmInstallment({
      installment_id: cuota.installment_id,
      enrollment_id: enrollmentId.value,
      cat_currency: cuota._cat_currency,
      cat_payment_medium: cuota._cat_payment_medium,
      cat_business_entity: cuota._cat_business_entity,
      bank_account_id: cuota._bank_account_id,
      transaction_code: cuota._transaction_code,
      voucher_url: cuota._voucher_url,
      payment_date: cuota._payment_date || null
    })
    toast.success(`Cuota ${cuota.installment_number} confirmada.`)
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al confirmar cuota.')
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

async function handleRejectEnrollment (reason) {
  try {
    await ficoService.rejectEnrollment({
      enrollment_id: enrollmentId.value,
      reason: reason.trim()
    })
    toast.success('Inscripcion observada. Se notifico al asesor.')
    await refreshDetail()
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al observar inscripcion.')
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
    toast.error(err?.response?.data?.error || 'No se pudo editar el monto.')
  } finally {
    savingEditAmount.value = false
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
const nextNavTarget   = computed(() => {
  const idx = currentNavIndex.value
  return idx >= 0 && idx < sameDayPending.value.length - 1 ? sameDayPending.value[idx + 1] : null
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

async function refreshDetail () {
  try {
    const [paymentResponse, listResult] = await Promise.all([
      ficoService.getPaymentDetail(enrollmentId.value),
      ficoService.enrollmentList({ q: String(enrollmentId.value), size: 50, page: 1 })
    ])
    detail.value = paymentResponse || { installments: [], payment_history: [] }
    const items = listResult?.items || (Array.isArray(listResult) ? listResult : [])
    const match = items.find(i => Number(i.enrollment_id) === enrollmentId.value)
    if (match) enrollment.value = match
    buildInstallments()
    refreshAuditLog()

    if (!ficoForm.payment_date && !lastPayment.value?.payment_date) {
      const commercialDate = detail.value?.commercial_pay_date
      if (commercialDate) ficoForm.payment_date = String(commercialDate).slice(0, 10)
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

  const routeState = window.history.state?.enrollment
  if (routeState) {
    enrollment.value = routeState
  } else {
    try {
      const result = await ficoService.enrollmentList({ q: String(enrollmentId.value), size: 50, page: 1 })
      const items = result?.items || (Array.isArray(result) ? result : [])
      const match = items.find(i => Number(i.enrollment_id) === enrollmentId.value)
      enrollment.value = match || items[0] || {}
    } catch (err) {
      console.error('Error cargando enrollment:', err)
      enrollment.value = {}
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
.edv-page {
  background: #fff;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1A1A1A;
}

/* Top bar */
.edv-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 32px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #F0F0F0;
}

.edv-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #737373;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: all .2s ease;
}
.edv-back:hover { background: #FAFAFA; color: #1A1A1A; }
.edv-back i { font-size: 12px; }

.edv-topbar-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.edv-topbar-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  letter-spacing: -0.01em;
}
.edv-topbar-program {
  font-size: 13px;
  color: #A3A3A3;
  font-weight: 400;
}

.edv-topbar-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
}
.edv-topbar-pill.pill-green { background: #ECFDF5; color: #065F46; }
.edv-topbar-pill.pill-amber { background: #FFF8EB; color: #92400E; }
.edv-topbar-pill.pill-red   { background: #FEF2F2; color: #991B1B; }

.edv-topbar-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 12px;
  border-radius: 8px;
  background: #FAFAFA;
  border: 1px solid #F0F0F0;
  margin-left: auto;
}
.edv-nav-counter {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.edv-nav-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: #fff;
  color: #1A1A1A;
  font-size: 11px;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.edv-nav-btn:hover:not(:disabled) { background: #F0F0F0; }
.edv-nav-btn:disabled { color: #C4C4C4; cursor: not-allowed; }

/* Loading */
.edv-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 120px 24px;
  color: #C4C4C4;
  font-size: 13px;
}

.edv-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #F0F0F0;
  border-top-color: #1A1A1A;
  border-radius: 50%;
  animation: edv-spin .6s linear infinite;
}
@keyframes edv-spin { to { transform: rotate(360deg); } }

/* Two-column layout */
.edv-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 0;
  height: calc(100vh - 56px);
  overflow: hidden;
}

.edv-sidebar {
  padding: 28px 24px;
  overflow-y: auto;
  border-right: 1px solid #F0F0F0;
  background: #FAFAFA;
}

.edv-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

/* Tabs */
.edv-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #F0F0F0;
  background: #fff;
  padding: 0 32px;
  flex-shrink: 0;
}

.edv-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  font-size: 13px;
  font-weight: 500;
  color: #A3A3A3;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color .2s ease, border-color .2s ease;
  font-family: inherit;
  letter-spacing: -0.01em;
}
.edv-tab:hover { color: #1A1A1A; }
.edv-tab.active {
  color: #1A1A1A;
  font-weight: 600;
  border-bottom-color: #1A1A1A;
}
.edv-tab i { font-size: 13px; }

.edv-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #F0F0F0;
  color: #737373;
  font-size: 10px;
  font-weight: 600;
}

.edv-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
}

/* Redirect overlay */
.edv-redirect-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 40px;
  pointer-events: none;
}

.edv-redirect-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: #1A1A1A;
  color: #fff;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 16px 48px rgba(0,0,0,.16);
  pointer-events: auto;
  animation: edv-slide-up .3s cubic-bezier(.16,1,.3,1);
}

.edv-redirect-card i { color: #34D399; font-size: 16px; }
.edv-redirect-card span { display: flex; flex-direction: column; gap: 2px; }
.edv-redirect-sub { font-size: 11px; opacity: 0.7; font-weight: 400; }

.edv-redirect-cancel {
  background: rgba(255,255,255,.12);
  border: none;
  color: rgba(255,255,255,.8);
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background .2s ease;
}
.edv-redirect-cancel:hover { background: rgba(255,255,255,.2); }

@keyframes edv-slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .edv-page {
  background: #0E0E0A;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .edv-topbar {
  background: #14140F;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .edv-back { color: #A0A099; }
[data-coreui-theme="dark"] .edv-back:hover { background: #1F1F1A; color: #F4F4F0; }
[data-coreui-theme="dark"] .edv-topbar-name { color: #F4F4F0; }
[data-coreui-theme="dark"] .edv-topbar-program { color: #6F6F66; }

[data-coreui-theme="dark"] .edv-topbar-pill.pill-green { background: rgba(16,185,129,0.16); color: #34D399; }
[data-coreui-theme="dark"] .edv-topbar-pill.pill-amber { background: rgba(245,158,11,0.16); color: #FBBF24; }
[data-coreui-theme="dark"] .edv-topbar-pill.pill-red   { background: rgba(239,68,68,0.16); color: #F87171; }

[data-coreui-theme="dark"] .edv-topbar-nav {
  background: #14140F;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .edv-nav-counter { color: #F4F4F0; }
[data-coreui-theme="dark"] .edv-nav-btn {
  background: #1F1F1A;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .edv-nav-btn:hover:not(:disabled) { background: #2A2A22; }
[data-coreui-theme="dark"] .edv-nav-btn:disabled { color: #6F6F66; }

[data-coreui-theme="dark"] .edv-loading { color: #6F6F66; }
[data-coreui-theme="dark"] .edv-spinner {
  border-color: #2A2A22;
  border-top-color: #F4F4F0;
}

[data-coreui-theme="dark"] .edv-sidebar {
  background: #14140F;
  border-right-color: #2A2A22;
}
[data-coreui-theme="dark"] .edv-main { background: #0E0E0A; }

[data-coreui-theme="dark"] .edv-tabs {
  background: #0E0E0A;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .edv-tab { color: #6F6F66; }
[data-coreui-theme="dark"] .edv-tab:hover { color: #F4F4F0; }
[data-coreui-theme="dark"] .edv-tab.active {
  color: #F4F4F0;
  border-bottom-color: #F4F4F0;
}
[data-coreui-theme="dark"] .edv-tab-badge {
  background: #2A2A22;
  color: #A0A099;
}

[data-coreui-theme="dark"] .edv-redirect-card {
  background: #F4F4F0;
  color: #14140F;
  box-shadow: 0 16px 48px rgba(0,0,0,.5);
}
[data-coreui-theme="dark"] .edv-redirect-card i { color: #10B981; }
[data-coreui-theme="dark"] .edv-redirect-cancel {
  background: rgba(20,20,15,.12);
  color: rgba(20,20,15,.7);
}
[data-coreui-theme="dark"] .edv-redirect-cancel:hover { background: rgba(20,20,15,.2); }
</style>
