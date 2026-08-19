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

  // Academica elige el destino. dest_edition_id puede ir null si el destino no
  // tiene ediciones (membresia o programa online).
  async propose ({ enrollmentId, destProgramVersionId, destEditionId }) {
    return (await api.post('/reprogramacion/propose', {
      enrollment_id: enrollmentId,
      dest_program_version_id: destProgramVersionId,
      dest_edition_id: destEditionId ?? null
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
