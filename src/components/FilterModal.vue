<template>
  <teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal-card modal-md">
        <div class="modal-header">
          <span>{{ title }}</span>
          <button class="btn-close" @click="close">×</button>
        </div>

        <div class="modal-body">
          <!-- aquí metes los inputs desde el padre -->
          <slot />
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" @click="$emit('clear')">
            Limpiar
          </button>
          <button class="btn btn-primary btn-sm" @click="$emit('apply')">
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Filtros' },
})
const emit = defineEmits(['update:modelValue', 'apply', 'clear'])

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 999; padding: 1rem;
}
.modal-card {
  background: #fff; border-radius: .5rem; border: 1px solid #e5e7eb;
  box-shadow: 0 20px 40px rgba(0,0,0,.18);
  width: 100%; max-height: 90vh; overflow-y: auto;
  display: flex; flex-direction: column;
}
.modal-md { max-width: 560px; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: .75rem 1rem; border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
}
.modal-body { padding: 1rem; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: .5rem;
  padding: .75rem 1rem; border-top: 1px solid #e5e7eb;
}
.btn-close {
  background: transparent; border: none; font-size: 1.1rem; cursor: pointer;
  color: #6b7280;
}

/* ═══════════ DARK MODE ═══════════ */
/* Contenido teleportado a <body>: el atributo de scope viaja con los
   nodos, así que los selectores scoped siguen aplicando. */
[data-coreui-theme="dark"] .modal-overlay { background: rgba(0, 0, 0, .6); }
[data-coreui-theme="dark"] .modal-card {
  background: #1A1A14;
  border-color: #2A2A22;
  box-shadow: 0 20px 40px rgba(0,0,0,.5);
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .modal-header { border-bottom-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .modal-footer { border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .btn-close { color: #A0A099; }
</style>
