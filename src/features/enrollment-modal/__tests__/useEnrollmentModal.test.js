import { describe, it, expect, vi } from 'vitest'
import { useEnrollmentModal } from '../useEnrollmentModal.js'

function makeDeps (over = {}) {
  return {
    comercial: { enrollmentGet: vi.fn().mockResolvedValue({ enrollment_id: 500, files_list: [] }) },
    fico: {
      getEnrollmentFlags: vi.fn().mockResolvedValue({ fico_status_alias: 'we_enrollment_status_checked' }),
      getAuditLog: vi.fn().mockResolvedValue([]),
      resubmitEnrollment: vi.fn().mockResolvedValue({})
    },
    toast: { success: vi.fn(), error: vi.fn() },
    ...over
  }
}

describe('useEnrollmentModal.openEnrollmentModal', () => {
  it('no hace nada sin enrollmentId', async () => {
    const deps = makeDeps()
    const f = useEnrollmentModal(deps)
    await f.openEnrollmentModal(null)
    expect(deps.comercial.enrollmentGet).not.toHaveBeenCalled()
    expect(f.showEnrollmentModal.value).toBe(false)
  })

  it('carga la matricula, filtra files null y deja observed en null si no esta observada', async () => {
    const deps = makeDeps({
      comercial: { enrollmentGet: vi.fn().mockResolvedValue({ enrollment_id: 500, files_list: [{ url: 'a' }, null, { url: 'b' }] }) }
    })
    const f = useEnrollmentModal(deps)
    await f.openEnrollmentModal(500)
    expect(f.enrollmentData.value.enrollment_id).toBe(500)
    expect(f.enrollmentData.value.files_list).toEqual([{ url: 'a' }, { url: 'b' }])
    expect(f.enrollmentObserved.value).toBeNull()
    expect(f.showEnrollmentModal.value).toBe(true)
    expect(f.isLoadingEnrollment.value).toBe(false)
  })

  it('detecta estado observado y extrae el motivo del audit', async () => {
    const deps = makeDeps({
      fico: {
        getEnrollmentFlags: vi.fn().mockResolvedValue({ fico_status_alias: 'we_enrollment_status_observed' }),
        getAuditLog: vi.fn().mockResolvedValue([{ action: 'observed', justificacion: 'Falta comprobante' }]),
        resubmitEnrollment: vi.fn()
      }
    })
    const f = useEnrollmentModal(deps)
    await f.openEnrollmentModal(500)
    expect(f.enrollmentObserved.value).toEqual({ reason: 'Falta comprobante', enrollmentId: 500 })
  })

  it('motivo por defecto si el audit observed no trae justificacion/details', async () => {
    const deps = makeDeps({
      fico: {
        getEnrollmentFlags: vi.fn().mockResolvedValue({ fico_status_alias: 'we_enrollment_status_observed' }),
        getAuditLog: vi.fn().mockResolvedValue([{ action: 'other' }]),
        resubmitEnrollment: vi.fn()
      }
    })
    const f = useEnrollmentModal(deps)
    await f.openEnrollmentModal(500)
    expect(f.enrollmentObserved.value.reason).toBe('Observacion sin detalle')
  })

  it('cierra y avisa si la matricula no existe', async () => {
    const deps = makeDeps({ comercial: { enrollmentGet: vi.fn().mockResolvedValue({}) } })
    const f = useEnrollmentModal(deps)
    await f.openEnrollmentModal(500)
    expect(deps.toast.error).toHaveBeenCalled()
    expect(f.showEnrollmentModal.value).toBe(false)
  })

  it('maneja error de red cerrando el modal', async () => {
    const deps = makeDeps({ comercial: { enrollmentGet: vi.fn().mockRejectedValue(new Error('net')) } })
    const f = useEnrollmentModal(deps)
    await f.openEnrollmentModal(500)
    expect(deps.toast.error).toHaveBeenCalledWith('No se pudo cargar la información de la matrícula')
    expect(f.showEnrollmentModal.value).toBe(false)
    expect(f.isLoadingEnrollment.value).toBe(false)
  })
})

describe('useEnrollmentModal.handleResubmitFromModal', () => {
  it('no hace nada si no hay observacion', async () => {
    const deps = makeDeps()
    const f = useEnrollmentModal(deps)
    await f.handleResubmitFromModal()
    expect(deps.fico.resubmitEnrollment).not.toHaveBeenCalled()
  })

  it('reenvia, avisa exito y limpia la observacion', async () => {
    const deps = makeDeps()
    const f = useEnrollmentModal(deps)
    f.enrollmentObserved.value = { reason: 'x', enrollmentId: 500 }
    await f.handleResubmitFromModal()
    expect(deps.fico.resubmitEnrollment).toHaveBeenCalledWith({ enrollment_id: 500 })
    expect(deps.toast.success).toHaveBeenCalled()
    expect(f.enrollmentObserved.value).toBeNull()
    expect(f.resubmittingEnrollment.value).toBe(false)
  })

  it('ante error muestra el mensaje del backend si viene', async () => {
    const err = { response: { data: { error: 'FICO rechazo' } } }
    const deps = makeDeps({
      fico: { getEnrollmentFlags: vi.fn(), getAuditLog: vi.fn(), resubmitEnrollment: vi.fn().mockRejectedValue(err) }
    })
    const f = useEnrollmentModal(deps)
    f.enrollmentObserved.value = { reason: 'x', enrollmentId: 500 }
    await f.handleResubmitFromModal()
    expect(deps.toast.error).toHaveBeenCalledWith('FICO rechazo')
    expect(f.enrollmentObserved.value).not.toBeNull()
  })
})
