<template>
  <flat-pickr
    v-model="model"
    :config="finalConfig"
    class="base-datepicker-input form-control"
    :required="required"
    v-bind="$attrs"
  />
</template>

<script setup>
import { computed } from 'vue';
import flatPickr from 'vue-flatpickr-component';
import 'flatpickr/dist/flatpickr.css';
import { Spanish } from 'flatpickr/dist/l10n/es.js';

const model = defineModel();

const props = defineProps({
  config: {
    type: Object,
    default: () => ({})
  },
  required: {  // ✅ AÑADIR
    type: Boolean,
    default: false
  }
});

const defaultConfig = {
  altInput: true,
  altFormat: "d/m/Y",
  dateFormat: "Y-m-d",
  locale: Spanish,
  allowInput: true,
  disableMobile: true,
  showMonths: 1,
  altInputClass: 'flatpickr-input form-control',
};

const finalConfig = computed(() => {
  return { ...defaultConfig, ...props.config };
});
</script>

<style scoped>
/* Input del DatePicker - SIN border fijo */
.base-datepicker-input {
  height: 38px !important;
  padding: 0.375rem 0.75rem !important;
  font-size: 1rem !important;
  line-height: 1.5 !important;
  border-radius: 0.25rem !important;
  width: 100% !important;
  background-color: white !important;
  box-sizing: border-box !important;
}

/* Asegurar que el input alternativo también tenga la altura correcta */
:deep(.flatpickr-input) {
  height: 38px !important;
  padding: 0.375rem 0.75rem !important;
  font-size: 1rem !important;
  line-height: 1.5 !important;
}

/* ✅ OPCIONAL: Si quieres que el borde izquierdo se vea en el input visible */
:deep(.flatpickr-input.form-control:required:invalid) {
  border-left-width: 3px !important;
  border-left-color: #f87171 !important;
}

:deep(.flatpickr-input.form-control:required:valid) {
  border-left-width: 3px !important;
  border-left-color: #34d399 !important;
}
</style>
