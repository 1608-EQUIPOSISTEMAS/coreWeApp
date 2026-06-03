import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} })
}))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() })
}))

import { ServiceKeys } from '@/services'
import LeadsNewPage from '../LeadsNewPage.vue'

describe('LeadsNewPage (orquestador formulario, montaje)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('monta el grafo (estado + features + fieldsets) en modo nuevo', () => {
    const comercial = { leadRegister: vi.fn(), leadUpdate: vi.fn(), leadGet: vi.fn() }
    const catalog = { options: () => [], membershipList: async () => [] }
    const wrapper = shallowMount(LeadsNewPage, {
      global: {
        provide: {
          [ServiceKeys.Comercial]: comercial,
          catalog
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Formulario Comercial')
    wrapper.unmount()
  })
})
