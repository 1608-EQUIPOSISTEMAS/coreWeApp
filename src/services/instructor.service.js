import api from './api';

export default class InstructorService {

  async instructorRegister(payload) {
    return (await api.post('/instructor/instructorregister', payload)).data;
  }

  async instructorList(payload) {
    const response = (await api.post('/instructor/instructorlist', payload)).data;
    console.log(response)
    return response.data;
  }

  async instructorGet(payload) {
    const response = (await api.post('/instructor/instructorget', payload)).data;
    console.log(response.data)
    return response.data;
  }
  
  async instructorUpdate(payload) {
    return (await api.post('/instructor/instructorupdate', payload)).data;
  }

  async instructorCaller(payload) {
    const response = (await api.post('/instructor/instructorcaller', payload,{
    meta: { skipLoader: true }
  })).data;
    console.log(response)
    return response.items;
  }
}