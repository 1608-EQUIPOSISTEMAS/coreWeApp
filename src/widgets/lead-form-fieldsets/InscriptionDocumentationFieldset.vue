<template>
  <!-- Edita en sitio los objetos reactivos `insc` (:model) y `form` recibidos por
       props: mutacion de dos vias intencional via uploaders, espejo del god
       component. Migrar a defineModel en el rewrite de la pagina (gated). -->
  <!-- eslint-disable vue/no-mutating-props -->
  <!-- Documentación Adjunta -->
  <div class="exec-fieldset mb-3" style="flex:1;min-width:0">
    <h6 class="fieldset-title">Documentación Adjunta</h6>
    <div class="row g-3">

      <!-- GENERAL: Comprobantes de pago → enrollment_attachments -->
      <div class="col-12" v-if="isChannelGeneral">
        <label class="exec-label mb-1">
          Comprobante(s) de Pago
          <span v-if="!isVoucherOptional" class="c-red">*</span>
          <span v-else class="ms-1 pill pill-teal border" style="font-size:9px;padding:1px 7px;">
            Opcional · Descuento 100%
          </span>
        </label>
        <MultiFileUploader
          v-model="model.ticket_payment_urls"
          ref="voucherUploaderRef"
          label="Clic para subir Comprobante(s)"
          accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
          :required="model.val_porcentaje==100?false:!isVoucherOptional"
          :minFiles="1"
          :touched="voucherTouched"
        />
      </div>

      <!-- WEB: Constancias → lead_attachments -->
      <div class="col-12" v-if="isChannelWeb">
        <label class="exec-label mb-1">Constancias / Adjuntos</label>
        <MultiFileUploader
          v-model="model.attachments"
          required
          :minFiles="2"
          label="Adjuntar evidencias PAGO WEB"
          accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
        />
      </div>

      <!-- TOKEN: sin adjunto -->
      <div class="col-12" v-if="isChannelToken">
        <div class="p-3 rounded border text-muted" style="font-size:.83rem; background:#fafafa;">
          <i class="fa-solid fa-circle-info me-2 text-info"></i>
          Para pagos por link/token no se requiere adjuntar comprobante.
          El proveedor enviará la confirmación directamente.
        </div>
      </div>

      <!-- Carnet: solo en canal General -->
      <div class="col-12" v-if="isChannelGeneral && clientProfileType === 'estudiante' ">
        <label class="exec-label mb-2">Carnet / Documento ID</label>
        <FileUploader
          label="Subir carnet estudiantil"
          v-model="form.carnet_url"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import MultiFileUploader from '../../components/MultiFileUploader.vue'
import FileUploader from '../../components/FileUploader.vue'

defineProps({
  model: { type: Object, required: true },
  form: { type: Object, default: () => ({}) },
  isChannelGeneral: { type: Boolean, default: false },
  isChannelWeb: { type: Boolean, default: false },
  isChannelToken: { type: Boolean, default: false },
  isVoucherOptional: { type: Boolean, default: false },
  voucherTouched: { type: Boolean, default: false },
  clientProfileType: { type: String, default: '' }
})
</script>
