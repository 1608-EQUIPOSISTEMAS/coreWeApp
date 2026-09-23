import { ref, onUnmounted } from 'vue'

// Trabajo de IA en segundo plano (backend: shared/adapters/llm/ai-jobs.js).
// run(startFn, statusFn) arranca el trabajo y consulta su estado cada
// `intervalMs` hasta que termina; resuelve con el job final
// ({ estado: 'listo'|'error'|'no_encontrado', data, message }).
// Mientras tanto expone `progreso` ({ hechos, total }) y `enFila` para la UI.
export function useAiJob ({ intervalMs = 4000, maxMinutos = 30 } = {}) {
  const corriendo = ref(false)
  const progreso = ref(null)
  const enFila = ref(0)
  let vivo = true
  onUnmounted(() => { vivo = false })

  const esperar = (ms) => new Promise(r => setTimeout(r, ms))

  async function run (startFn, statusFn) {
    corriendo.value = true
    progreso.value = null
    enFila.value = 0
    try {
      let job = await startFn()
      const limite = Date.now() + maxMinutos * 60 * 1000
      while (vivo && job?.estado === 'generando' && Date.now() < limite) {
        progreso.value = job.progreso ?? null
        enFila.value = job.en_fila ?? 0
        await esperar(intervalMs)
        job = await statusFn(job.job_id)
      }
      if (job?.estado === 'generando') return { estado: 'error', message: 'La IA sigue trabajando; vuelve a intentarlo en unos minutos.' }
      return job
    } finally {
      corriendo.value = false
    }
  }

  return { run, corriendo, progreso, enFila }
}
