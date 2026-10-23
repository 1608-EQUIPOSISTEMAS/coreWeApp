// Filtros por encabezado al estilo Excel, sin dominio. Las columnas son
// { key, label, kind } con kind 'texto' (lista de valores + buscador), 'fecha'
// o 'monto' (suman un rango). Estado por columna:
//   { values: string[] | null, text: '', min: '', max: '' }
// values null = todas (sin filtro de lista). Las columnas se combinan con Y.

export const VACIAS = '(Vacías)'

export const cellKey = v => (v === null || v === undefined || v === '' ? VACIAS : String(v))

const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filled = v => v !== '' && v != null

export function isActive (f) {
  return !!f && (Array.isArray(f.values) || !!f.text?.trim() || filled(f.min) || filled(f.max))
}

const kindOf = (columns, key) => columns.find(c => c.key === key)?.kind ?? 'texto'

function passes (row, key, f, kind) {
  const v = row[key]
  if (Array.isArray(f.values) && !f.values.includes(cellKey(v))) return false
  if (f.text?.trim() && !fold(v).includes(fold(f.text.trim()))) return false
  if (kind === 'monto') {
    if (filled(f.min) && !(Number(v) >= Number(f.min))) return false
    if (filled(f.max) && !(Number(v) <= Number(f.max))) return false
  } else if (kind === 'fecha') {
    if (f.min && !(v >= f.min)) return false
    if (f.max && !(v <= f.max)) return false
  }
  return true
}

export function applyFilters (rows, filters, columns, except = null) {
  const active = Object.entries(filters).filter(([k, f]) => k !== except && isActive(f))
  if (!active.length) return rows
  return rows.filter(r => active.every(([k, f]) => passes(r, k, f, kindOf(columns, k))))
}

// Valores de la lista de una columna, como Excel: salen de las filas que pasan
// los DEMAS filtros (asi la lista se achica al combinar). Con su conteo.
export function valuesFor (rows, filters, key, columns) {
  const counts = new Map()
  for (const r of applyFilters(rows, filters, columns, key)) {
    const k = cellKey(r[key])
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  const kind = kindOf(columns, key)
  return [...counts.entries()]
    .map(([value, n]) => ({ value, n }))
    .sort((a, b) => {
      if (a.value === VACIAS) return 1
      if (b.value === VACIAS) return -1
      return kind === 'monto' ? Number(a.value) - Number(b.value) : a.value.localeCompare(b.value, 'es')
    })
}

export const activeCount = filters => Object.values(filters).filter(isActive).length

// Orden por una columna; los vacios van al final y `idKey` desempata para que
// el orden sea estable.
export function sortRows (rows, { key, dir } = {}, columns, idKey) {
  if (!key) return rows
  const kind = kindOf(columns, key)
  const sign = dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = a[key]
    const y = b[key]
    if (x == null || x === '') return 1
    if (y == null || y === '') return -1
    const c = kind === 'monto' ? x - y : String(x).localeCompare(String(y), 'es')
    return c * sign || a[idKey] - b[idKey]
  })
}
