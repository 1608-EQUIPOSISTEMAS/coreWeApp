// Llamada 1, Llamada 2 y Llamada UV (we_attempt_call*) se comportan igual:
// cronometro de duracion y desplegable T. Respuesta propio de la llamada.
// Comparar por prefijo evita tocar cada vista cuando comercial sume otra llamada.
export const isCallAttempt = (typeAlias) => typeof typeAlias === 'string' && typeAlias.startsWith('we_attempt_call')

// Que intentos piden "Resultado" en el modal de seguimiento de la bandeja: las
// llamadas y el WhatsApp (pedido de los asesores 02/10/26: para ponerle
// resultado a un WhatsApp tenian que entrar al lapiz). El cronometro sigue
// siendo solo de llamadas (isCallAttempt).
export const attemptAsksResult = (typeAlias) => isCallAttempt(typeAlias) || typeAlias === 'we_attempt_whatsapp'
