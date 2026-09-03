<template>
  <BaseModal :modelValue="visible" @update:modelValue="$emit('update:visible', $event)" title="Filtros Avanzados" size="xxl">
    <div class="flt-body">
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-magnifying-glass"></i> Busqueda</legend>
        <div class="flt-grid cols-3">
          <div class="flt-field col-span-2">
            <label>Busqueda global</label>
            <input v-model.trim="filters.q" type="text" class="flt-input" placeholder="Nombre, DNI, Codigo, Correo, Celular..." @keyup.enter="$emit('apply')" />
          </div>
          <div class="flt-field">
            <label>Ordenar por</label>
            <SearchSelect v-model="filters.order_by" :items="filtroOrden" label-field="description" value-field="value" placeholder="Mas recientes..." />
          </div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-clipboard-check"></i> Estado y Asignacion</legend>
        <div class="flt-grid cols-3">
          <div class="flt-field"><label>Estado Alumno</label><MultiSelect v-model="filters.enrollment_status_ids" :items="filtroStatus" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field"><label>Asesor</label><MultiSelect v-model="filters.seller_agent_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field"><label>Canal de Pago</label><MultiSelect v-model="filters.payment_channel_ids" :items="filtroPaymentChannel" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field">
            <label>Beca</label>
            <label class="flt-toggle" :class="{ active: filters.only_scholarship }">
              <input v-model="filters.only_scholarship" type="checkbox" class="flt-toggle-input" />
              <span class="flt-toggle-track"><span class="flt-toggle-thumb"></span></span>
              <span class="flt-toggle-text"><i class="fa-solid fa-graduation-cap"></i> Solo becados</span>
            </label>
          </div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-graduation-cap"></i> Academico</legend>
        <div class="flt-grid cols-2">
          <div class="flt-field"><label>Tipo Programa</label><MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field"><label>Modalidad Programa</label><MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="flt-field">
            <label>Programa / Curso</label>
            <MultiSelect v-model="filters.program_version_ids" :items="filtroProgramas" label-key="description" value-key="id" :placeholder="filtroProgramas.length === 0 ? 'Cargando...' : 'Todos los cursos...'" />
          </div>
          <div class="flt-field">
            <label>Edicion</label>
            <MultiSelect v-model="filters.edition_num_ids" :items="filtroEdiciones" label-key="description" value-key="id" placeholder="Todas las ediciones..." />
          </div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset flt-last">
        <legend class="flt-legend"><i class="fa-solid fa-calendar-days"></i> Rangos de Fecha</legend>
        <div class="flt-grid cols-3">
          <div class="flt-field"><label>Fecha de Registro</label><BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => $emit('date-change', s, 'created')" /></div>
          <div class="flt-field"><label>Fecha de Inicio</label><BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => $emit('date-change', s, 'edition')" /></div>
          <div class="flt-field"><label>Fecha de Pago</label><BaseDatePicker v-model="filters.payment_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => $emit('date-change', s, 'payment')" /></div>
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
import SearchSelect from '@/components/SearchSelect.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import BaseModal from '@/components/BaseModal.vue'

defineProps({
  visible: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  filtroStatus: { type: Array, default: () => [] },
  filtroOwners: { type: Array, default: () => [] },
  filtroPaymentChannel: { type: Array, default: () => [] },
  filtroTiposPrograma: { type: Array, default: () => [] },
  filtroModalidad: { type: Array, default: () => [] },
  filtroProgramas: { type: Array, default: () => [] },
  filtroEdiciones: { type: Array, default: () => [] },
  filtroOrden: { type: Array, default: () => [] }
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
.flt-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.flt-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.col-span-2 { grid-column: span 2; }
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
.flt-field label.flt-toggle {
  display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;
  width: 100%; box-sizing: border-box; padding: 8px 12px; margin-bottom: 0;
  border: 1px solid var(--e-border, #E5E7EB); border-radius: 6px;
  background: var(--e-bg-subtle, #F9FAFB);
  font-size: 13px; font-weight: 500; color: var(--e-text-secondary, #6B7280);
  text-transform: none; letter-spacing: normal;
  transition: border-color .15s, background .15s, color .15s;
}
.flt-field label.flt-toggle:hover { border-color: #D1D5DB; }
.flt-field label.flt-toggle.active {
  border-color: var(--e-accent, #0D9488);
  background: rgba(13, 148, 136, .06);
  color: #0F766E;
}
.flt-toggle-input { position: absolute; opacity: 0; pointer-events: none; }
.flt-toggle-track {
  flex: none; width: 32px; height: 18px; border-radius: 999px;
  background: #D1D5DB; position: relative; transition: background .18s;
}
.flt-toggle-thumb {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, .15);
  transition: transform .18s;
}
.flt-toggle.active .flt-toggle-track { background: var(--e-accent, #0D9488); }
.flt-toggle.active .flt-toggle-thumb { transform: translateX(14px); }
.flt-toggle-text { display: inline-flex; align-items: center; gap: 6px; }
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

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .flt-body,
[data-coreui-theme="dark"] .flt-footer {
  --e-border: #2A2A22;
  --e-bg-subtle: #1F1F1A;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
}
[data-coreui-theme="dark"] .flt-input { color: #F4F4F0; }
[data-coreui-theme="dark"] .flt-field label.flt-toggle:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .flt-field label.flt-toggle.active {
  background: rgba(13, 148, 136, .16);
  color: #2DD4BF;
}
[data-coreui-theme="dark"] .flt-toggle-track { background: #3A3A33; }
[data-coreui-theme="dark"] .btn-ghost:hover { border-color: #3A3A33; }
</style>

<style>
/* Casco del BaseModal (teleported a body, fuera del scope): solo en dark y
   solo cuando el modal contiene este filtro (.flt-body). */
[data-coreui-theme="dark"] .modal-card:has(.flt-body) {
  background: #1A1A14;
  border-color: #2A2A22;
  box-shadow: 0 20px 40px rgba(0,0,0,.5);
}
[data-coreui-theme="dark"] .modal-card:has(.flt-body) .modal-header { border-bottom-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .modal-card:has(.flt-body) .modal-footer { border-top-color: #2A2A22; }
[data-coreui-theme="dark"] .modal-card:has(.flt-body) .btn-close { color: #A0A099; }
</style>
