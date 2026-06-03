import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import TransactionSummaryCard from '../TransactionSummaryCard.vue'

const insc = {
  montoOriginal: 1500,
  montoDescuentoPorcentaje: 0,
  montoDescuentoFijo: 0,
  montoBeneficioTotal: 0,
  dsct_benefit_ids: [],
  val_beneficios: [],
  total_amount: 1500,
  saved_money: 0
}

describe('widgets/transaction-summary/TransactionSummaryCard', () => {
  it('monta sin throw con props minimas', () => {
    const wrapper = shallowMount(TransactionSummaryCard, {
      props: { insc, currencySymbol: 'S/', isInstallmentMode: false }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('formatea el monto final con separador de miles (fmt2)', () => {
    const wrapper = shallowMount(TransactionSummaryCard, {
      props: { insc, currencySymbol: 'S/', isInstallmentMode: false }
    })
    expect(wrapper.find('.value-total').text()).toContain('1,500.00')
  })

  it('muestra hint de adelanto en modo cuotas', () => {
    const wrapper = shallowMount(TransactionSummaryCard, {
      props: { insc: { ...insc, saved_money: 300 }, currencySymbol: 'S/', isInstallmentMode: true }
    })
    expect(wrapper.text()).toContain('Adelanto')
  })
})
