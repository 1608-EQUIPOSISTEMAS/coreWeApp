const LIST_FIELDS = [
  'type_program_ids', 'model_modality_ids', 'program_ids', 'status_lead_ids',
  'last_follow_ids', 'interest_level_ids', 'channel_ids', 'strategy_ids', 'moment_ids'
]

// ¿El lider le dejo al asesor algun filtro restrictivo (de user_lead_restrictions)?
// Basta una lista con valores o el inicio de un rango de fechas para avisarle.
export function isRestricted (restriction) {
  if (!restriction) return false
  return LIST_FIELDS.some(f => Array.isArray(restriction[f]) && restriction[f].length > 0) ||
    !!restriction.first_contact_date_from ||
    !!restriction.edition_start_date_from
}
