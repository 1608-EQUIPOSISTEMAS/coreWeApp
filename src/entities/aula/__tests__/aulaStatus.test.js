import { describe, it, expect, vi, afterEach } from 'vitest'
import { aulaStatus } from '../aulaStatus'

describe('aulaStatus', () => {
  afterEach(() => vi.useRealTimers())

  it('clasifica por el rango de dictado', () => {
    expect(aulaStatus('2026-10-05', '2026-11-30', '2026-10-02')).toBe('Proximo')
    expect(aulaStatus('2026-09-01', '2026-10-02', '2026-10-02')).toBe('Activo')
    expect(aulaStatus('2026-09-01', '2026-10-01', '2026-10-02')).toBe('Finalizado')
    expect(aulaStatus(null, null, '2026-10-02')).toBe('Proximo')
    expect(aulaStatus('2026-09-01T00:00:00Z', null, '2026-10-02')).toBe('Activo')
  })

  it('a las 21:00 de Lima un aula que termina hoy sigue Activo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 2, 21, 0)) // hora local del navegador
    expect(aulaStatus('2026-09-01', '2026-10-02')).toBe('Activo')
    expect(aulaStatus('2026-10-03', '2026-11-30')).toBe('Proximo')
  })
})
