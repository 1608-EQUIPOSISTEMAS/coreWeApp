<!-- CurrencyInput.vue -->
<template>
  <div class="cur-wrap" :class="{ disabled }">
    <span
      v-if="position === 'prefix'"
      class="cur-adornment prefix"
      :title="currency?.code || currency?.abbreviation"
    >
      {{ symbol }}
    </span>

    <input
      :id="id"
      :name="name"
      ref="inputRef"
      class="form-control cur-input"
      :class="inputClass"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      inputmode="decimal"
      autocomplete="off"
      :style="inputStyle"
      :value="displayValue"
      @input="onInput"
      @blur="onBlur"
      @focus="onFocus"
    />

    <span
      v-if="position === 'suffix'"
      class="cur-adornment suffix"
      :title="currency?.code || currency?.abbreviation"
    >
      {{ symbol }}
    </span>
  </div>
</template>

<script setup>
import { computed, ref, watch, toRaw } from 'vue'

const props = defineProps({
  modelValue:   { type: [Number, String, null], default: null }, // minor si storeAsMinor=true
  currency:     { type: Object, required: true }, // { code/symbol/minorUnit/locale/decimal/thousands/position/allow* }
  storeAsMinor: { type: Boolean, default: true }, // emite centavos (int)
  softMinorTyping: { type: Boolean, default: true }, // 1->0.01->0.12->1.25 (solo con storeAsMinor)

  // Límites (en MINOR si storeAsMinor=true, en MAYOR si false)
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },

  allowNegative: { type: Boolean, default: undefined },
  allowZero:     { type: Boolean, default: undefined },

  /** Si es true y el campo es required, 0 cuenta como vacío (mantiene :invalid) */
  zeroCountsAsEmpty: { type: Boolean, default: false },

  placeholder: String,
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  name: String,
  id: String,
  inputClass: String,

  formatOn: { type: String, default: 'blur' }, // 'blur' | 'input' | 'never'
  useIntl:  { type: Boolean, default: true },  // usar Intl para separadores
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'change', 'input'])
const inputRef = ref(null)

const cur = computed(() => {
  const c = toRaw(props.currency) || {}
  return {
    code: c.code || c.abbreviation || 'PEN',
    symbol: c.symbol || c.prefix || 'S/.',
    minorUnit: Number.isFinite(c.minorUnit) ? c.minorUnit : Number(c.precision ?? 2),
    locale: c.locale || 'es-PE',
    decimal: c.decimal || '.',
    thousands: c.thousands || ',',
    position: c.position || (c.suffix ? 'suffix' : 'prefix'),
    allowNegative: props.allowNegative ?? (c.allowNegative ?? false),
    allowZero:     props.allowZero     ?? (c.allowZero     ?? true),
  }
})

const symbol   = computed(() => cur.value.symbol)
const position = computed(() => cur.value.position)
const factor   = computed(() => Math.pow(10, Math.max(0, cur.value.minorUnit)))

const displayValue = ref('')

const inputStyle = computed(() => {
  const base = {}
  if (position.value === 'prefix') base.paddingLeft = '2.25rem'
  if (position.value === 'suffix') base.paddingRight = '2.25rem'
  base.textAlign = 'right'
  return base
})

// ---------- Helpers ----------
function clamp(n, min, max) {
  if (min != null && n < min) n = min
  if (max != null && n > max) n = max
  return n
}

function toMajorFromModel(modelVal) {
  if (modelVal == null || modelVal === '') return null
  const num = Number(modelVal)
  if (!Number.isFinite(num)) return null
  return props.storeAsMinor ? num / factor.value : num
}

function toModelFromMajor(majorVal) {
  if (majorVal == null || !Number.isFinite(majorVal)) return null
  return props.storeAsMinor
    ? Math.round(majorVal * factor.value)
    : Number(majorVal.toFixed(cur.value.minorUnit))
}

function parseTextToMajor(text) {
  if (text == null || text === '') return null
  const dec = cur.value.decimal
  const notDigits = new RegExp(`[^0-9${dec === '.' ? '\\.' : ','}-]`, 'g')
  let cleaned = String(text).replace(notDigits, '')

  let negative = false
  if (cleaned.startsWith('-')) {
    negative = true
    cleaned = cleaned.slice(1)
  }

  const parts = cleaned.split(dec)
  let intPart = (parts[0] || '').replace(/^0+(?=\d)/, '')
  let decPart = (parts[1] || '').slice(0, cur.value.minorUnit)

  const normalized = (intPart || '0') + (cur.value.minorUnit > 0 && decPart ? '.' + decPart : '')
  let num = Number(normalized)
  if (!Number.isFinite(num)) return null

  if (negative && cur.value.allowNegative) num = -num
  if (num === 0 && !cur.value.allowZero) num = 0.01

  const minMajor = props.min == null ? undefined : (props.storeAsMinor ? props.min / factor.value : props.min)
  const maxMajor = props.max == null ? undefined : (props.storeAsMinor ? props.max / factor.value : props.max)
  num = clamp(num, minMajor, maxMajor)

  return num
}

function parseMinorFromText(text) {
  if (text == null) return null
  const digitsOnly = String(text).replace(/\D/g, '')
  if (!digitsOnly) return null

  let minor = Number(digitsOnly)
  if (!Number.isFinite(minor)) return null

  if (cur.value.allowNegative && /-/.test(String(text))) minor = -minor

  if (props.min != null) minor = Math.max(minor, props.min)
  if (props.max != null) minor = Math.min(minor, props.max)

  return minor
}

function formatMajor(major) {
  if (major == null || !Number.isFinite(major)) return ''
  if (props.useIntl) {
    return major.toLocaleString(cur.value.locale, {
      minimumFractionDigits: cur.value.minorUnit,
      maximumFractionDigits: cur.value.minorUnit,
    })
  }
  const [i, d = ''] = major.toFixed(cur.value.minorUnit).split('.')
  const withGroup = i.replace(/\B(?=(\d{3})+(?!\d))/g, cur.value.thousands)
  return cur.value.minorUnit ? `${withGroup}${cur.value.decimal}${d}` : withGroup
}

function syncDisplayFromModel() {
  const major = toMajorFromModel(props.modelValue)
  displayValue.value = major == null ? '' : formatMajor(major)
}

// ---- Validación requerida personalizada (0 como vacío) ----
function updateValidity() {
  const el = inputRef.value
  if (!el) return

  let invalid = false
  if (props.required) {
    const isEmpty = props.modelValue == null || props.modelValue === ''
    if (isEmpty) {
      invalid = true
    } else if (props.zeroCountsAsEmpty) {
      const major = toMajorFromModel(props.modelValue)
      if (major === 0) invalid = true
    }
  }

  // setCustomValidity activa :invalid si hay un mensaje
  el.setCustomValidity(invalid ? 'Este campo es requerido' : '')
}

watch(() => props.modelValue, () => { syncDisplayFromModel(); updateValidity() }, { immediate: true })
watch(() => cur.value, () => { syncDisplayFromModel(); updateValidity() }, { deep: true })
watch(() => [props.required, props.zeroCountsAsEmpty], updateValidity, { immediate: true })

// ---------- Eventos ----------
function onInput(e) {
  const txt = e.target.value

  if (props.storeAsMinor && props.softMinorTyping) {
    const minor = parseMinorFromText(txt)      // "125" → 125 (centavos)
    const major = minor == null ? null : minor / factor.value
    emit('update:modelValue', minor)
    emit('input', minor)
    displayValue.value = major == null ? '' : formatMajor(major)
    updateValidity()
    return
  }

  const major = parseTextToMajor(txt)
  const modelOut = toModelFromMajor(major)
  emit('update:modelValue', modelOut)
  emit('input', modelOut)

  if (props.formatOn === 'input') {
    displayValue.value = major == null ? '' : formatMajor(major)
  } else {
    displayValue.value = txt
  }
  updateValidity()
}

function onBlur(e) {
  const major = toMajorFromModel(props.modelValue)
  displayValue.value = major == null ? '' : formatMajor(major)
  updateValidity()
  emit('blur', e)
  emit('change', props.modelValue)
}

function onFocus(e) {
  emit('focus', e)
}
</script>

<style scoped>
.cur-wrap {
  position: relative;
  display: inline-block;
  width: 100%;
}

.cur-input { text-align: right; }

/* Adornos */
.cur-adornment {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: .9rem;
  pointer-events: none;
  user-select: none;
}
.cur-adornment.prefix { left: .6rem; }
.cur-adornment.suffix { right: .6rem; }

.disabled .cur-adornment { opacity: .5; }

/* Validación por required: rojo/verde */
.cur-input:required:invalid:not(:disabled):not([readonly]) {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 .2rem rgba(239,68,68,.15);
}
.cur-input:required:valid:not(:disabled):not([readonly]) {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 .2rem rgba(16,185,129,.15);
}
</style>
