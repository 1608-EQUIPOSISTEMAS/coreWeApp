<template>
  <div class="ds-page tkd-page">
    <p v-if="cargando && !ticket" class="ds-alert neutro">Cargando el ticket…</p>
    <p v-else-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="ticket">
      <!-- Cabecera ejecutiva: ancho completo, con el volver, el código/asunto
           y el estado alineados en una sola franja. Todo lo demás vive en
           tarjetas propias más abajo, no suelto sobre el fondo de la página. -->
      <header class="tkd-masthead">
        <RouterLink class="tkd-volver" to="/tickets">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Tickets
        </RouterLink>
        <div class="tkd-masthead-fila">
          <div class="tkd-masthead-titulos">
            <h1 class="tkd-codigo">Ticket #{{ ticket.codigo }}</h1>
            <p class="tkd-asunto">{{ ticket.titulo }}</p>
          </div>
          <div class="tkd-masthead-estado">
            <span class="ds-pill" :class="PRIORIDAD_TONO[ticket.prioridad]">{{ ticket.prioridad }}</span>
            <span class="ds-chip" :class="ESTADO_TONO[ticket.estado]">{{ ESTADO_LABEL[ticket.estado] }}</span>
          </div>
        </div>
      </header>

      <div class="tkd-split">
        <section class="ds-panel tkd-main">
          <div class="ds-panel-body tkd-main-body">
            <section class="tk-bloque">
              <h4 class="tk-bloque-titulo">Qué pasó</h4>
              <p class="tk-problema">{{ ticket.problema }}</p>
              <a v-if="linkSeguro" :href="linkSeguro" target="_blank" rel="noopener noreferrer" class="tk-ref">
                <i class="fa-solid fa-link" aria-hidden="true"></i> {{ ticket.link }}
              </a>
              <TicketAttachments v-if="adjuntos.length" :adjuntos="adjuntos" kind="ticket" />
            </section>

            <div class="tkd-divisor"></div>

            <TicketComments
              ref="hilo"
              :comentarios="comentarios"
              :enviando="comentando"
              :error="errorComentario"
              @comentar="comentar"
            />
          </div>
        </section>

        <aside class="ds-panel tkd-side">
          <div class="ds-panel-body tk-side">
            <div class="tk-side-bloque">
              <span class="tk-bloque-titulo">Reportó</span>
              <span class="tk-persona">{{ ticket.creadoPor?.nombre || '—' }}</span>
              <span class="tk-side-fecha">{{ fechaHora(ticket.creadoEn) }}</span>
            </div>

            <template v-if="ticket.canManage">
              <div class="tk-side-divisor"></div>
              <div class="tk-side-bloque">
                <span class="tk-bloque-titulo">Atiende</span>
                <span class="tk-persona">{{ ticket.asignadoA?.nombre || 'Sin asignar' }}</span>

                <button
                  v-if="siguiente && ticket.canChangeStatus"
                  type="button"
                  class="btn-exec tk-side-btn"
                  :class="{ 'btn-exec-outline': ticket.estado === 'CERRADO' }"
                  :disabled="guardando"
                  @click="cambiarEstado(siguiente.estado)"
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
                  @reasignar="reasignar"
                />
              </div>
            </template>

            <div class="tk-side-divisor"></div>
            <div class="tk-side-bloque">
              <span class="tk-bloque-titulo">Tiempos SLA</span>
              <div v-for="r in relojes" :key="r.clave" class="tk-reloj">
                <div class="tk-reloj-cab">
                  <span class="tk-reloj-label">{{ r.label }}</span>
                  <span class="ds-pill" :class="slaTono(r.estado)">{{ slaLabel(r.estado) }}</span>
                </div>
                <div class="ds-track"><i :class="slaTono(r.estado)" :style="{ width: r.progreso + '%' }"></i></div>
                <span class="tk-reloj-pie">{{ r.detalle }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import TicketAttachments from './TicketAttachments.vue'
import TicketComments from './TicketComments.vue'
import TicketReassign from './TicketReassign.vue'
import {
  ESTADO_LABEL, ESTADO_TONO, PRIORIDAD_TONO, SIGUIENTE_ESTADO,
  slaLabel, slaTono, tiempoRestante, progresoSla, fechaHora, hrefSeguro,
} from './ticket-format.js'

const service = inject(ServiceKeys.Tickets)
const route = useRoute()
const toast = useToast()

const ticket = ref(null)
const comentarios = ref([])
const cargando = ref(false)
const guardando = ref(false)
const comentando = ref(false)
const error = ref('')
const errorComentario = ref('')

const adjuntos = computed(() => (Array.isArray(ticket.value?.adjuntos) ? ticket.value.adjuntos : []))
const linkSeguro = computed(() => hrefSeguro(ticket.value?.link))
const siguiente = computed(() => SIGUIENTE_ESTADO[ticket.value?.estado])

const hilo = ref(null)
const ahora = ref(Date.now())
const tick = setInterval(() => { ahora.value = Date.now() }, 30_000)
onUnmounted(() => clearInterval(tick))

const relojes = computed(() => {
  const sla = ticket.value?.sla
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
      progreso: progresoSla(r.reloj, ticket.value.creadoEn, ahora.value),
      detalle: r.reloj.cumplidoEn
        ? `Cumplido el ${fechaHora(r.reloj.cumplidoEn)}`
        : `Vence el ${fechaHora(r.reloj.venceEn)} · ${tiempoRestante(r.reloj.msRestantes)}`,
    }))
})

watch(() => comentarios.value.length, (ahora_, antes) => {
  if (antes !== undefined && ahora_ > antes) hilo.value?.reset()
})

async function cargar () {
  const id = Number(route.params.id)
  ticket.value = null
  comentarios.value = []
  error.value = ''
  cargando.value = true
  try {
    const [t, c] = await Promise.all([service.detail(id), service.comments(id)])
    ticket.value = t
    comentarios.value = c
  } catch (e) {
    console.error('tickets.detail:', e)
    error.value = e?.response?.data?.message || 'No se pudo abrir el ticket.'
  } finally {
    cargando.value = false
  }
}

// Navegar de un ticket a otro (ej. desde un enlace) recarga en el sitio, no
// remonta el componente: el router reutiliza la vista porque el path base
// no cambia.
watch(() => route.params.id, cargar)
onMounted(cargar)

async function cambiarEstado (estado) {
  guardando.value = true
  try {
    ticket.value = await service.changeStatus(ticket.value.id, estado)
    toast.success(estado === 'CERRADO' ? 'Ticket marcado como resuelto' : 'Ticket tomado')
  } catch (e) {
    console.error('tickets.status:', e)
    toast.error(e?.response?.data?.message || 'No se pudo cambiar el estado.')
  } finally {
    guardando.value = false
  }
}

async function reasignar (nuevoAsignadoId) {
  guardando.value = true
  try {
    ticket.value = await service.reassign(ticket.value.id, nuevoAsignadoId)
    toast.success(`Ticket reasignado a ${ticket.value.asignadoA?.nombre ?? 'otro agente'}`)
  } catch (e) {
    console.error('tickets.reassign:', e)
    toast.error(e?.response?.data?.message || 'No se pudo reasignar el ticket.')
  } finally {
    guardando.value = false
  }
}

async function comentar ({ cuerpo, archivos }) {
  comentando.value = true
  errorComentario.value = ''
  try {
    comentarios.value = await service.addComment(ticket.value.id, cuerpo, archivos)
  } catch (e) {
    console.error('tickets.comment:', e)
    errorComentario.value = e?.response?.data?.message || 'No se pudo enviar el comentario.'
  } finally {
    comentando.value = false
  }
}
</script>

<style scoped>
/* Página, paneles, chips, pills, barras y colores: sistema de diseño
   (styles/design-system.css). Acá solo la cabecera ejecutiva y el split de
   dos columnas anchas, pensados para pantalla completa (esto ya no es un
   modal): todo el contenido vive dentro de tarjetas con borde propio, nunca
   suelto sobre el fondo de la página. */
.tkd-page { gap: 16px; }

.tkd-volver {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 600; color: var(--ds-muted);
  text-decoration: none;
}
.tkd-volver:hover { color: var(--ds-accent); }

.tkd-masthead {
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 20px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
  background: var(--ds-surface);
}
.tkd-masthead-fila { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
.tkd-masthead-titulos { min-width: 0; }
.tkd-codigo { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.01em; color: var(--ds-heading); }
.tkd-asunto { margin: 4px 0 0; font-size: 14.5px; font-weight: 600; color: var(--ds-ink-2); }
.tkd-masthead-estado { display: flex; align-items: center; gap: 7px; flex-shrink: 0; margin-top: 2px; }

/* Sidebar más ancha que en el modal original (320 vs 240): con todo el ancho
   de una página propia, un panel angosto se veía como una columna perdida. */
.tkd-split { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
@media (max-width: 860px) { .tkd-split { grid-template-columns: 1fr; } }

.tkd-main-body { display: flex; flex-direction: column; gap: 18px; }
.tkd-divisor { height: 1px; background: var(--ds-border); }

.tk-side { display: flex; flex-direction: column; gap: 14px; }
.tk-side-bloque { display: flex; flex-direction: column; gap: 5px; }
.tk-side-divisor { height: 1px; background: var(--ds-border); }
.tk-persona { font-size: 13px; font-weight: 600; color: var(--ds-ink); }
.tk-side-fecha { font-size: 11.5px; color: var(--ds-muted); }
.tk-side-btn { align-self: flex-start; margin-top: 2px; }

.tk-reloj { display: flex; flex-direction: column; gap: 5px; }
.tk-reloj-cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tk-reloj-label { font-size: 12px; font-weight: 600; color: var(--ds-heading); }
.tk-reloj-pie { font-size: 11px; color: var(--ds-muted); }
.tk-side-bloque .tk-reloj + .tk-reloj { margin-top: 10px; }

.tk-bloque { display: flex; flex-direction: column; gap: 8px; }
.tk-bloque-titulo { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--ds-ink-2); }
.tk-problema { margin: 0; font-size: 13.5px; color: var(--ds-ink); white-space: pre-wrap; word-break: break-word; }
.tk-ref { align-self: flex-start; font-size: 12.5px; color: var(--ds-accent); word-break: break-all; }

.tk-hint { margin: 0; font-size: 11.5px; color: var(--ds-muted); }
</style>
