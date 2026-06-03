import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useLeadFollowUp } from '../useLeadFollowUp.js'

// Monta el composable dentro de un componente real para que onBeforeUnmount tenga
// instancia activa. Devuelve la API y el wrapper (para forzar unmount en tests).
function withFollowUp (deps) {
  let api
  const wrapper = mount({
    setup () { api = useLeadFollowUp(deps); return () => null }
  })
  return { api, wrapper }
}

function makeDeps (over = {}) {
  return {
    comercial: {
      leadGet: vi.fn().mockResolvedValue({ contact_attempts: [] }),
      leadUpdate: vi.fn().mockResolvedValue({ result: 1, message: 'ok' })
    },
    catalogs: {
      attemptOrigin: ref([{ alias: 'we_origin_manual', description: 'Gestión Manual' }]),
      calling: ref([{ alias: 'we_calling_pending', id: 1 }, { alias: 'we_calling_message', id: 2 }]),
      attempts: ref([{ alias: 'we_attempt_call', id: 10 }]),
      pipeline: ref([{ alias: 'we_lead_status_atendido', id: 99 }])
    },
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    onAfterSave: vi.fn(),
    ...over
  }
}

describe('useLeadFollowUp.openFollowModal', () => {
  it('carga, ordena por attempt_number desc y mapea los campos', async () => {
    const deps = makeDeps({
      comercial: {
        leadGet: vi.fn().mockResolvedValue({
          contact_attempts: [
            { lead_contact_attempt_id: 1, attempt_number: 1, cat_result_alias: 'we_calling_pending' },
            { lead_contact_attempt_id: 2, attempt_number: 3, cat_result_alias: 'we_calling_message', contact_duration: 42 }
          ]
        }),
        leadUpdate: vi.fn()
      }
    })
    const { api, wrapper } = withFollowUp(deps)
    await api.openFollowModal({ id: 77 })
    expect(api.editableHistory.value).toHaveLength(2)
    expect(api.editableHistory.value[0].attempt_number).toBe(3)
    expect(api.editableHistory.value[0].contact_duration).toBe(42)
    expect(api.editableHistory.value[0].cat_creation_origin_label).toBe('Gestión Manual')
    expect(api.showFollowModal.value).toBe(true)
    expect(api.isLoadingFollow.value).toBe(false)
    wrapper.unmount()
  })

  it('ante error deja el historial vacio y avisa', async () => {
    const deps = makeDeps({ comercial: { leadGet: vi.fn().mockRejectedValue(new Error('net')), leadUpdate: vi.fn() } })
    const { api, wrapper } = withFollowUp(deps)
    await api.openFollowModal({ id: 1 })
    expect(api.editableHistory.value).toEqual([])
    expect(deps.toast.error).toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('useLeadFollowUp.addLocalAttempt / handleTypeChange', () => {
  it('addLocalAttempt antepone un intento pendiente vacio', () => {
    const { api, wrapper } = withFollowUp(makeDeps())
    api.addLocalAttempt()
    expect(api.editableHistory.value[0]).toMatchObject({
      id: null, calling_alias: 'we_calling_pending', cat_type_attempt: 'we_attempt_call', contact_duration: 0
    })
    wrapper.unmount()
  })

  it('handleTypeChange a mensaje detiene timer, pone calling_message y resetea duracion', () => {
    const { api, wrapper } = withFollowUp(makeDeps())
    const attempt = { cat_type_attempt: 'we_attempt_call', calling_alias: 'we_calling_pending', timerActive: false, timerId: null, contact_duration: 30 }
    api.handleTypeChange(attempt, 'we_attempt_whatsapp')
    expect(attempt.calling_alias).toBe('we_calling_message')
    expect(attempt.contact_duration).toBe(0)
    api.handleTypeChange(attempt, 'we_attempt_call')
    expect(attempt.calling_alias).toBe('we_calling_pending')
    wrapper.unmount()
  })
})

describe('useLeadFollowUp timers', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('toggleTimer acumula segundos y stopAllTimers los limpia', () => {
    const { api, wrapper } = withFollowUp(makeDeps())
    const attempt = { contact_duration: 0, timerActive: false, timerId: null }
    api.editableHistory.value = [attempt]
    api.toggleTimer(attempt)
    expect(attempt.timerActive).toBe(true)
    vi.advanceTimersByTime(3000)
    expect(attempt.contact_duration).toBe(3)
    api.stopAllTimers()
    expect(attempt.timerActive).toBe(false)
    expect(attempt.timerId).toBeNull()
    vi.advanceTimersByTime(2000)
    expect(attempt.contact_duration).toBe(3)
    wrapper.unmount()
  })

  it('al desmontar limpia los intervals activos', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { api, wrapper } = withFollowUp(makeDeps())
    const attempt = { contact_duration: 0, timerActive: false, timerId: null }
    api.editableHistory.value = [attempt]
    api.toggleTimer(attempt)
    wrapper.unmount()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})

describe('useLeadFollowUp.saveFastFollow', () => {
  it('result 1: guarda con payload normalizado, cierra y refresca', async () => {
    const deps = makeDeps()
    const { api, wrapper } = withFollowUp(deps)
    api.selectedFollowLead.value = { id: 5, cat_status_alias: 'we_lead_status_atendido' }
    api.editableHistory.value = [{ id: 3, calling_alias: 'we_calling_message', cat_type_attempt: 'we_attempt_call', contact_datetime: '2026-01-01 10:00', response: 'ok', contact_duration: 12 }]
    await api.saveFastFollow()
    const payload = deps.comercial.leadUpdate.mock.calls[0][0]
    expect(payload.id).toBe(5)
    expect(payload.lead.cat_status_lead).toBe(99)
    expect(payload.contact_attempts[0]).toMatchObject({ id: 3, cat_result: 2, cat_type_attempt: 10 })
    expect(deps.toast.success).toHaveBeenCalled()
    expect(api.showFollowModal.value).toBe(false)
    expect(deps.onAfterSave).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('result 0 -> error; otro -> warning', async () => {
    const deps0 = makeDeps({ comercial: { leadGet: vi.fn(), leadUpdate: vi.fn().mockResolvedValue({ result: 0, message: 'x' }) } })
    const t0 = withFollowUp(deps0)
    t0.api.selectedFollowLead.value = { id: 1, cat_status_alias: 'a' }
    await t0.api.saveFastFollow()
    expect(deps0.toast.error).toHaveBeenCalled()
    t0.wrapper.unmount()

    const depsW = makeDeps({ comercial: { leadGet: vi.fn(), leadUpdate: vi.fn().mockResolvedValue({ result: 2, message: 'y' }) } })
    const tW = withFollowUp(depsW)
    tW.api.selectedFollowLead.value = { id: 1, cat_status_alias: 'a' }
    await tW.api.saveFastFollow()
    expect(depsW.toast.warning).toHaveBeenCalled()
    tW.wrapper.unmount()
  })

  it('no hace nada sin lead seleccionado', async () => {
    const deps = makeDeps()
    const { api, wrapper } = withFollowUp(deps)
    await api.saveFastFollow()
    expect(deps.comercial.leadUpdate).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
