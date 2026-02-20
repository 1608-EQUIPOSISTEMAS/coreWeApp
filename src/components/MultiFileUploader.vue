<template>
  <div class="exec-multi-uploader">
    
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

      <div v-if="loading" class="text-teal-600 small fw-bold">
        <i class="fas fa-spinner fa-spin me-1"></i> Subiendo...
      </div>
      
      <div v-else class="text-muted small user-select-none fw-600">
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
            <i class="fas fa-image text-teal-600" v-else></i>
        </span>
        
        <span class="chip-text" @click="verArchivo(item)">
          {{ item.name }} 
        </span>

        <span class="chip-remove" @click.stop="removerArchivo(index)" title="Quitar">
          <i class="fas fa-times"></i>
        </span>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   ESTILOS EXEC PARA MULTI UPLOADER COMPACTO
═══════════════════════════════════════════════ */
.exec-multi-uploader {
  width: 100%;
}

.upload-trigger {
  border: 1px dashed var(--border, #e2e8f0);
  border-radius: 4px; /* Estándar Exec */
  background-color: var(--white, #ffffff);
  min-height: 38px; /* Mismo alto que un exec-input-light */
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-trigger:hover {
  background-color: var(--slate-50, #f8fafc);
  border-color: var(--teal-500, #12274e);
  color: var(--text-primary, #0f172a) !important;
}

.upload-trigger.is-loading {
  background-color: rgba(18, 39, 78, 0.05); /* Teal claro */
  border-color: var(--teal-500, #12274e);
  cursor: wait;
}

/* Área de los archivos (Chips) */
.file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.file-chip {
  display: inline-flex;
  align-items: center;
  background-color: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px; /* Cambiado a bordes cuadrados suavizados */
  padding: 3px 6px;
  font-size: 11.5px; /* Tamaño "small" del estándar */
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  max-width: 100%;
  transition: border-color 0.15s;
}

.file-chip:hover {
  border-color: var(--slate-300, #cbd5e1);
}

.chip-icon { 
  margin-right: 6px; 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  font-size: 13px;
}

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

.chip-text:hover { 
  text-decoration: underline; 
  color: var(--teal-600, #12274e); 
}

.chip-remove { 
  color: var(--slate-400, #94a3b8); 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px; 
  transition: background 0.2s, color 0.2s; 
}

.chip-remove:hover { 
  color: var(--red-600, #dc2626); 
  background-color: #fee2e2; 
}

/* Utilidades Locales */
.text-teal-600 { color: var(--teal-600, #12274e); }
.text-danger { color: var(--red-600, #dc2626); }
.text-muted { color: var(--text-muted, #94a3b8); }
.fw-600 { font-weight: 600; }
.small { font-size: 12.5px; }
</style>
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
