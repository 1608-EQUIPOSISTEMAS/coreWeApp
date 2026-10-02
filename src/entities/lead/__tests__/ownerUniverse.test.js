import { describe, it, expect } from 'vitest'
import { buildOwnerUniverse } from '../ownerUniverse.js'

const u = (user_id, first_name = 'Ana', last_name = 'Rojas') => ({ user_id, first_name, last_name })

describe('buildOwnerUniverse', () => {
  it('un usuario de Fundacion/B2B queda fuera aunque tambien sea COMERCIAL', () => {
    const r = buildOwnerUniverse({ advisors: [u(1), u(2)], excluded: [u(2)] })
    expect(r.map(x => x.id)).toEqual([1])
  })

  it('suma los roles extra sin duplicar', () => {
    const r = buildOwnerUniverse({ advisors: [u(1)], extras: [u(1), u(3)] })
    expect(r.map(x => x.id)).toEqual([1, 3])
  })

  it('nombre corto con inicial del apellido y respaldo por id', () => {
    const r = buildOwnerUniverse({ advisors: [u(1, ' Camilo ', 'Castro'), u(4, '', ''), u(5, 'Luz', '')] })
    expect(r.map(x => x.description)).toEqual(['Camilo C.', 'Usuario 4', 'Luz'])
  })
})
