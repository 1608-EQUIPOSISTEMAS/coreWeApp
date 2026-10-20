import { describe, it, expect } from 'vitest'
import {
  amountParts, buildCollectionCards, dueLabel, summarizeCollections,
  filterCollections, sortByAmount, buildInstallmentTimeline
} from '../collectionView.js'

const ROWS = [
  { installment_id: 1, amount: '100.00', currency: 'PEN', state_label: 'overdue', due_date: '2026-10-01', installment_number: 2, program_name: 'DIPLOMADO SCM', student_full_name: 'José Pérez', document_number: '70786567', email: 'jose@mail.com', phone: '+51 987 654 321', seller_agent_name: 'AE30' },
  { installment_id: 2, amount: '50.50', currency: 'PEN', state_label: 'today', due_date: '2026-10-19', installment_number: 3, program_name: 'MEMBRESIA BLACK', student_full_name: 'Ana Ruiz', document_number: '71835106', email: 'ana@mail.com', phone: null, seller_agent_name: null },
  { installment_id: 3, amount: '200.00', currency: 'PEN', state_label: 'upcoming', due_date: '2026-10-25', installment_number: 2, program_name: 'DIPLOMADO SCM', student_full_name: 'Luis Díaz', document_number: '72214069', email: 'luis@mail.com', phone: '999111222', seller_agent_name: 'AE30' },
  { installment_id: 5, amount: '93.00', currency: 'USD', state_label: 'overdue', due_date: '2026-10-01', installment_number: 1, program_name: 'MEMBRESIA BLACK', student_full_name: 'Eva Soto', document_number: '5352110', email: 'eva@mail.com', phone: null, seller_agent_name: 'GR39' }
]
const ids = rows => rows.map(r => r.installment_id)

describe('summarizeCollections', () => {
  it('agrega por estado con soles y dolares por separado (no se suman)', () => {
    expect(summarizeCollections(ROWS)).toEqual({
      total_count: 4, total_amount_pen: 350.5, total_amount_usd: 93,
      overdue_count: 2, overdue_amount_pen: 100, overdue_amount_usd: 93,
      today_count: 1, today_amount_pen: 50.5, today_amount_usd: 0,
      upcoming_count: 1, upcoming_amount_pen: 200, upcoming_amount_usd: 0
    })
  })
})

describe('filterCollections', () => {
  it('marca fechas sueltas (no rango)', () => {
    expect(ids(filterCollections(ROWS, { vence: ['01/10/2026', '25/10/2026'] }))).toEqual([1, 3, 5])
  })

  it('alumno por nombre sin tildes, DNI, correo o celular solo con digitos', () => {
    expect(ids(filterCollections(ROWS, { alumno: 'jose perez' }))).toEqual([1])
    expect(ids(filterCollections(ROWS, { alumno: '72214' }))).toEqual([3])
    expect(ids(filterCollections(ROWS, { alumno: 'ana@' }))).toEqual([2])
    expect(ids(filterCollections(ROWS, { alumno: '987 654321' }))).toEqual([1])
  })

  it('combina columnas con AND y valores de una columna con OR', () => {
    const f = { programa: ['DIPLOMADO SCM', 'MEMBRESIA BLACK'], asesor: ['AE30'], monto: ['S/. 200.00', '$ 93.00'] }
    expect(ids(filterCollections(ROWS, f))).toEqual([3])
  })

  it('sin filtros devuelve todo', () => {
    expect(filterCollections(ROWS, { alumno: '', programa: [] })).toHaveLength(4)
  })
})

describe('sortByAmount', () => {
  it('mayor a menor, menor a mayor, o el orden original', () => {
    expect(ids(sortByAmount(ROWS, 'desc'))).toEqual([3, 1, 5, 2])
    expect(ids(sortByAmount(ROWS, 'asc'))).toEqual([2, 5, 1, 3])
    expect(sortByAmount(ROWS, null)).toBe(ROWS)
  })
})

describe('buildInstallmentTimeline', () => {
  it('cuotas pagadas con su fecha de pago, vencidas, pendientes y anuladas fuera de la deuda', () => {
    const { rows, totals } = buildInstallmentTimeline({
      installments: [
        { installment_id: 12, installment_number: 1, amount: 285, due_date: '2026-10-06', status_alias: 'we_inst_pending' },
        { installment_id: 11, installment_number: 0, amount: 285, due_date: '2026-09-06', status_alias: 'we_payment_status_paid' },
        { installment_id: 13, installment_number: 2, amount: 285, due_date: '2026-11-06', status_alias: 'we_inst_pending' },
        { installment_id: 14, installment_number: 3, amount: 100, due_date: '2026-12-06', status_alias: 'we_inst_cancelled' }
      ],
      payment_history: [{ installment_id: 11, payment_date: '2026-09-05T00:00:00', payment_method: 'YAPE' }]
    }, '2026-10-19')
    expect(rows.map(r => [r.label, r.state])).toEqual([['Inicial', 'paid'], ['C1', 'overdue'], ['C2', 'pending'], ['C3', 'annulled']])
    expect(rows[0]).toMatchObject({ paid_on: '2026-09-05', method: 'YAPE' })
    expect(totals).toEqual({ paid: 285, overdue: 285, balance: 570 })
  })
})

describe('amountParts', () => {
  it('soles como cifra principal y dolares aparte, nunca sumados', () => {
    expect(amountParts(375.5, 93)).toEqual({ main: 'S/. 375.50', extra: '+ $ 93.00' })
    expect(amountParts(1200, 0)).toEqual({ main: 'S/. 1,200.00', extra: null })
  })

  it('un grupo solo en dolares muestra los dolares', () => {
    expect(amountParts(0, 93)).toEqual({ main: '$ 93.00', extra: null })
  })
})

describe('buildCollectionCards', () => {
  it('arma las 4 tarjetas con conteo y dolares en la nota', () => {
    const cards = buildCollectionCards({
      total_count: 5, total_amount_pen: 375.5, total_amount_usd: 93,
      overdue_count: 1, overdue_amount_pen: 100, overdue_amount_usd: 0
    })
    expect(cards.map(c => c.clave)).toEqual(['total', 'overdue', 'today', 'upcoming'])
    expect(cards[0]).toMatchObject({ valor: 'S/. 375.50', nota: '5 cuotas · + $ 93.00' })
    expect(cards[1]).toMatchObject({ valor: 'S/. 100.00', nota: '1 cuota' })
    expect(cards[2]).toMatchObject({ valor: 'S/. 0.00', nota: '0 cuotas' })
  })
})

describe('dueLabel', () => {
  it('vencida con dias, hoy, pronto y lejos', () => {
    expect(dueLabel('overdue', -12)).toBe('Vencida hace 12 d')
    expect(dueLabel('overdue', 0)).toBe('Vencida')
    expect(dueLabel('today', 0)).toBe('Vence hoy')
    expect(dueLabel('upcoming', 3)).toBe('En 3 d')
    expect(dueLabel('upcoming', 20)).toBe('Por vencer')
  })
})
