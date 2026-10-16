import { describe, it, expect } from 'vitest'
import { buildMessage, closingScript, objectionReplies, planB, leadNote, manualView, programOptionLabel } from '../manual'

// Excel Basico medido 16/10/26 (clon local): 111 nuevos, 21 compraron.
const manual = (over = {}) => ({
  programa: 'MICROSOFT EXCEL BÁSICO', tier: 'BAJO', muestra: 111, compraron: 21,
  cuando: [
    { tramo: 'El mismo día', pct: 28.6 }, { tramo: '1 a 3 días', pct: 28.6 },
    { tramo: '4 a 14 días', pct: 14.3 }, { tramo: 'Después de 14 días', pct: 28.6 }
  ],
  alternativas: [
    { program_id: 18, programa: 'EXCEL INTERMEDIO', membresia: false, compradores: 4, pct: 19 },
    { program_id: 24, programa: 'EXCEL EXPERT', membresia: false, compradores: 1, pct: 4.8 }
  ],
  edicion: { inicio: '2026-10-24', codigo: 'E14-26' },
  precio: { profesional: 400, estudiante: 380, reserva: 100 },
  ...over
})

describe('buildMessage', () => {
  const base = { paga: 'YO', estudiante: 'NO', cuando: 'ESTA' }

  it('estudiante: el precio de estudiante va primero', () => {
    const msg = buildMessage({ m: manual(), answers: { ...base, estudiante: 'SI' } })
    expect(msg.indexOf('Como estudiante')).toBeLessThan(msg.indexOf('precio regular'))
  })

  it('paga la empresa: factura y propuesta a RR.HH.', () => {
    expect(buildMessage({ m: manual(), answers: { ...base, paga: 'EMPRESA' } })).toMatch(/factura.*RR\.HH\./)
  })

  it('solo info: brochure y sin precio', () => {
    const msg = buildMessage({ m: manual(), answers: { ...base, cuando: 'INFO' } })
    expect(msg).toContain('brochure')
    expect(msg).not.toMatch(/S\/|inversión/)
  })

  it('si antes dijo "caro", ofrece cuotas', () => {
    expect(buildMessage({ m: manual(), answers: base, priceObjection: true })).toContain('cuotas')
    expect(buildMessage({ m: manual(), answers: base })).not.toContain('cuotas')
  })

  it('con fecha y reserva para cerrar', () => {
    expect(buildMessage({ m: manual(), answers: base })).toMatch(/24\/10\/2026.*vacante/)
  })
})

describe('closingScript', () => {
  it('3 puntos con el dato del programa elegido', () => {
    const steps = closingScript(manual())
    expect(steps).toHaveLength(3)
    expect(steps[0].texto).toContain('28.6')
    expect(steps[1].texto).toContain('24/10/2026')
    expect(steps[2].titulo).toBe('Si en 14 días no compra, no lo sueltes')
  })

  it('sin compradores ni edicion sigue dando 3 puntos sin inventar cifras', () => {
    const steps = closingScript(manual({ cuando: [], edicion: null }))
    expect(steps.map((s) => s.titulo)).toEqual(['Respóndele hoy', 'Sin fecha todavía', 'Si en 14 días no compra, no lo sueltes'])
  })
})

describe('objeciones y plan B', () => {
  it('cada objecion trae su respuesta lista para copiar', () => {
    const r = objectionReplies(manual())
    expect(r.map((o) => o.label)).toEqual(['Está caro', 'No tengo tiempo', 'Lo voy a pensar', '¿Da certificado?'])
    expect(r[0].texto).toContain('S/')
  })

  it('el plan B muestra su base y descarta el de un solo comprador', () => {
    expect(planB(manual())).toEqual([{ key: 18, programa: 'EXCEL INTERMEDIO', base: '4 de 21', membresia: false }])
  })
})

describe('leadNote y vista', () => {
  it('la calificacion va a observaciones del lead', () => {
    expect(leadNote('POWER BI', { paga: 'EMPRESA', estudiante: 'NO', cuando: null }))
      .toBe('Pidió POWER BI · paga su empresa · no es estudiante')
  })

  it('sin edicion avisa', () => {
    expect(manualView(manual({ edicion: null }))).toMatchObject({ edicion: 'Sin edición programada', edicionTone: 'warn' })
  })

  it('el buscador muestra modalidad y nivel', () => {
    expect(programOptionLabel({ modalidad: 'En vivo', tier: 'TOP' })).toBe('En vivo · TOP')
  })
})
