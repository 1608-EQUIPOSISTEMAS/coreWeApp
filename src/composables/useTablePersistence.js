import { onMounted, watch } from 'vue'

export function useTablePersistence(storageKey, filters, pagination, extraState = null) {
  
  // 1. Función para Guardar
  function saveState() {
    try {
      const state = {
        filters: filters,
        pagination: { 
          size: pagination.value.size, 
          page: pagination.value.page 
        },
        // Si pasamos algo extra (como selectedType), lo guardamos también
        extra: extraState ? extraState.value : null
      }
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (e) {
      console.error('Error guardando state', e)
    }
  }

  // 2. Función para Cargar
  function loadState() {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        
        // Restaurar filtros
        if (parsed.filters) Object.assign(filters, parsed.filters)
        
        // Restaurar paginación
        if (parsed.pagination) {
          pagination.value.size = parsed.pagination.size || 25
          pagination.value.page = parsed.pagination.page || 1
        }

        // Restaurar extra (selectedType)
        if (parsed.extra && extraState) {
          extraState.value = parsed.extra
        }
      }
    } catch (e) {
      console.error('Error cargando state', e)
    }
  }

  // 3. Automáticamente cargar al montar
  onMounted(() => {
    loadState()
  })

  // Retornamos la función saveState por si quieres llamarla manualmente
  return { saveState, loadState }
}