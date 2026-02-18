import { computed } from 'vue'
import allNavItems from '@/_nav.js' 

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

  const filteredNav = computed(() => {
    return allNavItems
      .map(item => {
        if (item.items) {
          // Filtra los hijos
          const visibleItems = item.items.filter(child => hasRole(child.roles))
          // Si no quedó ningún hijo, oculta el grupo completo
          if (visibleItems.length === 0) return null
          return { ...item, items: visibleItems }
        }
        // Item simple (CNavTitle, CNavItem sin grupo)
        return hasRole(item.roles) ? item : null
      })
      .filter(Boolean) // elimina los null
  })

  return { filteredNav }
}