import { describe, it, expect } from 'vitest'
import { previewSections, readyCount } from '../previewSections'

describe('previewSections', () => {
  it('solo los grupos con alumnos, listos primero', () => {
    const s = previewSections({ ready: ['A', 'B'], not_in_odoo: [], with_debt: ['C'], likely_failed: [], without_grade: [], already_certified: ['D'] })
    expect(s.map((x) => [x.key, x.names.length])).toEqual([['ready', 2], ['with_debt', 1], ['already_certified', 1]])
    expect(readyCount({ ready: ['A', 'B'] })).toBe(2)
  })
  it('aula de Odoo vacia: un solo aviso y nada que certificar', () => {
    const p = { odoo_classroom_empty: true, ready: [], not_in_odoo: ['A', 'B'] }
    expect(previewSections(p).map((x) => x.key)).toEqual(['empty'])
    expect(readyCount(p)).toBe(0)
  })
})
