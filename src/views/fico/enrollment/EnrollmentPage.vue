<template>
  <div class="enrollment-page">
    <span class="ep-breadcrumb">FICO / Inscripciones</span>

    <header class="ep-masthead">
      <h1 class="ep-title">Inscripciones</h1>
      <div class="ep-masthead-actions">
        <div class="ep-view-toggle">
          <button :class="['ep-toggle-btn', { 'is-active': list.viewMode.value === 'compact' }]" @click="list.viewMode.value = 'compact'">
            <i class="fa-solid fa-list"></i> Compacta
          </button>
          <button :class="['ep-toggle-btn', { 'is-active': list.viewMode.value === 'expanded' }]" @click="list.viewMode.value = 'expanded'">
            <i class="fa-solid fa-table-columns"></i> Expandida
          </button>
        </div>
        <button class="ep-btn-new" @click="list.goNew()"><i class="fa-solid fa-plus"></i> Nuevo</button>
      </div>
    </header>

    <div class="ep-toolbar">
      <BaseFilterChips :items="list.activeFilterChips.value" @remove="list.clearFilter" @clear-all="list.clearFilters" />
      <BasePagination v-model="list.pagin.value" @open-filters="list.openFilterModal" @change="list.handlePaginationChange" />
    </div>

    <EnrollmentCompactTable
      v-if="list.viewMode.value === 'compact'"
      :enrollments="list.filteredEnrollments.value"
      :col-filters="list.colFilters"
      :unique-agents="list.uniqueAgents.value"
      :unique-estados="list.uniqueEstados.value"
    />

    <EnrollmentExpandedTable
      v-if="list.viewMode.value === 'expanded'"
      :enrollments="list.filteredEnrollments.value"
    />

    <EnrollmentFilterModal
      :visible="list.showFilterModal.value"
      @update:visible="v => list.showFilterModal.value = v"
      :filters="list.filters"
      :filtro-status="list.filtroStatus.value"
      :filtro-owners="list.filtroOwners.value"
      :filtro-payment-channel="list.filtroPaymentChannel.value"
      :filtro-tipos-programa="list.filtroTiposPrograma.value"
      :filtro-modalidad="list.filtroModalidad.value"
      :filtro-orden="list.filtroOrden.value"
      @apply="list.applyFilters"
      @clear="list.clearFilters"
      @date-change="list.handleDateChange"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useEnrollmentList } from '@/composables/useEnrollmentList'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import EnrollmentCompactTable from './EnrollmentCompactTable.vue'
import EnrollmentExpandedTable from './EnrollmentExpandedTable.vue'
import EnrollmentFilterModal from './EnrollmentFilterModal.vue'

const list = useEnrollmentList()

onMounted(() => {
  list.loadOwners()
  list.fetchEnrollments()
})
</script>

<style scoped>
.enrollment-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #F9FAFB;
  --e-bg-muted: #F3F4F6;
  --e-border: #E5E7EB;
  --e-text: #111827;
  --e-text-secondary: #6B7280;
  --e-text-muted: #9CA3AF;
  --e-accent: #0D9488;
  --e-accent-soft: #F0FDFA;
  --e-success: #059669;
  --e-warning: #D97706;
  --e-danger: #DC2626;

  background: var(--e-bg);
  padding: 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  min-height: 100vh;
}

.ep-breadcrumb {
  display: block; font-size: 11px; color: var(--e-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; font-weight: 600;
}

.ep-masthead {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
}

.ep-title { font-size: 20px; font-weight: 700; color: var(--e-text); margin: 0; }

.ep-masthead-actions { display: flex; align-items: center; gap: 12px; }

.ep-view-toggle {
  display: flex; border: 1px solid var(--e-border); border-radius: 20px; overflow: hidden;
}

.ep-toggle-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 12.5px; font-weight: 600;
  color: var(--e-text-secondary); background: var(--e-bg);
  border: none; cursor: pointer; transition: all .15s;
}
.ep-toggle-btn:first-child { border-right: 1px solid var(--e-border); }
.ep-toggle-btn.is-active { background: var(--e-accent); color: #fff; }
.ep-toggle-btn:not(.is-active):hover { background: var(--e-bg-subtle); }

.ep-btn-new {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; font-size: 12.5px; font-weight: 600;
  color: #fff; background: var(--e-accent); border: none;
  border-radius: 6px; cursor: pointer; transition: opacity .15s;
}
.ep-btn-new:hover { opacity: 0.9; }

.ep-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
}
</style>
