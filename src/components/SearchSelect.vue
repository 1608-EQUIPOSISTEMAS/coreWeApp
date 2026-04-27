<template>
  <div class="position-relative searchselect-wrapper" ref="wrapperEl">
    <div
      class="searchselect-control"
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
        autocomplete="nope"
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
          v-else-if="(isRemote && loading) || externalLoading"
          class="dropdown-message"
        >
          <span class="spinner-small me-2"></span>
          Cargando…
        </div>

        <div
          v-else-if="listItems.length === 0"
          class="dropdown-message dropdown-message--empty"
        >
          No se encontraron resultados
        </div>

        <button
          v-if="!loading && !externalLoading"
          v-for="opt in listItems"
          :key="opt[valueField]"
          type="button"
          class="dropdown-item-exec"
          @click="selectOption(opt)"
          role="option"
        >
          <div class="dropdown-item-exec__label">
            {{ opt[labelField] }}
          </div>
          <div
            v-if="showSubValue"
            class="dropdown-item-exec__sublabel"
          >
            {{ opt[sublabelField] ? opt[sublabelField] : opt[valueField] }}
          </div>
        </button>
      </div>
    </Teleport>

    <div
      v-if="hint"
      class="form-text-exec"
    >
      {{ hint }}
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   DISEÑO ESTÁNDAR "EXEC" PARA SEARCH SELECT
═══════════════════════════════════════════════ */
.searchselect-wrapper {
  width: 100%;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.searchselect-control {
  position: relative;
  padding: 0.25rem 2.25rem 0.25rem 0.75rem;
  display: flex;
  align-items: center;
  min-height: 38px;
  background-color: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  cursor: text;
  transition: all 0.2s ease;
  width: 100%; 
}

/* Hover general del input vacio */
.searchselect-control:hover:not(.is-disabled):not(.is-locked) {
  border-color: var(--slate-300, #cbd5e1);
}

/* Foco del input */
.searchselect-control:focus-within:not(.is-disabled) {
  border-color: var(--teal-500, #12274e);
  box-shadow: 0 0 0 3px rgba(18, 39, 78, 0.1); /* Sombra corporativa */
  outline: none;
}

.searchselect-control.is-disabled {
  background-color: var(--slate-50, #f8fafc);
  color: var(--slate-400, #94a3b8);
  cursor: not-allowed;
}

/* === ESTADO BLOQUEADO (CON SELECCIÓN) === */
.searchselect-control.is-locked {
  cursor: default;
  background-color: var(--slate-50, #f8fafc);
  border-color: var(--border, #e2e8f0);
}

/* Nuevo hover para el estado bloqueado: se ve interactivo y limpio */
.searchselect-control.is-locked:hover:not(.is-disabled) {
  background-color: var(--white, #ffffff);
  border-color: var(--slate-300, #cbd5e1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.ss-locked-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  color: var(--teal-600, #12274e); /* Color de marca para la selección activa */
  font-weight: 600; /* Resalta que hay un dato ingresado */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === VALIDACIÓN VISUAL === */
.searchselect-control.has-error {
  border-color: var(--red-600, #dc2626) !important;
}

.searchselect-control.has-error:focus-within {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15) !important;
}

.searchselect-control.has-success {
  border-color: #10b981 !important;
}

/* Input nativo */
.searchselect-input {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary, #0f172a);
  outline: none;
  box-shadow: none !important;
}

.searchselect-input::placeholder {
  color: var(--slate-400, #94a3b8);
  font-weight: 400;
}

.searchselect-input[disabled] {
  background-color: transparent;
  color: var(--slate-400, #94a3b8);
  cursor: not-allowed;
}

/* Iconos de la derecha */
.searchselect-affordance {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-arrow {
  color: var(--text-muted, #94a3b8);
  pointer-events: none;
  transition: transform 0.2s ease, color 0.2s ease;
}

.searchselect-control:focus-within .dropdown-arrow {
  transform: translateY(-50%) rotate(180deg);
  color: var(--teal-500, #12274e); /* Flecha azul corporativo al abrir */
}

/* Botón X (Limpiar) */
.btn-clear {
  border: 0;
  background: transparent;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--slate-400, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-clear:hover {
  background-color: #fee2e2; /* Fondo rojo clarito */
  color: var(--red-600, #dc2626); /* Equis roja */
}

/* ═══════════════════════════════════════════════
   MENÚ DESPLEGABLE Y OPCIONES
═══════════════════════════════════════════════ */
.searchselect-dropdown {
  background: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  padding: 4px 0; /* Un pequeño padding arriba y abajo */
}

.dropdown-message {
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--text-secondary, #475569);
  display: flex;
  align-items: center;
}

.dropdown-message--empty {
  color: var(--slate-400, #94a3b8);
  font-style: italic;
}

.dropdown-item-exec {
  width: 100%;
  text-align: left;
  padding: 8px 14px;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

/* Hover adaptado al color corporativo (#12274e) */
.dropdown-item-exec:hover {
  background-color: rgba(18, 39, 78, 0.04); /* Gris/Azul muy tenue */
}

.dropdown-item-exec:hover .dropdown-item-exec__label {
  color: var(--teal-600, #12274e); /* El texto resalta en tu color corporativo */
}

.dropdown-item-exec:active {
  background-color: rgba(18, 39, 78, 0.08);
}

.dropdown-item-exec__label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
  line-height: 1.3;
  transition: color 0.15s ease;
}

.dropdown-item-exec__sublabel {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  margin-top: 2px;
  line-height: 1.2;
}

.form-text-exec {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
}

/* Spinners */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border, #e2e8f0);
  border-top-color: var(--teal-500, #12274e);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border, #e2e8f0);
  border-top-color: var(--teal-500, #12274e);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
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
  disabled: { type: Boolean, default: false },
  externalLoading: { type: Boolean, default: false }
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

// === AQUÍ ESTÁ EL AJUSTE ===
// Aseguramos que la clase de validación solo se retorne si el componente ha sido "tocado"
// Si necesitas que siempre se muestre, quítale el `|| !isLocked.value`
const validationClass = computed(() => {
  if (!props.required || props.disabled) return ''
  return isLocked.value ? 'has-success' : 'has-error'
})

const showSpinner = computed(
  () =>
    ((isRemote.value && loading.value) || props.externalLoading) &&
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
