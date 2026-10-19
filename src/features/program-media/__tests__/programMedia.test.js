import { describe, it, expect } from 'vitest'
import { formatSize, slotView, fileProblem, mediaSummary } from '../programMedia'

const docente = { slot: 'docente', label: 'Arte del docente', kinds: ['image'], file: null }
const certificado = { slot: 'certificado', label: 'Modelo de certificado', kinds: ['image', 'document'], file: null }
const fakeFile = (name, size) => ({ name, size })

describe('formatSize', () => {
  it('KB o MB legibles', () => {
    expect(formatSize(300)).toBe('1 KB')
    expect(formatSize(3020750)).toBe('2.9 MB')
  })
})

describe('slotView', () => {
  it('sin archivo: falta, y dice qué formato subir', () => {
    expect(slotView(certificado)).toMatchObject({ estado: { label: 'Falta', tone: 'warn' }, accept: '.jpg,.jpeg,.png,.pdf', hint: 'JPG o PNG de hasta 5 MB o PDF', archivo: null })
  })
  it('con archivo: nombre, peso y fecha de Lima', () => {
    const view = slotView({ ...docente, file: { filename: 'docente.png', size: 1222846, updatedAt: '2026-10-19T15:35:00Z' } })
    expect(view).toMatchObject({ isImage: true, estado: { tone: 'ok' }, archivo: 'docente.png · 1.2 MB · 19/10/2026' })
  })
})

describe('fileProblem', () => {
  it('formato equivocado para el slot', () => {
    expect(fileProblem(docente, fakeFile('cv.pdf', 10))).toBe('Formato no válido: sube un JPG o PNG de hasta 5 MB.')
  })
  it('imagen de más de 5 MB', () => {
    expect(fileProblem(docente, fakeFile('foto.JPG', 6 * 1024 * 1024))).toMatch(/WhatsApp acepta hasta 5 MB/)
  })
  it('el certificado puede ser imagen o PDF', () => {
    expect(fileProblem(certificado, fakeFile('modelo.pdf', 10))).toBeNull()
    expect(fileProblem(certificado, fakeFile('modelo.png', 10))).toBeNull()
  })
})

describe('mediaSummary', () => {
  it('lista lo que falta', () => {
    expect(mediaSummary([docente, { ...certificado, file: {} }]).text).toMatch(/^Falta: Arte del docente\./)
  })
  it('completo cuando están los tres', () => {
    expect(mediaSummary([{ ...docente, file: {} }]).tone).toBe('info')
  })
})
