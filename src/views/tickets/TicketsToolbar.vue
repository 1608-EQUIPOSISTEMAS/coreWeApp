<template>
  <div class="tk-toolbar">
    <div class="tk-chips" role="tablist" aria-label="Filtrar tickets">
      <button
        v-for="f in filtrosVisibles"
        :key="f.valor"
        type="button"
        role="tab"
        class="ds-chip tk-chip"
        :class="{ activo: modelValue === f.valor }"
        :aria-selected="modelValue === f.valor"
        @click="$emit('update:modelValue', f.valor)"
      >
        {{ f.label }} <span class="tk-chip-count">{{ kpis[f.contador] ?? 0 }}</span>
      </button>
    </div>

    <div class="tk-tools">
      <div class="tk-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input
          :value="busqueda"
          type="search"
          class="tk-input"
          placeholder="Buscar por ticket, asunto o persona…"
          aria-label="Buscar tickets"
          @input="$emit('update:busqueda', $event.target.value)"
        />
      </div>

      <label class="tk-orden">
        <span class="tk-orden-label">Prioridad</span>
        <select
          :value="prioridad"
          class="tk-select"
          @change="$emit('update:prioridad', $event.target.value)"
        >
          <option value="TODAS">todas</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </select>
      </label>

      <label class="tk-orden">
        <span class="tk-orden-label">Estado</span>
        <select
          :value="estado"
          class="tk-select"
          @change="$emit('update:estado', $event.target.value)"
        >
          <option value="TODOS">todos</option>
          <option value="ABIERTO">Sin tomar</option>
          <option value="EN_PROGRESO">En progreso</option>
          <option value="CERRADO">Resuelto</option>
        </select>
      </label>

      <label class="tk-orden">
        <span class="tk-orden-label">Ordenar</span>
        <select
          :value="orden"
          class="tk-select"
          @change="$emit('update:orden', $event.target.value)"
        >
          <option value="sla">Urgencia del plazo</option>
          <option value="fecha">Más recientes</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Solo emite: qué tickets trae cada filtro lo decide el backend; prioridad y
// estado se aplican en el cliente sobre lo que ya llegó (ver TicketsBoard).
const props = defineProps({
  modelValue: { type: String, default: 'TODOS' },
  busqueda: { type: String, default: '' },
  orden: { type: String, default: 'sla' },
  prioridad: { type: String, default: 'TODAS' },
  estado: { type: String, default: 'TODOS' },
  // Un colaborador no tiene "míos" ni "sin asignar": todos sus tickets son suyos
  // y ninguno le está asignado. Mostrar esos chips sería ofrecer filtros vacíos.
  canManage: { type: Boolean, default: false },
  kpis: { type: Object, default: () => ({ total: 0, misAsignados: 0, sinAsignar: 0, porVencer: 0, vencidos: 0 }) },
})

defineEmits(['update:modelValue', 'update:busqueda', 'update:orden', 'update:prioridad', 'update:estado'])

const FILTROS = [
  { valor: 'TODOS', label: 'Todos', contador: 'total', soloAgente: false },
  { valor: 'MIOS', label: 'Míos', contador: 'misAsignados', soloAgente: true },
  { valor: 'SIN_ASIGNAR', label: 'Sin asignar', contador: 'sinAsignar', soloAgente: true },
  { valor: 'POR_VENCER', label: 'Por vencer', contador: 'porVencer', soloAgente: false },
  { valor: 'VENCIDOS', label: 'Vencidos', contador: 'vencidos', soloAgente: false },
]

const filtrosVisibles = computed(() => FILTROS.filter(f => !f.soloAgente || props.canManage))
</script>

<style scoped>
/* Chips, inputs y colores: sistema de diseño (styles/design-system.css). */
.tk-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.tk-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tk-chip { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; border: 1px solid var(--ds-border); background: transparent; transition: 0.15s; }
.tk-chip:hover { border-color: var(--ds-accent); }
.tk-chip.activo { background: var(--ds-accent); border-color: var(--ds-accent); color: #fff; }
.tk-chip-count { padding: 0 6px; border-radius: 999px; font-size: 10.5px; font-weight: 700; background: var(--ds-soft-neutral); color: var(--ds-ink-2); }
.tk-chip.activo .tk-chip-count { background: rgba(255, 255, 255, 0.24); color: #fff; }

.tk-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.tk-search { position: relative; display: flex; align-items: center; }
.tk-search i { position: absolute; left: 10px; font-size: 12px; color: var(--ds-muted); pointer-events: none; }
.tk-input, .tk-select {
  height: 34px; border: 1px solid var(--ds-border); border-radius: 7px;
  background: var(--ds-surface); color: var(--ds-ink); font-size: 13px;
}
.tk-input { width: 260px; max-width: 100%; padding: 0 10px 0 30px; }
.tk-input:focus, .tk-select:focus { outline: 2px solid var(--ds-accent); outline-offset: -1px; }
.tk-orden { display: flex; align-items: center; gap: 7px; }
.tk-orden-label { font-size: 12px; color: var(--ds-muted); white-space: nowrap; }
.tk-select { padding: 0 8px; }

@media (max-width: 720px) {
  .tk-tools { width: 100%; }
  .tk-input { width: 100%; }
}
</style>
