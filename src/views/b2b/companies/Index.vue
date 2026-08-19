<template>
  <div class="companies-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">B2B</span>
        <h1 class="ep-title">Empresas</h1>
        <span class="ep-subtitle">Cartera corporativa</span>
      </div>
      <div class="ep-masthead-actions">
        <button class="ep-btn-new" @click="list.goNew()">
          <i class="fa-solid fa-plus"></i> Nueva empresa
        </button>
      </div>
    </header>

    <!-- KPIs -->
    <section class="ep-section">
      <div class="ep-kpis">
        <article
          v-for="k in kpiCards"
          :key="k.key"
          class="ep-kpi"
          :class="[`ep-kpi-${k.color}`, { 'is-active': list.activeViewKey.value === k.viewKey }]"
          @click="list.applySavedView(k.viewKey)"
        >
          <div class="ep-kpi-head">
            <span class="ep-kpi-label">{{ k.label }}</span>
            <i class="fa-solid ep-kpi-icon" :class="k.icon"></i>
          </div>
          <div class="ep-kpi-main">
            <span v-if="list.isLoading.value" class="sk-kpi"></span>
            <span v-else class="ep-kpi-value">{{ k.value.toLocaleString('es-PE') }}</span>
          </div>
          <!-- Sin historico diario que comparar, el pie dice cuanto pesa sobre el
               total: un "vs ayer" aca seria un numero inventado. -->
          <span class="ep-kpi-foot">
            <template v-if="k.viewKey === 'all'">Empresas activas en la cartera</template>
            <template v-else><strong>{{ k.share }}%</strong> de la cartera</template>
          </span>
        </article>
      </div>
    </section>

    <!-- Vistas rápidas + toolbar -->
    <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': list.activeFilterChips.value.length > 0 }">
      <div class="ep-filter-bar-main">
        <nav class="ep-tabs" aria-label="Vistas rapidas">
          <button
            v-for="v in list.savedViews.value"
            :key="v.key"
            :class="['ep-tab', { 'is-active': list.activeViewKey.value === v.key, 'is-highlight': v.highlight }]"
            @click="list.applySavedView(v.key)"
          >
            <i class="fa-solid" :class="v.icon"></i> {{ v.label }}
          </button>
        </nav>

        <div class="ep-toolbar">
          <BasePagination
            v-model="list.pagin.value"
            hide-filters
            :emit-refresh="true"
            @change="list.handlePaginationChange"
            @refresh="list.fetchCompanies"
          />
        </div>
      </div>

      <div v-if="list.activeFilterChips.value.length > 0" class="ep-filter-strip">
        <span class="ep-filter-strip-badge">
          <i class="fa-solid fa-circle-half-stroke"></i>
          Filtros activos
          <span class="ep-filter-strip-count">{{ list.activeFilterChips.value.length }}</span>
        </span>
        <BaseFilterChips
          :items="list.activeFilterChips.value"
          @remove="list.clearFilter"
          @clear-all="list.clearFilters"
        />
      </div>
    </section>

    <CompaniesTable
      :companies="list.pagedCompanies.value"
      :col-filters="list.colFilters"
      :is-loading="list.isLoading.value"
      :selected-id="list.selectedCompany.value?.company_id"
      :sector-label="list.sectorLabel"
      :classification-label="list.classificationLabel"
      :tipo-label="list.tipoLabel"
      @select-row="list.selectCompany"
      @edit="list.editCompany"
      @view-leads="list.viewLeads"
      @view-contracts="list.viewContracts"
      @clear-col-filters="list.clearColFilters"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import CompaniesTable from './CompaniesTable.vue'
import { useCompanyList } from '@/composables/useCompanyList'

const list = useCompanyList()
const route = useRoute()

const kpiCards = computed(() => {
  const k = list.kpis.value
  const share = n => (k.total ? Math.round((n / k.total) * 100) : 0)
  return [
    { key: 'total',        viewKey: 'all',           label: 'Empresas',       icon: 'fa-building',       color: 'indigo', value: k.total,        share: 100 },
    { key: 'contract',     viewKey: 'with_contract', label: 'Con contrato',   icon: 'fa-file-signature', color: 'green',  value: k.withContract, share: share(k.withContract) },
    { key: 'no_contact',   viewKey: 'no_contact',    label: 'Sin contacto',   icon: 'fa-user-slash',     color: 'amber',  value: k.noContact,    share: share(k.noContact) },
    { key: 'unclassified', viewKey: 'unclassified',  label: 'Sin clasificar', icon: 'fa-tags',           color: 'teal',   value: k.unclassified, share: share(k.unclassified) }
  ]
})

// El paginador es tonto: no sabe cuantas filas sobrevivieron al filtro, hay que
// decirselo. Y si el filtro deja menos paginas que la actual, hay que retroceder
// o la tabla queda en blanco sobre una pagina que ya no existe.
watch(list.totalFiltered, total => {
  list.pagin.value.total = total
  const lastPage = Math.max(1, Math.ceil(total / list.pagin.value.size))
  if (list.pagin.value.page > lastPage) list.pagin.value.page = lastPage
}, { immediate: true })

onMounted(async () => {
  await list.fetchCompanies()
  // Llegada desde Contratos: el boton de empresa manda ?q=<ruc o razon social>.
  if (route.query.q) list.filters.q = String(route.query.q)
})
</script>

<style scoped>
.companies-page {
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
}

/* === Masthead === */
.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}
.ep-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ep-breadcrumb {
  font-size: 11px;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.ep-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle { font-size: 13.5px; color: var(--e-text-secondary); margin-top: 2px; }
.ep-masthead-actions { display: flex; align-items: center; gap: 10px; }
.ep-btn-new {
  display: inline-flex; align-items: center; gap: 7px;
  height: 38px; box-sizing: border-box; padding: 0 18px;
  font-size: 13px; font-weight: 600;
  color: #fff; background: var(--we-navy, #002060);
  border: none; border-radius: 8px; cursor: pointer;
  transition: background .2s ease; font-family: inherit;
  letter-spacing: -0.01em;
}
.ep-btn-new:hover { background: var(--we-navy-dark, #001540); }
.ep-btn-new i { font-size: 11px; }

/* === Section wrapper === */
.ep-section { background: transparent; border: none; padding: 0; margin-bottom: 14px; }
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(16, 185, 129, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.06);
}
.ep-filter-bar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.ep-section.ep-filter-bar .ep-tabs {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
  flex: 0 1 auto;
}
.ep-section.ep-filter-bar .ep-toolbar { flex: 1 1 auto; justify-content: flex-end; }

.ep-filter-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-top: 1px solid var(--e-border);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.ep-filter-strip-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: #047857;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.ep-filter-strip-badge i { font-size: 11px; }
.ep-filter-strip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  background: var(--e-accent);
  color: #fff;
  border-radius: 9px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ep-filter-strip :deep(.active-filters) { margin-bottom: 0; flex: 1 1 auto; }
.ep-filter-strip :deep(.active-filters .label) { display: none; }

/* === KPI cards === */
.ep-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.ep-kpi {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ep-kpi:hover {
  border-color: var(--e-border-strong);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04);
}
/* La tarjeta es el atajo a su vista: marcarla cierra el circulo de "hice clic en
   Sin contacto y la tabla quedo filtrada por eso". */
.ep-kpi.is-active { border-color: currentColor; }
.ep-kpi::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: currentColor;
}
.ep-kpi-head { display: flex; justify-content: space-between; align-items: center; }
.ep-kpi-label {
  font-size: 11px; font-weight: 600;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ep-kpi-icon { font-size: 12px; color: currentColor; opacity: 0.65; }
.ep-kpi-main { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ep-kpi-value {
  font-size: 30px;
  font-weight: 600;
  color: var(--e-text);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.ep-kpi-foot {
  font-size: 11px; color: var(--e-text-muted);
  border-top: 1px solid var(--e-border);
  padding-top: 8px; margin-top: 2px;
}
.ep-kpi-foot strong { color: var(--e-text-secondary); font-weight: 600; font-variant-numeric: tabular-nums; }

.ep-kpi-indigo { color: #6366F1; }
.ep-kpi-amber  { color: #D97706; }
.ep-kpi-green  { color: #10B981; }
.ep-kpi-teal   { color: #0D9488; }

.sk-kpi {
  display: block;
  width: 72px; height: 30px;
  border-radius: 6px;
  background: linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: kpi-shimmer 1.4s ease-in-out infinite;
}
@keyframes kpi-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* === Tabs === */
.ep-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.ep-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px;
  font-size: 12.5px; font-weight: 500;
  color: var(--e-text-secondary);
  background: var(--e-bg-subtle);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s ease;
  font-family: inherit;
}
.ep-tab i { font-size: 11px; opacity: 0.7; }
.ep-tab:hover { color: var(--e-text); background: #F5F5F5; }
.ep-tab.is-active {
  color: var(--e-accent);
  background: var(--e-accent-soft);
  border-color: rgba(13, 148, 136, 0.25);
  font-weight: 600;
}
.ep-tab.is-active i { opacity: 1; }
.ep-tab.is-highlight::before {
  content: '';
  display: inline-block;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--e-accent);
  margin-right: 6px;
  vertical-align: middle;
}

/* === Toolbar === */
.ep-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

/* === Responsive === */
@media (max-width: 1280px) {
  .ep-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .ep-masthead { flex-direction: column; align-items: flex-start; gap: 12px; }
  .ep-kpis { grid-template-columns: 1fr; }
}

/* ════════ DARK MODE ════════ */
[data-coreui-theme="dark"] .companies-page {
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16,185,129,0.16);
}
[data-coreui-theme="dark"] .companies-page .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .companies-page .ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(52, 211, 153, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}
[data-coreui-theme="dark"] .companies-page .ep-filter-strip {
  border-top-color: #2A2A22;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0.04));
}
[data-coreui-theme="dark"] .companies-page .ep-filter-strip-badge { color: #34D399; }
[data-coreui-theme="dark"] .companies-page .ep-kpi { background: #1A1A14; }
[data-coreui-theme="dark"] .companies-page .ep-kpi:hover {
  border-color: #3A3A33;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.35);
}
[data-coreui-theme="dark"] .companies-page .ep-btn-new { background: #F4F4F0; color: #14140F; }
[data-coreui-theme="dark"] .companies-page .ep-btn-new:hover { background: #E4E4DD; }
[data-coreui-theme="dark"] .companies-page .ep-tab { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .companies-page .ep-tab:hover { background: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .companies-page .sk-kpi {
  background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%);
  background-size: 200% 100%;
}
</style>
