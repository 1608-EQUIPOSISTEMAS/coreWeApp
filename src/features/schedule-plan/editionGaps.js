// D.A. / D.P. del planificador: días contra la edición anterior y la siguiente
// DEL MISMO PROGRAMA, los mismos que el cronograma real muestra desde
// calc_da/calc_dp del SP.
//
// En el plan se calculan aquí, y no se piden al backend, por dos razones: el
// item del plan poda calc_da/calc_dp al copiar (son del año de origen) y las
// fechas se mueven a mano, así que el único número honesto es el que sale del
// escenario que el usuario tiene delante.

const DIA_MS = 86400000

// Dos ediciones del mismo programa a menos de un mes se canibalizan: la segunda
// sale a la venta antes de que la primera termine de llenarse. Es el mismo
// umbral con el que el "Análisis de Tiempos" del cronograma real pinta en rojo.
export const DIAS_MINIMOS_ENTRE_EDICIONES = 30
const partes = iso => String(iso || '').slice(0, 10).split('-').map(Number)

// Aritmética entera en UTC: en Lima (UTC-5) leer con getters locales una fecha
// creada en UTC corre el día hacia atrás.
export function diasEntre (desde, hasta) {
  const [y1, m1, d1] = partes(desde)
  const [y2, m2, d2] = partes(hasta)
  if (!y1 || !y2) return null
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DIA_MS)
}

// Los arrastres del año anterior entran al cálculo a propósito: una edición que
// sigue dictándose ES la anterior real de su programa.
//
// ponytail: agrupa por versión de programa; el SP agrupa por programa, así que
// dos versiones del mismo curso salen como series separadas.
export function editionGapsByUid (items = []) {
  const series = {}
  for (const item of items) {
    if (!item?.start_date) continue
    const clave = item.program_version_id
    ;(series[clave] || (series[clave] = [])).push(item)
  }

  const gaps = {}
  for (const serie of Object.values(series)) {
    serie.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
    serie.forEach((item, i) => {
      gaps[item.uid] = {
        antes: diasEntre(serie[i - 1]?.start_date, item.start_date),
        despues: diasEntre(item.start_date, serie[i + 1]?.start_date)
      }
    })
  }
  return gaps
}
