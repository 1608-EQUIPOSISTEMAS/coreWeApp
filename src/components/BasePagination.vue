<template>
  <div class="exec-pagination">

    <div class="pagination-left">
      <button
        class="btn-exec btn-exec-outline"
        @click="$emit('open-filters')"
        title="Configurar filtros avanzados"
      >
        <i class="fa-solid fa-sliders"></i>
        <span class="mobile-hide">Filtros</span>
      </button>

      <button
        class="btn-exec btn-exec-outline"
        @click="$emit('change')"
        title="Recargar tabla"
      >
        <i class="fa-solid fa-rotate-right"></i>
      </button>

      <div class="separator mobile-hide"></div>

      <div class="page-size-control">
        <label for="pageSize" class="exec-label mobile-hide" style="margin: 0;">Mostrar</label>
        <select
          id="pageSize"
          :value="modelValue.size"
          @change="updateSize($event.target.value)"
          class="exec-select-light"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
          <option :value="500">500</option>
        </select>
        <span class="text-muted small mobile-hide">filas</span>
      </div>
    </div>

    <div class="pagination-right">
      <span class="pagination-info mobile-hide text-mono">
        <strong>{{ minimun }} - {{ maximun }}</strong>
        <span class="text-muted text-sans">&nbsp;de&nbsp;</span>
        <strong>{{ modelValue.total }}</strong>
      </span>

      <div class="pagination-actions">
        <button
          class="page-btn"
          :disabled="modelValue.page === 1"
          @click="changePage(modelValue.page - 1)"
          title="Página anterior"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>

        <template v-for="(p, index) in visiblePages" :key="index">
          <span v-if="p === '...'" class="page-dots">...</span>
          <button
            v-else
            class="page-btn text-mono"
            :class="{ 'active': p === modelValue.page }"
            @click="changePage(p)"
          >
            {{ p }}
          </button>
        </template>

        <button
          class="page-btn"
          :disabled="modelValue.page >= totalPages"
          @click="changePage(modelValue.page + 1)"
          title="Página siguiente"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>

  </div>
</template>
<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({ size: 25, page: 1, total: 0 })
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'open-filters'])

// --- Lógica Matemática ---

const totalPages = computed(() =>
  Math.max(1, Math.ceil((props.modelValue.total || 0) / props.modelValue.size))
)

const maximun = computed(() => {
  const num = props.modelValue.size * props.modelValue.page
  return (num > props.modelValue.total) ? props.modelValue.total : num
})

const minimun = computed(() => {
  if (props.modelValue.total === 0) return 0
  return (props.modelValue.size * props.modelValue.page) - props.modelValue.size + 1
})

/**
 * Calcula qué números mostrar con el formato clásico:
 * Ej: 1 ... 4 5 6 ... 20
 */
const visiblePages = computed(() => {
  const total = totalPages.value
  const current = props.modelValue.page
  const delta = 1 // Cuántas páginas mostrar a los lados de la actual (vecinos)
  const range = []
  const rangeWithDots = []
  let l

  // 1. Obtenemos el rango crudo de números a mostrar
  for (let i = 1; i <= total; i++) {
    // Siempre mostrar la primera, la última, y el rango alrededor de la actual
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i)
    }
  }

  // 2. Insertamos los "..." donde haya saltos
  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        // Si el salto es pequeño (ej: de 2 a 4), metemos el 3 en vez de "..."
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        // Si el salto es grande, metemos los puntos
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
})

// --- Manejadores ---

function updateSize(newSize) {
  const size = Number(newSize)
  emit('update:modelValue', { ...props.modelValue, size, page: 1 })
  emit('change')
}

function changePage(newPage) {
  if (newPage < 1 || newPage > totalPages.value) return
  emit('update:modelValue', { ...props.modelValue, page: newPage })
  emit('change')
}
</script>
<style scoped>
/* ═══════════════════════════════════════════════
   PAGINACIÓN - DISEÑO EJECUTIVO
═══════════════════════════════════════════════ */
.exec-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  background-color: transparent;
  flex-wrap: wrap;
  gap: 16px;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  font-size: 12px;
}

/* --- Lado Izquierdo --- */
.pagination-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.separator {
  width: 1px;
  height: 20px;
  background-color: var(--border, #e2e8f0);
  margin: 0 4px;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exec-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: default;
}

.exec-select-light {
  background: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  padding: 4px 24px 4px 10px;
  font-size: 11.5px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}
.exec-select-light:focus {
  border-color: var(--teal-500, #14b8a6);
}

/* Botones Auxiliares */
.btn-exec {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.btn-exec-outline {
  background: var(--white, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  color: var(--text-secondary, #475569);
}
.btn-exec-outline:hover {
  background: var(--slate-50, #f8fafc);
  color: var(--text-primary, #0f172a);
  border-color: var(--slate-300, #cbd5e1);
}

/* --- Lado Derecho --- */
.pagination-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination-info {
  font-size: 11.5px;
  color: var(--text-primary, #0f172a);
}
.pagination-info strong {
  font-weight: 600;
}
.text-mono {
  font-family: 'IBM Plex Mono', monospace;
}
.text-sans {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}
.text-muted {
  color: var(--text-muted, #94a3b8);
}
.small {
  font-size: 11px;
}

/* Botones de Páginas */
.pagination-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #475569);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled):not(.active) {
  background: var(--slate-100, #f1f5f9);
  color: var(--text-primary, #0f172a);
}

.page-btn.active {
  background: var(--teal-600, #0d9488);
  color: var(--white, #ffffff);
  font-weight: 600;
  border-color: var(--teal-600, #0d9488);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: var(--slate-400, #94a3b8);
}

.page-dots {
  color: var(--slate-400, #94a3b8);
  font-size: 12px;
  padding: 0 2px;
  letter-spacing: 1px;
  user-select: none;
}

/* Responsive */
@media (max-width: 600px) {
  .mobile-hide { display: none; }
  .exec-pagination { justify-content: center; gap: 12px; padding: 12px; }
  .pagination-left, .pagination-right { width: 100%; justify-content: center; }
}
</style>
