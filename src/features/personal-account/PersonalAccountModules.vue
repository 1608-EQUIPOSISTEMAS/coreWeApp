<template>
  <fieldset class="pam">
    <legend class="pam-legend">Módulos con cuenta <span class="pam-req">*</span></legend>
    <label v-for="m in modules" :key="m.child_program_version_id" class="pam-option">
      <input
        type="checkbox"
        :value="m.child_program_version_id"
        :checked="modelValue.includes(m.child_program_version_id)"
        @change="toggle(m.child_program_version_id, $event.target.checked)"
      />
      <span>{{ m.sort_order ? `${m.sort_order}. ` : '' }}{{ m.child_name }}</span>
    </label>
    <small v-if="!modelValue.length" class="pam-hint">Marca al menos un módulo: Académica entrega una cuenta por cada uno.</small>
  </fieldset>
</template>

<script setup>
// modules: respuesta de /fico/programchildren ({ child_program_version_id, child_name, sort_order }).
const props = defineProps({
  modules: { type: Array, required: true },
  modelValue: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

function toggle (pvId, checked) {
  const rest = props.modelValue.filter(id => id !== pvId)
  emit('update:modelValue', checked ? [...rest, pvId] : rest)
}
</script>

<style scoped>
.pam { border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); padding: 8px 10px; margin: 0; }
.pam-legend { font-size: 11px; font-weight: 600; color: var(--ds-muted); text-transform: uppercase; letter-spacing: .04em; padding: 0 4px; width: auto; margin: 0; }
.pam-req { color: var(--ds-bad); }
.pam-option { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ds-ink); padding: 3px 0; cursor: pointer; }
.pam-option input { accent-color: var(--ds-brand); }
.pam-hint { display: block; font-size: 11px; color: var(--ds-bad-ink); margin-top: 4px; }
</style>
