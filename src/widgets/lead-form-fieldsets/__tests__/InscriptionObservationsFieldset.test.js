import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import InscriptionObservationsFieldset from '../InscriptionObservationsFieldset.vue'

// Stub de la directiva global v-restrict (vive en la app, no en los tests).
const global = {
  directives: {
    restrict: {}
  }
}

describe('widgets/lead-form-fieldsets/InscriptionObservationsFieldset', () => {
  it('monta sin throw con props minimas', () => {
    const wrapper = shallowMount(InscriptionObservationsFieldset, {
      props: { model: {} },
      global
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('refleja observacions del modelo en el textarea', () => {
    const wrapper = shallowMount(InscriptionObservationsFieldset, {
      props: { model: { observacions: 'Nota previa' } },
      global
    })
    expect(wrapper.find('textarea').element.value).toBe('Nota previa')
  })

  it('usa 8 filas fuera del canal General', () => {
    const wrapper = shallowMount(InscriptionObservationsFieldset, {
      props: { model: {}, isChannelGeneral: false },
      global
    })
    expect(wrapper.find('textarea').attributes('rows')).toBe('8')
  })
})
