import { nextTick } from 'vue'

// Subsanacion de una inscripcion observada: el modal se reabre en blanco
// (resetInscriptionData) y hasta ahora nadie lo volvia a llenar. Eso no era
// cosmetico: el SP de subsanacion BORRA pagos, cuotas, descuentos y adjuntos y
// los reconstruye con lo que mande el formulario, asi que reenviar sobre un
// modal vacio guardaba la venta vacia. Paso de verdad el 09/09/2026: el lead
// 430165 perdio su correo y su edicion quedo desalineada de la inscripcion.
//
// Aca se repinta la inscripcion tal como la dejo el asesor, para que corregir un
// dato sea corregir UN dato y no volver a tipear la venta entera.
export async function restoreObservedInscription ({
  insc, flags, catalogs = {}, aliasById, installments, onPriceRestored
} = {}) {
  if (!flags) return

  restoreStudent(insc, flags, catalogs, aliasById)
  restoreAmounts(insc, flags, onPriceRestored)
  restoreDiscounts(insc, flags.discounts)
  restoreInstallments(installments, flags.installment_plan)

  await restoreChannel(insc, flags, catalogs.paymentChannels)

  // Despues del canal a proposito: su watch limpia medio de pago y adjuntos.
  insc.cat_method_payment  = aliasById(flags.cat_method_payment, catalogs.paymentMethod) || insc.cat_method_payment
  insc.ticket_payment_urls = flags.ticket_payment_urls || []
}

function restoreStudent (insc, flags, catalogs, aliasById) {
  insc.document          = flags.document_number  || ''
  insc.full_name         = flags.first_name       || ''
  insc.last_name         = flags.last_name        || ''
  insc.mother_last_name  = flags.mother_last_name || ''
  insc.email             = flags.origin_email     || ''
  insc.observacions      = flags.observations     || ''
  insc.requires_email_cc = !!flags.requires_email_cc
  insc.email_cc          = flags.email_cc         || ''
  insc.b2b_contract_id   = flags.b2b_contract_id  || null
  insc.cat_b2b_doctype   = flags.cat_b2b_doctype  || null

  insc.cat_type_document      = aliasById(flags.cat_type_document,          catalogs.docType)           || insc.cat_type_document
  insc.cat_insc_modality      = aliasById(flags.cat_inscription_modality,   catalogs.inscModalidades)   || insc.cat_insc_modality
  insc.cat_certificate_status = aliasById(flags.cat_certificate_status,     catalogs.certificateStatus) || insc.cat_certificate_status
  insc.selectedCurrencyAlias  = aliasById(flags.cat_currency,               catalogs.currency)          || insc.selectedCurrencyAlias
  insc.cat_type_payment       = aliasById(flags.cat_payment_plan,           catalogs.inscPaymentModes)  || insc.cat_type_payment
}

// El precio se marca como puesto a mano a proposito: el modal lo recalcularia
// desde la lista de precios del lead, que para muchos programas no tiene fila y
// deja el PRECIO BASE en S/ 0.00. Manda lo que se le cobro al alumno.
function restoreAmounts (insc, flags, onPriceRestored) {
  insc.montoOriginal = Number(flags.list_price   || 0)
  insc.total_amount  = Number(flags.total_amount || 0)
  insc.saved_money   = Number(flags.saved_money  || 0)
  if (insc.montoOriginal > 0) onPriceRestored?.()
}

const DISCOUNT_SLOTS = {
  we_discount_type_percentage: (insc, d) => {
    insc.dsct_porcent_id    = d.discount_id
    insc.dsct_porcent_label = d.label
    insc.val_porcentaje     = Number(d.value) || 0
  },
  we_discount_type_fixed: (insc, d) => {
    insc.dsct_stick_id    = d.discount_id
    insc.dsct_stick_label = d.label
    insc.val_fijo         = Number(d.value) || 0
  },
  we_discount_type_benefit: (insc, d) => {
    insc.dsct_benefit_ids = [...(insc.dsct_benefit_ids || []), { value: d.discount_id, label: d.label }]
    insc.val_beneficios   = [...(insc.val_beneficios   || []), Number(d.value) || 0]
  }
}

function restoreDiscounts (insc, discounts) {
  for (const d of discounts || []) DISCOUNT_SLOTS[d.type_alias]?.(insc, d)
}

// Se restaura en modo manual porque el plan guardado puede no coincidir con el
// que calcularia el automatico: fechas movidas, cuotas desiguales, redondeos que
// el asesor acordo con el alumno.
function restoreInstallments (installments, plan) {
  if (!installments || !plan?.length) return
  installments.manualMode.value = true
  installments.numCuotasManual.value = plan.length
  installments.editableInstallments.value = plan.map(c => ({
    installment_number: c.installment_number,
    amount: Number(c.amount) || 0,
    due_date: c.due_date
  }))
}

// Una venta nacida por link/token cae por defecto en canal General, que le exige
// un voucher que no existe —el alumno pago por pasarela— y si el asesor cambia
// el canal a Link/Token la guarda le pide el proveedor, campo que su modal NO
// dibuja porque lo elige FICO al pegar el link. La salida es no preguntar.
async function restoreChannel (insc, flags, paymentChannels = []) {
  const alias = flags.payment_channel_alias
  if (!alias || alias === 'we_channel_general') return

  const channel = paymentChannels.find(c => c.alias === alias)
  if (!channel) return
  insc.cat_payment_channel = channel.id

  // El watch de cat_payment_channel limpia proveedor/medio/adjuntos, y corre en
  // el flush siguiente: escribir el proveedor antes de que dispare lo borraria
  // en silencio y volveriamos al mismo bloqueo.
  await nextTick()
  insc.cat_token_provider = flags.token_provider_id ?? null
  // Debito/Credito sí es un campo visible, pero volver a preguntarlo es pedir
  // dos veces el mismo dato: ya viaja en el token.
  if (flags.token_payment_type) insc.token_payment_type = flags.token_payment_type
}
