import { onBeforeUnmount } from 'vue'

// Fecha-hora actual redondeada a la hora en punto, en formato 'YYYY-MM-DD HH:00:00'.
// Verbatim de currentHourIso de useLeadForm.
export function currentHourIso () {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:00:00`
}

// Intento de contacto vacio por defecto (tipo llamada, pendiente, hora actual).
export function createEmptyAttempt () {
  return {
    cat_type_attempt: 'we_attempt_call',
    calling_alias: 'we_calling_pending',
    fechaContactoProximo: currentHourIso(),
    respuesta: '',
    contact_duration: 0,
    timerActive: false,
    timerId: null
  }
}

// Gestion de los intentos de contacto del formulario de lead (CRUD + cronometro
// inline). Espejo de addContacto/removeContacto/toggleTimer/handleTypeChange de
// useLeadForm. form: objeto reactivo con `contactos` (array).
//
// Higiene de timers reforzada: removeContacto limpia el interval del item antes de
// quitarlo (el SFC hacia splice directo, dejando el cronometro corriendo -> leak
// señalado en el plan FSD). onBeforeUnmount limpia todos los cronometros activos.
export function useManageContactAttempts (form) {
  function toggleTimer (attempt) {
    if (attempt.timerActive) {
      clearInterval(attempt.timerId); attempt.timerActive = false; attempt.timerId = null
    } else {
      attempt.timerActive = true
      attempt.timerId = setInterval(() => { attempt.contact_duration = (attempt.contact_duration || 0) + 1 }, 1000)
    }
  }

  function stopAllTimers () {
    (form.contactos || []).forEach(item => {
      if (item.timerId) { clearInterval(item.timerId); item.timerId = null; item.timerActive = false }
    })
  }

  function addContacto () {
    form.contactos.push(createEmptyAttempt())
  }

  function removeContacto (idx) {
    const item = form.contactos[idx]
    if (item?.timerId) clearInterval(item.timerId)
    form.contactos.splice(idx, 1)
  }

  function handleTypeChange (contacto, newVal) {
    contacto.cat_type_attempt = newVal
    if (newVal !== 'we_attempt_call') {
      contacto.calling_alias = 'we_calling_message'
      if (contacto.timerActive) { clearInterval(contacto.timerId); contacto.timerActive = false; contacto.timerId = null }
      contacto.contact_duration = 0
    } else {
      contacto.calling_alias = 'we_calling_pending'
    }
  }

  onBeforeUnmount(stopAllTimers)

  return {
    toggleTimer,
    stopAllTimers,
    addContacto,
    removeContacto,
    handleTypeChange,
    createEmptyAttempt,
    currentHourIso
  }
}
