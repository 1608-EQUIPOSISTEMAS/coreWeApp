<template>
  <div class="pagination-container">

    <div class="pagination-left">
      <button
        class="btn btn-filter"
        @click="$emit('open-filters')"
        title="Configurar filtros avanzados"
      >
        <i class="fa-solid fa-sliders"></i>
        <span class="mobile-hide">Filtros</span>
      </button>

      <button
        class="btn btn-filter"
        @click="$emit('change')"
        title="Recargar tabla"
      >
        <i class="fa-solid fa-rotate-right"></i>
      </button>

      <div class="separator"></div>

      <div class="page-size-control">
        <label for="pageSize" class="text-muted mobile-hide">Mostrar</label>
        <select
          id="pageSize"
          :value="modelValue.size"
          @change="updateSize($event.target.value)"
          class="form-select-sm"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
          <option :value="1000">1000</option>
          <option :value="2000">2000</option>
        </select>
        <span class="text-muted mobile-hide">filas</span>
      </div>
    </div>

    <div class="pagination-right">
      <span class="pagination-info mobile-hide">
        <strong>{{ minimun }} - {{ maximun }}</strong>
        <span class="text-muted">&nbsp;de&nbsp;</span>
        <strong>{{ modelValue.total }}</strong>
      </span>

      <div class="btn-group">
        <button
          class="btn btn-icon"
          :disabled="modelValue.page === 1"
          @click="changePage(modelValue.page - 1)"
          title="Página anterior"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>

        <template v-for="(p, index) in visiblePages" :key="index">

          <span v-if="p === '...'" class="dots">...</span>

          <button
            v-else
            class="btn btn-icon btn-number"
            :class="{ 'active': p === modelValue.page }"
            @click="changePage(p)"
          >
            {{ p }}
          </button>
        </template>

        <button
          class="btn btn-icon"
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
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 1rem;
  font-family: system-ui, -apple-system, sans-serif;
}

/* --- Left Side --- */
.pagination-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.separator {
  width: 1px;
  height: 24px;
  background-color: #e5e7eb;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.form-select-sm {
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.25rem 2rem 0.25rem 0.5rem;
  font-size: 0.875rem;
  background-color: #fff;
  cursor: pointer;
  outline: none;
}
.form-select-sm:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

/* --- Right Side --- */
.pagination-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pagination-info {
  font-size: 0.875rem;
  color: #374151;
  white-space: nowrap;
}

.btn-group {
  display: flex;
  gap: 0.25rem;
  align-items: center; /* Alinea verticalmente los puntos y botones */
}

/* --- Buttons Styles --- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-filter {
  background-color: #fff;
  border-color: #d1d5db;
  color: #374151;
}
.btn-filter:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

/* Estilos Específicos para botones cuadrados (Iconos y Números) */
.btn-icon {
  padding: 0;           /* Quitamos padding lateral para centrar mejor */
  min-width: 32px;      /* Usamos min-width para números grandes (ej: 100) */
  height: 32px;
  background-color: #fff;
  border-color: #d1d5db;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled):not(.active) {
  background-color: #f3f4f6;
  color: #111827;
  border-color: #9ca3af;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f9fafb;
}

/* Estilo para la página ACTIVA */
.btn-icon.active {
  background-color: #2563eb; /* Azul primary */
  border-color: #2563eb;
  color: #ffffff;
  z-index: 1; /* Para que el borde quede por encima si hubiera overlap */
  cursor: default;
}

/* Estilo para los puntos suspensivos (...) */
.dots {
  color: #9ca3af;
  padding: 0 0.25rem;
  font-size: 0.875rem;
  user-select: none;
}

.text-muted { color: #6b7280; }

/* Responsive */
@media (max-width: 600px) {
  .mobile-hide { display: none; }
  .pagination-container { justify-content: center; gap: 0.75rem; }
  .pagination-left, .pagination-right { width: 100%; justify-content: center; }

  /* En móviles ocultamos el texto info para que quepan los números */
  .pagination-info { display: none; }
}
</style>
