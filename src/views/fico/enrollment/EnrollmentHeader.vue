<template>
  <div class="eh-card">
    <div class="eh-avatar"><i class="fa-solid fa-user-graduate"></i></div>
    <div class="eh-info">
      <h2 class="eh-name">{{ detail.student_full_name || enrollment?.student_full_name || '---' }}</h2>
      <div class="eh-meta">
        <div class="eh-meta-col">
          <span class="eh-meta-item"><i class="fa-solid fa-id-card"></i> {{ detail.document_number || enrollment?.document_number || '---' }}</span>
          <span class="eh-meta-item"><i class="fa-solid fa-user-tag"></i> {{ currentProfile }}</span>
        </div>
        <div class="eh-meta-col">
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
        <span class="eh-ic-label">Codigo</span>
        <span class="eh-ic-value">{{ detail.edition_code || enrollment?.edition_code || '---' }}</span>
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
</script>

<style scoped>
.eh-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-left: 3px solid #0D9488;
  border-radius: 8px;
  margin-bottom: 16px;
}

.eh-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F0FDFA, #CCFBF1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0D9488;
  font-size: 20px;
  flex-shrink: 0;
}

.eh-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.eh-meta { display: flex; flex-direction: column; gap: 3px; }
.eh-meta-col { display: flex; flex-direction: column; gap: 3px; }
.eh-name { margin: 0; font-size: 16px; font-weight: 700; color: #111827; line-height: 1.3; }

.eh-meta-item {
  font-size: 12.5px;
  color: #6B7280;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.eh-meta-item i { font-size: 11px; color: #9CA3AF; }
.eh-meta-item i.fa-envelope,
.eh-meta-item i.fa-phone { color: #0D9488; }

.eh-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}
.eh-total-label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #9CA3AF; font-weight: 600; }
.eh-total-amount { font-size: 18px; font-weight: 700; color: #111827; font-family: 'JetBrains Mono', monospace; }

.eh-info-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.eh-ic {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}

.eh-ic-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ic-blue { background: #EFF6FF; color: #3B82F6; }
.ic-purple { background: #F5F3FF; color: #8B5CF6; }
.ic-green { background: #F0FDF4; color: #059669; }
.ic-amber { background: #FFFBEB; color: #D97706; }

.eh-ic-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #9CA3AF; font-weight: 600; margin-bottom: 3px; }
.eh-ic-value { display: block; font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3; word-break: break-word; }

.eh-additional {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: #F0FDFA;
  border: 1px solid #99F6E4;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12.5px;
  color: #115E59;
  word-break: break-word;
  overflow-wrap: break-word;
}
.eh-additional i { font-size: 13px; color: #0D9488; flex-shrink: 0; }
</style>
