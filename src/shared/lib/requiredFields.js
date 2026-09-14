// "Obligatorio" tiene una sola fuente de verdad: lo que el formulario pinta en
// rojo. Se lee del DOM (y no de una lista de campos por vista) para que nunca se
// pueda guardar algo que en pantalla se ve marcado como faltante.

// Controles compuestos que pintan el faltante con clase propia: su input
// interno no lleva `required` o es readonly, así que la validación nativa no
// los ve.
const MARKED_MISSING = '.searchselect-control.has-error, .base-datepicker-wrapper.has-error, .dt12--error'
const NATIVE_REQUIRED = 'input[required], textarea[required], select[required]'

export function findMissingRequiredFields (root) {
  const marked = [...root.querySelectorAll(MARKED_MISSING)]
  const native = [...root.querySelectorAll(NATIVE_REQUIRED)]
    .filter(control => control.willValidate && !control.validity.valid)
    .filter(control => !marked.some(wrapper => wrapper.contains(control)))

  return [...marked, ...native]
    .filter(control => !isHiddenByVShow(control))
    .sort(byDocumentOrder)
    .map(control => ({ control, label: labelOf(control) }))
}

// ponytail: solo detecta v-show (display:none en línea) y [hidden]; ocultar por
// clase CSS no se ve sin layout. Si aparece ese caso, pasar a getClientRects().
function isHiddenByVShow (control) {
  return !!control.closest('[style*="display: none"], [hidden]')
}

function byDocumentOrder (a, b) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

// El label no siempre envuelve al control (va de hermano en la columna), así
// que se busca el label con texto más cercano que lo preceda.
function labelOf (control) {
  for (let node = control.parentElement; node; node = node.parentElement) {
    const preceding = [...node.querySelectorAll('label')]
      .filter(label => !label.contains(control) && label.textContent.trim())
      .filter(label => label.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING)
    if (preceding.length) return preceding.at(-1).textContent.replace('*', '').trim()
  }
  // Sin label (tablas de intentos): el placeholder vive en el input interno del wrapper.
  return control.getAttribute('placeholder') ?? control.querySelector('input')?.getAttribute('placeholder') ?? ''
}
