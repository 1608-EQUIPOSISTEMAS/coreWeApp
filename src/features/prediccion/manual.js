// Manual de venta por programa (Ficha del cliente): el asesor elige que pide,
// califica con 3 botones y recibe el mensaje, el guion y las respuestas a las
// objeciones. Datos de /api/prediccion/programa. Puras: sin DOM ni API.
import { formatValue } from '@/shared/lib/formatValue'
import { toDayMonthYear } from './fichaCliente'

const pctText = (n) => formatValue(n, 'pct')
const soles = (n) => formatValue(n, 'soles')
const fechaDe = (m) => (m.edicion ? toDayMonthYear(m.edicion.inicio) : null)

// Paso 2: tres preguntas, un clic cada una. Cambian el mensaje, no el nivel.
export const QUALIFY_QUESTIONS = [
  { key: 'paga', label: '¿Quién paga?', options: [{ value: 'YO', label: 'Él mismo' }, { value: 'EMPRESA', label: 'Su empresa' }] },
  { key: 'estudiante', label: '¿Es estudiante?', options: [{ value: 'SI', label: 'Sí' }, { value: 'NO', label: 'No' }] },
  {
    key: 'cuando',
    label: '¿Cuándo quiere empezar?',
    options: [{ value: 'ESTA', label: 'Esta edición' }, { value: 'PROXIMA', label: 'La próxima' }, { value: 'INFO', label: 'Solo info' }]
  }
]

// Paso 3: el mensaje se arma con lo que respondio. "Caro" en una llamada
// anterior (priceObjection) abre con cuotas y precio de estudiante.
export function buildMessage ({ m, answers, priceObjection = false }) {
  const saludo = `Hola, ¿qué tal? Te escribo de W|E Educación Ejecutiva por ${m.programa}.`
  if (answers.cuando === 'INFO') {
    // Solo info: brochure, sin presionar con el precio.
    return `${saludo} Te comparto el brochure con el temario y la metodología. Cuando lo revises, cuéntame qué te pareció y vemos si se ajusta a lo que buscas.`
  }
  const partes = [saludo]
  const fecha = fechaDe(m)
  if (fecha) {
    partes.push(answers.cuando === 'PROXIMA'
      ? `La edición más cercana empieza el ${fecha}; si prefieres la siguiente, te aviso apenas tengamos la fecha.`
      : `La próxima edición empieza el ${fecha}.`)
  } else {
    partes.push('Estamos por programar una nueva edición y te aviso apenas tengamos la fecha.')
  }
  if (m.precio) {
    const estudiante = answers.estudiante === 'SI'
    partes.push(estudiante
      ? `Como estudiante, la inversión es de ${soles(m.precio.estudiante)} (precio regular ${soles(m.precio.profesional)}).`
      : `La inversión es de ${soles(m.precio.profesional)}.`)
    if (priceObjection) partes.push('También puedes pagarlo en cuotas.')
    partes.push(`Separas tu vacante con ${soles(m.precio.reserva)}.`)
  }
  if (answers.paga === 'EMPRESA') {
    partes.push('Emitimos factura a nombre de tu empresa y, si quieres, te preparo la propuesta para que la envíes a RR.HH.')
  }
  partes.push('¿Te paso el detalle?')
  return partes.join(' ')
}

// Cómo cerrarlo: 3 puntos, cada uno con el dato del programa elegido.
export function closingScript (m) {
  const steps = []
  const [sameDay] = m.cuando
  steps.push(sameDay && sameDay.pct >= 15
    ? { icon: 'fa-bolt', titulo: 'Respóndele hoy', texto: `El ${pctText(sameDay.pct)} de los que compran lo hace el mismo día.` }
    : { icon: 'fa-bolt', titulo: 'Respóndele hoy', texto: 'Mientras más rápido respondes, más cierras: no lo dejes para mañana.' })
  steps.push(m.edicion && m.precio
    ? { icon: 'fa-calendar-day', titulo: 'Abre con fecha y reserva', texto: `Inicia el ${fechaDe(m)} y la vacante se separa con ${soles(m.precio.reserva)}.` }
    : { icon: 'fa-calendar-xmark', titulo: 'Sin fecha todavía', texto: 'Ofrécele avisarle apenas se programe, o pasa al plan B.' })
  const late = m.cuando.at(-1)
  steps.push({
    icon: 'fa-comment-dots',
    titulo: 'Si en 14 días no compra, no lo sueltes',
    texto: late
      ? `Pasa a la cadencia de WhatsApp: el ${pctText(late.pct)} de las compras llega después del día 14.`
      : 'Pasa a la cadencia de WhatsApp: una parte de las compras llega después del día 14.'
  })
  return steps
}

// ponytail: borrador v1 (16/10/26) armado con la data del programa; el lider
// comercial lo corrige. Solo afirma lo que el ERP sabe (fecha, precio, reserva).
export function objectionReplies (m) {
  const fecha = fechaDe(m)
  const reserva = m.precio ? soles(m.precio.reserva) : null
  return [
    {
      key: 'caro',
      label: 'Está caro',
      texto: m.precio
        ? `Te entiendo. Puedes separar tu vacante con ${reserva} y pagar el resto en cuotas. Si eres estudiante, la inversión baja a ${soles(m.precio.estudiante)}. ¿Te armo el plan de pagos?`
        : 'Te entiendo. Tenemos opciones de pago en cuotas; ¿te armo un plan que te acomode?'
    },
    {
      key: 'tiempo',
      label: 'No tengo tiempo',
      texto: fecha
        ? `Te paso el horario exacto de la edición del ${fecha} para que veas si te calza. Si no, te separo vacante en la siguiente${reserva ? ` con ${reserva}` : ''}.`
        : 'Te paso el horario apenas programemos la edición, para que veas si te calza. ¿Qué días te acomodan más?'
    },
    {
      key: 'pensar',
      label: 'Lo voy a pensar',
      texto: `Claro, tómate tu tiempo.${fecha ? ` Solo para que lo tengas presente: inicia el ${fecha}${reserva ? ` y la vacante se separa con ${reserva}` : ''}.` : ''} ¿Qué es lo que te hace dudar: el precio, el horario o el contenido?`
    },
    {
      key: 'certificado',
      label: '¿Da certificado?',
      texto: `Sí: al aprobar ${m.programa} recibes tu certificado de W|E Educación Ejecutiva. ¿Te paso un ejemplo?`
    }
  ]
}

// Plan B solo con su base a la vista ("4 de 21"): sin ella, 19% parece mucho.
const MIN_PLAN_B_BUYERS = 2
export const planB = (m) => m.alternativas
  .filter((a) => a.compradores >= MIN_PLAN_B_BUYERS)
  .map((a) => ({ key: a.program_id, programa: a.programa, base: `${a.compradores} de ${m.compraron}`, membresia: a.membresia }))

const ANSWER_LABEL = {
  paga: { YO: 'paga él mismo', EMPRESA: 'paga su empresa' },
  estudiante: { SI: 'es estudiante', NO: 'no es estudiante' },
  cuando: { ESTA: 'quiere esta edición', PROXIMA: 'prefiere la próxima', INFO: 'solo pidió info' }
}

// Va a "Observaciones" del lead: la calificacion se digita una sola vez.
export function leadNote (programa, answers) {
  const partes = Object.entries(answers).filter(([, v]) => v).map(([k, v]) => ANSWER_LABEL[k][v])
  return [`Pidió ${programa}`, ...partes].join(' · ')
}

export function manualView (m) {
  return {
    programa: m.programa,
    tier: m.tier,
    tierTone: m.tier === 'TOP' ? 'ok' : '',
    edicion: m.edicion ? `Inicia el ${fechaDe(m)} (${m.edicion.codigo})` : 'Sin edición programada',
    edicionTone: m.edicion ? '' : 'warn',
    precio: m.precio
      ? `${soles(m.precio.profesional)} · estudiante ${soles(m.precio.estudiante)} · reserva ${soles(m.precio.reserva)}`
      : null,
    guion: closingScript(m),
    objeciones: objectionReplies(m),
    planB: planB(m)
  }
}

// En el buscador: "POWER BI · En vivo · TOP".
export const programOptionLabel = (p) => `${p.modalidad} · ${p.tier}`
