<template>
  <section class="ea-section">
    <h3 class="ea-title">
      <i class="fa-solid fa-clock-rotate-left"></i> Historial
      <span v-if="auditLog.length" class="ea-badge">{{ auditLog.length }}</span>
    </h3>

    <div v-if="!auditLog.length" class="ea-empty">
      <i class="fa-solid fa-inbox"></i>
      <p>Sin registros de historial</p>
    </div>

    <div v-for="log in auditLog" :key="log.audit_id" class="ea-item">
      <div class="ea-dot" :class="'dot-' + log.action">
        <i :class="fmt.auditIcon(log.action)"></i>
      </div>
      <div class="ea-body">
        <div class="ea-head">
          <span class="ea-action">{{ fmt.auditLabel(log.action) }}</span>
          <span class="ea-user">{{ log.user_name || 'Sistema' }}</span>
          <span class="ea-date">{{ fmt.formatDateTime(log.performed_at) }}</span>
        </div>
        <p v-if="log.details" class="ea-details">{{ log.details }}</p>
        <div v-if="log.justificacion" class="ea-justificacion">
          <i class="fa-solid fa-quote-left"></i> {{ log.justificacion }}
        </div>
        <div v-if="log.changes && Object.keys(parseChanges(log.changes)).length" class="ea-changes">
          <div
            v-for="(val, key) in parseChanges(log.changes)"
            :key="key"
            class="ea-change-row"
            :class="{ 'ea-change-modified': val.old && val.new && val.old !== val.new }"
          >
            <span class="ea-change-field">{{ key }}:</span>
            <template v-if="val.old && val.new && val.old !== val.new">
              <span class="ea-old">{{ val.old }}</span>
              <i class="fa-solid fa-arrow-right ea-arrow"></i>
              <span class="ea-new">{{ val.new }}</span>
            </template>
            <template v-else-if="val.old && val.new && val.old === val.new">
              <span class="ea-same">{{ val.new }}</span>
            </template>
            <template v-else-if="val.new">
              <span class="ea-new">{{ val.new }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

defineProps({
  auditLog: { type: Array, default: () => [] }
})

const fmt = useEnrollmentFormatters()

function parseChanges (changes) {
  let parsed = changes
  if (typeof changes === 'string') {
    try { parsed = JSON.parse(changes) } catch { return {} }
  }
  if (!parsed) return {}
  const filtered = {}
  for (const key of Object.keys(parsed)) {
    if (!key.startsWith('_')) filtered[key] = parsed[key]
  }
  return filtered
}
</script>

<style scoped>
.ea-section {
  background: transparent;
}

.ea-title {
  display: none;
}

.ea-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #F0F0F0;
  color: #737373;
  font-size: 10px;
  font-weight: 600;
}

.ea-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px;
  color: #C4C4C4;
  font-size: 13px;
}
.ea-empty i { font-size: 24px; opacity: .5; }

.ea-item {
  display: flex;
  gap: 14px;
  position: relative;
  padding-bottom: 24px;
}

.ea-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 30px;
  bottom: 0;
  width: 1px;
  background: #F0F0F0;
}

.ea-dot {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  background: #C4C4C4;
  position: relative;
  z-index: 1;
}

.dot-created { background: #0D9488; }
.dot-approved { background: #059669; }
.dot-edited { background: #D97706; }
.dot-odoo_enrolled { background: #6366F1; }
.dot-odoo_unenrolled { background: #6366F1; }
.dot-email_sent { background: #3B82F6; }
.dot-email_failed { background: #DC2626; }
.dot-payment_registered { background: #059669; }
.dot-odoo_fees_activated { background: #6366F1; }
.dot-children_skipped_no_edition { background: #F59E0B; }
.dot-parent_marked_e0 { background: #8B5CF6; }
.dot-edition_reprogrammed { background: #F59E0B; }
.dot-course_changed { background: #8B5CF6; }
.dot-created_from_cc { background: #8B5CF6; }
.dot-children_created { background: #0D9488; }
.dot-modality_changed { background: #D97706; }
.dot-profile_changed { background: #D97706; }
.dot-student_edited { background: #D97706; }
.dot-created_from_token { background: #6366F1; }
.dot-retired { background: #DC2626; }
.dot-observed { background: #F59E0B; }
.dot-resubmitted { background: #3B82F6; }
.dot-validation_requested { background: #8B5CF6; }
.dot-validation_applied { background: #059669; }
.dot-installments_rescheduled { background: #F59E0B; }
.dot-odoo_fee_paid { background: #6366F1; }

.ea-body { flex: 1; padding-top: 3px; }

.ea-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ea-action { font-size: 13px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.01em; }
.ea-user { font-size: 12px; color: #A3A3A3; font-weight: 400; }
.ea-date { font-size: 11px; color: #C4C4C4; margin-left: auto; }

.ea-details {
  margin: 5px 0 0;
  font-size: 12.5px;
  color: #737373;
  line-height: 1.5;
}

.ea-justificacion {
  margin-top: 8px;
  padding: 10px 14px;
  background: #FFF8EB;
  border-radius: 8px;
  font-size: 12.5px;
  color: #92400E;
  line-height: 1.5;
}
.ea-justificacion i { margin-right: 4px; font-size: 10px; opacity: .5; }

.ea-changes {
  margin-top: 8px;
  padding: 10px 14px;
  background: #FAFAFA;
  border-radius: 8px;
}

.ea-change-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 4px 0; }
.ea-change-row.ea-change-modified { background: #FFFDF5; margin: 0 -10px; padding: 4px 10px; border-radius: 6px; }
.ea-change-field { font-weight: 500; color: #A3A3A3; min-width: 90px; }
.ea-old { color: #DC2626; text-decoration: line-through; opacity: .7; }
.ea-new { color: #059669; font-weight: 600; }
.ea-same { color: #1A1A1A; }
.ea-arrow { font-size: 10px; color: #C4C4C4; }
</style>
