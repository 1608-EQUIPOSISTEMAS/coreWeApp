import { ref } from 'vue'
import { buildEnrollmentPayload } from './buildEnrollmentPayload.js'

// Orquestacion de la inscripcion (confirmarInscripcion de useLeadForm). Es la
// feature mas acoplada del formulario: recibe por deps las funciones de validacion,
// los flags de canal, el estado de cuotas, los catalogos, el builder de payload de
// lead y los servicios. Mantiene la secuencia exacta del SFC: guards -> guarda/crea
// lead -> registra enrollment, con el mismo manejo de result 0/1/2.
//
// deps: {
//   comercialService: { leadUpdate, leadRegister, enrollmentRegister },
//   toast, onSuccess, buildLeadPayload, idByAlias, isValidEmail, catalogs,
//   flags:      { isChannelGeneral, isChannelToken, isVoucherOptional }      // refs
//   installment:{ isInstallmentMode, reservaSplitEnabled, reservaSplitValid,
//                 installmentPlanValid, reservaDiferidaFecha, reservaInmediata,
//                 installmentPlan }                                          // refs
//   validators: { validateInscriptionClientInfo, validateInscriptionPaymentInfo,
//                 validateLeadInfo, validateContactInfo, validateCommercialInfo }
//   refs:       { createdLeadId, createdPersonId, leadIdParam, voucherTouched,
//                 inscInitialized, showViewModal }
// }
export function useEnrollLead (form, insc, deps = {}) {
  const {
    comercialService, toast, onSuccess, buildLeadPayload, idByAlias, isValidEmail,
    catalogs, flags, installment, validators, refs
  } = deps

  const savingInsc = ref(false)

  // Secuencia de guards previa al guardado. Devuelve el primer fallo (mensaje +
  // si debe marcar el comprobante como tocado) o { ok: true }.
  function checkGuards () {
    if (!insc.montoOriginal || Number(insc.montoOriginal) <= 0) {
      return { message: 'El Precio Base no está configurado. No se puede procesar la inscripción.' }
    }
    if (!validators.validateInscriptionClientInfo() || !validators.validateInscriptionPaymentInfo()) {
      return {
        message: (insc.email && !isValidEmail(insc.email))
          ? 'El correo no tiene formato válido · ej: nombre@dominio.com'
          : 'Por favor complete los campos obligatorios de la inscripción'
      }
    }
    if (!validators.validateLeadInfo() || !validators.validateContactInfo() || !validators.validateCommercialInfo()) {
      return { message: 'Faltan datos obligatorios en el formulario del Lead.' }
    }
    if (flags.isChannelGeneral.value && !flags.isVoucherOptional.value && (!insc.ticket_payment_urls || insc.ticket_payment_urls.length === 0)) {
      return { message: 'El canal General requiere al menos un Comprobante de Pago.', touchVoucher: true }
    }
    if (flags.isChannelToken.value && !insc.cat_token_provider) {
      return { message: 'Debe seleccionar el proveedor del Link / Token.' }
    }
    if (installment.isInstallmentMode.value && installment.reservaSplitEnabled.value && !installment.reservaSplitValid.value) {
      return { message: 'Si aplazas parte de la reserva, debes indicar el monto inmediato y la fecha de la cuota diferida.' }
    }
    if (installment.isInstallmentMode.value && !installment.installmentPlanValid.value) {
      return { message: 'El plan de cuotas no cuadra con el monto final. Ajusta los montos antes de guardar.' }
    }
    if (installment.isInstallmentMode.value && installment.reservaSplitEnabled.value && installment.reservaDiferidaFecha.value) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      if (new Date(installment.reservaDiferidaFecha.value) < hoy) {
        return { message: 'La fecha de la cuota diferida no puede ser una fecha pasada.' }
      }
    }
    return { ok: true }
  }

  async function confirmarInscripcion () {
    if (!comercialService) return console.error('comercialService no inyectado')

    const guard = checkGuards()
    if (!guard.ok) {
      if (guard.touchVoucher) refs.voucherTouched.value = true
      toast.warning(guard.message)
      return
    }

    savingInsc.value = true
    try {
      const leadPayload = buildLeadPayload()
      const currentLeadId = refs.leadIdParam.value || refs.createdLeadId.value
      let resolvedLeadId = currentLeadId

      const enrollmentPayload = buildEnrollmentPayload({
        insc,
        form,
        createdLeadId: refs.createdLeadId.value,
        isChannelGeneral: flags.isChannelGeneral.value,
        isChannelToken: flags.isChannelToken.value,
        isInstallmentMode: installment.isInstallmentMode.value,
        installmentPlan: installment.installmentPlan.value,
        reservaSplitEnabled: installment.reservaSplitEnabled.value,
        reservaInmediata: installment.reservaInmediata.value,
        catalogs,
        idByAlias
      })

      if (currentLeadId) {
        const leadResp = await comercialService.leadUpdate({ id: currentLeadId, ...leadPayload })
        if (leadResp.result === 0) { toast.error(leadResp.message); return }
        if (leadResp.result === 2) { toast.warning(leadResp.message); return }
      } else {
        const leadResp = await comercialService.leadRegister(leadPayload)
        if (leadResp.result === 0) { toast.error(leadResp.message); return }
        if (leadResp.result === 2) { toast.warning(leadResp.message); return }
        resolvedLeadId = leadResp.lead_id
        refs.createdLeadId.value = resolvedLeadId
        refs.createdPersonId.value = leadResp.person_id
      }

      enrollmentPayload.inscription.lead_id = resolvedLeadId
      const enrollResp = await comercialService.enrollmentRegister(enrollmentPayload)
      if (enrollResp.result === 1) {
        toast.success(enrollResp.message)
        refs.inscInitialized.value = false
        refs.showViewModal.value = false
        onSuccess?.()
      } else if (enrollResp.result === 0) {
        toast.error(`${enrollResp.message} — El lead fue guardado, pero la inscripción no se registró. Inténtalo nuevamente.`, { timeout: 8000 })
      } else {
        toast.warning(enrollResp.message)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error inesperado al procesar la inscripción.')
    } finally {
      savingInsc.value = false
    }
  }

  return { savingInsc, checkGuards, confirmarInscripcion }
}
