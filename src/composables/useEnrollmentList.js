import { ref, reactive, computed, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import { useTablePersistence } from '@/composables/useTablePersistence'

export function useEnrollmentList () {
  const ficoService = inject(ServiceKeys.Fico)
  const catalog = inject('catalog')
  const router = useRouter()

  const enrollments = ref([])
  const isLoading = ref(false)
  const viewMode = ref('compact')
  const showFilterModal = ref(false)
  const pagin = ref({ size: 25, page: 1, total: 0 })
  const selectedEnrollment = ref(null)
  const activeViewKey = ref('all')

  const filters = reactive({
    q: '', order_by: 0,
    enrollment_status_ids: [], seller_agent_ids: [],
    type_program_ids: [], model_modality_ids: [],
    program_version_ids: [], edition_num_ids: [],
    payment_channel_ids: [],
    confirmations: [],
    date_from: null, date_to: null, created_range_string: null,
    edition_start_from: null, edition_start_to: null, edition_range_string: null,
    payment_from: null, payment_to: null, payment_range_string: null
  })

  const filtroStatus = ref(catalog.options('we_enrollment_status') || [])

  // Filtro view-aware:
  //  - Compact (vista operativa de FICO): solo alumnos en estado Activo.
  //  - Expanded (vista de reporte): todos los estados (Activo, SEG, R, etc.).
  //
  // Mando multiples variantes de capitalizacion porque el view de Postgres
  // ('vw_enrollment_report_system' / columna "ESTADO ALUMNO") ha tenido en distintas
  // versiones 'Activo', 'ACTIVO', y 'activo'. El IN del SP matchea string exacto,
  // asi que mandar las 3 cubre cualquier caso. Si solo una corresponde, las otras
  // simplemente no aportan filas pero tampoco rompen.
  function applyCompactViewFilter () {
    filters.enrollment_status_ids = [
      { id: null, description: 'Activo' },
      { id: null, description: 'ACTIVO' },
      { id: null, description: 'activo' }
    ]
  }

  function applyExpandedViewFilter () {
    filters.enrollment_status_ids = []
  }

  function applyDefaultActiveOnly () {
    if (filters.enrollment_status_ids.length > 0) return
    applyCompactViewFilter()
  }
  const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
  const filtroModalidad = ref(catalog.options('we_modality') || [])
  const filtroPaymentChannel = ref(catalog.options('we_payment_channel') || [])
  const filtroOwners = ref([])
  const activeFilterChips = ref([])
  const filtroOrden = ref([{ value: 0, description: 'Mas recientes' }, { value: 1, description: 'Inicio de Edicion' }])

  // Catalogos de Programa y Edicion para la cascada Tipo -> Modalidad -> Programa -> Edicion.
  // Se cargan una sola vez (lazy, al abrir el modal de filtros) y se filtran client-side.
  const allProgramVersions = ref([])
  const allEditions = ref([])
  const catalogsLoaded = ref(false)
  const programService = inject(ServiceKeys.Program)
  const editionService = inject(ServiceKeys.Edition)

  // Formatea ISO 'YYYY-MM-DD...' -> 'DD/MM/YYYY' por componentes para evitar TZ shift.
  function fmtStartDate (iso) {
    if (!iso) return 'Sin fecha'
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso)
  }

  async function ensureFilterCatalogs () {
    if (catalogsLoaded.value) return
    // programVersionCaller es publico (sin role gate); programVersionList requiere
    // ALL_PRODUCTO/ALL_COMERCIAL y rompe para usuarios FICO puros. Cada catalogo
    // se carga de forma independiente para que el fallo de uno no anule el otro.
    const [pvRes, edRes] = await Promise.allSettled([
      programService.programVersionCaller({ active: 'Y' }),
      editionService.editionList({ active: 'Y', size: 5000 })
    ])

    if (pvRes.status === 'fulfilled') {
      const pvItems = pvRes.value || []
      allProgramVersions.value = pvItems.map(p => ({
        id: p.program_version_id,
        description: `${p.version_code} - ${p.abbreviation || p.program_name || ''}`.trim(),
        cat_type_program: p.cat_type_program,
        cat_model_modality: p.cat_model_modality
      }))
    } else {
      console.error('[useEnrollmentList] Error cargando program versions:', pvRes.reason)
    }

    if (edRes.status === 'fulfilled') {
      const ed = edRes.value
      allEditions.value = (ed?.items || []).map(e => ({
        id: e.edition_num_id,
        description: `${e.global_code || 'E?'} - ${fmtStartDate(e.start_date)}`,
        program_version_id: e.program_version_id
      }))
    } else {
      console.error('[useEnrollmentList] Error cargando editions:', edRes.reason)
    }

    // Marcamos como cargado incluso si uno fallo: el usuario ve los catalogos
    // disponibles, evitamos reintentar en loop y el log queda con el error real.
    catalogsLoaded.value = true
  }

  // MultiSelect emite items en shape { value, label, raw }, donde `value` es el
  // id que mapeamos. Para comparar contra catalogos en cascada usamos `.value`.
  const idsFrom = (arr) => (arr || []).map(x => x?.value ?? x?.id).filter(v => v !== undefined && v !== null)

  // filtroProgramas en cascada: si hay tipos/modalidades elegidos, recortar.
  // Si no hay nada elegido, mostrar todos los cursos activos.
  const filtroProgramas = computed(() => {
    const typeIds = idsFrom(filters.type_program_ids)
    const modIds = idsFrom(filters.model_modality_ids)
    return allProgramVersions.value.filter(p => {
      if (typeIds.length && !typeIds.includes(p.cat_type_program)) return false
      if (modIds.length && !modIds.includes(p.cat_model_modality)) return false
      return true
    })
  })

  // filtroEdiciones depende de los programas elegidos. Sin programa, sin opciones.
  const filtroEdiciones = computed(() => {
    const pvIds = idsFrom(filters.program_version_ids)
    if (pvIds.length === 0) return []
    return allEditions.value.filter(e => pvIds.includes(e.program_version_id))
  })

  // Cascada de purga: cuando un filtro padre cambia, retiramos del hijo cualquier
  // seleccion que ya no este en su nueva lista de opciones. Sin esto, el usuario
  // veria chips colgados con valores que no aplican al estado actual.
  //
  // Guard `catalogsLoaded`: los catalogos de Programa/Edicion son lazy (solo al
  // abrir el modal). Al volver de un detalle, useTablePersistence restaura los
  // filtros con Object.assign, lo que reasigna type_program_ids/model_modality_ids
  // a nuevas refs y dispara este watch ANTES de que el catalogo exista. Con la lista
  // vacia, validIds queda vacio y purgaria la seleccion restaurada (el bug: el
  // filtro Programa/Curso se "desactivaba" al regresar). Sin catalogo no hay base
  // para invalidar nada, asi que no purgamos hasta tenerlo cargado.
  watch([() => filters.type_program_ids, () => filters.model_modality_ids], () => {
    if (!catalogsLoaded.value) return
    const validIds = new Set(filtroProgramas.value.map(p => p.id))
    filters.program_version_ids = (filters.program_version_ids || []).filter(p => validIds.has(p?.value ?? p?.id))
  })
  watch(() => filters.program_version_ids, () => {
    if (!catalogsLoaded.value) return
    const validIds = new Set(filtroEdiciones.value.map(e => e.id))
    filters.edition_num_ids = (filters.edition_num_ids || []).filter(e => validIds.has(e?.value ?? e?.id))
  })

  const { saveState } = useTablePersistence('fico_enrollments_state_v3', filters, pagin)

  const colFilters = reactive({
    alumno: '',
    programa: '',
    fPago: '',
    agente: [],
    tipoPago: [],
    estado: []
  })
  let _colDebounce = null

  function clearColFilters () {
    Object.assign(colFilters, { alumno: '', programa: '', fPago: '', agente: [], tipoPago: [], estado: [] })
    filters.q = ''
    pagin.value.page = 1
    fetchEnrollments()
  }

  watch([() => colFilters.alumno, () => colFilters.programa], () => {
    clearTimeout(_colDebounce)
    _colDebounce = setTimeout(() => {
      const parts = []
      if (colFilters.alumno?.trim()) parts.push(colFilters.alumno.trim())
      if (colFilters.programa?.trim()) parts.push(colFilters.programa.trim())
      filters.q = parts.join(' ')
      pagin.value.page = 1
      fetchEnrollments()
    }, 400)
  })

  // Filtro de columna ESTADO FICO: server-side (todas las paginas).
  // Sincroniza colFilters.estado -> filters.confirmations y refetch. El guard
  // evita doble fetch cuando applySavedView ya seteo confirmations en paralelo.
  watch(() => [...colFilters.estado], (newVal) => {
    const current = (filters.confirmations || []).map(c => c?.description || c)
    const same = newVal.length === current.length && newVal.every(v => current.includes(v))
    if (same) return
    filters.confirmations = newVal.map(d => ({ description: d }))
    pagin.value.page = 1
    fetchEnrollments()
  })

  const uniqueAgents = computed(() => [...new Set(enrollments.value.map(e => e.seller_agent_name).filter(Boolean))].sort())
  const uniqueEstados = computed(() => [...new Set(enrollments.value.map(e => e.confirmation || 'Pendiente').filter(Boolean))].sort())

  const filteredEnrollments = computed(() => {
    let list = enrollments.value
    if (colFilters.agente.length) list = list.filter(e => colFilters.agente.includes(e.seller_agent_name || '(Vacío)'))
    if (colFilters.fPago?.trim()) {
      const q = colFilters.fPago.trim().toLowerCase()
      list = list.filter(e => (e.pay_date || '').toLowerCase().includes(q))
    }
    if (colFilters.tipoPago.length) {
      list = list.filter(e => {
        const tipo = (e.payment_type === 'PT') ? 'Al contado' : 'Cuotas'
        return colFilters.tipoPago.includes(tipo)
      })
    }
    // colFilters.estado ya no filtra aqui — es server-side via filters.confirmations
    return list
  })

  function getLabels (items) {
    if (!items || items.length === 0) return []
    if (typeof items[0] === 'object') return items.map(i => i.description || i.label || i.abbreviation || String(i.id))
    return items.map(String)
  }

  async function fetchEnrollments () {
    isLoading.value = true
    try {
      const params = { page: pagin.value.page, size: pagin.value.size }
      if (filters.q) params.q = filters.q
      if (filters.order_by) params.order_by = filters.order_by
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      if (filters.edition_start_from) params.edition_start_from = filters.edition_start_from
      if (filters.edition_start_to) params.edition_start_to = filters.edition_start_to
      if (filters.payment_from) params.payment_from = filters.payment_from
      if (filters.payment_to) params.payment_to = filters.payment_to

      const tf = (arr, key) => { const labels = getLabels(arr); if (labels.length) params[key] = labels }
      tf(filters.enrollment_status_ids, 'student_statuses')
      tf(filters.confirmations, 'confirmations')
      tf(filters.seller_agent_ids, 'advisors')
      tf(filters.type_program_ids, 'program_types')
      tf(filters.model_modality_ids, 'modalities')
      tf(filters.payment_channel_ids, 'payment_channels')
      // IDs numericos para Programa/Edicion: el SP filtra por PK, no por label.
      // MultiSelect emite { value, label, raw } -> idsFrom() extrae el value.
      const pvIds = idsFrom(filters.program_version_ids)
      if (pvIds.length) params.program_version_ids = pvIds
      const edIds = idsFrom(filters.edition_num_ids)
      if (edIds.length) params.edition_num_ids = edIds

      const { items, total } = await ficoService.enrollmentList(params)
      enrollments.value = items || []
      pagin.value.total = Number(total || 0)
      rebuildChips()
    } catch (err) {
      console.error(err)
      enrollments.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Recarga forzada (botón "Recargar"): pide al backend regenerar la vista
  // materializada y ESPERA a que termine, luego refetch. Así el listado muestra
  // todo actualizado de una, sin depender del cron de 2 min ni de la MV vieja.
  async function forceRefresh () {
    isLoading.value = true
    try {
      await ficoService.refreshEnrollmentList()
    } catch (err) {
      console.error('[forceRefresh] No se pudo regenerar la vista materializada:', err)
    } finally {
      await fetchEnrollments() // reconcilia y apaga isLoading al terminar
    }
  }

  function handlePaginationChange () { saveState(); fetchEnrollments() }
  function openFilterModal () { showFilterModal.value = true; ensureFilterCatalogs() }
  function applyFilters () { showFilterModal.value = false; pagin.value.page = 1; saveState(); fetchEnrollments() }

  function handleDateChange (dateStr, type) {
    if (!dateStr) {
      if (type === 'created') { filters.date_from = null; filters.date_to = null }
      if (type === 'edition') { filters.edition_start_from = null; filters.edition_start_to = null }
      if (type === 'payment') { filters.payment_from = null; filters.payment_to = null }
      return
    }
    // El locale Spanish de flatpickr usa ' a ' como rangeSeparator; el ingles
    // usa ' to '. Un single-date no tiene separador. Aceptamos los tres casos.
    const p = String(dateStr).split(/\s+(?:to|a)\s+/i)
    if (type === 'created') { filters.date_from = p[0] || null; filters.date_to = p[1] || p[0] || null }
    if (type === 'edition') { filters.edition_start_from = p[0] || null; filters.edition_start_to = p[1] || p[0] || null }
    if (type === 'payment') { filters.payment_from = p[0] || null; filters.payment_to = p[1] || p[0] || null }
  }

  function rebuildChips () {
    const chips = []
    const mc = (key, lbl, items) => {
      if (!items || !items.length) return
      const ls = items.map(i => i.label || i.description || i.abbreviation || i.value || i)
      chips.push({ key, label: ls.length === 1 ? `${lbl}: ${ls[0]}` : `${lbl}: ${ls.length} sel.`, text: `${lbl}: ${ls.join(', ')}`, details: ls })
    }
    if (filters.q) chips.push({ key: 'q', text: `Busqueda: ${filters.q}`, label: `Busqueda: ${filters.q}` })
    mc('enrollment_status_ids', 'Estado', filters.enrollment_status_ids)
    mc('confirmations', 'Confirmacion', filters.confirmations)
    mc('seller_agent_ids', 'Asesor', filters.seller_agent_ids)
    mc('type_program_ids', 'Tipo', filters.type_program_ids)
    mc('model_modality_ids', 'Modalidad', filters.model_modality_ids)
    mc('program_version_ids', 'Programa', filters.program_version_ids)
    mc('edition_num_ids', 'Edicion', filters.edition_num_ids)
    mc('payment_channel_ids', 'Canal', filters.payment_channel_ids)
    if (filters.created_range_string) chips.push({ key: 'created_range', text: `Registro: ${filters.created_range_string}`, label: `Registro: ${filters.created_range_string}` })
    if (filters.edition_range_string) chips.push({ key: 'edition_range', text: `Inicio: ${filters.edition_range_string}`, label: `Inicio: ${filters.edition_range_string}` })
    if (filters.payment_range_string) chips.push({ key: 'payment_range', text: `F.Pago: ${filters.payment_range_string}`, label: `F.Pago: ${filters.payment_range_string}` })
    activeFilterChips.value = chips
  }

  function clearFilter (key) {
    const ak = ['enrollment_status_ids', 'seller_agent_ids', 'type_program_ids', 'model_modality_ids', 'program_version_ids', 'edition_num_ids', 'payment_channel_ids', 'confirmations']
    if (key === 'q') filters.q = ''
    else if (key === 'created_range') { filters.date_from = null; filters.date_to = null; filters.created_range_string = null }
    else if (key === 'edition_range') { filters.edition_start_from = null; filters.edition_start_to = null; filters.edition_range_string = null }
    else if (key === 'payment_range') { filters.payment_from = null; filters.payment_to = null; filters.payment_range_string = null }
    else if (ak.includes(key)) filters[key] = []
    if (key === 'confirmations') colFilters.estado = []
    applyFilters()
  }

  function clearFilters () {
    Object.assign(filters, { q: '', order_by: 0, enrollment_status_ids: [], seller_agent_ids: [], type_program_ids: [], model_modality_ids: [], program_version_ids: [], edition_num_ids: [], payment_channel_ids: [], confirmations: [], date_from: null, date_to: null, created_range_string: null, edition_start_from: null, edition_start_to: null, edition_range_string: null, payment_from: null, payment_to: null, payment_range_string: null })
    colFilters.estado = []
    pagin.value.page = 1; saveState(); fetchEnrollments()
  }

  // Carga el catalogo de "Asesor" desde el endpoint dedicado que devuelve los
  // nombres distintos tal y como aparecen en la columna "Asesor" del listado:
  // canales (B2B, WEB, SA), asesores solos (AE30) y combinaciones (B2B - AE30).
  // Cargar userList aqui pierde los canales sin user_id y deja al filtro mostrando
  // un formato distinto al de la columna; el SP no matchearia nada al filtrar.
  async function loadOwners () {
    try {
      const arr = await ficoService.enrollmentAdvisorsList()
      filtroOwners.value = (arr || []).map(name => ({ id: name, description: name }))
    } catch (e) { console.error(e) }
  }

  function goNew () { router.push({ name: 'enrollmentForm' }) }

  // === Row selection (for split-view side panel) ===
  function selectEnrollment (e) {
    selectedEnrollment.value = (selectedEnrollment.value?.enrollment_id === e?.enrollment_id) ? null : e
  }
  function clearSelection () { selectedEnrollment.value = null }

  // === Daily KPIs (today vs yesterday — separate from page data) ===
  // El backend agrega con COUNT FILTER en sp_fico_kpis_daily (~250ms vs los
  // ~13s que tardaba antes reusando enrollmentList(size=200) x2). El SP define
  // confirmed = cat_fico_status alias 'we_enrollment_status_checked' y
  // pending = 'we_enrollment_status_pending' o cat_fico_status NULL — misma
  // semantica que la columna "CONFIRMACION" del listado.
  const kpisDaily = ref({
    today: { total: 0, pending: 0, confirmed: 0, amount: 0 },
    yesterday: { total: 0, pending: 0, confirmed: 0, amount: 0 },
    loading: false,
    loadedAt: null,
    error: null
  })

  function isoDate (d) {
    // Use Lima local date (UTC-5) to match backend timezone, not browser UTC.
    const ms = d.getTime() - (5 * 60 * 60 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }

  async function fetchKpisDaily () {
    kpisDaily.value.loading = true
    kpisDaily.value.error = null
    try {
      const today = isoDate(new Date())
      const yesterday = isoDate(new Date(Date.now() - 86400000))
      const data = await ficoService.getKpisDaily(today, yesterday)
      kpisDaily.value = {
        today: data?.today || { total: 0, pending: 0, confirmed: 0, amount: 0 },
        yesterday: data?.yesterday || { total: 0, pending: 0, confirmed: 0, amount: 0 },
        loading: false,
        loadedAt: new Date(),
        error: null
      }
    } catch (e) {
      console.error('KPIs diarios fallaron', e)
      // Marcamos los buckets con null para que el UI muestre "—" (isMissing) en
      // vez de "0" — un cero seria indistinguible de "0 inscripciones reales".
      kpisDaily.value = {
        today: { total: null, pending: null, confirmed: null, amount: null },
        yesterday: { total: null, pending: null, confirmed: null, amount: null },
        loading: false,
        loadedAt: null,
        error: e?.message || 'error'
      }
    }
  }

  // === Saved views ===
  // Filter on `confirmations` (CONFIRMACIÓN column) — that's where FICO's
  // real workflow states live ("Pendiente Revisar" / "Aprobado").
  // Date views complement the workflow with daily/weekly windows.
  const savedViews = computed(() => {
    const today = isoDate(new Date())
    const weekAgo = isoDate(new Date(Date.now() - 6 * 86400000))
    return [
      { key: 'all',      label: 'Todos',        icon: 'fa-list',           filters: {}, highlight: true },
      { key: 'pending',  label: 'Por revisar',  icon: 'fa-hourglass-half', filters: { confirmations: [{ description: 'Pendiente Revisar' }] } },
      { key: 'approved', label: 'Aprobadas',    icon: 'fa-circle-check',   filters: { confirmations: [{ description: 'Aprobado' }] } },
      { key: 'today',    label: 'Hoy (todo)',   icon: 'fa-calendar-day',   filters: { date_from: today, date_to: today, created_range_string: today } },
      { key: 'week',     label: 'Esta semana',  icon: 'fa-calendar-week',  filters: { date_from: weekAgo, date_to: today, created_range_string: `${weekAgo} to ${today}` } }
    ]
  })

  function applySavedView (key) {
    const view = savedViews.value.find(v => v.key === key)
    if (!view) return
    activeViewKey.value = key
    Object.assign(filters, {
      q: '', order_by: 0,
      enrollment_status_ids: [], seller_agent_ids: [],
      type_program_ids: [], model_modality_ids: [],
      program_version_ids: [], edition_num_ids: [],
      payment_channel_ids: [],
      confirmations: [],
      date_from: null, date_to: null, created_range_string: null,
      edition_start_from: null, edition_start_to: null, edition_range_string: null,
      payment_from: null, payment_to: null, payment_range_string: null
    })
    Object.assign(filters, view.filters)
    // Mantener el badge del funnel ESTADO FICO sincronizado con la saved view.
    // El watch de colFilters.estado ve que ya estan iguales y no dispara refetch.
    colFilters.estado = (filters.confirmations || []).map(c => c?.description || c)
    pagin.value.page = 1
    saveState()
    fetchEnrollments()
  }

  return {
    enrollments, isLoading, viewMode, showFilterModal, pagin, filters,
    filtroStatus, filtroTiposPrograma, filtroModalidad, filtroPaymentChannel,
    filtroProgramas, filtroEdiciones, ensureFilterCatalogs,
    filtroOwners, activeFilterChips, filtroOrden,
    colFilters, clearColFilters, uniqueAgents, uniqueEstados, filteredEnrollments,
    fetchEnrollments, forceRefresh, handlePaginationChange, openFilterModal, applyFilters,
    handleDateChange, clearFilter, clearFilters, loadOwners, goNew,
    selectedEnrollment, selectEnrollment, clearSelection,
    kpisDaily, fetchKpisDaily, savedViews, activeViewKey, applySavedView,
    applyDefaultActiveOnly, applyCompactViewFilter, applyExpandedViewFilter
  }
}
