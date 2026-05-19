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
    <div class="eh-ic">
      <span class="eh-ic-icon ic-amber"><i class="fa-solid fa-calendar-check"></i></span>
      <div>
        <span class="eh-ic-label">Registro</span>
        <span class="eh-ic-value">{{ fmt.formatDate(detail.registration_date || enrollment?.registration_date) }}</span>
      </div>
    </div>
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

[data-coreui-theme="dark"] .eh-ic-label { color: #6F6F66; }
[data-coreui-theme="dark"] .eh-ic-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .eh-ic-date { color: #A0A099; }

[data-coreui-theme="dark"] .eh-additional {
  background: rgba(13,148,136,0.14);
  color: #2DD4BF;
}
[data-coreui-theme="dark"] .eh-additional i { color: #2DD4BF; }
</style>
