import { onMounted, onUnmounted } from 'vue'

// Escucha Ctrl+V mientras el componente está montado y entrega las imágenes
// pegadas (una captura de pantalla, por ejemplo), sin importar qué elemento
// tenga el foco: no hay que hacer clic en un campo específico antes de pegar.
//
// El navegador nunca le da un nombre útil al archivo pegado —a veces ninguno—
// así que se le asigna uno acá para que se vea bien en la lista de adjuntos.

function imagenesDelPortapapeles (clipboardData) {
  if (!clipboardData) return []

  const imagenes = []
  let i = 0
  for (const item of clipboardData.items) {
    if (!item.type.startsWith('image/')) continue
    const archivo = item.getAsFile()
    if (!archivo) continue

    const extension = item.type.split('/')[1] ?? 'png'
    imagenes.push(new File([archivo], `pegado-${Date.now()}-${i++}.${extension}`, { type: item.type }))
  }
  return imagenes
}

export function usePegarImagenes (onImagenes) {
  function manejarPegado (e) {
    const imagenes = imagenesDelPortapapeles(e.clipboardData)
    if (!imagenes.length) return
    // Sin esto, el navegador además intenta pegar el archivo como texto/data
    // URL en el campo enfocado.
    e.preventDefault()
    onImagenes(imagenes)
  }

  onMounted(() => document.addEventListener('paste', manejarPegado))
  onUnmounted(() => document.removeEventListener('paste', manejarPegado))
}
