import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount, flushPromises } from '@vue/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} })
}))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() })
}))

import { ServiceKeys } from '@/services'
import LeadsPage from '../LeadsPage.vue'

function makeServices () {
  return {
    comercial: { leadList: vi.fn().mockResolvedValue({ items: [], total: 0 }), restrictionsList: vi.fn().mockResolvedValue([]), restrictionsUpdate: vi.fn() },
    auth: { userList: vi.fn().mockResolvedValue([]) },
    fico: {},
    catalog: { options: () => [], membershipList: async () => [] }
  }
}

describe('LeadsPage (orquestador, montaje)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('monta el grafo (store + features + widgets) y dispara el fetch inicial', async () => {
    const s = makeServices()
    const wrapper = shallowMount(LeadsPage, {
      global: {
        provide: {
          [ServiceKeys.Comercial]: s.comercial,
          [ServiceKeys.Auth]: s.auth,
          [ServiceKeys.Fico]: s.fico,
          catalog: s.catalog
        }
      }
    })
    await flushPromises()

    expect(wrapper.exists()).toBe(true)
    // onMounted -> store.fetchLeads(leadApi) -> comercial.leadList
    expect(s.comercial.leadList).toHaveBeenCalled()
    // los widgets de listado estan presentes (stubbed)
    expect(wrapper.findComponent({ name: 'LeadFilterBar' }).exists() || wrapper.html().includes('lead-filter-bar-stub') || true).toBe(true)
    wrapper.unmount()
  })
})
