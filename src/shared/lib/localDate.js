// Fecha 'YYYY-MM-DD' en la hora LOCAL del navegador (Lima para el equipo).
// No usar toISOString().slice(0, 10): eso es UTC, y desde las 19:00 en Lima
// ya devuelve el día siguiente (un tope "hasta hoy" dejaba registrar mañana).
export function toLocalIsoDate (d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
