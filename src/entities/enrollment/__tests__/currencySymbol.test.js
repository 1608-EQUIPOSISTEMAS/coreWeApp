import { describe, it, expect } from 'vitest'
import { currencySymbol } from '../currencySymbol.js'

describe('currencySymbol', () => {
  it('dolares por alias del catalogo o por id cuando el catalogo no cargo', () => {
    expect(currencySymbol(7, [{ id: 7, alias: 'we_currency_dollars' }])).toBe('$')
    expect(currencySymbol(3042, [])).toBe('$')
  })

  it('soles, sin moneda o moneda desconocida caen en S/.', () => {
    expect(currencySymbol(3041, [{ id: 3041, alias: 'we_currency_soles' }])).toBe('S/.')
    expect(currencySymbol(null)).toBe('S/.')
    expect(currencySymbol(999, [])).toBe('S/.')
  })
})
