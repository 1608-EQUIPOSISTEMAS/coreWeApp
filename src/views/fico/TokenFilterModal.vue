<template>
  <BaseModal :model-value="visible" title="Filtros de tokens" size="lg" @update:model-value="$emit('update:visible', $event)">
    <div v-if="draft" class="flt">
      <section class="flt-section">
        <h4 class="flt-title">Búsqueda</h4>
        <div class="ds-field">
          <label class="ds-label" for="tf-q">Buscar</label>
          <input
            id="tf-q"
            v-model.trim="draft.q"
            type="text"
            class="ds-input"
            placeholder="Alumno, DNI, teléfono, correo, código de programa o edición"
            @keyup.enter="apply"
          />
        </div>
      </section>

      <section class="flt-section">
        <h4 class="flt-title">Estado y solicitante</h4>
        <div class="flt-grid flt-grid--2">
          <div class="ds-field">
            <label class="ds-label">Estado</label>
            <MultiSelect v-model="draft.status_in" :items="filtroStatus" label-key="description" value-key="id" placeholder="Todos" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Solicitante (asesor)</label>
            <MultiSelect v-model="draft.requested_by_in" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos" />
          </div>
        </div>
      </section>

      <section class="flt-section">
        <h4 class="flt-title">Pago</h4>
        <div class="flt-grid flt-grid--3">
          <div class="ds-field">
            <label class="ds-label">Tipo de pago</label>
            <MultiSelect v-model="draft.payment_type_in" :items="filtroPaymentType" label-key="description" value-key="id" placeholder="Todos" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Proveedor</label>
            <MultiSelect v-model="draft.providers_in" :items="filtroProvider" label-key="description" value-key="id" placeholder="Todos" />
          </div>
          <div class="ds-field">
            <label class="ds-label" for="tf-currency">Moneda</label>
            <select id="tf-currency" v-model="draft.currency" class="ds-input">
              <option value="">Todas</option>
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </section>

      <section class="flt-section">
        <h4 class="flt-title">Inscripción y fecha</h4>
        <div class="flt-grid flt-grid--2">
          <div class="ds-field">
            <span class="ds-label">Tipo de inscripción</span>
            <div class="ds-tabs" role="radiogroup" aria-label="Tipo de inscripción">
              <button v-for="o in INSTALLMENT_OPTIONS" :key="o.value" type="button" role="radio" :aria-pressed="draft.installment_only === o.value" :aria-checked="draft.installment_only === o.value" @click="draft.installment_only = o.value">
                {{ o.label }}
              </button>
            </div>
          </div>
          <div class="ds-field">
            <label class="ds-label">Fecha de creación del token</label>
            <BaseDatePicker v-model="draft.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" />
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flt-foot">
        <button class="btn-exec btn-exec-ghost" type="button" @click="clear">
          <i class="fa-solid fa-eraser" aria-hidden="true"></i> Limpiar todo
        </button>
        <div class="flt-foot-actions">
          <button class="btn-exec btn-exec-outline" type="button" @click="$emit('update:visible', false)">Cancelar</button>
          <button class="btn-exec btn-exec-primary" type="button" @click="apply">
            <i class="fa-solid fa-filter" aria-hidden="true"></i> Aplicar filtros
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  filtroStatus: { type: Array, default: () => [] },
  filtroOwners: { type: Array, default: () => [] },
  filtroProvider: { type: Array, default: () => [] },
  filtroPaymentType: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:visible', 'apply', 'clear'])

// installment_only viaja como texto al backend ('' | 'true' | 'false').
const INSTALLMENT_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'true', label: 'Solo cuotas' },
  { value: 'false', label: 'Solo contado' }
]

// Se edita una COPIA (igual que EnrollmentFilterModal): antes el modal escribia
// directo en los filtros de la pagina y "Cancelar" no deshacia nada. JSON y no
// structuredClone porque los filtros son un reactive (Proxy de Vue).
const draft = ref(null)
watch(() => props.visible, (open) => {
  if (open) draft.value = JSON.parse(JSON.stringify(props.filters))
}, { immediate: true })

function apply () {
  emit('apply', draft.value)
}

function clear () {
  emit('clear')
}
</script>

<style scoped>
.flt { display: flex; flex-direction: column; }
.flt-section { padding: 16px 0; border-top: 1px solid var(--ds-border); }
.flt-section:first-child { padding-top: 0; border-top: 0; }
.flt-title { margin: 0 0 12px; font-size: 13.5px; font-weight: 700; color: var(--ds-heading); }
.flt-grid { display: grid; gap: 14px 16px; }
.flt-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.flt-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.flt-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
.flt-foot-actions { display: flex; gap: 8px; }

@media (max-width: 900px) {
  .flt-grid--2, .flt-grid--3 { grid-template-columns: 1fr; }
}
</style>
