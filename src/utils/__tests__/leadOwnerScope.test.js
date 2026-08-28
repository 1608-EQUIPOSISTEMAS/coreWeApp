import { describe, it, expect } from 'vitest'
import { isAdvisorScopedToOwnLeads } from '../leadOwnerScope.js'

describe('isAdvisorScopedToOwnLeads', () => {
  it('el asesor raso solo ve sus propios leads', () => {
    expect(isAdvisorScopedToOwnLeads(['B2B'], 'B2B')).toBe(true)
    expect(isAdvisorScopedToOwnLeads(['COMERCIAL'], 'COMERCIAL')).toBe(true)
  })

  // El bug que motivo este archivo: /b2b/leads acotaba a Nataly a sus propios
  // leads porque el rol LIDER_B2B no existia cuando se escribio la vista.
  it('el lider del area ve el universo completo de asesores', () => {
    expect(isAdvisorScopedToOwnLeads(['B2B', 'LIDER_B2B'], 'B2B')).toBe(false)
    expect(isAdvisorScopedToOwnLeads(['COMERCIAL', 'LIDER_COMERCIAL'], 'COMERCIAL')).toBe(false)
    expect(isAdvisorScopedToOwnLeads(['FUNDACION', 'LIDER_FUNDACION'], 'FUNDACION')).toBe(false)
  })

  it('ADMIN y GERENCIA nunca quedan acotados', () => {
    expect(isAdvisorScopedToOwnLeads(['B2B', 'ADMIN'], 'B2B')).toBe(false)
    expect(isAdvisorScopedToOwnLeads(['B2B', 'GERENCIA'], 'B2B')).toBe(false)
  })

  it('sin el rol del area no aplica el acotamiento', () => {
    expect(isAdvisorScopedToOwnLeads(['ACADEMICA'], 'B2B')).toBe(false)
    expect(isAdvisorScopedToOwnLeads([], 'B2B')).toBe(false)
    expect(isAdvisorScopedToOwnLeads(undefined, 'B2B')).toBe(false)
  })

  // El lider de OTRA area no hereda nada: si ademas es asesor B2B, sigue acotado.
  it('el lider de otra area no desacota', () => {
    expect(isAdvisorScopedToOwnLeads(['B2B', 'LIDER_COMERCIAL'], 'B2B')).toBe(true)
  })
})
