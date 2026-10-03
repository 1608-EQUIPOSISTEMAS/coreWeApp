import { describe, it, expect } from 'vitest'
import { computeDiscounts, chargedTotal, round2 } from '../computeDiscounts.js'

describe('computeDiscounts (puro)', () => {
  it('descuento porcentual', () => {
    const r = computeDiscounts({ montoOriginal: 1000, val_porcentaje: 10 })
    expect(r.montoPorcentaje).toBe(100)
    expect(r.total_amount).toBe(900)
    expect(r.exceedsBase).toBe(false)
  })

  it('promo fija (stick): val_fijo es el precio objetivo final', () => {
    const r = computeDiscounts({ montoOriginal: 1000, val_fijo: 800, dsct_stick_id: 5 })
    expect(r.montoFijo).toBe(200)
    expect(r.total_amount).toBe(800)
  })

  it('beneficios se suman a los descuentos', () => {
    const r = computeDiscounts({ montoOriginal: 1000, val_beneficios: [50, 50] })
    expect(r.montoBeneficioTotal).toBe(100)
    expect(r.total_amount).toBe(900)
  })

  // Beca: el beneficio (CUENTA CLAUDE, LAPTOP) vale por su badge, no por su monto.
  it('beca 100%: el beneficio entra en 0 y NO resetea la seleccion', () => {
    const r = computeDiscounts({ montoOriginal: 1000, val_porcentaje: 100, val_beneficios: [100] })
    expect(r.beneficiosSoloBadge).toBe(true)
    expect(r.montoBeneficioTotal).toBe(0)
    expect(r.exceedsBase).toBe(false)
    expect(r.total_amount).toBe(0)
  })

  it('Member Black (precio base 0): mismo trato que la beca', () => {
    const r = computeDiscounts({ montoOriginal: 0, val_beneficios: [100] })
    expect(r.beneficiosSoloBadge).toBe(true)
    expect(r.exceedsBase).toBe(false)
  })

  // Con saldo > 0 el beneficio descuenta normal, aunque no quepa entero: ahi
  // sigue mandando el reseteo de siempre, no se reparte ni se recorta.
  it('con saldo parcial NO clampa: el beneficio que no cabe dispara exceedsBase', () => {
    const r = computeDiscounts({ montoOriginal: 1000, val_porcentaje: 94, val_beneficios: [100] })
    expect(r.beneficiosSoloBadge).toBe(false)
    expect(r.montoBeneficioTotal).toBe(100)
    expect(r.exceedsBase).toBe(true)
  })

  it('marca exceedsBase cuando los descuentos superan la base', () => {
    const r = computeDiscounts({ montoOriginal: 100, val_porcentaje: 50, val_beneficios: [60] })
    expect(r.totalDescuentos).toBeGreaterThan(100)
    expect(r.exceedsBase).toBe(true)
    expect(r.total_amount).toBe(100)
  })

  it('total truncado a entero y nunca negativo', () => {
    expect(computeDiscounts({ montoOriginal: 100.9 }).total_amount).toBe(100)
    expect(computeDiscounts({ montoOriginal: 0 }).total_amount).toBe(0)
  })

  // Caso real, inscripcion 18805: lista 730, 65% + beneficio 50 = 205.50.
  describe('chargedTotal: solo el modulo B2B cobra al centimo, el resto trunca', () => {
    const r = computeDiscounts({ montoOriginal: 730, val_porcentaje: 65, val_beneficios: [50] })

    it('el formulario B2B conserva los centimos', () => {
      expect(chargedTotal(r, 'we_business_line_b2b')).toBe(205.5)
    })

    it('Fundacion y Comercial (sin linea) truncan a soles enteros', () => {
      expect(chargedTotal(r, 'we_business_line_fundacion')).toBe(205)
      expect(chargedTotal(r, null)).toBe(205)
    })
  })

  it('round2 redondea estable', () => {
    expect(round2(100.005)).toBe(100.01)
  })
})
