<template>
  <section class="ds-panel eh">
    <!-- Lo primero que se mira es cuanto falta cobrar. Misma regla que la barra
         de Finanzas (summary sale de entities/enrollment/paymentSummary). -->
    <div class="eh-money">
      <!-- Rojo mientras haya deuda; verde solo cuando ya no falta cobrar nada. -->
      <span class="eh-kicker" :class="summary.balance > 0 ? 'is-bad' : 'is-ok'">
        <i class="fa-solid" :class="summary.balance > 0 ? 'fa-sack-dollar' : 'fa-circle-check'" aria-hidden="true"></i>
        {{ summary.balance > 0 ? 'Saldo pendiente' : 'Pagado completo' }}
      </span>
      <span class="eh-balance">{{ currencySymbol }} {{ fmt.formatMoney(summary.balance) }}</span>
      <div class="eh-money-meta">
        <span>{{ percent }}% pagado</span>
        <span>Monto total: <strong>{{ currencySymbol }} {{ fmt.formatMoney(summary.total) }}</strong></span>
      </div>
      <div class="ds-track" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100" :aria-label="`Cobrado ${percent}%`">
        <i class="is-ok" :style="{ width: `${percent}%` }"></i>
      </div>
    </div>

    <div class="eh-section">
      <div class="eh-head">
        <h2 class="eh-title">Contacto</h2>
        <span v-if="currentProfile && currentProfile !== '---'" class="ds-pill">{{ currentProfile }}</span>
      </div>
      <p class="eh-row">
        <i class="fa-solid fa-id-card" aria-hidden="true"></i>
        <span class="eh-value mono">{{ detail.document_number || enrollment?.document_number || 'Sin documento' }}</span>
      </p>
      <p v-if="phone" class="eh-row">
        <i class="fa-solid fa-phone" aria-hidden="true"></i>
        <span class="eh-value mono">{{ phone }}</span>
        <button class="btn-icon btn-icon-sm" type="button" :title="copied === 'phone' ? 'Copiado' : 'Copiar celular'" aria-label="Copiar celular" @click="copy(phone, 'phone')">
          <i class="fa-solid" :class="copied === 'phone' ? 'fa-check' : 'fa-copy'" aria-hidden="true"></i>
        </button>
      </p>
      <p v-if="email" class="eh-row">
        <i class="fa-solid fa-envelope" aria-hidden="true"></i>
        <span class="eh-value">{{ email }}</span>
        <button class="btn-icon btn-icon-sm" type="button" :title="copied === 'email' ? 'Copiado' : 'Copiar correo'" aria-label="Copiar correo" @click="copy(email, 'email')">
          <i class="fa-solid" :class="copied === 'email' ? 'fa-check' : 'fa-copy'" aria-hidden="true"></i>
        </button>
      </p>
    </div>

    <div class="eh-section">
      <div class="eh-head">
        <h2 class="eh-title">Programa</h2>
        <span class="eh-head-meta">
          <span class="ds-pill info">{{ detail.edition_code || enrollment?.edition_code || 'Sin edición' }}</span>
          <span v-if="editionStartDate">inicia {{ fmt.formatDate(editionStartDate) }}</span>
        </span>
      </div>
      <p class="eh-row eh-program">
        <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
        <span>{{ detail.program_name || enrollment?.program_name || '—' }}</span>
      </p>
      <div class="eh-pair">
        <p class="eh-row"><i class="fa-solid fa-user" aria-hidden="true"></i><span>Asesor: <strong>{{ detail.seller_agent_name || enrollment?.seller_agent_name || '—' }}</strong></span></p>
        <p class="eh-row"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i><span>Registro: <strong>{{ fmt.formatDate(detail.registration_date || enrollment?.registration_date) }}</strong></span></p>
      </div>
      <!-- OS/OP: la venta se cobra contra la orden, no con voucher al momento. -->
      <p v-if="detail.b2b_doctype_label" class="eh-row"><i class="fa-solid fa-file-invoice" aria-hidden="true"></i><span>Documento B2B: <strong>{{ detail.b2b_doctype_label }}</strong></span></p>
      <p v-if="eventCategory" class="eh-row"><i class="fa-solid fa-ticket" aria-hidden="true"></i><span>Entrada: <strong>{{ eventCategory }}</strong></span></p>
      <p v-if="vipSeat" class="eh-row eh-seat"><i class="fa-solid fa-chair" aria-hidden="true"></i><span>Asiento VIP: <strong>{{ vipSeat }}</strong></span></p>
    </div>

    <div class="eh-section eh-foot">
      <h2 class="eh-title">Información adicional</h2>
      <p v-if="membershipName" class="ds-callout warn">
        <i class="fa-solid fa-gift" aria-hidden="true"></i>
        <span>Beneficio de membresía: {{ membershipName }}</span>
      </p>
      <div class="eh-row">
        <i class="fa-solid fa-building-columns" aria-hidden="true"></i>
        <span class="eh-value">Estado en el campus: <strong>{{ odooEmail ? 'Activo' : 'Sin acceso' }}</strong></span>
        <button v-if="odooEmail" class="eh-access-btn" type="button" :aria-expanded="showAccess" @click="showAccess = !showAccess">
          <i class="fa-solid" :class="showAccess ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
          {{ showAccess ? 'Ocultar' : 'Ver accesos' }}
        </button>
      </div>
      <dl v-if="showAccess && odooEmail" class="eh-access">
        <dt>Usuario</dt>
        <dd>
          <span class="eh-value">{{ odooEmail }}</span>
          <button class="btn-icon btn-icon-sm" type="button" aria-label="Copiar usuario" @click="copy(odooEmail, 'odoo')">
            <i class="fa-solid" :class="copied === 'odoo' ? 'fa-check' : 'fa-copy'" aria-hidden="true"></i>
          </button>
        </dd>
        <dt>Clave</dt>
        <dd v-if="odooPassword">
          <span class="eh-value mono">{{ odooPassword }}</span>
          <button class="btn-icon btn-icon-sm" type="button" aria-label="Copiar clave" @click="copy(odooPassword, 'pass')">
            <i class="fa-solid" :class="copied === 'pass' ? 'fa-check' : 'fa-copy'" aria-hidden="true"></i>
          </button>
        </dd>
        <dd v-else class="eh-muted">usuario existente (no se generó clave)</dd>
      </dl>
      <p v-if="additionalInfo" class="eh-row">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>Notas: {{ additionalInfo }}</span>
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { paidPercent } from '@/entities/enrollment/paymentSummary.js'

const props = defineProps({
  enrollment: { type: Object, default: null },
  detail: { type: Object, default: () => ({}) },
  currentProfile: { type: String, default: '---' },
  summary: { type: Object, default: () => ({ total: 0, paid: 0, balance: 0 }) },
  currencySymbol: { type: String, default: 'S/.' },
  odooEmail: { type: String, default: null },
  odooPassword: { type: String, default: null }
})

const fmt = useEnrollmentFormatters()
const toast = useToast()

const percent = computed(() => paidPercent(props.summary))
const email = computed(() => props.enrollment?.email || props.detail?.email || '')
const phone = computed(() => props.enrollment?.phone || props.detail?.phone || '')
const additionalInfo = computed(() => props.enrollment?.additional_info || null)
// El tier de membresia vive normalizado en enrollments.membership_program_id (FK a
// programs). El detalle ya trae el nombre resuelto (membership_program_name).
const membershipName = computed(() =>
  props.detail?.membership_program_name || props.enrollment?.membership_program_name || null
)
// Categoria de entrada (VIP/GENERAL/PREMIUM/VIRTUAL). Solo la traen las
// inscripciones de eventos/congresos; el resto no muestra la fila.
const eventCategory = computed(() =>
  props.detail?.event_category_label || props.enrollment?.event_category_label || null
)
// Solo la entrada VIP tiene asiento asignado; se pregunta por el alias (no por
// la etiqueta) igual que el correo de confirmacion, que es la otra cara de este
// dato. Sin categoria VIP la fila no aparece aunque la columna traiga valor.
const vipSeat = computed(() => {
  const src = props.detail?.event_category_alias ? props.detail : props.enrollment
  if (src?.event_category_alias !== 'we_event_category_vip') return null
  return String(src.event_seat || '').trim() || null
})
const editionStartDate = computed(() =>
  props.detail?.edition_start_date || props.enrollment?.edition_start_date || null
)

// Las credenciales del campus van ocultas: la ficha se ve en pantalla compartida.
const showAccess = ref(false)
const copied = ref(null)
async function copy (value, key) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = key
    setTimeout(() => { if (copied.value === key) copied.value = null }, 1400)
  } catch (err) {
    console.error('[EnrollmentHeader.copy]', err)
    toast.error('No se pudo copiar al portapapeles')
  }
}
</script>

<style scoped>
.eh-money { display: flex; flex-direction: column; gap: 8px; padding: 16px 18px 18px; }
.eh-kicker {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
}
.eh-kicker.is-ok { color: var(--ds-ok-ink); }
.eh-kicker.is-bad { color: var(--ds-bad-ink); }
.eh-balance {
  text-align: center; font-size: 30px; font-weight: 800; line-height: 1.15;
  color: var(--ds-heading); font-variant-numeric: tabular-nums;
}
.eh-money-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 12.5px; color: var(--ds-muted); }
.eh-money-meta strong { color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.ds-track > i.is-ok { background: var(--ds-ok); }

.eh-section { display: flex; flex-direction: column; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--ds-border); }
.eh-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
.eh-head-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ds-muted); }
.eh-title { margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ds-heading); }

.eh-row { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 12.5px; color: var(--ds-ink); }
.eh-row > i { width: 16px; flex-shrink: 0; text-align: center; font-size: 12px; color: var(--ds-heading); }
.eh-row strong { font-weight: 600; color: var(--ds-ink); }
.eh-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eh-program { align-items: flex-start; font-weight: 700; color: var(--ds-heading); overflow-wrap: anywhere; }
.eh-program > i { margin-top: 2px; }
.eh-pair { display: flex; flex-wrap: wrap; gap: 6px 18px; }
.eh-pair > .eh-row > i { color: var(--ds-muted); }
.mono { font-variant-numeric: tabular-nums; }

.eh-foot { background: var(--ds-surface-2); border-radius: 0 0 var(--ds-radius) var(--ds-radius); }
.eh-access-btn {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding: 4px 10px; cursor: pointer;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control); background: var(--ds-surface);
  font-family: inherit; font-size: 11.5px; font-weight: 600; color: var(--ds-ink-2);
}
.eh-access-btn:hover, .eh-access-btn:focus-visible { border-color: var(--ds-accent); color: var(--ds-accent); }
.eh-access {
  display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 4px 10px; margin: 0 0 0 26px;
  padding: 8px 10px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface);
  font-size: 12px;
}
.eh-access dt { font-weight: 600; color: var(--ds-muted); }
.eh-access dd { display: flex; align-items: center; gap: 6px; min-width: 0; margin: 0; color: var(--ds-ink); }
.eh-muted { font-style: italic; color: var(--ds-muted); }
</style>
