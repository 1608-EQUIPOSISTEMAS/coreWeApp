<template>
  <div class="ds-page tkd-page">
    <p v-if="cargando && !ticket" class="ds-alert neutro">Cargando el ticket…</p>
    <p v-else-if="error" class="ds-alert">{{ error }}</p>

    <template v-else-if="ticket">
      <nav class="tkd-crumbs" aria-label="breadcrumb">
        <RouterLink to="/tickets">Tickets</RouterLink>
        <span class="tkd-crumbs-sep">/</span>
        <span class="tkd-crumbs-actual">#{{ ticket.codigo }}</span>
      </nav>

      <!-- Cabecera ejecutiva: etiquetas + acciones arriba, asunto grande debajo
           y la línea de quién reportó / atiende al final. Todo lo demás vive en
           tarjetas propias más abajo, no suelto sobre el fondo de la página. -->
      <header class="ds-panel tkd-masthead">
        <div class="ds-panel-body tkd-masthead-body">
          <div class="tkd-masthead-top">
            <div class="tkd-masthead-tags">
              <span class="tkd-eyebrow">TICKET #{{ ticket.codigo }}</span>
              <span class="ds-pill" :class="PRIORIDAD_TONO[ticket.prioridad]">{{ ticket.prioridad }}</span>
              <span class="ds-chip" :class="ESTADO_TONO[ticket.estado]">{{ ESTADO_LABEL[ticket.estado] }}</span>
            </div>

            <div v-if="ticket.canManage" class="tkd-masthead-acciones">
              <button
                v-if="siguiente && ticket.canChangeStatus"
                type="button"
                class="btn-exec"
                :class="{ 'btn-exec-outline': ticket.estado === 'CERRADO' }"
                :disabled="guardando"
                @click="cambiarEstado(siguiente.estado)"
              >
                <i class="fa-solid" :class="guardando ? 'fa-spinner fa-spin' : siguiente.icono" aria-hidden="true"></i>
                {{ siguiente.texto }}
              </button>
              <button
                v-if="ticket.estado !== 'CERRADO'"
                type="button"
                class="btn-exec btn-exec-outline"
                @click="irAReasignar"
              >
                <i class="fa-solid fa-right-left" aria-hidden="true"></i> Reasignar
              </button>
            </div>
          </div>

          <h1 class="tkd-asunto">{{ ticket.titulo }}</h1>

          <p class="tkd-meta">
            Reportó <strong>{{ ticket.creadoPor?.nombre || '—' }}</strong>
            <span class="tkd-meta-sep">·</span>
            Abierto el {{ fechaHora(ticket.creadoEn) }}
            <template v-if="ticket.canManage">
              <span class="tkd-meta-sep">·</span>
              Atiende <strong>{{ ticket.asignadoA?.nombre || 'Sin asignar' }}</strong>
            </template>
          </p>
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

            <div class="tkd-tabs" role="tablist">
              <span class="tkd-tab tkd-tab-activa" role="tab" aria-selected="true">
                Conversación
                <span v-if="comentarios.length" class="tk-hilo-conteo">{{ comentarios.length }}</span>
              </span>
              <span class="tkd-tab" role="tab" aria-disabled="true" title="Próximamente">Actividad</span>
            </div>

            <TicketComments
              ref="hilo"
              :comentarios="comentarios"
              :enviando="comentando"
              :error="errorComentario"
              :reportado-por="ticket.creadoPor?.nombre"
              @comentar="comentar"
            />
          </div>
        </section>

        <aside class="tkd-side-col">
          <section class="ds-panel">
            <div class="ds-panel-body tk-side">
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
          </section>

          <section class="ds-panel">
            <div class="ds-panel-body tk-side">
              <span class="tk-bloque-titulo">Detalle</span>

              <div class="tk-persona-fila">
                <span class="tk-avatar">{{ iniciales(ticket.creadoPor?.nombre) }}</span>
                <div class="tk-persona-info">
                  <span class="tk-persona">{{ ticket.creadoPor?.nombre || '—' }}</span>
                  <span class="tk-side-fecha">Reportó · {{ fechaHora(ticket.creadoEn) }}</span>
                </div>
              </div>

              <template v-if="ticket.canManage">
                <div class="tk-persona-fila">
                  <span class="tk-avatar tk-avatar-agente">{{ iniciales(ticket.asignadoA?.nombre) }}</span>
                  <div class="tk-persona-info">
                    <span class="tk-persona">{{ ticket.asignadoA?.nombre || 'Sin asignar' }}</span>
                    <span class="tk-side-fecha">Atiende · {{ ticket.asignadoA ? ESTADO_LABEL[ticket.estado].toLowerCase() : 'sin tomar' }}</span>
                  </div>
                </div>
              </template>

              <div class="tk-side-divisor"></div>
              <div class="tk-detalle-grid">
                <div>
                  <span class="tk-bloque-titulo">Prioridad</span>
                  <span class="tk-detalle-valor">{{ capitalizar(ticket.prioridad) }}</span>
                </div>
                <div>
                  <span class="tk-bloque-titulo">Área</span>
                  <span class="tk-detalle-valor">{{ ticket.area }}</span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="ticket.canManage && ticket.estado !== 'CERRADO'" ref="reasignarSeccion" class="ds-panel">
            <div class="ds-panel-body tk-side">
              <TicketReassign
                :asignado-a-id="ticket.asignadoA?.id ?? null"
                :guardando="guardando"
                @reasignar="reasignar"
              />
            </div>
          </section>
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
  slaLabel, slaTono, tiempoRestante, progresoSla, fechaHora, hrefSeguro, iniciales,
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

const capitalizar = (texto) => (texto ? texto.charAt(0) + texto.slice(1).toLowerCase() : '—')

const hilo = ref(null)
const reasignarSeccion = ref(null)
const ahora = ref(Date.now())
const tick = setInterval(() => { ahora.value = Date.now() }, 30_000)
onUnmounted(() => clearInterval(tick))

function irAReasignar () {
  reasignarSeccion.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

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
.tkd-page { gap: 14px; }

.tkd-crumbs { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--ds-muted); }
.tkd-crumbs a { color: var(--ds-muted); text-decoration: none; }
.tkd-crumbs a:hover { color: var(--ds-accent); }
.tkd-crumbs-sep { color: var(--ds-border); }
.tkd-crumbs-actual { color: var(--ds-heading); }

.tkd-masthead-body { display: flex; flex-direction: column; gap: 10px; }
.tkd-masthead-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.tkd-masthead-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tkd-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.02em; color: var(--ds-muted); }
.tkd-masthead-acciones { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.tkd-asunto { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.01em; color: var(--ds-heading); }
.tkd-meta { margin: 0; font-size: 12.5px; color: var(--ds-muted); }
.tkd-meta strong { color: var(--ds-ink-2); font-weight: 700; }
.tkd-meta-sep { margin: 0 6px; }

/* Sidebar más ancha que en el modal original (320 vs 240): con todo el ancho
   de una página propia, un panel angosto se veía como una columna perdida. */
.tkd-split { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
@media (max-width: 860px) { .tkd-split { grid-template-columns: 1fr; } }

.tkd-main-body { display: flex; flex-direction: column; gap: 16px; }
.tkd-divisor { height: 1px; background: var(--ds-border); }

.tkd-tabs { display: flex; align-items: center; gap: 18px; margin-top: -4px; }
.tkd-tab {
  display: flex; align-items: center; gap: 6px; padding-bottom: 8px;
  font-size: 13px; font-weight: 700; color: var(--ds-muted);
  border-bottom: 2px solid transparent; cursor: default;
}
.tkd-tab[aria-disabled="true"] { opacity: 0.55; }
.tkd-tab-activa { color: var(--ds-heading); border-bottom-color: var(--ds-accent); }
.tk-hilo-conteo { padding: 1px 7px; border-radius: 10px; background: var(--ds-soft-neutral); font-size: 11.5px; color: var(--ds-ink-2); }

.tkd-side-col { display: flex; flex-direction: column; gap: 16px; }

.tk-side { display: flex; flex-direction: column; gap: 14px; }
.tk-side-divisor { height: 1px; background: var(--ds-border); }
.tk-persona { font-size: 13px; font-weight: 600; color: var(--ds-ink); }
.tk-side-fecha { font-size: 11.5px; color: var(--ds-muted); }

.tk-persona-fila { display: flex; align-items: center; gap: 10px; }
.tk-persona-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tk-avatar {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 32px; height: 32px; border-radius: 999px;
  background: var(--ds-soft-info); color: var(--ds-info-ink); font-size: 12px; font-weight: 700;
}
.tk-avatar-agente { background: var(--ds-heading); color: var(--ds-surface); }

.tk-detalle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tk-detalle-grid > div { display: flex; flex-direction: column; gap: 3px; }
.tk-detalle-valor { font-size: 13px; font-weight: 700; color: var(--ds-heading); }

.tk-reloj { display: flex; flex-direction: column; gap: 5px; }
.tk-reloj-cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tk-reloj-label { font-size: 12px; font-weight: 600; color: var(--ds-heading); }
.tk-reloj-pie { font-size: 11px; color: var(--ds-muted); }
.tk-side-bloque .tk-reloj + .tk-reloj,
.tk-side .tk-reloj + .tk-reloj { margin-top: 10px; }

.tk-bloque { display: flex; flex-direction: column; gap: 8px; }
.tk-bloque-titulo { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--ds-ink-2); }
.tk-problema { margin: 0; font-size: 13.5px; color: var(--ds-ink); white-space: pre-wrap; word-break: break-word; }
.tk-ref { align-self: flex-start; font-size: 12.5px; color: var(--ds-accent); word-break: break-all; }

.tk-hint { margin: 0; font-size: 11.5px; color: var(--ds-muted); }
</style>
