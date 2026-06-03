import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LeadInfoFieldset from '../LeadInfoFieldset.vue'
import ContactInfoFieldset from '../ContactInfoFieldset.vue'
import CommercialInfoFieldset from '../CommercialInfoFieldset.vue'
import InscriptionClientFieldset from '../InscriptionClientFieldset.vue'
import InscriptionPaymentFieldset from '../InscriptionPaymentFieldset.vue'

// Stub de la directiva global v-restrict (vive en la app, no en los tests).
const global = {
  directives: {
    restrict: {}
  }
}

const model = {}

describe('widgets/lead-form-fieldsets', () => {
  it('LeadInfoFieldset monta sin throw con props minimas', () => {
    const wrapper = shallowMount(LeadInfoFieldset, {
      props: { model },
      global
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('ContactInfoFieldset monta sin throw con props minimas', () => {
    const wrapper = shallowMount(ContactInfoFieldset, {
      props: { model },
      global
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('CommercialInfoFieldset monta sin throw con props minimas', () => {
    const wrapper = shallowMount(CommercialInfoFieldset, {
      props: { model },
      global
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('ContactInfoFieldset emite open-client-history al ver historial', async () => {
    const wrapper = shallowMount(ContactInfoFieldset, {
      props: { model },
      global
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('open-client-history')).toBeTruthy()
  })

  it('InscriptionClientFieldset monta sin throw con props minimas', () => {
    const wrapper = shallowMount(InscriptionClientFieldset, {
      props: { model: {} },
      global
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('InscriptionClientFieldset emite search-document al buscar', async () => {
    const wrapper = shallowMount(InscriptionClientFieldset, {
      props: {
        model: { cat_type_document: 'we_doc_dni', document: '12345678' },
        docConfig: { placeholder: 'DNI', maxLength: 8, isNumeric: true }
      },
      global
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('search-document')).toBeTruthy()
  })

  it('InscriptionPaymentFieldset monta sin throw con props minimas', () => {
    const wrapper = shallowMount(InscriptionPaymentFieldset, {
      props: { model: {} },
      global
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('InscriptionPaymentFieldset emite change-channel al cambiar canal', () => {
    const wrapper = shallowMount(InscriptionPaymentFieldset, {
      props: { model: {} },
      global
    })
    wrapper.findComponent({ name: 'SearchSelect' }).vm.$emit('change', { id: 1 })
    expect(wrapper.emitted('change-channel')).toBeTruthy()
  })

  it('LeadInfoFieldset acepta catalogos vacios sin romper', () => {
    const wrapper = shallowMount(LeadInfoFieldset, {
      props: {
        model: { category_alias: 'we_program_type_course', program_modality_alias: 'we_modality_online' }
      },
      global
    })
    expect(wrapper.exists()).toBe(true)
  })
})
