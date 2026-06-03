<template>
  <!-- Edita en sitio el objeto reactivo `filters` recibido por prop: la pagina
       pasa el state del store y este widget muta sus campos via v-model, espejo
       del god component. Misma convencion que los fieldsets ya migrados. -->
  <!-- eslint-disable vue/no-mutating-props -->
  <BaseModal v-model="showFilterModal" title="Filtros Avanzados" size="xl">
    <div class="px-4 py-3">
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <label class="exec-label">Búsqueda General</label>
          <input v-model.trim="filters.q" type="text" class="exec-input-light w-100" placeholder="Nombre, teléfono..." @keyup.enter="applyFilters" />
        </div>
        <div class="col-md-3">
          <label class="exec-label text-primary">Ordenar resultados por</label>
          <SearchSelect v-model="filters.order_by" :items="filtroOrden" label-field="description" value-field="value" placeholder="Seleccionar orden..." class="exec-select-light w-100" />
        </div>
        <div class="col-md-3" v-if="!isComercial">
          <label class="exec-label">Asesor Asignado</label>
          <MultiSelect v-model="filters.owner_user_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos..." />
        </div>
        <div class="col-md-3">
          <label class="exec-label">Etapa del Cliente</label>
          <MultiSelect v-model="filters.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Todas..." />
        </div>
      </div>
      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title">Estado, Origen y Ubicación</h6>
        <div class="row g-3">
          <div class="col-md-3 col-6"><label class="exec-label">Estatus (Pipeline)</label><MultiSelect v-model="filters.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Seguimiento</label><MultiSelect v-model="filters.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Origen de Intento</label><MultiSelect v-model="filters.attempt_origin_ids" :items="filtroAttemptOrigin" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Nivel de Interés</label><MultiSelect v-model="filters.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">País</label><MultiSelect v-model="filters.code_country_ids" :items="filtroPaises" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Canal (Red Social)</label><MultiSelect v-model="filters.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Medio de Contacto</label><MultiSelect v-model="filters.medium_contact_ids" :items="filtroMedios" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6">
            <label class="exec-label">Situación del Prospecto</label>
            <MultiSelect v-model="filters.prospect_situation_ids" :items="withNull(filtroProspectSituation)" label-key="description" value-key="id" placeholder="Todas..." />
          </div>
          <div class="col-md-3 col-6"><label class="exec-label">Estrategia</label><MultiSelect v-model="filters.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Palabra Clave</label><MultiSelect v-model="filters.word_ids" :items="mktWordsCatalog" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6">
            <label class="exec-label mb-2">Origen Web</label>
            <div class="d-flex align-items-center gap-2">
              <label class="exec-switch"><input type="checkbox" v-model="filters.web" true-value="Y" :false-value="null" /><span></span></label>
              <span class="x-small text-muted fw-600">{{ filters.web === 'Y' ? 'SÍ ' : 'TODOS' }}</span>
            </div>
          </div>
          <div class="col-md-3 col-6">
            <label class="exec-label mb-2">Es B2B</label>
            <div class="d-flex align-items-center gap-2">
              <label class="exec-switch"><input type="checkbox" v-model="filters.b2b" true-value="Y" :false-value="null" /><span></span></label>
              <span class="x-small text-muted fw-600">{{ filters.b2b === 'Y' ? 'SÍ ' : 'TODOS' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title" style="color: var(--teal-600);">Interés Académico</h6>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="exec-label">Programa</label>
            <MultiSelect v-model="filters.program_version_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" label-key="abbreviation" value-key="program_version_id" placeholder="Buscar programa..." />
          </div>
          <div class="col-md-6"><label class="exec-label">Promoción</label><MultiSelect v-model="filters.query_ids" :items="filtroQuery" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Tipo</label><MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Modalidad</label><MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-6">
            <label class="exec-label">Rango Inicio Edición</label>
            <BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'edition_start')" />
          </div>
        </div>
      </div>
      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title">Auditoría del Registro</h6>
        <div class="row g-3">
          <div class="col-md-4"><label class="exec-label">Fecha de Pago</label><BaseDatePicker v-model="filters.pay_date_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'pay_date')" /></div>
          <div class="col-md-4"><label class="exec-label">Fecha de Creación</label><BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'created')" /></div>
          <div class="col-md-4">
            <label class="exec-label">F. Primer Contacto</label>
            <BaseDatePicker v-model="filters.first_contact_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'first_contact')" />
          </div>
          <div class="col-md-4">
            <label class="exec-label">Fecha de Registro (Sistema)</label>
            <BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'created')" />
          </div>
          <div class="col-md-4"><label class="exec-label">Última Modificación</label><BaseDatePicker v-model="filters.updated_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" class="exec-input-light w-100" placeholder="Seleccionar fechas..." @on-change="(dates, dateStr) => handleDateFilterChange(dateStr, 'updated')" /></div>
        </div>
      </div>
      <div class="exec-fieldset">
        <h6 class="fieldset-title" style="color: var(--blue-600);">Filtros Financieros y Matrícula</h6>
        <div class="row g-3">
          <div class="col-md-3 col-6"><label class="exec-label">Estado FICO (Deuda)</label><MultiSelect v-model="filters.fico_status_ids" :items="filtroFicoStatus" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Perfil de Precio</label><MultiSelect v-model="filters.profile_ids" :items="filtroProfile" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Moneda</label><MultiSelect v-model="filters.currency_ids" :items="filtroCurrency" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Mod. Inscripción</label><MultiSelect v-model="filters.inscription_modality_ids" :items="filtroInscriptionModality" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Estado Cuotas</label><MultiSelect v-model="filters.installment_status_ids" :items="filtroPaymentStatus" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Método de Pago</label><MultiSelect v-model="filters.payment_method_ids" :items="filtroPaymentMethod" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="col-md-3 col-6"><label class="exec-label">Conciliación Bancaria</label><MultiSelect v-model="filters.settlement_status_ids" :items="filtroSettlementStatus" label-key="description" value-key="id" placeholder="Todas..." /></div>
          <div class="col-md-3 col-6">
            <label class="exec-label">Canal de Pago</label>
            <MultiSelect v-model="filters.payment_channel_ids" :items="filtroPaymentChannel" label-key="description" value-key="id" placeholder="Todos..." />
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-between w-100 align-items-center">
        <button class="btn-exec btn-exec-outline" @click="clearFilters"><i class="fa-solid fa-eraser me-1"></i> Limpiar todo</button>
        <div class="d-flex gap-2">
          <button class="btn-exec btn-exec-outline" @click="showFilterModal = false">Cerrar</button>
          <button class="btn-exec btn-exec-primary" @click="applyFilters"><i class="fa-solid fa-filter me-1"></i> Aplicar Filtros</button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
/* eslint-disable vue/no-mutating-props -- edita en sitio el objeto reactivo `filters` que pasa la pagina (mismo contrato que los fieldsets) */
import { computed } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  filters: { type: Object, required: true },
  isComercial: { type: Boolean, default: false },
  programService: { type: Object, default: () => ({ programVersionCaller: () => Promise.resolve([]) }) },
  withNull: { type: Function, default: (items) => items || [] },
  filtroOrden: { type: Array, default: () => [] },
  filtroOwners: { type: Array, default: () => [] },
  filtroMoment: { type: Array, default: () => [] },
  filtroPipeline: { type: Array, default: () => [] },
  filtroFollow: { type: Array, default: () => [] },
  filtroAttemptOrigin: { type: Array, default: () => [] },
  filtroInterest: { type: Array, default: () => [] },
  filtroPaises: { type: Array, default: () => [] },
  filtroCanales: { type: Array, default: () => [] },
  filtroMedios: { type: Array, default: () => [] },
  filtroProspectSituation: { type: Array, default: () => [] },
  strategyCatalog: { type: Array, default: () => [] },
  mktWordsCatalog: { type: Array, default: () => [] },
  filtroQuery: { type: Array, default: () => [] },
  filtroTiposPrograma: { type: Array, default: () => [] },
  filtroModalidad: { type: Array, default: () => [] },
  filtroFicoStatus: { type: Array, default: () => [] },
  filtroProfile: { type: Array, default: () => [] },
  filtroCurrency: { type: Array, default: () => [] },
  filtroInscriptionModality: { type: Array, default: () => [] },
  filtroPaymentStatus: { type: Array, default: () => [] },
  filtroPaymentMethod: { type: Array, default: () => [] },
  filtroSettlementStatus: { type: Array, default: () => [] },
  filtroPaymentChannel: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:show', 'apply', 'clear'])

// Puente entre el v-model del BaseModal y el contrato show/update:show del widget.
const showFilterModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

function applyFilters () {
  emit('apply')
}

function clearFilters () {
  emit('clear')
}

// Sincroniza los rangos de fechas del flatpickr con los campos planos que espera
// el SP. Solo muta el objeto `filters` recibido por prop (logica de presentacion
// del rango); el fetch/recalculo vive en la feature al emitir apply.
function handleDateFilterChange (dateStr, type) {
  let start = '', end = ''
  if (dateStr && dateStr.includes(' a ')) { [start, end] = dateStr.split(' a ') } else if (dateStr) { start = end = dateStr }
  if (type === 'created') { props.filters.rangoFechas = { start, end }; props.filters.created_range_string = dateStr }
  else if (type === 'updated') { props.filters.rangoModificacion = { start, end }; props.filters.updated_range_string = dateStr }
  else if (type === 'pay_date') { props.filters.pay_date_from = start; props.filters.pay_date_to = end; props.filters.pay_date_range_string = dateStr }
  else if (type === 'first_contact') { props.filters.first_contact_from = start; props.filters.first_contact_to = end; props.filters.first_contact_range_string = dateStr }
  else if (type === 'edition_start') { props.filters.edition_start_from = start; props.filters.edition_start_to = end; props.filters.edition_range_string = dateStr }
}
</script>
