import { ref, reactive, computed, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import { useTablePersistence } from '@/composables/useTablePersistence'

export function useEnrollmentList () {
  const ficoService = inject(ServiceKeys.Fico)
  const authService = inject(ServiceKeys.Auth)
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
    payment_channel_ids: [],
    confirmations: [],
    date_from: null, date_to: null, created_range_string: null,
    edition_start_from: null, edition_start_to: null, edition_range_string: null
  })

  const filtroStatus = ref(catalog.options('we_enrollment_status') || [])
  const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
  const filtroModalidad = ref(catalog.options('we_modality') || [])
  const filtroPaymentChannel = ref(catalog.options('we_payment_channel') || [])
  const filtroOwners = ref([])
  const activeFilterChips = ref([])
  const filtroOrden = ref([{ value: 0, description: 'Mas recientes' }, { value: 1, description: 'Inicio de Edicion' }])

  const { saveState } = useTablePersistence('fico_enrollments_state_v3', filters, pagin)

  const colFilters = reactive({ alumno: '', programa: '', agente: null, fPago: '', tipoPago: null, estado: null })
  let _colDebounce = null

  function clearColFilters () {
    Object.assign(colFilters, { alumno: '', programa: '', agente: null, fPago: '', tipoPago: null, estado: null })
    filters.q = ''
    pagin.value.page = 1
    fetchEnrollments()
  }

  watch([() => colFilters.alumno, () => colFilters.programa, () => colFilters.fPago], () => {
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

  const uniqueAgents = computed(() => [...new Set(enrollments.value.map(e => e.seller_agent_name).filter(Boolean))].sort())
  const uniqueEstados = computed(() => [...new Set(enrollments.value.map(e => e.confirmation || 'Pendiente').filter(Boolean))].sort())

  const filteredEnrollments = computed(() => {
    let list = enrollments.value
    if (colFilters.agente) list = list.filter(e => (e.seller_agent_name || '') === colFilters.agente)
    if (colFilters.fPago?.trim()) {
      const q = colFilters.fPago.trim().toLowerCase()
      list = list.filter(e => (e.pay_date || '').toLowerCase().includes(q))
    }
    if (colFilters.tipoPago) {
      const isContado = colFilters.tipoPago === 'Al contado'
      list = list.filter(e => (e.payment_type === 'PT') === isContado)
    }
    if (colFilters.estado) list = list.filter(e => (e.confirmation || 'Pendiente') === colFilters.estado)
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

      const tf = (arr, key) => { const labels = getLabels(arr); if (labels.length) params[key] = labels }
      tf(filters.enrollment_status_ids, 'student_statuses')
      tf(filters.confirmations, 'confirmations')
      tf(filters.seller_agent_ids, 'advisors')
      tf(filters.type_program_ids, 'program_types')
      tf(filters.model_modality_ids, 'modalities')
      tf(filters.payment_channel_ids, 'payment_channels')

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

  function handlePaginationChange () { saveState(); fetchEnrollments() }
  function openFilterModal () { showFilterModal.value = true }
  function applyFilters () { showFilterModal.value = false; pagin.value.page = 1; saveState(); fetchEnrollments() }

  function handleDateChange (dateStr, type) {
    if (!dateStr) {
      if (type === 'created') { filters.date_from = null; filters.date_to = null }
      if (type === 'edition') { filters.edition_start_from = null; filters.edition_start_to = null }
      return
    }
    const p = dateStr.split(' to ')
    if (type === 'created') { filters.date_from = p[0] || null; filters.date_to = p[1] || p[0] || null }
    if (type === 'edition') { filters.edition_start_from = p[0] || null; filters.edition_start_to = p[1] || p[0] || null }
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
    mc('payment_channel_ids', 'Canal', filters.payment_channel_ids)
    if (filters.created_range_string) chips.push({ key: 'created_range', text: `Registro: ${filters.created_range_string}`, label: `Registro: ${filters.created_range_string}` })
    if (filters.edition_range_string) chips.push({ key: 'edition_range', text: `Inicio: ${filters.edition_range_string}`, label: `Inicio: ${filters.edition_range_string}` })
    activeFilterChips.value = chips
  }

  function clearFilter (key) {
    const ak = ['enrollment_status_ids', 'seller_agent_ids', 'type_program_ids', 'model_modality_ids', 'payment_channel_ids', 'confirmations']
    if (key === 'q') filters.q = ''
    else if (key === 'created_range') { filters.date_from = null; filters.date_to = null; filters.created_range_string = null }
    else if (key === 'edition_range') { filters.edition_start_from = null; filters.edition_start_to = null; filters.edition_range_string = null }
    else if (ak.includes(key)) filters[key] = []
    applyFilters()
  }

  function clearFilters () {
    Object.assign(filters, { q: '', order_by: 0, enrollment_status_ids: [], seller_agent_ids: [], type_program_ids: [], model_modality_ids: [], payment_channel_ids: [], confirmations: [], date_from: null, date_to: null, created_range_string: null, edition_start_from: null, edition_start_to: null, edition_range_string: null })
    pagin.value.page = 1; saveState(); fetchEnrollments()
  }

  async function loadOwners () {
    try {
      const arr = await authService.userList({})
      filtroOwners.value = arr.map(u => {
        const f = (u.first_name || '').trim(), l = (u.last_name || '').trim()
        let n = f; if (l) n += ` ${l.charAt(0)}.`
        return { id: u.user_id, description: n.trim() || `Usuario ${u.user_id}` }
      })
    } catch (e) { console.error(e) }
  }

  function goNew () { router.push({ name: 'enrollmentForm' }) }

  // === Row selection (for split-view side panel) ===
  function selectEnrollment (e) {
    selectedEnrollment.value = (selectedEnrollment.value?.enrollment_id === e?.enrollment_id) ? null : e
  }
  function clearSelection () { selectedEnrollment.value = null }

  // === Daily KPIs (today vs yesterday — separate from page data) ===
  // Confirmada = el sistema marco la inscripcion como aprobada/confirmada.
  // Cubre los textos reales que vienen de BD: "Aprobado", "Confirmado", etc.
  // Esta misma logica se usa en useEnrollmentFormatters.statusPill para el pill verde.
  const isConfirmed = e => {
    const s = (e.confirmation || '').toLowerCase()
    return s.includes('confirm') || s.includes('aprob')
  }
  // Pendiente = no esta confirmada y/o tiene "Pendiente" en el texto.
  // Excluye explicitamente las confirmadas para evitar doble-conteo si "Pendiente Revisar"
  // y otra variante extrana convivieran.
  const isPending = e => {
    if (isConfirmed(e)) return false
    const s = (e.confirmation || '').toLowerCase()
    return !s || s.includes('pendiente')
  }

  function computeKpis (items, total, hasFullSample) {
    const t = total != null ? total : items.length
    if (!hasFullSample) {
      return { total: t, pending: null, confirmed: null, amount: null, partial: true }
    }
    return {
      total: t,
      pending: items.filter(isPending).length,
      confirmed: items.filter(isConfirmed).length,
      // Monto neto: total comprometido a cobrar hoy (incluye confirmadas + pendientes).
      // No filtra por confirmacion porque "neto" se interpreta como total facturado.
      amount: items.reduce((s, e) => s + Number(e.total_to_pay || 0), 0),
      partial: false
    }
  }

  const kpisDaily = ref({
    today: { total: 0, pending: 0, confirmed: 0, amount: 0, partial: false },
    yesterday: { total: 0, pending: 0, confirmed: 0, amount: 0, partial: false },
    loading: false,
    loadedAt: null,
    error: null
  })

  function isoDate (d) {
    // Use Lima local date (UTC-5) to match backend timezone, not browser UTC.
    const ms = d.getTime() - (5 * 60 * 60 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }

  // Degrade size on timeout so we never block the UI on a slow stored proc.
  async function safeFetchForDate (date) {
    for (const size of [200, 50, 1]) {
      try {
        const r = await ficoService.enrollmentList({ date_from: date, date_to: date, page: 1, size })
        return { items: r.items || [], total: r.total || 0, hasFullSample: size > 1 }
      } catch (err) {
        if (size === 1) {
          console.warn('[KPIs] all fallback sizes failed for', date, err?.message)
          return { items: [], total: 0, hasFullSample: false }
        }
      }
    }
  }

  async function fetchKpisDaily () {
    kpisDaily.value.loading = true
    kpisDaily.value.error = null
    try {
      const today = isoDate(new Date())
      const yesterday = isoDate(new Date(Date.now() - 86400000))
      // Sequential: avoid hammering the DB pool while the main fetch is also alive.
      const t = await safeFetchForDate(today)
      const y = await safeFetchForDate(yesterday)
      kpisDaily.value = {
        today: computeKpis(t.items, t.total, t.hasFullSample),
        yesterday: computeKpis(y.items, y.total, y.hasFullSample),
        loading: false,
        loadedAt: new Date(),
        error: null
      }
    } catch (e) {
      console.error('KPIs diarios fallaron', e)
      kpisDaily.value.loading = false
      kpisDaily.value.error = e?.message || 'error'
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
      { key: 'all',      label: 'Todos',        icon: 'fa-list',           filters: {} },
      { key: 'pending',  label: 'Por revisar',  icon: 'fa-hourglass-half', filters: { confirmations: [{ description: 'Pendiente Revisar' }] } },
      { key: 'approved', label: 'Aprobadas',    icon: 'fa-circle-check',   filters: { confirmations: [{ description: 'Aprobado' }] } },
      { key: 'today',    label: 'Hoy',          icon: 'fa-calendar-day',   filters: { date_from: today, date_to: today, created_range_string: today } },
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
      type_program_ids: [], model_modality_ids: [], payment_channel_ids: [],
      confirmations: [],
      date_from: null, date_to: null, created_range_string: null,
      edition_start_from: null, edition_start_to: null, edition_range_string: null
    })
    Object.assign(filters, view.filters)
    pagin.value.page = 1
    saveState()
    fetchEnrollments()
  }

  return {
    enrollments, isLoading, viewMode, showFilterModal, pagin, filters,
    filtroStatus, filtroTiposPrograma, filtroModalidad, filtroPaymentChannel,
    filtroOwners, activeFilterChips, filtroOrden,
    colFilters, clearColFilters, uniqueAgents, uniqueEstados, filteredEnrollments,
    fetchEnrollments, handlePaginationChange, openFilterModal, applyFilters,
    handleDateChange, clearFilter, clearFilters, loadOwners, goNew,
    selectedEnrollment, selectEnrollment, clearSelection,
    kpisDaily, fetchKpisDaily, savedViews, activeViewKey, applySavedView
  }
}
