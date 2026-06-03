import { ref, onBeforeUnmount } from 'vue'

// Seguimiento rapido de un lead (modal de intentos de contacto con cronometro).
// Espejo de openFollowModal/saveFastFollow/addLocalAttempt/handleTypeChange/toggleTimer
// de views/comercial/Leads.vue.
//
// Higiene de timers reforzada respecto del SFC: los cronometros se limpian al abrir
// el modal, al cerrarlo y al desmontar. El SFC solo limpiaba en unmount, por lo que
// reabrir/cerrar el modal con un cronometro activo filtraba intervals (riesgo del plan FSD).
//
// deps: {
//   comercial: { leadGet({ id }), leadUpdate(payload) },
//   catalogs: { attemptOrigin, calling, attempts, pipeline }  // refs de catalogo
//   toast: { success, error, warning },
//   onAfterSave?: () => void   // refresco del listado tras guardar (fetchLeads)
// }
export function useLeadFollowUp (deps = {}) {
  const { comercial, catalogs = {}, toast, onAfterSave } = deps
  const { attemptOrigin, calling, attempts, pipeline } = catalogs

  const showFollowModal = ref(false)
  const editableHistory = ref([])
  const isSavingFollow = ref(false)
  const isLoadingFollow = ref(false)
  const selectedFollowLead = ref(null)

  function getIdFromAlias (alias, catalogArray) {
    if (!alias || !catalogArray) return null
    const item = catalogArray.find(i => i.alias === alias)
    return item ? item.id : null
  }

  function toggleTimer (attempt) {
    if (attempt.timerActive) {
      clearInterval(attempt.timerId)
      attempt.timerActive = false
      attempt.timerId = null
    } else {
      attempt.timerActive = true
      attempt.timerId = setInterval(() => {
        attempt.contact_duration = (attempt.contact_duration || 0) + 1
      }, 1000)
    }
  }

  // Detiene y limpia todos los cronometros activos del historial. Previene fugas
  // de intervals al reabrir el modal, cerrarlo o desmontar el componente.
  function stopAllTimers () {
    editableHistory.value.forEach(item => {
      if (item.timerId) {
        clearInterval(item.timerId)
        item.timerId = null
        item.timerActive = false
      }
    })
  }

  function closeFollowModal () {
    stopAllTimers()
    showFollowModal.value = false
  }

  onBeforeUnmount(stopAllTimers)

  async function openFollowModal (lead) {
    stopAllTimers()
    selectedFollowLead.value = lead
    editableHistory.value = []
    showFollowModal.value = true
    isLoadingFollow.value = true
    try {
      const fresh = await comercial.leadGet({ id: lead.id })
      const rawDetails = fresh?.contact_attempts || []
      editableHistory.value = [...rawDetails]
        .sort((a, b) => b.attempt_number - a.attempt_number)
        .map(d => {
          if (!d) return null
          const originAlias = d.cat_creation_origin || 'we_origin_manual'
          const originObj = (attemptOrigin?.value || []).find(o => o.alias === originAlias)
          return {
            id: d.lead_contact_attempt_id,
            attempt_number: d.attempt_number ?? null,
            calling_alias: d.cat_result_alias,
            contact_datetime: d.contact_datetime ? String(d.contact_datetime).replace('T', ' ').slice(0, 16) : '',
            response: d.response || '',
            cat_type_attempt: d.cat_type_attempt_alias,
            cat_type_attempt_label: d.cat_type_attempt_label,
            contact_duration: d.contact_duration || 0,
            timerActive: false,
            timerId: null,
            user_registration_label: d.user_registration_label || '—',
            registration_date_fmt: d.registration_date ? String(d.registration_date).replace('T', ' ').slice(0, 16) : '—',
            user_modification_label: d.user_modification_label || null,
            modification_date_fmt: d.modification_date ? String(d.modification_date).replace('T', ' ').slice(0, 16) : null,
            cat_creation_origin_alias: originAlias,
            cat_creation_origin_label: originObj ? originObj.description : 'Gestión Manual'
          }
        })
        .filter(item => item !== null)
    } catch (error) {
      console.error(error)
      editableHistory.value = []
      toast.error('Error al cargar el historial de seguimiento')
    } finally {
      isLoadingFollow.value = false
    }
  }

  function addLocalAttempt () {
    const now = new Date()
    const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    editableHistory.value.unshift({
      id: null,
      attempt_number: null,
      status_alias: 'we_calling_pending',
      calling_alias: 'we_calling_pending',
      contact_datetime: isoString,
      cat_type_attempt: 'we_attempt_call',
      response: '',
      contact_duration: 0,
      timerActive: false,
      timerId: null
    })
  }

  function handleTypeChange (attempt, newVal) {
    attempt.cat_type_attempt = newVal
    if (newVal !== 'we_attempt_call') {
      attempt.calling_alias = 'we_calling_message'
      if (attempt.timerActive) toggleTimer(attempt)
      attempt.contact_duration = 0
    } else {
      attempt.calling_alias = 'we_calling_pending'
    }
  }

  async function saveFastFollow () {
    if (!selectedFollowLead.value) return
    editableHistory.value.forEach(item => { if (item.timerActive) toggleTimer(item) })
    isSavingFollow.value = true
    try {
      const attemptsPayload = editableHistory.value.map(item => ({
        id: item.id,
        cat_result: getIdFromAlias(item.calling_alias, calling?.value),
        cat_type_attempt: getIdFromAlias(item.cat_type_attempt, attempts?.value),
        contact_datetime: item.contact_datetime,
        response: item.response,
        contact_duration: item.contact_duration,
        cat_reschedule_origin: item.cat_reschedule_origin || null
      }))

      const catStatusLeadId = getIdFromAlias(selectedFollowLead.value.cat_status_alias, pipeline?.value)

      const resp = await comercial.leadUpdate({
        id: selectedFollowLead.value.id,
        lead: { cat_status_lead: catStatusLeadId },
        contact_attempts: attemptsPayload
      })

      if (resp.result === 1) {
        toast.success(resp.message || 'Seguimiento y estado actualizados correctamente')
        showFollowModal.value = false
        if (onAfterSave) onAfterSave()
      } else if (resp.result === 0) {
        toast.error(resp.message || 'Error inesperado al guardar')
      } else {
        toast.warning(resp.message || 'No se pudo guardar el seguimiento')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar el seguimiento')
    } finally {
      isSavingFollow.value = false
    }
  }

  return {
    showFollowModal,
    editableHistory,
    isSavingFollow,
    isLoadingFollow,
    selectedFollowLead,
    toggleTimer,
    stopAllTimers,
    closeFollowModal,
    openFollowModal,
    addLocalAttempt,
    handleTypeChange,
    saveFastFollow
  }
}
