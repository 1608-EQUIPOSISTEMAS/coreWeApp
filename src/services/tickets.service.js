import api from './api'

// Modulo Tickets de Alumnos: tramites abiertos desde el portal del alumno.
// El area NO se manda: el backend la deriva de los roles del token.
export default class TicketsService {
  async list ({ incluirCerrados = false, tipo = null, q = null } = {}) {
    return (await api.post('/tickets/list', {
      incluir_cerrados: incluirCerrados,
      tipo,
      q
    })).data.data
  }

  // Valida el paso del area actual. Si era el ultimo, el tramite queda resuelto.
  async firmar ({ solicitudId, respuesta }) {
    return (await api.post('/tickets/firmar', {
      solicitud_id: solicitudId,
      respuesta: respuesta || null
    })).data.data
  }

  async rechazar ({ solicitudId, respuesta }) {
    return (await api.post('/tickets/rechazar', {
      solicitud_id: solicitudId,
      respuesta: respuesta || null
    })).data.data
  }
}
