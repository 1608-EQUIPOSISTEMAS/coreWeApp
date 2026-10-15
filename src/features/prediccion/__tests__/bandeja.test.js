import { describe, it, expect } from 'vitest'
import { whatsappUrl, assignmentRow, buildKpis, parseOutcome, OUTCOME_GROUPS, measurementView } from '../bandeja'

const asignacion = (over = {}) => ({
  assignment_id: 1, phone_key: '912345678', client_name: 'Ana Pérez', program_name: 'POWER BI',
  consulted_on: '2026-09-20', inquiries: 1, probability: 4.4, tier: 'TOP',
  assigned_on: '2026-10-14', expires_on: '2026-10-28', ...over
})

describe('bandeja', () => {
  it('WhatsApp: celular peruano con 51, extranjero tal cual', () => {
    expect(whatsappUrl('912345678')).toBe('https://wa.me/51912345678')
    expect(whatsappUrl('5215512345678')).toBe('https://wa.me/5215512345678')
  })

  it('cuenta dias sin correr la fecha y avisa lo que vence pronto', () => {
    const row = assignmentRow(asignacion({ expires_on: '2026-10-16' }), '2026-10-15')
    expect(row.consulta).toBe('Consultó hace 25 días (20/09/2026)')
    expect(row).toMatchObject({ vence: 'Vence en 1 día', venceTone: 'warn', probabilidad: '4.4%', tierTone: 'ok' })
  })

  it('el cliente de 2+ consultas (9%) se resalta', () => {
    expect(assignmentRow(asignacion({ inquiries: 2, probability: 9 }), '2026-10-15')).toMatchObject({ repetida: true, probTone: 'ok' })
  })

  it('inscribir clona la ultima consulta del cliente en el formulario de venta', () => {
    expect(assignmentRow(asignacion({ lead_id: 420596 }), '2026-10-15').inscribir)
      .toEqual({ name: 'ComercialLeadsNew', query: { clone_from: 420596 } })
    expect(assignmentRow(asignacion({ lead_id: null }), '2026-10-15').inscribir).toBeNull()
  })

  it('WhatsApp abre con la propuesta de fecha y precio, y avisa si no hay edicion', () => {
    const conEdicion = assignmentRow(asignacion({ edicion: { inicio: '2026-10-24', codigo: 'E7-26' }, precio: { profesional: 640, estudiante: 610, reserva: 100 } }), '2026-10-15')
    expect(decodeURIComponent(conEdicion.whatsapp)).toContain('empieza el 24/10/2026')
    expect(conEdicion.edicion).toBe('Inicia el 24/10/2026')
    expect(assignmentRow(asignacion({ edicion: null, precio: null }), '2026-10-15')).toMatchObject({ edicion: 'Sin edición programada', edicionTone: 'warn' })
  })

  it('sin nombre muestra el telefono', () => {
    expect(assignmentRow(asignacion({ client_name: null }), '2026-10-15').cliente).toBe('912345678')
  })

  it('compara lo comprado contra lo esperado y marca los vencidos', () => {
    const kpis = buildKpis({
      today: '2026-10-15',
      abiertos: [asignacion({ expires_on: '2026-10-16' }), asignacion({ expires_on: '2026-10-28' })],
      ultimos_30_dias: { cerrados: 40, compraron: 3, compras_esperadas: 2.2, vencidos: 4 }
    })
    const by = Object.fromEntries(kpis.map((k) => [k.id, k]))
    expect(by.pendientes).toMatchObject({ value: '2', tone: 'warn' })
    expect(by.compraron).toMatchObject({ tone: 'ok', note: 'Se esperaban 2.2 de 40 clientes' })
    expect(by.vencidos.tone).toBe('bad')
  })
})

describe('motivo y medicion', () => {
  it('el selector manda resultado y motivo en un solo clic', () => {
    expect(parseOutcome('NO_INTERESA:PRECIO')).toEqual({ outcome: 'NO_INTERESA', reason: 'PRECIO' })
    expect(parseOutcome('NO_CONTESTA')).toEqual({ outcome: 'NO_CONTESTA', reason: null })
  })

  it('cada motivo de NO_INTERESA es uno que el backend acepta', () => {
    const backend = ['PRECIO', 'HORARIO', 'FECHA', 'LO_PENSARA', 'OTRO_PROGRAMA', 'COMPETENCIA', 'SIN_INTERES']
    const usados = OUTCOME_GROUPS.flatMap((g) => g.options).map((o) => parseOutcome(o.value).reason).filter(Boolean)
    expect(usados.every((r) => backend.includes(r))).toBe(true)
  })

  const medicion = (over = {}) => ({
    today: '2026-12-01', ventana_dias: 30,
    segmentos: [{ segmento: 'Cliente, consultó 1 vez', esperado: 4.4, llamados: { n: 300, compraron: 30, tasa: 10 }, control: { n: 60, compraron: 2, tasa: 3.3 }, lift: 3, significativo: true, calibrado: true, veredicto: 'FUNCIONA' }],
    estado: { first_mature: '2026-11-15', madurando: 120, llamables: 400, con_resultado: 200, vencidos: 150 },
    motivos: [{ reason: 'PRECIO', total: 30 }, { reason: 'HORARIO', total: 10 }],
    ...over
  })

  it('el lider ve si vende mas, con la muestra al lado', () => {
    const v = measurementView(medicion())
    expect(v.filas[0]).toMatchObject({ llamados: '10% (30 de 300)', lift: '3×', veredicto: { label: 'Vende más', tone: 'ok' } })
    expect(v.motivos[0]).toEqual({ motivo: 'Precio', total: '30', pct: '75%' })
  })

  it('si los asesores casi no registran, avisa que la medicion no mide la bandeja', () => {
    expect(measurementView(medicion()).trabajoTone).toBe('warn')
  })

  it('antes de madurar dice desde cuando se podra leer', () => {
    const v = measurementView(medicion({ today: '2026-11-01', segmentos: [] }))
    expect(v).toMatchObject({ vacio: true, nota: expect.stringContaining('15/11/2026') })
  })
})
