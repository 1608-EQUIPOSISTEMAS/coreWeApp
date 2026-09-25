// Editar la inscripcion de un token reusa restoreObservedInscription: es el
// mismo problema (repintar una venta ya armada en el modal). El token guarda la
// inscripcion con los nombres del payload de alta, no con los de la inscripcion
// observada, y de los descuentos solo guarda el ID: sin su valor numerico el
// watcher de computeDiscounts recalcula el total sin descuento.
//
// discountsByType = { <alias de tipo>: [{ id, value, full_label }] }, la
// respuesta de discountCaller por tipo.
export function tokenInscriptionFlags (token, { discountsByType = {}, paymentChannels = [] } = {}) {
  const d = token?.inscription_data?.inscription || {}
  return {
    document_number:          d.document,
    first_name:               d.full_name,
    last_name:                d.last_name,
    mother_last_name:         d.mother_last_name,
    origin_email:             d.email,
    observations:             d.observations,
    requires_email_cc:        d.requires_email_cc,
    email_cc:                 d.email_cc,
    b2b_contract_id:          d.b2b_contract_id,
    cat_b2b_doctype:          d.cat_b2b_doctype,
    cat_type_document:        d.cat_type_document,
    cat_inscription_modality: d.cat_insc_modality,
    cat_certificate_status:   d.cat_certificate_status,
    cat_currency:             d.cat_currency,
    cat_payment_plan:         d.cat_type_payment,
    cat_method_payment:       d.cat_method_payment,
    ticket_payment_urls:      d.ticket_payment_urls,
    list_price:               d.list_price,
    total_amount:             d.total_amount,
    saved_money:              d.saved_money,
    installment_plan:         d.installment_plan,
    discounts:                resolveDiscounts(d, discountsByType),
    payment_channel_alias:    paymentChannels.find(c => c.id === Number(d.cat_payment_channel))?.alias,
    token_provider_id:        d.cat_token_provider,
    token_payment_type:       token?.payment_type
  }
}

function resolveDiscounts (d, discountsByType) {
  const picked = [
    ['we_discount_type_percentage', d.dsct_porcent_id],
    ['we_discount_type_fixed',      d.dsct_stick_id],
    ...(d.dsct_benefit_ids || []).map(b => ['we_discount_type_benefit', b.value])
  ]
  return picked
    .filter(([, id]) => id)
    .map(([type_alias, id]) => {
      const match = (discountsByType[type_alias] || []).find(it => it.id === id)
      // Sin match el descuento se descarta en vez de entrar con valor 0: un
      // descuento en 0 se ve aplicado en el modal pero no descuenta nada.
      return match && { type_alias, discount_id: id, label: match.full_label, value: match.value }
    })
    .filter(Boolean)
}

// Lo que se cobra por el link: en cuotas solo la reserva, al contado el total.
export function tokenLinkAmount (insc) {
  return insc.cat_type_payment === 'we_payment_way_installments'
    ? (Number(insc.saved_money) || 0)
    : (Number(insc.total_amount) || Number(insc.montoOriginal) || 0)
}
