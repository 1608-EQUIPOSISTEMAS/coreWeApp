// frontend/src/services/ProgramService.js
import api from './api';

export default class ProgramService {
  async programRegister(payload) {
    return (await api.post('/program/programregister', payload)).data;
  }

  async programList(payload) {
    const response = (await api.post('/program/programlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async programVersionCaller(payload) {
    const response = (await api.post('/program/programversioncaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.data.items;
  }

  async programGet(payload) {
    const response = (await api.post('/program/programget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  async programUpdate(payload) {
    return (await api.post('/program/programupdate', payload)).data;
  }

  async programVersionList(payload) {
    const response = (await api.post('/program/programversionlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async programCaller(payload) {
    const response = (await api.post('/program/programcaller', payload,{
                        meta: { skipLoader: true }
                      })).data;
      console.log(response)
      return response.data;
    }

  
  
  async programVersionUpdate(payload) {
    return (await api.post('/program/programversionupdate', payload)).data;
  }
  
  
}
