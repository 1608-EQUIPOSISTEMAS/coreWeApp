
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
  
  
  
}