<template>
  <div class="tk-board">
    <div class="ds-kpis">
      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-inbox"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ kpis.total }}</span>
          <span class="ds-kpi-label">{{ scope.kind === 'OWN' ? 'Mis tickets' : 'Tickets a la vista' }}</span>
          <span class="ds-kpi-note">{{ scope.area }}</span>
        </div>
      </div>

      <div v-if="scope.canManage" class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-user-check"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ kpis.misAsignados }}</span>
          <span class="ds-kpi-label">Míos, sin resolver</span>
          <span class="ds-kpi-note">Asignados a vos y todavía abiertos</span>
        </div>
      </div>

      <div v-if="scope.canManage" class="ds-kpi">
        <span class="ds-kpi-icon warn" aria-hidden="true"><i class="fa-solid fa-user-slash"></i></span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ kpis.sinAsignar }}</span>
          <span class="ds-kpi-label">Sin asignar</span>
          <span class="ds-kpi-note">Nadie los tiene todavía</span>
        </div>
      </div>

      <div class="ds-kpi">
        <span class="ds-kpi-icon" :class="kpis.vencidos ? 'bad' : ''" aria-hidden="true">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </span>
        <div class="ds-kpi-body">
          <span class="ds-kpi-value">{{ kpis.vencidos }}</span>
          <span class="ds-kpi-label">Fuera de plazo</span>
          <span class="ds-kpi-note">Algún reloj del SLA ya venció</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="ds-panel-body">
        <TicketsToolbar
          v-model="filtroLocal"
          :busqueda="busqueda"
          :orden="orden"
          :prioridad="prioridad"
          :estado="estado"
          :can-manage="scope.canManage"
          :kpis="kpis"
          @update:busqueda="$emit('update:busqueda', $event)"
          @update:orden="$emit('update:orden', $event)"
          @update:prioridad="prioridad = $event"
          @update:estado="estado = $event"
        />

        <p v-if="error" class="ds-alert">{{ error }}</p>
        <p v-else-if="cargando && !tickets.length" class="ds-alert neutro">Cargando tickets…</p>
        <p v-else-if="!tickets.length" class="ds-empty ds-empty--lista">
          {{ filtro === 'TODOS' ? 'Todavía no hay tickets.' : 'Ningún ticket coincide con este filtro.' }}
        </p>
        <p v-else-if="!ticketsFiltrados.length" class="ds-empty ds-empty--lista">
          Ningún ticket coincide con la prioridad o el estado elegidos.
        </p>

        <TicketsTable
          v-else
          :tickets="ticketsFiltrados"
          :can-manage="scope.canManage"
          :mostrar-creador="scope.kind !== 'OWN'"
          :tomando-id="tomandoId"
          @abrir="$emit('abrir', $event)"
          @tomar="$emit('tomar', $event)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TicketsToolbar from './TicketsToolbar.vue'
import TicketsTable from './TicketsTable.vue'

// Solo dibuja. El alcance (qué tickets y si puede gestionarlos) llega del
// servidor en `scope`; no se deriva de localStorage, para que no haya dos
// fuentes de verdad sobre los permisos.
const props = defineProps({
  tickets: { type: Array, default: () => [] },
  kpis: { type: Object, default: () => ({ total: 0, misAsignados: 0, sinAsignar: 0, porVencer: 0, vencidos: 0 }) },
  scope: { type: Object, default: () => ({ kind: 'OWN', area: '', canManage: false }) },
  filtro: { type: String, default: 'TODOS' },
  busqueda: { type: String, default: '' },
  orden: { type: String, default: 'sla' },
  cargando: { type: Boolean, default: false },
  error: { type: String, default: '' },
  tomandoId: { type: Number, default: null },
})

const emit = defineEmits(['abrir', 'tomar', 'update:filtro', 'update:busqueda', 'update:orden'])

const filtroLocal = computed({
  get: () => props.filtro,
  set: (v) => emit('update:filtro', v),
})

// Prioridad y estado se filtran en el cliente, sobre lo que ya llegó filtrado
// por tab (filtro) desde el servidor: son un recorte visual, no un alcance de
// datos, así que no ameritan otro viaje al backend.
const prioridad = ref('TODAS')
const estado = ref('TODOS')

const ticketsFiltrados = computed(() => props.tickets.filter(t =>
  (prioridad.value === 'TODAS' || t.prioridad === prioridad.value) &&
  (estado.value === 'TODOS' || t.estado === estado.value)
))
</script>

<style scoped>
/* KPIs, paneles, vacíos y colores: sistema de diseño (styles/design-system.css). */
.tk-board { display: flex; flex-direction: column; gap: 18px; }
</style>
