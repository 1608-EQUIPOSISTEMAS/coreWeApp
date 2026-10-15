import { describe, it, expect } from 'vitest'
import { manualView, programOptionLabel } from '../manual'

const manual = (over = {}) => ({
  programa: 'POWER BI', tier: 'TOP', muestra: 380, conversion: 11.1,
  resumen: 'De 380 personas nuevas...', velocidad: 'La mitad... 2 días',
  destinos: [
    { program_id: 27, programa: 'POWER BI', membresia: false, mismo: true, pct: 71.4 },
    { program_id: 168, programa: 'MEMBRESIA PLUS', membresia: true, mismo: false, pct: 11.9 }
  ],
  edicion: { inicio: '2026-10-29', codigo: 'E24-26' },
  precio: { profesional: 840, estudiante: 750, reserva: 100 },
  ...over
})

describe('manualView', () => {
  it('marca que termina comprando: el mismo, una membresia o una alternativa', () => {
    const v = manualView(manual(), '932253310')
    expect(v.destinos.map((d) => d.tag.label)).toEqual(['El mismo', 'Membresía'])
    expect(v.destinos[0]).toMatchObject({ pct: '71.4%', ancho: '71.4%' })
  })

  it('arma la propuesta de WhatsApp para el numero nuevo con fecha y precio', () => {
    const v = manualView(manual(), '932253310')
    expect(v.whatsapp.startsWith('https://wa.me/51932253310?text=')).toBe(true)
    expect(decodeURIComponent(v.whatsapp)).toContain('empieza el 29/10/2026')
  })

  it('sin muestra no hay %; sin edicion avisa', () => {
    expect(manualView(manual({ conversion: null, edicion: null, precio: null }), '932253310'))
      .toMatchObject({ conversion: null, edicion: 'Sin edición programada', edicionTone: 'warn', precio: null })
  })

  it('el buscador muestra modalidad y nivel', () => {
    expect(programOptionLabel({ modalidad: 'En vivo', tier: 'TOP' })).toBe('En vivo · TOP')
  })
})
