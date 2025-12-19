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

    <div v-if="modelValue && modelValue.length > 0" class="file-chips mt-2">
      
      <div 
        v-for="(url, index) in modelValue" 
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
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: 'Adjuntar' }, // Texto corto por defecto
  accept: { type: String, default: '.pdf,.png,.jpg,.jpeg' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'upload-file'])
const fileInput = ref(null)

function triggerInput() {
  if (!props.loading) fileInput.value.click()
}

function handleFileChange(event) {
  const file = event.target.files[0]
  if (file) {
    emit('upload-file', file)
  }
  event.target.value = ''
}

function removerArchivo(index) {
  // Eliminación directa sin confirm (opcional, para ser más rápido)
  // O con confirm si prefieres seguridad
  const newArray = [...props.modelValue]
  newArray.splice(index, 1)
  emit('update:modelValue', newArray)
}

function verArchivo(url) {
  if(url) window.open(url, '_blank')
}

function getFileName(url) {
  if (!url) return ''
  const parts = url.split('/')
  const name = parts[parts.length - 1]
  // Truncar visualmente si es muy largo
  return name.length > 15 ? name.substring(0, 12) + '...' : name
}

function esPdf(url) {
  return url && url.toLowerCase().includes('.pdf')
}
</script>

<style scoped>
/* 1. Estilo del Botón Trigger */
.upload-trigger {
  border: 1px dashed #cbd5e1; /* Borde sutil */
  border-radius: 6px;
  background-color: #f8fafc;
  height: 36px; /* Altura estándar de input */
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

/* 2. Contenedor de Chips */
.file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px; /* Espacio pequeño entre elementos */
}

/* 3. Estilo de cada Chip (Pastilla) */
.file-chip {
  display: inline-flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px; /* Borde redondeado completo */
  padding: 2px 8px 2px 4px;
  font-size: 0.75rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  max-width: 100%;
}

.chip-icon {
  margin-right: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.chip-text {
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  margin-right: 6px;
  white-space: nowrap;
}

.chip-text:hover {
  text-decoration: underline;
  color: #2563eb;
}

.chip-remove {
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 50%;
  transition: background 0.2s, color 0.2s;
}

.chip-remove:hover {
  color: #ef4444;
  background-color: #fee2e2;
}
</style>