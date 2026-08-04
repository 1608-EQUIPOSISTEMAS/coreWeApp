<template>
  <div class="ep-wrap">
    <div v-if="loading" class="ep-loading">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:20px"></i>
      <p>Cargando preview...</p>
    </div>
    <template v-else-if="previewData">
      <div class="ep-meta">
        <div><span class="ep-meta-label">Para:</span> <span class="ep-meta-value">{{ previewData.to }}</span></div>
        <div><span class="ep-meta-label">Asunto:</span> <span class="ep-meta-value">{{ previewData.subject }}</span></div>
      </div>

      <!-- Correo en copia. La observacion del asesor se muestra tal cual: FICO
           lee y decide, el sistema nunca adivina correos desde texto libre. -->
      <div class="ep-cc" :class="{ 'ep-cc--blocked': ccBlocked }">
        <div v-if="advisorObservation" class="ep-cc-obs">
          <i class="fa-solid fa-comment-dots"></i>
          <div>
            <strong>Observacion del asesor</strong>
            <p>{{ advisorObservation }}</p>
          </div>
        </div>
        <label class="ep-cc-label">
          <i class="fa-regular fa-envelope-open"></i>
          Correo en copia (CC)
          <span v-if="requiresCc" class="ep-cc-req">obligatorio — el asesor lo solicito</span>
          <span v-else class="ep-cc-opt">(opcional)</span>
        </label>
        <input
          v-model="ccRaw"
          type="text"
          class="ep-cc-input"
          :class="{ 'ep-cc-input--error': ccBlocked }"
          placeholder="supervisor@empresa.com, rrhh@empresa.com"
        />
        <div v-if="ccList.length > 0" class="ep-cc-chips">
          <span v-for="email in ccList" :key="email" class="ep-cc-chip">
            <i class="fa-solid fa-check"></i> {{ email }}
          </span>
        </div>
        <p v-if="ccBlocked" class="ep-cc-error">
          <i class="fa-solid fa-lock"></i>
          Esta venta requiere copia. Ingresa al menos un correo valido, o quita el
          requerimiento observando la inscripcion.
        </p>
        <p v-else-if="ccInvalidCount > 0" class="ep-cc-warn">
          <i class="fa-solid fa-triangle-exclamation"></i>
          {{ ccInvalidCount }} correo(s) con formato invalido seran ignorados.
        </p>
      </div>
      <div v-if="previewData.hasAttachment" class="ep-attachment">
        <i class="fa-solid fa-paperclip"></i>
        <span class="ep-attachment-label">Se adjuntará:</span>
        <span class="ep-attachment-file">{{ previewData.attachmentName }}</span>
      </div>
      <SapCredentialsFields
        v-if="showSapForm"
        v-model:username="sapUsername"
        v-model:password="sapPassword"
      />
      <div class="ep-frame-wrap">
        <iframe class="ep-frame" :srcdoc="previewData.html"></iframe>
      </div>
    </template>
    <div v-else class="ep-error">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <p>No se pudo cargar el preview del correo</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification'
import SapCredentialsFields from './SapCredentialsFields.vue'
import { isSapCredentialsValid } from './sapCredentials.js'

const props = defineProps({
  enrollmentId: { type: Number, required: true },
  active: { type: Boolean, default: false },
  overrideEditionId: { type: Number, default: null },
  // Cambio de curso: el preview debe pintar el programa DESTINO, no el del
  // enrollment origen (el enrollment nuevo aun no existe en este paso).
  overrideProgramVersionId: { type: Number, default: null },
  // Solo para membresias: la fecha que el usuario eligio en el datepicker.
  // El preview la usa como override sobre la fecha persistida (que aun no
  // existe en este punto del flujo — el confirm la persiste despues).
  activationDate: { type: String, default: null },
  // Reprogramacion: plan de cuotas que se trasladara al enrollment destino
  // (aun no existe en este paso). [{ installment_number, amount, due_date }]
  overrideInstallments: { type: Array, default: null },
  // Habilita el formulario de credenciales SAP cuando el curso es SAP online.
  // Solo el flujo de confirmar+enviar lo activa; RP/CC lo dejan en false.
  collectSapCredentials: { type: Boolean, default: false },
  // Correo en copia: lo ya guardado en el enrollment, el flag que levanto
  // comercial y la observacion cruda con la que lo pidio.
  initialCc: { type: String, default: '' },
  requiresCc: { type: Boolean, default: false },
  advisorObservation: { type: String, default: '' }
})

const emit = defineEmits(['update:sap', 'update:cc'])

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()

const loading = ref(false)
const previewData = ref(null)
const sapUsername = ref('')
const sapPassword = ref('')

const isSapOnline = computed(() => !!previewData.value?.isSapOnline)
const showSapForm = computed(() => props.collectSapCredentials && isSapOnline.value)
const sapValid = computed(() => isSapCredentialsValid(sapUsername.value, sapPassword.value))

// --- Correo en copia ------------------------------------------------------
// Mismo formato basico que el parser del backend (utils/email-cc.js): lo que
// aca se pinta como chip verde es exactamente lo que alla sobrevive.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ccRaw = ref(props.initialCc || '')

const ccParts = computed(() =>
  String(ccRaw.value || '').split(/[,;]/).map(s => s.trim()).filter(Boolean)
)
const ccList = computed(() => ccParts.value.filter(e => EMAIL_RE.test(e)))
const ccInvalidCount = computed(() => ccParts.value.length - ccList.value.length)

// El bloqueo del boton "Confirmar y Enviar": comercial marco que la venta
// requiere copia y no hay ni un correo valido escrito.
const ccBlocked = computed(() => props.requiresCc && ccList.value.length === 0)

function emitCcState () {
  emit('update:cc', { cc: ccList.value.join(','), valid: !ccBlocked.value })
}

watch(() => props.initialCc, (v) => { if (v && !ccRaw.value) ccRaw.value = v })
watch([ccList, ccBlocked], emitCcState, { immediate: true })

// El padre necesita estas senales para su "gate" de envio (can-advance) y para
// armar el payload al confirmar.
function emitSapState () {
  emit('update:sap', {
    isSapOnline: isSapOnline.value,
    sapUsername: sapUsername.value,
    sapPassword: sapPassword.value,
    valid: !showSapForm.value || sapValid.value
  })
}

async function loadPreview () {
  loading.value = true
  try {
    previewData.value = await ficoService.previewEmail(
      props.enrollmentId,
      props.overrideEditionId,
      props.activationDate,
      { sapUsername: sapUsername.value, sapPassword: sapPassword.value },
      props.overrideProgramVersionId,
      props.overrideInstallments
    )
  } catch (err) {
    console.error(err)
    toast.error('Error cargando preview del correo')
  } finally {
    loading.value = false
    emitSapState()
  }
}

watch(() => props.active, (v) => {
  if (!v) return
  loadPreview()
}, { immediate: true })

watch(() => props.overrideEditionId, () => {
  if (props.active) loadPreview()
})

watch(() => props.overrideProgramVersionId, () => {
  if (props.active) loadPreview()
})

// Si el usuario cambia la fecha entre el step 0 y el step 1, recargamos el
// preview para que refleje la nueva fecha sin necesidad de retroceder.
watch(() => props.activationDate, () => {
  if (props.active) loadPreview()
})

// Al teclear credenciales: avisa al padre de inmediato (para el gate) y refresca
// el preview con debounce para que el iframe muestre las credenciales escritas
// sin pegarle al backend en cada tecla.
let sapDebounce = null
watch([sapUsername, sapPassword], () => {
  emitSapState()
  if (!showSapForm.value) return
  clearTimeout(sapDebounce)
  sapDebounce = setTimeout(() => {
    if (props.active) loadPreview()
  }, 600)
})

defineExpose({ previewData, sapUsername, sapPassword, isSapOnline, sapValid, ccRaw, ccList, ccBlocked })
</script>

<style scoped>
.ep-wrap { min-height: 200px; }

.ep-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px;
  color: #9CA3AF;
  font-size: 13px;
}

.ep-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
  font-size: 12.5px;
  padding: 10px 14px;
  background: #F9FAFB;
  border-radius: 8px;
}
.ep-meta-label { color: #9CA3AF; font-weight: 600; }
.ep-meta-value { font-weight: 700; color: #111827; }

.ep-attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  margin-bottom: 10px;
  background: #F0F9FF;
  border: 1px solid #BAE6FD;
  border-radius: 8px;
  font-size: 12.5px;
}
.ep-attachment i { color: #0369A1; font-size: 12px; }
.ep-attachment-label { color: #475569; font-weight: 600; }
.ep-attachment-file { color: #0c4a6e; font-weight: 700; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }

.ep-cc {
  padding: 10px 14px;
  margin-bottom: 10px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}
.ep-cc--blocked { background: #FEF2F2; border-color: #FCA5A5; }

.ep-cc-obs {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 10px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 6px;
  font-size: 12.5px;
}
.ep-cc-obs i { color: #B45309; font-size: 12px; margin-top: 2px; }
.ep-cc-obs strong { display: block; color: #92400E; font-size: 11.5px; text-transform: uppercase; letter-spacing: .03em; }
.ep-cc-obs p { margin: 2px 0 0; color: #475569; white-space: pre-wrap; }

.ep-cc-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
}
.ep-cc-label i { color: #9CA3AF; }
.ep-cc-req { color: #DC2626; font-weight: 700; font-size: 11.5px; }
.ep-cc-opt { color: #9CA3AF; font-weight: 500; font-size: 11.5px; }

.ep-cc-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 12.5px;
  background: #fff;
  color: #111827;
}
.ep-cc-input:focus { outline: none; border-color: #002060; }
.ep-cc-input--error { border-color: #DC2626; }

.ep-cc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.ep-cc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: #065F46;
}
.ep-cc-chip i { font-size: 9px; }

.ep-cc-error, .ep-cc-warn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 7px 0 0;
  font-size: 11.5px;
  font-weight: 600;
}
.ep-cc-error { color: #DC2626; }
.ep-cc-warn { color: #B45309; }

.ep-frame-wrap {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.ep-frame {
  width: 100%;
  height: 450px;
  border: none;
  display: block;
}

.ep-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 50px;
  color: #DC2626;
  font-size: 13px;
}
.ep-error i { font-size: 24px; opacity: .6; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .ep-loading { color: #6F6F66; }
[data-coreui-theme="dark"] .ep-meta { background: #1F1F1A; }
[data-coreui-theme="dark"] .ep-meta-label { color: #8A8A80; }
[data-coreui-theme="dark"] .ep-meta-value { color: #F4F4F0; }
[data-coreui-theme="dark"] .ep-attachment {
  background: rgba(59,130,246,.12);
  border-color: rgba(59,130,246,.35);
}
[data-coreui-theme="dark"] .ep-attachment i { color: #60A5FA; }
[data-coreui-theme="dark"] .ep-attachment-label { color: #A0A099; }
[data-coreui-theme="dark"] .ep-attachment-file { color: #93C5FD; }
[data-coreui-theme="dark"] .ep-cc { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .ep-cc--blocked { background: rgba(220,38,38,.12); border-color: rgba(248,113,113,.45); }
[data-coreui-theme="dark"] .ep-cc-obs { background: rgba(245,158,11,.12); border-color: rgba(253,230,138,.35); }
[data-coreui-theme="dark"] .ep-cc-obs i, [data-coreui-theme="dark"] .ep-cc-obs strong { color: #FCD34D; }
[data-coreui-theme="dark"] .ep-cc-obs p { color: #A0A099; }
[data-coreui-theme="dark"] .ep-cc-label { color: #A0A099; }
[data-coreui-theme="dark"] .ep-cc-input { background: #14140F; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .ep-cc-input:focus { border-color: #8FAADC; }
[data-coreui-theme="dark"] .ep-cc-chip { background: rgba(16,185,129,.14); border-color: rgba(167,243,208,.3); color: #6EE7B7; }

/* .ep-frame-wrap conserva fondo blanco: el iframe pinta el correo real (HTML claro) */
[data-coreui-theme="dark"] .ep-frame-wrap { border-color: #2A2A22; }
[data-coreui-theme="dark"] .ep-error { color: #F87171; }
</style>
