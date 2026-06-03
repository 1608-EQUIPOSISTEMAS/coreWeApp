import { describe, it, expect } from 'vitest'
import { buildLeadPayload } from '../useLeadFormPayloads.js'

const catalogs = {
  leadStatus: [{ alias: 'bought', id: 10 }],
  country: [{ alias: 'pe', id: 5 }],
  programType: [{ alias: 'diploma', id: 3 }],
  attempts: [{ alias: 'we_attempt_call', id: 1 }],
  calling: [{ alias: 'we_calling_pending', id: 2 }]
}

const form = {
  status_alias: 'bought', country_alias: 'pe', category_alias: 'diploma',
  program_version_id: 99, edition_id: 50, full_name: 'Ana', pay_date: '2026-02-01',
  telefono: ' 999 ', mensajeChat: ' hola ', observacion: '  ',
  bot: false, active: true, web: true, b2b: false, membership_moment_id: 7,
  company_id: null, cat_contract_type: null,
  contactos: [{ id: null, cat_type_attempt: 'we_attempt_call', calling_alias: 'we_calling_pending', fechaContactoProximo: '2026-02-01 10:00', respuesta: 'ok', contact_duration: 30 }]
}

describe('buildLeadPayload', () => {
  it('resuelve ids de catalogo y convierte flags a Y/N', () => {
    const p = buildLeadPayload({ form, catalogs }).lead
    expect(p.cat_status_lead).toBe(10)
    expect(p.cat_code_country).toBe(5)
    expect(p.cat_program_type).toBe(3)
    expect(p.web).toBe('Y')
    expect(p.bot).toBe('N')
    expect(p.active).toBe('Y')
  })

  it('recorta strings y normaliza vacios a null', () => {
    const p = buildLeadPayload({ form, catalogs }).lead
    expect(p.origin_phone).toBe('999')
    expect(p.message_init_conversation).toBe('hola')
    expect(p.observations).toBeNull()
  })

  it('mapea contact_attempts con attempt_number 1-based y resuelve ids', () => {
    const { contact_attempts } = buildLeadPayload({ form, catalogs })
    expect(contact_attempts).toHaveLength(1)
    expect(contact_attempts[0]).toMatchObject({ attempt_number: 1, cat_type_attempt: 1, cat_result: 2, response: 'ok', contact_duration: 30 })
  })

  it('cat_business_line_id se resuelve solo si hay businessLine', () => {
    const blOpts = [{ alias: 'sistemas', id: 88 }]
    expect(buildLeadPayload({ form, catalogs, businessLineOptions: blOpts, businessLine: 'sistemas' }).lead.cat_business_line_id).toBe(88)
    expect(buildLeadPayload({ form, catalogs, businessLineOptions: blOpts, businessLine: null }).lead.cat_business_line_id).toBeNull()
  })
})
