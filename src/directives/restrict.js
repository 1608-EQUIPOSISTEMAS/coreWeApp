// src/directives/restrict.js
function sanitize(value, cfg) {
  let out = String(value ?? '')

  // "only" tiene prioridad
  if (cfg.only === 'numbers') out = out.replace(/[^0-9]/g, '')
  else if (cfg.only === 'letters')
    out = out.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')

  // Filtros finos (se aplican si no usaste "only")
  if (cfg.numbers === false) out = out.replace(/[0-9]/g, '')
  if (cfg.letters === false) out = out.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '')
  if (cfg.spaces === false)  out = out.replace(/\s+/g, '')

  // Extra permitidos (ej: '-_@.')
  if (cfg.allowExtra && cfg.allowExtra.length) {
    const extra = cfg.allowExtra.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    // vuelve a permitir los extra si fueron eliminados por reglas previas
    // (opcional: normalmente con "only" te basta)
  }

  if (typeof cfg.max === 'number') out = out.slice(0, cfg.max)

  if (cfg.transform === 'upper') out = out.toUpperCase()
  if (cfg.transform === 'lower') out = out.toLowerCase()

  return out
}

function attach(el, cfg) {
  const handler = () => {
    const prev = el.value
    const next = sanitize(prev, cfg)
    if (next !== prev) {
      el.value = next
      // notifica a v-model
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
  el.__restrict_cfg__ = cfg
  el.__restrict_handler__ = handler

  el.addEventListener('input', handler)
  el.addEventListener('paste', () => setTimeout(handler, 0))
  el.addEventListener('drop',  () => setTimeout(handler, 0))
}

function detach(el) {
  if (el.__restrict_handler__) {
    el.removeEventListener('input', el.__restrict_handler__)
    el.removeEventListener('paste', el.__restrict_handler__)
    el.removeEventListener('drop',  el.__restrict_handler__)
  }
  delete el.__restrict_cfg__
  delete el.__restrict_handler__
}

export default {
  mounted(el, binding) {
    const cfg = Object.assign(
      { numbers: true, letters: true, spaces: true, max: null, transform: null, only: null, allowExtra: '' },
      binding.value || {}
    )
    attach(el, cfg)
  },
  updated(el, binding) {
    // si cambia la config, re-aplica
    if (JSON.stringify(binding.value) !== JSON.stringify(el.__restrict_cfg__)) {
      detach(el)
      const cfg = Object.assign(
        { numbers: true, letters: true, spaces: true, max: null, transform: null, only: null, allowExtra: '' },
        binding.value || {}
      )
      attach(el, cfg)
      // re-sanitiza
      el.__restrict_handler__?.()
    }
  },
  unmounted(el) {
    detach(el)
  }
}
