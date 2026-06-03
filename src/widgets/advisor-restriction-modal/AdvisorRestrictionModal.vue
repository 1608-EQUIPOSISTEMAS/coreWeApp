<template>
  <!-- Las filas de `asesores` (espejo de asesoresControl) se editan en sitio via
       v-model de los MultiSelect/BaseDatePicker: mutacion de dos vias intencional,
       la logica de persistencia vive en useAdvisorRestrictions. -->
  <!-- eslint-disable vue/no-mutating-props -->
  <BaseModal v-model="show" :title="isComercial ? 'Mis Permisos de Visualización' : 'Panel de Control: Restricciones de Asesores'" size="xl">
    <div v-if="!isComercial" class="px-4 py-3">
      <div class="exec-alert alert-info mb-4">
        <i class="fa-solid fa-circle-info me-2"></i>
        Configura los filtros obligatorios para cada asesor. Si un campo queda vacío, el asesor no tendrá restricciones en esa categoría.
      </div>
      <div class="table-shell control-table-wrapper">
        <table class="exec-table">
          <thead>
            <tr class="thead-group">
              <th rowspan="2" class="th-cat sticky-col" style="min-width: 200px;">Asesor Comercial</th>
              <th colspan="3" class="th-group th-group-a text-center">PROGRAMAS</th>
              <th colspan="8" class="th-group th-group-b text-center">GLOBAL</th>
            </tr>
            <tr class="thead-sub">
              <th class="ts ts-a minW-200">Tipos</th>
              <th class="ts ts-a minW-200">Modalidades</th>
              <th class="ts ts-a minW-300">Específicos</th>
              <th class="ts ts-b minW-200">Estatus (Pipeline)</th>
              <th class="ts ts-b minW-200">Seguimiento</th>
              <th class="ts ts-b minW-200">Niv. Interés</th>
              <th class="ts ts-b minW-200">Canal</th>
              <th class="ts ts-b minW-200">Estrategia</th>
              <th class="ts ts-b minW-200">E. Cliente</th>

<th class="ts ts-b minW-200">F. Contacto (rango)</th>
<th class="ts ts-b minW-200">Ini. Edición (rango)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asesor in asesores" :key="asesor.user_id" class="tbody-row">
              <td class="td-cat sticky-col fw-700"><i class="fa-solid fa-user-tie text-slate-400 me-2"></i>{{ asesor.name }}</td>
              <td class="td-a"><MultiSelect v-model="asesor.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-a"><MultiSelect v-model="asesor.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td class="td-a"><MultiSelect v-model="asesor.program_ids" mode="remote" :fetcher="q => programService.programVersionCaller({ q })" :debounce-ms="400" labelKey="abbreviation" valueKey="program_version_id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Todas..." /></td>
              <td class="td-b"><MultiSelect v-model="asesor.moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Todos..." /></td>
              <td class="td-b">
  <BaseDatePicker
    v-model="asesor.first_contact_range_string"
    :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
    class="exec-input-light w-100"
    placeholder="Desde → Hasta"
    @on-change="(dates, dateStr) => emit('date-change', asesor, dateStr, 'first_contact')"
  />
</td>
<td class="td-b">
  <BaseDatePicker
    v-model="asesor.edition_start_range_string"
    :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
    class="exec-input-light w-100"
    placeholder="Desde → Hasta"
    @on-change="(dates, dateStr) => emit('date-change', asesor, dateStr, 'edition_start')"
  />
</td>
            </tr>
            <tr v-if="asesores.length === 0"><td colspan="12" class="empty-state">Cargando asesores...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else class="px-4 py-4">
      <div class="exec-alert-banner mb-4" :class="hasActiveRestrictions ? 'banner-danger' : 'banner-success'">
        <i class="fa-solid fa-3x" :class="hasActiveRestrictions ? 'fa-user-lock' : 'fa-check-circle'"></i>
        <div class="banner-content">
          <h5 class="banner-title">{{ hasActiveRestrictions ? 'Filtros de Seguridad Activos' : 'Acceso Total Permitido' }}</h5>
          <p class="banner-text">
            <span v-if="hasActiveRestrictions">Actualmente tu perfil tiene restricciones operativas asignadas. Solo puedes acceder a los leads que coincidan <b>estrictamente</b> con los parámetros mostrados a continuación.</span>
            <span v-else>Tu perfil no cuenta con restricciones en este momento. Tienes visibilidad completa sobre todos los leads del sistema.</span>
          </p>
        </div>
      </div>
      <div class="row g-4" v-if="asesores.length > 0">
        <div class="col-12"><h6 class="fieldset-title text-primary"><i class="fa-solid fa-graduation-cap me-1"></i> Restricciones Académicas</h6></div>
        <div class="col-md-4"><label class="exec-label">Tipos de Programa</label><MultiSelect disabled v-model="asesores[0].type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Modalidades</label><MultiSelect disabled v-model="asesores[0].model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Programas Específicos</label><MultiSelect disabled v-model="asesores[0].program_ids" :items="filtroProgramasEspec" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-12 mt-4"><h6 class="fieldset-title" style="color: var(--teal-600);"><i class="fa-solid fa-earth-americas me-1"></i> Restricciones Globales y Operativas</h6></div>
        <div class="col-md-4"><label class="exec-label">Estatus (Pipeline)</label><MultiSelect disabled v-model="asesores[0].status_lead_ids" :items="filtroPipeline" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">E. Cliente</label><MultiSelect disabled v-model="asesores[0].moment_ids" :items="filtroMoment" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Seguimiento</label><MultiSelect disabled v-model="asesores[0].last_follow_ids" :items="filtroFollow" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Canal de Origen</label><MultiSelect disabled v-model="asesores[0].channel_ids" :items="filtroCanales" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Estrategia MKT</label><MultiSelect disabled v-model="asesores[0].strategy_ids" :items="strategyCatalog" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-md-4"><label class="exec-label">Nivel de Interés</label><MultiSelect disabled v-model="asesores[0].interest_level_ids" :items="filtroInterest" label-key="description" value-key="id" placeholder="Accesibilidad total" /></div>
        <div class="col-12 mt-4">
    <h6 class="fieldset-title" style="color: var(--amber-600);">
      <i class="fa-solid fa-calendar-range me-1"></i> Restricciones de Fecha
    </h6>
  </div>
  <div class="col-md-6">
    <label class="exec-label">F. Primer Contacto (rango permitido)</label>
    <div class="exec-input-light w-100 d-flex align-items-center gap-2" style="height:auto; padding: 6px 10px; background:#f8fafc; color:#94a3b8; font-size:12px;">
      <i class="fa-regular fa-calendar me-1"></i>
      <span v-if="asesores[0].first_contact_date_from">
        {{ asesores[0].first_contact_date_from }} → {{ asesores[0].first_contact_date_to }}
      </span>
      <span v-else class="fst-italic">Sin restricción</span>
    </div>
  </div>
  <div class="col-md-6">
    <label class="exec-label">Inicio de Edición (rango permitido)</label>
    <div class="exec-input-light w-100 d-flex align-items-center gap-2" style="height:auto; padding: 6px 10px; background:#f8fafc; color:#94a3b8; font-size:12px;">
      <i class="fa-regular fa-calendar me-1"></i>
      <span v-if="asesores[0].edition_start_date_from">
        {{ asesores[0].edition_start_date_from }} → {{ asesores[0].edition_start_date_to }}
      </span>
      <span v-else class="fst-italic">Sin restricción</span>
    </div>
  </div>
      </div>
    </div>
    <template #footer>
      <div class="d-flex justify-content-end w-100 gap-2">
        <button class="btn-exec btn-exec-outline px-4" @click="show = false">{{ isComercial ? 'Entendido, cerrar' : 'Cancelar' }}</button>
        <button v-if="!isComercial" class="btn-exec btn-exec-warning px-4" @click="emit('save')" :disabled="isSaving">
          <i class="fa-solid fa-save me-1"></i>
          {{ isSaving ? 'Guardando...' : 'Guardar Restricciones' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/BaseModal.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'

const show = defineModel('show', { type: Boolean, default: false })

defineProps({
  asesores: { type: Array, default: () => [] },
  isComercial: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  hasActiveRestrictions: { type: Boolean, default: false },
  filtroTiposPrograma: { type: Array, default: () => [] },
  filtroModalidad: { type: Array, default: () => [] },
  filtroProgramasEspec: { type: Array, default: () => [] },
  filtroPipeline: { type: Array, default: () => [] },
  filtroFollow: { type: Array, default: () => [] },
  filtroInterest: { type: Array, default: () => [] },
  filtroCanales: { type: Array, default: () => [] },
  filtroMoment: { type: Array, default: () => [] },
  strategyCatalog: { type: Array, default: () => [] },
  programService: { type: Object, default: () => ({ programVersionCaller: () => Promise.resolve([]) }) }
})

const emit = defineEmits(['save', 'date-change'])
</script>
