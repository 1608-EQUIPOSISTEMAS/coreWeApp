// Bandeja de WhatsApp (Comercial): qué mostrar de cada conversación y mensaje.
// Puro, sin red ni reloj oculto: `now` entra como argumento. Las reglas de Meta
// (ventana de 24 h, quién responde) las decide el backend; aquí solo se leen.

const TZ = 'America/Lima'
const HOUR_MS = 3600_000
const SERVICE_WINDOW_HOURS = 24

export const STATUS = {
  BOT: { label: 'Con el bot', tone: 'info', icon: 'fa-robot' },
  HANDED_OFF: { label: 'Derivada', tone: 'warn', icon: 'fa-share' },
  ADVISOR: { label: 'Con asesora', tone: 'ok', icon: 'fa-user-tie' },
  CLOSED: { label: 'Cerrada', tone: '', icon: 'fa-lock' }
}

export const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))
]

// PC1/PC2/PC3: los puntos de contacto del manual de Comercial.
export const SOURCE_LABEL = { PC1: 'Facebook', PC2: 'Anuncio Meta', PC3: 'Web', DIRECT: 'Directo' }

const SENT_BY_LABEL = { SCRIPT: 'Bot', TEMPLATE: 'Plantilla', AI: 'IA' }

// tone '' = pill neutro (sin clase de color).
// Meta avisa por webhook: accepted (lo aceptó) → sent → delivered → read, o failed.
const DELIVERY = {
  accepted: { label: 'Enviado a Meta', icon: 'fa-clock', tone: '' },
  sent: { label: 'Enviado', icon: 'fa-check', tone: '' },
  delivered: { label: 'Entregado', icon: 'fa-check-double', tone: '' },
  read: { label: 'Leído', icon: 'fa-check-double', tone: 'ok' },
  failed: { label: 'No entregado', icon: 'fa-triangle-exclamation', tone: 'bad' }
}

const limaDay = date => date.toLocaleDateString('es-PE', { timeZone: TZ })

// Hoy: solo la hora. Otro día: fecha corta y hora.
export function formatWhen (iso, now) {
  if (!iso) return ''
  const date = new Date(iso)
  const time = date.toLocaleTimeString('es-PE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
  if (limaDay(date) === limaDay(now)) return time
  return `${date.toLocaleDateString('es-PE', { timeZone: TZ, day: '2-digit', month: '2-digit' })} ${time}`
}

// Lo que se puede escribir a mano: texto libre hasta 24 h después del último
// mensaje del cliente; luego WhatsApp solo deja plantillas aprobadas.
export function serviceWindow (lastLeadMessageAt, now) {
  if (!lastLeadMessageAt) return { open: false, tone: '', text: 'El cliente aún no escribe' }
  const left = SERVICE_WINDOW_HOURS - (now - new Date(lastLeadMessageAt)) / HOUR_MS
  if (left <= 0) return { open: false, tone: 'bad', text: 'Ventana de 24 h cerrada: solo plantillas' }
  const hours = Math.floor(left)
  const text = hours >= 1 ? `Puedes responder por ${hours} h más` : `Puedes responder por ${Math.ceil(left * 60)} min más`
  return { open: true, tone: left < 3 ? 'warn' : 'info', text }
}

export function conversationRow (c, now) {
  const status = STATUS[c.status] ?? STATUS.CLOSED
  const preview = c.last_body ?? (c.last_direction ? '(archivo)' : '')
  return {
    id: c.conversation_id,
    cliente: c.contact_name || `+${c.contact_phone}`,
    telefono: `+${c.contact_phone}`,
    programa: c.program_name ?? 'Programa sin reconocer',
    estado: status,
    origen: SOURCE_LABEL[c.source] ?? c.source,
    linea: c.number_label,
    asesora: c.advisor_label,
    ultimo: c.last_direction === 'OUT' ? `Nosotros: ${preview}` : preview,
    cuando: formatWhen(c.last_at ?? c.registration_date, now)
  }
}

export function messageRow (m, now) {
  const failed = m.delivery_status === 'failed'
  const error = failed && m.errors?.[0]
  return {
    id: m.message_id,
    saliente: m.direction === 'OUT',
    texto: m.body ?? `(${m.type})`,
    autor: m.direction === 'OUT' ? (m.user_alias ?? SENT_BY_LABEL[m.sent_by] ?? 'ERP') : null,
    cuando: formatWhen(m.registration_date, now),
    entrega: m.direction === 'OUT' ? (DELIVERY[m.delivery_status] ?? null) : null,
    // El porqué de Meta (ej. 131031 cuenta bloqueada): sin esto, "no llegó" no se explica.
    error: error ? `${error.title ?? 'Error de Meta'} (${error.code})` : null
  }
}

export function buildKpis (conversations = []) {
  const count = fn => conversations.filter(fn).length
  return [
    { id: 'total', label: 'Conversaciones', value: conversations.length, note: 'Las 200 más recientes', icon: 'fa-comments', tone: '' },
    { id: 'bot', label: 'Con el bot', value: count(c => c.status === 'BOT'), note: 'Dentro de la ventana gratis', icon: 'fa-robot', tone: '' },
    { id: 'derivadas', label: 'Derivadas', value: count(c => c.status === 'HANDED_OFF'), note: 'Enviadas a su asesora', icon: 'fa-share', tone: 'warn' },
    { id: 'anuncio', label: 'De anuncios', value: count(c => c.source === 'PC2'), note: 'Llegaron por Meta Ads', icon: 'fa-bullhorn', tone: 'ok' }
  ]
}
