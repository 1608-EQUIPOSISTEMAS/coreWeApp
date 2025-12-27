<template>
  <div v-if="items.length" class="active-filters">
    <span class="label">Filtros:</span>
    
    <button
      v-for="chip in items"
      :key="chip.key"
      class="chip"
      @click="$emit('remove', chip.key)"
      :title="chip.title"
    >
      {{ chip.text }} <span class="x">×</span>
    </button>
    
    <button class="chip clear-all" @click="$emit('clear-all')">
      Limpiar todo
    </button>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] }
})
defineEmits(['remove', 'clear-all'])
</script>

<style scoped>
/* Pega aquí tus estilos CSS de .active-filters y .chip */
.active-filters { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; align-items: center; }
.active-filters .label { font-size: .8rem; color: #6b7280; margin-right: .25rem; }
.chip { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; border-radius: 999px; padding: .2rem .6rem; font-size: .75rem; cursor: pointer; }
.chip .x { margin-left: .35rem; color: #6b7280; }
.chip.clear-all { background: #fff; }
</style>