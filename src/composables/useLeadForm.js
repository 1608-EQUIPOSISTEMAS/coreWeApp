import { ref, reactive, computed, onMounted, onBeforeUnmount, inject, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

export function useLeadForm(options = {}) {
  const {
    businessLine     = null,
    acceptsCompany   = false,
    fixedProgramType = null,
    requiresEdition  = false,
    showInscription  = true,
    isCompanyLead    = false,
    // A donde volver tras guardar/cancelar/inscribir. Default = comercial para
    // no cambiar el comportamiento de las vistas que ya lo asumian.
    listRouteName    = 'ComercialListado',
  } = options

  // ── ROUTER / TOAST ──────────────────────────────────────────
  const router = useRouter()
  const route  = useRoute()
  const toast  = useToast()

  // ── SERVICIOS ───────────────────────────────────────────────
  const programService   = inject(ServiceKeys.Program)
  const comercialService = inject(ServiceKeys.Comercial)
  const customerService  = inject(ServiceKeys.Customer)
  const discountService  = inject(ServiceKeys.Discount)
  const editionService   = inject(ServiceKeys.Edition)
  const b2bService       = inject(ServiceKeys.B2b)
  const ficoService      = inject(ServiceKeys.Fico)
  const catalog          = inject('catalog')

  // ── USUARIO LOCAL ────────────────────────────────────────────
  const storedUserStr  = localStorage.getItem('user')
  const storedUser     = storedUserStr ? JSON.parse(storedUserStr) : null
  const isLiderComercial = storedUser?.roles?.includes('LIDER_COMERCIAL') ?? false
  const CAT_RESCHEDULE_LEADER_ID = 5002

  // ── CELULAR DE ORIGEN ────────────────────────────────────────
  // Los celulares del asesor vienen en el JWT/localStorage (storedUser.phones).
  // Un asesor con varios numeros elige con cual entro la consulta; con uno solo
  // el select queda bloqueado en ese valor.
  const sellerPhones = computed(() =>
    Array.isArray(storedUser?.phones)
      ? storedUser.phones
          .filter(p => p != null && String(p).trim() !== '')
          .map(p => ({ value: String(p), label: String(p) }))
      : []
  )
  // Un lead viejo puede traer un celular que ya no esta asignado al asesor:
  // se antepone para no perder el dato al editar.
  const sellerPhoneOptions = computed(() => {
    const base = sellerPhones.value
    // `form` se declara mas abajo: guarda por si algo evalua esto durante setup.
    let current = null
    try { current = form?.origin_seller_phone } catch { current = null }
    if (current && !base.some(p => p.value === String(current))) {
      return [{ value: String(current), label: String(current) }, ...base]
    }
    return base
  })
  const sellerPhoneLocked = computed(() => sellerPhoneOptions.value.length <= 1)

  // ── FECHAS CONFIG ────────────────────────────────────────────
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const pastDateConfig   = { minDate: sevenDaysAgo, maxDate: 'today' }
  const futureDateConfig = { minDate: 'today' }
  const dateLimitConfig  = { minDate: sevenDaysAgo }

  // ── HELPERS ──────────────────────────────────────────────────
  const todayIso = new Date().toISOString().slice(0, 16)

  function currentHourIso() {
    const now  = new Date()
    const yyyy = now.getFullYear()
    const mm   = String(now.getMonth() + 1).padStart(2, '0')
    const dd   = String(now.getDate()).padStart(2, '0')
    const hh   = String(now.getHours()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:00:00`
  }

  function normalizeDateTime(v) {
    if (!v) return ''
    const s = String(v).slice(0, 19).replace('T', ' ')
    if (/^\d{4}-\d{2}-\d{2}$/.test(s))               return `${s} 09:00:00`
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(s))  return `${s}:00`
    return s
  }

  function idByAlias(alias, list = []) {
    if (!alias) return null
    const it = list.find(i => i.alias === alias || i.raw?.alias === alias)
    return it?.id ?? null
  }

  function aliasById(id, list = []) {
    if (!id) return null
    const it = list.find(i => i.id === id || i.raw?.id === id)
    return it?.alias ?? null
  }

  const round2  = (num) => Math.round((num + Number.EPSILON) * 100) / 100
  const fmt2    = (val) => (Number(val) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function formatDate(dateString) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
    })
  }

  function formatDateTime(isoString) {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function isValidEmail(email) {
    if (!email) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).toLowerCase())
  }

  function openURL(param) {
    window.open(param, '_blank', 'noopener,noreferrer')
  }

  const getBadgeClass = (status) => {
    switch (status) {
      case 'Matriculado':       return 'bg-success'
      case 'En Seguimiento':    return 'bg-warning text-dark'
      case 'No Interesado':     return 'bg-danger'
      default:                  return 'bg-secondary'
    }
  }

  // ── CATÁLOGOS ────────────────────────────────────────────────
  const paymentChannelCatalog   = ref(catalog.options('we_payment_channel'))
  const certificateStatusCatalog = ref(catalog.options('we_certificate_status'))
  const tokenProviderCatalog    = ref(catalog.options('we_token_provider'))
  const lAttempts               = ref(catalog.options('we_attempt'))
  const leadStatusCatalog       = ref(catalog.options('we_lead_status'))
  const leadInterestCatalog     = ref(catalog.options('we_lead_interest'))
  const countryCatalog = ref(
    catalog.options('we_country', {
      mapItem: x => ({
        id: x.id,
        description: `(${String(x?.variable_2)}) - ${x.description}`,
        alias: x.alias,
        variable_3: x.variable_3,
        variable_2: x.variable_2,
        variable_1: x.variable_1,
        raw: x
      })
    })
  )
  const momentCatalog            = ref(catalog.options('we_moment'))
  const clientCatalog            = ref(catalog.options('we_client'))
  const prospectSituationCatalog = ref(
    catalog.options('we_prospect_situation', {
      mapItem: x => ({
        id: x.id,
        description: `(${String(x?.variable_1)}) - ${x.description}`,
        alias: x.alias,
        variable_3: x.variable_3,
        raw: x
      })
    })
  )
  const strategyCatalog         = ref(catalog.options('we_type_strategy'))
  const mktWordsCatalog         = ref(catalog.options('we_key_word'))
  const socialMediaCatalog      = ref(catalog.options('we_social_media'))
  const contactAttemptStatusCat = ref(catalog.options('we_follow_lead'))
  const programCategoryCatalog  = ref(catalog.options('we_program_category'))
  const queryCatalog            = ref(catalog.options('we_category_query'))
  const inscModalidades         = ref(catalog.options('we_insc_modality'))
  const discountCatalog         = ref(catalog.options('we_discount_type'))
  const paymentMethodCatalog    = ref(catalog.options('we_payment_method'))
  const docTypeCatalog          = ref(catalog.options('we_type_document'))
  const programTypeCatalog      = ref(catalog.options('we_program_type'))
  const programModalityCatalog  = ref(catalog.options('we_modality'))
  const inscPaymentModes        = ref(catalog.options('we_payment_way'))
  const callingCatalog          = ref(catalog.options('we_calling'))
  const attemptOriginCatalog    = ref(catalog.options('we_attempt_origin') || [])
  const membershipList          = ref([])
  const currencyCatalog         = ref(
    catalog.options('we_currency', {
      mapItem: x => ({
        id: x.id,
        description: `${x.code || x.abbreviation} (${x.symbol || x.prefix})`,
        alias: x.alias,
        raw: {
          code: x.code ?? x.abbreviation,
          symbol: x.symbol ?? x.prefix,
          minorUnit: x.minorUnit ?? Number(x.precision ?? 2),
          locale: x.locale ?? (x.abbreviation === 'USD' ? 'en-US' : 'es-PE'),
          decimal: x.decimal ?? '.',
          thousands: x.thousands ?? ',',
          position: x.position ?? (x.suffix ? 'suffix' : 'prefix'),
          allowNegative: x.allowNegative ?? false,
          allowZero: x.allowZero ?? true,
        }
      })
    })
  )

  // ── ESTADO GENERAL ───────────────────────────────────────────
  const inscInitialized  = ref(false)
  const loaded           = ref(false)
  const saving           = ref(false)
  const savingInsc       = ref(false)
  const showViewModal    = ref(false)
  const leadDataHistory  = ref(false)
  const createdLeadId    = ref(null)
  const createdPersonId  = ref(null)
  const showProgramDetail = ref(false)
  const selectedProgram  = ref(null)
  const activeTab        = ref('info')
  const showDeleteWarningModal = ref(false)
  const showClientHistory      = ref(false)
  const activeHistoryTab       = ref('historico')
  const clientHistoryLegacy    = ref([])
  const clientHistoryLeads     = ref([])
  const loadingHistory         = ref(false)
  const searchingCustomer      = ref(false)
  const searchingPhone         = ref(false)
  const dataSetted             = ref(null)
  const modelProgramVersion    = ref(null)
  const loadingDetail          = ref(false)
  const voucherUploaderRef     = ref(null)
  const voucherTouched         = ref(false)
  const discountResetKey       = ref(0)
  const priceManuallySet       = ref(false)
  const programs               = ref([])
  const editions               = ref([])
  const currentEdition         = ref(null)

  const hcEnrollmentData = ref([
    { fecha: '05 Dic 2025', programa: 'Power BI para Analistas', edicion: '2025-I', estado: 'En Curso',    nota: null },
    { fecha: '10 Jun 2024', programa: 'SQL Server Database',      edicion: '2024-II', estado: 'Finalizado', nota: 18 },
    { fecha: '15 Ene 2024', programa: 'Python for Data',          edicion: '2024-I',  estado: 'Finalizado', nota: 12 },
  ])

  // ── FORM ─────────────────────────────────────────────────────
  const form = reactive({
    query_alias: null,
    category_alias: null,
    program_modality_alias: null,
    fechaContactoInicial: currentHourIso(),
    origin_seller_phone: sellerPhones.value[0]?.value ?? null,
    web: false,
    program_link: null,
    count_children: 0,
    price_student_soles: 0,
    price_student_dollars: 0,
    price_profesional_soles: 0,
    price_profesional_dollars: 0,
    b2b: false,
    program_modality_selected_alias: null,
    program_version_id: null,
    cat_client_moment_alias: null,
    membership_moment_id: null,
    membership_tier_label: null,
    edition_id: null,
    link: null,
    client_status: null,
    client_status_label: null,
    enrollment_id: null,
    full_name: '',
    nombre: '',
    telefono: '',
    company_id: null,
    company_label: '',
    cat_contract_type: null,
    status_alias: null,
    country_alias: null,
    ocupacion_alias: null,
    bot: false,
    pay_date: null,
    nivel_alias: null,
    prox_medium_alias: null,
    mensajeChat: '',
    canal_alias: null,
    medium_alias: null,
    key_word_alias: null,
    strategy_alias: null,
    observacion: '',
    categoriaCliente: 'NEW',
    categoriaMember: '',
    contactos: [],
    program_sessions: 0,
    program_sessions_per_week: 1,
    edition_start_date: null,
  })

  // ── INSC ─────────────────────────────────────────────────────
  const insc = reactive({
    // Categoria de entrada del evento (VIP/GENERAL/PREMIUM/VIRTUAL).
    cat_event_category: null,
    // Asiento asignado de la entrada VIP.
    event_seat: '',
    dni: '',
    nombres: '',
    apellidos: '',
    correo: '',
    saved_money: 0,
    selectedCurrencyAlias: '',
    modalidadPrograma: 'NORMAL',
    cat_insc_modality: 'we_insc_modality_normal',
    cat_certificate_status: null,
    promocion_id: null,
    descuento_id: null,
    dsct_porcent_label: null,
    dsct_stick_label: null,
    dsct_benefit_label: null,
    cat_method_payment: null,
    modalidadPago: 'CONTADO',
    montoOriginal: 0,
    dsct_benefit_ids: [],
    val_beneficios: [],
    val_porcentaje: 0,
    val_fijo: 0,
    montoDescuentoPorcentaje: 0,
    montoDescuentoFijo: 0,
    montoBeneficioTotal: 0,
    montoFinal: 0,
    dsct_porcent_id: null,
    dsct_stick_id: null,
    dsct_benefit_id: null,
    ticket_payment_urls: [],
    attachments: [],
    cat_payment_channel: null,
    cat_token_provider: null,
    token_payment_type: '',
    agreement_id: null,
    // Correo en copia. `requires_email_cc` es un compromiso: si se marca, FICO no
    // puede enviar la confirmacion con el CC vacio (solo lo libera observando la
    // inscripcion). El correo puede ir vacio si el asesor aun no lo tiene.
    requires_email_cc: false,
    email_cc: '',
  })

  // ── COMPUTED ─────────────────────────────────────────────────
  const leadIdParam = computed(() => {
    const raw = route.params?.id
    const n   = Number(raw)
    return Number.isFinite(n) ? n : null
  })
  const isEdit = computed(() => !!leadIdParam.value)

  const isDeleteStatus = computed(() => form.status_alias === 'we_lead_status_deleted')

  const currentProgram = computed(() => {
    if (!form.program_version_id) return null
    return programs.value.find(p => p.id === form.program_version_id) || null
  })

  const hasEditions = computed(() =>
    modelProgramVersion.value?.editions_json?.length > 0
  )

  const maxPhoneLength = computed(() => {
    if (!form.country_alias) return 20
    const country = countryCatalog.value.find(c => c.alias === form.country_alias)
    return country?.raw?.variable_1 ? Number(country.raw.variable_1) : 20
  })

  const docConfig = computed(() => {
    const selected  = docTypeCatalog.value.find(item => item.alias === insc.cat_type_document)
    const maxLength = selected?.variable_1 ? Number(selected.variable_1) : 15
    const isNumeric = ['we_type_document_dni', 'we_type_document_ruc'].includes(insc.cat_type_document)
    return {
      maxLength,
      isNumeric,
      placeholder: isNumeric ? `MÁX. ${maxLength} DÍGITOS` : `MÁX. ${maxLength} CARACTERES`
    }
  })

  const selectedCurrency = computed(
    () =>
      currencyCatalog.value.find(i => i.alias === insc.selectedCurrencyAlias)?.raw ??
      { alias: 'we_currency_soles', code: 'PEN', symbol: 'S/.', minorUnit: 2, locale: 'es-PE', decimal: '.', thousands: ',', position: 'prefix', allowNegative: false, allowZero: false }
  )

  const selectedCurrencyAlias = computed(() => insc.selectedCurrencyAlias)

  const channelAlias = computed(() => {
    if (!insc.cat_payment_channel) return null
    return paymentChannelCatalog.value.find(c => c.id === insc.cat_payment_channel)?.alias ?? null
  })
  const isChannelGeneral = computed(() => channelAlias.value === 'we_channel_general')
  const isChannelToken   = computed(() => channelAlias.value === 'we_channel_token')
  const isChannelWeb     = computed(() => channelAlias.value === 'we_channel_web')

  const isVoucherOptional = computed(() =>
    !isChannelGeneral.value || Number(insc.val_porcentaje) === 100
  )

  const isMedioDisabled = computed(() =>
    ['we_social_media_coti', 'we_social_media_chatbot', 'we_social_media_wechat'].includes(form.canal_alias)
  )

  const filteredMediumCatalog = computed(() => {
    const socialList = socialMediaCatalog.value.filter(e =>
      ['we_social_media_whatsapp', 'we_social_media_wechat', 'we_social_media_msg', 'we_social_media_comment'].includes(e.alias)
    )
    const excludeWebFor = ['we_social_media_instagram', 'we_social_media_linkedin', 'we_social_media_facebook']
    if (excludeWebFor.includes(form.canal_alias)) {
      return socialList.filter(e => e.alias !== 'we_social_media_wechat')
    }
    return socialList
  })

  const clientProfileType = computed(() => {
    if (!form.ocupacion_alias) return null
    const ocupacionInfo = prospectSituationCatalog.value.find(opt => opt.alias === form.ocupacion_alias)
    return ocupacionInfo?.variable_3 || null
  })

  const calculatedBasePrice = computed(() => {
    if (!insc.selectedCurrencyAlias) return 0
    const isUSD = insc.selectedCurrencyAlias === 'we_currency_usd'
    const type  = clientProfileType.value
    if (type === 'estudiante') {
      return isUSD ? Number(form.price_student_dollars || 0) : Number(form.price_student_soles || 0)
    }
    const proPrecio = isUSD ? Number(form.price_profesional_dollars || 0) : Number(form.price_profesional_soles || 0)
    if (proPrecio > 0) return proPrecio
    return isUSD ? Number(form.price_student_dollars || 0) : Number(form.price_student_soles || 0)
  })

  const montoFinalCalculado = computed(() => {
    const base  = Number(insc.montoOriginal) || 0
    const dscto = Number(insc.totalDescuentos) || 0
    return base - dscto
  })

  const isOnlineProgram = computed(() =>
    form.program_modality_selected_alias === 'we_modality_online' &&
    form.category_alias !== 'we_program_type_membership'
  )

  // ── CATEGORIA DE ENTRADA (eventos/congresos) ─────────────────
  // Un congreso se vende por categoria y cada una tiene su propia tarifa, asi
  // que al elegirla se pisan los price_* del programa y el watcher de
  // calculatedBasePrice recalcula el monto solo.
  const eventCategories = ref([])
  const isEventProgram  = computed(() => form.category_alias === 'we_program_type_event')

  async function loadEventCategories () {
    if (!isEventProgram.value || !form.program_version_id) { eventCategories.value = []; return }
    try {
      eventCategories.value = await programService.eventCategoryList(form.program_version_id) || []
    } catch (err) {
      console.error('[loadEventCategories]', err)
      eventCategories.value = []
    }
  }

  function onEventCategoryChange (opcion) {
    // Sin tarifa propia se conserva el precio del programa: es preferible a
    // dejar la inscripcion en 0 por una categoria sin cargar.
    if (opcion?.has_price) {
      priceManuallySet.value = false
      form.price_student_soles       = Number(opcion.price_student_soles       || 0)
      form.price_student_dollars     = Number(opcion.price_student_dollars     || 0)
      form.price_profesional_soles   = Number(opcion.price_profesional_soles   || 0)
      form.price_profesional_dollars = Number(opcion.price_profesional_dollars || 0)
    }
    // Aca si corresponde avisar: ya hay categoria elegida y aun asi no hay tarifa.
    nextTick(() => {
      if (!calculatedBasePrice.value) {
        toast.warning('⚠️ La categoría seleccionada no tiene Precio Base configurado. Revísala en el programa.', { timeout: 7000, position: 'bottom-right' })
      }
    })
  }

  // Solo la entrada VIP da derecho a acompanantes: fuera de VIP el campo no se
  // muestra y lo que se haya escrito se descarta al guardar.
  const isVipCategory = computed(() => {
    const sel = eventCategories.value.find(c => c.cat_event_category === insc.cat_event_category)
    return sel?.alias === 'we_event_category_vip'
  })

  watch(() => [form.program_version_id, form.category_alias], () => {
    insc.cat_event_category = null
    insc.event_seat = ''
    loadEventCategories()
  })

  const saveBlockReason = computed(() => {
    if (!validateLeadInfo())       return 'Falta completar la información del Lead (fecha de contacto, programa, etc.)'
    if (!validateContactInfo())    return 'Falta completar los Datos del Contacto (teléfono, status, país, nombre, estado del cliente)'
    if (!validateCommercialInfo()) return 'Falta completar el Estado Comercial (nivel de interés, mensaje, canal, medio)'
    return null
  })

  const minDateForNewAttempt = computed(() => {
    const existing = form.contactos.filter(c => c.id)
    if (!existing.length) return null
    const dates = existing.map(c => new Date(c.fechaContactoProximo)).filter(d => !isNaN(d))
    if (!dates.length) return null
    const maxHistoryDate = new Date(Math.max(...dates))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return maxHistoryDate < today ? today : maxHistoryDate
  })

  // Explica por que el boton INSCRIBIR no aparece. El boton se oculta en vez de
  // deshabilitarse (comportamiento heredado de comercial), asi que sin esto el
  // asesor no tiene forma de saber que le falta.
  // Devuelve null cuando no hay nada que decir: sin programa elegido es
  // demasiado pronto para exigir nada.
  const inscriptionBlockReason = computed(() => {
    if (!showInscription || form.enrollment_id || !form.program_version_id) return null
    if (form.client_status !== 'we_client_person') {
      return 'Para inscribir, "T. Contacto" debe ser Persona: las empresas no se inscriben desde aquí.'
    }
    if (form.status_alias !== 'we_lead_status_bought') {
      return 'Para inscribir, el Status del lead debe ser "Pagó".'
    }
    if (!form.pay_date) {
      return 'Para inscribir, falta la F. Pago en "Estado Comercial y Marketing".'
    }
    return null
  })

  // ── showInscriptionButton (Opción B: única modificación al template) ──
  const showInscriptionButton = computed(() =>
    showInscription &&
    !form.enrollment_id &&
    form.status_alias === 'we_lead_status_bought' &&
    !!form.pay_date &&
    form.client_status === 'we_client_person' &&
    !!form.program_version_id
  )

  // ── TOKEN (link de pago) ─────────────────────────────────────
  // Mismo boton que comercial: status "Pagará" + persona + programa. A diferencia
  // de INSCRIBIR no exige F. Pago (justamente todavia no pago).
  const isTokenMode = ref(false)
  const showTokenButton = computed(() =>
    showInscription &&
    !form.enrollment_id &&
    form.status_alias === 'we_lead_status_will_pay' &&
    form.client_status === 'we_client_person' &&
    !!form.program_version_id
  )

  // ── PLAN DE CUOTAS ───────────────────────────────────────────
  const manualMode           = ref(false)
  const numCuotasManual      = ref(1)
  const editableInstallments = ref([])
  const reservaSplitEnabled  = ref(false)
  const reservaInmediata     = ref(0)
  const reservaDiferidaFecha = ref('')

  const isInstallmentMode = computed(() =>
    !isChannelWeb.value &&
    !!insc.cat_payment_channel &&
    insc.cat_type_payment === 'we_payment_way_installments' &&
    Number(insc.montoOriginal) > 0
  )

  const installmentRemainder = computed(() => {
    const adelantoEfectivo = reservaSplitEnabled.value
      ? (Number(reservaInmediata.value) || 0)
      : (Number(insc.saved_money) || 0)
    const rem = round2((Number(insc.total_amount) || 0) - adelantoEfectivo)
    return rem > 0 ? rem : 0
  })

  const autoNumCuotas = computed(() => {
    const type     = form.category_alias
    const spw      = form.program_sessions_per_week || 1
    const children = form.count_children || 0
    if (['we_program_type_course', 'we_program_type_minicourse'].includes(type)) return 1
    if (type === 'we_program_type_pee')     return spw >= 2 ? 2 : 3
    if (type === 'we_program_type_diploma') return spw >= 2 ? 4 : 5
    if (type === 'we_program_type_specialization') {
      if (children <= 2) return 2
      return spw >= 2 ? 2 : 3
    }
    return 1
  })

  function snapToKeyDate(afterDate, keys = [1, 15, 30]) {
    const min = new Date(afterDate)
    min.setHours(0, 0, 0, 0)
    for (let mo = 0; mo <= 4; mo++) {
      const year  = min.getFullYear()
      const month = min.getMonth() + mo
      for (const k of keys) {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const day         = Math.min(k, daysInMonth)
        const candidate   = new Date(year, month, day)
        candidate.setHours(0, 0, 0, 0)
        if (candidate >= min) return candidate
      }
    }
    return min
  }

  const autoInstallmentPlan = computed(() => {
    if (!isInstallmentMode.value) return []
    const saldo           = round2((Number(insc.total_amount) || 0) - (Number(insc.saved_money) || 0))
    const n               = autoNumCuotas.value
    const startRaw        = form.edition_start_date
    const sessionsPerWeek = form.program_sessions_per_week || 1
    const isEsp           = form.category_alias === 'we_program_type_specialization'
    const isCourse        = ['we_program_type_course', 'we_program_type_minicourse'].includes(form.category_alias)
    if (saldo <= 0 || n < 1) return []
    const cuotaBase = Math.floor(saldo / n)
    const remainder = round2(saldo - cuotaBase * n)
    const base      = startRaw ? new Date(String(startRaw).slice(0, 10) + 'T00:00:00') : new Date()
    const plan      = []
    if (isCourse) {
      const d = new Date(base); d.setDate(d.getDate() + 6)
      plan.push({ installment_number: 1, amount: round2(cuotaBase + remainder), due_date: d.toISOString().slice(0, 10) })
      return plan
    }
    if (isEsp) {
      if (sessionsPerWeek >= 2) {
        const f1 = new Date(base); f1.setDate(f1.getDate() + 15)
        for (let i = 0; i < n; i++) {
          const d = new Date(f1); d.setDate(d.getDate() + i * 20)
          plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: d.toISOString().slice(0, 10) })
        }
        return plan
      }
      const minC1 = new Date(base); minC1.setDate(minC1.getDate() + 7)
      const d1 = snapToKeyDate(minC1, [1, 15, 30])
      const minC2 = new Date(d1); minC2.setDate(minC2.getDate() + 14)
      const d2 = snapToKeyDate(minC2, [1, 15])
      const minC3 = new Date(d2); minC3.setDate(minC3.getDate() + 14)
      const d3 = snapToKeyDate(minC3, [1, 15, 30])
      const keyDates = [d1, d2, d3]
      for (let i = 0; i < n; i++) {
        plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: keyDates[i].toISOString().slice(0, 10) })
      }
      return plan
    }
    if (sessionsPerWeek >= 2) {
      const f1 = new Date(base); f1.setDate(f1.getDate() + 15)
      for (let i = 0; i < n; i++) {
        const d = new Date(f1); d.setDate(d.getDate() + i * 20)
        plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: d.toISOString().slice(0, 10) })
      }
    } else {
      const f1 = new Date(base); f1.setMonth(f1.getMonth() + 1); f1.setDate(15)
      for (let i = 0; i < n; i++) {
        let d
        if (i === 0) { d = new Date(f1) }
        else { d = new Date(f1); d.setMonth(d.getMonth() + i); d.setDate(1) }
        plan.push({ installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + remainder) : cuotaBase, due_date: d.toISOString().slice(0, 10) })
      }
    }
    return plan
  })

  const reservaDiferida = computed(() =>
    round2(Math.max(0, (Number(insc.saved_money) || 0) - (Number(reservaInmediata.value) || 0)))
  )

  const reservaSplitValid = computed(() =>
    !reservaSplitEnabled.value ||
    (Number(reservaInmediata.value) > 0 && reservaDiferida.value > 0 && !!reservaDiferidaFecha.value)
  )

  const installmentPlan = computed(() => {
    const basePlan = (manualMode.value ? editableInstallments.value : autoInstallmentPlan.value)
      .map((c, i) => ({ ...c, _editableIdx: i }))
    if (!reservaSplitEnabled.value || reservaDiferida.value <= 0 || !reservaDiferidaFecha.value) {
      return basePlan
    }
    const extraCuota = {
      installment_number: 0, amount: reservaDiferida.value,
      due_date: reservaDiferidaFecha.value, is_reserva_diferida: true, _editableIdx: -1
    }
    return [...basePlan, extraCuota]
      .sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date) - new Date(b.due_date)
      })
      .map((c, i) => ({ ...c, installment_number: i + 1 }))
  })

  const installmentTotalSum = computed(() =>
    round2((installmentPlan.value || []).reduce((acc, c) => acc + Number(c.amount || 0), 0))
  )

  const installmentPlanValid = computed(() => {
    if (!isInstallmentMode.value || installmentPlan.value.length === 0) return true
    return Math.abs(installmentTotalSum.value - installmentRemainder.value) < 0.01
  })

  // ── WATCHERS ─────────────────────────────────────────────────
  watch(() => form.web, (val) => { if (val) form.b2b = false })
  watch(() => form.b2b, (val) => { if (val) form.web = false })

  watch(showProgramDetail, (val) => { if (val) activeTab.value = 'info' })

  watch(() => insc.cat_payment_channel, () => {
    insc.cat_token_provider  = null
    insc.cat_method_payment  = null
    insc.ticket_payment_urls = []
    insc.attachments         = []
    voucherTouched.value     = false
  })

  watch(maxPhoneLength, (newMaxLength) => {
    if (form.telefono && form.telefono.length > newMaxLength) {
      form.telefono = form.telefono.slice(0, newMaxLength)
      toast.info(`El número se ajustó a ${newMaxLength} dígitos para este país.`, { timeout: 3000 })
    }
  })

  watch(() => insc.cat_type_document, (newVal) => {
    if (!newVal) {
      insc.document = ''; insc.email = ''; insc.full_name = ''; insc.last_name = ''; insc.mother_last_name = ''
      return
    }
    if (!insc.document) return
    if (docConfig.value.maxLength && insc.document.length > docConfig.value.maxLength) {
      insc.document = insc.document.slice(0, docConfig.value.maxLength)
    }
    if (docConfig.value.isNumeric && isNaN(Number(insc.document))) {
      insc.document = insc.document.replace(/\D/g, '')
    }
  })

  watch(calculatedBasePrice, (newPrice) => {
    if (!priceManuallySet.value) insc.montoOriginal = newPrice
  }, { immediate: true })

  watch(() => insc.selectedCurrencyAlias, () => {})

  watch(
    () => [insc.montoOriginal, insc.val_porcentaje, insc.val_fijo, insc.val_beneficios, insc.dsct_porcent_id, insc.dsct_stick_id, insc.dsct_benefit_ids],
    () => {
      const base = parseFloat(insc.montoOriginal) || 0
      let montoPorcentaje  = round2((base * (insc.val_porcentaje || 0)) / 100)
      let subtotalAfterPct = round2(base - montoPorcentaje)
      let montoFijo        = 0
      const promoTarget    = round2(parseFloat(insc.val_fijo) || 0)
      if (insc.dsct_stick_id && promoTarget > 0) {
        montoFijo = round2(subtotalAfterPct - promoTarget)
        if (montoFijo < 0) montoFijo = 0
      }
      const subtotalAfterStick = (insc.dsct_stick_id && promoTarget > 0) ? promoTarget : subtotalAfterPct
      const montoBeneficioTotal = round2((insc.val_beneficios || []).reduce((acc, v) => acc + (parseFloat(v) || 0), 0))
      const totalDescuentos = round2(montoPorcentaje + montoFijo + montoBeneficioTotal)
      if (totalDescuentos > base) {
        toast.warning('¡Cuidado! Los descuentos superan el Precio Base.')
        insc.val_porcentaje = 0; insc.dsct_porcent_id   = null
        insc.val_fijo       = 0; insc.dsct_stick_id     = null
        insc.val_beneficios = []; insc.dsct_benefit_ids = []
        discountResetKey.value++
        insc.montoDescuentoPorcentaje = 0; insc.montoDescuentoFijo = 0
        insc.montoBeneficioTotal = 0; insc.total_amount = base
        return
      }
      insc.montoDescuentoPorcentaje = montoPorcentaje
      insc.montoDescuentoFijo       = montoFijo
      insc.montoBeneficioTotal      = montoBeneficioTotal
      const final = round2(subtotalAfterStick - montoBeneficioTotal)
      insc.total_amount = final > 0 ? Math.floor(final) : 0
    },
    { deep: true }
  )

  watch(isInstallmentMode, (val) => {
    if (!val) {
      manualMode.value = false; editableInstallments.value = []
      reservaSplitEnabled.value = false; reservaInmediata.value = 0; reservaDiferidaFecha.value = ''
    }
  })

  watch(reservaInmediata, () => {
    if (reservaSplitEnabled.value && Number(reservaInmediata.value) >= Number(insc.saved_money)) {
      reservaInmediata.value = Math.max(0, Number(insc.saved_money) - 1)
    }
  })

  watch(reservaSplitEnabled, (val) => {
    if (val) {
      reservaInmediata.value = 0
      reservaDiferidaFecha.value = defaultDiferidaFecha()
    } else {
      reservaInmediata.value = 0; reservaDiferidaFecha.value = ''
    }
  })

  watch(() => insc.saved_money, (val) => {
    if (reservaSplitEnabled.value && Number(reservaInmediata.value) > Number(val)) {
      reservaInmediata.value = Number(val)
    }
  })

  watch(installmentRemainder, () => {
    if (manualMode.value) {
      const saldo = round2((Number(insc.total_amount) || 0) - (Number(insc.saved_money) || 0))
      const n     = editableInstallments.value.length || numCuotasManual.value
      if (saldo <= 0 || n < 1) return
      const cuotaBase = Math.floor(saldo / n)
      const rem       = round2(saldo - cuotaBase * n)
      editableInstallments.value = editableInstallments.value.map((c, i) => ({
        ...c, amount: i === n - 1 ? round2(cuotaBase + rem) : cuotaBase
      }))
      toast.warning('⚠️ Los montos del plan se recalcularon automáticamente. Las fechas que editaste se conservaron.', { timeout: 5000 })
    }
  })

  // ── FUNCIONES ─────────────────────────────────────────────────

  function defaultDiferidaFecha() {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }

  function seedEditableInstallments(n) {
    const saldo = round2((Number(insc.total_amount) || 0) - (Number(insc.saved_money) || 0))
    if (saldo <= 0 || n < 1) { editableInstallments.value = []; return }
    const cuotaBase = Math.floor(saldo / n)
    const rem       = round2(saldo - cuotaBase * n)
    const autoPlan  = autoInstallmentPlan.value
    editableInstallments.value = Array.from({ length: n }, (_, i) => {
      let due_date
      if (autoPlan[i]?.due_date) {
        due_date = autoPlan[i].due_date
      } else {
        const lastDate = autoPlan[autoPlan.length - 1]?.due_date
        const base = lastDate ? new Date(lastDate + 'T00:00:00') : new Date()
        base.setMonth(base.getMonth() + (i - autoPlan.length + 1)); base.setDate(1)
        due_date = base.toISOString().slice(0, 10)
      }
      return { installment_number: i + 1, amount: i === n - 1 ? round2(cuotaBase + rem) : cuotaBase, due_date }
    })
  }

  function toggleManualMode() {
    if (!manualMode.value) {
      numCuotasManual.value = autoNumCuotas.value
      seedEditableInstallments(numCuotasManual.value)
      manualMode.value = true
    } else {
      manualMode.value = false; editableInstallments.value = []
    }
  }

  function onNumCuotasManualChange() {
    const n = Math.min(Math.max(Number(numCuotasManual.value) || 1, 1), 12)
    numCuotasManual.value = n
    seedEditableInstallments(n)
  }

  function updateEditableAmount(idx, val) {
    if (editableInstallments.value[idx]) editableInstallments.value[idx].amount = Number(val) || 0
  }

  function updateEditableDate(idx, val) {
    if (editableInstallments.value[idx]) editableInstallments.value[idx].due_date = val
  }

  function toggleTimer(attempt) {
    if (attempt.timerActive) {
      clearInterval(attempt.timerId); attempt.timerActive = false; attempt.timerId = null
    } else {
      attempt.timerActive = true
      attempt.timerId = setInterval(() => { attempt.contact_duration = (attempt.contact_duration || 0) + 1 }, 1000)
    }
  }

  function createEmptyAttempt() {
    return {
      cat_type_attempt: 'we_attempt_call',
      calling_alias: 'we_calling_pending',
      fechaContactoProximo: currentHourIso(),
      respuesta: '',
      contact_duration: 0,
      timerActive: false,
      timerId: null
    }
  }

  function addContacto()         { form.contactos.push(createEmptyAttempt()) }
  function removeContacto(idx)   { form.contactos.splice(idx, 1) }

  function handleTypeChange(contacto, newVal) {
    contacto.cat_type_attempt = newVal
    if (newVal !== 'we_attempt_call') {
      contacto.calling_alias = 'we_calling_message'
      if (contacto.timerActive) { clearInterval(contacto.timerId); contacto.timerActive = false; contacto.timerId = null }
      contacto.contact_duration = 0
    } else {
      contacto.calling_alias = 'we_calling_pending'
    }
  }

  function handleMensajeChatInput() {
    const msj = (form.mensajeChat || '').toLowerCase()
    const canal = socialMediaCatalog.value?.find(e => e.description && msj.includes(e.description.toLowerCase()))?.alias
    form.canal_alias = canal || 'we_social_media_other'
    form.key_word_alias = mktWordsCatalog.value?.find(e => e.description && msj.includes(e.description.toLowerCase()))?.alias || 'we_key_word_null'
  }

  function onStatusChange(opt) {
    if (!opt) return
    if (opt.description === 'Pagó' || opt.alias === 'we_lead_status_bought') {
      const alto = leadInterestCatalog.value?.find(e => e.alias === 'we_lead_interest_high')
      if (alto) form.nivel_alias = alto.alias
      if (!form.pay_date) {
        const now  = new Date()
        const yyyy = now.getFullYear()
        const mm   = String(now.getMonth() + 1).padStart(2, '0')
        const dd   = String(now.getDate()).padStart(2, '0')
        form.pay_date = `${yyyy}-${mm}-${dd}`
      }
    } else if (opt.description === 'Interesado') {
      const alto = leadInterestCatalog.value?.find(e => e.alias === 'we_lead_interest_high')
      if (alto) form.nivel_alias = alto.alias
    }
  }

  function onChannelChange(option) {
    if (!option) { form.strategy_alias = null; form.medium_alias = null; return }
    const alias = option.alias
    if (['we_social_media_coti', 'we_social_media_chatbot'].includes(alias)) { form.medium_alias = 'we_social_media_wechat'; return }
    if (['we_social_media_wechat', 'we_social_media_other'].includes(alias)) { form.medium_alias = 'we_social_media_whatsapp'; return }
    if (['we_social_media_instagram', 'we_social_media_linkedin', 'we_social_media_facebook'].includes(alias)) {
      if (form.medium_alias === 'we_social_media_wechat') form.medium_alias = null
    }
  }

  function onStrategyChange(option) {
    if (!option) form.canal_alias = 'we_social_media_other'
  }

  function onProgramaTypeChange(opcion) {
    form.program_version_id              = null
    form.program_label                   = null
    form.program_link                    = null
    form.edition_id                      = null
    form.edition_label                   = null
    form.program_modality_selected_alias = null
    form.price_student_soles             = 0
    form.price_student_dollars           = 0
    form.price_profesional_soles         = 0
    form.price_profesional_dollars       = 0
    form.program_sessions                = 0
    form.program_sessions_per_week       = 1
    form.edition_start_date              = null
    if (!opcion) { form.program_modality_alias = null }
  }

  function onProgramaChange(opcion) {
    inscInitialized.value  = false
    priceManuallySet.value = false
    if (!opcion) {
      selectedProgram.value = null; form.program_label = null; form.program_link = null
      form.edition_id = null; form.edition_label = null; form.program_modality_selected_alias = null
      form.price_student_soles = 0; form.price_student_dollars = 0
      form.price_profesional_soles = 0; form.price_profesional_dollars = 0
      form.count_children = 0
      return
    }
    form.edition_id = null; form.edition_label = null
    selectedProgram.value                = opcion
    form.program_label                   = opcion.abbreviation || opcion.description || null
    form.program_link                    = opcion.link || null
    form.program_modality_selected_alias = opcion.cat_model_modality_alias
    form.program_sessions                = Number(opcion?.sessions || 0)
    form.program_sessions_per_week       = Number(opcion?.sessions_per_week || 1)
    form.price_student_soles             = Number(opcion.price_student_soles    || 0)
    form.price_student_dollars           = Number(opcion.price_student_dollars  || 0)
    form.count_children                  = Number(opcion.count_children || 0)
    form.price_profesional_soles         = Number(opcion.price_profesional_soles   || 0)
    form.price_profesional_dollars       = Number(opcion.price_profesional_dollars || 0)
  }

  function onEditionChange(opcion) {
    if (!opcion) { currentEdition.value = null; form.edition_label = null; form.edition_start_date = null; return }
    currentEdition.value    = opcion
    form.edition_label      = opcion.start_date_label || null
    form.edition_start_date = opcion.start_date || null
    if (opcion.start_date && opcion.end_date && form.program_sessions > 0) {
      const inicio  = new Date(opcion.start_date)
      const fin     = new Date(opcion.end_date)
      const semanas = Math.max(1, Math.round((fin - inicio) / (7 * 24 * 60 * 60 * 1000)))
      form.program_sessions_per_week = Math.max(1, Math.round(form.program_sessions / semanas))
    } else {
      form.program_sessions_per_week = 1
    }
  }

  const searchEditionsFiltered = async (q) => {
    const month    = new Date().getMonth() + 1
    const year     = new Date().getFullYear()
    const response = await editionService.editionCaller({ q, program_version_id: form.program_version_id, month, year })
    const hoy      = new Date()
    const desde    = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1); desde.setHours(0, 0, 0, 0)
    const hasta    = new Date(hoy.getFullYear(), 11, 31); hasta.setHours(23, 59, 59, 999)
    // El listado usa start_date_label directo (texto del SP, sin conversion JS).
    // Solo filtramos/ordenamos por start_date — esos new Date() se quedan en JS
    // como momentos comparables, no se renderizan al usuario.
    return (response || [])
      .filter(e => { if (!e.start_date) return true; const f = new Date(e.start_date); return f >= desde && f <= hasta })
      .sort((a, b) => { if (!a.start_date && !b.start_date) return 0; if (!a.start_date) return 1; if (!b.start_date) return -1; return new Date(a.start_date) - new Date(b.start_date) })
  }

  async function openProgramVersionDetail() {
    if (!form.program_version_id) return
    loadingDetail.value = true; modelProgramVersion.value = null
    try {
      const response = await programService.programVersionDetailGet({ program_version_id: form.program_version_id })
      modelProgramVersion.value = response; activeTab.value = 'info'; showProgramDetail.value = true
    } catch (error) {
      console.error(error); toast.error('No se pudo cargar el detalle del programa')
    } finally {
      loadingDetail.value = false
    }
  }

  // ── VALIDACIONES ─────────────────────────────────────────────
  function validateLeadInfo() {
    const required = ['fechaContactoInicial']
    for (const field of required) {
      if (field === 'edition_id') {
        if (route.query.clone_from) return true
        if (form.category_alias && form.program_version_id && form.program_modality_selected_alias !== 'we_modality_online' && !form[field]) return false
      } else if (!form[field]) return false
    }
    if (requiresEdition && form.program_version_id && !form.edition_id) return false
    // Solo se exige si el asesor tiene celulares que elegir; sin opciones no
    // tiene sentido bloquear el guardado por un campo que no puede llenar.
    if (sellerPhoneOptions.value.length && !form.origin_seller_phone) return false
    return true
  }

  function validateContactInfo() {
    const required = ['telefono', 'status_alias', 'country_alias', 'full_name', 'cat_client_moment_alias']
    return required.every(f => !!form[f])
  }

  function validateCommercialInfo() {
    const required = ['nivel_alias', 'mensajeChat', 'canal_alias', 'medium_alias', 'key_word_alias']
    return required.every(f => !!form[f])
  }

  function validateInscriptionClientInfo() {
    const required = ['cat_type_document', 'document', 'email', 'full_name', 'last_name', 'mother_last_name', 'cat_insc_modality', 'cat_certificate_status']
    if (!required.every(f => !!insc[f])) return false
    if (!isValidEmail(insc.email)) return false
    // En un congreso la categoria define la tarifa: sin ella la inscripcion
    // quedaria con un monto que no corresponde a nada.
    if (isEventProgram.value && !insc.cat_event_category) return false
    return true
  }

  function validateInscriptionPaymentInfo() {
    if (!insc.selectedCurrencyAlias) return false
    if (isChannelGeneral.value) {
      if (!insc.cat_type_payment) return false
      if (!insc.cat_method_payment) return false
      if (insc.cat_type_payment === 'we_payment_way_installments' && !insc.saved_money) return false
      return true
    }
    if (isChannelToken.value) {
      if (!insc.cat_token_provider) return false
      if (insc.cat_type_payment === 'we_payment_way_installments' && !insc.saved_money) return false
      return true
    }
    if (isChannelWeb.value) return true
    return false
  }

  // ── BÚSQUEDAS ────────────────────────────────────────────────
  async function searchLeadByPhone() {
    const phone = form.telefono?.trim()
    if (!phone || phone.length < 5) { toast.warning('Por favor ingrese un número de teléfono válido.'); return }
    if (dataSetted.value == phone) return
    dataSetted.value = phone
    if (!phone || phone.length < 6) return
    if (searchingPhone.value) return
    searchingPhone.value = true
    try {
      const response = await comercialService.searchPhoneGet({ phone })
      form.membership_moment_id    = response.membership_tier_id
      form.cat_client_moment_alias = response.cat_client_moment
      if (response.cat_client_moment === 'we_moment_new') {
        toast.info('Número no registrado. Se registrará como NUEVO.', { timeout: 3000 })
      } else {
        toast.success(`Encontrado: (${response.cat_client_moment == 'we_moment_lead' ? 'LEAD' : 'COMUNIDAD'})`, { timeout: 4000 })
        leadDataHistory.value = true
        if (response.lead_details.length > 0) { form.full_name = response.lead_details[0].full_name; return }
        if (response.legacy_details.length > 0) { form.full_name = response.legacy_details[0].full_name }
      }
    } catch (error) {
      console.error(error); toast.error('Error al consultar el número de teléfono')
    } finally {
      searchingPhone.value = false
    }
  }

  async function openPhoneDetail() {
    const phone = form.telefono?.trim()
    if (!phone || phone.length < 5) { toast.warning('Por favor ingrese un número de teléfono válido.'); return }
    if (dataSetted.value != phone) dataSetted.value = phone
    showClientHistory.value = true; loadingHistory.value = true
    clientHistoryLegacy.value = []; clientHistoryLeads.value = []
    activeHistoryTab.value = 'asesoria'
    try {
      const response = await comercialService.searchPhoneGet({ phone })
      if (response) {
        clientHistoryLegacy.value = response.legacy_details || []
        clientHistoryLeads.value  = response.lead_details  || []
      }
    } catch (error) {
      console.error(error); toast.error('Error al obtener el historial.')
    } finally {
      loadingHistory.value = false
    }
  }

  async function searchCustomerByDocument() {
    const doc = insc.document?.trim()
    if (!doc || doc.length < 3) { toast.warning('Ingrese el número de documento antes de buscar.'); return }
    searchingCustomer.value = true
    try {
      const response = await customerService.customerInfoGet({ document: doc })
      if (response && response.result === 1) {
        insc.full_name        = response.first_name       || ''
        insc.last_name        = response.last_name        || ''
        insc.mother_last_name = response.mother_last_name || ''
        insc.email            = response.email            || ''
        toast.success('Cliente encontrado en base de datos.', { timeout: 3000 })
        return
      }
      await searchSunat()
    } catch {
      await searchSunat()
    } finally {
      searchingCustomer.value = false
    }
  }

  async function searchSunat() {
    const sunatData = await customerService.sunatGet({ document: insc.document })
    if (sunatData && sunatData.nombre_o_razon_social) {
      insc.full_name = sunatData.nombre_o_razon_social; insc.last_name = ''; insc.mother_last_name = ''
      toast.info('Datos de SUNAT encontrados y precargados.', { timeout: 3000 })
    } else {
      toast.info('No se encontraron datos en SUNAT para el documento ingresado.', { timeout: 3000 })
    }
  }

  // ── DESCUENTOS ───────────────────────────────────────────────
  function onChangeDescuentoPorcentual(opt) {
    if (!opt) { insc.val_porcentaje = 0; insc.dsct_porcent_label = null; return }
    insc.val_porcentaje    = Number(opt.value) || 0
    insc.dsct_porcent_label = opt.full_label || opt.label || null
  }

  function onChangeDescuentoFijo(opt) {
    if (!opt) { insc.val_fijo = 0; insc.dsct_stick_label = null; return }
    insc.val_fijo          = Number(opt.value) || 0
    insc.dsct_stick_label  = opt.full_label || opt.label || null
  }

  function onChangeBeneficios(selectedItems) {
    insc.dsct_benefit_ids = selectedItems
    insc.val_beneficios   = selectedItems.map(i => parseFloat(i.raw?.value || 0))
  }

  // ── TOGGLE REPROGRAMACIÓN ────────────────────────────────────
  function toggleReschedule(contacto) {
    contacto.cat_reschedule_origin = contacto.cat_reschedule_origin ? null : CAT_RESCHEDULE_LEADER_ID
  }

  // ── INSCRIPCIÓN ──────────────────────────────────────────────
  function resetInscriptionData() {
    priceManuallySet.value = false
    Object.assign(insc, {
      dni: '', document: '', cat_type_document: null, nombres: '', apellidos: '',
      mother_last_name: '', email: '', full_name: '', last_name: '', saved_money: 0,
      selectedCurrencyAlias: 'we_currency_soles', cat_insc_modality: 'we_insc_modality_normal',
      cat_certificate_status: null, cat_type_payment: 'we_payment_way_single', cat_method_payment: null,
      modalidadPago: 'CONTADO', montoOriginal: 0, dsct_porcent_id: null, dsct_stick_id: null,
      dsct_benefit_ids: [], val_porcentaje: 0, val_fijo: 0, val_beneficios: [],
      montoBeneficioTotal: 0, dsct_porcent_label: null, dsct_stick_label: null, dsct_benefit_label: null,
      montoDescuentoPorcentaje: 0, montoDescuentoFijo: 0, montoBeneficio: 0, montoFinal: 0, total_amount: 0,
      observacions: '', requires_email_cc: false, email_cc: '',
      ticket_payment_urls: [], attachments: [], flag_agreement: false, b2b_contract_id: null,
      cat_payment_channel: null, cat_token_provider: null, token_payment_type: '',
    })
    voucherTouched.value = false
    form.carnet_url = null
  }

  function openTokenInscription() { openInscription(true) }

  function openInscription(tokenMode = false) {
    isTokenMode.value = tokenMode === true
    if (!inscInitialized.value) {
      resetInscriptionData()
      insc.full_name             = form.full_name || ''
      insc.email                 = ''
      insc.cat_insc_modality     = 'we_insc_modality_normal'
      insc.selectedCurrencyAlias = 'we_currency_soles'
      insc.cat_type_payment      = 'we_payment_way_single'
      insc.cat_certificate_status = 'we_certificate_status_paid'
      inscInitialized.value = true
    }
    // El canal se fija en cada apertura: si no, abrir TOKEN y despues INSCRIBIR
    // (o al reves) deja el canal del intento anterior.
    const channelAliasWanted = isTokenMode.value ? 'we_channel_token' : 'we_channel_general'
    const channel = paymentChannelCatalog.value.find(c => c.alias === channelAliasWanted)
    if (channel) insc.cat_payment_channel = channel.id
    nextTick(() => {
      if (!priceManuallySet.value) {
        const precio = calculatedBasePrice.value
        insc.montoOriginal = precio
        // En eventos el precio lo define la categoria de entrada: al abrir el
        // modal todavia no hay categoria elegida, asi que 0 es lo esperado y no
        // un error. El aviso se da recien al elegir categoria (onEventCategoryChange).
        const esperaCategoria = isEventProgram.value && !insc.cat_event_category
        if (!precio && !esperaCategoria) {
          toast.warning('⚠️ No se pudo cargar el Precio Base. Verifique que el programa tenga precios configurados.', { timeout: 7000, position: 'bottom-right' })
        }
      }
      showViewModal.value = true
    })
  }

  // ── PAYLOAD BUILDERS ─────────────────────────────────────────
  function buildLeadPayload() {
    const cat_status_lead        = idByAlias(form.status_alias,        leadStatusCatalog.value)
    const cat_code_country       = idByAlias(form.country_alias,       countryCatalog.value)
    const cat_query              = idByAlias(form.query_alias,         queryCatalog.value)
    const cat_interest_level     = idByAlias(form.nivel_alias,         leadInterestCatalog.value)
    const cat_channel            = idByAlias(form.canal_alias,         socialMediaCatalog.value)
    const cat_medium_contact     = idByAlias(form.medium_alias,        socialMediaCatalog.value)
    const cat_frecuency_word     = idByAlias(form.key_word_alias,      mktWordsCatalog.value)
    const cat_type_strategy      = idByAlias(form.strategy_alias,      strategyCatalog.value)
    const cat_prospect_situation = idByAlias(form.ocupacion_alias,     prospectSituationCatalog.value)
    const cat_client_type        = idByAlias(form.client_status,       clientCatalog.value)
    const cat_client_category    = idByAlias(form.cat_client_moment_alias, momentCatalog.value)
    const cat_program_modality   = idByAlias(form.program_modality_alias, programModalityCatalog.value)
    const cat_program_type       = idByAlias(form.category_alias,      programTypeCatalog.value)

    // businessLine option → inject cat_business_line_id
    const businessLineOptions  = catalog.options('we_business_line') || []
    const cat_business_line_id = businessLine
      ? (businessLineOptions.find(o => o.alias === businessLine)?.id ?? null)
      : null

    const contact_attempts = (form.contactos || []).map((c, idx) => ({
      id: c.id,
      attempt_number:   idx + 1,
      cat_type_attempt: idByAlias(c.cat_type_attempt, lAttempts.value),
      contact_datetime: c.fechaContactoProximo,
      cat_result:       idByAlias(c.calling_alias, callingCatalog.value),
      response:         c.respuesta || '',
      contact_duration: c.contact_duration || 0,
      cat_reschedule_origin: c.cat_reschedule_origin || null
    }))

    return {
      lead: {
        first_contact_date: form.fechaContactoInicial || null,
        cat_program_modality, cat_program_type,
        program_version_id: form.program_version_id || null,
        program_edition_id: form.edition_id || null,
        cat_status_lead, cat_code_country, cat_interest_level, cat_client_type,
        cat_channel, cat_medium_contact,
        bot:    form.bot    ? 'Y' : 'N',
        active: form.active ? 'Y' : 'N',
        web:    form.web    ? 'Y' : 'N',
        b2b:    form.b2b    ? 'Y' : 'N',
        cat_query,
        full_name:            form.full_name,
        pay_date:             form.pay_date,
        cat_frecuency_word, cat_type_strategy, cat_prospect_situation,
        cat_client_moment:    cat_client_category,
        membership_moment_id: form.membership_moment_id,
        origin_phone:  (form.telefono || '').trim() || null,
        origin_seller_phone: (form.origin_seller_phone || '').trim() || null,
        origin_email:  null,
        message_init_conversation: form.mensajeChat?.trim() || null,
        observations:              form.observacion?.trim() || null,
        cat_business_line_id,
        company_id:        form.company_id        || null,
        cat_contract_type: form.cat_contract_type || null,
      },
      contact_attempts
    }
  }

  function buildEnrollmentPayload() {
    const cat_type_document      = idByAlias(insc.cat_type_document, docTypeCatalog.value)
    const cat_insc_modality      = idByAlias(insc.cat_insc_modality, inscModalidades.value)
    const cat_type_payment       = idByAlias(insc.cat_type_payment,  inscPaymentModes.value)
    const cat_currency           = idByAlias(insc.selectedCurrencyAlias, currencyCatalog.value)
    const cat_country            = idByAlias(form.country_alias, countryCatalog.value)
    const cat_certificate_status = idByAlias(insc.cat_certificate_status, certificateStatusCatalog.value)
    const cat_method_payment     = isChannelGeneral.value
      ? idByAlias(insc.cat_method_payment, paymentMethodCatalog.value)
      : null
    const paymentFiles      = (insc.ticket_payment_urls || []).map(f => ({ url: f.url || f, name: f.name || (f.url || f).split('/').pop() || 'Comprobante', type: f.type || null }))
    const generalAttachments = (insc.attachments || []).map(f => ({ url: f.url || f, name: f.name || (f.url || f).split('/').pop() || 'Adjunto', type: f.type || null }))
    return {
      inscription: {
        lead_id:            createdLeadId.value,
        program_version_id: form.edition_id ? null : form.program_version_id,
        program_edition_id: form.edition_id,
        document: insc.document, cat_type_document,
        full_name: insc.full_name, last_name: insc.last_name, mother_last_name: insc.mother_last_name,
        email: insc.email, cat_country, cat_insc_modality, cat_certificate_status,
        cat_payment_channel: insc.cat_payment_channel,
        cat_type_payment: (isChannelGeneral.value || isChannelToken.value) ? cat_type_payment : null,
        cat_currency, cat_method_payment,
        cat_token_provider: insc.cat_token_provider,
        saved_money: reservaSplitEnabled.value ? Number(reservaInmediata.value) : Number(insc.saved_money),
        list_price:   insc.montoOriginal,
        total_amount: Number(insc.total_amount),
        dsct_porcent_id: insc.dsct_porcent_id, dsct_porcent_label: insc.dsct_porcent_label,
        dsct_stick_id: insc.dsct_stick_id, dsct_stick_label: insc.dsct_stick_label,
        dsct_benefit_ids: insc.dsct_benefit_ids.map(b => ({ value: b.value, label: b.label })),
        installment_plan: isInstallmentMode.value ? installmentPlan.value : null,
        observations: insc.observacions,
        // Correo en copia: el flag viaja aunque el correo aun no se tenga, para
        // que FICO no pueda confirmar la venta sin resolverlo.
        requires_email_cc: insc.requires_email_cc === true,
        email_cc: insc.email_cc || null,
        student_attachment_url: form.carnet_url || null,
        ticket_payment_urls: paymentFiles,
        attachments: generalAttachments,
        agreement_id: insc.agreement_id || null,
        cat_event_category: insc.cat_event_category || null,
        event_seat: isVipCategory.value ? (insc.event_seat || '').trim() || null : null,
      }
    }
  }

  // ── ACCIONES PRINCIPALES ─────────────────────────────────────
  function cancelar() { router.push({ name: listRouteName }) }

  async function guardarEfectivo() {
    if (!comercialService) return console.error('comercialService no inyectado')
    saving.value = true
    try {
      const payload = buildLeadPayload()
      const resp    = await comercialService.leadUpdate({ id: leadIdParam.value, ...payload })
      if (resp.result === 1)      { toast.success(resp.message || 'Lead eliminado correctamente'); router.push({ name: listRouteName }) }
      else if (resp.result === 0) { toast.error(resp.message) }
      else                        { toast.warning(resp.message) }
    } catch (err) { console.error(err); toast.error('Error inesperado al intentar eliminar el lead.') }
    finally { saving.value = false }
  }

  async function confirmarEliminacion() {
    showDeleteWarningModal.value = false
    await guardarEfectivo()
  }

  async function guardar() {
    console.log('[guardar] edition_id:', form.edition_id, '| edition_label:', form.edition_label)
    if (!comercialService) return console.error('comercialService no inyectado')
    if (isDeleteStatus.value) { showDeleteWarningModal.value = true; return }
    saving.value = true
    try {
      const payload = buildLeadPayload()
      let result, message
      if (isEdit.value) {
        const resp = await comercialService.leadUpdate({ id: leadIdParam.value, ...payload })
        result = resp.result; message = resp.message
      } else {
        const resp = await comercialService.leadRegister(payload)
        result = resp.result; message = resp.message
        if (result === 1) { createdLeadId.value = resp.lead_id; createdPersonId.value = resp.person_id }
      }
      if (result === 1)      { toast.success(message); router.push({ name: listRouteName }) }
      else if (result === 0) { toast.error(message) }
      else                   { toast.warning(message) }
    } catch (err) { console.error(err); toast.error('Error inesperado al guardar el lead.') }
    finally { saving.value = false }
  }

  async function confirmarInscripcion() {
    if (!comercialService) return console.error('comercialService no inyectado')
    if (!insc.montoOriginal || Number(insc.montoOriginal) <= 0) { toast.warning('El Precio Base no está configurado. No se puede procesar la inscripción.'); return }
    if (!validateInscriptionClientInfo() || !validateInscriptionPaymentInfo()) {
      if (insc.email && !isValidEmail(insc.email)) { toast.warning('El correo no tiene formato válido · ej: nombre@dominio.com') }
      else { toast.warning('Por favor complete los campos obligatorios de la inscripción') }
      return
    }
    if (!validateLeadInfo() || !validateContactInfo() || !validateCommercialInfo()) { toast.warning('Faltan datos obligatorios en el formulario del Lead.'); return }
    if (isChannelGeneral.value && !isVoucherOptional.value && (!insc.ticket_payment_urls || insc.ticket_payment_urls.length === 0)) { voucherTouched.value = true; toast.warning('El canal General requiere al menos un Comprobante de Pago.'); return }
    if (isChannelToken.value && !insc.cat_token_provider) { toast.warning('Debe seleccionar el proveedor del Link / Token.'); return }
    if (isInstallmentMode.value && reservaSplitEnabled.value && !reservaSplitValid.value) { toast.warning('Si aplazas parte de la reserva, debes indicar el monto inmediato y la fecha de la cuota diferida.'); return }
    if (isInstallmentMode.value && !installmentPlanValid.value) { toast.warning('El plan de cuotas no cuadra con el monto final. Ajusta los montos antes de guardar.'); return }
    if (isInstallmentMode.value && reservaSplitEnabled.value && reservaDiferidaFecha.value) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      if (new Date(reservaDiferidaFecha.value) < hoy) { toast.warning('La fecha de la cuota diferida no puede ser una fecha pasada.'); return }
    }
    savingInsc.value = true
    try {
      const leadPayload       = buildLeadPayload()
      const currentLeadId     = leadIdParam.value || createdLeadId.value
      let   resolvedLeadId    = currentLeadId
      let   resolvedPersonId  = createdPersonId.value
      const enrollmentPayload = buildEnrollmentPayload()
      if (currentLeadId) {
        const leadResp = await comercialService.leadUpdate({ id: currentLeadId, ...leadPayload })
        if (leadResp.result === 0) { toast.error(leadResp.message);   return }
        if (leadResp.result === 2) { toast.warning(leadResp.message); return }
      } else {
        const leadResp = await comercialService.leadRegister(leadPayload)
        if (leadResp.result === 0) { toast.error(leadResp.message);   return }
        if (leadResp.result === 2) { toast.warning(leadResp.message); return }
        resolvedLeadId = leadResp.lead_id; resolvedPersonId = leadResp.person_id
        createdLeadId.value = resolvedLeadId; createdPersonId.value = resolvedPersonId
      }
      enrollmentPayload.inscription.lead_id = resolvedLeadId
      const enrollResp = await comercialService.enrollmentRegister(enrollmentPayload)
      if (enrollResp.result === 1) {
        toast.success(enrollResp.message)
        inscInitialized.value = false; showViewModal.value = false
        router.push({ name: listRouteName })
      } else if (enrollResp.result === 0) {
        toast.error(`${enrollResp.message} — El lead fue guardado, pero la inscripción no se registró. Inténtalo nuevamente.`, { timeout: 8000 })
      } else {
        toast.warning(enrollResp.message)
      }
    } catch (err) { console.error(err); toast.error('Error inesperado al procesar la inscripción.') }
    finally { savingInsc.value = false }
  }

  async function confirmarToken() {
    if (!comercialService || !ficoService) return console.error('comercialService/ficoService no inyectado')
    if (!insc.montoOriginal || Number(insc.montoOriginal) <= 0) { toast.warning('El Precio Base no está configurado.'); return }
    if (!validateInscriptionClientInfo()) { toast.warning('Complete los campos obligatorios de la inscripción'); return }
    if (!validateLeadInfo() || !validateContactInfo() || !validateCommercialInfo()) { toast.warning('Faltan datos obligatorios en el formulario del Lead.'); return }
    if (!insc.token_payment_type) { toast.warning('Debe seleccionar el tipo de pago (Débito/Crédito).'); return }

    savingInsc.value = true
    try {
      const leadPayload   = buildLeadPayload()
      const currentLeadId = leadIdParam.value || createdLeadId.value
      let   resolvedLeadId = currentLeadId

      if (currentLeadId) {
        const leadResp = await comercialService.leadUpdate({ id: currentLeadId, ...leadPayload })
        if (leadResp.result === 0) { toast.error(leadResp.message);   return }
        if (leadResp.result === 2) { toast.warning(leadResp.message); return }
      } else {
        const leadResp = await comercialService.leadRegister(leadPayload)
        if (leadResp.result === 0) { toast.error(leadResp.message);   return }
        if (leadResp.result === 2) { toast.warning(leadResp.message); return }
        resolvedLeadId        = leadResp.lead_id
        createdLeadId.value   = resolvedLeadId
        createdPersonId.value = leadResp.person_id
      }

      const enrollmentPayload = buildEnrollmentPayload()
      enrollmentPayload.inscription.lead_id = resolvedLeadId

      // El monto del link es lo que el alumno paga AHORA: en cuotas eso es solo
      // la inicial (saved_money), no el total.
      const isInstallments = insc.cat_type_payment === 'we_payment_way_installments'
      const tokenAmount = isInstallments
        ? (Number(insc.saved_money) || 0)
        : (Number(insc.total_amount) || Number(insc.montoOriginal) || 0)

      const resp = await ficoService.tokenCreate({
        lead_id:      resolvedLeadId,
        cat_provider: null,
        payment_type: insc.token_payment_type || null,
        amount:       tokenAmount,
        currency:     insc.selectedCurrencyAlias === 'we_currency_usd' ? 'USD' : 'PEN',
        notes:        `Link para ${form.full_name || '---'}`,
        advisor_observation: insc.observacions || null,
        cat_payment_channel: insc.cat_payment_channel || null,
        inscription_data:    enrollmentPayload
      })

      if (resp?.token_id || resp?.data?.token_id) {
        toast.success('Token de pago creado correctamente.')
        isTokenMode.value     = false
        inscInitialized.value = false
        showViewModal.value   = false
        router.push({ name: listRouteName })
      } else {
        toast.error(resp?.message || 'No se pudo crear el token de pago.')
      }
    } catch (err) { console.error(err); toast.error(err?.response?.data?.message || 'Error inesperado al crear el token de pago.') }
    finally { savingInsc.value = false }
  }

  // ── CARGA DE DATOS ───────────────────────────────────────────
  async function loadLead(id) {
    console.log(id)
    const data = await comercialService.leadGet({ id })
    const l    = data?.lead || data || {}
    const modality_selected_alias = l.cat_program_modality_alias ?? l.program_modality_alias ?? null
    console.log(l)
    Object.assign(form, {
      fechaContactoInicial: normalizeDateTime(l.first_contact_date || l.registration_date) || todayIso,
      origin_seller_phone:  l.origin_seller_phone ?? sellerPhones.value[0]?.value ?? null,
      query_alias:          l.query_alias ?? null,
      category_alias:       l.cat_program_type_alias || l.category_alias || null,
      program_modality_alias: l.cat_program_modality_alias || l.program_modality_alias || null,
      program_modality_selected_alias: modality_selected_alias,
      web: l.web === 'Y' || l.web === true,
      b2b: l.b2b === 'Y' || l.b2b === true,
      program_version_id: l.program_version_id ?? null,
      edition_id:         l.program_edition_id ?? l.edition_id ?? null,
      full_name:          l.full_name ?? l.full_name_label ?? '',
      telefono:           l.origin_phone ?? l.phone ?? '',
      count_children:     Number(l.count_children || 0),
      status_alias:       l.status_alias,
      country_alias:      l.country_alias,
      ocupacion_alias:    l.ocupacion_alias,
      client_status:      l.client_status,
      client_status_label: l.client_status_label,
      membership_moment_id:  l.membership_moment_id,
      membership_tier_label: l.membership_tier_label,
      cat_client_moment_alias: l.cat_client_moment_alias,
      cat_client_moment_label: l.cat_client_moment_label,
      bot:    l.bot  != 'N',
      active: l.active != 'N',
      program_label:    l.program_label   ?? null,
      edition_label:    l.edition_label   ?? null,
      query_label:      l.query_label     ?? null,
      ocupacion_label:  l.ocupacion_label ?? null,
      status_label:     l.status_label    ?? null,
      edition_start_date: l.edition_start_date || null,
      interest_label:   l.interest_label  ?? null,
      channel_label:    l.channel_label   ?? null,
      medium_label:     l.medium_label    ?? null,
      key_word_label:   l.key_word_label  ?? null,
      strategy_label:   l.strategy_label  ?? null,
      pay_date:         l.pay_date ? String(l.pay_date).slice(0, 10) : null,
      nivel_alias:      l.interest_alias,
      mensajeChat:      l.message_init_conversation ?? '',
      canal_alias:      l.channel_alias,
      medium_alias:     l.medium_alias,
      key_word_alias:   l.key_word_alias ?? aliasById(l.key_word_alias, mktWordsCatalog.value),
      strategy_alias:   l.strategy_alias,
      price_student_soles:       Number(l.price_student_soles    || 0),
      price_student_dollars:     Number(l.price_student_dollars  || 0),
      price_profesional_soles:   Number(l.price_profesional_soles   || 0),
      price_profesional_dollars: Number(l.price_profesional_dollars || 0),
      program_sessions:          Number(l.sessions || l.program_sessions || 0),
      program_sessions_per_week: Number(l.sessions_per_week || l.program_sessions_per_week || 1),
      enrollment_id: l.enrollment_id,
      program_link:  l.program_link ?? null,
      observacion:   l.observations ?? '',
      company_id:        l.company_id        ?? null,
      company_label:     l.company_name      ?? '',
      cat_contract_type: l.cat_contract_type ?? null,
      contactos: (l.contact_attempts || []).map(att => {
        const originAlias = att.cat_creation_origin
        const originObj   = attemptOriginCatalog.value.find(o => o.alias === originAlias)
        return {
          id:               att.lead_contact_attempt_id,
          status_alias:     att.cat_status_alias,
          cat_type_attempt: att.cat_type_attempt_alias || 'we_attempt_call',
          calling_alias:    att.cat_result_alias,
          calling_label:    att.cat_result_label,
          status_label:     att.cat_status_label,
          fechaContactoProximo: normalizeDateTime(att.contact_datetime),
          respuesta:        att.response || '',
          contact_duration: att.contact_duration || 0,
          cat_reschedule_origin: att.cat_reschedule_origin || null,
          was_rescheduled:       !!att.cat_reschedule_origin,
          reschedule_label:      att.cat_reschedule_origin_label || null,
          timerActive: false, timerId: null,
          cat_creation_origin_alias: originAlias || 'we_origin_manual',
          cat_creation_origin_label: originObj ? originObj.description : 'Gestión Manual'
        }
      }),
    })
    createdLeadId.value   = l.id ?? l.lead_id ?? id
    createdPersonId.value = l.person_id ?? null
  }

  async function loadDataForCloning(sourceId) {
    try {
      console.log(sourceId)
      const originalData = await comercialService.leadGet({ id: sourceId })
      Object.assign(form, {
        fechaContactoInicial: currentHourIso(),
        query_alias:          originalData.query_alias ?? null,
        category_alias:       originalData.cat_type_program_alias || originalData.category_alias || null,
        program_modality_alias: originalData.program_modality_alias ?? null,
        program_modality_selected_alias: originalData.program_modality_alias ?? null,
        program_version_id:   originalData.program_version_id ?? null,
        edition_id:           originalData.program_edition_id ?? originalData.edition_id ?? null,
        full_name:            originalData.full_name ?? originalData.full_name_label ?? '',
        telefono:             originalData.origin_phone ?? originalData.phone ?? '',
        status_alias:         'we_lead_status_atendido',
        country_alias:        originalData.country_alias,
        client_status:        originalData.client_status,
        client_status_label:  originalData.client_status_label,
        ocupacion_alias:      originalData.ocupacion_alias,
        bot: false, active: true,
        program_label:   originalData.program_label   ?? null,
        edition_label:   originalData.edition_label   ?? null,
        query_label:     originalData.query_label     ?? null,
        ocupacion_label: originalData.ocupacion_label ?? null,
        pay_date:    null,
        nivel_alias: 'we_lead_interest_low',
        mensajeChat: originalData.message_init_conversation ?? '',
        canal_alias:     originalData.channel_alias,
        medium_alias:    originalData.medium_alias,
        key_word_alias:  originalData.key_word_alias ?? aliasById(originalData.key_word_alias, mktWordsCatalog.value),
        strategy_alias:  originalData.strategy_alias,
        observacion:     originalData.observations ?? '',
        categoriaCliente: originalData.t_lead ?? 'NEW',
        categoriaMember:  originalData.membresia ?? '',
        price_student_soles:       Number(originalData.price_student_soles    || 0),
        price_student_dollars:     Number(originalData.price_student_dollars  || 0),
        price_profesional_soles:   Number(originalData.price_profesional_soles   || 0),
        price_profesional_dollars: Number(originalData.price_profesional_dollars || 0),
        program_sessions:          Number(originalData.sessions || originalData.program_sessions || 0),
        program_sessions_per_week: Number(originalData.sessions_per_week || originalData.program_sessions_per_week || 1),
        program_link:              originalData.program_link ?? null,
      })
      createdLeadId.value = null; createdPersonId.value = null
      toast.info('Formulario precargado con datos del lead original. Por favor, revise y guarde.', { timeout: 5000 })
    } catch (e) { console.error('Error cargando plantilla para clonar', e) }
  }

  // ── LIFECYCLE ────────────────────────────────────────────────
  onMounted(async () => {
    const data = await catalog.membershipList({ active: true })
    membershipList.value = data

    if (route.query.clone_from) {
      await loadDataForCloning(route.query.clone_from)
      loaded.value = true
      return
    }

    if (isEdit.value) {
      await loadLead(leadIdParam.value)
      loaded.value = true
      return
    }

    // Defaults para nuevo lead
    form.canal_alias   = 'we_social_media_other'
    form.medium_alias  = 'we_social_media_whatsapp'
    form.nivel_alias   = 'we_lead_interest_low'
    form.country_alias = 'we_country_peru'
    form.status_alias  = 'we_lead_status_atendido'
    form.client_status = acceptsCompany ? null : 'we_client_person'
    form.key_word_alias = 'we_key_word_null'
    form.active = true

    // fixedProgramType: pre-asignar categoría y disparar watcher
    if (fixedProgramType) {
      form.category_alias = fixedProgramType
      onProgramaTypeChange(programTypeCatalog.value.find(e => e.alias === fixedProgramType) ?? null)
    }

    loaded.value = true
  })

  onBeforeUnmount(() => {
    if (form.contactos) {
      form.contactos.forEach(item => { if (item.timerId) clearInterval(item.timerId) })
    }
  })

  // ── RETORNO ──────────────────────────────────────────────────
  return {
    // Reactive objects
    form, insc,

    // State refs
    loaded, saving, savingInsc, inscInitialized, leadDataHistory,
    showViewModal, showClientHistory, showProgramDetail, showDeleteWarningModal,
    activeHistoryTab, activeTab,
    clientHistoryLegacy, clientHistoryLeads, loadingHistory,
    searchingCustomer, searchingPhone, dataSetted,
    modelProgramVersion, loadingDetail,
    voucherUploaderRef, voucherTouched, discountResetKey, priceManuallySet,
    programs, editions, currentEdition, selectedProgram, hcEnrollmentData, membershipList,
    manualMode, numCuotasManual, reservaSplitEnabled, reservaInmediata, reservaDiferidaFecha,

    // Config
    pastDateConfig, futureDateConfig, dateLimitConfig,

    // Catalog refs
    leadStatusCatalog, leadInterestCatalog, countryCatalog, momentCatalog, clientCatalog,
    prospectSituationCatalog, strategyCatalog, mktWordsCatalog, socialMediaCatalog,
    contactAttemptStatusCat, programCategoryCatalog, queryCatalog, inscModalidades,
    discountCatalog, paymentMethodCatalog, docTypeCatalog, programTypeCatalog,
    programModalityCatalog, inscPaymentModes, callingCatalog, attemptOriginCatalog,
    currencyCatalog, lAttempts, paymentChannelCatalog, certificateStatusCatalog, tokenProviderCatalog,

    // Computed
    isEdit, leadIdParam, isDeleteStatus, currentProgram, hasEditions, maxPhoneLength,
    docConfig, selectedCurrency, selectedCurrencyAlias, channelAlias,
    isChannelGeneral, isChannelToken, isChannelWeb, isVoucherOptional,
    isMedioDisabled, filteredMediumCatalog, clientProfileType, calculatedBasePrice,
    montoFinalCalculado, isOnlineProgram, saveBlockReason, minDateForNewAttempt,
    isInstallmentMode, installmentRemainder, autoNumCuotas, autoInstallmentPlan,
    reservaDiferida, reservaSplitValid, installmentPlan, installmentTotalSum, installmentPlanValid,
    showInscriptionButton, inscriptionBlockReason, isLiderComercial,
    isTokenMode, showTokenButton,
    sellerPhoneOptions, sellerPhoneLocked,
    eventCategories, isEventProgram, onEventCategoryChange, isVipCategory,

    // Services (needed for template fetchers)
    programService, discountService, editionService, b2bService,

    // Options flags
    isCompanyLead,

    // Helpers
    fmt2, round2, formatDate, formatDateTime, formatDuration, isValidEmail, openURL, getBadgeClass,

    // Functions
    cancelar, guardar, guardarEfectivo, confirmarEliminacion, confirmarInscripcion,
    openInscription, openTokenInscription, confirmarToken, resetInscriptionData,
    addContacto, removeContacto, toggleTimer, handleTypeChange,
    handleMensajeChatInput, onStatusChange, onChannelChange, onStrategyChange,
    onProgramaTypeChange, onProgramaChange, onEditionChange, searchEditionsFiltered,
    openProgramVersionDetail, openPhoneDetail, searchLeadByPhone, searchCustomerByDocument,
    validateLeadInfo, validateContactInfo, validateCommercialInfo,
    validateInscriptionClientInfo, validateInscriptionPaymentInfo,
    toggleReschedule, toggleManualMode, onNumCuotasManualChange,
    updateEditableAmount, updateEditableDate,
    onChangeDescuentoPorcentual, onChangeDescuentoFijo, onChangeBeneficios,
  }
}
