<template>
  <div class="position-relative" ref="wrapperEl">
    <div
      class="form-control searchselect-control"
      :class="[{ 'is-locked': isLocked, 'is-disabled': isDisabled }, validationClass]"
      @mousedown.prevent="onControlMouseDown"
      :aria-disabled="isDisabled"
    >
      <span
        v-if="isLocked"
        class="ss-locked-label"
        :title="selectedList[0]?.label || ''"
      >
        {{ selectedList[0]?.label || '' }}
      </span>

      <input
        v-else
        autocomplete="off"
        type="text"
        class="searchselect-input"
        :placeholder="placeholder"
        v-model="searchText"
        :disabled="isLocked || isDisabled"
        @focus="openDropdown"
        @input="onInputChange"
        :aria-invalid="required && !isLocked && !isDisabled"
      />

      <span
        v-if="showSpinner"
        class="spinner searchselect-affordance"
        aria-hidden="true"
      ></span>

      <button
        v-if="isLocked && !isDisabled"
        type="button"
        class="btn-clear searchselect-affordance"
        @click.stop="clearSelection"
        aria-label="Borrar selección"
        title="Borrar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      <span
        v-else-if="!showSpinner && !isDisabled"
        class="dropdown-arrow searchselect-affordance"
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </span>
    </div>

    <Teleport to="body">
      <div
        v-if="dropdownOpen && !isLocked && !isDisabled"
        ref="dropdownEl"
        class="searchselect-dropdown"
        :class="validationClass"
        :style="dropdownStyle"
        role="listbox"
      >
        <div
          v-if="isRemote && searchTextTrim.length < minChars"
          class="dropdown-message"
        >
          Escribe al menos {{ minChars }} caracteres…
        </div>

        <div
          v-else-if="isRemote && loading"
          class="dropdown-message"
        >
          <span class="spinner"></span>
          Cargando…
        </div>

        <div
          v-else-if="listItems.length === 0"
          class="dropdown-message dropdown-message--empty"
        >
          No se encontraron resultados
        </div>

        <button
          v-if="!loading"
          v-for="opt in listItems"
          :key="opt[valueField]"
          type="button"
          class="dropdown-item"
          @click="selectOption(opt)"
          role="option"
        >
          <div class="dropdown-item__label">
            {{ opt[labelField] }}
          </div>
          <div
            v-if="showSubValue"
            class="dropdown-item__sublabel"
          >
            {{ opt[sublabelField] ? opt[sublabelField] : opt[valueField] }}
          </div>
        </button>
      </div>
    </Teleport>

    <div
      v-if="hint"
      class="form-text"
    >
      {{ hint }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  labelField: { type: String, required: true },
  valueField: { type: String, required: true },
  sublabelField: { type: String, required: false },
  modelValue: { default: null },
  placeholder: { type: String, default: 'Seleccionar / Buscar...' },
  hint: { type: String, default: '' },
  showSubValue: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  viewOpen: { type: Number, default: 3 },
  mode: { type: String, default: 'local' },
  fetcher: { type: Function, default: null },
  debounceMs: { type: Number, default: 300 },
  minChars: { type: Number, default: 2 },
  cache: { type: Boolean, default: true },
  cacheNs: { type: [String, Number], default: '' },
  modelLabel: { type: String, default: '' },
  modelLabelMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change', 'search'])

const dropdownOpen = ref(false)
const searchText = ref('')
const wrapperEl = ref(null)
const dropdownEl = ref(null)
const dropdownStyle = ref({})

const isRemote = computed(() => props.mode === 'remote')
const isDisabled = computed(() => !!props.disabled)
const searchTextTrim = computed(() => (searchText.value || '').trim())

const loading = ref(false)
const remoteItems = ref([])
const cacheMap = ref(new Map())
let debounceTimer = null
let requestId = 0

const safeItems = computed(() =>
  Array.isArray(props.items) ? props.items : []
)
const selectedList = ref([])

const isLocked = computed(
  () =>
    props.modelValue !== null &&
    props.modelValue !== undefined &&
    props.modelValue !== ''
)

const validationClass = computed(() => {
  if (!props.required || props.disabled) return ''
  return isLocked.value ? 'has-success' : 'has-error'
})

const showSpinner = computed(
  () =>
    isRemote.value &&
    loading.value &&
    !isLocked.value &&
    !isDisabled.value
)

const listItems = computed(() => {
  if (!dropdownOpen.value || isDisabled.value) return []

  const base = isRemote.value ? remoteItems.value : safeItems.value

  if (!isRemote.value) {
    const t = searchTextTrim.value.toLowerCase()
    if (!t) return base
    return base.filter(item =>
      String(item[props.labelField] ?? '')
        .toLowerCase()
        .includes(t)
    )
  }

  return base
})

function updateDropdownPosition () {
  if (!wrapperEl.value) return

  const rect = wrapperEl.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight

  const itemHeightPx = 42
  const calculatedMaxHeight = props.viewOpen * itemHeightPx
  const spaceBelow = viewportHeight - rect.bottom
  const shouldFlip = spaceBelow < calculatedMaxHeight

  const commonStyles = {
    position: 'fixed',
    left: rect.left + 'px',
    width: rect.width + 'px',
    zIndex: 999999,
    maxHeight: `${calculatedMaxHeight}px`,
    overflowY: 'auto'
  }

  if (shouldFlip) {
    dropdownStyle.value = {
      ...commonStyles,
      top: 'auto',
      bottom: (viewportHeight - rect.top) + 4 + 'px',
      transformOrigin: 'bottom center'
    }
  } else {
    dropdownStyle.value = {
      ...commonStyles,
      top: rect.bottom + 4 + 'px',
      bottom: 'auto',
      transformOrigin: 'top center'
    }
  }
}

function handleWindowScrollOrResize () {
  if (!dropdownOpen.value) return
  updateDropdownPosition()
}

watch(
  () => props.modelValue,
  val => {
    const toTag = o => ({
      value: o?.[props.valueField],
      label: o?.[props.labelField],
      raw: o
    })

    if (val === null || val === undefined || val === '') {
      selectedList.value = []
      searchText.value = ''
      return
    }

    const source = isRemote.value
      ? remoteItems.value.concat(safeItems.value)
      : safeItems.value

    const match = source.find(o => o?.[props.valueField] === val)

    if (match) {
      selectedList.value = [toTag(match)]
      searchText.value = selectedList.value[0]?.label ?? ''
    } else {
      const lbl = props.modelLabel || String(val)
      selectedList.value = [{ value: val, label: lbl, raw: null }]
      searchText.value = lbl
    }
  },
  { immediate: true }
)

function handleClickOutside (e) {
  if (!wrapperEl.value) return
  if (wrapperEl.value.contains(e.target)) return
  if (dropdownEl.value && dropdownEl.value.contains(e.target)) return
  dropdownOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleWindowScrollOrResize, true)
  window.addEventListener('resize', handleWindowScrollOrResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleWindowScrollOrResize, true)
  window.removeEventListener('resize', handleWindowScrollOrResize)
})

function openDropdown () {
  if (isDisabled.value) return
  if (isLocked.value) return

  dropdownOpen.value = true

  nextTick(() => {
    updateDropdownPosition()
    if (isRemote.value) queueRemoteSearch()
  })
}

function onControlMouseDown (e) {
  if (isDisabled.value) {
    e.preventDefault()
    return
  }

  if (isLocked.value) {
    e.preventDefault()
    return
  }

  e.preventDefault()
  nextTick(() => {
    wrapperEl.value
      ?.querySelector('.searchselect-input')
      ?.focus()
    dropdownOpen.value = true
    updateDropdownPosition()
  })
}

function onInputChange () {
  if (isDisabled.value) return
  if (isLocked.value) return

  dropdownOpen.value = true
  updateDropdownPosition()
  if (isRemote.value) queueRemoteSearch()
}

function queueRemoteSearch () {
  const q = searchTextTrim.value
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => doRemoteSearch(q), props.debounceMs)
}

async function doRemoteSearch (q) {
  if (!props.fetcher || q.length < props.minChars || isDisabled.value) {
    remoteItems.value = []
    loading.value = false
    return
  }

  emit('search', q)

  const key = `${props.cacheNs}::${q}`
  if (props.cache && cacheMap.value.has(key)) {
    remoteItems.value = cacheMap.value.get(key) || []
    return
  }

  const myReq = ++requestId
  loading.value = true

  try {
    const res = await props.fetcher(q)
    if (myReq !== requestId) return

    const arr = Array.isArray(res) ? res : []
    remoteItems.value = arr
    if (props.cache) cacheMap.value.set(key, arr)
  } catch (e) {
    console.error('SearchSelect fetcher error:', e)
    remoteItems.value = []
  } finally {
    if (myReq === requestId) loading.value = false
  }
}

function selectOption (option) {
  if (isDisabled.value) return

  const tag = {
    value: option[props.valueField],
    label: option[props.labelField],
    raw: option
  }

  selectedList.value = [tag]
  searchText.value = tag.label
  emit('update:modelValue', tag.value)
  emit('change', option)
  dropdownOpen.value = false
}

function clearSelection () {
  if (isDisabled.value) return
  selectedList.value = []
  emit('update:modelValue', null)
  emit('change', null)
  searchText.value = ''
  dropdownOpen.value = false

  nextTick(() => {
    wrapperEl.value
      ?.querySelector('.searchselect-input')
      ?.focus()
  })
}
</script>

<style scoped>
.searchselect-control {
  position: relative;
  padding: 0.5rem 2.75rem 0.5rem 0.875rem;
  display: flex;
  align-items: center;
  min-height: 42px;
  background-color: #ffffff;
  border: 1.5px solid #d1d5db; /* ✅ Mantener esto */
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.searchselect-control:hover:not(.is-disabled):not(.is-locked) {
  border-color: #9ca3af;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.searchselect-control:focus-within:not(.is-disabled) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  outline: none;
}

.searchselect-control.is-disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.searchselect-control.is-locked {
  cursor: default;
  background-color: #fafafa;
}

.ss-locked-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9375rem;
  color: #1f2937;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.searchselect-input {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 0.9375rem;
  color: #1f2937;
  outline: none;
  box-shadow: none;
}

.searchselect-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.searchselect-input[disabled] {
  background-color: transparent;
  color: #9ca3af;
  cursor: not-allowed;
}

.searchselect-affordance {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-arrow {
  color: #6b7280;
  pointer-events: none;
  transition: transform 0.2s ease;
}

.searchselect-control:focus-within .dropdown-arrow {
  transform: translateY(-50%) rotate(180deg);
}

.btn-clear {
  border: 0;
  background: transparent;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-clear:hover {
  background-color: #f3f4f6;
  color: #dc2626;
}

.searchselect-dropdown {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.dropdown-message {
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.dropdown-message--empty {
  color: #9ca3af;
  font-style: italic;
}

.dropdown-item {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1.25rem;
  border: 0;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 1px solid #f3f4f6;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #f9fafb;
}

.dropdown-item:active {
  background-color: #f3f4f6;
}

.dropdown-item__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.4;
}

.dropdown-item__sublabel {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  line-height: 1.3;
}
/* ✅ AÑADIR - Barra lateral para validación */
.has-error.searchselect-control {
  border-color: #e5e7eb;
  border-left-width: 3px;
  border-left-color: #f87171;
  transition: all 0.15s ease;
}

.has-error.searchselect-control:focus-within {
  border-color: #fecaca;
  border-left-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08);
}

.has-success.searchselect-control {
  border-color: #e5e7eb;
  border-left-width: 3px;
  border-left-color: #34d399;
  transition: all 0.15s ease;
}

.has-success.searchselect-control:focus-within {
  border-color: #d1fae5;
  border-left-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}

/* Dropdown con bordes sutiles */
.has-error.searchselect-dropdown {
  border-color: #fecaca;
}

.has-success.searchselect-dropdown {
  border-color: #d1fae5;
}

.form-text {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
