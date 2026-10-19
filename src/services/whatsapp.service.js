// Comercial > WhatsApp: bandeja de conversaciones del bot y de las líneas de
// las asesoras, y la configuración (números y asesora por programa).
export default class WhatsappService {
  constructor (api) {
    this.api = api
  }

  async conversaciones (status) {
    return (await this.api.post('/whatsapp/conversaciones', status ? { status } : {})).data.data
  }

  async conversacion (conversationId) {
    return (await this.api.post('/whatsapp/conversaciones/detalle', { conversation_id: conversationId })).data.data
  }

  async responder (conversationId, body) {
    return (await this.api.post('/whatsapp/conversaciones/responder', { conversation_id: conversationId, body })).data.data
  }

  async config () {
    return (await this.api.post('/whatsapp/config', {})).data.data
  }

  async guardarNumero (numero) {
    return (await this.api.post('/whatsapp/config/numero', numero)).data.data
  }

  async guardarPrograma (programa) {
    await this.api.post('/whatsapp/config/programa', programa)
  }

  async quitarPrograma (programId) {
    await this.api.post('/whatsapp/config/programa/quitar', { program_id: programId })
  }

  // La derivación de la hora 71 la corre el cron; esto es el botón de quien opera el bot.
  async ejecutarDerivaciones () {
    return (await this.api.post('/whatsapp/derivaciones/ejecutar', {})).data.data
  }
}
