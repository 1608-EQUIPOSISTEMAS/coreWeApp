import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useAdvisorRestrictions, buildAsesorRecord } from '../useAdvisorRestrictions.js'

function makeDeps (over = {}) {
  return {
    api: {
      restrictionsList: vi.fn().mockResolvedValue([]),
      restrictionsUpdate: vi.fn().mockResolvedValue({})
    },
    ctx: { currentUserId: 7, isComercial: false, storedUser: null },
    owners: ref([{ id: 1, description: 'Ana' }, { id: 2, description: 'Beto' }]),
    loadOwners: vi.fn().mockResolvedValue(),
    toast: { success: vi.fn(), error: vi.fn() },
    pushRestrictions: vi.fn().mockResolvedValue(),
    ...over
  }
}

describe('buildAsesorRecord', () => {
  it('recorta fechas a YYYY-MM-DD y arma los range_string', () => {
    const r = buildAsesorRecord(5, 'X', {
      first_contact_date_from: '2026-01-10T00:00:00Z',
      first_contact_date_to: '2026-01-20T00:00:00Z',
      type_program_ids: [1, 2]
    })
    expect(r.first_contact_date_from).toBe('2026-01-10')
    expect(r.first_contact_range_string).toBe('2026-01-10 a 2026-01-20')
    expect(r.edition_start_range_string).toBeNull()
    expect(r.type_program_ids).toEqual([1, 2])
    expect(r.status_lead_ids).toEqual([])
  })
})

describe('useAdvisorRestrictions', () => {
  it('checkMyRestrictions: no hace nada si no es comercial', async () => {
    const deps = makeDeps({ ctx: { currentUserId: 7, isComercial: false } })
    const f = useAdvisorRestrictions(deps)
    await f.checkMyRestrictions()
    expect(deps.api.restrictionsList).not.toHaveBeenCalled()
    expect(f.hasActiveRestrictions.value).toBe(false)
  })

  it('checkMyRestrictions: activa la bandera si hay restriccion (arrays o fechas)', async () => {
    const deps = makeDeps({
      ctx: { currentUserId: 7, isComercial: true },
      api: {
        restrictionsList: vi.fn().mockResolvedValue([{ status_lead_ids: [3] }]),
        restrictionsUpdate: vi.fn()
      }
    })
    const f = useAdvisorRestrictions(deps)
    await f.checkMyRestrictions()
    expect(f.hasActiveRestrictions.value).toBe(true)
  })

  it('openControlModal (no comercial): mapea todos los owners con sus restricciones de BD', async () => {
    const deps = makeDeps({
      api: {
        restrictionsList: vi.fn().mockResolvedValue([{ user_id: 2, channel_ids: [9] }]),
        restrictionsUpdate: vi.fn()
      }
    })
    const f = useAdvisorRestrictions(deps)
    await f.openControlModal()
    expect(f.showControlModal.value).toBe(true)
    expect(f.asesoresControl.value).toHaveLength(2)
    expect(f.asesoresControl.value[0].user_id).toBe(1)
    expect(f.asesoresControl.value[1].channel_ids).toEqual([9])
  })

  it('openControlModal: carga owners si la lista esta vacia', async () => {
    const deps = makeDeps({ owners: ref([]) })
    const f = useAdvisorRestrictions(deps)
    await f.openControlModal()
    expect(deps.loadOwners).toHaveBeenCalled()
  })

  it('saveControlRestrictions: normaliza ids (id||value), notifica SSE y cierra el modal', async () => {
    const deps = makeDeps()
    const f = useAdvisorRestrictions(deps)
    f.asesoresControl.value = [{
      user_id: 1,
      type_program_ids: [{ id: 11 }, { value: 12 }, 13],
      channel_ids: []
    }]
    f.showControlModal.value = true
    await f.saveControlRestrictions()
    const payload = deps.api.restrictionsUpdate.mock.calls[0][0]
    expect(payload[0].type_program_ids).toEqual([11, 12, 13])
    expect(payload[0].is_active).toBe(true)
    expect(deps.pushRestrictions).toHaveBeenCalledWith({ user_ids: [1] })
    expect(deps.toast.success).toHaveBeenCalled()
    expect(f.showControlModal.value).toBe(false)
  })

  it('saveControlRestrictions: un fallo del push SSE no rompe el guardado', async () => {
    const deps = makeDeps({ pushRestrictions: vi.fn().mockRejectedValue(new Error('sse down')) })
    const f = useAdvisorRestrictions(deps)
    f.asesoresControl.value = [{ user_id: 1 }]
    await f.saveControlRestrictions()
    expect(deps.toast.success).toHaveBeenCalled()
    expect(f.showControlModal.value).toBe(false)
    expect(f.isSavingRestrictions.value).toBe(false)
  })
})
