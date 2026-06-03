<template>
  <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': filterChips.length > 0 }">
    <div class="ep-filter-bar-main">
      <div class="ep-quick-row">
        <nav class="ep-tabs" aria-label="Vistas rapidas">
          <button
            v-for="v in quickViews"
            :key="v.key"
            :class="['ep-tab', { 'is-active': activeQuickView === v.key, 'is-highlight': v.highlight }]"
            :title="v.title"
            @click="emit('quick-view', v.key)"
          >
            <i class="fa-solid" :class="v.icon"></i> {{ v.label }}
          </button>
        </nav>
        <div class="ep-quick-order" title="Ordenar resultados">
          <i class="fa-solid fa-arrow-down-wide-short ep-quick-order-icon"></i>
          <SearchSelect
            :model-value="pagination?.order_by"
            :items="filtroOrden"
            label-field="description"
            value-field="value"
            placeholder="Ordenar..."
            class="ss-quick"
            @update:model-value="emit('order-change', $event)"
          />
        </div>
      </div>
      <div class="ep-toolbar">
        <BasePagination
          v-model="paginationModel"
          @open-filters="emit('open-filters')"
        />
      </div>
    </div>
    <div v-if="filterChips.length > 0" class="ep-filter-strip">
      <span class="ep-filter-strip-badge">
        <i class="fa-solid fa-circle-half-stroke"></i>
        Filtros activos
        <span class="ep-filter-strip-count">{{ filterChips.length }}</span>
      </span>
      <BaseFilterChips
        :items="filterChips"
        @remove="emit('filter-remove', $event)"
        @clear-all="emit('filter-clear-all')"
      />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SearchSelect from '../components/SearchSelect.vue'
import BasePagination from '../components/BasePagination.vue'
import BaseFilterChips from '../components/BaseFilterChips.vue'

const props = defineProps({
  activeQuickView: { type: [String, null], default: null },
  filterChips: { type: Array, default: () => [] },
  filtroOrden: { type: Array, default: () => [] },
  pagination: { type: Object, required: true }
})

const emit = defineEmits([
  'quick-view',
  'order-change',
  'filter-remove',
  'filter-clear-all',
  'pagination-change',
  'open-filters'
])

const quickViews = [
  { key: 'all',        label: 'Todos',          icon: 'fa-list',         highlight: true, title: 'Limpiar todos los filtros' },
  { key: 'priority',   label: 'Alta Prioridad', icon: 'fa-bolt',         title: 'Edicion proxima (14d), interes bajo, estados activos' },
  { key: 'follow',     label: 'Seguimiento',    icon: 'fa-phone',        title: 'Pendientes de contacto' },
  { key: 'will_pay',   label: 'Pagara',         icon: 'fa-coins',        title: 'Leads que comprometieron pago' }
]

const paginationModel = computed({
  get: () => props.pagination,
  set: (val) => emit('pagination-change', val)
})
</script>
