import { describe, it, expect } from 'vitest'
import { sumWeeks, byChannel, byType, totals, trend, insights, weekLabel } from '../ventasCanal'

const week = (n, rows) => ({ week: n, from: '2026-07-01', to: '2026-07-07', rows })
const weeks = [
  week(1, { NEW: { fb: { c: 100, v: 5 }, bot: { c: 10, v: 6 } }, CWE: { com: { c: 20, v: 4 } } }),
  week(2, { NEW: { fb: { c: 50, v: 3 } }, LDS: { ig: { c: 0, v: 1 } } })
]

describe('sumWeeks + agregados', () => {
  it('suma el mes completo por canal y tipo de cliente', () => {
    const m = sumWeeks(weeks)
    expect(m.NEW.fb).toEqual({ c: 150, v: 8 })
    const fb = byChannel(m).find((x) => x.key === 'fb')
    expect(fb).toMatchObject({ c: 150, v: 8, tone: 'bad' })
    expect(totals(m)).toMatchObject({ c: 180, v: 19 })
  })
  it('filtra una semana', () => {
    expect(sumWeeks(weeks, 2).NEW.fb).toEqual({ c: 50, v: 3 })
    expect(sumWeeks(weeks, 2).NEW.bot).toEqual({ c: 0, v: 0 })
  })
  it('venta sin consulta en el periodo: conversion sin dato, no infinito', () => {
    const ig = byChannel(sumWeeks(weeks)).find((x) => x.key === 'ig')
    expect(ig.ratio).toBeNull()
    expect(ig.tone).toBe('neutro')
  })
  it('por tipo de cliente', () => {
    expect(byType(sumWeeks(weeks)).find((t) => t.key === 'CWE')).toMatchObject({ c: 20, v: 4, tone: 'ok' })
  })
})

describe('trend', () => {
  it('compara contra el mes anterior', () => {
    expect(trend(120, 100)).toEqual({ text: '↑ 20%', tone: 'ok' })
    expect(trend(80, 100)).toEqual({ text: '↓ 20%', tone: 'bad' })
    expect(trend(80, 0)).toBeNull()
  })
})

describe('insights (banda)', () => {
  const m = sumWeeks(weeks)
  const items = insights({ month: '2026-07-01', channels: byChannel(m), types: byType(m), total: totals(m) })
  it('conversion del mes, canal que mas vende, fuga y mejor cliente', () => {
    expect(items.map((i) => i.key)).toEqual(['conv', 'top', 'fuga', 'tipo'])
    expect(items[0].value).toBe('11%')
    expect(items[1].value).toBe('Facebook')
    expect(items[2]).toMatchObject({ value: 'Facebook', tone: 'bad' })
    expect(items[3].value).toBe('Comunidad')
  })
  it('mes vacio no inventa frases', () => {
    expect(insights({ month: '2026-07-01', channels: byChannel(sumWeeks([])), types: byType(sumWeeks([])), total: totals(sumWeeks([])) })).toEqual([])
  })
})

it('weekLabel', () => {
  expect(weekLabel({ from: '2026-07-22', to: '2026-07-31' })).toBe('22–31 jul')
})
