import { describe, it, expect } from 'vitest'
import { tokenInscriptionFlags, tokenLinkAmount } from '../tokenInscriptionFlags.js'

// Forma real del token 838 de produccion (24/09/26), recortada.
const token = {
  payment_type: 'credito',
  inscription_data: {
    inscription: {
      document: '42165133', full_name: 'OMAR FERNANDO', email: 'o@x.com',
      list_price: 950, total_amount: 330, saved_money: 0,
      cat_type_payment: 2467, cat_payment_channel: 4302,
      dsct_porcent_id: 14, dsct_stick_id: null,
      dsct_benefit_ids: [{ label: '50.00 - GIFT CARD 50', value: 19 }],
      installment_plan: [{ installment_number: 1, amount: 330, due_date: '2026-09-30' }]
    }
  }
}

const discountsByType = {
  we_discount_type_percentage: [{ id: 14, value: 60, full_label: '60% - GLOBAL 60%' }],
  we_discount_type_benefit:    [{ id: 19, value: 50, full_label: '50.00 - GIFT CARD 50' }]
}

describe('tokenInscriptionFlags', () => {
  it('trae los descuentos con su valor numerico, no solo el ID', () => {
    const flags = tokenInscriptionFlags(token, { discountsByType })
    expect(flags.discounts).toEqual([
      { type_alias: 'we_discount_type_percentage', discount_id: 14, label: '60% - GLOBAL 60%', value: 60 },
      { type_alias: 'we_discount_type_benefit',    discount_id: 19, label: '50.00 - GIFT CARD 50', value: 50 }
    ])
  })

  it('descarta el descuento que ya no existe en vez de meterlo en 0', () => {
    const flags = tokenInscriptionFlags(token, { discountsByType: {} })
    expect(flags.discounts).toEqual([])
  })

  it('traduce canal y tipo de pago del token', () => {
    const flags = tokenInscriptionFlags(token, {
      discountsByType, paymentChannels: [{ id: 4302, alias: 'we_channel_token' }]
    })
    expect(flags.payment_channel_alias).toBe('we_channel_token')
    expect(flags.token_payment_type).toBe('credito')
    expect(flags.first_name).toBe('OMAR FERNANDO')
    expect(flags.cat_payment_plan).toBe(2467)
  })
})

describe('tokenLinkAmount', () => {
  it('en cuotas cobra solo la reserva (0 si no se puso: el bug del token 838)', () => {
    expect(tokenLinkAmount({ cat_type_payment: 'we_payment_way_installments', saved_money: 0, total_amount: 330 })).toBe(0)
    expect(tokenLinkAmount({ cat_type_payment: 'we_payment_way_installments', saved_money: 100, total_amount: 330 })).toBe(100)
  })
  it('al contado cobra el total', () => {
    expect(tokenLinkAmount({ cat_type_payment: 'we_payment_way_single', total_amount: 330, montoOriginal: 950 })).toBe(330)
  })
})
