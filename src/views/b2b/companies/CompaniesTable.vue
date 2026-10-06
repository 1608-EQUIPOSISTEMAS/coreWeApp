<template>
  <!-- eslint-disable vue/no-mutating-props -- colFilters es el reactive de
       useCompanyList que el padre comparte a proposito: la fila de filtros lo
       escribe directo y el composable recalcula la tabla. -->
  <div class="ds-table-scroll">
    <table class="ds-table ds-table--lista ect">
      <thead>
        <tr>
          <th class="tc" style="width:84px">Acciones</th>
          <th>Razón social</th>
          <th style="width:130px">RUC / doc.</th>
          <th style="width:150px">Sector</th>
          <th style="width:140px">Clasificación</th>
          <th class="tc" style="width:120px">Tipo</th>
          <th class="tc" style="width:95px">Contratos</th>
          <th style="width:210px">Contacto principal</th>
        </tr>
        <!-- Toda columna filtra desde esta fila: ningun control vive fuera de la
             tabla. Texto -> caja de escribir, categoria -> desplegable,
             conteo -> piso (>=). -->
        <tr class="ect-filters">
          <th class="tc">
            <button
              class="btn-icon btn-icon-sm"
              type="button"
              title="Limpiar filtros de columna"
              aria-label="Limpiar filtros de columna"
              @click="$emit('clear-col-filters')"
            >
              <i class="fa-solid fa-eraser" aria-hidden="true"></i>
            </button>
          </th>
          <th>
            <input v-model="colFilters.razon" class="ds-input ect-flt" placeholder="Buscar..." aria-label="Filtrar por razón social" />
          </th>
          <th>
            <input v-model="colFilters.documento" class="ds-input ect-flt" placeholder="RUC..." aria-label="Filtrar por RUC o documento" />
          </th>
          <th>
            <ColumnFilterDropdown
              column-label="Sector"
              :all-items="companies"
              :value-extractor="c => sectorLabel(c.cat_sector) || '(Sin clasificar)'"
              v-model="colFilters.sector"
            />
          </th>
          <th>
            <ColumnFilterDropdown
              column-label="Clasificación"
              :all-items="companies"
              :value-extractor="c => classificationLabel(c.cat_classification) || '(Sin clasificar)'"
              v-model="colFilters.clasificacion"
            />
          </th>
          <th class="tc">
            <ColumnFilterDropdown
              column-label="Tipo"
              :all-items="companies"
              :value-extractor="tipoLabel"
              :fixed-options="['Normal', 'Intermediaria']"
              v-model="colFilters.tipo"
            />
          </th>
          <th>
            <input v-model="colFilters.contratosMin" type="number" min="0" class="ds-input ect-flt tc" placeholder="&ge; 0" aria-label="Mínimo de contratos activos" />
          </th>
          <th>
            <input v-model="colFilters.contacto" class="ds-input ect-flt" placeholder="Nombre o correo..." aria-label="Filtrar por contacto" />
          </th>
        </tr>
      </thead>

      <tbody>
        <template v-if="isLoading">
          <tr v-for="n in 10" :key="'sk-' + n">
            <td colspan="8"><span class="ds-skel"></span></td>
          </tr>
        </template>

        <template v-else>
          <tr
            v-for="c in companies"
            :key="c.company_id"
            class="link"
            :class="{ 'is-selected': c.company_id === selectedId, 'is-intermediary': c.is_intermediary === 'Y' }"
            @click="$emit('select-row', c)"
            @dblclick="$emit('edit', c)"
          >
            <td class="tc nowrap">
              <div class="ect-actions">
                <button class="btn-icon btn-icon-sm" type="button" title="Editar empresa" aria-label="Editar empresa" @click.stop="$emit('edit', c)">
                  <i class="fa-solid fa-pen" aria-hidden="true"></i>
                </button>
                <button class="btn-icon btn-icon-sm" type="button" title="Ver leads de la empresa" aria-label="Ver leads de la empresa" @click.stop="$emit('view-leads', c)">
                  <i class="fa-solid fa-building-user" aria-hidden="true"></i>
                </button>
              </div>
            </td>

            <td class="col-razon">
              <div class="cell-main cell-clip" :title="c.razon_social">{{ c.razon_social }}</div>
              <div v-if="c.commercial_name" class="cell-sub cell-clip" :title="c.commercial_name">{{ c.commercial_name }}</div>
            </td>

            <td class="mono">{{ c.document_number || '—' }}</td>

            <td>
              <span v-if="sectorLabel(c.cat_sector)" class="ds-pill">{{ sectorLabel(c.cat_sector) }}</span>
              <span v-else class="unfilled">Sin clasificar</span>
            </td>

            <td>
              <span v-if="classificationLabel(c.cat_classification)" class="ds-pill">
                {{ classificationLabel(c.cat_classification) }}
              </span>
              <span v-else class="unfilled">Sin clasificar</span>
            </td>

            <td class="tc">
              <span v-if="c.is_intermediary === 'Y'" class="ds-pill violet">
                <i class="fa-solid fa-link" aria-hidden="true"></i> Intermediaria
              </span>
              <span v-else class="c-muted">Normal</span>
            </td>

            <td class="tc">
              <button
                v-if="c.active_contracts_count > 0"
                type="button"
                class="ds-pill ok ect-pill-link"
                title="Ver contratos de la empresa"
                aria-label="Ver contratos de la empresa"
                @click.stop="$emit('view-contracts', c)"
              >
                {{ formatValue(c.active_contracts_count, 'num') }}
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
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
              <span v-else class="ds-pill warn">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Sin contacto
              </span>
            </td>
          </tr>

          <tr v-if="!companies.length">
            <td colspan="8" class="ds-empty ds-empty--lista">
              No hay empresas con estos filtros. Límpialos con el borrador de la primera columna o cambia de vista.
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import { formatValue } from '@/shared/lib/formatValue'

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
/* 8 columnas con filtro: bajo este ancho la tabla hace scroll dentro de
   .ds-table-scroll en vez de aplastar los filtros. */
.ect { min-width: 1040px; }
.tc { text-align: center; }
.ect th.tc { text-align: center; }
.nowrap { white-space: nowrap; }
.ect-actions { display: inline-flex; gap: 4px; }

/* Fila de filtros por columna: controles compactos bajo el encabezado. */
.ect-filters th { padding: 6px 8px; }
.ect-flt { height: 30px; min-width: 60px; font-size: 12px; }
.ect-flt.tc { text-align: center; }
/* Las flechitas del input number no caben en 30px de alto y tapan el numero. */
.ect-flt[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.ect-flt[type="number"]::-webkit-outer-spin-button,
.ect-flt[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

/* Fila elegida: tinte de acento y barra a la izquierda para no perderla. */
.ect tr.is-selected td { background: var(--ds-soft-info); }
.ect tr.is-selected td:first-child { box-shadow: inset 3px 0 0 var(--ds-accent); }
/* Tinte violeta para la intermediaria: reparte beneficio a otras empresas, no
   es una cliente mas, y se tiene que ver de un vistazo. */
.ect tr.is-intermediary td { background: var(--ds-soft-violet); }

.cell-main { font-weight: 600; color: var(--ds-heading); line-height: 1.35; }
.cell-sub { margin-top: 1px; font-size: 11.5px; font-weight: 400; color: var(--ds-muted); }
.cell-clip { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-razon { max-width: 280px; }
.col-contacto { max-width: 210px; }
.mono { font-family: var(--ds-font-mono); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.c-muted { color: var(--ds-muted); }
/* Dato que existe en la BD y nadie lleno: se distingue de un "—" real. */
.unfilled { font-size: 11.5px; font-style: italic; color: var(--ds-muted); }

/* El conteo de contratos es un boton con forma de pill: lleva a Contratos. */
.ect-pill-link { border: 0; font-family: inherit; font-variant-numeric: tabular-nums; cursor: pointer; }
.ect-pill-link:hover { filter: brightness(0.95); }
.ect-pill-link:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }

@media (max-width: 768px) {
  .cell-clip { max-width: 140px; }
}
</style>
