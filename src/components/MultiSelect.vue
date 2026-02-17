<template>
  <div class="ms-wrapper" ref="wrapperEl">

    <!-- ── Trigger ── -->
    <div
      class="ms-trigger"
      :class="{
        'is-disabled': disabled,
        'is-open': dropdownOpen,
        'has-selection': selected.length > 0
      }"
      @click="toggleDropdown"
      ref="triggerRef"
    >
      <div class="trigger-content">
        <span v-if="selected.length === 0" class="placeholder-text">{{ placeholder }}</span>
        <span v-else class="value-text">
          <span class="badge-count">{{ selected.length }}</span>
          <span class="badge-label">{{ selected.length === 1 ? 'opción' : 'opciones' }}</span>
        </span>
      </div>

      <div class="trigger-actions">
        <button
          v-if="selected.length > 0 && !disabled"
          @click.stop="clearAllSelection"
          class="btn-quick-clear"
          title="Limpiar selección"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
        <!-- Ícono de filtro igual al que usa la tabla -->
        <i class="fa-solid fa-filter trigger-icon" :class="{ active: dropdownOpen || selected.length > 0 }"></i>
      </div>
    </div>

    <div v-if="hint" class="control-hint">{{ hint }}</div>

    <!-- ── Dropdown Panel ── -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="dropdownOpen"
          class="ms-dropdown"
          :style="dropdownStyle"
          ref="dropdownRef"
        >

          <!-- Search -->
          <div class="dropdown-header">
            <div class="search-wrap">
              <i class="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                ref="searchInputRef"
                type="text"
                class="search-input"
                :placeholder="`Filtrar ${placeholder.toLowerCase()}...`"
                v-model="searchQuery"
                @input="onSearchInput"
              />
              <button v-if="searchQuery" @click="clearSearch" class="btn-input-clear">
                <i class="fa-solid fa-circle-xmark"></i>
              </button>
            </div>

            <div class="toolbar-row">
              <span class="selection-status">
                <span class="count-pill">{{ tempSelection.size }}</span>
                seleccionados
              </span>
              <div class="toolbar-buttons">
                <button @click="selectAll" :disabled="filteredItems.length === 0" class="btn-link">
                  Todos
                </button>
                <span class="divider-dot">·</span>
                <button @click="deselectAll" :disabled="!hasVisibleSelection" class="btn-link danger">
                  Ninguno
                </button>
              </div>
            </div>
          </div>

          <!-- List -->
          <div class="dropdown-body">
            <div v-if="loading" class="state-container">
              <div class="spinner"></div>
              <span>Cargando...</span>
            </div>

            <div v-else-if="filteredItems.length === 0" class="state-container">
              <i class="fa-regular fa-folder-open"></i>
              <span>Sin resultados</span>
            </div>

            <template v-else>
              <label
                v-for="item in filteredItems"
                :key="item[valueKey]"
                class="list-row"
                :class="{ 'is-selected': tempSelection.has(item[valueKey]) }"
              >
                <div class="custom-checkbox">
                  <input
                    type="checkbox"
                    :checked="tempSelection.has(item[valueKey])"
                    @change="toggleItem(item)"
                  />
                  <span class="checkmark">
                    <i class="fa-solid fa-check"></i>
                  </span>
                </div>

                <div class="row-info">
                  <span class="row-label">{{ item[labelKey] }}</span>
                  <span v-if="sublabelKey && item[sublabelKey]" class="row-sublabel">
                    {{ item[sublabelKey] }}
                  </span>
                </div>

                <button
                  class="btn-only"
                  :class="{ 'is-exclusive': tempSelection.size === 1 && tempSelection.has(item[valueKey]) }"
                  @click.prevent.stop="selectOnly(item)"
                  title="Solo este"
                >
                  <i class="fa-solid fa-filter-circle-dot"></i>
                </button>
              </label>
            </template>
          </div>

          <!-- Footer -->
          <div class="dropdown-footer">
            <button class="btn-cancel" @click="closeDropdown">Cancelar</button>
            <button class="btn-apply" @click="acceptSelection">
              Aplicar
            </button>
          </div>

        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue:     { type: Array,    default: () => [] },
  items:          { type: Array,    default: () => [] },
  labelKey:       { type: String,   required: true },
  valueKey:       { type: String,   required: true },
  sublabelKey:    { type: String,   default: '' },
  placeholder:    { type: String,   default: 'Seleccionar...' },
  hint:           { type: String,   default: '' },
  disabled:       { type: Boolean,  default: false },
  required:       { type: Boolean,  default: false },
  mode:           { type: String,   default: 'local' },
  fetcher:        { type: Function, default: null },
  minSearchChars: { type: Number,   default: 0 },
  debounceMs:     { type: Number,   default: 300 },
})

const emit = defineEmits(['update:modelValue', 'change', 'search'])

// ── Estado
const internalCache  = ref(new Map())
const wrapperEl      = ref(null)
const triggerRef     = ref(null)
const dropdownRef    = ref(null)
const searchInputRef = ref(null)

const dropdownOpen   = ref(false)
const dropdownStyle  = ref({})
const searchQuery    = ref('')
const tempSelection  = ref(new Set())
const loading        = ref(false)
const remoteItems    = ref([])

let debounceTimer = null

// ── Computadas
const isRemote  = computed(() => props.mode === 'remote')
const selected  = computed(() => props.modelValue || [])

const currentSourceItems = computed(() =>
  isRemote.value ? remoteItems.value : props.items
)

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    return currentSourceItems.value.filter(item => {
      const label    = String(item[props.labelKey]    || '').toLowerCase()
      const sublabel = props.sublabelKey ? String(item[props.sublabelKey] || '').toLowerCase() : ''
      return label.includes(query) || sublabel.includes(query)
    })
  }
  const selectedObjects = []
  tempSelection.value.forEach(id => {
    if (internalCache.value.has(id)) selectedObjects.push(internalCache.value.get(id))
  })
  const unselected = currentSourceItems.value.filter(
    item => !tempSelection.value.has(item[props.valueKey])
  )
  return [...selectedObjects, ...unselected]
})

const hasVisibleSelection = computed(() => {
  if (tempSelection.value.size === 0) return false
  return filteredItems.value.some(item => tempSelection.value.has(item[props.valueKey]))
})

// ── Cache
function updateCache(items) {
  if (!Array.isArray(items)) return
  items.forEach(item => {
    if (item && item[props.valueKey]) internalCache.value.set(item[props.valueKey], item)
  })
}
watch(() => props.items, (n) => updateCache(n), { immediate: true })
watch(remoteItems, (n) => updateCache(n), { deep: true })
watch(() => props.modelValue, (val) => {
  if (val && Array.isArray(val)) {
    val.forEach(v => {
      if (v && typeof v === 'object') {
        const id = v.value || v[props.valueKey]
        if (id && !internalCache.value.has(id)) internalCache.value.set(id, { ...v })
      }
    })
  }
}, { immediate: true, deep: true })

// ── Posicionamiento
function calcDropdownPosition() {
  if (!triggerRef.value) return
  const rect        = triggerRef.value.getBoundingClientRect()
  const vH          = window.innerHeight
  const spaceBelow  = vH - rect.bottom
  const spaceAbove  = rect.top
  const maxH        = 320

  const style = {
    position: 'fixed',
    left:     `${rect.left}px`,
    width:    `${Math.max(rect.width, 260)}px`,
    zIndex:   '99999',
  }

  if (spaceBelow >= maxH || spaceBelow >= spaceAbove) {
    style.top       = `${rect.bottom + 3}px`
    style.maxHeight = `${Math.min(maxH, spaceBelow - 8)}px`
  } else {
    style.bottom    = `${vH - rect.top + 3}px`
    style.maxHeight = `${Math.min(maxH, spaceAbove - 8)}px`
  }

  dropdownStyle.value = style
}

// ── Open / Close
function toggleDropdown() {
  if (props.disabled) return
  dropdownOpen.value ? closeDropdown() : openDropdown()
}

function openDropdown() {
  calcDropdownPosition()
  dropdownOpen.value  = true
  searchQuery.value   = ''
  const initialIds    = selected.value.map(item =>
    (typeof item === 'object' && item !== null) ? (item.value || item[props.valueKey]) : item
  )
  tempSelection.value = new Set(initialIds)
  nextTick(() => {
    searchInputRef.value?.focus()
    if (isRemote.value) fetchRemoteData('')
  })
}

function closeDropdown() {
  dropdownOpen.value = false
  tempSelection.value.clear()
  searchQuery.value  = ''
}

// ── Acciones
function clearAllSelection() {
  emit('update:modelValue', [])
  emit('change', [])
  tempSelection.value.clear()
}

function toggleItem(item) {
  const value = item[props.valueKey]
  if (tempSelection.value.has(value)) {
    tempSelection.value.delete(value)
  } else {
    tempSelection.value.add(value)
    internalCache.value.set(value, item)
  }
}

function selectOnly(item) {
  const value = item[props.valueKey]
  if (tempSelection.value.size === 1 && tempSelection.value.has(value)) {
    tempSelection.value.clear()
  } else {
    tempSelection.value.clear()
    tempSelection.value.add(value)
    internalCache.value.set(value, item)
  }
}

function selectAll() {
  filteredItems.value.forEach(item => {
    const val = item[props.valueKey]
    tempSelection.value.add(val)
    internalCache.value.set(val, item)
  })
}

function deselectAll() {
  if (searchQuery.value.trim()) {
    filteredItems.value.forEach(item => tempSelection.value.delete(item[props.valueKey]))
  } else {
    tempSelection.value.clear()
  }
}

function clearSearch() {
  searchQuery.value = ''
  if (isRemote.value) fetchRemoteData('')
  searchInputRef.value?.focus()
}

function onSearchInput() {
  if (isRemote.value) queueRemoteSearch()
}

function queueRemoteSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const query = searchQuery.value.trim()
    if (query.length >= props.minSearchChars || query.length === 0) fetchRemoteData(query)
  }, props.debounceMs)
}

async function fetchRemoteData(query) {
  if (!props.fetcher) return
  loading.value = true
  emit('search', query)
  try {
    const result  = await props.fetcher(query)
    remoteItems.value = Array.isArray(result) ? result : []
  } catch (e) {
    console.error(e)
    remoteItems.value = []
  } finally {
    loading.value = false
  }
}

function acceptSelection() {
  const selectedIds     = Array.from(tempSelection.value)
  const selectedObjects = selectedIds.map(id => {
    const cached = internalCache.value.get(id)
    return cached
      ? { value: cached[props.valueKey], label: cached[props.labelKey] }
      : { value: id, label: String(id) }
  })
  emit('update:modelValue', selectedObjects)
  emit('change', selectedObjects)
  dropdownOpen.value = false
}

// ── Click fuera & Escape
function onClickOutside(e) {
  if (!dropdownOpen.value) return
  if (!triggerRef.value?.contains(e.target) && !dropdownRef.value?.contains(e.target)) {
    closeDropdown()
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape' && dropdownOpen.value) closeDropdown()
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('scroll', calcDropdownPosition, true)
  window.addEventListener('resize', calcDropdownPosition)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('scroll', calcDropdownPosition, true)
  window.removeEventListener('resize', calcDropdownPosition)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
<style scoped>
/* ── Wrapper ── */
.ms-wrapper {
  position: relative;
  width: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

/* ── Trigger ── */
.ms-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0 10px;
  height: 34px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  user-select: none;
  white-space: nowrap;
  width: 100%;
}
.ms-trigger:hover:not(.is-disabled) {
  border-color: #1a232e; /* Azul Navy Hover */
  background: #f8fafc;
}
.ms-trigger.is-open,
.ms-trigger.has-selection {
  border-color: #9b8412; /* Dorado activo */
  box-shadow: 0 0 0 2px rgba(155, 132, 18, 0.15); /* Sombra dorada */
}
.ms-trigger.is-disabled { opacity: 0.5; cursor: not-allowed; }

.trigger-content { flex: 1; overflow: hidden; display: flex; align-items: center; }
.placeholder-text { color: #9ca3af; font-size: 0.82rem; }
.value-text { display: flex; gap: 5px; align-items: center; }

.badge-count {
  background: #9b8412; /* Dorado */
  color: #ffffff;
  font-weight: 700;
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.6;
}
.badge-label { color: #1a232e; font-size: 0.82rem; font-weight: 500; }

.trigger-actions { display: flex; align-items: center; gap: 5px; }
.btn-quick-clear {
  background: none; border: none;
  color: #9ca3af; padding: 2px; cursor: pointer;
  border-radius: 50%; font-size: 0.72rem;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s;
}
.btn-quick-clear:hover { background: #fee2e2; color: #ef4444; }

.trigger-icon {
  color: #9ca3af;
  font-size: 0.72rem;
  transition: color 0.15s;
}
.trigger-icon.active { color: #9b8412; }

.control-hint { font-size: 0.72rem; color: #9ca3af; margin-top: 3px; padding-left: 2px; }

/* ── Dropdown Panel ── */
.ms-dropdown {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.07),
    0 12px 24px -4px rgba(26, 35, 46, 0.15); /* Sombra con tinte navy */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.dropdown-header {
  padding: 10px 10px 8px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute; left: 9px;
  color: #9ca3af; font-size: 0.72rem;
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 6px 28px 6px 28px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #1a232e;
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-input::placeholder { color: #9ca3af; }
.search-input:focus {
  border-color: #1a232e; /* Foco Azul Navy */
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(26, 35, 46, 0.12);
}
.btn-input-clear {
  position: absolute; right: 8px;
  background: none; border: none;
  color: #9ca3af; cursor: pointer; font-size: 0.8rem;
}
.btn-input-clear:hover { color: #64748b; }

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 7px;
  font-size: 0.74rem;
}
.selection-status { color: #64748b; display: flex; align-items: center; gap: 4px; }

.count-pill {
  background: #fdfae6; /* Dorado muy claro */
  color: #9b8412;      /* Texto Dorado */
  font-weight: 700;
  padding: 0px 5px;
  border-radius: 8px;
  font-size: 0.7rem;
  line-height: 1.6;
}
.toolbar-buttons { display: flex; align-items: center; gap: 1px; }
.divider-dot { color: #d1d5db; font-size: 0.7rem; }

.btn-link {
  background: none; border: none;
  color: #64748b; font-size: 0.74rem;
  font-weight: 500; padding: 2px 5px;
  border-radius: 3px; cursor: pointer;
  transition: all 0.1s;
}
.btn-link:hover:not(:disabled) { background: #f1f5f9; color: #1a232e; }
.btn-link.danger:hover:not(:disabled) { color: #ef4444; background: #fee2e2; }
.btn-link:disabled { opacity: 0.3; cursor: default; }

/* Body */
.dropdown-body {
  flex: 1;
  overflow-y: auto;
  padding: 3px 0;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}
.dropdown-body::-webkit-scrollbar { width: 4px; }
.dropdown-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

.state-container {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}
.spinner {
  width: 16px; height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #9b8412; /* Spinner Dorado */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Rows */
.list-row {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  gap: 4px;
  cursor: pointer;
  transition: background 0.08s;
  user-select: none;
}
.list-row:hover { background: #f8fafc; }
.list-row.is-selected { background: #faf9f0; } /* Fondo seleccionado crema/dorado suave */
.list-row + .list-row { border-top: 1px solid #f8fafc; }

/* Checkbox */
.custom-checkbox { position: relative; width: 16px; height: 16px; margin-right: 9px; flex-shrink: 0; }
.custom-checkbox input { position: absolute; opacity: 0; width: 0; height: 0; }
.checkmark {
  position: absolute; inset: 0;
  background: #ffffff;
  border: 1.5px solid #d1d5db;
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.checkmark i { color: #fff; font-size: 0.55rem; transform: scale(0); transition: transform 0.12s; }

.list-row:hover .checkmark { border-color: #1a232e; } /* Hover checkbox Navy */
.custom-checkbox input:checked ~ .checkmark { background: #9b8412; border-color: #9b8412; } /* Check Dorado */
.custom-checkbox input:checked ~ .checkmark i { transform: scale(1); }

.row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.row-label {
  font-size: 0.82rem;
  color: #1e293b;
  font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.list-row.is-selected .row-label { color: #9b8412; font-weight: 600; } /* Label seleccionado Dorado */
.row-sublabel { font-size: 0.68rem; color: #9ca3af; }

/* Botón "Solo este" */
.btn-only {
  background: none; border: none; cursor: pointer;
  color: transparent; font-size: 0.68rem;
  padding: 2px 4px; border-radius: 3px;
  flex-shrink: 0; transition: all 0.1s;
}
.list-row:hover .btn-only { color: #9ca3af; }
.btn-only:hover { background: #fdfae6 !important; color: #9b8412 !important; } /* Hover "Solo este" Dorado */
.btn-only.is-exclusive { color: #84a6d0 !important; }
.btn-only.is-exclusive:hover { background: #fee2e2 !important; color: #ef4444 !important; }

/* Footer */
.dropdown-footer {
  padding: 7px 10px;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
.btn-cancel {
  background: #ffffff;
  border: 1px solid #d1d5db;
  padding: 4px 12px;
  border-radius: 4px;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
}
.btn-cancel:hover { border-color: #1a232e; color: #1a232e; }

.btn-apply {
  background: #1a232e; /* Botón principal Navy */
  border: none;
  padding: 4px 14px;
  border-radius: 4px;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
  box-shadow: 0 1px 4px rgba(26, 35, 46, 0.3);
}
.btn-apply:hover { background: #2c3a4d; } /* Hover ligeramente más claro */

/* ── Transition ── */
.dropdown-enter-active {
  transition: opacity 0.12s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.99);
}
</style>