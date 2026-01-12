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
const minutes = [0,10,20,30,40,50,59]

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
/* Contenedor Principal */
.dt12 {
  display: flex;
  flex-wrap: nowrap; /* IMPORTANTE: Evita que salten de línea */
  gap: 2px; /* Gap mínimo para maximizar espacio */
  align-items: center;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 2px 4px; /* Padding reducido */
  position: relative;
  width: 100%; /* Ocupa el 100% del padre */
  /* min-width eliminado para evitar desbordes */
  box-sizing: border-box;
  transition: all 0.2s ease;
  height: 38px;
}

.dt12:hover:not(.dt12--error) {
  border-color: #9ca3af;
}

.dt12:focus-within {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Wrapper de la Fecha (Flexible) */
.dt12__date-wrapper {
  flex: 1 1 auto; /* Crece y se encoge */
  min-width: 80px; /* Mínimo aceptable para ver la fecha */
  height: 100%;
  display: flex;
  align-items: center;
}

/* Inputs Internos Comunes */
.dt12__input {
  border: 1px solid transparent;
  background: #f9fafb;
  border-radius: 0.25rem;
  padding: 0 2px; /* Padding interno mínimo */
  font-size: 0.8rem; /* Fuente un pelín más pequeña para que quepa */
  line-height: 1;
  height: 28px; /* Altura interna */
  transition: all 0.2s ease;
  outline: none;
}

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

/* Input Fecha */
.dt12__input--date {
  width: 100%;
  background: transparent;
}
.dt12__input--date:focus {
  background: #fff;
}

/* Selectores de Hora (Ancho Fijo Compacto) */
.dt12__input--hour,
.dt12__input--minute {
  width: 42px; /* Ancho fijo reducido */
  text-align: center;
  font-weight: 500;
  flex-shrink: 0; /* No encogerse más de esto */
  appearance: none;
  -webkit-appearance: none;
  /* Hack para centrar texto en select en algunos navegadores */
  text-align-last: center;
}

/* Selector AM/PM */
.dt12__input--ampm {
  width: 40px;
  text-align: center;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  text-align-last: center;
}

/* Botón Limpiar */
.dt12__clear {
  width: 20px; /* Más pequeño */
  height: 20px;
  border: none;
  border-radius: 50%;
  background: #ef4444;
  cursor: pointer;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 2px;
}

.dt12__clear:hover {
  background: #dc2626;
}

.dt12__clear svg {
  width: 12px;
  height: 12px;
}

/* Estados */
.dt12--error {
  border-color: #ef4444;
  background: #fff5f5;
}

.dt12--success {
  border-color: #10b981;
  background: #f0fdf4;
}

/* Estilos FlatPickr */
:deep(.flatpickr-input) {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  height: 100% !important;
  width: 100%;
  font-size: 0.85rem;
  color: #111827;
  font-weight: 500;
  box-shadow: none !important;
  line-height: 28px;
}

:deep(.flatpickr-input:focus) {
  outline: none !important;
}

/* Ajustes Responsive extremos (opcional) */
/* Si la pantalla es muy pequeña, forzar wrap */
@media (max-width: 400px) {
  .dt12 {
    flex-wrap: wrap;
    height: auto;
    padding: 4px;
  }
  .dt12__date-wrapper {
    flex: 1 1 100%; /* Fecha ocupa toda la fila arriba */
    margin-bottom: 4px;
  }
  .dt12__input--hour,
  .dt12__input--minute,
  .dt12__input--ampm {
    flex: 1; /* Horas se distribuyen abajo */
  }
}
</style>
