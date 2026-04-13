<template>
  <div class="as-stepper">
    <div class="as-steps-bar">
      <template v-for="(step, i) in steps" :key="i">
        <div
          :class="['as-step', {
            'is-active': i === modelValue,
            'is-done': i < modelValue
          }]"
        >
          <span class="as-step-dot">
            <i v-if="i < modelValue" class="fa-solid fa-check"></i>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="as-step-label">{{ step }}</span>
        </div>
        <div v-if="i < steps.length - 1" class="as-step-line" :class="{ 'is-done': i < modelValue }"></div>
      </template>
    </div>

    <div class="as-body">
      <slot :name="'step-' + modelValue" />
    </div>

    <div class="as-footer">
      <button
        v-if="modelValue > 0"
        class="as-btn as-btn--ghost"
        :disabled="loading"
        @click="$emit('update:modelValue', modelValue - 1)"
      >
        <i class="fa-solid fa-arrow-left"></i> Anterior
      </button>
      <div class="as-footer-spacer"></div>
      <button
        v-if="showCancel"
        class="as-btn as-btn--ghost"
        :disabled="loading"
        @click="$emit('cancel')"
      >
        Cancelar
      </button>
      <button
        v-if="modelValue < steps.length - 1"
        class="as-btn as-btn--primary"
        :disabled="!canAdvance || loading"
        @click="$emit('update:modelValue', modelValue + 1)"
      >
        Siguiente <i class="fa-solid fa-arrow-right"></i>
      </button>
      <button
        v-if="modelValue === steps.length - 1"
        class="as-btn as-btn--confirm"
        :disabled="!canAdvance || loading"
        @click="$emit('confirm')"
      >
        <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : confirmIcon"></i>
        {{ loading ? 'Procesando...' : confirmLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  steps: { type: Array, required: true },
  modelValue: { type: Number, default: 0 },
  canAdvance: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  confirmLabel: { type: String, default: 'Confirmar' },
  confirmIcon: { type: String, default: 'fa-check' },
  showCancel: { type: Boolean, default: true }
})

defineEmits(['update:modelValue', 'confirm', 'cancel'])
</script>

<style scoped>
.as-stepper {
  --as-accent: #0D9488;
  --as-border: #E5E7EB;
  --as-text: #111827;
  --as-text-muted: #9CA3AF;
  --as-bg-subtle: #F9FAFB;
  border: 1px solid var(--as-border);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.as-steps-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16px 24px;
  background: var(--as-bg-subtle);
  border-bottom: 1px solid var(--as-border);
}

.as-step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.as-step-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--as-border);
  color: var(--as-text-muted);
  transition: all .2s;
}

.as-step.is-active .as-step-dot {
  background: var(--as-accent);
  color: #fff;
  box-shadow: 0 0 0 3px rgba(13,148,136,.15);
}

.as-step.is-done .as-step-dot {
  background: var(--as-accent);
  color: #fff;
}

.as-step-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--as-text-muted);
  transition: color .2s;
}

.as-step.is-active .as-step-label { color: var(--as-text); }
.as-step.is-done .as-step-label { color: var(--as-accent); }

.as-step-line {
  flex: 1;
  height: 2px;
  background: var(--as-border);
  margin: 0 12px;
  min-width: 24px;
  transition: background .2s;
}

.as-step-line.is-done { background: var(--as-accent); }

.as-body {
  padding: 20px 24px;
}

.as-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--as-border);
  background: var(--as-bg-subtle);
}

.as-footer-spacer { flex: 1; }

.as-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}

.as-btn:disabled { opacity: .5; cursor: not-allowed; }

.as-btn--ghost {
  background: #fff;
  color: #6B7280;
  border: 1px solid var(--as-border);
}
.as-btn--ghost:hover:not(:disabled) { background: var(--as-bg-subtle); border-color: #D1D5DB; }

.as-btn--primary {
  background: var(--as-accent);
  color: #fff;
}
.as-btn--primary:hover:not(:disabled) { opacity: .9; }

.as-btn--confirm {
  background: var(--as-accent);
  color: #fff;
}
.as-btn--confirm:hover:not(:disabled) { opacity: .9; }
</style>
