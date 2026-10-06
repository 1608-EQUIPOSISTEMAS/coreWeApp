<template>
  <BaseModal :modelValue="visible" @update:modelValue="$emit('update:visible', $event)" title="Filtros avanzados" size="xl">
    <div class="flt-body">
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Búsqueda</legend>
        <div class="ds-field">
          <label class="ds-label" for="aulas-flt-q">Búsqueda global</label>
          <input id="aulas-flt-q" v-model.trim="draft.q" type="search" class="ds-input" placeholder="Nombre, código o docente" @keyup.enter="apply" />
        </div>
      </fieldset>
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-graduation-cap" aria-hidden="true"></i> Aula</legend>
        <div class="flt-grid cols-3">
          <div class="ds-field"><label class="ds-label">Modalidad</label><MultiSelect v-model="draft.modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="ds-field"><label class="ds-label">Segmento</label><MultiSelect v-model="draft.segment_ids" :items="filtroSegmento" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="ds-field"><label class="ds-label">Docente</label><MultiSelect v-model="draft.teacher_ids" :items="filtroDocente" label-key="description" value-key="id" placeholder="Todos..." /></div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i> Rangos de fecha</legend>
        <div class="flt-grid cols-2">
          <div class="ds-field"><label class="ds-label">Fecha de inicio</label><BaseDatePicker v-model="draft.start_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => setRange(s, 'start')" /></div>
          <div class="ds-field"><label class="ds-label">Fecha de fin</label><BaseDatePicker v-model="draft.end_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => setRange(s, 'end')" /></div>
        </div>
      </fieldset>
    </div>
    <template #footer>
      <div class="flt-footer">
        <button class="btn-exec btn-exec-ghost" type="button" @click="$emit('clear')"><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Limpiar filtros</button>
        <div class="flt-actions">
          <button class="btn-exec btn-exec-outline" type="button" @click="$emit('update:visible', false)">Cancelar</button>
          <button class="btn-exec btn-exec-primary" type="button" @click="apply"><i class="fa-solid fa-filter" aria-hidden="true"></i> Aplicar filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { reactive, watch } from 'vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  filtroModalidad: { type: Array, default: () => [] },
  filtroSegmento: { type: Array, default: () => [] },
  filtroDocente: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'apply', 'clear'])

// Se edita un BORRADOR: antes el modal mutaba el filtro del padre en vivo y
// "Cancelar" no revertia nada. Spread y no structuredClone (falla con reactive).
const copy = (f) => ({ ...f, modality_ids: [...f.modality_ids], segment_ids: [...f.segment_ids], teacher_ids: [...f.teacher_ids] })
const draft = reactive(copy(props.filters))
watch(() => props.visible, (open) => { if (open) Object.assign(draft, copy(props.filters)) })

// El locale Spanish de flatpickr usa ' a ' como rangeSeparator; el ingles ' to '.
function setRange (dateStr, type) {
  const p = dateStr ? String(dateStr).split(/\s+(?:to|a)\s+/i) : []
  draft[`${type}_from`] = p[0] || null
  draft[`${type}_to`] = p[1] || p[0] || null
}

function apply () {
  emit('apply', copy(draft))
  emit('update:visible', false)
}
</script>

<style scoped>
.flt-body { display: flex; flex-direction: column; gap: var(--ds-gap); }
.flt-fieldset { margin: 0; padding: 14px 18px 16px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius); }
.flt-legend {
  display: flex; align-items: center; gap: 6px;
  width: auto; margin: 0; padding: 0 8px; float: none;
  font-size: 12px; font-weight: 700; color: var(--ds-ink-2);
}
.flt-grid { display: grid; gap: 14px; }
.flt-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.flt-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.flt-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.flt-actions { display: flex; gap: 8px; }

@media (max-width: 900px) {
  .flt-grid.cols-2, .flt-grid.cols-3 { grid-template-columns: 1fr; }
}
</style>
