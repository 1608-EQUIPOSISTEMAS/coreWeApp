import { ref, computed, watch } from 'vue'
import { aliasById } from '../shared/lib/catalog.js'

// Cascade de programa/edicion + precio base, busquedas (telefono/documento/SUNAT)
// y carga del lead en edicion. Extraido verbatim de useLeadForm. Mutaciones sobre
// form/insc reactivos; los servicios y catalogos entran por deps.
//
// deps: { comercialService, customerService, editionService, toast,
//         prospectSituationCatalog, mktWordsCatalog, attemptOriginCatalog }  (catalogos = refs)
function normalizeDateTime (v) {
  if (!v) return ''
  const s = String(v).slice(0, 19).replace('T', ' ')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 09:00:00`
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(s)) return `${s}:00`
  return s
}

export function useLeadFormSearch (form, insc, deps = {}) {
  const {
    comercialService, customerService, editionService, toast,
    prospectSituationCatalog = ref([]), mktWordsCatalog = ref([]), attemptOriginCatalog = ref([])
  } = deps

  const todayIso = new Date().toISOString().slice(0, 16)
  const selectedProgram = ref(null)
  const currentEdition = ref(null)
  const searchingPhone = ref(false)
  const searchingCustomer = ref(false)
  const dataSetted = ref(null)
  const leadDataHistory = ref(false)
  const priceManuallySet = ref(false)
  const inscInitialized = ref(false)

  // Perfil (estudiante/profesional) derivado de la ocupacion del lead.
  const clientProfileType = computed(() => {
    if (!form.ocupacion_alias) return null
    return prospectSituationCatalog.value.find(opt => opt.alias === form.ocupacion_alias)?.variable_3 || null
  })

  // Precio base segun moneda activa + perfil. Cae a precio estudiante si no hay profesional.
  const calculatedBasePrice = computed(() => {
    if (!insc.selectedCurrencyAlias) return 0
    const isUSD = insc.selectedCurrencyAlias === 'we_currency_usd'
    const type = clientProfileType.value
    if (type === 'estudiante') {
      return isUSD ? Number(form.price_student_dollars || 0) : Number(form.price_student_soles || 0)
    }
    const proPrecio = isUSD ? Number(form.price_profesional_dollars || 0) : Number(form.price_profesional_soles || 0)
    if (proPrecio > 0) return proPrecio
    return isUSD ? Number(form.price_student_dollars || 0) : Number(form.price_student_soles || 0)
  })

  // Auto-asigna montoOriginal salvo que el usuario lo haya editado manualmente.
  watch(calculatedBasePrice, (newPrice) => {
    if (!priceManuallySet.value) insc.montoOriginal = newPrice
  }, { immediate: true })

  function onProgramaTypeChange (opcion) {
    form.program_version_id = null
    form.program_label = null
    form.program_link = null
    form.edition_id = null
    form.edition_label = null
    form.program_modality_selected_alias = null
    form.price_student_soles = 0
    form.price_student_dollars = 0
    form.price_profesional_soles = 0
    form.price_profesional_dollars = 0
    form.program_sessions = 0
    form.program_sessions_per_week = 1
    form.edition_start_date = null
    if (!opcion) { form.program_modality_alias = null }
  }

  function onProgramaChange (opcion) {
    inscInitialized.value = false
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
    selectedProgram.value = opcion
    form.program_label = opcion.abbreviation || opcion.description || null
    form.program_link = opcion.link || null
    form.program_modality_selected_alias = opcion.cat_model_modality_alias
    form.program_sessions = Number(opcion?.sessions || 0)
    form.program_sessions_per_week = Number(opcion?.sessions_per_week || 1)
    form.price_student_soles = Number(opcion.price_student_soles || 0)
    form.price_student_dollars = Number(opcion.price_student_dollars || 0)
    form.count_children = Number(opcion.count_children || 0)
    form.price_profesional_soles = Number(opcion.price_profesional_soles || 0)
    form.price_profesional_dollars = Number(opcion.price_profesional_dollars || 0)
  }

  function onEditionChange (opcion) {
    if (!opcion) { currentEdition.value = null; form.edition_label = null; form.edition_start_date = null; return }
    currentEdition.value = opcion
    form.edition_label = opcion.start_date_label || null
    form.edition_start_date = opcion.start_date || null
    if (opcion.start_date && opcion.end_date && form.program_sessions > 0) {
      const inicio = new Date(opcion.start_date)
      const fin = new Date(opcion.end_date)
      const semanas = Math.max(1, Math.round((fin - inicio) / (7 * 24 * 60 * 60 * 1000)))
      form.program_sessions_per_week = Math.max(1, Math.round(form.program_sessions / semanas))
    } else {
      form.program_sessions_per_week = 1
    }
  }

  const searchEditionsFiltered = async (q) => {
    const month = new Date().getMonth() + 1
    const year = new Date().getFullYear()
    const response = await editionService.editionCaller({ q, program_version_id: form.program_version_id, month, year })
    const hoy = new Date()
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1); desde.setHours(0, 0, 0, 0)
    const hasta = new Date(hoy.getFullYear(), 11, 31); hasta.setHours(23, 59, 59, 999)
    return (response || [])
      .filter(e => { if (!e.start_date) return true; const f = new Date(e.start_date); return f >= desde && f <= hasta })
      .sort((a, b) => { if (!a.start_date && !b.start_date) return 0; if (!a.start_date) return 1; if (!b.start_date) return -1; return new Date(a.start_date) - new Date(b.start_date) })
  }

  async function searchLeadByPhone () {
    const phone = form.telefono?.trim()
    if (!phone || phone.length < 5) { toast.warning('Por favor ingrese un número de teléfono válido.'); return }
    if (dataSetted.value === phone) return
    dataSetted.value = phone
    if (!phone || phone.length < 6) return
    if (searchingPhone.value) return
    searchingPhone.value = true
    try {
      const response = await comercialService.searchPhoneGet({ phone })
      form.membership_moment_id = response.membership_tier_id
      form.cat_client_moment_alias = response.cat_client_moment
      if (response.cat_client_moment === 'we_moment_new') {
        toast.info('Número no registrado. Se registrará como NUEVO.', { timeout: 3000 })
      } else {
        toast.success(`Encontrado: (${response.cat_client_moment === 'we_moment_lead' ? 'LEAD' : 'COMUNIDAD'})`, { timeout: 4000 })
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

  async function searchSunat () {
    const sunatData = await customerService.sunatGet({ document: insc.document })
    if (sunatData && sunatData.nombre_o_razon_social) {
      insc.full_name = sunatData.nombre_o_razon_social; insc.last_name = ''; insc.mother_last_name = ''
      toast.info('Datos de SUNAT encontrados y precargados.', { timeout: 3000 })
    } else {
      toast.info('No se encontraron datos en SUNAT para el documento ingresado.', { timeout: 3000 })
    }
  }

  async function searchCustomerByDocument () {
    const doc = insc.document?.trim()
    if (!doc || doc.length < 3) { toast.warning('Ingrese el número de documento antes de buscar.'); return }
    searchingCustomer.value = true
    try {
      const response = await customerService.customerInfoGet({ document: doc })
      if (response && response.result === 1) {
        insc.full_name = response.first_name || ''
        insc.last_name = response.last_name || ''
        insc.mother_last_name = response.mother_last_name || ''
        insc.email = response.email || ''
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

  async function loadLead (id) {
    const data = await comercialService.leadGet({ id })
    const l = data?.lead || data || {}
    const modalitySelectedAlias = l.cat_program_modality_alias ?? l.program_modality_alias ?? null
    Object.assign(form, {
      fechaContactoInicial: normalizeDateTime(l.first_contact_date || l.registration_date) || todayIso,
      query_alias: l.query_alias ?? null,
      category_alias: l.cat_program_type_alias || l.category_alias || null,
      program_modality_alias: l.cat_program_modality_alias || l.program_modality_alias || null,
      program_modality_selected_alias: modalitySelectedAlias,
      web: l.web === 'Y' || l.web === true,
      b2b: l.b2b === 'Y' || l.b2b === true,
      program_version_id: l.program_version_id ?? null,
      edition_id: l.program_edition_id ?? l.edition_id ?? null,
      full_name: l.full_name ?? l.full_name_label ?? '',
      telefono: l.origin_phone ?? l.phone ?? '',
      count_children: Number(l.count_children || 0),
      status_alias: l.status_alias,
      country_alias: l.country_alias,
      ocupacion_alias: l.ocupacion_alias,
      client_status: l.client_status,
      client_status_label: l.client_status_label,
      membership_moment_id: l.membership_moment_id,
      membership_tier_label: l.membership_tier_label,
      cat_client_moment_alias: l.cat_client_moment_alias,
      cat_client_moment_label: l.cat_client_moment_label,
      bot: l.bot !== 'N',
      active: l.active !== 'N',
      program_label: l.program_label ?? null,
      edition_label: l.edition_label ?? null,
      query_label: l.query_label ?? null,
      ocupacion_label: l.ocupacion_label ?? null,
      status_label: l.status_label ?? null,
      edition_start_date: l.edition_start_date || null,
      interest_label: l.interest_label ?? null,
      channel_label: l.channel_label ?? null,
      medium_label: l.medium_label ?? null,
      key_word_label: l.key_word_label ?? null,
      strategy_label: l.strategy_label ?? null,
      pay_date: l.pay_date ? String(l.pay_date).slice(0, 10) : null,
      nivel_alias: l.interest_alias,
      mensajeChat: l.message_init_conversation ?? '',
      canal_alias: l.channel_alias,
      medium_alias: l.medium_alias,
      key_word_alias: l.key_word_alias ?? aliasById(l.key_word_alias, mktWordsCatalog.value),
      strategy_alias: l.strategy_alias,
      price_student_soles: Number(l.price_student_soles || 0),
      price_student_dollars: Number(l.price_student_dollars || 0),
      price_profesional_soles: Number(l.price_profesional_soles || 0),
      price_profesional_dollars: Number(l.price_profesional_dollars || 0),
      program_sessions: Number(l.sessions || l.program_sessions || 0),
      program_sessions_per_week: Number(l.sessions_per_week || l.program_sessions_per_week || 1),
      enrollment_id: l.enrollment_id,
      program_link: l.program_link ?? null,
      observacion: l.observations ?? '',
      company_id: l.company_id ?? null,
      company_label: l.company_name ?? '',
      cat_contract_type: l.cat_contract_type ?? null,
      contactos: (l.contact_attempts || []).map(att => {
        const originAlias = att.cat_creation_origin
        const originObj = attemptOriginCatalog.value.find(o => o.alias === originAlias)
        return {
          id: att.lead_contact_attempt_id,
          status_alias: att.cat_status_alias,
          cat_type_attempt: att.cat_type_attempt_alias || 'we_attempt_call',
          calling_alias: att.cat_result_alias,
          calling_label: att.cat_result_label,
          status_label: att.cat_status_label,
          fechaContactoProximo: normalizeDateTime(att.contact_datetime),
          respuesta: att.response || '',
          contact_duration: att.contact_duration || 0,
          cat_reschedule_origin: att.cat_reschedule_origin || null,
          was_rescheduled: !!att.cat_reschedule_origin,
          reschedule_label: att.cat_reschedule_origin_label || null,
          timerActive: false,
          timerId: null,
          cat_creation_origin_alias: originAlias || 'we_origin_manual',
          cat_creation_origin_label: originObj ? originObj.description : 'Gestión Manual'
        }
      })
    })
    return { createdLeadId: l.id ?? l.lead_id ?? id, createdPersonId: l.person_id ?? null }
  }

  return {
    selectedProgram,
    currentEdition,
    searchingPhone,
    searchingCustomer,
    leadDataHistory,
    priceManuallySet,
    inscInitialized,
    clientProfileType,
    calculatedBasePrice,
    onProgramaTypeChange,
    onProgramaChange,
    onEditionChange,
    searchEditionsFiltered,
    searchLeadByPhone,
    searchCustomerByDocument,
    searchSunat,
    loadLead
  }
}
