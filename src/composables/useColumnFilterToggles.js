import { computed, ref } from 'vue'

// Filtros por columna que aparecen solo al hacer clic en el encabezado: la fila
// de filtros vacía ocupaba espacio en una pantalla que FICO mira todo el día.
// Un filtro CON valor queda siempre visible (y su encabezado marcado): nadie
// debe filtrar sin verlo.
// Con { alwaysOpen: true } la fila queda fija y el clic no la oculta
// (Inscripciones: FICO pidió ver los filtros apenas abre el módulo).

export function isFilterActive (value) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim() !== ''
  return value !== null && value !== undefined
}

export function useColumnFilterToggles (colFilters, { alwaysOpen = false } = {}) {
  const opened = ref(new Set())

  const isActive = (key) => isFilterActive(colFilters[key])
  const isOpen = (key) => alwaysOpen || opened.value.has(key) || isActive(key)

  function toggle (key) {
    if (alwaysOpen) return
    const next = new Set(opened.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    opened.value = next
  }

  const anyVisible = computed(() =>
    alwaysOpen || opened.value.size > 0 || Object.keys(colFilters).some(isActive))

  const closeAll = () => { opened.value = new Set() }

  return { isActive, isOpen, toggle, anyVisible, closeAll }
}
