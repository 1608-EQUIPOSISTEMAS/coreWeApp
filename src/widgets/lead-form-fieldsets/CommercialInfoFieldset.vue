<template>
  <!-- Edita en sitio el objeto reactivo `form` recibido por :model: mutacion de
       dos vias intencional, espejo del god component. Migrar a defineModel en el
       rewrite de la pagina (gated). -->
  <!-- eslint-disable vue/no-mutating-props -->
  <div class="exec-fieldset mb-4">
    <h6 class="fieldset-title"><i class="fa-solid fa-chart-line me-2 text-info"></i> Estado Comercial y Marketing</h6>
    <div class="row g-3">

      <div class="col-md-3">
        <label class="exec-label">F. Pago (prevista)</label>
        <BaseDatePicker v-model="model.pay_date" :config="{}" placeholder="dd/mm/aaaa" />
      </div>

      <div class="col-md-3">
        <label class="exec-label">Nivel de interés <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.nivel_alias"
          :items="leadInterestCatalog"
          required
          label-field="description"
          value-field="alias"
          :model-label="model.nivel_label"
          placeholder="NIVEL..."
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-md-6">
        <label class="exec-label">Mensaje de chat <span class="c-red">*</span></label>
        <textarea
          v-model="model.mensajeChat"
          class="exec-textarea w-100"
          placeholder="MENSAJE CHAT"
          v-restrict="{ trim: true, max: 500 }"
          required
          rows="2"
          @input="handleMensajeChatInput"
        ></textarea>
      </div>

      <div class="col-md-3">
        <label class="exec-label">Canal prospección <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.canal_alias"
          :items="socialMediaCatalog.filter(e=> !['we_social_media_whatsapp','we_social_media_msg','we_social_media_comment'].includes(e.alias))"
          required
          label-field="description"
          value-field="alias"
          :viewOpen="6"
          :model-label="model.canal_label"
          class="exec-select-light w-100"
          @change="onChannelChange"
          placeholder="CANAL..."
        />
      </div>

      <div class="col-md-3">
        <label class="exec-label">Medio de llegada <span class="c-red">*</span></label>
        <SearchSelect
          v-model="model.medium_alias"
          :items="filteredMediumCatalog"
          required
          label-field="description"
          :viewOpen="6"
          :model-label="model.medium_label"
          value-field="alias"
          placeholder="MEDIO..."
          class="exec-select-light w-100"
          :disabled="isMedioDisabled"
        />
      </div>

      <div class="col-md-3">
        <label class="exec-label">Palabra MKT <span class="c-red">*</span></label>

        <SearchSelect
          v-model="model.key_word_alias"
          :items="mktWordsCatalog"
          :viewOpen="6"
          :model-label="model.key_word_label"
          label-field="description"
          value-field="alias"
          placeholder="MKT..."
          class="exec-select-light w-100"
        />
      </div>

      <div class="col-md-3">
        <label class="exec-label">Estrategia</label>
        <SearchSelect
          :viewOpen="6"
          v-model="model.strategy_alias"
          :disabled="!model.canal_alias || model.canal_alias!='we_social_media_other'"
          :items="strategyCatalog"
          label-field="description"
          value-field="alias"
          class="exec-select-light w-100"
          @change="onStrategyChange"
          placeholder="ESTRATEGIA..."
        />
      </div>

      <div class="col-md-12">
        <label class="exec-label">Observaciones</label>
        <textarea
          v-model="model.observacion"
          class="exec-textarea w-100"
          rows="2"
          v-restrict="{ trim: true, max: 500 }"
        ></textarea>
      </div>

    </div>
  </div>
</template>

<script setup>
import SearchSelect from '../../components/SearchSelect.vue'
import BaseDatePicker from '../../components/BaseDatePicker.vue'

const props = defineProps({
  model: { type: Object, required: true },
  leadInterestCatalog: { type: Array, default: () => [] },
  socialMediaCatalog: { type: Array, default: () => [] },
  filteredMediumCatalog: { type: Array, default: () => [] },
  mktWordsCatalog: { type: Array, default: () => [] },
  strategyCatalog: { type: Array, default: () => [] },
  isMedioDisabled: { type: Boolean, default: false }
})

const emit = defineEmits(['channel-changed', 'strategy-changed', 'chat-message-input'])

function onChannelChange (...args) {
  emit('channel-changed', ...args)
}

function onStrategyChange (...args) {
  emit('strategy-changed', ...args)
}

function handleMensajeChatInput (...args) {
  emit('chat-message-input', ...args)
}
</script>
