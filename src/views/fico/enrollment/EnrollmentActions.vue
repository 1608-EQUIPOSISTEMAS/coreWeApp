<template>
  <section class="eact-section">
    <!-- Banner trazabilidad: inscripcion proveniente de migracion A5 -->
    <div v-if="replacesEnrollmentId" class="eact-banner warn">
      <i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>
      <div>
        <strong>Inscripcion creada por migracion A5</strong>
        <p>Reemplaza a la inscripcion <a href="#" @click.prevent="$emit('open-related', replacesEnrollmentId)">#{{ replacesEnrollmentId }}</a> (edicion cancelada). Los pagos viven en la original hasta que se apruebe la migracion.</p>
      </div>
    </div>

    <!-- Acciones agrupadas por lo que tocan; cada tarjeta dice que hace para no
         tener que abrirla para saberlo. El retiro va aparte y en rojo. -->
    <div v-if="!activeAction" class="eact-groups">
      <section v-if="!isModalityOnlyRole && (isPendingReview || (canManageEnrollment && !isOriginMoved))" class="eact-group">
        <h4 class="eact-group-title">Movimientos de la venta</h4>
        <div class="eact-tiles">
          <button v-if="isPendingReview" type="button" class="eact-tile ok" @click="startAction('approveMigration')">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            <span class="eact-tile-text"><strong>Aprobar migración</strong><small>Trae las cuotas de la venta original y confirma la nueva edición</small></span>
            <span class="eact-tag">PR</span>
          </button>
          <template v-if="canManageEnrollment && !isOriginMoved">
            <button type="button" class="eact-tile" @click="startAction('rp')">
              <i class="fa-solid fa-calendar-xmark" aria-hidden="true"></i>
              <span class="eact-tile-text"><strong>Reprogramar edición</strong><small>Mismo programa, otra edición; las cuotas pendientes viajan</small></span>
              <span class="eact-tag">RP</span>
            </button>
            <button type="button" class="eact-tile" @click="startAction('cc')">
              <i class="fa-solid fa-right-left" aria-hidden="true"></i>
              <span class="eact-tile-text"><strong>Cambio de curso</strong><small>Pasa lo pagado a otro programa y calcula la diferencia</small></span>
              <span class="eact-tag violet">CC</span>
            </button>
          </template>
        </div>
      </section>

      <section class="eact-group">
        <h4 class="eact-group-title">Datos</h4>
        <div class="eact-tiles">
          <button type="button" class="eact-tile" @click="startAction('modality')">
            <i class="fa-solid fa-shuffle" aria-hidden="true"></i>
            <span class="eact-tile-text"><strong>Cambiar modalidad</strong><small>Normal o Flex; también a los módulos hijos</small></span>
          </button>
          <template v-if="!isModalityOnlyRole">
            <button type="button" class="eact-tile" @click="startAction('editStudent')">
              <i class="fa-solid fa-user-pen" aria-hidden="true"></i>
              <span class="eact-tile-text"><strong>Editar alumno</strong><small>Nombre, documento, correos, teléfono y perfil</small></span>
            </button>
            <button v-if="canManageEnrollment" type="button" class="eact-tile" @click="startAction('editSellerAgent')">
              <i class="fa-solid fa-user-tie" aria-hidden="true"></i>
              <span class="eact-tile-text"><strong>Editar asesor</strong><small>Canal y asesor al que se atribuye la venta</small></span>
            </button>
          </template>
        </div>
      </section>

      <section v-if="!isModalityOnlyRole && canManageEnrollment" class="eact-group">
        <h4 class="eact-group-title">Retiro</h4>
        <div class="eact-tiles">
          <button type="button" class="eact-tile bad" @click="startAction('retire')">
            <i class="fa-solid fa-user-slash" aria-hidden="true"></i>
            <span class="eact-tile-text"><strong>Retirar alumno</strong><small>Baja de la venta y sus módulos, anula cuotas pendientes y lo saca de Odoo</small></span>
          </button>
        </div>
      </section>
    </div>

    <!-- Active action with stepper -->
    <div v-if="activeAction" ref="activeActionForm" class="eact-active">
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
              <select v-model="rpEditionId" class="ds-input" :disabled="loadingEditions">
                <option :value="null" disabled>{{ loadingEditions ? 'Cargando ediciones…' : 'Seleccionar edición…' }}</option>
                <option v-for="ed in rpEditions" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
              </select>
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
                  <input v-model.number="c.amount" type="number" step="0.01" min="0.01" class="ds-input eact-input-amount" />
                  <input v-model="c.due_date" type="date" class="ds-input" />
                </div>
                <div class="eact-rp-plan-foot" :class="{ 'eact-rp-plan-foot--err': !rpPlanSumsOk }">
                  <span>Total del plan: {{ fmt.formatMoney(rpPlanTotal) }}</span>
                  <span v-if="!rpPlanSumsOk">Debe igualar el saldo pendiente ({{ fmt.formatMoney(rpPendingTotal) }})</span>
                </div>
              </div>
              <small class="eact-price-hint">Lo ya pagado queda en la inscripcion RP; estas cuotas se trasladan a la nueva inscripcion y saldran en el correo.</small>
            </div>
            <PersonalAccountField v-model="rpPersonalAccount" :program-version-id="props.enrollment?.program_version_id ?? null" />
            <div class="eact-field">
              <label>Justificación<span class="ds-req">*</span></label>
              <textarea v-model="rpJustificacion" class="ds-input" required rows="3" placeholder="Motivo de la reprogramacion..."></textarea>
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
                <select v-model="ccEditionId" class="ds-input" :disabled="!ccProgramVersionId || ccLoadingEditions || ccNoEdition" @change="onCCEditionChange">
                  <option :value="null" disabled>{{ ccLoadingEditions ? 'Cargando...' : (ccNoEdition ? 'No aplica' : 'Seleccionar edicion...') }}</option>
                  <option v-for="ed in ccEditionsList" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                </select>
                <small v-if="ccIsMembershipDest" class="eact-price-hint">Las membresias no tienen edicion; se activan por fecha de membresia.</small>
                <small v-else-if="ccNoEdition" class="eact-price-hint">Este programa no tiene ediciones publicadas; el destino se crea sin edicion.</small>
              </div>
            </div>
            <div class="eact-grid-3">
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
                <input v-model.number="ccTotalAmount" type="number" step="0.01" min="0" class="ds-input eact-input-amount" placeholder="0.00" />
              </div>
            </div>

            <div class="eact-field">
              <label>Cuotas de la diferencia <span class="eact-rp-saldo">Total destino: {{ fmt.formatMoney(ccDestinationTotal) }}</span></label>
              <div v-if="ccNewInstallments.length" class="eact-rp-plan">
                <div class="eact-rp-plan-head eact-cc-plan-grid">
                  <span>#</span><span>Monto</span><span>Vencimiento</span><span></span>
                </div>
                <div v-for="(c, i) in ccNewInstallments" :key="i" class="eact-rp-plan-row eact-cc-plan-grid">
                  <span class="eact-rp-plan-num">{{ i + 1 }}</span>
                  <input v-model.number="c.amount" type="number" step="0.01" min="0.01" class="ds-input eact-input-amount" />
                  <input v-model="c.due_date" type="date" class="ds-input" />
                  <button class="btn-icon btn-icon-sm" type="button" title="Quitar cuota" aria-label="Quitar cuota" @click="ccNewInstallments.splice(i, 1)">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              <div>
                <button class="btn-exec btn-exec-outline btn-sm" type="button" :disabled="!(ccTotalAmount > 0)" @click="addCcInstallment">
                  <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar cuota
                </button>
              </div>
              <small class="eact-price-hint">Opcional. El "Monto a registrar" queda como inicial pagada; estas cuotas quedan pendientes en la nueva inscripcion y salen en el correo.</small>
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
                <select v-model="ccForm.bank_account_id" class="ds-input" :disabled="!ccForm.cat_business_entity">
                  <option :value="null">{{ ccForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                  <option v-for="a in filteredAccounts(ccForm.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }} — {{ a.account_number }}</option>
                </select>
              </div>
              <div class="eact-field">
                <label>N. Operacion</label>
                <input v-model.trim="ccForm.transaction_code" type="text" class="ds-input" placeholder="Codigo de operacion..." />
              </div>
            </div>
            <div class="eact-field">
              <label>Comprobante(s) de pago</label>
              <MultiFileUploader v-model="ccForm.ticket_payment_urls" label="Adjuntar comprobante" :required="false" />
            </div>

            <PersonalAccountField v-model="ccPersonalAccount" :program-version-id="ccProgramVersionId" />
            <div class="eact-field">
              <label>Justificación<span class="ds-req">*</span></label>
              <textarea v-model="ccJustificacion" class="ds-input" required rows="3" placeholder="Motivo del cambio de curso..."></textarea>
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
                <select v-model="newModalityId" class="ds-input">
                  <option :value="null">Seleccionar...</option>
                  <option v-for="m in modalityOptions" :key="m.id" :value="m.id">{{ m.description }}</option>
                </select>
              </div>
            </div>
            <div class="eact-field">
              <label>Justificación<span class="ds-req">*</span></label>
              <textarea v-model="modalityJustificacion" class="ds-input" rows="2" placeholder="Motivo del cambio..."></textarea>
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
                <input v-model="editStudentForm.first_name" type="text" class="ds-input" />
              </div>
              <div class="eact-field">
                <label>Apellidos</label>
                <input v-model="editStudentForm.last_name" type="text" class="ds-input" />
              </div>
              <div class="eact-field">
                <label>N. Documento</label>
                <input v-model="editStudentForm.document_number" type="text" class="ds-input" />
              </div>
              <div class="eact-field">
                <label>Correo Original</label>
                <input v-model="editStudentForm.origin_email" type="email" class="ds-input" />
              </div>
              <div class="eact-field">
                <label>Correo Odoo</label>
                <input v-model="editStudentForm.odoo_email" type="email" class="ds-input" />
              </div>
              <div class="eact-field">
                <label>Telefono</label>
                <input v-model="editStudentForm.origin_phone" type="text" class="ds-input" />
              </div>
              <div class="eact-field">
                <label>Perfil</label>
                <select v-model="editStudentForm.cat_profile_id" class="ds-input">
                  <option :value="null">Seleccionar...</option>
                  <option v-for="p in profileOptions" :key="p.id" :value="p.id">{{ p.description }}</option>
                </select>
              </div>
            </div>
            <div class="eact-field">
              <label>Justificación<span class="ds-req">*</span></label>
              <textarea v-model="editStudentJustificacion" class="ds-input" rows="2" placeholder="Motivo de la edicion..."></textarea>
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
                <label>Canal<span class="ds-req">*</span></label>
                <SearchSelect
                  v-model="newAgentCategory"
                  :items="agentCategoryOptions"
                  label-field="label"
                  value-field="id"
                  placeholder="Seleccionar canal..."
                  required
                  @update:modelValue="onAgentCategoryChange"
                />
              </div>
            </div>
            <!-- Canal WEB: el asesor no se elige de la lista completa, se elige
                 la consulta que YA registro para este alumno y este programa.
                 Sin consulta no hay trazabilidad y el match queda bloqueado. -->
            <div class="eact-field" v-if="newAgentCategory === 'web'">
              <label>Consulta del asesor<span class="ds-req">*</span></label>
              <div v-if="loadingWebCandidates" class="eact-readonly eact-note">
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Buscando consultas con el telefono del alumno...
              </div>
              <SearchSelect
                v-else-if="webCandidates.length"
                v-model="webMatchLeadId"
                :items="webCandidates"
                label-field="label"
                value-field="lead_id"
                placeholder="Buscar consulta por asesor..."
                required
              />
              <div v-else class="ds-callout bad">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                Ningun asesor registro una consulta con el telefono del alumno para este programa.
                El asesor debe registrarla antes de que se le pueda atribuir la venta.
              </div>
            </div>
            <div class="eact-field" v-else-if="newAgentCategory && !WE_CATS.includes(newAgentCategory)">
              <label>Nuevo asesor <span v-if="newAgentCategory !== 'sa'" class="ds-req">*</span><span v-else class="eact-optional">(opcional para S/A)</span></label>
              <SearchSelect
                v-model="newSellerAgentId"
                :items="filteredAgentOptions"
                label-field="label"
                value-field="user_id"
                placeholder="Buscar asesor por alias o nombre..."
                :required="newAgentCategory !== 'sa'"
              />
            </div>
            <div v-if="WE_CATS.includes(newAgentCategory)" class="eact-readonly eact-note">
              <i class="fa-solid fa-circle-info" aria-hidden="true"></i> Canal WE no lleva asesor individual asignado.
            </div>
            <small v-if="agentPreview" class="eact-price-hint">
              <i class="fa-solid fa-eye" aria-hidden="true"></i> Asesor quedara como: <strong>{{ agentPreview }}</strong>
            </small>
            <div class="eact-field">
              <label>Justificación<span class="ds-req">*</span></label>
              <textarea v-model="editAgentJustificacion" class="ds-input" rows="2" placeholder="Motivo del cambio de asesor..."></textarea>
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
              <label>Motivo del retiro<span class="ds-req">*</span></label>
              <textarea v-model="retireReason" class="ds-input" required rows="3" placeholder="Explica el motivo del retiro..."></textarea>
            </div>
            <div class="eact-refund-row">
              <label class="eact-checkbox-label">
                <input type="checkbox" v-model="retireHasRefund" /> Hubo devolucion
              </label>
              <div v-if="retireHasRefund" class="eact-refund-input">
                <input v-model.number="retireRefundAmount" type="number" min="0" step="0.01" class="ds-input" placeholder="Monto devuelto..." />
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
            <div class="eact-banner warn">
              <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
              <div>
                <strong>Aprobar inscripcion migrada</strong>
                <p>Esto transferira las cuotas pendientes desde la inscripcion origen <strong>#{{ replacesEnrollmentId }}</strong>, inscribira al alumno en Odoo (si aplica) y enviara el correo de confirmacion con la nueva edicion.</p>
              </div>
            </div>
            <div class="eact-readonly">
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
            <div class="eact-banner warn">
              <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <div>
                <strong>Observar inscripcion</strong>
                <p>La inscripcion sera devuelta al asesor comercial para correccion. Se le notificara automaticamente.</p>
              </div>
            </div>
            <div class="eact-field">
              <label>Motivo de la observacion<span class="ds-req">*</span></label>
              <textarea v-model="observeReason" class="ds-input" required rows="3" placeholder="Describe que debe corregir el asesor..."></textarea>
            </div>
            <!-- Unica salida del bloqueo por copia requerida: si el asesor la
                 pidio por error, se baja aca y queda auditado. -->
            <label v-if="detail?.requires_email_cc" class="eact-cc-clear">
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
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, inject, getCurrentInstance } from 'vue'
import { ServiceKeys } from '@/services'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { useToast } from 'vue-toastification'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import ActionStepper from '@/components/ActionStepper.vue'
import EmailPreviewStep from './EmailPreviewStep.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'
import PersonalAccountField from './PersonalAccountField.vue'
import { parseLocalDate, isWithinCourseChangeWindow, isWithinReprogramWindow, isMovedOrigin, addOneMonth } from './editionWindows.js'

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
// RP, CC, retiro y reasignacion de asesor son de FICO. Espeja FICO_ACTION_ROLES
// del backend (enrollment.routes.js): sin esto el boton se ve y el POST devuelve 403.
const canManageEnrollment = computed(() => $hasRole(['ADMIN', 'FICO', 'LIDER_FICO']))
// Academica entra a la inscripcion solo para corregir la modalidad del alumno.
// Se excluye a quien ademas tenga rol FICO/ADMIN para no recortarle acciones
// que si le tocan.
const isModalityOnlyRole = computed(() =>
  $hasRole(['ACADEMICA', 'LIDER_ACADEMICA']) && !canManageEnrollment.value
)

const enrollmentId = computed(() => Number(props.enrollment?.enrollment_id))
const activeAction = ref(null)
const stepperStep = ref(0)
const saving = ref(false)
const hasEmailStep = ref(true)
const emailPreviewRef = ref(null)
// Un solo contenedor basta: cada accion vive en su ActionStepper con v-if, asi
// que adentro solo esta el formulario activo (y su preview con credenciales SAP).
const activeActionForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(activeActionForm)

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
// Origen ya en CC/RP: su destino existe y lo que falte se corrige ahi. Un
// segundo RP/CC duplica la inscripcion (el backend tambien lo rechaza).
const isOriginMoved = computed(() => {
  const alias = props.enrollment?.cat_type_status_alias
    || props.detail?.cat_type_status_alias
    || props.enrollment?.type_status_alias
  return isMovedOrigin(alias)
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
    // Una venta ya clasificada como WEB abre con la categoria puesta, sin pasar
    // por onAgentCategoryChange: hay que pedir las consultas igual.
    if (newAgentCategory.value === 'web') loadWebCandidates()
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
  rpPersonalAccount.value = emptyPersonalAccount()
  ccPersonalAccount.value = emptyPersonalAccount()
  ccProgramVersionId.value = null
  ccEditionId.value = null
  ccTotalAmount.value = 0
  ccNewInstallments.value = []
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
  webMatchLeadId.value = null
  webCandidates.value = []
  editAgentJustificacion.value = ''
  retireReason.value = ''
  retireHasRefund.value = false
  retireRefundAmount.value = 0
  observeReason.value = ''
  clearCcRequirement.value = false
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
//
// sp_fico_payment_detail_get NO devuelve cat_status, solo status_alias: el filtro
// numerico solo nunca descartaba nada. Por eso un SEG (hijo de paquete, cuota
// unica de S/0 ya pagada) mostraba un plan de cuotas imposible de cuadrar —
// exige montos > 0 que sumen 0 — y dejaba "Siguiente" deshabilitado para siempre.
const PAID_ALIASES = ['we_inst_paid', 'we_payment_status_paid']
const rpPendingCuotas = computed(() => {
  const conPago = new Set((props.detail?.payment_history || []).map(p => p.installment_id))
  return (props.detail?.installments || []).filter(i =>
    i.installment_number > 0 &&
    Number(i.amount) > 0 &&
    !PAID_ALIASES.includes(i.status_alias) &&
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

// CUENTA PERSONAL del destino (RP/CC): opcional, pero si se marca en un paquete
// tiene que ir en al menos un modulo. { provider, modules }.
const emptyPersonalAccount = () => ({ provider: null, modules: null })
const personalAccountComplete = pa => !pa.provider || pa.modules === null || pa.modules.length > 0
const rpPersonalAccount = ref(emptyPersonalAccount())
const ccPersonalAccount = ref(emptyPersonalAccount())
const personalAccountPayload = pa => ({
  personal_account: pa.provider,
  personal_account_modules: pa.provider ? pa.modules : null
})

const canAdvanceRP = computed(() =>
  rpEditionId.value !== null &&
  rpJustificacion.value.trim().length > 0 &&
  (rpPendingCuotas.value.length === 0 || rpPlanSumsOk.value) &&
  personalAccountComplete(rpPersonalAccount.value)
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

async function handleReprogramConfirm () {
  if (!requiredFieldsFilled()) return
  saving.value = true
  try {
    const payload = {
      enrollment_id: enrollmentId.value,
      new_edition_id: rpEditionId.value,
      justificacion: rpJustificacion.value.trim(),
      ...personalAccountPayload(rpPersonalAccount.value)
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

// Cuotas que financian el CC (upgrade de membresia: paga parte hoy y el resto
// en cuotas). Cada cuota nueva propone el mismo monto un mes despues de la
// anterior, que es como FICO arma el cronograma.
const ccNewInstallments = ref([])
const ccFinancedTotal = computed(() => ccNewInstallments.value.reduce((s, c) => s + (Number(c.amount) || 0), 0))
const ccDestinationTotal = computed(() => (Number(ccTotalAmount.value) || 0) + ccFinancedTotal.value)

function addCcInstallment () {
  const last = ccNewInstallments.value.at(-1)
  ccNewInstallments.value.push({
    amount: last?.amount ?? null,
    due_date: last?.due_date ? addOneMonth(last.due_date) : ''
  })
}

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
  !!ccJustificacion.value.trim() &&
  personalAccountComplete(ccPersonalAccount.value)
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
      .filter(e => isWithinCourseChangeWindow(e.start_date))
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
  if (!requiredFieldsFilled()) return
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
      })),
      ...personalAccountPayload(ccPersonalAccount.value),
      new_installments: ccNewInstallments.value.map(c => ({ amount: Number(c.amount), due_date: c.due_date }))
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
// Match WEB: consultas ya registradas por un asesor para este alumno y este
// programa. Reemplazan al dropdown de asesores cuando el canal es WEB.
const webMatchLeadId = ref(null)
const webCandidates = ref([])
const loadingWebCandidates = ref(false)
// Los asesores de convenio (NY12/JF39) son users con rol B2B o LIDER_B2B y
// sp_user_list no los devuelve: hay que pedirlos aparte, igual que
// EnrollmentForm.vue al crear.
const b2bAgentOptions = ref([])
const loadingAgents = ref(false)

// Espejo de agentCategoryOptions en EnrollmentForm.vue: misma identidad y orden.
const agentCategoryOptions = [
  { id: 'comercial', label: 'Comercial (sin canal)' },
  { id: 'b2b',       label: 'B2B' },
  { id: 'web',       label: 'WEB' },
  { id: 'twe',       label: 'TWE - Talento' },
  { id: 'fwe',       label: 'FWE - Fundacion' },
  { id: 'we',        label: 'WE (generico)' },
  { id: 'sa',        label: 'S/A (Sin Asesor)' }
]

// Canales WE: no llevan asesor individual, el canal ES el origen.
const WE_CATS = ['we', 'twe', 'fwe']

// Mapeo inverso: agent_origin almacenado -> categoria UI.
function categoryFromOrigin (origin) {
  if (origin === 'B2B') return 'b2b'
  if (origin === 'WEB') return 'web'
  if (origin === 'TWE') return 'twe'
  if (origin === 'FWE') return 'fwe'
  if (origin === 'WE')  return 'we'
  if (origin === 'SA')  return 'sa'
  return 'comercial'
}

// agent_origin a persistir desde la categoria seleccionada.
function originFromCategory (cat) {
  if (cat === 'b2b') return 'B2B'
  if (cat === 'web') return 'WEB'
  if (WE_CATS.includes(cat)) return cat.toUpperCase()
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
// b2b -> 'ALIAS — B2B', resto -> 'ALIAS — Nombre' (default).
// we no usa este dropdown (no hay user_id valido para WE); web tampoco: ahi se
// elige la consulta del asesor, no el asesor.
const filteredAgentOptions = computed(() => {
  const cat = newAgentCategory.value
  if (WE_CATS.includes(cat)) return []
  if (cat === 'b2b') {
    // Universo B2B = asesores de convenio (rol B2B) + comerciales, que tambien
    // pueden cerrar una venta B2B ("B2B - AE30"). Dedup por user_id porque un
    // comercial puede tener ambos roles; los de convenio van primero.
    const byId = new Map()
    for (const a of [...b2bAgentOptions.value, ...agentOptions.value]) {
      const id = Number(a.user_id)
      if (!byId.has(id)) byId.set(id, { ...a, label: `${a.alias} — B2B` })
    }
    return [...byId.values()]
  }
  // 'web' no pasa por aqui: elige consulta, no asesor (ver webCandidates).
  return agentOptions.value
})

const canAdvanceEditAgent = computed(() => {
  if (!newAgentCategory.value) return false
  if (!editAgentJustificacion.value.trim()) return false

  const cat = newAgentCategory.value
  const newId = Number(newSellerAgentId.value) || null

  // web: el asesor sale de la consulta elegida, no de la lista de asesores.
  if (cat === 'web') return !!webMatchLeadId.value

  // we: no requiere asesor (siempre se persiste seller_agent_id=null).
  // sa: asesor opcional (decision: permitir combinacion 'SA + asesor').
  // comercial/b2b: asesor requerido.
  if (!WE_CATS.includes(cat) && cat !== 'sa' && !newId) return false

  const oldOrigin = props.enrollment?.agent_origin || null
  const oldId    = props.enrollment?.seller_agent_id || null
  const newOrigin = originFromCategory(cat)
  const newIdFinal = WE_CATS.includes(cat) ? null : newId

  // Algo debe haber cambiado (canal o asesor) para que tenga sentido guardar.
  return Number(oldId) !== Number(newIdFinal) || oldOrigin !== newOrigin
})

const agentPreview = computed(() => {
  const cat = newAgentCategory.value
  if (!cat) return ''
  if (WE_CATS.includes(cat)) return cat.toUpperCase()

  const origin = originFromCategory(cat)
  const u = cat === 'web'
    ? webCandidates.value.find(c => Number(c.lead_id) === Number(webMatchLeadId.value))
    : agentOptions.value.find(a => Number(a.user_id) === Number(newSellerAgentId.value))

  if (!u) {
    // Sin asesor + canal: muestra solo el canal (SA o nada).
    return origin || ''
  }
  return origin ? `${origin} - ${u.alias}` : u.alias
})

// Asesor efectivo: en el canal WEB lo dicta el dueno de la consulta elegida;
// en el resto, el dropdown de asesores.
const selectedAgentId = computed(() => {
  if (newAgentCategory.value !== 'web') return Number(newSellerAgentId.value) || null
  const c = webCandidates.value.find(x => Number(x.lead_id) === Number(webMatchLeadId.value))
  return c ? Number(c.user_id) : null
})

function onAgentCategoryChange () {
  // Al cambiar canal, descarta la seleccion previa para forzar al usuario a
  // elegir un asesor del nuevo universo. Evita combinaciones residuales.
  newSellerAgentId.value = null
  webMatchLeadId.value = null
  if (newAgentCategory.value === 'web') loadWebCandidates()
}

async function loadWebCandidates () {
  loadingWebCandidates.value = true
  try {
    const rows = await ficoService.webMatchCandidates(enrollmentId.value)
    webCandidates.value = (rows || []).map(c => ({
      ...c,
      // El programa va en la etiqueta porque el match cruza por curso, no por
      // version: la consulta puede estar registrada contra otra version del
      // mismo curso y FICO tiene que poder verlo antes de confirmar.
      label: `${c.alias} — ${c.full_name} · ${c.lead_program || 'sin programa'} · consulta del ${fmtLeadDate(c.lead_date)} · ${c.lead_status || 'sin estado'}`
    }))
  } catch (err) {
    console.error('[loadWebCandidates]', err)
    webCandidates.value = []
    toast.error('No se pudieron cargar las consultas del alumno.')
  } finally {
    loadingWebCandidates.value = false
  }
}

function fmtLeadDate (iso) {
  if (!iso) return 's/f'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
}

function toAgentOptions (rows, keep) {
  return (rows || [])
    .filter(keep)
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
}

async function loadAgentOptions () {
  if (agentOptions.value.length > 0) return
  loadingAgents.value = true
  try {
    const [arr, b2bArr] = await Promise.all([
      authService.userList({}),
      // Degradar en vez de romper: sin la lista de convenio el canal B2B sigue
      // ofreciendo comerciales, que es el comportamiento previo a este fix.
      authService.userListB2B().catch(e => {
        console.error('[loadAgentOptions] roles B2B:', e)
        return []
      })
    ])
    agentOptions.value = toAgentOptions(arr, u => u.alias && u.active)
    // Sin filtro por `active`: sp_user_list_by_role ya acota el universo y los
    // externos de convenio no siempre traen la bandera.
    b2bAgentOptions.value = toAgentOptions(b2bArr, u => u.alias)
  } catch (err) {
    console.error('[loadAgentOptions]', err)
    toast.error('No se pudieron cargar los asesores.')
  } finally {
    loadingAgents.value = false
  }
}

async function handleEditSellerAgent () {
  if (!requiredFieldsFilled()) return
  saving.value = true
  try {
    const cat = newAgentCategory.value
    const newId = WE_CATS.includes(cat) ? null : selectedAgentId.value
    const data = await ficoService.editSellerAgent({
      enrollment_id: enrollmentId.value,
      new_seller_agent_id: newId,
      new_agent_origin: originFromCategory(cat),
      lead_id: cat === 'web' ? Number(webMatchLeadId.value) || null : null,
      justificacion: editAgentJustificacion.value.trim()
    })
    toast.success(data?.message || 'Asesor actualizado correctamente.')
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
const clearCcRequirement = ref(false)

async function handleObserve () {
  if (!requiredFieldsFilled()) return
  saving.value = true
  try {
    await ficoService.rejectEnrollment({
      enrollment_id: enrollmentId.value,
      reason: observeReason.value.trim(),
      clear_cc_requirement: clearCcRequirement.value
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
  if (!requiredFieldsFilled()) return
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
/* Todo con tokens ds-*: el modo oscuro sale de los tokens. Inputs = ds-input. */
.eact-section { display: flex; flex-direction: column; gap: var(--ds-gap); }

.eact-banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; border-radius: var(--ds-radius-sm);
  font-size: 12.5px; line-height: 1.5;
}
.eact-banner.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.eact-banner > i { flex-shrink: 0; margin-top: 2px; font-size: 15px; }
.eact-banner strong { display: block; margin-bottom: 2px; font-size: 13px; }
.eact-banner p { margin: 0; }
.eact-banner a { color: inherit; font-weight: 700; text-decoration: underline; }

/* Tarjetas de accion agrupadas */
.eact-groups { display: flex; flex-direction: column; gap: 18px; }
.eact-group-title { margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-muted); }
.eact-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.eact-tile {
  display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; text-align: left; cursor: pointer;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius); background: var(--ds-surface);
  font-family: inherit; color: var(--ds-ink);
  transition: border-color 0.15s, background 0.15s;
}
.eact-tile:hover { border-color: var(--ds-accent); background: var(--ds-surface-2); }
.eact-tile:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 2px; }
.eact-tile > i {
  display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px;
  border-radius: var(--ds-radius-sm); background: var(--ds-soft-info); color: var(--ds-info-ink); font-size: 14px;
}
.eact-tile-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.eact-tile-text strong { font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.eact-tile-text small { font-size: 11.5px; line-height: 1.4; color: var(--ds-ink-2); }
.eact-tile.ok > i { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.eact-tile.ok { border-color: var(--ds-ok); }
.eact-tile.bad > i { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.eact-tile.bad strong { color: var(--ds-bad-ink); }
.eact-tile.bad:hover { border-color: var(--ds-bad); background: var(--ds-soft-bad); }
.eact-tag {
  flex-shrink: 0; padding: 2px 7px; border-radius: var(--ds-radius-control);
  background: var(--ds-soft-neutral); color: var(--ds-ink-2); font-size: 10.5px; font-weight: 700;
}
.eact-tag.violet { background: var(--ds-soft-violet); color: var(--ds-violet-ink); }

/* Formularios de cada accion (dentro del ActionStepper) */
.eact-active { margin-top: 4px; }
.eact-form { display: flex; flex-direction: column; gap: 16px; }
.eact-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
.eact-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 16px; }
.eact-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.eact-field > label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-ink-2); }
.eact-optional { margin-left: 4px; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--ds-muted); }
.eact-readonly { padding: 8px 12px; border-radius: var(--ds-radius-control); background: var(--ds-surface-2); font-size: 13px; font-weight: 600; color: var(--ds-ink); }
.eact-note { font-size: 12px; font-weight: 500; color: var(--ds-ink-2); }
.eact-input-amount { font-family: var(--ds-font-mono); text-align: right; }

.eact-student-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface-2);
}
.eact-student-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.eact-student-name { font-size: 14px; font-weight: 700; color: var(--ds-heading); }
.eact-student-doc { font-size: 12px; color: var(--ds-muted); font-variant-numeric: tabular-nums; }
.eact-program-pill {
  max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 4px 10px; border-radius: var(--ds-radius-control);
  background: var(--ds-soft-info); color: var(--ds-info-ink); font-size: 11px; font-weight: 700;
}

.eact-subsection-label {
  padding-top: 6px; border-top: 1px solid var(--ds-border);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ds-heading);
}
.eact-amount { padding: 8px 0; font-family: var(--ds-font-mono); font-size: 14px; font-weight: 700; color: var(--ds-heading); }
.eact-amount-green { color: var(--ds-ok-ink); }
.eact-amount-red { color: var(--ds-bad-ink); }
.eact-price-hint { display: block; margin-top: 2px; font-size: 11px; color: var(--ds-ink-2); }

.eact-refund-row { display: flex; align-items: center; gap: 14px; }
.eact-refund-input { flex: 1; }
.eact-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--ds-ink); }
.eact-checkbox-label input, .eact-cc-clear input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--ds-accent); }

.eact-cc-clear {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; cursor: pointer;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  font-size: 12px; line-height: 1.5; color: var(--ds-ink-2);
}
.eact-cc-clear input { flex-shrink: 0; margin-top: 3px; }
.eact-cc-clear strong { display: block; margin-bottom: 2px; font-size: 12.5px; color: var(--ds-ink); }

/* Plan de cuotas de la reprogramacion */
.eact-rp-saldo { float: right; font-weight: 700; text-transform: none; letter-spacing: 0; color: var(--ds-warn-ink); }
.eact-rp-plan { overflow: hidden; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }
.eact-rp-plan-head, .eact-rp-plan-row { display: grid; grid-template-columns: 32px 1fr 1fr; gap: 10px; align-items: center; padding: 6px 12px; }
.eact-rp-plan-head { background: var(--ds-surface-2); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ds-muted); }
.eact-cc-plan-grid { grid-template-columns: 32px 1fr 1fr 32px; }
.eact-rp-plan-row { border-top: 1px solid var(--ds-border); }
.eact-rp-plan-num { font-size: 12px; font-weight: 700; color: var(--ds-ink-2); }
.eact-rp-plan-foot {
  display: flex; justify-content: space-between; padding: 8px 12px;
  border-top: 1px solid var(--ds-border); background: var(--ds-surface-2);
  font-size: 12px; font-weight: 700; color: var(--ds-ink);
}
.eact-rp-plan-foot--err { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }

@media (max-width: 900px) {
  .eact-grid-2, .eact-grid-3 { grid-template-columns: 1fr; }
}
</style>
