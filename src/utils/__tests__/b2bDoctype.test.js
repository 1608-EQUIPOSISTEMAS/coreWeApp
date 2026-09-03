import { describe, it, expect } from 'vitest'
import { isDocPendingDoctype } from '../b2bDoctype.js'

describe('isDocPendingDoctype', () => {
  it('cobra con Orden de Servicio y con Orden de Compra', () => {
    expect(isDocPendingDoctype('we_enrollment_b2b_doctype_service_order')).toBe(true)
    expect(isDocPendingDoctype('we_enrollment_b2b_doctype_purchase_order')).toBe(true)
  })

  // La carta de compromiso es el unico B2B documental sin cobro: si entra aca,
  // el formulario le esconde el precio y el SP rechaza la venta en cero.
  it('no cobra con carta de compromiso ni sin documento', () => {
    expect(isDocPendingDoctype('we_enrollment_b2b_doctype_compromise_letter')).toBe(false)
    expect(isDocPendingDoctype(null)).toBe(false)
    expect(isDocPendingDoctype(undefined)).toBe(false)
  })
})
