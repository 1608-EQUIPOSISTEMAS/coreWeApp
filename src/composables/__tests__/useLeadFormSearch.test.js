import { describe, it, expect, vi } from 'vitest'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { useLeadFormSearch } from '../useLeadFormSearch.js'

function withSearch (deps, formOver = {}, inscOver = {}) {
  const form = reactive({ telefono: '', ocupacion_alias: null, price_student_soles: 0, price_student_dollars: 0, price_profesional_soles: 0, price_profesional_dollars: 0, program_sessions: 0, ...formOver })
  const insc = reactive({ document: '', selectedCurrencyAlias: '', montoOriginal: 0, ...inscOver })
  let api
  const wrapper = mount({ setup () { api = useLeadFormSearch(form, insc, deps); return () => null } })
  return { form, insc, api, wrapper }
}

const baseDeps = (over = {}) => ({
  comercialService: { searchPhoneGet: vi.fn(), leadGet: vi.fn() },
  customerService: { customerInfoGet: vi.fn(), sunatGet: vi.fn() },
  editionService: { editionCaller: vi.fn().mockResolvedValue([]) },
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  ...over
})

describe('useLeadFormSearch cascade', () => {
  it('onProgramaChange copia precios/sesiones del programa al form', () => {
    const { form, api, wrapper } = withSearch(baseDeps())
    api.onProgramaChange({ abbreviation: 'DEV', price_student_soles: 800, sessions: 12, sessions_per_week: 2, count_children: 3 })
    expect(form.program_label).toBe('DEV')
    expect(form.price_student_soles).toBe(800)
    expect(form.program_sessions).toBe(12)
    expect(form.count_children).toBe(3)
    wrapper.unmount()
  })

  it('calculatedBasePrice fija montoOriginal segun moneda/perfil', async () => {
    const deps = baseDeps({ })
    const { insc, wrapper } = withSearch(deps,
      { ocupacion_alias: 'oc1', price_student_soles: 500 },
      { selectedCurrencyAlias: 'we_currency_soles' })
    // sin perfil profesional -> cae a estudiante
    expect(insc.montoOriginal).toBe(500)
    wrapper.unmount()
  })

  it('onProgramaTypeChange limpia el programa/edicion y precios', () => {
    const { form, api, wrapper } = withSearch(baseDeps(), { program_version_id: 9, price_student_soles: 800 })
    api.onProgramaTypeChange({})
    expect(form.program_version_id).toBeNull()
    expect(form.price_student_soles).toBe(0)
    wrapper.unmount()
  })
})

describe('useLeadFormSearch busquedas', () => {
  it('searchCustomerByDocument: cliente en BD precarga insc', async () => {
    const deps = baseDeps()
    deps.customerService.customerInfoGet = vi.fn().mockResolvedValue({ result: 1, first_name: 'Ana', last_name: 'Diaz', mother_last_name: 'Ruiz', email: 'a@b.com' })
    const { insc, api, wrapper } = withSearch(deps, {}, { document: '12345678' })
    await api.searchCustomerByDocument()
    expect(insc.full_name).toBe('Ana')
    expect(insc.email).toBe('a@b.com')
    wrapper.unmount()
  })

  it('searchCustomerByDocument: si no esta en BD cae a SUNAT', async () => {
    const deps = baseDeps()
    deps.customerService.customerInfoGet = vi.fn().mockResolvedValue({ result: 0 })
    deps.customerService.sunatGet = vi.fn().mockResolvedValue({ nombre_o_razon_social: 'EMPRESA SAC' })
    const { insc, api, wrapper } = withSearch(deps, {}, { document: '20123456789' })
    await api.searchCustomerByDocument()
    expect(insc.full_name).toBe('EMPRESA SAC')
    wrapper.unmount()
  })

  it('searchLeadByPhone valida longitud minima', async () => {
    const deps = baseDeps()
    const { api, wrapper } = withSearch(deps, { telefono: '12' })
    await api.searchLeadByPhone()
    expect(deps.toast.warning).toHaveBeenCalled()
    expect(deps.comercialService.searchPhoneGet).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('useLeadFormSearch loadLead', () => {
  it('mapea el lead al form (Y/N, fechas, contactos)', async () => {
    const deps = baseDeps()
    deps.comercialService.leadGet = vi.fn().mockResolvedValue({
      lead: {
        id: 7, full_name: 'Ana', origin_phone: '999', web: 'Y', b2b: 'N', status_alias: 's',
        pay_date: '2026-02-01T00:00:00', message_init_conversation: 'hola',
        contact_attempts: [{ lead_contact_attempt_id: 1, cat_result_alias: 'we_calling_pending', contact_datetime: '2026-02-01 10:00' }]
      }
    })
    const { form, api, wrapper } = withSearch(deps)
    const res = await api.loadLead(7)
    expect(form.full_name).toBe('Ana')
    expect(form.web).toBe(true)
    expect(form.b2b).toBe(false)
    expect(form.pay_date).toBe('2026-02-01')
    expect(form.contactos).toHaveLength(1)
    expect(res.createdLeadId).toBe(7)
    wrapper.unmount()
  })
})
