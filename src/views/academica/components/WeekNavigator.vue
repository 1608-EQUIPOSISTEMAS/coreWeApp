<script setup>
import { computed } from 'vue'
import { weekRangeLabel } from '@/features/academica-week/useIsoWeekNav'

// "‹ Semana N ›" con el rango debajo. El rango lo pasa la pantalla desde lo
// que devolvio el backend (date_start/date_end), no se recalcula aqui: asi el
// texto describe los datos que se estan viendo.
const props = defineProps({
  week: { type: Number, required: true },
  start: { type: String, default: null },
  end: { type: String, default: null },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['move'])

const range = computed(() => weekRangeLabel(props.start, props.end))
</script>

<template>
  <div class="week-nav">
    <button
      class="arrow"
      type="button"
      :disabled="disabled"
      title="Semana anterior"
      aria-label="Semana anterior"
      @click="emit('move', -1)"
    >
      <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
    </button>
    <div class="center" aria-live="polite">
      <div class="wk">Semana {{ week }}</div>
      <div class="rg">{{ range }}</div>
    </div>
    <button
      class="arrow"
      type="button"
      :disabled="disabled"
      title="Semana siguiente"
      aria-label="Semana siguiente"
      @click="emit('move', 1)"
    >
      <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
    </button>
  </div>
</template>

<style scoped>
.week-nav {
  display: flex; align-items: center; gap: 2px; padding: 3px;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
}
.arrow {
  width: 30px; height: 34px; display: grid; place-items: center;
  border: 0; border-radius: var(--ds-radius-control); background: transparent;
  color: var(--ds-ink-2); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.arrow:hover:not(:disabled) { background: var(--ds-surface-2); color: var(--ds-ink); }
.arrow:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }
.arrow:disabled { opacity: 0.55; cursor: default; }
.center { min-width: 138px; padding: 0 12px; text-align: center; }
.wk { font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.rg { margin-top: 1px; font-size: 11px; color: var(--ds-muted); }
</style>
