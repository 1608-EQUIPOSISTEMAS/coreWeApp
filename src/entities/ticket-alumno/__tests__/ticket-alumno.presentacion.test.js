import { describe, it, expect } from 'vitest'
import { detalleDelPedido, etiquetaMonto, etiquetaTurno, puedeFijarMonto, textoFirmar } from '../ticket-alumno.presentacion.js'

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
