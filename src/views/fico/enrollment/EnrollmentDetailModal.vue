<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    title="Detalle de Inscripcion"
    size="xl"
  >
    <!-- Loading overlay -->
    <div v-if="loadingDetail" class="edm-loading">
      <div class="edm-spinner"></div>
      <span>Cargando detalle...</span>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="edm-tabs">
        <button
          :class="['edm-tab', { active: modalTab === 'detalle' }]"
          @click="modalTab = 'detalle'"
        >
          <i class="fa-solid fa-file-invoice-dollar"></i> Detalle
        </button>
        <button
          :class="['edm-tab', { active: modalTab === 'historial' }]"
          @click="modalTab = 'historial'"
        >
          <i class="fa-solid fa-clock-rotate-left"></i> Historial
          <span v-if="auditLog.length" class="edm-tab-badge">{{ auditLog.length }}</span>
        </button>
      </div>

      <!-- TAB: Historial -->
      <div v-if="modalTab === 'historial'" class="edm-audit">
        <div v-if="!auditLog.length" class="edm-empty">
          <i class="fa-solid fa-inbox"></i>
          <p>Sin registros de historial</p>
        </div>
        <div v-for="log in auditLog" :key="log.audit_id" class="edm-audit-item">
          <div class="edm-audit-dot" :class="'dot-' + log.action">
            <i :class="fmt.auditIcon(log.action)"></i>
          </div>
          <div class="edm-audit-body">
            <div class="edm-audit-head">
              <span class="edm-audit-action">{{ fmt.auditLabel(log.action) }}</span>
              <span class="edm-audit-user">{{ log.user_name || 'Sistema' }}</span>
              <span class="edm-audit-date">{{ fmt.formatDateTime(log.performed_at) }}</span>
            </div>
            <p v-if="log.details" class="edm-audit-details">{{ log.details }}</p>
            <div v-if="log.justificacion" class="edm-audit-justificacion">
              <i class="fa-solid fa-quote-left"></i> {{ log.justificacion }}
            </div>
            <div v-if="log.changes" class="edm-audit-changes">
              <div
                v-for="(val, key) in (typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes)"
                :key="key"
                class="edm-change-row"
              >
                <span class="edm-change-field">{{ key }}:</span>
                <span v-if="val.old && val.new" class="edm-change-vals">
                  <span class="edm-old">{{ val.old }}</span>
                  <i class="fa-solid fa-arrow-right" style="font-size:10px;color:var(--e-text-muted);margin:0 4px"></i>
                  <span class="edm-new">{{ val.new }}</span>
                </span>
                <span v-else-if="val.new" class="edm-new">{{ val.new }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Detalle -->
      <div v-show="modalTab === 'detalle'">
        <!-- Student header -->
        <div class="edm-student">
          <div class="edm-avatar"><i class="fa-solid fa-user-graduate"></i></div>
          <div class="edm-student-info">
            <h3 class="edm-name">{{ selectedDetail.student_full_name || enrollment?.student_full_name || '---' }}</h3>
            <div class="edm-student-meta">
              <div class="edm-meta-col">
                <span class="edm-doc"><i class="fa-solid fa-id-card"></i> {{ selectedDetail.document_number || enrollment?.document_number || '---' }}</span>
                <span class="edm-occupation"><i class="fa-solid fa-user-tag"></i> {{ currentProfile }}</span>
              </div>
              <div class="edm-meta-col">
                <span v-if="enrollment?.email || selectedDetail?.email" class="edm-contact"><i class="fa-solid fa-envelope"></i> {{ enrollment?.email || selectedDetail?.email }}</span>
                <span v-if="enrollment?.phone || selectedDetail?.phone" class="edm-contact"><i class="fa-solid fa-phone"></i> {{ enrollment?.phone || selectedDetail?.phone }}</span>
              </div>
            </div>
          </div>
          <div class="edm-total-badge">
            <span class="edm-total-label">Total a Pagar</span>
            <span class="edm-total-amount">S/. {{ fmt.formatMoney(modalTotal) }}</span>
          </div>
        </div>

        <!-- Info cards -->
        <div class="edm-info-cards">
          <div class="edm-info-card">
            <span class="edm-ic-icon ic-blue"><i class="fa-solid fa-graduation-cap"></i></span>
            <div>
              <span class="edm-ic-label">Programa</span>
              <span class="edm-ic-value">{{ selectedDetail.program_name || enrollment?.program_name || '---' }}</span>
            </div>
          </div>
          <div class="edm-info-card">
            <span class="edm-ic-icon ic-purple"><i class="fa-solid fa-layer-group"></i></span>
            <div>
              <span class="edm-ic-label">Codigo</span>
              <span class="edm-ic-value">{{ selectedDetail.edition_code || enrollment?.edition_code || '---' }}</span>
            </div>
          </div>
          <div class="edm-info-card">
            <span class="edm-ic-icon ic-green"><i class="fa-solid fa-user-tie"></i></span>
            <div>
              <span class="edm-ic-label">Asesor</span>
              <span class="edm-ic-value">{{ selectedDetail.seller_agent_name || enrollment?.seller_agent_name || '---' }}</span>
            </div>
          </div>
          <div class="edm-info-card">
            <span class="edm-ic-icon ic-amber"><i class="fa-solid fa-calendar-check"></i></span>
            <div>
              <span class="edm-ic-label">Registro</span>
              <span class="edm-ic-value">{{ fmt.formatDate(selectedDetail.registration_date || enrollment?.registration_date) }}</span>
            </div>
          </div>
        </div>

        <!-- Additional info -->
        <div v-if="modalAdditionalInfo" class="edm-additional">
          <i class="fa-solid fa-circle-info"></i>
          <span>{{ modalAdditionalInfo }}</span>
        </div>

        <!-- Odoo credentials -->
        <div v-if="odooEmail" class="edm-odoo-bar">
          <div class="edm-odoo-item">
            <i class="fa-solid fa-graduation-cap"></i>
            <span class="edm-odoo-label">Campus Virtual</span>
            <span class="edm-odoo-value">{{ odooEmail }}</span>
          </div>
          <div class="edm-odoo-item">
            <i class="fa-solid fa-key"></i>
            <span class="edm-odoo-label">Clave</span>
            <template v-if="odooPassword">
              <span v-if="showOdooPassword" class="edm-odoo-value edm-odoo-mono">{{ odooPassword }}</span>
              <span v-else class="edm-odoo-value edm-odoo-mono">••••••••</span>
              <button class="edm-odoo-toggle" @click="showOdooPassword = !showOdooPassword">
                <i :class="showOdooPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
              </button>
            </template>
            <span v-else class="edm-odoo-value" style="color:var(--e-text-muted);font-style:italic">Usuario existente</span>
          </div>
        </div>

        <!-- Financial summary bar -->
        <div class="edm-fin-bar">
          <div class="edm-fin-item">
            <span class="edm-fin-label">Precio Lista</span>
            <span class="edm-fin-value">S/. {{ fmt.formatMoney(modalListPrice) }}</span>
          </div>
          <div class="edm-fin-sep"></div>
          <div class="edm-fin-item edm-fin-discount-wrap">
            <span class="edm-fin-label">Descuento</span>
            <span
              class="edm-fin-value c-red edm-fin-has-tip"
              @mouseenter="showDiscountTip = true"
              @mouseleave="showDiscountTip = false"
            >
              - S/. {{ fmt.formatMoney(modalDescuento) }}
              <i class="fa-solid fa-circle-info edm-tip-icon"></i>
              <div v-if="showDiscountTip && modalDiscountLines.length" class="edm-tooltip">
                <div v-for="(d, i) in modalDiscountLines" :key="i" class="edm-tip-row">{{ d }}</div>
              </div>
            </span>
          </div>
          <div class="edm-fin-sep"></div>
          <div class="edm-fin-item">
            <span class="edm-fin-label">Total</span>
            <span class="edm-fin-value fw700">S/. {{ fmt.formatMoney(modalTotal) }}</span>
          </div>
          <template v-if="modalReserva > 0">
            <div class="edm-fin-sep"></div>
            <div class="edm-fin-item">
              <span class="edm-fin-label">Inicial</span>
              <span class="edm-fin-value c-blue">S/. {{ fmt.formatMoney(modalReserva) }}</span>
            </div>
          </template>
          <div class="edm-fin-sep"></div>
          <div class="edm-fin-item">
            <span class="edm-fin-label">Pagado</span>
            <span class="edm-fin-value c-green">S/. {{ fmt.formatMoney(modalPagado) }}</span>
          </div>
          <div class="edm-fin-sep"></div>
          <div class="edm-fin-item">
            <span class="edm-fin-label">Saldo</span>
            <span class="edm-fin-value" :class="modalSaldo > 0 ? 'c-red fw700' : 'c-green'">S/. {{ fmt.formatMoney(modalSaldo) }}</span>
          </div>
        </div>

        <!-- CONTADO section -->
        <div v-if="isContadoMode" class="edm-payment-section">
          <h6 class="edm-section-title"><i class="fa-solid fa-money-bill-wave"></i> Pago al Contado</h6>
          <div class="edm-contado-card">
            <div class="edm-contado-amount">
              <span class="edm-fin-label">Monto</span>
              <span class="fw700 mono" style="font-size:16px">S/. {{ fmt.formatMoney(modalTotal) }}</span>
            </div>
            <div class="edm-contado-voucher">
              <a v-if="modalVoucher" :href="modalVoucher" target="_blank" class="edm-voucher-link"><i class="fa-solid fa-image"></i> Ver Voucher</a>
              <span v-else class="c-muted" style="font-size:12px">Sin voucher adjunto</span>
            </div>
          </div>

          <!-- View mode: readonly / editing fields -->
          <div v-if="modalMode === 'view'" class="edm-form-row edm-form-5 mt12">
            <div class="edm-field">
              <label>Tipo Moneda</label>
              <span v-if="!isEditing" class="edm-readonly">{{ selectedDetail?.currency_symbol || '---' }}</span>
              <select v-else v-model="ficoForm.cat_currency" class="edm-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>Medio de Pago</label>
              <span v-if="!isEditing" class="edm-readonly">{{ lastPayment?.payment_method || '---' }}</span>
              <select v-else v-model="ficoForm.cat_payment_medium" class="edm-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>Entidad Empresa</label>
              <span v-if="!isEditing" class="edm-readonly">{{ lastPayment?.business_entity || '---' }}</span>
              <select v-else v-model="ficoForm.cat_business_entity" class="edm-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>Cuenta Bancaria</label>
              <span v-if="!isEditing" class="edm-readonly">{{ lastPayment ? [lastPayment.bank_name, lastPayment.bank_currency, lastPayment.bank_account_number].filter(Boolean).join(' - ') || '---' : '---' }}</span>
              <select v-else v-model="ficoForm.bank_account_id" class="edm-select" :disabled="!ficoForm.cat_business_entity">
                <option :value="null">{{ ficoForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                <option v-for="a in contadoAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>N. Operacion</label>
              <span v-if="!isEditing" class="edm-readonly mono">{{ lastPayment?.transaction_code || '---' }}</span>
              <input v-else v-model="ficoForm.transaction_code" class="edm-input" placeholder="Numero de operacion" />
            </div>
          </div>

          <!-- Confirm mode: editable form for pending -->
          <div v-if="modalMode === 'confirm'" class="edm-form-row edm-form-5 mt12">
            <div class="edm-field">
              <label>Tipo Moneda</label>
              <select v-model="ficoForm.cat_currency" class="edm-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>Medio de Pago</label>
              <select v-model="ficoForm.cat_payment_medium" class="edm-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>Entidad Empresa</label>
              <select v-model="ficoForm.cat_business_entity" class="edm-select">
                <option :value="null">Seleccionar...</option>
                <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>Cuenta Bancaria</label>
              <select v-model="ficoForm.bank_account_id" class="edm-select" :disabled="!ficoForm.cat_business_entity">
                <option :value="null">{{ ficoForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                <option v-for="a in contadoAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
              </select>
            </div>
            <div class="edm-field">
              <label>N. Operacion</label>
              <input v-model="ficoForm.transaction_code" class="edm-input" placeholder="Numero de operacion" />
            </div>
          </div>
        </div>

        <!-- CUOTAS section -->
        <div v-else class="edm-payment-section">
          <div class="edm-cuota-tabs">
            <button :class="['edm-cuota-tab', { active: cuotaTab === 'inicial' }]" @click="cuotaTab = 'inicial'">
              <i class="fa-solid fa-receipt"></i> Pago Inicial
            </button>
            <button :class="['edm-cuota-tab', { active: cuotaTab === 'cuotas' }]" @click="cuotaTab = 'cuotas'">
              <i class="fa-solid fa-calendar-days"></i> Cuotas
              <span v-if="modalCuotas.length" class="edm-tab-badge">{{ modalCuotas.length }}</span>
            </button>
          </div>

          <!-- Pago Inicial tab -->
          <div v-if="cuotaTab === 'inicial'" class="edm-tab-body">
            <div v-if="modalInicial" class="edm-inicial-card">
              <div class="edm-inicial-top">
                <div class="edm-inicial-info">
                  <span class="edm-fin-label">Pago Inicial</span>
                  <span class="fw700 mono" style="font-size:18px">S/. {{ fmt.formatMoney(modalInicial.amount) }}</span>
                </div>
                <div class="edm-inicial-actions">
                  <a v-if="modalVoucher" :href="modalVoucher" target="_blank" class="edm-voucher-link"><i class="fa-solid fa-image"></i> Ver Voucher</a>
                </div>
              </div>
              <div class="edm-form-row edm-form-5 mt12">
                <div class="edm-field">
                  <label>Tipo Moneda</label>
                  <select v-model="modalInicial._cat_currency" class="edm-select" :disabled="modalInicial.status === 'paid'">
                    <option :value="null">Seleccionar...</option>
                    <option v-for="c in catalogs.catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
                  </select>
                </div>
                <div class="edm-field">
                  <label>Medio de Pago</label>
                  <select v-model="modalInicial._cat_payment_medium" class="edm-select" :disabled="modalInicial.status === 'paid'">
                    <option :value="null">Seleccionar...</option>
                    <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
                  </select>
                </div>
                <div class="edm-field">
                  <label>Entidad Empresa</label>
                  <select v-model="modalInicial._cat_business_entity" class="edm-select" :disabled="modalInicial.status === 'paid'">
                    <option :value="null">Seleccionar...</option>
                    <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
                  </select>
                </div>
                <div class="edm-field">
                  <label>Cuenta Bancaria</label>
                  <select v-model="modalInicial._bank_account_id" class="edm-select" :disabled="modalInicial.status === 'paid' || !modalInicial._cat_business_entity">
                    <option :value="null">{{ modalInicial._cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                    <option v-for="a in filteredAccounts(modalInicial._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }} - {{ a.account_number }}</option>
                  </select>
                </div>
                <div class="edm-field">
                  <label>N. Operacion</label>
                  <input v-model="modalInicial._transaction_code" class="edm-input" placeholder="Numero de operacion" :disabled="modalInicial.status === 'paid'" />
                </div>
              </div>
            </div>
            <div v-else class="edm-empty"><i class="fa-solid fa-inbox"></i><p>Sin pago inicial registrado</p></div>
          </div>

          <!-- Cuotas tab -->
          <div v-if="cuotaTab === 'cuotas'" class="edm-tab-body">
            <div v-if="planStatus === 'borrador'" class="edm-notice edm-notice-draft">
              <i class="fa-solid fa-file-pen"></i>
              <div>
                <strong>Plan en Borrador</strong>
                <p>Comercial envio este plan de cuotas. Confirma el plan para gestionar los pagos.</p>
              </div>
            </div>

            <div class="edm-cuotas-toolbar">
              <span class="c-muted" style="font-size:11px">{{ modalCuotas.length }} cuota{{ modalCuotas.length !== 1 ? 's' : '' }}</span>
              <button class="edm-btn-sm edm-btn-teal" @click="addCuota"><i class="fa-solid fa-plus"></i> Agregar Cuota</button>
            </div>

            <table class="edm-table">
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
                <tr v-for="(c, idx) in modalCuotas" :key="idx" :class="fmt.cuotaRowClass(c)">
                  <td class="fw700 tc">{{ c.installment_number || (idx + 1) }}</td>
                  <td v-if="c._isNew"><input v-model.number="c.amount" type="number" step="0.01" class="edm-input tr mono" placeholder="0.00" /></td>
                  <td v-else class="tr mono fw700">S/. {{ fmt.formatMoney(c.amount) }}</td>
                  <td v-if="c._isNew"><BaseDatePicker v-model="c.due_date" placeholder="dd/mm/aaaa" class="edm-datepicker" /></td>
                  <td v-else :class="{ 'c-red fw700': fmt.isOverdue(c.due_date) && c.status !== 'paid' }">{{ fmt.formatDate(c.due_date) }}</td>
                  <td class="tc"><span class="edm-pill" :class="fmt.cuotaStatusPill(c, planStatus)">{{ fmt.cuotaStatusLabel(c, planStatus) }}</span></td>
                  <td>
                    <select v-model="c._cat_currency" class="edm-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                      <option :value="null">---</option>
                      <option v-for="cur in catalogs.catCurrency" :key="cur.id" :value="cur.id">{{ cur.abbreviation || cur.description }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="c._cat_payment_medium" class="edm-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                      <option :value="null">---</option>
                      <option v-for="m in catalogs.catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="c._cat_business_entity" class="edm-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                      <option :value="null">---</option>
                      <option v-for="b in catalogs.catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="c._bank_account_id" class="edm-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador' || !c._cat_business_entity">
                      <option :value="null">---</option>
                      <option v-for="a in filteredAccounts(c._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} - {{ a.currency }}</option>
                    </select>
                  </td>
                  <td>
                    <input v-model="c._transaction_code" class="edm-input" placeholder="---" :disabled="c.status === 'paid' || planStatus === 'borrador'" />
                  </td>
                  <td class="tc">
                    <a v-if="c._voucher_url" :href="c._voucher_url" target="_blank" class="edm-voucher-link-sm"><i class="fa-solid fa-image"></i></a>
                    <span v-else class="c-muted">---</span>
                  </td>
                  <td class="tc">
                    <button v-if="canDeleteCuota(c)" class="edm-btn-del" @click="removeCuota(idx)" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
                <tr v-if="!modalCuotas.length"><td colspan="11" class="edm-empty-row">Sin cuotas programadas</td></tr>
              </tbody>
              <tfoot v-if="modalCuotas.length">
                <tr class="edm-total-row">
                  <td class="fw700 tr">Total:</td>
                  <td class="tr mono fw700">S/. {{ fmt.formatMoney(cuotasTotal) }}</td>
                  <td colspan="9"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Action bar -->
        <div v-if="modalMode === 'view'" class="edm-actions-bar">
          <div v-if="!isEditing && !isChangingModality && !isChangingProfile && !isRetiring && !showEmailPreview" class="edm-action-row">
            <button class="edm-primary-action" @click="startEditing">
              <i class="fa-solid fa-pen-to-square"></i> Editar datos
            </button>
            <button class="edm-primary-action edm-action-blue" @click="loadEmailPreview">
              <i class="fa-solid fa-envelope-open-text"></i> Preview Correo
            </button>
            <div class="edm-dropdown-wrap">
              <button class="edm-dropdown-trigger" @click="showActionsMenu = !showActionsMenu">
                <i class="fa-solid fa-ellipsis-vertical"></i> Mas acciones
                <i class="fa-solid fa-chevron-down" style="font-size:9px;margin-left:2px"></i>
              </button>
              <div v-if="showActionsMenu" class="edm-dropdown-menu" @mouseleave="showActionsMenu = false">
                <div class="edm-dropdown-group">
                  <span class="edm-dropdown-label">Programa</span>
                  <button class="edm-dropdown-item" @click="showActionsMenu = false; $emit('open-rp', enrollment, selectedDetail)">
                    <i class="fa-solid fa-calendar-xmark"></i> Reprogramar Edicion <span class="edm-dd-tag">RP</span>
                  </button>
                  <button class="edm-dropdown-item" @click="showActionsMenu = false; $emit('open-cc', enrollment, selectedDetail)">
                    <i class="fa-solid fa-right-left"></i> Cambio de Curso <span class="edm-dd-tag edm-dd-tag-cc">CC</span>
                  </button>
                </div>
                <div class="edm-dropdown-sep"></div>
                <div class="edm-dropdown-group">
                  <span class="edm-dropdown-label">Alumno</span>
                  <button class="edm-dropdown-item" @click="showActionsMenu = false; isChangingModality = true">
                    <i class="fa-solid fa-shuffle"></i> Cambiar Modalidad
                  </button>
                  <button class="edm-dropdown-item" @click="showActionsMenu = false; isChangingProfile = true">
                    <i class="fa-solid fa-user-tag"></i> Cambiar Perfil
                  </button>
                </div>
                <div class="edm-dropdown-sep"></div>
                <button class="edm-dropdown-item edm-dropdown-danger" @click="showActionsMenu = false; isRetiring = true">
                  <i class="fa-solid fa-user-slash"></i> Retirar Alumno
                </button>
              </div>
            </div>
          </div>

          <!-- Editing justification panel -->
          <div v-if="isEditing" class="edm-edit-panel">
            <div class="edm-edit-head">
              <div class="edm-edit-title"><i class="fa-solid fa-pen-to-square"></i> Editar datos financieros</div>
              <button class="edm-edit-close" @click="isEditing = false; justificacion = ''"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="edm-edit-body">
              <label class="edm-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion del cambio (obligatorio)</label>
              <textarea v-model="justificacion" class="edm-textarea" rows="2" placeholder="Explica el motivo de la edicion..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="edm-footer">
        <button class="edm-btn-ghost" @click="$emit('update:visible', false)">Cerrar</button>

        <!-- Confirm mode footer -->
        <template v-if="modalMode === 'confirm'">
          <button
            v-if="isContadoMode"
            class="edm-btn-primary"
            :disabled="!canConfirmContado || confirmingPayment"
            @click="handleConfirmPayment"
          >
            <i class="fa-solid" :class="confirmingPayment ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            {{ confirmingPayment ? 'Confirmando...' : 'Confirmar Pago' }}
          </button>
          <button
            v-else-if="planStatus === 'borrador'"
            class="edm-btn-primary"
            :disabled="!modalInstallments.length || confirmingPayment"
            @click="handleConfirmPlan"
          >
            <i class="fa-solid" :class="confirmingPayment ? 'fa-spinner fa-spin' : 'fa-clipboard-check'"></i>
            {{ confirmingPayment ? 'Confirmando...' : 'Confirmar Pago' }}
          </button>
          <button
            v-else-if="planStatus === 'pendiente'"
            class="edm-btn-primary"
            :disabled="confirmingPayment"
            @click="handleSaveCuotasData"
          >
            <i class="fa-solid" :class="confirmingPayment ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ confirmingPayment ? 'Guardando...' : 'Guardar Datos Financieros' }}
          </button>
        </template>

        <!-- View mode + editing footer -->
        <template v-if="modalMode === 'view' && isEditing">
          <button class="edm-btn-ghost" @click="isEditing = false; justificacion = ''">Cancelar edicion</button>
          <button class="edm-btn-primary" :disabled="savingEdit || !justificacion.trim()" @click="handleSaveEdit">
            <i class="fa-solid" :class="savingEdit ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ savingEdit ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </template>
      </div>
    </template>
  </BaseModal>

  <!-- MODAL: Cambiar Modalidad -->
  <BaseModal :modelValue="isChangingModality" @update:modelValue="v => { isChangingModality = v; if(!v) modalityJustificacion = '' }" title="Cambiar Modalidad" size="sm">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div><label class="edm-fg-label">Modalidad actual</label><div class="edm-fg-static">{{ currentModality }}</div></div>
      <div><label class="edm-fg-label">Nueva modalidad</label><select v-model="newModalityId" class="edm-select"><option :value="null">Seleccionar...</option><option v-for="m in modalityOptions" :key="m.id" :value="m.id">{{ m.description }}</option></select></div>
    </div>
    <label class="edm-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion (obligatorio)</label>
    <textarea v-model="modalityJustificacion" class="edm-textarea" rows="2" placeholder="Motivo del cambio..."></textarea>
    <template #footer>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="edm-btn-ghost" @click="isChangingModality = false">Cancelar</button>
        <button class="edm-btn-exec" :disabled="!newModalityId || !modalityJustificacion.trim() || savingModality" @click="handleChangeModality">
          <i class="fa-solid" :class="savingModality ? 'fa-spinner fa-spin' : 'fa-check'"></i> {{ savingModality ? 'Guardando...' : 'Confirmar' }}
        </button>
      </div>
    </template>
  </BaseModal>

  <!-- MODAL: Cambiar Perfil -->
  <BaseModal :modelValue="isChangingProfile" @update:modelValue="v => { isChangingProfile = v; if(!v) profileJustificacion = '' }" title="Cambiar Perfil" size="sm">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div><label class="edm-fg-label">Perfil actual</label><div class="edm-fg-static">{{ currentProfile }}</div></div>
      <div><label class="edm-fg-label">Nuevo perfil</label><select v-model="newProfileId" class="edm-select"><option :value="null">Seleccionar...</option><option v-for="p in profileOptions" :key="p.id" :value="p.id">{{ p.description }}</option></select></div>
    </div>
    <label class="edm-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion (obligatorio)</label>
    <textarea v-model="profileJustificacion" class="edm-textarea" rows="2" placeholder="Motivo del cambio..."></textarea>
    <template #footer>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="edm-btn-ghost" @click="isChangingProfile = false">Cancelar</button>
        <button class="edm-btn-exec" :disabled="!newProfileId || !profileJustificacion.trim() || savingProfile" @click="handleChangeProfile">
          <i class="fa-solid" :class="savingProfile ? 'fa-spinner fa-spin' : 'fa-check'"></i> {{ savingProfile ? 'Guardando...' : 'Confirmar' }}
        </button>
      </div>
    </template>
  </BaseModal>

  <!-- MODAL: Retirar Alumno -->
  <BaseModal :modelValue="isRetiring" @update:modelValue="v => { isRetiring = v; if(!v) { retireReason = ''; retireHasRefund = false; retireRefundAmount = 0 } }" title="Retirar Alumno" size="sm">
    <div style="margin-bottom:14px">
      <label class="edm-fg-label">Motivo del retiro</label>
      <textarea v-model="retireReason" class="edm-textarea" rows="3" placeholder="Explica el motivo del retiro..." style="border-color:#FCA5A5;background:#FFF5F5"></textarea>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#374151;cursor:pointer">
        <input type="checkbox" v-model="retireHasRefund" style="width:16px;height:16px;cursor:pointer" /> Hubo devolucion
      </label>
      <div v-if="retireHasRefund" style="flex:1">
        <input v-model.number="retireRefundAmount" type="number" min="0" step="0.01" class="edm-select" placeholder="Monto devuelto..." />
      </div>
    </div>
    <template #footer>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="edm-btn-ghost" @click="isRetiring = false">Cancelar</button>
        <button class="edm-btn-exec" style="background:#DC2626" :disabled="!retireReason.trim() || savingRetire" @click="handleRetire">
          <i class="fa-solid" :class="savingRetire ? 'fa-spinner fa-spin' : 'fa-user-slash'"></i> {{ savingRetire ? 'Procesando...' : 'Confirmar Retiro' }}
        </button>
      </div>
    </template>
  </BaseModal>

  <!-- MODAL: Preview Correo -->
  <BaseModal :modelValue="showEmailPreview" @update:modelValue="v => showEmailPreview = v" title="Preview del Correo" size="lg">
    <div v-if="loadingEmailPreview" style="text-align:center;padding:40px;color:var(--e-text-muted)">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:20px"></i><p style="margin-top:10px">Cargando preview...</p>
    </div>
    <template v-else-if="emailPreviewData">
      <div style="display:flex;gap:16px;margin-bottom:14px;font-size:12.5px;padding:10px 14px;background:var(--e-bg-subtle);border-radius:8px">
        <div><span style="color:var(--e-text-muted);font-weight:600">Para:</span> <span style="font-weight:700">{{ emailPreviewData.to }}</span></div>
        <div><span style="color:var(--e-text-muted);font-weight:600">Asunto:</span> <span style="font-weight:700">{{ emailPreviewData.subject }}</span></div>
      </div>
      <div class="edm-email-frame-wrap">
        <iframe class="edm-email-frame" :srcdoc="emailPreviewData.html" sandbox="allow-same-origin"></iframe>
      </div>
    </template>
    <template #footer>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="edm-btn-ghost" @click="showEmailPreview = false">Cerrar</button>
        <button v-if="emailPreviewData" class="edm-btn-exec" :disabled="sendingEmail" @click="handleSendEmail">
          <i class="fa-solid" :class="sendingEmail ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i> {{ sendingEmail ? 'Enviando...' : 'Enviar Correo' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import BaseModal from '@/components/BaseModal.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  visible: Boolean,
  enrollment: Object,
  catalogs: Object
})

const emit = defineEmits(['update:visible', 'saved', 'open-rp', 'open-cc'])

const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)
const fmt = useEnrollmentFormatters()

const loadingDetail = ref(false)
const selectedDetail = ref({ installments: [], payment_history: [] })
const auditLog = ref([])
const modalTab = ref('detalle')

const modalMode = computed(() => {
  const s = (props.enrollment?.confirmation || props.enrollment?.student_status || '').toLowerCase()
  if (s.includes('aprob') || s.includes('confirm')) return 'view'
  return 'confirm'
})

const isEditing = ref(false)
const justificacion = ref('')
const savingEdit = ref(false)
const confirmingPayment = ref(false)
// Snapshot por installment_id de los valores al entrar en modo edicion;
// se usa para diff y para auditar solo cuotas pagadas realmente modificadas.
const paidCuotaSnapshot = ref(new Map())

const isChangingModality = ref(false)
const newModalityId = ref(null)
const modalityJustificacion = ref('')
const savingModality = ref(false)
const activeModalityId = ref(null)

const showActionsMenu = ref(false)
const showEmailPreview = ref(false)
const loadingEmailPreview = ref(false)
const emailPreviewData = ref(null)
const sendingEmail = ref(false)

async function loadEmailPreview () {
  showEmailPreview.value = true
  loadingEmailPreview.value = true
  emailPreviewData.value = null
  try {
    const data = await ficoService.previewEmail(Number(props.enrollment.enrollment_id))
    emailPreviewData.value = data
  } catch (err) {
    console.error(err)
    toast.error('Error cargando preview del correo')
    showEmailPreview.value = false
  } finally { loadingEmailPreview.value = false }
}

async function handleSendEmail () {
  sendingEmail.value = true
  try {
    const result = await ficoService.sendConfirmationEmail(Number(props.enrollment.enrollment_id))
    if (result?.success) {
      toast.success('Correo enviado correctamente.')
    } else {
      toast.error(`Error al enviar correo: ${result?.error || 'No se pudo enviar el correo'}`)
    }
    showEmailPreview.value = false
    ficoService.getAuditLog(Number(props.enrollment.enrollment_id)).then(r => { auditLog.value = r || [] }).catch(() => {})
  } catch (err) {
    console.error(err)
    toast.error(`Error al enviar correo: ${err?.response?.data?.error || err?.message || 'desconocido'}`)
  } finally { sendingEmail.value = false }
}

const odooEmail = ref(null)
const odooPassword = ref(null)
const showOdooPassword = ref(false)

const isRetiring = ref(false)
const retireReason = ref('')
const retireHasRefund = ref(false)
const retireRefundAmount = ref(0)
const savingRetire = ref(false)

async function handleRetire () {
  if (!retireReason.value.trim()) return
  savingRetire.value = true
  try {
    await ficoService.retireEnrollment({
      enrollment_id: Number(props.enrollment.enrollment_id),
      reason: retireReason.value.trim(),
      has_refund: retireHasRefund.value,
      refund_amount: retireHasRefund.value ? retireRefundAmount.value : 0,
      justificacion: retireReason.value.trim()
    })
    toast.success('Alumno retirado correctamente.')
    isRetiring.value = false
    retireReason.value = ''
    retireHasRefund.value = false
    retireRefundAmount.value = 0
    emit('update:visible', false)
    emit('saved')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al retirar alumno.')
  } finally { savingRetire.value = false }
}

const catalogService = inject('catalog', null)

const isChangingProfile = ref(false)
const newProfileId = ref(null)
const profileJustificacion = ref('')
const savingProfile = ref(false)
const activeProfileId = ref(null)

const profileOptions = computed(() => {
  if (catalogService) {
    return catalogService.options('we_profile').map(i => ({
      id: i.id ?? i.raw?.id,
      description: i.description ?? i.raw?.description
    }))
  }
  return [
    { id: 3086, description: 'PROFESIONAL' },
    { id: 3087, description: 'ESTUDIANTE' },
    { id: 3200, description: 'GENERAL' }
  ]
})

const currentProfile = computed(() => {
  const profId = activeProfileId.value || selectedDetail.value?.cat_profile_id || props.enrollment?.cat_profile_id
  if (!profId) return props.enrollment?.occupation_label === 'E' ? 'ESTUDIANTE' : 'PROFESIONAL'
  const found = profileOptions.value.find(p => p.id === profId)
  return found?.description || '---'
})

async function handleChangeProfile () {
  if (!newProfileId.value || !profileJustificacion.value.trim()) return
  savingProfile.value = true
  try {
    await ficoService.changeProfile({
      enrollment_id: Number(props.enrollment.enrollment_id),
      new_profile_id: newProfileId.value,
      justificacion: profileJustificacion.value.trim()
    })
    toast.success('Perfil actualizado correctamente.')
    activeProfileId.value = newProfileId.value
    isChangingProfile.value = false
    profileJustificacion.value = ''
    newProfileId.value = null
    const eid = Number(props.enrollment.enrollment_id)
    const response = await ficoService.getPaymentDetail(eid)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    ficoService.getAuditLog(eid).then(r => { auditLog.value = r || [] }).catch(() => {})
    emit('saved')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al cambiar perfil.')
  } finally { savingProfile.value = false }
}
const modalityOptions = computed(() => {
  if (catalogService) {
    return catalogService.options('we_insc_modality').map(i => ({
      id: i.id ?? i.raw?.id,
      description: i.description ?? i.raw?.description,
      alias: i.alias
    }))
  }
  return [
    { id: 2626, description: 'Normal (Regular)', alias: 'we_insc_modality_normal' },
    { id: 2625, description: 'Flexible (Flex)', alias: 'we_insc_modality_flexible' }
  ]
})

const currentModality = computed(() => {
  const modId = activeModalityId.value || selectedDetail.value?.cat_inscription_modality_id || props.enrollment?.cat_inscription_modality
  if (!modId) return props.enrollment?.modality || props.enrollment?.student_type_label || '---'
  const found = modalityOptions.value.find(m => m.id === modId)
  return found?.description || props.enrollment?.modality || '---'
})

async function handleChangeModality () {
  if (!newModalityId.value || !modalityJustificacion.value.trim()) return
  savingModality.value = true
  try {
    await ficoService.changeModality({
      enrollment_id: Number(props.enrollment.enrollment_id),
      new_modality_id: newModalityId.value,
      justificacion: modalityJustificacion.value.trim()
    })
    toast.success('Modalidad actualizada correctamente.')
    activeModalityId.value = newModalityId.value
    isChangingModality.value = false
    modalityJustificacion.value = ''
    newModalityId.value = null
    const eid = Number(props.enrollment.enrollment_id)
    const response = await ficoService.getPaymentDetail(eid)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    ficoService.getAuditLog(eid).then(r => { auditLog.value = r || [] }).catch(() => {})
    emit('saved')
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al cambiar modalidad.')
  } finally { savingModality.value = false }
}

const ficoForm = reactive({
  cat_currency: null,
  cat_payment_medium: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: ''
})

function resetFicoForm () {
  ficoForm.cat_currency = null
  ficoForm.cat_payment_medium = null
  ficoForm.cat_business_entity = null
  ficoForm.bank_account_id = null
  ficoForm.transaction_code = ''
}

const cuotaTab = ref('inicial')
const modalInstallments = ref([])

const modalInicial = computed(() => {
  return modalInstallments.value.find(i => i.installment_number === 0 || i.is_reserva) || null
})

const modalCuotas = computed(() => {
  return modalInstallments.value.filter(i => i.installment_number !== 0 && !i.is_reserva)
})

const planStatus = computed(() => {
  const conf = (props.enrollment?.confirmation || '').toLowerCase()
  if (conf.includes('confirm') || conf.includes('aprob')) return 'pendiente'
  return 'borrador'
})

const cuotasTotal = computed(() => {
  return modalCuotas.value.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
})

const isContadoMode = computed(() => {
  return props.enrollment ? fmt.isContado(props.enrollment) : true
})

const isInstallmentPlan = computed(() => {
  const inst = selectedDetail.value?.installments
  return inst && inst.length > 1
})

const showDiscountTip = ref(false)

const modalListPrice = computed(() => {
  return Number(props.enrollment?.list_price) || Number(selectedDetail.value?.list_price) || 0
})

const modalDescuento = computed(() => {
  return Number(props.enrollment?.total_discounted) || Number(selectedDetail.value?.discount_amount) || 0
})

const modalTotal = computed(() => {
  if (modalInstallments.value?.length) {
    return modalInstallments.value.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  }
  return Number(props.enrollment?.total_to_pay) || Number(selectedDetail.value?.net_amount) || 0
})

const modalReserva = computed(() => props.enrollment ? fmt.getReserva(props.enrollment) : 0)

const modalPagado = computed(() => {
  const e = props.enrollment
  if (!e) return Number(selectedDetail.value?.amount_paid) || 0
  return fmt.getPagado(e)
})

const modalSaldo = computed(() => {
  const e = props.enrollment
  if (!e) return Number(selectedDetail.value?.balance_due) || 0
  return fmt.calcSaldo(e)
})

const modalVoucher = computed(() => {
  return props.enrollment?.payment_vouchers || null
})

const modalDiscountLines = computed(() => {
  const e = props.enrollment
  if (!e) return []
  const lines = []
  if (e.main_discount) lines.push(e.main_discount)
  if (e.additional_discounts) lines.push(e.additional_discounts)
  return lines
})

const modalOccupation = computed(() => {
  const val = props.enrollment?.occupation_label || ''
  const map = { 'P': 'Profesional', 'E': 'Estudiante' }
  return map[val] || val || '---'
})

const modalAdditionalInfo = computed(() => {
  return props.enrollment?.additional_info || null
})

const lastPayment = computed(() => {
  const hist = selectedDetail.value?.payment_history
  if (!hist || !Array.isArray(hist) || !hist.length) return null
  return hist[0]
})

const contadoAccounts = computed(() => filteredAccounts(ficoForm.cat_business_entity))

const canConfirmContado = computed(() => {
  return ficoForm.cat_currency && ficoForm.cat_payment_medium
})

function filteredAccounts (entityId) {
  if (!entityId || !props.catalogs?.allBankAccounts) return []
  return props.catalogs.allBankAccounts.filter(a => a.business_entity_catalog_id === entityId)
}

function buildInstallments () {
  const inst = selectedDetail.value?.installments || []
  const payments = selectedDetail.value?.payment_history || []
  modalInstallments.value = inst.map(i => {
    const pay = payments.find(p => p.installment_id === i.installment_id)
    const payDateIso = pay?.payment_date ? String(pay.payment_date).slice(0, 10) : ''
    return {
      ...i,
      status: resolveInstallmentStatus(i),
      _cat_currency: pay?.cat_payment_medium_id ? (selectedDetail.value?.cat_currency_id || null) : (i.cat_currency || null),
      _cat_payment_medium: pay?.cat_payment_medium_id || i.cat_payment_medium || null,
      _cat_business_entity: pay?.cat_business_entity_id || i.cat_business_entity || null,
      _bank_account_id: pay?.bank_account_id || i.bank_account_id || null,
      _transaction_code: pay?.transaction_code || i.transaction_code || '',
      _payment_date: payDateIso,
      _payment_id: pay?.payment_id || null,
      _voucher_url: pay?.evidence_url || i.evidence_url || null,
      _isNew: false
    }
  })
}

function addCuota () {
  const nextNum = modalCuotas.value.length + 1
  modalInstallments.value.push({
    installment_number: nextNum,
    amount: 0,
    due_date: '',
    status: 'pending',
    _cat_currency: null,
    _cat_payment_medium: null,
    _cat_business_entity: null,
    _bank_account_id: null,
    _transaction_code: '',
    _voucher_url: null,
    _isNew: true
  })
}

function removeCuota (idx) {
  const cuota = modalCuotas.value[idx]
  const realIdx = modalInstallments.value.indexOf(cuota)
  if (realIdx !== -1) modalInstallments.value.splice(realIdx, 1)
}

function canDeleteCuota (c) {
  if (c.status === 'paid') return false
  if (planStatus.value === 'borrador') return true
  if (c._isNew) return true
  return false
}

function resolveInstallmentStatus (i) {
  const alias = i.status_alias || ''
  if (alias.includes('paid')) return 'paid'
  if (alias.includes('pending')) return 'pending'
  return 'draft'
}

function startEditing () {
  const p = lastPayment.value
  ficoForm.cat_currency = selectedDetail.value?.cat_currency_id || null
  ficoForm.cat_payment_medium = p?.cat_payment_medium_id || null
  ficoForm.cat_business_entity = p?.cat_business_entity_id || null
  ficoForm.bank_account_id = p?.bank_account_id || null
  ficoForm.transaction_code = p?.transaction_code || ''
  paidCuotaSnapshot.value = new Map(
    modalInstallments.value
      .filter(c => c.status === 'paid' && c.installment_id)
      .map(c => [c.installment_id, snapshotPaidCuota(c)])
  )
  isEditing.value = true
}

function snapshotPaidCuota (c) {
  return {
    amount: Number(c.amount) || 0,
    due_date: c.due_date ? String(c.due_date).slice(0, 10) : null,
    cat_currency: c._cat_currency || null,
    cat_payment_medium: c._cat_payment_medium || null,
    cat_business_entity: c._cat_business_entity || null,
    bank_account_id: c._bank_account_id || null,
    transaction_code: c._transaction_code || '',
    payment_date: c._payment_date ? String(c._payment_date).slice(0, 10) : '',
    payment_id: c._payment_id || null
  }
}

async function handleConfirmPayment () {
  if (!canConfirmContado.value || confirmingPayment.value) return
  confirmingPayment.value = true
  try {
    const enrollmentId = Number(props.enrollment.enrollment_id)
    await ficoService.confirmPayment({
      enrollment_id: enrollmentId,
      action: 'confirm_contado',
      cat_currency: ficoForm.cat_currency,
      cat_payment_medium: ficoForm.cat_payment_medium,
      cat_business_entity: ficoForm.cat_business_entity,
      bank_account_id: ficoForm.bank_account_id,
      transaction_code: ficoForm.transaction_code
    })
    const odoo = await ficoService.enrollInOdoo(enrollmentId)
    if (odoo?.error) {
      toast.warning('Pago registrado, pero no se pudo inscribir en Odoo: ' + odoo.error, { timeout: 6000 })
    } else {
      toast.success('Pago registrado e inscripcion en Odoo completada.', { timeout: 4000 })
    }
    const emailResult = await ficoService.sendConfirmationEmail(enrollmentId)
    if (emailResult?.success) {
      toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
    } else {
      toast.error(`Error al enviar correo: ${emailResult?.error || 'fallo desconocido'}`, { timeout: 6000 })
    }
    emit('update:visible', false)
    emit('saved')
  } catch (err) {
    console.error('Error confirmando pago:', err)
    toast.error('Error al confirmar el pago.')
  } finally { confirmingPayment.value = false }
}

async function handleConfirmPlan () {
  if (confirmingPayment.value) return
  confirmingPayment.value = true
  try {
    const keepInstallments = modalInstallments.value.map(c => ({
      installment_id: c.installment_id || null,
      installment_number: c.installment_number,
      amount: Number(c.amount) || 0,
      due_date: c.due_date || null,
      is_new: c._isNew || false
    }))
    const enrollmentId = Number(props.enrollment.enrollment_id)
    await ficoService.confirmPayment({
      enrollment_id: enrollmentId,
      action: 'confirm_plan',
      installments: keepInstallments
    })
    const odoo = await ficoService.enrollInOdoo(enrollmentId)
    if (odoo?.error) {
      toast.warning('Plan confirmado, pero no se pudo inscribir en Odoo: ' + odoo.error, { timeout: 6000 })
    } else {
      toast.success('Plan de cuotas confirmado e inscripcion en Odoo completada.', { timeout: 4000 })
    }
    const emailResult = await ficoService.sendConfirmationEmail(enrollmentId)
    if (emailResult?.success) {
      toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
    } else {
      toast.error(`Error al enviar correo: ${emailResult?.error || 'fallo desconocido'}`, { timeout: 6000 })
    }
    const response = await ficoService.getPaymentDetail(enrollmentId)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    buildInstallments()
    emit('saved')
  } catch (err) {
    console.error('Error confirmando plan:', err)
    toast.error('Error al confirmar el plan.')
  } finally { confirmingPayment.value = false }
}

async function handleSaveCuotasData () {
  if (confirmingPayment.value) return
  confirmingPayment.value = true
  try {
    const allInst = [...(modalInicial.value ? [modalInicial.value] : []), ...modalCuotas.value]
    const installments = allInst
      .filter(c => c.status !== 'paid')
      .map(c => ({
        installment_id: c.installment_id || null,
        installment_number: c.installment_number,
        amount: Number(c.amount) || 0,
        due_date: c.due_date || null,
        cat_currency: c._cat_currency,
        cat_payment_medium: c._cat_payment_medium,
        cat_business_entity: c._cat_business_entity,
        bank_account_id: c._bank_account_id,
        transaction_code: c._transaction_code,
        is_new: c._isNew || false
      }))
    const eid = Number(props.enrollment.enrollment_id)
    await ficoService.confirmPayment({
      enrollment_id: eid,
      action: 'update_installments_data',
      installments
    })
    toast.success('Datos financieros guardados correctamente.', { timeout: 3000 })
    ficoService.sendPaymentConfirmationEmail(eid).then(r => {
      if (r?.success) toast.info('Correo de confirmacion de cuota enviado.', { timeout: 4000 })
    }).catch(() => {})
    ficoService.syncInstallmentPayment(eid).then(r => {
      if (r?.success) toast.info('Cuota sincronizada con Odoo.', { timeout: 4000 })
    }).catch(() => {})
    const response = await ficoService.getPaymentDetail(eid)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    buildInstallments()
    emit('saved')
  } catch (err) {
    console.error('Error guardando datos:', err)
    toast.error('Error al guardar los datos financieros.')
  } finally { confirmingPayment.value = false }
}

async function handleSaveEdit () {
  if (!justificacion.value.trim()) { toast.error('Debes ingresar una justificacion para guardar cambios.'); return }
  savingEdit.value = true
  try {
    const eid = Number(props.enrollment.enrollment_id)
    const fields = {}
    if (ficoForm.cat_payment_medium) fields.cat_payment_medium = ficoForm.cat_payment_medium
    if (ficoForm.cat_business_entity) fields.cat_business_entity = ficoForm.cat_business_entity
    if (ficoForm.bank_account_id) fields.bank_account_id = ficoForm.bank_account_id
    if (ficoForm.transaction_code) fields.transaction_code = ficoForm.transaction_code
    if (ficoForm.cat_currency) fields.cat_currency = ficoForm.cat_currency
    fields.notes = selectedDetail.value?.notes || null

    const paidDiffs = collectPaidCuotaDiffs()
    if (paidDiffs.length) fields.paid_installments = paidDiffs

    await ficoService.enrollmentUpdate({
      enrollment_id: eid,
      justificacion: justificacion.value.trim(),
      fields
    })
    toast.success('Cambios guardados correctamente.')
    isEditing.value = false
    justificacion.value = ''
    paidCuotaSnapshot.value = new Map()
    const response = await ficoService.getPaymentDetail(eid)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    buildInstallments()
    ficoService.getAuditLog(eid).then(r => { auditLog.value = r || [] }).catch(() => {})
    emit('saved')
  } catch (err) {
    console.error(err)
    toast.error('Error al guardar cambios.')
  } finally { savingEdit.value = false }
}

// Compara los valores actuales con el snapshot tomado al iniciar edicion.
// Devuelve solo cuotas pagadas con al menos un campo modificado.
function collectPaidCuotaDiffs () {
  const out = []
  for (const c of modalInstallments.value) {
    if (c.status !== 'paid' || !c.installment_id) continue
    const before = paidCuotaSnapshot.value.get(c.installment_id)
    if (!before) continue
    const after = snapshotPaidCuota(c)
    const dirty = Object.keys(after).some(k => (after[k] ?? null) !== (before[k] ?? null))
    if (!dirty) continue
    out.push({
      installment_id: c.installment_id,
      installment_number: c.installment_number,
      payment_id: before.payment_id,
      before,
      after
    })
  }
  return out
}

watch(() => props.enrollment, async (e) => {
  if (!e || !props.visible) return
  resetFicoForm()
  cuotaTab.value = 'inicial'
  isEditing.value = false
  isChangingModality.value = false
  isChangingProfile.value = false
  justificacion.value = ''
  activeProfileId.value = null
  activeModalityId.value = null
  odooEmail.value = null
  odooPassword.value = null
  showOdooPassword.value = false
  modalTab.value = 'detalle'
  ficoService.getEnrollmentFlags(Number(e.enrollment_id)).then(flags => {
    if (flags) {
      activeProfileId.value = flags.cat_profile_id || null
      activeModalityId.value = flags.cat_inscription_modality || null
      odooEmail.value = flags.odoo_email || null
      odooPassword.value = flags.odoo_password || null
    }
  }).catch(() => {})
  auditLog.value = []
  loadingDetail.value = true
  try {
    const response = await ficoService.getPaymentDetail(Number(e.enrollment_id))
    selectedDetail.value = response || { installments: [], payment_history: [] }
  } catch (err) {
    console.error('Error cargando detalle:', err)
    selectedDetail.value = { installments: [], payment_history: [] }
  } finally {
    loadingDetail.value = false
    buildInstallments()
  }
  ficoService.getAuditLog(Number(e.enrollment_id)).then(r => { auditLog.value = r || [] }).catch(() => {})
}, { immediate: true })
</script>

<style scoped>
/* CSS Variables */
.edm-loading,
.edm-tabs,
.edm-audit,
.edm-student,
.edm-info-cards,
.edm-additional,
.edm-fin-bar,
.edm-payment-section,
.edm-actions-bar,
.edm-footer {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #F9FAFB;
  --e-border: #E5E7EB;
  --e-text: #111827;
  --e-text-secondary: #6B7280;
  --e-text-muted: #9CA3AF;
  --e-accent: #0D9488;
  --e-success: #059669;
  --e-warning: #D97706;
  --e-danger: #DC2626;
  --e-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --e-mono: 'JetBrains Mono', 'SF Mono', monospace;
}

/* Loading */
.edm-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 24px;
  color: var(--e-text-muted);
  font-size: 13px;
}

.edm-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--e-border);
  border-top-color: var(--e-accent);
  border-radius: 50%;
  animation: edm-spin 0.7s linear infinite;
}

@keyframes edm-spin { to { transform: rotate(360deg); } }

/* Tabs */
.edm-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--e-border);
  margin-bottom: 20px;
}

.edm-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--e-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  font-family: var(--e-font);
}

.edm-tab:hover { color: var(--e-text); }
.edm-tab.active { color: var(--e-accent); border-bottom-color: var(--e-accent); }

.edm-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--e-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

/* Audit timeline */
.edm-audit { padding: 4px 0; }

.edm-audit-item {
  display: flex;
  gap: 14px;
  position: relative;
  padding-bottom: 20px;
}

.edm-audit-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 32px;
  bottom: 0;
  width: 2px;
  background: var(--e-border);
}

.edm-audit-dot {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  background: var(--e-text-muted);
  position: relative;
  z-index: 1;
}

.dot-created { background: var(--e-accent); }
.dot-approved { background: var(--e-success); }
.dot-edited { background: var(--e-warning); }
.dot-odoo_enrolled { background: #6366F1; }
.dot-email_sent { background: #3B82F6; }
.dot-edition_reprogrammed { background: #F59E0B; }
.dot-course_changed { background: #8B5CF6; }
.dot-created_from_cc { background: #8B5CF6; }

.edm-audit-body { flex: 1; padding-top: 4px; }

.edm-audit-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.edm-audit-action { font-size: 13px; font-weight: 600; color: var(--e-text); }
.edm-audit-user { font-size: 12px; color: var(--e-text-secondary); }
.edm-audit-date { font-size: 11px; color: var(--e-text-muted); margin-left: auto; }

.edm-audit-details {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--e-text-secondary);
  line-height: 1.5;
}

.edm-audit-justificacion {
  margin-top: 6px;
  padding: 8px 12px;
  background: #FEF3C7;
  border-radius: 6px;
  font-size: 12px;
  color: #92400E;
  line-height: 1.4;
}

.edm-audit-justificacion i { margin-right: 4px; font-size: 10px; opacity: 0.6; }

.edm-audit-changes {
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--e-bg-subtle);
  border-radius: 6px;
  border: 1px solid var(--e-border);
}

.edm-change-row { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 0; }
.edm-change-field { font-weight: 600; color: var(--e-text-secondary); }
.edm-old { color: var(--e-danger); text-decoration: line-through; }
.edm-new { color: var(--e-success); font-weight: 600; }

/* Empty state */
.edm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: var(--e-text-muted);
  font-size: 13px;
}

.edm-empty i { font-size: 28px; opacity: 0.4; }

/* Student header */
.edm-student {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--e-bg);
  border: 1px solid var(--e-border);
  border-left: 3px solid var(--e-accent);
  border-radius: 6px;
  margin-bottom: 16px;
}

.edm-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F0FDFA, #CCFBF1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--e-accent);
  font-size: 18px;
  flex-shrink: 0;
}

.edm-student-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.edm-student-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-top: 2px; }
.edm-meta-col { display: flex; flex-direction: column; gap: 2px; }
.edm-name { margin: 0; font-size: 18px; font-weight: 700; color: var(--e-text); line-height: 1.3; }
.edm-doc { font-size: 12px; color: var(--e-text-secondary); display: inline-flex; align-items: center; gap: 4px; }
.edm-doc i { font-size: 11px; color: var(--e-text-muted); }
.edm-contact { font-size: 12px; color: var(--e-text-secondary); display: inline-flex; align-items: center; gap: 4px; }
.edm-contact i { font-size: 11px; color: var(--e-accent, #0D9488); }
.edm-occupation { font-size: 12px; color: var(--e-text-muted); display: inline-flex; align-items: center; gap: 4px; }
.edm-occupation i { font-size: 11px; }

.edm-total-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.edm-total-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--e-text-muted); font-weight: 600; }
.edm-total-amount { font-size: 20px; font-weight: 700; color: var(--e-text); font-family: var(--e-mono); }

/* Info cards */
.edm-info-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.edm-info-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: var(--e-bg);
  border: 1px solid var(--e-border);
  border-radius: 6px;
}

.edm-ic-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ic-blue { background: #EFF6FF; color: #3B82F6; }
.ic-purple { background: #F5F3FF; color: #8B5CF6; }
.ic-green { background: #F0FDF4; color: var(--e-success); }
.ic-amber { background: #FFFBEB; color: var(--e-warning); }

.edm-ic-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--e-text-muted); font-weight: 600; margin-bottom: 2px; }
.edm-ic-value { display: block; font-size: 13px; font-weight: 600; color: var(--e-text); line-height: 1.3; word-break: break-word; }

/* Additional info */
.edm-additional {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #F0FDFA;
  border: 1px solid #99F6E4;
  border-radius: 6px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #115E59;
}

.edm-additional i { font-size: 13px; color: var(--e-accent); flex-shrink: 0; }

/* Financial bar */
.edm-fin-bar {
  display: flex;
  align-items: stretch;
  background: var(--e-bg-subtle);
  border: 1px solid var(--e-border);
  border-radius: 6px;
  padding: 12px 0;
  margin-bottom: 16px;
}

.edm-fin-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  position: relative;
}

.edm-fin-sep {
  width: 1px;
  background: var(--e-border);
  align-self: stretch;
}

.edm-fin-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--e-text-muted); font-weight: 600; }
.edm-fin-value { font-size: 14px; font-weight: 600; color: var(--e-text); font-family: var(--e-mono); }

.edm-fin-discount-wrap { position: relative; }

.edm-fin-has-tip {
  cursor: help;
  position: relative;
}

.edm-tip-icon { font-size: 10px; margin-left: 3px; opacity: 0.5; }

.edm-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--e-text);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
  font-family: var(--e-font);
  font-weight: 400;
}

.edm-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--e-text);
}

.edm-tip-row { padding: 1px 0; }

/* Payment section */
.edm-payment-section { margin-bottom: 14px; }

.edm-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--e-text);
  margin: 0 0 12px;
}

.edm-section-title i { color: var(--e-accent); }

/* Contado card */
.edm-contado-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--e-bg-subtle);
  border: 1px solid var(--e-border);
  border-radius: 6px;
}

.edm-contado-amount { display: flex; flex-direction: column; gap: 2px; }
.edm-contado-voucher { flex-shrink: 0; }

.edm-voucher-link {
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
  transition: background 0.15s;
}

.edm-voucher-link:hover { background: #DBEAFE; }

.edm-voucher-link-sm {
  color: #2563EB;
  font-size: 14px;
  text-decoration: none;
}

.edm-voucher-link-sm:hover { opacity: 0.7; }

/* Form rows */
.edm-form-row { display: grid; gap: 10px; }
.edm-form-5 { grid-template-columns: repeat(5, 1fr); }
.mt12 { margin-top: 12px; }

.edm-field { display: flex; flex-direction: column; gap: 4px; }
.edm-field label { font-size: 11px; font-weight: 600; color: var(--e-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; }

.edm-readonly {
  font-size: 13px;
  color: var(--e-text);
  padding: 7px 0;
  border-bottom: 1px dashed var(--e-border);
  min-height: 32px;
  line-height: 1.4;
}

.edm-input,
.edm-select {
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  font-family: var(--e-font);
  color: var(--e-text);
  background: var(--e-bg);
  border: 1px solid var(--e-border);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s;
}

.edm-input:focus,
.edm-select:focus { border-color: var(--e-accent); }

.edm-input:disabled,
.edm-select:disabled { background: var(--e-bg-subtle); color: var(--e-text-muted); cursor: not-allowed; }

.edm-select-sm {
  height: 28px;
  padding: 0 6px;
  font-size: 11px;
  font-family: var(--e-font);
  color: var(--e-text);
  background: var(--e-bg);
  border: 1px solid var(--e-border);
  border-radius: 4px;
  outline: none;
  width: 100%;
}

.edm-select-sm:focus { border-color: var(--e-accent); }
.edm-select-sm:disabled { background: var(--e-bg-subtle); color: var(--e-text-muted); cursor: not-allowed; }

/* Cuota tabs */
.edm-cuota-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--e-border);
  margin-bottom: 14px;
}

.edm-cuota-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--e-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  font-family: var(--e-font);
}

.edm-cuota-tab:hover { color: var(--e-text); }
.edm-cuota-tab.active { color: var(--e-accent); border-bottom-color: var(--e-accent); }

.edm-tab-body { padding: 2px 0; }

/* Inicial card */
.edm-inicial-card {
  padding: 14px 16px;
  background: var(--e-bg-subtle);
  border: 1px solid var(--e-border);
  border-radius: 6px;
}

.edm-inicial-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edm-inicial-info { display: flex; flex-direction: column; gap: 2px; }

.edm-inicial-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* Notice */
.edm-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.edm-notice i { font-size: 16px; margin-top: 1px; flex-shrink: 0; }
.edm-notice strong { display: block; font-size: 13px; margin-bottom: 2px; }
.edm-notice p { margin: 0; }

.edm-notice-draft {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  color: #92400E;
}

.edm-notice-draft i { color: #D97706; }

/* Cuotas toolbar */
.edm-cuotas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.edm-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--e-font);
  transition: opacity 0.15s;
}

.edm-btn-sm:hover { opacity: 0.85; }
.edm-btn-teal { background: var(--e-accent); color: #fff; }

/* Table */
.edm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: var(--e-text);
}

.edm-table thead th {
  background: var(--e-bg-subtle);
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--e-text-secondary);
  border-bottom: 2px solid var(--e-border);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.edm-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--e-border);
  vertical-align: middle;
}

.edm-table tbody tr:hover { background: var(--e-bg-subtle); }

.edm-table .cuota-paid td { background: #F0FDF4; }
.edm-table .cuota-overdue td { background: #FEF2F2; }

.edm-total-row td {
  padding: 10px;
  border-top: 2px solid var(--e-border);
  background: var(--e-bg-subtle);
  font-size: 13px;
}

.edm-empty-row {
  text-align: center;
  padding: 24px;
  color: var(--e-text-muted);
  font-size: 12px;
}

.edm-btn-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: #FEE2E2;
  color: var(--e-danger);
  cursor: pointer;
  font-size: 11px;
  transition: background 0.15s;
}

.edm-btn-del:hover { background: #FECACA; }

/* Pill */
.edm-pill {
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
.pill-muted { background: #F3F4F6; color: #6B7280; }
.pill-slate { background: #F1F5F9; color: #475569; }

/* Actions bar */
.edm-actions-bar {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--e-border);
}

.edm-action-btns {
  display: flex;
  gap: 10px;
}

/* Action row + dropdown */
.edm-action-row { display: flex; align-items: center; gap: 8px; }
.edm-primary-action {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; font-size: 12.5px; font-weight: 600;
  border: 1px solid var(--e-border); border-radius: 6px;
  background: var(--e-bg); color: var(--e-text-secondary);
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.edm-primary-action:hover { border-color: var(--e-accent); color: var(--e-accent); }
.edm-action-blue:hover { border-color: #3B82F6 !important; color: #3B82F6 !important; }

.edm-dropdown-wrap { position: relative; }
.edm-dropdown-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 12.5px; font-weight: 600;
  border: 1px solid var(--e-border); border-radius: 6px;
  background: var(--e-bg); color: var(--e-text-secondary);
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.edm-dropdown-trigger:hover { border-color: var(--e-text-muted); color: var(--e-text); }
.edm-dropdown-menu {
  position: absolute; bottom: calc(100% + 6px); right: 0;
  min-width: 240px; background: #fff; border: 1px solid var(--e-border);
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.1);
  padding: 6px; z-index: 50; animation: edm-dropdown-in .12s ease-out;
}
@keyframes edm-dropdown-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.edm-dropdown-group { padding: 4px 0; }
.edm-dropdown-label {
  display: block; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--e-text-muted); padding: 6px 12px 4px;
}
.edm-dropdown-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 9px 12px; font-size: 13px; font-weight: 500; color: var(--e-text);
  border: none; background: none; border-radius: 6px;
  cursor: pointer; transition: background .1s; text-align: left; font-family: inherit;
}
.edm-dropdown-item:hover { background: var(--e-bg-subtle); }
.edm-dropdown-item i { width: 16px; text-align: center; color: var(--e-text-muted); font-size: 13px; }
.edm-dropdown-danger { color: #DC2626; }
.edm-dropdown-danger:hover { background: #FEF2F2; }
.edm-dropdown-danger i { color: #DC2626; }
.edm-dropdown-sep { height: 1px; background: var(--e-border); margin: 4px 8px; }
.edm-dd-tag {
  margin-left: auto; padding: 2px 7px; border-radius: 4px;
  font-size: 10px; font-weight: 700; background: #FEF3C7; color: #92400E;
}
.edm-dd-tag-cc { background: #EDE9FE; color: #6D28D9; }
.edm-odoo-bar {
  display: flex; gap: 16px; padding: 10px 16px; margin-bottom: 14px;
  background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 8px;
}
.edm-odoo-item { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.edm-odoo-item > i { color: #7C3AED; font-size: 13px; }
.edm-odoo-label { color: var(--e-text-muted); font-weight: 600; }
.edm-odoo-value { color: var(--e-text); font-weight: 700; }
.edm-odoo-mono { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
.edm-odoo-toggle {
  background: none; border: none; color: #7C3AED; cursor: pointer;
  font-size: 12px; padding: 2px 4px; border-radius: 4px; transition: all .15s;
}
.edm-odoo-toggle:hover { background: #EDE9FE; }

/* legacy cleanup */
.edm-email-frame-wrap {
  border: 1px solid var(--e-border, #E5E7EB); border-radius: 8px; overflow: hidden;
  background: #fff;
}
.edm-email-frame {
  width: 100%; height: 450px; border: none; display: block;
}
/* cleaned up - actions moved to dropdown */

.edm-act-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  background: #FEF3C7;
  color: #92400E;
  letter-spacing: 0.02em;
}

.edm-act-tag-cc { background: #F3E8FF; color: #6B21A8; }

/* Edit panel */
.edm-edit-panel {
  border: 1px solid var(--e-border);
  border-radius: 6px;
  overflow: hidden;
}

.edm-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--e-bg-subtle);
  border-bottom: 1px solid var(--e-border);
}

.edm-edit-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--e-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.edm-edit-title i { color: var(--e-accent); }

.edm-edit-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: none;
  background: none;
  color: var(--e-text-muted);
  cursor: pointer;
  font-size: 14px;
  transition: color 0.15s;
}

.edm-edit-close:hover { color: var(--e-text); }

.edm-edit-body { padding: 14px 16px; }

.edm-warn-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 6px;
}

.edm-warn-label i { font-size: 13px; color: var(--e-warning); }

.edm-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  font-family: var(--e-font);
  color: var(--e-text);
  background: var(--e-bg);
  border: 1px solid var(--e-border);
  border-radius: 6px;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
}

.edm-textarea:focus { border-color: var(--e-accent); }

/* Footer */
.edm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.edm-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--e-bg);
  color: var(--e-text-secondary);
  border: 1px solid var(--e-border);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--e-font);
  cursor: pointer;
  transition: all 0.15s;
}

.edm-btn-ghost:hover { background: var(--e-bg-subtle); border-color: var(--e-text-muted); }

.edm-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--e-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--e-font);
  cursor: pointer;
  transition: opacity 0.15s;
}

.edm-btn-primary:hover { opacity: 0.9; }
.edm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Utility */
.tr { text-align: right; }
.tc { text-align: center; }
.fw700 { font-weight: 700; }
.mono { font-family: var(--e-mono); }
.c-green { color: var(--e-success); }
.c-blue  { color: #2563EB; }
.c-red { color: var(--e-danger); }
.c-muted { color: var(--e-text-muted); }
</style>
