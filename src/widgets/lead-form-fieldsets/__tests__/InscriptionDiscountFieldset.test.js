import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import InscriptionDiscountFieldset from '../InscriptionDiscountFieldset.vue'

const discountService = { discountCaller: vi.fn().mockResolvedValue([]) }
const baseProps = (over = {}) => ({
  model: { dsct_benefit_ids: [], montoOriginal: 1000, selectedCurrencyAlias: 'we_currency_soles' },
  discountService,
  discountCatalog: [{ alias: 'we_discount_type_percentage', id: 1 }, { alias: 'we_discount_type_fixed', id: 2 }, { alias: 'we_discount_type_benefit', id: 3 }],
  currencyCatalog: [{ alias: 'we_currency_soles', id: 9 }],
  ...over
})

describe('widgets/lead-form-fieldsets/InscriptionDiscountFieldset', () => {
  it('monta sin throw con props minimas', () => {
    const wrapper = shallowMount(InscriptionDiscountFieldset, { props: baseProps() })
    expect(wrapper.exists()).toBe(true)
  })

  it('emite change-porcentual', () => {
    const wrapper = shallowMount(InscriptionDiscountFieldset, { props: baseProps() })
    wrapper.vm.$emit('change-porcentual', { id: 1 })
    expect(wrapper.emitted('change-porcentual')).toBeTruthy()
  })

  it('no renderiza las columnas cuando show es false', () => {
    const wrapper = shallowMount(InscriptionDiscountFieldset, { props: baseProps({ show: false }) })
    expect(wrapper.find('.col-md-4').exists()).toBe(false)
  })
})
