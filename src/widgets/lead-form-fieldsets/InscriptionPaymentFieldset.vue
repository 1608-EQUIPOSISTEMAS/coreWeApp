<template>
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="exec-fieldset mb-3">
    <h6 class="fieldset-title">Condiciones de Pago</h6>
    <div class="row g-3">

      <div class="col-md-3">
        <label class="exec-label">Canal de Pago <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.cat_payment_channel"
          :items="paymentChannelCatalog"
          label-field="description"
          value-field="id"
          placeholder="CANAL..."
          required
          class="exec-select-light w-100"
          @change="onChangeChannel"
        />
      </div>

      <template v-if="isChannelGeneral">
        <div class="col-md-2">
          <label class="exec-label">Moneda <span class="c-red">*</span></label>
          <SearchSelect :viewOpen="6" v-model="model.selectedCurrencyAlias" :items="currencyCatalog" label-field="description" required value-field="alias" placeholder="MONEDA..." class="exec-select-light w-100" />
        </div>
        <div class="col-md-3">
          <label class="exec-label">
            Modalidad de pago <span class="c-red">*</span>
          </label>
          <SearchSelect
            :viewOpen="6"
            v-model="model.cat_type_payment"
            required
            :items="isOnlineProgram
              ? inscPaymentModes.filter(e => e.alias === 'we_payment_way_single')
              : inscPaymentModes"
            placeholder="M. PAGO"
            label-field="description"
            value-field="alias"
            class="exec-select-light w-100"
            :disabled="isOnlineProgram"
          />
        </div>
        <div class="col-md-3">
          <label class="exec-label">Medio de Pago <span class="c-red">*</span></label>
          <SearchSelect
            :viewOpen="6"
            v-model="model.cat_method_payment"
            :items="paymentMethodCatalog.filter(e => ['we_payment_method_transfer','we_payment_method_cash','we_payment_method_yape_plin','we_payment_method_deposit'].includes(e.alias))"
            required
            label-field="description"
            value-field="alias"
            placeholder="MEDIO..."
            class="exec-select-light w-100"
          />
        </div>
        <div class="col-md-3" v-if="model.cat_type_payment=='we_payment_way_installments'">
          <label class="exec-label">Adelanto / Reserva <span class="c-red">*</span></label>
          <CurrencyInput v-model="model.saved_money" :currency="selectedCurrency" required :storeAsMinor="true" :softMinorTyping="true" zero-counts-as-empty placeholder="0.00" />
        </div>
      </template>

      <template v-if="isChannelToken">
        <div class="col-md-2">
          <label class="exec-label">Moneda <span class="c-red">*</span></label>
          <SearchSelect :viewOpen="6" v-model="model.selectedCurrencyAlias" :items="currencyCatalog" label-field="description" required value-field="alias" placeholder="MONEDA..." class="exec-select-light w-100" />
        </div>
        <div class="col-md-2">
          <label class="exec-label">Tipo de Pago <span class="c-red">*</span></label>
          <select v-model="model.token_payment_type" class="exec-input-light w-100" required>
            <option value="">Seleccionar...</option>
            <option value="debito">Debito</option>
            <option value="credito">Credito</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="exec-label">Modalidad de pago <span class="c-red">*</span></label>
          <SearchSelect
            :viewOpen="6"
            v-model="model.cat_type_payment"
            required
            :items="inscPaymentModes"
            placeholder="M. PAGO"
            label-field="description"
            value-field="alias"
            class="exec-select-light w-100"
          />
        </div>
        <div class="col-md-3" v-if="model.cat_type_payment === 'we_payment_way_installments'">
          <label class="exec-label">Adelanto / Reserva <span class="c-red">*</span></label>
          <CurrencyInput v-model="model.saved_money" :currency="selectedCurrency" required :storeAsMinor="true" :softMinorTyping="true" zero-counts-as-empty placeholder="0.00" />
        </div>
        <div class="col-md-12 mt-1">
          <div class="p-2 rounded border bg-light text-info" style="font-size:.85rem; border-color: #bee5eb !important; background-color: #e2f3f5 !important;">
            <i class="fa-solid fa-link me-2"></i> Este pago se registrará en la hoja <strong>"TOKEN DIGITAL 2026"</strong>
          </div>
        </div>
      </template>

      <template v-if="isChannelWeb">
        <div class="col-md-2">
          <label class="exec-label">Moneda <span class="c-red">*</span></label>
          <SearchSelect :viewOpen="6" v-model="model.selectedCurrencyAlias" :items="currencyCatalog" label-field="description" required value-field="alias" placeholder="MONEDA..." class="exec-select-light w-100" />
        </div>
        <div class="col-md-3">
          <label class="exec-label">
            Modalidad de pago <span class="c-red">*</span>
          </label>
          <SearchSelect
            :viewOpen="6"
            v-model="model.cat_type_payment"
            required
            :items="isOnlineProgram
              ? inscPaymentModes.filter(e => e.alias === 'we_payment_way_single')
              : inscPaymentModes"
            placeholder="M. PAGO"
            label-field="description"
            value-field="alias"
            class="exec-select-light w-100"
            :disabled="isOnlineProgram"
          />
        </div>
        <div class="col-md-3" v-if="model.cat_type_payment === 'we_payment_way_installments'">
          <label class="exec-label">Pago por pasarela (Adelanto) <span class="c-red">*</span></label>
          <CurrencyInput v-model="model.saved_money" :currency="selectedCurrency" required :storeAsMinor="true" :softMinorTyping="true" zero-counts-as-empty placeholder="0.00" />
        </div>
        <div class="col-md-12 mt-1">
          <div class="p-2 rounded border bg-light text-info" style="font-size:.85rem; border-color: #bee5eb !important; background-color: #e2f3f5 !important;">
            <i class="fa-solid fa-globe me-2"></i>
            <template v-if="model.cat_type_payment === 'we_payment_way_installments'">
              El alumno pagó el <strong>adelanto</strong> por la pasarela web. Las cuotas restantes se cobrarán por otro canal. Se notificará al canal de <strong>Slack</strong> apenas envies.
            </template>
            <template v-else>
              El alumno realizó el pago directamente por la pasarela web. Se notificará al canal de <strong>Slack</strong> apenas envies.
            </template>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import SearchSelect from '../../components/SearchSelect.vue'
import CurrencyInput from '../../components/CurrencyInput.vue'

defineProps({
  model: { type: Object, required: true },
  paymentChannelCatalog: { type: Array, default: () => [] },
  currencyCatalog: { type: Array, default: () => [] },
  paymentMethodCatalog: { type: Array, default: () => [] },
  tokenProviderCatalog: { type: Array, default: () => [] },
  inscPaymentModes: { type: Array, default: () => [] },
  selectedCurrency: { type: [Object, String], default: null },
  isOnlineProgram: { type: Boolean, default: false },
  isChannelGeneral: { type: Boolean, default: false },
  isChannelToken: { type: Boolean, default: false },
  isChannelWeb: { type: Boolean, default: false }
})

const emit = defineEmits(['change-channel'])

function onChangeChannel (...args) {
  emit('change-channel', ...args)
}
</script>
