<template>
  <!-- Edita en sitio el objeto reactivo `form` recibido por :model: mutacion de
       dos vias intencional, espejo del god component. Migrar a defineModel en el
       rewrite de la pagina (gated). -->
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="exec-fieldset mb-4">
    <h6 class="fieldset-title"><i class="fa-solid fa-bullseye me-2 text-primary"></i> Información del Lead</h6>
    <div class="row g-3">

      <div class="col-md-5">
        <label class="exec-label">Fecha contacto inicial <span class="c-red">*</span></label>
        <DateTime12
          :onlyHours="true"
          :disabled="isEdit"
          v-model="model.fechaContactoInicial"
          required
          clearable />
      </div>

      <div class="col-6 col-md-4">
        <label class="exec-label">Celular de origen <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.origin_seller_phone"
          :items="sellerPhoneOptions"
          label-field="label"
          value-field="value"
          :disabled="sellerPhoneLocked"
          required
          placeholder="Selecciona celular…"
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-6 col-md-3">
        <label class="exec-label">T. Consulta</label>
        <SearchSelect
          v-model="model.query_alias"
          :items="queryCatalog"
          label-field="description"
          value-field="alias"
          placeholder="PROMOCIÓN..."
          :model-label="model.query_label"
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-6 col-md-4 col-lg-3">
        <label class="exec-label">Categoría <span class="c-red">*</span></label>

        <SearchSelect
          v-model="model.category_alias"
          :items="programTypeCatalog"
          label-field="description"
          value-field="alias"

          placeholder="CATEGORÍA..."
          class="exec-select-light w-100"
          @change="onProgramaTypeChange"
        />
      </div>

      <div
        class="col-6 col-md-4 col-lg-2"
        v-if="['we_program_type_course', 'we_program_type_specialization'].includes(model.category_alias) && model.category_alias"
      >
        <label class="exec-label">Modalidad <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.program_modality_alias"
          :items="model.category_alias=='we_program_type_specialization'?programModalityCatalog.filter(e=>e.alias!='we_modality_in_person'):programModalityCatalog"
          label-field="description"
          :viewOpen="6"
          value-field="alias"
          placeholder="MODALIDAD..."
          class="exec-select-light w-100"
          @change="onProgramaTypeChange"
        />
      </div>
      <div
        class="col-6 col-md-4"
        v-if="model.category_alias &&
          (!['we_program_type_course', 'we_program_type_specialization'].includes(model.category_alias) ||
          (['we_program_type_course', 'we_program_type_specialization'].includes(model.category_alias) && model.program_modality_alias))"
      >
        <label class="exec-label">Producto / Programa <span class="c-red">*</span></label>

        <div class="d-flex gap-2">

          <div style="flex: 1; min-width: 0;">
            <SearchSelect
              v-model="model.program_version_id"
              mode="remote"
              :fetcher="q => programService.programVersionCaller({ q,
                cat_type_program: programTypeCatalog.find(e=>e.alias==model.category_alias).id,
                cat_model_modality: !model.program_modality_alias ? null : programModalityCatalog.find(e=>e.alias==model.program_modality_alias).id,
                active:'Y'
              })"
              label-field="abbreviation"
              sublabel-field="version_code"
              value-field="program_version_id"
              :viewOpen="6"
              :model-label="model.program_label"
              placeholder="Buscar programa…"
              :minChars="0"
              :cache="false"
              class="w-100"
              @change="onProgramaChange"
            />
          </div>

          <button
            v-if="model.program_version_id"
            type="button"
            class="btn-exec btn-exec-outline px-0"
            style="height: 38px; width: 38px; flex-shrink: 0;"
            @click="openProgramVersionDetail()"
            title="Ver detalles del programa"
          >
            <i class="fa-solid fa-circle-info" style="color: var(--teal-600, #12274e);"></i>
          </button>

        </div>
      </div>

      <div
        class="col-12 col-lg-3"
        v-if="(isEdit && model.edition_id) || (model.program_modality_selected_alias && model.program_modality_selected_alias!='we_modality_online' && model.category_alias && model.program_version_id && !['we_program_type_membership'].includes(model.category_alias))"
      >
        <label class="exec-label">Edición / Fecha prevista <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.edition_id"
          mode="remote"
          :fetcher="searchEditionsFiltered"
          label-field="start_date_label"
          value-field="edition_num_id"
          :viewOpen="6"
          placeholder="Buscar Edición…"
          :model-label="model.edition_label"
          :minChars="0"
          :cache="false"
          class="exec-select-light w-100"
          @change="onEditionChange"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import SearchSelect from '../../components/SearchSelect.vue'
import DateTime12 from '../../components/DateTime12.vue'

const props = defineProps({
  model: { type: Object, required: true },
  isEdit: { type: Boolean, default: false },
  sellerPhoneOptions: { type: Array, default: () => [] },
  sellerPhoneLocked: { type: Boolean, default: false },
  queryCatalog: { type: Array, default: () => [] },
  programTypeCatalog: { type: Array, default: () => [] },
  programModalityCatalog: { type: Array, default: () => [] },
  programService: { type: Object, default: () => ({ programVersionCaller: () => Promise.resolve([]) }) },
  searchEditionsFiltered: { type: Function, default: () => Promise.resolve([]) }
})

const emit = defineEmits(['program-changed', 'open-program-detail', 'edition-changed', 'program-type-changed'])

function onProgramaTypeChange (...args) {
  emit('program-type-changed', ...args)
}

function onProgramaChange (...args) {
  emit('program-changed', ...args)
}

function onEditionChange (...args) {
  emit('edition-changed', ...args)
}

function openProgramVersionDetail () {
  emit('open-program-detail')
}
</script>
