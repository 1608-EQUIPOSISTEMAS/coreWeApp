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
import TicketsBoard from './TicketsBoard.vue'
import TicketCreateModal from './TicketCreateModal.vue'
import SlaPolicies from './SlaPolicies.vue'

const service = inject(ServiceKeys.Tickets)
const router = useRouter()
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
.tk-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--ds-border); }
.tk-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; border: 0; border-bottom: 2px solid transparent;
  background: none; font-size: 13px; font-weight: 600; color: var(--ds-muted); cursor: pointer;
}
.tk-tab:hover { color: var(--ds-heading); }
.tk-tab.activo { color: var(--ds-accent); border-bottom-color: var(--ds-accent); }
</style>
