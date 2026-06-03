<template>
  <!-- Edita en sitio el objeto reactivo `insc` recibido por :model: mutacion de
       dos vias intencional, espejo del god component. Migrar a defineModel en el
       rewrite de la pagina (gated). -->
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="exec-fieldset mb-3">
    <h6 class="fieldset-title">Datos del Cliente / Inscripción</h6>
    <div class="row g-3">
      <div class="col-md-4">
        <label class="exec-label">T. documento <span class="c-red">*</span></label>
        <SearchSelect
            :viewOpen="6" required v-model="insc.cat_type_document" :items="docTypeCatalog" label-field="description" placeholder="T. DOCUMENTO" value-field="alias" class="exec-select-light w-100" />
      </div>
      <div class="col-md-4">
        <label class="exec-label">Documento <span class="c-red">*</span></label>
        <div class="d-flex gap-2">
          <input
            autocomplete="nope" required v-model="insc.document" type="text"
            :placeholder="docConfig.placeholder" class="exec-input-light w-100"
            :maxlength="docConfig.maxLength" @keyup.enter="searchCustomerByDocument"
            v-restrict="{ trim:true, spaces:false, max:docConfig.maxLength, ...(docConfig.isNumeric ? { only: 'numbers' } : {}), transform:'upper' }"
            :disabled="!insc.cat_type_document"
          />
          <button
            type="button"
            class="btn-exec btn-exec-outline px-0"
            style="height:38px;width:38px;flex-shrink:0;"
            :disabled="!insc.cat_type_document || !insc.document || searchingCustomer"
            @click="searchCustomerByDocument"
            title="Buscar cliente en base de datos"
          >
            <i class="fa-solid" :class="searchingCustomer ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'"
              style="color:var(--teal-600,#12274e);"></i>
          </button>
        </div>
        <small v-if="insc.document && insc.document.length !== docConfig.maxLength && docConfig.isNumeric"
              class="text-warning d-block mt-1" style="font-size:.7rem">
          <i class="fa-solid fa-circle-exclamation me-1"></i> Se esperan {{ docConfig.maxLength }} dígitos
        </small>
      </div>
      <div class="col-md-4">
        <label class="exec-label">Correo <span class="c-red">*</span></label>
        <input
          autocomplete="nope" required v-model="insc.email" type="email"
          placeholder="CORREO" class="exec-input-light w-100"
          v-restrict="{ trim:true, spaces:false, transform:'lower', max: 100 }"
          :disabled="!insc.cat_type_document"
          :class="{
'input-valid':   insc.email && isValidEmail(insc.email),
'input-invalid': insc.email && !isValidEmail(insc.email)
}"
        />
        <small
v-if="insc.email && !isValidEmail(insc.email)"
class="text-danger d-block mt-1"
style="font-size:.7rem;font-weight:600"
>
<i class="fa-solid fa-circle-exclamation me-1"></i>
Formato inválido · ej: nombre@dominio.com
</small>
      </div>
      <div class="col-md-4">
        <label class="exec-label">Nombres <span class="c-red">*</span></label>
        <input
          autocomplete="nope" required v-model="insc.full_name" type="text"
          placeholder="NOMBRES" class="exec-input-light w-100"
          v-restrict="{ transform:'upper', trim:true, only:'letters', max: 100 }"
          :disabled="!insc.cat_type_document"
        />
      </div>
      <div class="col-md-4">
        <label class="exec-label">Apellido Paterno <span class="c-red">*</span></label>
        <input
          autocomplete="nope" required v-model="insc.last_name" type="text"
          placeholder="A. PATERNO" class="exec-input-light w-100"
          v-restrict="{ transform:'upper', trim:true, only:'letters', max: 100 }"
          :disabled="!insc.cat_type_document"
        />
      </div>
      <div class="col-md-4">
        <label class="exec-label">Apellido Materno <span class="c-red">*</span></label>
        <input
          autocomplete="nope" required v-model="insc.mother_last_name" type="text"
          placeholder="A. MATERNO" class="exec-input-light w-100"
          v-restrict="{ transform:'upper', trim:true, only:'letters', max: 100 }"
          :disabled="!insc.cat_type_document"
        />
      </div>
      <div class="col-md-4">
        <label class="exec-label">Modalidad del programa <span class="c-red">*</span></label>
        <SearchSelect :viewOpen="6" required v-model="insc.cat_insc_modality" :model-label="form.program_modality_label" :items="inscModalidades" label-field="description" placeholder="M. PROGRAMA" value-field="alias" class="exec-select-light w-100" />
      </div>
      <div class="col-md-4">

  <label class="exec-label">Estado del Certificado <span class="c-red">*</span></label>
  <SearchSelect
    :viewOpen="6"
    required
    v-model="insc.cat_certificate_status"
    :items="certificateStatusCatalog.filter(e=>e.alias !='we_certificate_status_generated')"
    label-field="description"
    placeholder="ESTADO CERTIFICADO"
    value-field="alias"
    class="exec-select-light w-100"
  />
</div>
    </div>
  </div>
</template>

<script setup>
import SearchSelect from '../../components/SearchSelect.vue'

const props = defineProps({
  model: { type: Object, required: true },
  form: { type: Object, default: () => ({}) },
  docTypeCatalog: { type: Array, default: () => [] },
  certificateStatusCatalog: { type: Array, default: () => [] },
  inscModalidades: { type: Array, default: () => [] },
  docConfig: { type: Object, default: () => ({ placeholder: '', maxLength: 0, isNumeric: false }) },
  searchingCustomer: { type: Boolean, default: false }
})

const emit = defineEmits(['search-document'])

const insc = props.model

function isValidEmail (value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''))
}

function searchCustomerByDocument () {
  emit('search-document')
}
</script>
