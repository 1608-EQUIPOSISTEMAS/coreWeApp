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
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #F5F3FF;
  border: 1px solid #DDD6FE;
  border-radius: 8px;
}

.eo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}

.eo-item > i { color: #7C3AED; font-size: 13px; }
.eo-label { color: #9CA3AF; font-weight: 600; }
.eo-value { color: #111827; font-weight: 700; }
.eo-mono { font-family: 'JetBrains Mono', monospace; letter-spacing: .02em; }
.eo-muted { color: #9CA3AF; font-style: italic; font-weight: 500; }

.eo-toggle {
  background: none;
  border: none;
  color: #7C3AED;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all .15s;
}
.eo-toggle:hover { background: #EDE9FE; }
</style>
