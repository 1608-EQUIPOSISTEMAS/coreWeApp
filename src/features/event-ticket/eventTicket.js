// Reglas puras de la categoria de entrada de un congreso. Sin Vue y sin HTTP:
// el formulario de FICO y el de Comercial deciden lo mismo mirando el alias.

export const SPEAKER_CATEGORY_ALIAS = 'we_event_category_ponente'
export const VIP_CATEGORY_ALIAS = 'we_event_category_vip'

// Solo VIP y ponente se sientan con asiento asignado: comparten la misma zona.
const SEATED_CATEGORY_ALIASES = [VIP_CATEGORY_ALIAS, SPEAKER_CATEGORY_ALIAS]

export const isSpeakerCategory = (alias) => alias === SPEAKER_CATEGORY_ALIAS
export const hasAssignedSeat = (alias) => SEATED_CATEGORY_ALIASES.includes(alias)

// El ponente es invitado, no cliente: su inscripcion viaja en cero pase lo que
// pase en pantalla. Importa porque el precio NO se limpia solo al cambiar de
// categoria: si venia de VIP, `list_price` sigue con los 400 de la entrada.
export function resolveEnrollmentAmounts ({
  listPrice = 0,
  totalAmount = 0,
  isSpeakerTicket = false,
  isMembershipBenefit = false
} = {}) {
  if (isSpeakerTicket) return { list_price: 0, total_amount: 0 }
  return {
    list_price: Number(listPrice) || 0,
    total_amount: isMembershipBenefit ? 0 : (Number(totalAmount) || 0)
  }
}
