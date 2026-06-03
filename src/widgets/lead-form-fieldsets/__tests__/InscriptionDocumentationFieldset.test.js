import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import InscriptionDocumentationFieldset from '../InscriptionDocumentationFieldset.vue'

const model = { ticket_payment_urls: [], attachments: [], val_porcentaje: 0 }
const form = { carnet_url: null }

describe('widgets/lead-form-fieldsets/InscriptionDocumentationFieldset', () => {
  it('monta sin throw con props minimas', () => {
    const wrapper = shallowMount(InscriptionDocumentationFieldset, {
      props: { model, form }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renderiza comprobantes en canal General', () => {
    const wrapper = shallowMount(InscriptionDocumentationFieldset, {
      props: { model, form, isChannelGeneral: true }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renderiza constancias en canal Web', () => {
    const wrapper = shallowMount(InscriptionDocumentationFieldset, {
      props: { model, form, isChannelWeb: true }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
