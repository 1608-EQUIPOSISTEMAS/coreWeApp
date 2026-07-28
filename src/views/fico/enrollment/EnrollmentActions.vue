<template>
  <section class="eact-section">
    <h3 class="eact-title"><i class="fa-solid fa-bolt"></i> Acciones</h3>

    <!-- Banner trazabilidad: inscripcion proveniente de migracion A5 -->
    <div v-if="replacesEnrollmentId" class="eact-migration-banner">
      <i class="fa-solid fa-arrow-right-arrow-left"></i>
      <div class="eact-mb-text">
        <strong>Inscripcion creada por migracion A5</strong>
        <p>Reemplaza a la inscripcion <a href="#" @click.prevent="$emit('open-related', replacesEnrollmentId)">#{{ replacesEnrollmentId }}</a> (edicion cancelada). Los pagos viven en la original hasta que se apruebe la migracion.</p>
      </div>
    </div>

    <!-- Action buttons (when no action is active) -->
    <div v-if="!activeAction" class="eact-buttons">
      <button
        v-if="isPendingReview"
        class="eact-btn eact-btn-approve"
        @click="startAction('approveMigration')"
      >
        <i class="fa-solid fa-circle-check"></i> Aprobar Migracion
        <span class="eact-tag eact-tag-approve">PR</span>
      </button>
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
      <button v-if="canEditAgent" class="eact-btn" @click="startAction('editSellerAgent')">
        <i class="fa-solid fa-user-tie"></i> Editar Asesor
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
            <!-- Plan de cuotas pendientes que se trasladan a la nueva inscripcion -->
            <div v-if="rpPendingCuotas.length" class="eact-field">
              <label>Nuevo plan de cuotas <span class="eact-rp-saldo">Saldo pendiente: {{ fmt.formatMoney(rpPendingTotal) }}</span></label>
              <div class="eact-rp-plan">
                <div class="eact-rp-plan-head">
                  <span>#</span><span>Monto</span><span>Vencimiento</span>
                </div>
                <div v-for="(c, i) in rpPlan" :key="c.installment_id" class="eact-rp-plan-row">
                  <span class="eact-rp-plan-num">{{ i + 1 }}</span>
                  <input v-model.number="c.amount" type="number" step="0.01" min="0.01" class="eact-input eact-input-amount" />
                  <input v-model="c.due_date" type="date" class="eact-input" />
                </div>
                <div class="eact-rp-plan-foot" :class="{ 'eact-rp-plan-foot--err': !rpPlanSumsOk }">
                  <span>Total del plan: {{ fmt.formatMoney(rpPlanTotal) }}</span>
                  <span v-if="!rpPlanSumsOk">Debe igualar el saldo pendiente ({{ fmt.formatMoney(rpPendingTotal) }})</span>
                </div>
              </div>
              <small class="eact-price-hint">Lo ya pagado queda en la inscripcion RP; estas cuotas se trasladan a la nueva inscripcion y saldran en el correo.</small>
            </div>
            <div class="eact-field">
              <label>Justificacion <span class="eact-req">*</span></label>
              <textarea v-model="rpJustificacion" class="eact-textarea" rows="3" placeholder="Motivo de la reprogramacion..."></textarea>
            </div>
          </div>
        </template>
        <template #step-1>
          <EmailPreviewStep :enrollment-id="enrollmentId" :active="stepperStep === 1" :override-edition-id="rpEditionId" :override-installments="rpPreviewInstallments" ref="emailPreviewRef" />
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
                <select v-model="ccEditionId" class="eact-select" :disabled="!ccProgramVersionId || ccLoadingEditions || ccNoEdition" @change="onCCEditionChange">
                  <option :value="null" disabled>{{ ccLoadingEditions ? 'Cargando...' : (ccNoEdition ? 'No aplica' : 'Seleccionar edicion...') }}</option>
                  <option v-for="ed in ccEditionsList" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                </select>
                <small v-if="ccIsMembershipDest" class="eact-price-hint">Las membresias no tienen edicion; se activan por fecha de membresia.</small>
                <small v-else-if="ccNoEdition" class="eact-price-hint">Este programa no tiene ediciones publicadas; el destino se crea sin edicion.</small>
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
          <EmailPreviewStep :enrollment-id="enrollmentId" :active="stepperStep === 1" :override-edition-id="ccEditionId" :override-program-version-id="ccProgramVersionId" ref="emailPreviewRef" />
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

      <!-- EDITAR ASESOR -->
      <ActionStepper
        v-if="activeAction === 'editSellerAgent'"
        v-model="stepperStep"
        :steps="['Editar Asesor']"
        :can-advance="canAdvanceEditAgent"
        :loading="saving"
        confirm-label="Confirmar"
        confirm-icon="fa-check"
        @cancel="cancelAction"
        @confirm="handleEditSellerAgent"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-grid-2">
              <div class="eact-field">
                <label>Asesor actual</label>
                <div class="eact-readonly">{{ currentAgentLabel }}</div>
              </div>
              <div class="eact-field">
                <label>Canal <span class="eact-req">*</span></label>
                <SearchSelect
                  v-model="newAgentCategory"
                  :items="agentCategoryOptions"
                  label-field="label"
                  value-field="id"
                  placeholder="Seleccionar canal..."
                  @update:modelValue="onAgentCategoryChange"
                />
              </div>
            </div>
            <div class="eact-field" v-if="newAgentCategory && newAgentCategory !== 'we'">
              <label>Nuevo asesor <span v-if="newAgentCategory !== 'sa'" class="eact-req">*</span><span v-else class="eact-optional">(opcional para S/A)</span></label>
              <SearchSelect
                v-model="newSellerAgentId"
                :items="filteredAgentOptions"
                label-field="label"
                value-field="user_id"
                placeholder="Buscar asesor por alias o nombre..."
              />
            </div>
            <div v-if="newAgentCategory === 'we'" class="eact-readonly" style="font-size:12px;color:#666">
              <i class="fa-solid fa-circle-info"></i> Canal WE no lleva asesor individual asignado.
            </div>
            <small v-if="agentPreview" class="eact-price-hint">
              <i class="fa-solid fa-eye"></i> Asesor quedara como: <strong>{{ agentPreview }}</strong>
            </small>
            <div class="eact-field">
              <label class="eact-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion (obligatorio)</label>
              <textarea v-model="editAgentJustificacion" class="eact-textarea" rows="2" placeholder="Motivo del cambio de asesor..."></textarea>
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

      <!-- APROBAR MIGRACION A5 -->
      <ActionStepper
        v-if="activeAction === 'approveMigration'"
        v-model="stepperStep"
        :steps="['Aprobar Migracion']"
        :can-advance="true"
        :loading="saving"
        confirm-label="Confirmar Aprobacion"
        confirm-icon="fa-circle-check"
        @cancel="cancelAction"
        @confirm="handleApproveMigration"
      >
        <template #step-0>
          <div class="eact-form">
            <div class="eact-observe-banner">
              <i class="fa-solid fa-circle-info"></i>
              <div>
                <strong>Aprobar inscripcion migrada</strong>
                <p>Esto transferira las cuotas pendientes desde la inscripcion origen <strong>#{{ replacesEnrollmentId }}</strong>, inscribira al alumno en Odoo (si aplica) y enviara el correo de confirmacion con la nueva edicion.</p>
              </div>
            </div>
            <div class="eact-readonly" style="margin-top:8px">
              Edicion destino: <strong>{{ props.enrollment?.edition_code || props.detail?.edition_code || '---' }}</strong>
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
import { ref, reactive, computed, watch, inject, getCurrentInstance } from 'vue'
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

const emit = defineEmits(['action-completed', 'open-related'])

const ficoService = inject(ServiceKeys.Fico)
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const authService = inject(ServiceKeys.Auth)
const toast = useToast()
const fmt = useEnrollmentFormatters()

const instance = getCurrentInstance()
const $hasRole = instance?.appContext?.config?.globalProperties?.$hasRole || (() => false)
const canEditAgent = computed(() => $hasRole(['ADMIN', 'FICO', 'LIDER_FICO']))

const enrollmentId = computed(() => Number(props.enrollment?.enrollment_id))
const activeAction = ref(null)
const stepperStep = ref(0)
const saving = ref(false)
const hasEmailStep = ref(true)
const emailPreviewRef = ref(null)

// Identificacion de inscripcion proveniente de migracion A5.
// replaces_enrollment_id: vinculo trazable hacia la inscripcion original (RP).
// isPendingReview: estado intermedio antes de aprobar/confirmar la migracion.
const replacesEnrollmentId = computed(() => {
  return props.enrollment?.replaces_enrollment_id
    || props.detail?.replaces_enrollment_id
    || null
})
const isPendingReview = computed(() => {
  const alias = props.enrollment?.cat_type_status_alias
    || props.detail?.cat_type_status_alias
    || props.enrollment?.type_status_alias
  return alias === 'we_enrollment_status_pending_review'
})

function startAction (action) {
  activeAction.value = action
  stepperStep.value = 0
  if (action === 'rp') loadRPEditions()
  if (action === 'cc') loadCCPrograms()
  if (action === 'editStudent') initEditStudent()
  if (action === 'editSellerAgent') {
    // Inicializa la categoria con el canal actual para que el operador vea de
    // entrada como esta clasificada la inscripcion y solo cambie lo necesario.
    newAgentCategory.value = categoryFromOrigin(props.enrollment?.agent_origin)
    newSellerAgentId.value = props.enrollment?.seller_agent_id || null
    loadAgentOptions()
  }
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
  rpPlan.value = []
  ccProgramVersionId.value = null
  ccEditionId.value = null
  ccTotalAmount.value = 0
  ccJustificacion.value = ''
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  ccIsMembershipDest.value = false
  Object.assign(ccForm, { cat_currency: null, cat_method_payment: null, cat_business_entity: null, bank_account_id: null, transaction_code: '', ticket_payment_urls: [] })
  newModalityId.value = null
  modalityJustificacion.value = ''
  Object.assign(editStudentForm, { first_name: '', last_name: '', document_number: '', origin_email: '', odoo_email: '', origin_phone: '', cat_profile_id: null })
  editStudentJustificacion.value = ''
  newSellerAgentId.value = null
  newAgentCategory.value = null
  editAgentJustificacion.value = ''
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
// Plan editable de las cuotas pendientes del origen: se trasladan a la nueva
// inscripcion (lo pagado queda en el origen RP). [{installment_id, amount, due_date}]
const rpPlan = ref([])

// Cuotas realmente pendientes del origen: excluye pagadas (ambos namespaces),
// anuladas (4456) y las que ya tienen un pago activo aunque sigan "pendiente
// verificacion" (ese dinero queda en el origen RP). Mismo filtro que el backend.
const rpPendingCuotas = computed(() => {
  const conPago = new Set((props.detail?.payment_history || []).map(p => p.installment_id))
  return (props.detail?.installments || []).filter(i =>
    i.installment_number > 0 &&
    ![4454, 2471, 4456].includes(Number(i.cat_status)) &&
    !conPago.has(i.installment_id)
  )
})
const rpPendingTotal = computed(() => rpPendingCuotas.value.reduce((s, c) => s + (Number(c.amount) || 0), 0))
const rpPlanTotal = computed(() => rpPlan.value.reduce((s, c) => s + (Number(c.amount) || 0), 0))
const rpPlanSumsOk = computed(() =>
  rpPlan.value.every(c => Number(c.amount) > 0 && c.due_date) &&
  Math.abs(rpPlanTotal.value - rpPendingTotal.value) <= 0.01
)

const canAdvanceRP = computed(() =>
  rpEditionId.value !== null &&
  rpJustificacion.value.trim().length > 0 &&
  (rpPendingCuotas.value.length === 0 || rpPlanSumsOk.value)
)

// Para el preview del correo: el plan con la numeracion 1..n que tendra el
// enrollment destino (que aun no existe en ese paso).
const rpPreviewInstallments = computed(() => {
  if (!rpPendingCuotas.value.length) return []
  return [...rpPlan.value]
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .map((c, i) => ({ installment_number: i + 1, amount: Number(c.amount) || 0, due_date: c.due_date }))
})

// Corre una fecha 'YYYY-MM-DD' N dias, en UTC (sin TZ shift).
function shiftDateStr (dateStr, days) {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days)).toISOString().slice(0, 10)
}

// Al elegir edicion destino, propone el plan por defecto: mismas cuotas con la
// fecha corrida por el desplazamiento entre ediciones (FICO puede editarlas).
watch(rpEditionId, (id) => {
  const ed = rpEditions.value.find(e => e.id === id)
  const oldStart = parseLocalDate(props.enrollment?.start_date || props.enrollment?.edition_start_date)
  const newStart = ed ? parseLocalDate(ed.start_date) : null
  const diffDays = (oldStart && newStart) ? Math.round((newStart - oldStart) / 86400000) : 0
  rpPlan.value = rpPendingCuotas.value.map(c => ({
    installment_id: c.installment_id,
    amount: Number(c.amount) || 0,
    due_date: shiftDateStr(c.due_date, diffDays)
  }))
})

async function loadRPEditions () {
  loadingEditions.value = true
  try {
    const items = await ficoService.getAvailableEditions(enrollmentId.value)
    rpEditions.value = (items || [])
      .filter(e => e.start_date && isWithinReprogramWindow(e.start_date))
      .map(e => ({
        id: e.edition_num_id || e.id,
        start_date: e.start_date,
        label: `${fmt.formatDate(e.start_date)} — ${e.global_code || e.edition_code || ''}`
      }))
  } catch (err) {
    console.error('Error cargando ediciones:', err)
  } finally {
    loadingEditions.value = false
  }
}

// Parsea start_date (cadena calendario) a Date local sin sufrir TZ shift:
// si el server Node corre en UTC, el ISO viene como '2026-05-09T00:00:00.000Z',
// que `new Date()` interpreta como 2026-05-08 19:00 Lima — falsea el filtro.
function parseLocalDate (startDate) {
  const m = String(startDate).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}

// Cambio de curso: solo ediciones de hoy en adelante.
function isFutureOrToday (startDate) {
  const ed = parseLocalDate(startDate)
  if (!ed) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return ed >= today
}

// Reprogramación: admite desde el 1ro de hace 2 meses.
// Ej: estando en julio, admite ediciones desde el 01/05.
function isWithinReprogramWindow (startDate) {
  const ed = parseLocalDate(startDate)
  if (!ed) return false
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  return ed >= cutoff
}

async function handleReprogramConfirm () {
  saving.value = true
  try {
    const payload = {
      enrollment_id: enrollmentId.value,
      new_edition_id: rpEditionId.value,
      justificacion: rpJustificacion.value.trim()
    }
    if (rpPendingCuotas.value.length) {
      payload.installment_plan = rpPlan.value.map(c => ({
        installment_id: Number(c.installment_id),
        amount: Number(c.amount),
        due_date: c.due_date
      }))
    }
    const res = await ficoService.reprogramEdition(payload)
    toast.success(res?.new_enrollment_id
      ? `Edicion reprogramada. Nueva inscripcion #${res.new_enrollment_id}; el correo se enviara automaticamente.`
      : 'Edicion reprogramada correctamente.')
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
// Las membresias (WE PLUS/GOLD/PLAT/BLACK) no tienen ediciones: cuando el
// programa destino es membresia, la edicion no aplica y no debe bloquear el paso.
const ccIsMembershipDest = ref(false)
// Tampoco aplica edicion cuando el programa destino no tiene ediciones publicadas
// (cursos online que se dictan on-demand): el destino se crea con
// program_edition_id null, igual que una membresia.
const ccNoEdition = computed(() =>
  ccIsMembershipDest.value ||
  (!!ccProgramVersionId.value && !ccLoadingEditions.value && ccEditionsList.value.length === 0)
)

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
const canAdvanceCC = computed(() =>
  !!ccProgramVersionId.value &&
  (ccNoEdition.value || !!ccEditionId.value) &&
  !!ccJustificacion.value.trim()
)

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
  ccIsMembershipDest.value = false
  if (!ccProgramVersionId.value) return
  ccLoadingEditions.value = true
  try {
    const [items, priceData] = await Promise.all([
      editionService.editionCaller({ program_version_id: ccProgramVersionId.value }),
      ficoService.getProgramPrice(ccProgramVersionId.value)
    ])
    ccEditionsList.value = (items || [])
      .filter(e => e.start_date && isFutureOrToday(e.start_date))
      .map(e => ({
        ...e,
        id: e.edition_num_id || e.id,
        label: `${fmt.formatDate(e.start_date)} — ${e.global_code || e.edition_code || ''}`
      }))
    if (priceData) {
      // Una membresia no tiene ediciones: se marca el destino para no exigir
      // edicion en el paso y se manda program_edition_id null al backend.
      ccIsMembershipDest.value = !!priceData.is_membership
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
      // Membresia o programa sin ediciones: program_edition_id null en destino.
      new_edition_id: ccNoEdition.value ? null : ccEditionId.value,
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

// ── EDITAR ASESOR ──
// Permite re-categorizar la inscripcion eligiendo canal + asesor. Replica la
// logica del modulo de inscripcion (EnrollmentForm.vue): 5 categorias (comercial,
// b2b, web, we, sa) que mapean a agent_origin; los asesores se filtran segun la
// categoria seleccionada. Resultado en listados: 'B2B - AE30', 'WEB - CA36',
// 'SA', 'WE', o solo 'AE30' (comercial sin canal).
const newAgentCategory = ref(null)
const newSellerAgentId = ref(null)
const editAgentJustificacion = ref('')
const agentOptions = ref([])
const loadingAgents = ref(false)

// Espejo de agentCategoryOptions en EnrollmentForm.vue: misma identidad y orden.
const agentCategoryOptions = [
  { id: 'comercial', label: 'Comercial (sin canal)' },
  { id: 'b2b',       label: 'B2B' },
  { id: 'web',       label: 'WEB' },
  { id: 'we',        label: 'WE' },
  { id: 'sa',        label: 'S/A (Sin Asesor)' }
]

// Mapeo inverso: agent_origin almacenado -> categoria UI.
function categoryFromOrigin (origin) {
  if (origin === 'B2B') return 'b2b'
  if (origin === 'WEB') return 'web'
  if (origin === 'WE')  return 'we'
  if (origin === 'SA')  return 'sa'
  return 'comercial'
}

// agent_origin a persistir desde la categoria seleccionada.
function originFromCategory (cat) {
  if (cat === 'b2b') return 'B2B'
  if (cat === 'web') return 'WEB'
  if (cat === 'we')  return 'WE'
  if (cat === 'sa')  return 'SA'
  return null
}

const currentAgentLabel = computed(() => {
  const e = props.enrollment
  if (!e) return '(sin asesor)'
  const alias = e.seller_agent_alias
  const origin = e.agent_origin
  if (alias && origin) return `${origin} - ${alias}`
  if (alias) return alias
  if (origin) return origin
  return '(sin asesor)'
})

// Filtra y reetiqueta el universo de asesores segun la categoria activa.
// b2b -> 'ALIAS — B2B', web -> 'ALIAS — WEB', resto -> 'ALIAS — Nombre' (default).
// we no usa este dropdown (no hay user_id valido para WE).
const filteredAgentOptions = computed(() => {
  const cat = newAgentCategory.value
  if (cat === 'we') return []
  if (cat === 'b2b') {
    return agentOptions.value.map(a => ({ ...a, label: `${a.alias} — B2B` }))
  }
  if (cat === 'web') {
    return agentOptions.value.map(a => ({ ...a, label: `${a.alias} — WEB` }))
  }
  return agentOptions.value
})

const canAdvanceEditAgent = computed(() => {
  if (!newAgentCategory.value) return false
  if (!editAgentJustificacion.value.trim()) return false

  const cat = newAgentCategory.value
  const newId = Number(newSellerAgentId.value) || null

  // we: no requiere asesor (siempre se persiste seller_agent_id=null).
  // sa: asesor opcional (decision: permitir combinacion 'SA + asesor').
  // comercial/b2b/web: asesor requerido.
  if (cat !== 'we' && cat !== 'sa' && !newId) return false

  const oldOrigin = props.enrollment?.agent_origin || null
  const oldId    = props.enrollment?.seller_agent_id || null
  const newOrigin = originFromCategory(cat)
  const newIdFinal = (cat === 'we') ? null : newId

  // Algo debe haber cambiado (canal o asesor) para que tenga sentido guardar.
  return Number(oldId) !== Number(newIdFinal) || oldOrigin !== newOrigin
})

const agentPreview = computed(() => {
  const cat = newAgentCategory.value
  if (!cat) return ''
  if (cat === 'we') return 'WE'

  const id = Number(newSellerAgentId.value)
  const u = id ? agentOptions.value.find(a => Number(a.user_id) === id) : null
  const origin = originFromCategory(cat)

  if (!u) {
    // Sin asesor + canal: muestra solo el canal (SA o nada).
    return origin || ''
  }
  return origin ? `${origin} - ${u.alias}` : u.alias
})

function onAgentCategoryChange () {
  // Al cambiar canal, descarta la seleccion previa para forzar al usuario a
  // elegir un asesor del nuevo universo. Evita combinaciones residuales.
  newSellerAgentId.value = null
}

async function loadAgentOptions () {
  if (agentOptions.value.length > 0) return
  loadingAgents.value = true
  try {
    const arr = await authService.userList({})
    const users = (arr || [])
      .filter(u => u.alias && u.active)
      .map(u => {
        const name = u.full_name
          || [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
        return {
          user_id: u.user_id,
          alias: u.alias,
          label: name ? `${u.alias} — ${name}` : u.alias
        }
      })
      .sort((a, b) => a.alias.localeCompare(b.alias))
    agentOptions.value = users
  } catch (err) {
    console.error('[loadAgentOptions]', err)
    toast.error('No se pudieron cargar los asesores.')
  } finally {
    loadingAgents.value = false
  }
}

async function handleEditSellerAgent () {
  saving.value = true
  try {
    const cat = newAgentCategory.value
    const newId = (cat === 'we') ? null : (Number(newSellerAgentId.value) || null)
    await ficoService.editSellerAgent({
      enrollment_id: enrollmentId.value,
      new_seller_agent_id: newId,
      new_agent_origin: originFromCategory(cat),
      justificacion: editAgentJustificacion.value.trim()
    })
    toast.success('Asesor actualizado correctamente.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al actualizar asesor.')
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

// ── APROBAR MIGRACION A5 ──
async function handleApproveMigration () {
  saving.value = true
  try {
    await ficoService.approvePendingReview(enrollmentId.value)
    toast.success('Migracion aprobada. Cuotas transferidas y notificaciones enviadas.')
    emit('action-completed')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al aprobar la migracion.')
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

.eact-btn-approve { border-color: #BBF7D0; color: #047857; background: #F0FDF4; }
.eact-btn-approve:hover { border-color: #34D399; background: #ECFDF5; }
.eact-btn-approve i { color: #10B981; }
.eact-btn-approve:hover i { color: #047857; }
.eact-tag-approve { background: #DCFCE7; color: #047857; }

.eact-migration-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 10px;
  font-size: 12.5px;
  color: #78350F;
  line-height: 1.5;
  margin-bottom: 14px;
}
.eact-migration-banner i { font-size: 15px; color: #D97706; margin-top: 2px; flex-shrink: 0; }
.eact-migration-banner strong { display: block; font-size: 13px; margin-bottom: 2px; color: #78350F; }
.eact-migration-banner p { margin: 0; color: #92400E; }
.eact-migration-banner a { color: #B45309; text-decoration: underline; font-weight: 600; }

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

/* Plan de cuotas de la reprogramacion */
.eact-rp-saldo { float: right; font-weight: 700; color: #92400E; text-transform: none; letter-spacing: 0; }
.eact-rp-plan {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
}
.eact-rp-plan-head, .eact-rp-plan-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 6px 12px;
}
.eact-rp-plan-head {
  background: #F9FAFB;
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.eact-rp-plan-row { border-top: 1px solid #F3F4F6; }
.eact-rp-plan-num { font-size: 12px; font-weight: 700; color: #6B7280; }
.eact-rp-plan-foot {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid #E5E7EB;
  background: #F9FAFB;
  font-size: 12px;
  font-weight: 700;
  color: #111827;
}
.eact-rp-plan-foot--err { color: #DC2626; background: #FEF2F2; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .eact-btn {
  background: #1A1A14;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .eact-btn:hover { border-color: #F4F4F0; background: #1F1F1A; }
[data-coreui-theme="dark"] .eact-btn i { color: #8A8A80; }
[data-coreui-theme="dark"] .eact-btn:hover i { color: #F4F4F0; }

[data-coreui-theme="dark"] .eact-btn-danger { border-color: #2A2A22; color: #F87171; }
[data-coreui-theme="dark"] .eact-btn-danger:hover { border-color: rgba(248,113,113,.45); background: rgba(239,68,68,.10); }
[data-coreui-theme="dark"] .eact-btn-danger i { color: rgba(248,113,113,.55); }
[data-coreui-theme="dark"] .eact-btn-danger:hover i { color: #F87171; }

[data-coreui-theme="dark"] .eact-btn-warn { border-color: #2A2A22; color: #FBBF24; }
[data-coreui-theme="dark"] .eact-btn-warn:hover { border-color: rgba(251,191,36,.45); background: rgba(245,158,11,.10); }
[data-coreui-theme="dark"] .eact-btn-warn i { color: rgba(251,191,36,.55); }
[data-coreui-theme="dark"] .eact-btn-warn:hover i { color: #FBBF24; }

[data-coreui-theme="dark"] .eact-btn-approve { border-color: rgba(16,185,129,.35); color: #34D399; background: rgba(16,185,129,.12); }
[data-coreui-theme="dark"] .eact-btn-approve:hover { border-color: #34D399; background: rgba(16,185,129,.18); }
[data-coreui-theme="dark"] .eact-btn-approve i { color: #34D399; }
[data-coreui-theme="dark"] .eact-btn-approve:hover i { color: #6EE7B7; }
[data-coreui-theme="dark"] .eact-tag-approve { background: rgba(16,185,129,.2); color: #34D399; }

[data-coreui-theme="dark"] .eact-migration-banner {
  background: rgba(245,158,11,.12);
  border-color: rgba(245,158,11,.35);
  color: #FBBF24;
}
[data-coreui-theme="dark"] .eact-migration-banner i { color: #FBBF24; }
[data-coreui-theme="dark"] .eact-migration-banner strong { color: #FCD34D; }
[data-coreui-theme="dark"] .eact-migration-banner p { color: #FBBF24; }
[data-coreui-theme="dark"] .eact-migration-banner a { color: #FCD34D; }

[data-coreui-theme="dark"] .eact-tag { background: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .eact-tag-cc { background: rgba(139,92,246,.16); color: #A78BFA; }
[data-coreui-theme="dark"] .eact-sep { background: #2A2A22; }

[data-coreui-theme="dark"] .eact-student-bar { background: #1F1F1A; }
[data-coreui-theme="dark"] .eact-student-name { color: #F4F4F0; }
[data-coreui-theme="dark"] .eact-student-doc { color: #8A8A80; }
[data-coreui-theme="dark"] .eact-program-pill { background: rgba(99,102,241,.16); color: #A78BFA; }

[data-coreui-theme="dark"] .eact-field label { color: #8A8A80; }
[data-coreui-theme="dark"] .eact-req { color: #F87171; }
[data-coreui-theme="dark"] .eact-readonly { color: #F4F4F0; background: #1F1F1A; }

[data-coreui-theme="dark"] .eact-select,
[data-coreui-theme="dark"] .eact-input {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .eact-select:focus,
[data-coreui-theme="dark"] .eact-input:focus {
  border-color: #F4F4F0;
  box-shadow: 0 0 0 3px rgba(255,255,255,.06);
}
[data-coreui-theme="dark"] .eact-select:disabled { background: #1F1F1A; color: #6F6F66; }
[data-coreui-theme="dark"] .eact-select-icon { color: #6F6F66; }
[data-coreui-theme="dark"] .eact-input[type="date"] { color-scheme: dark; }

[data-coreui-theme="dark"] .eact-textarea {
  background: rgba(245,158,11,.08);
  border-color: rgba(245,158,11,.35);
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .eact-textarea:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.10); }
[data-coreui-theme="dark"] .eact-textarea::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .eact-textarea-danger { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.08); }
[data-coreui-theme="dark"] .eact-textarea-danger:focus { border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,.10); }

[data-coreui-theme="dark"] .eact-subsection-label { color: #8A8A80; }
[data-coreui-theme="dark"] .eact-amount { color: #F4F4F0; }
[data-coreui-theme="dark"] .eact-amount-green { color: #34D399; }
[data-coreui-theme="dark"] .eact-amount-red { color: #F87171; }
[data-coreui-theme="dark"] .eact-price-hint { color: #A0A099; }

[data-coreui-theme="dark"] .eact-warn-label { color: #FBBF24; }
[data-coreui-theme="dark"] .eact-warn-label i { color: #FBBF24; }

[data-coreui-theme="dark"] .eact-checkbox-label { color: #F4F4F0; }
[data-coreui-theme="dark"] .eact-checkbox-label input { accent-color: #F4F4F0; }

[data-coreui-theme="dark"] .eact-observe-banner {
  background: rgba(245,158,11,.12);
  color: #FBBF24;
}
[data-coreui-theme="dark"] .eact-observe-banner i { color: #FBBF24; }

[data-coreui-theme="dark"] .eact-rp-saldo { color: #FBBF24; }
[data-coreui-theme="dark"] .eact-rp-plan { border-color: #2A2A22; }
[data-coreui-theme="dark"] .eact-rp-plan-head { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .eact-rp-plan-row { border-top-color: #1F1F1A; }
[data-coreui-theme="dark"] .eact-rp-plan-num { color: #A0A099; }
[data-coreui-theme="dark"] .eact-rp-plan-foot {
  border-top-color: #2A2A22;
  background: #1F1F1A;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .eact-rp-plan-foot--err { color: #F87171; background: rgba(239,68,68,.12); }
</style>
