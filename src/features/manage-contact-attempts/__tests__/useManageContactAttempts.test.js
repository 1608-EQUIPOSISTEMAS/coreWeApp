import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { useManageContactAttempts, createEmptyAttempt, currentHourIso } from '../useManageContactAttempts.js'

function withAttempts (form) {
  let api
  const wrapper = mount({ setup () { api = useManageContactAttempts(form); return () => null } })
  return { api, wrapper }
}

describe('createEmptyAttempt / currentHourIso', () => {
  it('createEmptyAttempt: tipo llamada, pendiente, duracion 0', () => {
    const a = createEmptyAttempt()
    expect(a).toMatchObject({ cat_type_attempt: 'we_attempt_call', calling_alias: 'we_calling_pending', contact_duration: 0, timerActive: false, timerId: null })
    expect(a.fechaContactoProximo).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:00:00$/)
  })
  it('currentHourIso redondea a la hora en punto', () => {
    expect(currentHourIso()).toMatch(/ \d{2}:00:00$/)
  })
})

describe('useManageContactAttempts CRUD', () => {
  it('addContacto agrega un intento vacio', () => {
    const form = reactive({ contactos: [] })
    const { api, wrapper } = withAttempts(form)
    api.addContacto()
    expect(form.contactos).toHaveLength(1)
    expect(form.contactos[0].cat_type_attempt).toBe('we_attempt_call')
    wrapper.unmount()
  })

  it('removeContacto quita el item y limpia su cronometro', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const form = reactive({ contactos: [{ timerId: 123, timerActive: true }, { timerId: null }] })
    const { api, wrapper } = withAttempts(form)
    api.removeContacto(0)
    expect(clearSpy).toHaveBeenCalledWith(123)
    expect(form.contactos).toHaveLength(1)
    clearSpy.mockRestore()
    wrapper.unmount()
  })

  it('handleTypeChange a mensaje detiene timer, deja la respuesta pendiente y duracion 0', () => {
    const form = reactive({ contactos: [] })
    const { api, wrapper } = withAttempts(form)
    const c = { cat_type_attempt: 'we_attempt_call', calling_alias: 'we_calling_pending', timerActive: false, timerId: null, contact_duration: 40 }
    api.handleTypeChange(c, 'we_attempt_whatsapp')
    expect(c.calling_alias).toBe('we_calling_pending')
    expect(c.contact_duration).toBe(0)
    api.handleTypeChange(c, 'we_attempt_call')
    expect(c.calling_alias).toBe('we_calling_pending')
    wrapper.unmount()
  })
})

describe('useManageContactAttempts timers', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('toggleTimer acumula segundos y vuelve a apagarse', () => {
    const form = reactive({ contactos: [] })
    const { api, wrapper } = withAttempts(form)
    const c = { contact_duration: 0, timerActive: false, timerId: null }
    api.toggleTimer(c)
    expect(c.timerActive).toBe(true)
    vi.advanceTimersByTime(5000)
    expect(c.contact_duration).toBe(5)
    api.toggleTimer(c)
    expect(c.timerActive).toBe(false)
    vi.advanceTimersByTime(3000)
    expect(c.contact_duration).toBe(5)
    wrapper.unmount()
  })

  it('al desmontar limpia los cronometros activos', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const form = reactive({ contactos: [] })
    const { api, wrapper } = withAttempts(form)
    const c = { contact_duration: 0, timerActive: false, timerId: null }
    form.contactos.push(c)
    api.toggleTimer(c)
    wrapper.unmount()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
