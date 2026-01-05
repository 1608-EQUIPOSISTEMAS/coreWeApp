<template>
  <flat-pickr
    v-model="model"
    :config="finalConfig"
    class="base-datepicker-input"
    v-bind="$attrs" 
  />
</template>

<script setup>
import { computed } from 'vue';
import flatPickr from 'vue-flatpickr-component';
import 'flatpickr/dist/flatpickr.css';
import { Spanish } from 'flatpickr/dist/l10n/es.js';

// 1. Definimos el modelo (v-model)
const model = defineModel();

// 2. Props para permitir sobreescribir configuraciones desde fuera
const props = defineProps({
  config: {
    type: Object,
    default: () => ({})
  }
});

// 3. Configuración Base (Tu estándar)
const defaultConfig = {
  altInput: true,
  altFormat: "d/m/Y",
  dateFormat: "Y-m-d", 
  locale: Spanish,
  allowInput: true,
  disableMobile: "true" // Recomendado para que en celular no abra el nativo feo
};

// 4. Fusionamos la config base con la que mandes (si mandas alguna)
const finalConfig = computed(() => {
  return { ...defaultConfig, ...props.config };
});
</script>

<style>
/* Ajuste de altura (Tu problema del input alto) */
.base-datepicker-input {
  /* Esto imita un input estándar de Bootstrap o Tailwind */
  height: 38px; 
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  width: 100%;
  background-color: white;
}

/* Si usas Tailwind, puedes aplicar clases directas en el template */
</style>