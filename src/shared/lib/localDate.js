// Fecha 'YYYY-MM-DD' en la hora LOCAL del navegador (Lima para el equipo).
// No usar toISOString().slice(0, 10): eso es UTC, y desde las 19:00 en Lima
// ya devuelve el día siguiente (un tope "hasta hoy" dejaba registrar mañana).
export function toLocalIsoDate (d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Fecha calendario ('YYYY-MM-DD', con o sin hora pegada) tal cual viene de la
// BD. new Date('2026-08-01') es medianoche UTC = 31/07 19:00 en Lima: leerla
// con getters locales corre la cuota un día atrás. Por eso un string se corta
// como texto y solo un Date se lee en hora local.
export function toCalendarIsoDate (value) {
  if (!value) return null
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) return m[1]
  }
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : toLocalIsoDate(d)
}

// Suma días a una fecha calendario. La aritmética va en UTC (sin horario de
// verano ni corrimiento de zona) y el resultado vuelve como 'YYYY-MM-DD'.
export function addDaysIso (iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// Regla UNICA de "cuota vencida" (Fase 3): vence ANTES de hoy en Lima. La que
// vence hoy no esta vencida (igual que Cobranzas en el backend: state 'today').
// Acepta 'YYYY-MM-DD' (BD), 'DD/MM/YYYY' (vistas de Comercial) o Date. Antes
// habia tres copias que comparaban contra el instante actual y leian la fecha
// en UTC: la de hoy salia vencida y, desde las 19:00, tambien la de mañana.
export function isPastDue (dueDate, today = toLocalIsoDate()) {
  if (typeof dueDate === 'string') {
    const dmy = dueDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}` < today
  }
  const iso = toCalendarIsoDate(dueDate)
  return iso ? iso < today : false
}
