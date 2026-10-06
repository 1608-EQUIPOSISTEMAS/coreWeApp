import { ref, watch } from 'vue'
import { useToast } from 'vue-toastification'

const DEBOUNCE_MS = 350
const MIN_CHARS = 3 // mismo minimo que parseStudentQuery del backend

// Busca mientras se escribe. `seq` descarta respuestas viejas: si "garc" llega
// despues que "garcia", no debe pisar la lista correcta.
export function useStudentSearch (editionService) {
  const toast = useToast()
  const q = ref('')
  const results = ref([])
  const loading = ref(false)
  const searched = ref('') // texto de la ultima busqueda que si respondio
  let timer = null
  let seq = 0

  async function run (text) {
    const mine = ++seq
    loading.value = true
    try {
      const rows = await editionService.studentSearch({ q: text })
      if (mine !== seq) return
      results.value = rows
      searched.value = text
    } catch (err) {
      if (mine !== seq) return
      toast.error(err?.response?.data?.message || 'No se pudo buscar el alumno')
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  watch(q, (value) => {
    clearTimeout(timer)
    const text = value.trim()
    if (text.length < MIN_CHARS) {
      seq++ // invalida la busqueda en vuelo
      results.value = []
      searched.value = ''
      loading.value = false
      return
    }
    timer = setTimeout(() => run(text), DEBOUNCE_MS)
  })

  return { q, results, loading, searched, MIN_CHARS }
}
