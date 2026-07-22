<template>
  <div class="exec-multi-uploader">

    <div
      class="upload-trigger d-flex align-items-center justify-content-center"
      :class="{
        'is-loading': loading,
        'is-required-empty': showRequiredError,
        'is-dragging': isDragging
      }"
      @click="triggerInput"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
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

      <div v-else-if="isDragging" class="drag-hint small fw-600">
        <i class="fas fa-cloud-upload-alt me-1"></i> Suelta el archivo aquí
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

        <span class="drag-hint-label ms-2">
          <i class="fas fa-arrow-down me-1" style="font-size:9px;opacity:0.5;"></i>
          o arrastra aquí
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

/* Estado drag activo */
.upload-trigger.is-dragging {
  border-color: var(--teal-500, #12274e);
  border-style: solid;
  background-color: rgba(18, 39, 78, 0.06);
  box-shadow: 0 0 0 3px rgba(18, 39, 78, 0.08);
  transform: scale(1.01);
}
.upload-trigger.is-dragging .drag-hint {
  color: var(--teal-600, #12274e);
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
  transition: all 0.3s ease;
}
.req-badge.is-success {
  background: #dcfce7;
  color: #16a34a;
}
.req-badge.is-error {
  background: #fee2e2;
  color: #b91c1c;
}

.req-error-msg {
  font-size: 10.5px;
  color: var(--red-600, #dc2626);
  font-weight: 600;
}

/* Hint de arrastrar */
.drag-hint-label {
  font-size: 10px;
  opacity: 0.45;
  font-weight: 500;
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

/* ═══════════ DARK MODE ═══════════ */
[data-coreui-theme="dark"] .exec-multi-uploader {
  --border: #2A2A22;
  --white: #1A1A14;
  --slate-50: #1F1F1A;
  --slate-300: #3A3A33;
  --slate-400: #8A8A80;
  --text-secondary: #A0A099;
  --text-muted: #8A8A80;
  --teal-500: #8FAADC;
  --teal-600: #8FAADC;
  --red-500: #F87171;
  --red-600: #F87171;
}
[data-coreui-theme="dark"] .upload-trigger.is-loading { background-color: rgba(143, 170, 220, 0.08); }
[data-coreui-theme="dark"] .upload-trigger.is-dragging {
  background-color: rgba(143, 170, 220, 0.10);
  box-shadow: 0 0 0 3px rgba(143, 170, 220, 0.12);
}
[data-coreui-theme="dark"] .upload-trigger.is-required-empty { background-color: rgba(239, 68, 68, 0.12); }
[data-coreui-theme="dark"] .req-badge { background: rgba(239, 68, 68, 0.16); color: #F87171; }
[data-coreui-theme="dark"] .req-badge.is-success { background: rgba(16, 185, 129, 0.16); color: #34D399; }
[data-coreui-theme="dark"] .req-badge.is-error { background: rgba(239, 68, 68, 0.16); color: #F87171; }
[data-coreui-theme="dark"] .file-chip { box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
[data-coreui-theme="dark"] .chip-remove:hover { background-color: rgba(239, 68, 68, 0.16); }
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
  maxFiles:   { type: Number,  default: 0 },
  touched:    { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const integrationService = inject(ServiceKeys.Integration)
const toast = useToast()

const fileInput   = ref(null)
const loading     = ref(false)
const wasTouched  = ref(false)
const isDragging  = ref(false)
let dragCounter   = 0  // contador para evitar parpadeos al pasar sobre hijos

const safeModelValue = computed(() => props.modelValue || [])
const isMinMet = computed(() => safeModelValue.value.length >= props.minFiles)
const isMaxMet = computed(() => props.maxFiles === 0 || safeModelValue.value.length <= props.maxFiles)
const showRequiredError = computed(() =>
  props.required &&
  safeModelValue.value.length < props.minFiles &&
  (wasTouched.value || props.touched)
)
const isValid = computed(() =>
  !props.required || safeModelValue.value.length >= props.minFiles
)
defineExpose({ isValid })

// ── Click ────────────────────────────────────────────────────────────────────
function triggerInput() {
  wasTouched.value = true
  if (!loading.value && fileInput.value) fileInput.value.click()
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
function onDragEnter(e) {
  dragCounter++
  if (e.dataTransfer?.items?.length) isDragging.value = true
}
function onDragOver(e) {
  // Necesario para que el drop funcione
  e.dataTransfer.dropEffect = 'copy'
}
function onDragLeave() {
  dragCounter--
  if (dragCounter === 0) isDragging.value = false
}
function onDrop(e) {
  isDragging.value = false
  dragCounter = 0
  wasTouched.value = true

  const files = Array.from(e.dataTransfer?.files || [])
  if (!files.length) return

  // Si maxFiles > 0, solo tomar los que quepan
  const slots = props.maxFiles > 0
    ? props.maxFiles - safeModelValue.value.length
    : files.length

  if (slots <= 0) {
    toast.warning(`Solo se permiten hasta ${props.maxFiles} archivo(s)`)
    return
  }

  files.slice(0, slots).forEach(file => processFile(file))
}

// ── Input change ──────────────────────────────────────────────────────────────
async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  if (props.maxFiles > 0 && safeModelValue.value.length >= props.maxFiles) {
    toast.warning(`Solo se permiten hasta ${props.maxFiles} archivo(s)`)
    event.target.value = ''
    return
  }

  await processFile(file)
  if (event.target) event.target.value = ''
}

// ── Lógica compartida de subida ───────────────────────────────────────────────
async function processFile(file) {
  // Validar extensión contra el accept
  const allowed = props.accept.split(',').map(s => s.trim().toLowerCase())
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  const mime = file.type.toLowerCase()
  const isAllowed = allowed.some(a =>
    a.startsWith('.') ? a === ext : mime.startsWith(a.replace('*', ''))
  )
  if (!isAllowed) {
    toast.warning(`Tipo de archivo no permitido: ${ext}`)
    return
  }

  if (file.size > props.maxSize * 1024 * 1024) {
    toast.warning(`El archivo pesa más de ${props.maxSize}MB`)
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
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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