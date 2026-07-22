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
    allowInput: isRange.value ? false : (props.config.allowInput ?? true),

    // ← AÑADIR ESTO:
    onReady: (selectedDates, dateStr, instance) => {
      // Solo aplica cuando se puede escribir (no rango)
      if (isRange.value) return

      const input = instance.altInput || instance.input
      if (!input) return

      // Bloquea teclas no numéricas
      input.addEventListener('keydown', (e) => {
        const allowed = [
          'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
        ]
        if (allowed.includes(e.key)) return
        if (!/^\d$/.test(e.key)) e.preventDefault()
      })

      // Auto-inserta las barras al escribir
      input.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '') // solo dígitos
        if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2)
        if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5)
        val = val.slice(0, 10)
        e.target.value = val
      })
    }
  }
})

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

/* ═══════════ DARK MODE ═══════════ */
[data-coreui-theme="dark"] .base-datepicker-wrapper :deep(.exec-flatpickr-input) {
  color: #F4F4F0;
  background-color: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .base-datepicker-wrapper :deep(.exec-flatpickr-input:focus) {
  border-color: #8FAADC !important;
  box-shadow: 0 0 0 3px rgba(143, 170, 220, 0.15) !important;
  background-color: #1A1A14 !important;
}
[data-coreui-theme="dark"] .base-datepicker-wrapper :deep(.exec-flatpickr-input:hover:not(:disabled)) {
  border-color: #3A3A33;
}
[data-coreui-theme="dark"] .base-datepicker-wrapper :deep(.exec-flatpickr-input[readonly]:not(:disabled)) {
  background-color: #1A1A14;
}
[data-coreui-theme="dark"] .base-datepicker-wrapper :deep(.exec-flatpickr-input:disabled) {
  background-color: #1F1F1A !important;
  color: #8A8A80 !important;
  border-color: #2A2A22 !important;
}
[data-coreui-theme="dark"] .base-datepicker-wrapper :deep(.exec-flatpickr-input:required:invalid:not(:placeholder-shown)) {
  border-color: #F87171 !important;
}
[data-coreui-theme="dark"] .btn-clear { color: #8A8A80; }
[data-coreui-theme="dark"] .btn-clear:hover {
  background-color: rgba(239, 68, 68, 0.16);
  color: #F87171;
}
</style>
