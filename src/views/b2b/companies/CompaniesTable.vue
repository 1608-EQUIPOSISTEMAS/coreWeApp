<template>
  <div class="ect-wrap">
    <table class="ect">
      <thead>
        <tr class="ect-head">
          <th class="tc" style="width:84px">Acciones</th>
          <th>Razón Social</th>
          <th style="width:130px">RUC / Doc.</th>
          <th style="width:150px">Sector</th>
          <th style="width:140px">Clasificación</th>
          <th class="tc" style="width:120px">Tipo</th>
          <th class="tc" style="width:95px">Contratos</th>
          <th style="width:210px">Contacto Principal</th>
        </tr>
        <!-- Toda columna filtra desde esta fila: ningun control vive fuera de la
             tabla. Texto -> caja de escribir, categoria -> desplegable,
             conteo -> piso (>=). -->
        <tr class="ect-filters">
          <td class="tc">
            <button class="filter-clear" title="Limpiar filtros de columna" @click="$emit('clear-col-filters')">
              <i class="fa-solid fa-eraser"></i>
            </button>
          </td>
          <td>
            <input v-model="colFilters.razon" class="filter-input" placeholder="Buscar..." />
          </td>
          <td>
            <input v-model="colFilters.documento" class="filter-input" placeholder="RUC..." />
          </td>
          <td>
            <ColumnFilterDropdown
              column-label="Sector"
              :all-items="companies"
              :value-extractor="c => sectorLabel(c.cat_sector) || '(Sin clasificar)'"
              v-model="colFilters.sector"
            />
          </td>
          <td>
            <ColumnFilterDropdown
              column-label="Clasificación"
              :all-items="companies"
              :value-extractor="c => classificationLabel(c.cat_classification) || '(Sin clasificar)'"
              v-model="colFilters.clasificacion"
            />
          </td>
          <td class="tc">
            <ColumnFilterDropdown
              column-label="Tipo"
              :all-items="companies"
              :value-extractor="tipoLabel"
              :fixed-options="['Normal', 'Intermediaria']"
              v-model="colFilters.tipo"
            />
          </td>
          <td>
            <input v-model="colFilters.contratosMin" type="number" min="0" class="filter-input tc" placeholder="&ge; 0" />
          </td>
          <td>
            <input v-model="colFilters.contacto" class="filter-input" placeholder="Nombre o correo..." />
          </td>
        </tr>
      </thead>

      <tbody>
        <template v-if="isLoading">
          <tr v-for="n in 10" :key="'sk-' + n" class="skeleton-row">
            <td class="tc"><div class="sk-cell" style="width:60px;margin:0 auto"></div></td>
            <td>
              <div class="sk-cell" style="width:180px"></div>
              <div class="sk-cell mt-1" style="width:110px;height:8px"></div>
            </td>
            <td><div class="sk-cell" style="width:90px"></div></td>
            <td><div class="sk-cell" style="width:100px"></div></td>
            <td><div class="sk-cell" style="width:90px"></div></td>
            <td class="tc"><div class="sk-cell" style="width:70px;margin:0 auto"></div></td>
            <td class="tc"><div class="sk-cell" style="width:40px;margin:0 auto"></div></td>
            <td><div class="sk-cell" style="width:150px"></div></td>
          </tr>
        </template>

        <template v-else>
          <tr
            v-for="c in companies"
            :key="c.company_id"
            class="ect-row"
            :class="{ 'is-selected': c.company_id === selectedId, 'is-intermediary': c.is_intermediary === 'Y' }"
            @click="$emit('select-row', c)"
            @dblclick="$emit('edit', c)"
          >
            <td class="tc nowrap">
              <button class="act-btn act-teal" title="Editar empresa" @click.stop="$emit('edit', c)">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="act-btn act-teal ms-1" title="Ver leads de la empresa" @click.stop="$emit('view-leads', c)">
                <i class="fa-solid fa-building-user"></i>
              </button>
            </td>

            <td class="col-razon">
              <div class="cell-main cell-clip" :title="c.razon_social">{{ c.razon_social }}</div>
              <div v-if="c.commercial_name" class="cell-sub cell-clip" :title="c.commercial_name">{{ c.commercial_name }}</div>
            </td>

            <td class="mono">{{ c.document_number || '—' }}</td>

            <td>
              <span v-if="sectorLabel(c.cat_sector)" class="pill pill-sm pill-slate">{{ sectorLabel(c.cat_sector) }}</span>
              <span v-else class="unfilled">Sin clasificar</span>
            </td>

            <td>
              <span v-if="classificationLabel(c.cat_classification)" class="pill pill-sm pill-slate">
                {{ classificationLabel(c.cat_classification) }}
              </span>
              <span v-else class="unfilled">Sin clasificar</span>
            </td>

            <td class="tc">
              <span v-if="c.is_intermediary === 'Y'" class="pill pill-sm pill-purple">
                <i class="fa-solid fa-link me-1"></i> Intermediaria
              </span>
              <span v-else class="c-muted">Normal</span>
            </td>

            <td class="tc">
              <button
                v-if="c.active_contracts_count > 0"
                class="pill pill-sm pill-green is-link"
                title="Ver contratos de la empresa"
                @click.stop="$emit('view-contracts', c)"
              >
                {{ c.active_contracts_count }}
                <i class="fa-solid fa-arrow-up-right-from-square ms-1"></i>
              </button>
              <span v-else class="c-muted">—</span>
            </td>

            <td class="col-contacto">
              <template v-if="c.primary_contact_name">
                <div class="cell-main cell-clip" :title="c.primary_contact_name">{{ c.primary_contact_name }}</div>
                <div v-if="c.primary_contact_email" class="cell-sub cell-clip" :title="c.primary_contact_email">
                  {{ c.primary_contact_email }}
                </div>
              </template>
              <span v-else class="pill pill-sm pill-amber">
                <i class="fa-solid fa-triangle-exclamation me-1"></i> Sin contacto
              </span>
            </td>
          </tr>

          <tr v-if="!companies.length">
            <td colspan="8" class="ect-empty">No se encontraron empresas con los filtros actuales.</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'

defineProps({
  companies: { type: Array, default: () => [] },
  colFilters: { type: Object, required: true },
  isLoading: { type: Boolean, default: false },
  selectedId: { type: [Number, String], default: null },
  sectorLabel: { type: Function, required: true },
  classificationLabel: { type: Function, required: true },
  tipoLabel: { type: Function, required: true }
})

defineEmits(['select-row', 'edit', 'view-leads', 'view-contracts', 'clear-col-filters'])
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
.filter-input.tc { text-align: center; }

/* Las flechitas del input number no caben en 30px de alto y tapan el numero. */
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

/* Tinte violeta para la intermediaria: reparte beneficio a otras empresas, no
   es una cliente mas, y se tiene que ver de un vistazo. */
.ect-row.is-intermediary td { background: #FBFAFF; }
.ect-row.is-intermediary:hover td { background: #F5F3FF; }

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
.col-razon { max-width: 280px; }
.col-contacto { max-width: 210px; }
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 11px;
  white-space: nowrap;
  color: #737373;
}
.c-muted { color: #C4C4C4; }
/* Dato que existe en la BD y nadie lleno: se distingue de un "—" real. */
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
.pill-slate  { background: #F5F5F5; color: #737373; }
.pill-green  { background: #ECFDF5; color: #065F46; }
.pill-amber  { background: #FFF8EB; color: #92400E; }
.pill-purple { background: #F5F3FF; color: #5B21B6; }
.pill.is-link { cursor: pointer; font-variant-numeric: tabular-nums; }
.pill.is-link:hover { background: #D1FAE5; }

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
[data-coreui-theme="dark"] .ect-row.is-intermediary td { background: rgba(139,92,246,.08); }
[data-coreui-theme="dark"] .ect-row.is-intermediary:hover td { background: rgba(139,92,246,.16); }
[data-coreui-theme="dark"] .act-btn { background: #14140F; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .act-btn.act-teal:hover { background: rgba(13,148,136,.16); border-color: #2DD4BF; color: #2DD4BF; }
[data-coreui-theme="dark"] .cell-main { color: #F4F4F0; }
[data-coreui-theme="dark"] .cell-sub { color: #6F6F66; }
[data-coreui-theme="dark"] .mono { color: #A0A099; }
[data-coreui-theme="dark"] .c-muted,
[data-coreui-theme="dark"] .unfilled { color: #5A5A52; }
[data-coreui-theme="dark"] .pill-slate  { background: #24241E; color: #A0A099; }
[data-coreui-theme="dark"] .pill-green  { background: rgba(16,185,129,.16); color: #34D399; }
[data-coreui-theme="dark"] .pill-amber  { background: rgba(245,158,11,.16); color: #FBBF24; }
[data-coreui-theme="dark"] .pill-purple { background: rgba(139,92,246,.16); color: #A78BFA; }
[data-coreui-theme="dark"] .pill.is-link:hover { background: rgba(16,185,129,.28); }
[data-coreui-theme="dark"] .ect-empty { color: #6F6F66; }
[data-coreui-theme="dark"] .skeleton-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .sk-cell { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
</style>
