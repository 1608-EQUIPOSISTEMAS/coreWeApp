import api from './api'

// Modulo Tickets de Alumnos: tramites abiertos desde el portal del alumno.
// El area NO se manda: el backend la deriva de los roles del token.
export default class TicketsAlumnosService {
  async list ({ incluirCerrados = false, tipo = null, q = null } = {}) {
    return (await api.post('/tickets-alumnos/list', {
      incluir_cerrados: incluirCerrados,
      tipo,
      q
    })).data.data
  }

  // Valida el paso del area actual. `monto` solo cuenta en la aprobacion de
  // Academica, cuando el portal lo dejo por confirmar.
  async firmar ({ solicitudId, respuesta, monto = null }) {
    return (await api.post('/tickets-alumnos/firmar', {
      solicitud_id: solicitudId,
      respuesta: respuesta || null,
      monto
    })).data.data
  }

  // URL de diez minutos al voucher o la evidencia que subio el alumno.
  async urlDeArchivo ({ solicitudId, cual }) {
    return (await api.post('/tickets-alumnos/archivo', { solicitud_id: solicitudId, cual })).data.data.url
  }

  async rechazar ({ solicitudId, respuesta }) {
    return (await api.post('/tickets-alumnos/rechazar', {
      solicitud_id: solicitudId,
      respuesta: respuesta || null
    })).data.data
  }
}
