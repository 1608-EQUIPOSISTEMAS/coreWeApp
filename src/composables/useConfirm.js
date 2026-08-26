import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const baseConfig = {
  buttonsStyling: false,
  reverseButtons: true,
  customClass: {
    popup:       'swal-popup',
    title:       'swal-title',
    htmlContainer: 'swal-text',
    confirmButton: 'swal-btn swal-btn-primary',
    cancelButton:  'swal-btn swal-btn-ghost',
    denyButton:    'swal-btn swal-btn-danger',
    actions:     'swal-actions',
    icon:        'swal-icon'
  }
}

/**
 * Confirm dialog con estilo alineado al design system v2.
 * Devuelve true si el usuario confirma, false si cancela.
 *
 * `html` es la alternativa a `text` cuando el mensaje necesita estructura
 * (varios parrafos, una cifra resaltada). SweetAlert escribe `text` como
 * textContent, asi que ahi los saltos de linea no se ven. Solo se le pasa
 * markup propio: nunca dato del usuario sin escapar.
 */
export async function confirmAction ({
  title,
  text,
  html,
  confirmText = 'Confirmar',
  cancelText  = 'Cancelar',
  icon        = 'question',
  danger      = false
} = {}) {
  const res = await Swal.fire({
    ...baseConfig,
    title,
    ...(html ? { html } : { text }),
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText:  cancelText,
    customClass: {
      ...baseConfig.customClass,
      confirmButton: `swal-btn ${danger ? 'swal-btn-danger' : 'swal-btn-primary'}`
    }
  })
  return res.isConfirmed
}

/**
 * Success toast, breve y autocerrable.
 */
export function successToast (title) {
  Swal.fire({
    ...baseConfig,
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 2400,
    timerProgressBar: true
  })
}
