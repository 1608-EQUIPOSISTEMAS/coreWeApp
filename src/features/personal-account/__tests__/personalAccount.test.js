import { describe, it, expect } from 'vitest'
import { resolvePersonalAccount, requiresModulePick } from '../personalAccount.js'

const claude100 = { value: 49, label: '100.00 - CUENTA CLAUDE' }
const chatgpt200 = { value: 55, label: '200.00 - CUENTA CHATGPT' }
const gift = { value: 19, label: '50.00 - GIFT CARD 50' }

describe('resolvePersonalAccount', () => {
  it('sin beneficio de cuenta no hay etiqueta', () => {
    expect(resolvePersonalAccount({ benefits: [gift], moduleCount: 2 }))
      .toEqual({ personal_account: null, personal_account_modules: null })
  })

  it('S/200 en especializacion: todos los modulos (lista null)', () => {
    expect(resolvePersonalAccount({ benefits: [gift, chatgpt200], moduleCount: 2, selectedModules: [7] }))
      .toEqual({ personal_account: 'CHATGPT', personal_account_modules: null })
  })

  it('S/100 en especializacion: solo los modulos marcados', () => {
    expect(resolvePersonalAccount({ benefits: [claude100], moduleCount: 2, selectedModules: [8] }))
      .toEqual({ personal_account: 'CLAUDE', personal_account_modules: [8] })
  })

  it('curso suelto: la cuenta es del curso, sin modulos', () => {
    expect(resolvePersonalAccount({ benefits: [claude100], moduleCount: 0 }))
      .toEqual({ personal_account: 'CLAUDE', personal_account_modules: null })
  })
})

describe('requiresModulePick', () => {
  it('solo pide modulos con S/100 en un paquete', () => {
    expect(requiresModulePick([claude100], 2)).toBe(true)
    expect(requiresModulePick([chatgpt200], 2)).toBe(false)
    expect(requiresModulePick([claude100], 0)).toBe(false)
  })
})
