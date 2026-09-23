// Llamada 1, Llamada 2 y Llamada UV (we_attempt_call*) se comportan igual:
// cronometro de duracion y desplegable T. Respuesta propio de la llamada.
// Comparar por prefijo evita tocar cada vista cuando comercial sume otra llamada.
export const isCallAttempt = (typeAlias) => typeof typeAlias === 'string' && typeAlias.startsWith('we_attempt_call')
