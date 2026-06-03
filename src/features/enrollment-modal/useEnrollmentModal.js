import { ref } from 'vue'

// Modal de detalle de matricula desde el listado de leads. Carga la inscripcion y,
// si esta observada por FICO, expone el motivo y permite reenviarla. Espejo de
// openEnrollmentModal/handleResubmitFromModal de views/comercial/Leads.vue.
//
// deps: {
//   comercial: { enrollmentGet({ enrollment_id }) },
//   fico: { getEnrollmentFlags(id), getAuditLog(id), resubmitEnrollment({ enrollment_id }) },
//   toast: { success, error }
// }
export function useEnrollmentModal (deps = {}) {
  const { comercial, fico, toast } = deps

  const showEnrollmentModal = ref(false)
  const enrollmentData = ref(null)
  const isLoadingEnrollment = ref(false)
  const enrollmentObserved = ref(null)
  const resubmittingEnrollment = ref(false)

  async function openEnrollmentModal (enrollmentId) {
    if (!enrollmentId) return
    isLoadingEnrollment.value = true
    enrollmentData.value = null
    enrollmentObserved.value = null
    showEnrollmentModal.value = true
    try {
      const data = await comercial.enrollmentGet({ enrollment_id: enrollmentId })
      if (!data || !data.enrollment_id) {
        toast.error('No se encontraron datos para esta matrícula')
        showEnrollmentModal.value = false
        return
      }
      data.files_list = (data.files_list || []).filter(f => f !== null)
      enrollmentData.value = data

      const flags = await fico.getEnrollmentFlags(Number(enrollmentId))
      if (flags?.fico_status_alias === 'we_enrollment_status_observed') {
        const audit = await fico.getAuditLog(Number(enrollmentId))
        const obs = (audit || []).find(a => a.action === 'observed')
        enrollmentObserved.value = {
          reason: obs?.justificacion || obs?.details || 'Observacion sin detalle',
          enrollmentId: Number(enrollmentId)
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('No se pudo cargar la información de la matrícula')
      showEnrollmentModal.value = false
    } finally {
      isLoadingEnrollment.value = false
    }
  }

  async function handleResubmitFromModal () {
    if (!enrollmentObserved.value) return
    resubmittingEnrollment.value = true
    try {
      await fico.resubmitEnrollment({ enrollment_id: enrollmentObserved.value.enrollmentId })
      toast.success('Inscripcion reenviada a FICO correctamente.')
      enrollmentObserved.value = null
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Error al reenviar inscripcion.')
    } finally {
      resubmittingEnrollment.value = false
    }
  }

  return {
    showEnrollmentModal,
    enrollmentData,
    isLoadingEnrollment,
    enrollmentObserved,
    resubmittingEnrollment,
    openEnrollmentModal,
    handleResubmitFromModal
  }
}
