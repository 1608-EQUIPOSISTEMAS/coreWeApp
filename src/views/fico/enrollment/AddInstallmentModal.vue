<template>
  <BaseModal
    :model-value="visible"
    title="Agregar nueva cuota"
    size="sm"
    @update:model-value="onClose"
  >
    <div class="im-body">
      <p class="im-meta">
        <span class="ds-pill">Cuota #{{ nextNumber }}</span>
        Se agrega al final del plan vigente.
      </p>

      <div class="im-row">
        <div class="ds-field">
          <label class="ds-label" for="ai-amount">Monto (S/.)<span class="ds-req">*</span></label>
          <input
            id="ai-amount"
            ref="amountInputRef"
            v-model.number="amount"
            type="number"
            step="0.01"
            min="0.01"
            class="ds-input im-money"
            placeholder="0.00"
          />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="ai-due">Vencimiento<span class="ds-req">*</span></label>
          <input id="ai-due" v-model="dueDate" type="date" class="ds-input" />
        </div>
      </div>

      <div class="ds-field">
        <label class="ds-label" for="ai-why">Justificación<span class="ds-req">*</span></label>
        <textarea
          id="ai-why"
          v-model="justificacion"
          class="ds-input"
          rows="3"
          placeholder="Explica por qué se agrega esta cuota…"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" :disabled="saving" @click="onClose">
        Cancelar
      </button>
      <button class="btn-exec btn-exec-primary" type="button" :disabled="!canSave || saving" @click="trySubmit">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-plus'" aria-hidden="true"></i>
        {{ saving ? 'Guardando…' : 'Agregar cuota' }}
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
.im-body { display: flex; flex-direction: column; gap: 14px; }
.im-meta { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 12.5px; color: var(--ds-ink-2); }
.im-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.im-money { font-family: var(--ds-font-mono); font-size: 15px; font-weight: 700; text-align: right; }
</style>
