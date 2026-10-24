import api from './api'

// Academica > Membresias Vigentes: socios con beneficio (12 meses desde el registro).
export default class AcademicaMembresiasService {
  async vigentes () {
    return (await api.get('/academica-membresias/vigentes')).data.data
  }
}
