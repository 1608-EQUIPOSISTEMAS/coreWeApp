<template>
  <!-- Nota IA del ticket. Quien reporta ve qué dato falta para que lo atiendan
       sin ida y vuelta; quien atiende ve además un borrador de primera respuesta.
       La prioridad NO la pone la IA (sale de criterios-prioridad.md). -->
  <section v-if="visible" class="tk-bloque tk-ia" role="status" aria-live="polite">
    <h4 class="tk-bloque-titulo">
      <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Asistente IA
    </h4>

    <p v-if="generando" class="tk-ia-muted">
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Analizando el ticket (puede tardar hasta un minuto)…
    </p>
    <p v-else-if="data?.estado === 'error' || error" class="tk-ia-muted">La IA no pudo analizar este ticket ahora.</p>

    <template v-else-if="data?.estado === 'listo'">
      <p class="tk-ia-texto">{{ data.resumen }}</p>

      <template v-if="data.falta?.length">
        <p class="tk-ia-sub">{{ canManage ? 'Falta para atenderlo:' : 'Para que te atiendan más rápido, agrega en un comentario:' }}</p>
        <ul class="tk-ia-lista">
          <li v-for="f in data.falta" :key="f">{{ f }}</li>
        </ul>
      </template>

      <div v-if="canManage && data.respuesta_sugerida" class="tk-ia-borrador">
        <p class="tk-ia-sub">Borrador de primera respuesta</p>
        <p class="tk-ia-texto">{{ data.respuesta_sugerida }}</p>
        <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="$emit('usar', data.respuesta_sugerida)">
          Usar como respuesta
        </button>
      </div>
      <p class="tk-ia-muted">Generado el {{ data.generated_at }} · revísalo antes de usarlo.</p>
    </template>
  </section>
</template>

<script setup>
import { computed, inject, onMounted, watch } from 'vue'
import { ServiceKeys } from '@/services'
import { useAiResult } from '@/composables/useAiResult.js'

const props = defineProps({
  ticketId: { type: Number, required: true },
  canManage: { type: Boolean, default: false }
})
defineEmits(['usar'])

const service = inject(ServiceKeys.Tickets)
const { data, error, cargar } = useAiResult(() => service.aiNote(props.ticketId))
onMounted(cargar)
watch(() => props.ticketId, cargar)

// 'apagado' (IA desactivada) y 'sin_nota' (ticket cerrado) no muestran nada.
const visible = computed(() => error.value || ['listo', 'generando', 'error'].includes(data.value?.estado))
const generando = computed(() => data.value?.estado === 'generando')
</script>

<style scoped>
.tk-ia { margin-top: 14px; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--ds-border); background: var(--ds-surface-2); }
.tk-ia .tk-bloque-titulo i { color: var(--ds-accent); margin-right: 4px; }
.tk-ia-texto { margin: 0 0 8px; font-size: 13.5px; line-height: 1.5; color: var(--ds-ink); white-space: pre-wrap; }
.tk-ia-sub { margin: 8px 0 4px; font-size: 12.5px; font-weight: 700; color: var(--ds-heading); }
.tk-ia-lista { margin: 0 0 8px; padding-left: 18px; font-size: 13px; color: var(--ds-ink); }
.tk-ia-borrador { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--ds-border); }
.tk-ia-muted { margin: 6px 0 0; font-size: 12px; color: var(--ds-ink-2); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
</style>
