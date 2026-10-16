// Bandeja "Llamar hoy" (Comercial): lo que la vista pinta a partir de
// /api/prediccion/bandeja. Puras: sin DOM ni API.
import { formatValue } from '@/shared/lib/formatValue'
import { toDayMonthYear, whatsappUrl, pitchText } from './fichaCliente'

export { whatsappUrl }

// Resultado obligatorio, un clic. Lo que dice entre parentesis es lo que hace el
// sistema (bandeja.entity.js nextStep): el asesor sabe cuando lo vuelve a ver.
export const OUTCOME_OPTIONS = [
  { value: 'INSCRITO', label: 'Inscrito' },
  { value: 'LO_PIENSO', label: 'Lo pienso (vuelve en 3 días)' },
  { value: 'CARO', label: 'Caro (vuelve en 3 días con cuotas)' },
  { value: 'NO_CONTESTA', label: 'No contesta (vuelve mañana)' },
  { value: 'OTRO_PROGRAMA', label: 'Quiere otro programa' },
  { value: 'NO_INTERESA', label: 'No le interesa' },
  { value: 'NUMERO_ERRADO', label: 'Número errado' }
]

export const OUTCOME_LABEL = {
  INSCRITO: 'Inscrito', LO_PIENSO: 'Lo pienso', CARO: 'Caro', NO_CONTESTA: 'No contesta',
  OTRO_PROGRAMA: 'Otro programa', NO_INTERESA: 'No le interesa', NUMERO_ERRADO: 'Número errado'
}

export const LEVELS = [
  { level: 'ALTA', label: 'Alta', icon: 'fa-fire', tone: 'bad', hint: '3+ consultas o cliente que volvió a consultar 2+ veces' },
  { level: 'MEDIA', label: 'Media', icon: 'fa-temperature-half', tone: 'warn', hint: '2 consultas o cliente que volvió a consultar' }
]

// Diferencia de dias entre fechas YYYY-MM-DD, en UTC (con getters locales Lima
// corre el dia).
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const ago = (days) => (days <= 0 ? 'hoy' : days === 1 ? 'hace 1 día' : `hace ${formatValue(days, 'num')} días`)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// El plazo solo se muestra cuando apura: 14 dias repetidos en cada fila es ruido.
const DEADLINE_WARNING_DAYS = 3

// "Por que llamarlo", en una linea: lo que el asesor diria si le preguntan.
export function whyCall (a, today) {
  const consultas = plural(a.inquiries, 'consulta', 'consultas')
  const parts = [
    ...(a.is_client ? ['Ya es cliente'] : []),
    // "1 consulta" no explica nada: en un cliente, la razon es que ya compro.
    ...(a.is_client && a.inquiries < 2 ? [] : [consultas]),
    `última ${ago(daysBetween(a.consulted_on, today))}`
  ]
  if (a.edicion) parts.push(`inicia ${toDayMonthYear(a.edicion.inicio).slice(0, 5)}`)
  return parts.join(' · ')
}

function previousTry (a) {
  if (a.last_result === 'NO_CONTESTA') return `No contestó ${plural(a.attempts, 'vez', 'veces')}`
  if (a.last_result === 'CARO') return 'Dijo que está caro: abre con cuotas o precio de estudiante'
  if (a.last_result === 'LO_PIENSO') return 'Dijo que lo pensaba: pregúntale qué le hace dudar'
  return null
}

export function assignmentRow (a, today) {
  const venceEn = daysBetween(today, a.expires_on)
  return {
    id: a.assignment_id,
    level: a.level,
    // Sin nombre no se saluda a nadie: primero se le pide.
    cliente: a.client_name || a.phone_key,
    sinNombre: !a.client_name,
    telefono: a.phone_key,
    programa: a.program_name ?? 'Consulta sin programa',
    porQue: whyCall(a, today),
    antes: previousTry(a),
    tier: a.tier,
    tierTone: a.tier === 'TOP' ? 'ok' : '',
    plazo: venceEn > DEADLINE_WARNING_DAYS ? null : venceEn <= 0 ? 'Vence hoy' : `Vence en ${plural(venceEn, 'día', 'días')}`,
    // Con programa, WhatsApp abre con la propuesta (fecha y precio) ya escrita.
    whatsapp: whatsappUrl(a.phone_key, a.program_name ? pitchText({ ...a, program_name: a.program_name }) : undefined),
    ficha: { name: 'FichaCliente', query: { tel: a.phone_key } },
    // "Inscribir" clona su ultima consulta en el formulario de venta: telefono,
    // nombre y programa ya vienen escritos.
    inscribir: a.lead_id ? { name: 'ComercialLeadsNew', query: { clone_from: a.lead_id } } : null
  }
}

export function groupByLevel (rows) {
  return LEVELS.map((l) => ({ ...l, rows: rows.filter((r) => r.level === l.level) })).filter((g) => g.rows.length)
}

// Cadencia asistida: un mensaje distinto por paso, cada vez con menos presion.
const firstName = (name) => (name ? ` ${name.split(' ')[0]}` : '')
export function followUpText (f) {
  const programa = f.program_name ?? 'el programa que consultaste'
  if (f.step === 1) return pitchText({ ...f, program_name: programa })
  const fecha = f.edicion ? ` La edición empieza el ${toDayMonthYear(f.edicion.inicio)}.` : ''
  if (f.step === 3) {
    const reserva = f.precio ? ` Puedes separar tu vacante con ${formatValue(f.precio.reserva, 'soles')}.` : ''
    return `Hola${firstName(f.client_name)}, ¿pudiste revisar la información de ${programa}?${fecha}${reserva} ¿Te ayudo con alguna duda?`
  }
  return `Hola${firstName(f.client_name)}, te escribo por última vez sobre ${programa}.${fecha} Si ahora no es el momento, te aviso de la siguiente edición. ¿Te guardo una vacante?`
}

const FOLLOW_UP_REASON = { BAJA: 'Consultó 1 vez', SIN_RESPUESTA: 'No contestó 3 llamadas', VENCIDO: '14 días sin cerrar' }

export function followUpRow (f, today) {
  const atraso = daysBetween(f.due_on, today)
  return {
    id: f.followup_id,
    cliente: f.client_name || f.phone_key,
    telefono: f.phone_key,
    programa: f.program_name ?? 'Consulta sin programa',
    paso: `Día ${f.step}`,
    motivo: FOLLOW_UP_REASON[f.reason],
    atraso: atraso > 0 ? `Atrasado ${plural(atraso, 'día', 'días')}` : null,
    whatsapp: whatsappUrl(f.phone_key, followUpText(f))
  }
}

export function buildKpis ({ abiertos, seguimientos, contactados_hoy: contactados, tope, ultimos_30_dias: u }) {
  const altas = abiertos.filter((a) => a.level === 'ALTA').length
  return [
    {
      id: 'pendientes', icon: 'fa-phone', tone: altas ? 'bad' : '', value: formatValue(abiertos.length, 'num'),
      label: 'Por llamar hoy', note: altas ? `${altas} de nivel Alta: empieza por ellos` : 'Ninguno de nivel Alta'
    },
    {
      id: 'contactados', icon: 'fa-headset', tone: contactados >= tope ? 'ok' : '', value: `${formatValue(contactados, 'num')}/${tope}`,
      label: 'Contactados hoy', note: 'Clientes con resultado registrado hoy'
    },
    {
      id: 'seguimientos', icon: 'fa-comment-dots', tone: seguimientos.length ? 'warn' : 'ok', value: formatValue(seguimientos.length, 'num'),
      label: 'Mensajes de seguimiento', note: seguimientos.length ? 'WhatsApp de la cadencia (días 1, 3 y 7)' : 'Al día'
    },
    {
      id: 'compraron', icon: 'fa-cart-shopping', tone: u.compraron ? 'ok' : '', value: formatValue(u.compraron, 'num'),
      label: 'Compraron (30 días)', note: `De ${formatValue(u.cerrados, 'num')} cerrados · ${formatValue(u.vencidos, 'num')} vencieron`
    }
  ]
}

const VERDICT = {
  FUNCIONA: { label: 'Vende más', tone: 'ok' },
  EMPEORA: { label: 'Vende menos', tone: 'bad' },
  AZAR: { label: 'Aún no se distingue del azar', tone: '' },
  SIN_MUESTRA: { label: 'Faltan casos', tone: '' }
}

const groupText = (g) => (g.n ? `${formatValue(g.tasa, 'pct')} (${g.compraron} de ${formatValue(g.n, 'num')})` : '—')

// Panel del lider: ¿los llamados compran mas que el control? El veredicto y la
// significancia vienen del backend (medicion.entity.js); aqui solo se traduce.
export function measurementView ({ segmentos, estado, resultados, today, ventana_dias: ventana }) {
  const maduro = estado.first_mature && estado.first_mature <= today
  const trabajados = estado.llamables ? (100 * estado.con_resultado) / estado.llamables : null
  const totalResultados = resultados.reduce((s, m) => s + m.total, 0)
  return {
    filas: segmentos.map((s) => ({
      segmento: s.segmento,
      llamados: groupText(s.llamados),
      control: groupText(s.control),
      lift: s.lift === null ? '—' : `${formatValue(s.lift, 'num')}×`,
      veredicto: VERDICT[s.veredicto],
      calibracion: s.calibrado === null
        ? '—'
        : `${s.calibrado ? 'Bien' : 'Recalibrar'}: dijimos ${formatValue(s.esperado, 'pct')}, sin llamar compró ${formatValue(s.control.tasa, 'pct')}`,
      calibracionTone: s.calibrado === false ? 'warn' : ''
    })),
    vacio: !segmentos.length,
    nota: maduro
      ? `Compras a ${ventana} días de asignado. ${formatValue(estado.madurando, 'num')} clientes todavía están dentro de la ventana.`
      : estado.first_mature
        ? `Los primeros resultados se pueden leer desde el ${toDayMonthYear(estado.first_mature)} (${ventana} días después de la primera bandeja).`
        : 'Todavía no se generó ninguna bandeja.',
    trabajo: trabajados === null
      ? null
      : `Los asesores registraron resultado en ${formatValue(trabajados, 'pct')} de los clientes (${formatValue(estado.vencidos, 'num')} vencieron sin llamar). Si es bajo, la medición compara la bandeja sin usar.`,
    trabajoTone: trabajados !== null && trabajados < 70 ? 'warn' : '',
    resultados: resultados.slice(0, 7).map((m) => ({
      resultado: OUTCOME_LABEL[m.outcome] ?? m.outcome,
      total: formatValue(m.total, 'num'),
      pct: formatValue((100 * m.total) / totalResultados, 'pct')
    }))
  }
}
