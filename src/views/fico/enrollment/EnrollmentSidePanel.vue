<template>
  <aside v-if="enrollment" class="ds-panel esp" :key="enrollment.enrollment_id" aria-label="Resumen de la inscripción">
    <header class="esp-head">
      <span class="esp-avatar" aria-hidden="true">{{ initials }}</span>
      <div class="esp-head-name">
        <h3 class="esp-name">{{ enrollment.student_full_name || 'Sin nombre' }}</h3>
        <span class="esp-doc">{{ enrollment.document_number || 'Sin documento' }}</span>
      </div>
      <button class="btn-icon btn-icon-sm" type="button" title="Cerrar (Esc)" aria-label="Cerrar panel" @click="$emit('close')">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </header>

    <div class="esp-body">
      <div class="esp-pills">
        <span class="ds-pill" :class="fmt.statusTone(enrollment.confirmation)">{{ enrollment.confirmation || 'Pendiente' }}</span>
        <span class="ds-pill" :class="fmt.isContado(enrollment) ? '' : 'info'">{{ fmt.isContado(enrollment) ? 'Al contado' : 'Cuotas' }}</span>
        <span v-if="fmt.hasLaptopPromo(enrollment)" class="ds-pill cyan" title="Esta inscripción incluye laptop como beneficio">
          <i class="fa-solid fa-laptop" aria-hidden="true"></i> Traerá laptop
        </span>
        <span
          v-if="fmt.hasPersonalAccount(enrollment)"
          class="ds-pill orange"
          title="Usa su propia cuenta: Académica no le entrega una en ese módulo"
        >
          <i class="fa-solid fa-user-shield" aria-hidden="true"></i> Cuenta propia · {{ fmt.personalAccountProviders(enrollment).join(' + ') }}
        </span>
      </div>

      <div class="esp-money">
        <div class="esp-money-cell">
          <span class="esp-money-label">Monto neto</span>
          <span class="esp-money-value">S/ {{ fmt.formatMoney(enrollment.total_to_pay) }}</span>
        </div>
        <div class="esp-money-cell is-ok">
          <span class="esp-money-label">Pagado</span>
          <span class="esp-money-value">S/ {{ fmt.formatMoney(fmt.getPagado(enrollment)) }}</span>
        </div>
        <div class="esp-money-cell" :class="!fmt.isContado(enrollment) && saldo > 0 ? 'is-bad' : 'is-muted'">
          <span class="esp-money-label">Saldo</span>
          <span class="esp-money-value">{{ fmt.isContado(enrollment) ? '—' : 'S/ ' + fmt.formatMoney(saldo) }}</span>
        </div>
      </div>

      <section class="esp-section">
        <h4 class="esp-section-title">Programa</h4>
        <dl class="esp-dl">
          <div><dt>Programa</dt><dd>{{ enrollment.program_name || '—' }}</dd></div>
          <div><dt>Edición</dt><dd>{{ enrollment.edition_code || '—' }}</dd></div>
          <div><dt>Tipo / modalidad</dt><dd>{{ [enrollment.program_type, enrollment.program_modality].filter(Boolean).join(' / ') || '—' }}</dd></div>
          <div><dt>Inicio</dt><dd>{{ fmt.formatDate(enrollment.start_date) }}</dd></div>
        </dl>
      </section>

      <section class="esp-section">
        <h4 class="esp-section-title">Correos</h4>
        <ul class="esp-emails">
          <li>
            <div class="esp-email-info">
              <span class="esp-email-label">Personal</span>
              <span class="esp-email-value" :class="{ 'is-empty': !enrollment.email }">{{ enrollment.email || 'Sin correo registrado' }}</span>
            </div>
            <button
              v-if="enrollment.email"
              class="btn-icon btn-icon-sm"
              type="button"
              :title="copiedKey === 'personal' ? 'Copiado' : 'Copiar correo personal'"
              :aria-label="copiedKey === 'personal' ? 'Copiado' : 'Copiar correo personal'"
              @click="copyEmail(enrollment.email, 'personal')"
            >
              <i :class="copiedKey === 'personal' ? 'fa-solid fa-check' : 'fa-regular fa-copy'" aria-hidden="true"></i>
            </button>
          </li>
          <li>
            <div class="esp-email-info">
              <span class="esp-email-label">Campus virtual</span>
              <span class="esp-email-value" :class="{ 'is-empty': !odooEmail && !loadingOdooEmail }">
                <template v-if="loadingOdooEmail">Cargando…</template>
                <template v-else>{{ odooEmail || 'Sin acceso registrado' }}</template>
              </span>
            </div>
            <button
              v-if="odooEmail"
              class="btn-icon btn-icon-sm"
              type="button"
              :title="copiedKey === 'campus' ? 'Copiado' : 'Copiar correo del campus'"
              :aria-label="copiedKey === 'campus' ? 'Copiado' : 'Copiar correo del campus'"
              @click="copyEmail(odooEmail, 'campus')"
            >
              <i :class="copiedKey === 'campus' ? 'fa-solid fa-check' : 'fa-regular fa-copy'" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
      </section>

      <section class="esp-section">
        <h4 class="esp-section-title">Pago</h4>
        <dl class="esp-dl">
          <div><dt>F. registro</dt><dd>{{ fmt.formatDateTime(enrollment.registration_date) }}</dd></div>
          <div><dt>F. pago</dt><dd>{{ fmt.formatDate(enrollment.pay_date) }}</dd></div>
          <div><dt>Canal</dt><dd>{{ enrollment.payment_channel || '—' }}</dd></div>
          <div><dt>Asesor</dt><dd>{{ enrollment.seller_agent_name || '—' }}</dd></div>
        </dl>
      </section>

      <section v-if="!fmt.isContado(enrollment)" class="esp-section">
        <h4 class="esp-section-title">Cuotas</h4>
        <ul class="esp-cuotas">
          <li v-for="n in 8" v-show="enrollment[`c${n}`] != null" :key="'c-' + n">
            <span class="esp-cuota-num">C{{ n }}</span>
            <span class="esp-cuota-date">{{ fmt.formatDate(enrollment[`fc${n}`]) }}</span>
            <span class="esp-cuota-amt">S/ {{ fmt.formatMoney(enrollment[`c${n}`]) }}</span>
          </li>
        </ul>
      </section>

      <!-- Acciones rápidas solo con la venta aprobada: no tiene sentido reenviar
           el correo o sincronizar cuotas de una que FICO no revisó. -->
      <section v-if="isApproved" class="esp-section">
        <h4 class="esp-section-title">Acciones rápidas</h4>
        <div class="esp-actions">
          <button class="btn-exec btn-exec-outline btn-sm" type="button" :disabled="busy === 'confirm'" @click="onResendConfirm">
            <i class="fa-solid" :class="busy === 'confirm' ? 'fa-spinner fa-spin' : 'fa-paper-plane'" aria-hidden="true"></i>
            Reenviar confirmación
          </button>
          <button v-if="!fmt.isContado(enrollment)" class="btn-exec btn-exec-outline btn-sm" type="button" :disabled="busy === 'sync'" @click="run('sync')">
            <i class="fa-solid" :class="busy === 'sync' ? 'fa-spinner fa-spin' : 'fa-rotate'" aria-hidden="true"></i>
            Sincronizar cuotas
          </button>
        </div>
      </section>

      <section v-if="isAdmin" class="esp-section esp-danger">
        <h4 class="esp-section-title">Zona de administrador</h4>
        <button class="btn-exec btn-exec-danger btn-sm" type="button" @click="openDeleteModal">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Eliminar inscripción
        </button>
        <p class="esp-hint">Borra esta inscripción y sus módulos hijos. No afecta Odoo.</p>
      </section>
    </div>

    <footer class="esp-foot">
      <button class="btn-exec btn-exec-primary" type="button" @click="$emit('view-full', enrollment)">
        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Ver detalle completo
      </button>
    </footer>

    <BaseModal :model-value="showSapModal" title="Credenciales SAP" size="md" @update:model-value="v => !v && closeSapModal()">
      <div ref="sapModalBody">
        <p class="esp-modal-lead">
          Este es un curso <strong>SAP online</strong>. Escribe el usuario y la contraseña del
          servidor SAP que se enviarán a <strong>{{ enrollment.student_full_name }}</strong>.
        </p>
        <SapCredentialsFields v-model:username="sapUsername" v-model:password="sapPassword" />
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="sendingSap" @click="closeSapModal">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="!sapValid || sendingSap" @click="sendSapConfirmation">
          <i class="fa-solid" :class="sendingSap ? 'fa-spinner fa-spin' : 'fa-paper-plane'" aria-hidden="true"></i>
          {{ sendingSap ? 'Enviando…' : 'Enviar correo' }}
        </button>
      </template>
    </BaseModal>

    <BaseModal :model-value="showDeleteModal" title="Eliminar inscripción" size="md" @update:model-value="v => !v && closeDeleteModal()">
      <p class="esp-modal-lead">
        Estás a punto de <strong>borrar permanentemente</strong> la inscripción de
        <strong>{{ enrollment.student_full_name }}</strong> en
        <strong>{{ enrollment.program_name }}</strong> ({{ enrollment.edition_code || '—' }}).
      </p>
      <ul class="esp-modal-list">
        <li>Se eliminan cuotas, pagos, validaciones, adjuntos, tokens, correos y auditoría.</li>
        <li>Los módulos hijos asociados también se eliminan en cascada.</li>
        <li>El lead asociado se conserva como consulta activa.</li>
        <li>La sale.order y la matrícula en Odoo <strong>no</strong> se tocan.</li>
        <li><strong>Esta acción es irreversible.</strong></li>
      </ul>
      <label class="ds-field">
        <span class="ds-label">Escribe ELIMINAR para confirmar</span>
        <input v-model="deleteConfirmText" class="ds-input" placeholder="ELIMINAR" autocomplete="off" spellcheck="false" />
      </label>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" :disabled="deleting" @click="closeDeleteModal">Cancelar</button>
        <button class="btn-exec btn-exec-danger" type="button" :disabled="!canConfirmDelete || deleting" @click="confirmDelete">
          <i class="fa-solid" :class="deleting ? 'fa-spinner fa-spin' : 'fa-trash-can'" aria-hidden="true"></i>
          {{ deleting ? 'Eliminando…' : 'Eliminar definitivamente' }}
        </button>
      </template>
    </BaseModal>
  </aside>
</template>

<script setup>
import { computed, inject, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { ServiceKeys } from '@/services'
import SapCredentialsFields from './SapCredentialsFields.vue'
import BaseModal from '@/components/BaseModal.vue'
import { isSapCredentialsValid } from './sapCredentials.js'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'

const props = defineProps({
  enrollment: { type: Object, default: null }
})
const emit = defineEmits(['close', 'view-full', 'deleted'])

const fmt = useEnrollmentFormatters()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)

const isAdmin = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return Array.isArray(user.roles) && user.roles.includes('ADMIN')
  } catch {
    return false
  }
})

const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const deleting = ref(false)
const canConfirmDelete = computed(() => deleteConfirmText.value.trim().toUpperCase() === 'ELIMINAR')

function openDeleteModal () {
  deleteConfirmText.value = ''
  showDeleteModal.value = true
}
function closeDeleteModal () {
  if (deleting.value) return
  showDeleteModal.value = false
}
async function confirmDelete () {
  if (!canConfirmDelete.value || deleting.value) return
  const id = props.enrollment?.enrollment_id
  if (!id) return
  deleting.value = true
  try {
    const result = await ficoService.deleteEnrollment(id)
    if (result?.result === 1) {
      toast.success('Inscripcion eliminada permanentemente')
      showDeleteModal.value = false
      emit('deleted', id)
    } else {
      toast.error(result?.message || 'No se pudo eliminar la inscripcion')
    }
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || 'Error al eliminar'
    toast.error(`No se pudo eliminar: ${msg}`)
  } finally {
    deleting.value = false
  }
}

const initials = computed(() => {
  const name = props.enrollment?.student_full_name || ''
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || '?'
})

const saldo = computed(() => fmt.calcSaldo(props.enrollment || {}))
const isApproved = computed(() => /aprobado|confirm/i.test(props.enrollment?.confirmation || ''))

const odooEmail = ref(null)
const loadingOdooEmail = ref(false)
const copiedKey = ref(null)
const isSapOnline = ref(false)

watch(() => props.enrollment?.enrollment_id, async id => {
  odooEmail.value = null
  isSapOnline.value = false
  if (!id) return
  loadingOdooEmail.value = true
  try {
    const flags = await ficoService.getEnrollmentFlags(id)
    odooEmail.value = flags?.odoo_email || null
    isSapOnline.value = !!flags?.is_sap_online
  } catch {
    odooEmail.value = null
  } finally {
    loadingOdooEmail.value = false
  }
}, { immediate: true })

// Mini-modal de credenciales SAP para el reenvio rapido. Los cursos SAP online
// ya no autogeneran usuario/contrasena: FICO los escribe aqui antes de reenviar.
const showSapModal = ref(false)
const sapUsername = ref('')
const sapPassword = ref('')
const sendingSap = ref(false)
const sapValid = computed(() => isSapCredentialsValid(sapUsername.value, sapPassword.value))
const sapModalBody = ref(null)
const sapFieldsFilled = useRequiredFieldsGuard(sapModalBody)

// Reenviar confirmacion: si es SAP online, primero pide credenciales; si no,
// envia directo como siempre.
function onResendConfirm () {
  if (isSapOnline.value) {
    sapUsername.value = ''
    sapPassword.value = ''
    showSapModal.value = true
    return
  }
  run('confirm')
}

function closeSapModal () {
  if (sendingSap.value) return
  showSapModal.value = false
}

async function sendSapConfirmation () {
  if (!sapFieldsFilled() || !sapValid.value || sendingSap.value) return
  const id = props.enrollment?.enrollment_id
  if (!id) return
  sendingSap.value = true
  try {
    const result = await ficoService.sendConfirmationEmail(id, {
      sapUsername: sapUsername.value,
      sapPassword: sapPassword.value
    })
    if (result?.success === false) {
      toast.error(`Error al enviar correo: ${result.error || 'No se pudo completar la accion'}`)
    } else {
      toast.success('Correo de confirmacion enviado')
      showSapModal.value = false
    }
  } catch (err) {
    toast.error(`Error al enviar correo: ${err?.response?.data?.error || err?.message || 'No se pudo completar la accion'}`)
  } finally {
    sendingSap.value = false
  }
}

async function copyEmail (value, key) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedKey.value = key
    setTimeout(() => { if (copiedKey.value === key) copiedKey.value = null }, 1400)
  } catch {
    toast.error('No se pudo copiar al portapapeles')
  }
}

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
/* Panel lateral de Inscripciones. Colores y piezas salen de ds-* y btn-exec;
   aquí solo la disposición propia del panel. Sin bloque dark. */
.esp {
  width: 380px;
  flex-shrink: 0;
  position: sticky;
  top: calc(var(--layout-header-h, 64px) + 12px);
  max-height: calc(100vh - var(--layout-header-h, 64px) - 24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.esp-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--ds-border);
}
.esp-avatar {
  width: 40px; height: 40px; flex-shrink: 0;
  display: grid; place-items: center;
  border-radius: 10px;
  background: var(--ds-soft-info);
  color: var(--ds-info-ink);
  font-weight: 800; font-size: 14px;
}
.esp-head-name { flex: 1; min-width: 0; }
.esp-name {
  margin: 0;
  font-size: 14.5px; font-weight: 700; color: var(--ds-heading);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.esp-doc { font-size: 12px; color: var(--ds-muted); font-variant-numeric: tabular-nums; }

.esp-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.esp-pills { display: flex; flex-wrap: wrap; gap: 6px; }

/* Tres cifras: monto, pagado y saldo, cada una con su tono. */
.esp-money { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.esp-money-cell {
  padding: 8px 10px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border);
  min-width: 0;
}
.esp-money-label { display: block; font-size: 11px; font-weight: 600; color: var(--ds-ink-2); }
.esp-money-value {
  display: block; margin-top: 3px;
  font-family: var(--ds-font-mono); font-size: 12px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--ds-ink); white-space: nowrap;
}
.esp-money-cell.is-ok { background: var(--ds-soft-ok); border-color: transparent; }
.esp-money-cell.is-ok .esp-money-value { color: var(--ds-ok-ink); }
.esp-money-cell.is-bad { background: var(--ds-soft-bad); border-color: transparent; }
.esp-money-cell.is-bad .esp-money-value { color: var(--ds-bad-ink); }
.esp-money-cell.is-muted .esp-money-value { color: var(--ds-muted); }

.esp-section-title { margin: 0 0 8px; font-size: 12.5px; font-weight: 700; color: var(--ds-heading); }
.esp-dl { margin: 0; display: flex; flex-direction: column; gap: 6px; }
.esp-dl > div { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 8px; font-size: 12.5px; }
.esp-dl dt { font-weight: 500; color: var(--ds-ink-2); }
.esp-dl dd { margin: 0; color: var(--ds-ink); font-weight: 600; overflow-wrap: anywhere; }

.esp-emails { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.esp-emails li { display: flex; align-items: center; gap: 8px; }
.esp-email-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.esp-email-label { font-size: 11px; color: var(--ds-ink-2); }
.esp-email-value { font-size: 12.5px; font-weight: 600; color: var(--ds-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.esp-email-value.is-empty { color: var(--ds-muted); font-weight: 400; font-style: italic; }

.esp-cuotas { list-style: none; margin: 0; padding: 0; }
.esp-cuotas li {
  display: grid; grid-template-columns: 34px 1fr auto; gap: 8px;
  padding: 6px 0; border-top: 1px solid var(--ds-border);
  font-size: 12.5px;
}
.esp-cuotas li:first-child { border-top: 0; }
.esp-cuota-num { font-weight: 700; color: var(--ds-ink-2); }
.esp-cuota-date { color: var(--ds-ink-2); }
.esp-cuota-amt { font-family: var(--ds-font-mono); font-weight: 700; color: var(--ds-ink); }

.esp-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.esp-danger { padding: 12px; border-radius: var(--ds-radius-sm); background: var(--ds-soft-bad); }
.esp-danger .esp-section-title { color: var(--ds-bad-ink); }
.esp-hint { margin: 8px 0 0; font-size: 11.5px; color: var(--ds-ink-2); }

.esp-foot { padding: 12px 16px; border-top: 1px solid var(--ds-border); }
.esp-foot .btn-exec { width: 100%; justify-content: center; }

.esp-modal-lead { margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: var(--ds-ink); }
.esp-modal-list { margin: 0 0 14px; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: var(--ds-ink-2); }

@media (max-width: 1280px) {
  .esp { width: 340px; }
}
@media (max-width: 1024px) {
  .esp { width: 100%; position: static; max-height: none; }
}
</style>
