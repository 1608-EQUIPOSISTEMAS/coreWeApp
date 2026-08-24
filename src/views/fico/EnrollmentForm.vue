<template>
  <div class="ef-page">
    <div class="ef-page-header">
      <div class="ef-page-header-left">
        <span class="ef-breadcrumb">FICO</span>
        <h1 class="ef-page-title">Nueva Inscripcion</h1>
      </div>
      <div class="ef-header-actions">
        <button class="ef-btn-outline" @click="goBack">Cancelar</button>
      </div>
    </div>

    <!-- ASESOR -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-user-tie"></i> ASESOR</h6>
      <div class="ef-grid-3">
        <div class="ef-field">
          <label>Categoria <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.agent_category" :items="agentCategoryOptions" label-field="label" value-field="id" placeholder="Seleccionar..." @update:modelValue="form.seller_agent_id = null" />
        </div>
        <div class="ef-field" v-if="form.agent_category === 'comercial'">
          <label>Asesor <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="agentsList" label-field="label" value-field="id" placeholder="Buscar asesor..." />
        </div>
        <div class="ef-field" v-else-if="form.agent_category === 'b2b'">
          <label>Asesor B2B <span class="ef-optional">(opcional)</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="b2bAgentsList" label-field="label" value-field="id" placeholder="Solo B2B (sin asesor)" />
        </div>
        <div class="ef-field" v-else-if="form.agent_category === 'web'">
          <label>Asesor WEB <span class="ef-optional">(opcional)</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="webAgentsList" label-field="label" value-field="id" placeholder="Solo WEB (sin asesor)" />
        </div>
        <div class="ef-field" v-else-if="form.agent_category === 'we'">
          <label>Area WE <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.seller_agent_id" :items="weAreaOptions" label-field="label" value-field="id" placeholder="Seleccionar..." />
        </div>
        <div class="ef-field" v-if="form.agent_category === 'b2b' && !form.seller_agent_id">
          <label>Tipo de Inscripcion B2B</label>
          <SearchSelect v-model="form.cat_b2b_doctype" :items="catB2BDoctype" label-field="description" value-field="id" placeholder="Pago directo (default)" />
        </div>
      </div>
      <div v-if="isB2BDocumental" class="ef-b2b-note">
        <i class="fa-solid fa-circle-info"></i>
        Inscripcion B2B documental: el pago no se registra en FICO (gestionado por la empresa B2B). Total: 0, descuento 100%.
      </div>
    </div>

    <!-- DATOS DEL CLIENTE -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-user"></i> DATOS DEL CLIENTE</h6>
      <div class="ef-grid-3">
        <div class="ef-field">
          <label>Tipo Documento <span v-if="requireDocument" class="ef-req">*</span></label>
          <SearchSelect v-model="form.cat_type_document" :items="catDocTypes" label-field="description" value-field="id" placeholder="DOC..." />
        </div>
        <div class="ef-field">
          <label>
            Nro. Documento
            <span v-if="requireDocument" class="ef-req">*</span>
            <span v-else class="ef-optional">(opcional)</span>
          </label>
          <div class="ef-input-with-btn">
            <input
              v-model="form.document_number"
              type="text"
              :placeholder="docConfig.isNumeric ? `Max. ${docConfig.maxLength} digitos` : `Max. ${docConfig.maxLength} caracteres`"
              :maxlength="docConfig.maxLength"
              @keyup.enter="searchCustomerByDocument"
              @input="onDocumentInput"
            />
            <button type="button" class="ef-search-btn" :disabled="!form.document_number || searchingCustomer" @click="searchCustomerByDocument" title="Buscar cliente">
              <i class="fa-solid" :class="searchingCustomer ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'"></i>
            </button>
          </div>
          <small v-if="form.document_number && docConfig.isNumeric && form.document_number.length !== docConfig.maxLength" class="ef-hint-warn">
            Se esperan {{ docConfig.maxLength }} digitos
          </small>
        </div>
        <div class="ef-field">
          <label>Nombres <span class="ef-req">*</span></label>
          <input v-model="form.first_name" type="text" placeholder="NOMBRES" />
        </div>
        <div class="ef-field">
          <label>Apellidos <span class="ef-req">*</span></label>
          <input v-model="form.last_name" type="text" placeholder="APELLIDOS" />
        </div>
        <div class="ef-field">
          <label>Correo <span class="ef-req">*</span></label>
          <input v-model="form.email" type="email" placeholder="correo@ejemplo.com" />
        </div>
        <div class="ef-field">
          <label>
            Telefono
            <span v-if="requirePhone" class="ef-req">*</span>
            <span v-else class="ef-optional">(opcional)</span>
          </label>
          <input v-model="form.phone" type="text" placeholder="TELEFONO" />
        </div>
        <div class="ef-field">
          <label>Pais</label>
          <SearchSelect v-model="form.cat_country" :items="catCountries" label-field="description" value-field="id" placeholder="PAIS..." />
        </div>
        <div class="ef-field">
          <label>Perfil <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.client_profile" :items="clientProfileOptions" label-field="label" value-field="id" placeholder="Profesional / Estudiante..." />
        </div>
        <div class="ef-field">
          <label>Membresia <span class="ef-optional">(opcional)</span></label>
          <SearchSelect v-model="form.membership_program_id" :items="membershipOptions" label-field="description" value-field="id" placeholder="Sin membresia..." />
        </div>
      </div>

      <div v-if="isMembershipBenefit" class="ef-b2b-note">
        <i class="fa-solid fa-gift"></i>
        Inscripcion gratuita por beneficio de membresia: total 0, sin pago. PLUS no aplica (sigue el flujo normal).
      </div>

      <!-- COPIA (CC) DEL CORREO DE CONFIRMACION -->
      <div class="ef-cc-row">
        <button
          v-if="!showCcField"
          type="button"
          class="ef-cc-toggle"
          @click="showCcField = true"
        >
          <i class="fa-solid fa-plus"></i> Agregar copia (CC) al correo
        </button>
        <div v-else class="ef-cc-panel">
          <div class="ef-cc-header">
            <label>
              <i class="fa-regular fa-envelope-open"></i>
              Correo en copia
              <span class="ef-optional">(opcional)</span>
              <span v-if="form.agent_category === 'b2b'" class="ef-cc-hint-b2b">
                Util para copiar al supervisor del alumno B2B
              </span>
            </label>
            <button type="button" class="ef-cc-clear" @click="clearCcField" title="Quitar copia">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <input
            v-model="form.email_cc"
            type="text"
            class="ef-cc-input"
            placeholder="supervisor@empresa.com, rrhh@empresa.com"
          />
          <div v-if="ccPreview.length > 0" class="ef-cc-preview">
            <span v-for="email in ccPreview" :key="email" class="ef-cc-chip">
              <i class="fa-solid fa-check"></i> {{ email }}
            </span>
          </div>
          <div v-if="ccInvalidCount > 0" class="ef-cc-warn">
            <i class="fa-solid fa-triangle-exclamation"></i>
            {{ ccInvalidCount }} correo(s) con formato invalido seran ignorados.
          </div>
          <small class="ef-cc-help">Separa multiples correos con coma. El alumno recibe el correo principal; los CC reciben copia.</small>
        </div>
      </div>
    </div>

    <!-- PROGRAMA Y EDICION -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-graduation-cap"></i> PROGRAMA Y EDICION</h6>
      <div class="ef-grid-4">
        <div class="ef-field">
          <label>Categoria <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.cat_program_type" :items="catProgramType" label-field="description" value-field="id" placeholder="Curso, PEE, Diplomado..." @update:modelValue="onProgramTypeChange" />
        </div>
        <div class="ef-field">
          <label>Programa <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.program_version_id" :items="programsList" label-field="label" value-field="program_version_id" placeholder="Buscar programa..." :disabled="!form.cat_program_type" :external-loading="loadingPrograms" @update:modelValue="onProgramChange" />
        </div>
        <div class="ef-field">
          <label>Edicion <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.program_edition_id" :items="editionsList" label-field="label" value-field="id" placeholder="Seleccionar edicion..." :disabled="!form.program_version_id" :external-loading="loadingEditions" @update:modelValue="onEditionChange" />
        </div>
        <div class="ef-field">
          <label>Modalidad</label>
          <SearchSelect v-model="form.cat_insc_modality" :items="catInscModality" label-field="description" value-field="id" placeholder="MODALIDAD..." />
        </div>
        <!-- Categoria de entrada: solo eventos/congresos la tienen. Define la
             tarifa y el grupo de WhatsApp que sale en el correo. -->
        <div class="ef-field" v-if="isEventProgram">
          <label>Categoria de entrada <span class="ef-req">*</span></label>
          <SearchSelect
            v-model="form.cat_event_category"
            :items="eventCategories"
            label-field="description"
            value-field="cat_event_category"
            placeholder="VIP / GENERAL / VIRTUAL..."
            :disabled="!form.program_version_id"
            @change="onEventCategoryChange"
          />
          <small v-if="form.cat_event_category && !eventCategories.find(c => c.cat_event_category === form.cat_event_category)?.has_price"
                 class="ef-disc-hint">Sin tarifa configurada: se conserva el precio del programa.</small>
        </div>
      </div>
      <!-- Asiento: cada entrada VIP tiene el suyo. Sale en el correo. -->
      <div class="ef-grid-4" style="margin-top:16px" v-if="hasAssignedSeat">
        <div class="ef-field">
          <label>Asiento <span class="ef-req">*</span></label>
          <input v-model="form.event_seat" type="text" placeholder="A-12" />
          <small class="ef-cc-help">Aparece en el correo de confirmacion.</small>
        </div>
      </div>
    </div>

    <!-- INFORMACION DE PAGO -->
    <div class="ef-card" v-if="!isB2BDocumental && !isMembershipBenefit && !isSpeakerTicket">
      <h6 class="ef-section-title"><i class="fa-solid fa-credit-card"></i> INFORMACION DE PAGO</h6>
      <div class="ef-grid-4">
        <div class="ef-field">
          <label>Moneda</label>
          <SearchSelect v-model="form.cat_currency" :items="catCurrency" label-field="description" value-field="id" placeholder="MONEDA..." />
        </div>
        <div class="ef-field">
          <label>Forma de Pago <span class="ef-req">*</span></label>
          <SearchSelect v-model="form.cat_payment_way" :items="catPaymentWay" label-field="description" value-field="id" placeholder="CONTADO / CUOTAS..." />
        </div>
        <div class="ef-field">
          <label>Precio Base</label>
          <div class="ef-price-base">{{ currencySymbol }} {{ formatMoney(calculatedBasePrice) }}</div>
        </div>
      </div>
      <div class="ef-grid-4" style="margin-top:16px">
        <div class="ef-field">
          <label>Precio Lista</label>
          <input v-model.number="form.list_price" type="number" placeholder="0.00" :disabled="form.is_scholarship" />
        </div>
        <div class="ef-field">
          <label>Monto Total</label>
          <input v-model.number="form.total_amount" type="number" placeholder="0.00" :disabled="form.is_scholarship" />
        </div>
        <div class="ef-field" style="justify-content:flex-end">
          <label class="ef-checkbox-label">
            <input type="checkbox" v-model="form.is_scholarship" @change="onScholarshipToggle" />
            <span>Beca (sin pago)</span>
          </label>
        </div>
      </div>
    </div>

    <!-- DESCUENTOS Y BENEFICIOS -->
    <!-- Vive FUERA de INFORMACION DE PAGO a proposito: en beca o cortesia de
         membresia no hay pago que mostrar, pero el beneficio si se registra —
         entra en monto 0 y vale por su etiqueta (CUENTA PERSONAL / laptop).
         Misma regla que el SP (v_ben_solo_badge) y que computeDiscounts.js. -->
    <div class="ef-card" v-if="!isB2BDocumental && !isSpeakerTicket">
      <h6 class="ef-section-title"><i class="fa-solid fa-tags"></i> DESCUENTOS Y BENEFICIOS</h6>
      <div class="ef-grid-3">
        <div class="ef-field" v-if="!isZeroPayment">
          <label>
            Descuento <span class="ef-optional">(opcional)</span>
            <span v-if="!form.list_price" class="ef-disc-hint">requiere precio lista</span>
          </label>
          <SearchSelect
            :key="`fico-dsct-pct-${discountResetKey}`"
            v-model="form.dsct_porcent_id"
            mode="remote"
            :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountTypeId('we_discount_type_percentage'), cat_currency: form.cat_currency })"
            label-field="full_label"
            value-field="id"
            placeholder="DESCUENTO (%)"
            :minChars="0"
            :cache="false"
            :disabled="!form.list_price"
            :model-label="form.dsct_porcent_label"
            @change="onChangeDescuentoPorcentual"
          />
        </div>
        <div class="ef-field" v-if="!isZeroPayment">
          <label>
            Promocion <span class="ef-optional">(opcional)</span>
            <span v-if="!form.list_price" class="ef-disc-hint">requiere precio lista</span>
          </label>
          <SearchSelect
            :key="`fico-dsct-stick-${discountResetKey}`"
            v-model="form.dsct_stick_id"
            mode="remote"
            :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountTypeId('we_discount_type_fixed'), cat_currency: form.cat_currency })"
            label-field="full_label"
            value-field="id"
            placeholder="PROMOCION (S/)"
            :minChars="0"
            :cache="false"
            :disabled="!form.list_price"
            :model-label="form.dsct_stick_label"
            @change="onChangeDescuentoFijo"
          />
        </div>
        <div class="ef-field">
          <label>
            Beneficios <span class="ef-optional">(opcional)</span>
            <span v-if="!isZeroPayment && !form.list_price" class="ef-disc-hint">requiere precio lista</span>
          </label>
          <MultiSelect
            :key="`fico-dsct-benefit-${discountResetKey}`"
            v-model="form.dsct_benefit_ids"
            mode="remote"
            :debounce-ms="400"
            :disabled="!isZeroPayment && !form.list_price"
            label-key="full_label"
            value-key="id"
            :fetcher="q => discountService.discountCaller({ q, cat_discount_type: discountTypeId('we_discount_type_benefit'), cat_currency: form.cat_currency })"
            placeholder="BENEFICIOS..."
            @change="onChangeBeneficios"
          />
          <small v-if="isZeroPayment" class="ef-cc-help">Sin pago: el beneficio se registra en 0 y solo genera la etiqueta.</small>
        </div>
      </div>
    </div>

    <!-- DATOS DEL PAGO -->
    <div class="ef-card" v-if="!hidesPaymentDetails">
      <h6 class="ef-section-title"><i class="fa-solid fa-money-check-dollar"></i> DATOS DEL PAGO</h6>
      <div class="ef-grid-3">
        <div class="ef-field">
          <label>Medio de Pago</label>
          <SearchSelect v-model="form.cat_payment_medium" :items="catPaymentMedium" label-field="description" value-field="id" placeholder="Transferencia, Yape..." />
        </div>
        <div class="ef-field">
          <label>Entidad Empresa</label>
          <SearchSelect v-model="form.cat_business_entity" :items="catBusinessEntity" label-field="description" value-field="id" placeholder="Seleccionar..." @update:modelValue="form.bank_account_id = null" />
        </div>
        <div class="ef-field">
          <label>Cuenta Bancaria</label>
          <select v-model="form.bank_account_id" class="ef-input" :disabled="!form.cat_business_entity">
            <option :value="null">{{ form.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
            <option v-for="a in filteredBankAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
          </select>
        </div>
      </div>
      <div class="ef-grid-3" style="margin-top:16px">
        <div class="ef-field">
          <label>N. Operacion</label>
          <input v-model="form.transaction_code" type="text" placeholder="Numero de operacion" />
        </div>
        <div class="ef-field">
          <label>Fecha de Pago</label>
          <BaseDatePicker v-model="form.payment_date" placeholder="dd/mm/aaaa" class="ef-datepicker" />
        </div>
      </div>
    </div>

    <!-- PLAN DE CUOTAS -->
    <div class="ef-card" v-if="isInstallment && !hidesPaymentDetails">
      <h6 class="ef-section-title"><i class="fa-solid fa-calendar-days"></i> PLAN DE CUOTAS</h6>

      <div class="ef-grid-3" style="margin-bottom:16px">
        <div class="ef-field">
          <label>Pago Inicial (Reserva)</label>
          <input v-model.number="form.saved_money" type="number" step="0.01" class="ef-input" placeholder="0.00" />
        </div>
        <div class="ef-field">
          <label>Saldo a Financiar</label>
          <div class="ef-readonly">S/. {{ formatMoney(installmentRemainder) }}</div>
        </div>
        <div class="ef-field">
          <label>N. Cuotas</label>
          <input v-model.number="numCuotas" type="number" min="1" max="12" class="ef-input" @change="generateInstallments" />
        </div>
      </div>

      <table class="ef-table" style="width:100%">
        <thead>
          <tr>
            <th style="width:40px">N</th>
            <th>Monto</th>
            <th>Vencimiento</th>
            <th style="width:40px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, idx) in installments" :key="idx">
            <td class="tc fw700">{{ idx + 1 }}</td>
            <td><input v-model.number="c.amount" type="number" step="0.01" class="ef-input" placeholder="0.00" /></td>
            <td><BaseDatePicker v-model="c.due_date" placeholder="dd/mm/aaaa" class="ef-datepicker" /></td>
            <td class="tc"><button class="ef-btn-del" @click="installments.splice(idx,1)"><i class="fa-solid fa-trash-can"></i></button></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding:12px 0">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <button class="ef-btn-outline" style="font-size:12px" @click="addInstallment">+ Agregar Cuota</button>
                <div>
                  <span style="font-size:12px;color:#737373;margin-right:8px">Total cuotas:</span>
                  <span class="fw700" :style="{ color: installmentValid ? '#059669' : '#DC2626' }">S/. {{ formatMoney(installmentSum) }}</span>
                  <span v-if="!installmentValid" style="font-size:11px;color:#DC2626;margin-left:8px">
                    (debe ser S/. {{ formatMoney(installmentRemainder) }})
                  </span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- COMPROBANTE DE PAGO -->
    <div class="ef-card" v-if="!hidesPaymentDetails">
      <h6 class="ef-section-title"><i class="fa-solid fa-cloud-arrow-up"></i> COMPROBANTE DE PAGO</h6>
      <MultiFileUploader
        v-model="form.ticket_payment_urls"
        label="Clic para subir Comprobante(s)"
        accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
        :required="false"
        :minFiles="0"
      />
    </div>

    <!-- OBSERVACIONES -->
    <div class="ef-card">
      <h6 class="ef-section-title"><i class="fa-solid fa-message"></i> OBSERVACIONES</h6>
      <div class="ef-field">
        <textarea v-model="form.observations" rows="3" placeholder="Notas internas de FICO"></textarea>
      </div>
    </div>

    <!-- GUARDAR -->
    <div class="ef-footer-actions">
      <button class="ef-btn-outline" @click="goBack">Cancelar</button>
      <button class="ef-btn-primary" :disabled="saving" @click="handleSave">
        {{ saving ? 'Guardando...' : 'Guardar inscripcion' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useToastWithAction } from '@/composables/useToastWithAction'
import { ServiceKeys } from '@/services'
import SearchSelect from '@/components/SearchSelect.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'
import {
  isSpeakerCategory,
  hasAssignedSeat as isSeatedCategory,
  resolveEnrollmentAmounts
} from '@/features/event-ticket/eventTicket.js'

const router = useRouter()
const toast = useToast()
const toastWA = useToastWithAction()
const catalog = inject('catalog')
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const ficoService = inject(ServiceKeys.Fico)
const discountService = inject(ServiceKeys.Discount)

const authService = inject(ServiceKeys.Auth)
const customerService = inject(ServiceKeys.Customer)

const saving = ref(false)

// Polling de estado del job 'register_followup' post-registro. Polea cada 3s
// hasta que el job termina (done|failed) o pasa el timeout maximo (3 min).
// Vive fuera del componente: si el operador navega, el polling sigue corriendo
// y el toast aparece donde sea que este en la app cuando el job termine.
async function pollRegisterFollowupStatus (enrollmentId, _jobId) {
  const MAX_MS = 3 * 60 * 1000
  const INTERVAL_MS = 3000
  const STEP_LABELS = { children: 'modulos hijos', odoo: 'Odoo', email: 'correo de confirmacion' }
  const start = Date.now()

  while (Date.now() - start < MAX_MS) {
    await new Promise(r => setTimeout(r, INTERVAL_MS))
    let job
    try {
      job = await ficoService.getJobStatus(enrollmentId, 'register_followup')
    } catch (err) {
      console.warn('[pollRegisterFollowup] getJobStatus fallo, reintentando:', err?.message)
      continue
    }
    if (!job) {
      console.warn('[pollRegisterFollowup] no encontrado job para enrollment', enrollmentId)
      return
    }
    if (job.status === 'done') {
      toast.success('Procesamiento completado: hijos, Odoo y correo OK.', { timeout: 5000 })
      return
    }
    if (job.status === 'failed') {
      const stepLabel = STEP_LABELS[job.error_step] || job.error_step || 'paso desconocido'
      toast.error(`Inscripcion creada pero fallo en ${stepLabel}: ${job.error_message || 'sin detalle'}. Reintenta desde el detalle.`, { timeout: 12000 })
      return
    }
    // pending / in_progress: continua loopeando
  }
  toast.warning('El procesamiento en segundo plano esta tardando mas de lo esperado. Revisa el detalle de la inscripcion para ver el estado.', { timeout: 10000 })
}
const searchingCustomer = ref(false)
const loadingPrograms = ref(false)
const loadingEditions = ref(false)
const programsList = ref([])
const editionsList = ref([])
const installments = ref([])
const agentsList = ref([])
const b2bAgentsListRef = ref([])
const numCuotas = ref(1)
const editionStartDate = ref(null)
const programSessions = ref(0)
const programSessionsPerWeek = ref(1)
const allBankAccounts = ref([])

const programPrices = reactive({
  student_soles: 0, student_dollars: 0,
  profesional_soles: 0, profesional_dollars: 0
})

const catDocTypes = catalog.options('we_type_document')
const catCountries = catalog.options('we_country')
const catCurrency = catalog.options('we_currency', {
  mapItem: x => ({
    id: x.id,
    description: `${x.abbreviation || x.code || ''} (${x.prefix || x.symbol || ''})`,
    alias: x.alias
  })
})
const catInscModality = catalog.options('we_insc_modality')
const catPaymentWay = catalog.options('we_payment_way')
const catPaymentChannel = catalog.options('we_payment_channel')
const catProgramType = catalog.options('we_program_type')
const catPaymentMedium = catalog.options('we_payment_medium')
const catBusinessEntity = catalog.options('we_business_entity')
const catB2BDoctype = catalog.options('we_enrollment_b2b_doctype')
const catDiscountType = catalog.options('we_discount_type')

const discountTypeId = (alias) => catDiscountType.find(c => c.alias === alias)?.id || null
const discountResetKey = ref(0)

const channelGeneral = computed(() => catPaymentChannel.find(c => c.alias === 'we_channel_general'))

const form = reactive({
  cat_type_document: null,
  document_number: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  cat_country: null,
  cat_program_type: null,
  program_version_id: null,
  program_edition_id: null,
  cat_insc_modality: null,
  // Categoria de entrada del evento (VIP/GENERAL/PREMIUM/VIRTUAL). Null fuera
  // de eventos: el SP no la conoce, se persiste con un UPDATE aparte.
  cat_event_category: null,
  // Asiento asignado de la entrada VIP.
  event_seat: '',
  cat_currency: null,
  cat_payment_way: null,
  list_price: 0,
  total_amount: 0,
  saved_money: 0,
  is_scholarship: false,
  cat_payment_medium: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: '',
  payment_date: '',
  client_profile: '',
  membership_program_id: null,
  agent_category: '',
  seller_agent_id: null,
  cat_b2b_doctype: null,
  ticket_payment_urls: [],
  observations: '',
  email_cc: '',
  dsct_porcent_id: null,
  dsct_porcent_label: null,
  val_porcentaje: 0,
  dsct_stick_id: null,
  dsct_stick_label: null,
  val_fijo: 0,
  dsct_benefit_ids: [],
  val_beneficios: []
})

// Toggle del panel CC. Se auto-abre cuando seleccionan B2B porque ese es el
// caso de uso primario (copiar al supervisor de la empresa). El operador igual
// puede cerrarlo si no necesita CC en ese B2B especifico.
const showCcField = ref(false)
watch(() => form.agent_category, (cat) => {
  if (cat === 'b2b') showCcField.value = true
})

// Regex basico de email: estructura X@X.X. Suficiente para detectar errores
// tipograficos comunes; el SMTP es el validador definitivo. No usar regex
// "RFC-perfecto" — son enormes y rechazan emails validos pero raros.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ccTokens = computed(() => {
  if (!form.email_cc) return []
  return String(form.email_cc).split(/[,;]/).map(s => s.trim()).filter(Boolean)
})
const ccPreview = computed(() => ccTokens.value.filter(e => EMAIL_REGEX.test(e)))
const ccInvalidCount = computed(() => ccTokens.value.length - ccPreview.value.length)

function clearCcField () {
  form.email_cc = ''
  showCcField.value = false
}

const isB2BDocumental = computed(() => {
  return form.agent_category === 'b2b' && !form.seller_agent_id && !!form.cat_b2b_doctype
})

// Tiers de membresia: NO se hardcodean. Son la fuente de verdad normalizada en
// programs (is_membership=Y), bajo el tipo de programa "Membresia" (catalog 2506).
// programCaller devuelve { id, description } (167 BLACK / 168 PLUS / 169 GOLDEN / 170 PLATINIUM).
// OJO: debe declararse ANTES de los computed/watch de abajo. watch() evalua su
// fuente al registrarse; si se declara despues, da TDZ (ReferenceError) que rompe
// el setup y deja el formulario en blanco.
// GOLD/PLAT/BLACK regalan el curso (beneficio => total 0); PLUS paga. La regla
// "es gratis" se deriva del nombre (solo PLUS paga), no de program_ids.
const membershipOptions = ref([])
const selectedMembership = computed(() => membershipOptions.value.find(p => p.id === form.membership_program_id) || null)
const isMembershipBenefit = computed(() => !!selectedMembership.value && !/plus/i.test(selectedMembership.value.description || ''))

// El alumno no paga (beca o cortesia de membresia): no hay descuentos de dinero
// que aplicar, pero los beneficios se siguen registrando por su etiqueta.
const isZeroPayment = computed(() => form.is_scholarship || isMembershipBenefit.value)

// Beca, cortesia de membresia y ponente de congreso terminan igual: no hay
// nada que cobrar. Se borra lo que se haya escrito de pago para no mandar
// montos viejos (el SP fuerza 0 igual, pero la UI no debe mostrar pago).
function clearPaymentData () {
  form.total_amount = 0
  form.saved_money = 0
  form.cat_payment_way = null
  form.cat_payment_medium = null
  form.cat_business_entity = null
  form.bank_account_id = null
  form.transaction_code = ''
  form.ticket_payment_urls = []
  installments.value = []
  form.dsct_porcent_id = null; form.dsct_porcent_label = null; form.val_porcentaje = 0
  form.dsct_stick_id = null; form.dsct_stick_label = null; form.val_fijo = 0
  form.dsct_benefit_ids = []; form.val_beneficios = []
  discountResetKey.value++
}

watch(isMembershipBenefit, (benefit) => {
  if (benefit) clearPaymentData()
})

watch(() => form.seller_agent_id, (val) => {
  if (val) form.cat_b2b_doctype = null
})

const docConfig = computed(() => {
  const selected = catDocTypes.find(item => item.id === form.cat_type_document)
  const alias = selected?.alias || ''
  const maxLength = selected?.variable_1 ? Number(selected.variable_1) : 15
  const isNumeric = ['we_type_document_dni', 'we_type_document_ruc'].includes(alias)
  return { maxLength, isNumeric, alias }
})

watch(() => form.cat_type_document, () => {
  if (!form.cat_type_document) {
    form.document_number = ''
    return
  }
  if (!form.document_number) return
  if (docConfig.value.maxLength && form.document_number.length > docConfig.value.maxLength) {
    form.document_number = form.document_number.slice(0, docConfig.value.maxLength)
  }
  if (docConfig.value.isNumeric) {
    form.document_number = form.document_number.replace(/\D/g, '')
  }
})

const isInstallment = computed(() => {
  const sel = catPaymentWay.find(c => c.id === form.cat_payment_way)
  return sel?.alias === 'we_payment_way_installments'
})

const programTypeAlias = computed(() => {
  const sel = catProgramType.find(c => c.id === form.cat_program_type)
  return sel?.alias || ''
})

// ── CATEGORIA DE ENTRADA (eventos/congresos) ─────────────────────────────
// Un congreso se vende por categoria: cada una tiene su tarifa, su grupo de
// WhatsApp y decide si el correo va con el detalle virtual o presencial. Misma
// logica que comercial (useLeadForm.js), aqui con los precios de FICO.
const eventCategories = ref([])
const isEventProgram = computed(() => programTypeAlias.value === 'we_program_type_event')

async function loadEventCategories () {
  if (!isEventProgram.value || !form.program_version_id) { eventCategories.value = []; return }
  try {
    eventCategories.value = await programService.eventCategoryList(form.program_version_id) || []
  } catch (err) {
    console.error('[loadEventCategories]', err)
    eventCategories.value = []
    // Sin aviso el select vacio se lee como "este evento no tiene categorias"
    // y la inscripcion se guarda incompleta. Paso con un 403 de permisos.
    toast.error('No se pudieron cargar las categorias de entrada del evento.')
  }
}

// Solo se sienta con asiento asignado la entrada VIP y el ponente (que va a la
// zona VIP sin pagar entrada). En el resto el campo no se muestra y lo que se
// haya escrito se descarta al guardar.
const selectedEventCategory = computed(
  () => eventCategories.value.find(c => c.cat_event_category === form.cat_event_category) || null
)
const hasAssignedSeat = computed(() => isSeatedCategory(selectedEventCategory.value?.alias))

// El ponente es invitado del congreso, no cliente: entra con tarifa 0 y no hay
// nada que cobrarle, ni cuotas, ni comprobante, ni descuentos sobre cero.
const isSpeakerTicket = computed(() => isSpeakerCategory(selectedEventCategory.value?.alias))

watch(isSpeakerTicket, (esPonente) => {
  if (!esPonente) return
  clearPaymentData()
  // La tarifa 0 de la categoria no baja el precio sola: el watch de
  // calculatedBasePrice solo pisa list_price cuando el precio es > 0, para no
  // borrarlo mientras el usuario todavia no elige moneda o perfil.
  form.list_price = 0
})

// Quien no paga no ve la cobranza: beca, cortesia de membresia, ponente y el
// B2B documental (que lo factura la empresa).
const hidesPaymentDetails = computed(() =>
  form.is_scholarship || isB2BDocumental.value || isMembershipBenefit.value || isSpeakerTicket.value
)

function onEventCategoryChange (opcion) {
  // Sin tarifa propia se conserva el precio del programa: mejor eso que dejar
  // la inscripcion en 0 por una categoria a medio configurar.
  if (opcion?.has_price) {
    programPrices.student_soles = Number(opcion.price_student_soles || 0)
    programPrices.student_dollars = Number(opcion.price_student_dollars || 0)
    programPrices.profesional_soles = Number(opcion.price_profesional_soles || 0)
    programPrices.profesional_dollars = Number(opcion.price_profesional_dollars || 0)
  }
}

const filteredBankAccounts = computed(() => {
  if (!form.cat_business_entity) return []
  return allBankAccounts.value.filter(a => a.business_entity_catalog_id === form.cat_business_entity)
})

const currencyAlias = computed(() => {
  const sel = catCurrency.find(c => c.id === form.cat_currency)
  return sel?.alias || ''
})

const currencySymbol = computed(() => {
  return currencyAlias.value === 'we_currency_usd' ? '$' : 'S/.'
})

const calculatedBasePrice = computed(() => {
  if (!form.cat_currency) return 0
  const isUSD = currencyAlias.value === 'we_currency_usd'
  const profile = form.client_profile

  if (profile === 'estudiante') {
    return isUSD ? programPrices.student_dollars : programPrices.student_soles
  }
  const pro = isUSD ? programPrices.profesional_dollars : programPrices.profesional_soles
  if (pro > 0) return pro
  return isUSD ? programPrices.student_dollars : programPrices.student_soles
})

watch(calculatedBasePrice, (price) => {
  if (price > 0) {
    form.list_price = price
  }
})

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// Recalcula total_amount aplicando los 3 canales de descuento sobre list_price.
// Misma logica que comercial (useLeadForm.js): porcentaje primero, luego promo
// (precio target), luego beneficios (suma fija). Si los descuentos suman mas
// que el precio base se resetean para evitar montos negativos.
watch(
  () => [form.list_price, form.val_porcentaje, form.val_fijo, form.val_beneficios, form.dsct_porcent_id, form.dsct_stick_id],
  () => {
    if (form.is_scholarship || isB2BDocumental.value || isMembershipBenefit.value) return
    const base = Number(form.list_price) || 0
    const montoPorcentaje = round2((base * (form.val_porcentaje || 0)) / 100)
    const subtotalAfterPct = round2(base - montoPorcentaje)
    const promoTarget = round2(Number(form.val_fijo) || 0)
    let montoFijo = 0
    if (form.dsct_stick_id && promoTarget > 0) {
      montoFijo = round2(subtotalAfterPct - promoTarget)
      if (montoFijo < 0) montoFijo = 0
    }
    const subtotalAfterStick = (form.dsct_stick_id && promoTarget > 0) ? promoTarget : subtotalAfterPct
    const montoBeneficio = round2((form.val_beneficios || []).reduce((acc, v) => acc + (Number(v) || 0), 0))
    const totalDescuentos = round2(montoPorcentaje + montoFijo + montoBeneficio)
    if (base > 0 && totalDescuentos > base) {
      toast.warning('Los descuentos superan el Precio Lista. Se resetearon.')
      form.val_porcentaje = 0; form.dsct_porcent_id = null; form.dsct_porcent_label = null
      form.val_fijo = 0; form.dsct_stick_id = null; form.dsct_stick_label = null
      form.val_beneficios = []; form.dsct_benefit_ids = []
      discountResetKey.value++
      form.total_amount = base
      return
    }
    const final = round2(subtotalAfterStick - montoBeneficio)
    form.total_amount = final > 0 ? final : 0
  },
  { deep: true, immediate: true }
)

function onChangeDescuentoPorcentual (opt) {
  if (!opt) {
    form.val_porcentaje = 0
    form.dsct_porcent_label = null
    return
  }
  form.val_porcentaje = Number(opt.value) || 0
  form.dsct_porcent_label = opt.full_label || opt.label || null
}

function onChangeDescuentoFijo (opt) {
  if (!opt) {
    form.val_fijo = 0
    form.dsct_stick_label = null
    return
  }
  form.val_fijo = Number(opt.value) || 0
  form.dsct_stick_label = opt.full_label || opt.label || null
}

function onChangeBeneficios (selectedItems) {
  form.dsct_benefit_ids = selectedItems || []
  form.val_beneficios = (selectedItems || []).map(i => Number(i.raw?.value || i.value || 0))
}

const autoNumCuotas = computed(() => {
  const type = programTypeAlias.value
  const spw = programSessionsPerWeek.value || 1
  if (['we_program_type_course', 'we_program_type_minicourse'].includes(type)) return 1
  if (type === 'we_program_type_pee') return spw >= 2 ? 2 : 3
  if (type === 'we_program_type_diploma') return spw >= 2 ? 4 : 5
  if (type === 'we_program_type_specialization') return spw >= 2 ? 2 : 3
  return 1
})

function autoGenerateInstallments () {
  if (!isInstallment.value || !form.total_amount) return
  const n = autoNumCuotas.value
  numCuotas.value = n
  const remainder = Math.max(0, (form.total_amount || 0) - (form.saved_money || 0))
  if (remainder <= 0) return

  const perCuota = Math.floor((remainder / n) * 100) / 100
  const last = Math.round((remainder - perCuota * (n - 1)) * 100) / 100
  const start = editionStartDate.value || new Date()

  installments.value = []
  for (let i = 0; i < n; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i + 1)
    d.setDate(15)
    installments.value.push({
      due_date: d.toISOString().slice(0, 10),
      amount: i === n - 1 ? last : perCuota
    })
  }
}

watch(() => form.cat_payment_way, () => {
  if (isInstallment.value && form.total_amount > 0) autoGenerateInstallments()
  if (!isInstallment.value) installments.value = []
})

watch(() => form.total_amount, () => {
  if (isInstallment.value && form.total_amount > 0) autoGenerateInstallments()
})

// Cuando el asesor cambia la moneda, los descuentos seleccionados antes ya no
// aplican (el SP filtra por currency). Reseteamos la seleccion y forzamos
// re-mount de los SearchSelect para que vuelvan a buscar con el nuevo alias.
watch(() => form.cat_currency, (newVal, oldVal) => {
  if (oldVal == null || newVal === oldVal) return
  form.dsct_porcent_id = null; form.dsct_porcent_label = null; form.val_porcentaje = 0
  form.dsct_stick_id = null; form.dsct_stick_label = null; form.val_fijo = 0
  form.dsct_benefit_ids = []; form.val_beneficios = []
  discountResetKey.value++
})

onMounted(async () => {
  await Promise.all([loadAgents(), loadB2BAgents(), loadBankAccounts(), loadMemberships()])
  const pen = catCurrency.find(c => c.alias === 'we_currency_soles' || c.description?.toLowerCase().includes('pen'))
  if (pen) form.cat_currency = pen.id
  const dni = catDocTypes.find(c => c.alias?.toLowerCase().includes('dni'))
  if (dni) form.cat_type_document = dni.id
})

async function loadBankAccounts () {
  try {
    allBankAccounts.value = await ficoService.getBankAccounts() || []
  } catch (e) { console.error(e) }
}

async function loadPrograms () {
  loadingPrograms.value = true
  try {
    const items = await programService.programVersionCaller({
      active: 'Y',
      cat_type_program: form.cat_program_type || null
    })
    programsList.value = (items || []).map(p => ({
      ...p,
      label: `${p.abbreviation || ''} — ${p.version_code || ''}`
    }))
  } catch (e) { console.error(e) }
  finally { loadingPrograms.value = false }
}

function onProgramTypeChange () {
  form.program_version_id = null
  form.program_edition_id = null
  form.cat_event_category = null
  form.event_seat = ''
  editionsList.value = []
  programsList.value = []
  eventCategories.value = []
  if (form.cat_program_type) loadPrograms()
}

async function onProgramChange () {
  form.program_edition_id = null
  form.cat_event_category = null
  form.event_seat = ''
  editionsList.value = []
  loadEventCategories()
  if (!form.program_version_id) return

  const prog = programsList.value.find(p => p.program_version_id === form.program_version_id)
  if (prog) {
    programPrices.student_soles = Number(prog.price_student_soles || 0)
    programPrices.student_dollars = Number(prog.price_student_dollars || 0)
    programPrices.profesional_soles = Number(prog.price_profesional_soles || 0)
    programPrices.profesional_dollars = Number(prog.price_profesional_dollars || 0)
    programSessions.value = Number(prog.sessions || 0)
    programSessionsPerWeek.value = Number(prog.sessions_per_week || 1)
  }

  loadingEditions.value = true
  try {
    const items = await editionService.editionCaller({ program_version_id: form.program_version_id })
    const hoy = new Date()
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    desde.setHours(0, 0, 0, 0)

    editionsList.value = (items || [])
      .filter(e => {
        if (!e.start_date) return true
        return new Date(e.start_date) >= desde
      })
      .sort((a, b) => {
        if (!a.start_date) return 1
        if (!b.start_date) return -1
        return new Date(a.start_date) - new Date(b.start_date)
      })
      .map(e => ({
        ...e,
        id: e.edition_num_id || e.id,
        // Usamos start_date_label tal cual viene del SP. Es texto plano armado
        // en Postgres con su sesion TZ — no lo pasamos por new Date() porque
        // eso aplicaria conversion del browser y restaria 1 dia en zonas con
        // offset negativo (Lima UTC-5).
        label: `${e.global_code || e.edition_code || ''} — ${e.start_date_label || ''}`
      }))
  } catch (e) { console.error('[EnrollmentForm] editionCaller error:', e) }
  finally { loadingEditions.value = false }
}

function onEditionChange () {
  const ed = editionsList.value.find(e => e.id === form.program_edition_id)
  if (!ed) return

  editionStartDate.value = ed.start_date ? new Date(ed.start_date) : null

  if (ed.start_date && ed.end_date) {
    const inicio = new Date(ed.start_date)
    const fin = new Date(ed.end_date)
    const semanas = Math.max(1, Math.round((fin - inicio) / (7 * 24 * 60 * 60 * 1000)))
    if (programSessions.value > 0) {
      programSessionsPerWeek.value = Math.max(1, Math.round(programSessions.value / semanas))
    }
  }

  autoGenerateInstallments()
}

async function loadAgents () {
  try {
    const users = await authService.userList({})
    agentsList.value = (users || []).map(u => ({
      id: u.user_id,
      alias: u.alias || '',
      label: `${u.alias || ''} - ${(u.first_name || u.name || '').trim()}`,
      isAgent: true
    }))
  } catch (e) { console.error(e) }
}

async function loadB2BAgents () {
  try {
    const users = await authService.userListByRole('B2B')
    b2bAgentsListRef.value = (users || []).map(u => ({
      id: u.user_id,
      alias: u.alias || '',
      label: `${u.alias || ''} - B2B`
    }))
  } catch (e) { console.error(e) }
}

const agentCategoryOptions = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'b2b', label: 'B2B' },
  { id: 'web', label: 'WEB' },
  { id: 'we', label: 'WE' },
  { id: 'sa', label: 'S/A' }
]

const weAreaOptions = [
  { id: 'twe', label: 'TWE - Talento' },
  { id: 'fwe', label: 'FWE - Fundacion' }
]

const clientProfileOptions = [
  { id: 'profesional', label: 'Profesional' },
  { id: 'estudiante', label: 'Estudiante' }
]

async function loadMemberships () {
  try {
    membershipOptions.value = await programService.programCaller({ cat_type_program: 2506, active: 'Y' }) || []
  } catch (e) { console.error(e) }
}

// Asesores asignables a una inscripcion B2B: los users con rol B2B (externos)
// + cualquier asesor comercial que pueda cerrar venta B2B (ej. AE30 → "B2B - AE30").
// Dedup por user_id por si un comercial tambien tiene rol B2B.
const b2bAgentsList = computed(() => {
  const out = [...b2bAgentsListRef.value]
  const seen = new Set(out.map(u => u.id))
  for (const a of agentsList.value) {
    if (seen.has(a.id)) continue
    out.push({ id: a.id, label: `${a.alias || ''} - B2B` })
    seen.add(a.id)
  }
  return out
})

const webAgentsList = computed(() => {
  return agentsList.value.map(a => ({
    id: a.id,
    label: `${a.alias || ''} - WEB`
  }))
})

function onScholarshipToggle () {
  if (form.is_scholarship) {
    clearPaymentData()
  } else if (calculatedBasePrice.value > 0) {
    form.total_amount = calculatedBasePrice.value
    form.list_price = calculatedBasePrice.value
  }
}

function onDocumentInput () {
  if (docConfig.value.isNumeric) {
    form.document_number = form.document_number.replace(/\D/g, '')
  }
  form.document_number = form.document_number.toUpperCase().slice(0, docConfig.value.maxLength)
}

async function searchCustomerByDocument () {
  const doc = form.document_number?.trim()
  if (!doc || doc.length < 3) {
    toast.warning('Ingrese el numero de documento antes de buscar.')
    return
  }
  searchingCustomer.value = true
  try {
    const response = await customerService.customerInfoGet({ document: doc })
    if (response && response.result === 1) {
      form.first_name = response.first_name || ''
      form.last_name = response.last_name || ''
      // El formulario tiene UN solo campo "Apellidos": se muestran paterno +
      // materno juntos. Al guardar, fn_last_name_sin_materno (BD) le vuelve a
      // quitar la cola; si no, last_name se queda con los dos y el materno sale
      // repetido en todo concat_ws(first_name, last_name, mother_last_name).
      if (response.mother_last_name) form.last_name += ' ' + response.mother_last_name
      form.email = response.email || ''
      form.phone = response.phone || form.phone
      toast.success('Cliente encontrado en base de datos.')
      return
    }
    if (docConfig.value.isNumeric) await searchSunat()
    else toast.info('No se encontro cliente con ese documento.')
  } catch (err) {
    console.error('[searchCustomer]', err)
    if (docConfig.value.isNumeric) await searchSunat()
    else toast.info('No se encontro cliente con ese documento.')
  } finally {
    searchingCustomer.value = false
  }
}

async function searchSunat () {
  const doc = form.document_number?.trim()
  if (!doc) return
  try {
    const sunatData = await customerService.sunatGet({ document: doc })
    if (sunatData && sunatData.nombre_o_razon_social) {
      const fullName = sunatData.nombre_o_razon_social.trim()
      const parts = fullName.split(' ')
      if (doc.length === 8 && parts.length >= 3) {
        form.last_name = parts.slice(0, 2).join(' ')
        form.first_name = parts.slice(2).join(' ')
      } else {
        form.first_name = fullName
        form.last_name = ''
      }
      toast.info('Datos de SUNAT encontrados y precargados.')
    } else {
      toast.info('No se encontraron datos en SUNAT para el documento ingresado.')
    }
  } catch (err) {
    console.error('[searchSunat]', err)
    toast.info('No se pudo consultar SUNAT.')
  }
}

const requireDocument = computed(() => {
  return !['b2b', 'web'].includes(form.agent_category)
})

const requirePhone = computed(() => {
  return form.agent_category !== 'b2b'
})

function resolveAgentId () {
  const cat = form.agent_category
  if (['sa', 'we'].includes(cat)) return null
  return Number(form.seller_agent_id) || null
}

function resolveAgentOrigin () {
  const cat = form.agent_category
  if (cat === 'b2b') return 'B2B'
  if (cat === 'web') return 'WEB'
  // El area WE elegida (twe/fwe) es el origen real: 'TWE' / 'FWE'.
  if (cat === 'we') return String(form.seller_agent_id || 'we').toUpperCase()
  if (cat === 'sa') return 'SA'
  return null
}

const installmentRemainder = computed(() => {
  return Math.max(0, (form.total_amount || 0) - (form.saved_money || 0))
})

const installmentSum = computed(() => {
  return installments.value.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
})

const installmentValid = computed(() => {
  return Math.abs(installmentSum.value - installmentRemainder.value) < 0.01
})

function generateInstallments () {
  const n = numCuotas.value || 1
  const remainder = installmentRemainder.value
  const perCuota = Math.floor((remainder / n) * 100) / 100
  const last = Math.round((remainder - perCuota * (n - 1)) * 100) / 100

  installments.value = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setMonth(d.getMonth() + i + 1)
    installments.value.push({
      due_date: d.toISOString().slice(0, 10),
      amount: i === n - 1 ? last : perCuota
    })
  }
}

function formatMoney (v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addInstallment () {
  const remaining = installmentRemainder.value - installmentSum.value
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + installments.value.length + 1)
  installments.value.push({
    due_date: nextMonth.toISOString().slice(0, 10),
    amount: Math.max(0, Math.round(remaining * 100) / 100)
  })
}

function validate () {
  if (!form.agent_category) { toast.error('Selecciona una categoria de asesor.'); return false }
  if (form.agent_category === 'comercial' && !form.seller_agent_id) {
    toast.error('Selecciona un asesor comercial.'); return false
  }
  if (form.agent_category === 'we' && !form.seller_agent_id) {
    toast.error('Selecciona el area WE (TWE/FWE).'); return false
  }
  if (requireDocument.value) {
    if (!form.document_number.trim()) { toast.error('Ingresa el numero de documento.'); return false }
    if (docConfig.value.isNumeric && form.document_number.length !== docConfig.value.maxLength) {
      toast.error(`El documento debe tener exactamente ${docConfig.value.maxLength} digitos.`); return false
    }
  }
  if (!form.first_name.trim()) { toast.error('Ingresa los nombres.'); return false }
  if (!form.last_name.trim()) { toast.error('Ingresa los apellidos.'); return false }
  if (!form.email.trim()) { toast.error('Ingresa el correo.'); return false }
  if (requirePhone.value && !form.phone.trim()) { toast.error('Ingresa el telefono.'); return false }
  if (!form.program_version_id) { toast.error('Selecciona un programa.'); return false }
  // Sin edicion el enrollment queda sin fecha de inicio, fuera del aula/cronograma
  // y sin control de duplicados (findDuplicate filtra por program_edition_id).
  // Condicionado a que el programa TENGA ediciones: los cursos Online (asincronicos)
  // y las membresias no tienen, y ahi el NULL es correcto.
  if (editionsList.value.length && !form.program_edition_id) {
    toast.error('Selecciona una edicion.'); return false
  }
  // En un congreso la categoria define la tarifa y el grupo de WhatsApp del
  // correo: sin ella la inscripcion queda incompleta.
  if (isEventProgram.value && eventCategories.value.length && !form.cat_event_category) {
    toast.error('Selecciona la categoria de entrada del evento.'); return false
  }
  if (!form.client_profile) { toast.error('Selecciona un perfil (Profesional/Estudiante).'); return false }
  if (!isB2BDocumental.value && !form.is_scholarship && isInstallment.value && installments.value.length > 0 && !installmentValid.value) {
    toast.error('El total de cuotas no coincide con el saldo a financiar.'); return false
  }
  return true
}

async function handleSave () {
  if (saving.value || !validate()) return
  saving.value = true
  try {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const payload = {
      user_id: currentUser.user_id || currentUser.id || null,
      inscription: {
        document_number: form.document_number?.trim() || null,
        cat_type_document: form.document_number?.trim() ? form.cat_type_document : null,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || null,
        cat_country: form.cat_country,
        program_version_id: form.program_version_id,
        program_edition_id: form.program_edition_id,
        cat_insc_modality: form.cat_insc_modality,
        cat_event_category: isEventProgram.value ? form.cat_event_category : null,
        event_seat: hasAssignedSeat.value ? (form.event_seat || '').trim() || null : null,
        cat_payment_channel: channelGeneral.value?.id || null,
        cat_currency: form.cat_currency || catCurrency.find(c => c.alias === 'we_currency_soles')?.id || null,
        cat_payment_way: form.cat_payment_way || catPaymentWay.find(c => c.alias === 'we_payment_way_single')?.id || null,
        ...resolveEnrollmentAmounts({
          listPrice: form.list_price,
          totalAmount: form.total_amount,
          isSpeakerTicket: isSpeakerTicket.value,
          isMembershipBenefit: isMembershipBenefit.value
        }),
        is_membership_benefit: isMembershipBenefit.value,
        saved_money: form.saved_money || 0,
        seller_agent_id: resolveAgentId(),
        agent_origin: resolveAgentOrigin(),
        client_profile: form.client_profile || null,
        is_scholarship: form.is_scholarship || false,
        cat_b2b_doctype: isB2BDocumental.value ? form.cat_b2b_doctype : null,
        cat_payment_medium: (form.is_scholarship || isB2BDocumental.value) ? null : form.cat_payment_medium,
        cat_business_entity: form.cat_business_entity,
        bank_account_id: form.bank_account_id,
        transaction_code: form.transaction_code || null,
        payment_date: form.payment_date || null,
        ticket_payment_urls: form.ticket_payment_urls.length > 0 ? form.ticket_payment_urls : null,
        // La membresia ya no se estampa en notes: va normalizada en su columna FK.
        observations: form.observations?.trim() || null,
        // FK a la membresia (programs.is_membership=Y). NULL = sin membresia.
        membership_program_id: form.membership_program_id || null,
        installment_plan: isInstallment.value && installments.value.length > 0
          ? installments.value.map((c, i) => ({ installment_number: i + 1, amount: c.amount, due_date: c.due_date }))
          : null,
        email_cc: ccPreview.value.length > 0 ? ccPreview.value.join(',') : null,
        // Descuentos seleccionados. El SP los procesa en cascada (porcentaje
        // -> promocion stick -> beneficios) y los persiste en enrollment_discounts.
        // Si no se envian, el SP respeta el total_amount y discount_amount queda en 0.
        dsct_porcent_id: form.dsct_porcent_id || null,
        dsct_porcent_label: form.dsct_porcent_label || null,
        dsct_stick_id: form.dsct_stick_id || null,
        dsct_stick_label: form.dsct_stick_label || null,
        dsct_benefit_ids: (form.dsct_benefit_ids || []).map(b => ({
          value: b.value ?? b.id ?? b,
          label: b.label ?? b.full_label ?? null
        }))
      }
    }

    const resp = await ficoService.enrollmentRegister(payload)

    if (resp?.result === 1) {
      toast.success(resp.message || 'Inscripcion registrada correctamente.')
      // Nuevo flow asincrono: el SP responde apenas crea la inscripcion (~3s) y
      // encola los pasos post-registro (hijos, Odoo, email). Mostramos toast de
      // procesamiento y polleamos en background. Toast aparece tambien despues
      // de navegar (vue-toastification es global a la app).
      if (resp.email_pending && resp.enrollment_id) {
        toast.info('Inscripcion creada. Procesando hijos, Odoo y correo en segundo plano...', { timeout: 5000 })
        pollRegisterFollowupStatus(resp.enrollment_id, resp.job_id)
      } else if (resp.email_sent === true) {
        // Backward compat: si por algun motivo el backend respondio sincrono.
        toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
      } else if (resp.email_sent === false) {
        toast.warning(`Inscripcion creada pero el correo no se envio: ${resp.email_error || 'fallo desconocido'}`, { timeout: 7000 })
      }
      router.push({ name: 'enrollment' })
    } else if (resp?.result === 2 && resp?.duplicate_info) {
      // Inscripcion duplicada detectada: misma persona ya inscrita en la misma
      // edicion. Mostramos un toast con boton para abrir el detalle existente.
      const dup = resp.duplicate_info
      const fechaFmt = dup.registration_date
        ? new Date(dup.registration_date).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })
        : '---'
      toastWA.errorWithAction({
        title: 'Inscripcion duplicada',
        message:
          `${dup.student_name || 'El alumno'} ya esta inscrito en ${dup.program_name || 'este programa'} ${dup.edition_code || ''}.\n` +
          `Registrado por ${dup.registered_by || '---'} el ${fechaFmt}.\n` +
          `Si fue un error, retira la inscripcion existente antes de volver a registrar.`,
        actionLabel: 'Ver inscripcion existente',
        onAction: () => router.push({ name: 'enrollmentDetail', params: { id: String(dup.enrollment_id) } }),
        timeout: 12000
      })
    } else {
      toast.error(resp?.message || resp?.error || 'Error al registrar la inscripcion.')
    }
  } catch (err) {
    console.error('[handleSave]', err)
    const msg = err?.response?.data?.error || err?.message || 'Error al guardar la inscripcion.'
    toast.error(msg)
  } finally { saving.value = false }
}

function resetForm () {
  Object.assign(form, {
    cat_type_document: catDocTypes.find(c => c.alias?.toLowerCase().includes('dni'))?.id || null,
    document_number: '', first_name: '', last_name: '', email: '', phone: '',
    cat_country: null, cat_program_type: null, program_version_id: null, program_edition_id: null,
    cat_insc_modality: null, cat_event_category: null, event_seat: '', cat_payment_way: null, list_price: 0, total_amount: 0, saved_money: 0, is_scholarship: false,
    cat_payment_medium: null, cat_business_entity: null, bank_account_id: null, transaction_code: '', payment_date: '',
    client_profile: '', membership_program_id: null, agent_category: '', seller_agent_id: null, ticket_payment_urls: [], observations: '',
    email_cc: '',
    dsct_porcent_id: null, dsct_porcent_label: null, val_porcentaje: 0,
    dsct_stick_id: null, dsct_stick_label: null, val_fijo: 0,
    dsct_benefit_ids: [], val_beneficios: []
  })
  installments.value = []
  editionsList.value = []
  eventCategories.value = []
  showCcField.value = false
  discountResetKey.value++
}

function goBack () { router.back() }
</script>

<style scoped>
.ef-page {
  background: #FFFFFF;
  padding: 32px 32px 24px;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1A1A1A;
  min-height: 100vh;
}

.ef-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
}

.ef-page-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ef-breadcrumb {
  font-size: 11px;
  color: #A3A3A3;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
}

.ef-page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
  letter-spacing: -0.02em;
}

.ef-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ef-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--we-navy, #002060);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .2s ease;
  font-family: inherit;
  letter-spacing: -0.01em;
}
.ef-btn-primary:hover { background: var(--we-navy-dark, #001540); }
.ef-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.ef-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  color: #737373;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  cursor: pointer;
  transition: all .2s ease;
  font-family: inherit;
}
.ef-btn-outline:hover { border-color: #D4D4D4; color: #1A1A1A; }

.ef-btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

.ef-card {
  background: #fff;
  border: 1px solid #F0F0F0;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 20px;
}

.ef-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #8C8C8C;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 20px 0;
  padding-left: 12px;
  border-left: 3px solid #1A1A1A;
  line-height: 1.4;
}
.ef-section-title i {
  margin-right: 6px;
  font-size: 11px;
}

.ef-section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0;
}
.ef-section-header-row .ef-section-title {
  margin-bottom: 0;
}

.ef-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.ef-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.ef-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

.ef-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ef-field label {
  font-size: 12px;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ef-field input,
.ef-field select,
.ef-field textarea {
  height: 38px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  padding: 0 12px;
  color: #1A1A1A;
  background: #fff;
  font-family: inherit;
  transition: border-color .2s ease;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.ef-field input:focus,
.ef-field select:focus,
.ef-field textarea:focus {
  border-color: #A3A3A3;
}

.ef-field textarea {
  height: auto;
  padding: 10px 12px;
  resize: vertical;
  min-height: 72px;
}

.ef-field input[type="number"] {
  -moz-appearance: textfield;
}
.ef-field input[type="number"]::-webkit-inner-spin-button,
.ef-field input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ef-req {
  color: #DC2626;
  font-weight: 700;
}

.ef-optional {
  color: #A3A3A3;
  font-weight: 400;
  font-size: 10px;
  text-transform: none;
  letter-spacing: 0;
  margin-left: 4px;
}

.ef-disc-hint {
  color: #A3A3A3;
  font-weight: 400;
  font-size: 9px;
  text-transform: none;
  letter-spacing: 0;
  margin-left: 6px;
  font-style: italic;
}

.ef-b2b-note {
  margin-top: 16px;
  padding: 10px 14px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 8px;
  color: #1E40AF;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ef-b2b-note i {
  color: #2563EB;
  font-size: 13px;
}

.ef-cc-row {
  margin-top: 16px;
}
.ef-cc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px dashed #D4D4D4;
  border-radius: 8px;
  color: #525252;
  font-size: 12px;
  font-weight: 500;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ef-cc-toggle:hover {
  border-color: #6366F1;
  color: #4F46E5;
  background: #EEF2FF;
}
.ef-cc-toggle i { font-size: 11px; }

.ef-cc-panel {
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ef-cc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ef-cc-header label {
  font-size: 12px;
  font-weight: 600;
  color: #404040;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}
.ef-cc-header label i { color: #6366F1; font-size: 13px; }
.ef-cc-hint-b2b {
  margin-left: 6px;
  font-weight: 400;
  font-style: italic;
  color: #6366F1;
  font-size: 11px;
}
.ef-cc-clear {
  background: transparent;
  border: none;
  color: #A3A3A3;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 14px;
}
.ef-cc-clear:hover { color: #DC2626; background: #FEF2F2; }

.ef-cc-input {
  width: 100%;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  color: #1A1A1A;
  background: #FFFFFF;
}
.ef-cc-input:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.ef-cc-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ef-cc-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #ECFDF5;
  color: #047857;
  border: 1px solid #A7F3D0;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
}
.ef-cc-chip i { font-size: 9px; }

.ef-cc-warn {
  font-size: 11.5px;
  color: #B45309;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ef-cc-warn i { color: #D97706; }

.ef-cc-help {
  font-size: 11px;
  color: #737373;
  font-style: italic;
}

.ef-cuotas-table {
  margin-top: 16px;
}

.ef-cuotas-head {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 50px;
  gap: 12px;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #8C8C8C;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-bottom: 10px;
  border-bottom: 1px solid #F0F0F0;
}

.ef-cuotas-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 50px;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #FAFAFA;
}
.ef-cuotas-row input {
  height: 34px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  padding: 0 10px;
  color: #1A1A1A;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.ef-cuotas-row input:focus {
  border-color: #A3A3A3;
}

.ef-cuota-idx {
  font-size: 12px;
  font-weight: 600;
  color: #8C8C8C;
  text-align: center;
}

.ef-cuota-actions {
  display: flex;
  justify-content: center;
}

.ef-btn-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #F0F0F0;
  border-radius: 6px;
  background: #fff;
  color: #A3A3A3;
  cursor: pointer;
  transition: all .2s ease;
  font-size: 12px;
}
.ef-btn-del:hover {
  border-color: #DC2626;
  color: #DC2626;
  background: #FEF2F2;
}

.ef-empty {
  color: #A3A3A3;
  font-size: 13px;
  padding: 16px 0 0;
}

.ef-datepicker {
  width: 100%;
}

.ef-readonly {
  height: 38px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  background: #FAFAFA;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
}

.ef-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ef-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 500;
  color: #8C8C8C;
  font-size: 11px;
  text-transform: uppercase;
  border-bottom: 1px solid #F0F0F0;
}
.ef-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
}

.ef-input-with-btn {
  display: flex;
  gap: 6px;
  align-items: center;
}
.ef-input-with-btn input {
  flex: 1;
}

.ef-search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  background: #fff;
  color: #1A1A1A;
  cursor: pointer;
  transition: all .2s ease;
  font-size: 13px;
}
.ef-search-btn:hover { border-color: #A3A3A3; background: #FAFAFA; }
.ef-search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ef-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  cursor: pointer;
  height: 38px;
  padding: 0 12px;
  background: #FFF7ED;
  border: 1px solid #FED7AA;
  border-radius: 8px;
  transition: all .2s ease;
  user-select: none;
}
.ef-checkbox-label:has(input:checked) {
  background: #FEF3C7;
  border-color: #FCD34D;
  color: #92400E;
}
.ef-checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #D97706;
  cursor: pointer;
}

.ef-price-base {
  height: 38px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: #059669;
  background: #ECFDF5;
  border: 1px solid #D1FAE5;
  border-radius: 8px;
}

.ef-hint-warn {
  font-size: 11px;
  font-weight: 500;
  color: #D97706;
  margin-top: 2px;
}

.ef-footer-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 24px 0 8px;
}

.tc { text-align: center; }
.fw700 { font-weight: 700; }

@media (max-width: 900px) {
  .ef-grid-3, .ef-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .ef-page { padding: 20px 16px; }
  .ef-grid-2, .ef-grid-3, .ef-grid-4 { grid-template-columns: 1fr; }
  .ef-page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .ef-cuotas-head, .ef-cuotas-row { grid-template-columns: 30px 1fr 1fr 40px; gap: 8px; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .ef-page {
  background: #0E0E0A;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-breadcrumb { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-page-title { color: #F4F4F0; }

[data-coreui-theme="dark"] .ef-card {
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .ef-section-title {
  color: #A0A099;
  border-left-color: #F4F4F0;
}

[data-coreui-theme="dark"] .ef-field label { color: #A0A099; }
[data-coreui-theme="dark"] .ef-field input,
[data-coreui-theme="dark"] .ef-field select,
[data-coreui-theme="dark"] .ef-field textarea {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-field input::placeholder,
[data-coreui-theme="dark"] .ef-field textarea::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-field input:focus,
[data-coreui-theme="dark"] .ef-field select:focus,
[data-coreui-theme="dark"] .ef-field textarea:focus { border-color: #34D399; }

[data-coreui-theme="dark"] .ef-optional { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-btn-primary { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .ef-btn-primary:hover { background: #E4E4DD; }
[data-coreui-theme="dark"] .ef-btn-outline {
  background: #1A1A14;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .ef-btn-outline:hover {
  background: #2A2A22;
  border-color: #3A3A33;
  color: #F4F4F0;
}

[data-coreui-theme="dark"] .ef-readonly {
  background: #1F1F1A;
  border-color: #2A2A22;
  color: #F4F4F0;
}

[data-coreui-theme="dark"] .ef-cuotas-head {
  color: #6F6F66;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .ef-cuotas-row { border-bottom-color: #1F1F1A; }
[data-coreui-theme="dark"] .ef-cuotas-row input {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-cuotas-row input:focus { border-color: #34D399; }
[data-coreui-theme="dark"] .ef-cuota-idx { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-btn-del {
  background: #1A1A14;
  border-color: #2A2A22;
  color: #6F6F66;
}
[data-coreui-theme="dark"] .ef-btn-del:hover {
  background: rgba(220,38,38,0.16);
  border-color: rgba(220,38,38,0.4);
  color: #F87171;
}

[data-coreui-theme="dark"] .ef-empty { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-table th {
  color: #6F6F66;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .ef-table td {
  border-bottom-color: #1F1F1A;
  color: #D4D4CC;
}

[data-coreui-theme="dark"] .ef-search-btn {
  background: #1A1A14;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-search-btn:hover {
  background: #2A2A22;
  border-color: #3A3A33;
}

[data-coreui-theme="dark"] .ef-b2b-note {
  background: rgba(37,99,235,0.14);
  border-color: rgba(37,99,235,0.4);
  color: #93C5FD;
}
[data-coreui-theme="dark"] .ef-b2b-note i { color: #93C5FD; }

[data-coreui-theme="dark"] .ef-cc-toggle {
  background: transparent;
  border-color: #2A2A22;
  color: #A3A399;
}
[data-coreui-theme="dark"] .ef-cc-toggle:hover {
  border-color: #6366F1;
  color: #A5B4FC;
  background: rgba(99,102,241,0.12);
}
[data-coreui-theme="dark"] .ef-cc-panel {
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .ef-cc-header label { color: #D4D4CC; }
[data-coreui-theme="dark"] .ef-cc-hint-b2b { color: #A5B4FC; }
[data-coreui-theme="dark"] .ef-cc-input {
  background: #0F0F0A;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-cc-input:focus {
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.20);
}
[data-coreui-theme="dark"] .ef-cc-chip {
  background: rgba(16,185,129,0.14);
  border-color: rgba(16,185,129,0.4);
  color: #34D399;
}
[data-coreui-theme="dark"] .ef-cc-warn { color: #FBBF24; }
[data-coreui-theme="dark"] .ef-cc-warn i { color: #FBBF24; }
[data-coreui-theme="dark"] .ef-cc-help { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-checkbox-label {
  background: rgba(245,158,11,0.14);
  border-color: rgba(245,158,11,0.4);
  color: #FBBF24;
}
[data-coreui-theme="dark"] .ef-checkbox-label:has(input:checked) {
  background: rgba(245,158,11,0.22);
  border-color: rgba(245,158,11,0.6);
  color: #FCD34D;
}

[data-coreui-theme="dark"] .ef-price-base {
  background: rgba(16,185,129,0.16);
  border-color: rgba(16,185,129,0.4);
  color: #34D399;
}

[data-coreui-theme="dark"] .ef-hint-warn { color: #FBBF24; }

[data-coreui-theme="dark"] .ef-req { color: #F87171; }
</style>
