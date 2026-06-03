import { idByAlias } from '../shared/lib/catalog.js'

// Construye el payload de lead (+ intentos de contacto) que consume
// comercialService.leadRegister/leadUpdate. Funcion PURA: el caller pasa los
// catalogos ya resueltos a arrays. Verbatim de buildLeadPayload de useLeadForm.
//
// catalogs: { leadStatus, country, query, leadInterest, socialMedia, mktWords,
//   strategy, prospectSituation, client, moment, programModality, programType,
//   attempts, calling } (arrays)
// businessLineOptions: array de opciones we_business_line; businessLine: alias actual.
export function buildLeadPayload ({ form, catalogs = {}, businessLineOptions = [], businessLine = null } = {}) {
  const c = catalogs
  const cat_status_lead = idByAlias(form.status_alias, c.leadStatus)
  const cat_code_country = idByAlias(form.country_alias, c.country)
  const cat_query = idByAlias(form.query_alias, c.query)
  const cat_interest_level = idByAlias(form.nivel_alias, c.leadInterest)
  const cat_channel = idByAlias(form.canal_alias, c.socialMedia)
  const cat_medium_contact = idByAlias(form.medium_alias, c.socialMedia)
  const cat_frecuency_word = idByAlias(form.key_word_alias, c.mktWords)
  const cat_type_strategy = idByAlias(form.strategy_alias, c.strategy)
  const cat_prospect_situation = idByAlias(form.ocupacion_alias, c.prospectSituation)
  const cat_client_type = idByAlias(form.client_status, c.client)
  const cat_client_category = idByAlias(form.cat_client_moment_alias, c.moment)
  const cat_program_modality = idByAlias(form.program_modality_alias, c.programModality)
  const cat_program_type = idByAlias(form.category_alias, c.programType)

  const cat_business_line_id = businessLine
    ? (businessLineOptions.find(o => o.alias === businessLine)?.id ?? null)
    : null

  const contact_attempts = (form.contactos || []).map((cAtt, idx) => ({
    id: cAtt.id,
    attempt_number: idx + 1,
    cat_type_attempt: idByAlias(cAtt.cat_type_attempt, c.attempts),
    contact_datetime: cAtt.fechaContactoProximo,
    cat_result: idByAlias(cAtt.calling_alias, c.calling),
    response: cAtt.respuesta || '',
    contact_duration: cAtt.contact_duration || 0,
    cat_reschedule_origin: cAtt.cat_reschedule_origin || null
  }))

  return {
    lead: {
      first_contact_date: form.fechaContactoInicial || null,
      cat_program_modality,
      cat_program_type,
      program_version_id: form.program_version_id || null,
      program_edition_id: form.edition_id || null,
      cat_status_lead,
      cat_code_country,
      cat_interest_level,
      cat_client_type,
      cat_channel,
      cat_medium_contact,
      bot: form.bot ? 'Y' : 'N',
      active: form.active ? 'Y' : 'N',
      web: form.web ? 'Y' : 'N',
      b2b: form.b2b ? 'Y' : 'N',
      cat_query,
      full_name: form.full_name,
      pay_date: form.pay_date,
      cat_frecuency_word,
      cat_type_strategy,
      cat_prospect_situation,
      cat_client_moment: cat_client_category,
      membership_moment_id: form.membership_moment_id,
      origin_phone: (form.telefono || '').trim() || null,
      origin_email: null,
      message_init_conversation: form.mensajeChat?.trim() || null,
      observations: form.observacion?.trim() || null,
      cat_business_line_id,
      company_id: form.company_id || null,
      cat_contract_type: form.cat_contract_type || null
    },
    contact_attempts
  }
}
