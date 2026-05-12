<template>
  <BaseModal
    :modelValue="visible"
    @update:modelValue="onClose"
    title="Editar monto de cuota"
    size="sm"
  >
    <div class="eia-body" v-if="installment">
      <div class="eia-meta">
        <div class="eia-meta-pill">Cuota #{{ installment.installment_number }}</div>
        <div class="eia-meta-line">
          <i class="fa-regular fa-calendar"></i>
          <span>Vence el {{ formatDate(installment.due_date) }}</span>
        </div>
      </div>

      <div class="eia-field">
        <label class="eia-label">Nuevo monto</label>
        <div class="eia-amount-wrap">
          <span class="eia-amount-prefix">S/.</span>
          <input
            ref="amountInputRef"
            v-model.number="newAmount"
            type="number"
            step="0.01"
            min="0.01"
            class="eia-amount-input"
            placeholder="0.00"
            @keydown.enter="trySubmit"
          />
        </div>
      </div>

      <div v-if="hasDiff" class="eia-diff" :class="{ 'eia-diff-up': delta > 0, 'eia-diff-down': delta < 0 }">
        <span class="eia-diff-old">S/. {{ formatMoney(oldAmount) }}</span>
        <i class="fa-solid fa-arrow-right eia-diff-arrow"></i>
        <span class="eia-diff-new">S/. {{ formatMoney(newAmount) }}</span>
        <span class="eia-diff-delta">
          ({{ delta > 0 ? '+' : '' }}S/. {{ formatMoney(Math.abs(delta)) }})
        </span>
      </div>

      <div class="eia-field">
        <label class="eia-warn-label">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Justificacion (obligatorio)
        </label>
        <textarea
          v-model="justificacion"
          class="eia-textarea"
          rows="3"
          placeholder="Explica el motivo del cambio de monto..."
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="eia-btn-cancel" :disabled="saving" @click="onClose(false)">
        Cancelar
      </button>
      <button
        class="eia-btn-save"
        :disabled="!canSave || saving"
        @click="trySubmit"
      >
        <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
        <i v-else class="fa-solid fa-check"></i>
        {{ saving ? 'Guardando...' : 'Guardar cambio' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  installment: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'submit'])

const newAmount = ref(null)
const justificacion = ref('')
const amountInputRef = ref(null)

const oldAmount = computed(() => Number(props.installment?.amount || 0))
const delta = computed(() => Number(newAmount.value || 0) - oldAmount.value)
const hasDiff = computed(() =>
  Number.isFinite(newAmount.value) && newAmount.value > 0 && Math.abs(delta.value) >= 0.01
)
const canSave = computed(() =>
  hasDiff.value && justificacion.value.trim().length > 0
)

watch(() => props.visible, async (v) => {
  if (v) {
    newAmount.value = oldAmount.value
    justificacion.value = ''
    await nextTick()
    amountInputRef.value?.select?.()
  }
})

function trySubmit () {
  if (!canSave.value || props.saving) return
  emit('submit', {
    installment_id: props.installment.installment_id,
    new_amount: Number(newAmount.value),
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

function formatDate (iso) {
  if (!iso) return '—'
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso)
}
</script>

<style scoped>
.eia-body { display: flex; flex-direction: column; gap: 16px; }

.eia-meta {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: #FAFAF8;
  border: 1px solid #E8E8E3;
  border-radius: 10px;
}
.eia-meta-pill {
  font-size: 12px; font-weight: 700;
  color: #14140F;
  background: #fff;
  border: 1px solid #E8E8E3;
  border-radius: 6px;
  padding: 3px 9px;
  letter-spacing: 0.02em;
}
.eia-meta-line {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px;
  color: #6F6F66;
}
.eia-meta-line i { font-size: 11px; }

.eia-field { display: flex; flex-direction: column; gap: 6px; }
.eia-label {
  font-size: 11px; font-weight: 600; color: #6F6F66;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.eia-warn-label {
  font-size: 11px; font-weight: 600; color: #B45309;
  text-transform: uppercase; letter-spacing: 0.04em;
  display: inline-flex; align-items: center; gap: 6px;
}
.eia-warn-label i { font-size: 11px; }

.eia-amount-wrap {
  display: flex; align-items: stretch;
  border: 1px solid #E8E8E3;
  border-radius: 10px;
  background: #fff;
  transition: border-color .15s, box-shadow .15s;
}
.eia-amount-wrap:focus-within {
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.eia-amount-prefix {
  display: inline-flex; align-items: center;
  padding: 0 12px;
  font-size: 14px; font-weight: 700; color: #6F6F66;
  border-right: 1px solid #E8E8E3;
  background: #FAFAF8;
  border-radius: 10px 0 0 10px;
}
.eia-amount-input {
  flex: 1;
  border: none; outline: none; background: transparent;
  padding: 10px 12px;
  font-size: 18px; font-weight: 700;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #14140F;
  text-align: right;
}
.eia-amount-input::-webkit-outer-spin-button,
.eia-amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.eia-amount-input { -moz-appearance: textfield; }

.eia-diff {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: #FAFAF8;
  border: 1px solid #E8E8E3;
  border-radius: 8px;
  font-size: 12.5px;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  align-self: flex-start;
}
.eia-diff-old { color: #6F6F66; text-decoration: line-through; }
.eia-diff-arrow { color: #A0A099; font-size: 11px; }
.eia-diff-new { color: #14140F; font-weight: 700; }
.eia-diff-delta { font-size: 11.5px; color: #6F6F66; margin-left: 2px; }
.eia-diff-up .eia-diff-delta { color: #047857; }
.eia-diff-down .eia-diff-delta { color: #B91C1C; }

.eia-textarea {
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
.eia-textarea:focus {
  outline: none;
  border-color: #F59E0B;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.eia-btn-cancel {
  padding: 9px 16px;
  font-size: 13px; font-weight: 500; font-family: inherit;
  color: #6F6F66; background: #fff;
  border: 1px solid #E8E8E3; border-radius: 8px;
  cursor: pointer; transition: all .15s;
}
.eia-btn-cancel:hover:not(:disabled) { background: #FAFAF8; color: #14140F; }
.eia-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.eia-btn-save {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  color: #fff; background: #6366F1;
  border: none; border-radius: 8px;
  cursor: pointer; transition: background .15s;
}
.eia-btn-save:hover:not(:disabled) { background: #4F46E5; }
.eia-btn-save:disabled { opacity: 0.45; cursor: not-allowed; }
.eia-btn-save i { font-size: 11px; }
</style>
