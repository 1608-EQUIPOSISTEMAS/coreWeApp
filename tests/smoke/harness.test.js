import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// Smoke test del arnes de Frontend: prueba que Vitest + jsdom + @vue/test-utils
// montan y renderizan un componente Vue de extremo a extremo. Es la red de
// seguridad minima antes de partir los god components (Leads, EnrollmentDetail).
describe('arnes de testing Frontend', () => {
  it('monta un componente y renderiza props reactivas', () => {
    const Hello = defineComponent({
      props: { name: { type: String, default: 'mundo' } },
      setup (props) {
        return () => h('p', { class: 'greeting' }, `Hola ${props.name}`)
      }
    })

    const wrapper = mount(Hello, { props: { name: 'Elara' } })
    expect(wrapper.find('.greeting').text()).toBe('Hola Elara')
  })
})
