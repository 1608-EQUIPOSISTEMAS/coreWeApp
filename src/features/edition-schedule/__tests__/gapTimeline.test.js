import { describe, it, expect } from 'vitest'
import { editionGapTimeline } from '../gapTimeline'

const ed = (id, start, active = 'Y') => ({ edition_num_id: id, start_date_eff: `${start}T05:00:00.000Z`, active })

describe('editionGapTimeline', () => {
  const history = [ed(1, '2026-08-01'), ed(2, '2026-10-30'), ed(3, '2026-09-15', 'N')]

  it('ubica la edición entre la anterior y la siguiente con días exactos (sin desfase de Lima)', () => {
    const t = editionGapTimeline(history, { start_date: '2026-08-31' })
    expect(t.map((x) => x.start)).toEqual(['2026-08-01', '2026-08-31', '2026-10-30'])
    expect(t[0].gapInfo).toMatchObject({ days: 30, color: 'text-success' })
    expect(t[2].gapInfo).toMatchObject({ days: 60, color: 'text-info' })
    expect(t[1].gapInfo).toBeNull()
  })

  it('menos de 30 días se marca', () => {
    const t = editionGapTimeline(history, { start_date: '2026-08-20' })
    expect(t[0].gapInfo).toMatchObject({ days: 19, color: 'text-warning' })
  })

  it('excluye inactivas y la propia edición que se edita', () => {
    expect(editionGapTimeline(history, { start_date: '2026-09-01' }, 2).map((x) => x.edition_num_id ?? 'actual'))
      .toEqual([1, 'actual'])
  })

  it('sin fecha no hay análisis', () => {
    expect(editionGapTimeline(history, {})).toEqual([])
  })
})
