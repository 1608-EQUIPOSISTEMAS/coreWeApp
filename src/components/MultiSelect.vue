<template>
  <div class="multi-select-wrapper" ref="wrapperEl">
    <div
      class="multi-select-control"
      :class="{
        'is-disabled': disabled,
        'is-error': required && selected.length === 0,
        'is-success': required && selected.length > 0
      }"
      @click="openModal"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      ref="controlRef"
      :aria-disabled="disabled"
    >
      <div class="control-content">
        <span v-if="selected.length === 0" class="control-placeholder">
          {{ placeholder }}
        </span>
        <span v-else class="control-value">
          {{ selected.length }} {{ selected.length === 1 ? 'seleccionado' : 'seleccionados' }}
        </span>
      </div>

      <div class="control-icon">
        <i class="fa-solid fa-border-all"></i>
      </div>

      <Transition name="fade">
        <div
          v-if="showHoverList && selected.length > 0"
          class="hover-list"
          :class="hoverListPosition === 'top' ? 'pos-top' : 'pos-bottom'"
          @mouseenter="onMouseEnterList"
          @mouseleave="onMouseLeaveList"
        >
          <div class="hover-list-content">
            <div v-for="(item, index) in selected" :key="index" class="hover-item">
               {{ item.label }}
            </div>
            <div v-if="selected.length > 10" class="hover-more">
              ... y {{ selected.length - 10 }} más
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="hint" class="control-hint">{{ hint }}</div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
          <Transition name="modal-slide">
            <div v-if="modalOpen" class="modal-container" @click.stop>

              <div class="modern-header">
                <div class="header-top">
                  <h3 class="modern-title">{{ modalTitle }}</h3>
                  <button type="button" class="modern-close-btn" @click="closeModal">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div class="modern-search-wrapper">
                  <div class="search-pill">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                    <input
                      ref="searchInputRef"
                      type="text"
                      class="search-input-transparent"
                      placeholder="Buscar..."
                      v-model="searchQuery"
                      @input="onSearchInput"
                    />
                    <button v-if="searchQuery" @click="clearSearch" class="search-clear-mini">
                      <i class="fa-solid fa-circle-xmark"></i>
                    </button>
                  </div>
                </div>

                <div class="modern-toolbar">
                  <span class="selection-count">
                    {{ tempSelection.size }} seleccionados
                  </span>
                  <div class="toolbar-actions">
                    <button
                      @click="selectAll"
                      :disabled="filteredItems.length === 0"
                      class="text-btn"
                    >
                      Todos
                    </button>
                    <button
                      @click="deselectAll"
                      :disabled="!hasVisibleSelection"
                      class="text-btn text-danger"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
              </div>

              <div class="modern-body">
                <div v-if="loading" class="modern-state">
                  <div class="spinner-modern"></div>
                  <p>Cargando...</p>
                </div>

                <div v-else-if="filteredItems.length === 0" class="modern-state">
                  <i class="fa-regular fa-folder-open empty-icon"></i>
                  <p>Sin resultados</p>
                </div>

                <div v-else class="modern-list">
                  <label
                    v-for="item in filteredItems"
                    :key="item[valueKey]"
                    class="modern-row"
                    :class="{ 'is-active': tempSelection.has(item[valueKey]) }"
                  >
                    <div class="row-content">
                      <div class="row-title">{{ item[labelKey] }}</div>
                      <div v-if="sublabelKey && item[sublabelKey]" class="row-subtitle">
                        {{ item[sublabelKey] }}
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      class="hidden-checkbox"
                      :checked="tempSelection.has(item[valueKey])"
                      @change="toggleItem(item)"
                    />

                    <div class="row-check-indicator">
                      <Transition name="scale-check">
                        <i v-if="tempSelection.has(item[valueKey])" class="fa-solid fa-circle-check"></i>
                        <i v-else class="fa-regular fa-circle"></i>
                      </Transition>
                    </div>
                  </label>
                </div>
              </div>

              <div class="modern-footer">
                <button type="button" class="btn-modern-cancel" @click="closeModal">
                  Cancelar
                </button>
                <button type="button" class="btn-modern-accept" @click="acceptSelection">
                  Confirmar selección
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
  modelValue: { type: Array, default: () => [] }, // Se espera [{value: 1, label: 'Name'}, ...]
  items: { type: Array, default: () => [] },
  labelKey: { type: String, required: true },
  valueKey: { type: String, required: true },
  sublabelKey: { type: String, default: '' },
  placeholder: { type: String, default: 'Seleccionar opciones...' },
  modalTitle: { type: String, default: 'Seleccionar opciones' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  mode: { type: String, default: 'local', validator: (v) => ['local', 'remote'].includes(v) },
  fetcher: { type: Function, default: null },
  minSearchChars: { type: Number, default: 0 },
  debounceMs: { type: Number, default: 300 }
})

const emit = defineEmits(['update:modelValue', 'change', 'search'])

// --- Refs y Estado ---
const internalCache = ref(new Map()) // <--- EL SECRETO: Memoria persistente de items
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

// Lista actual de opciones crudas (sin filtrar)
const currentSourceItems = computed(() => {
  return isRemote.value ? remoteItems.value : props.items
})

// Lógica principal de visualización en la Modal
const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  // 1. Si hay búsqueda, filtramos sobre la fuente actual (remota o local)
  if (query) {
    return currentSourceItems.value.filter(item => {
      const label = String(item[props.labelKey] || '').toLowerCase()
      const sublabel = props.sublabelKey ? String(item[props.sublabelKey] || '').toLowerCase() : ''
      return label.includes(query) || sublabel.includes(query)
    })
  }

  // 2. Si NO hay búsqueda (estado inicial de la modal):
  //    Queremos mostrar PRIMERO los seleccionados, LUEGO los resultados disponibles.

  // A) Recuperamos los objetos completos de lo que está seleccionado usando el Cache
  const selectedObjects = []
  tempSelection.value.forEach(id => {
    if (internalCache.value.has(id)) {
      selectedObjects.push(internalCache.value.get(id))
    }
  })

  // B) Obtenemos los items de la fuente actual que NO están seleccionados
  //    (para no duplicarlos visualmente)
  const unselectedCurrentItems = currentSourceItems.value.filter(item =>
    !tempSelection.value.has(item[props.valueKey])
  )

  // C) Unimos: [Seleccionados Arriba] + [Resto Abajo]
  return [...selectedObjects, ...unselectedCurrentItems]
})

const hasVisibleSelection = computed(() => {
  if (tempSelection.value.size === 0) return false
  return filteredItems.value.some(item => tempSelection.value.has(item[props.valueKey]))
})

// --- Gestión del Cache (Vital para Remote) ---
function updateCache(items) {
  if (!Array.isArray(items)) return
  items.forEach(item => {
    if (item && item[props.valueKey]) {
      internalCache.value.set(item[props.valueKey], item)
    }
  })
}

// Observamos cambios en los items entrantes para alimentar el cache
watch(() => props.items, (newItems) => updateCache(newItems), { immediate: true })
watch(remoteItems, (newRemote) => updateCache(newRemote), { deep: true })
// También alimentamos el cache con lo que ya venga seleccionado inicialmente
watch(() => props.modelValue, (val) => {
  if (val && Array.isArray(val)) {
    val.forEach(v => {
      // Si viene con formato objeto {value, label}, intentamos reconstruir un item parcial
      // O si viene el objeto completo item de base de datos
      if (v && typeof v === 'object') {
        // Guardamos usando el ID como clave
        const id = v.value || v[props.valueKey]
        // Si ya existe en cache uno más completo, no lo sobrescribimos con uno parcial
        if (id && !internalCache.value.has(id)) {
           // Truco: Si v es {value: 1, label: 'X'}, lo adaptamos al formato de item esperado
           // O si v ya es el item, lo guardamos.
           const cacheItem = { ...v }
           // Aseguramos que tenga las keys correctas si viniera formateado
           if (!cacheItem[props.valueKey] && cacheItem.value) cacheItem[props.valueKey] = cacheItem.value
           if (!cacheItem[props.labelKey] && cacheItem.label) cacheItem[props.labelKey] = cacheItem.label

           internalCache.value.set(id, cacheItem)
        }
      }
    })
  }
}, { immediate: true, deep: true })


// --- Métodos ---
function openModal() {
  if (props.disabled) return
  modalOpen.value = true
  searchQuery.value = ''

  // Extraer IDs del modelValue
  const initialIds = selected.value.map(item => {
    return (typeof item === 'object' && item !== null) ? (item.value || item[props.valueKey]) : item
  })
  tempSelection.value = new Set(initialIds)

  nextTick(() => {
    searchInputRef.value?.focus()
    // En remote, cargamos data inicial (vacía o default)
    if (isRemote.value) fetchRemoteData('')
  })
}

function closeModal() {
  modalOpen.value = false
  tempSelection.value.clear()
  searchQuery.value = ''
}

function toggleItem(item) {
  const value = item[props.valueKey]
  if (tempSelection.value.has(value)) {
    tempSelection.value.delete(value)
  } else {
    tempSelection.value.add(value)
    // Aseguramos que el item recién clickeado esté en caché
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
    // Solo desmarcamos los visibles
    filteredItems.value.forEach(item => {
      tempSelection.value.delete(item[props.valueKey])
    })
  } else {
    // Desmarcamos todo
    tempSelection.value.clear()
  }
}

function clearSearch() {
  searchQuery.value = ''
  if (isRemote.value) fetchRemoteData('')
}

function onSearchInput() {
  if (isRemote.value) queueRemoteSearch()
}

function queueRemoteSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const query = searchQuery.value.trim()
    if (query.length >= props.minSearchChars) {
      fetchRemoteData(query)
    } else if (query.length === 0) {
      fetchRemoteData('')
    }
  }, props.debounceMs)
}

async function fetchRemoteData(query) {
  if (!props.fetcher) return
  loading.value = true
  emit('search', query)
  try {
    const result = await props.fetcher(query)
    remoteItems.value = Array.isArray(result) ? result : []
    // El watcher de remoteItems actualizará el cache automáticamente
  } catch (error) {
    console.error('MultiSelect fetch error:', error)
    remoteItems.value = []
  } finally {
    loading.value = false
  }
}

function acceptSelection() {
  const selectedIds = Array.from(tempSelection.value)

  // Reconstruimos los objetos completos usando la Memoria (Cache)
  // Esto evita que se pierdan los nombres si el item no está en la búsqueda actual
  const selectedObjects = selectedIds.map(id => {
    const cachedItem = internalCache.value.get(id)

    if (cachedItem) {
      return {
        value: cachedItem[props.valueKey],
        label: cachedItem[props.labelKey]
      }
    }

    // Fallback extremo (solo si algo falló con el caché)
    return {
      value: id,
      label: String(id) // Aquí es donde salían los números antes
    }
  })

  emit('update:modelValue', selectedObjects)
  emit('change', selectedObjects)
  modalOpen.value = false
}

// --- Hover Logic ---
function onMouseEnter() {
  if (props.disabled || selected.value.length === 0) return
  if (closeTimer) clearTimeout(closeTimer)
  calculateHoverPosition()
  showHoverList.value = true
}
function onMouseLeave() {
  closeTimer = setTimeout(() => { showHoverList.value = false }, 300)
}
function onMouseEnterList() { if (closeTimer) clearTimeout(closeTimer) }
function onMouseLeaveList() { closeTimer = setTimeout(() => { showHoverList.value = false }, 300) }

function calculateHoverPosition() {
  if (!controlRef.value) return
  const rect = controlRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  hoverListPosition.value = spaceBelow < 200 ? 'top' : 'bottom'
}

function handleEscape(e) {
  if (e.key === 'Escape' && modalOpen.value) closeModal()
}

onMounted(() => { document.addEventListener('keydown', handleEscape) })
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
/* Los estilos se mantienen EXACTAMENTE IGUALES a la versión "Clean Professional" anterior.
   Cópialos tal cual de mi respuesta previa para no duplicar texto innecesariamente.
   Incluyen .multi-select-wrapper, .modern-header, .modern-row, etc.
*/
/* =========================================
   1. CONTROL PRINCIPAL (INPUT)
   ========================================= */
.multi-select-wrapper {
  position: relative;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.multi-select-control {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 2.5rem 0.375rem 0.75rem;
  background: #ffffff;
  border: 1px solid #d1d5db; /* Borde gris suave */
  border-radius: 6px; /* Radio moderado */
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 38px;
  font-size: 0.95rem;
  color: #374151;
}

.multi-select-control:hover:not(.is-disabled) {
  border-color: #0f62fe; /* Azul corporativo al hover */
}

.multi-select-control.is-disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  color: #9ca3af;
}

/* Placeholders y Textos */
.control-placeholder { color: #6b7280; }
.control-value { color: #111827; font-weight: 500; }
.control-icon {
  position: absolute;
  right: 0.75rem;
  color: #9ca3af;
  pointer-events: none;
}
.control-hint {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #6b7280;
}

/* =========================================
   2. LISTA FLOTANTE (TOOLTIP HOVER)
   ========================================= */
.hover-list {
  position: absolute;
  left: 0;
  width: 100%;
  min-width: 250px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
  padding: 0;
  pointer-events: auto; /* Permite scroll */
}

.hover-list.pos-bottom { top: calc(100% + 4px); }
.hover-list.pos-top { bottom: calc(100% + 4px); }

.hover-list-content {
  max-height: 220px;
  overflow-y: auto;
}

.hover-item {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}
.hover-item:last-child { border-bottom: none; }

.hover-more {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: #6b7280;
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

/* Transiciones Tooltip */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }


/* =========================================
   3. MODAL (DISEÑO FORMAL/PROFESIONAL)
   ========================================= */

/* Overlay Oscuro y Serio */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5); /* Más oscuro para enfoque */
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  padding: 1rem;
}

/* Contenedor Estructurado */
.modal-container {
  background: #ffffff;
  border-radius: 8px; /* Bordes menos redondeados = más formal */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

/* --- Header --- */
.modern-header {
  background: #ffffff;
  padding: 1.25rem 1.5rem 0.75rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modern-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modern-close-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.modern-close-btn:hover { color: #111827; }

/* --- Search (Estilo Input Formal) --- */
.modern-search-wrapper { margin-bottom: 0.75rem; }

.search-pill {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px; /* Coincide con el input principal */
  padding: 0.5rem 0.75rem;
  transition: all 0.2s;
}

.search-pill:focus-within {
  border-color: #0f62fe;
  box-shadow: 0 0 0 1px #0f62fe;
}

.search-icon { color: #9ca3af; margin-right: 0.5rem; font-size: 0.9rem; }

.search-input-transparent {
  border: none;
  background: transparent;
  width: 100%;
  font-size: 0.9rem;
  color: #1f2937;
  outline: none;
}

.search-clear-mini {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
}
.search-clear-mini:hover { color: #4b5563; }

/* --- Toolbar (Contadores y Acciones) --- */
.modern-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.813rem;
  padding-top: 0.25rem;
}

.selection-count {
  font-weight: 600;
  color: #0f62fe; /* Azul corporativo */
}

.toolbar-actions { display: flex; gap: 1rem; }

.text-btn {
  background: none;
  border: none;
  font-size: 0.813rem;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}
.text-btn:hover:not(:disabled) { color: #0f62fe; }
.text-btn:disabled { opacity: 0.4; cursor: default; }
.text-btn.text-danger:hover:not(:disabled) { color: #dc2626; }

/* --- Body (Lista) --- */
.modern-body {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb; /* Fondo ligeramente gris para contraste */
}

.modern-list { padding: 0.5rem 0; }

.modern-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  background: #ffffff;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

.modern-row:hover { background-color: #f3f4f6; }
.modern-row.is-active { background-color: #eff6ff; } /* Fondo azul muy muy suave */

.row-content { flex: 1; padding-right: 1rem; }
.row-title { font-size: 0.9rem; color: #374151; font-weight: 500; }
.modern-row.is-active .row-title { color: #0f62fe; font-weight: 600; }
.row-subtitle { font-size: 0.75rem; color: #6b7280; }

.hidden-checkbox { display: none; }

.row-check-indicator {
  font-size: 1.1rem;
  color: #d1d5db; /* Gris apagado cuando no seleccionado */
}
.modern-row.is-active .row-check-indicator { color: #0f62fe; }

/* --- Footer --- */
.modern-footer {
  padding: 1rem 1.5rem;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end; /* Botones a la derecha (estándar profesional) */
  gap: 0.75rem;
}

.btn-modern-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-modern-cancel:hover { background: #f9fafb; border-color: #9ca3af; }

.btn-modern-accept {
  padding: 0.5rem 1.25rem;
  border: none;
  background: #0f62fe; /* Azul corporativo */
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: background 0.2s;
}
.btn-modern-accept:hover { background: #0043ce; }

/* --- States (Loading/Empty) --- */
.modern-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #6b7280;
  gap: 0.75rem;
}
.empty-icon { font-size: 1.5rem; opacity: 0.6; }
.spinner-modern {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top-color: #0f62fe;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Animaciones Modal */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.modal-slide-enter-active, .modal-slide-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.modal-slide-enter-from { opacity: 0; transform: translateY(-10px) scale(0.98); }
.modal-slide-leave-to { opacity: 0; transform: translateY(10px) scale(0.98); }

.scale-check-enter-active { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.scale-check-enter-from { transform: scale(0.5); opacity: 0; }

@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbar Fino */
.modern-body::-webkit-scrollbar { width: 6px; }
.modern-body::-webkit-scrollbar-track { background: transparent; }
.modern-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.modern-body::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
</style>
