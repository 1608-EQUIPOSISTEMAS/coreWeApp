<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="modal-overlay"
      :class="{ 'overlay-scroll': overflowMode === 'overlay' }"
    >
      <!-- @click.self="$emit('update:modelValue', false)" -->
      <div
        class="modal-card"
        :class="[sizeClass, { 'card-overflow-visible': overflowMode === 'overlay' }]"
      >
        <div v-if="showHeader" class="modal-header">
          <span>{{ title }}</span>
          <button class="btn-close" @click="$emit('update:modelValue', false)">×</button>
        </div>

        <div class="modal-body" :class="{ 'body-overflow-visible': overflowMode === 'overlay' }">
          <slot />
        </div>

        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </teleport>

</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  showHeader: { type: Boolean, default: true },
  size: { type: String, default: 'md' },          // sm | md | lg | xl
  overflowMode: { type: String, default: 'card' } // 'card' (actual) | 'overlay'
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'modal-sm'
    case 'lg': return 'modal-lg'
    case 'xl': return 'modal-xl'
    default:   return 'modal-md'
  }
})

// lock scroll body
const originalOverflow = document.body.style.overflow || ''
watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : originalOverflow
}, { immediate: true })
onBeforeUnmount(() => { document.body.style.overflow = originalOverflow })
</script>


<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

/* cuando el scroll vive en el overlay */
.overlay-scroll { overflow: auto; }

.modal-card {
  background: #fff;
  border-radius: .5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 40px rgba(0,0,0,.18);
  width: 100%;
  max-height: 90vh;          /* modo por defecto */
  overflow-y: auto;          /* modo por defecto */
  display: flex;
  flex-direction: column;
}

/* permitir que dropdowns “salgan” del body/card */
.card-overflow-visible {
  overflow: visible;
  max-height: calc(100vh - 2rem); /* mantiene tope visual */
}
.body-overflow-visible {
  overflow: visible;
}

.modal-sm { max-width: 420px; }
.modal-md { max-width: 560px; }
.modal-lg { max-width: 780px; }
.modal-xl { max-width: 1080px; }

.modal-header { display:flex; justify-content:space-between; align-items:center;
  padding:.75rem 1rem; border-bottom:1px solid #e5e7eb; font-weight:600; }
.modal-body { padding:1rem; }
.modal-footer { padding:.75rem 1rem; border-top:1px solid #e5e7eb; display:flex; gap:.5rem; justify-content:flex-end; }
.btn-close { background:transparent; border:none; font-size:1.1rem; cursor:pointer; color:#6b7280; }

</style>
