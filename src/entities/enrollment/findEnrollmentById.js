// El detalle de FICO busca la inscripción con el buscador de texto de la lista
// (no hay endpoint por id), que también devuelve coincidencias parciales: buscar
// "1928" trae 19280, 11928... Solo vale el id EXACTO. Antes se caía a la primera
// fila y FICO podía aprobar o cobrar sobre OTRA venta.
export function findEnrollmentById (items, id) {
  return (items || []).find((i) => Number(i.enrollment_id) === Number(id)) ?? null
}
