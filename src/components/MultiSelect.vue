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
      @mouseenter="onMouseEnter" 
      @mouseleave="hovering = false"
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
        <i class="fa-solid fa-filter trigger-icon" :class="{ active: dropdownOpen || selected.length > 0 }"></i>
      </div>

      <!-- Hover Preview -->
<Teleport to="body">
        <Transition name="fade">
          <div
            v-if="hovering && !dropdownOpen && selected.length > 0"
            class="hover-preview"
            :style="previewStyle" 
          >
            <ul class="preview-list">
              <li v-for="(item, index) in selectedPreview" :key="index">{{ item.label }}</li>
              <li v-if="selected.length > 5" class="preview-more">+ {{ selected.length - 5 }} más...</li>
            </ul>
          </div>
        </Transition>
      </Teleport>
    </div>

    <div v-if="hint" class="control-hint">{{ hint }}</div>

    <!-- ── Dropdown Panel (Teleported al body) ── -->
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
                <button @click="selectAll" :disabled="filteredItems.length === 0" class="btn-pill">
                  Todos
                </button>
                <button @click="deselectAll" :disabled="!hasVisibleSelection" class="btn-pill outline">
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
              <div
                v-for="item in filteredItems"
                :key="item[valueKey]"
                class="list-row"
                :class="{ 'is-selected': tempSelection.has(item[valueKey]) }"
              >
                <div class="row-click-area" @click="toggleItem(item)">
                  <div class="custom-checkbox" :class="{ 'is-checked': tempSelection.has(item[valueKey]) }">
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
                </div>

                <button
                  class="btn-only"
                  :class="{ 'is-exclusive': tempSelection.size === 1 && tempSelection.has(item[valueKey]) }"
                  @click.stop="selectOnly(item)"
                  title="Seleccionar solo este"
                >
                  <i class="fa-solid fa-crosshairs"></i>
                </button>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="dropdown-footer">
            <button class="btn-cancel" @click="closeDropdown">Cancelar</button>
            <button class="btn-apply" @click="acceptSelection">Aplicar</button>
          </div>

        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
const previewStyle = ref({})
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

const internalCache  = ref(new Map())
const wrapperEl      = ref(null)
const triggerRef     = ref(null)
const dropdownRef    = ref(null)
const searchInputRef = ref(null)

const dropdownOpen   = ref(false)
const hovering       = ref(false)
const dropdownStyle  = ref({})
const searchQuery    = ref('')
const tempSelection  = ref(new Set())
const loading        = ref(false)
const remoteItems    = ref([])

let debounceTimer = null

const isRemote        = computed(() => props.mode === 'remote')
const selected        = computed(() => props.modelValue || [])
const selectedPreview = computed(() => selected.value.slice(0, 5))

const currentSourceItems = computed(() =>
  isRemote.value ? remoteItems.value : props.items
)
function updatePreviewPosition() {
  if (!triggerRef.value) return
  
  const rect = triggerRef.value.getBoundingClientRect()
  const vW = window.innerWidth
  const previewWidth = rect.width // O el ancho que desees

  const style = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    width: `${rect.width}px`,
    zIndex: '99999'
  }

  if (rect.left + rect.width > vW) {
    style.left = 'auto'
    style.right = `${vW - rect.right}px`
  } else {
    style.left = `${rect.left}px`
    style.right = 'auto'
  }

  previewStyle.value = style
}
function onMouseEnter() {
  hovering.value = true
  updatePreviewPosition()
}
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

function updateCache(items) {
  if (!Array.isArray(items)) return
  items.forEach(item => {
    if (item && item[props.valueKey]) internalCache.value.set(item[props.valueKey], item)
  })
}
watch(() => props.items,      (n) => updateCache(n), { immediate: true })
watch(remoteItems,            (n) => updateCache(n), { deep: true })
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

function calcDropdownPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const vH = window.innerHeight
  const vW = window.innerWidth // Ancho de la ventana
  const spaceBelow = vH - rect.bottom
  const spaceAbove = rect.top
  const maxH = 320
  const dropdownWidth = Math.max(rect.width, 270) // Ancho que tendrá el dropdown

  const style = {
    position: 'fixed',
    width: `${dropdownWidth}px`,
    zIndex: '99999',
  }

  // --- Lógica Horizontal (Evitar corte a la derecha) ---
  // Si la posición izquierda + el ancho del dropdown superan el ancho de pantalla
  if (rect.left + dropdownWidth > vW) {
    style.left = 'auto' // Quitamos el left
    style.right = `${vW - rect.right}px` // Alineamos al borde derecho del disparador
  } else {
    style.left = `${rect.left}px`
    style.right = 'auto'
  }

  // --- Lógica Vertical (Se mantiene igual) ---
  if (spaceBelow >= maxH || spaceBelow >= spaceAbove) {
    style.top = `${rect.bottom + 4}px`
    style.maxHeight = `${Math.min(maxH, spaceBelow - 8)}px`
  } else {
    style.bottom = `${vH - rect.top + 4}px`
    style.maxHeight = `${Math.min(maxH, spaceAbove - 8)}px`
  }

  dropdownStyle.value = style
}

function toggleDropdown() {
  if (props.disabled) return
  dropdownOpen.value ? closeDropdown() : openDropdown()
}

function openDropdown() {
  calcDropdownPosition()
  dropdownOpen.value  = true
  hovering.value      = false
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
    const result = await props.fetcher(query)
    remoteItems.value = Array.isArray(result) ? result : []
  } catch (e) {
    console.error('[MultiSelect] Error al cargar datos remotos:', e)
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
/*
 * Sin variables CSS custom properties en este componente.
 *
 * Por qué: <style scoped> transforma `:root` en `:root[data-v-xxxx]` (inválido).
 * Además, <Teleport to="body"> saca el dropdown del árbol DOM del componente,
 * por lo que tampoco hereda las propiedades definidas en `.ms-wrapper`.
 * Solución definitiva: colores hardcodeados en cada regla CSS.
 *
 * Paleta:  Navy #002060 | Dark #001540 | BG #eff6ff | Light #f0f9ff
 */

/* ── Wrapper ── */
.ms-wrapper {
  position: relative;
  width: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

/* ── Trigger ──
   FIX 3: min-height en vez de height fija, y overflow:hidden para que
   el trigger NUNCA crezca hacia los lados — el texto desbordante se
   recorta o el contenedor crece hacia abajo.
*/
.ms-trigger {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px 10px;
  min-height: 38px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.ms-trigger:hover:not(.is-disabled) {
  border-color: #002060;
  background: #f8fafc;
}
.ms-trigger.is-open,
.ms-trigger.has-selection {
  border-color: #002060;
  box-shadow: 0 0 0 3px rgba(0, 32, 96, 0.1);
}
.ms-trigger.is-disabled {
  opacity: 0.6;
  background: #f1f5f9;
  cursor: not-allowed;
  border-color: #e2e8f0;
}

.trigger-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.placeholder-text {
  color: #64748b;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.value-text {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

/* FIX 1: badge con color hardcodeado (no usa variables CSS) */
.badge-count {
  background: #002060;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 4px;
  line-height: 1.4;
  flex-shrink: 0;
}

.badge-label {
  color: #1e293b;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-quick-clear {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.btn-quick-clear:hover { background: #f1f5f9; color: #ef4444; }

.trigger-icon {
  color: #94a3b8;
  font-size: 0.75rem;
  transition: color 0.2s;
  flex-shrink: 0;
}
.trigger-icon.active { color: #002060; }

.control-hint {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 4px;
}

/* ── Hover Preview — fondo Azul Navy oscuro ── */
.hover-preview {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  background: #002060;
  border: 1px solid #001540;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  padding: 10px 12px;
  z-index: 200;
  pointer-events: none;
  box-sizing: border-box;
}
.hover-preview::before {
  content: '';
  position: absolute;
  top: -5px;
  /* Si el style tiene right, lo movemos a la derecha */
  left: 14px; 
  /* Si prefieres que siempre esté centrado o detecte el lado, 
     puedes usar una clase dinámica, pero 14px suele bastar 
     si el dropdown no es extremadamente pequeño. */
  width: 9px;
  height: 9px;
  background: #00102b;
  border-left: 1px solid #00081a;
  border-top: 1px solid #00081a;
  transform: rotate(45deg);
}
.preview-header {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 7px;
}
.preview-list {
  list-style: none!important;
  padding: 0;
  margin: 0;
}
.preview-list li {
  color: #ffffff;
  font-size: 0.8rem;
  line-height: 1.75;
  display: flex;
  align-items: center;
  gap: 7px;
}
.preview-list li::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}
.preview-more {
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  font-size: 0.73rem;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

/* ── Dropdown Panel ──
   FIX 2: todos los colores hardcodeados. El Teleport mueve este elemento
   al <body>, fuera del árbol del componente, por lo que no hereda
   ningún estilo scoped ni variables de .ms-wrapper.
*/
.ms-dropdown {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.12), 0 2px 6px -2px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

.dropdown-header {
  padding: 10px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 10px;
  color: #94a3b8;
  font-size: 0.75rem;
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 8px 32px 8px 30px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #1e293b;
  font-size: 0.82rem;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}
.search-input::placeholder { color: #94a3b8; }
.search-input:focus {
  border-color: #002060;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(0, 32, 96, 0.06);
}
.btn-input-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.85rem;
  transition: color 0.15s;
}
.btn-input-clear:hover { color: #475569; }

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 0.75rem;
}

.selection-status {
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 5px;
}
.count-pill {
  background: #eff6ff;
  color: #002060;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 0.7rem;
}

.toolbar-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-pill {
  background: #e2e8f0;
  border: none;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-pill:hover:not(:disabled) {
  background: #002060;
  color: #ffffff;
}
.btn-pill.outline {
  background: transparent;
  border: 1px solid #cbd5e1;
}
.btn-pill.outline:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
  background: #ffffff;
}
.btn-pill:disabled { opacity: 0.4; cursor: default; }

/* Body */
.dropdown-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.dropdown-body::-webkit-scrollbar { width: 5px; }
.dropdown-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.state-container {
  padding: 24px;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e2e8f0;
  border-top-color: #002060;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Rows */
.list-row {
  display: flex;
  align-items: stretch;
  cursor: pointer;
  transition: background 0.1s;
  border-left: 3px solid transparent;
}
.list-row:hover { background: #f8fafc; }
.list-row.is-selected {
  background: #eff6ff;
  border-left-color: #002060;
}
.list-row + .list-row {
  border-top: 1px solid #f8fafc;
}

.row-click-area {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 7px 10px;
  gap: 8px;
  min-width: 0;
}

/* Checkbox — FIX: controlado por clase .is-checked, sin input nativo */
.custom-checkbox {
  position: relative;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.checkmark {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1.5px solid #94a3b8;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.checkmark i {
  color: #ffffff;
  font-size: 0.6rem;
  transform: scale(0);
  transition: transform 0.15s;
}
.list-row:hover .checkmark {
  border-color: #002060;
}
.custom-checkbox.is-checked .checkmark {
  background: #002060;
  border-color: #002060;
}
.custom-checkbox.is-checked .checkmark i {
  transform: scale(1);
}

.row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.row-label {
  font-size: 0.82rem;
  color: #334155;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.list-row.is-selected .row-label {
  color: #002060;
  font-weight: 600;
}
.row-sublabel {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* Botón Solo Este */
.btn-only {
  background: none;
  border: none;
  color: transparent;
  font-size: 0.7rem;
  padding: 0 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 1px solid transparent;
  flex-shrink: 0;
}
.list-row:hover .btn-only {
  color: #94a3b8;
  border-left-color: #f1f5f9;
}
.btn-only:hover {
  background: #f0f9ff !important;
  color: #0284c7 !important;
}
.btn-only.is-exclusive { color: #0284c7 !important; }

/* Footer */
.dropdown-footer {
  padding: 8px 12px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 5px 14px;
  border-radius: 4px;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel:hover {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #94a3b8;
}

/* FIX 2: Aplicar — hardcodeado, sin variables CSS */
.btn-apply {
  background: #002060;
  border: 1px solid #002060;
  padding: 5px 16px;
  border-radius: 4px;
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.btn-apply:hover {
  background: #001540;
  border-color: #001540;
}

/* ── Transiciones Vue ── */
.dropdown-enter-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
/* ── Hover Preview — Azul más oscuro ── */
.hover-preview {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  background: #00102b; /* Azul marino mucho más oscuro */
  border: 1px solid #00081a; 
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); /* Sombra más pronunciada */
  padding: 10px 12px;
  z-index: 200;
  pointer-events: none;
  box-sizing: border-box;
}

/* La flechita (tooltip pointer) que apunta hacia arriba */
.hover-preview::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 14px;
  width: 9px;
  height: 9px;
  background: #00102b; /* Debe coincidir con el nuevo fondo */
  border-left: 1px solid #00081a;
  border-top: 1px solid #00081a;
  transform: rotate(45deg);
}

.preview-list {
  list-style: none!important;
  padding: 0;
  margin: 0;
}

.preview-list li {
  color: #ffffff;
  font-size: 0.8rem;
  line-height: 1.75;
  display: flex;
  align-items: center; /* Alineación vertical perfecta */
  gap: 8px; /* Separación entre el punto y el texto */
}

/* Punto generado por CSS, perfectamente alineado */
.preview-list li::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  flex-shrink: 0;
}

.preview-more {
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  font-size: 0.73rem;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>