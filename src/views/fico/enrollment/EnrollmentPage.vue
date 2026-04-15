<template>
  <div class="enrollment-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">FICO</span>
        <h1 class="ep-title">Inscripciones</h1>
      </div>
      <div class="ep-masthead-actions">
        <div class="ep-view-toggle">
          <button :class="['ep-toggle-btn', { 'is-active': list.viewMode.value === 'compact' }]" @click="list.viewMode.value = 'compact'">
            <i class="fa-solid fa-list"></i> Compacta
          </button>
          <button :class="['ep-toggle-btn', { 'is-active': list.viewMode.value === 'expanded' }]" @click="list.viewMode.value = 'expanded'">
            <i class="fa-solid fa-table-columns"></i> Expandida
          </button>
        </div>
        <button class="ep-btn-new" @click="list.goNew()"><i class="fa-solid fa-plus"></i> Nueva inscripcion</button>
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
  --e-bg-subtle: #FAFAFA;
  --e-border: #EFEFEF;
  --e-text: #1A1A1A;
  --e-text-secondary: #737373;
  --e-text-muted: #A3A3A3;
  --e-accent: #0D9488;
  --e-accent-soft: #F0FDFA;

  background: var(--e-bg);
  padding: 32px 32px 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  min-height: 100vh;
}

.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
}

.ep-masthead-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ep-breadcrumb {
  font-size: 11px;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
}

.ep-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
}

.ep-masthead-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ep-view-toggle {
  display: flex;
  background: var(--e-bg-subtle);
  border-radius: 8px;
  padding: 3px;
}

.ep-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--e-text-secondary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all .2s ease;
  font-family: inherit;
}
.ep-toggle-btn.is-active {
  background: #fff;
  color: var(--e-text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04);
}
.ep-toggle-btn:not(.is-active):hover {
  color: var(--e-text);
}

.ep-btn-new {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--e-text);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .2s ease;
  font-family: inherit;
  letter-spacing: -0.01em;
}
.ep-btn-new:hover { background: #333; }
.ep-btn-new i { font-size: 11px; }

.ep-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
</style>
