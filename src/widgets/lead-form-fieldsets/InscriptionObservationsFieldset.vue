<template>
  <!-- Edita en sitio el objeto reactivo `insc` recibido por :model: mutacion de
       dos vias intencional, espejo del god component. Migrar a defineModel en el
       rewrite de la pagina (gated). -->
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="exec-fieldset mb-3" style="flex:1;min-width:0">
    <h6 class="fieldset-title">Observaciones</h6>
    <textarea
      v-model="model.observacions"
      class="exec-textarea w-100"
      required
      :rows="!isChannelGeneral ? 8 : 2"
      placeholder="Escribe aquí notas adicionales..."
      v-restrict="{ trim: true, max: 500 }"
    ></textarea>
  </div>
</template>

<script setup>
defineProps({
  model: { type: Object, required: true },
  isChannelGeneral: { type: Boolean, default: false }
})
</script>
