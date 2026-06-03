<template>
  <!-- Edita en sitio el objeto reactivo `model` (insc) recibido por prop: mutacion
       de dos vias intencional, espejo del god component. Migrar a defineModel en el
       rewrite de la pagina (gated). -->
  <!-- eslint-disable vue/no-mutating-props -->
  <template v-if="show">
    <!-- DESCUENTO % -->
    <div class="col-md-4 mt-3">
      <label class="exec-label">
        Descuento
        <span v-if="!model.montoOriginal" class="ms-1 text-muted" style="font-size:9px;font-weight:400;">(requiere precio base)</span>
      </label>
      <SearchSelect
        :key="`porcent-${discountResetKey}`"
        v-model="model.dsct_porcent_id"
        mode="remote"
        :fetcher="porcentajeFetcher"
        label-field="full_label" value-field="id" :viewOpen="6"
        placeholder="DESCUENTO (%)" :minChars="0" :cache="false"
        class="exec-select-light w-100"
        :disabled="!model.montoOriginal"
        :model-label="model.dsct_porcent_label"
        @change="onChangeDescuentoPorcentual"
      />
    </div>

    <!-- PROMOCIÓN (stick) -->
    <div class="col-md-4 mt-3">
      <label class="exec-label">
        Promoción
        <span v-if="!model.montoOriginal" class="ms-1 text-muted" style="font-size:9px;font-weight:400;">(requiere precio base)</span>
      </label>
      <SearchSelect
        :key="`stick-${discountResetKey}`"
        v-model="model.dsct_stick_id"
        mode="remote" :viewOpen="6"
        :fetcher="fijoFetcher"
        label-field="full_label" value-field="id"
        placeholder="DESCUENTO (S/)" :minChars="0" :cache="false"
        class="exec-select-light w-100"
        :disabled="!model.montoOriginal"
        :model-label="model.dsct_stick_label"
        @change="onChangeDescuentoFijo"
      />
    </div>

    <!-- BENEFICIO -->
    <div class="col-md-4 mt-3">
      <label class="exec-label">
        Beneficio(s)
        <span v-if="!model.montoOriginal" class="ms-1 text-muted" style="font-size:9px;font-weight:400;">(requiere precio base)</span>
      </label>
      <MultiSelect
        :key="`benefit-${discountResetKey}`"
        v-model="model.dsct_benefit_ids"
        mode="remote" :debounce-ms="400"
        :disabled="!model.montoOriginal"
        label-key="full_label" value-key="id"
        :fetcher="beneficiosFetcher"
        placeholder="BENEFICIOS..."
        @change="onChangeBeneficios"
      />
      <div v-if="model.dsct_benefit_ids.length > 0" class="mt-1">
        <div
          v-for="ben in model.dsct_benefit_ids"
          :key="ben.value"
          class="d-flex justify-content-between align-items-center"
          style="font-size:11px; color: #b91c1c; padding: 1px 4px;"
        >
          <span>• {{ ben.label }}</span>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup>
import SearchSelect from '../../components/SearchSelect.vue'
import MultiSelect from '../../components/MultiSelect.vue'
import { idByAlias } from '../../shared/lib/catalog.js'

// Los selects de descuento son REMOTOS (mode="remote" + fetcher), espejo del fuente.
// El fetcher resuelve el tipo de descuento por alias y filtra por la moneda activa
// del formulario (insc.selectedCurrencyAlias) -> regla de discounts-currency-filter.
const props = defineProps({
  model: { type: Object, required: true },
  discountService: { type: Object, required: true },
  discountCatalog: { type: Array, default: () => [] },
  currencyCatalog: { type: Array, default: () => [] },
  discountResetKey: { type: [Number, String], default: 0 },
  show: { type: Boolean, default: true }
})

const emit = defineEmits(['change-porcentual', 'change-fijo', 'change-beneficios'])

function discountTypeId (alias) {
  return props.discountCatalog.find(e => e.alias === alias)?.id
}
function currencyId () {
  return idByAlias(props.model.selectedCurrencyAlias, props.currencyCatalog)
}

const porcentajeFetcher = q => props.discountService.discountCaller({ q, cat_discount_type: discountTypeId('we_discount_type_percentage'), cat_currency: currencyId() })
const fijoFetcher = q => props.discountService.discountCaller({ q, cat_discount_type: discountTypeId('we_discount_type_fixed'), cat_currency: currencyId() })
const beneficiosFetcher = q => props.discountService.discountCaller({ q, cat_discount_type: discountTypeId('we_discount_type_benefit'), cat_currency: currencyId() })

function onChangeDescuentoPorcentual (opt) { emit('change-porcentual', opt) }
function onChangeDescuentoFijo (opt) { emit('change-fijo', opt) }
function onChangeBeneficios (items) { emit('change-beneficios', items) }
</script>
