<template>
  <div class="column-filter-wrapper" ref="filterRef">
    <!-- Trigger Button -->
    <button
      type="button"
      class="filter-trigger-btn"
      :class="{ 'has-filters': selectedValues.length > 0 }"
      @click.stop="toggleDropdown"
      :title="`Filtrar ${columnLabel}`"
    >
      <i class="fa-solid fa-filter"></i>
      <span v-if="selectedValues.length > 0" class="filter-badge">
        {{ selectedValues.length }}
      </span>
    </button>

    <!-- Dropdown Panel -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="filter-dropdown-panel"
        :style="dropdownStyle"
        @click.stop
      >
<!-- Reemplazar la sección .filter-header actual -->
<div class="filter-header">
  <input
    ref="searchInput"
    v-model="searchTerm"
    type="text"
    class="filter-search-input"
    placeholder="Buscar..."
    @input="onSearchInput"
  />
  
  <!-- NUEVO: Botones de acción rápida -->
  <div class="quick-actions">
    <button 
      type="button" 
      class="quick-action-btn"
      @click="selectAll"
      :disabled="filteredOptions.length === 0"
    >
      <i class="fa-solid fa-check-double"></i>
      Todos
    </button>
    <button 
      type="button" 
      class="quick-action-btn"
      @click="selectNone"
      :disabled="tempSelected.length === 0"
    >
      <i class="fa-solid fa-xmark"></i>
      Ninguno
    </button>
  </div>
</div>

        <!-- Lista de opciones -->
        <div class="filter-options-list">
          <label
            v-for="option in filteredOptions"
            :key="option.value"
            class="filter-option-item"
          >
            <input
              type="checkbox"
              :checked="tempSelected.includes(option.value)"
              @change="toggleOption(option.value)"
            />
            <span class="option-label">{{ option.label }}</span>
            <span class="option-count">({{ option.count }})</span>
          </label>

          <div v-if="filteredOptions.length === 0" class="no-results">
            <i class="fa-solid fa-search"></i>
            <span>No se encontraron resultados</span>
          </div>
        </div>

        <!-- Footer con acciones -->
        <div class="filter-footer">
          <button
            type="button"
            class="btn-filter-action btn-cancel"
            @click="cancel"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-filter-action btn-accept"
            @click="apply"
          >
            Aceptar
          </button>
        </div>
      </div>

      <!-- Overlay para cerrar al hacer click fuera -->
      <div
        v-if="isOpen"
        class="filter-overlay"
        @click="cancel"
      ></div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  columnLabel: {
    type: String,
    required: true
  },
  allItems: {
    type: Array,
    required: true
  },
  valueExtractor: {
    type: Function,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'apply'])

// Estado interno
const isOpen = ref(false)
const searchTerm = ref('')
const tempSelected = ref([...props.modelValue])
const filterRef = ref(null)
const searchInput = ref(null)
const dropdownStyle = ref({})

// Valores únicos de la columna
const uniqueOptions = computed(() => {
  const countMap = new Map()
  
  props.allItems.forEach(item => {
    const value = props.valueExtractor(item)
    const stringValue = value === null || value === undefined ? '(Vacío)' : String(value).trim()
    
    if (countMap.has(stringValue)) {
      countMap.set(stringValue, countMap.get(stringValue) + 1)
    } else {
      countMap.set(stringValue, 1)
    }
  })

  return Array.from(countMap.entries())
    .map(([value, count]) => ({
      value,
      label: value || '(Vacío)',
      count
    }))
    .sort((a, b) => {
      // Ordenar: primero los seleccionados, luego alfabéticamente
      const aSelected = tempSelected.value.includes(a.value)
      const bSelected = tempSelected.value.includes(b.value)
      
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return a.label.localeCompare(b.label)
    })
})

// Opciones filtradas por búsqueda
const filteredOptions = computed(() => {
  if (!searchTerm.value.trim()) return uniqueOptions.value
  
  const search = searchTerm.value.toLowerCase()
  return uniqueOptions.value.filter(opt =>
    opt.label.toLowerCase().includes(search)
  )
})

const selectedValues = computed(() => props.modelValue)

// Abrir/Cerrar dropdown
function toggleDropdown() {
  isOpen.value = !isOpen.value
  
  if (isOpen.value) {
    tempSelected.value = [...props.modelValue]
    searchTerm.value = ''
    nextTick(() => {
      calculatePosition()
      searchInput.value?.focus()
    })
  }
}

// Calcular posición del dropdown (tipo Google Sheets)
function calculatePosition() {
  if (!filterRef.value) return
  
  const rect = filterRef.value.getBoundingClientRect()
  const panelWidth = 280
  const panelHeight = 350
  
  let top = rect.bottom + 5
  let left = rect.left
  
  // Ajustar si se sale por la derecha
  if (left + panelWidth > window.innerWidth) {
    left = window.innerWidth - panelWidth - 10
  }
  
  // Ajustar si se sale por abajo
  if (top + panelHeight > window.innerHeight) {
    top = rect.top - panelHeight - 5
  }
  
  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

// Toggle de opción
function toggleOption(value) {
  const index = tempSelected.value.indexOf(value)
  if (index > -1) {
    tempSelected.value.splice(index, 1)
  } else {
    tempSelected.value.push(value)
  }
}

// Aplicar filtro
function apply() {
  emit('update:modelValue', [...tempSelected.value])
  emit('apply', tempSelected.value)
  isOpen.value = false
}

// Cancelar
function cancel() {
  tempSelected.value = [...props.modelValue]
  searchTerm.value = ''
  isOpen.value = false
}

// Limpiar búsqueda al escribir
function onSearchInput() {
  // Lógica adicional si es necesaria
}

// Cerrar con ESC
function handleEscape(e) {
  if (e.key === 'Escape' && isOpen.value) {
    cancel()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', calculatePosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', calculatePosition)
})

// Watch para recalcular posición si se abre
watch(isOpen, (newVal) => {
  if (newVal) {
    nextTick(calculatePosition)
  }
})
// Agregar después de la función onSearchInput()

// Seleccionar todos los filtrados
function selectAll() {
  const allValues = filteredOptions.value.map(opt => opt.value)
  // Combinamos con los ya seleccionados que no están en la búsqueda actual
  const existingOthers = tempSelected.value.filter(
    val => !filteredOptions.value.some(opt => opt.value === val)
  )
  tempSelected.value = [...new Set([...existingOthers, ...allValues])]
}

// Deseleccionar todos
function selectNone() {
  // Si hay búsqueda activa, solo limpiamos los filtrados
  if (searchTerm.value.trim()) {
    const filteredValues = filteredOptions.value.map(opt => opt.value)
    tempSelected.value = tempSelected.value.filter(
      val => !filteredValues.includes(val)
    )
  } else {
    // Si no hay búsqueda, limpiamos todo
    tempSelected.value = []
  }
}
</script>

<style scoped>
.column-filter-wrapper {
  position: relative;
  display: inline-block;
}

/* Botón Trigger */
.filter-trigger-btn {
  background: transparent;
  border: 1px solid transparent;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.85rem;
  transition: all 0.2s;
  position: relative;
}

.filter-trigger-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: #d1d5db;
  color: #374151;
}

.filter-trigger-btn.has-filters {
  color: #2563eb;
  background: #eff6ff;
  border-color: #93c5fd;
}

.filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

/* Overlay */
.filter-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: transparent;
}

/* Panel Dropdown */
.filter-dropdown-panel {
  position: fixed;
  z-index: 9999;
  width: 280px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  max-height: 400px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.filter-header {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.filter-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
}

.filter-search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Lista de opciones */
.filter-options-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 250px;
}

.filter-option-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}

.filter-option-item:hover {
  background: #f9fafb;
}

.filter-option-item input[type="checkbox"] {
  margin-right: 10px;
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.option-label {
  flex: 1;
  font-size: 0.875rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-count {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-left: 8px;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 0.875rem;
  gap: 8px;
}

.no-results i {
  font-size: 2rem;
  opacity: 0.5;
}

/* Footer */
.filter-footer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
}

.btn-filter-action {
  flex: 1;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-cancel {
  background: white;
  color: #6b7280;
  border-color: #d1d5db;
}

.btn-cancel:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-accept {
  background: #10b981;
  color: white;
}

.btn-accept:hover {
  background: #059669;
}

/* Scrollbar personalizado */
.filter-options-list::-webkit-scrollbar {
  width: 6px;
}

.filter-options-list::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.filter-options-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.filter-options-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
/* REEMPLAZAR los estilos del botón trigger */
.filter-trigger-btn {
  background: transparent;
  border: 1px solid transparent;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.85rem;
  transition: all 0.2s;
  position: relative;
}

.filter-trigger-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #1f2937;
}

.filter-trigger-btn.has-filters {
  color: #1e40af; /* Azul más oscuro */
  background: #dbeafe; /* Azul muy claro */
  border-color: #3b82f6;
}

.filter-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #1e40af; /* Azul oscuro en vez de rojo */
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

/* AGREGAR estilos para botones de acción rápida */
.quick-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.quick-action-btn {
  flex: 1;
  padding: 6px 10px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.quick-action-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
  color: #1f2937;
}

.quick-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quick-action-btn i {
  font-size: 0.7rem;
}

/* REEMPLAZAR estilos del botón Aceptar (verde → azul) */
.btn-accept {
  background: #2563eb; /* Azul en vez de verde */
  color: white;
  border: 1px solid #2563eb;
}

.btn-accept:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

/* MEJORAR feedback visual del checkbox */
.filter-option-item input[type="checkbox"]:checked {
  accent-color: #2563eb; /* Azul consistente */
}
/* Estilos adicionales para el footer mejorado */
.filter-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
}

.selection-count {
  font-size: 0.75rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.selection-count i {
  color: #2563eb;
  font-size: 0.7rem;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .filter-trigger-btn { color: #A0A099; }
[data-coreui-theme="dark"] .filter-trigger-btn:hover {
  background: #2A2A22;
  border-color: #3A3A33;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .filter-trigger-btn.has-filters {
  background: rgba(16,185,129,0.16);
  border-color: rgba(16,185,129,0.4);
  color: #34D399;
}
[data-coreui-theme="dark"] .filter-badge { background: #10B981; }
[data-coreui-theme="dark"] .filter-dropdown-panel {
  background: #1A1A14;
  border-color: #2A2A22;
  box-shadow: 0 12px 32px -12px rgba(0,0,0,0.6);
}
[data-coreui-theme="dark"] .filter-header { border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .filter-search-input {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .filter-search-input::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .filter-search-input:focus {
  border-color: #34D399;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.18);
}
[data-coreui-theme="dark"] .quick-action-btn {
  background: #14140F;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .quick-action-btn:hover:not(:disabled) {
  background: #2A2A22;
  border-color: #3A3A33;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .filter-option-item:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .option-label { color: #D4D4CC; }
[data-coreui-theme="dark"] .option-count { color: #6F6F66; }
[data-coreui-theme="dark"] .no-results { color: #6F6F66; }
[data-coreui-theme="dark"] .filter-footer {
  background: #1F1F1A;
  border-top-color: #2A2A22;
}
[data-coreui-theme="dark"] .btn-cancel {
  background: #14140F;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .btn-cancel:hover {
  background: #2A2A22;
  border-color: #3A3A33;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .filter-options-list::-webkit-scrollbar-track { background: #1F1F1A; }
[data-coreui-theme="dark"] .filter-options-list::-webkit-scrollbar-thumb { background: #3A3A33; }
</style>