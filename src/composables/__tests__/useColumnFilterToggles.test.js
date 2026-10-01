import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { isFilterActive, useColumnFilterToggles } from '../useColumnFilterToggles.js'

describe('isFilterActive', () => {
  it('vacío no filtra; con valor sí (incluido el 0 de un monto)', () => {
    expect([[], '', '  ', null, undefined].map(isFilterActive)).toEqual([false, false, false, false, false])
    expect([['AE30'], 'ana', 0, 500].map(isFilterActive)).toEqual([true, true, true, true])
  })
})

describe('useColumnFilterToggles', () => {
  it('la fila aparece al abrir una columna y se va al cerrarla', () => {
    const f = useColumnFilterToggles(reactive({ alumno: '', agente: [] }))
    expect(f.anyVisible.value).toBe(false)
    f.toggle('alumno')
    expect(f.isOpen('alumno')).toBe(true)
    expect(f.anyVisible.value).toBe(true)
    f.toggle('alumno')
    expect(f.anyVisible.value).toBe(false)
  })

  it('un filtro con valor queda visible aunque se cierre', () => {
    const filters = reactive({ alumno: 'ana', agente: [] })
    const f = useColumnFilterToggles(filters)
    expect(f.isOpen('alumno')).toBe(true)
    f.closeAll()
    expect(f.isOpen('alumno')).toBe(true)
    expect(f.anyVisible.value).toBe(true)
    filters.alumno = ''
    expect(f.anyVisible.value).toBe(false)
  })
})
