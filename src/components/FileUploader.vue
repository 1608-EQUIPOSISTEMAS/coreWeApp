<template>
  <div 
    class="file-uploader" 
    :class="{ 'is-dragging': isDragging, 'is-loading': loading, 'has-file': !!modelValue,'has-error': isInvalid }"
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

    <div v-if="loading" class="content-wrapper text-primary">
      <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
      <div class="small fw-bold">Subiendo archivo...</div>
    </div>

    <div v-else-if="modelValue" class="content-wrapper text-success">
      <div class="icon-circle bg-success-subtle mb-2">
         <i class="fas fa-check text-success fa-lg"></i>
      </div>
      <div class="small fw-bold text-dark mb-1">Archivo cargado</div>
      <div class="actions mt-2 d-flex gap-2" @click.stop>
        <button class="btn btn-xs btn-outline-primary py-1 px-3" @click="verArchivo">
          <i class="fas fa-eye me-1"></i> Ver
        </button>
        <button class="btn btn-xs btn-outline-danger py-1 px-3" @click="triggerInput">
          <i class="fas fa-sync me-1"></i> Cambiar
        </button>
      </div>
    </div>

    <div v-else class="content-wrapper text-muted">
      <div class="icon-circle bg-primary-subtle mb-2">
        <i class="fas fa-cloud-upload-alt text-primary fa-lg"></i>
      </div>
      <div class="upload-text text-dark fw-bold mb-1">
        {{ label }} <span v-if="required" class="text-danger">*</span>
      </div>
      
      <div v-if="props.error" class="small text-danger fw-bold anim-fade-in">
        Este campo es obligatorio
      </div>
      <div v-else class="upload-hint small text-muted">{{ hint }}</div>
    </div>
  </div>
</template>

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

<style scoped>
/* Tus estilos se mantienen igual */
.file-uploader {
  border-radius: 12px;
  border: 2px dashed #cbd5e1;
  background-color: #f8fafc;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.file-uploader:hover, .file-uploader.is-dragging {
  border-color: #3b82f6;
  background-color: #eff6ff;
}
.file-uploader.has-file {
  border-style: solid;
  border-color: #86efac;
  background-color: #f0fdf4;
}
.content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-text { font-size: 0.95rem; }
.upload-hint { font-size: 0.8rem; }

.file-uploader.has-error {
  border-color: #ef4444; /* Rojo de Bootstrap o Tailwind */
  background-color: #fef2f2;
  border-style: solid;
}

.error-text {
  position: absolute;
  bottom: 10px;
  font-weight: 600;
}

/* Opcional: Animación de error */
.has-error {
  animation: shake 0.2s ease-in-out 0s 2;
}

@keyframes shake {
  0% { margin-left: 0rem; }
  25% { margin-left: 0.5rem; }
  75% { margin-left: -0.5rem; }
  100% { margin-left: 0rem; }
}

.anim-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 2. Estado Hover (Solo si NO tiene error) */
.file-uploader:not(.has-error):hover {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

/* 3. Estado Error (Usa selectores más específicos para forzar el color) */
.file-uploader.has-error {
  border-color: #ef4444 !important; /* Aquí el important es válido para asegurar el aviso */
  background-color: #fef2f2 !important;
  border-style: solid !important;
}

/* 4. Estado Éxito (Archivo cargado) */
.file-uploader.has-file {
  border-style: solid;
  border-color: #86efac;
  background-color: #f0fdf4;
}
</style>