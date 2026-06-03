import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LeadEnrollmentModal from '../LeadEnrollmentModal.vue'

describe('widgets/LeadEnrollmentModal', () => {
  it('monta sin throw con props minimas', () => {
    const wrapper = shallowMount(LeadEnrollmentModal, {
      props: { show: false, data: null, isLoading: false, observed: null, resubmitting: false }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('monta sin throw con una matricula y banner de observacion', () => {
    const data = {
      abbreviation: 'CURSO-X',
      student_name: 'Juan Perez',
      currency_symbol: 'we_currency_soles',
      list_price: 1000,
      total_amount: 800,
      total_paid: 200,
      discounts_list: [],
      files_list: [],
      installment_plan: [
        { installment_id: 1, installment_number: 1, due_date: '01/06/2026', amount: 400, status_alias: 'we_payment_status_pending', status_label: 'Pendiente' }
      ]
    }
    const wrapper = shallowMount(LeadEnrollmentModal, {
      props: {
        show: true,
        data,
        isLoading: false,
        observed: { reason: 'Falta voucher', enrollmentId: 1 },
        resubmitting: false
      }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
