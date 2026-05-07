<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    title="Cambio de Curso"
    size="lg"
  >
    <div class="cc-body" v-if="enrollment && detail">

      <!-- Header bar: student info -->
      <div class="cc-header-bar">
        <div class="cc-student-name">
          {{ enrollment.student_full_name || enrollment.full_name || '—' }}
        </div>
        <div class="cc-student-doc">
          {{ enrollment.document_number || '—' }}
        </div>
        <div class="cc-student-program">
          {{ detail.program_name || enrollment.program_name || '' }}
          <span v-if="detail.edition_code || enrollment.edition_code"> — {{ detail.edition_code || enrollment.edition_code }}</span>
        </div>
      </div>

      <!-- Inscripcion actual -->
      <section class="cc-section">
        <div class="cc-section-label">Inscripcion actual</div>
        <div class="cc-grid cols-3">
          <div class="cc-field">
            <label>Programa</label>
            <div class="cc-readonly">{{ detail.program_name || enrollment.program_name || '—' }}</div>
          </div>
          <div class="cc-field">
            <label>Edicion</label>
            <div class="cc-readonly">{{ detail.edition_code || enrollment.edition_code || '—' }}</div>
          </div>
          <div class="cc-field">
            <label>Pagado hasta ahora</label>
            <div class="cc-amount cc-amount--green">{{ fmt.formatMoney(ccPagado) }}</div>
          </div>
        </div>
      </section>

      <!-- Programa destino -->
      <section class="cc-section">
        <div class="cc-section-label">Programa destino</div>
        <div class="cc-grid cols-2">
          <div class="cc-field">
            <label>Nuevo programa</label>
            <SearchSelect
              v-model="ccProgramVersionId"
              :items="ccProgramsList"
              label-field="label"
              value-field="program_version_id"
              placeholder="Buscar programa..."
              @update:modelValue="onProgramChange"
            />
          </div>
          <div class="cc-field">
            <label>Nueva edicion</label>
            <select
              v-model="ccEditionId"
              class="cc-select"
              :disabled="!ccProgramVersionId || ccLoadingEditions"
              @change="onEditionChange"
            >
              <option :value="null" disabled>
                {{ ccLoadingEditions ? 'Cargando...' : 'Seleccionar edicion...' }}
              </option>
              <option v-for="ed in ccEditionsList" :key="ed.id" :value="ed.id">
                {{ ed.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="cc-grid cols-3 cc-amounts-row">
          <div class="cc-field">
            <label>
              Precio lista nuevo
              <span class="cc-profile-tag">{{ ccIsStudent ? 'Estudiante' : 'Profesional' }}</span>
            </label>
            <div class="cc-amount">{{ fmt.formatMoney(ccEditionListPrice) }}</div>
            <div v-if="ccDescuentosAplicados > 0" class="cc-price-breakdown">
              <span>Lista: {{ fmt.formatMoney(ccEditionListPriceBase) }}</span>
              <span class="cc-price-breakdown__discount">- {{ fmt.formatMoney(ccDescuentosAplicados) }} (descuentos)</span>
            </div>
          </div>
          <div class="cc-field">
            <label>Diferencia</label>
            <div class="cc-amount" :class="{ 'cc-amount--red': ccDiferencia > 0 }">
              {{ fmt.formatMoney(ccDiferencia) }}
            </div>
          </div>
          <div class="cc-field">
            <label>Monto a registrar</label>
            <input
              v-model.number="ccTotalAmount"
              type="number"
              step="0.01"
              min="0"
              class="cc-input cc-input--amount"
              placeholder="0.00"
            />
          </div>
        </div>
      </section>

      <!-- Datos del pago -->
      <section class="cc-section">
        <div class="cc-section-label">Datos del pago</div>
        <div class="cc-grid cols-3">
          <div class="cc-field">
            <label>Moneda</label>
            <SearchSelect
              v-model="ccForm.cat_currency"
              :items="catalogs?.catCurrency || []"
              label-field="description"
              value-field="id"
              placeholder="Moneda..."
            />
          </div>
          <div class="cc-field">
            <label>Medio de pago</label>
            <SearchSelect
              v-model="ccForm.cat_method_payment"
              :items="catalogs?.catPaymentMedium || []"
              label-field="description"
              value-field="id"
              placeholder="Medio..."
            />
          </div>
          <div class="cc-field">
            <label>Entidad</label>
            <SearchSelect
              v-model="ccForm.cat_business_entity"
              :items="catalogs?.catBusinessEntity || []"
              label-field="description"
              value-field="id"
              placeholder="Entidad..."
              @update:modelValue="ccForm.bank_account_id = null"
            />
          </div>
          <div class="cc-field">
            <label>Cuenta bancaria</label>
            <select v-model="ccForm.bank_account_id" class="cc-select" :disabled="!ccForm.cat_business_entity">
              <option :value="null">{{ ccForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
              <option v-for="a in filteredAccounts(ccForm.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }} — {{ a.account_number }}</option>
            </select>
          </div>
          <div class="cc-field">
            <label>N. Operacion</label>
            <input
              v-model.trim="ccForm.transaction_code"
              type="text"
              class="cc-input"
              placeholder="Codigo de operacion..."
            />
          </div>
        </div>
        <div class="cc-field cc-field--full">
          <label>Comprobante(s) de pago</label>
          <MultiFileUploader
            v-model="ccForm.ticket_payment_urls"
            label="Adjuntar comprobante"
            :required="false"
          />
        </div>
      </section>

      <!-- Justificacion -->
      <section class="cc-section cc-section--justificacion">
        <div class="cc-section-label">Justificacion</div>
        <textarea
          v-model="ccJustificacion"
          class="cc-textarea"
          rows="3"
          placeholder="Motivo del cambio de curso..."
        ></textarea>
      </section>

    </div>

    <template #footer>
      <div class="cc-footer">
        <button class="cc-btn cc-btn--ghost" @click="$emit('update:visible', false)" :disabled="saving">
          Cancelar
        </button>
        <button
          class="cc-btn cc-btn--confirm"
          :disabled="saving || !ccProgramVersionId || !ccEditionId || !ccJustificacion.trim()"
          @click="handleCourseChange"
        >
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-exchange-alt"></i>
          {{ saving ? 'Procesando...' : 'Confirmar Cambio de Curso' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useToast } from 'vue-toastification'

const props = defineProps({
  visible: Boolean,
  enrollment: Object,
  detail: Object,
  catalogs: Object
})

const emit = defineEmits(['update:visible', 'completed'])

const ficoService = inject(ServiceKeys.Fico)
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const toast = useToast()
const fmt = useEnrollmentFormatters()

// Compara start_date (cadena calendario) contra hoy local sin sufrir TZ shift.
function isFutureOrToday (startDate) {
  const m = String(startDate).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return false
  const ed = new Date(+m[1], +m[2] - 1, +m[3])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return ed >= today
}

const ccProgramVersionId = ref(null)
const ccEditionId = ref(null)
const ccTotalAmount = ref(0)
const ccJustificacion = ref('')
const ccProgramsList = ref([])
const ccEditionsList = ref([])
const ccEditionListPrice = ref(0)        // precio final (base - descuentos)
const ccEditionListPriceBase = ref(0)    // precio bruto del programa segun perfil
const ccDescuentosAplicados = ref(0)     // suma de descuentos heredados de la inscripcion actual
const ccLoadingEditions = ref(false)
const ccPriceData = ref(null)
const saving = ref(false)

// Detecta si el alumno actual tiene perfil estudiante.
// Prioriza cat_profile_id (3087 = we_profile_student) sobre occupation_label.
const ccIsStudent = computed(() => {
  const e = props.enrollment
  const d = props.detail
  const profId = d?.cat_profile_id ?? e?.cat_profile_id
  if (profId === 3087) return true
  if (profId === 3086 || profId === 3200) return false
  // Fallback a occupation_label cuando no llega cat_profile_id
  return (e?.occupation_label || '').toUpperCase() === 'E'
})

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

const ccDiferencia = computed(() => Math.max(0, ccEditionListPrice.value - ccPagado.value))

function filteredAccounts(entityId) {
  if (!entityId || !props.catalogs?.allBankAccounts) return []
  return props.catalogs.allBankAccounts.filter(a => a.business_entity_catalog_id === entityId)
}

watch(() => props.visible, async (v) => {
  if (!v) return
  ccProgramVersionId.value = null
  ccEditionId.value = null
  ccTotalAmount.value = 0
  ccJustificacion.value = ''
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  Object.assign(ccForm, {
    cat_currency: props.detail?.cat_currency_id || null,
    cat_method_payment: null,
    cat_business_entity: null,
    bank_account_id: null,
    transaction_code: '',
    ticket_payment_urls: []
  })
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
})

async function onProgramChange() {
  ccEditionId.value = null
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  ccEditionListPriceBase.value = 0
  ccDescuentosAplicados.value = 0
  ccTotalAmount.value = 0
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
      ccPriceData.value = priceData
      const precioBase = Number(ccIsStudent.value ? priceData.price_student_soles : priceData.price_profesional_soles) || 0
      const descuentosHeredados = Number(props.enrollment?.total_discounted ?? props.detail?.discount_amount ?? 0) || 0
      ccEditionListPriceBase.value = precioBase
      ccDescuentosAplicados.value = descuentosHeredados
      ccEditionListPrice.value = Math.max(0, precioBase - descuentosHeredados)
      ccTotalAmount.value = Math.max(0, ccEditionListPrice.value - ccPagado.value)
    }
  } catch (err) {
    console.error(err)
  } finally {
    ccLoadingEditions.value = false
  }
}

function onEditionChange() {
  ccTotalAmount.value = Math.max(0, ccEditionListPrice.value - ccPagado.value)
}

async function handleCourseChange() {
  if (!ccProgramVersionId.value || !ccEditionId.value || !ccJustificacion.value.trim()) return
  saving.value = true
  try {
    await ficoService.courseChange({
      enrollment_id: Number(props.enrollment.enrollment_id),
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
    emit('completed')
    emit('update:visible', false)
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al realizar cambio de curso.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cc-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 4px 0 0;
}

/* Header bar */
.cc-header-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 16px;
}
.cc-student-name {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
}
.cc-student-doc {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.cc-student-program {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
}

/* Sections */
.cc-section {
  padding: 14px 0;
  border-top: 1px solid #f3f4f6;
}
.cc-section:first-of-type {
  border-top: none;
}
.cc-section-label {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

/* Grid */
.cc-grid {
  display: grid;
  gap: 12px 14px;
}
.cc-grid.cols-2 {
  grid-template-columns: 1fr 1fr;
}
.cc-grid.cols-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

/* Fields */
.cc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cc-field--full {
  margin-top: 12px;
}
.cc-field label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  user-select: none;
}
.cc-readonly {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  padding: 6px 0;
  line-height: 1.3;
}

/* Amounts */
.cc-amount {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  font-variant-numeric: tabular-nums;
  padding: 6px 0;
}
.cc-amount--green {
  color: #059669;
}
.cc-amount--red {
  color: #dc2626;
}
.cc-amounts-row {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e5e7eb;
}
.cc-profile-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #4338ca;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 4px;
}
.cc-price-breakdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  font-size: 11px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}
.cc-price-breakdown__discount {
  color: #dc2626;
  font-weight: 500;
}

/* Inputs */
.cc-input,
.cc-select {
  font-size: 13px;
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}
.cc-input:focus,
.cc-select:focus {
  border-color: #a78bfa;
  box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.12);
}
.cc-input--amount {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.cc-select:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Justificacion */
.cc-section--justificacion {
  padding-bottom: 4px;
}
.cc-textarea {
  width: 100%;
  font-size: 13px;
  padding: 10px 12px;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  background: #fffbeb;
  color: #92400e;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cc-textarea:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.15);
}
.cc-textarea::placeholder {
  color: #d97706;
  opacity: 0.6;
}

/* Footer */
.cc-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.cc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  font-family: inherit;
}
.cc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cc-btn--ghost {
  background: transparent;
  color: #6b7280;
}
.cc-btn--ghost:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
}
.cc-btn--confirm {
  background: #be185d;
  color: #fff;
}
.cc-btn--confirm:hover:not(:disabled) {
  background: #9d174d;
}
</style>
