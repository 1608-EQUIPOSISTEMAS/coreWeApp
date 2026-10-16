import { describe, it, expect } from 'vitest'
import { whatsappUrl, assignmentRow, whyCall, groupByLevel, followUpRow, followUpText, buildKpis, measurementView } from '../bandeja'

const today = '2026-10-15'
const asignacion = (over = {}) => ({
  assignment_id: 1, phone_key: '912345678', client_name: 'Ana Pérez', program_name: 'POWER BI',
  consulted_on: '2026-10-14', inquiries: 3, is_client: false, level: 'ALTA', tier: 'TOP', attempts: 0, last_result: null,
  assigned_on: '2026-10-14', expires_on: '2026-10-28', edicion: { inicio: '2026-10-17', codigo: 'E7-26' }, ...over
})

describe('assignmentRow', () => {
  it('WhatsApp: celular peruano con 51, extranjero tal cual', () => {
    expect(whatsappUrl('912345678')).toBe('https://wa.me/51912345678')
    expect(whatsappUrl('5215512345678')).toBe('https://wa.me/5215512345678')
  })

  it('por que llamarlo, en una linea', () => {
    expect(whyCall(asignacion(), today)).toBe('3 consultas · última hace 1 día · inicia 17/10')
    expect(whyCall(asignacion({ is_client: true, inquiries: 1, edicion: null }), today)).toBe('Ya es cliente · última hace 1 día')
    expect(whyCall(asignacion({ is_client: true, inquiries: 2, edicion: null }), today)).toBe('Ya es cliente · 2 consultas · última hace 1 día')
  })

  it('el plazo de 14 dias solo aparece si faltan 3 dias o menos', () => {
    expect(assignmentRow(asignacion(), today).plazo).toBeNull()
    expect(assignmentRow(asignacion({ expires_on: '2026-10-17' }), today).plazo).toBe('Vence en 2 días')
    expect(assignmentRow(asignacion({ expires_on: '2026-10-15' }), today).plazo).toBe('Vence hoy')
  })

  it('sin nombre: muestra el telefono y avisa que hay que pedirlo', () => {
    expect(assignmentRow(asignacion({ client_name: null }), today)).toMatchObject({ cliente: '912345678', sinNombre: true })
  })

  it('recuerda lo que paso antes: caro abre con cuotas', () => {
    expect(assignmentRow(asignacion({ last_result: 'CARO' }), today).antes).toContain('cuotas')
    expect(assignmentRow(asignacion({ last_result: 'NO_CONTESTA', attempts: 2 }), today).antes).toBe('No contestó 2 veces')
  })

  it('inscribir clona la ultima consulta del cliente en el formulario de venta', () => {
    expect(assignmentRow(asignacion({ lead_id: 420596 }), today).inscribir)
      .toEqual({ name: 'ComercialLeadsNew', query: { clone_from: 420596 } })
    expect(assignmentRow(asignacion({ lead_id: null }), today).inscribir).toBeNull()
  })

  it('agrupa Alta arriba y Media abajo, sin grupos vacios', () => {
    const rows = [assignmentRow(asignacion({ level: 'MEDIA' }), today), assignmentRow(asignacion({ assignment_id: 2 }), today)]
    expect(groupByLevel(rows).map((g) => [g.level, g.rows.length])).toEqual([['ALTA', 1], ['MEDIA', 1]])
    expect(groupByLevel([rows[0]]).map((g) => g.level)).toEqual(['MEDIA'])
  })
})

describe('cadencia', () => {
  const f = (over = {}) => ({
    followup_id: 7, phone_key: '912345678', client_name: 'Ana Pérez', program_name: 'POWER BI', reason: 'BAJA',
    step: 1, due_on: '2026-10-15', edicion: { inicio: '2026-10-29', codigo: 'E24-26' }, precio: { profesional: 840, estudiante: 750, reserva: 100 }, ...over
  })

  it('dia 1 manda la propuesta; dia 3 recuerda la reserva; dia 7 cierra sin presionar', () => {
    expect(followUpText(f())).toContain('empieza el 29/10/2026')
    expect(followUpText(f({ step: 3 }))).toContain('separar tu vacante')
    expect(followUpText(f({ step: 7 }))).toContain('por última vez')
  })

  it('avisa el atraso', () => {
    expect(followUpRow(f({ due_on: '2026-10-13' }), today)).toMatchObject({ paso: 'Día 1', atraso: 'Atrasado 2 días', motivo: 'Consultó 1 vez' })
  })
})

describe('buildKpis', () => {
  it('contactados hoy contra el tope y los Alta pendientes', () => {
    const kpis = buildKpis({
      abiertos: [{ level: 'ALTA' }, { level: 'MEDIA' }], seguimientos: [{}], contactados_hoy: 7, tope: 20,
      ultimos_30_dias: { cerrados: 10, compraron: 2, vencidos: 1 }
    })
    expect(kpis.find((k) => k.id === 'contactados').value).toBe('7/20')
    expect(kpis.find((k) => k.id === 'pendientes').note).toContain('1 de nivel Alta')
  })
})

describe('measurementView', () => {
  it('traduce los resultados registrados', () => {
    const v = measurementView({
      segmentos: [], estado: { first_mature: null, llamables: 0 }, today,
      resultados: [{ outcome: 'CARO', total: 3 }, { outcome: 'LO_PIENSO', total: 1 }], ventana_dias: 30
    })
    expect(v.resultados[0]).toMatchObject({ resultado: 'Caro', total: '3' })
  })
})
