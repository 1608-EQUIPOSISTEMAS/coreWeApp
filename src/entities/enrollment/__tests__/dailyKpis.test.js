import { describe, it, expect } from 'vitest'
import { buildDailyKpis, trendTone } from '../dailyKpis.js'

describe('trendTone', () => {
  it('subir es bueno salvo en las invertidas (pendientes)', () => {
    expect(trendTone(3)).toBe('ok')
    expect(trendTone(-3)).toBe('bad')
    expect(trendTone(3, true)).toBe('bad')
    expect(trendTone(-3, true)).toBe('ok')
    expect(trendTone(0)).toBe('')
  })
})

describe('buildDailyKpis', () => {
  const kpis = buildDailyKpis(
    { total: 12, pending: 5, confirmed: 7, amount: 4800 },
    { total: 10, pending: 2, confirmed: 7, amount: 5000 }
  )
  const by = Object.fromEntries(kpis.map((k) => [k.clave, k]))

  it('compara cada cifra contra ayer con su tono', () => {
    expect(by.total.trend).toEqual({ tono: 'ok', texto: '+2 vs ayer' })
    expect(by.pending.trend).toEqual({ tono: 'bad', texto: '+3 vs ayer' })
    expect(by.confirmed.trend).toEqual({ tono: '', texto: 'igual que ayer' })
    expect(by.amount.trend).toEqual({ tono: 'bad', texto: '−S/ 200 vs ayer' })
  })

  it('formatea con formatValue y muestra lo de ayer en la nota', () => {
    expect(by.amount.valor).toBe('S/ 4,800')
    expect(by.amount.nota).toBe('Ayer: S/ 5,000')
  })

  it('pendientes > 0 avisan en el icono', () => {
    expect(by.pending.tono).toBe('warn')
  })

  it('sin dato muestra — y no inventa un 0', () => {
    const [total] = buildDailyKpis({ total: null }, { total: 4 })
    expect(total.valor).toBe('—')
    expect(total.trend).toBeNull()
    expect(total.nota).toBe('Sin datos por ahora')
  })
})
