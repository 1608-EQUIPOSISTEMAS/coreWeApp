import { nextTick } from 'vue'

// Subsanacion de una inscripcion observada: el modal se reabre en blanco
// (resetInscriptionData) y por defecto cae en canal General. Para una venta
// nacida por link/token eso es un callejon sin salida: General le exige un
// voucher que no existe —el alumno pago por pasarela— y si el asesor cambia el
// canal a Link/Token la guarda le pide el proveedor, campo que su modal NO
// dibuja porque lo elige FICO al pegar el link.
//
// La salida es no preguntar: se restaura el canal con el que nacio la venta y
// el proveedor viaja oculto en el payload, tal como FICO lo dejo.
export async function restoreObservedChannel (insc, flags, paymentChannels = []) {
  const alias = flags?.payment_channel_alias
  if (!alias || alias === 'we_channel_general') return

  const channel = paymentChannels.find(c => c.alias === alias)
  if (!channel) return
  insc.cat_payment_channel = channel.id

  // El watch de cat_payment_channel limpia proveedor/medio/adjuntos, y corre en
  // el flush siguiente: escribir el proveedor antes de que dispare lo borraria
  // en silencio y volveriamos al mismo bloqueo.
  await nextTick()
  insc.cat_token_provider = flags.token_provider_id ?? null
  // Debito/Credito sí es un campo visible, pero volver a preguntarlo es pedir
  // dos veces el mismo dato: ya viaja en el token.
  if (flags.token_payment_type) insc.token_payment_type = flags.token_payment_type
}
