<template>
  <div class="position-relative" ref="wrapperEl">
    <div
      class="form-control d-flex align-items-center position-relative searchselect-control"
      :class="[{ 'is-locked': isLocked, 'is-disabled': isDisabled }, validationClass]"
      style="cursor: text; min-height: 2.5rem;"
      @mousedown.prevent="onControlMouseDown"
      :aria-disabled="isDisabled"
    >
      <template v-if="isMultiple && selectedList.length">
        <span
          v-for="tag in selectedList"
          :key="tag.value"
          class="ss-chip"
          :title="String(tag.label)"
        >
          <span class="ss-chip__label">{{ tag.label }}</span>
          <button
            type="button"
            class="ss-chip__x"
            @click.stop="removeChip(tag.value)"
          >
            ×
          </button>
        </span>
      </template>

      <span
        v-if="isLocked && !isMultiple"
        class="ss-locked-label"
        :title="selectedList[0]?.label || ''"
      >
        {{ selectedList[0]?.label || '' }}
      </span>

      <input
        v-else
        autocomplete="off"
        type="text"
        class="border-0 flex-grow-1 p-0 bg-transparent searchselect-input"
        :placeholder="placeholder"
        v-model="searchText"
        :disabled="(isLocked && !isMultiple) || isDisabled"
        @focus="openDropdown"
        @input="onInputChange"
        :aria-invalid="required && !isLocked && !isDisabled"
        style="outline: none; box-shadow: none; min-width: 4ch;"
      />

      <span
        v-if="showSpinner"
        class="spinner searchselect-affordance"
        aria-hidden="true"
      ></span>

      <button
        v-if="!isMultiple && isLocked && !isDisabled"
        type="button"
        class="btn-clear searchselect-affordance"
        @click.stop="clearSelection"
        aria-label="Borrar selección"
        title="Borrar"
      >
        ×
      </button>

      <button
        v-if="isMultiple && selectedList.length && !isDisabled"
        type="button"
        class="btn-clear-all searchselect-affordance"
        @click.stop="clearAll"
        aria-label="Borrar todas"
        title="Borrar todas"
      >
        ×
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="dropdownOpen && (!isLocked || isMultiple) && !isDisabled"
        ref="dropdownEl"
        class="searchselect-dropdown bg-white border rounded shadow-sm"
        :class="validationClass"
        :style="dropdownStyle"
        role="listbox"
      >
        <div
          v-if="isRemote && searchTextTrim.length < minChars"
          class="px-3 py-2 text-muted small"
        >
          Escribe al menos {{ minChars }} caracteres…
        </div>

        <div
          v-else-if="isRemote && loading"
          class="px-3 py-2 small d-flex align-items-center gap-2"
        >
          <span class="spinner"></span>
          Cargando…
        </div>

        <div
          v-else-if="listItems.length === 0"
          class="px-3 py-2 text-muted small"
        >
          No se encontraron resultados
        </div>

        <button
          v-if="!loading"
          v-for="opt in listItems"
          :key="opt[valueField]"
          type="button"
          class="w-100 text-start px-3 py-2 dropdown-item-option"
          @click="selectOption(opt)"
          role="option"
        >
          <div class="fw-semibold" style="font-size: .8rem;">
            {{ opt[labelField] }}
          </div>
          <div
            v-if="showSubValue"
            class="text-muted"
            style="font-size: .7rem;"
          >
            {{ opt[sublabelField]? opt[sublabelField]: opt[valueField] }}
          </div>
        </button>
      </div>
    </Teleport>

    <div
      v-if="hint"
      class="form-text text-muted"
      style="font-size: .75rem;"
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
  multiple: { type: Boolean, default: false },

  // Límite de items visibles (NUEVO)
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

const isMultiple = computed(() => !!props.multiple)
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
    !isMultiple.value &&
    props.modelValue !== null &&
    props.modelValue !== undefined &&
    props.modelValue !== ''
)

const validationClass = computed(() => {
  if (!props.required || props.disabled) return ''
  if (isMultiple.value)
    return selectedList.value.length > 0 ? 'has-success' : 'has-error'
  return isLocked.value ? 'has-success' : 'has-error'
})

const showSpinner = computed(
  () =>
    isRemote.value &&
    loading.value &&
    (!isLocked.value || isMultiple.value) &&
    !isDisabled.value
)

const listItems = computed(() => {
  if (!dropdownOpen.value || isDisabled.value) return []

  const base = isRemote.value ? remoteItems.value : safeItems.value
  const filtered = isMultiple.value
    ? base.filter(
        i => !selectedList.value.some(s => s.value === i[props.valueField])
      )
    : base

  if (!isRemote.value) {
    const t = searchTextTrim.value.toLowerCase()
    if (!t) return filtered
    return filtered.filter(item =>
      String(item[props.labelField] ?? '')
        .toLowerCase()
        .includes(t)
    )
  }

  return filtered
})

function updateDropdownPosition () {
  if (!wrapperEl.value) return
  
  const rect = wrapperEl.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  
  // 1. Calculamos la altura máxima esperada
  const itemHeightPx = 42
  const calculatedMaxHeight = props.viewOpen * itemHeightPx

  // 2. Calculamos el espacio disponible abajo
  const spaceBelow = viewportHeight - rect.bottom
  
  // 3. Decidimos si voltear: Si el espacio abajo es menor a la altura deseada 
  //    Y hay más espacio arriba que abajo (o simplemente no cabe abajo)
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
    // === MODO HACIA ARRIBA ===
    // Anclamos la parte inferior del dropdown a la parte superior del input
    // "bottom" se calcula restando la posición top del input a la altura de la ventana
    dropdownStyle.value = {
      ...commonStyles,
      top: 'auto', 
      bottom: (viewportHeight - rect.top) + 4 + 'px', // 4px de margen
      // Opcional: Cambiar sombra o bordes si quieres estilos distintos
      transformOrigin: 'bottom center'
    }
  } else {
    // === MODO HACIA ABAJO (Standard) ===
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

    if (isMultiple.value) {
      const values = Array.isArray(val) ? val : []
      const source = isRemote.value
        ? remoteItems.value.concat(safeItems.value)
        : safeItems.value

      selectedList.value = values.map(v => {
        const match = source.find(o => o?.[props.valueField] === v)
        if (match) return toTag(match)
        const lbl = props.modelLabelMap?.[v] ?? String(v)
        return { value: v, label: lbl, raw: null }
      })
      searchText.value = ''
    } else {
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
  if (isLocked.value && !isMultiple.value) return

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

  if (isLocked.value && !isMultiple.value) {
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
  if (isLocked.value && !isMultiple.value) return

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

  if (isMultiple.value) {
    if (!selectedList.value.some(s => s.value === tag.value)) {
      const next = [...selectedList.value, tag]
      selectedList.value = next
      emit('update:modelValue', next.map(s => s.value))
      emit('change', { type: 'add', option })
    }
    searchText.value = ''
    if (isRemote.value) queueRemoteSearch()
    dropdownOpen.value = true
    nextTick(updateDropdownPosition)
  } else {
    selectedList.value = [tag]
    searchText.value = tag.label
    emit('update:modelValue', tag.value)
    emit('change', option)
    dropdownOpen.value = false
  }
}

function removeChip (value) {
  if (!isMultiple.value || isDisabled.value) return
  const next = selectedList.value.filter(s => s.value !== value)
  selectedList.value = next
  emit('update:modelValue', next.map(s => s.value))
  emit('change', { type: 'remove', value })
}

function clearSelection () {
  if (isMultiple.value || isDisabled.value) return
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

function clearAll () {
  if (!isMultiple.value || isDisabled.value) return
  selectedList.value = []
  emit('update:modelValue', [])
  emit('change', { type: 'clear' })

  nextTick(() => {
    wrapperEl.value
      ?.querySelector('.searchselect-input')
      ?.focus()
  })
}
</script>

<style scoped>
/* (El CSS se mantiene igual, ya está correcto para lo que necesitas) */
.searchselect-control {
  position: relative;
  padding-right: 2.25rem; 
  overflow: hidden; 
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
}
.searchselect-control.is-disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed !important;
  pointer-events: none;
}
.ss-locked-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: .9rem;
  color: #111827;
  padding: .125rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ss-chip {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  max-width: 100%;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  border-radius: 999px;
  padding: .2rem .5rem;
  font-size: .78rem;
  line-height: 1;
}
.ss-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 30ch;
}
.ss-chip__x {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1;
}
.ss-chip__x:hover {
  color: #dc2626;
}
.searchselect-input {
  width: 100%;
  min-height: 1.6rem;
}
.searchselect-input[disabled] {
  background-color: transparent;
  color: #9ca3af;
  cursor: not-allowed;
}
.is-locked {
  cursor: default !important;
}
.searchselect-affordance {
  position: absolute;
  right: .5rem;
  top: 50%;
  transform: translateY(-50%);
}
.btn-clear,
.btn-clear-all {
  border: 0;
  background: transparent;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.btn-clear:hover,
.btn-clear-all:hover {
  color: #dc2626;
}
.searchselect-dropdown {
  background: #fff;
}
.dropdown-item-option {
  border: 0;
  background: #fff;
  font-size: .8rem;
  line-height: 1.3;
  width: 100%;
  text-align: left;
}
.dropdown-item-option:hover {
  background-color: #f3f4f6;
}
.has-error.searchselect-control {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 .2rem rgba(239, 68, 68, .15);
}
.has-success.searchselect-control {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 .2rem rgba(16, 185, 129, .15);
}
.has-error {
  border-color: #fecaca;
}
.has-success {
  border-color: #bbf7d0;
}
.spinner,
.spinner::after {
  box-sizing: border-box;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #6b7280;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>