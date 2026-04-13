export default class BotService {
  constructor(api) {
    this.api = api
  }

  // ── MÓDULO 1 y 2: DASHBOARD Y TICKETS (Los que ya hiciste) ──
  async botTicketList(payload) {
    const res = await this.api.post('/bot/botticketlist', payload)
    return res.data.data
  }

  async botTicketGet(payload) {
    const res = await this.api.post('/bot/botticketget', payload)
    return res.data
  }

  async botTicketUpdate(payload) {
    return (await this.api.post('/bot/botticketupdate', payload)).data
  }

  async botDashboardMetricsGet(payload) {
    const res = await this.api.post('/bot/botdashboardmetrics', payload)
    return res.data
  }

  // ── MÓDULO 3: BASE DE ALUMNOS ODS (Lo usaremos en BotAlumnos.vue) ──
  async botStudentList(payload) {
    const res = await this.api.post('/bot/botstudentlist', payload)
    return res.data.data
  }

  async botStudentGet(payload) {
    const res = await this.api.post('/bot/botstudentget', payload)
    return res.data
  }

  // ── MÓDULO 4: CALIDAD CSAT (Lo usaremos en BotCsat.vue) ──
  async botCsatList(payload) {
    const res = await this.api.post('/bot/botcsatlist', payload)
    return res.data.data
  }
}