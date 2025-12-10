<template>
  <div class="modern-date-picker">
    
    <div 
      class="picker-wrapper" 
      :class="{ 'is-focused': isFocused, 'has-value': hasValue }"
    >
      <div class="icon-wrapper">
        <i class="fa-regular fa-calendar text-muted"></i>
      </div>

      <div class="field-group">
        <label class="floating-label">DESDE</label>
        <input
          type="date"
          class="native-input"
          v-model="innerStart"
          @focus="onFocus"
          @blur="onBlur"
          @change="onManualChange"
        />
      </div>

      <div class="separator">
        <i class="fa-solid fa-arrow-right-long"></i>
      </div>

      <div class="field-group">
        <label class="floating-label">HASTA</label>
        <input
          type="date"
          class="native-input"
          v-model="innerEnd"
          :min="innerStart || undefined"
          @focus="onFocus"
          @blur="onBlur"
          @change="onManualChange"
        />
      </div>

      <button v-if="hasValue" class="btn-clear" @click.stop="clearDate" title="Limpiar fechas">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div v-if="showPresets" class="presets-row">
      <button
        v-for="p in presets"
        :key="p.key"
        type="button"
        class="preset-chip"
        :class="{ 'active': isPresetActive(p) }"
        @click="applyPreset(p)"
      >
        {{ p.label }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  // FIX: Permitimos Object, String o Null para evitar el Warning de consola
  // aunque internamente lo trataremos como objeto.
  modelValue: { 
    type: [Object, String, null], 
    default: () => ({ start: '', end: '' }) 
  },
  showPresets: { type: Boolean, default: true },
  presets: {
    type: Array,
    default: () => {
      const today = new Date()
      // Helper para formatear YYYY-MM-DD local
      const fmt = (d) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      
      const getDaysAgo = (n) => {
        const d = new Date()
        d.setDate(d.getDate() - n)
        return fmt(d)
      }
      
      const startMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      return [
        { key: 'today', label: 'Hoy', start: fmt(today), end: fmt(today) },
        { key: 'yesterday', label: 'Ayer', start: getDaysAgo(1), end: getDaysAgo(1) },
        { key: 'last7', label: '7 Días', start: getDaysAgo(6), end: fmt(today) },
        { key: 'thisMonth', label: 'Este Mes', start: fmt(startMonth), end: fmt(today) },
      ]
    },
  },
})

const emit = defineEmits(['update:modelValue', 'change'])
const isFocused = ref(false)

// --- Computed Helpers con Protección de Tipos ---

// Convierte el prop (que puede venir malformado como string) a un objeto seguro
const safeModel = computed(() => {
  if (props.modelValue && typeof props.modelValue === 'object') {
    return props.modelValue
  }
  // Si viene un string o null, retornamos objeto vacío
  return { start: '', end: '' }
})

const innerStart = computed({
  get: () => safeModel.value.start || '',
  set: (val) => updateModel(val, safeModel.value.end)
})

const innerEnd = computed({
  get: () => safeModel.value.end || '',
  set: (val) => updateModel(safeModel.value.start, val)
})

const hasValue = computed(() => !!innerStart.value || !!innerEnd.value)

// --- Logic ---

function updateModel(start, end) {
  const newVal = { start: start || '', end: end || '' }
  emit('update:modelValue', newVal)
}

function onManualChange() {
  // Emitimos 'change' cuando el usuario termina de editar manualmente
  emit('change', { start: innerStart.value, end: innerEnd.value })
}

function applyPreset(preset) {
  updateModel(preset.start, preset.end)
  emit('change', { start: preset.start, end: preset.end })
}

function clearDate() {
  updateModel('', '')
  emit('change', { start: '', end: '' })
}

function isPresetActive(preset) {
  return innerStart.value === preset.start && innerEnd.value === preset.end
}

function onFocus() { isFocused.value = true }
function onBlur() { isFocused.value = false }
</script>

<style scoped>
/* Fuente base */
.modern-date-picker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 100%;
}

/* --- Contenedor Wrapper (Estilo Input Group) --- */
.picker-wrapper {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #e5e7eb; /* Gris suave */
  border-radius: 10px;
  padding: 0.25rem 0.5rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  min-height: 50px;
}

/* Estado Focus: Brillo azul suave (Ring) */
.picker-wrapper.is-focused {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* Estado Hover */
.picker-wrapper:hover:not(.is-focused) {
  border-color: #d1d5db;
}

/* Icono Calendario Izquierda */
.icon-wrapper {
  color: #9ca3af;
  padding: 0 0.5rem;
  font-size: 1rem;
}

/* Grupos de Input (Desde / Hasta) */
.field-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 0.25rem;
  position: relative;
}

/* Labels pequeños flotantes (simulados) */
.floating-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: -2px; /* Pegarlo al input */
  pointer-events: none;
}

/* Input nativo limpio */
.native-input {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1f2937;
  width: 100%;
  outline: none;
  font-family: inherit;
  cursor: pointer;
  height: 24px;
}

/* Hack para icono de calendario nativo */
.native-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

/* Separador flecha */
.separator {
  color: #d1d5db;
  font-size: 0.85rem;
  padding: 0 0.5rem;
  display: flex;
  align-items: center;
}

/* Botón X para limpiar */
.btn-clear {
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: all 0.2s;
}
.btn-clear:hover {
  background-color: #f3f4f6;
  color: #ef4444; /* Rojo al hover */
}

/* --- Presets (Chips) --- */
.presets-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.preset-chip {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #4b5563;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.preset-chip:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #111827;
}

.preset-chip.active {
  background-color: #eff6ff; /* Azul muy claro */
  border-color: #bfdbfe;
  color: #2563eb; /* Azul primario */
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.1);
}
</style>