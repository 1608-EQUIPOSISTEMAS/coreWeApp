<template>
  <section class="ef-section">
    <h3 class="ef-title"><i class="fa-solid fa-file-invoice-dollar"></i> Finanzas</h3>

    <!-- Badge de promo: el alumno debe traer laptop como beneficio de la inscripcion -->
    <div v-if="hasLaptopPromo" class="ef-laptop-banner">
      <i class="fa-solid fa-laptop"></i>
      <div class="ef-laptop-banner-text">
        <strong>Traera laptop</strong>
        <span>Inscripcion con promo LAPTOP — confirmar que el alumno trae su equipo</span>
      </div>
    </div>

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
              <template v-else>
                <!-- Hijo NO esta en el arbol del padre Y no tiene custom edition: requiere accion -->
                <span v-if="needsEditionDecision(child)" class="ef-edition-warn"
                  @click="editingEdition[child.child_program_version_id] = true">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  Falta elegir edicion
                </span>
                <span v-else-if="!editingEdition[child.child_program_version_id]"
                  class="ef-edition-link"
                  @click="editingEdition[child.child_program_version_id] = true">
                  {{ getCustomEditionLabel(child) || sameEditionLabel() }}
                  <i class="fa-solid fa-pen" style="font-size:10px;margin-left:4px;opacity:.4"></i>
                </span>
                <select v-if="editingEdition[child.child_program_version_id]" class="ef-select-sm" style="min-width:200px"
                  :value="getCustomEditionId(child.child_program_version_id)"
                  @change="$emit('change-edition', { childVersionId: child.child_program_version_id, editionId: Number($event.target.value) || null }); editingEdition[child.child_program_version_id] = false"
                  @blur="editingEdition[child.child_program_version_id] = false">
                  <option :value="null" :disabled="!isInParentTree(child)">
                    {{ isInParentTree(child) ? sameEditionLabel() : 'Seleccionar edicion...' }}
                  </option>
                  <option v-for="ed in child.editions" :key="ed.edition_id" :value="ed.edition_id">
                    {{ ed.code }} - {{ formatEdDate(ed.start_date) }}
                  </option>
                </select>
              </template>
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
      <!-- Becado: nav Pago / Adicionales (pago del certificado) -->
      <div v-if="isBeca" class="ef-cuota-tabs">
        <button :class="['ef-cuota-tab', { active: becaTab === 'pago' }]" @click="becaTab = 'pago'">
          <i class="fa-solid fa-money-bill-wave"></i> Pago
        </button>
        <button :class="['ef-cuota-tab', { active: becaTab === 'adicionales' }]" @click="becaTab = 'adicionales'">
          <i class="fa-solid fa-file-invoice"></i> Adicionales
        </button>
      </div>

      <!-- Adicionales: pago del certificado del becado -->
      <div v-if="isBeca && becaTab === 'adicionales'" class="ef-tab-body">
        <!-- Pago ya registrado: solo lectura -->
        <div v-if="certificatePayment && !editingAdicional" class="ef-inicial-card">
          <div class="ef-inicial-top">
            <div class="ef-inicial-info">
              <span class="ef-bar-label">Pago de Certificado</span>
              <span class="fw700 mono" style="font-size:18px">S/. {{ fmt.formatMoney(certificatePayment.amount) }}</span>
            </div>
            <div class="ef-inicial-actions">
              <span class="ef-cert-badge"><i class="fa-solid fa-certificate"></i> Certificar</span>
              <a v-if="certificatePayment.evidence_url" :href="certificatePayment.evidence_url" target="_blank" class="ef-voucher-link"><i class="fa-solid fa-image"></i> Ver Voucher</a>
              <span v-else class="c-muted" style="font-size:12px">Sin voucher adjunto</span>
            </div>
          </div>
          <div class="ef-form-row mt12">
            <div class="ef-field"><label>Medio de Pago</label><span class="ef-readonly">{{ certificatePayment.payment_method || '---' }}</span></div>
            <div class="ef-field"><label>Entidad Empresa</label><span class="ef-readonly">{{ certificatePayment.business_entity || '---' }}</span></div>
            <div class="ef-field"><label>Cuenta Bancaria</label><span class="ef-readonly">{{ [certificatePayment.bank_name, certificatePayment.account_number].filter(Boolean).join(' - ') || '---' }}</span></div>
            <div class="ef-field"><label>N. Operacion</label><span class="ef-readonly mono">{{ certificatePayment.transaction_code || '---' }}</span></div>
            <div class="ef-field"><label>Fecha de Pago</label><span class="ef-readonly">{{ certificatePayment.payment_date ? fmt.formatDate(certificatePayment.payment_date) : '---' }}</span></div>
          </div>
        </div>

        <!-- Sin pago aun (registro) o editando el pago existente -->
        <div v-else class="ef-inicial-card">
          <div class="ef-inicial-top">
            <div class="ef-inicial-info">
              <span class="ef-bar-label">{{ editingAdicional ? 'Editar Pago de Certificado' : 'Pago de Certificado' }}</span>
              <div class="ef-cert-amount">
                <span class="fw700 mono" style="font-size:16px">S/.</span>
                <input v-model.number="adicional.amount" type="number" step="0.01" min="0" class="ef-input ef-cert-amount-input mono" placeholder="50.00" />
              </div>
            </div>
            <div class="ef-inicial-actions">
              <a v-if="adicional.voucher_url" :href="adicional.voucher_url" target="_blank" class="ef-voucher-link"><i class="fa-solid fa-image"></i> Ver Voucher</a>
              <label class="ef-voucher-link" style="cursor:pointer">
                <i class="fa-solid fa-cloud-arrow-up"></i> {{ adicional.voucher_url ? 'Cambiar Voucher' : 'Adjuntar Voucher' }}
                <input type="file" accept="image/*,.pdf" style="display:none" @change="uploadAdicionalVoucher" />
              </label>
            </div>
          </div>
          <div class="ef-form-row mt12">
            <div class="ef-field">
              <label>Tipo Moneda</label>
              <select v-model="adicional.cat_currency" class="ef-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Medio de Pago</label>
              <select v-model="adicional.cat_payment_medium" class="ef-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Entidad Empresa</label>
              <select v-model="adicional.cat_business_entity" class="ef-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Cuenta Bancaria</label>
              <select v-model="adicional.bank_account_id" class="ef-select" :disabled="!adicional.cat_business_entity">
                <option :value="null">{{ adicional.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                <option v-for="a in filteredAccounts(adicional.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>N. Operacion</label>
              <input v-model="adicional.transaction_code" class="ef-input" placeholder="Numero de operacion" />
            </div>
            <div class="ef-field">
              <label>Fecha de Pago</label>
              <input v-model="adicional.payment_date" type="date" class="ef-input" :max="todayIso" />
            </div>
          </div>
          <!-- Edicion: justificacion obligatoria (queda en el historial) -->
          <div v-if="editingAdicional" class="ef-cert-just">
            <label class="ef-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion del cambio (obligatorio)</label>
            <textarea v-model="adicionalJust" class="ef-textarea" rows="2" placeholder="Explica el motivo de la edicion..."></textarea>
          </div>
          <div class="ef-cert-actions">
            <template v-if="editingAdicional">
              <button class="ef-action-btn" @click="editingAdicional = false">Cancelar edicion</button>
              <button class="ef-btn-primary" :disabled="!canSaveAdicional || !adicionalJust.trim() || saving" @click="$emit('update-additional', { payment_id: certificatePayment.payment_id, ...adicional, justificacion: adicionalJust })">
                <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
                {{ saving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </template>
            <template v-else>
              <p class="ef-cert-hint"><i class="fa-solid fa-circle-info"></i> Al registrar el pago se activara la etiqueta <strong>Certificar</strong> para este becado.</p>
              <button class="ef-btn-primary" :disabled="!canSaveAdicional || saving" @click="$emit('save-additional', { ...adicional })">
                <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                {{ saving ? 'Registrando...' : 'Registrar Pago' }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <template v-if="!isBeca || becaTab === 'pago'">
      <h6 v-if="!isBeca" class="ef-sub-title"><i class="fa-solid fa-money-bill-wave"></i> Pago al Contado</h6>
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
        <div class="ef-field">
          <label>Fecha de Pago</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment?.payment_date ? fmt.formatDate(lastPayment.payment_date) : '---' }}</span>
          <input v-else v-model="form.payment_date" type="date" class="ef-input" :max="todayIso" />
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
        <div class="ef-field">
          <label>Fecha de Pago</label>
          <input v-model="form.payment_date" type="date" class="ef-input" :max="todayIso" />
        </div>
      </div>
      </template>
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
            <div class="ef-field">
              <label>Fecha de Pago</label>
              <input v-model="inicial._payment_date" type="date" class="ef-input" :max="todayIso" :disabled="inicial.status === 'paid' && !isEditing" />
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
          <div class="ef-toolbar-actions">
            <button
              v-if="planStatus === 'pendiente' && hasReschedulableCuotas"
              class="ef-btn-sm ef-btn-outline"
              @click="$emit('open-reschedule')"
              title="Reprogramar fechas de cuotas pendientes"
            ><i class="fa-solid fa-calendar-days"></i> Reprogramar</button>
            <button class="ef-btn-sm ef-btn-teal" @click="$emit('add-cuota')"><i class="fa-solid fa-plus"></i> Agregar Cuota</button>
          </div>
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
              <th style="width:120px">Fecha Pago</th>
              <th class="tc" style="width:60px">Voucher</th>
              <th class="tc" style="width:40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, idx) in cuotas" :key="idx" :class="fmt.cuotaRowClass(c)">
              <td class="fw700 tc">{{ c.installment_number || (idx + 1) }}</td>
              <td v-if="c._isNew || (c.status === 'paid' && isEditing)">
                <input v-model.number="c.amount" type="number" step="0.01" class="ef-input tr mono" placeholder="0.00" />
              </td>
              <td v-else class="tr mono fw700 ef-amount-cell">
                <span>S/. {{ fmt.formatMoney(c.amount) }}</span>
                <button
                  v-if="canEditAmount(c)"
                  class="ef-amount-edit"
                  @click="$emit('edit-cuota-amount', c)"
                  title="Editar monto"
                ><i class="fa-solid fa-pen"></i></button>
              </td>
              <td v-if="c._isNew || (c.status === 'paid' && isEditing)">
                <BaseDatePicker v-model="c.due_date" placeholder="dd/mm/aaaa" class="ef-datepicker" />
              </td>
              <td v-else :class="{ 'c-red fw700': fmt.isOverdue(c.due_date) && c.status !== 'paid' }">{{ fmt.formatDate(c.due_date) }}</td>
              <td class="tc"><span class="ef-pill" :class="fmt.cuotaStatusPill(c, planStatus)">{{ fmt.cuotaStatusLabel(c, planStatus) }}</span></td>
              <td>
                <select v-model="c._cat_currency" class="ef-select-sm" :disabled="(c.status === 'paid' && !isEditing) || planStatus === 'borrador'">
                  <option :value="null">---</option>
                  <option v-for="cur in catalogs.catCurrency" :key="cur.id" :value="cur.id">{{ cur.abbreviation || cur.description }}</option>
                </select>
              </td>
              <td>
                <select v-model="c._cat_payment_medium" class="ef-select-sm" :disabled="(c.status === 'paid' && !isEditing) || planStatus === 'borrador'">
                  <option :value="null">---</option>
                  <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
                </select>
              </td>
              <td>
                <select v-model="c._cat_business_entity" class="ef-select-sm" :disabled="(c.status === 'paid' && !isEditing) || planStatus === 'borrador'">
                  <option :value="null">---</option>
                  <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
                </select>
              </td>
              <td>
                <select v-model="c._bank_account_id" class="ef-select-sm" :disabled="(c.status === 'paid' && !isEditing) || planStatus === 'borrador' || !c._cat_business_entity">
                  <option :value="null">---</option>
                  <option v-for="a in filteredAccounts(c._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }}</option>
                </select>
              </td>
              <td>
                <input v-model="c._transaction_code" class="ef-input" placeholder="---" :disabled="(c.status === 'paid' && !isEditing) || planStatus === 'borrador'" />
              </td>
              <td>
                <input v-model="c._payment_date" type="date" class="ef-input" :max="todayIso" :disabled="(c.status === 'paid' && !isEditing) || planStatus === 'borrador'" />
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
      <template v-if="mode === 'view' && !isEditing && !editingAdicional">
        <!-- Becado: la edicion solo aplica al nav Adicionales (su Pago es beca,
             no hay datos financieros que editar). Requiere pago ya registrado. -->
        <button v-if="!isBeca" class="ef-action-btn" @click="$emit('start-edit')">
          <i class="fa-solid fa-pen-to-square"></i> Editar datos
        </button>
        <button v-else-if="becaTab === 'adicionales' && certificatePayment" class="ef-action-btn" @click="startEditAdicional">
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
      :can-advance="confirmStep === 0 ? true : sapState.valid"
      :loading="saving"
      confirm-label="Confirmar y Enviar"
      confirm-icon="fa-paper-plane"
      @cancel="showConfirmStepper = false; confirmStep = 0"
      @confirm="onConfirmSend"
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
        <EmailPreviewStep
          :enrollment-id="enrollmentId"
          :active="confirmStep === 1"
          :activation-date="activationDate"
          collect-sap-credentials
          @update:sap="sapState = $event"
        />
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
import { ref, reactive, computed, inject, watch } from 'vue'
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
  programChildren: { type: Array, default: () => [] },
  // Solo para membresias: la fecha que el usuario eligio en el datepicker del
  // parent. Se propaga al EmailPreviewStep para que el preview muestre las
  // fechas correctas antes de persistir el confirm.
  activationDate: { type: String, default: null }
})

const emit = defineEmits([
  'start-edit', 'cancel-edit', 'save-edit',
  'confirm-payment', 'confirm-plan', 'save-cuotas',
  'add-cuota', 'remove-cuota', 'reject-enrollment',
  'toggle-validation',
  'change-edition',
  'confirm-cuota',
  'open-reschedule',
  'edit-cuota-amount',
  'save-additional',
  'update-additional'
])

// Estado de credenciales SAP que emite el EmailPreviewStep. `valid` arranca en
// true (cursos no-SAP no exigen nada); el preview lo pone en false si es SAP
// online y faltan credenciales, bloqueando el boton "Confirmar y Enviar".
const sapState = ref({ isSapOnline: false, sapUsername: '', sapPassword: '', valid: true })

// Reenvia el evento de confirmacion al padre adjuntando las credenciales SAP
// (el padre las pasa a sendConfirmationEmail). En cursos no-SAP van vacias.
function onConfirmSend () {
  const sapCreds = sapState.value.isSapOnline
    ? { sapUsername: sapState.value.sapUsername, sapPassword: sapState.value.sapPassword }
    : {}
  emit(isContado.value ? 'confirm-payment' : 'confirm-plan', sapCreds)
}

// Habilita la edicion del monto de una cuota cuando: ya existe en BD (no _isNew),
// no esta paga, y el plan ya paso de borrador (esta en gestion FICO).
function canEditAmount (c) {
  if (!c || c._isNew) return false
  if (c.status === 'paid') return false
  if (props.planStatus === 'borrador') return false
  return true
}

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

const hasLaptopPromo = computed(() => fmt.hasLaptopPromo(props.enrollment))

const inicial = computed(() => props.installments.find(i => i.installment_number === 0 || i.is_reserva) || null)
const cuotas = computed(() => props.installments.filter(i => i.installment_number !== 0 && !i.is_reserva))
const cuotasTotal = computed(() => cuotas.value.reduce((sum, c) => sum + (Number(c.amount) || 0), 0))

const planStatus = computed(() => {
  const conf = (props.enrollment?.confirmation || '').toLowerCase()
  if (conf.includes('confirm') || conf.includes('aprob')) return 'pendiente'
  return 'borrador'
})

const isBeca = computed(() => total.value === 0 && discount.value > 0)

// --- Adicionales (pago del certificado del becado) ---
const becaTab = ref('pago')
const adicional = reactive({
  amount: 50,
  cat_currency: null,
  cat_payment_medium: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: '',
  payment_date: new Date().toISOString().slice(0, 10),
  voucher_url: null
})
const certificatePayment = computed(() => props.detail?.additional_payments?.[0] || null)
const canSaveAdicional = computed(() =>
  Number(adicional.amount) > 0 && adicional.cat_currency && adicional.cat_payment_medium
)

// Edicion del pago de certificado ya registrado: prellena el formulario con los
// valores actuales (el detalle trae los IDs crudos ademas de los labels).
const editingAdicional = ref(false)
const adicionalJust = ref('')

function startEditAdicional () {
  const p = certificatePayment.value
  if (!p) return
  Object.assign(adicional, {
    amount: Number(p.amount) || 50,
    cat_currency: p.cat_currency || null,
    cat_payment_medium: p.cat_method_payment || null,
    cat_business_entity: p.cat_business_entity || null,
    bank_account_id: p.bank_account_id || null,
    transaction_code: p.transaction_code || '',
    payment_date: p.payment_date ? String(p.payment_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    voucher_url: p.evidence_url || null
  })
  adicionalJust.value = ''
  editingAdicional.value = true
}

// Al refrescar el detalle (guardado exitoso) se cierra el modo edicion.
watch(() => props.detail, () => { editingAdicional.value = false })

async function uploadAdicionalVoucher (event) {
  const file = event.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.data?.url) {
      adicional.voucher_url = res.data.url
      toast.success('Voucher subido')
    }
  } catch {
    toast.error('Error al subir voucher')
  }
  event.target.value = ''
}

const todayIso = computed(() => new Date().toISOString().slice(0, 10))
const canConfirmContado = computed(() => isBeca.value || (props.form.cat_currency && props.form.cat_payment_medium))
const hasReschedulableCuotas = computed(() => cuotas.value.some(c => c.status !== 'paid' && Number(c.cat_status) !== 4454))

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

// Solo considera convalidado cuando el tipo es same/cross_edition.
// El tipo 'edition_override' significa "se inscribe pero en otra edicion" (no es convalidar).
const isValidated = (childVersionId) => props.validations.some(v =>
  v.child_version_id === childVersionId &&
  v.validation_type !== 'edition_override'
)

function getCustomEditionLabel (child) {
  const val = props.validations.find(v => v.child_version_id === child.child_program_version_id)
  if (val?.custom_edition_id && child.editions?.length) {
    const ed = child.editions.find(e => e.edition_id === val.custom_edition_id)
    return ed ? `${ed.code} - ${formatEdDate(ed.start_date)}` : null
  }
  return null
}

function getCustomEditionId (childVersionId) {
  const val = props.validations.find(v => v.child_version_id === childVersionId && v.custom_edition_id)
  return val?.custom_edition_id || null
}

// Fecha de la edicion del enrollment padre (la que se usaria para "misma edicion").
// Se obtiene desde props.detail.start_date o props.enrollment.start_date.
function getParentEditionDate () {
  return props.detail?.start_date || props.enrollment?.start_date || null
}

function formatEdDate (d) {
  if (!d) return ''
  return fmt.formatDate(d)
}

// Etiqueta para mostrar en columna Edicion cuando NO se eligio una distinta.
// Devuelve "Misma edicion (DD/MM/YYYY)" usando la fecha del enrollment padre.
function sameEditionLabel () {
  const d = getParentEditionDate()
  if (!d) return 'Misma edicion'
  return `Misma edicion (${formatEdDate(d)})`
}

// Indica si la edicion del padre incluye este modulo en su arbol.
// Si NO esta en el arbol, "Misma edicion" no aplica - el operador debe elegir una.
function isInParentTree (child) {
  // Compatibilidad: si el backend no envia el campo (data vieja), asumimos que SI esta.
  if (typeof child?.is_in_parent_tree === 'undefined') return true
  return !!child.is_in_parent_tree
}

// True cuando el modulo NO esta en arbol Y el operador no eligio una edicion custom.
// En este estado, el confirm pago se bloquea hasta que el operador decida.
function needsEditionDecision (child) {
  if (isInParentTree(child)) return false
  return !getCustomEditionId(child.child_program_version_id)
}
</script>

<style scoped>
.ef-section {
  background: transparent;
}

.ef-title {
  display: none;
}

/* Laptop promo banner: indica que el alumno traera laptop como beneficio */
.ef-laptop-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #ECFEFF 0%, #F0F9FF 100%);
  border: 1px solid #A5F3FC;
  border-left: 3px solid #0891B2;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 14px;
}
.ef-laptop-banner > i {
  font-size: 18px;
  color: #0891B2;
  flex-shrink: 0;
}
.ef-laptop-banner-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.35;
}
.ef-laptop-banner-text strong {
  font-size: 12.5px;
  font-weight: 700;
  color: #155E75;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.ef-laptop-banner-text span {
  font-size: 11.5px;
  color: #0E7490;
}
[data-coreui-theme="dark"] .ef-laptop-banner {
  background: rgba(8,145,178,0.12);
  border-color: rgba(8,145,178,0.4);
  border-left-color: #22D3EE;
}
[data-coreui-theme="dark"] .ef-laptop-banner > i { color: #22D3EE; }
[data-coreui-theme="dark"] .ef-laptop-banner-text strong { color: #67E8F9; }
[data-coreui-theme="dark"] .ef-laptop-banner-text span { color: #A5F3FC; }

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

/* Celda de monto con lapiz inline para editar */
.ef-amount-cell {
  position: relative;
  white-space: nowrap;
}
.ef-amount-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 6px;
  border: none;
  background: transparent;
  color: #A0A099;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  transition: color .15s, background .15s;
  vertical-align: middle;
}
.ef-amount-edit:hover {
  color: #6366F1;
  background: rgba(99, 102, 241, 0.08);
}

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

/* Adicionales: pago del certificado del becado */
.ef-cert-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px;
  background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
}
.ef-cert-amount { display: inline-flex; align-items: center; gap: 8px; }
.ef-cert-just { margin-top: 14px; }
.ef-cert-amount-input { width: 110px; text-align: right; font-weight: 700; }
.ef-cert-actions {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-top: 16px;
}
.ef-cert-hint {
  margin: 0; font-size: 12px; color: #737373;
  display: inline-flex; align-items: center; gap: 6px;
}
.ef-cert-hint i { color: #A3A3A3; }

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
.ef-btn-outline {
  background: #fff; color: #4338CA; border: 1px solid #C7D2FE;
}
.ef-btn-outline:hover { background: #EEF2FF; opacity: 1; }
.ef-toolbar-actions { display: inline-flex; gap: 8px; align-items: center; }

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

.ef-edition-warn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #B91C1C;
  background: #FEF2F2;
  border: 1px dashed #FCA5A5;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.ef-edition-warn i { font-size: 11px; }
.ef-edition-warn:hover { background: #FEE2E2; border-color: #F87171; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .ef-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .ef-bar-sep { background: #2A2A22; }
[data-coreui-theme="dark"] .ef-bar-label { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-bar-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-tooltip {
  background: #F4F4F0;
  color: #14140F;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
}
[data-coreui-theme="dark"] .ef-tooltip::after { border-top-color: #F4F4F0; }

[data-coreui-theme="dark"] .ef-sub-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-sub-title i { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-contado-card { background: #1F1F1A; }
[data-coreui-theme="dark"] .ef-voucher-link {
  background: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-voucher-link:hover { background: #3A3A33; }
[data-coreui-theme="dark"] .ef-voucher-sm { color: #A0A099; }
[data-coreui-theme="dark"] .ef-voucher-sm:hover { color: #F4F4F0; }

[data-coreui-theme="dark"] .ef-upload-btn { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-upload-btn:hover {
  background: rgba(13,148,136,0.16);
  color: #2DD4BF;
}
[data-coreui-theme="dark"] .ef-btn-confirm-cuota {
  background: rgba(16,185,129,0.16);
  border-color: rgba(16,185,129,0.4);
  color: #34D399;
}
[data-coreui-theme="dark"] .ef-btn-confirm-cuota:hover { background: #10B981; color: #fff; }

[data-coreui-theme="dark"] .ef-field label { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-readonly {
  color: #F4F4F0;
  border-bottom-color: #1F1F1A;
}
[data-coreui-theme="dark"] .ef-input,
[data-coreui-theme="dark"] .ef-select,
[data-coreui-theme="dark"] .ef-select-sm {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-input:focus,
[data-coreui-theme="dark"] .ef-select:focus,
[data-coreui-theme="dark"] .ef-select-sm:focus {
  border-color: #F4F4F0;
  box-shadow: 0 0 0 3px rgba(255,255,255,.06);
}
[data-coreui-theme="dark"] .ef-input:disabled,
[data-coreui-theme="dark"] .ef-select:disabled,
[data-coreui-theme="dark"] .ef-select-sm:disabled {
  background: #1F1F1A;
  color: #6F6F66;
}
[data-coreui-theme="dark"] .ef-datepicker :deep(input) {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}

[data-coreui-theme="dark"] .ef-cuota-tabs { border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .ef-cuota-tab { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-cuota-tab:hover { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-cuota-tab.active {
  color: #F4F4F0;
  border-bottom-color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-tab-badge {
  background: #2A2A22;
  color: #A0A099;
}

[data-coreui-theme="dark"] .ef-inicial-card { background: #1F1F1A; }

[data-coreui-theme="dark"] .ef-cert-badge {
  background: rgba(16,185,129,0.16);
  border-color: rgba(16,185,129,0.4);
  color: #34D399;
}
[data-coreui-theme="dark"] .ef-cert-hint { color: #A0A099; }
[data-coreui-theme="dark"] .ef-cert-hint i { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-notice {
  background: rgba(245,158,11,0.14);
  color: #FBBF24;
}
[data-coreui-theme="dark"] .ef-notice i { color: #FBBF24; }

[data-coreui-theme="dark"] .ef-btn-teal { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .ef-btn-outline {
  background: #1A1A14;
  color: #A78BFA;
  border-color: rgba(167,139,250,0.4);
}
[data-coreui-theme="dark"] .ef-btn-outline:hover { background: rgba(99,102,241,0.16); }

[data-coreui-theme="dark"] .ef-table { color: #D4D4CC; }
[data-coreui-theme="dark"] .ef-table thead th {
  background: #1F1F1A;
  color: #6F6F66;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .ef-table tbody td { border-bottom-color: #1F1F1A; }
[data-coreui-theme="dark"] .ef-table tbody tr:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .ef-table .cuota-paid td { background: rgba(16,185,129,0.08); }
[data-coreui-theme="dark"] .ef-table .cuota-overdue td { background: rgba(239,68,68,0.08); }
[data-coreui-theme="dark"] .ef-total-row td {
  background: #1F1F1A;
  border-top-color: #2A2A22;
}
[data-coreui-theme="dark"] .ef-empty-row { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-btn-del { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-btn-del:hover {
  background: rgba(239,68,68,0.16);
  color: #F87171;
}

[data-coreui-theme="dark"] .pill-green { background: rgba(16,185,129,0.16); color: #34D399; }
[data-coreui-theme="dark"] .pill-amber { background: rgba(245,158,11,0.16); color: #FBBF24; }
[data-coreui-theme="dark"] .pill-red   { background: rgba(239,68,68,0.16); color: #F87171; }
[data-coreui-theme="dark"] .pill-muted { background: #2A2A22; color: #A0A099; }

[data-coreui-theme="dark"] .ef-empty { color: #6F6F66; }

[data-coreui-theme="dark"] .ef-edit-panel { border-color: #2A2A22; }
[data-coreui-theme="dark"] .ef-edit-head {
  background: #1F1F1A;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .ef-edit-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-edit-title i { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-edit-close { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-edit-close:hover { color: #F4F4F0; background: #2A2A22; }

[data-coreui-theme="dark"] .ef-warn-label { color: #FBBF24; }
[data-coreui-theme="dark"] .ef-warn-label i { color: #FBBF24; }

[data-coreui-theme="dark"] .ef-textarea {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-textarea:focus {
  border-color: #F4F4F0;
  box-shadow: 0 0 0 3px rgba(255,255,255,.06);
}

[data-coreui-theme="dark"] .ef-footer { border-top-color: #2A2A22; }

[data-coreui-theme="dark"] .ef-action-btn {
  background: #1A1A14;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .ef-action-btn:hover {
  border-color: #F4F4F0;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-btn-primary { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .ef-btn-primary:hover { background: #E4E4DD; }

[data-coreui-theme="dark"] .ef-btn-observe {
  background: rgba(245,158,11,0.14);
  border-color: rgba(245,158,11,0.4);
  color: #FBBF24;
}
[data-coreui-theme="dark"] .ef-btn-observe:hover {
  background: rgba(245,158,11,0.22);
  border-color: rgba(245,158,11,0.6);
}

[data-coreui-theme="dark"] .ef-observe-banner {
  background: rgba(245,158,11,0.14);
  color: #FBBF24;
}
[data-coreui-theme="dark"] .ef-observe-banner i { color: #FBBF24; }
[data-coreui-theme="dark"] .ef-observe-field label { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-observe-textarea {
  background: #14140F;
  border-color: rgba(245,158,11,0.4);
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ef-observe-textarea::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-observe-textarea:focus {
  border-color: #FBBF24;
  box-shadow: 0 0 0 3px rgba(245,158,11,.16);
}

[data-coreui-theme="dark"] .ef-confirm-row { background: #1F1F1A; }
[data-coreui-theme="dark"] .ef-confirm-label { color: #6F6F66; }
[data-coreui-theme="dark"] .ef-confirm-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-confirm-note {
  background: #1F1F1A;
  color: #A0A099;
}

[data-coreui-theme="dark"] .ef-validation-block { border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .ef-edition-link { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-edition-link:hover { color: #2DD4BF; }
[data-coreui-theme="dark"] .ef-edition-warn {
  background: rgba(239,68,68,0.16);
  border-color: rgba(239,68,68,0.4);
  color: #F87171;
}
[data-coreui-theme="dark"] .ef-edition-warn:hover {
  background: rgba(239,68,68,0.22);
  border-color: rgba(239,68,68,0.6);
}

[data-coreui-theme="dark"] .c-green { color: #34D399; }
[data-coreui-theme="dark"] .c-blue  { color: #60A5FA; }
[data-coreui-theme="dark"] .c-red { color: #F87171; }
[data-coreui-theme="dark"] .c-muted { color: #6F6F66; }
</style>
