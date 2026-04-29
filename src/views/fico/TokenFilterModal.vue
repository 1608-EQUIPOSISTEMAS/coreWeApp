<template>
  <BaseModal :modelValue="visible" @update:modelValue="$emit('update:visible', $event)" title="Filtros Avanzados" size="xxl">
    <div class="flt-body">
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-magnifying-glass"></i> Busqueda</legend>
        <div class="flt-grid cols-1">
          <div class="flt-field">
            <label>Busqueda global</label>
            <input
              v-model.trim="filters.q"
              type="text"
              class="flt-input"
              placeholder="Alumno, DNI, telefono, correo, codigo de programa o edicion..."
              @keyup.enter="$emit('apply')"
            />
          </div>
        </div>
      </fieldset>

      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-clipboard-check"></i> Estado y Solicitante</legend>
        <div class="flt-grid cols-2">
          <div class="flt-field">
            <label>Estado</label>
            <MultiSelect v-model="filters.status_in" :items="filtroStatus" label-key="description" value-key="id" placeholder="Todos..." />
          </div>
          <div class="flt-field">
            <label>Solicitante (asesor)</label>
            <MultiSelect v-model="filters.requested_by_in" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos..." />
          </div>
        </div>
      </fieldset>

      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-credit-card"></i> Pago</legend>
        <div class="flt-grid cols-3">
          <div class="flt-field">
            <label>Tipo de pago</label>
            <MultiSelect v-model="filters.payment_type_in" :items="filtroPaymentType" label-key="description" value-key="id" placeholder="Todos..." />
          </div>
          <div class="flt-field">
            <label>Proveedor</label>
            <MultiSelect v-model="filters.providers_in" :items="filtroProvider" label-key="description" value-key="id" placeholder="Todos..." />
          </div>
          <div class="flt-field">
            <label>Moneda</label>
            <select v-model="filters.currency" class="flt-input">
              <option :value="''">Todas</option>
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-repeat"></i> Inscripcion</legend>
        <div class="flt-grid cols-1">
          <div class="flt-field">
            <label>Tipo de inscripcion</label>
            <div class="flt-radio-group">
              <label class="flt-radio">
                <input type="radio" :value="''" v-model="filters.installment_only" />
                <span>Todas</span>
              </label>
              <label class="flt-radio">
                <input type="radio" value="true" v-model="filters.installment_only" />
                <span>Solo cuotas (link cobra inicial)</span>
              </label>
              <label class="flt-radio">
                <input type="radio" value="false" v-model="filters.installment_only" />
                <span>Solo contado</span>
              </label>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="flt-fieldset flt-last">
        <legend class="flt-legend"><i class="fa-solid fa-calendar-days"></i> Rango de Fecha</legend>
        <div class="flt-grid cols-1">
          <div class="flt-field">
            <label>Fecha de creacion del token</label>
            <BaseDatePicker
              v-model="filters.created_range_string"
              :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
              placeholder="Seleccionar rango..."
              @on-change="(d, s) => $emit('date-change', s)"
            />
          </div>
        </div>
      </fieldset>
    </div>
    <template #footer>
      <div class="flt-footer">
        <button class="btn-ghost" @click="$emit('clear')"><i class="fa-solid fa-trash-can"></i> Limpiar</button>
        <div class="flt-actions">
          <button class="btn-ghost" @click="$emit('update:visible', false)">Cancelar</button>
          <button class="btn-exec" @click="$emit('apply')"><i class="fa-solid fa-filter"></i> Aplicar</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import BaseModal from '@/components/BaseModal.vue'

defineProps({
  visible: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  filtroStatus: { type: Array, default: () => [] },
  filtroOwners: { type: Array, default: () => [] },
  filtroProvider: { type: Array, default: () => [] },
  filtroPaymentType: { type: Array, default: () => [] }
})

defineEmits(['update:visible', 'apply', 'clear', 'date-change'])
</script>

<style scoped>
.flt-body { display: flex; flex-direction: column; gap: 20px; }
.flt-fieldset { border: 1px solid var(--e-border, #E5E7EB); border-radius: 8px; padding: 16px 20px; margin: 0; }
.flt-last { border-bottom: none; }
.flt-legend {
  font-size: 12px; font-weight: 700; color: var(--e-text-secondary, #6B7280);
  padding: 0 8px; display: flex; align-items: center; gap: 6px;
}
.flt-grid { display: grid; gap: 14px; }
.flt-grid.cols-1 { grid-template-columns: 1fr; }
.flt-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.flt-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.flt-field label {
  display: block; font-size: 11px; font-weight: 600; color: var(--e-text-secondary, #6B7280);
  margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.03em;
}
.flt-input {
  width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid var(--e-border, #E5E7EB);
  border-radius: 6px; font-size: 13px; background: var(--e-bg-subtle, #F9FAFB); font-family: inherit;
  transition: border-color .15s;
}
.flt-input:focus { outline: none; border-color: var(--e-accent, #0D9488); box-shadow: 0 0 0 3px rgba(13,148,136,.08); }

.flt-radio-group { display: flex; flex-wrap: wrap; gap: 16px; padding: 4px 0; }
.flt-radio {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--e-text, #14140F); cursor: pointer;
  padding: 6px 12px; border: 1px solid var(--e-border, #E5E7EB); border-radius: 6px;
  background: var(--e-bg-subtle, #F9FAFB); transition: all .15s;
}
.flt-radio:hover { border-color: #D1D5DB; }
.flt-radio input { accent-color: var(--e-accent, #0D9488); cursor: pointer; }
.flt-radio input:checked + span { font-weight: 600; }

.flt-footer { display: flex; justify-content: space-between; align-items: center; }
.flt-actions { display: flex; gap: 8px; }
.btn-ghost {
  background: none; border: 1px solid var(--e-border, #E5E7EB); color: var(--e-text-secondary, #6B7280);
  padding: 7px 14px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; transition: all .15s;
}
.btn-ghost:hover { background: var(--e-bg-subtle, #F9FAFB); border-color: #D1D5DB; }
.btn-exec {
  background: var(--e-accent, #0D9488); color: #fff; border: none;
  padding: 7px 16px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; transition: all .15s;
}
.btn-exec:hover { background: #0F766E; }
</style>
