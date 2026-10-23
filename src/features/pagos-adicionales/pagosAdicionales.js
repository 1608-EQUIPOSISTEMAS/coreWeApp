// Pagos Adicionales de FICO (reemplaza el sheet de pagos adicionales, pestaña
// "1. Pago Adicional"). Funciones puras: columnas en el orden del sheet,
// formulario, validacion y payload. El filtrado por encabezado es el generico
// de shared/lib/columnFilters.

import { applyFilters as applyBy, valuesFor as valuesBy, sortRows as sortBy } from '@/shared/lib/columnFilters.js'
import { PROGRAMAS_EN_VIVO, PROGRAMAS_ONLINE, ASUNTOS as ASUNTOS_SHEET, LINEA_PRODUCTO } from './listas.js'

// Los certificados se cobran en FICO > Inscripciones (nav Adicionales), en la
// inscripcion del alumno: este modulo es solo de los pagos fuera de venta.
export const esCertificado = asunto => /\bcert/i.test(String(asunto ?? ''))
export const ASUNTOS = ASUNTOS_SHEET.filter(a => !esCertificado(a))
export const PRIMER_MES = '2026-01'
export const LINEAS = ['EN VIVO', 'ONLINE', 'FUNDACIÓN WE']
export const ESTADOS = ['EFECTUADO', 'PENDIENTE']
export const MONEDAS = ['PEN', 'USD']
export const PROGRAMAS_FUNDACION = ['CONGRESO', 'EVENTO', 'OTROS']

// Mismo orden de encabezados que el sheet (el N° va aparte, es el id).
export const COLUMNS = [
  { key: 'lineaNegocio', label: 'Línea de negocio', kind: 'texto' },
  { key: 'programa', label: 'Programa', kind: 'texto' },
  { key: 'asunto', label: 'Asunto', kind: 'texto' },
  { key: 'fechaPago', label: 'F. pago', kind: 'fecha' },
  { key: 'nombre', label: 'Nombres y apellidos', kind: 'texto' },
  { key: 'celular', label: 'Celular', kind: 'texto' },
  { key: 'correo', label: 'Correo', kind: 'texto' },
  { key: 'estado', label: 'Estado', kind: 'texto' },
  { key: 'realizadoLabel', label: '¿Realizado?', kind: 'texto' },
  { key: 'monto', label: 'Monto', kind: 'monto' },
  { key: 'moneda', label: 'Tipo de moneda', kind: 'texto' },
  { key: 'medioPago', label: 'Medio de pago', kind: 'texto' },
  { key: 'entidadEmpresa', label: 'Entidad empresa', kind: 'texto' },
  { key: 'entidadFinanciera', label: 'Entidad financiera', kind: 'texto' },
  { key: 'nOper', label: 'N° operación', kind: 'texto' },
  { key: 'tipoPrograma', label: 'Tipo programa', kind: 'texto' },
  { key: 'lineaProducto', label: 'Línea de producto', kind: 'texto' },
  { key: 'tipoPago', label: 'Tipo de pago', kind: 'texto' }
]

// "¿Realizado?" es una casilla: se filtra como Sí / No.
export const withLabels = filas => filas.map(f => ({ ...f, realizadoLabel: f.realizado ? 'Sí' : 'No' }))

export const applyFilters = (rows, filters, except = null) => applyBy(rows, filters, COLUMNS, except)
export const valuesFor = (rows, filters, key) => valuesBy(rows, filters, key, COLUMNS)
export const sortRows = (rows, sort = {}) => sortBy(rows, sort, COLUMNS, 'id')

// ── Formulario ─────────────────────────────────────────────────────────────

export function programasDe (linea) {
  if (linea === 'ONLINE') return PROGRAMAS_ONLINE
  if (linea === 'FUNDACIÓN WE') return PROGRAMAS_FUNDACION
  return PROGRAMAS_EN_VIVO
}

// Lo que el sheet calcula con BUSCARV sobre el portafolio.
export const lineaProductoDe = programa => LINEA_PRODUCTO[String(programa ?? '').trim()] || ''

const hoyIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

export function emptyForm (now = new Date()) {
  return {
    business_line: 'EN VIVO',
    program: '',
    subject: '',
    payment_date: hoyIso(now),
    full_name: '',
    phone: '',
    email: '',
    status: 'EFECTUADO',
    done: false,
    amount: null,
    currency: 'PEN',
    cat_payment_medium: null,
    cat_business_entity: null,
    bank_account_id: null,
    transaction_code: '',
    product_line: '',
    payment_type: ''
  }
}

export function formFromFila (f) {
  return {
    business_line: f.lineaNegocio,
    program: f.programa,
    subject: f.asunto,
    payment_date: f.fechaPago,
    full_name: f.nombre,
    phone: f.celular,
    email: f.correo,
    status: f.estado,
    done: !!f.realizado,
    amount: f.monto,
    currency: f.moneda,
    cat_payment_medium: f.catPaymentMedium ?? null,
    cat_business_entity: f.catBusinessEntity ?? null,
    bank_account_id: f.bankAccountId ?? null,
    transaction_code: f.nOper,
    product_line: f.lineaProducto,
    payment_type: f.tipoPago
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const vacio = v => v == null || String(v).trim() === ''

// Errores por campo (la misma regla que valida el backend).
export function validateForm (form) {
  const e = {}
  if (vacio(form.business_line)) e.business_line = 'Elige la línea de negocio.'
  if (vacio(form.program)) e.program = 'Indica el programa.'
  if (vacio(form.subject)) e.subject = 'Indica el asunto.'
  else if (esCertificado(form.subject)) e.subject = 'Los certificados se registran en FICO > Inscripciones.'
  else if (!ASUNTOS.includes(form.subject)) e.subject = 'Elige un asunto de la lista.'
  if (vacio(form.payment_date)) e.payment_date = 'Indica la fecha de pago.'
  else if (form.payment_date < `${PRIMER_MES}-01`) e.payment_date = 'Solo pagos desde enero 2026.'
  if (vacio(form.full_name)) e.full_name = 'Indica nombres y apellidos.'
  if (vacio(form.amount) || !(Number(form.amount) >= 0)) e.amount = 'Indica un monto válido.'
  if (!vacio(form.email) && !EMAIL_RE.test(String(form.email).trim())) e.email = 'Correo inválido.'
  return e
}

const trim = v => (vacio(v) ? null : String(v).trim())

export function buildPayload (form) {
  return {
    business_line: form.business_line,
    program: String(form.program).trim(),
    subject: String(form.subject).trim(),
    payment_date: form.payment_date,
    full_name: String(form.full_name).trim(),
    phone: trim(form.phone),
    email: trim(form.email),
    status: form.status || 'EFECTUADO',
    done: !!form.done,
    amount: Number(form.amount),
    currency: form.currency || 'PEN',
    cat_payment_medium: form.cat_payment_medium || null,
    cat_business_entity: form.cat_business_entity || null,
    bank_account_id: form.bank_account_id || null,
    transaction_code: trim(form.transaction_code),
    product_line: trim(form.product_line),
    payment_type: trim(form.payment_type)
  }
}

// Cuentas de la empresa elegida y de la moneda del pago.
export function cuentasDe (cuentas, empresaId, moneda) {
  if (!empresaId) return []
  return cuentas.filter(a => a.business_entity_catalog_id === empresaId && (!moneda || !a.currency || a.currency === moneda))
}

// ── Exportar ───────────────────────────────────────────────────────────────

export function toExportRows (rows) {
  return [
    ['N°', ...COLUMNS.map(c => c.label)],
    ...rows.map(r => [r.id, ...COLUMNS.map(c => r[c.key] ?? '')])
  ]
}
