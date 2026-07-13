<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    title="Reprogramar Cuotas"
    size="lg"
  >
    <div class="ri-body" v-if="enrollment">
      <!-- Student info bar -->
      <div class="ri-student-bar">
        <div class="ri-student-main">
          <span class="ri-student-name">{{ studentName }}</span>
          <span class="ri-student-doc">{{ enrollment.document_number || enrollment.dni || '—' }}</span>
        </div>
        <span class="ri-program-pill">{{ enrollment.program_name || enrollment.program || '—' }}</span>
      </div>

      <!-- Mode tabs -->
      <div class="ri-tabs">
        <button :class="['ri-tab', { active: mode === 'shift' }]" @click="mode = 'shift'">
          <i class="fa-solid fa-forward"></i> Correr fechas
        </button>
        <button :class="['ri-tab', { active: mode === 'individual' }]" @click="mode = 'individual'">
          <i class="fa-solid fa-pen-to-square"></i> Editar individualmente
        </button>
        <button :class="['ri-tab', { active: mode === 'campaign' }]" @click="mode = 'campaign'">
          <i class="fa-solid fa-bullhorn"></i> Campaña de cobranza
        </button>
      </div>

      <!-- Campaign mode: hint -->
      <div v-if="mode === 'campaign'" class="ri-panel">
        <div class="ri-campaign-hint">
          <i class="fa-solid fa-circle-info"></i>
          <span>
            <strong>Pagar</strong>: las cuotas marcadas se registran pagadas con una sola data
            de pago (mismo voucher / N° operacion para todas). <strong>Anular</strong>: la cuota
            no se elimina — queda tachada en el historial con su monto original, el motivo y
            quien lo hizo. Si el total baja, la diferencia se registra como descuento por cobranza.
          </span>
        </div>
      </div>

      <!-- Shift mode -->
      <div v-if="mode === 'shift'" class="ri-panel">
        <div class="ri-shift-row">
          <label class="ri-label">Dias a posponer</label>
          <div class="ri-shift-input-wrap">
            <input
              type="number"
              min="1"
              v-model.number="shiftDays"
              class="ri-shift-input"
              placeholder="15"
            />
            <span class="ri-shift-hint">Se aplicara a todas las cuotas pendientes</span>
          </div>
        </div>
      </div>

      <!-- Preview table -->
      <div class="ri-preview">
        <div class="ri-preview-title">Vista previa</div>
        <table class="ri-table">
          <thead>
            <tr>
              <th style="width:40px">N</th>
              <th style="width:90px">Monto</th>
              <th style="width:115px">{{ mode === 'campaign' ? 'Vencimiento' : 'Fecha actual' }}</th>
              <th style="width:170px">{{ mode === 'campaign' ? 'Accion' : 'Nueva fecha' }}</th>
              <th class="tc" style="width:100px">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.installment_id"
              :class="{ 'ri-row-paid': row.isPaid || row.isAnnulled, 'ri-row-error': rowMeta(row).error, 'ri-row-annul': mode === 'campaign' && row.campaignAction === 'annul' }"
            >
              <td class="fw700 tc">{{ row.installment_number }}</td>
              <td class="mono" :class="{ 'ri-strike': row.isAnnulled }">S/. {{ formatMoney(row.amount) }}</td>
              <td :class="{ 'ri-strike': row.isAnnulled }">{{ formatDate(row.old_due_date) }}</td>
              <td>
                <template v-if="row.isPaid || row.isAnnulled">—</template>
                <template v-else-if="mode === 'campaign'">
                  <div class="ri-campaign-cell">
                    <select v-model="row.campaignAction" class="ri-select ri-select-sm">
                      <option value="keep">Mantener</option>
                      <option value="pay">Pagar</option>
                      <option value="annul">Anular</option>
                      <option value="adjust">Nuevo monto</option>
                    </select>
                    <input
                      v-if="row.campaignAction === 'adjust'"
                      v-model.number="row.new_amount"
                      type="number" min="0.01" step="0.01"
                      class="ri-amount-input mono"
                      placeholder="0.00"
                    />
                  </div>
                </template>
                <BaseDatePicker
                  v-else-if="mode === 'individual'"
                  v-model="row.new_due_date"
                  placeholder="dd/mm/aaaa"
                  class="ri-datepicker"
                />
                <span v-else>{{ formatDate(row.new_due_date) }}</span>
              </td>
              <td class="tc">
                <span v-if="row.isPaid" class="ri-pill ri-pill-muted">Pagada</span>
                <span v-else-if="row.isAnnulled" class="ri-pill ri-pill-muted">Anulada</span>
                <template v-else-if="mode === 'campaign'">
                  <span v-if="row.campaignAction === 'pay'" class="ri-pill ri-pill-green">Se pagara</span>
                  <span v-else-if="row.campaignAction === 'annul'" class="ri-pill ri-pill-red">Se anulara</span>
                  <span v-else-if="row.campaignAction === 'adjust' && !(Number(row.new_amount) > 0)" class="ri-pill ri-pill-red">Monto invalido</span>
                  <span v-else-if="row.campaignAction === 'adjust'" class="ri-pill ri-pill-green">Nuevo monto</span>
                  <span v-else class="ri-pill ri-pill-muted">Sin cambio</span>
                </template>
                <template v-else>
                  <span v-if="rowMeta(row).error" class="ri-pill ri-pill-red" :title="rowMeta(row).error">{{ rowMeta(row).errorShort }}</span>
                  <span v-else-if="rowMeta(row).changed" class="ri-pill ri-pill-green">Se movera</span>
                  <span v-else class="ri-pill ri-pill-muted">Sin cambio</span>
                </template>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="ri-empty">Sin cuotas para reprogramar</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Datos del pago consolidado: misma data para todas las cuotas "Pagar" -->
      <div v-if="mode === 'campaign' && campaignStats.payCount > 0" class="ri-pay-block">
        <div class="ri-pay-title">
          <i class="fa-solid fa-money-bill-wave"></i>
          Pago consolidado — {{ campaignStats.payCount }} cuota(s) por
          <strong class="mono">S/. {{ formatMoney(campaignStats.payTotal) }}</strong>
          <span class="ri-pay-hint">(misma data de pago para todas)</span>
        </div>
        <!-- Descuento de campaña: 5% por pago adelantado, o S/50-S/100 fijos -->
        <div class="ri-pay-discount-row">
          <div class="ri-field">
            <label class="ri-label">Descuento de campaña</label>
            <div class="ri-discount-wrap">
              <div class="ri-discount-toggle">
                <button type="button" :class="{ active: payDiscountType === 'percent' }" @click="payDiscountType = 'percent'">%</button>
                <button type="button" :class="{ active: payDiscountType === 'amount' }" @click="payDiscountType = 'amount'">S/.</button>
              </div>
              <input
                v-model.number="payDiscount"
                type="number" min="0" :step="payDiscountType === 'percent' ? 1 : 0.01"
                :max="payDiscountType === 'percent' ? 99 : undefined"
                class="ri-input ri-discount-input mono"
                :placeholder="payDiscountType === 'percent' ? '5' : '50.00'"
              />
            </div>
          </div>
          <div class="ri-pay-net" :class="{ 'ri-pay-net-error': payDiscountInvalid }">
            <span class="ri-label">Total a pagar</span>
            <strong class="mono">S/. {{ formatMoney(payNetTotal) }}</strong>
            <span v-if="payDiscountInvalid" class="ri-pay-net-msg">El descuento no puede ser mayor o igual al total</span>
            <span v-else-if="payDiscountSoles > 0" class="ri-pay-net-msg">
              <template v-if="payDiscountType === 'percent'">{{ payDiscount }}% = S/. {{ formatMoney(payDiscountSoles) }} — </template>se repartira entre las cuotas y quedara en el historial como descuento por cobranza
            </span>
          </div>
        </div>
        <div class="ri-pay-grid">
          <div class="ri-field">
            <label class="ri-label">Moneda <span class="ri-req">*</span></label>
            <select v-model="payment.cat_currency" class="ri-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="c in catalogs.catCurrency || []" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
            </select>
          </div>
          <div class="ri-field">
            <label class="ri-label">Medio de pago <span class="ri-req">*</span></label>
            <select v-model="payment.cat_payment_medium" class="ri-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="m in catalogs.catPaymentMedium || []" :key="m.id" :value="m.id">{{ m.description }}</option>
            </select>
          </div>
          <div class="ri-field">
            <label class="ri-label">Entidad empresa</label>
            <select v-model="payment.cat_business_entity" class="ri-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="b in catalogs.catBusinessEntity || []" :key="b.id" :value="b.id">{{ b.description }}</option>
            </select>
          </div>
          <div class="ri-field">
            <label class="ri-label">Cuenta bancaria</label>
            <select v-model="payment.bank_account_id" class="ri-select" :disabled="!payment.cat_business_entity">
              <option :value="null">{{ payment.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
              <option v-for="a in filteredAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
            </select>
          </div>
          <div class="ri-field">
            <label class="ri-label">N° Operacion</label>
            <input v-model="payment.transaction_code" class="ri-input" placeholder="Numero de operacion" />
          </div>
          <div class="ri-field">
            <label class="ri-label">Fecha de pago</label>
            <input v-model="payment.payment_date" type="date" class="ri-input" :max="todayIso" />
          </div>
          <div class="ri-field">
            <label class="ri-label">Voucher</label>
            <label class="ri-voucher-btn">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              {{ payment.voucher_url ? 'Cambiar voucher' : 'Adjuntar voucher' }}
              <input type="file" accept="image/*,.pdf" style="display:none" @change="uploadPayVoucher" />
            </label>
            <a v-if="payment.voucher_url" :href="payment.voucher_url" target="_blank" class="ri-voucher-view"><i class="fa-solid fa-image"></i> Ver</a>
          </div>
        </div>
      </div>

      <!-- Campaign summary -->
      <div v-if="mode === 'campaign' && campaignChangesCount > 0" class="ri-campaign-summary">
        <span v-if="campaignStats.payCount">
          Se pagan <strong>{{ campaignStats.payCount }}</strong> cuota(s) en un solo pago de
          <strong class="mono">S/. {{ formatMoney(payNetTotal) }}</strong>
          <template v-if="payDiscountSoles > 0">
            (descuento {{ payDiscountType === 'percent' ? `${payDiscount}% = ` : '' }}<strong class="mono">S/. {{ formatMoney(payDiscountSoles) }}</strong>)
          </template>
        </span>
        <span v-if="campaignStats.annulCount">
          Se anulan <strong>{{ campaignStats.annulCount }}</strong> cuota(s) por
          <strong class="mono">S/. {{ formatMoney(campaignStats.annulTotal) }}</strong>
        </span>
        <span v-if="campaignStats.adjustCount">
          {{ campaignStats.adjustCount }} cuota(s) con nuevo monto
        </span>
        <span>
          Nuevo total pendiente: <strong class="mono">S/. {{ formatMoney(campaignStats.newPendingTotal) }}</strong>
        </span>
        <span v-if="campaignStats.discountDelta > 0.001" class="ri-summary-discount">
          Descuento por cobranza: <strong class="mono">S/. {{ formatMoney(campaignStats.discountDelta) }}</strong>
        </span>
      </div>

      <!-- Reason + justification -->
      <div class="ri-grid2">
        <div class="ri-field">
          <label class="ri-label">Motivo <span class="ri-req">*</span></label>
          <select v-model="reasonCode" class="ri-select">
            <option value="">Seleccionar...</option>
            <option v-for="opt in reasonOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="ri-field ri-field-full">
          <label class="ri-label">Justificacion <span class="ri-req">*</span></label>
          <textarea
            v-model="justificacion"
            class="ri-textarea"
            rows="2"
            placeholder="Describe el motivo del cambio..."
          ></textarea>
        </div>
      </div>

      <!-- Edition end-date warning -->
      <div v-if="editionEndDate && mode !== 'campaign'" class="ri-edition-note">
        <i class="fa-solid fa-circle-info"></i>
        Ninguna cuota puede superar el fin de la edicion: <strong>{{ formatDate(editionEndDate) }}</strong>
      </div>
    </div>

    <template #footer>
      <button class="ri-btn-cancel" @click="$emit('update:visible', false)">Cancelar</button>
      <button
        class="ri-btn-confirm"
        :disabled="!canConfirm || saving"
        @click="handleSave"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else :class="mode === 'campaign' ? 'fa-solid fa-bullhorn' : 'fa-solid fa-calendar-check'"></i>
        <template v-if="mode === 'campaign'">
          Aplicar campaña ({{ campaignChangesCount }})
        </template>
        <template v-else>
          Reprogramar {{ pendingChangesCount }} cuota{{ pendingChangesCount === 1 ? '' : 's' }}
        </template>
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

const props = defineProps({
  visible: { type: Boolean, default: false },
  enrollment: { type: Object, default: null },
  installments: { type: Array, default: () => [] },
  editionEndDate: { type: [String, Date, null], default: null },
  catalogs: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'completed'])

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()

const mode = ref('shift')
const shiftDays = ref(15)
const reasonCode = ref('')
const justificacion = ref('')
const saving = ref(false)
const rows = ref([])

const PAID_STATUS = 4454
const ANNULLED_STATUS = 4456

const RESCHEDULE_REASONS = [
  { value: 'financiero', label: 'Financiero' },
  { value: 'academico', label: 'Academico' },
  { value: 'personal', label: 'Personal' },
  { value: 'otro', label: 'Otro' }
]
const CAMPAIGN_REASONS = [
  { value: 'campana_cobranza', label: 'Campaña de cobranza' },
  { value: 'pago_adelantado', label: 'Descuento por pago adelantado' },
  { value: 'otro', label: 'Otro' }
]
const reasonOptions = computed(() => mode.value === 'campaign' ? CAMPAIGN_REASONS : RESCHEDULE_REASONS)

const studentName = computed(() => {
  const e = props.enrollment || {}
  return e.student_full_name
    || e.student_name
    || e.full_name
    || [e.first_name, e.last_name].filter(Boolean).join(' ')
    || '—'
})

function toISO (d) {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate (d) {
  if (!d) return '—'
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
  }
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-PE')
}

function formatMoney (n) {
  return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildInitialRows () {
  return (props.installments || [])
    .filter(i => Number(i.installment_number) > 0 && !i.is_reserva)
    .map(i => ({
      installment_id: i.installment_id,
      installment_number: i.installment_number,
      amount: i.amount,
      old_due_date: toISO(i.due_date),
      new_due_date: toISO(i.due_date),
      isPaid: Number(i.cat_status) === PAID_STATUS || i.status === 'paid',
      isAnnulled: Number(i.cat_status) === ANNULLED_STATUS,
      campaignAction: 'keep',
      new_amount: Number(i.amount) || 0
    }))
}

function applyShift () {
  const n = Number(shiftDays.value)
  for (const r of rows.value) {
    if (r.isPaid || r.isAnnulled) continue
    if (!Number.isFinite(n) || n < 1) { r.new_due_date = r.old_due_date; continue }
    const d = new Date(r.old_due_date)
    d.setDate(d.getDate() + n)
    r.new_due_date = toISO(d)
  }
}

const rowValidations = computed(() => {
  const endLimit = props.editionEndDate ? new Date(props.editionEndDate) : null
  if (endLimit) endLimit.setHours(0, 0, 0, 0)

  const map = new Map()
  for (const r of rows.value) {
    if (r.isPaid || r.isAnnulled) { map.set(r.installment_id, { isPaid: true, error: null, errorShort: null, changed: false }); continue }

    const oldD = new Date(r.old_due_date); oldD.setHours(0, 0, 0, 0)
    const newD = new Date(r.new_due_date); newD.setHours(0, 0, 0, 0)

    // ponytail: se permite mover la fecha hacia atras o adelante; solo se valida
    // que sea valida y que no supere el fin de la edicion.
    let error = null, errorShort = null, changed = false
    if (isNaN(newD.getTime())) { error = 'Fecha invalida'; errorShort = 'Invalida' }
    else if (newD.getTime() === oldD.getTime()) { changed = false }
    else if (endLimit && newD > endLimit) { error = `Supera fin de edicion (${formatDate(endLimit)})`; errorShort = 'Fuera rango' }
    else { changed = true }

    map.set(r.installment_id, { isPaid: false, error, errorShort, changed })
  }
  return map
})

function rowMeta (row) {
  return rowValidations.value.get(row.installment_id) || { isPaid: false, error: null, errorShort: null, changed: false }
}

watch(() => props.visible, (v) => {
  if (!v) return
  mode.value = 'shift'
  shiftDays.value = 15
  reasonCode.value = ''
  justificacion.value = ''
  payDiscount.value = 0
  payDiscountType.value = 'percent'
  Object.assign(payment, {
    cat_currency: null,
    cat_payment_medium: null,
    cat_business_entity: null,
    bank_account_id: null,
    transaction_code: '',
    payment_date: new Date().toISOString().slice(0, 10),
    voucher_url: null
  })
  rows.value = buildInitialRows()
  applyShift()
})

watch(() => props.installments, () => {
  if (!props.visible) return
  rows.value = buildInitialRows()
  if (mode.value === 'shift') applyShift()
}, { deep: true })

watch([shiftDays, mode], () => {
  if (!props.visible) return
  if (mode.value === 'shift') applyShift()
})

// Los motivos de campaña son otros: al cambiar de tab se limpia si no aplica.
watch(mode, () => {
  if (!reasonOptions.value.some(o => o.value === reasonCode.value)) reasonCode.value = ''
})

// --- Campaña de cobranza ---
// Data unica del pago consolidado ("pague las 5 de una", "2 cuotas con el
// mismo voucher"): se aplica a todas las cuotas marcadas Pagar.
const payment = reactive({
  cat_currency: null,
  cat_payment_medium: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: '',
  payment_date: new Date().toISOString().slice(0, 10),
  voucher_url: null
})
const todayIso = computed(() => new Date().toISOString().slice(0, 10))
const payDiscount = ref(0)
const payDiscountType = ref('percent') // el caso tipico de campaña es %
// Descuento efectivo en soles (el % se calcula sobre el total de las cuotas a pagar).
const payDiscountSoles = computed(() => {
  const d = Number(payDiscount.value) || 0
  if (d <= 0) return 0
  return payDiscountType.value === 'percent'
    ? Math.round(campaignStats.value.payTotal * d) / 100
    : d
})
const payNetTotal = computed(() => Math.max(0, campaignStats.value.payTotal - payDiscountSoles.value))
const payDiscountInvalid = computed(() => {
  const d = Number(payDiscount.value) || 0
  if (d < 0) return true
  if (payDiscountType.value === 'percent' && d >= 100) return true
  return campaignStats.value.payCount > 0 && d > 0 && payDiscountSoles.value >= campaignStats.value.payTotal
})
const filteredAccounts = computed(() => {
  if (!payment.cat_business_entity || !props.catalogs?.allBankAccounts) return []
  return props.catalogs.allBankAccounts.filter(a => a.business_entity_catalog_id === payment.cat_business_entity)
})

async function uploadPayVoucher (event) {
  const file = event.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data?.url) {
      payment.voucher_url = res.data.url
      toast.success('Voucher subido')
    }
  } catch {
    toast.error('Error al subir voucher')
  }
  event.target.value = ''
}

const campaignStats = computed(() => {
  let annulCount = 0, annulTotal = 0, adjustCount = 0, adjustDelta = 0, invalid = 0, newPendingTotal = 0, payCount = 0, payTotal = 0
  for (const r of rows.value) {
    if (r.isPaid || r.isAnnulled) continue
    const amt = Number(r.amount) || 0
    if (r.campaignAction === 'pay') { payCount++; payTotal += amt; continue }
    if (r.campaignAction === 'annul') { annulCount++; annulTotal += amt; continue }
    if (r.campaignAction === 'adjust') {
      const na = Number(r.new_amount)
      if (!(na > 0)) { invalid++; continue }
      adjustCount++; adjustDelta += na - amt; newPendingTotal += na
      continue
    }
    newPendingTotal += amt
  }
  return { annulCount, annulTotal, adjustCount, adjustDelta, invalid, newPendingTotal, payCount, payTotal, discountDelta: annulTotal - adjustDelta }
})
const campaignChangesCount = computed(() =>
  campaignStats.value.annulCount + campaignStats.value.adjustCount + campaignStats.value.payCount)

const pendingChangesCount = computed(() => {
  let n = 0
  for (const r of rows.value) {
    const m = rowMeta(r)
    if (m.changed && !m.error) n++
  }
  return n
})
const hasErrors = computed(() => {
  for (const r of rows.value) { if (rowMeta(r).error) return true }
  return false
})

const canConfirm = computed(() => {
  if (!reasonCode.value || justificacion.value.trim().length === 0) return false
  if (mode.value === 'campaign') {
    if (campaignChangesCount.value === 0 || campaignStats.value.invalid > 0) return false
    // Pago consolidado: la data compartida exige moneda y medio (igual que
    // confirmar una cuota suelta) y un descuento coherente.
    if (campaignStats.value.payCount > 0 && (!payment.cat_currency || !payment.cat_payment_medium)) return false
    if (payDiscountInvalid.value) return false
    return true
  }
  return pendingChangesCount.value > 0 && !hasErrors.value
})

// El backend responde con la misma forma en ambos endpoints (odoo_sync,
// odoo_failed_fees...), asi que el toast se resuelve una sola vez.
function notifyResult (res, okMsg) {
  if (res?.odoo_sync === false) {
    const allSameError = Array.isArray(res.odoo_failed_fees)
      && res.odoo_failed_fees.length > 0
      && res.odoo_failed_fees.every(f => f.error === res.odoo_failed_fees[0].error)
    const msg = allSameError
      ? res.odoo_failed_fees[0].error
      : (res.odoo_error || 'Odoo no se sincronizo')
    toast.warning(`Cuotas guardadas. ${msg}`, { timeout: 7000 })
  } else if (res?.odoo_skipped) {
    toast.success(okMsg)
  } else {
    toast.success(`${okMsg} Sincronizado con Odoo.`)
  }
}

async function handleSave () {
  if (!canConfirm.value) return
  saving.value = true
  try {
    if (mode.value === 'campaign') {
      const alive = rows.value.filter(r => !r.isPaid && !r.isAnnulled)
      const payIds = alive.filter(r => r.campaignAction === 'pay').map(r => r.installment_id)
      const res = await ficoService.applyCollectionCampaign({
        enrollment_id: Number(props.enrollment.enrollment_id),
        annul_ids: alive.filter(r => r.campaignAction === 'annul').map(r => r.installment_id),
        pay_ids: payIds,
        pay_discount: payIds.length ? (Number(payDiscount.value) || 0) : 0,
        pay_discount_type: payDiscountType.value,
        payment: payIds.length ? { ...payment, transaction_code: payment.transaction_code || null } : null,
        adjustments: alive
          .filter(r => r.campaignAction === 'adjust')
          .map(r => ({ installment_id: r.installment_id, new_amount: Number(r.new_amount) })),
        justificacion: justificacion.value.trim(),
        reason_code: reasonCode.value
      })
      const parts = []
      if (res?.paid) parts.push(`${res.paid} pagada(s) en un solo pago`)
      if (res?.annulled) parts.push(`${res.annulled} anulada(s)`)
      if (res?.adjusted) parts.push(`${res.adjusted} ajustada(s)`)
      notifyResult(res, `Campaña aplicada: ${parts.join(', ') || 'sin cambios'}.`)
    } else {
      const changes = rows.value
        .filter(r => {
          const m = rowMeta(r)
          return !r.isPaid && !r.isAnnulled && m.changed && !m.error
        })
        .map(r => ({ installment_id: r.installment_id, new_due_date: r.new_due_date }))

      const res = await ficoService.rescheduleInstallments({
        enrollment_id: Number(props.enrollment.enrollment_id),
        changes,
        justificacion: justificacion.value.trim(),
        reason_code: reasonCode.value
      })
      notifyResult(res, `${res?.updated || changes.length} cuota(s) reprogramada(s).`)
    }
    emit('completed')
    emit('update:visible', false)
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al guardar los cambios de cuotas.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ri-body { display: flex; flex-direction: column; gap: 16px; }

.ri-student-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px;
}
.ri-student-main { display: flex; flex-direction: column; gap: 2px; }
.ri-student-name { font-size: 13.5px; font-weight: 700; color: #111827; }
.ri-student-doc { font-size: 11.5px; color: #6B7280; font-weight: 500; }
.ri-program-pill {
  font-size: 11px; font-weight: 600; color: #4338CA;
  background: #EEF2FF; border: 1px solid #C7D2FE;
  padding: 4px 12px; border-radius: 20px;
}

.ri-tabs { display: flex; gap: 0; border-bottom: 1px solid #F0F0F0; }
.ri-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 18px; font-size: 12.5px; font-weight: 500;
  color: #A3A3A3; background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  font-family: inherit; transition: color .2s, border-color .2s;
}
.ri-tab:hover { color: #1A1A1A; }
.ri-tab.active { color: #1A1A1A; font-weight: 600; border-bottom-color: #4338CA; }

.ri-panel { padding: 4px 0; }

.ri-shift-row { display: flex; align-items: flex-end; gap: 14px; }
.ri-shift-input-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
.ri-shift-input {
  width: 100px; height: 38px; padding: 0 12px; font-size: 14px;
  font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #1A1A1A;
  border: 1px solid #E5E7EB; border-radius: 8px; outline: none;
  text-align: center; transition: border-color .2s;
}
.ri-shift-input:focus { border-color: #4338CA; box-shadow: 0 0 0 3px rgba(67,56,202,.08); }
.ri-shift-hint { font-size: 11.5px; color: #737373; }

.ri-preview { display: flex; flex-direction: column; gap: 8px; }
.ri-preview-title {
  font-size: 11px; font-weight: 600; color: #6B7280;
  text-transform: uppercase; letter-spacing: 0.05em;
}

.ri-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ri-table thead th {
  background: #FAFAFA; padding: 9px 10px; text-align: left;
  font-weight: 500; color: #A3A3A3; border-bottom: 1px solid #F0F0F0;
  font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
}
.ri-table tbody td {
  padding: 8px 10px; border-bottom: 1px solid #F5F5F5; vertical-align: middle;
}
.ri-row-paid td { background: #FAFAFA; color: #A3A3A3; }
.ri-row-error td { background: #FFFBFB; }

.ri-datepicker :deep(input) {
  height: 32px; padding: 0 10px; font-size: 12px;
  border: 1px solid #E8E8E8; border-radius: 6px; width: 100%; font-family: inherit;
}

.ri-empty { text-align: center; padding: 24px; color: #C4C4C4; }

.ri-pill {
  display: inline-flex; padding: 3px 10px;
  border-radius: 6px; font-size: 10.5px; font-weight: 600;
}
.ri-pill-green { background: #ECFDF5; color: #065F46; }
.ri-pill-red { background: #FEF2F2; color: #991B1B; }
.ri-pill-muted { background: #F3F4F6; color: #6B7280; }

/* Campaña de cobranza */
.ri-campaign-hint {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; background: #FFFBEB; border: 1px solid #FDE68A;
  border-radius: 8px; font-size: 12px; color: #92400E; line-height: 1.45;
}
.ri-campaign-hint i { color: #F59E0B; margin-top: 2px; }
.ri-campaign-cell { display: flex; align-items: center; gap: 6px; }
/* Doble clase: gana a la regla generica .ri-select (padding 8px 12px) que
   recortaba el texto verticalmente en el select compacto de la tabla. */
.ri-select.ri-select-sm {
  height: 32px; padding: 0 8px; font-size: 12px; width: auto;
  line-height: 32px;
}
.ri-amount-input {
  width: 80px; height: 30px; padding: 0 8px; font-size: 12px; font-weight: 600;
  border: 1px solid #E5E7EB; border-radius: 6px; outline: none; text-align: right;
}
.ri-amount-input:focus { border-color: #4338CA; }
.ri-strike { text-decoration: line-through; color: #A3A3A3; }
.ri-row-annul td { background: #FFF7F7; }
.ri-pay-block {
  display: flex; flex-direction: column; gap: 12px;
  padding: 14px; background: #F7FDF9; border: 1px solid #A7F3D0; border-radius: 8px;
}
.ri-pay-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 600; color: #065F46;
}
.ri-pay-title i { color: #059669; }
.ri-pay-hint { font-weight: 400; font-size: 11.5px; color: #047857; }
.ri-pay-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ri-pay-discount-row {
  display: flex; align-items: flex-end; gap: 20px;
  padding-bottom: 10px; border-bottom: 1px dashed #A7F3D0;
}
.ri-discount-wrap { display: flex; align-items: center; gap: 8px; }
.ri-discount-toggle {
  display: inline-flex; border: 1px solid #A7F3D0; border-radius: 6px; overflow: hidden;
}
.ri-discount-toggle button {
  padding: 0 12px; height: 36px; font-size: 12px; font-weight: 600;
  background: #FFFFFF; color: #6B7280; border: none; cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.ri-discount-toggle button + button { border-left: 1px solid #A7F3D0; }
.ri-discount-toggle button.active { background: #059669; color: #FFFFFF; }
.ri-discount-input { width: 110px; text-align: right; font-weight: 600; }
.ri-pay-net { display: flex; flex-direction: column; gap: 3px; }
.ri-pay-net strong { font-size: 16px; color: #065F46; }
.ri-pay-net-msg { font-size: 11px; color: #047857; }
.ri-pay-net-error strong { color: #991B1B; }
.ri-pay-net-error .ri-pay-net-msg { color: #991B1B; }
.ri-input {
  height: 36px; padding: 0 12px; font-size: 13px; font-family: inherit;
  color: #374151; background: #FFFFFF;
  border: 1px solid #E5E7EB; border-radius: 6px; outline: none;
  transition: border-color .15s;
}
.ri-input:focus { border-color: #4338CA; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.08); }
.ri-voucher-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 12px; font-size: 12px; font-weight: 500;
  background: #FFFFFF; color: #1A1A1A; border: 1px solid #E5E7EB;
  border-radius: 6px; cursor: pointer;
}
.ri-voucher-btn:hover { background: #F9FAFB; }
.ri-voucher-view {
  font-size: 11.5px; color: #4338CA; text-decoration: none; margin-top: 4px;
  display: inline-flex; align-items: center; gap: 4px;
}

.ri-campaign-summary {
  display: flex; flex-wrap: wrap; gap: 6px 18px;
  padding: 10px 14px; background: #F9FAFB; border: 1px solid #E5E7EB;
  border-radius: 8px; font-size: 12px; color: #374151;
}
.ri-summary-discount { color: #B45309; }

.ri-grid2 { display: grid; grid-template-columns: 180px 1fr; gap: 14px; }

.ri-field { display: flex; flex-direction: column; gap: 5px; }
.ri-field-full { grid-column: 2 / span 1; }
.ri-label {
  font-size: 11px; font-weight: 600; color: #6B7280;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.ri-req { color: #DC2626; }

.ri-select, .ri-textarea {
  width: 100%; box-sizing: border-box;
  padding: 8px 12px; font-size: 13px; font-family: inherit;
  color: #374151; background: #FFFFFF;
  border: 1px solid #E5E7EB; border-radius: 6px; outline: none;
  transition: border-color .15s;
}
.ri-select:focus, .ri-textarea:focus {
  border-color: #4338CA; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.08);
}
.ri-textarea { min-height: 60px; resize: vertical; background: #FFFBEB; border-color: #F59E0B; }

.ri-edition-note {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #EFF6FF; border: 1px solid #BFDBFE;
  border-radius: 8px; font-size: 12px; color: #1E40AF;
}
.ri-edition-note i { color: #3B82F6; }

.ri-btn-cancel {
  background: none; border: 1px solid #E5E7EB; color: #6B7280;
  padding: 8px 16px; border-radius: 6px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.ri-btn-cancel:hover { background: #F9FAFB; border-color: #D1D5DB; }

.ri-btn-confirm {
  background: #4338CA; color: #FFFFFF; border: none;
  padding: 8px 20px; border-radius: 6px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 7px;
  transition: all .15s;
}
.ri-btn-confirm:hover:not(:disabled) { background: #3730A3; }
.ri-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

.tc { text-align: center; }
.fw700 { font-weight: 700; }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
