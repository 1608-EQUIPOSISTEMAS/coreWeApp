// Reglas de lectura del Plan Comercial: cumplimiento, tonos y las frases de la
// banda de lectura rapida. Puras: reciben lo que manda /api/plan-comercial y
// devuelven lo que la vista pinta, sin tocar el DOM ni la API.

// Conversion minima que se le pide a un asesor (ventas / consultas). Es la regla
// del Sheet "4. Ventas Diarias": bajo el 15% la celda va en rojo.
export const CONVERSION_GOAL_PCT = 15

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const monthName = (monthStart) => MONTHS[Number(monthStart.slice(5, 7)) - 1]
export const monthShort = (monthStart) => monthName(monthStart).slice(0, 3)
export const weekdayName = (i) => WEEKDAYS[i]
// Users.name viene en mayuscula (ARLETH); en pantalla va como nombre propio.
// Las siglas cortas (WEB, B2B) se quedan como estan.
export const displayName = (n) => (n.length <= 3 ? n : n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
export const weekdayShort = (i) => WEEKDAYS[i].slice(0, 3)

const dayMonth = (ymd) => `${Number(ymd.slice(8, 10))}/${Number(ymd.slice(5, 7))}`
// "1-6", "31": el rango del tramo dentro de su mes, como lo escribe el Sheet.
export const periodOf = ({ date_start: a, date_end: b }) =>
  a === b ? `${Number(a.slice(8))}` : `${Number(a.slice(8))}-${Number(b.slice(8))}`
export const weekRangeLabel = ({ date_start: a, date_end: b }) => `${dayMonth(a)} al ${dayMonth(b)}`

const sum = (xs) => xs.reduce((s, x) => s + (Number(x) || 0), 0)
// Suma de objetivos: si ninguno esta cargado es null, no 0. "Sin objetivo" y
// "objetivo cero" dicen cosas distintas en pantalla.
const sumGoals = (xs) => (xs.some((x) => x !== null && x !== undefined) ? sum(xs) : null)

// Cumplimiento: logro / objetivo. Sin objetivo (o objetivo 0) no hay cumplimiento.
export const compliance = (achieved, goal) => (goal ? achieved / goal : null)
export const pct = (ratio) => (ratio === null || ratio === undefined || !Number.isFinite(ratio) ? null : Math.round(ratio * 100))

// No llegar al objetivo va en rosado ("falta"), no en rojo: el rojo queda para
// lo que esta mal, como una conversion bajo la meta. Es la regla del Sheet.
export const goalTone = (ratio) => (ratio === null ? 'neutro' : ratio >= 1 ? 'ok' : 'rose')

// Mapa de calor por asesor: dos verdes (el de arriba premia pasarse del 120%) y
// dos rosados (el fuerte, bajo el 80%).
export function heatTone (ratio) {
  if (ratio === null) return 'neutro'
  if (ratio >= 1.2) return 'top'
  if (ratio >= 1) return 'ok'
  if (ratio >= 0.8) return 'rose'
  return 'rose-strong'
}

// La conversion se juzga en porcentaje entero, igual que el Sheet: 15,4% es 15%.
export function conversionTone (ratio, goalPct = CONVERSION_GOAL_PCT) {
  if (ratio === null) return 'neutro'
  const p = pct(ratio)
  if (p < goalPct) return 'bad'
  return p === goalPct ? 'warn' : 'ok'
}

const isOngoing = (w, today) => w.date_start <= today && w.date_end >= today
const hasStarted = (w, today) => w.date_start <= today

// ── 2. Objetivos ─────────────────────────────────────────────────────────────

export function monthTotals (month, usdToPen) {
  const weeks = month.weeks.map((w) => ({
    ...w,
    ingresos: w.ingresos_pen + w.ingresos_usd * usdToPen
  }))
  const obj_vacantes = sumGoals(weeks.map((w) => w.obj_vacantes))
  const obj_ingresos = sumGoals(weeks.map((w) => w.obj_ingresos))
  const vacantes = sum(weeks.map((w) => w.vacantes))
  const ingresos = sum(weeks.map((w) => w.ingresos))
  return {
    month_start: month.month_start,
    weeks: weeks.map((w) => ({
      ...w,
      part_obj: obj_vacantes ? (w.obj_vacantes ?? 0) / obj_vacantes : null,
      part_ingresos: ingresos ? w.ingresos / ingresos : null,
      cumplimiento: compliance(w.vacantes, w.obj_vacantes),
      cumplimiento_ingresos: compliance(w.ingresos, w.obj_ingresos)
    })),
    obj_vacantes,
    obj_ingresos,
    vacantes,
    ingresos,
    ingresos_pen: sum(weeks.map((w) => w.ingresos_pen)),
    ingresos_usd: sum(weeks.map((w) => w.ingresos_usd)),
    cumplimiento: compliance(vacantes, obj_vacantes),
    cumplimiento_ingresos: compliance(ingresos, obj_ingresos)
  }
}

export function objetivosInsights (totalsByMonth, selected) {
  const m = totalsByMonth[selected]
  const faltan = (goal, got, fmt) => (got >= goal ? `${fmt(got - goal)} sobre el objetivo` : `faltan ${fmt(goal - got)}`)
  const n = (x) => Math.round(x).toLocaleString('es-PE')
  const soles = (x) => `S/ ${n(x)}`

  const ticketPlan = m.obj_vacantes ? m.obj_ingresos / m.obj_vacantes : null
  const ticketReal = m.vacantes ? m.ingresos / m.vacantes : null
  const ticketVsPlan = ticketPlan && ticketReal ? ticketReal / ticketPlan - 1 : null

  const measured = m.weeks.filter((w) => w.obj_vacantes > 0 && w.vacantes > 0)
  const ranked = [...measured].sort((a, b) => b.cumplimiento - a.cumplimiento)
  const best = ranked[0]
  const worst = ranked.at(-1)
  const planned = totalsByMonth.filter((x) => x.obj_vacantes)
  const met = planned.filter((x) => x.vacantes >= x.obj_vacantes).length

  return [
    {
      key: 'vacantes',
      label: 'Vacantes',
      value: m.obj_vacantes ? `${pct(m.cumplimiento)}%` : 'Sin objetivo',
      text: m.obj_vacantes
        ? `${n(m.vacantes)} de ${n(m.obj_vacantes)} planificadas, ${faltan(m.obj_vacantes, m.vacantes, n)}.`
        : `${n(m.vacantes)} vendidas. Carga el objetivo del mes para medir el avance.`,
      tone: goalTone(m.cumplimiento),
      bar: m.cumplimiento
    },
    {
      key: 'ingresos',
      label: 'Ingresos',
      value: m.obj_ingresos ? `${pct(m.cumplimiento_ingresos)}%` : 'Sin objetivo',
      text: m.obj_ingresos
        ? `${soles(m.ingresos)} de ${soles(m.obj_ingresos)}, ${faltan(m.obj_ingresos, m.ingresos, soles)}.`
        : `${soles(m.ingresos)} cobrados en el mes.`,
      tone: goalTone(m.cumplimiento_ingresos),
      bar: m.cumplimiento_ingresos
    },
    {
      key: 'ticket',
      label: 'Ticket promedio',
      value: ticketReal ? soles(ticketReal) : '—',
      text: ticketVsPlan !== null
        ? `Plan ${soles(ticketPlan)} por vacante: ${ticketVsPlan >= 0 ? '+' : ''}${pct(ticketVsPlan)}% frente al plan.`
        : 'Se calcula con vacantes e ingresos del mes.',
      tone: ticketVsPlan === null ? 'neutro' : ticketVsPlan >= 0 ? 'ok' : 'rose',
      bar: null
    },
    {
      key: 'semana',
      label: 'Mejor semana',
      value: best ? best.week_label : '—',
      text: best
        ? `${pct(best.cumplimiento)}% de cumplimiento (${periodOf(best)}). La más baja fue ${worst.week_label} con ${pct(worst.cumplimiento)}%. ${met} de ${planned.length} meses con plan cumplen en vacantes.`
        : 'Aún no hay semanas con objetivo y ventas en este mes.',
      tone: 'neutro',
      bar: null
    }
  ]
}

// ── 3. Objetivos por asesor ──────────────────────────────────────────────────

export function asesoresReport (data, today) {
  const weeks = data.weeks.map((w) => ({ ...w, en_curso: isOngoing(w, today), empezo: hasStarted(w, today) }))
  const people = data.asesores.map((a) => {
    const obj = sumGoals(a.semanas.map((s) => s.obj))
    const logro = sum(a.semanas.map((s) => s.vacantes))
    return { ...a, obj, logro, cumplimiento: compliance(logro, obj), falta: obj === null ? null : obj - logro }
  })
  const teamGoal = sumGoals(weeks.map((w) => w.obj_vacantes))
  const teamAchieved = sum(weeks.map((w) => w.vacantes))
  const planned = people.filter((p) => p.obj)
  const planTotal = sum(planned.map((p) => p.obj))

  const ranking = [...planned]
    .map((p) => ({
      ...p,
      part_plan: planTotal ? p.obj / planTotal : null,
      aporte: teamAchieved ? p.logro / teamAchieved : null
    }))
    .sort((a, b) => b.cumplimiento - a.cumplimiento || b.logro - a.logro)

  return {
    weeks,
    people,
    ranking,
    team: { obj: teamGoal, logro: teamAchieved, cumplimiento: compliance(teamAchieved, teamGoal) }
  }
}

export function asesoresInsights (report) {
  const { team, ranking, weeks } = report
  const top = ranking[0]
  const low = ranking.at(-1)
  const cumplieron = ranking.filter((p) => p.logro >= p.obj)
  const abierta = weeks.find((w) => w.en_curso)
  const nombres = cumplieron.map((p) => displayName(p.nombre)).join(', ')

  const items = [{
    key: 'equipo',
    label: 'Equipo',
    value: team.obj ? `${pct(team.cumplimiento)}%` : 'Sin objetivo',
    text: team.obj
      ? `${team.logro} de ${team.obj} vacantes, ${team.logro >= team.obj ? 'objetivo cumplido' : `faltan ${team.obj - team.logro}`}.`
      : `${team.logro} vacantes vendidas. Carga el objetivo del mes para medir el avance.`,
    tone: goalTone(team.cumplimiento),
    bar: team.cumplimiento
  }]
  if (top) {
    items.push({
      key: 'lidera', label: 'Lidera', value: displayName(top.nombre), tone: 'ok', bar: null,
      text: `${pct(top.cumplimiento)}% de cumplimiento (${top.logro} de ${top.obj}). Aporta el ${pct(top.aporte)}% del logro con el ${pct(top.part_plan)}% del plan.`
    })
  }
  if (low && low !== top) {
    items.push({
      key: 'rezagado', label: 'Más rezagado', value: displayName(low.nombre), tone: 'rose', bar: null,
      text: `${pct(low.cumplimiento)}% de cumplimiento: ${low.falta > 0 ? `le faltan ${low.falta} para su objetivo` : 'también cumplió su objetivo'}.`
    })
  }
  if (ranking.length) {
    items.push(abierta
      ? {
          key: 'cierre', label: 'Para cerrar el mes', value: String(Math.max(0, (team.obj ?? 0) - team.logro)), tone: 'warn', bar: null,
          text: `vacantes pendientes con la ${abierta.week_label} (${periodOf(abierta)}) en juego. ${nombres ? `Ya cumplió: ${nombres}.` : 'Nadie ha cumplido aún.'}`
        }
      : {
          key: 'cierre', label: 'Cierre del mes', value: `${cumplieron.length} de ${ranking.length}`, bar: null,
          tone: cumplieron.length * 2 >= ranking.length ? 'ok' : 'rose',
          text: nombres ? `Cumplieron: ${nombres}.` : 'Ningún asesor cumplió su objetivo.'
        })
  }
  return items
}

// ── 4. Ventas diarias ────────────────────────────────────────────────────────

// Una semana del reporte diario con sus totales, el dia de mas y de menos ventas
// (solo entre dias con consultas: un domingo sin atencion no es "el peor dia") y
// la conversion de cada celda ya resuelta.
//
// Los totales son SOLO de los asesores: B2B se muestra aparte y no suma al VEN,
// y las ventas de otras areas no entran en este reporte.
export function dailyWeek (week, today, goalPct = CONVERSION_GOAL_PCT) {
  const rows = week.asesores.map((a, i) => {
    const consultas = sum(a.consultas)
    const ventas = sum(a.ventas)
    // Quien no registra consultas (la cuenta WEB) no tiene conversion que medir.
    const mideConversion = consultas > 0
    return {
      ...a,
      n: i + 1,
      total_consultas: mideConversion ? consultas : null,
      total_ventas: ventas,
      falta: a.obj === null ? null : a.obj - ventas,
      conversion: mideConversion ? ventas / consultas : null,
      conversion_tone: mideConversion ? conversionTone(ventas / consultas, goalPct) : 'neutro',
      ventas_tone: a.obj ? goalTone(ventas / a.obj) : 'neutro',
      ratio_dia: a.obj === null ? null : Math.round(a.obj / 5),
      dias: a.consultas.map((c, d) => ({
        consultas: mideConversion ? c : null,
        ventas: a.ventas[d],
        conversion: mideConversion && c ? a.ventas[d] / c : null,
        tone: mideConversion && c ? conversionTone(a.ventas[d] / c, goalPct) : 'neutro'
      }))
    }
  })
  const b2b = { ventas: week.b2b, total_ventas: sum(week.b2b) }

  const diaConsultas = week.dias.map((_, i) => sum(rows.map((r) => r.dias[i].consultas)))
  const diaVentasAsesor = week.dias.map((_, i) => sum(rows.filter((r) => r.total_consultas !== null).map((r) => r.ventas[i])))
  const diaVentas = week.dias.map((_, i) => sum(rows.map((r) => r.ventas[i])))
  const conRegistro = week.dias.map((_, i) => i).filter((i) => diaConsultas[i] > 0)

  let mejores = []
  let peores = []
  if (conRegistro.length > 1) {
    const vs = conRegistro.map((i) => diaVentas[i])
    const max = Math.max(...vs)
    const min = Math.min(...vs)
    if (max !== min) {
      mejores = conRegistro.filter((i) => diaVentas[i] === max)
      peores = conRegistro.filter((i) => diaVentas[i] === min)
    }
  }

  const obj = sumGoals(rows.map((r) => r.obj))
  const ventas = sum(diaVentas)
  const consultas = sum(diaConsultas)
  const conversion = consultas ? sum(diaVentasAsesor) / consultas : null
  const cumplimiento = compliance(ventas, obj)

  return {
    ...week,
    rows,
    b2b,
    dia_consultas: diaConsultas,
    dia_ventas: diaVentas,
    dia_conversion: diaConsultas.map((c, i) => (c ? diaVentasAsesor[i] / c : null)),
    dias_con_registro: conRegistro.length,
    mejores,
    peores,
    obj,
    ventas,
    falta: obj === null ? null : obj - ventas,
    consultas,
    conversion,
    conversion_tone: conversionTone(conversion, goalPct),
    cumplimiento,
    cumplimiento_tone: goalTone(cumplimiento),
    tiene_datos: consultas > 0 || ventas > 0,
    en_curso: isOngoing(week, today)
  }
}

// La semana que se lee primero: la que esta en curso o, si el mes ya paso, la
// ultima con consultas. Una semana con una venta suelta y nadie atendiendo no
// representa al equipo.
export function referenceWeek (weeks) {
  return weeks.find((w) => w.en_curso && w.tiene_datos) ||
    weeks.filter((w) => w.dias_con_registro > 0).at(-1) ||
    weeks.filter((w) => w.tiene_datos).at(-1)
}

// Promedio de ventas por dia de la semana, contando solo los dias con consultas:
// un feriado sin atencion bajaria el promedio de un dia que si vende.
export function averageByWeekday (weeks) {
  return Array.from({ length: 7 }, (_, d) => {
    const conDatos = weeks.filter((w) => w.dia_consultas[d] > 0)
    return conDatos.length ? sum(conDatos.map((w) => w.dia_ventas[d])) / conDatos.length : 0
  })
}

// Conversion de cada asesor, semana por semana y en el periodo.
export function conversionMatrix (weeks, goalPct = CONVERSION_GOAL_PCT) {
  const conDatos = weeks.filter((w) => w.tiene_datos)
  const ids = [...new Set(conDatos.flatMap((w) => w.rows.filter((r) => r.total_consultas !== null).map((r) => r.user_id)))]
  const cell = (ventas, consultas) => {
    const ratio = consultas ? ventas / consultas : null
    return { ratio, tone: conversionTone(ratio, goalPct) }
  }
  const rows = ids.map((id) => {
    const fila = conDatos.map((w) => w.rows.find((r) => r.user_id === id))
    const nombre = fila.find(Boolean).nombre
    const semanas = fila.map((r) => cell(r?.total_ventas ?? 0, r?.total_consultas ?? 0))
    const total = cell(sum(fila.map((r) => r?.total_ventas)), sum(fila.map((r) => r?.total_consultas)))
    return { user_id: id, nombre, semanas, total }
  })
  const equipo = {
    semanas: conDatos.map((w) => ({ ratio: w.conversion, tone: w.conversion_tone })),
    total: cell(
      sum(conDatos.map((w) => sum(w.rows.filter((r) => r.total_consultas !== null).map((r) => r.total_ventas)))),
      sum(conDatos.map((w) => w.consultas))
    )
  }
  return { weeks: conDatos, rows, equipo }
}

export function ventasInsights (weeks, matrix, today) {
  const items = []
  const actual = referenceWeek(weeks)
  const uno = (x) => x.toFixed(1).replace('.', ',')
  const ventas = (n) => `${n} venta${n === 1 ? '' : 's'}`

  if (actual) {
    const restan = actual.dias.filter((d) => d > today).length
    const ritmo = actual.dias_con_registro ? actual.ventas / actual.dias_con_registro : 0
    items.push({
      key: 'semana',
      label: actual.en_curso ? 'Semana en curso' : 'Última semana',
      value: actual.obj ? `${pct(actual.cumplimiento)}%` : 'Sin objetivo',
      text: actual.obj
        ? `${actual.ventas} de ${ventas(actual.obj)} en la ${actual.week_label}.` +
          (restan > 0 && actual.falta > 0 ? ` Faltan ${actual.falta} en ${restan} días: ${Math.ceil(actual.falta / restan)} por día contra ${uno(ritmo)} de promedio actual.` : '')
        : `${ventas(actual.ventas)} de asesores en la ${actual.week_label}.`,
      tone: actual.cumplimiento_tone,
      bar: actual.cumplimiento
    })
  }

  const promedios = averageByWeekday(weeks)
  if (promedios.some((p) => p > 0)) {
    const max = Math.max(...promedios)
    const conVenta = promedios.filter((p) => p > 0)
    const min = Math.min(...conVenta)
    const mejor = promedios.indexOf(max)
    const peor = promedios.indexOf(min)
    items.push({
      key: 'dia', label: 'Mejor día', value: weekdayName(mejor), tone: 'ok', bar: null,
      text: `${uno(max)} ventas en promedio. El más bajo es el ${weekdayName(peor).toLowerCase()} con ${uno(min)}.`
    })
  }

  const ranked = [...matrix.rows].filter((r) => r.total.ratio !== null).sort((a, b) => b.total.ratio - a.total.ratio)
  if (ranked.length) {
    const mejor = ranked[0]
    const peor = ranked.at(-1)
    items.push({
      key: 'conversion', label: 'Mejor conversión', value: displayName(mejor.nombre), tone: mejor.total.tone, bar: null,
      text: `${pct(mejor.total.ratio)}% en ${matrix.weeks.length} semanas. La más baja es de ${displayName(peor.nombre)} con ${pct(peor.total.ratio)}%.`
    })
  }

  const completas = weeks.filter((w) => w.dias_con_registro === 7)
  if (completas.length >= 2) {
    const [antes, ultima] = completas.slice(-2)
    const cambio = antes.ventas ? ultima.ventas / antes.ventas - 1 : null
    if (cambio !== null) {
      items.push({
        key: 'comparacion', label: 'Última semana completa', value: `${cambio >= 0 ? '+' : ''}${pct(cambio)}%`,
        tone: cambio >= 0 ? 'ok' : 'bad', bar: null,
        text: `${ultima.ventas} ventas en la ${ultima.week_label} (${weekRangeLabel(ultima)}) contra ${antes.ventas} la semana anterior.`
      })
    }
  }
  return items
}
