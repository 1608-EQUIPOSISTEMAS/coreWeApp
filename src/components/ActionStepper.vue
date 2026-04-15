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
  --as-accent: #1A1A1A;
  --as-border: #F0F0F0;
  --as-text: #1A1A1A;
  --as-text-muted: #A3A3A3;
  --as-bg-subtle: #FAFAFA;
  border: 1px solid var(--as-border);
  border-radius: 12px;
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
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  background: #E8E8E8;
  color: var(--as-text-muted);
  transition: all .25s ease;
}

.as-step.is-active .as-step-dot {
  background: var(--as-accent);
  color: #fff;
}

.as-step.is-done .as-step-dot {
  background: #059669;
  color: #fff;
}

.as-step-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--as-text-muted);
  transition: color .25s ease;
}

.as-step.is-active .as-step-label { color: var(--as-text); font-weight: 600; }
.as-step.is-done .as-step-label { color: #059669; }

.as-step-line {
  flex: 1;
  height: 1px;
  background: #E8E8E8;
  margin: 0 14px;
  min-width: 24px;
  transition: background .25s ease;
}

.as-step-line.is-done { background: #059669; }

.as-body {
  padding: 24px;
}

.as-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--as-border);
  background: var(--as-bg-subtle);
}

.as-footer-spacer { flex: 1; }

.as-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all .2s ease;
}

.as-btn:disabled { opacity: .4; cursor: not-allowed; }

.as-btn--ghost {
  background: #fff;
  color: #737373;
  border: 1px solid #E8E8E8;
}
.as-btn--ghost:hover:not(:disabled) { background: #FAFAFA; border-color: #D4D4D4; color: #1A1A1A; }

.as-btn--primary {
  background: var(--as-accent);
  color: #fff;
}
.as-btn--primary:hover:not(:disabled) { background: #333; }

.as-btn--confirm {
  background: var(--as-accent);
  color: #fff;
}
.as-btn--confirm:hover:not(:disabled) { background: #333; }
</style>
