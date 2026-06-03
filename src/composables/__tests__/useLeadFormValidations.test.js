import { describe, it, expect } from 'vitest'
import { reactive, ref } from 'vue'
import { useLeadFormValidations } from '../useLeadFormValidations.js'
import { idByAlias, aliasById } from '../../shared/lib/catalog.js'
import { isValidEmail } from '../../shared/lib/validators.js'

describe('shared/lib helpers', () => {
  const cat = [{ id: 1, alias: 'a' }, { id: 2, alias: 'b' }]
  it('idByAlias resuelve por alias y por raw.alias (id de nivel superior)', () => {
    expect(idByAlias('a', cat)).toBe(1)
    expect(idByAlias('b', cat)).toBe(2)
    expect(idByAlias('x', cat)).toBeNull()
    expect(idByAlias(null, cat)).toBeNull()
    // matchea por raw.alias pero devuelve el id de nivel superior (verbatim)
    expect(idByAlias('z', [{ id: 5, alias: 'other', raw: { alias: 'z' } }])).toBe(5)
  })
  it('aliasById inverso', () => {
    expect(aliasById(2, cat)).toBe('b')
    expect(aliasById(9, cat)).toBeNull()
  })
  it('isValidEmail', () => {
    expect(isValidEmail('a@b.com')).toBe(true)
    expect(isValidEmail('malo')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

const fullForm = () => reactive({
  fechaContactoInicial: '2026-01-01', telefono: '999', status_alias: 's', country_alias: 'pe',
  full_name: 'Ana', cat_client_moment_alias: 'm', nivel_alias: 'n', mensajeChat: 'hola',
  canal_alias: 'c', medium_alias: 'md', key_word_alias: 'kw', program_version_id: null, edition_id: null
})
const fullInsc = () => reactive({
  cat_type_document: 'dni', document: '123', email: 'a@b.com', full_name: 'Ana', last_name: 'Diaz',
  mother_last_name: 'Ruiz', cat_insc_modality: 'pres', cat_certificate_status: 'std',
  selectedCurrencyAlias: 'pen', cat_type_payment: 'we_payment_way_single', cat_method_payment: 'cash',
  cat_token_provider: null, saved_money: 0
})
const channel = (g = false, t = false, w = false) => ({ isChannelGeneral: ref(g), isChannelToken: ref(t), isChannelWeb: ref(w) })

describe('useLeadFormValidations', () => {
  it('validateLeadInfo: exige fechaContactoInicial y respeta requiresEdition', () => {
    const form = fullForm()
    const v = useLeadFormValidations(form, fullInsc(), { channel: channel(), requiresEdition: false })
    expect(v.validateLeadInfo()).toBe(true)
    form.fechaContactoInicial = ''
    expect(v.validateLeadInfo()).toBe(false)
  })
  it('validateLeadInfo: requiresEdition bloquea sin edition_id', () => {
    const form = fullForm(); form.program_version_id = 9
    const v = useLeadFormValidations(form, fullInsc(), { channel: channel(), requiresEdition: true })
    expect(v.validateLeadInfo()).toBe(false)
    form.edition_id = 100
    expect(v.validateLeadInfo()).toBe(true)
  })
  it('validateContactInfo / validateCommercialInfo', () => {
    const form = fullForm()
    const v = useLeadFormValidations(form, fullInsc(), { channel: channel() })
    expect(v.validateContactInfo()).toBe(true)
    expect(v.validateCommercialInfo()).toBe(true)
    form.telefono = ''
    expect(v.validateContactInfo()).toBe(false)
  })
  it('validateInscriptionClientInfo: campos + email valido', () => {
    const insc = fullInsc()
    const v = useLeadFormValidations(fullForm(), insc, { channel: channel() })
    expect(v.validateInscriptionClientInfo()).toBe(true)
    insc.email = 'malo'
    expect(v.validateInscriptionClientInfo()).toBe(false)
  })
  it('validateInscriptionPaymentInfo: general exige tipo+metodo', () => {
    const insc = fullInsc()
    const v = useLeadFormValidations(fullForm(), insc, { channel: channel(true) })
    expect(v.validateInscriptionPaymentInfo()).toBe(true)
    insc.cat_method_payment = null
    expect(v.validateInscriptionPaymentInfo()).toBe(false)
  })
  it('validateInscriptionPaymentInfo: cuotas exige saved_money', () => {
    const insc = fullInsc(); insc.cat_type_payment = 'we_payment_way_installments'; insc.saved_money = 0
    const v = useLeadFormValidations(fullForm(), insc, { channel: channel(true) })
    expect(v.validateInscriptionPaymentInfo()).toBe(false)
    insc.saved_money = 50
    expect(v.validateInscriptionPaymentInfo()).toBe(true)
  })
  it('validateInscriptionPaymentInfo: web siempre ok; token exige proveedor', () => {
    const insc = fullInsc()
    expect(useLeadFormValidations(fullForm(), insc, { channel: channel(false, false, true) }).validateInscriptionPaymentInfo()).toBe(true)
    const insc2 = fullInsc()
    expect(useLeadFormValidations(fullForm(), insc2, { channel: channel(false, true) }).validateInscriptionPaymentInfo()).toBe(false)
  })
})
