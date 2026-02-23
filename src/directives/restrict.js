export default {
  mounted(el, binding) {
    // 🔍 DEPURACIÓN: Esto debe aparecer en la consola de tu navegador al cargar la página
    console.log('✅ v-restrict montado en:', el.placeholder || el.tagName, binding.value);

    // Guardamos la configuración en el elemento para poder actualizarla luego
    el._restrictCfg = binding.value || {};

    el._restrictHandler = function(e) {
      // Evitar bucles infinitos si nosotros mismos forzamos el evento
      if (e && e.detail === 'v-restrict-event') return;

      const cfg = el._restrictCfg;
      let out = String(el.value || '');

      // 1. Reglas de caracteres (only)
      if (cfg.only === 'numbers') {
        out = out.replace(/\D/g, ''); // Borra todo lo que no sea dígito
      } else if (cfg.only === 'letters') {
        out = out.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, ''); // Solo letras y espacios
      }

      // 2. Mayúsculas / Minúsculas
      if (cfg.transform === 'upper') out = out.toUpperCase();
      if (cfg.transform === 'lower') out = out.toLowerCase();

      // 3. Reglas de Espacios
      if (cfg.spaces === false) {
        out = out.replace(/\s+/g, ''); // Sin espacios en ningún lado
      } else if (cfg.trim) {
        out = out.replace(/^\s+/, ''); // No permite espacios al inicio mientras escribe
      }

      // 4. Máximo de caracteres
      if (cfg.max && out.length > cfg.max) {
        out = out.slice(0, cfg.max);
      }

      // 5. Aplicar cambios y forzar al v-model a enterarse
      if (out !== el.value) {
        el.value = out;
        // En Vue 3, despachar un CustomEvent es la forma más segura de actualizar el v-model
        el.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: 'v-restrict-event' }));
      }
    };

    el._restrictBlurHandler = function() {
      const cfg = el._restrictCfg;
      if (cfg.trim) {
        let out = String(el.value || '').trim(); // Quita espacios al inicio y al final
        if (out !== el.value) {
          el.value = out;
          el.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: 'v-restrict-event' }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };

    // Escuchamos los eventos clave
    el.addEventListener('input', el._restrictHandler);
    el.addEventListener('blur', el._restrictBlurHandler);
  },

  updated(el, binding) {
    // Si la configuración cambia dinámicamente, la actualizamos aquí
    el._restrictCfg = binding.value || {};
  },

  unmounted(el) {
    // Limpieza de memoria (muy importante en Vue)
    if (el._restrictHandler) el.removeEventListener('input', el._restrictHandler);
    if (el._restrictBlurHandler) el.removeEventListener('blur', el._restrictBlurHandler);
    delete el._restrictCfg;
  }
};
