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
        <span
          v-if="fmt.hasLaptopPromo(enrollment)"
          class="esp-pill esp-pill-laptop"
          title="Esta inscripcion incluye laptop como beneficio"
        >
          <i class="fa-solid fa-laptop"></i> Traera laptop
        </span>
        <span
          v-if="fmt.hasClaudeAccount(enrollment)"
          class="esp-pill esp-pill-claude"
          title="Beneficio CUENTA CLAUDE — el alumno usara su cuenta personal"
        >
          <i class="fa-solid fa-user-shield"></i> CUENTA PERSONAL
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
        <h4 class="esp-section-title">Correos</h4>
        <ul class="esp-emails">
          <li class="esp-email">
            <div class="esp-email-info">
              <span class="esp-email-label">Personal</span>
              <span class="esp-email-value" :class="{ 'esp-email-empty': !enrollment.email }">
                {{ enrollment.email || 'Sin correo registrado' }}
              </span>
            </div>
            <button
              v-if="enrollment.email"
              class="esp-email-copy"
              :title="copiedKey === 'personal' ? 'Copiado' : 'Copiar al portapapeles'"
              @click="copyEmail(enrollment.email, 'personal')"
            >
              <i :class="copiedKey === 'personal' ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i>
            </button>
          </li>
          <li class="esp-email">
            <div class="esp-email-info">
              <span class="esp-email-label">Campus Virtual</span>
              <span class="esp-email-value" :class="{ 'esp-email-empty': !odooEmail && !loadingOdooEmail }">
                <template v-if="loadingOdooEmail">Cargando...</template>
                <template v-else>{{ odooEmail || 'Sin acceso registrado' }}</template>
              </span>
            </div>
            <button
              v-if="odooEmail"
              class="esp-email-copy"
              :title="copiedKey === 'campus' ? 'Copiado' : 'Copiar al portapapeles'"
              @click="copyEmail(odooEmail, 'campus')"
            >
              <i :class="copiedKey === 'campus' ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i>
            </button>
          </li>
        </ul>
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
          <button class="esp-action-btn" :disabled="busy === 'confirm'" @click="onResendConfirm">
            <i class="fa-solid" :class="busy === 'confirm' ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
            Reenviar confirmacion
          </button>
          <button v-if="!fmt.isContado(enrollment)" class="esp-action-btn" :disabled="busy === 'sync'" @click="run('sync')">
            <i class="fa-solid" :class="busy === 'sync' ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
            Sincronizar cuotas
          </button>
        </div>
      </div>

      <div v-if="isAdmin" class="esp-section esp-danger">
        <h4 class="esp-section-title esp-danger-title">Zona de administrador</h4>
        <button class="esp-danger-btn" @click="openDeleteModal">
          <i class="fa-solid fa-trash-can"></i>
          Eliminar inscripcion
        </button>
        <p class="esp-danger-hint">Borra esta inscripcion y sus modulos hijos. No afecta Odoo.</p>
      </div>

      <footer class="esp-footer">
        <button class="esp-btn-primary" @click="$emit('view-full', enrollment)">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver detalle completo
        </button>
      </footer>
    </div>

    <div v-if="showSapModal" class="esp-modal-backdrop" @click.self="closeSapModal">
      <div class="esp-modal" role="dialog" aria-modal="true">
        <header class="esp-modal-head esp-modal-head-sap">
          <span class="esp-modal-icon esp-modal-icon-sap"><i class="fa-solid fa-server"></i></span>
          <h3>Credenciales SAP</h3>
        </header>
        <div class="esp-modal-body">
          <p class="esp-modal-lead">
            Este es un curso <strong>SAP online</strong>. Escribe el usuario y la contraseña del
            servidor SAP que se enviarán a <strong>{{ enrollment.student_full_name }}</strong>.
          </p>
          <SapCredentialsFields v-model:username="sapUsername" v-model:password="sapPassword" />
        </div>
        <footer class="esp-modal-foot">
          <button class="esp-modal-btn esp-modal-btn-ghost" :disabled="sendingSap" @click="closeSapModal">
            Cancelar
          </button>
          <button
            class="esp-modal-btn esp-modal-btn-exec"
            :disabled="!sapValid || sendingSap"
            @click="sendSapConfirmation"
          >
            <i class="fa-solid" :class="sendingSap ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
            {{ sendingSap ? 'Enviando...' : 'Enviar correo' }}
          </button>
        </footer>
      </div>
    </div>

    <div v-if="showDeleteModal" class="esp-modal-backdrop" @click.self="closeDeleteModal">
      <div class="esp-modal" role="dialog" aria-modal="true">
        <header class="esp-modal-head">
          <span class="esp-modal-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
          <h3>Eliminar inscripcion</h3>
        </header>
        <div class="esp-modal-body">
          <p class="esp-modal-lead">
            Estas a punto de <strong>borrar permanentemente</strong> la inscripcion de
            <strong>{{ enrollment.student_full_name }}</strong> en
            <strong>{{ enrollment.program_name }}</strong> ({{ enrollment.edition_code || '---' }}).
          </p>
          <ul class="esp-modal-list">
            <li>Se eliminan cuotas, pagos, validaciones, adjuntos, tokens, emails y auditoria.</li>
            <li>Los modulos hijos asociados tambien se eliminan en cascada.</li>
            <li>El lead asociado se conserva como consulta activa.</li>
            <li>La sale.order y la matricula en Odoo <strong>no</strong> se tocan.</li>
            <li><strong>Esta accion es irreversible.</strong></li>
          </ul>
          <label class="esp-modal-field">
            Escribe <code>ELIMINAR</code> para confirmar
            <input
              v-model="deleteConfirmText"
              class="esp-modal-input"
              placeholder="ELIMINAR"
              autocomplete="off"
              spellcheck="false"
            />
          </label>
        </div>
        <footer class="esp-modal-foot">
          <button class="esp-modal-btn esp-modal-btn-ghost" :disabled="deleting" @click="closeDeleteModal">
            Cancelar
          </button>
          <button
            class="esp-modal-btn esp-modal-btn-danger"
            :disabled="!canConfirmDelete || deleting"
            @click="confirmDelete"
          >
            <i class="fa-solid" :class="deleting ? 'fa-spinner fa-spin' : 'fa-trash-can'"></i>
            {{ deleting ? 'Eliminando...' : 'Eliminar definitivamente' }}
          </button>
        </footer>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, inject, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'
import { ServiceKeys } from '@/services'
import SapCredentialsFields from './SapCredentialsFields.vue'
import { isSapCredentialsValid } from './sapCredentials.js'

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
  if (!sapValid.value || sendingSap.value) return
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
.esp-pill-laptop {
  background: #ECFEFF;
  color: #155E75;
  border: 1px solid #A5F3FC;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.esp-pill-laptop i { font-size: 10px; color: #0891B2; }

.esp-pill-claude {
  background: #FFF7ED;
  color: #9A3412;
  border: 1px solid #FED7AA;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.esp-pill-claude i { font-size: 10px; color: #EA580C; }

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

/* Emails */
.esp-emails {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.esp-email {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #FAFAFA;
  border-radius: 6px;
  font-size: 12px;
}
.esp-email-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.esp-email-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #A3A3A3;
  font-weight: 600;
}
.esp-email-value {
  font-size: 12px;
  color: #1A1A1A;
  font-weight: 500;
  word-break: break-all;
  line-height: 1.4;
}
.esp-email-empty { color: #C4C4C4; font-style: italic; font-weight: 400; }
.esp-email-copy {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border: 1px solid #EFEFEF;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #737373;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.esp-email-copy:hover {
  background: #F0FDFA;
  border-color: #99F6E4;
  color: #0F766E;
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

/* Danger zone */
.esp-danger {
  border-top: 1px dashed #FECACA;
  padding-top: 12px;
  margin-top: 4px;
}
.esp-danger-title { color: #B91C1C; }
.esp-danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  width: 100%;
  font-size: 12px;
  font-weight: 600;
  color: #B91C1C;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  letter-spacing: -0.01em;
}
.esp-danger-btn i { font-size: 12px; }
.esp-danger-btn:hover {
  background: #FEE2E2;
  border-color: #FCA5A5;
  color: #991B1B;
}
.esp-danger-hint {
  margin: 6px 0 0;
  font-size: 10.5px;
  color: #A3A3A3;
  line-height: 1.4;
}

/* Delete confirmation modal */
.esp-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  animation: esp-backdrop-in 0.18s ease-out;
}
.esp-modal {
  animation: esp-modal-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes esp-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes esp-modal-in {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.esp-modal {
  background: #fff;
  border-radius: 14px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.esp-modal-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: #FEF2F2;
  border-bottom: 1px solid #FECACA;
}
.esp-modal-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #991B1B;
  letter-spacing: -0.01em;
}
.esp-modal-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: #B91C1C;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.esp-modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.esp-modal-lead {
  margin: 0;
  font-size: 13px;
  color: #1A1A1A;
  line-height: 1.5;
}
.esp-modal-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #525252;
  line-height: 1.55;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.esp-modal-list strong { color: #1A1A1A; }
.esp-modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #525252;
  font-weight: 500;
}
.esp-modal-field code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  background: #F5F5F5;
  padding: 1px 6px;
  border-radius: 4px;
  color: #B91C1C;
  font-weight: 700;
}
.esp-modal-input {
  width: 100%;
  padding: 9px 12px;
  font-size: 13px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.04em;
  outline: none;
  transition: border-color 0.15s ease;
}
.esp-modal-input:focus { border-color: #B91C1C; }
.esp-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid #F5F5F5;
}
.esp-modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  letter-spacing: -0.01em;
  transition: all 0.15s ease;
}
.esp-modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.esp-modal-btn-ghost {
  background: #fff;
  color: #525252;
  border-color: #E5E5E5;
}
.esp-modal-btn-ghost:hover:not(:disabled) { background: #FAFAFA; color: #1A1A1A; }
.esp-modal-btn-danger {
  background: #B91C1C;
  color: #fff;
}
.esp-modal-btn-danger:hover:not(:disabled) { background: #991B1B; }
.esp-modal-btn-exec {
  background: #0284C7;
  color: #fff;
}
.esp-modal-btn-exec:hover:not(:disabled) { background: #0369A1; }

/* SAP modal: cabecera azul en vez de roja */
.esp-modal-head-sap {
  background: #F0F9FF;
  border-bottom-color: #BAE6FD;
}
.esp-modal-head-sap h3 { color: #0c4a6e; }
.esp-modal-icon-sap { background: #0284C7; }

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

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .esp {
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .esp-name { color: #F4F4F0; }
[data-coreui-theme="dark"] .esp-doc { color: #A0A099; }
[data-coreui-theme="dark"] .esp-icon-btn {
  background: #14140F;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .esp-icon-btn:hover {
  background: #2A2A22;
  color: #F4F4F0;
}

[data-coreui-theme="dark"] .esp-pill-soft { background: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .esp-pill-laptop {
  background: rgba(8,145,178,0.16);
  color: #67E8F9;
  border-color: rgba(8,145,178,0.4);
}
[data-coreui-theme="dark"] .esp-pill-laptop i { color: #22D3EE; }
[data-coreui-theme="dark"] .esp-pill-claude {
  background: rgba(234,88,12,0.16);
  color: #FDBA74;
  border-color: rgba(234,88,12,0.4);
}
[data-coreui-theme="dark"] .esp-pill-claude i { color: #FB923C; }
[data-coreui-theme="dark"] .pill-green { background: rgba(16,185,129,0.16); color: #34D399; }
[data-coreui-theme="dark"] .pill-amber { background: rgba(245,158,11,0.16); color: #FBBF24; }
[data-coreui-theme="dark"] .pill-red   { background: rgba(239,68,68,0.16); color: #F87171; }
[data-coreui-theme="dark"] .pill-slate { background: #2A2A22; color: #A0A099; }

[data-coreui-theme="dark"] .esp-h-card {
  background: #1F1F1A;
  border-left-color: #3A3A33;
}
[data-coreui-theme="dark"] .esp-h-label { color: #6F6F66; }
[data-coreui-theme="dark"] .esp-h-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .esp-h-green { background: rgba(16,185,129,0.12); border-left-color: #10B981; }
[data-coreui-theme="dark"] .esp-h-green .esp-h-value { color: #34D399; }
[data-coreui-theme="dark"] .esp-h-red { background: rgba(239,68,68,0.12); border-left-color: #EF4444; }
[data-coreui-theme="dark"] .esp-h-red .esp-h-value { color: #F87171; }
[data-coreui-theme="dark"] .esp-h-muted .esp-h-value { color: #6F6F66; }

[data-coreui-theme="dark"] .esp-section-title { color: #6F6F66; }
[data-coreui-theme="dark"] .esp-dl-row { border-bottom-color: #1F1F1A; }
[data-coreui-theme="dark"] .esp-dl-row dt { color: #6F6F66; }
[data-coreui-theme="dark"] .esp-dl-row dd { color: #F4F4F0; }

[data-coreui-theme="dark"] .esp-email { background: #1F1F1A; }
[data-coreui-theme="dark"] .esp-email-label { color: #6F6F66; }
[data-coreui-theme="dark"] .esp-email-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .esp-email-empty { color: #6F6F66; }
[data-coreui-theme="dark"] .esp-email-copy {
  background: #14140F;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .esp-email-copy:hover {
  background: rgba(16,185,129,0.12);
  border-color: rgba(16,185,129,0.4);
  color: #34D399;
}

[data-coreui-theme="dark"] .esp-cuota { background: #1F1F1A; }
[data-coreui-theme="dark"] .esp-cuota-num { color: #34D399; }
[data-coreui-theme="dark"] .esp-cuota-date { color: #A0A099; }
[data-coreui-theme="dark"] .esp-cuota-amt { color: #F4F4F0; }

[data-coreui-theme="dark"] .esp-action-btn {
  background: #1F1F1A;
  border-color: #2A2A22;
  color: #D4D4CC;
}
[data-coreui-theme="dark"] .esp-action-btn i { color: #34D399; }
[data-coreui-theme="dark"] .esp-action-btn:hover:not(:disabled) {
  background: rgba(16,185,129,0.12);
  border-color: rgba(16,185,129,0.4);
  color: #34D399;
}

[data-coreui-theme="dark"] .esp-danger { border-top-color: rgba(239,68,68,0.35); }
[data-coreui-theme="dark"] .esp-danger-title { color: #F87171; }
[data-coreui-theme="dark"] .esp-danger-btn {
  background: rgba(239,68,68,0.12);
  border-color: rgba(239,68,68,0.4);
  color: #F87171;
}
[data-coreui-theme="dark"] .esp-danger-btn:hover {
  background: rgba(239,68,68,0.2);
  border-color: rgba(239,68,68,0.6);
  color: #FCA5A5;
}
[data-coreui-theme="dark"] .esp-danger-hint { color: #6F6F66; }
[data-coreui-theme="dark"] .esp-modal { background: #1A1A14; }
[data-coreui-theme="dark"] .esp-modal-head {
  background: rgba(239,68,68,0.12);
  border-bottom-color: rgba(239,68,68,0.35);
}
[data-coreui-theme="dark"] .esp-modal-head h3 { color: #FCA5A5; }
[data-coreui-theme="dark"] .esp-modal-lead { color: #F4F4F0; }
[data-coreui-theme="dark"] .esp-modal-list { color: #D4D4CC; }
[data-coreui-theme="dark"] .esp-modal-list strong { color: #F4F4F0; }
[data-coreui-theme="dark"] .esp-modal-field { color: #D4D4CC; }
[data-coreui-theme="dark"] .esp-modal-field code { background: #2A2A22; color: #FCA5A5; }
[data-coreui-theme="dark"] .esp-modal-input {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .esp-modal-input:focus { border-color: #F87171; }
[data-coreui-theme="dark"] .esp-modal-foot { border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .esp-modal-btn-ghost {
  background: #14140F;
  border-color: #2A2A22;
  color: #D4D4CC;
}
[data-coreui-theme="dark"] .esp-modal-btn-ghost:hover:not(:disabled) {
  background: #2A2A22;
  color: #F4F4F0;
}

[data-coreui-theme="dark"] .esp-footer { border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .esp-btn-primary { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .esp-btn-primary:hover { background: #E4E4DD; }
</style>
