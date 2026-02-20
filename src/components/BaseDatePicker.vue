<template>
  <div class="base-datepicker-wrapper position-relative">
    <flat-pickr
      v-model="model"
      :config="finalConfig"
      :required="required"
      :disabled="disabled"
      v-bind="$attrs"
    />
    
    <button
      v-if="model && !disabled"
      type="button"
      class="btn-clear"
      @mousedown.prevent.stop="clearDate"
      title="Limpiar fecha"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
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
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

// Comprobamos si el usuario configuró el DatePicker en modo "rango"
const isRange = computed(() => props.config.mode === 'range');

const defaultConfig = {
  altInput: true,
  altFormat: "d/m/Y",
  dateFormat: "Y-m-d",
  locale: Spanish,
  disableMobile: true,
  showMonths: 1,
  // Le asignamos una clase específica al input visible (altInput)
  altInputClass: 'exec-flatpickr-input', 
};

const finalConfig = computed(() => {
  return { 
    ...defaultConfig, 
    ...props.config,
    // Si es modo rango, NO permitimos escribir. Si es normal, usamos lo que venga en config o true.
    allowInput: isRange.value ? false : (props.config.allowInput ?? true)
  };
});

function clearDate() {
  model.value = null;
}
</script>
<style scoped>
/* ═══════════════════════════════════════════════
   DISEÑO ESTÁNDAR "EXEC" PARA DATEPICKER
═══════════════════════════════════════════════ */
.base-datepicker-wrapper {
  position: relative;
  width: 100%;
  /* 👇 Anula cualquier estilo de input que herede (como exec-input-light) */
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  height: auto !important;
}

/* Estilo del input visual (creado por flatpickr) */
:deep(.exec-flatpickr-input) {
  height: 38px;
  min-height: 38px;
  padding: 8px 30px 8px 12px; /* 30px de padding derecho para que el texto no pise la "X" */
  font-size: 13px; /* Estándar exec */
  font-family: inherit;
  color: var(--text-primary, #0f172a);
  background-color: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  width: 100%;
  transition: all 0.15s ease-in-out;
  outline: none;
  box-shadow: none !important; /* Fuerza a no tener sombras raras iniciales */
  cursor: pointer;
}

/* Focus: Sombra y color Teal corporativo */
:deep(.exec-flatpickr-input:focus) {
  border-color: var(--teal-500, #12274e) !important;
  box-shadow: 0 0 0 3px rgba(18, 39, 78, 0.1) !important;
  background-color: var(--white, #ffffff) !important;
}

:deep(.exec-flatpickr-input:hover:not(:disabled)) {
  border-color: var(--slate-300, #cbd5e1);
}

/* Flatpickr añade "readonly" cuando allowInput es false. 
   Evitamos que se pinte gris si solo es de lectura por ser modo Rango */
:deep(.exec-flatpickr-input[readonly]:not(:disabled)) {
  background-color: var(--white, #ffffff);
  cursor: pointer;
}

/* Estado bloqueado real */
:deep(.exec-flatpickr-input:disabled) {
  background-color: var(--slate-50, #f8fafc) !important;
  color: var(--slate-400, #94a3b8) !important;
  cursor: not-allowed !important;
  border-color: var(--border, #e2e8f0) !important;
}

/* Validación Visual */
:deep(.exec-flatpickr-input:required:invalid:not(:placeholder-shown)) {
  border-color: var(--red-600, #dc2626) !important;
}

/* Botón Limpiar (Equis) */
.btn-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--slate-400, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 2; /* Para que quede por encima del input */
  padding: 0;
}

.btn-clear:hover {
  background-color: #fee2e2; 
  color: var(--red-600, #dc2626);
}
</style>