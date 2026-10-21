import { describe, it, expect } from 'vitest'
import { toCsv } from '../downloadCsv.js'

describe('toCsv', () => {
  it('BOM, escapa comas/comillas y fuerza a texto DNI y celular (no el encabezado)', () => {
    const csv = toCsv([['DNI', 'Nombre', 'Cel'], ['01234567', 'Pérez, "Ana"', '+51 987 654 321']], { textColumns: [0, 2] })
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\n')).toEqual(['DNI,Nombre,Cel', '\t01234567,"Pérez, ""Ana""",\t+51 987 654 321'])
  })
})
