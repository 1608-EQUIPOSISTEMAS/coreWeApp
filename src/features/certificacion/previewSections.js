// Que se muestra antes de confirmar "Certificar en Odoo", a partir de la vista
// previa del backend (classifyCertificationPreview). Orden = lo que hay que
// resolver primero. Tono para ds-pill: ok | warn | bad | ''.
const SECTIONS = [
  { key: 'ready', label: 'Se certifican ahora', tone: 'ok' },
  { key: 'not_in_odoo', label: 'No están en el aula de Odoo (sin nota ni certificado)', tone: 'bad', hint: 'Matricúlalos en el aula de Odoo o corrige su nombre y vuelve a certificar.' },
  { key: 'with_debt', label: 'Con cuotas vencidas: reciben nota, no certificado', tone: 'warn' },
  { key: 'likely_failed', label: 'Probablemente desaprobados (nota del ERP menor a 12; Odoo decide con su nota)', tone: 'warn' },
  { key: 'without_grade', label: 'Sin nota guardada en el ERP', tone: 'warn', hint: 'Si deben certificarse, carga y guarda su nota antes.' },
  { key: 'already_certified', label: 'Ya tenían certificado (no se duplica)', tone: '' }
]

export function previewSections (preview) {
  if (preview.odoo_classroom_empty) {
    return [{ key: 'empty', label: 'El aula de Odoo no tiene a ninguno de estos alumnos', tone: 'bad', names: [], hint: 'Revisa que el aula de Odoo tenga a los alumnos matriculados antes de certificar.' }]
  }
  return SECTIONS
    .map((s) => ({ ...s, names: preview[s.key] || [] }))
    .filter((s) => s.names.length)
}

export const readyCount = (preview) => (preview.odoo_classroom_empty ? 0 : (preview.ready || []).length)
