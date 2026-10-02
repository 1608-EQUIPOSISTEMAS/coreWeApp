<template>
  <BaseModal
    :model-value="visible"
    title="Devolver cuota a pendiente"
    size="sm"
    @update:model-value="onClose"
  >
    <div v-if="installment" class="im-body">
      <p class="im-meta">
        <span class="ds-pill">Cuota #{{ installment.installment_number }}</span>
        <span class="im-amount">S/. {{ fmt.formatMoney(installment.amount) }}</span>
      </p>

      <p class="im-text">
        La cuota vuelve a <strong>Pendiente</strong> y su pago se da de baja. El voucher y el
        número de operación se conservan en el historial.
      </p>

      <!-- Corregir la BD no deshace lo que ya salio del sistema: mejor decirlo
           antes de guardar que descubrirlo cuando el alumno reclame. -->
      <p class="ds-callout warn">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <span>Si ya se envió el correo de confirmación o la cuota está pagada en Odoo, eso no se revierte solo.</span>
      </p>

      <div class="ds-field">
        <label class="ds-label" for="rim-why">Justificación<span class="ds-req">*</span></label>
        <textarea
          id="rim-why"
          v-model="justificacion"
          class="ds-input"
          rows="3"
          placeholder="Ej: el comprobante no llegó a ingresar…"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" :disabled="saving" @click="onClose">Cancelar</button>
      <button class="btn-exec btn-exec-danger" type="button" :disabled="!canSave || saving" @click="trySubmit">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-rotate-left'" aria-hidden="true"></i>
        {{ saving ? 'Guardando…' : 'Devolver a pendiente' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  installment: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'submit'])
const fmt = useEnrollmentFormatters()

const justificacion = ref('')
const canSave = computed(() => justificacion.value.trim().length > 0)

watch(() => props.visible, (v) => { if (v) justificacion.value = '' })

function trySubmit () {
  if (!canSave.value || props.saving) return
  emit('submit', {
    installment_id: props.installment.installment_id,
    justificacion: justificacion.value.trim()
  })
}

function onClose () {
  if (props.saving) return
  emit('update:visible', false)
}
</script>

<style scoped>
.im-body { display: flex; flex-direction: column; gap: 14px; }
.im-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0; }
.im-amount { font-family: var(--ds-font-mono); font-weight: 700; color: var(--ds-heading); }
.im-text { margin: 0; font-size: 13px; line-height: 1.5; color: var(--ds-ink); }
</style>
