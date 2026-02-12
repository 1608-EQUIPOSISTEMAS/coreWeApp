// src/directives/restrict.js

function sanitize(value, cfg) {
  let out = String(value ?? '')

  // 1. REGLA INMEDIATA: Evitar espacios al inicio siempre si trim está activo
  if (cfg.trim) {
    out = out.replace(/^\s+/, '') // Elimina espacios a la izquierda inmediatamente
  }

  // "only" tiene prioridad
  if (cfg.only === 'numbers') out = out.replace(/[^0-9]/g, '')
  else if (cfg.only === 'letters')
    out = out.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')

  // Filtros finos
  if (cfg.numbers === false) out = out.replace(/[0-9]/g, '')
  if (cfg.letters === false) out = out.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '')
  if (cfg.spaces === false)  out = out.replace(/\s+/g, '')

  // Extra permitidos
  if (cfg.allowExtra && cfg.allowExtra.length) {
    // Lógica para re-permitir caracteres (si fuera necesaria)
  }

  if (typeof cfg.max === 'number') out = out.slice(0, cfg.max)

  if (cfg.transform === 'upper') out = out.toUpperCase()
  if (cfg.transform === 'lower') out = out.toLowerCase()

  return out
}

function attach(el, cfg) {
  // Handler para el evento INPUT (mientras escribes)
  const inputHandler = () => {
    const prev = el.value
    const next = sanitize(prev, cfg)
    if (next !== prev) {
      el.value = next
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  // Handler para el evento BLUR (cuando sales del campo)
  // Aquí es seguro quitar los espacios del final
  const blurHandler = () => {
    if (cfg.trim) {
      const prev = el.value
      const next = prev.trim() // Quita espacios al inicio y final
      if (next !== prev) {
        el.value = next
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  el.__restrict_cfg__ = cfg
  el.__restrict_handler__ = inputHandler
  el.__restrict_blur_handler__ = blurHandler // Guardamos referencia para limpiar después

  el.addEventListener('input', inputHandler)
  // Agregamos el listener de BLUR
  el.addEventListener('blur', blurHandler)
  
  el.addEventListener('paste', () => setTimeout(inputHandler, 0))
  el.addEventListener('drop',  () => setTimeout(inputHandler, 0))
}

function detach(el) {
  if (el.__restrict_handler__) {
    el.removeEventListener('input', el.__restrict_handler__)
    el.removeEventListener('paste', el.__restrict_handler__)
    el.removeEventListener('drop',  el.__restrict_handler__)
  }
  // Limpiamos el evento blur
  if (el.__restrict_blur_handler__) {
    el.removeEventListener('blur', el.__restrict_blur_handler__)
  }
  
  delete el.__restrict_cfg__
  delete el.__restrict_handler__
  delete el.__restrict_blur_handler__
}

export default {
  mounted(el, binding) {
    // Por defecto trim: true para que siempre limpie, salvo que lo desactives
    const cfg = Object.assign(
      { numbers: true, letters: true, spaces: true, max: null, transform: null, only: null, allowExtra: '', trim: true },
      binding.value || {}
    )
    attach(el, cfg)
  },
  updated(el, binding) {
    if (JSON.stringify(binding.value) !== JSON.stringify(el.__restrict_cfg__)) {
      detach(el)
      const cfg = Object.assign(
        { numbers: true, letters: true, spaces: true, max: null, transform: null, only: null, allowExtra: '', trim: true },
        binding.value || {}
      )
      attach(el, cfg)
      // Opcional: Ejecutar handler una vez al actualizar
      // el.__restrict_handler__?.() 
    }
  },
  unmounted(el) {
    detach(el)
  }
}