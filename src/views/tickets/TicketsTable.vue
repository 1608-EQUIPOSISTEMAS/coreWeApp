<template>
  <div class="tk-panel">
    <div class="ds-table-scroll">
      <table class="ds-table tk-table">
        <colgroup>
          <col class="tk-col-ticket">
          <col class="tk-col-asunto">
          <col v-if="mostrarCreador" class="tk-col-persona">
          <col class="tk-col-area">
          <col v-if="canManage" class="tk-col-persona">
          <col class="tk-col-prioridad">
          <col class="tk-col-estado">
          <col class="tk-col-sla">
          <col v-if="canManage" class="tk-col-accion">
        </colgroup>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Título</th>
            <th v-if="mostrarCreador">Reportó</th>
            <th>Área</th>
            <th v-if="canManage">Atiende</th>
            <th class="tk-zone tk-zone-start">Prioridad</th>
            <th class="tk-zone">Estado</th>
            <th class="tk-zone">Tiempos SLA</th>
            <th v-if="canManage" class="tk-accion"><span class="visually-hidden">Acción</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in ordenados"
            :key="t.id"
            class="link"
            tabindex="0"
            @click="$emit('abrir', t.id)"
            @keydown.enter="$emit('abrir', t.id)"
          >
            <td class="tk-cod">#{{ t.codigo }}</td>
            <td>
              <span class="tk-titulo">{{ t.titulo }}</span>
              <span v-if="t.comentarios || t.adjuntos" class="tk-meta">
                <span v-if="t.comentarios"><i class="fa-regular fa-comment" aria-hidden="true"></i> {{ t.comentarios }}</span>
                <span v-if="t.adjuntos"><i class="fa-solid fa-paperclip" aria-hidden="true"></i> {{ t.adjuntos }}</span>
              </span>
            </td>
            <td v-if="mostrarCreador">
              <span class="tk-persona">
                <span class="tk-avatar" aria-hidden="true">{{ iniciales(t.creadoPor?.nombre) }}</span>
                {{ t.creadoPor?.nombre || '—' }}
              </span>
            </td>
            <td><span class="ds-chip tk-area">{{ t.area }}</span></td>
            <td v-if="canManage">
              <span class="tk-persona">
                <span class="tk-avatar" :class="{ 'tk-avatar-vacio': !t.asignadoA }" aria-hidden="true">
                  <i v-if="!t.asignadoA" class="fa-regular fa-circle-user" aria-hidden="true"></i>
                  <template v-else>{{ iniciales(t.asignadoA.nombre) }}</template>
                </span>
                {{ t.asignadoA?.nombre || 'Sin asignar' }}
              </span>
            </td>
            <td class="tk-zone tk-zone-start"><span class="ds-pill" :class="PRIORIDAD_TONO[t.prioridad]">{{ t.prioridad }}</span></td>
            <td class="tk-zone">
              <span class="ds-pill tk-estado" :class="ESTADO_TONO[t.estado]">
                <i class="tk-dot" :class="'tk-dot-' + ESTADO_TONO[t.estado]" aria-hidden="true"></i>
                {{ ESTADO_LABEL[t.estado] }}
              </span>
            </td>
            <td class="tk-zone tk-plazo-cell">
              <!-- Una sola etapa: Primera respuesta (sin tomar) → Resolución
                   (tomado) → Cumplido con indicador de a tiempo / fuera de plazo. -->
              <div v-if="plazo(t)?.final" class="tk-sla-final" :class="'tk-ink-' + plazo(t).tono">
                <i class="fa-solid" :class="plazo(t).icono" aria-hidden="true"></i>
                <span class="tk-sla-final-texto">
                  <strong>Cumplido</strong>
                  <small>{{ plazo(t).corto }}</small>
                </span>
              </div>
              <div v-else-if="plazo(t)" class="tk-sla">
                <div class="tk-sla-fila">
                  <span class="tk-sla-nombre">{{ plazo(t).nombre }}</span>
                  <span class="tk-sla-valor" :class="'tk-ink-' + plazo(t).tono">{{ plazo(t).corto }}</span>
                  <div class="ds-track tk-sla-track">
                    <i :class="'tk-fill-' + plazo(t).tono" :style="{ width: plazo(t).progreso + '%' }"></i>
                  </div>
                </div>
              </div>
              <span v-else class="tk-restante">—</span>
            </td>
            <!-- Tomar desde la bandeja, sin entrar al detalle. .stop para que el
                 clic no abra además el ticket. -->
            <td v-if="canManage" class="tk-accion" @click.stop @keydown.enter.stop>
              <button
                v-if="t.canChangeStatus && t.estado === 'ABIERTO'"
                type="button"
                class="btn-exec tk-btn-tomar"
                :disabled="!!tomandoId"
                @click="$emit('tomar', t)"
              >
                <i class="fa-solid" :class="tomandoId === t.id ? 'fa-spinner fa-spin' : 'fa-hand'" aria-hidden="true"></i>
                Tomar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted } from 'vue'
import {
  ESTADO_LABEL, ESTADO_TONO, PRIORIDAD_TONO, etapaSla, iniciales,
} from './ticket-format.js'

// Solo dibuja. El veredicto de cada reloj lo trae el ticket ya evaluado.
const props = defineProps({
  tickets: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  // Un colaborador solo ve tickets suyos: la columna diría su nombre en todas
  // las filas.
  mostrarCreador: { type: Boolean, default: false },
  // Id del ticket que se está tomando (spinner en su botón, los demás en pausa).
  tomandoId: { type: Number, default: null },
})

defineEmits(['abrir', 'tomar'])

// El más nuevo arriba, el más viejo abajo: el orden que importa aquí es
// cuándo se creó el ticket, no su urgencia.
const ordenados = computed(() =>
  [...props.tickets].sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn)),
)

// Reloj del navegador: los contadores avanzan sin recargar la bandeja.
const ahora = ref(Date.now())
const tick = setInterval(() => { ahora.value = Date.now() }, 30_000)
onUnmounted(() => clearInterval(tick))

const plazos = computed(() => new Map(props.tickets.map(t => [t.id, etapaSla(t, ahora.value)])))
const plazo = (t) => plazos.value.get(t.id) ?? null
</script>

<style scoped>
/* Tabla, chips y pills: sistema de diseño (styles/design-system.css).
   Aquí solo estructura de tarjeta: la tabla plana de .ds-table no alcanza
   para una bandeja completa (necesita borde propio, cabecera marcada y
   filas con más aire que un mini-listado dentro de panel). */
.tk-panel {
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius);
  overflow: hidden;
}

.tk-table { font-size: 13px; table-layout: fixed; width: 100%; }
.tk-col-ticket { width: 9%; }
.tk-col-asunto { width: 28%; }
.tk-col-persona { width: 13%; }
.tk-col-area { width: 11%; }
.tk-col-prioridad { width: 9%; }
.tk-col-estado { width: 12%; }
.tk-col-sla { width: 18%; }
.tk-col-accion { width: 96px; }
.tk-table .tk-accion { text-align: center; cursor: default; }
.tk-btn-tomar { padding: 5px 11px; font-size: 12px; white-space: nowrap; }
.tk-table thead th {
  padding: 12px 14px;
  background: var(--ds-surface-2);
  border-bottom: 1px solid var(--ds-border);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ds-ink-2);
  text-align: left;
}
.tk-table thead th:first-child { padding-left: 16px; }

.tk-table tbody tr.link { cursor: pointer; }
.tk-table tbody tr.link td { padding: 13px 14px; border-top: 1px solid var(--ds-border); transition: background-color 0.12s; }
.tk-table tbody tr.link td:first-child { padding-left: 16px; }
.tk-table tbody tr.link:hover td, .tk-table tbody tr.link:focus-visible td { background: var(--ds-surface-2); }
.tk-table tbody tr.link:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }

/* Zona de estado: Prioridad + Estado + Tiempos SLA se leen como un solo
   bloque ("¿cómo está este ticket?"), por eso comparten fondo propio y
   quedan centradas — a diferencia de las columnas de identidad, que se leen
   de izquierda a derecha como texto normal. */
.tk-table thead th.tk-zone { text-align: center; background: var(--ds-surface-3); }
.tk-table thead th.tk-zone-start { border-left: 1px solid var(--ds-border); }
.tk-table tbody tr.link td.tk-zone { text-align: center; background: color-mix(in srgb, var(--ds-surface-2) 55%, transparent); }
.tk-table tbody tr.link td.tk-zone-start { border-left: 1px solid var(--ds-border); }
.tk-table tbody tr.link:hover td.tk-zone, .tk-table tbody tr.link:focus-visible td.tk-zone { background: var(--ds-surface-3); }

.tk-cod { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; color: var(--ds-muted); white-space: nowrap; }
.tk-titulo { display: block; font-weight: 600; color: var(--ds-heading); }
.tk-meta { display: inline-flex; gap: 10px; margin-top: 3px; font-size: 11.5px; color: var(--ds-muted); }
.tk-restante { display: block; font-size: 11.5px; color: var(--ds-muted); white-space: nowrap; }
.tk-area { white-space: nowrap; }

/* Avatar de iniciales para "Reportó" y "Atiende" */
.tk-persona { display: inline-flex; align-items: center; gap: 8px; }
.tk-avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--ds-soft-info); color: var(--ds-info-ink);
  font-size: 10.5px; font-weight: 700;
}
/* Sin asignar: mismo tamaño de avatar, tono neutro y un ícono en vez de iniciales. */
.tk-avatar-vacio { background: var(--ds-soft-neutral); color: var(--ds-muted); font-size: 12px; }

/* Punto de color reutilizado por el grupo y por el chip de estado */
.tk-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 2px; }
.tk-dot-ok, .tk-fill-ok { background: var(--ds-ok); }
.tk-dot-warn, .tk-fill-warn { background: var(--ds-warn); }
.tk-dot-bad, .tk-fill-bad { background: var(--ds-bad); }
.tk-dot-info, .tk-fill-info { background: var(--ds-info-ink); }
.tk-estado { gap: 6px; }

/* Plazo SLA. Dos filas: nombre de la etapa a la izquierda, estado a la derecha; la barra
   solo bajo la etapa en curso. */
.tk-sla { display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 230px; margin: 0 auto; text-align: left; }
.tk-sla-fila { display: grid; grid-template-columns: auto 1fr; align-items: baseline; column-gap: 8px; row-gap: 4px; }
.tk-sla-nombre { font-size: 11.5px; font-weight: 700; color: var(--ds-heading); }
.tk-sla-valor { font-size: 11.5px; font-weight: 600; text-align: right; white-space: nowrap; }
.tk-sla-track { grid-column: 1 / -1; }
/* Resuelto: sin barra ni contador, solo el veredicto con su ícono. */
.tk-sla-final { display: inline-flex; align-items: center; gap: 8px; text-align: left; }
.tk-sla-final > i { font-size: 17px; }
.tk-sla-final-texto { display: flex; flex-direction: column; line-height: 1.25; }
.tk-sla-final-texto strong { font-size: 12.5px; }
.tk-sla-final-texto small { font-size: 11px; font-weight: 600; }
.tk-ink-ok { color: var(--ds-ok-ink); }
.tk-ink-warn { color: var(--ds-warn-ink); }
.tk-ink-bad { color: var(--ds-bad-ink); }
.tk-plazo-cell { min-width: 160px; }
</style>
