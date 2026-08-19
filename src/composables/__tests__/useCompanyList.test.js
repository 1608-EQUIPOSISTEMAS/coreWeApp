import { describe, it, expect } from 'vitest'
import { COMPANY_VIEWS } from '../useCompanyList.js'

// Cada tarjeta KPI de /business/companies es el atajo a la pestaña del mismo
// nombre y ambas cuentan con ESTE predicado. Si uno se toca sin el otro, el
// tablero dice 44 y la tabla muestra 60: por eso el criterio vive en un solo
// lugar y se prueba acá.
const match = key => COMPANY_VIEWS.find(v => v.key === key).match

const CARTERA = [
  { company_id: 1, razon_social: 'ALFA SAC',  active_contracts_count: 2, is_intermediary: 'N', primary_contact_name: 'Ana',  cat_sector: 10, cat_classification: 20 },
  { company_id: 2, razon_social: 'BETA SAC',  active_contracts_count: 0, is_intermediary: 'N', primary_contact_name: null,   cat_sector: 10, cat_classification: 20 },
  { company_id: 3, razon_social: 'GOINTEGRO', active_contracts_count: 1, is_intermediary: 'Y', primary_contact_name: 'Luis', cat_sector: null, cat_classification: null },
  { company_id: 4, razon_social: 'DELTA EIRL', active_contracts_count: 0, is_intermediary: 'N', primary_contact_name: 'Eva', cat_sector: 10, cat_classification: null }
]

const idsQueMatchean = key => CARTERA.filter(match(key)).map(c => c.company_id)

describe('COMPANY_VIEWS', () => {
  it('"Todas" no descarta ninguna', () => {
    expect(idsQueMatchean('all')).toEqual([1, 2, 3, 4])
  })

  it('separa con contrato de sin contrato sin dejar huecos ni solapes', () => {
    const con = idsQueMatchean('with_contract')
    const sin = idsQueMatchean('no_contract')
    expect(con).toEqual([1, 3])
    expect(sin).toEqual([2, 4])
    // Invariante: toda empresa cae exactamente en una de las dos.
    expect([...con, ...sin].sort()).toEqual([1, 2, 3, 4])
  })

  it('marca intermediarias solo con la Y del SP', () => {
    expect(idsQueMatchean('intermediary')).toEqual([3])
  })

  it('"Sin contacto" es el dato accionable: nombre vacio, no correo vacio', () => {
    expect(idsQueMatchean('no_contact')).toEqual([2])
  })

  it('"Sin clasificar" cae con que falte UNO de los dos catalogos', () => {
    // La 4 tiene sector pero no clasificacion: sigue estando a medio llenar.
    expect(idsQueMatchean('unclassified')).toEqual([3, 4])
  })

  it('toda vista declara key, label, icono y predicado', () => {
    for (const v of COMPANY_VIEWS) {
      expect(typeof v.match).toBe('function')
      expect(v.key && v.label && v.icon).toBeTruthy()
    }
    expect(new Set(COMPANY_VIEWS.map(v => v.key)).size).toBe(COMPANY_VIEWS.length)
  })
})
