// Límites de los adjuntos de tickets y comentarios: los mismos que impone el
// backend (tickets.files.js). No es la validación real —el servidor revisa
// hasta los magic bytes— sino para no subir algo que después va a rechazar.
// Lo comparten el alta del ticket y la respuesta en el hilo.

export const MAX_FILES = 4
export const MAX_MB = 5
export const MAX_BYTES = MAX_MB * 1024 * 1024
export const MIMES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
export const ACCEPT = MIMES.join(',')

/**
 * Suma `nuevos` a `actuales` respetando tipo, peso y cantidad. Nunca descarta
 * en silencio: lo que no entra se explica en `error` (el último motivo).
 *
 * @returns {{ archivos: File[], error: string }}
 */
export function agregarAdjuntos (actuales = [], nuevos = []) {
  const archivos = [...actuales]
  let error = ''
  for (const archivo of Array.from(nuevos ?? [])) {
    if (archivos.length >= MAX_FILES) {
      error = `Como máximo ${MAX_FILES} archivos.`
      break
    }
    if (!MIMES.includes(archivo.type)) {
      error = `"${archivo.name}" no es PNG, JPG, WEBP ni PDF.`
      continue
    }
    if (archivo.size > MAX_BYTES) {
      error = `"${archivo.name}" pesa más de ${MAX_MB} MB.`
      continue
    }
    archivos.push(archivo)
  }
  return { archivos, error }
}
