<template>
  <div class="ds-table-scroll">
    <table class="ds-table tree">
      <thead>
        <tr>
          <th scope="col">Línea · tipo · programa</th>
          <th v-for="c in columns" :key="c.key" scope="col" class="num">{{ c.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="columns.length + 1" class="ds-empty ds-empty--lista">{{ empty }}</td>
        </tr>
        <tr
          v-for="r in rows"
          :key="r.key"
          :class="['lvl-' + r.level, { link: r.hasChildren }]"
          :tabindex="r.hasChildren ? 0 : undefined"
          :aria-expanded="r.hasChildren ? String(r.open) : undefined"
          @click="toggle(r)"
          @keydown.enter="toggle(r)"
        >
          <th scope="row" class="tree-name">
            <i v-if="r.hasChildren" class="fa-solid caret" :class="r.open ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i>
            {{ r.node.label }}
          </th>
          <td v-for="c in columns" :key="c.key" class="num" :class="{ fig: c.strong, [toneInk(r, c)]: true }">
            <span v-if="c.kind === 'trend'" v-show="r.node[c.key] !== null" class="ds-trend" :class="r.node[c.key] >= 0 ? 'ok' : 'bad'">
              {{ r.node[c.key] >= 0 ? '↑' : '↓' }} {{ formatValue(Math.abs(r.node[c.key] ?? 0), 'pct') }}
            </span>
            <template v-else>{{ formatValue(r.node[c.key], c.unit) }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatValue } from '@/shared/lib/formatValue.js'
import { visibleRows } from '@/features/fico-rentabilidad/rentabilidad.js'

// Tabla de arbol: las lineas abren sus tipos y los tipos sus programas.
// `columns` = [{ key, label, unit, strong?, toned?, kind?: 'trend' }].
const props = defineProps({
  lineas: { type: Array, required: true },
  columns: { type: Array, required: true },
  empty: { type: String, default: 'Sin movimientos en el periodo. Cambia el periodo arriba.' }
})

// Las lineas abren solas: con 4 lineas el primer vistazo ya muestra los tipos.
const expanded = ref(new Set(props.lineas.map(l => l.key)))
const rows = computed(() => visibleRows(props.lineas, expanded.value))

function toggle (row) {
  if (!row.hasChildren) return
  const next = new Set(expanded.value)
  next.has(row.key) ? next.delete(row.key) : next.add(row.key)
  expanded.value = next
}

// Solo las columnas marcadas `toned` se pintan con el tono del nodo (el margen).
const toneInk = (row, col) => (col.toned && row.node.tone ? `ink-${row.node.tone}` : '')
</script>

<style scoped>
.tree th[scope="row"] { font-weight: 600; text-align: left; padding: 9px 12px 9px 0; border-top: 1px solid var(--ds-border); color: var(--ds-heading); white-space: nowrap; }
.tree tr.link { cursor: pointer; }
.tree tr.link:hover > * { background: var(--ds-surface-2); }
.tree tr:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.lvl-0 > * { background: var(--ds-surface-2); }
.lvl-0 .tree-name { font-size: 13.5px; font-weight: 800; }
.lvl-1 .tree-name { padding-left: 22px; }
.lvl-2 .tree-name { padding-left: 46px; font-weight: 500; color: var(--ds-ink); white-space: normal; }
.caret { width: 14px; margin-right: 4px; font-size: 10px; color: var(--ds-muted); }
.fig { font-weight: 800; color: var(--ds-heading); }
.ink-ok { color: var(--ds-ok-ink); }
.ink-warn { color: var(--ds-warn-ink); }
.ink-bad { color: var(--ds-bad-ink); }
</style>
