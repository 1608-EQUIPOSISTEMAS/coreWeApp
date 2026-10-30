// Modulo Planilla (Talento). Los sueldos solo llegan si el usuario tiene el rol
// TALENTO: el backend los corta para cualquier otro, incluido ADMIN.
const ARCHIVO_TIMEOUT_MS = 120000

function descargar (blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export default class PlanillaService {
  constructor (api) {
    this.api = api
  }

  async subir (url, file, confirmar, query = {}) {
    const form = new FormData()
    form.append('file', file)
    // Content-Type undefined: api.js fija application/json por defecto y con eso
    // axios convierte el FormData a JSON y el archivo nunca llega. Sin el header,
    // el navegador pone multipart/form-data con su boundary.
    const qs = new URLSearchParams({ ...query, ...(confirmar ? { confirmar: '1' } : {}) }).toString()
    const res = await this.api.post(`${url}${qs ? '?' + qs : ''}`, form, {
      timeout: ARCHIVO_TIMEOUT_MS,
      headers: { 'Content-Type': undefined }
    })
    return res.data.data
  }

  // Sin confirmar = vista previa (no guarda nada).
  importarHuellero (file, confirmar = false) { return this.subir('/planilla/huellero/importar', file, confirmar) }
  // Los sueldos valen desde (anio, mes): el personal se importa a inicio de mes.
  importarPersonal (file, { anio, mes }, confirmar = false) { return this.subir('/planilla/personal/importar', file, confirmar, { anio, mes }) }

  async personal () { return (await this.api.get('/planilla/personal')).data.data }
  async actualizarPersonal (id, cambios) { return (await this.api.patch(`/planilla/personal/${id}`, cambios)).data.data }
  async importaciones () { return (await this.api.get('/planilla/importaciones')).data.data }
  async asistencia (anio, mes) { return (await this.api.post('/planilla/asistencia', { anio, mes })).data.data }
  async justificar (asistenciaId, justificado, motivo = null) {
    return (await this.api.post('/planilla/asistencia/justificar', { asistencia_id: asistenciaId, justificado, motivo })).data.data
  }

  async calculo (anio, mes) { return (await this.api.post('/planilla/calculo', { anio, mes })).data.data }
  async cerrar (anio, mes) { return (await this.api.post('/planilla/periodo/cerrar', { anio, mes })).data.data }
  async reabrir (anio, mes) { return (await this.api.post('/planilla/periodo/reabrir', { anio, mes })).data.data }

  async descargarPlantilla () {
    const res = await this.api.get('/planilla/personal/plantilla', { responseType: 'blob' })
    descargar(res.data, 'plantilla-personal.xlsx')
  }

  async exportar (anio, mes) {
    const res = await this.api.post('/planilla/exportar', { anio, mes }, { responseType: 'blob' })
    descargar(res.data, `planilla-${anio}-${String(mes).padStart(2, '0')}.xlsx`)
  }
}
