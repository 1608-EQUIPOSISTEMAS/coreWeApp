import { describe, it, expect } from 'vitest'
import { numeradorDeSemanas } from '../cronograma'

describe('numeradorDeSemanas', () => {
  it('la primera semana con ediciones es la 1 aunque el SP diga 2 (nov/2026 empieza domingo)', () => {
    const numero = numeradorDeSemanas([
      { schedule: 1, items: [] },
      { schedule: 2, items: [{}] },
      { schedule: 5, items: [{}] }
    ])
    expect(numero(2)).toBe(1)
    expect(numero(5)).toBe(4)
  })

  it('no toca el número si la semana 1 ya tiene ediciones', () => {
    const numero = numeradorDeSemanas([{ schedule: 1, items: [{}] }, { schedule: 2, items: [{}] }])
    expect(numero(2)).toBe(2)
  })

  it('un mes vacío no rompe', () => {
    expect(numeradorDeSemanas([])(3)).toBe(3)
  })
})
