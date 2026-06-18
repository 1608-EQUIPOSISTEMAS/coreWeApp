import { computed, ref } from 'vue'
import allNavItems from '@/_nav.js'
import api from '@/services/api'

// ── Permisos de la matriz de Configuración (dos niveles) ──
// Estado singleton a nivel de módulo: todos los componentes comparten la misma
// referencia y el sidebar reacciona cuando llega el refresco del backend.
// null = aún no se conocen (sesión vieja sin re-login) → solo filtra por roles.
// grantedModules:    ['FICO', 'PRODUCTO', ...]
// grantedSubmodules: { FICO: ['TOKENS', ...], PRODUCTO: [...] }
const grantedModules = ref(readFromStorage('modules'))
const grantedSubmodules = ref(readFromStorage('submodules'))
let refreshPromise = null

function readFromStorage(key) {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const value = user[key]
    if (key === 'modules') return Array.isArray(value) ? value : null
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

// Pide al backend los permisos vigentes del usuario y los persiste. Así un
// cambio en Roles y Permisos se refleja al recargar la app, sin re-login.
async function refreshModules() {
  if (!localStorage.getItem('token')) return
  if (refreshPromise) return refreshPromise
  refreshPromise = api
    .post('/config/mymodules', {}, { meta: { skipLoader: true } })
    .then(({ data }) => {
      const payload = data?.data
      if (!payload || !Array.isArray(payload.modules)) return
      grantedModules.value = payload.modules
      grantedSubmodules.value = payload.submodules || {}
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        user.modules = payload.modules
        user.submodules = payload.submodules || {}
        localStorage.setItem('user', JSON.stringify(user))
      } catch { /* storage corrupto: los refs ya quedaron actualizados */ }
    })
    .catch((err) => console.warn('No se pudieron refrescar los módulos:', err?.message))
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

export function useFilteredNav() {

  function hasRole(roles) {
    if (!roles) return true // sin roles = siempre visible
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userRoles = user.roles
      if (!userRoles) return false
      const rolesArr = Array.isArray(roles) ? roles : [roles]
      return rolesArr.some(r => userRoles.includes(r))
    } catch {
      return false
    }
  }

  function hasModule(moduleCode) {
    if (!moduleCode) return false
    const mods = grantedModules.value
    if (Array.isArray(mods) && mods.includes(moduleCode)) return true
    // Tener al menos un submódulo del módulo también abre el grupo
    // (ej. COMERCIAL ve "Cronograma" de Producto sin tener todo Producto).
    const subs = grantedSubmodules.value
    return !!(subs && Array.isArray(subs[moduleCode]) && subs[moduleCode].length)
  }

  function hasSubmodule(moduleCode, submoduleCode) {
    if (!moduleCode || !submoduleCode) return false
    const subs = grantedSubmodules.value
    return !!(subs && Array.isArray(subs[moduleCode]) && subs[moduleCode].includes(submoduleCode))
  }

  // Visibilidad = roles hardcodeados ∪ matriz de Configuración.
  // Grupo: por módulo. Hijo: por submódulo (hereda el módulo del grupo).
  function canSeeGroup(item) {
    if (!item.roles && !item.module) return true // público (Dashboard, títulos)
    return hasRole(item.roles) || hasModule(item.module)
  }

  function canSeeChild(child, parentModule) {
    if (hasRole(child.roles)) return true
    if (child.submodule) return hasSubmodule(parentModule, child.submodule)
    // Hijo sin submódulo declarado: basta el módulo del grupo.
    return !!parentModule && hasModule(parentModule)
  }

  const filteredNav = computed(() => {
    return allNavItems
      .map(item => {
        if (item.items) {
          if (!canSeeGroup(item)) return null
          const visibleItems = item.items.filter(child => canSeeChild(child, item.module))
          // Si no quedó ningún hijo, oculta el grupo completo
          if (visibleItems.length === 0) return null
          return { ...item, items: visibleItems }
        }
        // Item simple (CNavTitle, CNavItem sin grupo)
        return canSeeGroup(item) ? item : null
      })
      .filter(Boolean) // elimina los null
  })

  return { filteredNav, refreshModules, grantedModules, grantedSubmodules }
}
