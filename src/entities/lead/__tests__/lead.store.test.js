import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeadStore } from '../lead.store'

describe('useLeadStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('inicializa con el estado de listado por defecto', () => {
    const store = useLeadStore()
    expect(store.leadsRaw).toEqual([])
    expect(store.pagin).toEqual({ page: 1, size: 25, total: 0 })
    expect(store.isTableLoading).toBe(false)
    expect(store.activeQuickView).toBeNull()
    expect(store.activeFilterChips).toEqual([])
    expect(store.filters.order_by).toBe(0)
  })

  it('setLeads normaliza a arreglo y filteredLeads lo refleja', () => {
    const store = useLeadStore()
    store.setLeads([{ lead_id: 1 }, { lead_id: 2 }])
    expect(store.filteredLeads).toHaveLength(2)
    store.setLeads(null)
    expect(store.filteredLeads).toEqual([])
  })

  it('setPagination hace merge parcial', () => {
    const store = useLeadStore()
    store.setPagination({ page: 3, total: 120 })
    expect(store.pagin).toEqual({ page: 3, size: 25, total: 120 })
  })

  it('setActiveQuickView y updateSingleFilter mutan el estado', () => {
    const store = useLeadStore()
    store.setActiveQuickView('priority')
    store.updateSingleFilter('q', 'ana')
    expect(store.activeQuickView).toBe('priority')
    expect(store.filters.q).toBe('ana')
  })

  it('applyFilters reconstruye chips, resetea pagina y consulta via fetchLeads', async () => {
    const store = useLeadStore()
    const api = { leadList: vi.fn().mockResolvedValue({ items: [{ lead_id: 7 }], total: 1 }) }
    // applyFilters delega en fetchLeads sin api; reenlazamos la accion original
    // con el doble para no instanciar el servicio real ni golpear axios.
    const original = store.fetchLeads.bind(store)
    const fetchSpy = vi.spyOn(store, 'fetchLeads').mockImplementation(() => original(api))

    store.pagin.page = 5
    store.activeQuickView = 'follow'
    store.filters.q = 'maria'
    store.filters.status_lead_ids = [{ value: 3, label: 'Interesado' }]

    await store.applyFilters()

    expect(store.pagin.page).toBe(1)
    expect(store.activeQuickView).toBeNull()
    expect(store.hasActiveFilters).toBe(true)
    expect(store.activeFilterChips.some(c => c.key === 'q')).toBe(true)
    expect(store.activeFilterChips.some(c => c.key === 'status_lead_ids')).toBe(true)
    expect(fetchSpy).toHaveBeenCalled()

    const payload = api.leadList.mock.calls.at(-1)[0]
    expect(payload.q).toBe('maria')
    expect(payload.status_lead_ids).toEqual([3])
    expect(store.leadsRaw).toEqual([{ lead_id: 7 }])
    expect(store.pagin.total).toBe(1)
  })

  it('clearFilters resetea filtros y respeta la restriccion del comercial', () => {
    const store = useLeadStore()
    store.initializeFilters({ isComercial: true, currentUserId: 42 })
    store.filters.q = 'x'
    store.filters.web = 'Y'
    store.activeQuickView = 'follow'

    store.clearFilters(false)

    expect(store.filters.q).toBe('')
    expect(store.filters.web).toBeNull()
    expect(store.filters.owner_user_ids).toEqual([42])
  })

  it('fetchLeads vacia el listado ante error del api', async () => {
    const store = useLeadStore()
    const api = { leadList: vi.fn().mockRejectedValue(new Error('boom')) }
    store.leadsRaw = [{ lead_id: 1 }]
    store.pagin.total = 9

    await store.fetchLeads(api)

    expect(store.leadsRaw).toEqual([])
    expect(store.pagin.total).toBe(0)
    expect(store.isTableLoading).toBe(false)
  })
})
