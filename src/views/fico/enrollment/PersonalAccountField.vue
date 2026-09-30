<template>
  <div class="eaf">
    <label class="eaf-label">Cuenta personal (Claude / ChatGPT)</label>
    <select :value="modelValue.provider || ''" class="eaf-select" @change="setProvider($event.target.value || null)">
      <option value="">Sin cuenta personal</option>
      <option v-for="p in PERSONAL_ACCOUNT_OPTIONS" :key="p" :value="p">CUENTA {{ p }}</option>
    </select>
    <small class="eaf-hint">No se copia del origen: márcala solo si el alumno pagó la cuenta para este destino.</small>
    <PersonalAccountModules
      v-if="modelValue.provider && modules.length"
      :model-value="modelValue.modules"
      :modules="modules"
      class="eaf-modules"
      @update:model-value="ids => emit('update:modelValue', { ...modelValue, modules: ids })"
    />
  </div>
</template>

<script setup>
// Etiqueta CUENTA PERSONAL del destino de un RP/CC. v-model: { provider, modules }.
// Si el destino es un paquete, FICO marca en que modulos va (arrancan todos).
import { ref, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import PersonalAccountModules from '@/features/personal-account/PersonalAccountModules.vue'
import { PERSONAL_ACCOUNT_OPTIONS } from '@/features/personal-account/personalAccount.js'

const props = defineProps({
  programVersionId: { type: Number, default: null },
  modelValue: { type: Object, required: true }
})
const emit = defineEmits(['update:modelValue'])
const ficoService = inject(ServiceKeys.Fico)
const modules = ref([])

// modules: null = el destino no es paquete (curso suelto); [] = paquete sin
// ningun modulo marcado, que el formulario no deja confirmar.
function setProvider (provider) {
  const ids = modules.value.map(m => m.child_program_version_id)
  emit('update:modelValue', { provider, modules: provider && ids.length ? ids : null })
}

watch(() => props.programVersionId, async pvId => {
  try {
    modules.value = pvId ? (await ficoService.getProgramChildren(pvId)) || [] : []
  } catch (err) {
    // Sin la lista la etiqueta cae a "todos los modulos": se ve y se corrige.
    console.error('[PersonalAccountField] modulos del programa:', err)
    modules.value = []
  }
  emit('update:modelValue', { provider: null, modules: null })
}, { immediate: true })
</script>

<style scoped>
.eaf { display: flex; flex-direction: column; gap: 6px; }
.eaf-label { font-size: 11px; font-weight: 500; color: var(--ds-muted); text-transform: uppercase; letter-spacing: .05em; }
.eaf-select { border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control); padding: 8px 10px; font-size: 13px; background: var(--ds-surface); color: var(--ds-ink); }
.eaf-hint { font-size: 11px; color: var(--ds-muted); }
.eaf-modules { margin-top: 4px; }
</style>
