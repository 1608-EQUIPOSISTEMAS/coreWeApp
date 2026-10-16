import { describe, it, expect } from 'vitest'
import { toDayMonthYear, statusOf, headline, buildKpis, timelineRow, outlookVerdict, pitchText, offerView, whatsappUrl, callRow, saidTooExpensive } from '../fichaCliente'

const resumen = (over = {}) => ({
  consultas: 4, compras: 1, monto_erp: 250, primera_fecha: '2021-11-13',
  ultima_fecha: '2026-06-09', dias_desde_ultima: 10, es_cliente: true, ...over
})

const oferta = (over = {}) => ({
  kind: 'PIDIO', program_id: 48, program_name: 'KPIS LOGÍSTICOS CON POWER BI', tier: 'NORMAL', probability: 7.8,
  reason: 'Lo consultó 2 veces', edicion: { inicio: '2026-10-24', codigo: 'E7-26' },
  precio: { profesional: 640, estudiante: 610, reserva: 100 }, ...over
})

describe('fichaCliente', () => {
  it('la fecha no se corre de dia (texto, sin new Date)', () => {
    expect(toDayMonthYear('2026-01-01')).toBe('01/01/2026')
  })

  it('sin compras es prospecto; sin ningun evento es numero nuevo', () => {
    expect(statusOf(resumen({ es_cliente: false, compras: 0 })).label).toBe('Prospecto')
    expect(statusOf(resumen({ es_cliente: false, compras: 0, consultas: 0, ultima_fecha: null })).label).toBe('Número nuevo')
  })

  it('el titular dice desde cuando y hace cuanto', () => {
    expect(headline(resumen())).toBe('Cliente desde 2021 · última interacción hace 10 días (09/06/2026)')
    expect(headline(resumen({ ultima_fecha: null }))).toBe('Sin consultas ni compras registradas')
  })

  it('pasados 120 dias sin contacto avisa que se enfrio', () => {
    const recencia = buildKpis(resumen({ dias_desde_ultima: 128 }), []).find((k) => k.id === 'recencia')
    expect(recencia).toMatchObject({ tone: 'warn', note: 'Más de 4 meses: ya se enfrió' })
  })

  it('las consultas muestran la ultima, no un % que mezcla historico y ERP (salia 150%)', () => {
    const consultas = buildKpis(resumen({ consultas: 2, compras: 3 }), [
      { event_type: 'CONSULTA', program_name: 'KPIS LOGÍSTICOS CON POWER BI', event_date: '2026-08-17' }
    ]).find((k) => k.id === 'consultas')
    expect(consultas.note).toBe('Última: KPIS LOGÍSTICOS CON POWER BI (17/08/2026)')
  })

  it('el cliente que volvio dice llamalo hoy con el mismo % de la bandeja', () => {
    const v = outlookVerdict({ segment: 'VOLVIO', probability: 9, days: 59, inquiries: 2, level: 'ALTA', callable: true })
    expect(v).toMatchObject({ tone: 'ok', title: 'Llámalo hoy', nivel: { label: 'Alta' }, text: expect.stringContaining('entra a Llamar hoy') })
    // El asesor ve el nivel, nunca el %.
    expect(v.text).not.toContain('%')
    expect(outlookVerdict({ segment: 'CALIENTE', days: 1, inquiries: 1, level: 'BAJA', callable: false }).text).toContain('cadencia de WhatsApp')
    expect(outlookVerdict(null)).toBeNull()
  })

  it('el mensaje de WhatsApp lleva fecha, precio y reserva', () => {
    expect(pitchText(oferta())).toContain('empieza el 24/10/2026. La inversión es de S/ 640 (S/ 610 para estudiantes) y separas tu vacante con S/ 100.')
    expect(pitchText(oferta({ edicion: null }))).toContain('¿te aviso apenas tengamos fecha?')
  })

  it('la oferta sin muestra no inventa porcentaje y avisa si no hay edicion', () => {
    const v = offerView(oferta({ probability: null, edicion: null, precio: null }), '929532343')
    expect(v).toMatchObject({ probabilidad: null, edicion: 'Sin edición programada', edicionTone: 'warn', precio: null })
    expect(v.whatsapp.startsWith('https://wa.me/51929532343?text=')).toBe(true)
  })

  it('WhatsApp sin texto abre el chat limpio', () => {
    expect(whatsappUrl('912345678')).toBe('https://wa.me/51912345678')
  })

  it('la compra historica avisa que su fecha es la de certificacion', () => {
    const row = timelineRow({ event_type: 'COMPRA', event_date: '2025-07-04', date_kind: 'CERTIFICACION', source: 'LEGACY_ALUMNO', source_id: '1', program_name: null, user_name: null, amount: null })
    expect(row).toMatchObject({ tipo: 'Compra', fechaNota: 'certificación', origen: 'Histórico', programa: 'Sin programa registrado', monto: '—' })
  })

  it('lo que ya dijo en Llamar hoy, y si fue "caro"', () => {
    const llamadas = [{ outcome: 'CARO', fecha: '2026-10-02', user_name: 'AE30', program_name: 'POWER BI' }]
    expect(callRow(llamadas[0]).texto).toBe('Dijo que está caro el 02/10/2026')
    expect(saidTooExpensive(llamadas)).toBe(true)
    expect(saidTooExpensive([])).toBe(false)
  })
})
