import { describe, it, expect } from 'vitest'
import { siguientePaso, pasoHint } from '../siguientePaso'

describe('siguientePaso (bandeja Reprogramaciones)', () => {
  it('sin destino: paso 1, elegir destino', () => {
    expect(siguientePaso({ status: null, tieneDestino: false })).toMatchObject({ accion: 'destino', paso: 1 })
  })
  it('con destino (o reembolso/reserva): paso 2, avisar al alumno', () => {
    expect(siguientePaso({ status: 'propuesto', tieneDestino: true })).toMatchObject({ accion: 'contactar', paso: 2 })
  })
  it('contactado: paso 3, le toca a FICO', () => {
    const p = siguientePaso({ status: 'contactado', tieneDestino: true })
    expect(p).toMatchObject({ accion: 'veredicto', paso: 3, quien: 'FICO' })
    expect(pasoHint(p)).toBe('Paso 3 de 3 · le toca a FICO')
  })
  it('rechazado por FICO: vuelve al paso 1 aunque tenga destino', () => {
    expect(siguientePaso({ status: 'rechazado', tieneDestino: true })).toMatchObject({ accion: 'destino', label: 'Elegir otro destino' })
  })
  it('ejecutado: no hay siguiente paso', () => {
    expect(siguientePaso({ status: 'aceptado', tieneDestino: true })).toBeNull()
  })
})
