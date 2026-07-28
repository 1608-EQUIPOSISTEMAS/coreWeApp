// Recompresion de imagenes en el navegador, con canvas. Sin dependencias: el
// navegador ya sabe decodificar y reencodear.
//
// Motivo: el banner de evento viaja en base64 dentro del JSON, y base64 infla
// un 33%. Un JPG de 2 MB se convierte en ~2.7 MB de body, que muchos proxys
// (nginx: client_max_body_size 1 MB por defecto) cortan ANTES de responder. El
// navegador no ve un 413, ve la conexion caida: "Network Error" sin respuesta.
//
// Ademas el banner se incrusta en CADA correo, asi que bajarlo de 2 MB a ~300 KB
// no es solo por el proxy: son gigabytes menos de salida en un congreso grande.

// Escala para que el lado mayor no pase de maxSide, conservando la proporcion.
// Nunca agranda: una imagen chica se queda como esta.
export function fitWithin (width, height, maxSide) {
  if (!width || !height) return { width: 0, height: 0 }
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// Bytes reales detras de un data URI base64 (4 caracteres = 3 bytes).
export function dataUrlBytes (dataUrl) {
  const payload = String(dataUrl).split(',')[1] || ''
  const padding = (payload.match(/=+$/) || [''])[0].length
  return Math.max(0, Math.floor(payload.length * 3 / 4) - padding)
}

// De mayor a menor calidad: se para en la primera que entra en el presupuesto,
// asi una imagen que ya casi cabe no se degrada de mas.
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45]

// Devuelve { base64, mime, dataUrl, bytes }. Si el archivo ya cabe en maxBytes
// se devuelve intacto: recomprimir un PNG nitido a JPEG solo lo empeora.
export async function compressImage (file, { maxSide = 1200, maxBytes = 400 * 1024 } = {}) {
  if (file.size <= maxBytes) {
    const dataUrl = await readAsDataUrl(file)
    return { base64: stripPrefix(dataUrl), mime: file.type, dataUrl, bytes: file.size }
  }

  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // Fondo blanco antes de dibujar: un PNG con transparencia pasado a JPEG
  // saldria con el fondo en negro, y los correos son sobre blanco.
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  let dataUrl = ''
  for (const quality of QUALITY_STEPS) {
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrlBytes(dataUrl) <= maxBytes) break
  }
  // Si ni la calidad mas baja entro, se manda igual: el backend tiene su propio
  // tope y su propio mensaje. Mejor un rechazo explicado que un silencio.
  return { base64: stripPrefix(dataUrl), mime: 'image/jpeg', dataUrl, bytes: dataUrlBytes(dataUrl) }
}

function stripPrefix (dataUrl) {
  return String(dataUrl).replace(/^data:[^,]+,/, '')
}

function readAsDataUrl (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}
