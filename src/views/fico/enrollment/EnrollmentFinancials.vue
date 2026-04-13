<template>
  <section class="ef-section">
    <h3 class="ef-title"><i class="fa-solid fa-file-invoice-dollar"></i> Finanzas</h3>

    <!-- Financial summary bar -->
    <div class="ef-bar">
      <div class="ef-bar-item">
        <span class="ef-bar-label">Precio Lista</span>
        <span class="ef-bar-value">S/. {{ fmt.formatMoney(listPrice) }}</span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item ef-discount-wrap">
        <span class="ef-bar-label">Descuento</span>
        <span
          class="ef-bar-value c-red ef-has-tip"
          @mouseenter="showDiscountTip = true"
          @mouseleave="showDiscountTip = false"
        >
          - S/. {{ fmt.formatMoney(discount) }}
          <i v-if="discountLines.length" class="fa-solid fa-circle-info ef-tip-icon"></i>
          <div v-if="showDiscountTip && discountLines.length" class="ef-tooltip">
            <div v-for="(d, i) in discountLines" :key="i" class="ef-tip-row">{{ d }}</div>
          </div>
        </span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item">
        <span class="ef-bar-label">Total</span>
        <span class="ef-bar-value fw700">S/. {{ fmt.formatMoney(total) }}</span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item">
        <span class="ef-bar-label">Pagado</span>
        <span class="ef-bar-value c-green">S/. {{ fmt.formatMoney(paid) }}</span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item">
        <span class="ef-bar-label">Saldo</span>
        <span class="ef-bar-value" :class="balance > 0 ? 'c-red fw700' : 'c-green'">S/. {{ fmt.formatMoney(balance) }}</span>
      </div>
    </div>

    <!-- CONTADO -->
    <div v-if="isContado" class="ef-payment">
      <h6 class="ef-sub-title"><i class="fa-solid fa-money-bill-wave"></i> Pago al Contado</h6>
      <div class="ef-contado-card">
        <div class="ef-contado-amount">
          <span class="ef-bar-label">Monto</span>
          <span class="fw700 mono" style="font-size:16px">S/. {{ fmt.formatMoney(total) }}</span>
        </div>
        <div>
          <a v-if="voucher" :href="voucher" target="_blank" class="ef-voucher-link"><i class="fa-solid fa-image"></i> Ver Voucher</a>
          <span v-else class="c-muted" style="font-size:12px">Sin voucher adjunto</span>
        </div>
      </div>

      <!-- View mode fields -->
      <div v-if="mode === 'view'" class="ef-form-row mt12">
        <div class="ef-field">
          <label>Tipo Moneda</label>
          <span v-if="!isEditing" class="ef-readonly">{{ detail?.currency_symbol || '---' }}</span>
          <select v-else v-model="form.cat_currency" class="ef-select">
            <option :value="null">Seleccionar...</option>
            <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Medio de Pago</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment?.payment_method || '---' }}</span>
          <select v-else v-model="form.cat_payment_medium" class="ef-select">
            <option :value="null">Seleccionar...</option>
            <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Entidad Empresa</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment?.business_entity || '---' }}</span>
          <select v-else v-model="form.cat_business_entity" class="ef-select">
            <option :value="null">Seleccionar...</option>
            <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Cuenta Bancaria</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment ? [lastPayment.bank_name, lastPayment.bank_currency, lastPayment.bank_account_number].filter(Boolean).join(' - ') || '---' : '---' }}</span>
          <select v-else v-model="form.bank_account_id" class="ef-select" :disabled="!form.cat_business_entity">
            <option :value="null">{{ form.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
            <option v-for="a in filteredAccounts(form.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>N. Operacion</label>
          <span v-if="!isEditing" class="ef-readonly mono">{{ lastPayment?.transaction_code || '---' }}</span>
          <input v-else v-model="form.transaction_code" class="ef-input" placeholder="Numero de operacion" />
        </div>
      </div>

      <!-- Confirm mode fields -->
      <div v-if="mode === 'confirm'" class="ef-form-row mt12">
        <div class="ef-field">
          <label>Tipo Moneda</label>
          <select v-model="form.cat_currency" class="ef-select">
            <option :value="null">Seleccionar...</option>
            <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Medio de Pago</label>
          <select v-model="form.cat_payment_medium" class="ef-select">
            <option :value="null">Seleccionar...</option>
            <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Entidad Empresa</label>
          <select v-model="form.cat_business_entity" class="ef-select">
            <option :value="null">Seleccionar...</option>
            <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Cuenta Bancaria</label>
          <select v-model="form.bank_account_id" class="ef-select" :disabled="!form.cat_business_entity">
            <option :value="null">{{ form.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
            <option v-for="a in filteredAccounts(form.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>N. Operacion</label>
          <input v-model="form.transaction_code" class="ef-input" placeholder="Numero de operacion" />
        </div>
      </div>
    </div>

    <!-- CUOTAS -->
    <div v-else class="ef-payment">
      <div class="ef-cuota-tabs">
        <button :class="['ef-cuota-tab', { active: cuotaTab === 'inicial' }]" @click="cuotaTab = 'inicial'">
          <i class="fa-solid fa-receipt"></i> Pago Inicial
        </button>
        <button :class="['ef-cuota-tab', { active: cuotaTab === 'cuotas' }]" @click="cuotaTab = 'cuotas'">
          <i class="fa-solid fa-calendar-days"></i> Cuotas
          <span v-if="cuotas.length" class="ef-tab-badge">{{ cuotas.length }}</span>
        </button>
      </div>

      <!-- Pago Inicial -->
      <div v-if="cuotaTab === 'inicial'" class="ef-tab-body">
        <div v-if="inicial" class="ef-inicial-card">
          <div class="ef-inicial-top">
            <div class="ef-inicial-info">
              <span class="ef-bar-label">Pago Inicial</span>
              <span class="fw700 mono" style="font-size:18px">S/. {{ fmt.formatMoney(inicial.amount) }}</span>
              <span class="c-muted" style="font-size:11px">Vencimiento: {{ fmt.formatDate(inicial.due_date) }}</span>
            </div>
            <div class="ef-inicial-actions">
              <span class="ef-pill" :class="fmt.cuotaStatusPill(inicial)">{{ fmt.cuotaStatusLabel(inicial) }}</span>
              <a v-if="voucher" :href="voucher" target="_blank" class="ef-voucher-link"><i class="fa-solid fa-image"></i> Ver Voucher</a>
            </div>
          </div>
          <div class="ef-form-row mt12">
            <div class="ef-field">
              <label>Tipo Moneda</label>
              <select v-model="inicial._cat_currency" class="ef-select" :disabled="inicial.status === 'paid'">
                <option :value="null">Seleccionar...</option>
                <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Medio de Pago</label>
              <select v-model="inicial._cat_payment_medium" class="ef-select" :disabled="inicial.status === 'paid'">
                <option :value="null">Seleccionar...</option>
                <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Entidad Empresa</label>
              <select v-model="inicial._cat_business_entity" class="ef-select" :disabled="inicial.status === 'paid'">
                <option :value="null">Seleccionar...</option>
                <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Cuenta Bancaria</label>
              <select v-model="inicial._bank_account_id" class="ef-select" :disabled="inicial.status === 'paid' || !inicial._cat_business_entity">
                <option :value="null">{{ inicial._cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                <option v-for="a in filteredAccounts(inicial._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>N. Operacion</label>
              <input v-model="inicial._transaction_code" class="ef-input" placeholder="Numero de operacion" :disabled="inicial.status === 'paid'" />
            </div>
          </div>
        </div>
        <div v-else class="ef-empty"><i class="fa-solid fa-inbox"></i><p>Sin pago inicial registrado</p></div>
      </div>

      <!-- Cuotas -->
      <div v-if="cuotaTab === 'cuotas'" class="ef-tab-body">
        <div v-if="planStatus === 'borrador'" class="ef-notice">
          <i class="fa-solid fa-file-pen"></i>
          <div>
            <strong>Plan en Borrador</strong>
            <p>Comercial envio este plan de cuotas. Confirma el plan para gestionar los pagos.</p>
          </div>
        </div>

        <div class="ef-cuotas-toolbar">
          <span class="c-muted" style="font-size:11px">{{ cuotas.length }} cuota{{ cuotas.length !== 1 ? 's' : '' }}</span>
          <button class="ef-btn-sm ef-btn-teal" @click="$emit('add-cuota')"><i class="fa-solid fa-plus"></i> Agregar Cuota</button>
        </div>

        <table class="ef-table">
          <thead>
            <tr>
              <th style="width:40px">N</th>
              <th class="tr" style="width:100px">Monto</th>
              <th style="width:105px">Vencimiento</th>
              <th class="tc" style="width:75px">Estado</th>
              <th>Moneda</th>
              <th>Medio Pago</th>
              <th>Ent. Empresa</th>
              <th>Cuenta Bancaria</th>
              <th style="width:100px">N. Operacion</th>
              <th class="tc" style="width:60px">Voucher</th>
              <th class="tc" style="width:40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, idx) in cuotas" :key="idx" :class="fmt.cuotaRowClass(c)">
              <td class="fw700 tc">{{ c.installment_number || (idx + 1) }}</td>
              <td v-if="c._isNew"><input v-model.number="c.amount" type="number" step="0.01" class="ef-input tr mono" placeholder="0.00" /></td>
              <td v-else class="tr mono fw700">S/. {{ fmt.formatMoney(c.amount) }}</td>
              <td v-if="c._isNew"><input v-model="c.due_date" type="date" class="ef-input" /></td>
              <td v-else :class="{ 'c-red fw700': fmt.isOverdue(c.due_date) && c.status !== 'paid' }">{{ fmt.formatDate(c.due_date) }}</td>
              <td class="tc"><span class="ef-pill" :class="fmt.cuotaStatusPill(c)">{{ fmt.cuotaStatusLabel(c) }}</span></td>
              <td>
                <select v-model="c._cat_currency" class="ef-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                  <option :value="null">---</option>
                  <option v-for="cur in catalogs.catCurrency" :key="cur.id" :value="cur.id">{{ cur.abbreviation || cur.description }}</option>
                </select>
              </td>
              <td>
                <select v-model="c._cat_payment_medium" class="ef-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                  <option :value="null">---</option>
                  <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
                </select>
              </td>
              <td>
                <select v-model="c._cat_business_entity" class="ef-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                  <option :value="null">---</option>
                  <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
                </select>
              </td>
              <td>
                <select v-model="c._bank_account_id" class="ef-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador' || !c._cat_business_entity">
                  <option :value="null">---</option>
                  <option v-for="a in filteredAccounts(c._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }}</option>
                </select>
              </td>
              <td>
                <input v-model="c._transaction_code" class="ef-input" placeholder="---" :disabled="c.status === 'paid' || planStatus === 'borrador'" />
              </td>
              <td class="tc">
                <a v-if="c._voucher_url" :href="c._voucher_url" target="_blank" class="ef-voucher-sm"><i class="fa-solid fa-image"></i></a>
                <span v-else class="c-muted">---</span>
              </td>
              <td class="tc">
                <button v-if="canDeleteCuota(c)" class="ef-btn-del" @click="$emit('remove-cuota', idx)" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
              </td>
            </tr>
            <tr v-if="!cuotas.length"><td colspan="11" class="ef-empty-row">Sin cuotas programadas</td></tr>
          </tbody>
          <tfoot v-if="cuotas.length">
            <tr class="ef-total-row">
              <td class="fw700 tr">Total:</td>
              <td class="tr mono fw700">S/. {{ fmt.formatMoney(cuotasTotal) }}</td>
              <td colspan="9"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Edit panel -->
    <div v-if="isEditing" class="ef-edit-panel">
      <div class="ef-edit-head">
        <div class="ef-edit-title"><i class="fa-solid fa-pen-to-square"></i> Editar datos financieros</div>
        <button class="ef-edit-close" @click="$emit('cancel-edit')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ef-edit-body">
        <label class="ef-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion del cambio (obligatorio)</label>
        <textarea v-model="justificacion" class="ef-textarea" rows="2" placeholder="Explica el motivo de la edicion..."></textarea>
      </div>
    </div>

    <!-- Footer buttons -->
    <div class="ef-footer">
      <template v-if="mode === 'view' && !isEditing">
        <button class="ef-action-btn" @click="$emit('start-edit')">
          <i class="fa-solid fa-pen-to-square"></i> Editar datos
        </button>
      </template>

      <template v-if="mode === 'view' && isEditing">
        <button class="ef-action-btn" @click="$emit('cancel-edit')">Cancelar edicion</button>
        <button class="ef-btn-primary" :disabled="saving || !justificacion.trim()" @click="$emit('save-edit', justificacion)">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </template>

      <template v-if="mode === 'confirm' && !showConfirmStepper && !showObserveStepper">
        <button class="ef-btn-observe" @click="showObserveStepper = true">
          <i class="fa-solid fa-eye"></i> Observar
        </button>
        <button
          v-if="isContado"
          class="ef-btn-primary"
          :disabled="!canConfirmContado"
          @click="showConfirmStepper = true"
        >
          <i class="fa-solid fa-check"></i> Confirmar Pago
        </button>
        <button
          v-else-if="planStatus === 'borrador'"
          class="ef-btn-primary"
          :disabled="!installments.length"
          @click="showConfirmStepper = true"
        >
          <i class="fa-solid fa-clipboard-check"></i> Confirmar Plan de Cuotas
        </button>
        <button
          v-else-if="planStatus === 'pendiente'"
          class="ef-btn-primary"
          :disabled="saving"
          @click="$emit('save-cuotas')"
        >
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ saving ? 'Guardando...' : 'Guardar Datos Financieros' }}
        </button>
      </template>
    </div>

    <!-- Stepper de confirmacion + preview email -->
    <ActionStepper
      v-if="showConfirmStepper"
      v-model="confirmStep"
      :steps="['Confirmar Inscripcion', 'Preview Correo']"
      :can-advance="confirmStep === 0 ? true : true"
      :loading="saving"
      confirm-label="Confirmar y Enviar"
      confirm-icon="fa-paper-plane"
      @cancel="showConfirmStepper = false; confirmStep = 0"
      @confirm="$emit(isContado ? 'confirm-payment' : 'confirm-plan')"
    >
      <template #step-0>
        <div class="ef-confirm-summary">
          <div class="ef-confirm-row">
            <span class="ef-confirm-label">Tipo</span>
            <span class="ef-confirm-value">{{ isContado ? 'Pago al Contado' : 'Plan de Cuotas' }}</span>
          </div>
          <div class="ef-confirm-row">
            <span class="ef-confirm-label">Total</span>
            <span class="ef-confirm-value fw700">S/. {{ fmt.formatMoney(total) }}</span>
          </div>
          <p class="ef-confirm-note">Al confirmar se inscribira al alumno en Odoo y se enviara el correo de confirmacion.</p>
        </div>
      </template>
      <template #step-1>
        <EmailPreviewStep :enrollment-id="enrollmentId" :active="confirmStep === 1" />
      </template>
    </ActionStepper>

    <!-- Stepper de observacion -->
    <ActionStepper
      v-if="showObserveStepper"
      v-model="observeStep"
      :steps="['Observar Inscripcion']"
      :can-advance="!!observeReason.trim()"
      :loading="savingObserve"
      confirm-label="Confirmar Observacion"
      confirm-icon="fa-eye"
      @cancel="showObserveStepper = false; observeStep = 0; observeReason = ''"
      @confirm="$emit('reject-enrollment', observeReason)"
    >
      <template #step-0>
        <div class="ef-observe-wrap">
          <div class="ef-observe-banner">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
              <strong>Observar inscripcion</strong>
              <p>La inscripcion sera devuelta al asesor comercial para correccion. Se le notificara automaticamente.</p>
            </div>
          </div>
          <div class="ef-observe-field">
            <label>Motivo de la observacion <span style="color:#DC2626">*</span></label>
            <textarea v-model="observeReason" class="ef-observe-textarea" rows="3" placeholder="Describe que debe corregir el asesor..."></textarea>
          </div>
        </div>
      </template>
    </ActionStepper>
  </section>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useToast } from 'vue-toastification'
import ActionStepper from '@/components/ActionStepper.vue'
import EmailPreviewStep from './EmailPreviewStep.vue'

const props = defineProps({
  detail: { type: Object, default: () => ({}) },
  enrollment: { type: Object, default: null },
  catalogs: { type: Object, default: () => ({}) },
  form: { type: Object, required: true },
  installments: { type: Array, default: () => [] },
  mode: { type: String, default: 'view' },
  isEditing: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  lastPayment: { type: Object, default: null },
  enrollmentId: { type: Number, default: 0 }
})

defineEmits([
  'start-edit', 'cancel-edit', 'save-edit',
  'confirm-payment', 'confirm-plan', 'save-cuotas',
  'add-cuota', 'remove-cuota', 'reject-enrollment'
])

const fmt = useEnrollmentFormatters()
const cuotaTab = ref('inicial')
const showDiscountTip = ref(false)
const justificacion = ref('')
const showConfirmStepper = ref(false)
const confirmStep = ref(0)
const showObserveStepper = ref(false)
const observeStep = ref(0)
const observeReason = ref('')
const savingObserve = ref(false)

const listPrice = computed(() => Number(props.enrollment?.list_price) || Number(props.detail?.list_price) || 0)
const discount = computed(() => Number(props.enrollment?.total_discounted) || Number(props.detail?.discount_amount) || 0)
const total = computed(() => Number(props.enrollment?.total_to_pay) || Number(props.detail?.net_amount) || 0)
const paid = computed(() => props.enrollment ? fmt.getPagado(props.enrollment) : Number(props.detail?.amount_paid) || 0)
const balance = computed(() => props.enrollment ? fmt.calcSaldo(props.enrollment) : Number(props.detail?.balance_due) || 0)
const voucher = computed(() => props.enrollment?.payment_vouchers || null)
const isContado = computed(() => props.enrollment ? fmt.isContado(props.enrollment) : true)

const discountLines = computed(() => {
  const e = props.enrollment
  if (!e) return []
  const lines = []
  if (e.main_discount) lines.push(e.main_discount)
  if (e.additional_discounts) lines.push(e.additional_discounts)
  return lines
})

const inicial = computed(() => props.installments.find(i => i.installment_number === 0 || i.is_reserva) || null)
const cuotas = computed(() => props.installments.filter(i => i.installment_number !== 0 && !i.is_reserva))
const cuotasTotal = computed(() => cuotas.value.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))

const planStatus = computed(() => {
  const conf = (props.enrollment?.confirmation || '').toLowerCase()
  if (conf.includes('confirm') || conf.includes('aprob')) return 'pendiente'
  return 'borrador'
})

const canConfirmContado = computed(() => props.form.cat_currency && props.form.cat_payment_medium)

function filteredAccounts (entityId) {
  if (!entityId || !props.catalogs?.allBankAccounts) return []
  return props.catalogs.allBankAccounts.filter(a => a.business_entity_catalog_id === entityId)
}

function canDeleteCuota (c) {
  if (c.status === 'paid') return false
  if (planStatus.value === 'borrador') return true
  if (c._isNew) return true
  return false
}
</script>

<style scoped>
.ef-section {
  background: transparent;
}

.ef-title {
  display: none;
}

/* Financial bar */
.ef-bar {
  display: flex;
  align-items: stretch;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 14px 0;
  margin-bottom: 18px;
}

.ef-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  position: relative;
}

.ef-bar-sep { width: 1px; background: #E5E7EB; align-self: stretch; }
.ef-bar-label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #9CA3AF; font-weight: 600; }
.ef-bar-value { font-size: 14px; font-weight: 600; color: #111827; font-family: 'JetBrains Mono', monospace; }

.ef-discount-wrap { position: relative; }
.ef-has-tip { cursor: help; position: relative; }
.ef-tip-icon { font-size: 10px; margin-left: 3px; opacity: .5; }

.ef-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #111827;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
  font-weight: 400;
}
.ef-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #111827;
}
.ef-tip-row { padding: 1px 0; }

/* Payment section */
.ef-payment { margin-bottom: 14px; }

.ef-sub-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px;
}
.ef-sub-title i { color: #0D9488; }

/* Contado card */
.ef-contado-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}
.ef-contado-amount { display: flex; flex-direction: column; gap: 2px; }

.ef-voucher-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #EFF6FF;
  color: #2563EB;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: background .15s;
}
.ef-voucher-link:hover { background: #DBEAFE; }

.ef-voucher-sm { color: #2563EB; font-size: 14px; text-decoration: none; }
.ef-voucher-sm:hover { opacity: .7; }

/* Form rows */
.ef-form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mt12 { margin-top: 12px; }

.ef-field { display: flex; flex-direction: column; gap: 4px; }
.ef-field label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: .03em; }

.ef-readonly {
  font-size: 13px;
  color: #111827;
  padding: 7px 0;
  border-bottom: 1px dashed #E5E7EB;
  min-height: 32px;
  line-height: 1.4;
}

.ef-input,
.ef-select {
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  font-family: inherit;
  color: #111827;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  outline: none;
  transition: border-color .15s;
}
.ef-input:focus,
.ef-select:focus { border-color: #0D9488; }
.ef-input:disabled,
.ef-select:disabled { background: #F9FAFB; color: #9CA3AF; cursor: not-allowed; }

.ef-select-sm {
  height: 28px;
  padding: 0 6px;
  font-size: 11px;
  font-family: inherit;
  color: #111827;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  outline: none;
  width: 100%;
}
.ef-select-sm:focus { border-color: #0D9488; }
.ef-select-sm:disabled { background: #F9FAFB; color: #9CA3AF; cursor: not-allowed; }

/* Cuota tabs */
.ef-cuota-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #E5E7EB;
  margin-bottom: 14px;
}

.ef-cuota-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color .15s, border-color .15s;
  font-family: inherit;
}
.ef-cuota-tab:hover { color: #111827; }
.ef-cuota-tab.active { color: #0D9488; border-bottom-color: #0D9488; }

.ef-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #0D9488;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.ef-tab-body { padding: 2px 0; }

/* Inicial card */
.ef-inicial-card {
  padding: 14px 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}
.ef-inicial-top { display: flex; align-items: center; justify-content: space-between; }
.ef-inicial-info { display: flex; flex-direction: column; gap: 2px; }
.ef-inicial-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

/* Notice */
.ef-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 12px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  color: #92400E;
}
.ef-notice i { font-size: 16px; margin-top: 1px; flex-shrink: 0; color: #D97706; }
.ef-notice strong { display: block; font-size: 13px; margin-bottom: 2px; }
.ef-notice p { margin: 0; }

/* Toolbar */
.ef-cuotas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ef-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: opacity .15s;
}
.ef-btn-sm:hover { opacity: .85; }
.ef-btn-teal { background: #0D9488; color: #fff; }

/* Table */
.ef-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #111827;
}
.ef-table thead th {
  background: #F9FAFB;
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: #6B7280;
  border-bottom: 2px solid #E5E7EB;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
}
.ef-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid #E5E7EB;
  vertical-align: middle;
}
.ef-table tbody tr:hover { background: #F9FAFB; }
.ef-table .cuota-paid td { background: #F0FDF4; }
.ef-table .cuota-overdue td { background: #FEF2F2; }

.ef-total-row td {
  padding: 10px;
  border-top: 2px solid #E5E7EB;
  background: #F9FAFB;
  font-size: 13px;
}
.ef-empty-row { text-align: center; padding: 24px; color: #9CA3AF; font-size: 12px; }

.ef-btn-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: #FEE2E2;
  color: #DC2626;
  cursor: pointer;
  font-size: 11px;
  transition: background .15s;
}
.ef-btn-del:hover { background: #FECACA; }

/* Pill */
.ef-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
.pill-green { background: #DCFCE7; color: #166534; }
.pill-amber { background: #FEF3C7; color: #92400E; }
.pill-red { background: #FEE2E2; color: #991B1B; }

/* Empty state */
.ef-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: #9CA3AF;
  font-size: 13px;
}
.ef-empty i { font-size: 28px; opacity: .4; }

/* Edit panel */
.ef-edit-panel {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 14px;
}
.ef-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}
.ef-edit-title { font-size: 13px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; }
.ef-edit-title i { color: #0D9488; }
.ef-edit-close {
  width: 28px; height: 28px; border-radius: 4px; border: none;
  background: none; color: #9CA3AF; cursor: pointer; font-size: 14px;
  display: inline-flex; align-items: center; justify-content: center;
}
.ef-edit-close:hover { color: #111827; }
.ef-edit-body { padding: 14px 16px; }

.ef-warn-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: #92400E; margin-bottom: 6px;
}
.ef-warn-label i { font-size: 13px; color: #D97706; }

.ef-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: #111827;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  outline: none;
  resize: vertical;
  transition: border-color .15s;
}
.ef-textarea:focus { border-color: #0D9488; }

/* Footer */
.ef-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.ef-action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; font-size: 12.5px; font-weight: 600;
  border: 1px solid #E5E7EB; border-radius: 6px;
  background: #fff; color: #6B7280;
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.ef-action-btn:hover { border-color: #0D9488; color: #0D9488; }

.ef-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; background: #0D9488; color: #fff;
  border: none; border-radius: 6px; font-size: 13px;
  font-weight: 600; font-family: inherit; cursor: pointer;
  transition: opacity .15s;
}
.ef-btn-primary:hover { opacity: .9; }
.ef-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

/* Observe button */
.ef-btn-observe {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; background: #FFFBEB; color: #B45309;
  border: 1px solid #FDE68A; border-radius: 6px; font-size: 13px;
  font-weight: 600; font-family: inherit; cursor: pointer;
  transition: all .15s;
}
.ef-btn-observe:hover { background: #FEF3C7; border-color: #F59E0B; }

/* Observe stepper content */
.ef-observe-wrap { display: flex; flex-direction: column; gap: 16px; }
.ef-observe-banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; background: #FFFBEB;
  border: 1px solid #FDE68A; border-radius: 8px;
  font-size: 12.5px; color: #92400E; line-height: 1.5;
}
.ef-observe-banner i { font-size: 18px; color: #F59E0B; margin-top: 2px; flex-shrink: 0; }
.ef-observe-banner strong { display: block; font-size: 13px; margin-bottom: 2px; }
.ef-observe-banner p { margin: 0; }
.ef-observe-field { display: flex; flex-direction: column; gap: 5px; }
.ef-observe-field label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: .03em; }
.ef-observe-textarea {
  width: 100%; padding: 10px 12px; border: 1.5px solid #F59E0B;
  border-radius: 6px; font-size: 13px; font-family: inherit;
  color: #374151; background: #FFFBEB; resize: vertical; min-height: 72px;
}
.ef-observe-textarea:focus { outline: none; border-color: #D97706; box-shadow: 0 0 0 3px rgba(245,158,11,.1); }
.ef-observe-textarea::placeholder { color: #D1D5DB; }

/* Confirm summary */
.ef-confirm-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}
.ef-confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #F9FAFB;
  border-radius: 6px;
}
.ef-confirm-label { font-size: 13px; color: #6B7280; font-weight: 500; }
.ef-confirm-value { font-size: 14px; color: #111827; font-weight: 600; }
.ef-confirm-note {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
  padding: 10px 14px;
  background: #F0FDFA;
  border: 1px solid #99F6E4;
  border-radius: 6px;
  margin: 0;
}

/* Utilities */
.tr { text-align: right; }
.tc { text-align: center; }
.fw700 { font-weight: 700; }
.mono { font-family: 'JetBrains Mono', monospace; }
.c-green { color: #059669; }
.c-red { color: #DC2626; }
.c-muted { color: #9CA3AF; }
</style>
