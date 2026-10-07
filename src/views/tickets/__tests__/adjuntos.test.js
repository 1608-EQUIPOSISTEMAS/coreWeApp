import { describe, it, expect } from 'vitest'
import { agregarAdjuntos, MAX_BYTES } from '../adjuntos.js'

const archivo = (name, type = 'image/png', size = 1000) => ({ name, type, size })

describe('agregarAdjuntos', () => {
  it('acepta PNG, JPG, WEBP y PDF dentro del peso', () => {
    const nuevos = [archivo('a.png'), archivo('b.jpg', 'image/jpeg'), archivo('c.pdf', 'application/pdf')]
    expect(agregarAdjuntos([], nuevos)).toEqual({ archivos: nuevos, error: '' })
  })

  it('rechaza otro tipo y avisa, sin perder los válidos', () => {
    const { archivos, error } = agregarAdjuntos([], [archivo('x.exe', 'application/x-msdownload'), archivo('a.png')])
    expect(archivos.map(a => a.name)).toEqual(['a.png'])
    expect(error).toMatch(/x\.exe/)
  })

  it('rechaza lo que pasa de 5 MB', () => {
    const { archivos, error } = agregarAdjuntos([], [archivo('grande.png', 'image/png', MAX_BYTES + 1)])
    expect(archivos).toEqual([])
    expect(error).toMatch(/5 MB/)
  })

  it('pasado el máximo de 4 avisa en vez de descartar en silencio', () => {
    const cuatro = [1, 2, 3, 4].map(i => archivo(`${i}.png`))
    const { archivos, error } = agregarAdjuntos(cuatro, [archivo('5.png')])
    expect(archivos).toHaveLength(4)
    expect(error).toMatch(/máximo 4/)
  })

  it('no modifica la lista recibida', () => {
    const actuales = [archivo('a.png')]
    agregarAdjuntos(actuales, [archivo('b.png')])
    expect(actuales).toHaveLength(1)
  })
})
