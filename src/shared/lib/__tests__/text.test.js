import { describe, it, expect } from 'vitest'
import { normalizeText, initials } from '../text.js'

describe('normalizeText', () => {
  it('quita tildes y mayusculas para que la busqueda no dependa de ellas', () => {
    expect(normalizeText('José MARÍA Núñez')).toBe('jose maria nunez')
  })

  it('un valor vacio o nulo es cadena vacia', () => {
    expect(normalizeText(null)).toBe('')
    expect(normalizeText(undefined)).toBe('')
  })
})

describe('initials', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(initials('ana lucia torres')).toBe('AL')
  })

  it('tolera espacios repetidos', () => {
    expect(initials('  Pedro   Diaz ')).toBe('PD')
  })

  it('sin nombre devuelve cadena vacia para que la vista ponga su relleno', () => {
    expect(initials(null)).toBe('')
    expect(initials('')).toBe('')
  })
})
