<template>
  <div v-if="items.length" class="active-filters">
    <span class="label">Filtros:</span>

    <button
      v-for="chip in items"
      :key="chip.key"
      class="chip"
      @click="$emit('remove', chip.key)"
      @mouseenter="onMouseEnter($event, chip)"
      @mouseleave="onMouseLeave"
      :class="{ 'has-details': chip.details && chip.details.length }"
    >
      {{ chip.text }} <span class="x">×</span>

      <Transition name="fade">
        <div
          v-if="hoveredChip === chip.key && chip.details && chip.details.length"
          class="chip-dropdown"
          :class="dropdownPosition === 'top' ? 'pos-top' : 'pos-bottom'"
          @click.stop
        >
          <div class="dropdown-content">
            <div v-for="(detail, idx) in chip.details" :key="idx" class="dropdown-item">
              {{ detail.label }}
            </div>
          </div>
        </div>
      </Transition>
    </button>

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

// Estado local para controlar el hover
const hoveredChip = ref(null)
const dropdownPosition = ref('bottom') // 'top' | 'bottom'

function onMouseEnter(event, chip) {
  // Solo activamos si el chip tiene la propiedad 'details' y no está vacía
  if (!chip.details || chip.details.length === 0) return

  hoveredChip.value = chip.key
  calculatePosition(event.target)
}

function onMouseLeave() {
  hoveredChip.value = null
}

function calculatePosition(targetElement) {
  if (!targetElement) return

  const rect = targetElement.getBoundingClientRect()
  const windowHeight = window.innerHeight
  const spaceBelow = windowHeight - rect.bottom

  // Si hay menos de 150px abajo, mostramos la lista hacia arriba
  if (spaceBelow < 150) {
    dropdownPosition.value = 'top'
  } else {
    dropdownPosition.value = 'bottom'
  }
}
</script>

<style scoped>
.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  margin-bottom: .75rem;
  align-items: center;
}

.active-filters .label {
  font-size: .8rem;
  color: #6b7280;
  margin-right: .25rem;
}

/* CHIP BASE */
.chip {
  position: relative; /* Necesario para que el absolute hijo se posicione respecto al botón */
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  border-radius: 999px;
  padding: .2rem .6rem;
  font-size: .75rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.chip:hover {
  background-color: #e5e7eb;
}

.chip .x {
  margin-left: .35rem;
  color: #6b7280;
  font-weight: bold;
}

.chip.clear-all {
  background: #fff;
}

/* DROPDOWN FLOTANTE */
.chip-dropdown {
  position: absolute;
  left: 50%;
  transform: translateX(-50%); /* Centrado horizontalmente respecto al chip */
  width: max-content;
  min-width: 120px;
  max-width: 200px; /* Límite de ancho */
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
  padding: 0.25rem 0;
  cursor: default; /* Para que no parezca clickeable el fondo */
  pointer-events: none; /* Importante: deja pasar clicks o evita interferir con el remove del padre si se superpone */
}

/* Flechita visual (opcional, estilo tooltip) */
.chip-dropdown::before {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
}

/* Posición Abajo */
.chip-dropdown.pos-bottom {
  top: 100%;
  margin-top: 8px;
}
.chip-dropdown.pos-bottom::before {
  bottom: 100%;
  border-bottom-color: #e5e7eb; /* Color del borde para simular flecha */
}

/* Posición Arriba */
.chip-dropdown.pos-top {
  bottom: 100%;
  margin-bottom: 8px;
}
.chip-dropdown.pos-top::before {
  top: 100%;
  border-top-color: #e5e7eb;
}

.dropdown-content {
  max-height: 150px;
  overflow-y: auto;
}

.dropdown-item {
  padding: 4px 12px;
  color: #4b5563;
  font-size: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-item:last-child {
  border-bottom: none;
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-5px); /* Pequeño movimiento */
}
</style>
