import { describe, it, expect } from 'vitest'
import { editionGapsByUid, diasEntre } from '../editionGaps'

const ed = (uid, start_date, program_version_id = 1) => ({ uid, start_date, program_version_id })

describe('editionGapsByUid', () => {
  it('mide la distancia a la edición anterior y a la siguiente del mismo programa', () => {
    const gaps = editionGapsByUid([
      ed('c', '2026-11-28'),
      ed('a', '2026-08-26'),
      ed('b', '2026-10-17'),
      ed('d', '2027-01-03')
    ])

    expect(gaps.a).toEqual({ antes: null, despues: 52 })
    expect(gaps.b).toEqual({ antes: 52, despues: 42 })
    expect(gaps.c).toEqual({ antes: 42, despues: 36 })
    expect(gaps.d).toEqual({ antes: 36, despues: null })
  })

  it('no mezcla programas distintos', () => {
    const gaps = editionGapsByUid([ed('a', '2027-03-01', 1), ed('b', '2027-03-08', 2)])
    expect(gaps.a.despues).toBeNull()
    expect(gaps.b.antes).toBeNull()
  })

  it('ignora los items sin fecha', () => {
    expect(editionGapsByUid([ed('a', null)])).toEqual({})
  })

  it('cuenta días enteros aunque el tramo cruce el cambio de año', () => {
    // En Lima (UTC-5) hacer la resta con getters locales corría un día.
    expect(diasEntre('2026-11-28', '2027-01-03')).toBe(36)
  })
})
