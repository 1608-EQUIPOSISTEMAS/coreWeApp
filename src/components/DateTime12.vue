<template>
  <div class="dt12" :class="stateClass">
    <!-- fecha -->
    <input
      type="date"
      class="dt12__input"
      v-model="datePart"
      @change="emitChange"
      :required="required"
      :disabled="disabled"
    />

    <!-- hora 1-12 -->
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

    <!-- am/pm -->
    <select
      class="dt12__input dt12__input--ampm"
      v-model="ampmPart"
      @change="emitChange"
      :disabled="disabled"
    >
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>

    <!-- limpiar -->
    <button
      v-if="clearable && hasValue && !disabled"
      type="button"
      class="dt12__clear"
      @click="clearValue"
    >
      ×
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  required: { type: Boolean, default: false },
  outputPrecision: { type: String, default: 'seconds' },
  clearable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const hours12 = Array.from({ length: 12 }, (_, i) => i + 1)

function normalize(v) {
  return (v || '').trim().replace('T', ' ')
}

const datePart = computed({
  get() {
    const norm = normalize(props.modelValue)
    if (!norm) return ''
    const [d] = norm.split(' ')
    // valida que realmente sea YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''
  },
  set(val) { emitFull(val, hour12.value, ampmPart.value) },
})

const hour12 = computed({
  get() {
    const norm = normalize(props.modelValue)
    if (!norm) return 12
    const parts = norm.split(' ')
    if (parts.length < 2) return 12
    const time24 = parts[1].slice(0, 5) // "HH:mm"
    return to12h(time24).hour
  },
  set(val) { emitFull(datePart.value, val, ampmPart.value) },
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
  set(val) { emitFull(datePart.value, hour12.value, val) },
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
  emitFull(datePart.value, hour12.value, ampmPart.value)
}

function emitFull(date, h12, ampm) {
  if (!date) {
    emit('update:modelValue', '')
    emit('change', '')
    return
  }
  const hh24 = to24h(h12, ampm)
  let final = `${date} ${hh24}:00`
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
  gap: .4rem;
  align-items: center;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: .75rem;
  padding: .4rem .6rem;
  position: relative;
  width: 100%;
  max-width: 360px; /* lo puedes quitar si quieres que se estire */
  box-sizing: border-box;
}

.dt12__input {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: .5rem;
  padding: .3rem .5rem;
  font-size: .78rem;
  height: 32px;
}

.dt12__input--hour {
  width: 70px;
  text-align: center;
}

.dt12__input--ampm {
  width: 72px;
}

/* botón limpiar */
.dt12__clear {
  position: absolute;
  top: .25rem;
  right: .25rem;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: rgba(0,0,0,.03);
  cursor: pointer;
  color: #6b7280;
  font-size: .85rem;
  line-height: 22px;
  text-align: center;
}

/* estados */
.dt12--error {
  border-color: #fca5a5;
  box-shadow: 0 0 0 .15rem rgba(248,113,113,.08);
}
.dt12--success {
  border-color: #bbf7d0;
  box-shadow: 0 0 0 .15rem rgba(34,197,94,.08);
}
.dt12--neutral {
  /* nada */
}

/* responsive */
@media (max-width: 575.98px) {
  .dt12 {
    flex-wrap: wrap;
    max-width: 100%;
  }
  .dt12__input {
    flex: 1 1 calc(50% - .4rem);
  }
  .dt12__input--hour,
  .dt12__input--ampm {
    flex: 1 1 calc(50% - .4rem);
    width: auto;
  }
}
</style>
