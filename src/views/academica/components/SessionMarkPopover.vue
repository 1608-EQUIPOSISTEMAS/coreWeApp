<script setup>
import { computed } from 'vue'

// Popover "Marcar sesion" de las matrices semana x sesion (Control de
// Ediciones, Seguimiento B2B). Cada pantalla trae sus estados; el segundo paso
// (fecha nueva de una R, motivo de una J) entra por el slot `step` y reemplaza
// la lista mientras esta abierto.
const props = defineProps({
  // getBoundingClientRect() de la celda clicada: el popover se abre debajo.
  anchor: { type: Object, required: true },
  // Espacio que se reserva para que el popover no se salga de la ventana.
  width: { type: Number, default: 210 },
  height: { type: Number, default: 250 },
  title: { type: String, required: true },
  // [{ code, label, short, tone }] en el orden en que se ofrecen.
  options: { type: Array, required: true },
  selected: { type: String, default: '' }
})
const emit = defineEmits(['pick', 'close'])

const position = computed(() => ({
  top: `${Math.min(props.anchor.bottom + 6, window.innerHeight - props.height)}px`,
  left: `${Math.min(props.anchor.left, window.innerWidth - props.width)}px`
}))
</script>

<template>
  <div class="pop-backdrop" @click="emit('close')" @contextmenu.prevent="emit('close')" />
  <div class="pop" role="dialog" :aria-label="title" :style="position">
    <div class="pop-title">{{ title }}</div>
    <slot name="step">
      <button
        v-for="o in options"
        :key="o.code"
        class="pop-opt"
        type="button"
        :class="{ on: selected === o.code }"
        :aria-pressed="selected === o.code"
        @click="emit('pick', o.code)"
      >
        <span class="ds-pill mark" :class="o.tone">{{ o.short }}</span>
        {{ o.label }}
        <i v-if="selected === o.code" class="fa-solid fa-check ck" aria-hidden="true"></i>
      </button>
    </slot>
  </div>
</template>

<style scoped>
.pop-backdrop { position: fixed; inset: 0; z-index: 1090; }
.pop {
  position: fixed; z-index: 1091; min-width: 190px; padding: 6px;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.35); color: var(--ds-ink);
}
.pop-title { padding: 7px 10px 5px; font-size: 12px; font-weight: 700; color: var(--ds-ink-2); }
.pop-opt {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px;
  border: 0; border-radius: var(--ds-radius-control); background: transparent;
  font: inherit; font-size: 13px; color: var(--ds-ink); text-align: left; cursor: pointer;
}
.pop-opt:hover, .pop-opt.on { background: var(--ds-surface-2); }
.pop-opt.on { font-weight: 600; }
.pop-opt:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.ck { margin-left: auto; color: var(--ds-accent); }
.mark { width: 22px; height: 22px; padding: 0; justify-content: center; font-family: var(--ds-font-mono); }
</style>
