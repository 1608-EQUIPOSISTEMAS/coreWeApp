<template>
  <section class="ea-section">
    <p v-if="!auditLog.length" class="ds-empty ds-empty--lista">
      Todavía no hay movimientos en esta inscripción.
    </p>

    <div v-for="log in auditLog" :key="log.audit_id" class="ea-item">
      <div class="ea-dot" :class="auditTone(log.action)">
        <i :class="fmt.auditIcon(log.action)" aria-hidden="true"></i>
      </div>
      <div class="ea-body">
        <div class="ea-head">
          <span class="ea-action">{{ fmt.auditLabel(log.action) }}</span>
          <span class="ea-user">{{ log.user_name || 'Sistema' }}</span>
          <span class="ea-date">{{ fmt.formatDateTime(log.performed_at) }}</span>
        </div>
        <p v-if="log.details" class="ea-details">{{ log.details }}</p>
        <div v-if="log.justificacion" class="ea-justificacion">
          <i class="fa-solid fa-quote-left" aria-hidden="true"></i> {{ log.justificacion }}
        </div>
        <div v-if="log.changes && Object.keys(parseChanges(log.changes)).length" class="ea-changes">
          <div
            v-for="(val, key) in parseChanges(log.changes)"
            :key="key"
            class="ea-change-row"
          >
            <span class="ea-change-field">{{ key }}:</span>
            <template v-if="val.old && val.new && val.old !== val.new">
              <span class="ea-old">{{ val.old }}</span>
              <i class="fa-solid fa-arrow-right ea-arrow" aria-hidden="true"></i>
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

// El color dice QUÉ tipo de evento fue, no cuál exactamente (eso lo dice el
// icono y la etiqueta): dinero ok, cambios a revisar, fallas, movimientos de
// programa (CC/RP/E0) y el resto informativo.
const TONE_BY_ACTION = {
  approved: 'ok', payment_registered: 'ok', validation_applied: 'ok', additional_payment: 'ok', odoo_fee_paid: 'ok',
  edited: 'warn', modality_changed: 'warn', profile_changed: 'warn', student_edited: 'warn', observed: 'warn',
  installments_rescheduled: 'warn', edition_reprogrammed: 'warn', children_skipped_no_edition: 'warn', additional_payment_edited: 'warn',
  seller_agent_changed: 'warn', retire_reverted: 'warn', collection_campaign: 'warn', installment_amount_edited: 'warn',
  initial_payment_corrected: 'warn', installment_payment_reverted: 'warn', installment_added: 'warn', installment_plan_adjusted: 'warn',
  email_failed: 'bad', retired: 'bad', sap_credentials_missing: 'bad',
  course_changed: 'violet', created_from_cc: 'violet', created_from_rp: 'violet', parent_marked_e0: 'violet', validation_requested: 'violet'
}
const auditTone = action => TONE_BY_ACTION[action] || 'info'

function parseChanges (changes) {
  let parsed = changes
  if (typeof changes === 'string') {
    // Un changes que no es JSON es texto libre viejo: no hay diff que pintar.
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
.ea-item { display: flex; gap: 14px; position: relative; padding-bottom: 22px; }
.ea-item:not(:last-child)::before {
  content: ''; position: absolute; left: 13px; top: 30px; bottom: 0;
  width: 1px; background: var(--ds-border);
}
.ea-dot {
  flex-shrink: 0; position: relative; z-index: 1;
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center; font-size: 11px;
}
.ea-dot.ok { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.ea-dot.warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.ea-dot.bad { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.ea-dot.violet { background: var(--ds-soft-violet); color: var(--ds-violet-ink); }
.ea-dot.info { background: var(--ds-soft-info); color: var(--ds-info-ink); }

.ea-body { flex: 1; min-width: 0; padding-top: 4px; }
.ea-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.ea-action { font-size: 13px; font-weight: 700; color: var(--ds-ink); }
.ea-user { font-size: 12px; color: var(--ds-ink-2); }
.ea-date { margin-left: auto; font-size: 11.5px; color: var(--ds-muted); font-variant-numeric: tabular-nums; }
.ea-details { margin: 4px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--ds-ink-2); }

.ea-justificacion {
  margin-top: 8px; padding: 9px 12px; border-radius: var(--ds-radius-sm);
  background: var(--ds-soft-warn); color: var(--ds-warn-ink);
  font-size: 12.5px; line-height: 1.5;
}
.ea-justificacion i { margin-right: 4px; font-size: 10px; opacity: 0.6; }

.ea-changes {
  margin-top: 8px; padding: 8px 12px; border-radius: var(--ds-radius-sm);
  border: 1px solid var(--ds-border); background: var(--ds-surface-2);
}
.ea-change-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 3px 0; font-size: 12.5px; }
.ea-change-field { min-width: 90px; font-weight: 500; color: var(--ds-ink-2); }
.ea-old { color: var(--ds-bad-ink); text-decoration: line-through; opacity: 0.75; }
.ea-new { color: var(--ds-ok-ink); font-weight: 600; }
.ea-same { color: var(--ds-ink); }
.ea-arrow { font-size: 10px; color: var(--ds-muted); }
</style>
