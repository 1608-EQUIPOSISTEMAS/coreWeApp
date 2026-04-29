import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'we_sidebar_state_v1'

// Default: sidebar abierto en desktop, cerrado en mobile. Solo aplica si no hay
// preferencia guardada — una vez el usuario interactua, su eleccion gana.
function readInitial () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      return {
        visible: typeof saved.visible === 'boolean' ? saved.visible : true,
        unfoldable: typeof saved.unfoldable === 'boolean' ? saved.unfoldable : false
      }
    }
  } catch { /* localStorage no disponible o JSON corrupto */ }
  const isDesktop = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 992px)').matches
  return { visible: isDesktop !== false, unfoldable: false }
}

export const useSidebarStore = defineStore('sidebar', () => {
  const initial = readInitial()
  const visible = ref(initial.visible)
  const unfoldable = ref(initial.unfoldable)

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        visible: visible.value,
        unfoldable: unfoldable.value
      }))
    } catch { /* quota o modo privado: ignorar */ }
  }

  watch([visible, unfoldable], persist)

  const toggleVisible = (value) => {
    visible.value = value !== undefined ? value : !visible.value
  }

  const toggleUnfoldable = () => {
    unfoldable.value = !unfoldable.value
  }

  return { visible, unfoldable, toggleVisible, toggleUnfoldable }
})
