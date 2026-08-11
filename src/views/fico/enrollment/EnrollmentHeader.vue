<template>
  <div class="eh-card">
    <div class="eh-card-top">
      <div class="eh-avatar"><i class="fa-solid fa-user-graduate"></i></div>
      <div class="eh-info">
        <h2 class="eh-name">{{ detail.student_full_name || enrollment?.student_full_name || '---' }}</h2>
        <div class="eh-meta">
          <span class="eh-meta-item"><i class="fa-solid fa-id-card"></i> {{ detail.document_number || enrollment?.document_number || '---' }}</span>
          <span class="eh-meta-item"><i class="fa-solid fa-user-tag"></i> {{ currentProfile }}</span>
          <span v-if="email" class="eh-meta-item"><i class="fa-solid fa-envelope"></i> {{ email }}</span>
          <span v-if="phone" class="eh-meta-item"><i class="fa-solid fa-phone"></i> {{ phone }}</span>
        </div>
      </div>
    </div>
    <div class="eh-total">
      <span class="eh-total-label">Total a Pagar</span>
      <span class="eh-total-amount">S/. {{ fmt.formatMoney(total) }}</span>
    </div>
  </div>

  <div class="eh-info-cards">
    <div class="eh-ic">
      <span class="eh-ic-icon ic-blue"><i class="fa-solid fa-graduation-cap"></i></span>
      <div>
        <span class="eh-ic-label">Programa</span>
        <span class="eh-ic-value">{{ detail.program_name || enrollment?.program_name || '---' }}</span>
      </div>
    </div>
    <div class="eh-ic">
      <span class="eh-ic-icon ic-purple"><i class="fa-solid fa-layer-group"></i></span>
      <div>
        <span class="eh-ic-label">Edicion</span>
        <span class="eh-ic-value">
          {{ detail.edition_code || enrollment?.edition_code || '---' }}<span
            v-if="editionStartDate" class="eh-ic-date"
          > &middot; {{ fmt.formatDate(editionStartDate) }}</span>
        </span>
      </div>
    </div>
    <div class="eh-ic">
      <span class="eh-ic-icon ic-green"><i class="fa-solid fa-user-tie"></i></span>
      <div>
        <span class="eh-ic-label">Asesor</span>
        <span class="eh-ic-value">{{ detail.seller_agent_name || enrollment?.seller_agent_name || '---' }}</span>
      </div>
    </div>
    <!-- OS/OP: la venta se cobra contra la orden, no con voucher al momento. -->
    <div v-if="detail.b2b_doctype_label" class="eh-ic">
      <span class="eh-ic-icon ic-blue"><i class="fa-solid fa-file-contract"></i></span>
      <div>
        <span class="eh-ic-label">Documento B2B</span>
        <span class="eh-ic-value">{{ detail.b2b_doctype_label }}</span>
      </div>
    </div>
    <div v-if="eventCategory" class="eh-ic">
      <span class="eh-ic-icon ic-rose"><i class="fa-solid fa-ticket"></i></span>
      <div>
        <span class="eh-ic-label">Categoria de entrada</span>
        <span class="eh-ic-value">{{ eventCategory }}</span>
      </div>
    </div>
    <div v-if="vipSeat" class="eh-ic">
      <span class="eh-ic-icon ic-rose"><i class="fa-solid fa-chair"></i></span>
      <div>
        <span class="eh-ic-label">Asiento VIP</span>
        <span class="eh-ic-value">{{ vipSeat }}</span>
      </div>
    </div>
    <div class="eh-ic">
      <span class="eh-ic-icon ic-amber"><i class="fa-solid fa-calendar-check"></i></span>
      <div>
        <span class="eh-ic-label">Registro</span>
        <span class="eh-ic-value">{{ fmt.formatDate(detail.registration_date || enrollment?.registration_date) }}</span>
      </div>
    </div>
  </div>

  <div v-if="membershipName" class="eh-membership">
    <i class="fa-solid fa-gift"></i>
    <span>Beneficio de membresía: {{ membershipName }}</span>
  </div>

  <div v-if="additionalInfo" class="eh-additional">
    <i class="fa-solid fa-circle-info"></i>
    <span>{{ additionalInfo }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const props = defineProps({
  enrollment: { type: Object, default: null },
  detail: { type: Object, default: () => ({}) },
  currentProfile: { type: String, default: '---' },
  total: { type: Number, default: 0 }
})

const fmt = useEnrollmentFormatters()

const email = computed(() => props.enrollment?.email || props.detail?.email || '')
const phone = computed(() => props.enrollment?.phone || props.detail?.phone || '')
const additionalInfo = computed(() => props.enrollment?.additional_info || null)
// El tier de membresia vive normalizado en enrollments.membership_program_id (FK a
// programs). El detalle ya trae el nombre resuelto (membership_program_name).
const membershipName = computed(() =>
  props.detail?.membership_program_name || props.enrollment?.membership_program_name || null
)
// Categoria de entrada (VIP/GENERAL/PREMIUM/VIRTUAL). Solo la traen las
// inscripciones de eventos/congresos; el resto no muestra la tarjeta.
const eventCategory = computed(() =>
  props.detail?.event_category_label || props.enrollment?.event_category_label || null
)
// Solo la entrada VIP tiene asiento asignado; se pregunta por el alias (no por
// la etiqueta) igual que el correo de confirmacion, que es la otra cara de este
// dato. Sin categoria VIP la tarjeta no aparece aunque la columna traiga valor.
const vipSeat = computed(() => {
  const src = props.detail?.event_category_alias ? props.detail : props.enrollment
  if (src?.event_category_alias !== 'we_event_category_vip') return null
  return String(src.event_seat || '').trim() || null
})
const editionStartDate = computed(() =>
  props.detail?.edition_start_date || props.enrollment?.edition_start_date || null
)
</script>

<style scoped>
.eh-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  background: transparent;
  margin-bottom: 24px;
}

.eh-card-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.eh-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #737373;
  font-size: 16px;
  flex-shrink: 0;
}

.eh-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.eh-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; }
.eh-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.eh-meta-item {
  font-size: 12px;
  color: #737373;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.eh-meta-item i { font-size: 10px; color: #C4C4C4; }

.eh-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #F0F0F0;
}
.eh-total-label {
  font-size: 12px;
  color: #A3A3A3;
  font-weight: 500;
}
.eh-total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: -0.02em;
}

.eh-info-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 20px;
}

.eh-ic {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #F0F0F0;
}

.eh-ic-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.ic-blue { background: #EFF6FF; color: #3B82F6; }
.ic-purple { background: #F5F3FF; color: #8B5CF6; }
.ic-green { background: #F0FDF4; color: #059669; }
.ic-amber { background: #FFF8EB; color: #D97706; }
.ic-rose { background: #FFF1F2; color: #E11D48; }

.eh-ic-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #A3A3A3;
  font-weight: 500;
  margin-bottom: 1px;
}
.eh-ic-value {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  line-height: 1.3;
  word-break: break-word;
}
.eh-ic-date {
  font-size: 12px;
  font-weight: 500;
  color: #737373;
  letter-spacing: 0;
}

.eh-additional {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #F0FDFA;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 12.5px;
  color: #115E59;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.5;
}
.eh-additional i { font-size: 13px; color: #0D9488; flex-shrink: 0; margin-top: 1px; }

.eh-membership {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #FFFBEB;
  border: 1px solid #FCD34D;
  border-radius: 10px;
  margin-bottom: 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: #92400E;
  line-height: 1.5;
}
.eh-membership i { font-size: 13px; color: #D97706; flex-shrink: 0; margin-top: 1px; }
[data-coreui-theme="dark"] .eh-membership {
  background: rgba(245,158,11,0.14);
  border-color: rgba(245,158,11,0.4);
  color: #FBBF24;
}
[data-coreui-theme="dark"] .eh-membership i { color: #FBBF24; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .eh-avatar {
  background: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .eh-name { color: #F4F4F0; }
[data-coreui-theme="dark"] .eh-meta-item { color: #A0A099; }
[data-coreui-theme="dark"] .eh-meta-item i { color: #6F6F66; }

[data-coreui-theme="dark"] .eh-total {
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .eh-total-label { color: #6F6F66; }
[data-coreui-theme="dark"] .eh-total-amount { color: #F4F4F0; }

[data-coreui-theme="dark"] .eh-ic {
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .ic-blue { background: rgba(59,130,246,0.16); color: #60A5FA; }
[data-coreui-theme="dark"] .ic-purple { background: rgba(139,92,246,0.16); color: #A78BFA; }
[data-coreui-theme="dark"] .ic-green { background: rgba(16,185,129,0.16); color: #34D399; }
[data-coreui-theme="dark"] .ic-amber { background: rgba(245,158,11,0.16); color: #FBBF24; }
[data-coreui-theme="dark"] .ic-rose { background: rgba(225,29,72,0.16); color: #FB7185; }

[data-coreui-theme="dark"] .eh-ic-label { color: #6F6F66; }
[data-coreui-theme="dark"] .eh-ic-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .eh-ic-date { color: #A0A099; }

[data-coreui-theme="dark"] .eh-additional {
  background: rgba(13,148,136,0.14);
  color: #2DD4BF;
}
[data-coreui-theme="dark"] .eh-additional i { color: #2DD4BF; }
</style>
