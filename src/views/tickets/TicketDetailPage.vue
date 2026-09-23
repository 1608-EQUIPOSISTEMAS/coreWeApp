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

            <div v-if="ticket.canManage || ticket.canReopen" class="tkd-masthead-acciones">
              <!-- Quien reportó reabre lo suyo si el problema sigue. Si además
                   es el agente asignado, ya tiene el botón de gestión de abajo. -->
              <button
                v-if="ticket.canReopen && !ticket.canChangeStatus"
                type="button"
                class="btn-exec btn-exec-outline"
                :disabled="guardando"
                @click="reabrir"
              >
                <i class="fa-solid" :class="guardando ? 'fa-spinner fa-spin' : 'fa-rotate-left'" aria-hidden="true"></i>
                Reabrir
              </button>
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
                v-if="ticket.canManage && ticket.estado !== 'CERRADO'"
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
              <!-- Solo http(s) se vuelve <a>: el backend ya no valida el formato,
                   así que cualquier otra cosa se muestra como texto. -->
              <template v-for="e in enlaces" :key="e.texto">
                <a v-if="e.href" :href="e.href" target="_blank" rel="noopener noreferrer" class="tk-ref">
                  <i class="fa-solid fa-link" aria-hidden="true"></i> {{ e.texto }}
                </a>
                <span v-else class="tk-ref tk-ref--texto">
                  <i class="fa-solid fa-link" aria-hidden="true"></i> {{ e.texto }}
                </span>
              </template>
              <TicketAttachments v-if="adjuntos.length" :adjuntos="adjuntos" kind="ticket" />
            </section>

            <TicketAiNote
              :ticket-id="ticket.id"
              :can-manage="!!ticket.canManage"
              @usar="usarBorrador"
            />

            <div class="tkd-divisor"></div>

            <div class="tkd-tabs" role="tablist">
              <button
                type="button"
                class="tkd-tab"
                :class="{ 'tkd-tab-activa': pestana === 'conversacion' }"
                role="tab"
                :aria-selected="pestana === 'conversacion'"
                @click="pestana = 'conversacion'"
              >
                Conversación
                <span v-if="comentarios.length" class="tk-hilo-conteo">{{ comentarios.length }}</span>
              </button>
              <button
                type="button"
                class="tkd-tab"
                :class="{ 'tkd-tab-activa': pestana === 'actividad' }"
                role="tab"
                :aria-selected="pestana === 'actividad'"
                @click="pestana = 'actividad'"
              >
                Actividad
                <span v-if="actividad?.length" class="tk-hilo-conteo">{{ actividad.length }}</span>
              </button>
            </div>

            <TicketActivity
              v-if="pestana === 'actividad'"
              :eventos="actividad ?? []"
              :cargando="cargandoActividad"
              :error="errorActividad"
            />

            <!-- v-show y no v-if: cambiar de pestaña no puede borrar lo que el
                 agente venía escribiendo en la respuesta. -->
            <TicketComments
              v-show="pestana === 'conversacion'"
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
              <div v-for="r in relojes" :key="r.nombre" class="tk-reloj" :class="{ 'tk-reloj--hecho': r.terminado }">
                <div class="tk-reloj-cab">
                  <span class="tk-reloj-label">{{ r.titulo }}</span>
                  <span class="ds-pill" :class="r.tono">{{ slaLabel(r.estado) }}</span>
                </div>
                <!-- Detenido: sin barra, porque una barra a medio llenar se lee
                     como "sigue corriendo". Corriendo: barra del color del estado. -->
                <p v-if="r.terminado" class="tk-reloj-resumen" :class="'tk-ink-' + r.tono">
                  <i class="fa-solid" :class="r.icono" aria-hidden="true"></i> {{ r.resumen }}
                </p>
                <template v-else>
                  <div class="ds-track"><i :class="'tk-fill-' + r.tono" :style="{ width: r.progreso + '%' }"></i></div>
                  <p class="tk-reloj-resumen" :class="'tk-ink-' + r.tono">
                    <i class="fa-solid" :class="r.icono" aria-hidden="true"></i> {{ r.resumen }}
                  </p>
                </template>
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
import TicketActivity from './TicketActivity.vue'
import TicketAiNote from './TicketAiNote.vue'
import TicketReassign from './TicketReassign.vue'
import {
  ESTADO_LABEL, ESTADO_TONO, PRIORIDAD_TONO, SIGUIENTE_ESTADO,
  slaLabel, describirReloj, fechaHora, hrefSeguro, iniciales,
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
const enlaces = computed(() => {
  const lista = ticket.value?.enlaces ?? (ticket.value?.link ? [ticket.value.link] : [])
  return lista.map(texto => ({ texto, href: hrefSeguro(texto) }))
})
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
  const t = ticket.value
  if (!t?.sla) return []
  return [
    { tipo: 'respuesta', titulo: 'Primera respuesta' },
    { tipo: 'resolucion', titulo: 'Resolución' },
  ]
    .map(r => {
      const d = describirReloj(t.sla[r.tipo], t.creadoEn, r.tipo, ahora.value)
      return d && { ...d, titulo: r.titulo }
    })
    .filter(Boolean)
})

watch(() => comentarios.value.length, (ahora_, antes) => {
  if (antes !== undefined && ahora_ > antes) hilo.value?.reset()
})

// ── Pestaña Actividad ──────────────────────────────────────────────────────
// Se pide recién al abrir la pestaña (la mayoría de las visitas solo miran la
// conversación). actividad = null significa "no cargada o desactualizada".
const pestana = ref('conversacion')
const actividad = ref(null)
const cargandoActividad = ref(false)
const errorActividad = ref('')

async function cargarActividad () {
  const id = ticket.value?.id
  if (!id) return
  cargandoActividad.value = true
  errorActividad.value = ''
  try {
    const eventos = await service.activity(id)
    // Si mientras tanto se navegó a otro ticket, esta respuesta ya no aplica.
    if (ticket.value?.id === id) actividad.value = eventos
  } catch (e) {
    console.error('tickets.activity:', e)
    errorActividad.value = e?.response?.data?.message || 'No se pudo cargar la actividad.'
  } finally {
    cargandoActividad.value = false
  }
}

watch(pestana, (p) => {
  if (p === 'actividad' && actividad.value === null) cargarActividad()
})

// Tras cualquier cambio (estado, reasignación, comentario) la actividad ya no
// está al día: si se está mirando se recarga; si no, se pedirá al volver.
function actividadDesactualizada () {
  if (pestana.value === 'actividad') cargarActividad()
  else actividad.value = null
}

function usarBorrador (texto) {
  pestana.value = 'conversacion'
  hilo.value?.prellenar(texto)
}

async function cargar () {
  const id = Number(route.params.id)
  ticket.value = null
  comentarios.value = []
  actividad.value = null
  errorActividad.value = ''
  error.value = ''
  cargando.value = true
  try {
    const [t, c] = await Promise.all([service.detail(id), service.comments(id)])
    ticket.value = t
    comentarios.value = c
    if (pestana.value === 'actividad') cargarActividad()
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

// El servidor devuelve el ticket completo (permisos y adjuntos incluidos), así
// que se reemplaza tal cual y la vista queda al día sin recargar la página.
async function cambiarEstado (estado) {
  const estadoPrevio = ticket.value.estado
  guardando.value = true
  try {
    const { avisoSlack, ...actualizado } = await service.changeStatus(ticket.value.id, estado)
    ticket.value = actualizado
    actividadDesactualizada()
    if (estado !== 'CERRADO') {
      toast.success(estadoPrevio === 'CERRADO' ? 'Ticket reabierto' : 'Ticket tomado')
      return
    }
    // Al resolver, el backend le manda la confirmación por Slack a quien
    // reportó y avisa si llegó.
    const quien = actualizado.creadoPor?.nombre || 'quien lo reportó'
    if (avisoSlack) {
      toast.success(`Ticket resuelto. Se envió un mensaje de confirmación a ${quien} por Slack.`)
    } else {
      toast.success('Ticket resuelto.')
      toast.warning(`No se pudo enviar la confirmación por Slack a ${quien}.`)
    }
  } catch (e) {
    console.error('tickets.status:', e)
    toast.error(e?.response?.data?.message || 'No se pudo cambiar el estado.')
  } finally {
    guardando.value = false
  }
}

async function reabrir () {
  guardando.value = true
  try {
    ticket.value = await service.reopen(ticket.value.id)
    actividadDesactualizada()
    const agente = ticket.value.asignadoA?.nombre
    toast.success(agente ? `Ticket reabierto. Vuelve a ${agente}.` : 'Ticket reabierto.')
  } catch (e) {
    console.error('tickets.reopen:', e)
    toast.error(e?.response?.data?.message || 'No se pudo reabrir el ticket.')
  } finally {
    guardando.value = false
  }
}

async function reasignar (nuevoAsignadoId) {
  guardando.value = true
  try {
    ticket.value = await service.reassign(ticket.value.id, nuevoAsignadoId)
    actividadDesactualizada()
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
    actividadDesactualizada()
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
  display: flex; align-items: center; gap: 6px; padding: 0 0 8px;
  border: 0; border-bottom: 2px solid transparent; background: none;
  font-family: inherit; font-size: 13px; font-weight: 700; color: var(--ds-muted);
  cursor: pointer;
}
.tkd-tab:hover { color: var(--ds-heading); }
.tkd-tab:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 2px; border-radius: 3px; }
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
.tk-reloj-resumen { margin: 0; font-size: 12.5px; font-weight: 700; }
.tk-reloj-resumen i { margin-right: 4px; }
/* Reloj detenido: se atenúa para que el ojo vaya al que todavía corre. */
.tk-reloj--hecho .tk-reloj-label { color: var(--ds-ink-2); }
.tk-fill-ok { background: var(--ds-ok); }
.tk-fill-warn { background: var(--ds-warn); }
.tk-fill-bad { background: var(--ds-bad); }
.tk-ink-ok { color: var(--ds-ok-ink); }
.tk-ink-warn { color: var(--ds-warn-ink); }
.tk-ink-bad { color: var(--ds-bad-ink); }
.tk-side-bloque .tk-reloj + .tk-reloj,
.tk-side .tk-reloj + .tk-reloj { margin-top: 10px; }

.tk-bloque { display: flex; flex-direction: column; gap: 8px; }
.tk-bloque-titulo { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--ds-ink-2); }
.tk-problema { margin: 0; font-size: 13.5px; color: var(--ds-ink); white-space: pre-wrap; word-break: break-word; }
.tk-ref { align-self: flex-start; font-size: 12.5px; color: var(--ds-accent); word-break: break-all; }
.tk-ref--texto { color: var(--ds-ink-2); }

.tk-hint { margin: 0; font-size: 11.5px; color: var(--ds-muted); }
</style>
