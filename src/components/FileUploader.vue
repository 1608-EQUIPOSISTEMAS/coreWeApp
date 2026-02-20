<template>
  <div 
    class="exec-file-uploader" 
    :class="{ 'is-dragging': isDragging, 'is-loading': loading, 'has-file': !!modelValue, 'has-error': isInvalid }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerInput"
  >
    <input 
      type="file" 
      ref="fileInput" 
      :accept="accept" 
      class="d-none" 
      @change="handleFileChange" 
    />

    <div v-if="loading" class="content-wrapper text-teal-600">
      <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
      <div class="small fw-bold">Subiendo archivo...</div>
    </div>

    <div v-else-if="modelValue" class="content-wrapper">
      <div class="icon-circle bg-success-subtle mb-2 text-success">
         <i class="fas fa-check fa-lg"></i>
      </div>
      <div class="small fw-bold text-primary mb-1">Archivo cargado</div>
      <div class="actions mt-2 d-flex gap-2" @click.stop>
        <button class="btn-exec btn-exec-outline btn-sm text-primary border-primary py-1" @click="verArchivo">
          <i class="fas fa-eye me-1"></i> Ver
        </button>
        <button class="btn-exec btn-exec-outline btn-sm text-danger border-danger py-1" @click="triggerInput">
          <i class="fas fa-sync me-1"></i> Cambiar
        </button>
      </div>
    </div>

    <div v-else class="content-wrapper text-muted">
      <div class="icon-circle bg-slate-100 mb-2 text-slate-400">
        <i class="fas fa-cloud-upload-alt fa-lg"></i>
      </div>
      <div class="upload-text text-primary fw-bold mb-1">
        {{ label }} <span v-if="required" class="text-danger">*</span>
      </div>
      
      <div v-if="props.error" class="small text-danger fw-bold anim-fade-in">
        Este campo es obligatorio
      </div>
      <div v-else class="upload-hint small text-muted">{{ hint }}</div>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   ESTILOS EXEC PARA UPLOADER SIMPLE
═══════════════════════════════════════════════ */
.exec-file-uploader {
  border-radius: 6px; /* Estándar Exec */
  border: 2px dashed var(--border, #e2e8f0);
  background-color: var(--slate-50, #f8fafc);
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-height: 140px; /* Un poco más compacto */
  display: flex;
  align-items: center;
  justify-content: center;
}

.exec-file-uploader:hover, 
.exec-file-uploader.is-dragging {
  border-color: var(--teal-500, #12274e);
  background-color: var(--white, #ffffff);
}

.exec-file-uploader.has-file {
  border-style: solid;
  border-color: #10b981; /* Success Green */
  background-color: #f0fdf4;
}

.exec-file-uploader.has-error {
  border-color: var(--red-600, #dc2626) !important;
  background-color: #fef2f2 !important;
  border-style: solid !important;
  animation: shake 0.2s ease-in-out 0s 2;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.exec-file-uploader:hover:not(.has-file):not(.has-error) .icon-circle {
  background-color: rgba(18, 39, 78, 0.1) !important;
  color: var(--teal-500, #12274e) !important;
}

.upload-text { font-size: 13px; color: var(--text-primary, #0f172a) !important; }
.upload-hint { font-size: 11.5px; color: var(--text-muted, #94a3b8) !important; }

/* Utilidades de texto local */
.text-teal-600 { color: var(--teal-600, #12274e); }
.text-primary { color: var(--text-primary, #0f172a) !important; }
.text-danger { color: var(--red-600, #dc2626); }
.border-primary { border-color: var(--slate-300, #cbd5e1) !important; }
.border-danger { border-color: #fca5a5 !important; }
.bg-slate-100 { background-color: var(--slate-100, #f1f5f9); }
.text-slate-400 { color: var(--slate-400, #94a3b8); }

/* Animaciones */
.anim-fade-in { animation: fadeIn 0.3s ease-in-out; }

@keyframes shake {
  0% { margin-left: 0rem; }
  25% { margin-left: 0.5rem; }
  75% { margin-left: -0.5rem; }
  100% { margin-left: 0rem; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
<script setup>
import { ref, inject, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services' // Asegúrate de importar tus keys

const props = defineProps({
  modelValue: { type: [String, null], default: null }, // v-model standard en Vue 3
  label: { type: String, default: 'Haz clic para subir archivo' },
  hint: { type: String, default: 'PDF, JPG o PNG' },
  accept: { type: String, default: '.pdf,.png,.jpg,.jpeg' },
  required: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  maxSize: { type: Number, default: 20 } // MB por defecto
})

const emit = defineEmits(['update:modelValue', 'error'])

// Inyecciones directas en el componente
const integrationService = inject(ServiceKeys.Integration)
const toast = useToast()

const fileInput = ref(null)
const isDragging = ref(false)
const loading = ref(false) // El estado vive aquí ahora

function triggerInput() {
  if (!loading.value) fileInput.value.click()
}

function handleFileChange(event) {
  const file = event.target.files[0]
  processUpload(file)
  event.target.value = ''
}

function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  processUpload(file)
}

function verArchivo() {
    if(props.modelValue) window.open(props.modelValue, '_blank')
}
const isInvalid = computed(() => {
  return props.required && !props.modelValue
})
// Lógica de subida encapsulada
async function processUpload(file) {
  if (!file) return

  // Validación de tamaño
  if (file.size > props.maxSize * 1024 * 1024) {
    toast.warning(`El archivo pesa más de ${props.maxSize}MB`)
    return
  }

  loading.value = true
  
  try {
    // Llamada al servicio directamente aquí
    const res = await integrationService.uploadFile(file)
    
    // Emitimos la URL hacia arriba para que el padre la guarde
    emit('update:modelValue', res.url)
    toast.success('Archivo subido correctamente')
    
  } catch (error) {
    console.error(error)
    toast.error('Error al subir el archivo')
    emit('error', error)
  } finally {
    loading.value = false
  }
}
</script>
