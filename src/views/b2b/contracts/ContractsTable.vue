<template>
  <div class="ect-wrap">
    <table class="ect">
      <thead>
        <tr class="ect-head">
          <th class="tc" style="width:84px">Acciones</th>
          <th>Empresa</th>
          <th style="width:130px">Tipo</th>
          <th>Nombre del Contrato</th>
          <th class="tr" style="width:110px">Monto</th>
          <th class="tr" style="width:105px">Pagado</th>
          <th class="tr" style="width:105px">Saldo</th>
          <th class="tc" style="width:100px">Cupos</th>
          <th class="tc" style="width:95px">F. Cierre</th>
          <th class="tc" style="width:95px">F. Inicio</th>
          <th class="tc" style="width:95px">F. Fin</th>
          <th class="tc" style="width:110px">Estado</th>
        </tr>
        <!-- Toda columna filtra desde esta fila. Texto -> caja de escribir,
             categoria -> desplegable, dinero -> piso (>=). -->
        <tr class="ect-filters">
          <td class="tc">
            <button class="filter-clear" title="Limpiar filtros de columna" @click="$emit('clear-col-filters')">
              <i class="fa-solid fa-eraser"></i>
            </button>
          </td>
          <td>
            <input v-model="colFilters.empresa" class="filter-input" placeholder="Empresa o RUC..." />
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
            <input v-model="colFilters.nombre" class="filter-input" placeholder="Buscar..." />
          </td>
          <td></td>
          <td></td>
          <td>
            <input v-model="colFilters.saldoMin" type="number" min="0" class="filter-input tr" placeholder="&ge; 0" />
          </td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td class="tc">
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
          <tr v-for="n in 10" :key="'sk-' + n" class="skeleton-row">
            <td class="tc"><div class="sk-cell" style="width:60px;margin:0 auto"></div></td>
            <td>
              <div class="sk-cell" style="width:160px"></div>
              <div class="sk-cell mt-1" style="width:90px;height:8px"></div>
            </td>
            <td><div class="sk-cell" style="width:80px"></div></td>
            <td><div class="sk-cell" style="width:180px"></div></td>
            <td class="tr"><div class="sk-cell" style="width:80px;margin-left:auto"></div></td>
            <td class="tr"><div class="sk-cell" style="width:70px;margin-left:auto"></div></td>
            <td class="tr"><div class="sk-cell" style="width:70px;margin-left:auto"></div></td>
            <td class="tc"><div class="sk-cell" style="width:50px;margin:0 auto"></div></td>
            <td class="tc"><div class="sk-cell" style="width:60px;margin:0 auto"></div></td>
            <td class="tc"><div class="sk-cell" style="width:60px;margin:0 auto"></div></td>
            <td class="tc"><div class="sk-cell" style="width:60px;margin:0 auto"></div></td>
            <td class="tc"><div class="sk-cell" style="width:70px;margin:0 auto"></div></td>
          </tr>
        </template>

        <template v-else>
          <tr
            v-for="c in contracts"
            :key="c.contract_id"
            class="ect-row"
            :class="{ 'is-selected': c.contract_id === selectedId, 'is-cancelled': contractStatus(c) === 'Cancelado' }"
            @click="$emit('select-row', c)"
            @dblclick="$emit('edit', c)"
          >
            <td class="tc nowrap">
              <button class="act-btn act-teal" title="Ver / editar contrato" @click.stop="$emit('edit', c)">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="act-btn act-teal ms-1" title="Ver la empresa" @click.stop="$emit('view-company', c)">
                <i class="fa-solid fa-building"></i>
              </button>
            </td>

            <td class="col-empresa">
              <div class="cell-main cell-clip" :title="c.company_name">{{ c.company_name }}</div>
              <div v-if="c.document_number" class="cell-sub mono">{{ c.document_number }}</div>
            </td>

            <td>
              <span v-if="c.contract_type_label" class="pill pill-sm pill-slate">{{ c.contract_type_label }}</span>
              <span v-else class="unfilled">Sin tipo</span>
            </td>

            <td class="col-nombre">
              <span class="cell-clip" :title="c.contract_name">{{ c.contract_name || '—' }}</span>
            </td>

            <td class="tr mono">{{ money(c.total_amount, c.currency_alias) }}</td>
            <td class="tr mono">{{ money(c.paid_amount, c.currency_alias) }}</td>
            <td class="tr mono" :class="Number(c.pending_amount) > 0 ? 'c-amber fw700' : 'c-muted'">
              {{ money(c.pending_amount, c.currency_alias) }}
            </td>

            <td class="tc">
              <span class="pill pill-sm" :class="seatsFree(c) < 0 ? 'pill-red' : 'pill-blue'">
                {{ c.seats_assigned || 0 }}/{{ c.number_of_licenses || 0 }}
              </span>
              <div v-if="Number(c.seats_enrolled) > 0" class="cell-sub">{{ c.seats_enrolled }} inscritos</div>
            </td>

            <td class="tc mono">{{ formatDate(c.close_date) }}</td>
            <td class="tc mono">{{ formatDate(c.start_date) }}</td>
            <td class="tc mono">{{ formatDate(c.end_date) }}</td>

            <td class="tc">
              <span class="pill pill-sm" :class="statusPill(c)">{{ contractStatus(c) }}</span>
            </td>
          </tr>

          <tr v-if="!contracts.length">
            <td colspan="12" class="ect-empty">No se encontraron contratos con los filtros actuales.</td>
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

function statusPill (contract) {
  const estado = contractStatus(contract)
  if (estado === 'Activo') return 'pill-green'
  if (estado === 'Vencido') return 'pill-amber'
  return 'pill-red'
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
/* ---- wrapper ---- */
.ect-wrap {
  background: #fff;
  border-radius: 10px;
  overflow-x: auto;
  border: 1px solid #F0F0F0;
}

/* ---- table base ---- */
.ect {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
  color: #1A1A1A;
}
.tc { text-align: center; }
.tr { text-align: right; }
.nowrap { white-space: nowrap; }

/* ---- header ---- */
.ect-head th {
  background: #FAFAFA;
  padding: 8px 10px;
  text-align: left;
  font-weight: 500;
  color: #8C8C8C;
  border-bottom: 1px solid #F0F0F0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.ect-head th.tc { text-align: center; }
.ect-head th.tr { text-align: right; }

/* ---- filter row ---- */
.ect-filters { background: #FAFAFA; }
.ect-filters td {
  padding: 6px 8px;
  border-bottom: 1px solid #F0F0F0;
}
.filter-input {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  font-size: 12px;
  color: #1A1A1A;
  background: #fff;
  transition: all .2s ease;
  font-family: inherit;
}
.filter-input:focus {
  outline: none;
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13,148,136,.06);
}
.filter-input::placeholder { color: #C4C4C4; }
.filter-input.tr { text-align: right; }

/* Las flechitas del input number no caben en 30px de alto y tapan el monto. */
.filter-input[type="number"] { -moz-appearance: textfield; }
.filter-input[type="number"]::-webkit-outer-spin-button,
.filter-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.filter-clear {
  width: 28px;
  height: 28px;
  border: 1px solid #E8E8E8;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #A3A3A3;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease;
}
.filter-clear:hover { background: #FEF2F2; border-color: #FCA5A5; color: #EF4444; }

/* ---- body rows ---- */
.ect-row td {
  padding: 7px 10px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
  height: 36px;
  box-sizing: border-box;
  transition: background .15s ease;
}
.ect-row { cursor: pointer; }
.ect-row:hover td { background: #FAFAFA; }
.ect-row.is-selected td {
  background: #F0FDFA;
  box-shadow: inset 0 -1px 0 #CCFBF1;
}
.ect-row.is-selected td:first-child {
  box-shadow: inset 3px 0 0 #0D9488, inset 0 -1px 0 #CCFBF1;
}
.ect-row:last-child td { border-bottom: none; }
/* Un contrato cancelado sigue en la lista por historial, pero no compite
   visualmente con los vigentes. */
.ect-row.is-cancelled td { opacity: .55; }

/* ---- action buttons ---- */
.act-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #E8E8E8;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: #737373;
  font-size: 12px;
  transition: all .2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.act-btn.act-teal:hover { background: #F0FDFA; border-color: #0D9488; color: #0D9488; }

/* ---- cell typography ---- */
.cell-main { font-weight: 600; color: #1A1A1A; font-size: 11.5px; line-height: 1.35; }
.cell-sub  { color: #A3A3A3; font-size: 10.5px; margin-top: 1px; }
.cell-clip {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.col-empresa { max-width: 230px; }
.col-nombre { max-width: 260px; }
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 11px;
  white-space: nowrap;
}
.fw700 { font-weight: 700; }
.c-amber { color: #B45309; }
.c-muted { color: #C4C4C4; }
.unfilled { font-size: 10.5px; color: #C4C4C4; font-style: italic; }

/* ---- pills ---- */
.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  border: none;
}
.pill-sm { padding: 3px 8px; font-size: 10.5px; }
.pill-slate { background: #F5F5F5; color: #737373; }
.pill-green { background: #ECFDF5; color: #065F46; }
.pill-amber { background: #FFF8EB; color: #92400E; }
.pill-red   { background: #FEF2F2; color: #991B1B; }
.pill-blue  { background: #EFF6FF; color: #1E40AF; font-variant-numeric: tabular-nums; }

.ect-empty {
  padding: 40px;
  text-align: center;
  color: #A3A3A3;
  font-size: 12.5px;
  font-weight: 500;
}

/* ---- skeleton ---- */
.skeleton-row td {
  padding: 7px 10px;
  border-bottom: 1px solid #F5F5F5;
  height: 36px;
}
.sk-cell {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: ect-sk-shimmer 1.4s ease-in-out infinite;
  width: 100%;
}
.sk-cell.mt-1 { margin-top: 6px; }
@keyframes ect-sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- responsive ---- */
@media (max-width: 768px) {
  .ect-head th { font-size: 10px; padding: 8px; }
  .ect-row td  { padding: 10px 8px; }
  .cell-clip   { max-width: 140px; }
}

/* ════════ DARK MODE ════════ */
[data-coreui-theme="dark"] .ect-wrap { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .ect { color: #F4F4F0; }
[data-coreui-theme="dark"] .ect-head th { background: #1F1F1A; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .ect-filters,
[data-coreui-theme="dark"] .ect-filters td { background: #1F1F1A; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .filter-input { background: #14140F; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .filter-input::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .filter-clear { background: #14140F; border-color: #2A2A22; color: #6F6F66; }
[data-coreui-theme="dark"] .ect-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .ect-row:hover td { background: #1F1F1A; }
[data-coreui-theme="dark"] .ect-row.is-selected td { background: rgba(13,148,136,.14); box-shadow: inset 0 -1px 0 rgba(13,148,136,.3); }
[data-coreui-theme="dark"] .ect-row.is-selected td:first-child { box-shadow: inset 3px 0 0 #2DD4BF, inset 0 -1px 0 rgba(13,148,136,.3); }
[data-coreui-theme="dark"] .act-btn { background: #14140F; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .act-btn.act-teal:hover { background: rgba(13,148,136,.16); border-color: #2DD4BF; color: #2DD4BF; }
[data-coreui-theme="dark"] .cell-main { color: #F4F4F0; }
[data-coreui-theme="dark"] .cell-sub { color: #6F6F66; }
[data-coreui-theme="dark"] .c-amber { color: #FBBF24; }
[data-coreui-theme="dark"] .c-muted,
[data-coreui-theme="dark"] .unfilled { color: #5A5A52; }
[data-coreui-theme="dark"] .pill-slate { background: #24241E; color: #A0A099; }
[data-coreui-theme="dark"] .pill-green { background: rgba(16,185,129,.16); color: #34D399; }
[data-coreui-theme="dark"] .pill-amber { background: rgba(245,158,11,.16); color: #FBBF24; }
[data-coreui-theme="dark"] .pill-red   { background: rgba(248,113,113,.16); color: #F87171; }
[data-coreui-theme="dark"] .pill-blue  { background: rgba(59,130,246,.16); color: #60A5FA; }
[data-coreui-theme="dark"] .ect-empty { color: #6F6F66; }
[data-coreui-theme="dark"] .skeleton-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .sk-cell { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
</style>
