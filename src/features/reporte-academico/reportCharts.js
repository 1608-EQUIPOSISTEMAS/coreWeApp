// Datos de los gráficos del Reporte Académico (informe de una página). Reglas
// puras: el .vue solo dibuja lo que sale de aquí.
import { isoWeekOf } from '@/utils/isoWeek'

// Mismas marcas que el Control de Ediciones y el panel del dashboard: A y T son
// sesión dictada; R es reprogramada (se movió, no se dictó) y sin marca es
// "sin gestionar".
const DICTADA = new Set(['A', 'T'])

// Lista fija: Intl cambia la abreviatura según el ICU del navegador ("sept"/"Set").
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']
export const monthShort = (ym) => MESES[Number(ym.slice(5, 7)) - 1]

// El backend manda los meses del más reciente al más antiguo; el gráfico se lee
// de izquierda a derecha en el tiempo.
const chronological = (meses) => [...meses].reverse()

// Jalados = por nota (< 12) + sin entrega final; se apilan por separado porque
// piden acciones distintas (reforzamiento vs. retención).
export function outcomesChart (meses = []) {
  const m = chronological(meses)
  return {
    categorias: m.map((x) => monthShort(x.mes)),
    series: [
      { nombre: 'Aprobados', tono: 'ok', datos: m.map((x) => x.aprobados) },
      { nombre: 'Jalados por nota', tono: 'bad', datos: m.map((x) => x.jalados - x.sin_final) },
      { nombre: 'Sin entrega final', tono: 'warn', datos: m.map((x) => x.sin_final) }
    ]
  }
}

export function certificationChart (meses = []) {
  const m = chronological(meses)
  return {
    categorias: m.map((x) => monthShort(x.mes)),
    series: [
      { nombre: 'Aprobados', tono: 'soft', datos: m.map((x) => x.aprobados) },
      { nombre: 'Certificados', tono: 'accent', datos: m.map((x) => x.certificados) }
    ]
  }
}

// Sesiones por semana ISO dentro del periodo, solo hasta hoy (una sesión futura
// todavía no se debe). Programada = tiene fecha en la semana; auditada = tiene
// nota IA o manual.
export function weeklySessionsChart (sessionsPorAula = [], { start, end, today }) {
  const hasta = end < today ? end : today
  const semanas = new Map()
  for (const sesiones of sessionsPorAula) {
    for (const s of sesiones) {
      if (!s.date || s.date < start || s.date > hasta) continue
      const wk = isoWeekOf(s.date)
      const w = semanas.get(wk.key) ?? { key: wk.key, label: `S${wk.week}`, programadas: 0, dictadas: 0, auditadas: 0 }
      w.programadas++
      if (DICTADA.has(s.status)) w.dictadas++
      if (s.ai_20 != null || s.manual_20 != null) w.auditadas++
      semanas.set(wk.key, w)
    }
  }
  const orden = [...semanas.values()].sort((a, b) => a.key.localeCompare(b.key))
  return {
    categorias: orden.map((w) => w.label),
    series: [
      { nombre: 'Programadas', tono: 'soft', datos: orden.map((w) => w.programadas) },
      { nombre: 'Dictadas', tono: 'accent', datos: orden.map((w) => w.dictadas) },
      { nombre: 'Auditadas', tono: 'ok', datos: orden.map((w) => w.auditadas) }
    ]
  }
}

// Los 5 docentes con peor promedio de auditoría: son los que piden
// acompañamiento. Sin auditoría no entran (no hay nota que comparar).
export function teachersChart (docentes = [], limite = 5) {
  const peores = docentes
    .filter((d) => Number.isFinite(d.avg20))
    .sort((a, b) => a.avg20 - b.avg20)
    .slice(0, limite)
  return {
    categorias: peores.map((d) => d.teacher),
    series: [{ nombre: 'Promedio /20', tono: 'porNota', datos: peores.map((d) => Math.round(d.avg20 * 10) / 10) }]
  }
}

// Tono de un objetivo: en meta = ok; a menos de `margen` de la meta = atención;
// más lejos = malo. Sin dato no hay tono (no se pinta un rojo inventado).
export function goalTone (valor, meta, margen) {
  if (!Number.isFinite(valor)) return ''
  if (valor >= meta) return 'ok'
  return valor >= meta - margen ? 'warn' : 'bad'
}

// Docentes con auditoría que ya promedian la meta. Sin auditoría no cuentan
// ni a favor ni en contra.
export function teachersAtGoal (docentes = [], meta) {
  const evaluados = docentes.filter((d) => Number.isFinite(d.avg20))
  return { alcanzan: evaluados.filter((d) => d.avg20 >= meta).length, evaluados: evaluados.length }
}
