// Semana ISO (lunes a domingo) de una fecha calendario 'YYYY-MM-DD'.
//
// Es la misma numeracion que usa la hoja "Seguimiento Docentes" y el Control
// de Ediciones del backend (isoWeekRange), asi que SEM 23 tiene que dar el
// mismo lunes en los tres lados.
//
// Toda la aritmetica va sobre Date LOCAL: construir en UTC y leer con getters
// locales corre cada fecha un dia atras (memory/fechas-utc-en-lima).

function ymdLocal (date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isoWeekOf (ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7 // 0 = lunes
  const monday = new Date(y, m - 1, d - weekday)
  // El anio ISO lo define el JUEVES de la semana, no el lunes: por eso el
  // 01/01/2026 cae en la SEM 1 cuya semana arranca el 29/12/2025.
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3)
  const jan1 = new Date(thursday.getFullYear(), 0, 1)
  const week = Math.floor((thursday - jan1) / 86400000 / 7) + 1
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return {
    year: thursday.getFullYear(),
    week,
    key: `${thursday.getFullYear()}-${String(week).padStart(2, '0')}`,
    monday: ymdLocal(monday),
    sunday: ymdLocal(sunday)
  }
}
