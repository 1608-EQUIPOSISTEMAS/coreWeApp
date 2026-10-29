import { ref } from 'vue'

// Generar las reuniones de Teams por sesion de todas las aulas activas.
// Dos pasos: simular (cuantas crearia/moveria/cancelaria) y confirmar. Ambos
// corren en segundo plano en el backend; aqui se consulta el avance.
const POLL_MS = 2000

export function useTeamsSync({ editionService, toast, onDone = () => {} } = {}) {
  const phase = ref('idle') // idle | simulating | preview | running
  const preview = ref(null)
  const progress = ref(null)

  async function waitJob(job) {
    let current = job
    while (current.estado === 'generando') {
      progress.value = current.progreso
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
      current = await editionService.teamsSyncStatus(current.job_id)
    }
    if (current.estado !== 'listo') throw new Error(current.message || 'La sincronización no terminó')
    return current.data
  }

  async function simulate() {
    phase.value = 'simulating'
    try {
      preview.value = await waitJob(await editionService.teamsSyncStart({ dry_run: true }))
      phase.value = 'preview'
    } catch (err) {
      phase.value = 'idle'
      toast.error(err?.response?.data?.message || err.message || 'No se pudo simular')
    }
  }

  async function confirm() {
    phase.value = 'running'
    progress.value = null
    try {
      const res = await waitJob(await editionService.teamsSyncStart({}))
      const fallos = [...(res.errors || []), ...(res.odoo_errors || []), ...(res.options_errors || [])]
      const msg = `Teams: ${res.created} creadas, ${res.updated} movidas, ${res.cancelled} canceladas` +
        ` · Odoo: ${res.odoo_written} links escritos`
      if (fallos.length) toast.warning(`${msg} · ${fallos.length} con error: ${fallos[0].message}`)
      else toast.success(msg)
      onDone(res)
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'No se pudo sincronizar')
    } finally {
      phase.value = 'idle'
      preview.value = null
      progress.value = null
    }
  }

  function cancel() {
    phase.value = 'idle'
    preview.value = null
  }

  return { phase, preview, progress, simulate, confirm, cancel }
}
