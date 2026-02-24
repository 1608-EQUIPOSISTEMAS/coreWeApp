<template>
  <div class="exec-multi-uploader">

    <div
      class="upload-trigger d-flex align-items-center justify-content-center"
      :class="{ 'is-loading': loading, 'is-required-empty': showRequiredError }"
      @click="triggerInput"
    >
      <input
        type="file"
        ref="fileInput"
        :accept="accept"
        class="d-none"
        @change="handleFileChange"
      />

      <div v-if="loading" class="text-teal-600 small fw-bold">
        <i class="fas fa-spinner fa-spin me-1"></i> Subiendo...
      </div>

      <div v-else class="text-muted small user-select-none fw-600">
        <i class="fas fa-paperclip me-1"></i> {{ label }}

        <span v-if="required && minFiles > 0"
              class="req-badge ms-1"
              :class="{ 'is-success': isMinMet }">
          mín. {{ minFiles }}
        </span>

        <span v-if="maxFiles > 0"
              class="req-badge ms-1"
              :class="{ 'is-success': isMaxMet, 'is-error': !isMaxMet }">
          máx. {{ maxFiles }}
        </span>
      </div>
    </div>

    <!-- Mensaje de error de requerido -->
    <div v-if="showRequiredError" class="req-error-msg mt-1">
      <i class="fas fa-exclamation-circle me-1"></i>
      {{ minFiles > 1
        ? `Debe subir al menos ${minFiles} archivo(s)`
        : 'Este campo es obligatorio' }}
    </div>

    <div v-if="safeModelValue.length > 0" class="file-chips mt-2">
      <div
        v-for="(item, index) in safeModelValue"
        :key="index"
        class="file-chip"
      >
        <span class="chip-icon" @click="verArchivo(item)">
          <i class="fas fa-file-pdf text-danger" v-if="esPdf(item)"></i>
          <i class="fas fa-image text-teal-600" v-else></i>
        </span>
        <span class="chip-text" @click="verArchivo(item)">{{ item.name }}</span>
        <span class="chip-remove" @click.stop="removerArchivo(index)" title="Quitar">
          <i class="fas fa-times"></i>
        </span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.exec-multi-uploader { width: 100%; }

.upload-trigger {
  border: 1px dashed var(--border, #e2e8f0);
  border-radius: 4px;
  background-color: var(--white, #ffffff);
  min-height: 38px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.upload-trigger:hover {
  background-color: var(--slate-50, #f8fafc);
  border-color: var(--teal-500, #12274e);
}
.upload-trigger.is-loading {
  background-color: rgba(18, 39, 78, 0.05);
  border-color: var(--teal-500, #12274e);
  cursor: wait;
}
/* Estado de error requerido */
.upload-trigger.is-required-empty {
  border-color: var(--red-500, #ef4444);
  background-color: #fff5f5;
}
.upload-trigger.is-required-empty .text-muted {
  color: var(--red-600, #dc2626) !important;
}

.req-badge {
  display: inline-flex;
  align-items: center;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 999px;
  padding: 0px 6px;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}

.req-error-msg {
  font-size: 10.5px;
  color: var(--red-600, #dc2626);
  font-weight: 600;
}

.file-chips { display: flex; flex-wrap: wrap; gap: 6px; }

.file-chip {
  display: inline-flex;
  align-items: center;
  background-color: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 11.5px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  max-width: 100%;
  transition: border-color 0.15s;
}
.file-chip:hover { border-color: var(--slate-300, #cbd5e1); }

.chip-icon { margin-right: 6px; cursor: pointer; display: flex; align-items: center; font-size: 13px; }
.chip-text {
  color: var(--text-secondary, #475569);
  font-weight: 500;
  cursor: pointer;
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  transition: color 0.15s;
}
.chip-text:hover { text-decoration: underline; color: var(--teal-600, #12274e); }
.chip-remove {
  color: var(--slate-400, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
  border-radius: 3px;
  transition: background 0.2s, color 0.2s;
}
.chip-remove:hover { color: var(--red-600, #dc2626); background-color: #fee2e2; }

.text-teal-600 { color: var(--teal-600, #12274e); }
.text-danger   { color: var(--red-600, #dc2626); }
.text-muted    { color: var(--text-muted, #94a3b8); }
.fw-600        { font-weight: 600; }
.small         { font-size: 12.5px; }
/* Modifica tu clase .req-badge y agrega las nuevas */
.req-badge {
  display: inline-flex;
  align-items: center;
  /* Colores por defecto (rojo/alerta) indicando que aún no se cumple */
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 999px;
  padding: 0px 6px;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
  transition: all 0.3s ease; /* Transición suave de color */
}

/* Cuando ya se cumplió el requisito (Verde) */
.req-badge.is-success {
  background: #dcfce7; /* Fondo verde claro */
  color: #16a34a; /* Texto verde oscuro */
}

/* Por si el máximo se sobrepasa accidentalmente (Rojo) */
.req-badge.is-error {
  background: #fee2e2;
  color: #b91c1c;
}
</style>

<script setup>
import { ref, computed, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const props = defineProps({
  modelValue: { type: Array,   default: () => [] },
  label:      { type: String,  default: 'Adjuntar' },
  accept:     { type: String,  default: '.pdf,.png,.jpg,.jpeg' },
  maxSize:    { type: Number,  default: 20 },
  required:   { type: Boolean, default: false },
  minFiles:   { type: Number,  default: 1 },
  maxFiles:   { type: Number,  default: 0 }, // 0 = sin límite (NUEVO)
  touched:    { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const integrationService = inject(ServiceKeys.Integration)
const toast = useToast()

const fileInput   = ref(null)
const loading     = ref(false)
const wasTouched  = ref(false)  // se activa al intentar subir o al hacer clic

const safeModelValue = computed(() => props.modelValue || [])
const isMinMet = computed(() => safeModelValue.value.length >= props.minFiles)
const isMaxMet = computed(() => props.maxFiles === 0 || safeModelValue.value.length <= props.maxFiles)
// Muestra el error si: es required, faltan archivos, y ya interactuó o el padre forzó validación
const showRequiredError = computed(() =>
  props.required &&
  safeModelValue.value.length < props.minFiles &&
  (wasTouched.value || props.touched)
)

// Exponer para que el padre pueda validar sin interacción del usuario
const isValid = computed(() =>
  !props.required || safeModelValue.value.length >= props.minFiles
)

defineExpose({ isValid })

function triggerInput() {
  wasTouched.value = true
  if (!loading.value && fileInput.value) fileInput.value.click()
}

async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return
  if (props.maxFiles > 0 && safeModelValue.value.length >= props.maxFiles) {
    toast.warning(`Solo se permiten hasta ${props.maxFiles} archivo(s)`)
    event.target.value = ''
    return
  }

  if (file.size > props.maxSize * 1024 * 1024) {
    toast.warning(`El archivo pesa más de ${props.maxSize}MB`)
    event.target.value = ''
    return
  }
  if (file.size > props.maxSize * 1024 * 1024) {
    toast.warning(`El archivo pesa más de ${props.maxSize}MB`)
    event.target.value = ''
    return
  }

  loading.value = true
  try {
    const res = await integrationService.uploadFile(file)
    const newFileObj = { url: res.url, name: file.name, type: file.type }
    emit('update:modelValue', [...safeModelValue.value, newFileObj])
    toast.success('Adjunto agregado')
  } catch (error) {
    console.error(error)
    toast.error('Error al subir adjunto')
  } finally {
    loading.value = false
    if (event.target) event.target.value = ''
  }
}

function removerArchivo(index) {
  const newList = [...safeModelValue.value]
  newList.splice(index, 1)
  emit('update:modelValue', newList)
}

function verArchivo(item) {
  if (item?.url) window.open(item.url, '_blank')
}
function esPdf(item) {
  if (item.type) return item.type.includes('pdf')
  return item.url?.toLowerCase().includes('.pdf')
}
</script>
