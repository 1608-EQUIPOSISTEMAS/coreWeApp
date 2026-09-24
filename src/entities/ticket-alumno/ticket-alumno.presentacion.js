// Como se muestra un tramite del portal en la bandeja. Reglas puras, sin Vue.

// Espejo del catalogo del portal (Nexus: portal/domain/solicitudes.js). Solo
// para la etiqueta legible y el filtro; quien firma lo decide el backend.
export const TIPOS = [
  { valor: 'REPROGRAMACION', etiqueta: 'Reprogramación' },
  { valor: 'CAMBIO_CURSO', etiqueta: 'Cambio de curso' },
  { valor: 'ALQUILER_SAP', etiqueta: 'Alquiler de usuario SAP' },
  { valor: 'COMPRA_GRABACIONES', etiqueta: 'Compra de grabaciones y/o material' },
  { valor: 'CERTIFICADOS', etiqueta: 'Certificados' },
  { valor: 'FLEXIBILIDAD_HORARIA', etiqueta: 'Flexibilidad horaria' },
  { valor: 'REASIGNACION_CURSO', etiqueta: 'Reasignación de curso' }
]

const ESTADOS = {
  ABIERTA: { etiqueta: 'Por revisar', tono: 'warn' },
  EN_PROCESO: { etiqueta: 'En proceso', tono: 'info' },
  PENDIENTE_PAGO: { etiqueta: 'Esperando pago', tono: 'info' },
  PAGO_REGISTRADO: { etiqueta: 'Pago por validar', tono: 'warn' },
  RESUELTA: { etiqueta: 'Resuelta', tono: 'ok' },
  RECHAZADA: { etiqueta: 'Rechazada', tono: 'bad' },
  PAGO_RECHAZADO: { etiqueta: 'Pago rechazado', tono: 'bad' }
}

const VARIANTES = {
  CREAR_USUARIO: 'Crear usuario SAP',
  RESTABLECER_CLAVE: 'Restablecer contraseña',
  GRABACION: 'Grabación',
  GRABACION_MATERIAL: 'Grabación y material',
  DUPLICADO_WE: 'Duplicado de certificado WE',
  DUPLICADO_FGU: 'Duplicado de certificado internacional (FGU)',
  FISICO: 'Certificado físico',
  CONVALIDACION: 'Convalidación (WE)',
  CONVALIDACION_WE_FGU: 'Convalidación (WE y FGU)',
  CONSTANCIA_PARTICIPACION: 'Constancia de participación'
}

export const etiquetaTipo = tipo => TIPOS.find(t => t.valor === tipo)?.etiqueta || tipo

export const estado = status => ESTADOS[status] || { etiqueta: status, tono: '' }

// Sin turno y sin cerrar = el tramite espera al alumno, no a un area.
export function etiquetaTurno (ticket) {
  if (ticket.area_actual) return ticket.area_actual
  return ticket.status === 'PENDIENTE_PAGO' ? 'Alumno' : '—'
}

/**
 * Filas de "que pidio el alumno", en el orden en que Academica las lee.
 * @returns {Array<{ etiqueta: string, valor: string }>}
 */
export function detalleDelPedido (ticket) {
  const datos = ticket.datos || {}
  const filas = []
  if (datos.variante) filas.push({ etiqueta: 'Opción', valor: VARIANTES[datos.variante] || datos.variante })
  if (datos.alcance) {
    filas.push({ etiqueta: 'Alcance', valor: datos.alcance === 'PROGRAMA' ? 'Todo el programa' : 'Solo este módulo' })
  }
  if (datos.destino) filas.push({ etiqueta: 'Nueva fecha', valor: datos.destino })
  if (datos.nuevoEnrollmentId) filas.push({ etiqueta: 'Matrícula nueva', valor: `#${datos.nuevoEnrollmentId}` })
  return filas
}

// Un monto null no es gratis: en reasignacion es "el acordado con Finanzas" y
// en el resto la lista de precios no tenia fila para ese curso.
export function etiquetaMonto (ticket) {
  if (ticket.monto === 0) return 'Gratuito'
  if (ticket.monto == null) return ticket.tipo === 'REASIGNACION_CURSO' ? 'Monto acordado con Finanzas' : 'Por confirmar'
  return `S/ ${Number(ticket.monto).toLocaleString('es-PE', { maximumFractionDigits: 2 })}`
}

// Academica solo puede fijar el monto al aprobar, y solo si nadie lo fijo antes.
export const puedeFijarMonto = ticket =>
  ticket.puede_firmar && ticket.area_actual === 'ACADEMICA' && ticket.monto == null && ticket.tipo !== 'REASIGNACION_CURSO'

export const textoFirmar = ticket =>
  ticket.status === 'PAGO_REGISTRADO' ? 'Validar pago' : 'Aprobar'
