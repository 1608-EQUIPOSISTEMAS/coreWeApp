// Formato de presentación de un ticket. Solo traduce lo que ya decidió el
// backend a etiquetas y clases del sistema de diseño: aquí no se evalúa ningún
// SLA ni se deriva ningún permiso.

export const ESTADO_LABEL = {
  ABIERTO: 'Sin tomar',
  EN_PROGRESO: 'En progreso',
  CERRADO: 'Resuelto',
}

export const ESTADO_TONO = {
  ABIERTO: 'warn',
  EN_PROGRESO: 'info',
  CERRADO: 'ok',
}

export const PRIORIDAD_TONO = {
  ALTA: 'bad',
  MEDIA: 'warn',
  BAJA: 'ok',
}

// El siguiente paso del flujo, en las palabras del agente. CERRADO no tiene
// siguiente: el flujo es irreversible y el botón desaparece.
export const SIGUIENTE_ESTADO = {
  ABIERTO: { estado: 'EN_PROGRESO', texto: 'Tomar ticket', icono: 'fa-hand' },
  EN_PROGRESO: { estado: 'CERRADO', texto: 'Marcar como resuelto', icono: 'fa-circle-check' },
}

const SLA_LABEL = {
  EN_PLAZO: 'En plazo',
  POR_VENCER: 'Por vencer',
  VENCIDO: 'Vencido',
  CUMPLIDO: 'Cumplido',
  INCUMPLIDO: 'Fuera de plazo',
}

const SLA_TONO = {
  EN_PLAZO: 'ok',
  POR_VENCER: 'warn',
  VENCIDO: 'bad',
  CUMPLIDO: 'ok',
  INCUMPLIDO: 'bad',
}

export const slaLabel = (estado) => SLA_LABEL[estado] ?? '—'
export const slaTono = (estado) => SLA_TONO[estado] ?? null

// En qué grupo de urgencia cae un ticket, para la bandeja agrupada (mismo
// criterio que ya usa el backend en applyFilter/buildKpis: vencido gana sobre
// por vencer, así un ticket no cuenta en dos grupos a la vez).
export const GRUPO_LABEL = { VENCIDO: 'Vencidos', POR_VENCER: 'Por vencer', EN_PLAZO: 'En plazo' }
export const GRUPO_TONO = { VENCIDO: 'bad', POR_VENCER: 'warn', EN_PLAZO: 'ok' }
export const ORDEN_GRUPOS = ['VENCIDO', 'POR_VENCER', 'EN_PLAZO']

export function grupoUrgencia (t) {
  if (t.riesgo?.vencido) return 'VENCIDO'
  if (t.riesgo?.porVencer) return 'POR_VENCER'
  return 'EN_PLAZO'
}

/**
 * Cuenta regresiva legible. Positivo = lo que falta; negativo = el retraso.
 * El backend manda los milisegundos ya calculados; esto solo los escribe.
 */
export function tiempoRestante (ms) {
  if (ms === null || ms === undefined) return '—'
  const atrasado = ms < 0
  const minutos = Math.floor(Math.abs(ms) / 60000)
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const mins = minutos % 60

  let texto
  if (dias) texto = `${dias} d ${horas} h`
  else if (horas) texto = `${horas} h ${mins} min`
  else texto = `${mins} min`

  return atrasado ? `${texto} de retraso` : texto
}

/**
 * Cuánto del plazo se consumió, 0-100, para la barra de progreso.
 *
 * Los dos relojes arrancan al crear el ticket, así que el plazo total es
 * (vence − creado) y lo transcurrido, (ahora − creado) — o (cumplido − creado)
 * si el reloj ya se detuvo, para que la barra quede congelada donde paró.
 *
 * Se calcula en el cliente porque avanza sola con el reloj del navegador; el
 * VEREDICTO (en plazo, por vencer, vencido) lo decide el servidor.
 */
export function progresoSla (reloj, creadoEn, ahora = Date.now()) {
  if (!reloj?.venceEn || !creadoEn) return 0
  const inicio = new Date(creadoEn).getTime()
  const total = new Date(reloj.venceEn).getTime() - inicio
  if (total <= 0) return 100
  const fin = reloj.cumplidoEn ? new Date(reloj.cumplidoEn).getTime() : ahora
  return Math.min(100, Math.max(0, Math.round(((fin - inicio) / total) * 100)))
}

// Iniciales para el avatar de "Reportó": hasta dos palabras del nombre.
export function iniciales (nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export function fechaCorta (valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fechaHora (valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function pesoArchivo (bytes) {
  const kb = Number(bytes) / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
}

// Un enlace que llegó como texto solo se abre si es http(s). El backend ya
// rechaza cualquier otro esquema al guardar, pero los tickets viejos y los
// enlaces dentro del cuerpo de un comentario no pasaron por esa validación.
export function hrefSeguro (url) {
  try {
    const { protocol } = new URL(String(url))
    return protocol === 'http:' || protocol === 'https:' ? String(url) : null
  } catch {
    return null
  }
}
