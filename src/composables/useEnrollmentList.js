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
  const viewMode = ref('compact')
  const showFilterModal = ref(false)
  const pagin = ref({ size: 25, page: 1, total: 0 })

  const filters = reactive({
    q: '', order_by: 0,
    enrollment_status_ids: [], seller_agent_ids: [],
    type_program_ids: [], model_modality_ids: [],
    payment_channel_ids: [],
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
      tf(filters.seller_agent_ids, 'advisors')
      tf(filters.type_program_ids, 'program_types')
      tf(filters.model_modality_ids, 'modalities')
      tf(filters.payment_channel_ids, 'payment_channels')

      const { items, total } = await ficoService.enrollmentList(params)
      enrollments.value = items || []
      pagin.value.total = Number(total || 0)
      rebuildChips()
    } catch (err) { console.error(err); enrollments.value = [] }
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
    mc('seller_agent_ids', 'Asesor', filters.seller_agent_ids)
    mc('type_program_ids', 'Tipo', filters.type_program_ids)
    mc('model_modality_ids', 'Modalidad', filters.model_modality_ids)
    mc('payment_channel_ids', 'Canal', filters.payment_channel_ids)
    if (filters.created_range_string) chips.push({ key: 'created_range', text: `Registro: ${filters.created_range_string}`, label: `Registro: ${filters.created_range_string}` })
    if (filters.edition_range_string) chips.push({ key: 'edition_range', text: `Inicio: ${filters.edition_range_string}`, label: `Inicio: ${filters.edition_range_string}` })
    activeFilterChips.value = chips
  }

  function clearFilter (key) {
    const ak = ['enrollment_status_ids', 'seller_agent_ids', 'type_program_ids', 'model_modality_ids', 'payment_channel_ids']
    if (key === 'q') filters.q = ''
    else if (key === 'created_range') { filters.date_from = null; filters.date_to = null; filters.created_range_string = null }
    else if (key === 'edition_range') { filters.edition_start_from = null; filters.edition_start_to = null; filters.edition_range_string = null }
    else if (ak.includes(key)) filters[key] = []
    applyFilters()
  }

  function clearFilters () {
    Object.assign(filters, { q: '', order_by: 0, enrollment_status_ids: [], seller_agent_ids: [], type_program_ids: [], model_modality_ids: [], payment_channel_ids: [], date_from: null, date_to: null, created_range_string: null, edition_start_from: null, edition_start_to: null, edition_range_string: null })
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

  return {
    enrollments, viewMode, showFilterModal, pagin, filters,
    filtroStatus, filtroTiposPrograma, filtroModalidad, filtroPaymentChannel,
    filtroOwners, activeFilterChips, filtroOrden,
    colFilters, clearColFilters, uniqueAgents, uniqueEstados, filteredEnrollments,
    fetchEnrollments, handlePaginationChange, openFilterModal, applyFilters,
    handleDateChange, clearFilter, clearFilters, loadOwners, goNew
  }
}
