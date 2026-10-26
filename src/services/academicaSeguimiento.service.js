import api from './api'

// Academica > Seguimiento al Alumno: aulas con aprobados/desaprobados y sus alumnos.
export default class AcademicaSeguimientoService {
  async aulas () {
    return (await api.get('/academica-seguimiento/aulas')).data.data
  }

  async alumnos (editionId) {
    return (await api.get(`/academica-seguimiento/aulas/${editionId}/alumnos`)).data.data
  }
}
