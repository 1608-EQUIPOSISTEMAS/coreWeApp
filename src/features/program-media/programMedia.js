// Archivos del programa que manda el bot de WhatsApp (ficha del programa en
// Producto). Puro: qué mostrar de cada archivo y qué se puede subir. Los topes
// son los de WhatsApp y los vuelve a validar el backend.

const TZ = 'America/Lima'
export const MAX_IMAGE_MB = 5

const ACCEPT = { image: '.jpg,.jpeg,.png', document: '.pdf' }
const HINT = { image: `JPG o PNG de hasta ${MAX_IMAGE_MB} MB`, document: 'PDF' }

// Para qué sirve cada archivo, dicho para quien lo sube.
const PURPOSE = {
  docente: 'La pieza de difusión con el docente y su trayectoria (no su foto suelta). Es lo primero que recibe el lead.',
  brochure: 'El temario completo del programa.',
  certificado: 'Cómo se ve el certificado que recibe al terminar.'
}

export function formatSize (bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('es-PE', { maximumFractionDigits: 1 })} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function slotView ({ slot, label, kinds, file }) {
  return {
    slot,
    label,
    purpose: PURPOSE[slot] ?? '',
    accept: kinds.map(k => ACCEPT[k]).join(','),
    hint: kinds.map(k => HINT[k]).join(' o '),
    isImage: Boolean(file) && /\.(jpe?g|png)$/i.test(file.filename),
    estado: file ? { label: 'Subido', tone: 'ok' } : { label: 'Falta', tone: 'warn' },
    archivo: file
      ? `${file.filename} · ${formatSize(file.size)} · ${new Date(file.updatedAt).toLocaleDateString('es-PE', { timeZone: TZ })}`
      : null
  }
}

// Mismo tope que el backend, para avisar antes de subir 30 MB en vano.
export function fileProblem ({ kinds }, file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  const isImage = ['.jpg', '.jpeg', '.png'].includes(ext)
  const isPdf = ext === '.pdf'
  if (!((isImage && kinds.includes('image')) || (isPdf && kinds.includes('document')))) {
    return `Formato no válido: sube un ${kinds.map(k => HINT[k]).join(' o ')}.`
  }
  if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) return `La imagen pesa ${formatSize(file.size)}: WhatsApp acepta hasta ${MAX_IMAGE_MB} MB.`
  return null
}

export function mediaSummary (slots = []) {
  const missing = slots.filter(s => !s.file).map(s => s.label)
  return missing.length
    ? { tone: 'warn', text: `Falta: ${missing.join(', ')}. El bot de WhatsApp no manda la información de este programa hasta que estén los tres.` }
    : { tone: 'info', text: 'Completo: el bot de WhatsApp manda estos tres archivos al lead que pregunta por este programa.' }
}
