import api from './api'

// Fundacion > Becas: registro y seguimiento (reemplaza el sheet "Gestion de Becas 2026").
export default class FundacionBecasService {
  async listar () {
    return (await api.get('/fundacion-becas')).data.data
  }

  // Programas becables con su modalidad y las ediciones que aun no terminan.
  async cursos () {
    return (await api.get('/fundacion-becas/cursos')).data.data
  }

  async registrar (beca) {
    return (await api.post('/fundacion-becas', beca)).data.data
  }

  // Corrige los datos; la activación no cambia.
  async actualizar (scholarshipId, beca) {
    await api.put(`/fundacion-becas/${scholarshipId}`, beca)
  }

  async eliminar (scholarshipId) {
    await api.delete(`/fundacion-becas/${scholarshipId}`)
  }

  async activar (scholarshipId) {
    await api.post(`/fundacion-becas/${scholarshipId}/activar`)
  }
}
