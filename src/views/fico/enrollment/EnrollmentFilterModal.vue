<template>
  <BaseModal :model-value="visible" title="Filtros de inscripciones" size="xl" @update:model-value="$emit('update:visible', $event)">
    <div v-if="draft" class="flt">
      <section class="flt-section">
        <h4 class="flt-title">Búsqueda</h4>
        <div class="flt-grid flt-grid--3">
          <div class="ds-field flt-span-2">
            <label class="ds-label" for="flt-q">Buscar</label>
            <input id="flt-q" v-model.trim="draft.q" type="text" class="ds-input" placeholder="Nombre, DNI, código, correo o celular" @keyup.enter="apply" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Ordenar por</label>
            <SearchSelect v-model="draft.order_by" :items="filtroOrden" label-field="description" value-field="value" placeholder="Más recientes" />
          </div>
        </div>
      </section>

      <section class="flt-section">
        <h4 class="flt-title">Estado y asesor</h4>
        <div class="flt-grid flt-grid--4">
          <div class="ds-field">
            <label class="ds-label">Estado del alumno</label>
            <MultiSelect v-model="draft.enrollment_status_ids" :items="filtroStatus" label-key="description" value-key="id" placeholder="Todos" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Asesor</label>
            <MultiSelect v-model="draft.seller_agent_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Canal de pago</label>
            <MultiSelect v-model="draft.payment_channel_ids" :items="filtroPaymentChannel" label-key="description" value-key="id" placeholder="Todos" />
          </div>
          <div class="ds-field">
            <span class="ds-label">Beca</span>
            <label class="flt-switch" :class="{ 'is-on': draft.only_scholarship }">
              <input v-model="draft.only_scholarship" type="checkbox" class="flt-switch-input" />
              <span class="flt-switch-track" aria-hidden="true"><span class="flt-switch-thumb"></span></span>
              Solo becados
            </label>
          </div>
        </div>
      </section>

      <section class="flt-section">
        <h4 class="flt-title">Programa</h4>
        <div class="flt-grid flt-grid--4">
          <div class="ds-field">
            <label class="ds-label">Tipo de programa</label>
            <MultiSelect v-model="draft.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Modalidad</label>
            <MultiSelect v-model="draft.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Programa / curso</label>
            <MultiSelect v-model="draft.program_version_ids" :items="filtroProgramas" label-key="description" value-key="id" :placeholder="filtroProgramas.length ? 'Todos' : 'Cargando…'" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Edición</label>
            <MultiSelect v-model="draft.edition_num_ids" :items="filtroEdiciones" label-key="description" value-key="id" placeholder="Todas" />
          </div>
        </div>
      </section>

      <section class="flt-section">
        <h4 class="flt-title">Fechas</h4>
        <div class="flt-grid flt-grid--3">
          <div class="ds-field">
            <label class="ds-label">Registro</label>
            <BaseDatePicker v-model="draft.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Inicio de clases</label>
            <BaseDatePicker v-model="draft.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" />
          </div>
          <div class="ds-field">
            <label class="ds-label">Pago</label>
            <BaseDatePicker v-model="draft.payment_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" />
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
import SearchSelect from '@/components/SearchSelect.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
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
const emit = defineEmits(['update:visible', 'apply', 'clear'])

// Se edita una COPIA: antes el modal escribía directo en los filtros de la
// página y "Cancelar" no deshacía nada. La copia va por JSON porque los
// filtros son un reactive (structuredClone falla con el Proxy de Vue).
const draft = ref(null)
watch(() => props.visible, (open) => {
  if (open) draft.value = JSON.parse(JSON.stringify(props.filters))
}, { immediate: true })

function apply () {
  emit('apply', draft.value)
}

// La página limpia sus filtros al instante; el borrador se vuelve a copiar
// para que el modal muestre los campos vacíos sin cerrarse.
function clear () {
  emit('clear')
  draft.value = JSON.parse(JSON.stringify(props.filters))
}
</script>

<style scoped>
/* Campos, botones y modal salen de ds-* / btn-exec / BaseModal: aquí solo la
   grilla por secciones y el interruptor de "Solo becados". Sin bloque dark. */
.flt { display: flex; flex-direction: column; }
.flt-section { padding: 16px 0; border-top: 1px solid var(--ds-border); }
.flt-section:first-child { padding-top: 0; border-top: 0; }
.flt-title { margin: 0 0 12px; font-size: 13.5px; font-weight: 700; color: var(--ds-heading); }

.flt-grid { display: grid; gap: 14px 16px; }
.flt-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.flt-grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.flt-span-2 { grid-column: span 2; }

.flt-switch {
  display: inline-flex; align-items: center; gap: 10px;
  height: 38px; cursor: pointer; user-select: none;
  font-size: 13px; font-weight: 600; color: var(--ds-ink-2);
}
.flt-switch.is-on { color: var(--ds-ink); }
.flt-switch-input { position: absolute; opacity: 0; pointer-events: none; }
.flt-switch-track {
  position: relative; flex: none; width: 34px; height: 20px;
  border-radius: 999px; background: var(--ds-border-strong); transition: background 0.15s;
}
.flt-switch-thumb {
  position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
  border-radius: 50%; background: var(--ds-surface); transition: transform 0.15s;
}
.flt-switch.is-on .flt-switch-track { background: var(--ds-accent); }
.flt-switch.is-on .flt-switch-thumb { transform: translateX(14px); }
.flt-switch-input:focus-visible + .flt-switch-track { outline: 2px solid var(--ds-accent); outline-offset: 2px; }

.flt-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
.flt-foot-actions { display: flex; gap: 8px; }

@media (max-width: 900px) {
  .flt-grid--3, .flt-grid--4 { grid-template-columns: 1fr; }
  .flt-span-2 { grid-column: auto; }
}
</style>
