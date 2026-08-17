// Arma el payload de inscripcion que consume comercialService.enrollmentRegister.
// Funcion PURA: el caller resuelve refs/flags a valores planos antes de invocarla.
// Verbatim del buildEnrollmentPayload de useLeadForm.
//
// catalogs: { docType, inscModalidades, inscPaymentModes, currency, country,
//             certificateStatus, paymentMethod } (arrays de catalogo)
// idByAlias(alias, catalogArray) -> id | null
export function buildEnrollmentPayload ({
  insc, form, createdLeadId,
  isChannelGeneral, isChannelToken, isInstallmentMode,
  installmentPlan, reservaSplitEnabled, reservaInmediata,
  catalogs = {}, idByAlias
} = {}) {
  const c = catalogs
  const cat_type_document = idByAlias(insc.cat_type_document, c.docType)
  const cat_insc_modality = idByAlias(insc.cat_insc_modality, c.inscModalidades)
  const cat_type_payment = idByAlias(insc.cat_type_payment, c.inscPaymentModes)
  const cat_currency = idByAlias(insc.selectedCurrencyAlias, c.currency)
  const cat_country = idByAlias(form.country_alias, c.country)
  const cat_certificate_status = idByAlias(insc.cat_certificate_status, c.certificateStatus)
  const cat_method_payment = isChannelGeneral
    ? idByAlias(insc.cat_method_payment, c.paymentMethod)
    : null

  const paymentFiles = (insc.ticket_payment_urls || []).map(f => ({
    url: f.url || f,
    name: f.name || (f.url || f).split('/').pop() || 'Comprobante',
    type: f.type || null
  }))
  const generalAttachments = (insc.attachments || []).map(f => ({
    url: f.url || f,
    name: f.name || (f.url || f).split('/').pop() || 'Adjunto',
    type: f.type || null
  }))

  return {
    inscription: {
      lead_id: createdLeadId,
      program_version_id: form.edition_id ? null : form.program_version_id,
      program_edition_id: form.edition_id,
      document: insc.document,
      cat_type_document,
      full_name: insc.full_name,
      last_name: insc.last_name,
      mother_last_name: insc.mother_last_name,
      email: insc.email,
      cat_country,
      cat_insc_modality,
      cat_certificate_status,
      cat_payment_channel: insc.cat_payment_channel,
      cat_type_payment: (isChannelGeneral || isChannelToken) ? cat_type_payment : null,
      cat_currency,
      cat_method_payment,
      cat_token_provider: insc.cat_token_provider,
      saved_money: reservaSplitEnabled ? Number(reservaInmediata) : Number(insc.saved_money),
      list_price: insc.montoOriginal,
      total_amount: Number(insc.total_amount),
      dsct_porcent_id: insc.dsct_porcent_id,
      dsct_porcent_label: insc.dsct_porcent_label,
      dsct_stick_id: insc.dsct_stick_id,
      dsct_stick_label: insc.dsct_stick_label,
      dsct_benefit_ids: (insc.dsct_benefit_ids || []).map(b => ({ value: b.value, label: b.label })),
      installment_plan: isInstallmentMode ? installmentPlan : null,
      observations: insc.observacions,
      student_attachment_url: form.carnet_url || null,
      ticket_payment_urls: paymentFiles,
      attachments: generalAttachments,
      b2b_contract_id: insc.b2b_contract_id || null
    }
  }
}
