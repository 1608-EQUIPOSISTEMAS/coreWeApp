import { describe, it, expect, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { buildEnrollmentPayload } from '../buildEnrollmentPayload.js'
import { useEnrollLead } from '../useEnrollLead.js'

const idByAlias = (alias, catalog) => (catalog || []).find(i => i.alias === alias)?.id ?? null

const catalogs = {
  docType: [{ alias: 'dni', id: 1 }],
  inscModalidades: [{ alias: 'presencial', id: 2 }],
  inscPaymentModes: [{ alias: 'we_payment_way_single', id: 3 }],
  currency: [{ alias: 'pen', id: 4 }],
  country: [{ alias: 'pe', id: 5 }],
  certificateStatus: [{ alias: 'student', id: 6 }],
  paymentMethod: [{ alias: 'cash', id: 7 }]
}

function baseInsc (over = {}) {
  return {
    cat_type_document: 'dni', cat_insc_modality: 'presencial', cat_type_payment: 'we_payment_way_single',
    selectedCurrencyAlias: 'pen', cat_certificate_status: 'student', cat_method_payment: 'cash',
    cat_payment_channel: 'we_channel_general', cat_token_provider: null,
    document: '123', full_name: 'Ana', last_name: 'Diaz', mother_last_name: 'Ruiz', email: 'a@b.com',
    montoOriginal: 1000, total_amount: 900, saved_money: 100,
    dsct_porcent_id: null, dsct_porcent_label: null, dsct_stick_id: null, dsct_stick_label: null,
    dsct_benefit_ids: [{ value: 9, label: 'Beca' }], observacions: 'obs', agreement_id: null,
    ticket_payment_urls: [{ url: '/uploads/x.pdf' }], attachments: [], ...over
  }
}
const baseForm = (over = {}) => ({ country_alias: 'pe', edition_id: 50, program_version_id: 99, carnet_url: null, ...over })

describe('buildEnrollmentPayload', () => {
  it('canal general: resuelve cat_method_payment y cat_type_payment', () => {
    const p = buildEnrollmentPayload({
      insc: baseInsc(), form: baseForm(), createdLeadId: 7,
      isChannelGeneral: true, isChannelToken: false, isInstallmentMode: false,
      catalogs, idByAlias
    }).inscription
    expect(p.cat_method_payment).toBe(7)
    expect(p.cat_type_payment).toBe(3)
    expect(p.program_version_id).toBeNull() // edition_id presente
    expect(p.program_edition_id).toBe(50)
    expect(p.dsct_benefit_ids).toEqual([{ value: 9, label: 'Beca' }])
  })

  it('canal web (ni general ni token): cat_type_payment y cat_method_payment en null', () => {
    const p = buildEnrollmentPayload({
      insc: baseInsc(), form: baseForm(), createdLeadId: 7,
      isChannelGeneral: false, isChannelToken: false, isInstallmentMode: false,
      catalogs, idByAlias
    }).inscription
    expect(p.cat_type_payment).toBeNull()
    expect(p.cat_method_payment).toBeNull()
  })

  it('incluye installment_plan solo en modo cuotas', () => {
    const plan = [{ installment_number: 1, amount: 900 }]
    const withPlan = buildEnrollmentPayload({ insc: baseInsc(), form: baseForm(), isInstallmentMode: true, installmentPlan: plan, isChannelGeneral: true, catalogs, idByAlias }).inscription
    const noPlan = buildEnrollmentPayload({ insc: baseInsc(), form: baseForm(), isInstallmentMode: false, installmentPlan: plan, isChannelGeneral: true, catalogs, idByAlias }).inscription
    expect(withPlan.installment_plan).toEqual(plan)
    expect(noPlan.installment_plan).toBeNull()
  })

  it('reserva split: saved_money es la reserva inmediata', () => {
    const p = buildEnrollmentPayload({ insc: baseInsc({ saved_money: 300 }), form: baseForm(), reservaSplitEnabled: true, reservaInmediata: 120, isChannelGeneral: true, catalogs, idByAlias }).inscription
    expect(p.saved_money).toBe(120)
  })

  it('mapea adjuntos a { url, name, type }', () => {
    const p = buildEnrollmentPayload({ insc: baseInsc({ ticket_payment_urls: ['/uploads/foo.png'] }), form: baseForm(), isChannelGeneral: true, catalogs, idByAlias }).inscription
    expect(p.ticket_payment_urls[0]).toEqual({ url: '/uploads/foo.png', name: 'foo.png', type: null })
  })
})

function makeDeps (over = {}) {
  const refs = {
    createdLeadId: ref(null), createdPersonId: ref(null), leadIdParam: ref(null),
    voucherTouched: ref(false), inscInitialized: ref(true), showViewModal: ref(true)
  }
  const flags = { isChannelGeneral: ref(false), isChannelToken: ref(false), isVoucherOptional: ref(true) }
  const installment = {
    isInstallmentMode: ref(false), reservaSplitEnabled: ref(false), reservaSplitValid: ref(true),
    installmentPlanValid: ref(true), reservaDiferidaFecha: ref(''), reservaInmediata: ref(0), installmentPlan: ref([])
  }
  const validators = {
    validateInscriptionClientInfo: vi.fn(() => true), validateInscriptionPaymentInfo: vi.fn(() => true),
    validateLeadInfo: vi.fn(() => true), validateContactInfo: vi.fn(() => true), validateCommercialInfo: vi.fn(() => true)
  }
  const comercialService = {
    leadUpdate: vi.fn().mockResolvedValue({ result: 1 }),
    leadRegister: vi.fn().mockResolvedValue({ result: 1, lead_id: 555, person_id: 77 }),
    enrollmentRegister: vi.fn().mockResolvedValue({ result: 1, message: 'inscrito' })
  }
  return {
    comercialService, toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    onSuccess: vi.fn(), buildLeadPayload: vi.fn(() => ({ lead: {} })),
    idByAlias, isValidEmail: (e) => /\S+@\S+\.\S+/.test(e), catalogs,
    flags, installment, validators, refs, ...over
  }
}

describe('useEnrollLead.checkGuards', () => {
  it('precio base 0 bloquea', () => {
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc({ montoOriginal: 0 })), makeDeps())
    expect(f.checkGuards().message).toContain('Precio Base')
  })
  it('email invalido da mensaje de correo', () => {
    const deps = makeDeps()
    deps.validators.validateInscriptionClientInfo = vi.fn(() => false)
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc({ email: 'malo' })), deps)
    expect(f.checkGuards().message).toContain('correo')
  })
  it('canal general sin comprobante marca voucher y bloquea', () => {
    const deps = makeDeps()
    deps.flags.isChannelGeneral.value = true
    deps.flags.isVoucherOptional.value = false
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc({ ticket_payment_urls: [] })), deps)
    const g = f.checkGuards()
    expect(g.touchVoucher).toBe(true)
    expect(g.message).toContain('Comprobante')
  })
  it('plan de cuotas invalido bloquea', () => {
    const deps = makeDeps()
    deps.installment.isInstallmentMode.value = true
    deps.installment.installmentPlanValid.value = false
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc()), deps)
    expect(f.checkGuards().message).toContain('plan de cuotas')
  })
  it('todo valido -> ok', () => {
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc()), makeDeps())
    expect(f.checkGuards()).toEqual({ ok: true })
  })
})

describe('useEnrollLead.confirmarInscripcion', () => {
  it('guard fallido: avisa y no llama servicios', async () => {
    const deps = makeDeps()
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc({ montoOriginal: 0 })), deps)
    await f.confirmarInscripcion()
    expect(deps.toast.warning).toHaveBeenCalled()
    expect(deps.comercialService.enrollmentRegister).not.toHaveBeenCalled()
  })

  it('lead existente: leadUpdate -> enrollmentRegister result 1 -> success + onSuccess', async () => {
    const deps = makeDeps()
    deps.refs.leadIdParam.value = 10
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc()), deps)
    await f.confirmarInscripcion()
    expect(deps.comercialService.leadUpdate).toHaveBeenCalled()
    const payload = deps.comercialService.enrollmentRegister.mock.calls[0][0]
    expect(payload.inscription.lead_id).toBe(10)
    expect(deps.toast.success).toHaveBeenCalledWith('inscrito')
    expect(deps.onSuccess).toHaveBeenCalled()
    expect(deps.refs.inscInitialized.value).toBe(false)
  })

  it('lead nuevo: leadRegister setea createdLeadId y propaga al payload', async () => {
    const deps = makeDeps()
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc()), deps)
    await f.confirmarInscripcion()
    expect(deps.comercialService.leadRegister).toHaveBeenCalled()
    expect(deps.refs.createdLeadId.value).toBe(555)
    const payload = deps.comercialService.enrollmentRegister.mock.calls[0][0]
    expect(payload.inscription.lead_id).toBe(555)
  })

  it('lead result 0: error y no registra enrollment', async () => {
    const deps = makeDeps()
    deps.comercialService.leadRegister = vi.fn().mockResolvedValue({ result: 0, message: 'duplicado' })
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc()), deps)
    await f.confirmarInscripcion()
    expect(deps.toast.error).toHaveBeenCalledWith('duplicado')
    expect(deps.comercialService.enrollmentRegister).not.toHaveBeenCalled()
  })

  it('enrollment result 0: mensaje combinado (lead guardado)', async () => {
    const deps = makeDeps()
    deps.refs.leadIdParam.value = 10
    deps.comercialService.enrollmentRegister = vi.fn().mockResolvedValue({ result: 0, message: 'fallo SP' })
    const f = useEnrollLead(reactive(baseForm()), reactive(baseInsc()), deps)
    await f.confirmarInscripcion()
    expect(deps.toast.error.mock.calls[0][0]).toContain('El lead fue guardado')
  })
})
