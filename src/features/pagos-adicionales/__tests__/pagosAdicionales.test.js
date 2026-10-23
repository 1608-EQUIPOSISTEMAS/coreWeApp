import { describe, it, expect } from 'vitest'
import {
  COLUMNS, withLabels, applyFilters, valuesFor, sortRows, programasDe, lineaProductoDe,
  emptyForm, formFromFila, validateForm, buildPayload, cuentasDe, PROGRAMAS_FUNDACION, ASUNTOS
} from '../pagosAdicionales.js'

const fila = (extra = {}) => ({
  id: 1, lineaNegocio: 'EN VIVO', programa: 'SAP HANA MM', asunto: 'Reprog.', fechaPago: '2026-10-18', nombre: 'Ana',
  celular: '941421778', correo: '', estado: 'EFECTUADO', realizado: true, monto: 70, moneda: 'PEN', medioPago: 'YAPE',
  entidadEmpresa: 'WE Educación', entidadFinanciera: 'BCP', nOper: '1', tipoPrograma: 'ADICIONALES', lineaProducto: 'SAP',
  tipoPago: '', catPaymentMedium: 3205, catBusinessEntity: 3213, bankAccountId: 6, ...extra
})

describe('columnas', () => {
  it('siguen el orden del sheet', () => {
    expect(COLUMNS.map(c => c.label)).toEqual([
      'Línea de negocio', 'Programa', 'Asunto', 'F. pago', 'Nombres y apellidos', 'Celular', 'Correo', 'Estado',
      '¿Realizado?', 'Monto', 'Tipo de moneda', 'Medio de pago', 'Entidad empresa', 'Entidad financiera',
      'N° operación', 'Tipo programa', 'Línea de producto', 'Tipo de pago'
    ])
  })
})

describe('filtros y orden', () => {
  const rows = withLabels([fila(), fila({ id: 2, realizado: false, asunto: 'Cert. becas', monto: 50 }), fila({ id: 3, asunto: 'Reprog.', monto: 30 })])

  it('¿Realizado? se filtra como Sí / No', () => {
    expect(applyFilters(rows, { realizadoLabel: { values: ['No'] } }).map(r => r.id)).toEqual([2])
  })

  it('combina filtros y la lista de valores se recorta con los demás', () => {
    const filters = { asunto: { values: ['Reprog.'] }, monto: { min: '40' } }
    expect(applyFilters(rows, filters).map(r => r.id)).toEqual([1])
    expect(valuesFor(rows, { asunto: { values: ['Reprog.'] } }, 'realizadoLabel')).toEqual([{ value: 'Sí', n: 2 }])
  })

  it('ordena por monto y desempata por N°', () => {
    expect(sortRows(rows, { key: 'monto', dir: 'asc' }).map(r => r.id)).toEqual([3, 2, 1])
  })
})

describe('formulario', () => {
  it('la lista de programas depende de la línea', () => {
    expect(programasDe('FUNDACIÓN WE')).toBe(PROGRAMAS_FUNDACION)
    expect(programasDe('ONLINE')).toContain('FUND. SAP R3')
    expect(programasDe('EN VIVO')).toContain('SAP HANA MM')
  })

  it('línea de producto según el portafolio', () => {
    expect(lineaProductoDe('SAP HANA MM')).toBe('SAP')
    expect(lineaProductoDe(' POWER BI ')).toBe('BI')
    expect(lineaProductoDe('NO EXISTE')).toBe('')
  })

  it('emptyForm arranca hoy, EN VIVO, EFECTUADO y en soles', () => {
    expect(emptyForm(new Date(2026, 9, 5))).toMatchObject({ payment_date: '2026-10-05', business_line: 'EN VIVO', status: 'EFECTUADO', currency: 'PEN', done: false })
  })

  it('formFromFila y buildPayload hacen ida y vuelta', () => {
    const p = buildPayload(formFromFila(fila({ correo: '  ', nOper: ' 99 ' })))
    expect(p).toMatchObject({ business_line: 'EN VIVO', program: 'SAP HANA MM', email: null, transaction_code: '99', done: true, amount: 70, bank_account_id: 6 })
  })

  it('validateForm marca obligatorios, fecha, monto y correo', () => {
    const e = validateForm({ ...emptyForm(), payment_date: '2025-12-01', email: 'x', amount: -1 })
    expect(Object.keys(e).sort()).toEqual(['amount', 'email', 'full_name', 'payment_date', 'program', 'subject'])
    expect(validateForm({ ...buildPayload(formFromFila(fila())) })).toEqual({})
  })

  it('sin certificados: no están en la lista y no se aceptan', () => {
    expect(ASUNTOS).toContain('Reprog.')
    expect(ASUNTOS.some(a => /cert/i.test(a))).toBe(false)
    expect(validateForm({ ...formFromFila(fila()), subject: 'Cert. becas' }).subject).toMatch(/Inscripciones/)
    expect(validateForm({ ...formFromFila(fila()), subject: 'REASIGNACIÓN' }).subject).toMatch(/lista/)
    expect(ASUNTOS).toHaveLength(18)
  })

  it('validateForm acepta monto 0', () => {
    expect(validateForm({ ...formFromFila(fila()), amount: 0 }).amount).toBeUndefined()
  })

  it('cuentasDe filtra por empresa y moneda', () => {
    const cuentas = [
      { account_id: 6, business_entity_catalog_id: 3213, currency: 'PEN' },
      { account_id: 7, business_entity_catalog_id: 3213, currency: 'USD' },
      { account_id: 16, business_entity_catalog_id: 3215, currency: 'PEN' }
    ]
    expect(cuentasDe(cuentas, 3213, 'PEN').map(a => a.account_id)).toEqual([6])
    expect(cuentasDe(cuentas, null, 'PEN')).toEqual([])
  })
})
