<template>
  <div :style="isInstallmentMode ? 'flex:0 0 340px;min-width:280px' : 'flex:1'">
    <div class="summary-card">
      <div class="summary-header"><i class="fa-solid fa-receipt me-2"></i> Resumen de Transacción</div>
      <div class="summary-body">
        <div class="summary-row">
          <span class="label">Precio del programa</span>
          <span class="value text-muted">{{ currencySymbol }} {{ fmt2(insc.montoOriginal) }}</span>
        </div>
        <div class="summary-row" v-if="insc.dsct_porcent_id">
          <span class="label">Descuento</span>
          <span class="value text-danger">- {{ currencySymbol }} {{ fmt2(insc.montoDescuentoPorcentaje) }}</span>
        </div>
        <div class="summary-row" v-if="insc.dsct_stick_id">
          <span class="label">
            Promoción
            <small class="text-muted ms-1" style="font-size:9px;">
              (precio fijo S/ {{ fmt2(insc.val_fijo) }})
            </small>
          </span>
          <span class="value text-danger">- {{ currencySymbol }} {{ fmt2(insc.montoDescuentoFijo) }}</span>
        </div>
        <template v-if="insc.dsct_benefit_ids.length > 0">
          <div
            class="summary-row"
            v-for="(ben, i) in insc.dsct_benefit_ids"
            :key="ben.value"
          >
            <span class="label" style="font-size:.8rem;">
              Beneficio {{ insc.dsct_benefit_ids.length > 1 ? (i + 1) : '' }}
              <small class="text-muted ms-1" style="font-size:.7rem;">{{ ben.label }}</small>
            </span>
            <span class="value text-danger">
              - {{ currencySymbol }} {{ fmt2(insc.val_beneficios[i] || 0) }}
            </span>
          </div>
          <div class="summary-row" v-if="insc.dsct_benefit_ids.length > 1" style="opacity:.7; font-size:.78rem;">
            <span class="label text-muted">Subtotal beneficios</span>
            <span class="value text-danger">- {{ currencySymbol }} {{ fmt2(insc.montoBeneficioTotal) }}</span>
          </div>
        </template>
        <div class="summary-divider"></div>
        <div class="summary-row total">
          <div class="d-flex flex-column">
            <span class="label-total">MONTO FINAL A PAGAR</span>
            <small class="text-muted fw-normal" v-if="isInstallmentMode">
              Adelanto: {{ currencySymbol }} {{ fmt2(insc.saved_money) }}
            </small>
          </div>
          <span class="value-total">{{ currencySymbol }} {{ fmt2(insc.total_amount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLeadFormatters } from '../../composables/useLeadFormatters'

defineProps({
  insc: { type: Object, required: true },
  currencySymbol: { type: String, default: 'S/' },
  isInstallmentMode: { type: Boolean, default: false }
})

const { fmt2 } = useLeadFormatters()
</script>
