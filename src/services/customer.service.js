// frontend/src/services/ProgramService.js
import api from './api';

export default class CustomerService {
  async customerRegister(payload) {
    return (await api.post('/customer/customerregister', payload)).data;
  }

  async customerList(payload) {
    const response = (await api.post('/customer/customerlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async customerGet(payload) {
    const response = (await api.post('/customer/customerget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  async customerUpdate(payload) {
    return (await api.post('/customer/customerupdate', payload)).data;
  }
  
  async sunatGet(payload) {
    const response = (await api.post('/customer/sunatget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
}
