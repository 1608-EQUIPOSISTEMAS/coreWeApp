<template>
  <div class="tk-panel">
    <div class="ds-table-scroll">
      <table class="ds-table tk-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Asunto</th>
            <th v-if="mostrarCreador">Reportó</th>
            <th>Rol</th>
            <th v-if="canManage">Atiende</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Tiempos SLA</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="g in grupos" :key="g.clave">
            <tr class="tk-grupo">
              <td :colspan="columnas">
                <i class="tk-grupo-dot" :class="'tk-dot-' + GRUPO_TONO[g.clave]" aria-hidden="true"></i>
                <span class="tk-grupo-label">{{ GRUPO_LABEL[g.clave] }}</span>
                <span class="tk-grupo-count">{{ g.tickets.length }} ticket{{ g.tickets.length === 1 ? '' : 's' }}</span>
              </td>
            </tr>
            <tr
              v-for="t in g.tickets"
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
              <td><span class="ds-chip tk-area">{{ t.rol || 'Sin rol' }}</span></td>
              <td v-if="canManage">
                <span class="tk-persona">
                  <span class="tk-avatar" :class="{ 'tk-avatar-vacio': !t.asignadoA }" aria-hidden="true">
                    <i v-if="!t.asignadoA" class="fa-regular fa-circle-user" aria-hidden="true"></i>
                    <template v-else>{{ iniciales(t.asignadoA.nombre) }}</template>
                  </span>
                  {{ t.asignadoA?.nombre || 'Sin asignar' }}
                </span>
              </td>
              <td><span class="ds-pill" :class="PRIORIDAD_TONO[t.prioridad]">{{ t.prioridad }}</span></td>
              <td>
                <span class="ds-pill tk-estado" :class="ESTADO_TONO[t.estado]">
                  <i class="tk-dot" :class="'tk-dot-' + ESTADO_TONO[t.estado]" aria-hidden="true"></i>
                  {{ ESTADO_LABEL[t.estado] }}
                </span>
              </td>
              <td class="tk-plazo-cell">
                <div class="tk-plazo-top">
                  <span class="tk-plazo-label" :class="'tk-ink-' + plazo(t).tono">{{ plazo(t).label }}</span>
                  <span class="tk-restante">{{ plazo(t).detalle }}</span>
                </div>
                <div class="ds-track tk-plazo-track">
                  <i :class="'tk-fill-' + plazo(t).tono" :style="{ width: plazo(t).progreso + '%' }"></i>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  ESTADO_LABEL, ESTADO_TONO, PRIORIDAD_TONO, slaLabel, slaTono, tiempoRestante,
  progresoSla, fechaCorta, grupoUrgencia, iniciales, GRUPO_LABEL, GRUPO_TONO, ORDEN_GRUPOS,
} from './ticket-format.js'

// Solo dibuja. El veredicto de cada reloj lo trae el ticket ya evaluado.
const props = defineProps({
  tickets: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  // Un colaborador solo ve tickets suyos: la columna diría su nombre en todas
  // las filas.
  mostrarCreador: { type: Boolean, default: false },
})

defineEmits(['abrir'])

const columnas = computed(() => 5 + (props.mostrarCreador ? 1 : 0) + (props.canManage ? 1 : 0))

// La bandeja agrupada responde primero "¿qué es urgente?" y solo dentro de eso
// importa el orden que ya trae la lista (urgencia del plazo o más recientes).
// Un grupo sin tickets no se dibuja: no hay nada que decir sobre "Vencidos"
// cuando no hay ninguno.
const grupos = computed(() => {
  const porClave = Object.fromEntries(ORDEN_GRUPOS.map(clave => [clave, []]))
  for (const t of props.tickets) porClave[grupoUrgencia(t)].push(t)
  return ORDEN_GRUPOS.map(clave => ({ clave, tickets: porClave[clave] })).filter(g => g.tickets.length)
})

// El plazo que importa es el que está peor: un ticket con la respuesta cumplida
// pero la resolución vencida está vencido, no cumplido.
function critico (t) {
  const resolucion = t.sla?.resolucion
  const respuesta = t.sla?.respuesta

  if (t.estado === 'CERRADO') return resolucion

  return [respuesta, resolucion].find(r => r?.estado === 'VENCIDO')
    ?? [respuesta, resolucion].find(r => r?.estado === 'POR_VENCER')
    ?? (respuesta?.estado && respuesta.estado !== 'CUMPLIDO' ? respuesta : resolucion)
}

function plazo (t) {
  const c = critico(t)
  return {
    label: slaLabel(c?.estado),
    tono: slaTono(c?.estado),
    detalle: t.estado === 'CERRADO' ? fechaCorta(c?.cumplidoEn) : tiempoRestante(c?.msRestantes),
    progreso: progresoSla(c, t.creadoEn),
  }
}
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

.tk-table { font-size: 13px; }
.tk-table thead th {
  padding: 12px 14px;
  background: var(--ds-surface-2);
  border-bottom: 1px solid var(--ds-border);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ds-ink-2);
}
.tk-table thead th:first-child { padding-left: 16px; }

.tk-table tbody tr.link { cursor: pointer; }
.tk-table tbody tr.link td { padding: 13px 14px; border-top: 1px solid var(--ds-border); transition: background-color 0.12s; }
.tk-table tbody tr.link td:first-child { padding-left: 16px; }
.tk-table tbody tr.link:hover td, .tk-table tbody tr.link:focus-visible td { background: var(--ds-surface-2); }
.tk-table tbody tr.link:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: -2px; }

.tk-cod { font-family: var(--ds-font-mono); font-variant-numeric: tabular-nums; color: var(--ds-muted); white-space: nowrap; }
.tk-titulo { display: block; font-weight: 600; color: var(--ds-heading); }
.tk-meta { display: inline-flex; gap: 10px; margin-top: 3px; font-size: 11.5px; color: var(--ds-muted); }
.tk-restante { display: block; font-size: 11.5px; color: var(--ds-muted); white-space: nowrap; }
.tk-area { white-space: nowrap; }

/* Cabecera de grupo: franja propia que separa por urgencia, no una fila de datos. */
.tk-grupo td {
  padding: 9px 14px;
  border-top: 1px solid var(--ds-border);
  background: var(--ds-surface-3);
}
.tk-grupo:first-child td { border-top: none; }
.tk-grupo-label { font-size: 12px; font-weight: 700; color: var(--ds-heading); margin-right: 8px; }
.tk-grupo-count { font-size: 11.5px; color: var(--ds-muted); }
.tk-grupo-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 8px; }

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

/* Plazo SLA: etiqueta + tiempo restante arriba, barra de consumo abajo */
.tk-plazo-cell { min-width: 160px; }
.tk-plazo-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.tk-plazo-label { font-size: 12px; font-weight: 700; white-space: nowrap; }
.tk-ink-ok { color: var(--ds-ok-ink); }
.tk-ink-warn { color: var(--ds-warn-ink); }
.tk-ink-bad { color: var(--ds-bad-ink); }
.tk-plazo-track { width: 100%; }
</style>
