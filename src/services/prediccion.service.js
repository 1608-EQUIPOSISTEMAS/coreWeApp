// Comercial > Ficha del cliente (historia de un telefono y que ofrecerle) y
// bandeja "Llamar hoy" (clientes que volvieron a consultar, repartidos).
export default class PrediccionService {
  constructor (api) {
    this.api = api
  }

  async ficha (phone) {
    return (await this.api.post('/prediccion/ficha', { phone })).data.data
  }

  // Manual de venta: que hacen los nuevos que preguntan por un programa.
  async programas () {
    return (await this.api.post('/prediccion/programas', {})).data.data
  }

  async manual (programId) {
    return (await this.api.post('/prediccion/programa', { program_id: programId })).data.data
  }

  // Bandeja "Llamar hoy". Sin userId, la propia; un lider puede pedir la de otro.
  async bandeja (userId) {
    return (await this.api.post('/prediccion/bandeja', userId ? { user_id: userId } : {})).data.data
  }

  async registrarResultado (assignmentId, outcome) {
    return (await this.api.post('/prediccion/bandeja/resultado', { assignment_id: assignmentId, outcome })).data.data
  }

  // Cadencia asistida: el asesor ya mando el WhatsApp del dia.
  async marcarSeguimiento (followupId) {
    return (await this.api.post('/prediccion/bandeja/seguimiento', { followup_id: followupId })).data.data
  }

  // Lideres: llamados contra grupo de control a 30 dias.
  async medicion () {
    return (await this.api.post('/prediccion/bandeja/medicion', {})).data.data
  }

  async generarBandeja () {
    return (await this.api.post('/prediccion/bandeja/generar', {})).data.data
  }
}
