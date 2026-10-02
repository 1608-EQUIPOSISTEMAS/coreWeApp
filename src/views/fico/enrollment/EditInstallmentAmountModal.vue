<template>
  <BaseModal
    :model-value="visible"
    :title="title"
    size="sm"
    @update:model-value="onClose"
  >
    <div v-if="installment" class="im-body">
      <p class="im-meta">
        <span class="ds-pill">{{ isInitial ? 'Pago inicial' : `Cuota #${installment.installment_number}` }}</span>
        <span v-if="isInitial">El total y el descuento de la venta se ajustan con la diferencia.</span>
        <span v-else>Vence el {{ fmt.formatDate(installment.due_date) }}</span>
      </p>

      <div class="ds-field">
        <label class="ds-label" for="eia-amount">Nuevo monto (S/.)<span class="ds-req">*</span></label>
        <input
          id="eia-amount"
          ref="amountInputRef"
          v-model.number="newAmount"
          type="number"
          step="0.01"
          min="0.01"
          class="ds-input im-money"
          placeholder="0.00"
          @keydown.enter="trySubmit"
        />
        <button
          v-if="isInitial && !removing"
          type="button"
          class="im-remove"
          @click="newAmount = 0"
        >
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Eliminar pago inicial
        </button>
      </div>

      <p v-if="removing" class="ds-callout bad">
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        <span>Se anula la inicial de S/. {{ fmt.formatMoney(oldAmount) }} y su pago; la venta queda con sus cuotas.</span>
      </p>

      <p v-else-if="hasDiff" class="im-diff">
        <span class="im-diff-old">S/. {{ fmt.formatMoney(oldAmount) }}</span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        <strong>S/. {{ fmt.formatMoney(newAmount) }}</strong>
        <span :class="delta > 0 ? 'is-up' : 'is-down'">
          ({{ delta > 0 ? '+' : '−' }}S/. {{ fmt.formatMoney(Math.abs(delta)) }})
        </span>
      </p>

      <div class="ds-field">
        <label class="ds-label" for="eia-why">Justificación<span class="ds-req">*</span></label>
        <textarea
          id="eia-why"
          v-model="justificacion"
          class="ds-input"
          rows="3"
          placeholder="Explica el motivo del cambio de monto…"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" :disabled="saving" @click="onClose">
        Cancelar
      </button>
      <button
        class="btn-exec"
        :class="removing ? 'btn-exec-danger' : 'btn-exec-primary'"
        type="button"
        :disabled="!canSave || saving"
        @click="trySubmit"
      >
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'" aria-hidden="true"></i>
        {{ saving ? 'Guardando…' : (removing ? 'Eliminar inicial' : 'Guardar cambio') }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  installment: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  title: { type: String, default: 'Editar monto de cuota' }
})

const emit = defineEmits(['update:visible', 'submit'])
const fmt = useEnrollmentFormatters()

// La cuota 0 no tiene vencimiento propio que mostrar; lo util es avisar que
// corregirla mueve tambien el total de la venta.
const isInitial = computed(() => props.installment?.installment_number === 0)

const newAmount = ref(null)
const justificacion = ref('')
const amountInputRef = ref(null)

const oldAmount = computed(() => Number(props.installment?.amount || 0))
const delta = computed(() => Number(newAmount.value || 0) - oldAmount.value)
// Solo la inicial acepta 0: significa eliminarla (se registro en otra venta).
// Una cuota en 0 no tiene sentido; para eso esta la campana de cobranza.
const removing = computed(() => isInitial.value && newAmount.value === 0)
const hasDiff = computed(() =>
  Number.isFinite(newAmount.value) && (newAmount.value > 0 || removing.value) && Math.abs(delta.value) >= 0.01
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
</script>

<style scoped>
.im-body { display: flex; flex-direction: column; gap: 14px; }
.im-meta { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 12.5px; color: var(--ds-ink-2); }
.im-money { font-family: var(--ds-font-mono); font-size: 16px; font-weight: 700; text-align: right; }
.im-remove {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  margin-top: 8px; padding: 0; border: 0; background: none; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 600; color: var(--ds-bad-ink);
}
.im-remove:hover, .im-remove:focus-visible { text-decoration: underline; }
.im-diff {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 0;
  font-family: var(--ds-font-mono); font-size: 12.5px; color: var(--ds-ink);
}
.im-diff i { font-size: 10px; color: var(--ds-muted); }
.im-diff-old { color: var(--ds-muted); text-decoration: line-through; }
.is-up { color: var(--ds-ok-ink); }
.is-down { color: var(--ds-bad-ink); }
</style>
