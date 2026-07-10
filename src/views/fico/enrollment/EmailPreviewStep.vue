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
  collectSapCredentials: { type: Boolean, default: false }
})

const emit = defineEmits(['update:sap'])

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()

const loading = ref(false)
const previewData = ref(null)
const sapUsername = ref('')
const sapPassword = ref('')

const isSapOnline = computed(() => !!previewData.value?.isSapOnline)
const showSapForm = computed(() => props.collectSapCredentials && isSapOnline.value)
const sapValid = computed(() => isSapCredentialsValid(sapUsername.value, sapPassword.value))

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

defineExpose({ previewData, sapUsername, sapPassword, isSapOnline, sapValid })
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
</style>
