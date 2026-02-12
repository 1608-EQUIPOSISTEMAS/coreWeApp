<template>
  <div class="multi-select-wrapper" ref="wrapperEl">
    <div
      class="multi-select-trigger"
      :class="{
        'is-disabled': disabled,
        'is-active': modalOpen,
        'has-selection': selected.length > 0
      }"
      @click="openModal"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      ref="controlRef"
    >
      <div class="trigger-content">
        <span v-if="selected.length === 0" class="placeholder-text">
          {{ placeholder }}
        </span>
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

        <div class="trigger-icon">
          <i class="fa-solid fa-border-all"></i>
        </div>
      </div>

      <Transition name="fade-scale">
        <div
          v-if="showHoverList && selected.length > 0"
          class="hover-tooltip"
          :class="hoverListPosition === 'top' ? 'pos-top' : 'pos-bottom'"
        >
          <div class="tooltip-header">Seleccionados:</div>
          <div class="tooltip-body">
            <div v-for="(item, index) in selected.slice(0, 10)" :key="index" class="tooltip-item">
               {{ item.label }}
            </div>
            <div v-if="selected.length > 10" class="tooltip-more">
              + {{ selected.length - 10 }} más...
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="hint" class="control-hint">{{ hint }}</div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
          <Transition name="modal-zoom">
            <div v-if="modalOpen" class="modal-card">
              
              <div class="card-header">
                <div class="header-title-row">
                  <h3>{{ modalTitle }}</h3>
                  <button class="btn-icon-close" @click="closeModal">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
                
                <!-- Search sin ícono de lupa -->
                <div class="search-container">
                  <input
                    ref="searchInputRef"
                    type="text"
                    class="search-input"
                    placeholder="Filtrar opciones..."
                    v-model="searchQuery"
                    @input="onSearchInput"
                  />
                  <button v-if="searchQuery" @click="clearSearch" class="btn-input-clear">
                    <i class="fa-solid fa-circle-xmark"></i>
                  </button>
                </div>

                <div class="toolbar-row">
                  <span class="selection-status">
                    {{ tempSelection.size }} seleccionados
                  </span>
                  <div class="toolbar-buttons">
                    <button @click="selectAll" :disabled="filteredItems.length === 0" class="btn-link">
                      Todos
                    </button>
                    <button @click="deselectAll" :disabled="!hasVisibleSelection" class="btn-link danger">
                      Ninguno
                    </button>
                  </div>
                </div>
              </div>

              <div class="card-body">
                <div v-if="loading" class="state-container">
                  <div class="spinner"></div>
                  <span>Cargando datos...</span>
                </div>

                <div v-else-if="filteredItems.length === 0" class="state-container">
                  <i class="fa-regular fa-folder-open"></i>
                  <span>No se encontraron resultados</span>
                </div>

                <div v-else class="list-container">
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

                    <!-- Botón "Solo este" -->
                    <button
                      class="btn-only"
                      :class="{ 'is-exclusive': tempSelection.size === 1 && tempSelection.has(item[valueKey]) }"
                      @click.prevent.stop="selectOnly(item)"
                      title="Seleccionar solo este"
                    >
                      <i class="fa-solid fa-filter-circle-dot"></i>
                    </button>
                  </label>
                </div>
              </div>

              <div class="card-footer">
                <button class="btn-secondary" @click="closeModal">Cancelar</button>
                <button class="btn-primary" @click="acceptSelection">
                  Aplicar selección
                </button>
              </div>

            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  labelKey: { type: String, required: true },
  valueKey: { type: String, required: true },
  sublabelKey: { type: String, default: '' },
  placeholder: { type: String, default: 'Seleccionar...' },
  modalTitle: { type: String, default: 'Seleccionar opciones' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  mode: { type: String, default: 'local' },
  fetcher: { type: Function, default: null },
  minSearchChars: { type: Number, default: 0 },
  debounceMs: { type: Number, default: 300 }
})

const emit = defineEmits(['update:modelValue', 'change', 'search'])

// --- Estado ---
const internalCache = ref(new Map())
const controlRef = ref(null)
const showHoverList = ref(false)
const hoverListPosition = ref('bottom')
const searchInputRef = ref(null)
const modalOpen = ref(false)
const searchQuery = ref('')
const tempSelection = ref(new Set())
const loading = ref(false)
const remoteItems = ref([])
let closeTimer = null
let debounceTimer = null

// --- Computadas ---
const isRemote = computed(() => props.mode === 'remote')
const selected = computed(() => props.modelValue || [])

const currentSourceItems = computed(() => {
  return isRemote.value ? remoteItems.value : props.items
})

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    return currentSourceItems.value.filter(item => {
      const label = String(item[props.labelKey] || '').toLowerCase()
      const sublabel = props.sublabelKey ? String(item[props.sublabelKey] || '').toLowerCase() : ''
      return label.includes(query) || sublabel.includes(query)
    })
  }
  const selectedObjects = []
  tempSelection.value.forEach(id => {
    if (internalCache.value.has(id)) selectedObjects.push(internalCache.value.get(id))
  })
  const unselected = currentSourceItems.value.filter(item => !tempSelection.value.has(item[props.valueKey]))
  return [...selectedObjects, ...unselected]
})

const hasVisibleSelection = computed(() => {
  if (tempSelection.value.size === 0) return false
  return filteredItems.value.some(item => tempSelection.value.has(item[props.valueKey]))
})

// Cache management
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

// --- Métodos de UI ---
function openModal() {
  if (props.disabled) return
  modalOpen.value = true
  searchQuery.value = ''
  const initialIds = selected.value.map(item => (typeof item === 'object' && item !== null) ? (item.value || item[props.valueKey]) : item)
  tempSelection.value = new Set(initialIds)
  nextTick(() => {
    searchInputRef.value?.focus()
    if (isRemote.value) fetchRemoteData('')
  })
}

function closeModal() {
  modalOpen.value = false
  tempSelection.value.clear()
  searchQuery.value = ''
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

// Selecciona solo este ítem y desmarca todos los demás
function selectOnly(item) {
  const value = item[props.valueKey]
  // Si ya es el único seleccionado, lo desmarca (toggle)
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

function onSearchInput() { if (isRemote.value) queueRemoteSearch() }

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
  } catch (error) {
    console.error(error)
    remoteItems.value = []
  } finally {
    loading.value = false
  }
}

function acceptSelection() {
  const selectedIds = Array.from(tempSelection.value)
  const selectedObjects = selectedIds.map(id => {
    const cachedItem = internalCache.value.get(id)
    return cachedItem ? { value: cachedItem[props.valueKey], label: cachedItem[props.labelKey] } : { value: id, label: String(id) }
  })
  emit('update:modelValue', selectedObjects)
  emit('change', selectedObjects)
  modalOpen.value = false
}

// Hover logic
function onMouseEnter() {
  if (props.disabled || selected.value.length === 0) return
  if (closeTimer) clearTimeout(closeTimer)
  const rect = controlRef.value.getBoundingClientRect()
  hoverListPosition.value = (window.innerHeight - rect.bottom) < 200 ? 'top' : 'bottom'
  showHoverList.value = true
}
function onMouseLeave() { closeTimer = setTimeout(() => { showHoverList.value = false }, 200) }

onMounted(() => { document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen.value) closeModal() }) })
onBeforeUnmount(() => { if (debounceTimer) clearTimeout(debounceTimer) })
</script>

<style scoped>
.multi-select-wrapper {
  position: relative;
  width: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* --- Trigger --- */
.multi-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
  height: 42px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.multi-select-trigger:hover:not(.is-disabled) { border-color: #cbd5e1; background: #f8fafc; }
.multi-select-trigger.is-active { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.trigger-content { flex: 1; display: flex; align-items: center; overflow: hidden; }
.placeholder-text { color: #64748b; font-size: 0.9rem; }
.value-text { display: flex; gap: 6px; align-items: center; }
.badge-count { background: #eff6ff; color: #2563eb; font-weight: 600; font-size: 0.8rem; padding: 2px 8px; border-radius: 12px; }
.badge-label { color: #334155; font-weight: 500; font-size: 0.9rem; }
.trigger-actions { display: flex; align-items: center; gap: 8px; }
.btn-quick-clear { background: none; border: none; color: #94a3b8; padding: 4px; cursor: pointer; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 0.85rem; }
.btn-quick-clear:hover { background: #fee2e2; color: #ef4444; }
.trigger-icon { color: #94a3b8; font-size: 0.8rem; }

/* --- Tooltip Hover --- */
.hover-tooltip {
  position: absolute;
  left: 0;
  width: 100%;
  background: #1e293b;
  color: white;
  border-radius: 6px;
  padding: 8px 12px;
  z-index: 50;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  font-size: 0.8rem;
}
.hover-tooltip.pos-bottom { top: calc(100% + 6px); }
.hover-tooltip.pos-top { bottom: calc(100% + 6px); }
.tooltip-header { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.05em; }
.tooltip-item { margin-bottom: 2px; }
.tooltip-more { color: #94a3b8; font-style: italic; margin-top: 4px; }

/* --- Modal Backdrop --- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 10, 20, 0.65);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

/* --- Modal Card (estilo oscuro) --- */
.modal-card {
  background: #1a2235;
  width: 100%;
  max-width: 480px;
  border-radius: 14px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  border: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
}

/* Header oscuro */
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: #1e2a3e;
}
.header-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.header-title-row h3 { margin: 0; font-size: 1.05rem; font-weight: 600; color: #e2e8f0; }
.btn-icon-close { background: transparent; border: none; color: #64748b; font-size: 1.05rem; cursor: pointer; transition: color 0.2s; }
.btn-icon-close:hover { color: #cbd5e1; }

/* Buscador limpio sin ícono */
.search-container { position: relative; display: flex; align-items: center; }
.search-input {
  width: 100%;
  padding: 9px 36px 9px 14px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
}
.search-input::placeholder { color: #475569; }
.search-input:focus {
  background: rgba(255,255,255,0.09);
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
.btn-input-clear { position: absolute; right: 10px; background: none; border: none; color: #475569; cursor: pointer; font-size: 0.9rem; }
.btn-input-clear:hover { color: #94a3b8; }

/* Toolbar */
.toolbar-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.8rem; }
.selection-status { color: #60a5fa; font-weight: 600; }
.toolbar-buttons { display: flex; gap: 2px; }
.btn-link { background: none; border: none; cursor: pointer; font-size: 0.8rem; color: #64748b; font-weight: 500; padding: 3px 8px; border-radius: 5px; transition: all 0.15s; }
.btn-link:hover:not(:disabled) { background: rgba(255,255,255,0.07); color: #94a3b8; }
.btn-link.danger:hover:not(:disabled) { color: #f87171; background: rgba(239, 68, 68, 0.1); }
.btn-link:disabled { opacity: 0.35; cursor: default; }

/* Body oscuro */
.card-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  background: #1a2235;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.card-body::-webkit-scrollbar { width: 5px; }
.card-body::-webkit-scrollbar-track { background: transparent; }
.card-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

.state-container { padding: 40px; text-align: center; color: #475569; display: flex; flex-direction: column; align-items: center; gap: 10px; font-size: 0.9rem; }
.spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Lista Items */
.list-row {
  display: flex;
  align-items: center;
  padding: 9px 16px 9px 20px;
  cursor: pointer;
  transition: background 0.12s;
  user-select: none;
  gap: 4px;
}
.list-row:hover { background-color: rgba(255,255,255,0.05); }
.list-row.is-selected { background-color: rgba(59, 130, 246, 0.12); }

/* Checkbox */
.custom-checkbox { position: relative; width: 20px; height: 20px; margin-right: 12px; flex-shrink: 0; }
.custom-checkbox input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
.checkmark {
  position: absolute; top: 0; left: 0; height: 20px; width: 20px;
  background-color: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 5px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.checkmark i { color: white; font-size: 0.72rem; transform: scale(0); transition: transform 0.2s; }
.list-row:hover .checkmark { border-color: rgba(255,255,255,0.3); }
.custom-checkbox input:checked ~ .checkmark { background-color: #3b82f6; border-color: #3b82f6; }
.custom-checkbox input:checked ~ .checkmark i { transform: scale(1); }

/* Textos */
.row-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.row-label { font-size: 0.88rem; color: #cbd5e1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-row.is-selected .row-label { color: #93c5fd; }
.row-sublabel { font-size: 0.74rem; color: #475569; }

/* Botón "Solo este" */
.btn-only {
  background: none;
  border: none;
  cursor: pointer;
  color: #334155;
  font-size: 0.78rem;
  padding: 4px 6px;
  border-radius: 5px;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s;
  display: flex;
  align-items: center;
}
.list-row:hover .btn-only { opacity: 1; color: #64748b; }
.btn-only:hover { background: rgba(59, 130, 246, 0.15) !important; color: #60a5fa !important; }
/* Cuando ya ES el único seleccionado */
.btn-only.is-exclusive { opacity: 1; color: #3b82f6; }
.btn-only.is-exclusive:hover { background: rgba(239, 68, 68, 0.1) !important; color: #f87171 !important; }

/* Footer oscuro */
.card-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.07);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #1e2a3e;
}
.btn-secondary {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 8px 16px;
  border-radius: 7px;
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); color: #cbd5e1; }
.btn-primary {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  padding: 8px 18px;
  border-radius: 7px;
  color: white;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  transition: all 0.2s;
}
.btn-primary:hover { background: #2563eb; box-shadow: 0 2px 12px rgba(59, 130, 246, 0.4); }

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-zoom-enter-active, .modal-zoom-leave-active { transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-zoom-enter-from, .modal-zoom-leave-to { opacity: 0; transform: scale(0.96) translateY(8px); }
</style>