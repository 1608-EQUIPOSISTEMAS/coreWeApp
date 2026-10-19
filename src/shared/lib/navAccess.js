// Una sola regla de acceso para el sidebar (useFilteredNav) y el guard del
// router: con dos copias, una ya dejaba ver lo que la otra prohibia.
//
// La matriz de Configuración → Roles y Permisos MANDA (desde 19/10/26). Antes la
// visibilidad era roles hardcodeados ∪ matriz, y desmarcar una casilla no
// ocultaba nada si el rol estaba escrito en _nav.js (LIDER_COMERCIAL seguía
// viendo Llamar hoy y Ficha del cliente).
//
// `target`  = { module, submodule, roles } de la opción o de la ruta.
// `session` = { roles, modules, submodules } del usuario; modules === null es
//             una sesión vieja que aún no recibió la matriz: ahí los `roles`
//             del código son el único dato y se usan de respaldo.
export function canAccess (target = {}, session = {}) {
  const userRoles = session.roles || []
  if (userRoles.includes('ADMIN')) return true

  const { module, submodule, roles } = target
  const hasRole = () => Array.isArray(roles) && roles.some(r => userRoles.includes(r))

  if (!Array.isArray(session.modules)) {
    if (roles) return hasRole()
    return true // sesion vieja: lo que solo declara module no se bloqueaba
  }

  if (module && submodule) return grantedSubmodule(session, module, submodule)
  // Función de liderazgo sin casilla propia (ej. Documentos de Tickets, solo ADMIN):
  // se abre por rol aunque el usuario tenga el módulo del grupo.
  if (roles) return hasRole()
  if (module) return grantedModule(session, module)
  return true // sin module ni roles: público (Dashboard)
}

// Tener el módulo, o al menos un submódulo de él, abre el grupo.
export function grantedModule (session, module) {
  if ((session.modules || []).includes(module)) return true
  const subs = session.submodules?.[module]
  return Array.isArray(subs) && subs.length > 0
}

export function grantedSubmodule (session, module, submodule) {
  const subs = session.submodules?.[module]
  return Array.isArray(subs) && subs.includes(submodule)
}

// Sesión guardada por el login (y refrescada por /config/mymodules).
export function readSession () {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return {
      roles: Array.isArray(user.roles) ? user.roles : [],
      modules: Array.isArray(user.modules) ? user.modules : null,
      submodules: user.submodules && typeof user.submodules === 'object' ? user.submodules : null
    }
  } catch {
    return { roles: [], modules: null, submodules: null }
  }
}
