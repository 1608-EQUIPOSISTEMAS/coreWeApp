// Ficha del cliente (Comercial): lo que la vista pinta a partir de
// /api/prediccion/ficha. Puras: sin DOM ni API.
import { formatValue } from '@/shared/lib/formatValue'
import { displayName } from '@/features/plan-comercial/planComercial'

// Fechas como texto YYYY-MM-DD: nunca new Date(), que en Lima corre el dia.
export const toDayMonthYear = (isoDate) => (isoDate ? isoDate.split('-').reverse().join('/') : '—')

const yearOf = (isoDate) => isoDate.slice(0, 4)

const ago = (days) => (days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${formatValue(days, 'num')} días`)

const times = (n) => (n === 1 ? '1 vez' : `${n} veces`)

// Celular peruano de 9 digitos => +51; el resto ya trae su codigo de pais.
export function whatsappUrl (phoneKey, text) {
  const to = /^9\d{8}$/.test(phoneKey) ? `51${phoneKey}` : phoneKey
  return text ? `https://wa.me/${to}?text=${encodeURIComponent(text)}` : `https://wa.me/${to}`
}

export function statusOf (resumen) {
  return resumen.es_cliente
    ? { label: 'Cliente', tone: 'ok', icon: 'fa-user-check' }
    : { label: 'Prospecto', tone: 'info', icon: 'fa-user-clock' }
}

export function headline (resumen) {
  if (!resumen.ultima_fecha) return 'Sin consultas ni compras registradas'
  const desde = `${resumen.es_cliente ? 'Cliente' : 'Consulta'} desde ${yearOf(resumen.primera_fecha)}`
  return `${desde} · última interacción ${ago(resumen.dias_desde_ultima)} (${toDayMonthYear(resumen.ultima_fecha)})`
}

// El veredicto dice que hacer con este cliente HOY. La probabilidad es la misma
// que usa la bandeja "Llamar hoy" (outlook.entity.js del backend).
export function outlookVerdict (pronostico) {
  if (!pronostico) return null
  const pct = formatValue(pronostico.probability, 'pct')
  switch (pronostico.segment) {
    case 'VOLVIO':
      return {
        tone: 'ok', title: 'Llámalo hoy',
        text: `Ya es cliente y volvió a consultar (${times(pronostico.inquiries)}, hace ${pronostico.days} días): ${pct} compra algo este mes. Un prospecto dormido, 0.24%.`
      }
    case 'CALIENTE':
      return {
        tone: 'ok', title: 'Consulta caliente',
        text: `Consultó ${ago(pronostico.days)}: 9 de cada 10 cierres pasan en los primeros 14 días. No lo dejes enfriar.`
      }
    case 'FRIO':
      return {
        tone: 'warn', title: 'Prospecto frío',
        text: `Consultó hace ${pronostico.days} días y nunca compró: ${pct} compra algo este mes. Si tienes clientes en "Llamar hoy", van primero.`
      }
    case 'DORMIDO':
      return { tone: '', title: 'Dormido', text: `No consulta hace ${pronostico.days} días. Escríbele solo si hay una novedad que contarle.` }
    case 'COMPRO':
      return { tone: '', title: 'Ya compró', text: 'Compró después de su última consulta. La próxima oportunidad es la siguiente compra (mira las sugerencias).' }
    default:
      return null
  }
}

export function buildKpis (resumen, historial) {
  const lastInquiry = historial.find((e) => e.event_type === 'CONSULTA')
  return [
    {
      id: 'consultas', icon: 'fa-comments', tone: '', value: formatValue(resumen.consultas, 'num'), label: 'Consultas',
      note: lastInquiry
        ? `Última: ${lastInquiry.program_name ?? 'sin programa'} (${toDayMonthYear(lastInquiry.event_date)})`
        : 'Nunca consultó: llegó directo a comprar'
    },
    {
      id: 'compras', icon: 'fa-cart-shopping', tone: resumen.es_cliente ? 'ok' : '', value: formatValue(resumen.compras, 'num'), label: 'Compras',
      note: resumen.monto_erp ? `${formatValue(resumen.monto_erp, 'soles')} desde que existe el ERP` : 'El histórico no trae montos'
    },
    {
      id: 'recencia', icon: 'fa-clock', tone: resumen.dias_desde_ultima > 120 ? 'warn' : '',
      value: resumen.dias_desde_ultima === null ? '—' : formatValue(resumen.dias_desde_ultima, 'num'),
      label: 'Días sin contacto',
      // 120 dias: casi todo el que compra lo hace antes (p90 = 118, 15/10/26).
      note: resumen.dias_desde_ultima > 120 ? 'Más de 4 meses: ya se enfrió' : `Última vez el ${toDayMonthYear(resumen.ultima_fecha)}`
    }
  ]
}

// Mensaje listo para mandar (el asesor lo edita en WhatsApp antes de enviar):
// con fecha y precio el cliente puede decir que si en la misma conversacion.
export function pitchText (offer) {
  const base = `Hola, ¿qué tal? Te escribo de W|E Educación Ejecutiva. Vi que te interesó ${offer.program_name}.`
  if (!offer.edicion) return `${base} Estamos por programar una nueva edición, ¿te aviso apenas tengamos fecha?`
  const precio = offer.precio
    ? ` La inversión es de ${formatValue(offer.precio.profesional, 'soles')} (${formatValue(offer.precio.estudiante, 'soles')} para estudiantes) y separas tu vacante con ${formatValue(offer.precio.reserva, 'soles')}.`
    : ''
  return `${base} La próxima edición empieza el ${toDayMonthYear(offer.edicion.inicio)}.${precio} ¿Te paso el detalle?`
}

export function offerView (offer, phoneKey) {
  return {
    key: `${offer.kind}-${offer.program_id}`,
    programa: offer.program_name,
    origen: offer.kind === 'PIDIO' ? { label: 'Lo pidió', tone: 'info' } : { label: 'Sugerido', tone: '' },
    tier: offer.tier,
    tierTone: tierTone(offer.tier),
    probabilidad: offer.probability === null ? null : formatValue(offer.probability, 'pct'),
    razon: offer.reason,
    edicion: offer.edicion
      ? `Inicia el ${toDayMonthYear(offer.edicion.inicio)} (${offer.edicion.codigo})`
      : 'Sin edición programada',
    edicionTone: offer.edicion ? '' : 'warn',
    precio: offer.precio
      ? `${formatValue(offer.precio.profesional, 'soles')} · estudiante ${formatValue(offer.precio.estudiante, 'soles')} · reserva ${formatValue(offer.precio.reserva, 'soles')}`
      : null,
    whatsapp: whatsappUrl(phoneKey, pitchText(offer))
  }
}

const SOURCE_LABEL = { ERP_LEAD: 'ERP', ERP_ENROLLMENT: 'ERP', LEGACY_CONSULTA: 'Histórico', LEGACY_ALUMNO: 'Histórico' }

export function timelineRow (event) {
  const isPurchase = event.event_type === 'COMPRA'
  return {
    key: `${event.source}-${event.source_id}`,
    fecha: toDayMonthYear(event.event_date),
    // El historico de alumnos guarda la fecha en que se certifico, no la de compra.
    fechaNota: event.date_kind === 'CERTIFICACION' ? 'certificación' : '',
    tipo: isPurchase ? 'Compra' : 'Consulta',
    tone: isPurchase ? 'ok' : 'info',
    programa: event.program_name ?? 'Sin programa registrado',
    asesor: event.user_name ? displayName(event.user_name) : '—',
    origen: SOURCE_LABEL[event.source] ?? event.source,
    monto: event.amount === null ? '—' : formatValue(event.amount, 'monto')
  }
}

// Solo el TOP se pinta: un color para lo que importa, el resto neutro.
export function tierTone (tier) {
  return tier === 'TOP' ? 'ok' : ''
}
