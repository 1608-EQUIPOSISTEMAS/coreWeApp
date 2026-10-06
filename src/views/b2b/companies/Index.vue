<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Empresas</h1>
        <p class="ds-sub">
          {{ list.isLoading.value
            ? 'Cargando la cartera…'
            : `${formatValue(list.totalFiltered.value, 'num')} de ${formatValue(list.kpis.value.total, 'num')} empresas de la cartera corporativa` }}
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" @click="list.goNew()">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nueva empresa
        </button>
      </div>
    </header>

    <!-- Cada tarjeta es el atajo a su vista: marcarla cierra el circulo de "hice
         clic en Sin contacto y la tabla quedo filtrada por eso". -->
    <section class="ds-kpis" aria-label="Resumen de la cartera">
      <button
        v-for="k in kpiCards"
        :key="k.key"
        type="button"
        class="ds-kpi emp-kpi"
        :class="{ 'is-active': list.activeViewKey.value === k.viewKey }"
        :aria-pressed="String(list.activeViewKey.value === k.viewKey)"
        @click="list.applySavedView(k.viewKey)"
      >
        <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <span class="ds-kpi-body">
          <span class="ds-kpi-row">
            <span v-if="list.isLoading.value" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ formatValue(k.value, 'num') }}</span>
          </span>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <!-- Sin historico diario que comparar, la nota dice cuanto pesa sobre el
               total: un "vs ayer" aca seria un numero inventado. -->
          <span class="ds-kpi-note">
            <template v-if="k.viewKey === 'all'">Empresas activas en la cartera</template>
            <template v-else>{{ k.share }}% de la cartera</template>
          </span>
        </span>
      </button>
    </section>

    <BaseFilterChips
      :items="list.activeFilterChips.value"
      @remove="list.clearFilter"
      @clear-all="list.clearFilters"
    />

    <section class="ds-panel">
      <div class="ds-panel-body emp-body">
        <div class="emp-toolbar">
          <div class="ds-tabs" role="tablist" aria-label="Vistas rápidas">
            <button
              v-for="v in list.savedViews.value"
              :key="v.key"
              type="button"
              role="tab"
              :aria-selected="String(list.activeViewKey.value === v.key)"
              @click="list.applySavedView(v.key)"
            >
              <i class="fa-solid emp-tab-icon" :class="v.icon" aria-hidden="true"></i> {{ v.label }}
            </button>
          </div>
          <BasePagination
            v-model="list.pagin.value"
            hide-filters
            :emit-refresh="true"
            @change="list.handlePaginationChange"
            @refresh="list.fetchCompanies"
          />
        </div>

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
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import CompaniesTable from './CompaniesTable.vue'
import { useCompanyList } from '@/composables/useCompanyList'
import { formatValue } from '@/shared/lib/formatValue'

const list = useCompanyList()
const route = useRoute()

// tone = clase de .ds-kpi-icon: "sin contacto" y "sin clasificar" son trabajo
// pendiente (warn); el total no es bueno ni malo.
const kpiCards = computed(() => {
  const k = list.kpis.value
  const share = n => (k.total ? Math.round((n / k.total) * 100) : 0)
  return [
    { key: 'total',        viewKey: 'all',           label: 'Empresas',       icon: 'fa-building',       tone: '',     value: k.total,        share: 100 },
    { key: 'contract',     viewKey: 'with_contract', label: 'Con contrato',   icon: 'fa-file-signature', tone: 'ok',   value: k.withContract, share: share(k.withContract) },
    { key: 'no_contact',   viewKey: 'no_contact',    label: 'Sin contacto',   icon: 'fa-user-slash',     tone: 'warn', value: k.noContact,    share: share(k.noContact) },
    { key: 'unclassified', viewKey: 'unclassified',  label: 'Sin clasificar', icon: 'fa-tags',           tone: 'warn', value: k.unclassified, share: share(k.unclassified) }
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
/* La tarjeta KPI es un <button> (filtra la tabla): se le quita el aspecto nativo. */
.emp-kpi { width: 100%; font: inherit; text-align: left; cursor: pointer; transition: border-color 0.15s; }
.emp-kpi:hover { border-color: var(--ds-border-strong); }
.emp-kpi.is-active { border-color: var(--ds-accent); box-shadow: inset 3px 0 0 var(--ds-accent); }
.emp-kpi:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 2px; }

.emp-body { display: flex; flex-direction: column; gap: 14px; }
/* Vistas rapidas y paginacion en una linea; al achicarse se apilan. */
.emp-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
.emp-tab-icon { margin-right: 4px; font-size: 11px; opacity: 0.75; }
</style>
