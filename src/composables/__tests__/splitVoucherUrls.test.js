import { describe, it, expect } from 'vitest'
import { splitVoucherUrls } from '../useEnrollmentFormatters'

describe('splitVoucherUrls', () => {
  it('devuelve la unica URL cuando hay un solo voucher', () => {
    expect(splitVoucherUrls('https://cdn.we.pe/a/1.jpg')).toEqual(['https://cdn.we.pe/a/1.jpg'])
  })

  it('separa dos vouchers pegados sin separador', () => {
    expect(splitVoucherUrls('https://cdn.we.pe/a/1.jpghttps://cdn.we.pe/b/2.pdf'))
      .toEqual(['https://cdn.we.pe/a/1.jpg', 'https://cdn.we.pe/b/2.pdf'])
  })

  it('separa vouchers unidos por coma, espacio o pipe', () => {
    expect(splitVoucherUrls('https://a.pe/1.jpg, https://b.pe/2.jpg|https://c.pe/3.jpg'))
      .toEqual(['https://a.pe/1.jpg', 'https://b.pe/2.jpg', 'https://c.pe/3.jpg'])
  })

  it('devuelve lista vacia sin voucher', () => {
    expect(splitVoucherUrls(null)).toEqual([])
    expect(splitVoucherUrls('')).toEqual([])
    expect(splitVoucherUrls('Ninguno')).toEqual([])
  })
})
