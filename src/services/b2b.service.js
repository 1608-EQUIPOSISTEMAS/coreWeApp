export default class B2bService {
  constructor(api) {
    this.api = api
  }

  // ── Empresas ─────────────────────────────────────────────
  async companyList(payload) {
    const res = await this.api.post('/b2b/companylist', payload)
    return res.data.data
  }

  async companyLeadList(payload) {
    const res = await this.api.post('/b2b/leadlist', payload)
    return res.data.data
  }

  async companyLeadGet(payload) {
    const res = await this.api.post('/b2b/leadget', payload)
    return res.data.data
  }

  async companyLeadRegister(payload) {
    return (await this.api.post('/b2b/leadregister', payload)).data
  }

  async companyCaller(payload) {
    const res = await this.api.post('/b2b/companycaller', payload,{
    meta: { skipLoader: true }
  })
    return res.data.data
  }

  async companyGet(payload) {
    const res = await this.api.post('/b2b/companyget', payload)
    return res.data.data
  }

  async companyRegister(payload) {
    return (await this.api.post('/b2b/companyregister', payload)).data
  }

  async companyUpdate(payload) {
    return (await this.api.post('/b2b/companyupdate', payload)).data
  }

  // ── Contratos ─────────────────────────────────────────
  async contractList(payload) {
    const res = await this.api.post('/b2b/contractlist', payload)
    return res.data.data
  }

  async contractGet(payload) {
    const res = await this.api.post('/b2b/contractget', payload)
    return res.data.data
  }

  async contractRegister(payload) {
    return (await this.api.post('/b2b/contractregister', payload)).data
  }

  async contractUpdate(payload) {
    return (await this.api.post('/b2b/contractupdate', payload)).data
  }

  // ── Convenios ─────────────────────────────────────────
  async agreementList(payload) {
    const res = await this.api.post('/b2b/agreementlist', payload)
    return res.data.data
  }

  async agreementGet(payload) {
    const res = await this.api.post('/b2b/agreementget', payload)
    return res.data.data
  }

  async agreementRegister(payload) {
    return (await this.api.post('/b2b/agreementregister', payload)).data
  }

  async agreementUpdate(payload) {
    return (await this.api.post('/b2b/agreementupdate', payload)).data
  }

  async agreementListActive(payload) {
    const res = await this.api.post('/b2b/agreementlist', { ...payload, status: 'active' })
    return res.data.data
  }
}
