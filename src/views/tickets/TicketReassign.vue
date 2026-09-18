<template>
  <div class="tk-reasignar">
    <label class="tk-label" for="tk-destino">Reasignar a</label>
    <div class="tk-reasignar-fila">
      <select id="tk-destino" v-model="destino" class="tk-select" :disabled="cargando || guardando">
        <option :value="null">Elegir agente…</option>
        <option v-for="a in candidatos" :key="a.id" :value="a.id" :disabled="a.id === asignadoAId">
          {{ a.nombre }}{{ a.id === asignadoAId ? ' (actual)' : '' }}
        </option>
      </select>
      <button
        type="button"
        class="btn-exec btn-exec-outline btn-sm"
        :disabled="!destino || destino === asignadoAId || guardando"
        @click="$emit('reasignar', destino)"
      >
        <i class="fa-solid" :class="guardando ? 'fa-spinner fa-spin' : 'fa-right-left'" aria-hidden="true"></i>
        Reasignar
      </button>
    </div>
    <small class="tk-hint">
      Solo se puede reasignar a un agente que no tenga tickets activos.
    </small>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { ServiceKeys } from '@/services'

// El servidor vuelve a validar el destino (activo, agente y sin carga): esta
// lista solo evita ofrecer lo que ya se sabe que va a fallar.
defineProps({
  asignadoAId: { type: Number, default: null },
  guardando: { type: Boolean, default: false },
})

defineEmits(['reasignar'])

const service = inject(ServiceKeys.Tickets)

const candidatos = ref([])
const destino = ref(null)
const cargando = ref(false)

onMounted(async () => {
  cargando.value = true
  try {
    candidatos.value = await service.assignees()
  } catch (e) {
    console.error('tickets.assignees:', e)
  } finally {
    cargando.value = false
  }
})
</script>

<style scoped>
/* Botones y colores: sistema de diseño (styles/design-system.css). */
.tk-reasignar { display: flex; flex-direction: column; gap: 5px; }
.tk-label { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); }
.tk-reasignar-fila { display: flex; flex-wrap: wrap; gap: 7px; }
.tk-select {
  flex: 1; min-width: 160px; height: 32px; padding: 0 8px;
  border: 1px solid var(--ds-border); border-radius: 7px;
  background: var(--ds-surface); color: var(--ds-ink); font-size: 13px;
}
.tk-select:focus { outline: 2px solid var(--ds-accent); outline-offset: -1px; }
.tk-hint { font-size: 11.5px; color: var(--ds-muted); }
</style>
