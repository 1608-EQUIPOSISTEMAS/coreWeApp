<template>
  <button
    ref="trigger"
    type="button"
    class="ds-th-filter"
    :class="{ 'is-active': active || sorted }"
    :aria-expanded="String(open)"
    :title="`Filtrar y ordenar por ${column.label}`"
    @click="toggle"
  >
    {{ column.label }}
    <i class="fa-solid" :class="sorted ? (sort.dir === 'desc' ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-short-wide') : 'fa-filter'" aria-hidden="true"></i>
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      class="cf-panel"
      role="dialog"
      :aria-label="`Filtro de ${column.label}`"
      :style="position"
      @keydown.esc="close"
    >
      <div class="cf-sort">
        <button type="button" :aria-pressed="String(sorted && sort.dir === 'asc')" @click="emitSort('asc')">
          <i class="fa-solid fa-arrow-up-short-wide" aria-hidden="true"></i> {{ isNum ? 'Menor a mayor' : 'A → Z' }}
        </button>
        <button type="button" :aria-pressed="String(sorted && sort.dir === 'desc')" @click="emitSort('desc')">
          <i class="fa-solid fa-arrow-down-wide-short" aria-hidden="true"></i> {{ isNum ? 'Mayor a menor' : 'Z → A' }}
        </button>
      </div>

      <div v-if="column.kind !== 'texto'" class="cf-range">
        <label>
          <span>Desde</span>
          <input v-model="draft.min" class="ds-input" :type="column.kind === 'fecha' ? 'date' : 'number'" :step="isNum ? '0.01' : undefined" />
        </label>
        <label>
          <span>Hasta</span>
          <input v-model="draft.max" class="ds-input" :type="column.kind === 'fecha' ? 'date' : 'number'" :step="isNum ? '0.01' : undefined" />
        </label>
      </div>

      <input
        ref="searchInput"
        v-model="draft.text"
        type="search"
        class="ds-input"
        placeholder="Buscar…"
        :aria-label="`Buscar en ${column.label}`"
        @keydown.enter="apply"
      />

      <div class="cf-list" role="group" :aria-label="`Valores de ${column.label}`">
        <label class="cf-item cf-all">
          <input type="checkbox" :checked="allShownChecked" :indeterminate.prop="someShownChecked && !allShownChecked" @change="toggleShown($event.target.checked)" />
          <span>(Seleccionar todo{{ draft.text.trim() ? ' lo encontrado' : '' }})</span>
        </label>
        <label v-for="v in shown" :key="v.value" class="cf-item">
          <input type="checkbox" :checked="isChecked(v.value)" @change="toggleValue(v.value, $event.target.checked)" />
          <span class="cf-value">{{ display(v.value) }}</span>
          <span class="cf-n">{{ v.n }}</span>
        </label>
        <p v-if="hidden > 0" class="cf-more">y {{ hidden }} valores más: usa el buscador.</p>
        <p v-if="!matching.length" class="cf-more">Sin coincidencias.</p>
      </div>

      <div class="cf-actions">
        <button type="button" class="btn-exec btn-exec-outline" @click="clear">Limpiar</button>
        <button type="button" class="btn-exec btn-exec-primary" @click="apply">Aplicar</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { isActive, VACIAS } from '@/shared/lib/columnFilters.js'
import { formatValue } from '@/shared/lib/formatValue.js'

// Filtro de UNA columna al estilo Excel: orden, rango (fecha/monto), buscador
// y lista de valores con casillas. Trabaja sobre un borrador: no filtra nada
// hasta "Aplicar". La lista (`values`) ya viene recortada por los demás filtros.
const props = defineProps({
  column: { type: Object, required: true },
  values: { type: Array, required: true },
  filter: { type: Object, default: null },
  sort: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:filter', 'sort'])

const MAX_SHOWN = 300
const open = ref(false)
const trigger = ref(null)
const panel = ref(null)
const searchInput = ref(null)
const position = ref({})
const draft = ref(emptyDraft())

const isNum = computed(() => props.column.kind === 'monto')
const active = computed(() => isActive(props.filter))
const sorted = computed(() => props.sort?.key === props.column.key)

function emptyDraft () {
  return { checked: null, text: '', min: '', max: '' } // checked null = todos
}

const display = v => (v === VACIAS || !isNum.value ? v : formatValue(Number(v), 'monto'))

const matching = computed(() => {
  const q = draft.value.text.trim().toLowerCase()
  return q ? props.values.filter(v => display(v.value).toLowerCase().includes(q)) : props.values
})
const shown = computed(() => matching.value.slice(0, MAX_SHOWN))
const hidden = computed(() => matching.value.length - shown.value.length)

const isChecked = v => draft.value.checked === null || draft.value.checked.has(v)
const allShownChecked = computed(() => matching.value.every(v => isChecked(v.value)))
const someShownChecked = computed(() => matching.value.some(v => isChecked(v.value)))

function materialize () {
  if (draft.value.checked === null) draft.value.checked = new Set(props.values.map(v => v.value))
}
function toggleValue (v, on) {
  materialize()
  if (on) draft.value.checked.add(v)
  else draft.value.checked.delete(v)
}
function toggleShown (on) {
  materialize()
  for (const v of matching.value) {
    if (on) draft.value.checked.add(v.value)
    else draft.value.checked.delete(v.value)
  }
}

function place () {
  const r = trigger.value.getBoundingClientRect()
  const width = 300
  const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
  // Abre hacia donde haya mas espacio: un encabezado al pie de la ventana lo
  // dejaria cortado.
  const below = window.innerHeight - r.bottom - 12
  const above = r.top - 12
  position.value = below >= 360 || below >= above
    ? { top: `${r.bottom + 6}px`, left: `${left}px`, width: `${width}px`, maxHeight: `${Math.min(520, below)}px` }
    : { bottom: `${window.innerHeight - r.top + 6}px`, left: `${left}px`, width: `${width}px`, maxHeight: `${Math.min(520, above)}px` }
}

async function toggle () {
  if (open.value) return close()
  const f = props.filter
  draft.value = {
    checked: Array.isArray(f?.values) ? new Set(f.values) : null,
    text: f?.text ?? '',
    min: f?.min ?? '',
    max: f?.max ?? ''
  }
  place()
  open.value = true
  document.addEventListener('mousedown', onOutside, true)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', close)
  await nextTick()
  searchInput.value?.focus()
}

function close () {
  if (!open.value) return
  open.value = false
  document.removeEventListener('mousedown', onOutside, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
}

// El panel es fixed: si la pagina o la tabla se desplazan queda desubicado y se
// cierra. El scroll de su propia lista de valores no cuenta.
function onScroll (e) {
  if (panel.value?.contains(e.target)) return
  close()
}

function onOutside (e) {
  if (panel.value?.contains(e.target) || trigger.value?.contains(e.target)) return
  close()
}

function apply () {
  const d = draft.value
  // Todo marcado = sin filtro de lista (si luego aparecen valores nuevos, entran).
  const all = d.checked === null || props.values.every(v => d.checked.has(v.value))
  const next = { values: all ? null : [...d.checked], text: d.text, min: d.min, max: d.max }
  emit('update:filter', isActive(next) ? next : null)
  close()
}

function clear () {
  emit('update:filter', null)
  close()
}

function emitSort (dir) {
  emit('sort', sorted.value && props.sort.dir === dir ? {} : { key: props.column.key, dir })
}

defineExpose({ close })
onBeforeUnmount(close)
</script>

<style scoped>
.cf-panel {
  position: fixed;
  z-index: 1080;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: min(520px, calc(100vh - 24px));
  padding: 12px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface);
  color: var(--ds-ink);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  font-size: 12.5px;
}
.cf-sort { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.cf-sort button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control); background: var(--ds-surface); font: inherit; color: var(--ds-ink-2); cursor: pointer; }
.cf-sort button:hover { background: var(--ds-surface-2); color: var(--ds-heading); }
.cf-sort button[aria-pressed="true"] { border-color: var(--ds-accent); color: var(--ds-accent); }
.cf-range { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cf-range label { display: flex; flex-direction: column; gap: 3px; margin: 0; }
.cf-range span { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ds-ink-2); }
.cf-list { flex: 1; min-height: 80px; overflow-y: auto; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control); padding: 4px 0; }
.cf-item { display: flex; align-items: center; gap: 8px; margin: 0; padding: 4px 10px; cursor: pointer; }
.cf-item:hover { background: var(--ds-surface-2); }
.cf-all { font-weight: 600; border-bottom: 1px solid var(--ds-border); }
.cf-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cf-n { color: var(--ds-muted); font-variant-numeric: tabular-nums; }
.cf-more { margin: 6px 10px; color: var(--ds-ink-2); }
.cf-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
