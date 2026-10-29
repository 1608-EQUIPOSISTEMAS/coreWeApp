import { describe, it, expect } from 'vitest'
import { detalleDelPedido, duracion, etiquetaMonto, etiquetaTurno, puedeFijarMonto, revisionDe, textoFirmar } from '../ticket-alumno.presentacion.js'

describe('ticket-alumno.presentacion', () => {
  it('muestra al alumno como turno mientras falta su voucher', () => {
    expect(etiquetaTurno({ area_actual: null, status: 'PENDIENTE_PAGO' })).toBe('Alumno')
    expect(etiquetaTurno({ area_actual: 'FICO', status: 'PAGO_REGISTRADO' })).toBe('FICO')
  })

  it('distingue gratuito, por confirmar y monto acordado', () => {
    expect(etiquetaMonto({ monto: 0 })).toBe('Gratuito')
    expect(etiquetaMonto({ monto: null, tipo: 'REPROGRAMACION' })).toBe('Por confirmar')
    expect(etiquetaMonto({ monto: null, tipo: 'REASIGNACION_CURSO' })).toBe('Monto acordado con Finanzas')
    expect(etiquetaMonto({ monto: 70 })).toBe('S/ 70')
  })

  it('traduce lo que pidio el alumno a filas legibles', () => {
    const filas = detalleDelPedido({ datos: { alcance: 'PROGRAMA', destino: 'Power BI - 2026-11-05', variante: 'GRABACION' } })

    expect(filas).toEqual([
      { etiqueta: 'Opción', valor: 'Grabación' },
      { etiqueta: 'Alcance', valor: 'Todo el programa' },
      { etiqueta: 'Nueva fecha', valor: 'Power BI - 2026-11-05' }
    ])
  })

  it('solo Academica, con monto pendiente, puede fijarlo', () => {
    const base = { puede_firmar: true, area_actual: 'ACADEMICA', monto: null, tipo: 'REPROGRAMACION' }

    expect(puedeFijarMonto(base)).toBe(true)
    expect(puedeFijarMonto({ ...base, monto: 50 })).toBe(false)
    expect(puedeFijarMonto({ ...base, area_actual: 'FICO' })).toBe(false)
    expect(puedeFijarMonto({ ...base, tipo: 'REASIGNACION_CURSO' })).toBe(false)
  })

  it('el boton dice que se valida el pago cuando hay voucher', () => {
    expect(textoFirmar({ status: 'PAGO_REGISTRADO' })).toBe('Validar pago')
    expect(textoFirmar({ status: 'ABIERTA' })).toBe('Aprobar')
  })
})

describe('seguimiento', () => {
  it('formatea el tiempo en revision', () => {
    const t0 = '2026-10-29T10:00:00Z'
    expect(duracion(t0, '2026-10-29T10:25:00Z')).toBe('25 min')
    expect(duracion(t0, '2026-10-29T13:10:00Z')).toBe('3 h 10 min')
    expect(duracion(t0, '2026-10-31T14:00:00Z')).toBe('2 d 4 h')
    expect(duracion(null)).toBe('')
  })

  it('abierto muestra al revisor; cerrado, a quien lo cerro', () => {
    expect(revisionDe({ status: 'ABIERTA', revisor: 'Ana', revision_inicio: 'x' })).toEqual({ nombre: 'Ana', desde: 'x', estado: 'revisando' })
    expect(revisionDe({ status: 'ABIERTA' }).estado).toBe('libre')
    expect(revisionDe({ status: 'RESUELTA', resuelto_por: 'Luis', resolved_at: 'y' })).toEqual({ nombre: 'Luis', desde: 'y', estado: 'cerrado' })
  })
})
