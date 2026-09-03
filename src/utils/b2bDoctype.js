// Que documento B2B cobra y cual no.
//
// Orden de Servicio / de Compra: la empresa SI paga, solo que semanas despues.
// La venta nace con su monto real y una cuota inicial pendiente, asi que el
// formulario tiene que pedir precio (el SP la rechaza en cero) aunque hoy no
// haya voucher que subir —se sube la orden—.
//
// La carta de compromiso es la unica que entra sin cobro (total 0).
//
// Esta lista espeja v_is_doc_pending de sp_fico_enrollment_register_direct.sql:
// si divergen, la venta se guarda mal o la rechaza la BD.
export const DOC_PENDING_DOCTYPE_ALIASES = Object.freeze([
  'we_enrollment_b2b_doctype_service_order',
  'we_enrollment_b2b_doctype_purchase_order'
])

export function isDocPendingDoctype (alias) {
  return DOC_PENDING_DOCTYPE_ALIASES.includes(alias)
}
