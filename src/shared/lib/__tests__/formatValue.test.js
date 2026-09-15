import { describe, it, expect } from 'vitest'
import { formatValue, formatCompact } from '../formatValue.js'

describe('formatValue', () => {
  it('sin dato muestra una raya, nunca 0', () => {
    expect(formatValue(null, 'soles')).toBe('—')
    expect(formatValue(undefined, 'pct')).toBe('—')
    expect(formatValue('', 'num')).toBe('—')
  })

  it('formatea cada unidad en es-PE', () => {
    expect(formatValue(1200, 'soles')).toBe('S/ 1,200')
    expect(formatValue(12.345, 'pct')).toBe('12.3%')
    expect(formatValue(48, 'horas')).toBe('48 h')
    expect(formatValue('BI-CP-03', 'texto')).toBe('BI-CP-03')
    expect(formatValue(0, 'num')).toBe('0')
  })
})

describe('formatCompact', () => {
  it('compacta solo soles grandes', () => {
    expect(formatCompact(1256059, 'soles')).toMatch(/^S\/ 1\.3\s?M$/)
    expect(formatCompact(9999, 'soles')).toBe('S/ 9,999')
    expect(formatCompact(1256059, 'num')).toBe('1,256,059')
  })

  it('sin dato sigue siendo raya', () => {
    expect(formatCompact(null, 'soles')).toBe('—')
  })
})
