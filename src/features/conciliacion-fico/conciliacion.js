// Conciliacion hoja FICO <-> BD (backend: fico/reconciliation). El backend
// devuelve SOLO las filas con diferencias, cada una con hallazgos { code,
// severity, message }. Aqui vive lo que la vista necesita decidir: como se
// llama cada hallazgo, que tono lleva, la frase del veredicto y el filtrado.

// Nombre corto de cada hallazgo y que hacer con el. El orden es el de la
// lista de filtros: primero lo que mueve plata, despues la forma.
export const HALLAZGOS = {
  MISSING_IN_DB: { label: 'Falta en el sistema', accion: 'La fila no se importó: revisar el error de importación o registrarla.' },
  NOT_IN_SHEET: { label: 'No está en la hoja', accion: 'Inscripción sin fila en la hoja: confirmar de dónde viene o anularla.' },
  EXCLUDED_BUT_ACTIVE: { label: 'R activa', accion: 'La hoja la marca R: retirarla en el sistema.' },
  DUPLICATE_IN_DB: { label: 'Duplicada', accion: 'Más de una inscripción para la misma fila: anular la sobrante.' },
  INACTIVE_IN_DB: { label: 'Retirada en el sistema', accion: 'La hoja la trae activa: confirmar cuál está bien.' },
  MOVE_NOT_APPLIED: { label: 'RP/CC no aplicada', accion: 'La hoja marca RP o CC y el origen sigue activo: hacer la reprogramación o el cambio de curso desde el origen y anular el destino suelto.' },
  MOVE_SPLIT_IMPORT: { label: 'RP/CC partida', accion: 'El destino se importó como inscripción suelta: rehacerlo con la RP/CC desde el origen.' },
  MOVE_DESTINATION_MISSING: { label: 'RP/CC sin destino', accion: 'El origen está en RP/CC pero ninguna inscripción viene de él.' },
  MOVE_TYPE_MISMATCH: { label: 'RP o CC cruzado', accion: 'La hoja dice RP y el sistema CC (o al revés): RP es el mismo programa, CC otro programa.' },
  MODULE_MOVE_NOTE: { label: 'Movimiento de módulo', accion: 'La observación anota una RP/CC de un módulo hijo: revisar a mano.' },
  TOTAL_MISMATCH: { label: 'Total distinto', accion: 'Ajustar el total al de la hoja (INGRESO + SALDO).' },
  PAID_MISMATCH: { label: 'Pagos distintos', accion: 'Lo cobrado en la hoja no coincide con los pagos registrados.' },
  INSTALLMENTS_MISSING: { label: 'Faltan cuotas', accion: 'Crear las cuotas de la hoja que no existen.' },
  PENDING_MISMATCH: { label: 'Deuda distinta', accion: 'El SALDO de la hoja no coincide con las cuotas pendientes.' },
  PAID_WITHOUT_PAYMENT: { label: 'Pagada sin pago', accion: 'Cuota marcada pagada sin pago registrado: registrar el pago.' },
  PAYMENT_DATA_MISSING: { label: 'Pago sin datos', accion: 'Pagos sin cuenta, entidad empresa, medio o N° de operación que la hoja sí trae: completarlos.' },
  CHILDREN_MISMATCH: { label: 'Aulas hijas', accion: 'El paquete no tiene todas sus aulas hijas.' },
  MEMBERSHIP_MISSING: { label: 'Sin membresía', accion: 'Miembro en la hoja (col J) sin membresía en la inscripción.' },
  AGENT_MISMATCH: { label: 'Asesor distinto', accion: 'Corregir el asesor según la columna AS.' },
  REGISTRATION_DATE_MISMATCH: { label: 'Fecha distinta', accion: 'Alinear la fecha de inscripción con F. REGISTRO.' }
}

const ORDEN = Object.keys(HALLAZGOS)

export const labelOf = (code) => HALLAZGOS[code]?.label ?? code
export const accionOf = (code) => HALLAZGOS[code]?.accion ?? ''
export const toneOf = (severity) => (severity === 'error' ? 'bad' : 'warn')

// Solo hojas de Google: el backend baja el CSV de la pestaña del link.
export function isSheetUrl (url) {
  return /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+/.test(String(url || '').trim())
}

// Links a mandar: sin vacios ni repetidos, en el orden en que se cargaron (el
// orden importa: si una fila se repite entre hojas, manda la ultima).
export function hojasListas (urls) {
  const out = []
  for (const u of urls || []) {
    const v = String(u || '').trim()
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

// Frase de arriba: cuanto de lo que se importo coincide con el sistema.
export function veredicto (summary) {
  const { in_scope: enAlcance = 0, ok = 0, with_findings: conDif = 0, errors = 0 } = summary || {}
  if (!conDif) {
    return { tono: 'ok', titulo: 'Todo coincide', texto: `Las ${enAlcance} filas en alcance coinciden con el sistema.` }
  }
  if (!errors) {
    return { tono: 'warn', titulo: 'Solo detalles', texto: `${conDif} filas con diferencias de forma (fecha, asesor o datos de pago); ningún monto distinto.` }
  }
  return {
    tono: 'bad',
    titulo: 'Hay que corregir',
    texto: `${errors} filas con errores y ${conDif - errors} solo con advertencias. Coinciden ${ok} de ${enAlcance} filas en alcance.`
  }
}

export function kpis (summary) {
  const s = summary || {}
  return [
    {
      clave: 'alcance',
      label: 'Filas comparadas',
      valor: s.in_scope ?? 0,
      nota: `${s.out_of_scope ?? 0} de ediciones históricas, fuera de alcance` +
        (s.repeated_across_sheets ? ` · ${s.repeated_across_sheets} repetidas entre hojas` : ''),
      icono: 'fa-table-list',
      tono: null
    },
    { clave: 'ok', label: 'Coinciden', valor: s.ok ?? 0, nota: 'Igual en la hoja y en el sistema', icono: 'fa-circle-check', tono: 'ok' },
    { clave: 'errores', label: 'Con errores', valor: s.errors ?? 0, nota: 'Montos, cuotas, faltantes o duplicados', icono: 'fa-circle-xmark', tono: s.errors ? 'bad' : null },
    { clave: 'avisos', label: 'Solo advertencias', valor: (s.with_findings ?? 0) - (s.errors ?? 0), nota: 'Fecha, asesor o datos de pago', icono: 'fa-triangle-exclamation', tono: (s.with_findings ?? 0) - (s.errors ?? 0) ? 'warn' : null }
  ]
}

// Botones de filtro por tipo de hallazgo, con su conteo y tono (error si alguna
// fila lo trae como error). Ordenados como HALLAZGOS.
export function filtrosPorTipo (rows) {
  const porCodigo = new Map()
  for (const r of rows || []) {
    for (const f of r.findings) {
      const actual = porCodigo.get(f.code) || { code: f.code, n: 0, tono: 'warn' }
      actual.n++
      if (f.severity === 'error') actual.tono = 'bad'
      porCodigo.set(f.code, actual)
    }
  }
  const pos = (c) => (ORDEN.includes(c) ? ORDEN.indexOf(c) : ORDEN.length)
  return [...porCodigo.values()]
    .sort((a, b) => pos(a.code) - pos(b.code))
    .map(f => ({ ...f, label: labelOf(f.code) }))
}

// Filas que traen al menos un hallazgo del tipo y de la severidad elegidos.
// severidad: 'todas' | 'error' | 'warning'; codigo: null = todos.
export function filtrarFilas (rows, { codigo = null, severidad = 'todas', texto = '' } = {}) {
  const q = String(texto || '').trim().toLowerCase()
  return (rows || []).filter(r => {
    const coincide = r.findings.some(f =>
      (!codigo || f.code === codigo) && (severidad === 'todas' || f.severity === severidad))
    if (!coincide) return false
    if (!q) return true
    return [r.student, r.document_number, r.enrollment_id, r.row_number]
      .some(v => String(v ?? '').toLowerCase().includes(q))
  })
}

// Errores primero dentro de la fila: lo que mueve plata se lee antes.
export function hallazgosOrdenados (findings) {
  const peso = (f) => (f.severity === 'error' ? 0 : 1)
  return [...(findings || [])].sort((a, b) => peso(a) - peso(b) || ORDEN.indexOf(a.code) - ORDEN.indexOf(b.code))
}

// --- Correcciones (Fase 3) --------------------------------------------------
// Cada fila trae `fixes`: { action, label, risk: 'low' | 'high', description,
// changes, blocked }. 'low' no cambia montos ni crea o anula inscripciones (se
// aplica en lote o con un clic); 'high' se confirma una por una. `blocked` es el
// motivo por el que esa correccion no se puede hacer sola: el boton se muestra
// deshabilitado con el motivo.

// Lo que el backend necesita para encontrar la fila en su propia conciliacion.
export function pedidoDe (row, fix) {
  return { action: fix.action, enrollment_id: row.enrollment_id ?? null, row_number: row.row_number ?? null, sheet: row.sheet ?? null }
}

export const esBajoRiesgo = (fix) => fix.risk === 'low' && !fix.blocked

// Correcciones de bajo riesgo de las filas dadas (las que se aplican en lote).
export function correccionesBajoRiesgo (rows) {
  const out = []
  for (const r of rows || []) for (const f of r.fixes || []) if (esBajoRiesgo(f)) out.push({ row: r, fix: f })
  return out
}

// "Corregir fecha: 12 · Registrar pagos: 3" para el modal del lote.
export function conteoPorAccion (items) {
  const m = new Map()
  for (const { fix } of items || []) m.set(fix.label, (m.get(fix.label) || 0) + 1)
  return [...m.entries()].map(([label, n]) => ({ label, n }))
}

// Frase del resultado de aplicar correcciones.
export function resumenResultado (res) {
  const { applied = 0, failed = 0 } = res || {}
  if (!failed) return { tono: 'ok', titulo: applied === 1 ? 'Corrección aplicada' : `${applied} correcciones aplicadas`, texto: 'Se volvió a conciliar con los datos nuevos.' }
  if (!applied) return { tono: 'bad', titulo: failed === 1 ? 'No se aplicó la corrección' : `No se aplicó ninguna de las ${failed} correcciones`, texto: 'Mira el motivo de cada una abajo.' }
  return { tono: 'warn', titulo: `${applied} aplicadas, ${failed} sin aplicar`, texto: 'Mira el motivo de las que no se aplicaron abajo.' }
}
