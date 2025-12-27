<template>
  <div class="compact-uploader">
    
    <div 
      class="upload-trigger d-flex align-items-center justify-content-center"
      :class="{ 'is-loading': loading }"
      @click="triggerInput"
    >
      <input 
        type="file" 
        ref="fileInput" 
        :accept="accept" 
        class="d-none" 
        @change="handleFileChange" 
      />

      <div v-if="loading" class="text-primary small fw-bold">
        <i class="fas fa-spinner fa-spin me-1"></i> Subiendo...
      </div>
      
      <div v-else class="text-muted small user-select-none">
        <i class="fas fa-paperclip me-1"></i> {{ label }}
      </div>
    </div>

    <div v-if="safeModelValue.length > 0" class="file-chips mt-2">
      
      <div 
        v-for="(url, index) in safeModelValue" 
        :key="index" 
        class="file-chip"
        title="Clic para ver"
      >
        <span class="chip-icon" @click="verArchivo(url)">
            <i class="fas fa-file-pdf text-danger" v-if="esPdf(url)"></i>
            <i class="fas fa-image text-primary" v-else></i>
        </span>
        
        <span class="chip-text" @click="verArchivo(url)">
          {{ getFileName(url) }}
        </span>

        <span class="chip-remove" @click.stop="removerArchivo(index)">
          <i class="fas fa-times"></i>
        </span>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services' 

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // Array de URLs
  label: { type: String, default: 'Adjuntar' },
  accept: { type: String, default: '.pdf,.png,.jpg,.jpeg' },
  maxSize: { type: Number, default: 20 }
})

const emit = defineEmits(['update:modelValue'])

// Inyecciones
const integrationService = inject(ServiceKeys.Integration)
const toast = useToast()

// Estado Local
const fileInput = ref(null)
const loading = ref(false) // <--- El estado vive aquí, aislado por instancia

// Computada segura por si modelValue viene null
const safeModelValue = computed(() => props.modelValue || [])

function triggerInput() {
  if (!loading.value) fileInput.value.click()
}

// Lógica de Subida Interna
async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  // 1. Validar tamaño
  if (file.size > props.maxSize * 1024 * 1024) {
    toast.warning(`El archivo pesa más de ${props.maxSize}MB`)
    event.target.value = ''
    return
  }

  loading.value = true

  try {
    // 2. Subir
    const res = await integrationService.uploadFile(file)
    
    // 3. Actualizar la lista (Inmutabilidad: creamos nuevo array)
    // Agregamos la nueva URL al array existente
    const newList = [...safeModelValue.value, res.url]
    
    emit('update:modelValue', newList)
    toast.success('Adjunto agregado')

  } catch (error) {
    console.error(error)
    toast.error('Error al subir adjunto')
  } finally {
    loading.value = false
    event.target.value = '' // Limpiar input para permitir subir el mismo archivo
  }
}

function removerArchivo(index) {
  // Copiamos el array y quitamos el elemento
  const newList = [...safeModelValue.value]
  newList.splice(index, 1)
  emit('update:modelValue', newList)
}

// Utilidades visuales
function verArchivo(url) {
  if(url) window.open(url, '_blank')
}

function getFileName(url) {
  if (!url) return ''
  const parts = url.split('/')
  const name = parts[parts.length - 1]
  return name.length > 15 ? name.substring(0, 12) + '...' : name
}

function esPdf(url) {
  return url && url.toLowerCase().includes('.pdf')
}
</script>

<style scoped>
/* Tus estilos se mantienen idénticos, son excelentes */
.upload-trigger {
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  background-color: #f8fafc;
  height: 36px;
  cursor: pointer;
  transition: all 0.2s;
}
.upload-trigger:hover {
  background-color: #e2e8f0;
  border-color: #94a3b8;
  color: #334155 !important;
}
.upload-trigger.is-loading {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  cursor: wait;
}
.file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.file-chip {
  display: inline-flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2px 8px 2px 4px;
  font-size: 0.75rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  max-width: 100%;
}
.chip-icon { margin-right: 4px; cursor: pointer; display: flex; align-items: center; }
.chip-text { color: #475569; font-weight: 500; cursor: pointer; margin-right: 6px; white-space: nowrap; }
.chip-text:hover { text-decoration: underline; color: #2563eb; }
.chip-remove { color: #94a3b8; cursor: pointer; display: flex; align-items: center; padding: 2px; border-radius: 50%; transition: background 0.2s, color 0.2s; }
.chip-remove:hover { color: #ef4444; background-color: #fee2e2; }
</style>