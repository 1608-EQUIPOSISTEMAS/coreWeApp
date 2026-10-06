// Texto comparable para buscar: minusculas y sin tildes, asi "Garcia" encuentra
// a "García". Un valor vacio o nulo se vuelve '' para que .includes no falle.
export function normalizeText (value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Iniciales del nombre (maximo dos) para un avatar. Sin nombre devuelve '':
// cada vista decide su relleno ('·', '--').
export function initials (name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}
