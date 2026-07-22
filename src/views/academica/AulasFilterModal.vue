<template>
  <BaseModal :modelValue="visible" @update:modelValue="$emit('update:visible', $event)" title="Filtros Avanzados" size="xl">
    <div class="flt-body">
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-magnifying-glass"></i> Busqueda</legend>
        <div class="flt-grid cols-1">
          <div class="flt-field">
            <label>Busqueda global</label>
            <input v-model.trim="filters.q" type="text" class="flt-input" placeholder="Nombre, codigo o docente..." @keyup.enter="$emit('apply')" />
          </div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-graduation-cap"></i> Aula</legend>
        <div class="flt-grid cols-3">
          <div class="flt-field"><label>Modalidad</label><MultiSelect v-model="filters.modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="flt-field"><label>Segmento</label><MultiSelect v-model="filters.segment_ids" :items="filtroSegmento" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field"><label>Docente</label><MultiSelect v-model="filters.teacher_ids" :items="filtroDocente" label-key="description" value-key="id" placeholder="Todos..." /></div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset flt-last">
        <legend class="flt-legend"><i class="fa-solid fa-calendar-days"></i> Rangos de Fecha</legend>
        <div class="flt-grid cols-2">
          <div class="flt-field"><label>Fecha de Inicio</label><BaseDatePicker v-model="filters.start_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => $emit('date-change', s, 'start')" /></div>
          <div class="flt-field"><label>Fecha de Fin</label><BaseDatePicker v-model="filters.end_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => $emit('date-change', s, 'end')" /></div>
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
  filtroModalidad: { type: Array, default: () => [] },
  filtroSegmento: { type: Array, default: () => [] },
  filtroDocente: { type: Array, default: () => [] }
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

/* ══════════ DARK MODE ══════════ */
[data-coreui-theme="dark"] .flt-fieldset { border-color: #2A2A22; }
[data-coreui-theme="dark"] .flt-legend,
[data-coreui-theme="dark"] .flt-field label { color: #A0A099; }
[data-coreui-theme="dark"] .flt-input { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .flt-input:focus { border-color: #2DD4BF; box-shadow: 0 0 0 3px rgba(45, 212, 191, .12); }
[data-coreui-theme="dark"] .btn-ghost { border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .btn-ghost:hover { background: #24241E; border-color: #3A3A33; }
</style>
