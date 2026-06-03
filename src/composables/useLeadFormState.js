import { reactive, computed, ref } from 'vue'

// Fecha-hora actual a la hora en punto. Reproducido localmente para no acoplar
// este estado de bajo nivel a una feature.
function currentHourIso () {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:00:00`
}

// Estado reactivo del formulario de lead + inscripcion (form/insc) con sus defaults
// verbatim de useLeadForm, mas los computeds de canal/modo de pago derivados de insc.
// Centraliza la fuente de estado que comparten la pagina orquestadora y las features
// (apply-discounts, plan-installments, enroll-lead, validations).
export function useLeadFormState ({ paymentChannelCatalog = ref([]) } = {}) {
  const form = reactive({
    query_alias: null,
    category_alias: null,
    program_modality_alias: null,
    fechaContactoInicial: currentHourIso(),
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
    edition_start_date: null
  })

  const insc = reactive({
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
    agreement_id: null
  })

  const channelAlias = computed(() => {
    if (!insc.cat_payment_channel) return null
    return (paymentChannelCatalog.value || []).find(c => c.id === insc.cat_payment_channel)?.alias ?? null
  })
  const isChannelGeneral = computed(() => channelAlias.value === 'we_channel_general')
  const isChannelToken = computed(() => channelAlias.value === 'we_channel_token')
  const isChannelWeb = computed(() => channelAlias.value === 'we_channel_web')
  const isVoucherOptional = computed(() => !isChannelGeneral.value || Number(insc.val_porcentaje) === 100)
  const isInstallmentMode = computed(() =>
    !isChannelWeb.value &&
    !!insc.cat_payment_channel &&
    insc.cat_type_payment === 'we_payment_way_installments' &&
    Number(insc.montoOriginal) > 0
  )

  return {
    form,
    insc,
    channelAlias,
    isChannelGeneral,
    isChannelToken,
    isChannelWeb,
    isVoucherOptional,
    isInstallmentMode
  }
}
