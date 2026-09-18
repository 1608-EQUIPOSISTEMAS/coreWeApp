<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Tickets</h1>
        <p class="ds-sub">Soporte interno: reporta una incidencia y sigue cómo avanza.</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="cargando" @click="cargar">
          <i class="fa-solid" :class="cargando ? 'fa-spinner fa-spin' : 'fa-rotate'" aria-hidden="true"></i>
          {{ cargando ? 'Cargando…' : 'Actualizar' }}
        </button>
        <RouterLink class="btn-exec btn-exec-outline" to="/dashboard">
          <i class="fa-solid fa-chart-pie" aria-hidden="true"></i>
          Ver reportes
        </RouterLink>
        <button class="btn-exec" type="button" @click="modalAbierto = true">
          <i class="fa-solid fa-plus" aria-hidden="true"></i>
          Reportar incidencia
        </button>
      </div>
    </header>

    <!-- Las políticas de SLA no van al sidebar: viven acá dentro y solo las ve
         quien puede gestionarlas, según lo que responde el backend. -->
    <nav v-if="scope.canManage" class="tk-tabs" role="tablist" aria-label="Secciones de tickets">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        role="tab"
        class="tk-tab"
        :class="{ activo: tab === t.key }"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        <i class="fa-solid" :class="t.icono" aria-hidden="true"></i> {{ t.label }}
      </button>
    </nav>

    <SlaPolicies v-if="tab === 'SLA' && scope.canManage" />

    <TicketsBoard
      v-else
      v-model:filtro="filtro"
      v-model:busqueda="busqueda"
      v-model:orden="orden"
      :tickets="tickets"
      :kpis="kpis"
      :scope="scope"
      :cargando="cargando"
      :error="error"
      @abrir="abrirDetalle"
    />

    <TicketCreateModal
      :visible="modalAbierto"
      :enviando="creando"
      :error="errorCrear"
      @close="modalAbierto = false"
      @crear="crear"
    />

    <TicketDetail
      :ticket-id="detalleId"
      :ticket="detalle"
      :comentarios="comentarios"
      :adjuntos="adjuntosDetalle"
      :cargando="cargandoDetalle"
      :guardando="guardandoDetalle"
      :comentando="comentando"
      :error="errorDetalle"
      :error-comentario="errorComentario"
      @close="cerrarDetalle"
      @estado="cambiarEstado"
      @reasignar="reasignar"
      @comentar="comentar"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { useTickets } from './useTickets.js'
import TicketsBoard from './TicketsBoard.vue'
import TicketCreateModal from './TicketCreateModal.vue'
import TicketDetail from './TicketDetail.vue'
import SlaPolicies from './SlaPolicies.vue'

const service = inject(ServiceKeys.Tickets)
const toast = useToast()

const {
  tickets, kpis, scope, cargando, error,
  filtro, busqueda, orden, cargar, reemplazar,
} = useTickets(service)

const TABS = [
  { key: 'BANDEJA', label: 'Bandeja', icono: 'fa-inbox' },
  { key: 'SLA', label: 'Plazos de atención', icono: 'fa-stopwatch' },
]
const tab = ref('BANDEJA')

onMounted(cargar)

// ── Alta ──────────────────────────────────────────────────────────────────
const modalAbierto = ref(false)
const creando = ref(false)
const errorCrear = ref('')

async function crear (datos) {
  creando.value = true
  errorCrear.value = ''
  try {
    const ticket = await service.create(datos)
    modalAbierto.value = false
    toast.success(`Ticket #${ticket.codigo} creado con prioridad ${ticket.prioridad}`)
    await cargar()
  } catch (e) {
    console.error('tickets.create:', e)
    // El modal no se cierra: lo escrito se conserva para reintentar.
    errorCrear.value = e?.response?.data?.message || 'No se pudo crear el ticket.'
  } finally {
    creando.value = false
  }
}

// ── Detalle ───────────────────────────────────────────────────────────────
const detalleId = ref(null)
const detalle = ref(null)
const comentarios = ref([])
const cargandoDetalle = ref(false)
const guardandoDetalle = ref(false)
const comentando = ref(false)
const errorDetalle = ref('')
const errorComentario = ref('')

// En el detalle el backend manda la lista de adjuntos; en el listado, solo el
// conteo. Este guard evita que un número se intente recorrer como array.
const adjuntosDetalle = computed(() =>
  (Array.isArray(detalle.value?.adjuntos) ? detalle.value.adjuntos : []))

async function abrirDetalle (id) {
  detalleId.value = id
  detalle.value = null
  comentarios.value = []
  errorDetalle.value = ''
  cargandoDetalle.value = true
  try {
    const [t, c] = await Promise.all([service.detail(id), service.comments(id)])
    detalle.value = t
    comentarios.value = c
  } catch (e) {
    console.error('tickets.detail:', e)
    errorDetalle.value = e?.response?.data?.message || 'No se pudo abrir el ticket.'
  } finally {
    cargandoDetalle.value = false
  }
}

function cerrarDetalle () {
  detalleId.value = null
  detalle.value = null
  comentarios.value = []
  errorComentario.value = ''
}

// Las mutaciones REEMPLAZAN el ticket con lo que devuelve el servidor en vez de
// parchearlo: el SLA y la asignación los decide el backend, y un parche
// optimista mostraría un estado que no existe.
async function cambiarEstado (estado) {
  guardandoDetalle.value = true
  try {
    detalle.value = await service.changeStatus(detalleId.value, estado)
    await reemplazar(detalle.value)
    toast.success(estado === 'CERRADO' ? 'Ticket marcado como resuelto' : 'Ticket tomado')
  } catch (e) {
    console.error('tickets.status:', e)
    toast.error(e?.response?.data?.message || 'No se pudo cambiar el estado.')
  } finally {
    guardandoDetalle.value = false
  }
}

async function reasignar (nuevoAsignadoId) {
  guardandoDetalle.value = true
  try {
    detalle.value = await service.reassign(detalleId.value, nuevoAsignadoId)
    await reemplazar(detalle.value)
    toast.success(`Ticket reasignado a ${detalle.value.asignadoA?.nombre ?? 'otro agente'}`)
  } catch (e) {
    console.error('tickets.reassign:', e)
    toast.error(e?.response?.data?.message || 'No se pudo reasignar el ticket.')
  } finally {
    guardandoDetalle.value = false
  }
}

async function comentar ({ cuerpo, archivos }) {
  comentando.value = true
  errorComentario.value = ''
  try {
    comentarios.value = await service.addComment(detalleId.value, cuerpo, archivos)
  } catch (e) {
    console.error('tickets.comment:', e)
    errorComentario.value = e?.response?.data?.message || 'No se pudo enviar el comentario.'
  } finally {
    comentando.value = false
  }
}
</script>

<style scoped>
/* Página, cabecera, botones y colores: sistema de diseño (styles/design-system.css). */
.tk-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--ds-border); }
.tk-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; border: 0; border-bottom: 2px solid transparent;
  background: none; font-size: 13px; font-weight: 600; color: var(--ds-muted); cursor: pointer;
}
.tk-tab:hover { color: var(--ds-heading); }
.tk-tab.activo { color: var(--ds-accent); border-bottom-color: var(--ds-accent); }
</style>
