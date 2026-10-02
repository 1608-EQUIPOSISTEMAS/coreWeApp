// Universo de asesores de /comercial/leads. El SP solo filtra por inclusion
// (owner_user_ids), asi que la exclusion de otras areas se arma aqui: un usuario
// con un rol ajeno (Fundacion/B2B) queda fuera aunque tambien tenga COMERCIAL.
// advisors/extras/excluded son listas de usuarios { user_id, first_name, last_name }.
export function buildOwnerUniverse ({ advisors = [], extras = [], excluded = [] }) {
  const excludedIds = new Set(excluded.map(u => u.user_id))
  const byId = new Map()
  for (const u of [...advisors, ...extras]) {
    if (excludedIds.has(u.user_id) || byId.has(u.user_id)) continue
    byId.set(u.user_id, { id: u.user_id, description: shortName(u) })
  }
  return [...byId.values()]
}

// "Camilo C." (nombre + inicial del apellido), como lo leen los asesores.
function shortName (u) {
  const first = (u.first_name || '').trim()
  const last = (u.last_name || '').trim()
  const name = last ? `${first} ${last.charAt(0)}.` : first
  return name.trim() || `Usuario ${u.user_id}`
}
