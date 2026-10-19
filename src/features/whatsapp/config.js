// Configuración del bot de WhatsApp: números de la cuenta de Meta y qué asesora
// atiende cada programa (con las frases prellenadas que lo reconocen).

export const ROLE = {
  BOT: { label: 'Bot', tone: 'violet' },
  ADVISOR: { label: 'Asesora', tone: 'info' }
}

// Una frase por línea en el formulario; vacías y repetidas no viajan (una frase
// vacía haría match con cualquier mensaje).
export function parsePhrases (text = '') {
  return [...new Set(text.split('\n').map(line => line.trim()).filter(Boolean))]
}

export const formatPhrases = (phrases = []) => phrases.join('\n')

// Solo dígitos: el wa.me no acepta "+", espacios ni guiones.
export const normalizePhone = (text = '') => text.replace(/\D/g, '')

export function numberRow (n) {
  return {
    id: n.wa_number_id,
    label: n.label,
    rol: ROLE[n.role] ?? { label: n.role, tone: '' },
    telefono: `+${n.display_phone}`,
    waMe: `https://wa.me/${n.display_phone}`,
    usuario: n.user_alias ?? '—',
    porDefecto: n.is_default_advisor,
    activo: n.active === 'Y'
  }
}

export const emptyNumber = () => ({
  wa_number_id: null, phone_number_id: '', display_phone: '', label: '', role: 'ADVISOR',
  user_id: null, is_default_advisor: false, active: 'Y'
})

// El formulario de número → body del endpoint (sin id cuando es nuevo).
export function numberPayload (form) {
  const { wa_number_id: id, ...rest } = form
  const body = { ...rest, display_phone: normalizePhone(rest.display_phone), user_id: rest.role === 'BOT' ? null : rest.user_id ?? null }
  if (body.role === 'BOT') body.is_default_advisor = false
  return id ? { wa_number_id: id, ...body } : body
}

// Sin asesora por defecto, un programa sin asignar nunca se deriva.
export function configWarnings ({ numbers = [] }) {
  const active = numbers.filter(n => n.active === 'Y')
  const warnings = []
  if (!active.some(n => n.role === 'BOT')) warnings.push('No hay un número del bot activo: nadie atiende los anuncios.')
  if (!active.some(n => n.is_default_advisor)) warnings.push('No hay asesora por defecto: las conversaciones de programas sin asignar no se derivan.')
  return warnings
}
