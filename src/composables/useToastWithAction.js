import { useToast } from 'vue-toastification'
import { h } from 'vue'

/**
 * Toast con titulo, mensaje y un boton de accion opcional.
 * Permite mostrar errores con contexto y un atajo a la accion correctiva.
 *
 * Ejemplo:
 *   const t = useToastWithAction()
 *   t.errorWithAction({
 *     title: 'No se pudo confirmar',
 *     message: 'Faltan ediciones por elegir',
 *     actionLabel: 'Revisar convalidaciones',
 *     onAction: () => scrollToConvalidacion()
 *   })
 */
export function useToastWithAction () {
  const toast = useToast()

  function _content ({ title, message, actionLabel, onAction }) {
    return {
      render () {
        const children = []
        if (title) {
          children.push(h('div', { style: 'font-weight:700;font-size:13px;margin-bottom:4px' }, title))
        }
        if (message) {
          children.push(h('div', { style: 'font-size:12px;line-height:1.4;white-space:pre-wrap' }, message))
        }
        if (actionLabel && typeof onAction === 'function') {
          children.push(h('button', {
            style: 'margin-top:8px;padding:4px 10px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:6px;cursor:pointer',
            onClick (ev) {
              ev.stopPropagation()
              onAction()
            }
          }, actionLabel))
        }
        return h('div', { style: 'display:flex;flex-direction:column' }, children)
      }
    }
  }

  function errorWithAction (opts) {
    const { timeout = 8000 } = opts
    return toast.error(_content(opts), { timeout, closeOnClick: false })
  }

  function warningWithAction (opts) {
    const { timeout = 8000 } = opts
    return toast.warning(_content(opts), { timeout, closeOnClick: false })
  }

  function successWithAction (opts) {
    const { timeout = 6000 } = opts
    return toast.success(_content(opts), { timeout, closeOnClick: false })
  }

  return { errorWithAction, warningWithAction, successWithAction, base: toast }
}
