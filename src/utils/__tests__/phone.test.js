import { describe, it, expect } from 'vitest'
import { normalizePhoneQuery } from '../phone.js'

// El riesgo real no es limpiar el telefono, es limpiar un nombre por error:
// el mismo input busca por ambos.
describe('normalizePhoneQuery', () => {
  it('quita espacios y separadores de un telefono pegado', () => {
    expect(normalizePhoneQuery('941 452 157')).toBe('941452157')
    expect(normalizePhoneQuery('941-452-157')).toBe('941452157')
    expect(normalizePhoneQuery(' (01) 941 452 157 ')).toBe('01941452157')
  })

  it('deja intacto un nombre con espacios', () => {
    expect(normalizePhoneQuery('JUAN PEREZ')).toBe('JUAN PEREZ')
    expect(normalizePhoneQuery('ANA 2')).toBe('ANA 2')
  })

  it('no toca un telefono ya limpio ni valores vacios', () => {
    expect(normalizePhoneQuery('941452157')).toBe('941452157')
    expect(normalizePhoneQuery('')).toBe('')
    expect(normalizePhoneQuery(null)).toBe(null)
  })
})
