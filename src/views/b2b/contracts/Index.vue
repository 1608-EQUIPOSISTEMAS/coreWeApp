<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Contratos B2B</h1>
        <p class="ds-sub">{{ formatValue(list.totalFiltered.value, 'num') }} contratos con los filtros actuales · acuerdos, cupos y cobranza</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" @click="list.goNew()">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo contrato
        </button>
      </div>
    </header>

    <!-- Cada tarjeta es el atajo a su vista rápida: al marcarla, la tabla queda
         filtrada por lo mismo que cuenta la cifra. -->
    <div class="ds-kpis">
      <article
        v-for="k in kpiCards"
        :key="k.key"
        class="ds-kpi ix-kpi"
        :class="{ 'is-active': list.activeViewKey.value === k.viewKey }"
        role="button"
        tabindex="0"
        :aria-pressed="String(list.activeViewKey.value === k.viewKey)"
        @click="list.applySavedView(k.viewKey)"
        @keydown.enter="list.applySavedView(k.viewKey)"
      >
        <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="list.isLoading.value" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ k.value }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.foot }}</span>
        </div>
      </article>
    </div>

    <BaseFilterChips
      :items="list.activeFilterChips.value"
      @remove="list.clearFilter"
      @clear-all="list.clearFilters"
    />

    <section class="ds-panel">
      <div class="ds-panel-body ds-stack">
        <div class="ix-toolbar">
          <div class="ds-tabs" aria-label="Vistas rápidas">
            <button
              v-for="v in list.savedViews.value"
              :key="v.key"
              type="button"
              :aria-pressed="String(list.activeViewKey.value === v.key)"
              @click="list.applySavedView(v.key)"
            >
              <i class="fa-solid" :class="v.icon" aria-hidden="true"></i> {{ v.label }}
            </button>
          </div>
          <BasePagination
            v-model="list.pagin.value"
            hide-filters
            :emit-refresh="true"
            @change="list.handlePaginationChange"
            @refresh="list.fetchContracts"
          />
        </div>

        <ContractsTable
          :contracts="list.pagedContracts.value"
          :col-filters="list.colFilters"
          :is-loading="list.isLoading.value"
          :selected-id="list.selectedContract.value?.contract_id"
          @select-row="list.selectContract"
          @edit="list.editContract"
          @view-company="list.viewCompany"
          @clear-col-filters="list.clearColFilters"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import ContractsTable from './ContractsTable.vue'
import { formatValue } from '@/shared/lib/formatValue'
import { useContractList } from '@/composables/useContractList'

const list = useContractList()

// La plata de la cartera no se convierte entre monedas: si hay saldo en dolares
// se muestra aparte en el pie, nunca sumado a los soles con un tipo de cambio
// que el front no tiene por que conocer.
const kpiCards = computed(() => {
  const k = list.kpis.value
  return [
    {
      key: 'total', viewKey: 'all', label: 'Contratos', icon: 'fa-file-signature', tone: '',
      value: formatValue(k.total, 'num'),
      foot: 'Contratos registrados'
    },
    {
      key: 'active', viewKey: 'active', label: 'Vigentes', icon: 'fa-circle-check', tone: 'ok',
      value: formatValue(k.active, 'num'),
      foot: k.total ? `${Math.round((k.active / k.total) * 100)}% de la cartera` : 'Sin contratos'
    },
    {
      key: 'balance', viewKey: 'with_balance', label: 'Por cobrar', icon: 'fa-coins', tone: 'warn',
      value: formatValue(k.pendingPen || 0, 'soles'),
      foot: k.pendingUsd > 0
        ? `+ ${formatValue(k.pendingUsd, 'usd')} en dólares`
        : 'Saldo pendiente en soles'
    },
    {
      key: 'seats', viewKey: 'free_seats', label: 'Cupos libres', icon: 'fa-chair', tone: '',
      value: formatValue(k.freeSeats, 'num'),
      foot: 'Comprados sin beneficiario'
    }
  ]
})

// El paginador no sabe cuantas filas sobrevivieron al filtro, hay que decirselo.
// Y si el filtro deja menos paginas que la actual, hay que retroceder o la tabla
// queda en blanco sobre una pagina que ya no existe.
watch(list.totalFiltered, total => {
  list.pagin.value.total = total
  const lastPage = Math.max(1, Math.ceil(total / list.pagin.value.size))
  if (list.pagin.value.page > lastPage) list.pagin.value.page = lastPage
}, { immediate: true })

onMounted(async () => {
  await list.fetchContracts()
  list.applyQueryFilters()
})
</script>

<style scoped>
.ix-kpi { cursor: pointer; transition: border-color 0.15s; }
.ix-kpi:hover { border-color: var(--ds-border-strong); }
.ix-kpi:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 2px; }
.ix-kpi.is-active { border-color: var(--ds-accent); box-shadow: inset 0 0 0 1px var(--ds-accent); }

/* Vistas rápidas a la izquierda, paginador a la derecha; bajo 900 px se apilan. */
.ix-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.ix-toolbar .ds-tabs i { margin-right: 4px; font-size: 11px; }
</style>
