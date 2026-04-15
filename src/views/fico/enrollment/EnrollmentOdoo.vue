<template>
  <div v-if="odooEmail" class="eo-bar">
    <div class="eo-item">
      <i class="fa-solid fa-graduation-cap"></i>
      <span class="eo-label">Campus Virtual</span>
      <span class="eo-value">{{ odooEmail }}</span>
    </div>
    <div class="eo-item">
      <i class="fa-solid fa-key"></i>
      <span class="eo-label">Clave</span>
      <template v-if="odooPassword">
        <span v-if="showPass" class="eo-value eo-mono">{{ odooPassword }}</span>
        <span v-else class="eo-value eo-mono">••••••••</span>
        <button class="eo-toggle" @click="showPass = !showPass">
          <i :class="showPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
        </button>
      </template>
      <span v-else class="eo-value eo-muted">Usuario existente</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  odooEmail: { type: String, default: null },
  odooPassword: { type: String, default: null }
})

const showPass = ref(false)
</script>

<style scoped>
.eo-bar {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #F0F0F0;
}

.eo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  padding: 12px 16px;
  border-bottom: 1px solid #F5F5F5;
  overflow: hidden;
}
.eo-item:last-child { border-bottom: none; }

.eo-item > i { color: #8B5CF6; font-size: 13px; opacity: .7; }
.eo-label { color: #A3A3A3; font-weight: 500; font-size: 12px; }
.eo-value { color: #1A1A1A; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.eo-mono { font-family: 'JetBrains Mono', monospace; letter-spacing: .02em; font-size: 12px; }
.eo-muted { color: #C4C4C4; font-style: italic; font-weight: 400; }

.eo-toggle {
  background: none;
  border: none;
  color: #A3A3A3;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all .2s ease;
}
.eo-toggle:hover { background: #F5F5F5; color: #737373; }
</style>
