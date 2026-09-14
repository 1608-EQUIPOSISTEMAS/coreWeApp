import { useToast } from 'vue-toastification'
import { findMissingRequiredFields } from '../shared/lib/requiredFields.js'

// Bloquea el guardado si algún campo marcado como obligatorio está vacío.
// formRoot: template ref del contenedor del formulario (dentro del modal si lo
// hay, porque BaseModal se teletransporta fuera del árbol de la vista).
export function useRequiredFieldsGuard (formRoot) {
  const toast = useToast()

  return function requiredFieldsFilled () {
    // Sin contenedor montado el guard pasaría siempre: mejor romper en voz alta.
    if (!formRoot.value) throw new Error('useRequiredFieldsGuard: el ref del formulario no está montado')

    const missing = findMissingRequiredFields(formRoot.value)
    if (!missing.length) return true

    const names = missing.map(field => field.label).filter(Boolean)
    toast.warning(names.length
      ? `Completa los campos obligatorios: ${names.join(', ')}`
      : 'Completa los campos obligatorios marcados en rojo')
    bringIntoView(missing[0].control)
    return false
  }
}

function bringIntoView (control) {
  control.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  const focusable = control.matches('input, textarea, select') ? control : control.querySelector('input:not([type="hidden"])')
  focusable?.focus({ preventScroll: true })
}
