
import api from './api';

export default class EditionService {
    
  async editionRegister(payload) {
    return (await api.post('/edition/editionregister', payload)).data;
  }

  async editionList(payload) {
    const response = (await api.post('/edition/editionlist', payload)).data;
    console.log(response)
    return response.data;
  }

  //editionbyweeklist
  async editionByWeekList(payload) {
    const response = (await api.post('/edition/editionbyweeklist', payload)).data;
    console.log(response)
    return response.data;
  }
  

  async editionGet(payload) {
    const response = (await api.post('/edition/editionget', payload)).data;
    console.log(response.data)
    return response.data;
  }

  //editiontreeget
  async editionTreeGet(payload) {
    const response = (await api.post('/edition/editiontreeget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  
  async editionUpdate(payload) {
    return (await api.post('/edition/editionupdate', payload)).data;
  }
  
  //editionCaller
  async editionCaller(payload) {
    const response = (await api.post('/edition/editioncaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.items;
  }
  
  async editionTreeRegister(payload) {
    return (await api.post('/edition/editiontreeregister', payload)).data;
  }

  async editionTreeUpdate(payload) {
    return (await api.post('/edition/editiontreeupdate', payload)).data;
  }
  
  async auditLogsGet(payload) {
    // Nota: Asegúrate que en tu Backend la ruta sea '/edition/auditlogsget' 
    // o cambia aquí a '/audit-logs/get' según como lo hayas definido en Fastify.
    const response = (await api.post('/edition/auditlogsget', payload)).data;
    return response.data;
  }

  //edition_extra_info_caller
  async editionExtraInfoCaller(payload) {
    const response = (await api.post('/edition/editionextrainfocaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.items;
  }

  async bulkUpdateWhatsapp(items) {
    const response = (await api.post('/edition/bulkupdatewhatsapp', { items })).data;
    return response.data;
  }

  async downloadSchedulePdf(parentEditionId, childEditionId) {
    const response = await api.post(
      '/edition/schedule-pdf',
      { parent_edition_id: parentEditionId, child_edition_id: childEditionId },
      { responseType: 'blob', meta: { skipLoader: true } }
    )
    return response.data
  }

}