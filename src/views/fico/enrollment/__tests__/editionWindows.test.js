import { describe, it, expect } from 'vitest'
import { isWithinCourseChangeWindow, isWithinReprogramWindow } from '../editionWindows.js'

const today = new Date(2026, 8, 28) // 28/09/2026 local

describe('isWithinCourseChangeWindow', () => {
  it('admite una edición que empezó hace 8 días (caso SAP PM 20/09)', () => {
    expect(isWithinCourseChangeWindow('2026-09-20', today)).toBe(true)
  })
  it('admite justo el límite de 15 días y rechaza el día 16', () => {
    expect(isWithinCourseChangeWindow('2026-09-13', today)).toBe(true)
    expect(isWithinCourseChangeWindow('2026-09-12', today)).toBe(false)
  })
  it('no sufre el shift de TZ con un ISO en UTC', () => {
    expect(isWithinCourseChangeWindow('2026-09-13T00:00:00.000Z', today)).toBe(true)
  })
  it('rechaza start_date vacío', () => {
    expect(isWithinCourseChangeWindow(null, today)).toBe(false)
  })
})

describe('isWithinReprogramWindow', () => {
  it('admite desde el 1ro de hace 2 meses', () => {
    expect(isWithinReprogramWindow('2026-07-01', today)).toBe(true)
    expect(isWithinReprogramWindow('2026-06-30', today)).toBe(false)
  })
})
