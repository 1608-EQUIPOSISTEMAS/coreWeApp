import { ref } from 'vue'

// Restricciones de visualizacion por asesor (panel de control comercial). Espejo
// de la logica de Leads.vue (checkMyRestrictions/openControlModal/saveControlRestrictions).
// Dependencias inyectadas para testeabilidad sin servidor.

// Normaliza una seleccion a IDs planos. Verbatim del extractIds del SFC: prioriza
// item.id sobre item.value (a diferencia del getIds del store, que usa value).
function extractIds (arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(item => (typeof item === 'object' && item !== null) ? (item.id || item.value) : item)
}

// Construye el registro editable de restricciones de un asesor a partir de la fila
// de BD, recortando los timestamps a YYYY-MM-DD y derivando los range_string.
export function buildAsesorRecord (userId, userName, bdRest = {}) {
  const toDate = (val) => val ? String(val).slice(0, 10) : null
  const fcFrom = toDate(bdRest.first_contact_date_from)
  const fcTo = toDate(bdRest.first_contact_date_to)
  const esFrom = toDate(bdRest.edition_start_date_from)
  const esTo = toDate(bdRest.edition_start_date_to)

  return {
    user_id: userId,
    name: userName,
    type_program_ids: bdRest.type_program_ids || [],
    model_modality_ids: bdRest.model_modality_ids || [],
    program_ids: bdRest.program_ids || [],
    status_lead_ids: bdRest.status_lead_ids || [],
    last_follow_ids: bdRest.last_follow_ids || [],
    interest_level_ids: bdRest.interest_level_ids || [],
    channel_ids: bdRest.channel_ids || [],
    strategy_ids: bdRest.strategy_ids || [],
    moment_ids: bdRest.moment_ids || [],
    first_contact_date_from: fcFrom,
    first_contact_date_to: fcTo,
    edition_start_date_from: esFrom,
    edition_start_date_to: esTo,
    first_contact_range_string: fcFrom && fcTo ? `${fcFrom} a ${fcTo}` : null,
    edition_start_range_string: esFrom && esTo ? `${esFrom} a ${esTo}` : null
  }
}

// deps: {
//   api: { restrictionsList(payload), restrictionsUpdate(payloadMasivo) },
//   ctx: { currentUserId, isComercial, storedUser },
//   owners: Ref<Array<{id,description}>>, loadOwners(): Promise,
//   toast: { success, error },
//   pushRestrictions?: ({ user_ids }) => Promise   // notificacion SSE (opcional)
// }
// NOTA: en el SFC legacy el push se invocaba como comercialService.pushRestrictionsUpdate,
// metodo que NO existe en el servicio: la llamada lanzaba y se tragaba en try/catch, asi que
// la notificacion SSE nunca ocurria. Aqui se inyecta como dep opcional; wirearla al
// notificationService (endpoint /notifications/push-restrictions-update) corrige ese bug latente.
export function useAdvisorRestrictions (deps = {}) {
  const { api, ctx = {}, owners, loadOwners, toast, pushRestrictions } = deps

  const hasActiveRestrictions = ref(false)
  const showControlModal = ref(false)
  const asesoresControl = ref([])
  const isSavingRestrictions = ref(false)

  async function checkMyRestrictions () {
    if (!ctx.isComercial) return
    try {
      const myRest = await api.restrictionsList({ user_id: ctx.currentUserId, is_comercial: true })
      if (myRest && myRest.length > 0) {
        const r = myRest[0]
        const isRestricted = [
          r.type_program_ids, r.model_modality_ids, r.program_ids,
          r.status_lead_ids, r.last_follow_ids, r.interest_level_ids,
          r.channel_ids, r.strategy_ids, r.moment_ids
        ].some(arr => Array.isArray(arr) && arr.length > 0) ||
          !!r.first_contact_date_from ||
          !!r.edition_start_date_from
        hasActiveRestrictions.value = isRestricted
      }
    } catch (e) {
      console.error('Error comprobando mis restricciones:', e)
    }
  }

  async function openControlModal () {
    showControlModal.value = true
    asesoresControl.value = []
    try {
      if (owners.value.length === 0) await loadOwners()
      const savedRestrictions = await api.restrictionsList({ user_id: ctx.currentUserId, is_comercial: ctx.isComercial })
      if (ctx.isComercial) {
        const bdRest = savedRestrictions[0] || {}
        const su = ctx.storedUser
        const myName = su?.first_name ? `${su.first_name} ${su.last_name || ''}` : `Mi Usuario (${ctx.currentUserId})`
        asesoresControl.value = [buildAsesorRecord(ctx.currentUserId, myName, bdRest)]
      } else {
        asesoresControl.value = owners.value.map(owner => {
          const bdRest = savedRestrictions.find(r => r.user_id === owner.id) || {}
          return buildAsesorRecord(owner.id, owner.description, bdRest)
        })
      }
    } catch (error) {
      console.error('Error cargando permisos:', error)
      toast.error('Hubo un error al cargar el panel de permisos.')
    }
  }

  function handleAsesorDateChange (asesor, dateStr, type) {
    let start = ''
    let end = ''
    if (dateStr && dateStr.includes(' a ')) {
      [start, end] = dateStr.split(' a ')
    } else if (dateStr) {
      start = end = dateStr
    }
    if (type === 'first_contact') {
      asesor.first_contact_date_from = start || null
      asesor.first_contact_date_to = end || null
    } else if (type === 'edition_start') {
      asesor.edition_start_date_from = start || null
      asesor.edition_start_date_to = end || null
    }
  }

  async function saveControlRestrictions () {
    isSavingRestrictions.value = true
    try {
      const payloadMasivo = asesoresControl.value.map(asesor => ({
        user_id: asesor.user_id,
        is_active: true,
        type_program_ids: extractIds(asesor.type_program_ids),
        model_modality_ids: extractIds(asesor.model_modality_ids),
        program_ids: extractIds(asesor.program_ids),
        status_lead_ids: extractIds(asesor.status_lead_ids),
        last_follow_ids: extractIds(asesor.last_follow_ids),
        interest_level_ids: extractIds(asesor.interest_level_ids),
        channel_ids: extractIds(asesor.channel_ids),
        strategy_ids: extractIds(asesor.strategy_ids),
        moment_ids: extractIds(asesor.moment_ids),
        first_contact_date_from: asesor.first_contact_date_from || null,
        first_contact_date_to: asesor.first_contact_date_to || null,
        edition_start_date_from: asesor.edition_start_date_from || null,
        edition_start_date_to: asesor.edition_start_date_to || null
      }))

      await api.restrictionsUpdate(payloadMasivo)

      const affectedIds = asesoresControl.value.map(a => a.user_id)
      try {
        await pushRestrictions?.({ user_ids: affectedIds })
      } catch (e) {
        console.warn('[Restricciones] No se pudo notificar por SSE:', e.message)
      }

      toast.success('Filtros restrictivos aplicados correctamente')
      showControlModal.value = false
    } catch (error) {
      console.error('Error guardando restricciones:', error)
      toast.error('Error al guardar las restricciones')
    } finally {
      isSavingRestrictions.value = false
    }
  }

  return {
    hasActiveRestrictions,
    showControlModal,
    asesoresControl,
    isSavingRestrictions,
    checkMyRestrictions,
    openControlModal,
    handleAsesorDateChange,
    saveControlRestrictions,
    buildAsesorRecord
  }
}
