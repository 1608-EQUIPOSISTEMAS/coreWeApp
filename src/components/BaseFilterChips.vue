<template>
  <div v-if="items.length" class="active-filters">
    <span class="label">Filtros:</span>

    <div
      v-for="chip in items"
      :key="chip.key"
      class="chip-wrapper"
    >
      <div
        class="chip"
        @click="$emit('remove', chip.key)"
        @mouseenter="onMouseEnter($event, chip)"
        @mouseleave="onMouseLeave"
        :class="{ 'has-details': chip.details && chip.details.length }"
      >
        <span class="chip-text">{{ chip.label || chip.text }}</span>
        <span class="x">×</span>

        <Transition name="fade">
          <div
            v-if="hoveredChip === chip.key && chip.details && chip.details.length"
            class="chip-dropdown"
            :class="dropdownPosition === 'top' ? 'pos-top' : 'pos-bottom'"
            @click.stop
            @mouseenter="onDropdownEnter"
            @mouseleave="onDropdownLeave"
          >
            <div class="dropdown-content">
              <div v-for="(detail, idx) in chip.details" :key="idx" class="dropdown-item">
                {{ typeof detail === 'object' ? (detail.label || detail.full_name || detail.description) : detail }}
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <button class="chip clear-all" @click="$emit('clear-all')">
      Limpiar todo
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  items: { type: Array, default: () => [] }
})

defineEmits(['remove', 'clear-all'])

// Estado local
const hoveredChip = ref(null)
const dropdownPosition = ref('bottom')
let closeTimer = null // Variable para el temporizador

function onMouseEnter(event, chip) {
  if (!chip.details || chip.details.length === 0) return

  // Si entramos al chip, cancelamos cualquier cierre pendiente
  if (closeTimer) clearTimeout(closeTimer)

  hoveredChip.value = chip.key
  calculatePosition(event.target)
}

function onMouseLeave() {
  // Esperamos 300ms antes de cerrar
  closeTimer = setTimeout(() => {
    hoveredChip.value = null
  }, 300)
}

// --- Lógica para mantener abierto el dropdown al entrar ---
function onDropdownEnter() {
  if (closeTimer) clearTimeout(closeTimer)
}

function onDropdownLeave() {
  closeTimer = setTimeout(() => {
    hoveredChip.value = null
  }, 300)
}

function calculatePosition(targetElement) {
  if (!targetElement) return
  const rect = targetElement.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  dropdownPosition.value = spaceBelow < 180 ? 'top' : 'bottom'
}
</script>

<style scoped>
.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  margin-right: 0.25rem;
}

/* Wrapper para posicionamiento */
.chip-wrapper {
  position: relative;
}

/* CHIP BASE */
.chip {
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #374151;
  border-radius: 6px; /* Menos redondeado para match con estilo profesional */
  padding: 0.35rem 0.75rem;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  user-select: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.chip:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

.chip:hover .x {
  color: #ef4444; /* Rojo al hover */
}

.x {
  margin-left: 0.5rem;
  color: #9ca3af;
  font-size: 1.1em;
  line-height: 1;
  transition: color 0.2s;
}

.chip.clear-all {
  background: transparent;
  border: 1px dashed #d1d5db;
  color: #6b7280;
  box-shadow: none;
}
.chip.clear-all:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

/* DROPDOWN FLOTANTE */
.chip-dropdown {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  min-width: 160px;
  max-width: 260px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 100;
  padding: 0.25rem 0;
  cursor: default;

  /* --- CAMBIO CRÍTICO --- */
  pointer-events: auto; /* Permite click y scroll */
}

/* Posición Abajo */
.chip-dropdown.pos-bottom {
  top: 100%;
  margin-top: 8px;
}
/* Triángulo decorativo arriba */
.chip-dropdown.pos-bottom::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: transparent transparent #ffffff transparent; /* Apunta arriba */
  /* Sombra hack para el triangulo si tiene borde */
  filter: drop-shadow(0 -1px 0 #e5e7eb);
}

/* Posición Arriba */
.chip-dropdown.pos-top {
  bottom: 100%;
  margin-bottom: 8px;
}
.chip-dropdown.pos-top::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: #ffffff transparent transparent transparent; /* Apunta abajo */
  filter: drop-shadow(0 1px 0 #e5e7eb);
}

.dropdown-content {
  max-height: 200px;
  overflow-y: auto;
  /* Scrollbar fino */
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.dropdown-content::-webkit-scrollbar {
  width: 4px;
}
.dropdown-content::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 4px;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  color: #4b5563;
  font-size: 0.8rem;
  text-align: left;
  border-bottom: 1px solid #f9fafb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-item:last-child {
  border-bottom: none;
}
.dropdown-item:hover {
  background-color: #f3f4f6;
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-5px);
}
</style>
