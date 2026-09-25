<template>
  <section class="ds-band" :aria-label="`Lectura rápida de ${periodo}`">
    <div v-for="i in items" :key="i.key" class="ds-band-item" :class="i.tone">
      <span class="ds-band-label">{{ i.label }}</span>
      <span class="ds-band-value">{{ i.value }}</span>
      <div v-if="i.bar !== null" class="ds-band-bar"><i :style="{ width: `${Math.max(2, Math.min(i.bar, 1) * 100)}%` }"></i></div>
      <span class="ds-band-text">{{ i.text }}</span>
    </div>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true }, // [{ key, label, value, text, tone, bar }]
  periodo: { type: String, required: true }
})
</script>
