<template>
  <div class="dt12" :class="stateClass">
    <div class="dt12__date-wrapper">
      <flat-pickr
        v-model="datePart"
        :config="flatpickrConfig"
        class="dt12__input dt12__input--date"
        :disabled="disabled"
        placeholder="Selecciona fecha"
      />
    </div>

    <select
      class="dt12__input dt12__input--hour"
      v-model.number="hour12"
      @change="emitChange"
      :required="required"
      :disabled="disabled"
    >
      <option v-for="h in hours12" :key="h" :value="h">
        {{ h }}
      </option>
    </select>

    <select
      class="dt12__input dt12__input--minute"
      v-model.number="minutePart"
      @change="emitChange"
      :disabled="disabled"
    >
      <option v-for="m in minutes" :key="m" :value="m">
        {{ String(m).padStart(2, '0') }}
      </option>
    </select>

    <select
      class="dt12__input dt12__input--ampm"
      v-model="ampmPart"
      @change="emitChange"
      :disabled="disabled"
    >
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>

    <button
      v-if="clearable && hasValue && !disabled"
      type="button"
      class="dt12__clear"
      @click="clearValue"
      title="Limpiar"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import flatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.css'
import { Spanish } from 'flatpickr/dist/l10n/es.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  required: { type: Boolean, default: false },
  outputPrecision: { type: String, default: 'seconds' },
  clearable: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const hours12 = Array.from({ length: 12 }, (_, i) => i + 1)
const minutes = Array.from({ length: 60 }, (_, i) => i)

// Configuración de FlatPickr
const flatpickrConfig = {
  altInput: true,
  altFormat: "d/m/Y",
  dateFormat: "Y-m-d",
  locale: Spanish,
  allowInput: true,
  disableMobile: true,
  onChange: (selectedDates, dateStr) => {
    emitChange()
  }
}

function normalize(v) {
  return (v || '').trim().replace('T', ' ')
}

const datePart = computed({
  get() {
    const norm = normalize(props.modelValue)
    if (!norm) return ''
    const [d] = norm.split(' ')
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''
  },
  set(val) { 
    emitFull(val, hour12.value, minutePart.value, ampmPart.value) 
  },
})

const hour12 = computed({
  get() {
    const norm = normalize(props.modelValue)
    if (!norm) return 12
    const parts = norm.split(' ')
    if (parts.length < 2) return 12
    const time24 = parts[1].slice(0, 5)
    return to12h(time24).hour
  },
  set(val) { 
    emitFull(datePart.value, val, minutePart.value, ampmPart.value) 
  },
})

const minutePart = computed({
  get() {
    const norm = normalize(props.modelValue)
    if (!norm) return 0
    const parts = norm.split(' ')
    if (parts.length < 2) return 0
    const time = parts[1].split(':')
    return time.length >= 2 ? Number(time[1]) : 0
  },
  set(val) { 
    emitFull(datePart.value, hour12.value, val, ampmPart.value) 
  },
})

const ampmPart = computed({
  get() {
    const norm = normalize(props.modelValue)
    if (!norm) return 'AM'
    const parts = norm.split(' ')
    if (parts.length < 2) return 'AM'
    const time24 = parts[1].slice(0, 5)
    return to12h(time24).ampm
  },
  set(val) { 
    emitFull(datePart.value, hour12.value, minutePart.value, val) 
  },
})

const hasValue = computed(() => !!props.modelValue)
const isValid = computed(() => !!datePart.value)
const isInvalid = computed(() => props.required && !datePart.value)

const stateClass = computed(() => {
  if (!props.required || props.disabled) return 'dt12--neutral'
  if (isInvalid.value) return 'dt12--error'
  if (isValid.value) return 'dt12--success'
  return 'dt12--neutral'
})

function emitChange() {
  emitFull(datePart.value, hour12.value, minutePart.value, ampmPart.value)
}

function emitFull(date, h12, min, ampm) {
  if (!date) {
    emit('update:modelValue', '')
    emit('change', '')
    return
  }
  const hh24 = to24h(h12, ampm)
  const mm = String(min).padStart(2, '0')
  let final = `${date} ${hh24}:${mm}`
  if (props.outputPrecision === 'seconds') {
    final = `${final}:00`
  }
  emit('update:modelValue', final)
  emit('change', final)
}

function clearValue() {
  emit('update:modelValue', '')
  emit('change', '')
}

function to12h(time24) {
  const [hStr] = time24.split(':')
  let h = Number(hStr)
  let ampm = 'AM'
  if (h === 0) {
    h = 12
  } else if (h === 12) {
    ampm = 'PM'
  } else if (h > 12) {
    h = h - 12
    ampm = 'PM'
  }
  return { hour: h || 12, ampm }
}

function to24h(h12, ampm) {
  let h = Number(h12)
  if (ampm === 'AM') {
    if (h === 12) h = 0
  } else {
    if (h < 12) h = h + 12
  }
  return String(h).padStart(2, '0')
}
</script>

<style scoped>
.dt12 {
  display: flex;
  gap: 0.25rem; /* Espacio reducido entre elementos */
  align-items: center;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem; /* Radio estándar (aprox 6px) */
  padding: 3px; /* Padding muy ajustado para que el total no crezca */
  position: relative;
  width: 100%;
  min-width: 410px;
  max-width: 480px;
  box-sizing: border-box;
  transition: all 0.2s ease;
  height: 38px; /* Altura forzada estándar de un input */
}

.dt12:hover:not(.dt12--error) {
  border-color: #9ca3af;
}

.dt12:focus-within {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.dt12__date-wrapper {
  flex: 1;
  min-width: 120px;
  height: 100%; /* Ocupar toda la altura disponible */
  display: flex; /* Para centrar el input interno */
  align-items: center;
}

.dt12__input {
  border: 1px solid transparent; /* Quitar borde visible por defecto o hacerlo sutil */
  background: #f9fafb;
  border-radius: 0.25rem;
  padding: 0 0.5rem; /* Padding horizontal solamente */
  font-size: 0.875rem;
  line-height: 1; 
  height: 30px; /* Altura reducida para que quepa dentro de los 38px del padre */
  transition: all 0.2s ease;
  outline: none;
}

/* Hover suave en los inputs internos para que se note que son editables */
.dt12__input:hover:not(:disabled) {
  background: #f3f4f6;
}

.dt12__input:focus {
  background: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
}

.dt12__input:disabled {
  background: transparent;
  color: #9ca3af;
  cursor: not-allowed;
}

.dt12__input--date {
  width: 100%;
  background: transparent; /* Que parezca parte del contenedor principal */
}
/* Al hacer focus en la fecha, darle un background sutil */
.dt12__input--date:focus {
    background: #fff;
}

.dt12__input--hour,
.dt12__input--minute {
  width: 50px; /* Más estrecho */
  text-align: center;
  font-weight: 500;
  appearance: none; /* Aspecto más limpio en navegadores */
  -webkit-appearance: none;
}

.dt12__input--ampm {
  width: 50px;
  text-align: center;
  font-weight: 500;
  color: #6b7280;
  font-size: 0.8125rem;
  appearance: none;
  -webkit-appearance: none;
}

/* Botón Limpiar */
.dt12__clear {
  width: 24px; 
  height: 24px; 
  border: none;
  border-radius: 50%; /* Redondo se ve más moderno en espacios pequeños */
  background: #ef4444;
  cursor: pointer;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.1rem;
  margin-right: 0.25rem;
}

.dt12__clear:hover {
  background: #dc2626;
  transform: scale(1.1);
}

/* Estados del contenedor principal */
.dt12--error {
  border-color: #ef4444;
  background: #fff5f5;
}

.dt12--success {
  border-color: #10b981;
  background: #f0fdf4;
}

/* Estilos de FlatPickr profundos */
:deep(.flatpickr-input) {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  height: 100% !important; /* Llenar el wrapper */
  width: 100%;
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
  box-shadow: none !important;
  line-height: 30px; /* Centrado vertical */
}

:deep(.flatpickr-input:focus) {
  outline: none !important;
}

/* Responsive */
@media (max-width: 575.98px) {
  .dt12 {
    flex-wrap: wrap;
    height: auto; /* Permitir crecer en móvil */
    padding: 0.5rem;
  }
  
  .dt12__date-wrapper {
    flex: 1 1 100%;
    margin-bottom: 0.5rem;
  }
  
  .dt12__input {
      height: 36px; /* En móvil un poco más alto para el dedo */
  }
  
  .dt12__input--hour,
  .dt12__input--minute,
  .dt12__input--ampm {
    flex: 1;
  }
}
</style>