import { describe, it, expect } from 'vitest'
import {
  isSpeakerCategory,
  hasAssignedSeat,
  resolveEnrollmentAmounts
} from '../eventTicket.js'

describe('categoria de entrada del evento', () => {
  it('el ponente se sienta en la zona VIP, el resto no tiene asiento', () => {
    expect(hasAssignedSeat('we_event_category_ponente')).toBe(true)
    expect(hasAssignedSeat('we_event_category_vip')).toBe(true)
    expect(hasAssignedSeat('we_event_category_general')).toBe(false)
    expect(hasAssignedSeat(undefined)).toBe(false)
  })

  it('reconoce al ponente por su alias', () => {
    expect(isSpeakerCategory('we_event_category_ponente')).toBe(true)
    expect(isSpeakerCategory('we_event_category_vip')).toBe(false)
  })
})

describe('resolveEnrollmentAmounts', () => {
  // El caso que motivo la regla: el asesor elige VIP (S/400), se da cuenta de
  // que es expositor y cambia a PONENTE. Sin esto la venta se guardaba en 400.
  it('el ponente va en cero aunque arrastre el precio de la categoria anterior', () => {
    expect(resolveEnrollmentAmounts({ listPrice: 400, totalAmount: 400, isSpeakerTicket: true }))
      .toEqual({ list_price: 0, total_amount: 0 })
  })

  it('la cortesia de membresia cobra 0 pero conserva el precio de lista', () => {
    expect(resolveEnrollmentAmounts({ listPrice: 400, totalAmount: 400, isMembershipBenefit: true }))
      .toEqual({ list_price: 400, total_amount: 0 })
  })

  it('una entrada normal viaja con sus montos intactos', () => {
    expect(resolveEnrollmentAmounts({ listPrice: 400, totalAmount: 380 }))
      .toEqual({ list_price: 400, total_amount: 380 })
  })
})
