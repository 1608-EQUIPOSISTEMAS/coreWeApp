import { computed, inject, reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ServiceKeys } from '@/services'

// ponytail: mismo trato que useCompanyList — se traen todos los contratos de una
// y se filtra en memoria. A esta escala (cientos) una sola llamada deja que los
// KPIs cuenten sobre la cartera entera en vez de sobre la pagina visible. Si
// b2b_contracts pasa de ~5000 filas hay que volver a paginar contra el SP.
const FETCH_SIZE = 5000

export function isoToday () {
  // Fecha local de Lima (UTC-5), no la del navegador: un contrato vence segun el
  // calendario de la empresa, no segun donde este parado quien mira la pantalla.
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// El estado no es una columna: el SP puede mandarlo, y si no, se deduce de la
// baja logica y de la fecha de fin. Vive aca — puro y testeable — porque lo usan
// la pestaña, el KPI y la pastilla de la tabla.
export function contractStatus (contract, today = isoToday()) {
  if (contract.status) {
    return { active: 'Activo', expired: 'Vencido', cancelled: 'Cancelado' }[contract.status] ?? contract.status
  }
  if (contract.active === 'N') return 'Cancelado'
  if (contract.end_date && String(contract.end_date).slice(0, 10) < today) return 'Vencido'
  return 'Activo'
}

// Cupos comprados que todavia no tienen beneficiario asignado.
export function seatsFree (contract) {
  return Number(contract.number_of_licenses || 0) - Number(contract.seats_assigned || 0)
}

export const CONTRACT_VIEWS = [
  { key: 'all',          label: 'Todos',        icon: 'fa-list',           highlight: true, match: () => true },
  { key: 'active',       label: 'Vigentes',     icon: 'fa-circle-check',   match: c => contractStatus(c) === 'Activo' },
  { key: 'with_balance', label: 'Con saldo',    icon: 'fa-coins',          match: c => Number(c.pending_amount) > 0 },
  { key: 'free_seats',   label: 'Cupos libres', icon: 'fa-chair',          match: c => seatsFree(c) > 0 },
  { key: 'expired',      label: 'Vencidos',     icon: 'fa-hourglass-end',  match: c => contractStatus(c) === 'Vencido' },
  { key: 'cancelled',    label: 'Cancelados',   icon: 'fa-ban',            match: c => contractStatus(c) === 'Cancelado' }
]

function emptyColFilters () {
  return {
    empresa: '',
    tipo: [],
    nombre: '',
    saldoMin: '',
    estado: []
  }
}

export function useContractList () {
  const router = useRouter()
  const route = useRoute()
  const b2bService = inject(ServiceKeys.B2b)
  const catalogSvc = inject('catalog')

  const contractTypeList = catalogSvc?.options('we_b2b_contract') || []

  // === Estado ===
  const contracts = ref([])
  const isLoading = ref(false)
  const pagin = ref({ page: 1, size: 25, total: 0 })
  const filters = reactive({ q: '' })
  const colFilters = reactive(emptyColFilters())
  const activeViewKey = ref('all')
  const selectedContract = ref(null)

  const savedViews = computed(() => CONTRACT_VIEWS)

  function viewMatcher (key) {
    return CONTRACT_VIEWS.find(v => v.key === key)?.match ?? (() => true)
  }

  // === Filtrado ===
  const filteredContracts = computed(() => {
    let list = contracts.value.filter(viewMatcher(activeViewKey.value))

    const q = filters.q.trim().toLowerCase()
    if (q) {
      list = list.filter(c =>
        [c.company_name, c.document_number, c.contract_name]
          .some(field => (field || '').toLowerCase().includes(q))
      )
    }

    if (colFilters.empresa.trim()) list = matchText(list, colFilters.empresa, c => `${c.company_name || ''} ${c.document_number || ''}`)
    if (colFilters.nombre.trim()) list = matchText(list, colFilters.nombre, c => c.contract_name)
    if (colFilters.tipo.length) list = list.filter(c => colFilters.tipo.includes(c.contract_type_label || '(Sin tipo)'))
    if (colFilters.estado.length) list = list.filter(c => colFilters.estado.includes(contractStatus(c)))

    const min = Number(colFilters.saldoMin)
    if (colFilters.saldoMin !== '' && !Number.isNaN(min)) {
      list = list.filter(c => Number(c.pending_amount || 0) >= min)
    }

    return list
  })

  function matchText (list, needle, extractor) {
    const term = needle.trim().toLowerCase()
    return list.filter(c => (extractor(c) || '').toLowerCase().includes(term))
  }

  const pagedContracts = computed(() => {
    const start = (pagin.value.page - 1) * pagin.value.size
    return filteredContracts.value.slice(start, start + pagin.value.size)
  })

  const totalFiltered = computed(() => filteredContracts.value.length)

  // === KPIs (sobre la cartera, con el mismo predicado que la pestaña) ===
  // La plata NO se suma entre monedas: un contrato en dolares no se convierte a
  // soles con un tipo de cambio inventado en el front. Cada moneda va aparte.
  const kpis = computed(() => {
    const all = contracts.value
    const pendingBy = alias => all
      .filter(c => (c.currency_alias === 'we_currency_dollars') === (alias === 'we_currency_dollars'))
      .reduce((sum, c) => sum + Number(c.pending_amount || 0), 0)

    return {
      total: all.length,
      active: all.filter(viewMatcher('active')).length,
      pendingPen: pendingBy('we_currency_soles'),
      pendingUsd: pendingBy('we_currency_dollars'),
      freeSeats: all.reduce((sum, c) => sum + Math.max(0, seatsFree(c)), 0)
    }
  })

  // === Chips ===
  const activeFilterChips = computed(() => {
    const chips = []
    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` })
    if (colFilters.empresa) chips.push({ key: 'empresa', label: `Empresa: ${colFilters.empresa}` })
    if (colFilters.nombre) chips.push({ key: 'nombre', label: `Contrato: ${colFilters.nombre}` })
    if (colFilters.tipo.length) chips.push({ key: 'tipo', label: `Tipo (${colFilters.tipo.length})`, details: colFilters.tipo })
    if (colFilters.estado.length) chips.push({ key: 'estado', label: `Estado (${colFilters.estado.length})`, details: colFilters.estado })
    if (colFilters.saldoMin !== '') chips.push({ key: 'saldoMin', label: `Saldo ≥ ${colFilters.saldoMin}` })
    return chips
  })

  function clearFilter (key) {
    if (key === 'q') filters.q = ''
    else if (Array.isArray(colFilters[key])) colFilters[key] = []
    else colFilters[key] = ''
    pagin.value.page = 1
  }

  function clearColFilters () {
    Object.assign(colFilters, emptyColFilters())
    pagin.value.page = 1
  }

  function clearFilters () {
    filters.q = ''
    clearColFilters()
  }

  function applySavedView (key) {
    activeViewKey.value = key
    clearColFilters()
    pagin.value.page = 1
  }

  function handlePaginationChange () { /* el corte es reactivo; no hay refetch */ }

  // === Seleccion ===
  function selectContract (contract) {
    selectedContract.value =
      selectedContract.value?.contract_id === contract?.contract_id ? null : contract
  }

  // === Navegacion ===
  function goNew () { router.push({ name: 'B2BContractNew' }) }
  function editContract (c) { router.push({ name: 'B2BContractEdit', params: { id: c.contract_id } }) }
  // Empresas filtra por texto: se manda el RUC, y si esta sucio, la razon social.
  function viewCompany (c) {
    router.push({ name: 'B2BCompanies', query: { q: c.document_number || c.company_name } })
  }

  // === Backend ===
  async function fetchContracts () {
    isLoading.value = true
    try {
      const { items } = await b2bService.contractList({ page: 1, size: FETCH_SIZE })
      contracts.value = items || []
    } catch (err) {
      console.error('Error cargando contratos:', err)
      contracts.value = []
    } finally {
      isLoading.value = false
    }
  }

  function applyQueryFilters () {
    // Llegada desde Empresas: el contador de contratos manda ?q=<razon social>.
    if (route.query.q) filters.q = String(route.query.q)
  }

  return {
    contracts, isLoading, pagin, filters, colFilters, contractTypeList,
    savedViews, activeViewKey, applySavedView,
    filteredContracts, pagedContracts, totalFiltered, kpis,
    activeFilterChips, clearFilter, clearFilters, clearColFilters,
    selectedContract, selectContract,
    goNew, editContract, viewCompany,
    handlePaginationChange, fetchContracts, applyQueryFilters
  }
}
