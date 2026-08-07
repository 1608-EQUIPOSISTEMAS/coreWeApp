import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import EnrollmentHeader from '../EnrollmentHeader.vue'

const seatText = enrollment => {
  const wrapper = shallowMount(EnrollmentHeader, { props: { enrollment } })
  const card = wrapper.findAll('.eh-ic').find(c => c.text().includes('Asiento VIP'))
  return card ? card.find('.eh-ic-value').text() : null
}

describe('EnrollmentHeader / asiento VIP', () => {
  it('muestra el asiento cuando la entrada es VIP', () => {
    expect(seatText({ event_category_alias: 'we_event_category_vip', event_seat: 'A-12' }))
      .toBe('A-12')
  })

  it('oculta la tarjeta si la entrada no es VIP aunque venga asiento', () => {
    expect(seatText({ event_category_alias: 'we_event_category_general', event_seat: 'A-12' }))
      .toBeNull()
  })

  it('oculta la tarjeta si el asiento viene vacio', () => {
    expect(seatText({ event_category_alias: 'we_event_category_vip', event_seat: '  ' }))
      .toBeNull()
  })
})
