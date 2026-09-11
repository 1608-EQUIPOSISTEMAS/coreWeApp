import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchSelect from '../SearchSelect.vue'

// El v-model se precarga antes de que la vista traiga el catalogo del backend.
// Si el control no vuelve a traducir el valor cuando llegan los items, se queda
// mostrando el id crudo (el caso "2" en vez de "AE30 — WEB" de Editar Asesor).
describe('SearchSelect con items async', () => {
  const etiqueta = w => w.find('.ss-locked-label').text()

  it('reemplaza el valor crudo por la etiqueta cuando llegan los items', async () => {
    const wrapper = mount(SearchSelect, {
      props: { modelValue: 2, items: [], labelField: 'label', valueField: 'user_id' },
      global: { stubs: { Teleport: true } }
    })
    expect(etiqueta(wrapper)).toBe('2')

    await wrapper.setProps({ items: [{ user_id: 2, label: 'AE30 — WEB' }] })

    expect(etiqueta(wrapper)).toBe('AE30 — WEB')
  })

  it('no pisa una seleccion que ya tiene item detras', async () => {
    const wrapper = mount(SearchSelect, {
      props: {
        modelValue: 2,
        items: [{ user_id: 2, label: 'AE30 — WEB' }],
        labelField: 'label', valueField: 'user_id'
      },
      global: { stubs: { Teleport: true } }
    })

    await wrapper.setProps({ items: [{ user_id: 2, label: 'OTRA COSA' }, { user_id: 3, label: 'CA36' }] })

    expect(etiqueta(wrapper)).toBe('AE30 — WEB')
  })
})
