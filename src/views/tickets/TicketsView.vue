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

    <!-- Los plazos de atención ya no se editan acá: salen de la tabla de SLA de
         criterios-prioridad.md (backend), en horario hábil. -->
    <TicketsBoard
      v-model:filtro="filtro"
      v-model:busqueda="busqueda"
      v-model:orden="orden"
      :tickets="tickets"
      :kpis="kpis"
      :scope="scope"
      :cargando="cargando"
      :error="error"
      :tomando-id="tomandoId"
      @abrir="abrirDetalle"
      @tomar="tomar"
    />

    <TicketCreateModal
      :visible="modalAbierto"
      :enviando="creando"
      :error="errorCrear"
      @close="modalAbierto = false"
      @crear="crear"
    />
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { useTickets } from './useTickets.js'
import { useAutoRefresh } from './useAutoRefresh.js'
import TicketsBoard from './TicketsBoard.vue'
import TicketCreateModal from './TicketCreateModal.vue'

const service = inject(ServiceKeys.Tickets)
const router = useRouter()
const toast = useToast()

const {
  tickets, kpis, scope, cargando, error,
  filtro, busqueda, orden, cargar, reemplazar,
} = useTickets(service)

onMounted(cargar)

// Mientras haya tickets abiertos sin asignar, el cron del backend puede
// repartirlos en cualquier momento: se refresca en silencio para que el agente
// aparezca solo. `porAsignar` excluye los cerrados, que nadie va a repartir.
useAutoRefresh(
  () => { if (!cargando.value) cargar({ silencioso: true }) },
  () => kpis.value.porAsignar > 0,
)

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

// ── Tomar desde la bandeja ────────────────────────────────────────────────
// La fila se reemplaza con lo que devuelve el servidor y los KPIs se recargan:
// el cambio se ve al instante, sin entrar al detalle ni recargar la página.
const tomandoId = ref(null)

async function tomar (ticket) {
  tomandoId.value = ticket.id
  try {
    await reemplazar(await service.changeStatus(ticket.id, 'EN_PROGRESO'))
    toast.success(`Tomaste el ticket #${ticket.codigo}`)
  } catch (e) {
    console.error('tickets.take:', e)
    toast.error(e?.response?.data?.message || 'No se pudo tomar el ticket.')
    // Si otro agente se adelantó, la bandeja muestra quién lo tiene ahora.
    await cargar()
  } finally {
    tomandoId.value = null
  }
}

// ── Detalle ───────────────────────────────────────────────────────────────
// El detalle vive en su propia página (/tickets/:id), no en un modal: así se
// puede compartir el enlace directo a un ticket y navegar con atrás/adelante.
function abrirDetalle (id) {
  router.push({ name: 'TicketDetalle', params: { id } })
}
</script>

<style scoped>
/* Página, cabecera, botones y colores: sistema de diseño (styles/design-system.css). */
</style>
