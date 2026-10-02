import { describe, it, expect } from 'vitest'
import { isRestricted } from '../advisorRestrictions.js'

describe('isRestricted', () => {
  it('sin restriccion o con listas vacias no avisa', () => {
    expect(isRestricted(null)).toBe(false)
    expect(isRestricted({ program_ids: [], channel_ids: null })).toBe(false)
  })
  it('una lista con valores o un rango de fechas avisa', () => {
    expect(isRestricted({ channel_ids: [3] })).toBe(true)
    expect(isRestricted({ edition_start_date_from: '2026-10-01' })).toBe(true)
    expect(isRestricted({ first_contact_date_from: '2026-09-01' })).toBe(true)
  })
})
