import { describe, it, expect } from 'vitest'
import { findEnrollmentById } from '../findEnrollmentById.js'

describe('findEnrollmentById', () => {
  it('devuelve solo la inscripción con el id exacto', () => {
    const items = [{ enrollment_id: 19280 }, { enrollment_id: '1928' }]
    expect(findEnrollmentById(items, 1928)).toEqual({ enrollment_id: '1928' })
  })

  it('si el id no está, devuelve null y NUNCA otra inscripción', () => {
    expect(findEnrollmentById([{ enrollment_id: 19280 }, { enrollment_id: 11928 }], 1928)).toBeNull()
  })

  it('tolera una respuesta vacía', () => {
    expect(findEnrollmentById(undefined, 1)).toBeNull()
  })
})
