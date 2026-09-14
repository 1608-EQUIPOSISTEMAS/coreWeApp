<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="onClose"
    title="Devolver cuota a pendiente"
    size="sm"
  >
    <div class="rim-body" v-if="installment">
      <div class="rim-meta">
        <div class="rim-meta-pill">Cuota #{{ installment.installment_number }}</div>
        <span class="rim-amount">S/. {{ formatMoney(installment.amount) }}</span>
      </div>

      <p class="rim-text">
        La cuota vuelve a <strong>Pendiente</strong> y su pago se da de baja. El voucher y el
        numero de operacion se conservan en el historial.
      </p>

      <!-- Corregir la BD no deshace lo que ya salio del sistema: mejor decirlo
           antes de guardar que descubrirlo cuando el alumno reclame. -->
      <div class="rim-warn">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Si ya se envio el correo de confirmacion o la cuota esta pagada en Odoo, eso no se revierte solo.</span>
      </div>

      <div class="rim-field">
        <label class="rim-label">Justificacion (obligatorio)</label>
        <textarea
          v-model="justificacion"
          class="rim-textarea"
          rows="3"
          placeholder="Ej: el comprobante no llego a ingresar..."
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="rim-btn-cancel" :disabled="saving" @click="onClose">Cancelar</button>
      <button class="rim-btn-save" :disabled="!canSave || saving" @click="trySubmit">
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-rotate-left"></i>
        {{ saving ? 'Guardando...' : 'Devolver a pendiente' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  installment: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'submit'])

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

function formatMoney (n) {
  return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.rim-body { display: flex; flex-direction: column; gap: 14px; }
.rim-meta {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; background: #FAFAF8; border: 1px solid #E8E8E3; border-radius: 10px;
}
.rim-meta-pill {
  font-size: 12px; font-weight: 700; color: #14140F; background: #fff;
  border: 1px solid #E8E8E3; border-radius: 6px; padding: 3px 9px;
}
.rim-amount { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 700; color: #14140F; }
.rim-text { margin: 0; font-size: 13px; color: #3F3F38; line-height: 1.45; }
.rim-warn {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 8px 12px; border-radius: 8px; font-size: 12.5px;
  background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E;
}
.rim-warn i { margin-top: 2px; }
.rim-field { display: flex; flex-direction: column; gap: 6px; }
.rim-label { font-size: 11px; font-weight: 600; color: #B45309; text-transform: uppercase; letter-spacing: 0.04em; }
.rim-textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #E8E8E3;
  border-radius: 10px; background: #FFFBEB; font-size: 13px; font-family: inherit; color: #14140F;
  resize: vertical; min-height: 70px;
}
.rim-textarea:focus { outline: none; border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
.rim-btn-cancel {
  padding: 9px 16px; font-size: 13px; font-weight: 500; font-family: inherit; color: #6F6F66;
  background: #fff; border: 1px solid #E8E8E3; border-radius: 8px; cursor: pointer;
}
.rim-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
.rim-btn-save {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
  font-size: 13px; font-weight: 600; font-family: inherit; color: #fff;
  background: #B45309; border: none; border-radius: 8px; cursor: pointer;
}
.rim-btn-save:hover:not(:disabled) { background: #92400E; }
.rim-btn-save:disabled { opacity: 0.45; cursor: not-allowed; }

[data-coreui-theme="dark"] .rim-meta { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .rim-meta-pill { color: #F4F4F0; background: #14140F; border-color: #2A2A22; }
[data-coreui-theme="dark"] .rim-amount { color: #F4F4F0; }
[data-coreui-theme="dark"] .rim-text { color: #C8C8C0; }
[data-coreui-theme="dark"] .rim-warn { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.35); color: #FBBF24; }
[data-coreui-theme="dark"] .rim-label { color: #FBBF24; }
[data-coreui-theme="dark"] .rim-textarea { border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.10); color: #F4F4F0; }
[data-coreui-theme="dark"] .rim-btn-cancel { color: #A0A099; background: #1A1A14; border-color: #2A2A22; }
</style>

<style>
/* Casco del BaseModal (teleported a body, fuera del scope): solo en dark. */
[data-coreui-theme="dark"] .modal-card:has(.rim-body) { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .modal-card:has(.rim-body) .modal-header { border-bottom-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .modal-card:has(.rim-body) .modal-footer { border-top-color: #2A2A22; }
</style>
