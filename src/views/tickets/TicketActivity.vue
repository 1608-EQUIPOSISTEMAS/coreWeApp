<template>
  <section class="tk-act">
    <p v-if="cargando && !eventos.length" class="tk-act-estado">Cargando la actividad…</p>
    <p v-else-if="error" class="ds-alert">{{ error }}</p>

    <div v-else-if="!eventos.length" class="tk-vacio">
      <span class="tk-vacio-icono"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i></span>
      <p class="tk-vacio-titulo">Sin actividad registrada</p>
    </div>

    <ol v-else class="tk-act-lista">
      <li v-for="e in filas" :key="e.id" class="tk-act-item">
        <span class="tk-act-icono" :class="'tk-act-' + e.tono">
          <i class="fa-solid" :class="e.icono" aria-hidden="true"></i>
        </span>
        <div class="tk-act-cuerpo">
          <p class="tk-act-texto">
            <strong>{{ e.quien }}</strong> {{ e.accion }}
            <template v-if="e.destino"> <strong>{{ e.destino }}</strong></template>
          </p>
          <p v-if="e.cita" class="tk-act-cita">“{{ e.cita }}”</p>
          <span class="tk-act-fecha">{{ fechaHora(e.fecha) }}</span>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { fechaHora } from './ticket-format.js'

const props = defineProps({
  eventos: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const SISTEMA = 'Sistema'
const RELOJ = { respuesta: 'primera respuesta', resolucion: 'resolución' }

// Cómo se lee cada tipo de evento. Todos salen de datos que el ERP ya guarda
// (marcas del ticket y comentarios): el backend no lleva una bitácora aparte.
const FORMATO = {
  CREADO: e => ({ icono: 'fa-plus', tono: 'info', quien: e.actor ?? SISTEMA, accion: 'creó el ticket' }),
  ASIGNADO: e => ({ icono: 'fa-user-check', tono: 'neutral', quien: 'Ticket', accion: 'asignado a', destino: e.aUsuario }),
  TOMADO: e => ({ icono: 'fa-hand', tono: 'info', quien: e.actor ?? 'El agente', accion: 'tomó el ticket' }),
  RESUELTO: e => ({ icono: 'fa-circle-check', tono: 'ok', quien: e.actor ?? 'El agente', accion: 'marcó el ticket como resuelto' }),
  ESCALADO: e => ({
    icono: 'fa-arrow-up-right-dots', tono: 'warn', quien: SISTEMA,
    accion: e.deUsuario ? `escaló el ticket por SLA (lo tenía ${e.deUsuario})` : 'escaló el ticket por SLA',
    destino: e.aUsuario ? `→ ${e.aUsuario}` : null,
  }),
  ALERTA_SLA: e => ({
    icono: 'fa-triangle-exclamation', tono: 'bad', quien: SISTEMA,
    accion: `avisó que venció el plazo de ${RELOJ[e.detalle] ?? 'SLA'}`,
  }),
  COMENTARIO: e => ({ icono: 'fa-comment', tono: 'neutral', quien: e.actor ?? SISTEMA, accion: 'comentó', cita: e.detalle }),
}

const filas = computed(() => props.eventos.map(e => ({
  ...e,
  ...(FORMATO[e.tipo]?.(e) ?? { icono: 'fa-circle', tono: 'neutral', quien: e.actor ?? SISTEMA, accion: e.tipo }),
})))
</script>

<style scoped>
/* Vacíos y colores: sistema de diseño (styles/design-system.css). */
.tk-act { display: flex; flex-direction: column; gap: 12px; }
.tk-act-estado { margin: 0; font-size: 12.5px; color: var(--ds-muted); }

.tk-vacio { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 34px 16px; text-align: center; }
.tk-vacio-icono {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 999px;
  background: var(--ds-soft-neutral); color: var(--ds-muted); font-size: 13px;
}
.tk-vacio-titulo { margin: 4px 0 0; font-size: 13.5px; font-weight: 700; color: var(--ds-heading); }

/* Línea vertical que une los íconos: se dibuja en cada item salvo el último. */
.tk-act-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.tk-act-item { position: relative; display: flex; gap: 12px; padding-bottom: 16px; }
.tk-act-item:not(:last-child)::before {
  content: ''; position: absolute; left: 13px; top: 28px; bottom: 0;
  width: 2px; background: var(--ds-border);
}
.tk-act-icono {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 28px; height: 28px; border-radius: 999px; font-size: 12px;
}
.tk-act-info { background: var(--ds-soft-info); color: var(--ds-info-ink); }
.tk-act-ok { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.tk-act-warn { background: var(--ds-soft-warn); color: var(--ds-warn-ink); }
.tk-act-bad { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.tk-act-neutral { background: var(--ds-soft-neutral); color: var(--ds-ink-2); }

.tk-act-cuerpo { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding-top: 4px; }
.tk-act-texto { margin: 0; font-size: 13px; color: var(--ds-ink); }
.tk-act-texto strong { color: var(--ds-heading); font-weight: 700; }
.tk-act-cita {
  margin: 2px 0 0; padding-left: 9px; border-left: 2px solid var(--ds-border);
  font-size: 12.5px; color: var(--ds-ink-2); white-space: pre-wrap; word-break: break-word;
}
.tk-act-fecha { font-size: 11.5px; color: var(--ds-muted); }
</style>
