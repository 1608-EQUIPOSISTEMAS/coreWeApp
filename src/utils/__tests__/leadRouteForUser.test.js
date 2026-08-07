import { describe, it, expect } from 'vitest'
import { leadRouteForUser } from '../leadRouteForUser.js'

describe('leadRouteForUser', () => {
  it('manda a Fundacion al asesor de Fundacion (el bug: iba a Comercial y el guard lo bloqueaba)', () => {
    expect(leadRouteForUser({ roles: ['FUNDACION'] })).toBe('FundacionLeadsEdit')
    expect(leadRouteForUser({ roles: ['LIDER_FUNDACION'] })).toBe('FundacionLeadsEdit')
  })

  it('respeta Comercial y B2B', () => {
    expect(leadRouteForUser({ roles: ['COMERCIAL'] })).toBe('ComercialLeadDetalle')
    expect(leadRouteForUser({ roles: ['B2B'] })).toBe('B2BLeadsEdit')
  })

  it('ADMIN y roles mixtos prefieren Comercial', () => {
    expect(leadRouteForUser({ roles: ['ADMIN'] })).toBe('ComercialLeadDetalle')
    expect(leadRouteForUser({ roles: ['FUNDACION', 'COMERCIAL'] })).toBe('ComercialLeadDetalle')
  })

  it('rol creado en la matriz: decide por el submodulo LEADS otorgado', () => {
    expect(leadRouteForUser({ roles: ['ASESOR_FUND'], submodules: { FUNDACION: ['LEADS', 'EVENTOS'] } }))
      .toBe('FundacionLeadsEdit')
  })

  it('sin datos cae a Comercial', () => {
    expect(leadRouteForUser()).toBe('ComercialLeadDetalle')
    expect(leadRouteForUser({ roles: ['ACADEMICA'] })).toBe('ComercialLeadDetalle')
  })
})
