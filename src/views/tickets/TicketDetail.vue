<template>
  <BaseModal :model-value="Boolean(ticketId)" :title="titulo" size="xl" @update:model-value="$emit('close')">
    <p v-if="cargando && !ticket" class="ds-alert neutro">Cargando el ticket…</p>
    <p v-else-if="error" class="ds-alert">{{ error }}</p>

    <div v-else-if="ticket" class="tk-detalle">
      <!-- Cabecera: de qué se trata y en qué estado está -->
      <header class="tk-cab">
        <div class="tk-cab-titulos">
          <h3 class="tk-asunto">{{ ticket.titulo }}</h3>
          <p class="tk-sub">
            Reportado por <strong>{{ ticket.creadoPor?.nombre || '—' }}</strong>
            el {{ fechaHora(ticket.creadoEn) }}
          </p>
        </div>
        <div class="tk-cab-estado">
          <span class="ds-pill" :class="PRIORIDAD_TONO[ticket.prioridad]">{{ ticket.prioridad }}</span>
          <span class="ds-chip" :class="ESTADO_TONO[ticket.estado]">{{ ESTADO_LABEL[ticket.estado] }}</span>
        </div>
      </header>

      <!-- Relojes del SLA. El veredicto viene del servidor; acá solo se dibuja
           la barra y se anima el contador. -->
      <div class="tk-relojes">
        <div v-for="r in relojes" :key="r.clave" class="tk-reloj">
          <div class="tk-reloj-cab">
            <span class="tk-reloj-label">{{ r.label }}</span>
            <span class="ds-pill" :class="slaTono(r.estado)">{{ slaLabel(r.estado) }}</span>
          </div>
          <div class="ds-track"><i :class="slaTono(r.estado)" :style="{ width: r.progreso + '%' }"></i></div>
          <span class="tk-reloj-pie">{{ r.detalle }}</span>
        </div>
      </div>

      <section class="tk-bloque">
        <h4 class="tk-bloque-titulo">Qué pasó</h4>
        <p class="tk-problema">{{ ticket.problema }}</p>
        <a v-if="linkSeguro" :href="linkSeguro" target="_blank" rel="noopener noreferrer" class="tk-ref">
          <i class="fa-solid fa-link" aria-hidden="true"></i> {{ ticket.link }}
        </a>
      </section>

      <section v-if="adjuntos.length" class="tk-bloque">
        <h4 class="tk-bloque-titulo">Adjuntos</h4>
        <TicketAttachments :adjuntos="adjuntos" kind="ticket" />
      </section>

      <!-- Gestión: solo ADMIN, y mover el estado exige además ser el asignado -->
      <section v-if="ticket.canManage" class="tk-bloque tk-gestion">
        <div class="tk-gestion-quien">
          <span class="tk-bloque-titulo">Atiende</span>
          <strong>{{ ticket.asignadoA?.nombre || 'Sin asignar' }}</strong>
        </div>

        <button
          v-if="siguiente && ticket.canChangeStatus"
          type="button"
          class="btn-exec"
          :disabled="guardando"
          @click="$emit('estado', siguiente.estado)"
        >
          <i class="fa-solid" :class="guardando ? 'fa-spinner fa-spin' : siguiente.icono" aria-hidden="true"></i>
          {{ siguiente.texto }}
        </button>
        <p v-else-if="siguiente" class="tk-hint">
          Solo quien tiene el ticket asignado puede moverlo de estado.
        </p>

        <TicketReassign
          v-if="ticket.estado !== 'CERRADO'"
          :asignado-a-id="ticket.asignadoA?.id ?? null"
          :guardando="guardando"
          @reasignar="$emit('reasignar', $event)"
        />
      </section>

      <TicketComments
        ref="hilo"
        :comentarios="comentarios"
        :enviando="comentando"
        :error="errorComentario"
        @comentar="$emit('comentar', $event)"
      />
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import TicketAttachments from './TicketAttachments.vue'
import TicketComments from './TicketComments.vue'
import TicketReassign from './TicketReassign.vue'
import {
  ESTADO_LABEL, ESTADO_TONO, PRIORIDAD_TONO, SIGUIENTE_ESTADO,
  slaLabel, slaTono, tiempoRestante, progresoSla, fechaHora, hrefSeguro,
} from './ticket-format.js'

const props = defineProps({
  ticketId: { type: Number, default: null },
  ticket: { type: Object, default: null },
  comentarios: { type: Array, default: () => [] },
  adjuntos: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  guardando: { type: Boolean, default: false },
  comentando: { type: Boolean, default: false },
  error: { type: String, default: '' },
  errorComentario: { type: String, default: '' },
})

defineEmits(['close', 'estado', 'reasignar', 'comentar'])

const hilo = ref(null)
const titulo = computed(() => (props.ticket ? `Ticket #${props.ticket.codigo}` : 'Ticket'))
const linkSeguro = computed(() => hrefSeguro(props.ticket?.link))
const siguiente = computed(() => SIGUIENTE_ESTADO[props.ticket?.estado])

// El contador se refresca solo: un plazo que dice "3 min" no puede quedarse
// clavado mientras el ticket está abierto en pantalla. El veredicto NO se
// recalcula acá; ese sigue siendo el que mandó el servidor.
const ahora = ref(Date.now())
const tick = setInterval(() => { ahora.value = Date.now() }, 30_000)
onUnmounted(() => clearInterval(tick))

const relojes = computed(() => {
  const sla = props.ticket?.sla
  if (!sla) return []
  return [
    { clave: 'respuesta', label: 'Primera respuesta', reloj: sla.respuesta },
    { clave: 'resolucion', label: 'Resolución', reloj: sla.resolucion },
  ]
    .filter(r => r.reloj?.venceEn)
    .map(r => ({
      clave: r.clave,
      label: r.label,
      estado: r.reloj.estado,
      progreso: progresoSla(r.reloj, props.ticket.creadoEn, ahora.value),
      detalle: r.reloj.cumplidoEn
        ? `Cumplido el ${fechaHora(r.reloj.cumplidoEn)}`
        : `Vence el ${fechaHora(r.reloj.venceEn)} · ${tiempoRestante(r.reloj.msRestantes)}`,
    }))
})

// El formulario del hilo se limpia cuando el servidor confirmó, que es cuando
// llega un comentario nuevo.
watch(() => props.comentarios.length, (ahora_, antes) => {
  if (antes !== undefined && ahora_ > antes) hilo.value?.reset()
})
</script>

<style scoped>
/* Paneles, chips, pills, barras y colores: sistema de diseño (styles/design-system.css). */
.tk-detalle { display: flex; flex-direction: column; gap: 18px; }

.tk-cab { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px; }
.tk-asunto { margin: 0; font-size: 17px; font-weight: 700; color: var(--ds-heading); }
.tk-sub { margin: 3px 0 0; font-size: 12.5px; color: var(--ds-muted); }
.tk-cab-estado { display: flex; align-items: center; gap: 7px; }

.tk-relojes { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
.tk-reloj { display: flex; flex-direction: column; gap: 5px; padding: 11px 13px; border: 1px solid var(--ds-border); border-radius: 9px; }
.tk-reloj-cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tk-reloj-label { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); }
.tk-reloj-pie { font-size: 11.5px; color: var(--ds-muted); }

.tk-bloque { display: flex; flex-direction: column; gap: 8px; }
.tk-bloque-titulo { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--ds-ink-2); }
.tk-problema { margin: 0; font-size: 13.5px; color: var(--ds-ink); white-space: pre-wrap; word-break: break-word; }
.tk-ref { align-self: flex-start; font-size: 12.5px; color: var(--ds-accent); word-break: break-all; }

.tk-gestion { padding: 13px; border: 1px solid var(--ds-border); border-radius: 9px; background: var(--ds-soft-neutral); }
.tk-gestion-quien { display: flex; align-items: baseline; gap: 8px; font-size: 13px; color: var(--ds-heading); }
.tk-gestion .btn-exec { align-self: flex-start; }
.tk-hint { margin: 0; font-size: 11.5px; color: var(--ds-muted); }
</style>
