// Validacion de las credenciales SAP que FICO escribe a mano antes de enviar el
// correo de bienvenida de un curso SAP online. Centralizada aqui porque la usan
// los tres puntos de envio (preview de confirmacion, modal de detalle y reenvio
// del panel lateral): una sola fuente de verdad para el "gate" de envio.
//
// Regla actual: ambos campos obligatorios (sin espacios sobrantes). Si en el
// futuro FICO quiere reglas mas estrictas (p.ej. usuario debe empezar con
// 'SAP_', o contrasena de largo minimo), este es el unico lugar a tocar.
export function isSapCredentialsValid (username, password) {
  return String(username ?? '').trim().length > 0 &&
         String(password ?? '').trim().length > 0
}
