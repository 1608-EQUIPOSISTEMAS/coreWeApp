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

// El siguiente paso del flujo, en las palabras del agente. CERRADO sí tiene
// siguiente: reabrir, para cuando quien reportó avisa que el problema sigue.
export const SIGUIENTE_ESTADO = {
  ABIERTO: { estado: 'EN_PROGRESO', texto: 'Tomar ticket', icono: 'fa-hand' },
  EN_PROGRESO: { estado: 'CERRADO', texto: 'Marcar como resuelto', icono: 'fa-circle-check' },
  CERRADO: { estado: 'EN_PROGRESO', texto: 'Reabrir ticket', icono: 'fa-rotate-left' },
}

// Un ABIERTO que ya tiene dueño (reparto automático, reasignación o
// escalamiento) no se "toma": ya es de alguien. Su agente solo empieza a
// atenderlo, que es la misma transición a EN_PROGRESO.
const INICIAR_ATENCION = { estado: 'EN_PROGRESO', texto: 'Iniciar atención', icono: 'fa-play' }

export function siguienteEstado (ticket) {
  if (!ticket) return undefined
  if (ticket.estado === 'ABIERTO' && ticket.asignadoA) return INICIAR_ATENCION
  return SIGUIENTE_ESTADO[ticket.estado]
}

/** Solo un ABIERTO sin dueño se puede tomar a mano. */
export const esTomable = (ticket) => ticket?.estado === 'ABIERTO' && !ticket.asignadoA

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

// Duración legible sin signo ("2 h 10 min"), para plazos y tiempos tomados.
const duracion = (ms) => tiempoRestante(Math.abs(ms))

const RELOJ_NOMBRE = { respuesta: 'Respuesta', resolucion: 'Resolución' }
const RELOJ_VERBO = { respuesta: 'Respondido', resolucion: 'Resuelto' }
const RELOJ_INFINITIVO = { respuesta: 'responder', resolucion: 'resolver' }

/**
 * Cómo se pinta UN reloj del SLA. Distingue lo que la barra sola no decía:
 *
 *   - terminado: el reloj se DETUVO (se respondió / se resolvió). No lleva
 *     barra —una barra a medio llenar parece que sigue corriendo—, sino el
 *     tiempo que se tomó contra el plazo que había.
 *   - corriendo: barra de consumo + cuánto queda (o cuánto va de retraso),
 *     recalculado con el reloj del navegador para que avance solo.
 *
 * El veredicto (en plazo, por vencer, cumplido…) sigue siendo el del servidor;
 * solo se adelanta a VENCIDO si el plazo pasó mientras la pantalla estaba abierta.
 */
export function describirReloj (reloj, creadoEn, tipo, ahora = Date.now()) {
  if (!reloj?.venceEn) return null
  const inicio = new Date(creadoEn).getTime()
  const vence = new Date(reloj.venceEn).getTime()
  const nombre = RELOJ_NOMBRE[tipo]

  if (reloj.cumplidoEn) {
    const fin = new Date(reloj.cumplidoEn).getTime()
    const aTiempo = reloj.estado !== 'INCUMPLIDO'
    return {
      nombre,
      terminado: true,
      estado: reloj.estado,
      tono: aTiempo ? 'ok' : 'bad',
      icono: aTiempo ? 'fa-circle-check' : 'fa-circle-exclamation',
      resumen: `${RELOJ_VERBO[tipo]} en ${duracion(fin - inicio)}`,
      corto: `${aTiempo ? 'a tiempo' : 'tarde'} · ${duracion(fin - inicio)}`,
      detalle: `Plazo: ${duracion(vence - inicio)} · ${fechaHora(reloj.cumplidoEn)}`,
      progreso: 100,
    }
  }

  const restante = vence - ahora
  const estado = restante < 0 ? 'VENCIDO' : reloj.estado
  return {
    nombre,
    terminado: false,
    estado,
    tono: slaTono(estado),
    icono: 'fa-hourglass-half',
    // "para resolver" / "para responder": el contador dice de qué es.
    resumen: restante < 0
      ? `Vencido hace ${duracion(restante)}`
      : `Quedan ${duracion(restante)} para ${RELOJ_INFINITIVO[tipo]}`,
    corto: restante < 0 ? `vencido hace ${duracion(restante)}` : `quedan ${duracion(restante)}`,
    detalle: `Vence el ${fechaHora(reloj.venceEn)}`,
    progreso: progresoSla(reloj, creadoEn, ahora),
  }
}

/**
 * La UNICA etapa del SLA que muestra la bandeja, según el momento del ticket:
 *
 *   1. Sin tomar  → "Primera respuesta", con barra y cuánto queda.
 *   2. Tomado     → solo "Resolución", con barra y cuánto queda (la respuesta
 *                   ya no se muestra: es una etapa cerrada).
 *   3. Resuelto   → "Cumplido", con un indicador de si fue dentro del plazo
 *                   (✓ verde) o fuera de plazo (! rojo). Sin barra ni contador.
 *
 * Se decide por los relojes y no por el estado del ticket: un ticket reabierto
 * vuelve a la etapa 2 solo porque su resolución volvió a correr.
 */
export function etapaSla (t, ahora = Date.now()) {
  const sla = t.sla ?? {}
  const respuesta = describirReloj(sla.respuesta, t.creadoEn, 'respuesta', ahora)
  const resolucion = describirReloj(sla.resolucion, t.creadoEn, 'resolucion', ahora)

  if (respuesta && !respuesta.terminado) return { ...respuesta, nombre: 'Primera respuesta' }
  if (resolucion && !resolucion.terminado) return resolucion

  const final = resolucion ?? respuesta
  if (!final) return null
  const aTiempo = final.estado !== 'INCUMPLIDO'
  return {
    ...final,
    nombre: 'Cumplido',
    final: true,
    corto: aTiempo ? 'Dentro del plazo' : 'Fuera de plazo',
  }
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
