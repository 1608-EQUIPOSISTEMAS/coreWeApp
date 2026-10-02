import { describe, it, expect } from 'vitest'
import { quickViewFilters } from '../quickViews.js'

const catalogs = {
  interest: [{ id: 1, alias: 'we_lead_interest_low', description: 'Bajo' }],
  pipeline: [{ id: 10, alias: 'we_lead_status_will_pay', description: 'Pagara' }, { id: 11, alias: 'we_lead_status_atendido', description: 'Atendido' }],
  follow: [{ id: 20, alias: 'we_calling_pending', description: 'Pendiente' }]
}

describe('quickViewFilters', () => {
  it('Alta Prioridad: ediciones de hoy a 14 dias, cruzando fin de mes', () => {
    const f = quickViewFilters('priority', { today: '2026-10-25', catalogs })
    expect(f).toMatchObject({ edition_start_from: '2026-10-25', edition_start_to: '2026-11-08', edition_range_string: '2026-10-25 a 2026-11-08' })
    expect(f.interest_level_ids).toEqual([{ value: 1, label: 'Bajo' }])
    // Solo los estados activos que existen en el catalogo
    expect(f.status_lead_ids.map(s => s.value)).toEqual([11, 10])
  })

  it('Seguimiento y Pagara resuelven su alias', () => {
    expect(quickViewFilters('follow', { today: '2026-10-02', catalogs })).toEqual({ last_follow_ids: [{ value: 20, label: 'Pendiente' }] })
    expect(quickViewFilters('will_pay', { today: '2026-10-02', catalogs }).status_lead_ids).toEqual([{ value: 10, label: 'Pagara' }])
  })

  it('Todos no agrega filtros', () => {
    expect(quickViewFilters('all', { today: '2026-10-02', catalogs })).toEqual({})
  })
})
