import api from './api'

// Modulo Tickets: soporte interno.
//
// Las altas y los comentarios viajan como FormData porque llevan adjuntos; no
// se fija Content-Type a mano (el navegador tiene que poner el boundary), y
// api.js ya sabe inyectar el user_id en un multipart.
export default class TicketsService {
  async list ({ filtro = 'TODOS', busqueda = '', orden = 'sla' } = {}) {
    return (await api.post('/tickets/list', { filtro, busqueda, orden })).data.data
  }

  async detail (ticketId) {
    return (await api.post('/tickets/detail', { ticket_id: ticketId })).data.data
  }

  // Nota IA: { estado: 'listo'|'generando'|'error'|'sin_nota'|'apagado', resumen?, falta?, respuesta_sugerida? }
  async aiNote (ticketId) {
    return (await api.post('/tickets/ai-note', { ticket_id: ticketId })).data.data
  }

  async create ({ titulo, problema, link, archivos = [] }) {
    const fd = new FormData()
    fd.append('titulo', titulo)
    fd.append('problema', problema)
    if (link) fd.append('link', link)
    for (const archivo of archivos) fd.append('archivos', archivo)
    // 'Content-Type': undefined fuerza a axios a soltar el header por defecto
    // ('application/json' de la instancia) para que el navegador ponga el
    // suyo con el boundary del multipart. Sin esto @fastify/multipart responde
    // "the request is not multipart" (mismo workaround que edition.service.js).
    return (await api.post('/tickets/create', fd, { headers: { 'Content-Type': undefined } })).data.data
  }

  async changeStatus (ticketId, estado) {
    return (await api.post('/tickets/status', { ticket_id: ticketId, estado })).data.data
  }

  // Reabrir desde quien reportó (no exige ser ADMIN).
  async reopen (ticketId) {
    return (await api.post('/tickets/reopen', { ticket_id: ticketId })).data.data
  }

  async assignees () {
    return (await api.post('/tickets/assignees', {})).data.data
  }

  async reassign (ticketId, asignadoAId) {
    return (await api.post('/tickets/reassign', { ticket_id: ticketId, asignado_a_id: asignadoAId })).data.data
  }

  async comments (ticketId) {
    return (await api.post('/tickets/comments', { ticket_id: ticketId })).data.data
  }

  // Pestaña "Actividad": [{ id, tipo, fecha, actor, deUsuario, aUsuario, detalle }]
  async activity (ticketId) {
    return (await api.post('/tickets/activity', { ticket_id: ticketId })).data.data
  }

  async addComment (ticketId, cuerpo, archivos = []) {
    const fd = new FormData()
    fd.append('ticket_id', String(ticketId))
    fd.append('cuerpo', cuerpo)
    for (const archivo of archivos) fd.append('archivos', archivo)
    return (await api.post('/tickets/comment', fd, { headers: { 'Content-Type': undefined } })).data.data
  }

  /**
   * Los adjuntos NO se pintan con <img :src> directo: el endpoint exige el
   * header Authorization. Se bajan como blob y quien llama arma el object URL
   * (y lo revoca al desmontar, o la pestana se va llenando de memoria).
   */
  async attachmentBlob (attachmentId, kind = 'ticket') {
    const ruta = kind === 'comment' ? 'comment-attachment' : 'attachment'
    const { data } = await api.get(`/tickets/${ruta}/${attachmentId}`, { responseType: 'blob' })
    return data
  }
}
