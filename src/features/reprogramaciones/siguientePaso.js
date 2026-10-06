// Flujo de un alumno varado (A5), en orden:
//   1. Académica elige destino  2. Académica avisa al alumno  3. FICO firma.
// Cada fila de la bandeja muestra SOLO el paso que sigue: con tres botones
// iguales nadie sabía cuál tocaba. Mismas reglas que el backend
// (reprogramacion.entity: assertPuedeProponer / assertPuedeAceptar).
export const TOTAL_PASOS = 3

export function siguientePaso ({ status, tieneDestino }) {
  const estado = status || 'detectado'
  if (estado === 'aceptado') return null // ya ejecutado: no queda nada por hacer
  if (estado === 'contactado') {
    return { accion: 'veredicto', label: 'Firmar veredicto', paso: 3, quien: 'FICO' }
  }
  // FICO rechazó: Académica vuelve a elegir (el destino anterior ya no sirve).
  if (estado === 'rechazado') {
    return { accion: 'destino', label: 'Elegir otro destino', paso: 1, quien: 'Académica' }
  }
  if (tieneDestino) return { accion: 'contactar', label: 'Avisar al alumno', paso: 2, quien: 'Académica' }
  return { accion: 'destino', label: 'Elegir destino', paso: 1, quien: 'Académica' }
}

export const pasoHint = (p) => `Paso ${p.paso} de ${TOTAL_PASOS} · le toca a ${p.quien}`
