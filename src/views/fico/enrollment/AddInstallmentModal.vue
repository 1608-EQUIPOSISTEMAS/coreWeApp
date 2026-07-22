<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="onClose"
    title="Agregar nueva cuota"
    size="sm"
  >
    <div class="ai-body">
      <div class="ai-meta">
        <div class="ai-meta-pill">Cuota #{{ nextNumber }}</div>
        <div class="ai-meta-line">
          <i class="fa-regular fa-circle-question"></i>
          <span>Se agrega al final del plan vigente</span>
        </div>
      </div>

      <div class="ai-row">
        <div class="ai-field">
          <label class="ai-label">Monto</label>
          <div class="ai-amount-wrap">
            <span class="ai-amount-prefix">S/.</span>
            <input
              ref="amountInputRef"
              v-model.number="amount"
              type="number"
              step="0.01"
              min="0.01"
              class="ai-amount-input"
              placeholder="0.00"
            />
          </div>
        </div>

        <div class="ai-field">
          <label class="ai-label">Vencimiento</label>
          <input
            v-model="dueDate"
            type="date"
            class="ai-date-input"
          />
        </div>
      </div>

      <div class="ai-field">
        <label class="ai-warn-label">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Justificacion (obligatorio)
        </label>
        <textarea
          v-model="justificacion"
          class="ai-textarea"
          rows="3"
          placeholder="Explica por que se agrega esta cuota..."
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="ai-btn-cancel" :disabled="saving" @click="onClose">
        Cancelar
      </button>
      <button
        class="ai-btn-save"
        :disabled="!canSave || saving"
        @click="trySubmit"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-plus"></i>
        {{ saving ? 'Guardando...' : 'Agregar cuota' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  nextNumber: { type: Number, default: 1 },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'submit'])

const amount = ref(null)
const dueDate = ref('')
const justificacion = ref('')
const amountInputRef = ref(null)

const canSave = computed(() =>
  Number.isFinite(amount.value) && amount.value > 0 &&
  !!dueDate.value &&
  justificacion.value.trim().length > 0
)

watch(() => props.visible, async (v) => {
  if (v) {
    amount.value = null
    dueDate.value = ''
    justificacion.value = ''
    await nextTick()
    amountInputRef.value?.focus?.()
  }
})

function trySubmit () {
  if (!canSave.value || props.saving) return
  emit('submit', {
    amount: Number(amount.value),
    due_date: dueDate.value,
    justificacion: justificacion.value.trim()
  })
}

function onClose () {
  if (props.saving) return
  emit('update:visible', false)
}
</script>

<style scoped>
.ai-body { display: flex; flex-direction: column; gap: 16px; }

.ai-meta {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: #FAFAF8;
  border: 1px solid #E8E8E3;
  border-radius: 10px;
}
.ai-meta-pill {
  font-size: 12px; font-weight: 700;
  color: #14140F;
  background: #fff;
  border: 1px solid #E8E8E3;
  border-radius: 6px;
  padding: 3px 9px;
  letter-spacing: 0.02em;
}
.ai-meta-line {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px;
  color: #6F6F66;
}
.ai-meta-line i { font-size: 11px; }

.ai-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ai-field { display: flex; flex-direction: column; gap: 6px; }
.ai-label {
  font-size: 11px; font-weight: 600; color: #6F6F66;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.ai-warn-label {
  font-size: 11px; font-weight: 600; color: #B45309;
  text-transform: uppercase; letter-spacing: 0.04em;
  display: inline-flex; align-items: center; gap: 6px;
}
.ai-warn-label i { font-size: 11px; }

.ai-amount-wrap {
  display: flex; align-items: stretch;
  border: 1px solid #E8E8E3;
  border-radius: 10px;
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
}
.ai-amount-wrap:focus-within {
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.ai-amount-prefix {
  display: inline-flex; align-items: center;
  padding: 0 12px;
  font-size: 14px; font-weight: 700; color: #6F6F66;
  border-right: 1px solid #E8E8E3;
  background: #FAFAF8;
  border-radius: 10px 0 0 10px;
}
.ai-amount-input {
  flex: 1;
  border: none; outline: none; background: transparent;
  padding: 10px 12px;
  font-size: 16px; font-weight: 700;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #14140F;
  text-align: right;
  width: 100%;
}
.ai-amount-input::-webkit-outer-spin-button,
.ai-amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ai-amount-input { -moz-appearance: textfield; }

.ai-date-input {
  padding: 10px 12px;
  border: 1px solid #E8E8E3;
  border-radius: 10px;
  background: #fff;
  font-size: 13.5px;
  font-family: inherit;
  color: #14140F;
  transition: border-color .15s, box-shadow .15s;
}
.ai-date-input:focus {
  outline: none;
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.ai-textarea {
  width: 100%; box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #E8E8E3;
  border-radius: 10px;
  background: #FFFBEB;
  font-size: 13px;
  font-family: inherit;
  color: #14140F;
  resize: vertical;
  min-height: 70px;
  transition: border-color .15s, box-shadow .15s;
}
.ai-textarea:focus {
  outline: none;
  border-color: #F59E0B;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.ai-btn-cancel {
  padding: 9px 16px;
  font-size: 13px; font-weight: 500; font-family: inherit;
  color: #6F6F66; background: #fff;
  border: 1px solid #E8E8E3; border-radius: 8px;
  cursor: pointer; transition: all .15s;
}
.ai-btn-cancel:hover:not(:disabled) { background: #FAFAF8; color: #14140F; }
.ai-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.ai-btn-save {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  color: #fff; background: #6366F1;
  border: none; border-radius: 8px;
  cursor: pointer; transition: background .15s;
}
.ai-btn-save:hover:not(:disabled) { background: #4F46E5; }
.ai-btn-save:disabled { opacity: 0.45; cursor: not-allowed; }
.ai-btn-save i { font-size: 11px; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .ai-meta { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .ai-meta-pill {
  color: #F4F4F0;
  background: #14140F;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .ai-meta-line { color: #A0A099; }
[data-coreui-theme="dark"] .ai-label { color: #A0A099; }
[data-coreui-theme="dark"] .ai-warn-label { color: #FBBF24; }
[data-coreui-theme="dark"] .ai-amount-wrap { border-color: #2A2A22; background: #14140F; }
[data-coreui-theme="dark"] .ai-amount-prefix {
  color: #A0A099;
  border-right-color: #2A2A22;
  background: #1F1F1A;
}
[data-coreui-theme="dark"] .ai-amount-input { color: #F4F4F0; }
[data-coreui-theme="dark"] .ai-date-input {
  border-color: #2A2A22;
  background: #14140F;
  color: #F4F4F0;
  color-scheme: dark;
}
[data-coreui-theme="dark"] .ai-textarea {
  border-color: rgba(245,158,11,.35);
  background: rgba(245,158,11,.10);
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .ai-btn-cancel {
  color: #A0A099;
  background: #1A1A14;
  border-color: #2A2A22;
}
[data-coreui-theme="dark"] .ai-btn-cancel:hover:not(:disabled) { background: #1F1F1A; color: #F4F4F0; }
</style>

<style>
/* Casco del BaseModal (teleported a body, fuera del scope): solo en dark y
   solo cuando el modal contiene este cuerpo (.ai-body). */
[data-coreui-theme="dark"] .modal-card:has(.ai-body) {
  background: #1A1A14;
  border-color: #2A2A22;
  box-shadow: 0 20px 40px rgba(0,0,0,.5);
}
[data-coreui-theme="dark"] .modal-card:has(.ai-body) .modal-header { border-bottom-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .modal-card:has(.ai-body) .modal-footer { border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .modal-card:has(.ai-body) .btn-close { color: #A0A099; }
</style>
