import { describe, it, expect } from 'vitest'
import { amountParts, buildCollectionCards, dueLabel } from '../collectionView.js'

describe('amountParts', () => {
  it('soles como cifra principal y dolares aparte, nunca sumados', () => {
    expect(amountParts(375.5, 93)).toEqual({ main: 'S/. 375.50', extra: '+ $ 93.00' })
    expect(amountParts(1200, 0)).toEqual({ main: 'S/. 1,200.00', extra: null })
  })

  it('un grupo solo en dolares muestra los dolares', () => {
    expect(amountParts(0, 93)).toEqual({ main: '$ 93.00', extra: null })
  })
})

describe('buildCollectionCards', () => {
  it('arma las 4 tarjetas con conteo y dolares en la nota', () => {
    const cards = buildCollectionCards({
      total_count: 5, total_amount_pen: 375.5, total_amount_usd: 93,
      overdue_count: 1, overdue_amount_pen: 100, overdue_amount_usd: 0
    })
    expect(cards.map(c => c.clave)).toEqual(['total', 'overdue', 'today', 'upcoming'])
    expect(cards[0]).toMatchObject({ valor: 'S/. 375.50', nota: '5 cuotas · + $ 93.00' })
    expect(cards[1]).toMatchObject({ valor: 'S/. 100.00', nota: '1 cuota' })
    expect(cards[2]).toMatchObject({ valor: 'S/. 0.00', nota: '0 cuotas' })
  })
})

describe('dueLabel', () => {
  it('vencida con dias, hoy, pronto y lejos', () => {
    expect(dueLabel('overdue', -12)).toBe('Vencida hace 12 d')
    expect(dueLabel('overdue', 0)).toBe('Vencida')
    expect(dueLabel('today', 0)).toBe('Vence hoy')
    expect(dueLabel('upcoming', 3)).toBe('En 3 d')
    expect(dueLabel('upcoming', 20)).toBe('Por vencer')
  })
})
