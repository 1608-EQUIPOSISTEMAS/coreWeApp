// Bandeja "Llamar hoy" (Comercial): lo que la vista pinta a partir de
// /api/prediccion/bandeja. Puras: sin DOM ni API.
import { formatValue } from '@/shared/lib/formatValue'
import { toDayMonthYear, whatsappUrl, pitchText } from './fichaCliente'

export { whatsappUrl }

// Un solo selector: el motivo va pegado al resultado, asi registrarlo cuesta un
// clic y no un paso extra (sin motivo no se sabe a quien volver a llamar).
export const OUTCOME_GROUPS = [
  {
    label: 'Contestó',
    options: [
      { value: 'CONTESTO', label: 'Le interesa, sigo en contacto' },
      { value: 'CONTESTO:LO_PENSARA', label: 'Lo va a pensar' }
    ]
  },
  {
    label: 'No le interesa',
    options: [
      { value: 'NO_INTERESA:PRECIO', label: 'Por el precio' },
      { value: 'NO_INTERESA:HORARIO', label: 'Por el horario' },
      { value: 'NO_INTERESA:FECHA', label: 'Por la fecha de inicio' },
      { value: 'NO_INTERESA:OTRO_PROGRAMA', label: 'Quiere otro programa' },
      { value: 'NO_INTERESA:COMPETENCIA', label: 'Se fue a la competencia' },
      { value: 'NO_INTERESA:SIN_INTERES', label: 'Ya no le interesa' }
    ]
  },
  {
    label: 'No se pudo',
    options: [
      { value: 'NO_CONTESTA', label: 'No contesta' },
      { value: 'NUMERO_ERRADO', label: 'Número errado' }
    ]
  }
]

export function parseOutcome (value) {
  const [outcome, reason = null] = value.split(':')
  return { outcome, reason }
}

export const REASON_LABEL = {
  PRECIO: 'Precio', HORARIO: 'Horario', FECHA: 'Fecha de inicio', LO_PENSARA: 'Lo va a pensar',
  OTRO_PROGRAMA: 'Quiere otro programa', COMPETENCIA: 'Competencia', SIN_INTERES: 'Ya no le interesa'
}

// Diferencia de dias entre fechas YYYY-MM-DD, en UTC (con getters locales Lima
// corre el dia).
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

export function assignmentRow (a, today) {
  const diasConsulta = daysBetween(a.consulted_on, today)
  const venceEn = daysBetween(today, a.expires_on)
  return {
    id: a.assignment_id,
    cliente: a.client_name || a.phone_key,
    telefono: a.phone_key,
    programa: a.program_name ?? 'Consulta sin programa',
    consulta: `Consultó hace ${formatValue(diasConsulta, 'num')} días (${toDayMonthYear(a.consulted_on)})`,
    repetida: a.inquiries >= 2,
    probabilidad: formatValue(a.probability, 'pct'),
    // 9% = cliente con 2+ consultas, el grupo que mas compra (medido 15/10/26).
    probTone: a.probability >= 9 ? 'ok' : '',
    tier: a.tier,
    tierTone: a.tier === 'TOP' ? 'ok' : '',
    vence: venceEn <= 0 ? 'Vence hoy' : `Vence en ${venceEn} ${venceEn === 1 ? 'día' : 'días'}`,
    venceTone: venceEn <= 2 ? 'warn' : '',
    edicion: a.edicion ? `Inicia el ${toDayMonthYear(a.edicion.inicio)}` : 'Sin edición programada',
    edicionTone: a.edicion ? '' : 'warn',
    // Con programa, WhatsApp abre con la propuesta (fecha y precio) ya escrita.
    whatsapp: whatsappUrl(a.phone_key, a.program_name ? pitchText({ ...a, program_name: a.program_name }) : undefined),
    // "Inscribir" clona su ultima consulta en el formulario de venta: telefono,
    // nombre y programa ya vienen escritos.
    inscribir: a.lead_id ? { name: 'ComercialLeadsNew', query: { clone_from: a.lead_id } } : null
  }
}

// Lo que compro contra lo que se esperaba: la bandeja tiene que demostrar que
// rinde mas que llamar a cualquiera.
export function buildKpis ({ abiertos, ultimos_30_dias: u, today }) {
  const porVencer = abiertos.filter((a) => daysBetween(today, a.expires_on) <= 2).length
  return [
    {
      id: 'pendientes', icon: 'fa-phone', tone: porVencer ? 'warn' : '', value: formatValue(abiertos.length, 'num'),
      label: 'Clientes por llamar', note: porVencer ? `${porVencer} vencen en 2 días o menos` : 'Ninguno por vencer'
    },
    {
      id: 'compraron', icon: 'fa-cart-shopping', tone: u.compraron >= u.compras_esperadas && u.compraron > 0 ? 'ok' : '',
      value: formatValue(u.compraron, 'num'), label: 'Compraron (30 días)',
      note: `Se esperaban ${formatValue(u.compras_esperadas, 'num')} de ${formatValue(u.cerrados, 'num')} clientes`
    },
    {
      id: 'vencidos', icon: 'fa-hourglass-end', tone: u.vencidos ? 'bad' : 'ok', value: formatValue(u.vencidos, 'num'),
      label: 'Vencieron sin llamar (30 días)',
      note: u.vencidos ? 'Pasaron 14 días sin registrar la llamada' : 'Todos se trabajaron a tiempo'
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
export function measurementView ({ segmentos, estado, motivos, today, ventana_dias: ventana }) {
  const maduro = estado.first_mature && estado.first_mature <= today
  const trabajados = estado.llamables ? (100 * estado.con_resultado) / estado.llamables : null
  const totalMotivos = motivos.reduce((s, m) => s + m.total, 0)
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
    motivos: motivos.slice(0, 5).map((m) => ({
      motivo: REASON_LABEL[m.reason] ?? m.reason,
      total: formatValue(m.total, 'num'),
      pct: formatValue((100 * m.total) / totalMotivos, 'pct')
    }))
  }
}
