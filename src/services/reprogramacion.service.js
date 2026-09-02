import api from './api'

// Modulo Reprogramaciones: bandeja de alumnos varados por una edicion cancelada.
export default class ReprogramacionService {
  async list () {
    return (await api.post('/reprogramacion/list', {})).data.data
  }

  // Ediciones futuras del programa elegido como destino.
  async destinations (programVersionId) {
    return (await api.post('/reprogramacion/destinations', {
      program_version_id: programVersionId
    })).data.data
  }

  // Academica decide la salida del alumno: 'reubicar' (default), 'reserva' o
  // 'reembolso'. Solo la primera lleva destino; dest_edition_id puede ir null
  // si el programa no tiene ediciones (membresia o programa online).
  async propose ({ enrollmentId, destProgramVersionId, destEditionId, salida = 'reubicar' }) {
    const reubica = salida === 'reubicar'
    return (await api.post('/reprogramacion/propose', {
      enrollment_id: enrollmentId,
      dest_program_version_id: reubica ? destProgramVersionId : null,
      dest_edition_id: reubica ? (destEditionId ?? null) : null,
      salida
    })).data.data
  }

  async contact ({ enrollmentId, notes }) {
    return (await api.post('/reprogramacion/contact', {
      enrollment_id: enrollmentId,
      notes: notes || null
    })).data.data
  }

  // Ejecuta el movimiento completo (ERP + Odoo + correo). Solo FICO.
  async accept ({ enrollmentId, notes }) {
    return (await api.post('/reprogramacion/accept', {
      enrollment_id: enrollmentId,
      notes: notes || null
    })).data
  }

  async reject ({ enrollmentId, notes }) {
    return (await api.post('/reprogramacion/reject', {
      enrollment_id: enrollmentId,
      notes: notes || null
    })).data.data
  }
}
