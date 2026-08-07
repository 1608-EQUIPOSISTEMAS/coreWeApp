// La campanita de notificaciones (AppHeader) mandaba SIEMPRE a la vista de
// leads de Comercial. Un asesor de Fundacion/B2B que abria la notificacion de
// "inscripcion observada" de su propia venta chocaba con el guard del router
// ("No tienes permisos para acceder a esta seccion") y no podia subsanarla.
//
// Aca se elige la vista de leads que el usuario SI puede abrir, con el mismo
// criterio del guard (router/index.js): rol hardcodeado O submodulo LEADS
// otorgado en la matriz de Configuracion -> Roles y Permisos.
export const LEAD_VIEWS = [
  { route: 'ComercialLeadDetalle', module: 'COMERCIAL', roles: ['ADMIN', 'COMERCIAL', 'LIDER_COMERCIAL', 'GERENCIA'] },
  { route: 'FundacionLeadsEdit',   module: 'FUNDACION', roles: ['ADMIN', 'FUNDACION', 'LIDER_FUNDACION', 'GERENCIA'] },
  { route: 'B2BLeadsEdit',         module: 'B2B',       roles: ['ADMIN', 'B2B', 'GERENCIA'] },
]

// user = objeto de localStorage ({ roles: [], submodules: { MODULO: [SUB] } }).
// ponytail: sin destino accesible cae a Comercial (comportamiento previo); el
// guard mostrara el toast igual que hoy.
export function leadRouteForUser (user = {}) {
  const roles = user.roles || []
  const view = LEAD_VIEWS.find(v =>
    roles.some(r => v.roles.includes(r)) ||
    (user.submodules?.[v.module] || []).includes('LEADS')
  )
  return (view || LEAD_VIEWS[0]).route
}
