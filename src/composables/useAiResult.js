import { ref, onUnmounted } from 'vue'

// Resultado de IA que se genera en segundo plano (modelo local, ~20-60 s).
// El backend responde al instante con { estado: 'listo' | 'generando' | ... };
// mientras diga 'generando' se vuelve a consultar cada `intervalMs`, hasta
// `maxIntentos` (luego se deja de sondear: el usuario puede reintentar).
export function useAiResult (fetchFn, { intervalMs = 6000, maxIntentos = 25 } = {}) {
  const data = ref(null)
  const error = ref('')
  let timer = null
  let intentos = 0

  async function consultar () {
    try {
      data.value = await fetchFn()
      error.value = ''
    } catch (e) {
      console.error('useAiResult:', e)
      error.value = e?.response?.data?.message || 'No se pudo consultar la IA.'
      data.value = null
    }
    clearTimeout(timer)
    if (data.value?.estado === 'generando' && ++intentos < maxIntentos) {
      timer = setTimeout(consultar, intervalMs)
    }
  }

  function cargar () {
    intentos = 0
    return consultar()
  }

  onUnmounted(() => clearTimeout(timer))
  return { data, error, cargar }
}
