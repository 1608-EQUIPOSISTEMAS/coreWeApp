<template>
  <!-- eslint-disable vue/no-mutating-props -- colFilters es el reactive de la
       lista que el padre comparte a proposito (mismo patron que CompaniesTable):
       la fila de filtros lo escribe directo y la lista recalcula la tabla. -->
  <div class="ds-table-scroll">
    <table class="ds-table ds-table--lista ct-table">
      <thead>
        <tr>
          <th class="ct-actions">Acciones</th>
          <th>Empresa</th>
          <th>Tipo</th>
          <th>Nombre del contrato</th>
          <th class="num">Monto</th>
          <th class="num">Pagado</th>
          <th class="num">Saldo</th>
          <th class="ct-center">Cupos</th>
          <th class="num">F. cierre</th>
          <th class="num">F. inicio</th>
          <th class="num">F. fin</th>
          <th class="ct-center">Estado</th>
        </tr>
        <!-- Toda columna filtra desde esta fila. Texto -> caja de escribir,
             categoria -> desplegable, dinero -> piso (>=). -->
        <tr class="ct-filters">
          <td class="ct-actions">
            <button
              class="btn-icon btn-icon-sm"
              type="button"
              title="Limpiar filtros de columna"
              aria-label="Limpiar filtros de columna"
              @click="$emit('clear-col-filters')"
            >
              <i class="fa-solid fa-eraser" aria-hidden="true"></i>
            </button>
          </td>
          <td>
            <input v-model="colFilters.empresa" class="ds-input ct-filter-input" placeholder="Empresa o RUC..." aria-label="Filtrar por empresa o RUC" />
          </td>
          <td>
            <ColumnFilterDropdown
              column-label="Tipo"
              :all-items="contracts"
              :value-extractor="c => c.contract_type_label || '(Sin tipo)'"
              v-model="colFilters.tipo"
            />
          </td>
          <td>
            <input v-model="colFilters.nombre" class="ds-input ct-filter-input" placeholder="Buscar..." aria-label="Filtrar por nombre del contrato" />
          </td>
          <td></td>
          <td></td>
          <td>
            <input v-model="colFilters.saldoMin" type="number" min="0" class="ds-input ct-filter-input ct-filter-num" placeholder="&ge; 0" aria-label="Saldo mínimo" />
          </td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td class="ct-center">
            <ColumnFilterDropdown
              column-label="Estado"
              :all-items="contracts"
              :value-extractor="contractStatus"
              :fixed-options="['Activo', 'Vencido', 'Cancelado']"
              v-model="colFilters.estado"
            />
          </td>
        </tr>
      </thead>

      <tbody>
        <template v-if="isLoading">
          <tr v-for="n in 10" :key="'sk-' + n">
            <td colspan="12"><span class="ds-skel"></span></td>
          </tr>
        </template>

        <template v-else>
          <tr
            v-for="c in contracts"
            :key="c.contract_id"
            class="link"
            :class="{ 'is-selected': c.contract_id === selectedId, 'is-cancelled': contractStatus(c) === 'Cancelado' }"
            @click="$emit('select-row', c)"
            @dblclick="$emit('edit', c)"
          >
            <td class="ct-actions">
              <button class="btn-icon btn-icon-sm" type="button" title="Ver / editar contrato" aria-label="Ver o editar contrato" @click.stop="$emit('edit', c)">
                <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
              </button>
              <button class="btn-icon btn-icon-sm" type="button" title="Ver la empresa" aria-label="Ver la empresa" @click.stop="$emit('view-company', c)">
                <i class="fa-solid fa-building" aria-hidden="true"></i>
              </button>
            </td>

            <td class="ct-empresa">
              <span class="ct-main ct-clip" :title="c.company_name">{{ c.company_name }}</span>
              <span v-if="c.document_number" class="ct-sub ct-mono">{{ c.document_number }}</span>
            </td>

            <td>
              <span v-if="c.contract_type_label" class="ds-pill">{{ c.contract_type_label }}</span>
              <span v-else class="ct-unfilled">Sin tipo</span>
            </td>

            <td class="ct-nombre">
              <span class="ct-clip" :title="c.contract_name">{{ c.contract_name || '—' }}</span>
            </td>

            <td class="num">{{ money(c.total_amount, c.currency_alias) }}</td>
            <td class="num">{{ money(c.paid_amount, c.currency_alias) }}</td>
            <td class="num" :class="Number(c.pending_amount) > 0 ? 'warn' : 'ct-muted'">
              {{ money(c.pending_amount, c.currency_alias) }}
            </td>

            <td class="ct-center">
              <span class="ds-pill" :class="seatsFree(c) < 0 ? 'bad' : 'info'">
                {{ c.seats_assigned || 0 }}/{{ c.number_of_licenses || 0 }}
              </span>
              <span v-if="Number(c.seats_enrolled) > 0" class="ct-sub">{{ c.seats_enrolled }} inscritos</span>
            </td>

            <td class="num">{{ formatDate(c.close_date) }}</td>
            <td class="num">{{ formatDate(c.start_date) }}</td>
            <td class="num">{{ formatDate(c.end_date) }}</td>

            <td class="ct-center">
              <span class="ds-pill" :class="statusTone(c)">{{ contractStatus(c) }}</span>
            </td>
          </tr>

          <tr v-if="!contracts.length">
            <td colspan="12" class="ds-empty ds-empty--lista">
              No hay contratos con estos filtros. Quita un filtro o cambia la vista rápida para ver más.
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import { contractStatus, seatsFree } from '@/composables/useContractList'

defineProps({
  contracts: { type: Array, default: () => [] },
  colFilters: { type: Object, required: true },
  isLoading: { type: Boolean, default: false },
  selectedId: { type: [Number, String], default: null }
})

defineEmits(['select-row', 'edit', 'view-company', 'clear-col-filters'])

// Cancelado queda neutro: es historial, no un error. Vencido avisa (renovar).
function statusTone (contract) {
  const estado = contractStatus(contract)
  if (estado === 'Activo') return 'ok'
  if (estado === 'Vencido') return 'warn'
  return ''
}

function formatDate (value) {
  if (!value) return '—'
  const [y, m, d] = String(value).split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// El simbolo sale del alias del catalogo de moneda, no de la plaza del
// navegador: un contrato en USD tiene que leerse en USD aunque el usuario
// este en Peru.
function money (value, currencyAlias) {
  if (value === null || value === undefined || value === '') return '—'
  const simbolo = currencyAlias === 'we_currency_dollars' ? '$' : 'S/'
  return `${simbolo} ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<style scoped>
/* La primera celda del ds-table va en negrita de título: aquí es la de acciones. */
.ct-table td.ct-actions { font-weight: 400; white-space: nowrap; }
.ct-actions { width: 76px; text-align: center; }
.ct-actions .btn-icon + .btn-icon { margin-left: 4px; }
.ct-center { text-align: center; }

.ct-filters td { padding-top: 6px; padding-bottom: 6px; background: var(--ds-surface-2); }
.ct-filter-input { height: 30px; min-width: 110px; padding: 4px 8px; font-size: 12px; }
/* Las flechitas del input number no caben en 30px de alto y tapan el monto. */
.ct-filter-num { text-align: right; -moz-appearance: textfield; }
.ct-filter-num::-webkit-outer-spin-button,
.ct-filter-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* Fila elegida: tinte y barra de acento, así se sabe cuál abre el doble clic. */
.ct-table tr.is-selected td { background: var(--ds-soft-info); }
.ct-table tr.is-selected td:first-child { box-shadow: inset 3px 0 0 var(--ds-accent); }
/* Un contrato cancelado sigue en la lista por historial, pero no compite
   visualmente con los vigentes. */
.ct-table tr.is-cancelled td { opacity: .55; }

.ct-main { font-weight: 600; color: var(--ds-heading); }
.ct-sub { display: block; margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.ct-clip { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.ct-empresa { max-width: 230px; }
.ct-nombre { max-width: 260px; }
.ct-mono { font-family: var(--ds-font-mono); }
.ct-muted { color: var(--ds-muted); }
.ct-unfilled { font-size: 11.5px; font-style: italic; color: var(--ds-muted); }

@media (max-width: 768px) {
  .ct-clip { max-width: 140px; }
}
</style>
