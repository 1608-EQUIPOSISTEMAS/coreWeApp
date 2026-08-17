<template>
  <div class="column-filter-wrapper" ref="filterRef">
    <!-- Caja identica a la del MultiSelect: es el unico disparador de filtro
         del ERP, no un icono suelto. -->
    <div
      class="ms-trigger"
      :class="{ 'is-open': isOpen, 'has-selection': selectedValues.length > 0 }"
      :title="`Filtrar ${columnLabel}`"
      @click.stop="toggleDropdown"
    >
      <div class="trigger-content">
        <span v-if="selectedValues.length === 0" class="placeholder-text">{{ columnLabel }}...</span>
        <span v-else class="value-text">
          <span class="badge-count">{{ selectedValues.length }}</span>
          <span class="badge-label">{{ selectedValues.length === 1 ? 'opción' : 'opciones' }}</span>
        </span>
      </div>

      <div class="trigger-actions">
        <button
          v-if="selectedValues.length > 0"
          type="button"
          class="btn-quick-clear"
          title="Limpiar selección"
          @click.stop="clearSelection"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
        <i class="fa-solid fa-filter trigger-icon" :class="{ active: isOpen || selectedValues.length > 0 }"></i>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="dropdown">
        <div v-if="isOpen" class="ms-dropdown" :style="dropdownStyle" @click.stop>
          <div class="dropdown-header">
            <div class="search-wrap">
              <input
                ref="searchInput"
                v-model="searchTerm"
                type="text"
                class="search-input"
                :placeholder="`Filtrar ${columnLabel.toLowerCase()}...`"
              />
              <button v-if="searchTerm" class="btn-input-clear" @click="clearSearch">
                <i class="fa-solid fa-circle-xmark"></i>
              </button>
            </div>

            <div class="toolbar-row">
              <span class="selection-status">
                <span class="count-pill">{{ tempSelected.length }}</span>
                seleccionados
              </span>
              <div class="toolbar-buttons">
                <button class="btn-pill" :disabled="filteredOptions.length === 0" @click="selectAll">
                  Todos
                </button>
                <button class="btn-pill outline" :disabled="tempSelected.length === 0" @click="selectNone">
                  Ninguno
                </button>
              </div>
            </div>
          </div>

          <div class="dropdown-body">
            <div v-if="filteredOptions.length === 0" class="state-container">
              <i class="fa-regular fa-folder-open"></i>
              <span>Sin resultados</span>
            </div>

            <div
              v-for="option in filteredOptions"
              :key="option.value"
              class="list-row"
              :class="{ 'is-selected': tempSelected.includes(option.value) }"
              @click="toggleOption(option.value)"
            >
              <div class="row-click-area">
                <div class="custom-checkbox" :class="{ 'is-checked': tempSelected.includes(option.value) }">
                  <span class="checkmark"><i class="fa-solid fa-check"></i></span>
                </div>
                <span class="row-label">{{ option.label }}</span>
              </div>
              <span v-if="option.count != null" class="row-count">{{ option.count }}</span>
            </div>
          </div>

          <div class="dropdown-footer">
            <button class="btn-cancel" @click="cancel">Cancelar</button>
            <button class="btn-apply" @click="apply">Aplicar</button>
          </div>
        </div>
      </Transition>

      <div v-if="isOpen" class="filter-overlay" @click="cancel"></div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  columnLabel: { type: String, required: true },
  allItems: { type: Array, required: true },
  valueExtractor: { type: Function, required: true },
  modelValue: { type: Array, default: () => [] },
  fixedOptions: { type: Array, default: null },
})

const emit = defineEmits(['update:modelValue', 'apply'])

const isOpen = ref(false)
const searchTerm = ref('')
const tempSelected = ref([...props.modelValue])
const filterRef = ref(null)
const searchInput = ref(null)
const dropdownStyle = ref({})

const selectedValues = computed(() => props.modelValue)

// Los seleccionados suben al tope para no perderlos de vista al scrollear.
function bySelectedThenLabel(a, b) {
  const aSel = tempSelected.value.includes(a.value)
  const bSel = tempSelected.value.includes(b.value)
  if (aSel !== bSel) return aSel ? -1 : 1
  return a.label.localeCompare(b.label)
}

const uniqueOptions = computed(() => {
  // Lista fija (modo server-side): no se cuentan ocurrencias porque la pagina
  // visible no representa al universo de datos.
  if (Array.isArray(props.fixedOptions) && props.fixedOptions.length > 0) {
    return props.fixedOptions
      .map((opt) => typeof opt === 'string'
        ? { value: opt, label: opt, count: null }
        : { value: opt.value, label: opt.label || opt.value, count: opt.count ?? null })
      .sort(bySelectedThenLabel)
  }

  const countMap = new Map()
  props.allItems.forEach((item) => {
    const raw = props.valueExtractor(item)
    const value = raw === null || raw === undefined ? '(Vacío)' : String(raw).trim()
    countMap.set(value, (countMap.get(value) || 0) + 1)
  })

  return Array.from(countMap.entries())
    .map(([value, count]) => ({ value, label: value || '(Vacío)', count }))
    .sort(bySelectedThenLabel)
})

const filteredOptions = computed(() => {
  const search = searchTerm.value.trim().toLowerCase()
  if (!search) return uniqueOptions.value
  return uniqueOptions.value.filter((opt) => opt.label.toLowerCase().includes(search))
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return
  tempSelected.value = [...props.modelValue]
  searchTerm.value = ''
  nextTick(() => {
    calculatePosition()
    searchInput.value?.focus()
  })
}

function calculatePosition() {
  if (!filterRef.value) return

  const rect = filterRef.value.getBoundingClientRect()
  const panelWidth = 280
  const panelHeight = 380

  let top = rect.bottom + 5
  let left = rect.left
  if (left + panelWidth > window.innerWidth) left = window.innerWidth - panelWidth - 10
  if (top + panelHeight > window.innerHeight) top = Math.max(8, rect.top - panelHeight - 5)

  dropdownStyle.value = { top: `${top}px`, left: `${left}px` }
}

function toggleOption(value) {
  const index = tempSelected.value.indexOf(value)
  if (index > -1) tempSelected.value.splice(index, 1)
  else tempSelected.value.push(value)
}

function selectAll() {
  const visible = filteredOptions.value.map((opt) => opt.value)
  tempSelected.value = [...new Set([...tempSelected.value, ...visible])]
}

// Con busqueda activa solo limpia lo visible: "Ninguno" no debe borrar
// seleccionados que la busqueda esta ocultando.
function selectNone() {
  if (!searchTerm.value.trim()) {
    tempSelected.value = []
    return
  }
  const visible = filteredOptions.value.map((opt) => opt.value)
  tempSelected.value = tempSelected.value.filter((val) => !visible.includes(val))
}

function clearSearch() {
  searchTerm.value = ''
  searchInput.value?.focus()
}

function apply() {
  emit('update:modelValue', [...tempSelected.value])
  emit('apply', tempSelected.value)
  isOpen.value = false
}

// La "x" del trigger limpia sin abrir el panel: es un atajo, no una edicion.
function clearSelection() {
  tempSelected.value = []
  emit('update:modelValue', [])
  emit('apply', [])
}

function cancel() {
  tempSelected.value = [...props.modelValue]
  searchTerm.value = ''
  isOpen.value = false
}

function handleEscape(e) {
  if (e.key === 'Escape' && isOpen.value) cancel()
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', calculatePosition)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', calculatePosition)
})

watch(isOpen, (open) => {
  if (open) nextTick(calculatePosition)
})
</script>

<style scoped>
/*
 * El panel replica al pie de la letra a MultiSelect.vue: es el unico diseño de
 * filtro del ERP. Si se toca uno, se toca el otro.
 *
 * Colores hardcodeados a proposito (misma razon que MultiSelect): <Teleport to="body">
 * saca el panel del arbol del componente, asi que no hereda variables CSS.
 * Paleta:  Navy #002060 | Dark #001540 | BG #eff6ff
 */

.column-filter-wrapper {
  position: relative;
  width: 100%;
  min-width: 0;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* ── Trigger ──
   30px para calzar con los <input> de las filas de filtro; overflow:hidden
   para que una etiqueta larga recorte en vez de ensanchar la columna. */
.ms-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.ms-trigger:hover { border-color: #002060; background: #f8fafc; }
.ms-trigger.is-open,
.ms-trigger.has-selection {
  border-color: #002060;
  box-shadow: 0 0 0 3px rgba(0, 32, 96, 0.1);
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
  font-size: 0.75rem;
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
.badge-count {
  background: #002060;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.badge-label {
  color: #1e293b;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.btn-quick-clear {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 2px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.btn-quick-clear:hover { background: #f1f5f9; color: #ef4444; }

.trigger-icon {
  color: #94a3b8;
  font-size: 0.7rem;
  transition: color 0.2s;
  flex-shrink: 0;
}
.trigger-icon.active { color: #002060; }

.filter-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;
  background: transparent;
}

/* ── Panel ── */
.ms-dropdown {
  position: fixed;
  z-index: 99999;
  width: 280px;
  max-height: 380px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.12), 0 2px 6px -2px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
.search-input {
  width: 100%;
  padding: 8px 32px 8px 10px;
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
.btn-pill:hover:not(:disabled) { background: #002060; color: #ffffff; }
.btn-pill.outline { background: transparent; border: 1px solid #cbd5e1; }
.btn-pill.outline:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
  background: #ffffff;
}
.btn-pill:disabled { opacity: 0.4; cursor: default; }

/* ── Lista ── */
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

.list-row {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background 0.1s;
  border-left: 3px solid transparent;
  user-select: none;
}
.list-row:hover { background: #f8fafc; }
.list-row.is-selected {
  background: #eff6ff;
  border-left-color: #002060;
}
.list-row + .list-row { border-top: 1px solid #f8fafc; }

.row-click-area {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 7px 10px;
  gap: 8px;
  min-width: 0;
}

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
.list-row:hover .checkmark { border-color: #002060; }
.custom-checkbox.is-checked .checkmark {
  background: #002060;
  border-color: #002060;
}
.custom-checkbox.is-checked .checkmark i { transform: scale(1); }

.row-label {
  flex: 1;
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
.row-count {
  font-size: 0.7rem;
  color: #94a3b8;
  padding-right: 10px;
  flex-shrink: 0;
}

/* ── Footer ── */
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
.btn-apply:hover { background: #001540; border-color: #001540; }

.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

/* ═══════════ DARK MODE ═══════════ */
[data-coreui-theme="dark"] .ms-trigger { background: #1A1A14; border-color: #3A3A33; }
[data-coreui-theme="dark"] .ms-trigger:hover { border-color: #8FAADC; background: #1F1F1A; }
[data-coreui-theme="dark"] .ms-trigger.is-open,
[data-coreui-theme="dark"] .ms-trigger.has-selection {
  border-color: #8FAADC;
  box-shadow: 0 0 0 3px rgba(143, 170, 220, 0.15);
}
[data-coreui-theme="dark"] .placeholder-text { color: #8A8A80; }
[data-coreui-theme="dark"] .badge-count { background: #8FAADC; color: #14140F; }
[data-coreui-theme="dark"] .badge-label { color: #F4F4F0; }
[data-coreui-theme="dark"] .btn-quick-clear { color: #8A8A80; }
[data-coreui-theme="dark"] .btn-quick-clear:hover { background: #24241E; color: #F87171; }
[data-coreui-theme="dark"] .trigger-icon { color: #8A8A80; }
[data-coreui-theme="dark"] .trigger-icon.active { color: #8FAADC; }

[data-coreui-theme="dark"] .ms-dropdown {
  background: #1A1A14;
  border-color: #3A3A33;
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.35);
}
[data-coreui-theme="dark"] .dropdown-header { background: #1A1A14; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .search-input {
  background: #1F1F1A;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .search-input::placeholder { color: #8A8A80; }
[data-coreui-theme="dark"] .search-input:focus {
  border-color: #8FAADC;
  background: #1A1A14;
  box-shadow: 0 0 0 2px rgba(143, 170, 220, 0.12);
}
[data-coreui-theme="dark"] .btn-input-clear { color: #8A8A80; }
[data-coreui-theme="dark"] .btn-input-clear:hover { color: #C4C4BC; }
[data-coreui-theme="dark"] .selection-status { color: #A0A099; }
[data-coreui-theme="dark"] .count-pill { background: rgba(143, 170, 220, 0.16); color: #8FAADC; }
[data-coreui-theme="dark"] .btn-pill { background: #24241E; color: #A0A099; }
[data-coreui-theme="dark"] .btn-pill:hover:not(:disabled) { background: #8FAADC; color: #14140F; }
[data-coreui-theme="dark"] .btn-pill.outline { background: transparent; border-color: #3A3A33; }
[data-coreui-theme="dark"] .btn-pill.outline:hover:not(:disabled) {
  border-color: #F87171;
  color: #F87171;
  background: #1A1A14;
}
[data-coreui-theme="dark"] .dropdown-body { scrollbar-color: #3A3A33 transparent; }
[data-coreui-theme="dark"] .dropdown-body::-webkit-scrollbar-thumb { background: #3A3A33; }
[data-coreui-theme="dark"] .state-container { color: #A0A099; }
[data-coreui-theme="dark"] .list-row:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .list-row.is-selected {
  background: rgba(143, 170, 220, 0.14);
  border-left-color: #8FAADC;
}
[data-coreui-theme="dark"] .list-row + .list-row { border-top-color: #1F1F1A; }
[data-coreui-theme="dark"] .checkmark { background: #1A1A14; border-color: #8A8A80; }
[data-coreui-theme="dark"] .list-row:hover .checkmark { border-color: #8FAADC; }
[data-coreui-theme="dark"] .custom-checkbox.is-checked .checkmark { background: #8FAADC; border-color: #8FAADC; }
[data-coreui-theme="dark"] .custom-checkbox.is-checked .checkmark i { color: #14140F; }
[data-coreui-theme="dark"] .row-label { color: #F4F4F0; }
[data-coreui-theme="dark"] .list-row.is-selected .row-label { color: #8FAADC; }
[data-coreui-theme="dark"] .row-count { color: #8A8A80; }
[data-coreui-theme="dark"] .dropdown-footer { background: #1F1F1A; border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .btn-cancel { background: #1A1A14; border-color: #3A3A33; color: #A0A099; }
[data-coreui-theme="dark"] .btn-cancel:hover { background: #24241E; color: #F4F4F0; border-color: #8A8A80; }
[data-coreui-theme="dark"] .btn-apply {
  background: #8FAADC;
  border-color: #8FAADC;
  color: #14140F;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}
[data-coreui-theme="dark"] .btn-apply:hover { background: #A9C2E8; border-color: #A9C2E8; }
</style>
