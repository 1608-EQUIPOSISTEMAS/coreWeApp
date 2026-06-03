import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { computeDiscounts, round2 } from '../computeDiscounts.js'
import { useApplyDiscounts } from '../useApplyDiscounts.js'

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

  it('round2 redondea estable', () => {
    expect(round2(100.005)).toBe(100.01)
  })
})

function freshInsc () {
  return reactive({
    montoOriginal: 1000, val_porcentaje: 0, val_fijo: 0, val_beneficios: [],
    dsct_porcent_id: null, dsct_stick_id: null, dsct_benefit_ids: [],
    total_amount: 0, montoDescuentoPorcentaje: 0, montoDescuentoFijo: 0, montoBeneficioTotal: 0,
    dsct_porcent_label: null, dsct_stick_label: null
  })
}

function withDiscounts (insc, deps) {
  let api
  const wrapper = mount({ setup () { api = useApplyDiscounts(insc, deps); return () => null } })
  return { api, wrapper }
}

describe('useApplyDiscounts handlers', () => {
  it('onChangeDescuentoPorcentual setea valor y label; null lo limpia', () => {
    const insc = freshInsc()
    const { api, wrapper } = withDiscounts(insc, {})
    api.onChangeDescuentoPorcentual({ value: 15, full_label: '15% beca' })
    expect(insc.val_porcentaje).toBe(15)
    expect(insc.dsct_porcent_label).toBe('15% beca')
    api.onChangeDescuentoPorcentual(null)
    expect(insc.val_porcentaje).toBe(0)
    wrapper.unmount()
  })

  it('onChangeBeneficios mapea raw.value a numeros', () => {
    const insc = freshInsc()
    const { api, wrapper } = withDiscounts(insc, {})
    api.onChangeBeneficios([{ raw: { value: '30' } }, { raw: { value: 20 } }])
    expect(insc.val_beneficios).toEqual([30, 20])
    wrapper.unmount()
  })
})

describe('useApplyDiscounts watcher', () => {
  it('recalcula total_amount al cambiar el porcentaje', async () => {
    const insc = freshInsc()
    const { api, wrapper } = withDiscounts(insc, {})
    insc.val_porcentaje = 20
    await nextTick()
    expect(insc.montoDescuentoPorcentaje).toBe(200)
    expect(insc.total_amount).toBe(800)
    wrapper.unmount()
  })

  it('al exceder la base: avisa, resetea descuentos y deja total = base', async () => {
    const insc = freshInsc()
    insc.montoOriginal = 100
    const toast = { warning: vi.fn() }
    const discountResetKey = ref(0)
    const { api, wrapper } = withDiscounts(insc, { toast, discountResetKey })
    insc.val_porcentaje = 50
    insc.val_beneficios = [60]
    await nextTick()
    expect(toast.warning).toHaveBeenCalled()
    expect(insc.val_porcentaje).toBe(0)
    expect(insc.val_beneficios).toEqual([])
    expect(insc.total_amount).toBe(100)
    expect(discountResetKey.value).toBe(1)
    wrapper.unmount()
  })
})
