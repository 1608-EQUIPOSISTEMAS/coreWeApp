<template>
  <BaseModal
    :model-value="visible"
    title="Reprogramar cuotas"
    size="lg"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="enrollment" ref="rescheduleForm" class="ri-body">
      <div class="ri-head">
        <div class="ri-student">
          <strong>{{ studentName }}</strong>
          <span>{{ enrollment.document_number || enrollment.dni || '—' }}</span>
        </div>
        <span class="ds-pill info">{{ enrollment.program_name || enrollment.program || '—' }}</span>
      </div>

      <div class="ds-tabs" role="tablist" aria-label="Tipo de cambio">
        <button type="button" role="tab" :aria-selected="mode === 'shift'" @click="mode = 'shift'">
          <i class="fa-solid fa-forward" aria-hidden="true"></i> Correr fechas
        </button>
        <button type="button" role="tab" :aria-selected="mode === 'individual'" @click="mode = 'individual'">
          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar individualmente
        </button>
        <button type="button" role="tab" :aria-selected="mode === 'campaign'" @click="mode = 'campaign'">
          <i class="fa-solid fa-bullhorn" aria-hidden="true"></i> Campaña de cobranza
        </button>
      </div>

      <p v-if="mode === 'campaign'" class="ds-callout info">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>
          <strong>Pagar</strong>: las cuotas marcadas se registran pagadas con una sola data
          de pago (mismo voucher / N° operación para todas). <strong>Anular</strong>: la cuota
          no se elimina — queda tachada en el historial con su monto original, el motivo y
          quién lo hizo. Si el total baja, la diferencia se registra como descuento por cobranza.
        </span>
      </p>

      <div v-if="mode === 'shift'" class="ri-shift">
        <div class="ds-field ri-shift-days">
          <label class="ds-label" for="ri-days">Días a posponer</label>
          <input id="ri-days" v-model.number="shiftDays" type="number" min="1" class="ds-input" placeholder="15" />
        </div>
        <span class="ds-help">Se aplica a todas las cuotas pendientes.</span>
      </div>

      <div class="ri-preview">
        <h4 class="ri-subtitle">Vista previa</h4>
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista ds-table--densa">
            <thead>
              <tr>
                <th class="tc" style="width:44px">N°</th>
                <th class="num" style="width:100px">Monto</th>
                <th style="width:115px">{{ mode === 'campaign' ? 'Vencimiento' : 'Fecha actual' }}</th>
                <th style="width:190px">{{ mode === 'campaign' ? 'Acción' : 'Nueva fecha' }}</th>
                <th class="tc" style="width:110px">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.installment_id"
                :class="{ 'is-closed': row.isPaid || row.isAnnulled, 'is-error': rowMeta(row).error, 'is-annul': mode === 'campaign' && row.campaignAction === 'annul' }"
              >
                <td class="tc fw700">{{ row.installment_number }}</td>
                <td class="num mono" :class="{ 'is-strike': row.isAnnulled }">S/. {{ formatMoney(row.amount) }}</td>
                <td :class="{ 'is-strike': row.isAnnulled }">{{ formatDate(row.old_due_date) }}</td>
                <td>
                  <template v-if="row.isPaid || row.isAnnulled">—</template>
                  <div v-else-if="mode === 'campaign'" class="ri-action">
                    <select v-model="row.campaignAction" class="ds-input" :aria-label="`Acción cuota ${row.installment_number}`">
                      <option value="keep">Mantener</option>
                      <option value="pay">Pagar</option>
                      <option value="annul">Anular</option>
                      <option value="adjust">Nuevo monto</option>
                    </select>
                    <input
                      v-if="row.campaignAction === 'adjust'"
                      v-model.number="row.new_amount"
                      type="number" min="0.01" step="0.01"
                      class="ds-input mono ri-amount"
                      placeholder="0.00"
                      :aria-label="`Nuevo monto cuota ${row.installment_number}`"
                    />
                  </div>
                  <BaseDatePicker
                    v-else-if="mode === 'individual'"
                    v-model="row.new_due_date"
                    placeholder="dd/mm/aaaa"
                  />
                  <span v-else>{{ formatDate(row.new_due_date) }}</span>
                </td>
                <td class="tc">
                  <span v-if="row.isPaid" class="ds-pill">Pagada</span>
                  <span v-else-if="row.isAnnulled" class="ds-pill">Anulada</span>
                  <template v-else-if="mode === 'campaign'">
                    <span v-if="row.campaignAction === 'pay'" class="ds-pill ok">Se pagará</span>
                    <span v-else-if="row.campaignAction === 'annul'" class="ds-pill bad">Se anulará</span>
                    <span v-else-if="row.campaignAction === 'adjust' && !(Number(row.new_amount) > 0)" class="ds-pill bad">Monto inválido</span>
                    <span v-else-if="row.campaignAction === 'adjust'" class="ds-pill ok">Nuevo monto</span>
                    <span v-else class="ds-pill">Sin cambio</span>
                  </template>
                  <template v-else>
                    <span v-if="rowMeta(row).error" class="ds-pill bad" :title="rowMeta(row).error">{{ rowMeta(row).errorShort }}</span>
                    <span v-else-if="rowMeta(row).changed" class="ds-pill ok">Se moverá</span>
                    <span v-else class="ds-pill">Sin cambio</span>
                  </template>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="5" class="ds-empty--lista ri-empty">Esta venta no tiene cuotas para reprogramar.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Datos del pago consolidado: misma data para todas las cuotas "Pagar" -->
      <section v-if="mode === 'campaign' && campaignStats.payCount > 0" class="ri-pay">
        <h4 class="ri-subtitle">
          <i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i>
          Pago consolidado — {{ campaignStats.payCount }} cuota(s) por
          <strong class="mono">S/. {{ formatMoney(campaignStats.payTotal) }}</strong>
          <span class="ri-hint">(misma data de pago para todas)</span>
        </h4>
        <!-- Descuento de campaña: 5% por pago adelantado, o S/50-S/100 fijos -->
        <div class="ri-discount">
          <div class="ds-field">
            <label class="ds-label" for="ri-discount">Descuento de campaña</label>
            <div class="ri-discount-input">
              <div class="ds-tabs" role="group" aria-label="Tipo de descuento">
                <button type="button" :aria-pressed="payDiscountType === 'percent'" @click="payDiscountType = 'percent'">%</button>
                <button type="button" :aria-pressed="payDiscountType === 'amount'" @click="payDiscountType = 'amount'">S/.</button>
              </div>
              <input
                id="ri-discount"
                v-model.number="payDiscount"
                type="number" min="0" :step="payDiscountType === 'percent' ? 1 : 0.01"
                :max="payDiscountType === 'percent' ? 99 : undefined"
                class="ds-input mono"
                :placeholder="payDiscountType === 'percent' ? '5' : '50.00'"
              />
            </div>
          </div>
          <div class="ri-net" :class="{ 'is-error': payDiscountInvalid }">
            <span class="ds-label">Total a pagar</span>
            <strong class="mono">S/. {{ formatMoney(payNetTotal) }}</strong>
            <span v-if="payDiscountInvalid" class="ri-net-msg">El descuento no puede ser mayor o igual al total</span>
            <span v-else-if="payDiscountSoles > 0" class="ri-net-msg">
              <template v-if="payDiscountType === 'percent'">{{ payDiscount }}% = S/. {{ formatMoney(payDiscountSoles) }} — </template>se repartirá entre las cuotas y quedará en el historial como descuento por cobranza
            </span>
          </div>
        </div>
        <div class="ri-grid">
          <div class="ds-field">
            <label class="ds-label" for="ri-cur">Moneda<span class="ds-req">*</span></label>
            <select id="ri-cur" v-model="payment.cat_currency" class="ds-input" required>
              <option :value="null">Seleccionar…</option>
              <option v-for="c in catalogs.catCurrency || []" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
            </select>
          </div>
          <div class="ds-field">
            <label class="ds-label" for="ri-medium">Medio de pago<span class="ds-req">*</span></label>
            <select id="ri-medium" v-model="payment.cat_payment_medium" class="ds-input" required>
              <option :value="null">Seleccionar…</option>
              <option v-for="m in catalogs.catPaymentMedium || []" :key="m.id" :value="m.id">{{ m.description }}</option>
            </select>
          </div>
          <div class="ds-field">
            <label class="ds-label" for="ri-entity">Entidad empresa</label>
            <select id="ri-entity" v-model="payment.cat_business_entity" class="ds-input">
              <option :value="null">Seleccionar…</option>
              <option v-for="b in catalogs.catBusinessEntity || []" :key="b.id" :value="b.id">{{ b.description }}</option>
            </select>
          </div>
          <div class="ds-field">
            <label class="ds-label" for="ri-account">Cuenta bancaria</label>
            <select id="ri-account" v-model="payment.bank_account_id" class="ds-input" :disabled="!payment.cat_business_entity">
              <option :value="null">{{ payment.cat_business_entity ? 'Seleccionar…' : 'Seleccione empresa…' }}</option>
              <option v-for="a in filteredAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
            </select>
          </div>
          <div class="ds-field">
            <label class="ds-label" for="ri-op">N° operación</label>
            <input id="ri-op" v-model="payment.transaction_code" class="ds-input" placeholder="Número de operación" />
          </div>
          <div class="ds-field">
            <label class="ds-label" for="ri-paydate">Fecha de pago</label>
            <input id="ri-paydate" v-model="payment.payment_date" type="date" class="ds-input" :max="todayIso" />
          </div>
          <div class="ds-field">
            <span class="ds-label">Voucher</span>
            <div class="ri-voucher">
              <label class="btn-exec btn-exec-outline btn-sm">
                <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                {{ payment.voucher_url ? 'Cambiar voucher' : 'Adjuntar voucher' }}
                <input type="file" accept="image/*,.pdf" class="ri-file" @change="uploadPayVoucher" />
              </label>
              <a v-if="payment.voucher_url" :href="payment.voucher_url" target="_blank" rel="noopener" class="ds-panel-link">
                <i class="fa-solid fa-image" aria-hidden="true"></i> Ver
              </a>
            </div>
          </div>
        </div>
      </section>

      <div v-if="mode === 'campaign' && campaignChangesCount > 0" class="ds-callout ri-summary">
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

      <div class="ri-reason">
        <div class="ds-field">
          <label class="ds-label" for="ri-reason">Motivo<span class="ds-req">*</span></label>
          <select id="ri-reason" v-model="reasonCode" class="ds-input" required>
            <option value="">Seleccionar…</option>
            <option v-for="opt in reasonOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="ri-why">Justificación<span class="ds-req">*</span></label>
          <textarea
            id="ri-why"
            v-model="justificacion"
            class="ds-input"
            required
            rows="2"
            placeholder="Describe el motivo del cambio…"
          ></textarea>
        </div>
      </div>

      <p v-if="editionEndDate && mode !== 'campaign'" class="ds-callout">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>Ninguna cuota puede superar el fin de la edición: <strong>{{ formatDate(editionEndDate) }}</strong></span>
      </p>
    </div>

    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" @click="$emit('update:visible', false)">Cancelar</button>
      <button class="btn-exec btn-exec-primary" type="button" :disabled="!canConfirm || saving" @click="handleSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : (mode === 'campaign' ? 'fa-bullhorn' : 'fa-calendar-check')" aria-hidden="true"></i>
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
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import api from '@/services/api'
import { toLocalIsoDate, toCalendarIsoDate, addDaysIso } from '@/shared/lib/localDate.js'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

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
// Va dentro del slot: BaseModal se teletransporta fuera del arbol de la vista.
const rescheduleForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(rescheduleForm)

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

const { formatDate, formatMoney } = useEnrollmentFormatters()

function buildInitialRows () {
  return (props.installments || [])
    .filter(i => Number(i.installment_number) > 0 && !i.is_reserva)
    .map(i => ({
      installment_id: i.installment_id,
      installment_number: i.installment_number,
      amount: i.amount,
      old_due_date: toCalendarIsoDate(i.due_date),
      new_due_date: toCalendarIsoDate(i.due_date),
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
    r.new_due_date = addDaysIso(r.old_due_date, n)
  }
}

// Todo se compara como texto 'YYYY-MM-DD' (orden lexicografico = orden de
// fechas): con new Date() las cuotas se corrian un dia en Lima.
const rowValidations = computed(() => {
  const endLimit = toCalendarIsoDate(props.editionEndDate)

  const map = new Map()
  for (const r of rows.value) {
    if (r.isPaid || r.isAnnulled) { map.set(r.installment_id, { isPaid: true, error: null, errorShort: null, changed: false }); continue }

    const newIso = toCalendarIsoDate(r.new_due_date)

    // ponytail: se permite mover la fecha hacia atras o adelante; solo se valida
    // que sea valida y que no supere el fin de la edicion.
    let error = null, errorShort = null, changed = false
    if (!newIso) { error = 'Fecha invalida'; errorShort = 'Invalida' }
    else if (newIso === r.old_due_date) { changed = false }
    else if (endLimit && newIso > endLimit) { error = `Supera fin de edicion (${formatDate(endLimit)})`; errorShort = 'Fuera rango' }
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
    payment_date: toLocalIsoDate(),
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
  payment_date: toLocalIsoDate(),
  voucher_url: null
})
const todayIso = computed(() => toLocalIsoDate())
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
  } catch (err) {
    console.error('[uploadPayVoucher]', err)
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
  if (!requiredFieldsFilled() || !canConfirm.value) return
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
.ri-body { display: flex; flex-direction: column; gap: 14px; }
.ri-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ri-student { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ri-student strong { font-size: 14px; color: var(--ds-heading); }
.ri-student span { font-size: 12px; color: var(--ds-muted); font-variant-numeric: tabular-nums; }
.ri-subtitle { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.ri-hint { font-size: 12px; font-weight: 400; color: var(--ds-muted); }

.ri-shift { display: flex; align-items: flex-end; gap: 12px; }
.ri-shift-days { width: 140px; }
.ri-shift .ds-help { margin-bottom: 9px; }

.tc { text-align: center; }
.num { text-align: right; }
.fw700 { font-weight: 700; }
.mono { font-family: var(--ds-font-mono); }
tr.is-closed td { color: var(--ds-muted); }
tr.is-error td { background: var(--ds-soft-bad); }
tr.is-annul td { background: var(--ds-soft-warn); }
.is-strike { text-decoration: line-through; }
.ri-action { display: flex; gap: 6px; }
.ri-action .ds-input { height: 30px; padding: 4px 8px; }
.ri-amount { width: 96px; text-align: right; }
.ri-empty { text-align: center; color: var(--ds-muted); }

.ri-pay { padding: 14px 16px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.ri-discount { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 14px; }
.ri-discount-input { display: flex; align-items: center; gap: 8px; }
.ri-discount-input .ds-input { width: 110px; text-align: right; }
.ri-net { display: flex; flex-direction: column; gap: 2px; }
.ri-net strong { font-size: 16px; color: var(--ds-heading); }
.ri-net-msg { font-size: 11.5px; color: var(--ds-ink-2); }
.ri-net.is-error strong, .ri-net.is-error .ri-net-msg { color: var(--ds-bad-ink); }
.ri-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px 14px; }
.ri-voucher { display: flex; align-items: center; gap: 10px; height: 36px; }
.ri-file { display: none; }

.ri-summary { flex-direction: column; gap: 4px; }
.ri-summary-discount { color: var(--ds-ok-ink); }
.ri-reason { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 12px; }

@media (max-width: 700px) {
  .ri-reason { grid-template-columns: 1fr; }
}
</style>
