<template>
  <!-- Edita en sitio el objeto reactivo `form` recibido por :model: mutacion de
       dos vias intencional, espejo del god component. Migrar a defineModel en el
       rewrite de la pagina (gated). -->
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="exec-fieldset mb-4">
    <h6 class="fieldset-title"><i class="fa-solid fa-user me-2 text-success"></i> Datos del Contacto</h6>
    <div class="row g-3">

      <div class="col-6 col-md-3 col-lg-2">
        <label class="exec-label">T. Contacto <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.client_status"
          :items="clientCatalog"
          label-field="description"
          value-field="alias"
          placeholder="TIPO..."
          required
          disabled
          :model-label="model.client_status_label"
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-6 col-md-6 col-lg-3">
        <label class="exec-label">Nombre / Razón Social <span class="c-red">*</span></label>
        <input
          required
          autocomplete="nope"
          v-model="model.full_name"
          type="text"
          class="exec-input-light w-100"
          placeholder="NOMBRE COMPLETO"
          v-restrict="{ transform: 'upper', trim: true, max: 150}"
        />
      </div>
      <div class="col-6 col-md-3 col-lg-3">
        <label class="exec-label">Teléfono <span class="c-red">*</span></label>
        <div class="d-flex gap-2">
          <input
            autocomplete="nope"
            v-model="model.telefono"
            type="text"
            v-restrict="{ only: 'numbers', max: maxPhoneLength, spaces: false, trim: true }"
            required
            class="exec-input-light w-100"
            :class="{ 'input-valid': leadDataHistory && !searchingPhone }"
            placeholder="TELÉFONO + ENTER"
            @keyup.enter="searchLeadByPhone"
            :disabled="searchingPhone || !model.country_alias"
          />
          <button
            type="button"
            class="btn-exec btn-exec-outline px-0"
            style="height: 38px; width: 38px; flex-shrink: 0;"
            @click="openPhoneDetail()"
            title="Ver historial del cliente"
          >
            <i class="fa-solid fa-clock-rotate-left" style="color: var(--teal-600, #12274e);"></i>
          </button>
        </div>
      </div>

      <div class="col-6 col-md-3 col-lg-2">
        <label class="exec-label">E. Cliente</label>
        <SearchSelect
          v-model="model.cat_client_moment_alias"
          :items="momentCatalog"
          label-field="description"
          value-field="alias"
          placeholder="E. Cliente..."
          required
          :model-label="model.cat_client_moment_label"
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-6 col-md-3 col-lg-2">
        <label class="exec-label">Membresía</label>
        <SearchSelect
          v-model="model.membership_moment_id"
          :items="membershipList"
          :viewOpen="6"
          label-field="tier_name"
          value-field="membership_tier_id"
          placeholder="MEMBRESÍA..."
          :model-label="model.membership_tier_label"
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-6 col-md-3 col-lg-2">
        <label class="exec-label">Status <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.status_alias"
          :items="leadStatusCatalog"
          :class="['exec-select-light w-100', { 'select--danger': isDeleteStatus }]"
          :viewOpen="6"
          label-field="description"
          value-field="alias"
          placeholder="STATUS..."
          required
          :model-label="model.status_label"
          @change="onStatusChange"
        />
      </div>

      <div class="col-6 col-md-3">
        <label class="exec-label">Ocupación / Situación </label>
        <SearchSelect
          v-model="model.ocupacion_alias"
          :items="prospectSituationCatalog"
          :viewOpen="6"
          label-field="description"
          value-field="alias"
          :model-label="model.ocupacion_label"
          placeholder="OCUPACIÓN..."
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-6 col-md-3">
        <label class="exec-label">País <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.country_alias"
          :items="countryCatalog"
          :viewOpen="6"
          label-field="description"
          value-field="alias"
          required
          placeholder="PAÍS..."
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
  isEdit: { type: Boolean, default: false },
  isDeleteStatus: { type: Boolean, default: false },
  maxPhoneLength: { type: Number, default: 9 },
  searchingPhone: { type: Boolean, default: false },
  leadDataHistory: { type: Object, default: null },
  clientCatalog: { type: Array, default: () => [] },
  momentCatalog: { type: Array, default: () => [] },
  membershipList: { type: Array, default: () => [] },
  leadStatusCatalog: { type: Array, default: () => [] },
  prospectSituationCatalog: { type: Array, default: () => [] },
  countryCatalog: { type: Array, default: () => [] }
})

const emit = defineEmits(['open-client-history', 'search-phone', 'status-changed'])

function openPhoneDetail () {
  emit('open-client-history')
}

function searchLeadByPhone (...args) {
  emit('search-phone', ...args)
}

function onStatusChange (...args) {
  emit('status-changed', ...args)
}
</script>
