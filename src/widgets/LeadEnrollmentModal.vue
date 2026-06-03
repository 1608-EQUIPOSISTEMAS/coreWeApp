<template>
  <BaseModal :model-value="show" @update:model-value="$emit('update:show', $event)" title="Detalle de Matrícula" size="xl">
    <div v-if="isLoading" class="exec-loader py-5">
      <div class="loader-ring"></div>
      <p class="text-muted small mt-2 fw-600">Cargando información financiera...</p>
    </div>
    <div v-else-if="data" class="px-4 py-3">
      <!-- Banner de observacion FICO -->
      <div v-if="observed" class="obs-enroll-banner mb-4">
        <div class="obs-enroll-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="obs-enroll-body">
          <strong>Inscripcion Observada por FICO</strong>
          <p>{{ observed.reason }}</p>
        </div>
        <button class="obs-enroll-btn" :disabled="resubmitting" @click="$emit('resubmit')">
          <i class="fa-solid" :class="resubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
          {{ resubmitting ? 'Reenviando...' : 'Reenviar a FICO' }}
        </button>
      </div>
      <div class="enrollment-header mb-4">
        <div>
          <h6 class="enrollment-title">{{ data.abbreviation }}</h6>
          <div v-if="data.version_name || data.edition_label" class="enrollment-sub">
            <span v-if="data.version_name"><i class="fa-solid fa-layer-group me-1"></i> {{ data.version_name }}</span>
            <span v-if="data.version_name && data.edition_label" class="mx-2 text-slate-300">|</span>
            <span v-if="data.edition_label"><i class="fa-regular fa-calendar me-1"></i> {{ data.edition_label }}</span>
          </div>
        </div>
        <span v-if="data.modality_label" class="pill pill-slate border">{{ data.modality_label }}</span>
      </div>
      <div class="row g-4">
        <div class="col-md-6 border-end pe-4">
          <h6 class="fieldset-title">Información del Alumno</h6>
          <div class="info-block mb-3"><label class="exec-label">Nombre Completo</label><span class="info-value">{{ data.student_name }}</span></div>
          <div class="d-flex justify-content-between mb-3">
            <div class="info-block"><label class="exec-label">Documento</label><span class="info-value text-mono">{{ data.document_number }}</span></div>
            <div class="info-block"><label class="exec-label">Fecha Inscripción</label><span class="info-value text-muted" style="font-weight:500;">{{ data.registration_date }}</span></div>
            <div class="info-block mb-3">
              <label class="exec-label">Canal de Pago</label>
              <span class="pill pill-slate border"><i class="fa-solid fa-credit-card me-1"></i>{{ data.payment_channel_label || '—' }}</span>
            </div>
            <div class="info-block mb-3" v-if="data.payment_method_label || data.token_provider_label">
              <label class="exec-label">{{ data.payment_channel_alias === 'we_channel_token' ? 'Proveedor Link/Token' : 'Método de Pago' }}</label>
              <span class="info-value">{{ data.payment_method_label || data.token_provider_label || '—' }}</span>
            </div>
          </div>
          <div class="info-block mb-3">
            <label class="exec-label mb-1">Estado de Matrícula</label>
            <span class="pill" :class="data.active === 'Y' ? 'pill-teal' : 'pill-red'">{{ data.status_label || 'Desconocido' }}</span>
          </div>
          <div class="info-block mb-3"><label class="exec-label">Asesor que Registró</label><span class="info-value"><i class="fa-solid fa-user-tie me-1 text-slate-400"></i>{{ data.seller_name || '—' }}</span></div>
        </div>
        <div class="col-md-6 ps-3">
          <h6 class="fieldset-title">Desglose Financiero</h6>
          <div class="d-flex align-items-center gap-2 mb-3">
            <i class="fa-solid fa-credit-card text-slate-400"></i>
            <span class="fw-700 text-dark" style="font-size:13px;">{{ data.payment_plan_label || '—' }}</span>
            <span class="pill pill-slate" style="font-size:9px;">Plan de Pago</span>
          </div>
          <div class="finance-card">
            <div class="d-flex justify-content-between mb-2 pb-2">
              <span class="text-secondary fw-600" style="font-size:12px;">Precio de Lista: <span class="pill pill-slate ms-1">{{ data.profile_label || 'General' }}</span></span>
              <span class="fw-700 text-dark" style="font-size:14px;">{{ formatMoney(data.currency_symbol, data.list_price) }}</span>
            </div>
            <div v-if="data.discounts_list && data.discounts_list.length > 0" class="mb-2">
              <div v-for="(desc, i) in data.discounts_list" :key="i" class="d-flex justify-content-between align-items-center c-red py-1">
                <span class="text-muted" style="font-size:11.5px;"><i class="fa-solid fa-tag me-1"></i><span class="fw-600">{{ desc.label || desc.name }}</span><span v-if="desc.value" class="text-slate-400 ms-1 fst-italic">({{ desc.value }}{{ desc.alias && desc.alias.includes('percent') ? '%' : '' }})</span></span>
                <span class="fw-700 c-red" style="font-size:12.5px;">- {{ formatMoney(data.currency_symbol, desc.calculated_amount) }}</span>
              </div>
              <hr class="my-2" style="border-color:var(--slate-100);">
            </div>
            <!-- Después del bloque de descuentos, antes de "Total a Pagar" -->
            <div v-if="data.reserva_amount > 0"
                class="d-flex justify-content-between align-items-center mb-2 pb-1">
              <span class="fw-600 text-muted" style="font-size:12px;">
                <i class="fa-solid fa-hand-holding-dollar me-1 text-blue-400"></i>
                Adelanto / Reserva:
              </span>
              <span class="fw-700" style="font-size:12.5px; color:#1d4ed8;">
                {{ formatMoney(data.currency_symbol, data.reserva_amount) }}
              </span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <span class="fw-700 text-dark" style="font-size:12.5px;">Total a Pagar:</span>
              <span class="fw-700 accent-text" style="font-size:16px;">{{ formatMoney(data.currency_symbol, data.total_amount) }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2 c-green">
              <span class="fw-600" style="font-size:12px;">Pagado:</span>
              <span class="fw-700" style="font-size:13px;">{{ formatMoney(data.currency_symbol, totalPaidDisplay) }}</span>
            </div>
            <hr class="my-2" style="border-color:#dcfce7;">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-700 text-dark" style="font-size:12.5px;">Saldo Pendiente:</span>
              <span class="fw-700" style="font-size:18px;" :class="saldoPendienteDisplay > 0 ? 'c-red' : 'c-green'">{{ formatMoney(data.currency_symbol, saldoPendienteDisplay) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-4 pt-2">
        <h6 class="fieldset-title"><i class="fa-solid fa-paperclip me-1"></i> Documentos y Adjuntos</h6>
        <div v-if="data.files_list && data.files_list.length > 0" class="file-list">
          <div v-for="(file, idx) in data.files_list" :key="idx" class="file-item">
            <div class="d-flex align-items-center gap-3 overflow-hidden">
              <div class="file-icon"><i class="fa-solid fa-lg" :class="getFileIcon(file.type)"></i></div>
              <div class="d-flex flex-column text-truncate">
                <span class="fw-600 text-dark text-truncate" style="font-size:12.5px;" :title="file.name">{{ file.name || 'Documento Adjunto' }}</span>
                <span class="text-muted" style="font-size:10.5px;">
                  {{ file.date || 'Archivo histórico' }}
                  <span v-if="file.source === 'payment_receipt'" class="pill pill-slate ms-1" style="font-size:8px; background:#eff6ff; color:#1d4ed8;">VOUCHER</span>
                  <span v-if="file.source === 'enrollment'" class="pill pill-slate ms-1" style="font-size:8px;">LEGACY</span>
                </span>
              </div>
            </div>
            <a :href="file.url" target="_blank" class="btn-icon" title="Ver Documento"><i class="fas fa-external-link-alt accent-text"></i></a>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:1.5rem;"><p>No hay archivos adjuntos en esta matrícula.</p></div>
      </div>
            <div class="mt-4 pt-2" v-if="data.installment_plan && data.installment_plan.length > 0">
        <h6 class="fieldset-title">
          <i class="fa-solid fa-table-list me-1"></i> Plan de Cuotas
        </h6>
        <div class="table-shell">
          <table class="exec-table" style="font-size:12px;">
            <thead>
              <tr class="thead-sub">
                <th class="ts ts-c text-center" style="width:40px;">#</th>
                <th class="ts ts-c">Vencimiento</th>
                <th class="ts ts-c text-end">Monto</th>
                <th class="ts ts-c text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="cuota in data.installment_plan"
                :key="cuota.installment_id"
                class="tbody-row"
                :class="{
                  'row-blue':    cuota.is_reserva,
                  'row-inscrito': cuota.status_alias === 'we_payment_status_paid',
                  'row-red':     isOverdue(cuota) && cuota.status_alias !== 'we_payment_status_paid'
                }"
              >
                <!-- # -->
                <td class="td-a text-center fw-700 text-muted">
                  <span v-if="cuota.is_reserva"
                        class="pill pill-slate"
                        title="Adelanto / Pago Inicial"
                        style="background:#dbeafe;color:#1e40af;font-size:9px;">INI</span>
                  <span v-else>{{ cuota.installment_number }}</span>
                </td>

                <!-- Vencimiento -->
                <td class="td-a">
                  <span :class="{ 'c-red fw-700': isOverdue(cuota) && cuota.status_alias !== 'we_payment_status_paid' }">
                    {{ cuota.due_date }}
                  </span>
                  <span v-if="isNextDue(cuota, data.next_due_date)"
                        class="pill pill-amber ms-2"
                        style="font-size:9px;">Próxima</span>
                </td>

                <!-- Monto -->
                <td class="td-a text-end fw-700">
                  {{ formatMoney(data.currency_symbol, cuota.amount) }}
                </td>

                <!-- Estado -->
                <td class="td-a text-center">
                  <span class="pill" :class="badgeForInstallment(cuota.status_alias)">
                    {{ cuota.status_label }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc; border-top: 2px solid #e2e8f0;">
                <td colspan="2" class="td-a fw-700 text-end" style="font-size:11.5px; color:#475569;">
                  TOTAL PLAN:
                </td>
                <td class="td-a text-end fw-700 accent-text" style="font-size:13px;">
                  {{ formatMoney(data.currency_symbol, totalPlanSum) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div class="mt-4 pt-2" v-if="data.lead_observations">
        <h6 class="fieldset-title"><i class="fa-solid fa-comment-dots me-1 text-secondary"></i> Observaciones del Asesor</h6>
        <div class="exec-alert alert-info" style="border-left-color: #94a3b8;"><i class="fa-solid fa-quote-left opacity-40 mt-1"></i><p class="mb-0" style="font-size:.85rem; white-space: pre-line; color: var(--text-primary);">{{ data.lead_observations }}</p></div>
      </div>
      <div class="mt-3" v-if="data.notes">
        <h6 class="fieldset-title"><i class="fa-solid fa-note-sticky me-1 text-warning"></i> Notas de Matrícula</h6>
        <div class="exec-alert alert-warning"><i class="fa-solid fa-triangle-exclamation opacity-60 mt-1"></i><p class="mb-0" style="font-size:.85rem; white-space: pre-line;">{{ data.notes }}</p></div>
      </div>
    </div>
    <template #footer>
      <div v-if="data" class="d-flex justify-content-end w-100">
        <button class="btn-exec btn-exec-primary px-4" @click="$emit('update:show', false)">Cerrar</button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from '../components/BaseModal.vue'
import { useLeadFormatters } from '../composables/useLeadFormatters'
import { useEnrollmentCalculations } from '../composables/useEnrollmentCalculations'

const props = defineProps({
  show: { type: Boolean, default: false },
  data: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
  observed: { type: Object, default: null },
  resubmitting: { type: Boolean, default: false }
})

defineEmits(['update:show', 'resubmit'])

const { formatMoney, badgeForInstallment, getFileIcon } = useLeadFormatters()
const calc = useEnrollmentCalculations()

const isOverdue = calc.isOverdue
const isNextDue = calc.isNextDue

const totalPaidDisplay = computed(() => calc.totalPaidDisplay(props.data))
const saldoPendienteDisplay = computed(() => calc.saldoPendienteDisplay(props.data))
const totalPlanSum = computed(() => calc.totalPlanSum(props.data))
</script>
