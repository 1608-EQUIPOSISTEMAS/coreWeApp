import { ref, computed, watch, onUnmounted } from 'vue'

// Estado de la bandeja: carga, filtros, búsqueda y orden.
//
// Los filtros se aplican en el servidor (el alcance de lectura no es negociable
// desde el cliente) y el resultado incluye `scope` y `kpis`. Las mutaciones
// REEMPLAZAN el ticket con lo que devuelve el servidor en vez de parchearlo
// localmente: el SLA y la asignación los decide el backend, y un parche
// optimista mostraría un estado que no existe.

const DEBOUNCE_MS = 200

export function useTickets (service) {
  const tickets = ref([])
  const kpis = ref({ total: 0, misAsignados: 0, sinAsignar: 0, porAsignar: 0, porVencer: 0, vencidos: 0 })
  const scope = ref({ kind: 'OWN', area: '', canManage: false })

  const cargando = ref(false)
  const error = ref('')

  const filtro = ref('TODOS')
  const busqueda = ref('')
  const orden = ref('sla')

  // `silencioso` es para el refresco de fondo: no muestra el spinner ni pisa
  // la bandeja con un error pasajero. `pedido` descarta respuestas viejas, por
  // si un refresco de fondo llega después de un cambio de filtro.
  let pedido = 0

  async function cargar ({ silencioso = false } = {}) {
    const actual = ++pedido
    if (!silencioso) {
      cargando.value = true
      error.value = ''
    }
    try {
      const data = await service.list({
        filtro: filtro.value,
        busqueda: busqueda.value.trim(),
        orden: orden.value,
      })
      if (actual !== pedido) return
      tickets.value = data.tickets
      kpis.value = data.kpis
      scope.value = data.scope
    } catch (e) {
      console.error('tickets.list:', e)
      if (!silencioso && actual === pedido) {
        error.value = e?.response?.data?.message || 'No se pudieron cargar los tickets.'
      }
    } finally {
      if (!silencioso && actual === pedido) cargando.value = false
    }
  }

  // El filtro y el orden recargan al instante; la búsqueda espera a que dejen
  // de teclear, o sería una consulta por letra.
  watch([filtro, orden], cargar)

  let debounce = null
  watch(busqueda, () => {
    clearTimeout(debounce)
    debounce = setTimeout(cargar, DEBOUNCE_MS)
  })
  onUnmounted(() => clearTimeout(debounce))

  // Tras una mutación el servidor devuelve el ticket completo: se reemplaza en
  // la lista y se recargan los KPIs, que pudieron moverse.
  function reemplazar (actualizado) {
    const i = tickets.value.findIndex(t => t.id === actualizado.id)
    if (i !== -1) tickets.value.splice(i, 1, actualizado)
    return cargar()
  }

  const vacio = computed(() => !cargando.value && !tickets.value.length)

  return {
    tickets, kpis, scope, cargando, error, vacio,
    filtro, busqueda, orden,
    cargar, reemplazar,
  }
}
