// Descarga un CSV que Excel abre directo: BOM para las tildes en UTF-8 y los
// textos tipo DNI/celular con prefijo tab, o Excel se come los ceros a la
// izquierda y el "+51" al leerlos como numero.
const LOOKS_NUMERIC_ID = /^\+?\d[\d\s]{5,}$/

const escapeCell = value => {
  const s = value == null ? '' : String(value)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv (rows, { textColumns = [] } = {}) {
  const asText = new Set(textColumns)
  const cells = rows.map((row, i) => row.map((v, col) =>
    i > 0 && asText.has(col) && LOOKS_NUMERIC_ID.test(String(v ?? '')) ? `\t${v}` : v))
  return '﻿' + cells.map(r => r.map(escapeCell).join(',')).join('\n')
}

export function downloadCsv (filename, rows, options) {
  const url = URL.createObjectURL(new Blob([toCsv(rows, options)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
