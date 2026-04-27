<template>
  <aside v-if="enrollment" class="esp" :key="enrollment.enrollment_id">
    <div class="esp-detail">
      <header class="esp-head">
        <div class="esp-head-id">
          <span class="esp-avatar">{{ initials }}</span>
          <div class="esp-head-name">
            <h3 class="esp-name">{{ enrollment.student_full_name || 'Sin nombre' }}</h3>
            <span class="esp-doc">{{ enrollment.document_number || '---' }}</span>
          </div>
        </div>
        <div class="esp-head-actions">
          <button class="esp-icon-btn" title="Cerrar" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </header>

      <div class="esp-status-row">
        <span class="esp-pill" :class="fmt.statusPill(enrollment.confirmation)">
          {{ enrollment.confirmation || 'Pendiente' }}
        </span>
        <span class="esp-pill esp-pill-soft">
          {{ fmt.isContado(enrollment) ? 'Al contado' : 'Cuotas' }}
        </span>
      </div>

      <div class="esp-highlights">
        <div class="esp-h-card">
          <span class="esp-h-label">Monto neto</span>
          <span class="esp-h-value">S/ {{ fmt.formatMoney(enrollment.total_to_pay) }}</span>
        </div>
        <div class="esp-h-card esp-h-green">
          <span class="esp-h-label">Pagado</span>
          <span class="esp-h-value">S/ {{ fmt.formatMoney(fmt.getPagado(enrollment)) }}</span>
        </div>
        <div class="esp-h-card" :class="saldo > 0 ? 'esp-h-red' : 'esp-h-muted'">
          <span class="esp-h-label">Saldo</span>
          <span class="esp-h-value">{{ fmt.isContado(enrollment) ? '\u2014' : 'S/ ' + fmt.formatMoney(saldo) }}</span>
        </div>
      </div>

      <div class="esp-section">
        <h4 class="esp-section-title">Programa</h4>
        <dl class="esp-dl">
          <div class="esp-dl-row">
            <dt>Programa</dt>
            <dd>{{ enrollment.program_name || '---' }}</dd>
          </div>
          <div class="esp-dl-row">
            <dt>Edicion</dt>
            <dd>{{ enrollment.edition_code || '---' }}</dd>
          </div>
          <div class="esp-dl-row">
            <dt>Tipo / Modalidad</dt>
            <dd>{{ [enrollment.program_type, enrollment.program_modality].filter(Boolean).join(' / ') || '---' }}</dd>
          </div>
          <div class="esp-dl-row">
            <dt>Inicio</dt>
            <dd>{{ fmt.formatDate(enrollment.start_date) }}</dd>
          </div>
        </dl>
      </div>

      <div class="esp-section">
        <h4 class="esp-section-title">Pago</h4>
        <dl class="esp-dl">
          <div class="esp-dl-row">
            <dt>F. Registro</dt>
            <dd>{{ fmt.formatDateTime(enrollment.registration_date) }}</dd>
          </div>
          <div class="esp-dl-row">
            <dt>F. Pago</dt>
            <dd>{{ fmt.formatDate(enrollment.pay_date) }}</dd>
          </div>
          <div class="esp-dl-row">
            <dt>Canal</dt>
            <dd>{{ enrollment.payment_channel || '---' }}</dd>
          </div>
          <div class="esp-dl-row">
            <dt>Asesor</dt>
            <dd>{{ enrollment.seller_agent_name || '---' }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="!fmt.isContado(enrollment)" class="esp-section">
        <h4 class="esp-section-title">Cuotas</h4>
        <ul class="esp-cuotas">
          <li v-for="n in 8" :key="'c-' + n" v-show="enrollment[`c${n}`] != null" class="esp-cuota">
            <span class="esp-cuota-num">C{{ n }}</span>
            <span class="esp-cuota-date">{{ fmt.formatDate(enrollment[`fc${n}`]) }}</span>
            <span class="esp-cuota-amt">S/ {{ fmt.formatMoney(enrollment[`c${n}`]) }}</span>
          </li>
        </ul>
      </div>

      <!-- Quick actions: only when the enrollment is approved (no point
           emailing/syncing one that hasn't been reviewed yet) -->
      <div v-if="isApproved" class="esp-section">
        <h4 class="esp-section-title">Acciones rapidas</h4>
        <div class="esp-quick-actions">
          <button class="esp-action-btn" :disabled="busy === 'confirm'" @click="run('confirm')">
            <i class="fa-solid" :class="busy === 'confirm' ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
            Reenviar confirmacion
          </button>
          <button v-if="!fmt.isContado(enrollment)" class="esp-action-btn" :disabled="busy === 'sync'" @click="run('sync')">
            <i class="fa-solid" :class="busy === 'sync' ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
            Sincronizar cuotas
          </button>
        </div>
      </div>

      <footer class="esp-footer">
        <button class="esp-btn-primary" @click="$emit('view-full', enrollment)">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver detalle completo
        </button>
      </footer>
    </div>
  </aside>
</template>

<script setup>
import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { ServiceKeys } from '@/services'

const props = defineProps({
  enrollment: { type: Object, default: null }
})
const emit = defineEmits(['close', 'view-full'])

const fmt = useEnrollmentFormatters()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)

const initials = computed(() => {
  const name = props.enrollment?.student_full_name || ''
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || '?'
})

const saldo = computed(() => fmt.calcSaldo(props.enrollment || {}))
const isApproved = computed(() => /aprobado|confirm/i.test(props.enrollment?.confirmation || ''))

const busy = ref(null)
const actionMap = {
  confirm: { fn: 'sendConfirmationEmail', ok: 'Correo de confirmacion enviado', failBase: 'Error al enviar correo' },
  sync:    { fn: 'syncInstallmentPayment', ok: 'Cuotas sincronizadas', failBase: 'Error al sincronizar cuotas' }
}
async function run (key) {
  const cfg = actionMap[key]
  if (!cfg || !props.enrollment?.enrollment_id) return
  busy.value = key
  try {
    const result = await ficoService[cfg.fn](props.enrollment.enrollment_id)
    if (result?.success === false) {
      toast.error(`${cfg.failBase}: ${result.error || 'No se pudo completar la accion'}`)
    } else {
      toast.success(cfg.ok)
    }
  } catch (err) {
    toast.error(`${cfg.failBase}: ${err?.response?.data?.error || err?.message || 'No se pudo completar la accion'}`)
  } finally {
    busy.value = null
  }
}

function isTypingInInput () {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

function onKeyDown (e) {
  if (!props.enrollment) return
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'Enter' && !isTypingInInput() && !e.altKey && !e.ctrlKey && !e.metaKey) {
    emit('view-full', props.enrollment)
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.esp {
  width: 380px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #EFEFEF;
  border-radius: 14px;
  padding: 0;
  align-self: flex-start;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.esp-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}


/* Header */
.esp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.esp-head-id {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.esp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0D9488, #14B8A6);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.esp-head-name { min-width: 0; }
.esp-name {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 2px 0;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.esp-doc {
  font-size: 11.5px;
  color: #A3A3A3;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.esp-icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #EFEFEF;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: #737373;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.esp-icon-btn:hover {
  background: #FAFAFA;
  color: #1A1A1A;
}

/* Status pills */
.esp-status-row { display: flex; gap: 6px; flex-wrap: wrap; }
.esp-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.esp-pill-soft { background: #F5F5F5; color: #737373; }

/* Highlights */
.esp-highlights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.esp-h-card {
  background: #FAFAFA;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-left: 2px solid #E5E5E5;
}
.esp-h-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #A3A3A3;
  font-weight: 600;
}
.esp-h-value {
  font-size: 13px;
  font-weight: 700;
  color: #1A1A1A;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.esp-h-green { border-left-color: #10B981; background: #F0FDF4; }
.esp-h-green .esp-h-value { color: #047857; }
.esp-h-red { border-left-color: #EF4444; background: #FEF2F2; }
.esp-h-red .esp-h-value { color: #B91C1C; }
.esp-h-muted .esp-h-value { color: #A3A3A3; }

/* Sections */
.esp-section { display: flex; flex-direction: column; gap: 8px; }
.esp-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #A3A3A3;
  margin: 0;
}
.esp-dl { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.esp-dl-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px solid #F5F5F5;
}
.esp-dl-row:last-child { border-bottom: none; }
.esp-dl-row dt {
  font-size: 11px;
  color: #A3A3A3;
  font-weight: 500;
}
.esp-dl-row dd {
  font-size: 12.5px;
  color: #1A1A1A;
  font-weight: 500;
  margin: 0;
  word-break: break-word;
}

/* Cuotas */
.esp-cuotas {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.esp-cuota {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 7px 10px;
  background: #FAFAFA;
  border-radius: 6px;
  font-size: 12px;
}
.esp-cuota-num {
  font-weight: 700;
  font-size: 11px;
  color: #0D9488;
  letter-spacing: 0.02em;
}
.esp-cuota-date { color: #737373; font-size: 11px; }
.esp-cuota-amt {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #1A1A1A;
}

/* Quick actions */
.esp-quick-actions { display: flex; flex-direction: column; gap: 6px; }
.esp-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #1A1A1A;
  background: #FAFAFA;
  border: 1px solid #EFEFEF;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  text-align: left;
  letter-spacing: -0.01em;
}
.esp-action-btn i {
  width: 14px; font-size: 11px; color: #0D9488; text-align: center;
}
.esp-action-btn:hover:not(:disabled) {
  background: #F0FDFA;
  border-color: #99F6E4;
  color: #0F766E;
}
.esp-action-btn:disabled { opacity: 0.55; cursor: wait; }

/* Footer */
.esp-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #EFEFEF;
}
.esp-btn-primary {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #1A1A1A;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: inherit;
  letter-spacing: -0.01em;
}
.esp-btn-primary:hover { background: #333; }
.esp-btn-primary i { font-size: 11px; }

/* Pill colors (reused) */
.pill-green { background: #ECFDF5; color: #065F46; }
.pill-amber { background: #FFF8EB; color: #92400E; }
.pill-red   { background: #FEF2F2; color: #991B1B; }
.pill-slate { background: #F5F5F5; color: #737373; }

/* Responsive */
@media (max-width: 1280px) {
  .esp { width: 340px; }
  .esp-name { max-width: 180px; }
}
</style>
