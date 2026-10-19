import { describe, it, expect } from 'vitest'
import { canAccess } from '../navAccess.js'

const liderComercial = {
  roles: ['LIDER_COMERCIAL'],
  modules: ['COMERCIAL'],
  submodules: { COMERCIAL: ['LEADS', 'PLAN_COMERCIAL'] }
}
const llamarHoy = { module: 'COMERCIAL', submodule: 'LLAMAR_HOY', roles: ['ADMIN', 'LIDER_COMERCIAL'] }

describe('canAccess: la matriz manda', () => {
  it('casilla desmarcada oculta aunque el rol este escrito en _nav.js (caso LIDER_COMERCIAL)', () => {
    expect(canAccess(llamarHoy, liderComercial)).toBe(false)
  })
  it('casilla marcada abre aunque el rol no este en el codigo', () => {
    expect(canAccess({ module: 'COMERCIAL', submodule: 'PLAN_COMERCIAL', roles: ['ADMIN'] }, liderComercial)).toBe(true)
  })
  it('un grupo se abre con el modulo o con alguno de sus submodulos', () => {
    expect(canAccess({ module: 'COMERCIAL' }, liderComercial)).toBe(true)
    expect(canAccess({ module: 'GERENCIA' }, liderComercial)).toBe(false)
    expect(canAccess({ module: 'FICO' }, { ...liderComercial, submodules: { FICO: ['TOKENS'] } })).toBe(true)
  })
  it('funcion sin casilla propia sigue siendo solo por rol, aunque se tenga el modulo', () => {
    const documentos = { module: 'TICKETS', roles: ['ADMIN'] }
    expect(canAccess(documentos, { roles: ['FICO'], modules: ['TICKETS'], submodules: {} })).toBe(false)
  })
  it('ADMIN ve todo', () => {
    expect(canAccess(llamarHoy, { roles: ['ADMIN'], modules: [], submodules: {} })).toBe(true)
  })
  it('sin module ni roles es publico', () => {
    expect(canAccess({}, liderComercial)).toBe(true)
  })
})

describe('canAccess: sesion vieja sin matriz', () => {
  const vieja = { roles: ['LIDER_COMERCIAL'], modules: null, submodules: null }
  it('cae a los roles del codigo para no dejar al usuario sin menu', () => {
    expect(canAccess(llamarHoy, vieja)).toBe(true)
    expect(canAccess({ module: 'GERENCIA', submodule: 'X', roles: ['GERENCIA'] }, vieja)).toBe(false)
  })
})
