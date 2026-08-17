// Filtro de columna por rango de fechas, compartido por todas las tablas del ERP.
//
// Las fechas llegan de la BD en ISO ('2026-08-14' o '2026-08-14T05:00:00.000Z')
// y a veces ya formateadas ('14/08/2026'). Se normaliza a YYYY-MM-DD y se compara
// como TEXTO: con largo fijo y ceros a la izquierda, el orden alfabetico ES el
// cronologico. Asi se evita construir Date y arrastrar el corrimiento de zona
// horaria cuando el server Node corre en UTC y el navegador en Lima.

const pad = n => String(n).padStart(2, '0')

export function toIsoDay (value) {
  const text = String(value ?? '')

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`

  const date = new Date(text)
  return isNaN(date) ? '' : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// flatpickr en modo rango entrega "2026-08-01 a 2026-08-14"; mientras se elige
// el segundo dia manda uno solo, y ahi el rango es ese unico dia.
export function inDateRange (value, rangeString) {
  const day = toIsoDay(value)
  if (!day) return false

  const [from, to = from] = String(rangeString || '').split(' a ').map(part => part.trim())
  return !!from && day >= from && day <= to
}
