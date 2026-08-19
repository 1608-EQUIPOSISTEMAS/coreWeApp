import { computed, inject, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'

// ponytail: se traen TODAS las empresas de una sola vez (398 hoy) y se filtra en
// memoria. El SP pagina, pero a esta escala una sola llamada evita un viaje al
// servidor por tecla y — sobre todo — deja que los KPIs y las vistas rapidas
// cuenten sobre el universo completo y no sobre la pagina visible, que es lo que
// vuelve mentiroso a un tablero. Si `companies` pasa de ~5000 filas hay que
// volver a paginar contra sp_b2b_company_list.
const FETCH_SIZE = 5000

// Las vistas rapidas son predicados puros: el mismo criterio alimenta la pestaña
// y el KPI, asi nunca pueden decir numeros distintos.
export const COMPANY_VIEWS = [
  { key: 'all',           label: 'Todas',          icon: 'fa-list',                highlight: true, match: () => true },
  { key: 'with_contract', label: 'Con contrato',   icon: 'fa-file-signature',      match: c => Number(c.active_contracts_count) > 0 },
  { key: 'no_contract',   label: 'Sin contrato',   icon: 'fa-file-circle-xmark',   match: c => !Number(c.active_contracts_count) },
  { key: 'intermediary',  label: 'Intermediarias', icon: 'fa-link',                match: c => c.is_intermediary === 'Y' },
  { key: 'no_contact',    label: 'Sin contacto',   icon: 'fa-user-slash',          match: c => !c.primary_contact_name },
  { key: 'unclassified',  label: 'Sin clasificar', icon: 'fa-tags',                match: c => !c.cat_sector || !c.cat_classification }
]

function emptyColFilters () {
  return {
    razon: '',
    documento: '',
    sector: [],
    clasificacion: [],
    tipo: [],
    contratosMin: '',
    contacto: ''
  }
}

export function useCompanyList () {
  const router = useRouter()
  const b2bService = inject(ServiceKeys.B2b)
  const catalogSvc = inject('catalog')

  // El SP devuelve los catalogos como id; la descripcion se resuelve aca.
  const sectorById = indexCatalog('company_sector')
  const classificationById = indexCatalog('company_classification')

  function indexCatalog (alias) {
    const options = catalogSvc?.options(alias) || []
    return new Map(options.map(o => [Number(o.id), o.description]))
  }

  function sectorLabel (id) { return (id && sectorById.get(Number(id))) || '' }
  function classificationLabel (id) { return (id && classificationById.get(Number(id))) || '' }
  function tipoLabel (company) { return company.is_intermediary === 'Y' ? 'Intermediaria' : 'Normal' }

  // === Estado ===
  const companies = ref([])
  const isLoading = ref(false)
  const pagin = ref({ page: 1, size: 25, total: 0 })
  const filters = reactive({ q: '' })
  const colFilters = reactive(emptyColFilters())
  const activeViewKey = ref('all')
  const selectedCompany = ref(null)

  const savedViews = computed(() => COMPANY_VIEWS)

  // === Filtrado ===
  function viewMatcher (key) {
    return COMPANY_VIEWS.find(v => v.key === key)?.match ?? (() => true)
  }

  const viewFiltered = computed(() => companies.value.filter(viewMatcher(activeViewKey.value)))

  const filteredCompanies = computed(() => {
    let list = viewFiltered.value

    const q = filters.q.trim().toLowerCase()
    if (q) {
      list = list.filter(c =>
        [c.razon_social, c.commercial_name, c.document_number]
          .some(field => (field || '').toLowerCase().includes(q))
      )
    }

    if (colFilters.razon.trim()) list = matchText(list, colFilters.razon, c => `${c.razon_social} ${c.commercial_name || ''}`)
    if (colFilters.documento.trim()) list = matchText(list, colFilters.documento, c => c.document_number)
    if (colFilters.contacto.trim()) list = matchText(list, colFilters.contacto, c => `${c.primary_contact_name || ''} ${c.primary_contact_email || ''}`)

    if (colFilters.sector.length) list = list.filter(c => colFilters.sector.includes(sectorLabel(c.cat_sector) || '(Sin clasificar)'))
    if (colFilters.clasificacion.length) list = list.filter(c => colFilters.clasificacion.includes(classificationLabel(c.cat_classification) || '(Sin clasificar)'))
    if (colFilters.tipo.length) list = list.filter(c => colFilters.tipo.includes(tipoLabel(c)))

    const min = Number(colFilters.contratosMin)
    if (colFilters.contratosMin !== '' && !Number.isNaN(min)) {
      list = list.filter(c => Number(c.active_contracts_count || 0) >= min)
    }

    return list
  })

  function matchText (list, needle, extractor) {
    const term = needle.trim().toLowerCase()
    return list.filter(c => (extractor(c) || '').toLowerCase().includes(term))
  }

  // La pagina visible sale del resultado ya filtrado: BasePagination sigue
  // mandando, pero el corte ocurre en memoria.
  const pagedCompanies = computed(() => {
    const start = (pagin.value.page - 1) * pagin.value.size
    return filteredCompanies.value.slice(start, start + pagin.value.size)
  })

  // Mantener el total en sincronia con el filtro es lo que hace que el paginador
  // no ofrezca paginas vacias.
  const totalFiltered = computed(() => filteredCompanies.value.length)

  // === KPIs (sobre el universo, no sobre la pagina) ===
  // Cuentan con el MISMO predicado que la pestaña homónima: si el KPI dijera 44
  // y la vista mostrara 60, el tablero deja de servir. Por eso no hay filtros
  // repetidos aca, se reusa COMPANY_VIEWS.
  const kpis = computed(() => ({
    total: companies.value.length,
    withContract: countByView('with_contract'),
    noContact: countByView('no_contact'),
    unclassified: countByView('unclassified')
  }))

  function countByView (key) {
    return companies.value.filter(viewMatcher(key)).length
  }

  // === Chips ===
  const activeFilterChips = computed(() => {
    const chips = []
    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` })
    if (colFilters.razon) chips.push({ key: 'razon', label: `Razón social: ${colFilters.razon}` })
    if (colFilters.documento) chips.push({ key: 'documento', label: `RUC: ${colFilters.documento}` })
    if (colFilters.contacto) chips.push({ key: 'contacto', label: `Contacto: ${colFilters.contacto}` })
    if (colFilters.sector.length) chips.push({ key: 'sector', label: `Sector (${colFilters.sector.length})`, details: colFilters.sector })
    if (colFilters.clasificacion.length) chips.push({ key: 'clasificacion', label: `Clasificación (${colFilters.clasificacion.length})`, details: colFilters.clasificacion })
    if (colFilters.tipo.length) chips.push({ key: 'tipo', label: `Tipo (${colFilters.tipo.length})`, details: colFilters.tipo })
    if (colFilters.contratosMin !== '') chips.push({ key: 'contratosMin', label: `Contratos ≥ ${colFilters.contratosMin}` })
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
  function selectCompany (company) {
    selectedCompany.value =
      selectedCompany.value?.company_id === company?.company_id ? null : company
  }
  function clearSelection () { selectedCompany.value = null }

  // === Navegacion ===
  function goNew () { router.push({ name: 'B2BCompanyNew' }) }
  function editCompany (c) { router.push({ name: 'B2BCompanyEdit', params: { id: c.company_id } }) }
  function viewLeads (c) {
    router.push({ name: 'B2BCompanyLeads', query: { company_id: c.company_id, company_name: c.razon_social } })
  }
  // Contratos filtra por texto de empresa, no por id: se manda la razon social.
  function viewContracts (c) {
    router.push({ name: 'B2BContracts', query: { q: c.razon_social } })
  }

  // === Backend ===
  async function fetchCompanies () {
    isLoading.value = true
    try {
      const { items } = await b2bService.companyList({ page: 1, size: FETCH_SIZE })
      companies.value = items || []
    } catch (err) {
      console.error('Error cargando empresas:', err)
      companies.value = []
    } finally {
      isLoading.value = false
    }
  }

  return {
    companies, isLoading, pagin, filters, colFilters,
    savedViews, activeViewKey, applySavedView,
    filteredCompanies, pagedCompanies, totalFiltered, kpis,
    activeFilterChips, clearFilter, clearFilters, clearColFilters,
    selectedCompany, selectCompany, clearSelection,
    sectorLabel, classificationLabel, tipoLabel,
    goNew, editCompany, viewLeads, viewContracts,
    handlePaginationChange, fetchCompanies
  }
}
