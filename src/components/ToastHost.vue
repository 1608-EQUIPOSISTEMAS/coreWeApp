<template>
  <div class="toast-host">
    <transition-group name="toast" tag="div">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
        @mouseenter="pause(t.id)"
        @mouseleave="resume(t.id)"
      >
        <div class="toast-title">{{ t.title }}</div>
        <div v-if="t.message" class="toast-msg">{{ t.message }}</div>
        <button class="toast-close" @click="remove(t.id)">×</button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToasts } from '@/composables/useToasts.js' // ajusta la ruta
const { toasts, remove } = useToasts()

// (opcional) si quieres pausar el autohide al pasar el mouse:
function pause() {}   // tu bus no trackea timers por toast, así que no hacemos nada aquí
function resume() {}
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Card base */
.toast {
  min-width: 260px;
  max-width: 420px;
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,.12);
  background: #fff;
  border-left: 6px solid #999;
  position: relative;
}

.toast-title { font-weight: 700; margin-bottom: 4px; }
.toast-msg { opacity: .9; }

/* Tipos */
.toast--success { border-color: #16a34a; }
.toast--danger  { border-color: #dc2626; }
.toast--warning { border-color: #f59e0b; }
.toast--info    { border-color: #2563eb; }

/* Botón cerrar */
.toast-close {
  position: absolute;
  top: 6px; right: 8px;
  background: transparent; border: 0; font-size: 18px; cursor: pointer;
}

/* Animaciones */
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }
.toast-enter-active, .toast-leave-active { transition: all .18s ease; }
</style>
