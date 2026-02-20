<template>
  <div class="dt12" :class="[stateClass, { 'is-disabled': disabled }]">
    <div class="dt12__date-wrapper">
      <flat-pickr
        v-model="datePart"
        :config="flatpickrConfig"
        class="dt12__input dt12__input--date"
        :disabled="disabled"
        placeholder="Selecciona fecha..."
      />
    </div>
    
    <select
      class="dt12__input dt12__input--hour"
      v-model.number="hour12"
      @change="emitChange"
      :required="required"
      :disabled="disabled"
      title="Hora"
    >
      <option v-for="h in hours12" :key="h" :value="h">
        {{ h }}
      </option>
    </select>

    <span class="dt12__separator">:</span>

    <select
      v-if="!onlyHours"
      class="dt12__input dt12__input--minute"
      v-model.number="minutePart"
      @change="emitChange"
      :disabled="disabled"
      title="Minutos"
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
      title="AM / PM"
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
      aria-label="Limpiar fecha y hora"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   DISEÑO ESTÁNDAR "EXEC" PARA DATE-TIME PICKER
═══════════════════════════════════════════════ */

/* Contenedor Principal */
.dt12 {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  background-color: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px; /* Estándar Exec */
  padding: 2px 6px;
  min-height: 38px; /* Coincide con .exec-input-light */
  width: 100%;
  box-sizing: border-box;
  transition: all 0.15s ease;
  position: relative;
}

.dt12:hover:not(.dt12--error):not(.is-disabled) {
  border-color: var(--slate-300, #cbd5e1);
}

.dt12:focus-within:not(.is-disabled) {
  outline: none;
  border-color: var(--teal-500, #12274e);
  box-shadow: 0 0 0 3px rgba(18, 39, 78, 0.1);
}

/* Estados Globales */
.dt12.is-disabled {
  background-color: var(--slate-50, #f8fafc);
  border-color: var(--border, #e2e8f0);
  cursor: not-allowed;
}

.dt12--error {
  border-color: var(--red-600, #dc2626) !important;
}

.dt12--error:focus-within {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15) !important;
}

/* Wrapper de la Fecha */
.dt12__date-wrapper {
  flex: 1 1 auto;
  min-width: 80px;
  height: 100%;
  display: flex;
  align-items: center;
}

/* Separador visual de hora y minutos */
.dt12__separator {
  color: var(--slate-400, #94a3b8);
  font-weight: 600;
  margin: 0 1px;
  user-select: none;
}

/* Inputs Internos Comunes */
.dt12__input {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 3px;
  font-family: inherit;
  font-size: 13px; /* Estándar Exec */
  color: var(--text-primary, #0f172a);
  line-height: 1;
  height: 28px;
  transition: all 0.15s ease;
  outline: none;
  cursor: pointer;
}

.dt12__input:hover:not(:disabled):not(.dt12__input--date) {
  background-color: var(--slate-50, #f8fafc);
}

.dt12__input:focus:not(:disabled):not(.dt12__input--date) {
  background-color: var(--slate-100, #f1f5f9);
  color: var(--teal-600, #12274e);
}

.dt12__input:disabled {
  color: var(--slate-400, #94a3b8);
  cursor: not-allowed;
}

/* Selectores de Tiempo */
.dt12__input--hour,
.dt12__input--minute {
  width: 38px;
  text-align: center;
  font-weight: 500;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  text-align-last: center;
  padding: 0;
}

.dt12__input--ampm {
  width: 40px;
  text-align: center;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  text-align-last: center;
  padding: 0;
  margin-left: 2px;
}

/* Botón Limpiar (Estilo SearchSelect) */
.dt12__clear {
  width: 22px;
  height: 22px;
  border: 0;
  background: transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--slate-400, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  margin-left: 4px;
  padding: 0;
}

.dt12__clear:hover {
  background-color: var(--slate-100, #f1f5f9);
  color: var(--red-600, #dc2626);
}

/* ═══════════════════════════════════════════════
   FLATPICKR OVERRIDES (Asegura integración)
═══════════════════════════════════════════════ */
:deep(.flatpickr-input) {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  height: 100% !important;
  width: 100%;
  font-size: 13px !important;
  font-family: inherit;
  color: var(--text-primary, #0f172a) !important;
  font-weight: 400;
  box-shadow: none !important;
  cursor: pointer;
}

:deep(.flatpickr-input::placeholder) {
  color: var(--slate-400, #94a3b8) !important;
}

:deep(.flatpickr-input:disabled) {
  color: var(--slate-400, #94a3b8) !important;
  cursor: not-allowed !important;
}

:deep(.flatpickr-input:focus) {
  outline: none !important;
}

/* Responsive para pantallas muy pequeñas */
@media (max-width: 400px) {
  .dt12 {
    flex-wrap: wrap;
    height: auto;
    padding: 6px;
  }
  .dt12__date-wrapper {
    flex: 1 1 100%;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--slate-100, #f1f5f9);
    padding-bottom: 4px;
  }
  .dt12__input--hour,
  .dt12__input--minute,
  .dt12__input--ampm {
    flex: 1;
  }
}
</style>
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
  onlyHours: { type: Boolean, default: false },
  config: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'change'])

const hours12 = Array.from({ length: 12 }, (_, i) => i + 1)
const minutes = [0,10,20,30,40,50,59]

// Configuración de FlatPickr
const flatpickrConfig = computed(() => {
  return {
    altInput: true,
    altFormat: "d/m/Y",
    dateFormat: "Y-m-d",
    locale: Spanish,
    allowInput: true,
    disableMobile: true,
    ...props.config, // Aquí fusionamos lo que venga de afuera (como el minDate)
    // Mantenemos el onChange crítico para que funcione el componente
    onChange: (selectedDates, dateStr) => {
      emitChange()
    }
  }
})

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
    // Si solo aceptamos horas, forzamos visualmente y lógicamente el 0
    if (props.onlyHours) return 0

    const norm = normalize(props.modelValue)
    if (!norm) return 0
    const parts = norm.split(' ')
    if (parts.length < 2) return 0
    const time = parts[1].split(':')
    return time.length >= 2 ? Number(time[1]) : 0
  },
  set(val) {
    // Si solo aceptamos horas, ignoramos el valor entrante y usamos 0
    const finalMin = props.onlyHours ? 0 : val
    emitFull(datePart.value, hour12.value, finalMin, ampmPart.value)
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
