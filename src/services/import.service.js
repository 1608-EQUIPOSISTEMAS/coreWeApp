// Servicio del modulo de importacion masiva (Administracion). Habla con
// /api/import: lista entidades, descarga la plantilla Excel, valida (dry-run) y
// confirma. La validacion y la confirmacion suben el archivo como FormData; el
// interceptor de api ya agrega el token y el user_id.
// Importar/validar una hoja grande tarda minutos (alta + auditoria por fila),
// muy por encima de los 30s globales de axios. Estas llamadas llevan timeout
// propio para no cortarse a mitad.
const BULK_TIMEOUT_MS = 5 * 60 * 1000

export default class ImportService {
  constructor (api) {
    this.api = api
  }

  // Entidades importables, para el selector.
  async getEntities () {
    const res = await this.api.get('/import/entities')
    return res.data?.data ?? []
  }

  // Descarga la plantilla .xlsx de la entidad y dispara la descarga en el
  // navegador. Devuelve true al terminar.
  async downloadTemplate (entity, filename = 'plantilla.xlsx') {
    const res = await this.api.get(`/import/${entity}/template`, { responseType: 'blob' })
    triggerBlobDownload(res.data, filename)
    return true
  }

  // Dry-run: sube el archivo y devuelve { results, summary } sin escribir nada.
  async validate (entity, file) {
    const form = new FormData()
    form.append('file', file)
    const res = await this.api.post(`/import/${entity}/validate`, form, { timeout: BULK_TIMEOUT_MS })
    return res.data?.data ?? { results: [], summary: {} }
  }

  // Confirma: importa las filas validas. Devuelve { results, summary } con el
  // resultado real por fila (imported / duplicate / error).
  async commit (entity, file) {
    const form = new FormData()
    form.append('file', file)
    const res = await this.api.post(`/import/${entity}/commit`, form, { timeout: BULK_TIMEOUT_MS })
    return res.data?.data ?? { results: [], summary: {} }
  }

  // Dry-run desde una URL de Google Sheet (el backend baja el CSV de la pestaña).
  async validateUrl (entity, url) {
    const res = await this.api.post(`/import/${entity}/validate-url`, { url }, { timeout: BULK_TIMEOUT_MS })
    return res.data?.data ?? { results: [], summary: {} }
  }

  // Importa desde una URL de Google Sheet.
  async commitUrl (entity, url) {
    const res = await this.api.post(`/import/${entity}/commit-url`, { url }, { timeout: BULK_TIMEOUT_MS })
    return res.data?.data ?? { results: [], summary: {} }
  }
}

// Crea un <a> temporal apuntando a un object URL del blob y lo "clickea" para
// que el navegador descargue el archivo. Libera la URL al terminar.
function triggerBlobDownload (blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
