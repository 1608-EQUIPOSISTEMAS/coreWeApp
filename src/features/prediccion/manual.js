// Manual de venta por programa (Ficha del cliente): lo que la vista pinta a
// partir de /api/prediccion/programa. Puras: sin DOM ni API.
import { formatValue } from '@/shared/lib/formatValue'
import { toDayMonthYear, whatsappUrl, pitchText } from './fichaCliente'

function destinationTag (d) {
  if (d.mismo) return { label: 'El mismo', tone: 'ok' }
  if (d.membresia) return { label: 'Membresía', tone: 'info' }
  return { label: 'Alternativa', tone: '' }
}

export function manualView (m, phoneKey) {
  return {
    programa: m.programa,
    tier: m.tier,
    tierTone: m.tier === 'TOP' ? 'ok' : '',
    conversion: m.conversion === null ? null : formatValue(m.conversion, 'pct'),
    resumen: m.resumen,
    velocidad: m.velocidad,
    destinos: m.destinos.map((d) => ({
      key: d.program_id,
      programa: d.programa,
      pct: formatValue(d.pct, 'pct'),
      ancho: `${Math.min(100, d.pct)}%`,
      tag: destinationTag(d)
    })),
    edicion: m.edicion ? `Inicia el ${toDayMonthYear(m.edicion.inicio)} (${m.edicion.codigo})` : 'Sin edición programada',
    edicionTone: m.edicion ? '' : 'warn',
    precio: m.precio
      ? `${formatValue(m.precio.profesional, 'soles')} · estudiante ${formatValue(m.precio.estudiante, 'soles')} · reserva ${formatValue(m.precio.reserva, 'soles')}`
      : null,
    whatsapp: phoneKey ? whatsappUrl(phoneKey, pitchText({ program_name: m.programa, edicion: m.edicion, precio: m.precio })) : null
  }
}

// En el buscador: "POWER BI · En vivo · TOP".
export const programOptionLabel = (p) => `${p.modalidad} · ${p.tier}`
