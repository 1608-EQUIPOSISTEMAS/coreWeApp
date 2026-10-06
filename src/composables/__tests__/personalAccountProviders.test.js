import { describe, it, expect } from 'vitest'
import { useEnrollmentFormatters } from '../useEnrollmentFormatters.js'

// Etiqueta "Cuenta propia" del panel FICO: si se pierde, Academica le entrega
// una cuenta a quien no la pago.
const { personalAccountProviders, hasPersonalAccount } = useEnrollmentFormatters()

describe('personalAccountProviders', () => {
  it('member por FICO directo: sale de los beneficios aunque la columna este vacia', () => {
    const e = { personal_account: null, additional_discounts: '0.00 - CUENTA CLAUDE, 0.00 - CUENTA CHATGPT' }
    expect(personalAccountProviders(e)).toEqual(['CLAUDE', 'CHATGPT'])
  })

  it('columna guardada y beneficio iguales no se duplican', () => {
    expect(personalAccountProviders({ personal_account: 'CLAUDE', additional_discounts: '100.00 - CUENTA CLAUDE' })).toEqual(['CLAUDE'])
  })

  it('sin beneficio ni columna: no hay etiqueta', () => {
    expect(hasPersonalAccount({ personal_account: null, additional_discounts: '55.00 - GLOBAL 55%' })).toBe(false)
  })
})
