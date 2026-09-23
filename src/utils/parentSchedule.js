// Horario "efectivo" de una edicion padre (Especializacion, Diploma, PEE).
//
// Regla de negocio: el padre no tiene frecuencia propia — en la BD sus
// cat_day_combination_id / cat_hour_combination_id vienen nulos. Quien dicta el
// dia y la hora son sus hijos, asi que el padre arranca cuando arranca el hijo
// mas temprano y su frecuencia es la union de las de sus hijos.
//
// Es la misma regla que aplica sp_edition_extra_info_caller sobre el historial,
// y tiene que seguir siendo la misma: si divergen, la fila "SELECCION" del
// analisis de tiempos se compararia contra un criterio distinto al del resto.

// children: [{ start_date, day_label, hour_label }]. Devuelve null si todavia no
// hay ningun hijo con fecha (padre recien abierto, sin nada que comparar).
export function parentScheduleFromChildren (children = []) {
  const scheduled = children.filter(child => child?.start_date)
  if (scheduled.length === 0) return null

  return {
    start_date: earliestStartDate(scheduled),
    day_combination_label: joinDistinctLabels(scheduled, 'day_label'),
    hour_combination_label: joinDistinctLabels(scheduled, 'hour_label')
  }
}

// Ordenamos como texto, no como Date: las fechas llegan en ISO (YYYY-MM-DD...),
// donde el orden alfabetico ya es el cronologico, y asi no entra la zona horaria
// a correr un dia la fecha.
function earliestStartDate (children) {
  return children.map(child => child.start_date).sort()[0].slice(0, 10)
}

function joinDistinctLabels (children, field) {
  const labels = [...new Set(children.map(child => child[field]).filter(Boolean))]
  return labels.join(' / ') || '—'
}
