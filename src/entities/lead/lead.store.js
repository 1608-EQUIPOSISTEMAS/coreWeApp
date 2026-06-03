// Store Pinia del dominio Lead (estado del listado/tablero). Centraliza los
// filtros, los registros crudos, la paginacion y los chips de filtros activos
// que hoy viven dispersos en views/comercial/Leads.vue, eliminando el prop
// drilling de 25+ filtros entre la pagina, la barra y la tabla.
import { defineStore } from 'pinia'
import { createLeadApi } from './lead.api'

// Estado por defecto de los filtros. Espejo del reactive `filters` del listado:
// mismos nombres de campo y mismos valores iniciales para no romper el payload
// que espera el SP de leadList.
function defaultFilters() {
  return {
    q: '',
    origin_seller_phone: '',
    origin_seller_phones: [],
    program_text: '',
    estado: null,
    web: null,
    b2b: null,
    order_by: 0,
    payment_channel_ids: [],
    owner_user_ids: [],
    status_lead_ids: [],
    last_follow_ids: [],
    interest_level_ids: [],
    channel_ids: [],
    query_ids: [],
    program_version_ids: [],
    type_program_ids: [],
    model_modality_ids: [],
    strategy_ids: [],
    word_ids: [],
    medium_contact_ids: [],
    code_country_ids: [],
    moment_ids: [],
    attempt_origin_ids: [],
    membership_moment_ids: [],
    fico_status_ids: [],
    profile_ids: [],
    currency_ids: [],
    inscription_modality_ids: [],
    prospect_situation_ids: [],
    installment_status_ids: [],
    payment_method_ids: [],
    settlement_status_ids: [],
    rangoFechas: { start: '', end: '' },
    rangoModificacion: { start: '', end: '' },
    created_range_string: null,
    updated_range_string: null,
    edition_range_string: null,
    edition_start_from: '',
    edition_start_to: '',
    first_contact_range_string: null,
    first_contact_from: '',
    first_contact_to: '',
    pay_date_from: '',
    pay_date_to: '',
    pay_date_range_string: null
  }
}

// Normaliza un arreglo de seleccion (objetos {value} o escalares) a IDs planos.
// Mismo helper que usa fetchLeads para armar el payload del SP.
function getIds(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(item => (typeof item === 'object' && item !== null) ? item.value : item)
}

export const useLeadStore = defineStore('lead', {
  state: () => ({
    filters: defaultFilters(),
    leadsRaw: [],
    pagin: { page: 1, size: 25, total: 0 },
    isTableLoading: false,
    activeQuickView: null,
    activeFilterChips: [],
    // El comercial restringido solo ve sus propios leads. Se fija al inicializar
    // y se reaplica tras limpiar filtros, igual que en el SFC origen.
    isComercial: false,
    currentUserId: null
  }),

  getters: {
    // Los leads ya vienen filtrados/paginados del servidor; el listado los
    // consume tal cual. El getter existe para que las vistas no toquen leadsRaw
    // directamente y para futuras transformaciones de presentacion.
    filteredLeads: (state) => state.leadsRaw,

    hasActiveFilters: (state) => state.activeFilterChips.length > 0,

    // Texto agregado de los chips activos para tooltips/lectura.
    filterChipsDisplay: (state) => state.activeFilterChips
      .map(c => c.text || c.label)
      .filter(Boolean)
      .join(' · ')
  },

  actions: {
    // Fija las preferencias de visibilidad del usuario actual y resetea filtros.
    initializeFilters({ isComercial = false, currentUserId = null } = {}) {
      this.isComercial = isComercial
      this.currentUserId = currentUserId
      this.filters = defaultFilters()
      if (this.isComercial && this.currentUserId) {
        this.filters.owner_user_ids = [this.currentUserId]
      }
      this.rebuildChips()
    },

    updateSingleFilter(key, value) {
      this.filters[key] = value
    },

    setLeads(items) {
      this.leadsRaw = Array.isArray(items) ? items : []
    },

    setPagination(partial = {}) {
      this.pagin = { ...this.pagin, ...partial }
    },

    setActiveQuickView(key) {
      this.activeQuickView = key
    },

    // Reconstruye los chips de filtros activos. Logica extraida verbatim de
    // rebuildChips() en Leads.vue (mismos prefijos y mismas reglas de etiqueta).
    rebuildChips() {
      const f = this.filters
      const chips = []
      const makeChip = (key, labelPrefix, items) => {
        if (!items || items.length === 0) return
        const labels = items.map(i => i.label || i.value)
        chips.push({
          key,
          label: labels.length === 1 ? `${labelPrefix}: ${labels[0]}` : `${labelPrefix}: ${labels.length} sel.`,
          text: `${labelPrefix}: ${labels.join(', ')}`,
          details: labels
        })
      }
      if (f.q) chips.push({ key: 'q', label: `Buscar: "${f.q}"` })
      if (f.origin_seller_phone) chips.push({ key: 'origin_seller_phone', label: `Cel. Origen: "${f.origin_seller_phone}"` })
      if (Array.isArray(f.origin_seller_phones) && f.origin_seller_phones.length > 0) {
        const phones = f.origin_seller_phones.map(p => p?.label || p?.value || p).filter(Boolean)
        chips.push({
          key: 'origin_seller_phones',
          label: phones.length === 1 ? `Cel. Origen: ${phones[0]}` : `Cel. Origen: ${phones.length} sel.`,
          text: `Cel. Origen: ${phones.join(', ')}`,
          details: phones
        })
      }
      if (f.program_text) chips.push({ key: 'program_text', label: `Prog: "${f.program_text}"` })
      if (f.web) chips.push({ key: 'web', label: `Web: ${f.web === 'Y' ? 'Sí' : 'No'}` })
      if (f.b2b) chips.push({ key: 'b2b', label: `B2B: ${f.b2b === 'Y' ? 'Sí' : 'No'}` })
      if (f.order_by === 1) chips.push({ key: 'order_by', text: 'Orden: Inicio Edición' })
      if (f.order_by === 2) chips.push({ key: 'order_by', text: 'Orden: Fecha Pago' })
      if (f.rangoFechas?.start) chips.push({ key: 'rangoFechas', label: `Reg: ${f.rangoFechas.start} → ${f.rangoFechas.end}` })
      if (f.pay_date_from) chips.push({ key: 'pay_date', label: `Pago: ${f.pay_date_from} → ${f.pay_date_to}` })
      if (f.first_contact_from) chips.push({ key: 'first_contact', label: `F.Contacto: ${f.first_contact_from} → ${f.first_contact_to}` })
      if (f.edition_start_from) chips.push({ key: 'edition_start', label: `Edición: ${f.edition_start_from} → ${f.edition_start_to}` })
      makeChip('status_lead_ids', 'Estatus', f.status_lead_ids)
      makeChip('last_follow_ids', 'Seguim.', f.last_follow_ids)
      makeChip('attempt_origin_ids', 'O. Intento', f.attempt_origin_ids)
      makeChip('membership_moment_ids', 'Member', f.membership_moment_ids)
      makeChip('interest_level_ids', 'Interés', f.interest_level_ids)
      makeChip('channel_ids', 'Canal', f.channel_ids)
      makeChip('prospect_situation_ids', 'Situación', f.prospect_situation_ids)
      makeChip('query_ids', 'Promoción', f.query_ids)
      makeChip('program_version_ids', 'Programa', f.program_version_ids)
      makeChip('type_program_ids', 'Tipo', f.type_program_ids)
      makeChip('model_modality_ids', 'Modalidad', f.model_modality_ids)
      makeChip('strategy_ids', 'Estrategia', f.strategy_ids)
      makeChip('payment_channel_ids', 'Canal Pago', f.payment_channel_ids)
      makeChip('word_ids', 'Palabra', f.word_ids)
      makeChip('medium_contact_ids', 'Medio', f.medium_contact_ids)
      makeChip('code_country_ids', 'País', f.code_country_ids)
      makeChip('moment_ids', 'Etapa', f.moment_ids)
      makeChip('fico_status_ids', 'FICO', f.fico_status_ids)
      makeChip('profile_ids', 'Perfil', f.profile_ids)
      makeChip('currency_ids', 'Moneda', f.currency_ids)
      makeChip('inscription_modality_ids', 'Mod. Insc.', f.inscription_modality_ids)
      makeChip('installment_status_ids', 'Est. Cuota', f.installment_status_ids)
      makeChip('payment_method_ids', 'Método Pago', f.payment_method_ids)
      makeChip('settlement_status_ids', 'Conciliación', f.settlement_status_ids)
      if (!this.isComercial) makeChip('owner_user_ids', 'Asesor', f.owner_user_ids)
      this.activeFilterChips = chips
    },

    // Aplica los filtros actuales: limpia la vista rapida, vuelve a la primera
    // pagina, reconstruye chips y refresca el listado.
    applyFilters() {
      this.activeQuickView = null
      this.pagin.page = 1
      this.rebuildChips()
      return this.fetchLeads()
    },

    // Restablece los filtros a su estado por defecto, respetando la restriccion
    // del comercial. Por defecto recarga, igual que clearFilters() en el SFC.
    clearFilters(reload = true) {
      this.filters = defaultFilters()
      if (this.isComercial && this.currentUserId) {
        this.filters.owner_user_ids = [this.currentUserId]
      }
      if (reload === true || typeof reload !== 'boolean') {
        this.activeQuickView = null
        this.pagin.page = 1
        this.rebuildChips()
        return this.fetchLeads()
      }
      return undefined
    },

    // Trae el listado paginado. Acepta el api por parametro para inyectar un
    // doble en tests; si no se pasa, instancia el cliente real. Arma el payload
    // del SP con la misma normalizacion de IDs que el SFC origen.
    async fetchLeads(api = createLeadApi()) {
      this.isTableLoading = true
      try {
        const f = this.filters
        const phonesArr = getIds(f.origin_seller_phones)
        const phoneFromMulti = phonesArr.length > 0 ? String(phonesArr[0]) : null
        const phoneFromInput = f.origin_seller_phone?.trim() || null
        const { items, total } = await api.leadList({
          q: f.q || null,
          origin_seller_phone: phoneFromMulti || phoneFromInput,
          page: this.pagin.page,
          size: this.pagin.size,
          program_text: f.program_text || null,
          web: f.web || null,
          b2b: f.b2b || null,
          order_by: f.order_by ?? 0,
          payment_channel_ids: getIds(f.payment_channel_ids),
          from_date: f.rangoFechas?.start || null,
          membership_moment_ids: getIds(f.membership_moment_ids),
          to_date: f.rangoFechas?.end || null,
          updated_from: f.rangoModificacion?.start || null,
          updated_to: f.rangoModificacion?.end || null,
          pay_date_from: f.pay_date_from || null,
          pay_date_to: f.pay_date_to || null,
          edition_start_from: f.edition_start_from || null,
          edition_start_to: f.edition_start_to || null,
          fico_status_ids: getIds(f.fico_status_ids),
          profile_ids: getIds(f.profile_ids),
          currency_ids: getIds(f.currency_ids),
          inscription_modality_ids: getIds(f.inscription_modality_ids),
          installment_status_ids: getIds(f.installment_status_ids),
          payment_method_ids: getIds(f.payment_method_ids),
          first_contact_from: f.first_contact_from || null,
          first_contact_to: f.first_contact_to || null,
          settlement_status_ids: getIds(f.settlement_status_ids),
          owner_user_ids: getIds(f.owner_user_ids),
          status_lead_ids: getIds(f.status_lead_ids),
          last_follow_ids: getIds(f.last_follow_ids),
          program_version_ids: getIds(f.program_version_ids),
          prospect_situation_ids: getIds(f.prospect_situation_ids),
          interest_level_ids: getIds(f.interest_level_ids),
          channel_ids: getIds(f.channel_ids),
          query_ids: getIds(f.query_ids),
          type_program_ids: getIds(f.type_program_ids),
          attempt_origin_ids: getIds(f.attempt_origin_ids),
          model_modality_ids: getIds(f.model_modality_ids),
          strategy_ids: getIds(f.strategy_ids),
          word_ids: getIds(f.word_ids),
          medium_contact_ids: getIds(f.medium_contact_ids),
          code_country_ids: getIds(f.code_country_ids),
          moment_ids: getIds(f.moment_ids)
        })
        this.leadsRaw = items || []
        this.pagin.total = Number(total || 0)
      } catch (e) {
        console.error('Error cargando leads:', e)
        this.leadsRaw = []
        this.pagin.total = 0
      } finally {
        this.isTableLoading = false
      }
    }
  }
})
