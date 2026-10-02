<template>
  <section class="ef-section">
        <!-- Badge de promo: el alumno debe traer laptop como beneficio de la inscripcion -->
    <div v-if="hasLaptopPromo" class="ef-laptop-banner">
      <i class="fa-solid fa-laptop" aria-hidden="true"></i>
      <div class="ef-laptop-banner-text">
        <strong>Traera laptop</strong>
        <span>Inscripcion con promo LAPTOP — confirmar que el alumno trae su equipo</span>
      </div>
    </div>

    <!-- Financial summary bar -->
    <div class="ef-bar">
      <div class="ef-bar-item">
        <span class="ef-bar-label">Precio Lista</span>
        <span class="ef-bar-value">{{ saleSymbol }} {{ fmt.formatMoney(listPrice) }}</span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item ef-discount-wrap">
        <span class="ef-bar-label">Descuento</span>
        <span
          class="ef-bar-value c-red ef-has-tip"
          @mouseenter="showDiscountTip = true"
          @mouseleave="showDiscountTip = false"
        >
          - {{ saleSymbol }} {{ fmt.formatMoney(discount) }}
          <i v-if="discountLines.length" class="fa-solid fa-circle-info ef-tip-icon"></i>
          <div v-if="showDiscountTip && discountLines.length" class="ef-tooltip">
            <div v-for="(d, i) in discountLines" :key="i" class="ef-tip-row">{{ d }}</div>
          </div>
        </span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item">
        <span class="ef-bar-label">Total</span>
        <span class="ef-bar-value fw700">{{ saleSymbol }} {{ fmt.formatMoney(total) }}</span>
      </div>
      <div v-if="reserva > 0" class="ef-bar-sep"></div>
      <div v-if="reserva > 0" class="ef-bar-item">
        <span class="ef-bar-label">Inicial</span>
        <span class="ef-bar-value c-blue">{{ saleSymbol }} {{ fmt.formatMoney(reserva) }}</span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item">
        <span class="ef-bar-label">Pagado</span>
        <span class="ef-bar-value c-green">{{ saleSymbol }} {{ fmt.formatMoney(paid) }}</span>
      </div>
      <div class="ef-bar-sep"></div>
      <div class="ef-bar-item">
        <span class="ef-bar-label">Saldo</span>
        <span class="ef-bar-value" :class="balance > 0 ? 'c-red fw700' : 'c-green'">{{ saleSymbol }} {{ fmt.formatMoney(balance) }}</span>
      </div>
    </div>

    <!-- Convalidacion -->
    <div v-if="validations.length > 0" class="ef-validation-block">
      <h6 class="ef-sub-title"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Convalidacion</h6>
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
              <span v-if="isValidated(child.child_program_version_id)" class="ds-pill warn">Convalidar</span>
              <span v-else class="ds-pill ok">Inscribir</span>
            </td>
            <td>
              <template v-if="isValidated(child.child_program_version_id)">&mdash;</template>
              <template v-else>
                <!-- Hijo NO esta en el arbol del padre Y no tiene custom edition: requiere accion -->
                <span v-if="needsEditionDecision(child)" class="ef-edition-warn"
                  @click="editingEdition[child.child_program_version_id] = true">
                  <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                  Falta elegir edicion
                </span>
                <span v-else-if="!editingEdition[child.child_program_version_id]"
                  class="ef-edition-link"
                  @click="editingEdition[child.child_program_version_id] = true">
                  {{ getCustomEditionLabel(child) || treeEditionLabel(child) }}
                  <i class="fa-solid fa-pen ef-edition-pen" aria-hidden="true"></i>
                </span>
                <select v-if="editingEdition[child.child_program_version_id]" class="ef-select-sm ef-select-edition"
                  :value="getCustomEditionId(child.child_program_version_id)"
                  @change="$emit('change-edition', { childVersionId: child.child_program_version_id, editionId: Number($event.target.value) || null }); editingEdition[child.child_program_version_id] = false"
                  @blur="editingEdition[child.child_program_version_id] = false">
                  <option :value="null" :disabled="!isInParentTree(child)">
                    {{ isInParentTree(child) ? treeEditionLabel(child) : 'Seleccionar edicion...' }}
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
                <i :class="isValidated(child.child_program_version_id) ? 'fa-solid fa-xmark' : 'fa-solid fa-check'" aria-hidden="true"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CONTADO -->
    <div v-if="isContado" class="ef-payment">
      <!-- Nav Pago / Adicionales: becado (pago del certificado) o pago suelto
           de reasignacion ya registrado -->
      <div v-if="showAdicionales" class="ef-cuota-tabs">
        <button :class="['ef-cuota-tab', { active: becaTab === 'pago' }]" @click="becaTab = 'pago'">
          <i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i> Pago
        </button>
        <button :class="['ef-cuota-tab', { active: becaTab === 'adicionales' }]" @click="becaTab = 'adicionales'">
          <i class="fa-solid fa-file-invoice" aria-hidden="true"></i> Adicionales
        </button>
      </div>

      <!-- Adicionales: pago del certificado del becado o de reasignacion -->
      <div v-if="showAdicionales && becaTab === 'adicionales'" class="ef-tab-body">
        <!-- Pago ya registrado: solo lectura -->
        <div v-if="certificatePayment && !editingAdicional" class="ef-inicial-card">
          <div class="ef-inicial-top">
            <div class="ef-inicial-info">
              <span class="ef-bar-label">{{ adicionalLabel }}</span>
              <span class="ef-amount-lg mono">{{ currencySymbol(certificatePayment.cat_currency, catalogs.catCurrency) }} {{ fmt.formatMoney(certificatePayment.amount) }}</span>
            </div>
            <div class="ef-inicial-actions">
              <span class="ef-cert-badge"><i class="fa-solid" :class="adicionalMeta.icon"></i> {{ adicionalMeta.chip }}</span>
              <a v-if="certificatePayment.evidence_url" :href="certificatePayment.evidence_url" target="_blank" class="ef-voucher-link"><i class="fa-solid fa-image" aria-hidden="true"></i> Ver Voucher</a>
              <span v-else class="ef-muted-note">Sin voucher adjunto</span>
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
              <span class="ef-bar-label">{{ editingAdicional ? 'Editar ' + adicionalLabel : adicionalLabel }}</span>
              <div class="ef-cert-amount">
                <span class="ef-amount-lg mono">{{ currencySymbol(adicional.cat_currency, catalogs.catCurrency) }}</span>
                <input v-model.number="adicional.amount" type="number" step="0.01" min="0" class="ds-input ef-cert-amount-input mono" placeholder="50.00" />
              </div>
            </div>
            <div class="ef-inicial-actions">
              <a v-if="adicional.voucher_url" :href="adicional.voucher_url" target="_blank" class="ef-voucher-link"><i class="fa-solid fa-image" aria-hidden="true"></i> Ver Voucher</a>
              <label class="ef-voucher-link">
                <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> {{ adicional.voucher_url ? 'Cambiar Voucher' : 'Adjuntar Voucher' }}
                <input type="file" accept="image/*,.pdf" class="ef-file-input" @change="uploadAdicionalVoucher" />
              </label>
            </div>
          </div>
          <div class="ef-form-row mt12">
            <div class="ef-field">
              <label>Tipo Moneda</label>
              <select v-model="adicional.cat_currency" class="ds-input">
                <option :value="null">Seleccionar...</option>
                <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Medio de Pago</label>
              <select v-model="adicional.cat_payment_medium" class="ds-input">
                <option :value="null">Seleccionar...</option>
                <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Entidad Empresa</label>
              <select v-model="adicional.cat_business_entity" class="ds-input">
                <option :value="null">Seleccionar...</option>
                <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Cuenta Bancaria</label>
              <select v-model="adicional.bank_account_id" class="ds-input" :disabled="!adicional.cat_business_entity">
                <option :value="null">{{ adicional.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                <option v-for="a in filteredAccounts(adicional.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>N. Operacion</label>
              <input v-model="adicional.transaction_code" class="ds-input" placeholder="Numero de operacion" />
            </div>
            <div class="ef-field">
              <label>Fecha de Pago</label>
              <input v-model="adicional.payment_date" type="date" class="ds-input" :max="todayIso" />
            </div>
          </div>
          <!-- Edicion: justificacion obligatoria (queda en el historial) -->
          <div v-if="editingAdicional" class="ef-cert-just">
            <label class="ef-warn-label"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Justificacion del cambio (obligatorio)</label>
            <textarea v-model="adicionalJust" class="ds-input" rows="2" placeholder="Explica el motivo de la edicion..."></textarea>
          </div>
          <div class="ef-cert-actions">
            <template v-if="editingAdicional">
              <button type="button" class="btn-exec btn-exec-outline" @click="editingAdicional = false">Cancelar edicion</button>
              <button type="button" class="btn-exec btn-exec-primary" :disabled="!canSaveAdicional || !adicionalJust.trim() || saving" @click="$emit('update-additional', { payment_id: certificatePayment.payment_id, ...adicional, justificacion: adicionalJust })">
                <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
                {{ saving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </template>
            <template v-else>
              <p class="ef-cert-hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Al registrar el pago se activara la etiqueta <strong>Certificar</strong> para este becado.</p>
              <button type="button" class="btn-exec btn-exec-primary" :disabled="!canSaveAdicional || saving" @click="$emit('save-additional', { ...adicional })">
                <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                {{ saving ? 'Registrando...' : 'Registrar Pago' }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <template v-if="!showAdicionales || becaTab === 'pago'">
      <h6 v-if="!isBeca" class="ef-sub-title"><i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i> Pago al Contado</h6>
      <div class="ef-contado-card">
        <div class="ef-contado-amount">
          <span class="ef-bar-label">Monto</span>
          <span class="ef-amount-lg mono">{{ saleSymbol }} {{ fmt.formatMoney(total) }}</span>
        </div>
        <div class="ef-voucher-links">
          <a v-for="(url, i) in voucherUrls" :key="url" :href="url" target="_blank" class="ef-voucher-link">
            <i class="fa-solid fa-image" aria-hidden="true"></i> Ver Voucher{{ voucherUrls.length > 1 ? ` ${i + 1}` : '' }}
          </a>
          <span v-if="!voucherUrls.length" class="ef-muted-note">Sin voucher adjunto</span>
        </div>
      </div>

      <!-- View mode fields -->
      <div v-if="mode === 'view'" class="ef-form-row mt12">
        <div class="ef-field">
          <label>Tipo Moneda</label>
          <span v-if="!isEditing" class="ef-readonly">{{ detail?.currency_symbol || '---' }}</span>
          <select v-else v-model="form.cat_currency" class="ds-input">
            <option :value="null">Seleccionar...</option>
            <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Medio de Pago</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment?.payment_method || '---' }}</span>
          <select v-else v-model="form.cat_payment_medium" class="ds-input">
            <option :value="null">Seleccionar...</option>
            <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Entidad Empresa</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment?.business_entity || '---' }}</span>
          <select v-else v-model="form.cat_business_entity" class="ds-input">
            <option :value="null">Seleccionar...</option>
            <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Cuenta Bancaria</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment ? [lastPayment.bank_name, lastPayment.bank_currency, lastPayment.bank_account_number].filter(Boolean).join(' - ') || '---' : '---' }}</span>
          <select v-else v-model="form.bank_account_id" class="ds-input" :disabled="!form.cat_business_entity">
            <option :value="null">{{ form.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
            <option v-for="a in filteredAccounts(form.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>N. Operacion</label>
          <span v-if="!isEditing" class="ef-readonly mono">{{ lastPayment?.transaction_code || '---' }}</span>
          <input v-else v-model="form.transaction_code" class="ds-input" placeholder="Numero de operacion" />
        </div>
        <div class="ef-field">
          <label>Fecha de Pago</label>
          <span v-if="!isEditing" class="ef-readonly">{{ lastPayment?.payment_date ? fmt.formatDate(lastPayment.payment_date) : '---' }}</span>
          <input v-else v-model="form.payment_date" type="date" class="ds-input" :max="todayIso" />
        </div>
      </div>

      <!-- Cobro de una venta al contado aprobada sin pago (OS/OP). Escribe sobre
           la cuota 1 con el mismo endpoint que las cuotas de un plan, asi que la
           detraccion funciona aca sin codigo aparte. -->
      <div v-if="contadoPendiente && !isEditing" class="ef-collect mt12">
        <div class="ef-collect-head">
          <span><i class="fa-solid fa-hand-holding-dollar" aria-hidden="true"></i> Registrar el cobro</span>
          <span class="ef-collect-amount mono">{{ symbolOf(contadoPendiente) }} {{ fmt.formatMoney(contadoPendiente.amount) }}</span>
        </div>

        <div class="ef-form-row">
          <div class="ef-field">
            <label>Tipo Moneda</label>
            <select v-model="contadoPendiente._cat_currency" class="ds-input">
              <option :value="null">Seleccionar...</option>
              <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
            </select>
          </div>
          <div class="ef-field">
            <label>Medio de Pago</label>
            <select v-model="contadoPendiente._cat_payment_medium" class="ds-input">
              <option :value="null">Seleccionar...</option>
              <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
            </select>
          </div>
          <div class="ef-field">
            <label>Entidad Empresa</label>
            <select v-model="contadoPendiente._cat_business_entity" class="ds-input">
              <option :value="null">Seleccionar...</option>
              <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
            </select>
          </div>
          <div class="ef-field">
            <label>Cuenta Bancaria</label>
            <select v-model="contadoPendiente._bank_account_id" class="ds-input" :disabled="!contadoPendiente._cat_business_entity">
              <option :value="null">{{ contadoPendiente._cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
              <option v-for="a in filteredAccounts(contadoPendiente._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
            </select>
          </div>
          <div class="ef-field">
            <label>N. Operacion</label>
            <input v-model="contadoPendiente._transaction_code" class="ds-input" placeholder="Numero de operacion" />
          </div>
          <div class="ef-field">
            <label>Fecha de Pago</label>
            <input v-model="contadoPendiente._payment_date" type="date" class="ds-input" :max="todayIso" />
          </div>
        </div>

        <div class="ef-collect-actions">
          <label class="ef-file-btn" :class="{ done: contadoPendiente._voucher_url }">
            <i class="fa-solid" :class="contadoPendiente._voucher_url ? 'fa-circle-check' : 'fa-cloud-arrow-up'"></i>
            <span>{{ contadoPendiente._voucher_url ? 'Voucher cargado' : 'Subir voucher' }}</span>
            <input type="file" accept="image/*,.pdf" class="ef-file-input" @change="e => uploadVoucher(e, contadoPendiente)" />
          </label>
          <a v-if="contadoPendiente._voucher_url" :href="contadoPendiente._voucher_url" target="_blank" class="ef-file-view">Ver</a>

          <label class="ef-check">
            <input type="checkbox" :checked="!!contadoPendiente._detraction" @change="toggleDetraction(contadoPendiente)" />
            <span>La empresa aplico detraccion <small>(dos vouchers)</small></span>
          </label>

          <button
            class="btn-exec btn-exec-primary"
            :disabled="saving || !contadoPendiente._cat_currency || !contadoPendiente._cat_payment_medium || (!!contadoPendiente._detraction && !detractionValid(contadoPendiente))"
            @click="$emit('confirm-cuota', contadoPendiente)"
          >
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            {{ saving ? 'Registrando...' : 'Registrar Pago' }}
          </button>
        </div>

        <!-- Segundo deposito: solo se pide el monto detraido, el del pago se
             deriva restando y por eso la suma nunca puede descuadrar. -->
        <div v-if="contadoPendiente._detraction" class="ef-detraction-box">
          <span class="ef-detraction-title"><i class="fa-solid fa-scissors" aria-hidden="true"></i> Detraccion</span>
          <label>
            Monto detraido
            <input v-model.number="contadoPendiente._detraction.amount" type="number" step="0.01" min="0" class="ds-input tr mono" placeholder="0.00" />
          </label>
          <label>
            Cuenta (Banco de la Nacion)
            <select v-model="contadoPendiente._detraction.bank_account_id" class="ef-select-sm">
              <option :value="null">---</option>
              <option v-for="a in filteredAccounts(contadoPendiente._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }}</option>
            </select>
          </label>
          <label>
            N. Operacion
            <input v-model="contadoPendiente._detraction.transaction_code" class="ds-input" placeholder="---" />
          </label>
          <label class="ef-file-btn sm" :class="{ done: contadoPendiente._detraction._voucher_url }">
            <i class="fa-solid" :class="contadoPendiente._detraction._voucher_url ? 'fa-circle-check' : 'fa-cloud-arrow-up'"></i>
            <span>{{ contadoPendiente._detraction._voucher_url ? 'Cargado' : 'Voucher' }}</span>
            <input type="file" accept="image/*,.pdf" class="ef-file-input" @change="e => uploadVoucher(e, contadoPendiente._detraction)" />
          </label>
          <a v-if="contadoPendiente._detraction._voucher_url" :href="contadoPendiente._detraction._voucher_url" target="_blank" class="ef-file-view">Ver</a>
          <span class="ef-detraction-split" :class="{ 'c-red': !detractionValid(contadoPendiente) }">
            Pago {{ symbolOf(contadoPendiente) }} {{ fmt.formatMoney(contadoPendiente.amount - (Number(contadoPendiente._detraction.amount) || 0)) }}
            + Detracción {{ symbolOf(contadoPendiente) }} {{ fmt.formatMoney(Number(contadoPendiente._detraction.amount) || 0) }}
            = {{ symbolOf(contadoPendiente) }} {{ fmt.formatMoney(contadoPendiente.amount) }}
          </span>
        </div>
      </div>

      <!-- OS/OP: no hay datos bancarios que pedir todavia. FICO confirma contra
           la orden adjunta y la cuota queda pendiente hasta que llegue el deposito. -->
      <div v-if="mode === 'confirm' && isDocumentalSale" class="ef-doc-notice mt12">
        <i class="fa-solid fa-file-contract" aria-hidden="true"></i>
        <span>
          Venta con <strong>{{ detail?.b2b_doctype_label || 'orden documental' }}</strong>:
          el pago no ha llegado. Al confirmar, el alumno accede al campus y la cuota
          queda pendiente en Cobranzas hasta que la empresa deposite.
        </span>
      </div>

      <!-- Confirm mode fields -->
      <div v-if="mode === 'confirm' && !isDocumentalSale" class="ef-form-row mt12">
        <div class="ef-field">
          <label>Tipo Moneda</label>
          <select v-model="form.cat_currency" class="ds-input">
            <option :value="null">Seleccionar...</option>
            <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Medio de Pago</label>
          <select v-model="form.cat_payment_medium" class="ds-input">
            <option :value="null">Seleccionar...</option>
            <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Entidad Empresa</label>
          <select v-model="form.cat_business_entity" class="ds-input">
            <option :value="null">Seleccionar...</option>
            <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>Cuenta Bancaria</label>
          <select v-model="form.bank_account_id" class="ds-input" :disabled="!form.cat_business_entity">
            <option :value="null">{{ form.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
            <option v-for="a in filteredAccounts(form.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
          </select>
        </div>
        <div class="ef-field">
          <label>N. Operacion</label>
          <input v-model="form.transaction_code" class="ds-input" placeholder="Numero de operacion" />
        </div>
        <div class="ef-field">
          <label>Fecha de Pago</label>
          <input v-model="form.payment_date" type="date" class="ds-input" :max="todayIso" />
        </div>
      </div>
      </template>
    </div>

    <!-- CUOTAS -->
    <div v-else class="ef-payment">
      <div class="ef-cuota-tabs">
        <button :class="['ef-cuota-tab', { active: cuotaTab === 'inicial' }]" @click="cuotaTab = 'inicial'">
          <i class="fa-solid fa-receipt" aria-hidden="true"></i> Pago Inicial
        </button>
        <button :class="['ef-cuota-tab', { active: cuotaTab === 'cuotas' }]" @click="cuotaTab = 'cuotas'">
          <i class="fa-solid fa-calendar-days" aria-hidden="true"></i> Cuotas
          <span v-if="cuotas.length" class="ef-tab-badge">{{ cuotas.length }}</span>
        </button>
      </div>

      <!-- Pago Inicial -->
      <div v-if="cuotaTab === 'inicial'" class="ef-tab-body">
        <div v-if="inicial" class="ef-inicial-card">
          <div class="ef-inicial-top">
            <div class="ef-inicial-info">
              <span class="ef-bar-label">Pago Inicial</span>
              <span class="ef-amount-lg mono" :class="{ 'ef-inicial-removed': fmt.isCuotaAnulada(inicial) }">{{ symbolOf(inicial) }} {{ fmt.formatMoney(inicial.amount) }}</span>
              <span v-if="fmt.isCuotaAnulada(inicial)" class="ds-pill">Eliminado</span>
              <span v-else-if="inicial.status === 'paid'" class="ds-pill ok">Pagado</span>
            </div>
            <div class="ef-inicial-actions">
              <button
                v-if="canCorrectPayments && inicial.installment_id && !isEditing && !fmt.isCuotaAnulada(inicial)"
                class="btn-exec btn-exec-outline btn-sm"
                @click="$emit('correct-initial', inicial)"
                title="Corregir el monto registrado del pago inicial"
              ><i class="fa-solid fa-pen" aria-hidden="true"></i> Corregir inicial</button>
              <a v-for="(url, i) in voucherUrls" :key="url" :href="url" target="_blank" class="ef-voucher-link">
                <i class="fa-solid fa-image" aria-hidden="true"></i> Ver Voucher{{ voucherUrls.length > 1 ? ` ${i + 1}` : '' }}
              </a>
            </div>
          </div>
          <!-- Ya pagado y sin editar: se lee como dato, no como un formulario
               deshabilitado (los selects grises con el medio vacio no se leian). -->
          <dl v-if="inicial.status === 'paid' && !isEditing" class="ef-dl mt12">
            <div><dt>Moneda</dt><dd>{{ labelOf(catalogs.catCurrency, inicial._cat_currency, 'abbreviation') }}</dd></div>
            <div><dt>Medio de pago</dt><dd>{{ labelOf(catalogs.catPaymentMedium, inicial._cat_payment_medium) }}</dd></div>
            <div><dt>Entidad empresa</dt><dd>{{ labelOf(catalogs.catBusinessEntity, inicial._cat_business_entity) }}</dd></div>
            <div><dt>Cuenta bancaria</dt><dd>{{ accountLabel(inicial._bank_account_id) }}</dd></div>
            <div><dt>N° operación</dt><dd class="mono">{{ inicial._transaction_code || '—' }}</dd></div>
            <div><dt>Fecha de pago</dt><dd>{{ fmt.formatDate(inicial._payment_date) }}</dd></div>
          </dl>
          <div v-else class="ef-form-row mt12">
            <div class="ef-field">
              <label>Tipo Moneda</label>
              <select v-model="inicial._cat_currency" class="ds-input" :disabled="inicial.status === 'paid' && !isEditing">
                <option :value="null">Seleccionar...</option>
                <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Medio de Pago</label>
              <select v-model="inicial._cat_payment_medium" class="ds-input" :disabled="inicial.status === 'paid' && !isEditing">
                <option :value="null">Seleccionar...</option>
                <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Entidad Empresa</label>
              <select v-model="inicial._cat_business_entity" class="ds-input" :disabled="inicial.status === 'paid' && !isEditing">
                <option :value="null">Seleccionar...</option>
                <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>Cuenta Bancaria</label>
              <select v-model="inicial._bank_account_id" class="ds-input" :disabled="(inicial.status === 'paid' && !isEditing) || !inicial._cat_business_entity">
                <option :value="null">{{ inicial._cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                <option v-for="a in filteredAccounts(inicial._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
              </select>
            </div>
            <div class="ef-field">
              <label>N. Operacion</label>
              <input v-model="inicial._transaction_code" class="ds-input" placeholder="Numero de operacion" :disabled="inicial.status === 'paid' && !isEditing" />
            </div>
            <div class="ef-field">
              <label>Fecha de Pago</label>
              <input v-model="inicial._payment_date" type="date" class="ds-input" :max="todayIso" :disabled="inicial.status === 'paid' && !isEditing" />
            </div>
          </div>
        </div>
        <div v-else class="ef-empty"><i class="fa-solid fa-inbox" aria-hidden="true"></i><p>Sin pago inicial registrado</p></div>
      </div>

      <!-- Cuotas -->
      <div v-if="cuotaTab === 'cuotas'" class="ef-tab-body">
        <div v-if="planStatus === 'borrador'" class="ef-notice">
          <i class="fa-solid fa-file-pen" aria-hidden="true"></i>
          <div>
            <strong>Plan en Borrador</strong>
            <p>Comercial envio este plan de cuotas. Confirma el plan para gestionar los pagos.</p>
          </div>
        </div>

        <div class="ef-cuotas-toolbar">
          <span class="ef-muted-note">{{ cuotas.length }} cuota{{ cuotas.length !== 1 ? 's' : '' }}</span>
          <div class="ef-toolbar-actions">
            <button
              v-if="planStatus === 'pendiente' && hasReschedulableCuotas"
              class="btn-exec btn-exec-outline btn-sm"
              @click="$emit('open-reschedule')"
              title="Reprogramar fechas de cuotas pendientes"
            ><i class="fa-solid fa-calendar-days" aria-hidden="true"></i> Reprogramar</button>
            <button type="button" class="btn-exec btn-exec-primary btn-sm" @click="$emit('add-cuota')"><i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar Cuota</button>
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
            <template v-for="(c, idx) in cuotas" :key="idx">
            <tr :class="fmt.cuotaRowClass(c)">
              <td class="fw700 tc">{{ c.installment_number || (idx + 1) }}</td>
              <td v-if="c._isNew || (c.status === 'paid' && isEditing)">
                <input v-model.number="c.amount" type="number" step="0.01" class="ds-input tr mono" placeholder="0.00" />
              </td>
              <td v-else class="tr mono fw700 ef-amount-cell">
                <span>{{ symbolOf(c) }} {{ fmt.formatMoney(c.amount) }}</span>
                <button
                  v-if="canEditAmount(c)"
                  class="ef-amount-edit"
                  @click="$emit('edit-cuota-amount', c)"
                  title="Editar monto"
                ><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
              </td>
              <td v-if="c._isNew || (c.status === 'paid' && isEditing)">
                <BaseDatePicker v-model="c.due_date" placeholder="dd/mm/aaaa" class="ef-datepicker" />
              </td>
              <td v-else :class="{ 'c-red fw700': fmt.isOverdue(c.due_date) && c.status !== 'paid' }">{{ fmt.formatDate(c.due_date) }}</td>
              <td class="tc"><span class="ef-pill" :class="fmt.cuotaStatusPill(c, planStatus)">{{ fmt.cuotaStatusLabel(c, planStatus) }}</span></td>
              <td>
                <span v-if="isRowLocked(c)" class="ef-cell-text">{{ labelOf(catalogs.catCurrency, c._cat_currency, 'abbreviation') }}</span>
                <select v-else v-model="c._cat_currency" class="ef-select-sm">
                  <option :value="null">---</option>
                  <option v-for="cur in catalogs.catCurrency" :key="cur.id" :value="cur.id">{{ cur.abbreviation || cur.description }}</option>
                </select>
              </td>
              <td>
                <span v-if="isRowLocked(c)" class="ef-cell-text">{{ labelOf(catalogs.catPaymentMedium, c._cat_payment_medium) }}</span>
                <select v-else v-model="c._cat_payment_medium" class="ef-select-sm">
                  <option :value="null">---</option>
                  <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
                </select>
              </td>
              <td>
                <span v-if="isRowLocked(c)" class="ef-cell-text">{{ labelOf(catalogs.catBusinessEntity, c._cat_business_entity) }}</span>
                <select v-else v-model="c._cat_business_entity" class="ef-select-sm">
                  <option :value="null">---</option>
                  <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
                </select>
              </td>
              <td>
                <span v-if="isRowLocked(c)" class="ef-cell-text">{{ accountLabel(c._bank_account_id) }}</span>
                <select v-else v-model="c._bank_account_id" class="ef-select-sm" :disabled="!c._cat_business_entity">
                  <option :value="null">---</option>
                  <option v-for="a in filteredAccounts(c._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }}</option>
                </select>
              </td>
              <td>
                <span v-if="isRowLocked(c)" class="ef-cell-text mono">{{ c._transaction_code || '—' }}</span>
                <input v-else v-model="c._transaction_code" class="ds-input" placeholder="---" />
              </td>
              <td>
                <span v-if="isRowLocked(c)" class="ef-cell-text">{{ c._payment_date ? fmt.formatDate(c._payment_date) : '—' }}</span>
                <input v-else v-model="c._payment_date" type="date" class="ds-input" :max="todayIso" />
              </td>
              <td class="tc">
                <a v-if="c._voucher_url" :href="c._voucher_url" target="_blank" class="ef-voucher-sm" title="Ver voucher"><i class="fa-solid fa-image" aria-hidden="true"></i></a>
                <label v-if="planStatus !== 'borrador' && c.status !== 'paid' && !fmt.isCuotaAnulada(c)" class="ef-upload-btn" title="Subir voucher">
                  <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                  <input type="file" accept="image/*,.pdf" class="ef-file-input" @change="e => uploadVoucher(e, c)" />
                </label>
              </td>
              <td class="tc">
                <button
                  v-if="canPayCuota(c)"
                  class="ef-btn-detraction"
                  :class="{ active: !!c._detraction }"
                  @click="toggleDetraction(c)"
                  title="La empresa pago con detraccion (dos vouchers)"
                ><i class="fa-solid fa-scissors" aria-hidden="true"></i></button>
                <button
                  v-if="canPayCuota(c) && c._cat_currency && c._cat_payment_medium"
                  class="ef-btn-confirm-cuota"
                  :disabled="!!c._detraction && !detractionValid(c)"
                  @click="$emit('confirm-cuota', c)"
                  title="Confirmar pago de cuota"
                ><i class="fa-solid fa-check" aria-hidden="true"></i></button>
                <button
                  v-if="canRevertCuota(c)"
                  class="ef-btn-del"
                  @click="$emit('revert-cuota', c)"
                  title="Devolver a pendiente (el pago no ingreso)"
                ><i class="fa-solid fa-rotate-left" aria-hidden="true"></i></button>
                <button v-if="canDeleteCuota(c)" class="ef-btn-del" @click="$emit('remove-cuota', idx)" title="Eliminar"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
              </td>
            </tr>

            <!-- Detraccion (SPOT): la empresa deposita el grueso en nuestra cuenta y
                 el resto en la del Banco de la Nacion. Solo se pide el monto detraido:
                 el del pago se deriva restando, asi la suma nunca puede descuadrar. -->
            <tr v-if="c._detraction" class="ef-detraction-row">
              <td></td>
              <td colspan="11">
                <div class="ef-detraction-box">
                  <span class="ef-detraction-title"><i class="fa-solid fa-scissors" aria-hidden="true"></i> Detraccion</span>
                  <label>
                    Monto detraido
                    <input v-model.number="c._detraction.amount" type="number" step="0.01" min="0" class="ds-input tr mono" placeholder="0.00" />
                  </label>
                  <label>
                    Cuenta (Banco de la Nacion)
                    <select v-model="c._detraction.bank_account_id" class="ef-select-sm">
                      <option :value="null">---</option>
                      <option v-for="a in filteredAccounts(c._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }}</option>
                    </select>
                  </label>
                  <label>
                    N. Operacion
                    <input v-model="c._detraction.transaction_code" class="ds-input" placeholder="---" />
                  </label>
                  <label class="ef-upload-btn" title="Subir voucher de la detraccion">
                    <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                    <input type="file" accept="image/*,.pdf" class="ef-file-input" @change="e => uploadVoucher(e, c._detraction)" />
                  </label>
                  <a v-if="c._detraction._voucher_url" :href="c._detraction._voucher_url" target="_blank" class="ef-voucher-sm" title="Ver voucher de la detraccion"><i class="fa-solid fa-image" aria-hidden="true"></i></a>
                  <span class="ef-detraction-split" :class="{ 'c-red': !detractionValid(c) }">
                    Pago {{ symbolOf(c) }} {{ fmt.formatMoney(c.amount - (Number(c._detraction.amount) || 0)) }}
                    + Detracción {{ symbolOf(c) }} {{ fmt.formatMoney(Number(c._detraction.amount) || 0) }}
                    = {{ symbolOf(c) }} {{ fmt.formatMoney(c.amount) }}
                  </span>
                </div>
              </td>
            </tr>
            </template>
            <tr v-if="!cuotas.length"><td colspan="12" class="ef-empty-row">Sin cuotas programadas</td></tr>
          </tbody>
          <tfoot v-if="cuotas.length">
            <tr class="ef-total-row">
              <td class="fw700 tr">Total:</td>
              <td class="tr mono fw700 ef-amount-cell">{{ cuotasSymbol }} {{ fmt.formatMoney(cuotasTotal) }}</td>
              <td colspan="10"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Edit panel -->
    <div v-if="isEditing" class="ef-edit-panel">
      <div class="ef-edit-head">
        <div class="ef-edit-title"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar datos financieros</div>
        <button class="ef-edit-close" @click="$emit('cancel-edit')"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <div class="ef-edit-body">
        <label class="ef-warn-label"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Justificacion del cambio (obligatorio)</label>
        <textarea v-model="justificacion" class="ds-input" rows="2" placeholder="Explica el motivo de la edicion..."></textarea>
      </div>
    </div>

    <!-- Footer buttons -->
    <div class="ef-footer">
      <template v-if="mode === 'view' && !isEditing && !editingAdicional">
        <!-- En el nav Adicionales se edita el pago adicional (certificado o
             reasignacion); en Pago, los datos financieros (salvo becas, cuyo
             Pago es beca y no tiene nada que editar). -->
        <button v-if="becaTab === 'adicionales' && certificatePayment" class="btn-exec btn-exec-outline" @click="startEditAdicional">
          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar datos
        </button>
        <button v-else-if="!isBeca && (!showAdicionales || becaTab === 'pago')" class="btn-exec btn-exec-outline" @click="$emit('start-edit')">
          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar datos
        </button>
      </template>

      <template v-if="mode === 'view' && isEditing">
        <button type="button" class="btn-exec btn-exec-outline" @click="$emit('cancel-edit')">Cancelar edicion</button>
        <button type="button" class="btn-exec btn-exec-primary" :disabled="saving || !justificacion.trim()" @click="$emit('save-edit', justificacion)">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </template>

      <template v-if="mode === 'confirm' && !showConfirmStepper && !showObserveStepper">
        <button class="ef-btn-observe" @click="showObserveStepper = true">
          <i class="fa-solid fa-eye" aria-hidden="true"></i> Observar
        </button>
        <button
          v-if="isContado"
          class="btn-exec btn-exec-primary"
          :disabled="!canConfirmContado"
          @click="showConfirmStepper = true"
        >
          <i class="fa-solid" :class="isDocumentalSale ? 'fa-file-contract' : 'fa-check'"></i>
          {{ isDocumentalSale ? 'Confirmar Inscripcion (OS/OP)' : 'Confirmar Pago' }}
        </button>
        <button
          v-else-if="planStatus === 'borrador'"
          class="btn-exec btn-exec-primary"
          :disabled="!installments.length"
          @click="showConfirmStepper = true"
        >
          <i class="fa-solid fa-clipboard-check" aria-hidden="true"></i> Confirmar Pago
        </button>
        <button
          v-else-if="planStatus === 'pendiente'"
          class="btn-exec btn-exec-primary"
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
      ref="confirmStepper"
      v-model="confirmStep"
      :steps="['Confirmar Inscripcion', 'Preview Correo']"
      :can-advance="confirmStep === 0 ? true : (sapState.valid && ccState.valid)"
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
              <span class="ef-confirm-value">{{ symbolOf(inicial) }} {{ fmt.formatMoney(inicial.amount) }}</span>
            </div>
            <div class="ef-confirm-row">
              <span class="ef-confirm-label">Cuotas ({{ cuotas.length }})</span>
              <span class="ef-confirm-value">{{ cuotasSymbol }} {{ fmt.formatMoney(cuotasTotal) }}</span>
            </div>
          </template>
          <div class="ef-confirm-row">
            <span class="ef-confirm-label">Total</span>
            <span class="ef-confirm-value fw700">{{ saleSymbol }} {{ fmt.formatMoney(total) }}</span>
          </div>
          <p v-if="isBeca" class="ds-callout warn">Beca — Descuento 100%. No requiere pago.</p>
          <p class="ef-confirm-note">Al confirmar se inscribira al alumno en Odoo y se enviara el correo de confirmacion.</p>
        </div>
      </template>
      <template #step-1>
        <EmailPreviewStep
          :enrollment-id="enrollmentId"
          :active="confirmStep === 1"
          :activation-date="activationDate"
          :initial-cc="detail?.email_cc || ''"
          :requires-cc="detail?.requires_email_cc === true"
          :advisor-observation="detail?.advisor_observation || ''"
          collect-sap-credentials
          @update:sap="sapState = $event"
          @update:cc="ccState = $event"
        />
      </template>
    </ActionStepper>

    <!-- Stepper de observacion -->
    <ActionStepper
      v-if="showObserveStepper"
      ref="observeStepper"
      v-model="observeStep"
      :steps="['Observar Inscripcion']"
      :can-advance="!!observeReason.trim()"
      :loading="savingObserve"
      confirm-label="Confirmar Observacion"
      confirm-icon="fa-eye"
      @cancel="showObserveStepper = false; observeStep = 0; observeReason = ''; clearCcRequirement = false"
      @confirm="onObserveConfirm"
    >
      <template #step-0>
        <div class="ef-observe-wrap">
          <div class="ef-observe-banner">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <div>
              <strong>Observar inscripcion</strong>
              <p>La inscripcion sera devuelta al asesor comercial para correccion. Se le notificara automaticamente.</p>
            </div>
          </div>
          <div class="ef-observe-field">
            <label>Motivo de la observación<span class="ds-req">*</span></label>
            <textarea v-model="observeReason" class="ds-input" required rows="3" placeholder="Describe que debe corregir el asesor..."></textarea>
          </div>
          <!-- Unica salida del bloqueo por copia requerida: si el asesor la
               pidio por error, se baja aca y queda auditado. -->
          <label v-if="detail?.requires_email_cc" class="ef-cc-clear">
            <input type="checkbox" v-model="clearCcRequirement" />
            <span>
              <strong>Quitar el requerimiento de correo en copia</strong>
              Esta venta esta marcada como "requiere copia" y no se puede enviar sin CC.
              Marca esto solo si el asesor la pidio por error.
            </span>
          </label>
        </div>
      </template>
    </ActionStepper>
  </section>
</template>

<script setup>
import { ref, reactive, computed, inject, watch, getCurrentInstance } from 'vue'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters, splitVoucherUrls } from '@/composables/useEnrollmentFormatters'
import { childEditionLabel } from '@/utils/childEdition'
import { useToast } from 'vue-toastification'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import ActionStepper from '@/components/ActionStepper.vue'
import EmailPreviewStep from './EmailPreviewStep.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import api from '@/services/api'
import { toLocalIsoDate } from '@/shared/lib/localDate.js'
import { currencySymbol } from '@/entities/enrollment/currencySymbol.js'
import { summarizePayment } from '@/entities/enrollment/paymentSummary.js'

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
  'correct-initial',
  'revert-cuota',
  'save-additional',
  'update-additional'
])

// Estado de credenciales SAP que emite el EmailPreviewStep. `valid` arranca en
// true (cursos no-SAP no exigen nada); el preview lo pone en false si es SAP
// online y faltan credenciales, bloqueando el boton "Confirmar y Enviar".
const sapState = ref({ isSapOnline: false, sapUsername: '', sapPassword: '', valid: true })

// Correo en copia que emite el EmailPreviewStep. `valid` arranca en true (una
// venta sin requerimiento no exige nada); el preview lo pone en false cuando
// comercial marco requires_email_cc y el campo quedo vacio.
const ccState = ref({ cc: '', valid: true })

// El guard mira el stepper entero y no solo el paso 0: la confirmacion sale
// desde el preview, que es donde van las credenciales SAP obligatorias.
const confirmStepper = ref(null)
const observeStepper = ref(null)
const confirmFieldsFilled = useRequiredFieldsGuard(computed(() => confirmStepper.value?.$el))
const observeFieldsFilled = useRequiredFieldsGuard(computed(() => observeStepper.value?.$el))

// Reenvia el evento de confirmacion al padre adjuntando las credenciales SAP y
// el CC (el padre los pasa a sendConfirmationEmail). En cursos no-SAP las
// credenciales van vacias; sin copia, el cc va vacio y el backend usa el guardado.
function onConfirmSend () {
  if (!confirmFieldsFilled()) return
  const sapCreds = sapState.value.isSapOnline
    ? { sapUsername: sapState.value.sapUsername, sapPassword: sapState.value.sapPassword }
    : {}
  emit(isContado.value ? 'confirm-payment' : 'confirm-plan', {
    ...sapCreds,
    cc: ccState.value.cc,
    documental: isDocumentalSale.value
  })
}

// Habilita la edicion del monto de una cuota cuando: ya existe en BD (no _isNew),
// no esta paga, y el plan ya paso de borrador (esta en gestion FICO).
function canEditAmount (c) {
  if (!c || c._isNew) return false
  if (c.status === 'paid' || fmt.isCuotaAnulada(c)) return false
  // planStatus es un computed local, no un prop: leerlo como props.planStatus
  // daba undefined y este guard nunca frenaba nada.
  if (planStatus.value === 'borrador') return false
  return true
}

// Corregir la inicial y revertir cuotas cobradas espeja RESCHEDULE_ROLES del
// backend (installment.routes.js): sin esto el boton se ve y el POST da 403.
const instance = getCurrentInstance()
const $hasRole = instance?.appContext?.config?.globalProperties?.$hasRole || (() => false)
const canCorrectPayments = computed(() => $hasRole(['ADMIN', 'FICO', 'LIDER_FICO']))

// Solo una cuota ya confirmada se revierte; en modo edicion se esta tocando la
// tabla a mano y mezclar las dos cosas pisaria el cambio.
function canRevertCuota (c) {
  return canCorrectPayments.value && !props.isEditing && !!c?.installment_id && !c._isNew && c.status === 'paid'
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
const clearCcRequirement = ref(false)
const savingObserve = ref(false)

function onObserveConfirm () {
  if (!observeFieldsFilled()) return
  emit('reject-enrollment', { reason: observeReason.value, clearCcRequirement: clearCcRequirement.value })
}

const listPrice = computed(() => Number(props.enrollment?.list_price) || Number(props.detail?.list_price) || 0)
const discount = computed(() => Number(props.enrollment?.total_discounted) || Number(props.detail?.discount_amount) || 0)
// Total, pagado y saldo salen de la misma regla que la ficha lateral
// (entities/enrollment/paymentSummary.js), incluido el cobro pendiente OS/OP.
const summary = computed(() => summarizePayment({
  enrollment: props.enrollment,
  detail: props.detail,
  installments: props.installments,
  mode: props.mode
}))
const total = computed(() => summary.value.total)
const paid = computed(() => summary.value.paid)
const balance = computed(() => summary.value.balance)
const contadoPendiente = computed(() => summary.value.pendingCollection)
const reserva = computed(() => props.enrollment ? fmt.getReserva(props.enrollment) : 0)
const voucherUrls = computed(() => splitVoucherUrls(props.enrollment?.payment_vouchers))
const isContado = computed(() => props.enrollment ? fmt.isContado(props.enrollment) : true)

// Venta contra Orden de Servicio / de Compra: se confirma sin pago porque la
// empresa deposita semanas despues. La carta de compromiso queda fuera: esa es
// B2B documental sin cobro (total 0), no tiene cuota que cobrar.
const DOCUMENTAL_DOCTYPE_ALIASES = [
  'we_enrollment_b2b_doctype_service_order',
  'we_enrollment_b2b_doctype_purchase_order'
]
const isDocumentalSale = computed(() =>
  DOCUMENTAL_DOCTYPE_ALIASES.includes(props.detail?.b2b_doctype_alias)
)

// Detalle de descuentos. detail.discounts trae value y calculated_amount por
// separado, que es lo que hace falta para los promos "Monto fijo": ahi el value
// es el precio FINAL al que queda el curso, no lo descontado (PROMO FLASH 450
// con value 150 sobre lista 820 descuenta 670). El texto plano del Sheet
// (main_discount) mezcla ambos, asi que solo se usa como fallback.
const discountLines = computed(() => {
  const rows = props.detail?.discounts
  if (rows?.length) {
    return rows.map(d => {
      const monto = `- S/. ${fmt.formatMoney(d.calculated_amount)}`
      if (d.discount_type_alias === 'we_discount_type_percentage') {
        return `${d.description} — ${Number(d.value)}%  ${monto}`
      }
      if (d.discount_type_alias === 'we_discount_type_fixed') {
        return `${d.description} — precio fijo S/. ${fmt.formatMoney(d.value)}  ${monto}`
      }
      return `${d.description}  ${monto}`
    })
  }
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
const cuotasTotal = computed(() => cuotas.value.reduce((sum, c) => sum + (fmt.isCuotaAnulada(c) ? 0 : Number(c.amount) || 0), 0))

// Simbolo por monto: cada cuota trae su moneda (_cat_currency) y una cuota en
// dolares se pinta con $. El total de cuotas solo lleva $ si TODAS son en
// dolares; con monedas mezcladas la suma no es un monto real (Fase 4).
const symbolOf = row => currencySymbol(row?._cat_currency ?? props.detail?.cat_currency_id, props.catalogs?.catCurrency)
const saleSymbol = computed(() => currencySymbol(props.detail?.cat_currency_id, props.catalogs?.catCurrency))
const cuotasSymbol = computed(() => {
  const symbols = new Set(cuotas.value.map(symbolOf))
  return symbols.size === 1 ? [...symbols][0] : 'S/.'
})

// Datos de un pago ya registrado, leidos como texto (sin selects deshabilitados).
function labelOf (list, id, field = 'description') {
  const item = (list || []).find(x => Number(x.id) === Number(id))
  return item?.[field] || item?.description || '—'
}
function accountLabel (accountId) {
  const a = (props.catalogs?.allBankAccounts || []).find(x => Number(x.account_id) === Number(accountId))
  return a ? [a.bank_name, a.currency, a.account_number].filter(Boolean).join(' - ') : '—'
}

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
  payment_date: toLocalIsoDate(),
  voucher_url: null
})
const certificatePayment = computed(() => props.detail?.additional_payments?.[0] || null)
// El nav Adicionales aparece para becados (registran/editan su certificado) o
// cuando ya existe un pago suelto (reasignacion / diferencia por cambio de curso).
const showAdicionales = computed(() => isBeca.value || !!certificatePayment.value)
// Metadatos por tipo de pago adicional (chip, icono y titulo). Default = certificado.
const ADICIONAL_META = {
  we_payment_type_reassignment: { chip: 'Reasignación', icon: 'fa-shuffle', label: 'Pago de Reasignación' },
  we_payment_type_course_change_diff: { chip: 'Cambio de curso', icon: 'fa-right-left', label: 'Pago Diferencia por Cambio de Curso' }
}
const adicionalMeta = computed(() =>
  ADICIONAL_META[certificatePayment.value?.payment_type_alias] ||
  { chip: 'Certificar', icon: 'fa-certificate', label: 'Pago de Certificado' })
const isReasignacion = computed(() => certificatePayment.value?.payment_type_alias === 'we_payment_type_reassignment')
const adicionalLabel = computed(() => adicionalMeta.value.label)
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
    payment_date: p.payment_date ? String(p.payment_date).slice(0, 10) : toLocalIsoDate(),
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
  } catch (err) {
    console.error('[uploadVoucher]', err)
    toast.error('Error al subir voucher')
  }
  event.target.value = ''
}

const todayIso = computed(() => toLocalIsoDate())
// La OS/OP no pide moneda ni medio: no hay deposito que describir todavia.
const canConfirmContado = computed(() =>
  isBeca.value || isDocumentalSale.value || (props.form.cat_currency && props.form.cat_payment_medium)
)
const hasReschedulableCuotas = computed(() => cuotas.value.some(c => c.status !== 'paid' && Number(c.cat_status) !== 4454 && !fmt.isCuotaAnulada(c)))

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
  } catch (err) {
    console.error('[uploadVoucher]', err)
    toast.error('Error al subir voucher')
  }
  event.target.value = ''
}

// Una cuota es cobrable mientras no este pagada ni anulada y el plan ya haya
// salido de borrador (mismo criterio que el boton de subir voucher).
function canPayCuota (c) {
  return c.status !== 'paid' && !fmt.isCuotaAnulada(c) && planStatus.value !== 'borrador'
}

// Abre/cierra el bloque de detraccion de la fila. Al cerrarlo se descarta: si
// quedara colgado, el confirm mandaria una detraccion vacia.
function toggleDetraction (c) {
  c._detraction = c._detraction
    ? null
    : { amount: null, transaction_code: '', bank_account_id: null, _voucher_url: null }
}

// El monto detraido tiene que dejar algo por cobrar: si se lleva la cuota
// entera no es una detraccion, es otro problema.
function detractionValid (c) {
  const monto = Number(c._detraction?.amount)
  return Number.isFinite(monto) && monto > 0 && monto < Number(c.amount)
}

function filteredAccounts (entityId) {
  if (!entityId || !props.catalogs?.allBankAccounts) return []
  return props.catalogs.allBankAccounts.filter(a => a.business_entity_catalog_id === entityId)
}

// Fila cerrada (cobrada, anulada o plan en borrador): sus datos se leen como
// texto. Antes eran selects deshabilitados en gris que no se distinguian.
function isRowLocked (c) {
  return fmt.isCuotaAnulada(c) || (c.status === 'paid' && !props.isEditing) || planStatus.value === 'borrador'
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

function formatEdDate (d) {
  if (!d) return ''
  return fmt.formatDate(d)
}

// Etiqueta de la columna Edicion cuando NO se eligio una distinta: la edicion que
// el arbol del padre le da a ESTE modulo, con su fecha. Antes decia "Misma
// edicion" para toda la tabla, que ademas de no dar fecha era falso: los modulos
// de un diplomado arrancan en fechas distintas.
function treeEditionLabel (child) {
  return childEditionLabel(child, formatEdDate) || 'Sin edicion programada'
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
/* Todo con tokens ds-*: el modo oscuro sale de los tokens, sin bloque aparte.
   Botones e inputs grandes son globales (btn-exec, ds-input); aquí queda lo
   propio de Finanzas: barra de montos, tarjetas de pago, tabla de cuotas. */
.ef-section { display: flex; flex-direction: column; }
.tr { text-align: right; }
.tc { text-align: center; }
.fw700 { font-weight: 700; }
.mono { font-family: var(--ds-font-mono); }
.mt12 { margin-top: 14px; }
.c-green { color: var(--ds-ok-ink); }
.c-blue { color: var(--ds-info-ink); }
.c-red { color: var(--ds-bad-ink); }
.ef-muted-note { font-size: 12px; color: var(--ds-muted); }
.ef-file-input { display: none; }

/* Promo laptop: marca de negocio (cian), no un estado */
.ef-laptop-banner {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px; padding: 10px 14px; border-radius: var(--ds-radius-sm);
  background: var(--ds-soft-cyan); color: var(--ds-cyan-ink);
}
.ef-laptop-banner > i { flex-shrink: 0; font-size: 18px; }
.ef-laptop-banner-text { display: flex; flex-direction: column; gap: 1px; line-height: 1.35; }
.ef-laptop-banner-text strong { font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
.ef-laptop-banner-text span { font-size: 11.5px; }

/* Barra de montos */
.ef-bar {
  display: flex; align-items: stretch; flex-wrap: wrap;
  margin-bottom: 20px; padding: 14px 0;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: var(--ds-surface-2);
}
.ef-bar-item { flex: 1; min-width: 110px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 14px; }
.ef-bar-sep { width: 1px; align-self: stretch; background: var(--ds-border); }
.ef-bar-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-muted); }
.ef-bar-value { font-family: var(--ds-font-mono); font-size: 14px; font-weight: 700; color: var(--ds-heading); white-space: nowrap; }
.ef-bar-value.c-green { color: var(--ds-ok-ink); }
.ef-bar-value.c-blue { color: var(--ds-info-ink); }
.ef-bar-value.c-red { color: var(--ds-bad-ink); }

.ef-discount-wrap, .ef-has-tip { position: relative; }
.ef-has-tip { cursor: help; }
.ef-tip-icon { margin-left: 3px; font-size: 10px; opacity: 0.5; }
.ef-tooltip {
  position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); z-index: 10;
  padding: 8px 14px; border-radius: var(--ds-radius-sm);
  background: var(--ds-ink); color: var(--ds-surface);
  font-family: inherit; font-size: 11px; font-weight: 400; white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}
.ef-tip-row { padding: 2px 0; }

/* Secciones de pago */
.ef-payment { margin-bottom: 16px; }
.ef-sub-title { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.ef-sub-title i { color: var(--ds-muted); }
.ef-amount-lg { font-size: 18px; font-weight: 800; color: var(--ds-heading); }

.ef-contado-card, .ef-inicial-card {
  padding: 16px 18px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: var(--ds-surface);
}
.ef-contado-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ef-contado-amount, .ef-inicial-info { display: flex; flex-direction: column; gap: 3px; }
.ef-inicial-info { flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: 10px; }
.ef-inicial-info .ef-bar-label { flex-basis: 100%; }
.ef-inicial-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ef-inicial-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; flex-shrink: 0; }
.ef-inicial-removed { text-decoration: line-through; opacity: 0.55; }

/* Datos de un pago ya registrado: etiqueta arriba, valor abajo */
.ef-dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 16px; margin: 14px 0 0; }
.ef-dl dt { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-muted); }
.ef-dl dd { margin: 3px 0 0; font-size: 13px; font-weight: 600; color: var(--ds-ink); overflow-wrap: anywhere; }

.ef-voucher-links { display: flex; flex-wrap: wrap; gap: 8px; }
.ef-voucher-link {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control);
  background: var(--ds-surface); color: var(--ds-ink-2);
  font-size: 12px; font-weight: 600; text-decoration: none;
}
.ef-voucher-link:hover { border-color: var(--ds-border-strong); color: var(--ds-accent); }
.ef-voucher-sm { margin-right: 6px; font-size: 14px; color: var(--ds-ink-2); text-decoration: none; }
.ef-voucher-sm:hover { color: var(--ds-accent); }

/* Formularios */
.ef-form-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.ef-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ef-field label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-ink-2); }
.ef-readonly { min-height: 34px; padding: 8px 0; border-bottom: 1px solid var(--ds-border); font-size: 13px; font-weight: 600; color: var(--ds-ink); }

.ef-select-sm {
  width: 100%; height: 30px; padding: 0 8px;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control);
  background: var(--ds-surface); color: var(--ds-ink); font-family: inherit; font-size: 11.5px;
}
.ef-select-sm:focus { outline: none; border-color: var(--ds-accent); }
.ef-select-sm:disabled { background: var(--ds-surface-3); color: var(--ds-muted); cursor: not-allowed; }
.ef-select-edition { min-width: 200px; }
.ef-cell-text { font-size: 12px; color: var(--ds-ink-2); white-space: nowrap; }
.ef-table .ds-input { height: 30px; padding: 4px 8px; font-size: 11.5px; }
.ef-datepicker { width: 140px; }
.ef-cert-amount { display: inline-flex; align-items: center; gap: 8px; }
.ef-cert-amount-input { width: 110px; font-weight: 700; text-align: right; }

/* Pestañas Pago inicial / Cuotas (y Pago / Adicionales): subrayado, para no
   competir con el segmentado de arriba (Finanzas / Acciones / Historial). */
.ef-cuota-tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--ds-border); }
.ef-cuota-tab {
  display: inline-flex; align-items: center; gap: 7px; margin-bottom: -1px; padding: 9px 14px;
  border: 0; border-bottom: 2px solid transparent; background: none; cursor: pointer;
  font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2);
}
.ef-cuota-tab:hover { color: var(--ds-heading); }
.ef-cuota-tab.active { border-bottom-color: var(--ds-accent); color: var(--ds-heading); }
.ef-cuota-tab:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 2px; }
.ef-tab-badge {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ef-tab-body { padding: 2px 0; }

/* Avisos */
.ef-notice, .ef-observe-banner, .ef-doc-notice {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; border-radius: var(--ds-radius-sm);
  font-size: 12.5px; line-height: 1.5;
}
.ef-notice, .ef-observe-banner { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.ef-notice { margin-bottom: 14px; }
.ef-doc-notice { background: var(--ds-soft-info); color: var(--ds-info-ink); }
.ef-notice i, .ef-observe-banner i, .ef-doc-notice i { flex-shrink: 0; margin-top: 2px; font-size: 14px; }
.ef-notice strong, .ef-observe-banner strong { display: block; margin-bottom: 2px; font-size: 13px; }
.ef-notice p, .ef-observe-banner p { margin: 0; }

/* Adicionales (certificado / reasignacion) */
.ef-cert-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: var(--ds-radius-control);
  background: var(--ds-soft-ok); color: var(--ds-ok-ink);
  font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
}
.ef-cert-just { margin-top: 14px; }
.ef-cert-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.ef-cert-hint { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 12px; color: var(--ds-ink-2); }

/* Tabla de cuotas */
.ef-cuotas-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ef-toolbar-actions { display: inline-flex; align-items: center; gap: 8px; }
.ef-table { width: 100%; border-collapse: collapse; font-size: 12.5px; color: var(--ds-ink); }
.ef-table thead th {
  padding: 9px 10px; border-bottom: 1px solid var(--ds-border); background: var(--ds-surface-2);
  text-align: left; white-space: nowrap;
  font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-muted);
}
.ef-table thead th.tr { text-align: right; }
.ef-table thead th.tc { text-align: center; }
.ef-table tbody td { padding: 8px 10px; border-bottom: 1px solid var(--ds-border); vertical-align: middle; }
.ef-table tbody tr:hover td { background: var(--ds-surface-2); }
.ef-table .cuota-paid td { background: var(--ds-soft-ok); }
.ef-table .cuota-overdue td { background: var(--ds-soft-bad); }
/* Anulada por retiro / campaña de cobranza: tachada pero presente (auditoria) */
.ef-table .cuota-annulled td { color: var(--ds-muted); }
.ef-table .cuota-annulled td:nth-child(-n+3) { text-decoration: line-through; }
.ef-total-row td { padding: 11px 10px; background: var(--ds-surface-2); }
.ef-empty-row { padding: 32px; text-align: center; font-size: 13px; color: var(--ds-muted); }
.ef-amount-cell { white-space: nowrap; }

.ef-amount-edit, .ef-btn-del, .ef-upload-btn {
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: var(--ds-radius-control); background: transparent; cursor: pointer;
  color: var(--ds-muted);
}
.ef-amount-edit { width: 20px; height: 20px; margin-left: 6px; font-size: 10px; vertical-align: middle; }
.ef-amount-edit:hover { background: var(--ds-soft-info); color: var(--ds-accent); }
.ef-btn-del { width: 26px; height: 26px; font-size: 11px; }
.ef-btn-del:hover { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.ef-upload-btn { width: 28px; height: 28px; font-size: 13px; }
.ef-upload-btn:hover { background: var(--ds-soft-info); color: var(--ds-accent); }
.ef-btn-confirm-cuota {
  display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin-right: 4px;
  border: 1px solid var(--ds-ok); border-radius: var(--ds-radius-control);
  background: var(--ds-soft-ok); color: var(--ds-ok-ink); font-size: 11px; cursor: pointer;
}
.ef-btn-confirm-cuota:hover:not(:disabled) { background: var(--ds-ok); color: var(--ds-on-brand); }
.ef-btn-confirm-cuota:disabled { opacity: 0.45; cursor: not-allowed; }

/* Estado de la cuota (clases de fmt.cuotaStatusPill) */
.ef-pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: var(--ds-radius-control); font-size: 11px; font-weight: 700; line-height: 1; white-space: nowrap; }
.pill-green { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.pill-amber { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.pill-red { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.pill-muted { background: var(--ds-soft-neutral); color: var(--ds-ink-2); }

.ef-empty { margin: 0; padding: 40px 16px; text-align: center; font-size: 13px; color: var(--ds-muted); }
.ef-empty i { display: block; margin-bottom: 8px; font-size: 22px; opacity: 0.5; }
.ef-empty p { margin: 0; }

/* Convalidacion */
.ef-validation-block { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--ds-border); }
.ef-edition-link { cursor: pointer; font-size: 13px; color: var(--ds-ink); }
.ef-edition-link:hover { color: var(--ds-accent); }
.ef-edition-pen { margin-left: 4px; font-size: 10px; opacity: 0.4; }
.ef-edition-warn {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; cursor: pointer;
  border: 1px dashed var(--ds-bad); border-radius: var(--ds-radius-control);
  background: var(--ds-soft-bad); color: var(--ds-bad-ink); font-size: 12px; font-weight: 600;
}

/* Cobro de una venta al contado aprobada sin pago (OS/OP) */
.ef-collect { padding: 12px 14px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: var(--ds-surface-2); }
.ef-collect-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.ef-collect-amount { font-size: 15px; }
.ef-collect-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--ds-border); }
.ef-collect-actions .btn-exec-primary { margin-left: auto; }
.ef-check { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; font-size: 12px; color: var(--ds-ink-2); }
.ef-check input { width: 15px; height: 15px; accent-color: var(--ds-accent); cursor: pointer; }
.ef-check small { color: var(--ds-muted); }

/* Selector de archivo con etiqueta (el .ef-upload-btn es solo icono) */
.ef-file-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; cursor: pointer; white-space: nowrap;
  border: 1px dashed var(--ds-border-strong); border-radius: var(--ds-radius-control);
  background: var(--ds-surface); color: var(--ds-ink-2); font-size: 12px; font-weight: 600;
}
.ef-file-btn:hover { border-color: var(--ds-accent); color: var(--ds-accent); }
.ef-file-btn.done { border-style: solid; border-color: var(--ds-ok); background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.ef-file-btn.sm { padding: 4px 9px; font-size: 11px; }
.ef-file-view { font-size: 11.5px; font-weight: 600; color: var(--ds-accent); text-decoration: none; }
.ef-file-view:hover { text-decoration: underline; }

/* Detraccion (SPOT): fila colgada de su cuota, violeta = marca de negocio */
.ef-detraction-row td { background: var(--ds-surface-2); }
.ef-detraction-box { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; padding: 6px 4px; }
.ef-detraction-box > label:not(.ef-file-btn):not(.ef-upload-btn) {
  display: flex; flex-direction: column; gap: 2px;
  font-size: 10.5px; font-weight: 600; text-transform: uppercase; color: var(--ds-ink-2);
}
.ef-detraction-title { font-size: 11.5px; font-weight: 700; white-space: nowrap; color: var(--ds-violet-ink); }
.ef-detraction-split { margin-left: auto; font-size: 11.5px; font-weight: 600; color: var(--ds-ink-2); }
.ef-detraction-split.c-red { color: var(--ds-bad-ink); }
.ef-btn-detraction {
  margin-right: 3px; padding: 2px 6px; cursor: pointer;
  border: 1px solid transparent; border-radius: var(--ds-radius-control);
  background: var(--ds-soft-violet); color: var(--ds-violet-ink);
}
.ef-btn-detraction.active { border-color: var(--ds-violet-ink); }

/* Panel de edicion y pie */
.ef-edit-panel { margin-top: 16px; overflow: hidden; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); }
.ef-edit-head { display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; border-bottom: 1px solid var(--ds-border); background: var(--ds-surface-2); }
.ef-edit-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.ef-edit-close {
  display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px;
  border: 0; border-radius: var(--ds-radius-control); background: none; cursor: pointer; color: var(--ds-muted);
}
.ef-edit-close:hover { background: var(--ds-surface-3); color: var(--ds-ink); }
.ef-edit-body { padding: 14px 16px; }
.ef-warn-label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--ds-warn-ink); }

.ef-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--ds-border); }
/* Observar no es destructivo ni la accion principal: contorno en tono ambar */
.ef-btn-observe {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; cursor: pointer;
  border: 1px solid var(--ds-warn); border-radius: var(--ds-radius-control);
  background: var(--ds-soft-warn); color: var(--ds-warn-ink);
  font-family: inherit; font-size: 13px; font-weight: 600;
}
.ef-btn-observe:hover { background: var(--ds-surface); }

/* Stepper de observacion */
.ef-observe-wrap { display: flex; flex-direction: column; gap: 16px; }
.ef-observe-field { display: flex; flex-direction: column; gap: 5px; }
.ef-observe-field label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-ink-2); }
.ef-cc-clear {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; cursor: pointer;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  font-size: 12px; line-height: 1.5; color: var(--ds-ink-2);
}
.ef-cc-clear input { flex-shrink: 0; margin-top: 3px; }
.ef-cc-clear strong { display: block; margin-bottom: 2px; font-size: 12.5px; color: var(--ds-ink); }

/* Resumen de confirmacion */
.ef-confirm-summary { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.ef-confirm-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }
.ef-confirm-label { font-size: 13px; font-weight: 500; color: var(--ds-ink-2); }
.ef-confirm-value { font-size: 14px; font-weight: 600; color: var(--ds-heading); }
.ef-confirm-note { margin: 0; padding: 12px 16px; border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); font-size: 12.5px; line-height: 1.5; color: var(--ds-ink-2); }

@media (max-width: 900px) {
  .ef-form-row, .ef-dl { grid-template-columns: 1fr 1fr; }
}
</style>
