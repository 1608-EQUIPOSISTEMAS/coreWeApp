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
      <div v-if="reserva > 0" class="ef-bar-sep"></div>
      <div v-if="reserva > 0" class="ef-bar-item">
        <span class="ef-bar-label">Inicial</span>
        <span class="ef-bar-value c-blue">S/. {{ fmt.formatMoney(reserva) }}</span>
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

    <!-- Convalidacion -->
    <div v-if="validations.length > 0" class="ef-validation-block">
      <h6 class="ef-sub-title"><i class="fa-solid fa-rotate-right"></i> Convalidacion</h6>
      <table class="ef-table">
        <thead>
          <tr>
            <th>Modulo</th>
            <th class="tc">Estado</th>
            <th>Edicion</th>
            <th class="tc" style="width:40px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="child in programChildren" :key="child.child_program_version_id">
            <td class="fw700">{{ child.child_name }}</td>
            <td class="tc">
              <span v-if="isValidated(child.child_program_version_id)" class="ef-pill pill-amber">Convalidar</span>
              <span v-else class="ef-pill pill-green">Inscribir</span>
            </td>
            <td>
              <template v-if="isValidated(child.child_program_version_id)">&mdash;</template>
              <template v-else-if="child.editions?.length > 1 && planStatus !== 'pendiente'">
                <span v-if="!editingEdition[child.child_program_version_id]"
                  class="ef-edition-link"
                  @click="editingEdition[child.child_program_version_id] = true">
                  {{ getCustomEditionLabel(child) || 'Misma edicion' }}
                  <i class="fa-solid fa-pen" style="font-size:10px;margin-left:4px;opacity:.4"></i>
                </span>
                <select v-else class="ef-select-sm" style="min-width:160px"
                  :value="getCustomEditionId(child.child_program_version_id)"
                  @change="$emit('change-edition', { childVersionId: child.child_program_version_id, editionId: Number($event.target.value) || null }); editingEdition[child.child_program_version_id] = false"
                  @blur="editingEdition[child.child_program_version_id] = false">
                  <option :value="null">Misma edicion</option>
                  <option v-for="ed in child.editions" :key="ed.edition_id" :value="ed.edition_id">
                    {{ ed.code }} - {{ formatEdDate(ed.start_date) }}
                  </option>
                </select>
              </template>
              <template v-else>Misma edicion</template>
            </td>
            <td class="tc">
              <button v-if="planStatus !== 'pendiente'" class="ef-btn-del"
                @click="$emit('toggle-validation', child.child_program_version_id)"
                :title="isValidated(child.child_program_version_id) ? 'Quitar convalidacion' : 'Convalidar'">
                <i :class="isValidated(child.child_program_version_id) ? 'fa-solid fa-xmark' : 'fa-solid fa-check'"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
            </div>
            <div class="ef-inicial-actions">
              <a v-if="voucher" :href="voucher" target="_blank" class="ef-voucher-link"><i class="fa-solid fa-image"></i> Ver Voucher</a>
            </div>
          </div>
          <div class="ef-form-row mt12">
            <div class="ef-field">
              <label>Tipo Moneda</label>
              <select v-model="inicial._cat_currency" class="ef-select" :disabled="inicial.status === 'paid' && !isEditing">
                <option :value="null">Seleccionar...</option>
                <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Medio de Pago</label>
              <select v-model="inicial._cat_payment_medium" class="ef-select" :disabled="inicial.status === 'paid' && !isEditing">
                <option :value="null">Seleccionar...</option>
                <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Entidad Empresa</label>
              <select v-model="inicial._cat_business_entity" class="ef-select" :disabled="inicial.status === 'paid' && !isEditing">
                <option :value="null">Seleccionar...</option>
                <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Cuenta Bancaria</label>
              <select v-model="inicial._bank_account_id" class="ef-select" :disabled="(inicial.status === 'paid' && !isEditing) || !inicial._cat_business_entity">
                <option :value="null">{{ inicial._cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                <option v-for="a in filteredAccounts(inicial._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>N. Operacion</label>
              <input v-model="inicial._transaction_code" class="ef-input" placeholder="Numero de operacion" :disabled="inicial.status === 'paid' && !isEditing" />
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
              <td v-if="c._isNew"><BaseDatePicker v-model="c.due_date" placeholder="dd/mm/aaaa" class="ef-datepicker" /></td>
              <td v-else :class="{ 'c-red fw700': fmt.isOverdue(c.due_date) && c.status !== 'paid' }">{{ fmt.formatDate(c.due_date) }}</td>
              <td class="tc"><span class="ef-pill" :class="fmt.cuotaStatusPill(c, planStatus)">{{ fmt.cuotaStatusLabel(c, planStatus) }}</span></td>
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
                <a v-if="c._voucher_url" :href="c._voucher_url" target="_blank" class="ef-voucher-sm" title="Ver voucher"><i class="fa-solid fa-image"></i></a>
                <label v-if="planStatus !== 'borrador' && c.status !== 'paid'" class="ef-upload-btn" title="Subir voucher">
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                  <input type="file" accept="image/*,.pdf" style="display:none" @change="e => uploadVoucher(e, c)" />
                </label>
              </td>
              <td class="tc">
                <button
                  v-if="c.status !== 'paid' && c._cat_currency && c._cat_payment_medium"
                  class="ef-btn-confirm-cuota"
                  @click="$emit('confirm-cuota', c)"
                  title="Confirmar pago de cuota"
                ><i class="fa-solid fa-check"></i></button>
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
          <i class="fa-solid fa-clipboard-check"></i> Confirmar Pago
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
            <span class="ef-confirm-value">{{ isContado ? 'Pago al Contado' : 'Cuotas' }}</span>
          </div>
          <template v-if="!isContado && inicial">
            <div class="ef-confirm-row">
              <span class="ef-confirm-label">Pago Inicial</span>
              <span class="ef-confirm-value">S/. {{ fmt.formatMoney(inicial.amount) }}</span>
            </div>
            <div class="ef-confirm-row">
              <span class="ef-confirm-label">Cuotas ({{ cuotas.length }})</span>
              <span class="ef-confirm-value">S/. {{ fmt.formatMoney(cuotasTotal) }}</span>
            </div>
          </template>
          <div class="ef-confirm-row">
            <span class="ef-confirm-label">Total</span>
            <span class="ef-confirm-value fw700">S/. {{ fmt.formatMoney(total) }}</span>
          </div>
          <p v-if="isBeca" class="ef-confirm-note" style="color:#D97706;font-weight:600">Beca — Descuento 100%. No requiere pago.</p>
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
import { ref, reactive, computed, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useToast } from 'vue-toastification'
import ActionStepper from '@/components/ActionStepper.vue'
import EmailPreviewStep from './EmailPreviewStep.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import api from '@/services/api'

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
  enrollmentId: { type: Number, default: 0 },
  validations: { type: Array, default: () => [] },
  programChildren: { type: Array, default: () => [] }
})

defineEmits([
  'start-edit', 'cancel-edit', 'save-edit',
  'confirm-payment', 'confirm-plan', 'save-cuotas',
  'add-cuota', 'remove-cuota', 'reject-enrollment',
  'toggle-validation',
  'change-edition',
  'confirm-cuota'
])

const fmt = useEnrollmentFormatters()
const toast = useToast()
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
const total = computed(() => {
  if (props.installments?.length) {
    return props.installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  }
  return Number(props.enrollment?.total_to_pay) || Number(props.detail?.net_amount) || 0
})
const reserva = computed(() => props.enrollment ? fmt.getReserva(props.enrollment) : 0)
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

const isBeca = computed(() => total.value === 0 && discount.value > 0)
const canConfirmContado = computed(() => isBeca.value || (props.form.cat_currency && props.form.cat_payment_medium))

async function uploadVoucher (event, cuota) {
  const file = event.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data?.url) {
      cuota._voucher_url = res.data.url
      toast.success('Voucher subido')
    }
  } catch {
    toast.error('Error al subir voucher')
  }
  event.target.value = ''
}

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

const editingEdition = reactive({})
const isValidated = (childVersionId) => props.validations.some(v => v.child_version_id === childVersionId)

function getCustomEditionLabel (child) {
  const val = props.validations.find(v => v.child_version_id === child.child_program_version_id)
  if (val?.custom_edition_id && child.editions?.length) {
    const ed = child.editions.find(e => e.edition_id === val.custom_edition_id)
    return ed ? `${ed.code} - ${ed.start_date}` : null
  }
  return null
}

function getCustomEditionId (childVersionId) {
  const val = props.validations.find(v => v.child_version_id === childVersionId && v.custom_edition_id)
  return val?.custom_edition_id || null
}

function formatEdDate (d) {
  if (!d) return ''
  return fmt.formatDate(d)
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
  background: #FAFAFA;
  border-radius: 10px;
  padding: 16px 0;
  margin-bottom: 24px;
}

.ef-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
  position: relative;
}

.ef-bar-sep { width: 1px; background: #F0F0F0; align-self: stretch; }
.ef-bar-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #A3A3A3; font-weight: 500; }
.ef-bar-value { font-size: 14px; font-weight: 600; color: #1A1A1A; font-family: 'JetBrains Mono', monospace; letter-spacing: -0.02em; }

.ef-discount-wrap { position: relative; }
.ef-has-tip { cursor: help; position: relative; }
.ef-tip-icon { font-size: 10px; margin-left: 3px; opacity: .4; }

.ef-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1A1A1A;
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
  font-weight: 400;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
}
.ef-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #1A1A1A;
}
.ef-tip-row { padding: 2px 0; }

/* Payment section */
.ef-payment { margin-bottom: 20px; }

.ef-sub-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 14px;
  letter-spacing: -0.01em;
}
.ef-sub-title i { color: #A3A3A3; font-size: 13px; }

/* Contado card */
.ef-contado-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: #FAFAFA;
  border-radius: 10px;
}
.ef-contado-amount { display: flex; flex-direction: column; gap: 2px; }

.ef-voucher-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #F5F5F5;
  color: #1A1A1A;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  transition: background .2s ease;
}
.ef-voucher-link:hover { background: #EBEBEB; }

.ef-voucher-sm { color: #737373; font-size: 14px; text-decoration: none; transition: color .2s ease; margin-right: 6px; }
.ef-voucher-sm:hover { color: #1A1A1A; }

.ef-upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #A3A3A3;
  cursor: pointer;
  transition: all .2s ease;
  font-size: 13px;
}
.ef-upload-btn:hover { background: #F0FDFA; color: #0D9488; }

.ef-btn-confirm-cuota {
  width: 28px;
  height: 28px;
  border: 1px solid #10B981;
  background: #ECFDF5;
  color: #059669;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease;
  margin-right: 4px;
}
.ef-btn-confirm-cuota:hover { background: #059669; color: #fff; }

/* Form rows */
.ef-form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.mt12 { margin-top: 14px; }

.ef-field { display: flex; flex-direction: column; gap: 5px; }
.ef-field label { font-size: 11px; font-weight: 500; color: #A3A3A3; text-transform: uppercase; letter-spacing: .05em; }

.ef-readonly {
  font-size: 13px;
  color: #1A1A1A;
  padding: 8px 0;
  border-bottom: 1px solid #F5F5F5;
  min-height: 34px;
  line-height: 1.4;
}

.ef-input,
.ef-select {
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  color: #1A1A1A;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  outline: none;
  transition: all .2s ease;
}
.ef-input:focus,
.ef-select:focus { border-color: #1A1A1A; box-shadow: 0 0 0 3px rgba(0,0,0,.04); }
.ef-input:disabled,
.ef-select:disabled { background: #FAFAFA; color: #C4C4C4; cursor: not-allowed; }

.ef-datepicker { width: 140px; }
.ef-datepicker :deep(input) {
  height: 34px;
  padding: 0 10px;
  font-size: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  width: 100%;
  font-family: inherit;
}

.ef-select-sm {
  height: 30px;
  padding: 0 8px;
  font-size: 11.5px;
  font-family: inherit;
  color: #1A1A1A;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  outline: none;
  width: 100%;
  transition: all .2s ease;
}
.ef-select-sm:focus { border-color: #1A1A1A; }
.ef-select-sm:disabled { background: #FAFAFA; color: #C4C4C4; cursor: not-allowed; }

/* Cuota tabs */
.ef-cuota-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #F0F0F0;
  margin-bottom: 16px;
}

.ef-cuota-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  font-size: 12.5px;
  font-weight: 500;
  color: #A3A3A3;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color .2s ease, border-color .2s ease;
  font-family: inherit;
}
.ef-cuota-tab:hover { color: #1A1A1A; }
.ef-cuota-tab.active { color: #1A1A1A; font-weight: 600; border-bottom-color: #1A1A1A; }

.ef-tab-badge {
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

.ef-tab-body { padding: 4px 0; }

/* Inicial card */
.ef-inicial-card {
  padding: 16px 18px;
  background: #FAFAFA;
  border-radius: 10px;
}
.ef-inicial-top { display: flex; align-items: center; justify-content: space-between; }
.ef-inicial-info { display: flex; flex-direction: column; gap: 3px; }
.ef-inicial-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

/* Notice */
.ef-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.5;
  margin-bottom: 14px;
  background: #FFF8EB;
  color: #92400E;
}
.ef-notice i { font-size: 15px; margin-top: 1px; flex-shrink: 0; color: #D97706; }
.ef-notice strong { display: block; font-size: 13px; margin-bottom: 2px; }
.ef-notice p { margin: 0; }

/* Toolbar */
.ef-cuotas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ef-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: all .2s ease;
}
.ef-btn-sm:hover { opacity: .85; }
.ef-btn-teal { background: #1A1A1A; color: #fff; }

/* Table */
.ef-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: #1A1A1A;
}
.ef-table thead th {
  background: #FAFAFA;
  padding: 10px 10px;
  text-align: left;
  font-weight: 500;
  color: #A3A3A3;
  border-bottom: 1px solid #F0F0F0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .05em;
  white-space: nowrap;
}
.ef-table tbody td {
  padding: 8px 10px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
}
.ef-table tbody tr:hover { background: #FAFAFA; }
.ef-table .cuota-paid td { background: #F7FDF9; }
.ef-table .cuota-overdue td { background: #FFFBFB; }

.ef-total-row td {
  padding: 12px 10px;
  border-top: 1px solid #F0F0F0;
  background: #FAFAFA;
  font-size: 13px;
}
.ef-empty-row { text-align: center; padding: 32px; color: #C4C4C4; font-size: 13px; }

.ef-btn-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #C4C4C4;
  cursor: pointer;
  font-size: 11px;
  transition: all .2s ease;
}
.ef-btn-del:hover { background: #FEF2F2; color: #DC2626; }

/* Pill */
.ef-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
.pill-green { background: #ECFDF5; color: #065F46; }
.pill-amber { background: #FFF8EB; color: #92400E; }
.pill-red   { background: #FEF2F2; color: #991B1B; }
.pill-muted { background: #F3F4F6; color: #6B7280; }

/* Empty state */
.ef-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px;
  color: #C4C4C4;
  font-size: 13px;
}
.ef-empty i { font-size: 24px; opacity: .5; }

/* Edit panel */
.ef-edit-panel {
  border: 1px solid #F0F0F0;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 16px;
}
.ef-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #FAFAFA;
  border-bottom: 1px solid #F0F0F0;
}
.ef-edit-title { font-size: 13px; font-weight: 600; color: #1A1A1A; display: flex; align-items: center; gap: 8px; }
.ef-edit-title i { color: #A3A3A3; }
.ef-edit-close {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  background: none; color: #C4C4C4; cursor: pointer; font-size: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .2s ease;
}
.ef-edit-close:hover { color: #1A1A1A; background: #F0F0F0; }
.ef-edit-body { padding: 16px 18px; }

.ef-warn-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 500; color: #92400E; margin-bottom: 6px;
}
.ef-warn-label i { font-size: 13px; color: #D97706; }

.ef-textarea {
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  font-family: inherit;
  color: #1A1A1A;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  outline: none;
  resize: vertical;
  transition: all .2s ease;
}
.ef-textarea:focus { border-color: #1A1A1A; box-shadow: 0 0 0 3px rgba(0,0,0,.04); }

/* Footer */
.ef-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #F0F0F0;
}

.ef-action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; font-size: 13px; font-weight: 500;
  border: 1px solid #E8E8E8; border-radius: 8px;
  background: #fff; color: #737373;
  cursor: pointer; transition: all .2s ease; font-family: inherit;
}
.ef-action-btn:hover { border-color: #1A1A1A; color: #1A1A1A; }

.ef-btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 20px; background: #1A1A1A; color: #fff;
  border: none; border-radius: 8px; font-size: 13px;
  font-weight: 600; font-family: inherit; cursor: pointer;
  transition: background .2s ease;
}
.ef-btn-primary:hover { background: #333; }
.ef-btn-primary:disabled { opacity: .4; cursor: not-allowed; }

/* Observe button */
.ef-btn-observe {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; background: #FFF8EB; color: #B45309;
  border: 1px solid #FDE68A; border-radius: 8px; font-size: 13px;
  font-weight: 500; font-family: inherit; cursor: pointer;
  transition: all .2s ease;
}
.ef-btn-observe:hover { background: #FEF3C7; border-color: #F59E0B; }

/* Observe stepper content */
.ef-observe-wrap { display: flex; flex-direction: column; gap: 16px; }
.ef-observe-banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 18px; background: #FFF8EB;
  border-radius: 10px;
  font-size: 12.5px; color: #92400E; line-height: 1.5;
}
.ef-observe-banner i { font-size: 16px; color: #F59E0B; margin-top: 2px; flex-shrink: 0; }
.ef-observe-banner strong { display: block; font-size: 13px; margin-bottom: 2px; }
.ef-observe-banner p { margin: 0; }
.ef-observe-field { display: flex; flex-direction: column; gap: 5px; }
.ef-observe-field label { font-size: 11px; font-weight: 500; color: #A3A3A3; text-transform: uppercase; letter-spacing: .05em; }
.ef-observe-textarea {
  width: 100%; padding: 12px 14px; border: 1px solid #FDE68A;
  border-radius: 8px; font-size: 13px; font-family: inherit;
  color: #1A1A1A; background: #FFFDF5; resize: vertical; min-height: 72px;
}
.ef-observe-textarea:focus { outline: none; border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.08); }
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
  padding: 10px 18px;
  background: #FAFAFA;
  border-radius: 8px;
}
.ef-confirm-label { font-size: 13px; color: #A3A3A3; font-weight: 500; }
.ef-confirm-value { font-size: 14px; color: #1A1A1A; font-weight: 600; }
.ef-confirm-note {
  font-size: 12.5px;
  color: #737373;
  line-height: 1.5;
  padding: 12px 16px;
  background: #FAFAFA;
  border-radius: 8px;
  margin: 0;
}

/* Utilities */
.tr { text-align: right; }
.tc { text-align: center; }
.fw700 { font-weight: 700; }
.mono { font-family: 'JetBrains Mono', monospace; }
.c-green { color: #059669; }
.c-blue  { color: #2563EB; }
.c-red { color: #DC2626; }
.c-muted { color: #C4C4C4; }

.ef-validation-block {
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid #F0F0F0;
}
.ef-edition-link {
  color: #1A1A1A;
  cursor: pointer;
  font-size: 13px;
  transition: color .2s;
}
.ef-edition-link:hover { color: #0D9488; }
</style>
