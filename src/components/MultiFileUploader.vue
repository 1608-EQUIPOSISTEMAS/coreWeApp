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
        v-for="(item, index) in safeModelValue" 
        :key="index" 
        class="file-chip"
        title="Clic para ver"
      >
        <span class="chip-icon" @click="verArchivo(item)">
            <i class="fas fa-file-pdf text-danger" v-if="esPdf(item)"></i>
            <i class="fas fa-image text-primary" v-else></i>
        </span>
        
        <span class="chip-text" @click="verArchivo(item)">
          {{ item.name }} </span>

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
  modelValue: { type: Array, default: () => [] }, 
  label: { type: String, default: 'Adjuntar' },
  accept: { type: String, default: '.pdf,.png,.jpg,.jpeg' },
  maxSize: { type: Number, default: 20 }
})

const emit = defineEmits(['update:modelValue'])

const integrationService = inject(ServiceKeys.Integration)
const toast = useToast()

const fileInput = ref(null)
const loading = ref(false)

const safeModelValue = computed(() => props.modelValue || [])

function triggerInput() {
  if (!loading.value && fileInput.value) fileInput.value.click()
}

async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > props.maxSize * 1024 * 1024) {
    toast.warning(`El archivo pesa más de ${props.maxSize}MB`)
    event.target.value = ''
    return
  }

  loading.value = true

  try {
    const res = await integrationService.uploadFile(file)
    
    // --- CAMBIO CLAVE AQUÍ ---
    // Creamos el objeto con la estructura que pide tu Backend
    const newFileObj = {
        url: res.url,           // La URL que devuelve AWS/Servidor
        name: file.name,        // El nombre original (ej: "Mi CV.pdf")
        type: file.type         // El tipo MIME (ej: "application/pdf")
    }

    const newList = [...safeModelValue.value, newFileObj]
    
    emit('update:modelValue', newList)
    toast.success('Adjunto agregado')

  } catch (error) {
    console.error(error)
    toast.error('Error al subir adjunto')
  } finally {
    loading.value = false
    if(event.target) event.target.value = '' 
  }
}

function removerArchivo(index) {
  const newList = [...safeModelValue.value]
  newList.splice(index, 1)
  emit('update:modelValue', newList)
}

// Helpers adaptados para recibir Objeto
function verArchivo(item) {
  if(item && item.url) window.open(item.url, '_blank')
}

// Ya no necesitamos 'getFileName' complejo porque tenemos item.name real
function esPdf(item) {
  // Verificamos por tipo MIME o por extensión en la URL como fallback
  if (item.type) return item.type.includes('pdf')
  return item.url && item.url.toLowerCase().includes('.pdf')
}
</script>

<style scoped>
/* Tus estilos están perfectos, no hace falta tocarlos */
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
.chip-text { color: #475569; font-weight: 500; cursor: pointer; margin-right: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.chip-text:hover { text-decoration: underline; color: #2563eb; }
.chip-remove { color: #94a3b8; cursor: pointer; display: flex; align-items: center; padding: 2px; border-radius: 50%; transition: background 0.2s, color 0.2s; }
.chip-remove:hover { color: #ef4444; background-color: #fee2e2; }
</style>