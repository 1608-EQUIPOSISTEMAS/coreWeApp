import { describe, it, expect } from 'vitest'
import { fitWithin, dataUrlBytes } from '../imageCompress.js'

// Solo la aritmetica: el reencodeo depende de canvas, que jsdom no implementa.
// Es donde estan los errores que importan (agrandar una imagen, calcular mal el
// peso y mandar un payload que el proxy corta).

describe('fitWithin', () => {
  it('escala por el lado mayor conservando la proporcion', () => {
    expect(fitWithin(2400, 1200, 1200)).toEqual({ width: 1200, height: 600 })
    expect(fitWithin(1200, 2400, 1200)).toEqual({ width: 600, height: 1200 })
  })

  // Agrandar no reduce bytes y estropea la imagen.
  it('nunca agranda una imagen mas chica que el tope', () => {
    expect(fitWithin(400, 300, 1200)).toEqual({ width: 400, height: 300 })
  })

  it('deja pasar dimensiones invalidas sin romper', () => {
    expect(fitWithin(0, 500, 1200)).toEqual({ width: 0, height: 0 })
  })
})

describe('dataUrlBytes', () => {
  // 'AAAA' son 3 bytes; el padding '=' no cuenta.
  it('descuenta el padding del base64', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,AAAA')).toBe(3)
    expect(dataUrlBytes('data:image/jpeg;base64,AAA=')).toBe(2)
    expect(dataUrlBytes('data:image/jpeg;base64,AA==')).toBe(1)
  })

  it('un data URI sin payload pesa cero', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,')).toBe(0)
  })
})
