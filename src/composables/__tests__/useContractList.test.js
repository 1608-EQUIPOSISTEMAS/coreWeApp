import { describe, it, expect } from 'vitest'
import { CONTRACT_VIEWS, contractStatus, seatsFree } from '../useContractList.js'

const HOY = '2026-08-18'
const match = key => CONTRACT_VIEWS.find(v => v.key === key).match

describe('contractStatus', () => {
  it('respeta el status del SP cuando viene', () => {
    expect(contractStatus({ status: 'cancelled', end_date: null }, HOY)).toBe('Cancelado')
    expect(contractStatus({ status: 'expired' }, HOY)).toBe('Vencido')
  })

  it('la baja logica manda sobre la fecha', () => {
    // Vigente por fecha pero dado de baja: es Cancelado, no Activo.
    expect(contractStatus({ active: 'N', end_date: '2027-01-01' }, HOY)).toBe('Cancelado')
  })

  it('sin fecha de fin el contrato es indefinido, no vencido', () => {
    expect(contractStatus({ active: 'Y', end_date: null }, HOY)).toBe('Activo')
  })

  it('vence el dia DESPUES de la fecha de fin, no el mismo dia', () => {
    // El ultimo dia todavia se puede matricular: el contrato cubre esa fecha.
    expect(contractStatus({ end_date: HOY }, HOY)).toBe('Activo')
    expect(contractStatus({ end_date: '2026-08-17' }, HOY)).toBe('Vencido')
  })

  it('tolera el timestamp completo que a veces devuelve el SP', () => {
    expect(contractStatus({ end_date: '2026-08-17T00:00:00.000Z' }, HOY)).toBe('Vencido')
  })
})

describe('seatsFree', () => {
  it('es lo comprado menos lo repartido', () => {
    expect(seatsFree({ number_of_licenses: 10, seats_assigned: 4 })).toBe(6)
  })

  it('da negativo cuando se repartieron mas cupos de los comprados', () => {
    // Sobreventa: la tabla lo pinta en rojo, por eso no se recorta a cero aca.
    expect(seatsFree({ number_of_licenses: 5, seats_assigned: 8 })).toBe(-3)
  })

  it('trata los nulos como cero', () => {
    expect(seatsFree({})).toBe(0)
  })
})

describe('CONTRACT_VIEWS', () => {
  const CARTERA = [
    { contract_id: 1, active: 'Y', end_date: null,         pending_amount: 0,    number_of_licenses: 10, seats_assigned: 10 },
    { contract_id: 2, active: 'Y', end_date: '2027-01-01', pending_amount: 1200, number_of_licenses: 5,  seats_assigned: 2 },
    { contract_id: 3, active: 'Y', end_date: '2026-01-01', pending_amount: 300,  number_of_licenses: 0,  seats_assigned: 0 },
    { contract_id: 4, active: 'N', end_date: null,         pending_amount: 0,    number_of_licenses: 3,  seats_assigned: 0 }
  ]
  const ids = key => CARTERA.filter(match(key)).map(c => c.contract_id)

  it('"Todos" no descarta ninguno', () => {
    expect(ids('all')).toEqual([1, 2, 3, 4])
  })

  it('vigentes deja fuera al vencido y al cancelado', () => {
    expect(ids('active')).toEqual([1, 2])
  })

  it('"Con saldo" es saldo mayor a cero, no distinto de cero', () => {
    expect(ids('with_balance')).toEqual([2, 3])
  })

  it('"Cupos libres" no cuenta al contrato con todo repartido', () => {
    // El 4 esta cancelado pero sus 3 cupos siguen sin repartir: la vista de
    // cupos mira el reparto, el estado se filtra con la pestaña de estado.
    expect(ids('free_seats')).toEqual([2, 4])
  })

  it('vencidos y cancelados no se pisan', () => {
    expect(ids('expired')).toEqual([3])
    expect(ids('cancelled')).toEqual([4])
  })

  it('toda vista declara key, label, icono y predicado', () => {
    for (const v of CONTRACT_VIEWS) {
      expect(typeof v.match).toBe('function')
      expect(v.key && v.label && v.icon).toBeTruthy()
    }
    expect(new Set(CONTRACT_VIEWS.map(v => v.key)).size).toBe(CONTRACT_VIEWS.length)
  })
})
