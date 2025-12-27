<template>
  <div 
    class="file-uploader" 
    :class="{ 'is-dragging': isDragging, 'is-loading': loading, 'has-file': !!modelValue }"
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
      <div class="upload-text text-dark fw-bold mb-1">{{ label }}</div>
      <div class="upload-hint small text-muted">{{ hint }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services' // Asegúrate de importar tus keys

const props = defineProps({
  modelValue: { type: [String, null], default: null }, // v-model standard en Vue 3
  label: { type: String, default: 'Haz clic para subir archivo' },
  hint: { type: String, default: 'PDF, JPG o PNG' },
  accept: { type: String, default: '.pdf,.png,.jpg,.jpeg' },
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
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
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
</style>