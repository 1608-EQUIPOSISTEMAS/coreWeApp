import { describe, it, expect } from 'vitest'
import { roleSummary } from '../roleSummary'

const modules = [
  { module_id: 1, name: 'FICO', submodules: [{ submodule_id: 10 }, { submodule_id: 11 }, { submodule_id: 12 }] },
  { module_id: 2, name: 'Gerencia', submodules: [] },
  { module_id: 3, name: 'B2B', submodules: [{ submodule_id: 30 }] }
]

describe('roleSummary', () => {
  it('cuenta submódulos concedidos y el módulo sin submódulos como uno', () => {
    const s = roleSummary({ module_ids: [1, 2], submodule_ids: [10, 12] }, modules)
    expect(s.total).toBe(5)
    expect(s.granted).toBe(3)
    expect(s.pct).toBe(60)
    expect(s.chips).toEqual([
      { id: 1, name: 'FICO', count: 2 },
      { id: 2, name: 'Gerencia', count: 1 }
    ])
  })

  it('el superusuario tiene todo aunque su matriz esté vacía', () => {
    const s = roleSummary({ module_ids: [], submodule_ids: [] }, modules, true)
    expect(s.pct).toBe(100)
    expect(s.chips).toHaveLength(3)
  })

  it('sin módulos cargados no divide entre cero', () => {
    expect(roleSummary({ module_ids: [], submodule_ids: [] }, []).pct).toBe(0)
  })
})
