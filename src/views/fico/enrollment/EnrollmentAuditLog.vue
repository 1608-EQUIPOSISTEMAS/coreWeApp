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
  background: #0D9488;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.ea-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: #9CA3AF;
  font-size: 13px;
}
.ea-empty i { font-size: 28px; opacity: .4; }

.ea-item {
  display: flex;
  gap: 14px;
  position: relative;
  padding-bottom: 20px;
}

.ea-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 34px;
  bottom: 0;
  width: 2px;
  background: #E5E7EB;
}

.ea-dot {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  background: #9CA3AF;
  position: relative;
  z-index: 1;
}

.dot-created { background: #0D9488; }
.dot-approved { background: #059669; }
.dot-edited { background: #D97706; }
.dot-odoo_enrolled { background: #6366F1; }
.dot-odoo_unenrolled { background: #6366F1; }
.dot-email_sent { background: #3B82F6; }
.dot-edition_reprogrammed { background: #F59E0B; }
.dot-course_changed { background: #8B5CF6; }
.dot-created_from_cc { background: #8B5CF6; }
.dot-children_created { background: #0D9488; }
.dot-modality_changed { background: #D97706; }
.dot-profile_changed { background: #D97706; }
.dot-retired { background: #DC2626; }
.dot-observed { background: #F59E0B; }
.dot-resubmitted { background: #3B82F6; }

.ea-body { flex: 1; padding-top: 4px; }

.ea-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ea-action { font-size: 13px; font-weight: 600; color: #111827; }
.ea-user { font-size: 12px; color: #6B7280; }
.ea-date { font-size: 11px; color: #9CA3AF; margin-left: auto; }

.ea-details {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
}

.ea-justificacion {
  margin-top: 6px;
  padding: 8px 12px;
  background: #FEF3C7;
  border-radius: 6px;
  font-size: 12px;
  color: #92400E;
  line-height: 1.4;
}
.ea-justificacion i { margin-right: 4px; font-size: 10px; opacity: .6; }

.ea-changes {
  margin-top: 6px;
  padding: 8px 12px;
  background: #F9FAFB;
  border-radius: 6px;
  border: 1px solid #E5E7EB;
}

.ea-change-row { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 3px 0; }
.ea-change-row.ea-change-modified { background: #FEFCE8; margin: 0 -8px; padding: 3px 8px; border-radius: 4px; }
.ea-change-field { font-weight: 600; color: #6B7280; min-width: 90px; }
.ea-old { color: #DC2626; text-decoration: line-through; }
.ea-new { color: #059669; font-weight: 600; }
.ea-same { color: #374151; }
.ea-arrow { font-size: 10px; color: #9CA3AF; }
</style>
