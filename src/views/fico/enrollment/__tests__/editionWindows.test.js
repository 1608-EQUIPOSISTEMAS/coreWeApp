import { describe, it, expect } from 'vitest'
import { isWithinCourseChangeWindow, isWithinReprogramWindow, isMovedOrigin, addOneMonth } from '../editionWindows.js'

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

describe('isMovedOrigin', () => {
  it('un origen en CC o RP ya tiene destino: no se ofrece otro RP/CC', () => {
    expect(isMovedOrigin('we_enrollment_status_course_changed')).toBe(true)
    expect(isMovedOrigin('we_enrollment_status_reprogrammed')).toBe(true)
  })
  it('una inscripción activa sí puede moverse', () => {
    expect(isMovedOrigin('we_inscription_way_act')).toBe(false)
    expect(isMovedOrigin(undefined)).toBe(false)
  })
})

describe('addOneMonth', () => {
  it('mismo día del mes siguiente, cruzando el año', () => {
    expect(addOneMonth('2026-11-02')).toBe('2026-12-02')
    expect(addOneMonth('2026-12-02')).toBe('2027-01-02')
  })
  it('cae al último día si el mes siguiente es más corto', () => {
    expect(addOneMonth('2027-01-31')).toBe('2027-02-28')
  })
})
