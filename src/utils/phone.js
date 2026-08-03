// Los buscadores de leads aceptan telefono O nombre en el mismo input. Al
// pegar un telefono formateado ("941 452 157") la busqueda fallaba: el numero
// se guarda sin formato. Limpiamos solo cuando lo escrito es claramente un
// telefono; un nombre con espacios se devuelve intacto.
const SOLO_TELEFONO = /^[\d\s()+-]+$/

export function normalizePhoneQuery (value) {
  const v = String(value ?? '')
  if (!v || !SOLO_TELEFONO.test(v)) return value
  return v.replace(/\D/g, '')
}
