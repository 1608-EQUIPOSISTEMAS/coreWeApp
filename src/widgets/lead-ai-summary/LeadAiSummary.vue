<template>
  <!-- Resumen IA del historial de contacto. Sirve al asesor para retomar la
       conversación y al líder para revisar el lead sin leer intento por intento.
       Se genera en segundo plano y se guarda; solo se rehace si hay intentos nuevos. -->
  <div v-if="visible" class="lead-ai" role="status" aria-live="polite">
    <div class="lead-ai-head">
      <span class="lead-ai-title">
        <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Resumen IA del seguimiento
      </span>
      <button v-if="!generando" type="button" class="btn-exec btn-exec-outline btn-exec-sm" @click="cargar">
        <i class="fa-solid fa-rotate" aria-hidden="true"></i> Actualizar
      </button>
    </div>

    <p v-if="error" class="lead-ai-muted">{{ error }}</p>
    <template v-else-if="contenido">
      <p class="lead-ai-text" :class="{ viejo: generando }">{{ contenido.resumen }}</p>
      <p class="lead-ai-next" :class="{ viejo: generando }">
        <b>Siguiente paso:</b> {{ contenido.siguiente_paso }}
      </p>
    </template>

    <p v-if="generando" class="lead-ai-muted">
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
      {{ contenido ? 'Actualizando con los intentos nuevos…' : 'Generando el resumen (puede tardar hasta un minuto)…' }}
      <template v-if="data.en_fila > 1"> {{ data.en_fila - 1 }} en fila antes.</template>
    </p>
    <p v-else-if="data?.estado === 'error'" class="lead-ai-muted">La IA no pudo resumir este lead ahora. Intenta en unos minutos.</p>
    <p v-else-if="data?.generated_at" class="lead-ai-muted">Generado el {{ data.generated_at }} · revísalo antes de usarlo.</p>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, watch } from 'vue'
import { ServiceKeys } from '@/services'
import { useAiResult } from '@/composables/useAiResult.js'

// version: cuántos intentos guardados tiene el lead. Si cambia (se guardó uno
// nuevo) se vuelve a pedir el resumen.
const props = defineProps({
  leadId: { type: [Number, String], required: true },
  version: { type: Number, default: 0 }
})
const comercialService = inject(ServiceKeys.Comercial)
const { data, error, cargar } = useAiResult(() => comercialService.leadSummary(Number(props.leadId)))

onMounted(cargar)
watch(() => [props.leadId, props.version], cargar)

// 'apagado' (IA desactivada) y 'sin_intentos' no muestran nada: no hay qué resumir.
const visible = computed(() => error.value || ['listo', 'generando', 'error'].includes(data.value?.estado))
const generando = computed(() => data.value?.estado === 'generando')
const contenido = computed(() => (data.value?.estado === 'listo' ? data.value : data.value?.anterior) || null)
</script>

<style scoped>
.lead-ai { margin-bottom: 16px; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--ds-border); background: var(--ds-surface-2); }
.lead-ai-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.lead-ai-title { font-weight: 700; font-size: 13px; color: var(--ds-heading); }
.lead-ai-title i { color: var(--ds-accent); margin-right: 4px; }
.lead-ai-text, .lead-ai-next { margin: 0 0 6px; font-size: 13.5px; line-height: 1.5; color: var(--ds-ink); }
.viejo { opacity: .6; }
.lead-ai-muted { margin: 0; font-size: 12px; color: var(--ds-ink-2); }
</style>
