import { describe, it, expect } from 'vitest'
import { isSheetUrl, hojasListas, veredicto, kpis, filtrosPorTipo, filtrarFilas, hallazgosOrdenados, labelOf, toneOf, correccionesBajoRiesgo, conteoPorAccion, pedidoDe, resumenResultado } from '../conciliacion'

const f = (code, severity = 'error') => ({ code, severity, message: '' })
const rows = [
  { row_number: 178, enrollment_id: 11658, student: 'RAMIREZ RAMIREZ SEBASTIAN', document_number: '73278328', findings: [f('REGISTRATION_DATE_MISMATCH', 'warning'), f('TOTAL_MISMATCH')] },
  { row_number: 180, enrollment_id: 11659, student: 'CASTRO BARJA CHRISTIAN', document_number: '48332528', findings: [f('REGISTRATION_DATE_MISMATCH', 'warning')] },
  { row_number: null, enrollment_id: 11902, student: 'RARAZ REYES JHAN', document_number: '75258746', findings: [f('NOT_IN_SHEET')] }
]

describe('conciliacion FICO', () => {
  it('solo acepta links de Google Sheets', () => {
    expect(isSheetUrl('https://docs.google.com/spreadsheets/d/1sB-umm/edit?gid=1')).toBe(true)
    expect(isSheetUrl('https://drive.google.com/file/d/1')).toBe(false)
    expect(isSheetUrl('')).toBe(false)
  })

  it('hojas: sin vacias ni repetidas, conservando el orden (la ultima manda)', () => {
    expect(hojasListas([' https://a ', '', 'https://b', 'https://a'])).toEqual(['https://a', 'https://b'])
    expect(hojasListas([''])).toEqual([])
  })

  it('kpis: avisa cuantas filas se repetian entre hojas', () => {
    expect(kpis({ in_scope: 10, out_of_scope: 2, repeated_across_sheets: 3 })[0].nota).toContain('3 repetidas entre hojas')
    expect(kpis({ in_scope: 10, out_of_scope: 2 })[0].nota).not.toContain('repetidas')
  })

  it('veredicto: todo coincide, solo detalles o hay que corregir', () => {
    expect(veredicto({ in_scope: 10, ok: 10, with_findings: 0, errors: 0 }).tono).toBe('ok')
    expect(veredicto({ in_scope: 10, ok: 8, with_findings: 2, errors: 0 }).tono).toBe('warn')
    const v = veredicto({ in_scope: 87, ok: 4, with_findings: 113, errors: 71 })
    expect(v).toMatchObject({ tono: 'bad', titulo: 'Hay que corregir' })
    expect(v.texto).toContain('71 filas con errores y 42 solo con advertencias')
  })

  it('kpis: las advertencias son las filas con diferencias sin error', () => {
    const k = kpis({ in_scope: 87, out_of_scope: 169, ok: 4, with_findings: 113, errors: 71 })
    expect(k.map(x => x.valor)).toEqual([87, 4, 71, 42])
    expect(k[0].nota).toContain('169')
  })

  it('filtros por tipo: conteo, tono de error si alguna lo es, orden fijo', () => {
    const fs = filtrosPorTipo(rows)
    expect(fs.map(x => x.code)).toEqual(['NOT_IN_SHEET', 'TOTAL_MISMATCH', 'REGISTRATION_DATE_MISMATCH'])
    expect(fs.find(x => x.code === 'REGISTRATION_DATE_MISMATCH')).toMatchObject({ n: 2, tono: 'warn', label: 'Fecha distinta' })
  })

  it('filtra por tipo, severidad y texto', () => {
    expect(filtrarFilas(rows, { codigo: 'REGISTRATION_DATE_MISMATCH' })).toHaveLength(2)
    expect(filtrarFilas(rows, { severidad: 'error' }).map(r => r.enrollment_id)).toEqual([11658, 11902])
    expect(filtrarFilas(rows, { severidad: 'warning', texto: 'castro' }).map(r => r.row_number)).toEqual([180])
    expect(filtrarFilas(rows, { texto: '11902' })).toHaveLength(1)
  })

  it('dentro de la fila, los errores van primero', () => {
    expect(hallazgosOrdenados(rows[0].findings).map(x => x.code)).toEqual(['TOTAL_MISMATCH', 'REGISTRATION_DATE_MISMATCH'])
  })

  it('codigo desconocido se muestra tal cual', () => {
    expect(labelOf('NUEVO_CODIGO')).toBe('NUEVO_CODIGO')
    expect(toneOf('warning')).toBe('warn')
  })
})

describe('correcciones', () => {
  const fx = (action, risk, blocked = null) => ({ action, label: action, risk, blocked })
  const filas = [
    { row_number: 31, sheet: 1, enrollment_id: 23107, fixes: [fx('agent', 'low', 'no existe IV27')] },
    { row_number: 107, sheet: 1, enrollment_id: 23117, fixes: [fx('payments', 'low'), fx('registration_date', 'low')] },
    { row_number: 79, sheet: 1, enrollment_id: 4130, fixes: [fx('plan', 'high')] },
    { row_number: 54, sheet: 1, enrollment_id: null, fixes: [fx('import_row', 'high')] }
  ]

  it('el lote junta solo las de bajo riesgo que no estan bloqueadas', () => {
    expect(correccionesBajoRiesgo(filas).map(x => x.fix.action)).toEqual(['payments', 'registration_date'])
    expect(conteoPorAccion(correccionesBajoRiesgo(filas))).toEqual([{ label: 'payments', n: 1 }, { label: 'registration_date', n: 1 }])
  })

  it('el pedido identifica la fila como la devolvio la conciliacion', () => {
    expect(pedidoDe(filas[3], filas[3].fixes[0])).toEqual({ action: 'import_row', enrollment_id: null, row_number: 54, sheet: 1 })
  })

  it('resumen del resultado segun cuantas se aplicaron', () => {
    expect(resumenResultado({ applied: 3, failed: 0 }).tono).toBe('ok')
    expect(resumenResultado({ applied: 0, failed: 2 }).tono).toBe('bad')
    expect(resumenResultado({ applied: 2, failed: 1 })).toMatchObject({ tono: 'warn', titulo: '2 aplicadas, 1 sin aplicar' })
  })
})
