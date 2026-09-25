<template>
  <div class="cc" role="img" :aria-label="ariaLabel">
    <div class="cc-plot" :style="{ height: `${height}px` }">
      <div v-if="reference !== null" class="cc-ref" :style="{ bottom: `${(reference / top) * 100}%` }">
        <span>{{ referenceLabel }}</span>
      </div>
      <component
        :is="selectable ? 'button' : 'div'"
        v-for="g in groups"
        :key="g.key"
        class="cc-group"
        :class="{ selected: g.selected }"
        :type="selectable ? 'button' : undefined"
        :aria-pressed="selectable ? String(Boolean(g.selected)) : undefined"
        :aria-label="selectable ? `Ver ${g.label}` : undefined"
        @click="selectable && $emit('select', g.key)"
      >
        <span
          v-for="(b, i) in g.bars"
          :key="i"
          class="cc-bar"
          :class="b.tone"
          :style="{ height: `${Math.max(b.value ? 2 : 0, (b.value / top) * 100)}%`, width: `${barWidth}px` }"
        >
          <em v-if="b.label !== undefined && b.label !== null">{{ b.label }}</em>
        </span>
      </component>
    </div>
    <div class="cc-axis">
      <div v-for="g in groups" :key="g.key" class="cc-tick" :class="{ selected: g.selected, [g.tone]: g.tone }">
        <strong>{{ g.label }}</strong>
        <span v-if="g.sub">{{ g.sub }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Columnas agrupadas dibujadas con CSS y tokens: se leen igual en claro y oscuro
// sin pasar colores a un canvas. Cada barra trae su tono (ok | rose | ref | accent
// | accent-2 | bar) y la etiqueta que va encima.
const props = defineProps({
  groups: { type: Array, required: true }, // [{ key, label, sub, tone, selected, bars: [{ value, tone, label }] }]
  height: { type: Number, default: 170 },
  barWidth: { type: Number, default: 20 },
  reference: { type: Number, default: null }, // linea punteada (p. ej. 1 = 100%)
  referenceLabel: { type: String, default: '' },
  selectable: { type: Boolean, default: false },
  ariaLabel: { type: String, required: true }
})
defineEmits(['select'])

// 12% de aire sobre la barra mas alta para que su etiqueta entre.
const top = computed(() => {
  const values = props.groups.flatMap((g) => g.bars.map((b) => b.value || 0))
  return Math.max(props.reference ?? 0, ...values, 1) * 1.12
})
</script>

<style scoped>
.cc-plot { position: relative; display: flex; align-items: flex-end; gap: 8px; border-bottom: 1px solid var(--ds-border); }
.cc-group { flex: 1; min-width: 0; height: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 3px; padding: 0; border: 0; border-radius: var(--ds-radius-sm) var(--ds-radius-sm) 0 0; background: transparent; font: inherit; }
button.cc-group { cursor: pointer; }
button.cc-group:hover { background: var(--ds-surface-2); }
button.cc-group:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.cc-group.selected { background: var(--ds-surface-3); }

.cc-bar { position: relative; flex: none; border-radius: 4px 4px 0 0; background: var(--ds-bar); }
.cc-bar em { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 3px; font-size: 11px; font-style: normal; font-weight: 600; color: var(--ds-ink-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
.cc-bar.ok { background: var(--ds-ok); }
.cc-bar.rose { background: var(--ds-rose); }
.cc-bar.ref { background: var(--ds-reference); }
.cc-bar.accent { background: var(--ds-accent); }
.cc-bar.accent-2 { background: var(--ds-accent-2); }
.cc-bar.ok em { color: var(--ds-ok-ink); }
.cc-bar.rose em { color: var(--ds-rose-ink); }

.cc-ref { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--ds-border-strong); pointer-events: none; }
.cc-ref span { position: absolute; right: 0; top: -15px; padding-left: 4px; font-size: 10.5px; color: var(--ds-muted); background: var(--ds-surface); }

.cc-axis { display: flex; gap: 8px; margin-top: 6px; }
.cc-tick { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; }
.cc-tick strong { font-size: 12px; font-weight: 600; color: var(--ds-ink); white-space: nowrap; }
.cc-tick span { font-size: 10.5px; color: var(--ds-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.cc-tick.selected strong { font-weight: 800; color: var(--ds-heading); }
.cc-tick.ok strong { color: var(--ds-ok-ink); font-weight: 800; }
.cc-tick.rose strong { color: var(--ds-rose-ink); font-weight: 800; }
</style>
