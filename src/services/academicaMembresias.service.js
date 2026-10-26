import api from './api'

// Academica > Membresias Vigentes: socios con beneficio (12 meses desde el registro).
export default class AcademicaMembresiasService {
  async vigentes () {
    return (await api.get('/academica-membresias/vigentes')).data.data
  }

  // Check de acompañamiento: S1 en bienvenida, M1..M12 en seguimiento.
  async marcarCheck ({ enrollmentId, checkpoint, checked }) {
    await api.post('/academica-membresias/check', { enrollment_id: enrollmentId, checkpoint, checked })
  }
}
