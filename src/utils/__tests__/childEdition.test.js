import { describe, it, expect } from 'vitest'
import { findTreeEdition, childEditionLabel } from '../childEdition.js'

// Caso real: inscripcion 16367 (DIP INTELIG. Y ANALIST. DATOS V2). Sus 4 modulos
// arrancan en 4 fechas distintas; la tabla mostraba "Misma edicion" para todos.
const SQL_SERVER = {
  child_program_version_id: 101,
  tree_edition_id: 15501,
  editions: [
    { edition_id: 15500, code: 'E100', start_date: '2026-08-15' },
    { edition_id: 15501, code: 'E101', start_date: '2026-10-17' }
  ]
}

const fmt = v => String(v).split('-').reverse().join('/')

describe('childEditionLabel', () => {
  it('muestra el codigo y la fecha de la edicion que el arbol le asigna al modulo', () => {
    expect(childEditionLabel(SQL_SERVER, fmt)).toBe('E101 - 17/10/2026')
  })

  it('no confunde la edicion del arbol con la primera de la lista', () => {
    expect(findTreeEdition(SQL_SERVER).code).toBe('E101')
  })

  it('devuelve null cuando el arbol no programa el modulo (online o fuera del arbol)', () => {
    expect(childEditionLabel({ tree_edition_id: null, editions: [] }, fmt)).toBeNull()
  })

  it('devuelve null si el arbol apunta a una edicion que el modulo ya no tiene', () => {
    expect(childEditionLabel({ tree_edition_id: 999, editions: SQL_SERVER.editions }, fmt)).toBeNull()
  })

  it('cae al codigo solo cuando la edicion no tiene fecha de inicio', () => {
    const sinFecha = { tree_edition_id: 1, editions: [{ edition_id: 1, code: 'E5', start_date: null }] }
    expect(childEditionLabel(sinFecha, fmt)).toBe('E5')
  })
})
