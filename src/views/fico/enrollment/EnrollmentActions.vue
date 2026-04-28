<template>
  <section class="eact-section">
    <h3 class="eact-title"><i class="fa-solid fa-bolt"></i> Acciones</h3>

    <!-- Action buttons (when no action is active) -->
    <div v-if="!activeAction" class="eact-buttons">
      <button class="eact-btn" @click="startAction('rp')">
        <i class="fa-solid fa-calendar-xmark"></i> Reprogramar Edicion
        <span class="eact-tag">RP</span>
      </button>
      <button class="eact-btn" @click="startAction('cc')">
        <i class="fa-solid fa-right-left"></i> Cambio de Curso
        <span class="eact-tag eact-tag-cc">CC</span>
      </button>
      <div class="eact-sep"></div>
      <button class="eact-btn" @click="startAction('modality')">
        <i class="fa-solid fa-shuffle"></i> Cambiar Modalidad
      </button>
      <button class="eact-btn" @click="startAction('editStudent')">
        <i class="fa-solid fa-user-pen"></i> Editar Alumno
      </button>
      <div class="eact-sep"></div>
      <button class="eact-btn eact-btn-danger" @click="startAction('retire')">
        <i class="fa-solid fa-user-slash"></i> Retirar Alumno
      </button>
    </div>

    <!-- Active action with stepper -->
    <div v-if="activeAction" class="eact-active">
      <!-- REPROGRAMAR EDICION -->
      <ActionStepper
        v-if="activeAction === 'rp'"
        v-model="stepperStep"
        :steps="hasEmailStep ? ['Reprogramar Edicion', 'Preview Correo'] : ['Reprogramar Edicion']"
        :can-advance="canAdvanceRP"
        :loading="saving"
        :confirm-label="hasEmailStep && stepperStep === 1 ? 'Confirmar y Enviar' : 'Confirmar Reprogramacion'"
        confirm-icon="fa-arrow-right-arrow-left"
        @cancel="cancelAction"
        @confirm="handleReprogramConfirm"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-student-bar">
              <div class="eact-student-main">
                <span class="eact-student-name">{{ enrollment?.student_full_name || '---' }}</span>
                <span class="eact-student-doc">{{ enrollment?.document_number || '---' }}</span>
              </div>
              <span class="eact-program-pill">{{ enrollment?.program_name || '---' }}</span>
            </div>
            <div class="eact-grid-2">
              <div class="eact-field">
                <label>Edicion Actual</label>
                <div class="eact-readonly">{{ enrollment?.edition_code || '---' }}</div>
              </div>
              <div class="eact-field">
                <label>Fecha Inicio</label>
                <div class="eact-readonly">{{ fmt.formatDate(enrollment?.start_date || enrollment?.edition_start_date) }}</div>
              </div>
            </div>
            <div class="eact-field">
              <label>Nueva Edicion</label>
              <div class="eact-select-wrap">
                <select v-model="rpEditionId" class="eact-select" :disabled="loadingEditions">
                  <option :value="null" disabled>{{ loadingEditions ? 'Cargando ediciones...' : 'Seleccionar edicion...' }}</option>
                  <option v-for="ed in rpEditions" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                </select>
                <i v-if="loadingEditions" class="fa-solid fa-spinner fa-spin eact-select-icon"></i>
                <i v-else class="fa-solid fa-chevron-down eact-select-icon"></i>
              </div>
            </div>
            <div class="eact-field">
              <label>Justificacion <span class="eact-req">*</span></label>
              <textarea v-model="rpJustificacion" class="eact-textarea" rows="3" placeholder="Motivo de la reprogramacion..."></textarea>
            </div>
          </div>
        </template>
        <template #step-1>
          <EmailPreviewStep :enrollment-id="enrollmentId" :active="stepperStep === 1" ref="emailPreviewRef" />
        </template>
      </ActionStepper>

      <!-- CAMBIO DE CURSO -->
      <ActionStepper
        v-if="activeAction === 'cc'"
        v-model="stepperStep"
        :steps="hasEmailStep ? ['Cambio de Curso', 'Preview Correo'] : ['Cambio de Curso']"
        :can-advance="canAdvanceCC"
        :loading="saving"
        :confirm-label="hasEmailStep && stepperStep === 1 ? 'Confirmar y Enviar' : 'Confirmar Cambio de Curso'"
        confirm-icon="fa-exchange-alt"
        @cancel="cancelAction"
        @confirm="handleCourseChangeConfirm"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-student-bar">
              <div class="eact-student-main">
                <span class="eact-student-name">{{ enrollment?.student_full_name || '---' }}</span>
                <span class="eact-student-doc">{{ enrollment?.document_number || '---' }}</span>
              </div>
              <span class="eact-program-pill">{{ detail?.program_name || enrollment?.program_name || '---' }} — {{ detail?.edition_code || enrollment?.edition_code || '' }}</span>
            </div>

            <div class="eact-subsection-label">Inscripcion actual</div>
            <div class="eact-grid-3">
              <div class="eact-field">
                <label>Programa</label>
                <div class="eact-readonly">{{ detail?.program_name || enrollment?.program_name || '---' }}</div>
              </div>
              <div class="eact-field">
                <label>Edicion</label>
                <div class="eact-readonly">{{ detail?.edition_code || enrollment?.edition_code || '---' }}</div>
              </div>
              <div class="eact-field">
                <label>Pagado hasta ahora</label>
                <div class="eact-amount eact-amount-green">{{ fmt.formatMoney(ccPagado) }}</div>
              </div>
            </div>

            <div class="eact-subsection-label">Programa destino</div>
            <div class="eact-grid-2">
              <div class="eact-field">
                <label>Nuevo programa</label>
                <SearchSelect
                  v-model="ccProgramVersionId"
                  :items="ccProgramsList"
                  label-field="label"
                  value-field="program_version_id"
                  placeholder="Buscar programa..."
                  @update:modelValue="onCCProgramChange"
                />
              </div>
              <div class="eact-field">
                <label>Nueva edicion</label>
                <select v-model="ccEditionId" class="eact-select" :disabled="!ccProgramVersionId || ccLoadingEditions" @change="onCCEditionChange">
                  <option :value="null" disabled>{{ ccLoadingEditions ? 'Cargando...' : 'Seleccionar edicion...' }}</option>
                  <option v-for="ed in ccEditionsList" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                </select>
              </div>
            </div>
            <div class="eact-grid-3" style="margin-top:12px">
              <div class="eact-field">
                <label>Precio lista nuevo</label>
                <div class="eact-amount">{{ fmt.formatMoney(ccEditionFinalPrice) }}</div>
                <small v-if="ccDiscountRate > 0 && ccEditionListPrice > 0" class="eact-price-hint">
                  Base S/. {{ fmt.formatMoney(ccEditionListPrice) }} − {{ Math.round(ccDiscountRate * 100) }}% dscto
                </small>
              </div>
              <div class="eact-field">
                <label>Diferencia</label>
                <div class="eact-amount" :class="{ 'eact-amount-red': ccDiferencia > 0 }">{{ fmt.formatMoney(ccDiferencia) }}</div>
              </div>
              <div class="eact-field">
                <label>Monto a registrar</label>
                <input v-model.number="ccTotalAmount" type="number" step="0.01" min="0" class="eact-input eact-input-amount" placeholder="0.00" />
              </div>
            </div>

            <div class="eact-subsection-label">Datos del pago</div>
            <div class="eact-grid-3">
              <div class="eact-field">
                <label>Moneda</label>
                <SearchSelect v-model="ccForm.cat_currency" :items="catalogs?.catCurrency || []" label-field="description" value-field="id" placeholder="Moneda..." />
              </div>
              <div class="eact-field">
                <label>Medio de pago</label>
                <SearchSelect v-model="ccForm.cat_method_payment" :items="catalogs?.catPaymentMedium || []" label-field="description" value-field="id" placeholder="Medio..." />
              </div>
              <div class="eact-field">
                <label>Entidad</label>
                <SearchSelect v-model="ccForm.cat_business_entity" :items="catalogs?.catBusinessEntity || []" label-field="description" value-field="id" placeholder="Entidad..." @update:modelValue="ccForm.bank_account_id = null" />
              </div>
              <div class="eact-field">
                <label>Cuenta bancaria</label>
                <select v-model="ccForm.bank_account_id" class="eact-select" :disabled="!ccForm.cat_business_entity">
                  <option :value="null">{{ ccForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                  <option v-for="a in filteredAccounts(ccForm.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }} — {{ a.account_number }}</option>
                </select>
              </div>
              <div class="eact-field">
                <label>N. Operacion</label>
                <input v-model.trim="ccForm.transaction_code" type="text" class="eact-input" placeholder="Codigo de operacion..." />
              </div>
            </div>
            <div class="eact-field" style="margin-top:12px">
              <label>Comprobante(s) de pago</label>
              <MultiFileUploader v-model="ccForm.ticket_payment_urls" label="Adjuntar comprobante" :required="false" />
            </div>

            <div class="eact-field" style="margin-top:14px">
              <label>Justificacion <span class="eact-req">*</span></label>
              <textarea v-model="ccJustificacion" class="eact-textarea" rows="3" placeholder="Motivo del cambio de curso..."></textarea>
            </div>
          </div>
        </template>
        <template #step-1>
          <EmailPreviewStep :enrollment-id="enrollmentId" :active="stepperStep === 1" ref="emailPreviewRef" />
        </template>
      </ActionStepper>

      <!-- CAMBIAR MODALIDAD -->
      <ActionStepper
        v-if="activeAction === 'modality'"
        v-model="stepperStep"
        :steps="['Cambiar Modalidad']"
        :can-advance="!!newModalityId && !!modalityJustificacion.trim()"
        :loading="saving"
        confirm-label="Confirmar"
        confirm-icon="fa-check"
        @cancel="cancelAction"
        @confirm="handleChangeModality"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-grid-2">
              <div class="eact-field">
                <label>Modalidad actual</label>
                <div class="eact-readonly">{{ currentModality }}</div>
              </div>
              <div class="eact-field">
                <label>Nueva modalidad</label>
                <select v-model="newModalityId" class="eact-select">
                  <option :value="null">Seleccionar...</option>
                  <option v-for="m in modalityOptions" :key="m.id" :value="m.id">{{ m.description }}</option>
                </select>
              </div>
            </div>
            <div class="eact-field">
              <label class="eact-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion (obligatorio)</label>
              <textarea v-model="modalityJustificacion" class="eact-textarea" rows="2" placeholder="Motivo del cambio..."></textarea>
            </div>
          </div>
        </template>
      </ActionStepper>

      <!-- EDITAR ALUMNO -->
      <ActionStepper
        v-if="activeAction === 'editStudent'"
        v-model="stepperStep"
        :steps="['Editar Alumno']"
        :can-advance="canAdvanceEditStudent"
        :loading="saving"
        confirm-label="Confirmar"
        confirm-icon="fa-check"
        @cancel="cancelAction"
        @confirm="handleEditStudent"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-grid-2">
              <div class="eact-field">
                <label>Nombres</label>
                <input v-model="editStudentForm.first_name" type="text" class="eact-input" />
              </div>
              <div class="eact-field">
                <label>Apellidos</label>
                <input v-model="editStudentForm.last_name" type="text" class="eact-input" />
              </div>
              <div class="eact-field">
                <label>N. Documento</label>
                <input v-model="editStudentForm.document_number" type="text" class="eact-input" />
              </div>
              <div class="eact-field">
                <label>Correo Original</label>
                <input v-model="editStudentForm.origin_email" type="email" class="eact-input" />
              </div>
              <div class="eact-field">
                <label>Correo Odoo</label>
                <input v-model="editStudentForm.odoo_email" type="email" class="eact-input" />
              </div>
              <div class="eact-field">
                <label>Telefono</label>
                <input v-model="editStudentForm.origin_phone" type="text" class="eact-input" />
              </div>
              <div class="eact-field">
                <label>Perfil</label>
                <select v-model="editStudentForm.cat_profile_id" class="eact-select">
                  <option :value="null">Seleccionar...</option>
                  <option v-for="p in profileOptions" :key="p.id" :value="p.id">{{ p.description }}</option>
                </select>
              </div>
            </div>
            <div class="eact-field">
              <label class="eact-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion (obligatorio)</label>
              <textarea v-model="editStudentJustificacion" class="eact-textarea" rows="2" placeholder="Motivo de la edicion..."></textarea>
            </div>
          </div>
        </template>
      </ActionStepper>

      <!-- RETIRAR ALUMNO -->
      <ActionStepper
        v-if="activeAction === 'retire'"
        v-model="stepperStep"
        :steps="['Retirar Alumno']"
        :can-advance="!!retireReason.trim()"
        :loading="saving"
        confirm-label="Confirmar Retiro"
        confirm-icon="fa-user-slash"
        @cancel="cancelAction"
        @confirm="handleRetire"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-field">
              <label>Motivo del retiro <span class="eact-req">*</span></label>
              <textarea v-model="retireReason" class="eact-textarea eact-textarea-danger" rows="3" placeholder="Explica el motivo del retiro..."></textarea>
            </div>
            <div class="eact-refund-row">
              <label class="eact-checkbox-label">
                <input type="checkbox" v-model="retireHasRefund" /> Hubo devolucion
              </label>
              <div v-if="retireHasRefund" style="flex:1">
                <input v-model.number="retireRefundAmount" type="number" min="0" step="0.01" class="eact-input" placeholder="Monto devuelto..." />
              </div>
            </div>
          </div>
        </template>
      </ActionStepper>

      <!-- OBSERVAR INSCRIPCION -->
      <ActionStepper
        v-if="activeAction === 'observe'"
        v-model="stepperStep"
        :steps="['Observar Inscripcion']"
        :can-advance="!!observeReason.trim()"
        :loading="saving"
        confirm-label="Confirmar Observacion"
        confirm-icon="fa-eye"
        @cancel="cancelAction"
        @confirm="handleObserve"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-observe-banner">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div>
                <strong>Observar inscripcion</strong>
                <p>La inscripcion sera devuelta al asesor comercial para correccion. Se le notificara automaticamente.</p>
              </div>
            </div>
            <div class="eact-field">
              <label>Motivo de la observacion <span class="eact-req">*</span></label>
              <textarea v-model="observeReason" class="eact-textarea" rows="3" placeholder="Describe que debe corregir el asesor..."></textarea>
            </div>
          </div>
        </template>
      </ActionStepper>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useToast } from 'vue-toastification'
import ActionStepper from '@/components/ActionStepper.vue'
import EmailPreviewStep from './EmailPreviewStep.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'

const props = defineProps({
  enrollment: { type: Object, default: null },
  detail: { type: Object, default: () => ({}) },
  catalogs: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'view' },
  currentModality: { type: String, default: '---' },
  currentProfile: { type: String, default: '---' },
  modalityOptions: { type: Array, default: () => [] },
  profileOptions: { type: Array, default: () => [] },
  odooEmail: { type: String, default: null },
  studentFlags: { type: Object, default: null }
})

const emit = defineEmits(['action-completed'])

const ficoService = inject(ServiceKeys.Fico)
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const fmt = useEnrollmentFormatters()

const enrollmentId = computed(() => Number(props.enrollment?.enrollment_id))
const activeAction = ref(null)
const stepperStep = ref(0)
const saving = ref(false)
const hasEmailStep = ref(true)
const emailPreviewRef = ref(null)

function startAction (action) {
  activeAction.value = action
  stepperStep.value = 0
  if (action === 'rp') loadRPEditions()
  if (action === 'cc') loadCCPrograms()
  if (action === 'editStudent') initEditStudent()
}

function cancelAction () {
  activeAction.value = null
  stepperStep.value = 0
  resetAllForms()
}

function resetAllForms () {
  rpEditionId.value = null
  rpJustificacion.value = ''
  rpEditions.value = []
  ccProgramVersionId.value = null
  ccEditionId.value = null
  ccTotalAmount.value = 0
  ccJustificacion.value = ''
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  Object.assign(ccForm, { cat_currency: null, cat_method_payment: null, cat_business_entity: null, bank_account_id: null, transaction_code: '', ticket_payment_urls: [] })
  newModalityId.value = null
  modalityJustificacion.value = ''
  Object.assign(editStudentForm, { first_name: '', last_name: '', document_number: '', origin_email: '', odoo_email: '', origin_phone: '', cat_profile_id: null })
  editStudentJustificacion.value = ''
  retireReason.value = ''
  retireHasRefund.value = false
  retireRefundAmount.value = 0
  observeReason.value = ''
}

function filteredAccounts (entityId) {
  if (!entityId || !props.catalogs?.allBankAccounts) return []
  return props.catalogs.allBankAccounts.filter(a => a.business_entity_catalog_id === entityId)
}

// ── REPROGRAMAR ──
const rpEditionId = ref(null)
const rpJustificacion = ref('')
const rpEditions = ref([])
const loadingEditions = ref(false)

const canAdvanceRP = computed(() => rpEditionId.value !== null && rpJustificacion.value.trim().length > 0)

async function loadRPEditions () {
  loadingEditions.value = true
  try {
    const items = await ficoService.getAvailableEditions(enrollmentId.value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    rpEditions.value = (items || [])
      .filter(e => e.start_date && new Date(e.start_date) >= today)
      .map(e => ({
        id: e.edition_num_id || e.id,
        label: `${new Date(e.start_date).toLocaleDateString('es-PE')} — ${e.global_code || e.edition_code || ''}`
      }))
  } catch (err) {
    console.error('Error cargando ediciones:', err)
  } finally {
    loadingEditions.value = false
  }
}

async function handleReprogramConfirm () {
  saving.value = true
  try {
    await ficoService.reprogramEdition({
      enrollment_id: enrollmentId.value,
      new_edition_id: rpEditionId.value,
      justificacion: rpJustificacion.value.trim()
    })
    toast.success('Edicion reprogramada correctamente.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al reprogramar edicion.')
  } finally {
    saving.value = false
  }
}

// ── CAMBIO DE CURSO ──
const ccProgramVersionId = ref(null)
const ccEditionId = ref(null)
const ccTotalAmount = ref(0)
const ccJustificacion = ref('')
const ccProgramsList = ref([])
const ccEditionsList = ref([])
const ccEditionListPrice = ref(0)
const ccLoadingEditions = ref(false)

const ccForm = reactive({
  cat_currency: null,
  cat_method_payment: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: '',
  ticket_payment_urls: []
})

const ccPagado = computed(() => {
  const e = props.enrollment
  if (!e) return 0
  const s = (e.confirmation || '').toLowerCase()
  if (!s || s.includes('pendiente')) return 0
  return Number(e.total_to_pay) || 0
})

const ccDiscountRate = computed(() => {
  const list = Number(props.enrollment?.list_price) || 0
  const disc = Number(props.enrollment?.total_discounted) || 0
  if (list <= 0 || disc <= 0) return 0
  return Math.min(Math.max(disc / list, 0), 1)
})

const ccEditionFinalPrice = computed(() => {
  const base = Number(ccEditionListPrice.value) || 0
  if (!base) return 0
  const finalPrice = base * (1 - ccDiscountRate.value)
  return Math.round(finalPrice * 100) / 100
})

const ccDiferencia = computed(() => Math.max(0, ccEditionFinalPrice.value - ccPagado.value))
const canAdvanceCC = computed(() => !!ccProgramVersionId.value && !!ccEditionId.value && !!ccJustificacion.value.trim())

async function loadCCPrograms () {
  try {
    const items = await programService.programVersionCaller({ active: 'Y' })
    ccProgramsList.value = (items || []).map(p => ({
      ...p,
      program_version_id: p.program_version_id || p.id,
      label: `${p.abbreviation || ''} — ${p.version_code || ''}`
    }))
  } catch (err) {
    console.error(err)
  }
}

async function onCCProgramChange () {
  ccEditionId.value = null
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  ccTotalAmount.value = 0
  if (!ccProgramVersionId.value) return
  ccLoadingEditions.value = true
  try {
    const [items, priceData] = await Promise.all([
      editionService.editionCaller({ program_version_id: ccProgramVersionId.value }),
      ficoService.getProgramPrice(ccProgramVersionId.value)
    ])
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    ccEditionsList.value = (items || [])
      .filter(e => e.start_date && new Date(e.start_date) >= today)
      .map(e => ({
        ...e,
        id: e.edition_num_id || e.id,
        label: `${new Date(e.start_date).toLocaleDateString('es-PE')} — ${e.global_code || e.edition_code || ''}`
      }))
    if (priceData) {
      const isStudent   = props.enrollment?.occupation_label === 'E'
      const primary     = isStudent ? priceData.price_student_soles : priceData.price_profesional_soles
      const fallback    = isStudent ? priceData.price_profesional_soles : priceData.price_student_soles
      ccEditionListPrice.value = Number(primary) || Number(fallback) || 0
      ccTotalAmount.value = Math.max(0, ccEditionFinalPrice.value - ccPagado.value)
    }
  } catch (err) {
    console.error(err)
  } finally {
    ccLoadingEditions.value = false
  }
}

function onCCEditionChange () {
  ccTotalAmount.value = Math.max(0, ccEditionFinalPrice.value - ccPagado.value)
}

async function handleCourseChangeConfirm () {
  saving.value = true
  try {
    await ficoService.courseChange({
      enrollment_id: enrollmentId.value,
      new_program_version_id: ccProgramVersionId.value,
      new_edition_id: ccEditionId.value,
      total_amount: ccTotalAmount.value,
      justificacion: ccJustificacion.value.trim(),
      cat_currency: ccForm.cat_currency,
      cat_method_payment: ccForm.cat_method_payment,
      cat_business_entity: ccForm.cat_business_entity,
      bank_account_id: ccForm.bank_account_id,
      transaction_code: ccForm.transaction_code,
      ticket_payment_urls: (ccForm.ticket_payment_urls || []).map(f => ({
        url: f.url || f,
        name: f.name || 'Comprobante',
        type: f.type || null
      }))
    })
    toast.success('Cambio de curso realizado correctamente.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al realizar cambio de curso.')
  } finally {
    saving.value = false
  }
}

// ── CAMBIAR MODALIDAD ──
const newModalityId = ref(null)
const modalityJustificacion = ref('')

async function handleChangeModality () {
  saving.value = true
  try {
    await ficoService.changeModality({
      enrollment_id: enrollmentId.value,
      new_modality_id: newModalityId.value,
      justificacion: modalityJustificacion.value.trim()
    })
    toast.success('Modalidad actualizada correctamente.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al cambiar modalidad.')
  } finally {
    saving.value = false
  }
}

// ── EDITAR ALUMNO ──
const editStudentForm = reactive({
  first_name: '', last_name: '', document_number: '',
  origin_email: '', odoo_email: '', origin_phone: '', cat_profile_id: null
})
const editStudentOriginal = reactive({
  first_name: '', last_name: '', document_number: '',
  origin_email: '', odoo_email: '', origin_phone: '', cat_profile_id: null
})
const editStudentJustificacion = ref('')

const canAdvanceEditStudent = computed(() => {
  if (!editStudentJustificacion.value.trim()) return false
  return Object.keys(editStudentOriginal).some(k => editStudentForm[k] !== editStudentOriginal[k])
})

function initEditStudent () {
  const e = props.enrollment || {}
  const d = props.detail || {}
  const f = props.studentFlags || {}
  const initial = {
    first_name: f.first_name || d.first_name || '',
    last_name: f.last_name || d.last_name || '',
    document_number: e.document_number || d.document_number || '',
    origin_email: f.origin_email || e.email || d.origin_email || d.email || '',
    odoo_email: f.odoo_email || props.odooEmail || '',
    origin_phone: f.origin_phone || e.phone || d.origin_phone || d.phone || '',
    cat_profile_id: f.cat_profile_id || e.cat_profile_id || d.cat_profile_id || null
  }
  Object.assign(editStudentForm, initial)
  Object.assign(editStudentOriginal, { ...initial })
}

async function handleEditStudent () {
  saving.value = true
  try {
    await ficoService.editStudent({
      enrollment_id: enrollmentId.value,
      first_name: editStudentForm.first_name.trim(),
      last_name: editStudentForm.last_name.trim(),
      document_number: editStudentForm.document_number.trim(),
      origin_email: editStudentForm.origin_email.trim(),
      odoo_email: editStudentForm.odoo_email.trim(),
      origin_phone: editStudentForm.origin_phone.trim(),
      cat_profile_id: editStudentForm.cat_profile_id,
      justificacion: editStudentJustificacion.value.trim()
    })
    toast.success('Datos del alumno actualizados.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al editar alumno.')
  } finally {
    saving.value = false
  }
}

// ── OBSERVAR INSCRIPCION ──
const observeReason = ref('')

async function handleObserve () {
  saving.value = true
  try {
    await ficoService.rejectEnrollment({
      enrollment_id: enrollmentId.value,
      reason: observeReason.value.trim()
    })
    toast.success('Inscripcion observada. Se notifico al asesor.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al observar inscripcion.')
  } finally {
    saving.value = false
  }
}

// ── RETIRAR ALUMNO ──
const retireReason = ref('')
const retireHasRefund = ref(false)
const retireRefundAmount = ref(0)

async function handleRetire () {
  saving.value = true
  try {
    await ficoService.retireEnrollment({
      enrollment_id: enrollmentId.value,
      reason: retireReason.value.trim(),
      has_refund: retireHasRefund.value,
      refund_amount: retireHasRefund.value ? retireRefundAmount.value : 0,
      justificacion: retireReason.value.trim()
    })
    toast.success('Alumno retirado correctamente.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al retirar alumno.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.eact-section {
  background: transparent;
}

.eact-title {
  display: none;
}

/* Action buttons */
.eact-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.eact-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  background: #fff;
  color: #1A1A1A;
  cursor: pointer;
  transition: all .2s ease;
  font-family: inherit;
}
.eact-btn:hover { border-color: #1A1A1A; background: #FAFAFA; }
.eact-btn i { font-size: 13px; color: #A3A3A3; transition: color .2s ease; }
.eact-btn:hover i { color: #1A1A1A; }

.eact-btn-danger { border-color: #E8E8E8; color: #DC2626; }
.eact-btn-danger:hover { border-color: #FCA5A5; background: #FFFBFB; }
.eact-btn-danger i { color: #E8A3A3; }
.eact-btn-danger:hover i { color: #DC2626; }

.eact-btn-warn { border-color: #E8E8E8; color: #B45309; }
.eact-btn-warn:hover { border-color: #FDE68A; background: #FFFDF5; }
.eact-btn-warn i { color: #D4B783; }
.eact-btn-warn:hover i { color: #D97706; }

.eact-tag {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: #F5F5F5;
  color: #737373;
}
.eact-tag-cc { background: #F3F0FF; color: #6D28D9; }

.eact-sep { width: 1px; height: 24px; background: #F0F0F0; }

/* Active action */
.eact-active { margin-top: 4px; }

/* Form elements */
.eact-form { display: flex; flex-direction: column; gap: 18px; }

.eact-student-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FAFAFA;
  border-radius: 10px;
  padding: 14px 18px;
}
.eact-student-main { display: flex; flex-direction: column; gap: 2px; }
.eact-student-name { font-size: 14px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.01em; }
.eact-student-doc { font-size: 12px; color: #A3A3A3; font-weight: 400; }
.eact-program-pill {
  font-size: 11px; font-weight: 600; color: #4338CA;
  background: #F3F0FF;
  padding: 5px 14px; border-radius: 6px;
  white-space: nowrap; max-width: 280px; overflow: hidden; text-overflow: ellipsis;
}

.eact-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.eact-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

.eact-field { display: flex; flex-direction: column; gap: 6px; }
.eact-field label { font-size: 11px; font-weight: 500; color: #A3A3A3; text-transform: uppercase; letter-spacing: .05em; }
.eact-req { color: #DC2626; }

.eact-readonly {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  background: #FAFAFA;
  border-radius: 8px;
  padding: 9px 14px;
}

.eact-select-wrap { position: relative; }
.eact-select {
  width: 100%;
  padding: 9px 36px 9px 14px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: #1A1A1A;
  background: #fff;
  appearance: none;
  cursor: pointer;
  transition: all .2s ease;
}
.eact-select:focus { outline: none; border-color: #1A1A1A; box-shadow: 0 0 0 3px rgba(0,0,0,.04); }
.eact-select:disabled { background: #FAFAFA; color: #C4C4C4; cursor: not-allowed; }
.eact-select-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 11px; color: #C4C4C4; pointer-events: none; }

.eact-input {
  width: 100%;
  padding: 9px 14px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: #1A1A1A;
  background: #fff;
  outline: none;
  transition: all .2s ease;
}
.eact-input:focus { border-color: #1A1A1A; box-shadow: 0 0 0 3px rgba(0,0,0,.04); }
.eact-input-amount { font-variant-numeric: tabular-nums; font-weight: 600; }

.eact-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: #1A1A1A;
  background: #FFFDF5;
  resize: vertical;
  min-height: 72px;
  transition: all .2s ease;
}
.eact-textarea:focus { outline: none; border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.06); }
.eact-textarea::placeholder { color: #D1D5DB; }
.eact-textarea-danger { border-color: #FCA5A5; background: #FFFBFB; }
.eact-textarea-danger:focus { border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,.06); }

.eact-subsection-label {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 500;
  color: #A3A3A3;
  letter-spacing: .06em;
  padding-top: 4px;
}

.eact-amount { font-size: 14px; font-weight: 600; color: #1A1A1A; font-variant-numeric: tabular-nums; padding: 8px 0; }
.eact-amount-green { color: #059669; }
.eact-amount-red { color: #DC2626; }
.eact-price-hint { display: block; font-size: 10.5px; color: #6B7280; margin-top: 2px; }

.eact-warn-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #92400E;
}
.eact-warn-label i { font-size: 13px; color: #D97706; }

.eact-refund-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.eact-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
}
.eact-checkbox-label input { width: 16px; height: 16px; cursor: pointer; accent-color: #1A1A1A; }

.eact-observe-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: #FFF8EB;
  border-radius: 10px;
  font-size: 12.5px;
  color: #92400E;
  line-height: 1.5;
}
.eact-observe-banner i { font-size: 16px; color: #F59E0B; margin-top: 2px; flex-shrink: 0; }
.eact-observe-banner strong { display: block; font-size: 13px; margin-bottom: 2px; }
.eact-observe-banner p { margin: 0; }
</style>
