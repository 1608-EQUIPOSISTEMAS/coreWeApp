import { isValidEmail } from '../shared/lib/validators.js'

// Validaciones del formulario de lead/inscripcion. Extraidas verbatim de useLeadForm.
// Son las funciones que features/enroll-lead consume inyectadas; vivir aqui cierra
// el circulo (un solo lugar testeable para las reglas de completitud).
//
// form, insc: objetos reactivos. deps: {
//   channel: { isChannelGeneral, isChannelToken, isChannelWeb }  // refs
//   requiresEdition: boolean,   // si el tipo de programa exige edicion
//   cloneFrom: boolean          // route.query.clone_from
// }
export function useLeadFormValidations (form, insc, deps = {}) {
  const { channel = {}, requiresEdition = false, cloneFrom = false } = deps

  function validateLeadInfo () {
    const required = ['fechaContactoInicial']
    for (const field of required) {
      if (field === 'edition_id') {
        if (cloneFrom) return true
        if (form.category_alias && form.program_version_id && form.program_modality_selected_alias !== 'we_modality_online' && !form[field]) return false
      } else if (!form[field]) {
        return false
      }
    }
    if (requiresEdition && form.program_version_id && !form.edition_id) return false
    return true
  }

  function validateContactInfo () {
    const required = ['telefono', 'status_alias', 'country_alias', 'full_name', 'cat_client_moment_alias']
    return required.every(f => !!form[f])
  }

  function validateCommercialInfo () {
    const required = ['nivel_alias', 'mensajeChat', 'canal_alias', 'medium_alias', 'key_word_alias']
    return required.every(f => !!form[f])
  }

  function validateInscriptionClientInfo () {
    const required = ['cat_type_document', 'document', 'email', 'full_name', 'last_name', 'mother_last_name', 'cat_insc_modality', 'cat_certificate_status']
    if (!required.every(f => !!insc[f])) return false
    if (!isValidEmail(insc.email)) return false
    return true
  }

  function validateInscriptionPaymentInfo () {
    if (!insc.selectedCurrencyAlias) return false
    if (channel.isChannelGeneral?.value) {
      if (!insc.cat_type_payment) return false
      if (!insc.cat_method_payment) return false
      if (insc.cat_type_payment === 'we_payment_way_installments' && !insc.saved_money) return false
      return true
    }
    if (channel.isChannelToken?.value) {
      if (!insc.cat_token_provider) return false
      if (insc.cat_type_payment === 'we_payment_way_installments' && !insc.saved_money) return false
      return true
    }
    if (channel.isChannelWeb?.value) return true
    return false
  }

  return {
    validateLeadInfo,
    validateContactInfo,
    validateCommercialInfo,
    validateInscriptionClientInfo,
    validateInscriptionPaymentInfo
  }
}
