import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLeadStore } from '../../../entities/lead/lead.store.js'
import { useFastViews, resolveByAlias } from '../useFastViews.js'

const interest = { value: [{ id: 5, alias: 'we_lead_interest_low', description: 'Bajo' }] }
const pipeline = {
  value: [
    { id: 10, alias: 'we_lead_status_atendido', description: 'Atendido' },
    { id: 11, alias: 'we_lead_status_will_pay', description: 'Pagara' }
  ]
}
const follow = { value: [{ id: 20, alias: 'we_calling_pending', description: 'Pendiente' }] }

function makeFastViews () {
  const store = useLeadStore()
  vi.spyOn(store, 'fetchLeads').mockResolvedValue()
  const fv = useFastViews(store, { interest, pipeline, follow })
  return { store, ...fv }
}

describe('resolveByAlias', () => {
  it('mapea alias hallados a { value, label } y descarta los ausentes', () => {
    expect(resolveByAlias(pipeline, ['we_lead_status_will_pay', 'no_existe']))
      .toEqual([{ value: 11, label: 'Pagara' }])
  })
  it('tolera ref vacio', () => {
    expect(resolveByAlias({ value: [] }, ['x'])).toEqual([])
    expect(resolveByAlias(null, ['x'])).toEqual([])
  })
})

describe('useFastViews.applyQuickView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('priority: rango edicion 14d + interes bajo + estados activos resueltos', () => {
    const { store, applyQuickView } = makeFastViews()
    applyQuickView('priority')
    expect(store.activeQuickView).toBe('priority')
    expect(store.filters.interest_level_ids).toEqual([{ value: 5, label: 'Bajo' }])
    // pipeline solo tiene 2 de los 5 alias pedidos: solo esos se resuelven
    expect(store.filters.status_lead_ids).toEqual([
      { value: 10, label: 'Atendido' },
      { value: 11, label: 'Pagara' }
    ])
    expect(store.filters.edition_start_from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(store.filters.edition_range_string).toContain(' a ')
    expect(store.pagin.page).toBe(1)
    expect(store.fetchLeads).toHaveBeenCalledOnce()
  })

  it('follow: resuelve we_calling_pending en last_follow_ids', () => {
    const { store, applyQuickView } = makeFastViews()
    applyQuickView('follow')
    expect(store.filters.last_follow_ids).toEqual([{ value: 20, label: 'Pendiente' }])
    expect(store.activeQuickView).toBe('follow')
  })

  it('will_pay: status_lead_ids = solo will_pay', () => {
    const { store, applyQuickView } = makeFastViews()
    applyQuickView('will_pay')
    expect(store.filters.status_lead_ids).toEqual([{ value: 11, label: 'Pagara' }])
  })

  it('all: limpia sin presets (filtros por defecto) y refresca', () => {
    const { store, applyQuickView } = makeFastViews()
    store.filters.q = 'algo'
    applyQuickView('all')
    expect(store.filters.q).toBe('')
    expect(store.filters.status_lead_ids).toEqual([])
    expect(store.activeQuickView).toBe('all')
    expect(store.fetchLeads).toHaveBeenCalledOnce()
  })

  it('respeta la restriccion del comercial al aplicar una vista', () => {
    const { store, applyQuickView } = makeFastViews()
    store.initializeFilters({ isComercial: true, currentUserId: 99 })
    applyQuickView('follow')
    expect(store.filters.owner_user_ids).toEqual([99])
  })
})
