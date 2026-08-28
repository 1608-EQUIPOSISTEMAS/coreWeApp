// Quien queda acotado a SUS propios leads en las bandejas de area
// (/comercial/leads, /fundacion/leads, /b2b/leads): el asesor raso. La vista le
// fuerza owner_user_ids = [yo] y le esconde el filtro de asesor.
//
// Los lideres NO entran aca: ven el universo completo de asesores de su area.
// Se apoya en la convencion de alias del catalogo `rol`, donde el lider de un
// area es siempre LIDER_<AREA> (LIDER_COMERCIAL, LIDER_FUNDACION, LIDER_B2B).
//
// roles = user.roles de localStorage; advisorRole = 'COMERCIAL' | 'FUNDACION' | 'B2B'.
export function isAdvisorScopedToOwnLeads (roles = [], advisorRole) {
  if (!roles.includes(advisorRole)) return false
  const unscoped = ['ADMIN', 'GERENCIA', `LIDER_${advisorRole}`]
  return !unscoped.some(role => roles.includes(role))
}
